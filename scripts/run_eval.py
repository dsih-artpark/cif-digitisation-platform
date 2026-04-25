"""Headless eval against the /digitize API.

Walks eval/inputs/ recursively, submits every PDF/image to POST /digitize, polls to
completion, and writes responses + run metadata to eval/outputs/<eval_id>/.

Eval id defaults to <model-slug>-<YYYYMMDD>-v<N>; override with --eval-id.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import statistics
import subprocess
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests

TERMINAL_STATUSES = {"completed", "failed", "error", "cancelled"}
SUPPORTED_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".bmp", ".gif"}
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_DIR = REPO_ROOT / "eval" / "inputs"
DEFAULT_OUTPUTS_DIR = REPO_ROOT / "eval" / "outputs"


def slugify(value: str) -> str:
    value = value.strip().lower().replace("/", "-").replace(":", "-")
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-") or "unknown"


def next_eval_id(outputs_dir: Path, model_slug: str, today: str) -> str:
    outputs_dir.mkdir(parents=True, exist_ok=True)
    prefix = f"{model_slug}-{today}"
    pattern = re.compile(rf"^{re.escape(prefix)}-v(\d+)$")
    used = [int(m.group(1)) for p in outputs_dir.iterdir() if (m := pattern.match(p.name))]
    version = (max(used) + 1) if used else 1
    return f"{prefix}-v{version}"


def git_sha(cwd: Path) -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=cwd, capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() or None if out.returncode == 0 else None
    except Exception:
        return None


def collect_inputs(input_dir: Path) -> list[Path]:
    return sorted(
        p for p in input_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_SUFFIXES and not p.name.startswith(".")
    )


def submit_job(api_base: str, headers: dict[str, str], path: Path) -> dict[str, Any]:
    mime, _ = mimetypes.guess_type(path.name)
    mime = mime or "application/octet-stream"
    with path.open("rb") as fh:
        files = {"file": (path.name, fh, mime)}
        data = {"file_name": path.name, "file_type": mime}
        resp = requests.post(
            f"{api_base}/digitize", headers=headers, files=files, data=data, timeout=60
        )
    resp.raise_for_status()
    return resp.json()


def poll_job(
    api_base: str,
    headers: dict[str, str],
    job_id: str,
    *,
    timeout_s: float,
    interval_s: float,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_s
    while True:
        resp = requests.get(f"{api_base}/digitize/{job_id}", headers=headers, timeout=30)
        resp.raise_for_status()
        job = resp.json().get("job", {})
        if job.get("status") in TERMINAL_STATUSES:
            return job
        if time.monotonic() >= deadline:
            job["_timeout"] = True
            return job
        time.sleep(interval_s)


def evaluate_file(
    api_base: str,
    headers: dict[str, str],
    path: Path,
    input_dir: Path,
    *,
    timeout_s: float,
    interval_s: float,
) -> dict[str, Any]:
    started = time.monotonic()
    submission = submit_job(api_base, headers, path)
    job_id = submission["jobId"]
    job = poll_job(api_base, headers, job_id, timeout_s=timeout_s, interval_s=interval_s)
    latency_s = time.monotonic() - started
    rel = path.relative_to(input_dir).as_posix()
    return {
        "file": rel,
        "batch": path.relative_to(input_dir).parts[0] if path.parent != input_dir else "",
        "job_id": job_id,
        "status": job.get("status"),
        "timed_out": job.get("_timeout", False),
        "latency_s": round(latency_s, 2),
        "error": job.get("error"),
        "result": job.get("result"),
        "stages": job.get("stages"),
    }


def summarise(records: list[dict[str, Any]]) -> dict[str, Any]:
    latencies = [r["latency_s"] for r in records if r.get("latency_s") is not None]
    statuses: dict[str, int] = {}
    for r in records:
        statuses[r.get("status") or "unknown"] = statuses.get(r.get("status") or "unknown", 0) + 1
    summary: dict[str, Any] = {
        "total": len(records),
        "status_counts": statuses,
        "success_rate": (
            round(statuses.get("completed", 0) / len(records), 3) if records else 0.0
        ),
    }
    if latencies:
        summary["latency_s"] = {
            "min": round(min(latencies), 2),
            "max": round(max(latencies), 2),
            "mean": round(statistics.mean(latencies), 2),
            "median": round(statistics.median(latencies), 2),
            "p95": round(sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)], 2),
        }
    prompt_tokens = sum(
        r.get("result", {}).get("metadata", {}).get("usage", {}).get("prompt_tokens", 0) or 0
        for r in records if r.get("result")
    )
    completion_tokens = sum(
        r.get("result", {}).get("metadata", {}).get("usage", {}).get("completion_tokens", 0) or 0
        for r in records if r.get("result")
    )
    if prompt_tokens or completion_tokens:
        summary["tokens"] = {
            "prompt": prompt_tokens,
            "completion": completion_tokens,
            "total": prompt_tokens + completion_tokens,
        }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Headless eval against /digitize.")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--outputs-dir", type=Path, default=DEFAULT_OUTPUTS_DIR)
    parser.add_argument("--eval-id", help="Explicit eval id; else auto <model>-<date>-vN.")
    parser.add_argument("--note", default="", help="Free-text note stored in run.json.")
    parser.add_argument(
        "--api-base", default=os.getenv("API_BASE_URL", "http://localhost:8787").rstrip("/")
    )
    parser.add_argument("--auth-token", default=os.getenv("AUTH_TOKEN"))
    parser.add_argument("--timeout", type=float, default=600.0, help="Per-file timeout in seconds.")
    parser.add_argument("--poll-interval", type=float, default=2.0)
    args = parser.parse_args()

    input_dir: Path = args.input_dir
    if not input_dir.is_dir():
        print(f"Input dir not found: {input_dir}", file=sys.stderr)
        return 1

    files = collect_inputs(input_dir)
    if not files:
        print(f"No supported files under {input_dir}", file=sys.stderr)
        return 1

    headers = {"Authorization": f"Bearer {args.auth_token}"} if args.auth_token else {}

    try:
        health = requests.get(f"{args.api_base}/api/health", timeout=10).json()
        model_name = health.get("model", "unknown")
        print(f"API ok: {model_name}")
    except Exception as exc:
        print(f"API unreachable at {args.api_base}: {exc}", file=sys.stderr)
        return 2

    today = date.today().strftime("%Y%m%d")
    eval_id = args.eval_id or next_eval_id(args.outputs_dir, slugify(model_name), today)
    run_dir = args.outputs_dir / eval_id
    responses_dir = run_dir / "responses"
    responses_dir.mkdir(parents=True, exist_ok=True)
    started_iso = datetime.now(timezone.utc).isoformat()

    records: list[dict[str, Any]] = []
    for idx, path in enumerate(files, start=1):
        rel = path.relative_to(input_dir).as_posix()
        print(f"[{idx}/{len(files)}] {rel} ...", flush=True)
        try:
            record = evaluate_file(
                args.api_base, headers, path, input_dir,
                timeout_s=args.timeout, interval_s=args.poll_interval,
            )
        except requests.HTTPError as exc:
            record = {
                "file": rel, "status": "http_error",
                "error": f"{exc.response.status_code}: {exc.response.text[:200]}",
            }
        except Exception as exc:
            record = {"file": rel, "status": "client_error", "error": str(exc)}
        records.append(record)
        safe_name = rel.replace("/", "__")
        (responses_dir / f"{Path(safe_name).stem}.json").write_text(json.dumps(record, indent=2))
        print(
            f"  → {record.get('status')} in {record.get('latency_s', 'n/a')}s"
            + (f" ({record['error']})" if record.get("error") else "")
        )

    run_meta = {
        "eval_id": eval_id,
        "model": model_name,
        "api_base": args.api_base,
        "git_sha": git_sha(REPO_ROOT),
        "started_at": started_iso,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(input_dir.relative_to(REPO_ROOT)),
        "input_count": len(files),
        "note": args.note,
        "summary": summarise(records),
    }
    (run_dir / "run.json").write_text(json.dumps(run_meta, indent=2))
    print(f"\n{eval_id} complete → {run_dir}")
    print(json.dumps(run_meta["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

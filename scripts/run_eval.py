"""Headless eval against the /digitize API.

Usage:
    python scripts/run_eval.py                          # defaults: eval/inputs/ → eval/runs/<ts>/
    python scripts/run_eval.py --input-dir eval/inputs --api-base http://localhost:8787
    API_BASE_URL=... AUTH_TOKEN=... python scripts/run_eval.py
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

TERMINAL_STATUSES = {"completed", "failed", "error", "cancelled"}
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_DIR = REPO_ROOT / "eval" / "inputs"
DEFAULT_RUNS_DIR = REPO_ROOT / "eval" / "runs"


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
    api_base: str, headers: dict[str, str], path: Path, *, timeout_s: float, interval_s: float
) -> dict[str, Any]:
    started = time.monotonic()
    submission = submit_job(api_base, headers, path)
    job_id = submission["jobId"]
    job = poll_job(api_base, headers, job_id, timeout_s=timeout_s, interval_s=interval_s)
    latency_s = time.monotonic() - started
    return {
        "file": path.name,
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
        }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Headless eval against /digitize.")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--runs-dir", type=Path, default=DEFAULT_RUNS_DIR)
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

    files = sorted(p for p in input_dir.iterdir() if p.is_file() and not p.name.startswith("."))
    if not files:
        print(f"No files in {input_dir}", file=sys.stderr)
        return 1

    headers = {"Authorization": f"Bearer {args.auth_token}"} if args.auth_token else {}

    try:
        health = requests.get(f"{args.api_base}/api/health", timeout=10).json()
        print(f"API ok: {health.get('model', 'unknown model')}")
    except Exception as exc:
        print(f"API unreachable at {args.api_base}: {exc}", file=sys.stderr)
        return 2

    run_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    run_dir = args.runs_dir / run_id
    responses_dir = run_dir / "responses"
    responses_dir.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    for idx, path in enumerate(files, start=1):
        print(f"[{idx}/{len(files)}] {path.name} ...", flush=True)
        try:
            record = evaluate_file(
                args.api_base,
                headers,
                path,
                timeout_s=args.timeout,
                interval_s=args.poll_interval,
            )
        except requests.HTTPError as exc:
            record = {
                "file": path.name,
                "status": "http_error",
                "error": f"{exc.response.status_code}: {exc.response.text[:200]}",
            }
        except Exception as exc:
            record = {"file": path.name, "status": "client_error", "error": str(exc)}
        records.append(record)
        (responses_dir / f"{path.stem}.json").write_text(json.dumps(record, indent=2))
        print(
            f"  → {record.get('status')} in {record.get('latency_s', 'n/a')}s"
            + (f" ({record['error']})" if record.get("error") else "")
        )

    metrics = {
        "run_id": run_id,
        "api_base": args.api_base,
        "input_dir": str(input_dir),
        "summary": summarise(records),
    }
    (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"\nRun {run_id} complete → {run_dir}")
    print(json.dumps(metrics["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

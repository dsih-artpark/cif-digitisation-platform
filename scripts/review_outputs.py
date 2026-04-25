"""LLM-as-judge review of an eval run against the source PDFs.

For every file in a run, sends the rasterised PDF pages + the extracted caseData to
a judge model via OpenRouter, and records a per-field verdict:
correct | partial | wrong | missing | unverifiable.

Usage:
    python scripts/review_outputs.py <eval_id> [--judge openai/gpt-4o]
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
import requests
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / ".env")

DEFAULT_OUTPUTS_DIR = REPO_ROOT / "eval" / "outputs"
DEFAULT_INPUT_DIR = REPO_ROOT / "eval" / "inputs"
DEFAULT_JUDGE = "openai/gpt-4o"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FIELDS = [
    "patient_name", "age", "sex", "location", "village", "date",
    "test_type", "result", "pathogen", "treatment", "temperature", "hb_level",
]
VERDICTS = {"correct", "partial", "wrong", "missing", "unverifiable"}

JUDGE_SYSTEM = """You are an auditor reviewing a data-extraction system's output against the source document.

You will see:
1. Images of a Case Investigation Form (CIF) — a medical form, often handwritten in English or Marathi/Hindi.
2. A JSON object of fields the extraction system produced.

For each field, decide if the extraction matches what the document shows. Return STRICT JSON only — no prose, no code fences, no preamble. Exactly this shape:

{
  "patient_name": {"verdict": "correct", "reason": "matches handwriting on line 1"},
  "age": {"verdict": "partial", "reason": "units off — doc shows '48 years', extraction has '48'"},
  ...
}

Verdict values (use exactly one):
- "correct": the extracted value matches the document
- "partial": substantially right but with a meaningful difference (wrong units, misspelling that changes meaning, truncation)
- "wrong": the extracted value is clearly wrong given the document
- "missing": extraction says N/A or blank, but the document clearly has a value
- "unverifiable": the document text is illegible or the field isn't present, so correctness can't be judged

Every one of these fields must be present in your JSON: patient_name, age, sex, location, village, date, test_type, result, pathogen, treatment, temperature, hb_level. Keep each "reason" under 120 characters."""


def render_pdf_pages(pdf_path: Path, dpi: int = 150, max_pages: int = 4) -> list[bytes]:
    images: list[bytes] = []
    with fitz.open(pdf_path) as doc:
        for idx, page in enumerate(doc):
            if idx >= max_pages:
                break
            pix = page.get_pixmap(dpi=dpi)
            images.append(pix.tobytes("jpeg"))
    return images


def image_path_to_bytes(p: Path) -> list[bytes]:
    return [p.read_bytes()]


def to_data_url(image_bytes: bytes, mime: str = "image/jpeg") -> str:
    return f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"


def build_messages(
    case_data: dict[str, Any], image_data_urls: list[str]
) -> list[dict[str, Any]]:
    user_content: list[dict[str, Any]] = [
        {"type": "text", "text": (
            "Extraction output to audit (JSON):\n"
            f"{json.dumps(case_data, indent=2, ensure_ascii=False)}\n\n"
            "Source document pages follow. Return the per-field verdict JSON."
        )}
    ]
    for url in image_data_urls:
        user_content.append({"type": "image_url", "image_url": {"url": url}})
    return [
        {"role": "system", "content": JUDGE_SYSTEM},
        {"role": "user", "content": user_content},
    ]


def call_judge(
    judge_model: str, api_key: str, messages: list[dict[str, Any]], timeout: float = 120.0
) -> tuple[dict[str, Any], dict[str, Any]]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/dsih-artpark/cif-digitisation-platform",
        "X-Title": "CIF digitisation eval review",
    }
    body = {
        "model": judge_model,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
    }
    resp = requests.post(OPENROUTER_URL, headers=headers, json=body, timeout=timeout)
    resp.raise_for_status()
    payload = resp.json()
    content = payload["choices"][0]["message"]["content"]
    verdicts = extract_json(content)
    usage = payload.get("usage", {})
    return verdicts, usage


def extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"Judge returned non-JSON content: {text[:200]}")


def normalise_verdict(raw: Any) -> dict[str, str]:
    if not isinstance(raw, dict):
        return {"verdict": "unverifiable", "reason": "judge output malformed"}
    verdict = str(raw.get("verdict", "")).strip().lower()
    if verdict not in VERDICTS:
        verdict = "unverifiable"
    reason = str(raw.get("reason", "")).strip()[:200]
    return {"verdict": verdict, "reason": reason}


def review_run(
    run_dir: Path, input_dir: Path, judge_model: str, api_key: str, limit: int | None
) -> dict[str, Any]:
    run_meta = json.loads((run_dir / "run.json").read_text())
    responses = sorted((run_dir / "responses").glob("*.json"))
    if limit:
        responses = responses[:limit]

    review_dir = run_dir / "review"
    review_dir.mkdir(exist_ok=True)
    per_file: list[dict[str, Any]] = []
    field_counts: dict[str, dict[str, int]] = {f: {v: 0 for v in VERDICTS} for f in FIELDS}
    usage_totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    for idx, resp_path in enumerate(responses, start=1):
        rec = json.loads(resp_path.read_text())
        file_rel = rec.get("file")
        case_data = ((rec.get("result") or {}).get("caseData") or {})
        if not case_data:
            print(f"[{idx}/{len(responses)}] {file_rel} — skipped (no caseData)")
            continue

        source = input_dir / file_rel
        if not source.is_file():
            print(f"[{idx}/{len(responses)}] {file_rel} — source missing")
            continue

        print(f"[{idx}/{len(responses)}] {file_rel} ...", flush=True)
        started = time.monotonic()
        try:
            if source.suffix.lower() == ".pdf":
                raw_pages = render_pdf_pages(source)
            else:
                raw_pages = image_path_to_bytes(source)
            data_urls = [to_data_url(b) for b in raw_pages]
            messages = build_messages(case_data, data_urls)
            verdicts_raw, usage = call_judge(judge_model, api_key, messages)
        except Exception as exc:
            print(f"  → judge error: {exc}")
            per_file.append({"file": file_rel, "error": str(exc)})
            continue

        normalised = {f: normalise_verdict(verdicts_raw.get(f, {})) for f in FIELDS}
        for f, v in normalised.items():
            field_counts[f][v["verdict"]] += 1
        for key in usage_totals:
            usage_totals[key] += usage.get(key, 0) or 0
        latency = round(time.monotonic() - started, 2)

        out = {
            "file": file_rel,
            "judge": judge_model,
            "latency_s": latency,
            "verdicts": normalised,
            "extracted": case_data,
            "usage": usage,
        }
        per_file.append(out)
        safe = file_rel.replace("/", "__")
        (review_dir / f"{Path(safe).stem}.json").write_text(json.dumps(out, indent=2))
        correct = sum(1 for v in normalised.values() if v["verdict"] == "correct")
        print(f"  → {correct}/{len(FIELDS)} correct ({latency}s)")

    summary = {
        "judge": judge_model,
        "field_counts": field_counts,
        "field_accuracy": {
            f: round(field_counts[f]["correct"] / max(1, sum(field_counts[f].values())), 3)
            for f in FIELDS
        },
        "overall_accuracy": round(
            sum(field_counts[f]["correct"] for f in FIELDS)
            / max(1, sum(sum(c.values()) for c in field_counts.values())),
            3,
        ),
        "usage": usage_totals,
    }

    report = {
        "eval_id": run_meta.get("eval_id"),
        "extraction_model": run_meta.get("model"),
        "judge_model": judge_model,
        "reviewed_count": sum(1 for r in per_file if "verdicts" in r),
        "error_count": sum(1 for r in per_file if "error" in r),
        "summary": summary,
        "per_file": per_file,
    }
    (run_dir / "review.json").write_text(json.dumps(report, indent=2))
    write_review_markdown(run_dir, report)
    return report


def write_review_markdown(run_dir: Path, report: dict[str, Any]) -> None:
    s = report["summary"]
    lines: list[str] = []
    lines.append(f"# Review — {report['eval_id']}")
    lines.append("")
    lines.append(f"- **Extraction model**: `{report['extraction_model']}`")
    lines.append(f"- **Judge model**: `{report['judge_model']}`")
    lines.append(f"- **Reviewed**: {report['reviewed_count']} files ({report['error_count']} errors)")
    lines.append(f"- **Overall accuracy (judge)**: {s['overall_accuracy']}")
    usage = s.get("usage", {})
    if usage:
        lines.append(f"- **Judge tokens**: prompt {usage.get('prompt_tokens')}, completion {usage.get('completion_tokens')}, total {usage.get('total_tokens')}")
    lines.append("")
    lines.append("## Per-field verdicts")
    lines.append("")
    lines.append("| Field | Accuracy | correct | partial | wrong | missing | unverifiable |")
    lines.append("|---|---|---|---|---|---|---|")
    for f in FIELDS:
        counts = s["field_counts"][f]
        lines.append(
            f"| `{f}` | {s['field_accuracy'][f]} | "
            f"{counts['correct']} | {counts['partial']} | {counts['wrong']} | "
            f"{counts['missing']} | {counts['unverifiable']} |"
        )
    lines.append("")
    lines.append("## Per-file verdicts")
    lines.append("")
    lines.append("| File | " + " | ".join(f"`{f}`" for f in FIELDS) + " |")
    lines.append("|---|" + "|".join(["---"] * len(FIELDS)) + "|")
    glyph = {"correct": "✓", "partial": "~", "wrong": "✗", "missing": "∅", "unverifiable": "?"}
    for r in report["per_file"]:
        if "verdicts" not in r:
            continue
        cells = []
        for f in FIELDS:
            v = r["verdicts"][f]
            cells.append(f"{glyph.get(v['verdict'], '?')} <sub>{v['reason']}</sub>")
        lines.append(f"| `{r['file']}` | " + " | ".join(cells) + " |")
    lines.append("")
    lines.append("Legend: ✓ correct · ~ partial · ✗ wrong · ∅ missing · ? unverifiable")

    (run_dir / "review.md").write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="LLM-as-judge review of an eval run.")
    parser.add_argument("eval_id")
    parser.add_argument("--outputs-dir", type=Path, default=DEFAULT_OUTPUTS_DIR)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--judge", default=DEFAULT_JUDGE)
    parser.add_argument("--limit", type=int, default=None, help="Review only first N files.")
    args = parser.parse_args()

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("OPENROUTER_API_KEY not set.", file=sys.stderr)
        return 2

    run_dir = args.outputs_dir / args.eval_id
    if not run_dir.is_dir():
        print(f"Run not found: {run_dir}", file=sys.stderr)
        return 1

    report = review_run(run_dir, args.input_dir, args.judge, api_key, args.limit)
    print(f"\nWrote {run_dir / 'review.md'}")
    print(f"Overall accuracy: {report['summary']['overall_accuracy']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

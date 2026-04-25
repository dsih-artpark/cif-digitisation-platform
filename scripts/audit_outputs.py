"""Generate a human-readable audit report for a single eval run.

For each file, prints extracted caseData fields in a compact markdown table,
alongside a relative link to the source PDF so a reviewer can cross-check
by opening the PDF locally. Writes audit.md into the run directory.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUTS_DIR = REPO_ROOT / "eval" / "outputs"
DEFAULT_INPUTS_DIR = REPO_ROOT / "eval" / "inputs"

FIELDS = [
    "patient_name", "age", "sex", "location", "village", "date",
    "test_type", "result", "pathogen", "treatment", "temperature", "hb_level",
]


def load_responses(run_dir: Path) -> list[dict[str, Any]]:
    responses_dir = run_dir / "responses"
    if not responses_dir.is_dir():
        return []
    records = []
    for p in sorted(responses_dir.glob("*.json")):
        records.append(json.loads(p.read_text()))
    return records


def fmt(val: Any) -> str:
    if val is None or val == "":
        return "_—_"
    return str(val).replace("|", "\\|").replace("\n", " ")


def field_value(record: dict[str, Any], field: str) -> Any:
    result = record.get("result") or {}
    case_data = result.get("caseData") or {}
    return case_data.get(field)


def write_audit(run_dir: Path, input_dir: Path) -> Path:
    records = load_responses(run_dir)
    if not records:
        raise SystemExit(f"No responses under {run_dir}")

    run_meta_path = run_dir / "run.json"
    run_meta = json.loads(run_meta_path.read_text()) if run_meta_path.exists() else {}

    lines: list[str] = []
    lines.append(f"# Audit — {run_meta.get('eval_id', run_dir.name)}")
    lines.append("")
    lines.append(f"- **Model**: `{run_meta.get('model', 'unknown')}`")
    lines.append(f"- **Started**: {run_meta.get('started_at', '')}")
    lines.append(f"- **Input dir**: `{run_meta.get('input_dir', input_dir)}`")
    summary = run_meta.get("summary") or {}
    if summary:
        lines.append(f"- **Success**: {summary.get('success_rate', 'n/a')} ({summary.get('status_counts', {})})")
        latency = summary.get("latency_s", {})
        if latency:
            lines.append(f"- **Latency (s)**: mean {latency.get('mean')}, median {latency.get('median')}, p95 {latency.get('p95', 'n/a')}")
        tokens = summary.get("tokens", {})
        if tokens:
            lines.append(f"- **Tokens**: prompt {tokens.get('prompt')}, completion {tokens.get('completion')}, total {tokens.get('total')}")
    lines.append("")
    lines.append("## Per-file extractions")
    lines.append("")
    lines.append("| # | File | " + " | ".join(FIELDS) + " | Latency | Status |")
    lines.append("|---|---|" + "|".join(["---"] * (len(FIELDS) + 2)) + "|")

    for idx, rec in enumerate(records, start=1):
        file_rel = rec.get("file", "?")
        pdf_link = f"[{file_rel}]({(input_dir / file_rel).relative_to(run_dir.parent, walk_up=True) if hasattr(Path, 'walk_up') else file_rel})"
        values = [fmt(field_value(rec, f)) for f in FIELDS]
        latency = rec.get("latency_s")
        status = rec.get("status", "?")
        lines.append(
            f"| {idx} | {pdf_link} | " + " | ".join(values) +
            f" | {latency or '—'}s | {status} |"
        )

    lines.append("")
    lines.append("## How to review")
    lines.append("")
    lines.append("1. Open each PDF alongside this report.")
    lines.append("2. For every field, mark correctness: correct / partial / wrong / missing.")
    lines.append("3. Patterns to watch: date format, age units, sex casing, location vs village splits, pathogen codes (Pf / Pv / Mixed), unknown-marker handling.")
    lines.append("4. Flag any field the model confidently hallucinated (confident but wrong).")

    audit_path = run_dir / "audit.md"
    audit_path.write_text("\n".join(lines) + "\n")
    return audit_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate audit.md for an eval run.")
    parser.add_argument("eval_id", help="Eval id (subfolder name under eval/outputs).")
    parser.add_argument("--outputs-dir", type=Path, default=DEFAULT_OUTPUTS_DIR)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUTS_DIR)
    args = parser.parse_args()

    run_dir = args.outputs_dir / args.eval_id
    if not run_dir.is_dir():
        print(f"Run not found: {run_dir}", file=sys.stderr)
        return 1
    out = write_audit(run_dir, args.input_dir)
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

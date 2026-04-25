"""Compare N eval runs and report per-field concordance across models.

Usage:
    python scripts/compare_runs.py <eval_id_1> <eval_id_2> [<eval_id_3> ...]

For each file present in all runs, compares the 12 caseData fields across runs.
Concordance = fraction of fields where all models agree (after light normalization
— lowercase, trimmed, unknown-markers collapsed). Writes a markdown report.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUTS_DIR = REPO_ROOT / "eval" / "outputs"

FIELDS = [
    "patient_name", "age", "sex", "location", "village", "date",
    "test_type", "result", "pathogen", "treatment", "temperature", "hb_level",
]
UNKNOWN_MARKERS = {"", "n/a", "na", "none", "unknown", "not mentioned", "-", "--", "null"}


def normalize(value: Any) -> str:
    if value is None:
        return ""
    s = str(value).strip().lower()
    s = re.sub(r"\s+", " ", s)
    if s in UNKNOWN_MARKERS:
        return ""
    return s


def load_run(run_dir: Path) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    run_meta = json.loads((run_dir / "run.json").read_text())
    records: dict[str, dict[str, Any]] = {}
    for p in sorted((run_dir / "responses").glob("*.json")):
        rec = json.loads(p.read_text())
        records[rec.get("file", p.stem)] = rec
    return run_meta, records


def field_value(record: dict[str, Any], field: str) -> Any:
    return ((record.get("result") or {}).get("caseData") or {}).get(field)


def compare(runs: list[tuple[dict[str, Any], dict[str, dict[str, Any]]]]) -> dict[str, Any]:
    files = set(runs[0][1].keys())
    for _, recs in runs[1:]:
        files &= set(recs.keys())
    files = sorted(files)

    per_file: list[dict[str, Any]] = []
    field_agree = {f: 0 for f in FIELDS}
    field_total = {f: 0 for f in FIELDS}

    for f in files:
        row = {"file": f, "fields": {}}
        agree_count = 0
        for field in FIELDS:
            raw_vals = [field_value(recs[f], field) for _, recs in runs]
            norm_vals = [normalize(v) for v in raw_vals]
            all_agree = len(set(norm_vals)) == 1
            row["fields"][field] = {"values": raw_vals, "agree": all_agree}
            field_total[field] += 1
            if all_agree:
                field_agree[field] += 1
                agree_count += 1
        row["concordance"] = round(agree_count / len(FIELDS), 3)
        per_file.append(row)

    field_rates = {
        f: round(field_agree[f] / field_total[f], 3) if field_total[f] else 0.0
        for f in FIELDS
    }
    overall = (
        round(sum(field_agree.values()) / sum(field_total.values()), 3)
        if sum(field_total.values()) else 0.0
    )
    return {"files": files, "per_file": per_file, "field_rates": field_rates, "overall": overall}


def write_report(
    report: dict[str, Any], run_metas: list[dict[str, Any]], out_dir: Path
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    models = [m.get("model", "?") for m in run_metas]
    eval_ids = [m.get("eval_id", "?") for m in run_metas]

    lines: list[str] = []
    lines.append(f"# Concordance — {len(run_metas)} runs")
    lines.append("")
    for meta in run_metas:
        s = meta.get("summary", {})
        lines.append(
            f"- **{meta.get('eval_id', '?')}** — `{meta.get('model', '?')}` "
            f"(success {s.get('success_rate', '?')}, n={s.get('total', '?')})"
        )
    lines.append("")
    lines.append(f"**Overall field-agreement**: {report['overall']} "
                 f"(across {len(report['files'])} files × {len(FIELDS)} fields)")
    lines.append("")

    lines.append("## Agreement rate by field")
    lines.append("")
    lines.append("| Field | Agreement |")
    lines.append("|---|---|")
    for f, rate in report["field_rates"].items():
        lines.append(f"| `{f}` | {rate} |")
    lines.append("")

    lines.append("## Per-file disagreements")
    lines.append("")
    header = "| File | Concordance | " + " | ".join(f"`{f}`" for f in FIELDS) + " |"
    sep = "|---|---|" + "|".join(["---"] * len(FIELDS)) + "|"
    lines.append(header)
    lines.append(sep)

    def fmt(v: Any) -> str:
        if v is None or v == "":
            return "_—_"
        s = str(v).replace("|", "\\|").replace("\n", " ")
        return s[:40] + ("…" if len(s) > 40 else "")

    for row in report["per_file"]:
        cells = []
        for field in FIELDS:
            entry = row["fields"][field]
            if entry["agree"]:
                cells.append(fmt(entry["values"][0]))
            else:
                parts = [f"**{models[i]}**: {fmt(v)}" for i, v in enumerate(entry["values"])]
                cells.append("<br>".join(parts))
        lines.append(f"| `{row['file']}` | {row['concordance']} | " + " | ".join(cells) + " |")

    lines.append("")
    lines.append("## Interpretation")
    lines.append("")
    lines.append("- Bold labels indicate which run produced which value when runs disagree.")
    lines.append("- High field-agreement ≠ correctness — all models may agree on the same wrong answer. Use with audit.md side-by-side against source PDFs.")
    lines.append("- Low-agreement fields are the ones most worth labelling ground truth for.")

    compare_id = "compare__" + "__vs__".join(eval_ids)
    out_path = out_dir / compare_id
    out_path.mkdir(exist_ok=True)
    report_path = out_path / "concordance.md"
    report_path.write_text("\n".join(lines) + "\n")
    data_path = out_path / "concordance.json"
    data_path.write_text(json.dumps({
        "runs": run_metas,
        "overall": report["overall"],
        "field_rates": report["field_rates"],
        "per_file": report["per_file"],
    }, indent=2))
    return report_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare N eval runs for concordance.")
    parser.add_argument("eval_ids", nargs="+", help="Two or more eval ids.")
    parser.add_argument("--outputs-dir", type=Path, default=DEFAULT_OUTPUTS_DIR)
    args = parser.parse_args()

    if len(args.eval_ids) < 2:
        print("Need at least 2 eval ids.", file=sys.stderr)
        return 1

    runs = []
    metas = []
    for eid in args.eval_ids:
        run_dir = args.outputs_dir / eid
        if not run_dir.is_dir():
            print(f"Run not found: {run_dir}", file=sys.stderr)
            return 1
        meta, recs = load_run(run_dir)
        runs.append((meta, recs))
        metas.append(meta)

    report = compare(runs)
    out = write_report(report, metas, args.outputs_dir)
    print(f"Wrote {out}")
    print(f"Overall concordance: {report['overall']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

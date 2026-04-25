# CLAUDE.md

Standing instructions for Claude Code working in this repo. Loaded into every session — keep it lean.

## Project one-liner

FastAPI + React platform that OCRs handwritten/scanned CIF (case investigation) forms into structured records via OpenRouter LLMs. Serves ~10 concurrent public-health users; target release end of May 2026.

## Hard rules

- **Use `uv`, never raw `pip`.** All Python deps via `uv add` / `uv sync` so the lockfile stays authoritative. Experiment-only deps go in an `[project.optional-dependencies]` group (e.g. `uv add <pkg> --directory backend --optional eval`), so production installs stay lean. Running tools: `uv run --directory backend <cmd>` or `backend/.venv/bin/<tool>` directly.
- **Python is pinned to 3.13.** System Python 3.14 breaks `pillow-heif` wheels. `uv sync --directory backend --python 3.13`.
- **Never read, echo, or pass `.env` values.** `.env` is gitignored; the bash hook blocks reads. Redirect backend logs to a file you don't open.
- **Don't commit anything under `eval/inputs/`, `eval/outputs/`, `notes/`, or `backend/data/`.** PHI risk + reproducible-from-source.

## Sharp edges — read before acting

- **Backend startup requires a working Vite build.** `backend/app/main.py:46` hard-calls `ensure_frontend_build()`; middleware at `main.py:30` can also fork `npm` per request. Headless API workflows need `dist/index.html` fresh. Tracked as P0 in Linear (EXP-147).
- **`dist/` lives at repo root**, not `frontend/dist/` (`config.py:22`, `vite.config.js:20 outDir: "../dist"`). Non-standard; don't "fix" it without checking the backend serving path.
- **Auth0 is optional.** If `AUTH0_DOMAIN`/`AUDIENCE`/`ISSUER` aren't all set, `AUTH0_ENABLED=False` and the API runs in demo mode (no auth).
- **Job state is in-memory.** Restart = lost jobs.
- **LLM output is not schema-validated.** `extraction_service.py` JSON-parses then trusts shape.

## Commands

```bash
# First-time setup
uv sync --directory backend --python 3.13
cd frontend && npm install && npm run build && cd ..

# Run backend (from repo root)
backend/.venv/bin/python -m backend.main          # → http://localhost:8787

# Eval harness (when on feat/extraction-eval-harness or descendants)
backend/.venv/bin/python scripts/run_eval.py                    # full pipeline run
backend/.venv/bin/python scripts/audit_outputs.py <eval-id>     # extraction table
backend/.venv/bin/python scripts/compare_runs.py <a> <b> ...    # N-way concordance
backend/.venv/bin/python scripts/review_outputs.py <eval-id>    # LLM-as-judge

# Lint/format
pre-commit run --all-files
```

## Branch / PR conventions

See `CONTRIBUTING.md`. Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `audit`, `hotfix`. Kebab-case, <40 chars, no personal prefixes. Don't rename job-schema fields (frontend hardcodes them).

## Where context lives

- `notes/audit.md` — full codebase audit (2026-04-24 snapshot, gitignored)
- `notes/todo.md` — prioritised backlog (P0–P3)
- `notes/deployment_requirements.md` — auth/queue/container/CI/LLM-budget goals
- `notes/severity_scoring.md` — malaria-pov severity rubric (draft v0.1; pending WJCF review)
- `docs/consolidated_project_report.md` — problem statement, roadmap, LLM eval (committed)
- Linear project "Gadchiroli Digitisation tool for Malaria" (team Explorations) — issue tracker

## Self-maintenance (recursive correction)

This file drifts faster than code. Before ending a non-trivial turn:

1. **New sharp edge discovered** (undocumented requirement, version pin, gotcha)? Add to *Sharp edges* or *Hard rules*.
2. **Existing entry stale** (P0 fixed, file moved, invariant relaxed)? Edit or delete.
3. **New convention established** (command, directory, test harness)? Add under *Commands* or *Where context lives*.

Rules: stay lean (~100 line ceiling), delete before adding, no narration, no changelog (`git log CLAUDE.md` is the changelog), cite paths with `:line` for code references.

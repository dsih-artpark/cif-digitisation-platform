# CLAUDE.md

Standing instructions for Claude Code working in this repo. Keep this file lean — it's loaded into every session, so noise costs tokens on every run.

## Project one-liner

FastAPI + React platform that OCRs handwritten/scanned CIF (case investigation) forms into structured records via OpenRouter LLMs. Serves ~10 concurrent public-health users; target release end of May 2026.

## Sharp edges — read before acting

- **Backend startup requires a working Vite build.** `backend/app/main.py:46` hard-calls `ensure_frontend_build()`; middleware at `main.py:30` can also fork `npm` per request. If you're running the API headlessly (eval, CI), you need `dist/index.html` fresh. Flagged P0 in `notes/todo.md`.
- **Python must be 3.13** for `pillow-heif` prebuilt wheels. System Python 3.14 will try to compile from source against Homebrew libheif 1.21 and fail. Use `uv sync --directory backend --python 3.13`.
- **`dist/` lives at repo root**, not `frontend/dist/` (`config.py:22`, `vite.config.js:20 outDir: "../dist"`). Non-standard; don't "fix" it without checking the backend serving path.
- **Auth0 is optional.** If `AUTH0_DOMAIN`/`AUDIENCE`/`ISSUER` aren't all set, `AUTH0_ENABLED=False` and the API runs in demo mode (no auth). Don't assume auth is on.
- **Job state is in-memory.** Restart = lost jobs. Don't design features that assume durable job history.
- **LLM output is not schema-validated.** `extraction_service.py` JSON-parses then trusts shape. Treat it as untrusted input when adding downstream consumers.

## Secrets hygiene

- `.env` is gitignored. Never `cat`/`Read`/`grep` it, never echo its values, never pass keys on command lines. Redirect backend logs to a file you don't read.
- Don't commit anything under `eval/inputs/`, `notes/`, or `backend/data/` — they may contain PHI or keys.

## Commands

```bash
# First-time setup
uv sync --directory backend --python 3.13
cd frontend && npm install && npm run build && cd ..

# Run backend (from repo root)
backend/.venv/bin/python -m backend.main    # → http://localhost:8787

# Headless eval against /digitize
python scripts/run_eval.py                  # reads eval/inputs/, writes eval/runs/<ts>/

# Lint/format (backend only today; no frontend linter yet)
pre-commit run --all-files
```

## Branch / PR conventions

See `CONTRIBUTING.md`. Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `audit`, `hotfix`. Kebab-case, <40 chars, no personal prefixes. Don't rename job-schema fields (frontend hardcodes them).

## Where context lives

- `notes/audit.md` — full codebase audit (2026-04-24 snapshot)
- `notes/todo.md` — prioritised backlog (P0–P3); source of truth for Linear imports
- `notes/deployment_requirements.md` — auth/queue/container/CI/LLM-budget goals
- `docs/consolidated_project_report.md` — problem statement, roadmap, LLM eval

## Self-maintenance (recursive correction)

This file drifts faster than code. When Claude finishes a non-trivial task, before ending the turn:

1. **Did you hit a new sharp edge** (undocumented startup requirement, version pin, env var, gotcha)? Add it to *Sharp edges*.
2. **Did an existing entry turn out to be wrong or stale** (a P0 fixed, a file moved, an invariant relaxed)? Edit or delete it.
3. **Did a convention get established** (new command, new directory, new test harness)? Add it under *Commands* or *Where context lives*.
4. **Did a memory/note supersede something here**? Collapse the duplicate — keep the canonical location, leave a one-line pointer.

Rules for edits:
- Stay lean. If this file passes ~100 lines, something belongs in `notes/` or `docs/` instead.
- Delete before you add. Stale guidance is worse than no guidance.
- Don't narrate — update the facts. No changelog at the bottom; `git log CLAUDE.md` is the changelog.
- Cite file paths with `:line` when pointing at code.

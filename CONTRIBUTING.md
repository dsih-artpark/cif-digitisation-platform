# Contributing to CIF Digitisation Platform

Thanks for your interest in contributing. This document covers the local setup, code style, and workflow for submitting changes.

## Prerequisites

- **Python 3.12+**
- **Node.js 20.x** and **npm**
- **[uv](https://github.com/astral-sh/uv)** — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- An **OpenRouter API key** (free tier works for development)
- Optional: Auth0 tenant (demo mode works without it)
- Optional: AWS credentials + S3 bucket (some flows are skipped without these)

## Local setup

```bash
# 1. Clone
git clone https://github.com/dsih-artpark/cif-digitisation-platform.git
cd cif-digitisation-platform

# 2. Configure environment
cp example.env .env
# then edit .env — at minimum set OPENROUTER_API_KEY

# 3. Install backend dependencies
uv sync --directory backend

# 4. Install frontend dependencies
cd frontend && npm install && cd ..

# 5. Install root-level tooling (for scripts/dev-all.mjs)
npm install

# 6. Run both servers (backend + Vite)
npm run dev:all
```

Backend serves on `http://localhost:8787`, frontend dev server on `http://localhost:5173` (proxies API calls to the backend).

### Running services individually

```bash
# Backend only
python -m backend.main

# Frontend only
cd frontend && npm run dev
```

### Demo mode (no Auth0)

Leave the `AUTH0_*` variables unset in `.env`. The landing page will expose a role-selection UI (Admin / FLW / Medical Officer) so you can exercise the flow without configuring an identity provider.

## Repository layout

See `docs/consolidated_project_report.md` for the full architectural context. At a glance:

- `backend/app/api/v1/endpoints/` — HTTP routes
- `backend/app/services/` — business logic (extraction, normalization, persistence, S3, jobs)
- `backend/app/schemas/` — Pydantic request/response models
- `backend/app/models/` — SQLAlchemy ORM models
- `frontend/src/pages/` — top-level routes
- `frontend/src/components/` — shared UI pieces
- `frontend/src/context/CifContext.jsx` — global state
- `validation/` — Pydantic prescription schemas (secondary path)
- `scripts/` — deploy, launch, dev-all automation

## Code style

### Python (backend)
- **Formatter**: Black, 100-char line length
- **Linter**: Ruff (rules: E, F, I, UP, B; ignores E501)
- Install hooks: `pre-commit install` — they run on every commit
- Prefer explicit type hints; the codebase uses `from __future__ import annotations`

### JavaScript (frontend)
- No formatter/linter is enforced yet; match surrounding style
- Function components + hooks only; no class components
- Keep global state in `CifContext`; avoid introducing parallel contexts without discussion

### Commit messages
- Imperative mood, present tense: `Add pathogen normalization` not `Added pathogen normalization`
- Scope prefix when helpful: `backend:`, `frontend:`, `ci:`, `docs:`

## Tests

Test coverage is currently minimal — adding tests alongside your change is strongly encouraged. When the test harness lands, run:

```bash
# Backend
uv run --directory backend pytest

# Frontend (once configured)
cd frontend && npm test
```

## Branch conventions

Branch off `main`. Use the format `<type>/<short-kebab-description>`.

### Allowed types

| Type       | Use for                                         | Example                         |
|------------|-------------------------------------------------|---------------------------------|
| `feat`     | New user-facing feature                         | `feat/pathogen-aliases`         |
| `fix`      | Bug fix                                         | `fix/job-eta-drift`             |
| `refactor` | Internal restructure, no behaviour change       | `refactor/split-cif-context`    |
| `perf`     | Performance improvement                         | `perf/image-preprocess-timeout` |
| `test`     | Adding or fixing tests                          | `test/normalization-service`    |
| `docs`     | Documentation only                              | `docs/setup-guide`              |
| `chore`    | Tooling, deps, config, build                    | `chore/bump-fastapi`            |
| `ci`       | CI/CD pipeline changes                          | `ci/add-lint-step`              |
| `audit`    | Code audit / review branches                    | `audit/initial-review`          |
| `hotfix`   | Urgent production fix, branched off `main`      | `hotfix/auth0-jwks-cache`       |

### Naming rules

- Lowercase only; words separated by hyphens (`kebab-case`)
- Keep it under ~40 characters — describe the change, not the file
- No issue numbers in the branch name; reference them in the PR description
- No personal prefixes (`adi/...`); the type prefix is enough
- One branch per logical change — split unrelated work into separate branches

### Protected branches

- `main` — default integration branch; merges via PR only
- `production` — deploy trigger; fast-forward merges from `main` only

## Pull request workflow

1. Create a branch per the conventions above
2. Keep PRs focused — one logical change per PR
3. Update docs (`docs/`, `README.md`, `example.env`) when you change behaviour or config
4. Fill in the PR description: what, why, how to test; link related issues
5. Ensure `pre-commit` passes locally before pushing
6. Rebase on `main` before merging; squash-merge unless the history is worth preserving

## Things to avoid

- Do **not** rename fields in the job schema returned by `/digitize/{job_id}` — the frontend hardcodes them
- Do **not** change Auth0 env var keys without updating both backend and frontend
- Do **not** add new DB columns without updating both the SQLAlchemy model and `persistence_service`
- Do **not** commit `.env`, API keys, or sample patient data
- Do **not** introduce breaking changes to `NormalizedCaseData` without coordinating with the frontend review page

## Reporting bugs / requesting features

Open an issue on GitHub with:
- What you expected
- What actually happened
- Steps to reproduce
- Environment (OS, Python/Node versions)
- Relevant logs (scrub any PII)

## Questions

Reach out via the repository issues or the team Slack channel (ask a maintainer for the link).

# CIF Digitisation Platform

Case Investigation Form digitisation platform with:
- `frontend/`: React + Vite UI
- `backend/`: FastAPI server
- `dist/`: built frontend served by the backend

## Project Structure

```text
.
|-- backend/
|-- frontend/
|-- dist/
|-- scripts/
|-- validation/
|-- example.env
|-- README.md
```

## Prerequisites

Install these first:
- Python `3.12+`
- Node.js `18+`
- `uv`

Useful links:
- Python: `https://www.python.org/downloads/`
- Node.js: `https://nodejs.org/`
- uv: `https://docs.astral.sh/uv/getting-started/installation/`

## 1. Clone The Project

```bash
git clone https://github.com/dsih-artpark/cif-digitisation-platform.git
cd cif-digitisation-platform
```

If you already have the repo, just open the project root.

## 2. Create Environment File

Create `.env` in the project root using `example.env`.

Example:

```env
# Backend
API_PORT=8787
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=your_openrouter_api_key_here
GATEKEEPER_AUTH_ENABLED=false
GATEKEEPER_AUTH_URL=https://auth.artpark.ai

# Frontend
VITE_API_BASE_URL=http://localhost:8787
```

Notes:
- Keep `GATEKEEPER_AUTH_ENABLED=false` for normal local development.
- Turn it on only when the app is deployed behind Gatekeeper.

## 3. Install Dependencies From Scratch

From the project root:

### Backend

```bash
uv sync --directory backend
```

### Frontend

```bash
cd frontend
npm install
cd ..
```

## 4. Start The Application Locally

There are 2 ways to run the app.

### Option A: Recommended Local Development

Run frontend and backend separately.

Frontend terminal:

```bash
cd frontend
npm run dev
```

Backend terminal:

```bash
uv run python -m backend.main
```

Open:
- Frontend: `http://localhost:5173`
- Backend API / backend-served app: `http://localhost:8787`

This is the best mode while editing React files.

### Option B: Run Only From Backend

Use this when you want the frontend to load from `localhost:8787`.

```bash
cd frontend
npm run build
cd ..
uv run python -m backend.main
```

Open:
- `http://localhost:8787`

Notes:
- the backend serves the built files from `dist/`
- the backend also checks frontend changes and rebuilds before serving when needed

## 5. Helpful Commands

Run backend:

```bash
uv run python -m backend.main
```

Run frontend only:

```bash
cd frontend
npm run dev
```

Run frontend + backend together from frontend scripts:

```bash
cd frontend
npm run dev:all
```

Build frontend:

```bash
cd frontend
npm run build
```

Preview built frontend:

```bash
cd frontend
npm run preview
```

## 6. Gatekeeper Mode

This project supports Gatekeeper-backed authentication for deployed environments.

Use these env values on server:

```env
GATEKEEPER_AUTH_ENABLED=true
GATEKEEPER_AUTH_URL=https://auth.artpark.ai
```

In Gatekeeper mode, the backend expects these forwarded headers:
- `X-Auth-User`
- `X-Auth-Role`
- `X-Auth-Name`

Important:
- local development should normally keep Gatekeeper disabled
- if the deployed app is already protected before the landing page opens, that behavior comes from upstream proxy / server configuration, not from this repo alone

## 7. Run On Server

On the server:

```bash
cd ~/cif-digitisation-platform
cp example.env .env
nano .env
```

Then install and build:

```bash
uv sync --directory backend
cd frontend
npm ci
npm run build
cd ..
```

If `cif-app` systemd service already exists:

```bash
sudo systemctl restart cif-app
sudo systemctl status cif-app --no-pager
```

If you want to run manually:

```bash
uv run python -m backend.main
```

Live logs:

```bash
journalctl -u cif-app -f
```

## 8. Common Problems

### React changes are not visible on `localhost:8787`

Use one of these:
- run frontend separately with `npm run dev`
- or rebuild frontend with `npm run build`

### `pre-commit` / git hook says module not found

Run:

```bash
uv sync --directory backend --group dev
```

### Gatekeeper login works but access is denied

Check:
- the user has the correct role granted in Gatekeeper
- the deployed environment forwards `X-Auth-Role`
- you are not reusing an old Gatekeeper SSO session from another user

## 9. Quick Start Summary

If you just want the shortest working flow from scratch:

```bash
uv sync --directory backend
cd frontend
npm install
npm run dev
```

In another terminal:

```bash
uv run python -m backend.main
```

Then open:
- `http://localhost:5173`

Or, for backend-served UI:

```bash
cd frontend
npm run build
cd ..
uv run python -m backend.main
```

Then open:
- `http://localhost:8787`

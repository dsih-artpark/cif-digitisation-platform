# CIF Digitisation Platform

Local development setup for the CIF digitisation demo app with a split root layout:

- `frontend/`
- `backend/`
- other files

## Stack

- Frontend: React + Vite
- Backend: FastAPI
- Python environment: `uv`

## Project Structure

```text
.
|-- backend/              FastAPI backend code
|   |-- pyproject.toml    Python dependencies
|   |-- uv.lock           Locked Python dependencies
|-- frontend/             React frontend app
|   |-- public/           Static frontend assets
|   |-- scripts/          Frontend helper scripts
|   |-- src/              React source code
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|-- scripts/              Deployment and local helper scripts
|-- validation/           Validation models and examples
|-- example.env           Sample environment variables
|-- README.md
```

## Prerequisites

- Node.js 18+
- Python 3.12+
- `uv`

## Environment Setup

Create `.env` from `example.env`.

Example:

```env
API_PORT=8787
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_API_BASE_URL=http://localhost:8787
```

## Install Dependencies

From the project root:

```powershell
uv sync --directory backend
cd frontend
npm install
```

## Run Locally

### Option 1: Run frontend and backend together

```powershell
cd frontend
npm run dev:all
```

Open:

- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8787/docs`

### Option 2: Run frontend and backend separately

Backend:

```powershell
cd frontend
npm run dev:backend
```

Frontend:

```powershell
cd frontend
npm run dev
```

## Run As One Local App

Build the frontend into the root `dist/` folder and serve it through FastAPI:

```powershell
cd frontend
npm run build:full
```

Open:

- App: `http://localhost:8787`
- API docs: `http://localhost:8787/docs`

If port `8787` is already in use, stop the running process first before using `build:full`.

## Demo Access

The landing page uses a local demo flow.

- Click any role card
- Choose `Sign In` or `Sign Up`
- The app opens the matching demo landing page directly

## Lightsail Deployment

This repo deploys from GitHub Actions over SSH. The Lightsail server does not need to clone the private repository.

Required GitHub Actions secrets:

- `LIGHTSAIL_HOST`
- `LIGHTSAIL_USER`
- `LIGHTSAIL_SSH_KEY`
- `LIGHTSAIL_PORT` (optional, defaults to `22`)

On each push to `main`, the workflow will:

- check out the repo in GitHub Actions
- install frontend dependencies in `frontend/`
- build the frontend in GitHub Actions with Vite
- upload a deployment bundle to Lightsail over SSH
- sync Python dependencies with `uv` from `backend/`
- restart the `cif-app` systemd service

The server-side deploy helper used by the workflow is [scripts/deploy.sh](/c:/Users/nithi/Desktop/WIF%20Digitisation%20Project/scripts/deploy.sh).

If you want a production API base URL baked into the frontend build, add a repository variable named `VITE_API_BASE_URL` in GitHub.

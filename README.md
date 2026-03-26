# CIF Digitisation Platform

Digitisation workflow for CIF documents generated at PHCs, with a React frontend and a FastAPI backend.

## Current Architecture

- Frontend: React + Vite in [`src/`](./src)
- Backend: FastAPI in [`backend/`](./backend)
- Production/runtime model: the backend serves the built frontend from [`dist/`](./dist), so users access it as one application
- Access model: local demo role selection for `admin`, `front_line_worker`, and `medical_officer`

## Project Layout

```text
.
|-- backend/              Python backend code
|   |-- app.py            FastAPI app
|   |-- main.py           Backend entrypoint
|-- public/               Static frontend assets
|-- scripts/              Helper scripts
|-- src/                  React application
|-- validation/           Validation models/examples
|-- package.json          Frontend/npm scripts
|-- example.env           Example environment variables
|-- pyproject.toml        Root Python project metadata and dependencies
|-- uv.lock               Locked Python dependency versions
|-- README.md
```

## Prerequisites

- Node.js 18+
- Python 3.12+
- `uv`

## Environment Variables

Create `.env` from [`example.env`](./example.env).

Example:

```env
API_PORT=8787
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_API_BASE_URL=http://localhost:8787
```

## Install

From the project root:

```powershell
npm install
uv sync
```

## Run In Development

### Option 1: Frontend and backend together

```powershell
npm run dev:all
```

Opens:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8787`
- API docs: `http://localhost:8787/docs`

### Option 2: Run separately

Backend:

```powershell
npm run dev:backend
```

Frontend:

```powershell
npm run dev
```

## Run As One App

To build the frontend and serve it from FastAPI:

```powershell
npm run build:full
```

Open:

- App: `http://localhost:8787`
- API docs: `http://localhost:8787/docs`

This is the closest local equivalent to the deployed single-app setup.

## Authentication And Roles

This app now uses local demo role selection instead of a hosted auth service.

Current app roles:

- `admin`
- `front_line_worker`
- `medical_officer`

Current route access in the app:

- Admin: dashboard, upload, processing, case review, reports
- Front Line Worker: upload, processing, case review
- Medical Officer: dashboard

## Demo Access

The landing page lets you choose a role, then both `Sign In` and `Sign Up` open the matching demo landing page directly.

## Backend Dependency Files

These files now live at the repository root because the Python backend is treated as one `uv` project for the whole app:

- [`pyproject.toml`](./pyproject.toml): canonical Python project config for `uv`
- [`uv.lock`](./uv.lock): reproducible lockfile for backend dependencies

`requirements.txt` is no longer needed in this repo because `uv` is the dependency source of truth.

## Troubleshooting

### Role page does not open

If clicking a role does not move you into the app, make sure the build was refreshed after the frontend changes and the browser is not serving an old cached bundle.

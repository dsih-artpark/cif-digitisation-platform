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
GATEKEEPER_AUTH_ENABLED=false
GATEKEEPER_AUTH_URL=https://auth.artpark.ai
```

## Install Dependencies

From the project root:

```powershell
uv sync --directory backend
cd frontend
npm install
```

## Run Locally


## Frontend 
npm run dev 


## Backend 

uv sync --directory backend
uv run python -m backend.main

Keep `GATEKEEPER_AUTH_ENABLED=false` for localhost/demo mode.



## Run on Server 

cd frontend 
npm run build 
cd ..

uv sync --directory backend
uv run python -m backend.main

Set `GATEKEEPER_AUTH_ENABLED=true` on the server when the app is behind Gatekeeper/nginx headers.

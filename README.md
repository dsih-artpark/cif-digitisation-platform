# Gadchiroli Digitisation tool for Malaria

## Problem Statement

Digitise CIF docs generated at PHCs in Tribal regions of Gadchiroli.

## User Journey

### 1. Entry and Role Selection

Users land on the home page and choose a role:

- Front Line Worker
- Medical Officer
- Admin (User Analytics)

Role selection controls which modules each user can access.

### 2. Front Line Worker Journey

1. Open **Upload CIF** (`/upload`) and submit a case document.
2. Move to **Processing** (`/processing`) to follow ingestion and extraction stages.
3. Open **Case Records** (`/case-review`) to verify and edit extracted values.
4. Finalize the reviewed case for downstream monitoring.

### 3. Medical Officer Journey

1. Log in to **Dashboard** (`/dashboard`).
2. Monitor case volume, status mix, and regional performance.
3. Use visual summaries (including the India map view) to identify trends and review priorities.

### 4. Admin / User Analytics Journey

1. Access **Dashboard** for system-wide metrics.
2. Use **Upload CIF**, **Processing**, and **Case Records** for operational checks.
3. Open **Reports** (`/reports`) for reporting workflows.

### 5. Continuous Operational Cycle

The platform is designed as a loop:

Upload -> Process -> Review -> Monitor -> Improve data quality in the next upload cycle.

## Download / Clone

### Option A: Download ZIP (GitHub)

1. Open the repository on GitHub.
2. Click **Code** → **Download ZIP**.
3. Extract the ZIP to a folder on your computer.

### Option B: Clone with Git

```bash
git clone https://github.com/nithins-artpark/cif-digitisation-platform.git
cd cif-digitisation-platform
```

## Prerequisites

- **Node.js**: 18+ recommended (for the Vite + React frontend)
- **Python**: 3.10+ recommended (for the FastAPI backend)
- **uv**: required for Python dependency sync and backend run

## Development Workflow

### 1) One-Time Setup

From the project root:

```powershell
npm install
cd backend
uv sync
cd ..
```

### 2) Start Both Frontend + Backend (Single Command)

From the project root:

```powershell
npm run dev:all
```

### 3) Open the Applications

- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:8787`
- Backend Swagger Docs: `http://localhost:8787/docs`

### 4) Optional: Run Separately

Terminal 1 (Backend):

```powershell
cd backend
uv run python main.py
```

Terminal 2 (Frontend):

```powershell
npm run dev
```

### 5) Serve Frontend from FastAPI (Single Server Mode)

From the project root:

```powershell
npm run build:full
```

Open:

- Application (served by FastAPI): `http://localhost:8787`
- Backend API docs: `http://localhost:8787/docs`

## Notes (Authentication / Gatekeeper)

The UI is wired to a separate authentication service (Gatekeeper) at `http://localhost:8000`.

- If Gatekeeper is not running, the app may show an authentication warning.
- The backend digitisation API can still be started and tested independently.

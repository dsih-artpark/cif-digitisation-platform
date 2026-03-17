# CIF Digitisation Platform

## Project Overview

The CIF Digitisation Platform is a role-based web application for converting paper Case Investigation Files (CIF) into structured digital records.

It supports district health operations by:

- capturing CIF uploads from field teams,
- guiding records through a processing pipeline,
- enabling case-data review and correction, and
- presenting case analytics for monitoring and decision-making.

The current demo workflow is aligned to district-level operations, with Gadchiroli shown as the active operational context.

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

## Environment Variables

### Backend (required for LLM extraction)

Set **`OPENROUTER_API_KEY`** for the backend before running.

Windows PowerShell example (temporary for current terminal session):

```powershell
$env:OPENROUTER_API_KEY="YOUR_KEY_HERE"
```

Optional:

- `API_PORT` (default: `8787`)
- `OPENROUTER_BASE_URL` (default: `https://openrouter.ai/api/v1`)

## Run Locally

### 1) Start the Backend API (FastAPI)

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Backend will start at:

- API: `http://localhost:8787`
- Health check: `http://localhost:8787/api/health`

### 2) Start the Frontend (Vite + React)

Open a second terminal in the project root:

```powershell
npm install
npm run dev
```

Frontend will start at:

- UI: `http://localhost:5173`

## Notes (Authentication / Gatekeeper)

The UI is wired to a separate authentication service (Gatekeeper) at `http://localhost:8000`.

- If Gatekeeper is not running, the app may show an authentication warning.
- The backend digitisation API (`http://localhost:8787`) can still be started and tested independently.

# CIF Digitisation Platform

Local development setup for the CIF digitisation demo app.

## Stack

- Frontend: React + Vite
- Backend: FastAPI
- Python environment: `uv`

## Project Structure

```text
.
|-- backend/              FastAPI backend code
|-- public/               Static frontend assets
|-- scripts/              Helper scripts
|-- src/                  React frontend
|-- validation/           Validation models and examples
|-- package.json          Frontend scripts
|-- pyproject.toml        Python dependencies
|-- uv.lock               Locked Python dependencies
|-- example.env           Sample environment variables
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
npm install
uv sync
```

## Run Locally

### Option 1: Run frontend and backend together

```powershell
npm run dev:all

```

Open:

- App: `http://localhost:8787`
- API docs: `http://localhost:8787/docs`


## Demo Access

The landing page uses a local demo flow.

- Click any role card
- Choose `Sign In` or `Sign Up`.
- Provide user_id and password. 

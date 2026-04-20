# CIF Digitisation Platform

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

## Run Locally

From the project root:

```bash
uv sync --directory backend
cd frontend
npm install
cd ..
```

Start the frontend in one terminal:

```bash
cd frontend
npm run dev
```

Start the backend in another terminal:

```bash
uv run python -m backend.main
```

Build the frontend when needed:

```bash
cd frontend
npm run build
```

Run the app from the backend only:

```bash
cd frontend
npm run build
cd ..
uv run python -m backend.main
```

## Pull From GitHub And Restart On Server

```bash
cd ~/cif-digitisation-platform
git pull origin main
uv sync --directory backend
cd frontend
npm ci
npm run build
cd ..
sudo systemctl restart cif-app
sudo systemctl status cif-app --no-pager
```

Manual server start:

```bash
uv run --directory backend python -m uvicorn app:app --host 0.0.0.0 --port 8787 --access-log
```

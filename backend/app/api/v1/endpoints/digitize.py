from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from ....api.deps import ensure_digitize_access
from ....core.config import MODEL_NAME
from ....schemas.digitize import DigitizePayload
from ....services.job_service import build_snapshot, create_job, jobs, process_job
from ....services.normalization_service import sanitize_value
from ....utils.time_utils import now_iso

router = APIRouter()


@router.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "time": now_iso(),
    }


@router.post("/api/digitize", status_code=202)
async def create_digitize_job(
    payload: DigitizePayload, background_tasks: BackgroundTasks, request: Request
) -> dict[str, Any]:
    ensure_digitize_access(request)

    file_name = sanitize_value(payload.fileName)
    file_type = sanitize_value(payload.fileType)
    if file_name == "N/A" or file_type == "N/A":
        raise HTTPException(status_code=400, detail="File name and file type are required.")

    job = create_job(payload.fileName, payload.fileType)
    jobs[job["id"]] = job
    background_tasks.add_task(process_job, job, payload)
    return {"jobId": job["id"], "status": job["status"]}


@router.get("/api/digitize/{job_id}")
async def get_digitize_job(job_id: str, request: Request) -> dict[str, Any]:
    ensure_digitize_access(request)

    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"job": build_snapshot(job)}

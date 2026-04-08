from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Request, UploadFile

from ....api.deps import ensure_digitize_access
from ....core.config import MODEL_NAME
from ....schemas.digitize import DigitizePayload
from ....services.document_service import build_data_url_from_bytes, resolve_uploaded_mime_type
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
    request: Request,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile | None, File()] = None,
    file_name: Annotated[str | None, Form()] = None,
    file_type: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    ensure_digitize_access(request)

    payload = await parse_digitize_payload(
        request, file=file, file_name=file_name, file_type=file_type
    )
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


async def parse_digitize_payload(
    request: Request,
    *,
    file: UploadFile | None,
    file_name: str | None,
    file_type: str | None,
) -> DigitizePayload:
    content_type = request.headers.get("content-type", "").lower()

    if "multipart/form-data" in content_type:
        if file is None:
            raise HTTPException(status_code=400, detail="No file was uploaded.")

        uploaded_bytes = await file.read()
        if not uploaded_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        resolved_file_name = (file_name or file.filename or "").strip()
        resolved_file_type = resolve_uploaded_mime_type(
            file_type, file.content_type, resolved_file_name
        )
        if not resolved_file_type:
            raise HTTPException(
                status_code=400, detail="Uploaded file type could not be determined."
            )

        return DigitizePayload(
            fileName=resolved_file_name,
            fileType=resolved_file_type,
            fileDataUrl=build_data_url_from_bytes(uploaded_bytes, resolved_file_type),
        )

    try:
        payload = DigitizePayload.model_validate(await request.json())
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail="Invalid digitisation request payload."
        ) from exc
    return payload

from __future__ import annotations

import asyncio
import time
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from ..core.config import STAGE_DEFINITIONS
from ..core.logging import logger
from ..schemas.digitize import DigitizePayload
from ..services.document_service import validate_and_normalize_data_url
from ..services.extraction_service import (
    call_openrouter_for_extraction,
    has_multilingual_text,
    translate_extraction_to_english,
)
from ..services.normalization_service import normalize_extraction
from ..utils.time_utils import now_iso, parse_iso_to_ms

jobs: dict[str, dict[str, Any]] = {}


def create_job(file_name: str, file_type: str) -> dict[str, Any]:
    timestamp = now_iso()
    return {
        "id": str(uuid4()),
        "status": "queued",
        "fileName": file_name,
        "fileType": file_type,
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "startedAt": None,
        "completedAt": None,
        "stages": [
            {
                **stage,
                "status": "pending",
                "startedAt": None,
                "completedAt": None,
            }
            for stage in STAGE_DEFINITIONS
        ],
        "logs": [],
        "result": None,
        "usage": None,
        "error": None,
    }


def append_log(job: dict[str, Any], message: str) -> None:
    entry = {"timestamp": now_iso(), "message": message}
    job["logs"].append(entry)
    job["logs"] = job["logs"][-200:]
    job["updatedAt"] = entry["timestamp"]
    logger.info("[%s] %s", job["id"], message)


def mark_stage_running(job: dict[str, Any], stage_index: int) -> None:
    stage = job["stages"][stage_index]
    timestamp = now_iso()
    stage["status"] = "running"
    stage["startedAt"] = timestamp
    job["updatedAt"] = timestamp
    append_log(job, stage["note"])


def mark_stage_completed(job: dict[str, Any], stage_index: int) -> None:
    stage = job["stages"][stage_index]
    timestamp = now_iso()
    stage["status"] = "completed"
    stage["completedAt"] = timestamp
    job["updatedAt"] = timestamp
    append_log(job, stage["done_log"])


def get_running_stage_index(job: dict[str, Any]) -> int:
    for index, stage in enumerate(job["stages"]):
        if stage["status"] == "running":
            return index
    return -1


def build_snapshot(job: dict[str, Any]) -> dict[str, Any]:
    now_ms = int(time.time() * 1000)
    started_ms = parse_iso_to_ms(job.get("startedAt"))
    elapsed_ms = max(0, now_ms - started_ms) if started_ms else 0

    stages: list[dict[str, Any]] = []
    for stage in job["stages"]:
        progress = 0
        if stage["status"] == "completed":
            progress = 100
        elif stage["status"] == "running":
            stage_started_ms = parse_iso_to_ms(stage.get("startedAt"))
            stage_elapsed = max(0, now_ms - stage_started_ms) if stage_started_ms else 0
            progress = min(95, round((stage_elapsed / max(stage["expected_ms"], 1)) * 100))
            progress = max(8, progress)

        stages.append(
            {
                "id": stage["id"],
                "label": stage["label"],
                "note": stage["note"],
                "doneLog": stage["done_log"],
                "status": stage["status"],
                "startedAt": stage["startedAt"],
                "completedAt": stage["completedAt"],
                "progress": progress,
            }
        )

    total_stages = len(stages)
    completed_stages = sum(1 for stage in stages if stage["status"] == "completed")
    running_index = get_running_stage_index(job)
    running_progress = stages[running_index]["progress"] / 100 if running_index >= 0 else 0
    completed_equivalent = completed_stages + running_progress
    progress = (
        100
        if job["status"] == "completed"
        else min(99, round((completed_equivalent / max(total_stages, 1)) * 100))
    )

    eta_ms = 0
    if job["status"] not in {"completed", "failed"}:
        completed_durations: list[int] = []
        for stage in job["stages"]:
            if stage["status"] != "completed":
                continue
            start_ms = parse_iso_to_ms(stage.get("startedAt"))
            done_ms = parse_iso_to_ms(stage.get("completedAt"))
            if start_ms and done_ms:
                completed_durations.append(max(50, done_ms - start_ms))

        average_stage_ms = (
            round(sum(completed_durations) / len(completed_durations))
            if completed_durations
            else round(
                sum(stage["expected_ms"] for stage in STAGE_DEFINITIONS) / len(STAGE_DEFINITIONS)
            )
        )
        remaining_stages = max(total_stages - completed_equivalent, 0)
        eta_ms = round(average_stage_ms * remaining_stages)

    return {
        "id": job["id"],
        "status": job["status"],
        "fileName": job["fileName"],
        "fileType": job["fileType"],
        "createdAt": job["createdAt"],
        "updatedAt": job["updatedAt"],
        "startedAt": job["startedAt"],
        "completedAt": job["completedAt"],
        "progress": progress,
        "elapsedMs": elapsed_ms,
        "etaMs": eta_ms,
        "stages": stages,
        "logs": job["logs"],
        "result": job["result"],
        "usage": job["usage"],
        "error": job["error"],
    }


async def process_job(job: dict[str, Any], payload: DigitizePayload) -> None:
    job["status"] = "running"
    job["startedAt"] = now_iso()
    job["updatedAt"] = job["startedAt"]
    append_log(job, f"Job started for {job['fileName']}")

    try:
        mark_stage_running(job, 0)
        if not payload.fileName or not payload.fileType or not payload.fileDataUrl:
            raise HTTPException(
                status_code=400, detail="Missing file details for digitisation request."
            )
        mark_stage_completed(job, 0)

        mark_stage_running(job, 1)
        normalized_data_url, preprocessing_message, preprocessing_metadata = (
            validate_and_normalize_data_url(payload.fileDataUrl, payload.fileType)
        )
        append_log(job, preprocessing_message)
        mark_stage_completed(job, 1)

        mark_stage_running(job, 2)
        extraction_output = await asyncio.to_thread(
            call_openrouter_for_extraction, normalized_data_url, preprocessing_metadata
        )
        extracted_data = extraction_output.get("extracted") or {}
        if has_multilingual_text(extracted_data):
            extracted_data = await asyncio.to_thread(
                translate_extraction_to_english, extracted_data
            )
            append_log(job, "Translated multilingual extracted fields to English")
        mark_stage_completed(job, 2)

        mark_stage_running(job, 3)
        normalized = normalize_extraction(extracted_data)
        mark_stage_completed(job, 3)

        mark_stage_running(job, 4)
        extraction_usage = extraction_output.get("usage")
        resolved_model = (
            extraction_output.get("model") or extraction_output.get("requestedModel") or "N/A"
        )
        job["result"] = {
            **normalized,
            "metadata": {
                "model": resolved_model,
                "requestedModel": extraction_output.get("requestedModel"),
                "latencyMs": extraction_output.get("latencyMs"),
                "maxTokensRequested": extraction_output.get("maxTokensRequested"),
                "preprocessing": preprocessing_metadata,
                "usage": extraction_usage,
                "extractedAt": now_iso(),
            },
        }
        job["usage"] = extraction_usage
        mark_stage_completed(job, 4)

        job["status"] = "completed"
        job["completedAt"] = now_iso()
        job["updatedAt"] = job["completedAt"]
        append_log(job, "Extraction completed successfully")
    except HTTPException as exc:
        running_stage_index = get_running_stage_index(job)
        if running_stage_index >= 0:
            job["stages"][running_stage_index]["status"] = "failed"
            job["stages"][running_stage_index]["completedAt"] = now_iso()
        job["status"] = "failed"
        job["error"] = {"message": str(exc.detail)}
        job["completedAt"] = now_iso()
        job["updatedAt"] = job["completedAt"]
        append_log(job, f"Failed: {job['error']['message']}")
    except Exception as exc:  # pragma: no cover
        running_stage_index = get_running_stage_index(job)
        if running_stage_index >= 0:
            job["stages"][running_stage_index]["status"] = "failed"
            job["stages"][running_stage_index]["completedAt"] = now_iso()
        job["status"] = "failed"
        job["error"] = {"message": str(exc) or "Digitisation failed."}
        job["completedAt"] = now_iso()
        job["updatedAt"] = job["completedAt"]
        append_log(job, f"Failed: {job['error']['message']}")


async def cleanup_jobs_task() -> None:
    while True:
        await asyncio.sleep(600)
        current_ms = int(time.time() * 1000)
        for job_id, job in list(jobs.items()):
            completed_ms = parse_iso_to_ms(job.get("completedAt"))
            if completed_ms and current_ms - completed_ms > 60 * 60 * 1000:
                jobs.pop(job_id, None)

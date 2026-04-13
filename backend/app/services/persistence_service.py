from __future__ import annotations

from typing import Any

from sqlalchemy import select

from ..core.logging import logger
from ..db.session import SessionLocal, create_tables
from ..models.ocr_record import OCRRecord

NA_MARKERS = {"", "n/a", "na", "unknown", "none", "null"}


def clean_value(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.lower() in NA_MARKERS:
        return None
    return text


def to_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def initialize_persistence() -> None:
    create_tables()


def upsert_ocr_record(job: dict[str, Any]) -> None:
    result = job.get("result") if isinstance(job.get("result"), dict) else {}
    case_data = result.get("caseData") if isinstance(result.get("caseData"), dict) else {}
    metadata = result.get("metadata") if isinstance(result.get("metadata"), dict) else {}
    usage = metadata.get("usage")
    if not isinstance(usage, dict):
        usage = job.get("usage") if isinstance(job.get("usage"), dict) else {}

    file_name = clean_value(job.get("fileName"))
    if not file_name:
        return

    page = 1
    preprocessing = metadata.get("preprocessing")
    if isinstance(preprocessing, dict):
        # Current pipeline combines pages into one image payload; keep logical page as 1.
        page = 1

    ocr_status = "SUCCESS" if job.get("status") == "completed" else clean_value(job.get("status"))
    special_notes = clean_value(job.get("error", {}).get("message")) if job.get("error") else None

    with SessionLocal() as session:
        existing = session.execute(
            select(OCRRecord).where(OCRRecord.file == file_name, OCRRecord.page == page)
        ).scalar_one_or_none()

        record = existing or OCRRecord(file=file_name, page=page)
        record.name_hindi = clean_value(case_data.get("patientNameHindi"))
        record.name_english = clean_value(case_data.get("patientName"))
        record.age = clean_value(case_data.get("age"))
        record.sex = clean_value(case_data.get("sex"))
        record.location = clean_value(case_data.get("locationVillage"))
        record.date = clean_value(case_data.get("testDate"))
        record.test_type = clean_value(case_data.get("testType"))
        record.result = clean_value(case_data.get("result"))
        record.pathogen = clean_value(case_data.get("pathogen"))
        record.treatment = clean_value(case_data.get("treatment"))
        record.temperature = clean_value(case_data.get("temperature"))
        record.hb_level = clean_value(case_data.get("hbLevel"))
        record.rbs = clean_value(case_data.get("rbs"))
        record.bp = clean_value(case_data.get("bp"))
        record.contacts = clean_value(case_data.get("contacts"))
        record.special_notes = special_notes
        record.ocr_status = ocr_status

        record.job_id = clean_value(job.get("id"))
        record.file_type = clean_value(job.get("fileType"))
        record.file_size_bytes = to_int(
            preprocessing.get("byteSize") if isinstance(preprocessing, dict) else None
        )
        record.model_used = clean_value(metadata.get("model"))
        record.latency_ms = to_float(metadata.get("latencyMs"))
        record.prompt_tokens = to_int(usage.get("prompt_tokens"))
        record.completion_tokens = to_int(usage.get("completion_tokens"))
        record.total_tokens = to_int(usage.get("total_tokens"))
        record.extracted_at = clean_value(metadata.get("extractedAt"))

        if existing is None:
            session.add(record)

        session.commit()
        logger.info("Persisted OCR record | file=%s | page=%s", file_name, page)

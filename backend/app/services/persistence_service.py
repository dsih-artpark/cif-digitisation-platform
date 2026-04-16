from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import desc, select

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


def serialize_ocr_record(record: OCRRecord) -> dict[str, Any]:
    def iso_or_none(value: Any) -> str | None:
        if isinstance(value, datetime):
            return value.isoformat()
        return clean_value(value)

    return {
        "id": record.id,
        "file": clean_value(record.file),
        "page": record.page,
        "name_hindi": clean_value(record.name_hindi),
        "name_english": clean_value(record.name_english),
        "age": clean_value(record.age),
        "sex": clean_value(record.sex),
        "location": clean_value(record.location),
        "date": clean_value(record.date),
        "test_type": clean_value(record.test_type),
        "result": clean_value(record.result),
        "pathogen": clean_value(record.pathogen),
        "treatment": clean_value(record.treatment),
        "temperature": clean_value(record.temperature),
        "hb_level": clean_value(record.hb_level),
        "rbs": clean_value(record.rbs),
        "bp": clean_value(record.bp),
        "contacts": clean_value(record.contacts),
        "special_notes": clean_value(record.special_notes),
        "ocr_status": clean_value(record.ocr_status),
        "job_id": clean_value(record.job_id),
        "file_type": clean_value(record.file_type),
        "file_size_bytes": record.file_size_bytes,
        "model_used": clean_value(record.model_used),
        "latency_ms": record.latency_ms,
        "prompt_tokens": record.prompt_tokens,
        "completion_tokens": record.completion_tokens,
        "total_tokens": record.total_tokens,
        "extracted_at": clean_value(record.extracted_at),
        "created_at": iso_or_none(record.created_at),
        "updated_at": iso_or_none(record.updated_at),
    }


def fetch_recent_ocr_records(limit: int = 10) -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit or 10), 100))
    with SessionLocal() as session:
        records = (
            session.execute(
                select(OCRRecord).order_by(desc(OCRRecord.created_at)).limit(safe_limit)
            )
            .scalars()
            .all()
        )
    return [serialize_ocr_record(record) for record in records]


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
        record.name_hindi = clean_value(case_data.get("name_hindi"))
        record.name_english = clean_value(case_data.get("name_english"))
        record.age = clean_value(case_data.get("age"))
        record.sex = clean_value(case_data.get("sex"))
        record.location = clean_value(case_data.get("location"))
        record.date = clean_value(case_data.get("date"))
        record.test_type = clean_value(case_data.get("test_type"))
        record.result = clean_value(case_data.get("result"))
        record.pathogen = clean_value(case_data.get("pathogen"))
        record.treatment = clean_value(case_data.get("treatment"))
        record.temperature = clean_value(case_data.get("temperature"))
        record.hb_level = clean_value(case_data.get("hb_level"))
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

from __future__ import annotations

import re
from typing import Any

from ..core.config import UNKNOWN_MARKERS


def sanitize_value(value: Any) -> str:
    if value is None:
        return "N/A"
    text = re.sub(r"\s+", " ", str(value)).strip()
    if not text:
        return "N/A"
    if text.lower() in UNKNOWN_MARKERS:
        return "N/A"
    return text


def first_available_value(raw_data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in raw_data and raw_data.get(key) is not None:
            return raw_data.get(key)
    return None


def normalize_age(value: Any) -> str:
    if value is None:
        return "N/A"
    match = re.search(r"\d{1,3}", str(value).strip())
    if not match:
        return sanitize_value(value)
    age = int(match.group(0))
    if age < 0 or age > 120:
        return "N/A"
    return str(age)


def normalize_sex(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    normalized = text.lower()
    if normalized in {"male", "m", "man", "boy"}:
        return "Male"
    if normalized in {"female", "f", "woman", "girl"}:
        return "Female"
    if normalized in {"other", "transgender", "non-binary", "non binary"}:
        return "Other"
    return sanitize_value(text)


def normalize_date(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    ddmmyyyy = re.fullmatch(r"(\d{2})-(\d{2})-(\d{2,4})", text)
    if ddmmyyyy:
        return text

    slash_date = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", text)
    if slash_date:
        day = slash_date.group(1).zfill(2)
        month = slash_date.group(2).zfill(2)
        year = slash_date.group(3)
        if len(year) == 2:
            year = f"20{year}"
        return f"{day}-{month}-{year}"

    iso_date = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if iso_date:
        return f"{iso_date.group(3).zfill(2)}-{iso_date.group(2).zfill(2)}-{iso_date.group(1)}"

    return "N/A"


def normalize_treatment(value: Any) -> str:
    if isinstance(value, list):
        normalized_lines = [sanitize_value(item) for item in value]
        cleaned = [item for item in normalized_lines if item != "N/A"]
        return "\n".join(cleaned) if cleaned else "N/A"
    if isinstance(value, dict):
        normalized_lines = [sanitize_value(item) for item in value.values()]
        cleaned = [item for item in normalized_lines if item != "N/A"]
        return "\n".join(cleaned) if cleaned else "N/A"
    if isinstance(value, str):
        lines = [sanitize_value(part) for part in re.split(r"\r?\n|;|,", value)]
        cleaned = [item for item in lines if item != "N/A"]
        return "\n".join(cleaned) if cleaned else "N/A"
    return sanitize_value(value)


def normalize_extraction(raw_data: dict[str, Any]) -> dict[str, Any]:
    case_data = {
        "patientName": sanitize_value(
            first_available_value(raw_data, "patientName", "patient_name", "name")
        ),
        "age": normalize_age(first_available_value(raw_data, "age")),
        "sex": normalize_sex(first_available_value(raw_data, "sex", "gender")),
        "locationVillage": sanitize_value(
            first_available_value(raw_data, "locationVillage", "location", "village")
        ),
        "testDate": normalize_date(
            first_available_value(raw_data, "testDate", "test_date", "date")
        ),
        "testType": sanitize_value(first_available_value(raw_data, "testType", "test_type")),
        "result": sanitize_value(
            first_available_value(raw_data, "result", "testResult", "test_result")
        ),
        "pathogen": sanitize_value(first_available_value(raw_data, "pathogen", "species")),
        "treatment": normalize_treatment(
            first_available_value(raw_data, "treatment", "medicines", "treatment_given")
        ),
        "temperature": sanitize_value(first_available_value(raw_data, "temperature")),
        "hbLevel": sanitize_value(first_available_value(raw_data, "hbLevel", "hb", "hb_level")),
    }
    field_status = {
        key: ("Review Required" if value == "N/A" else "Verified")
        for key, value in case_data.items()
    }
    record_status = (
        "Verified"
        if all(status == "Verified" for status in field_status.values())
        else "Review Required"
    )
    return {"caseData": case_data, "fieldStatus": field_status, "recordStatus": record_status}

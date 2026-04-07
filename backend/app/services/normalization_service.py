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


def flatten_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return " ".join(part for part in (flatten_text(item) for item in value) if part)
    if isinstance(value, dict):
        return " ".join(part for part in (flatten_text(item) for item in value.values()) if part)
    return str(value)


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


def extract_age_and_sex_fallback(raw_data: dict[str, Any]) -> tuple[str, str]:
    combined_text = " ".join(
        flatten_text(raw_data.get(key))
        for key in raw_data.keys()
        if raw_data.get(key) is not None
    )
    combined_text = re.sub(r"\s+", " ", combined_text).strip()
    if not combined_text:
        return "N/A", "N/A"

    age = "N/A"
    sex = "N/A"

    slash_match = re.search(
        r"\b(\d{1,3})\s*[/|]\s*(male|female|other|m|f|o)\b", combined_text, flags=re.IGNORECASE
    )
    if slash_match:
        age = normalize_age(slash_match.group(1))
        sex = normalize_sex(slash_match.group(2))

    if age == "N/A":
        age_match = re.search(r"\bage\s*[:=-]?\s*(\d{1,3})\b", combined_text, flags=re.IGNORECASE)
        if age_match:
            age = normalize_age(age_match.group(1))

    if age == "N/A":
        year_match = re.search(r"\b(\d{1,3})\s*(?:years?|yrs?)\b", combined_text, flags=re.IGNORECASE)
        if year_match:
            age = normalize_age(year_match.group(1))

    if sex == "N/A":
        sex_match = re.search(
            r"\b(?:sex|gender)\s*[:=-]?\s*(male|female|other|m|f|o)\b",
            combined_text,
            flags=re.IGNORECASE,
        )
        if sex_match:
            sex = normalize_sex(sex_match.group(1))

    return age, sex


def normalize_extraction(raw_data: dict[str, Any]) -> dict[str, Any]:
    fallback_age, fallback_sex = extract_age_and_sex_fallback(raw_data)
    case_data = {
        "patientName": sanitize_value(
            first_available_value(raw_data, "patientName", "patient_name", "name", "fullName")
        ),
        "age": normalize_age(first_available_value(raw_data, "age", "patientAge", "ageYears"))
        if first_available_value(raw_data, "age", "patientAge", "ageYears") is not None
        else fallback_age,
        "sex": normalize_sex(first_available_value(raw_data, "sex", "gender", "patientSex"))
        if first_available_value(raw_data, "sex", "gender", "patientSex") is not None
        else fallback_sex,
        "locationVillage": sanitize_value(
            first_available_value(raw_data, "locationVillage", "location", "village", "address")
        ),
        "testDate": normalize_date(
            first_available_value(raw_data, "testDate", "test_date", "date", "visitDate")
        ),
        "testType": sanitize_value(
            first_available_value(raw_data, "testType", "test_type", "diagnosticTest")
        ),
        "result": sanitize_value(
            first_available_value(raw_data, "result", "testResult", "test_result", "diagnosis")
        ),
        "pathogen": sanitize_value(
            first_available_value(raw_data, "pathogen", "species", "parasite", "malariaType")
        ),
        "treatment": normalize_treatment(
            first_available_value(
                raw_data,
                "treatment",
                "medicines",
                "treatment_given",
                "medication",
                "prescription",
            )
        ),
        "temperature": sanitize_value(first_available_value(raw_data, "temperature", "temp")),
        "hbLevel": sanitize_value(
            first_available_value(raw_data, "hbLevel", "hb", "hb_level", "haemoglobin")
        ),
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

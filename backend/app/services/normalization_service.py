from __future__ import annotations

import re
from typing import Any

from ..core.config import UNKNOWN_MARKERS
from ..schemas.case_data import NormalizedCaseData
from ..utils.location_utils import split_location_triplet

AGE_WITH_UNIT_PATTERN = re.compile(
    r"\b(?P<number>\d{1,3}(?:\.\d+)?)\s*(?P<unit>years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)\b",
    re.IGNORECASE,
)

BARE_AGE_PATTERN = re.compile(r"^\s*(?P<number>\d{1,3}(?:\.\d+)?)\s*$")

AGE_PREFIX_PATTERN = re.compile(
    r"^\s*age\s*[:=-]?\s*(?P<number>\d{1,3}(?:\.\d+)?)\s*(?P<unit>years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)?\s*$",
    re.IGNORECASE,
)


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
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    match = AGE_WITH_UNIT_PATTERN.search(text)
    if not match:
        match = AGE_PREFIX_PATTERN.match(text)
    if not match:
        age_only_match = BARE_AGE_PATTERN.match(text)
        if age_only_match:
            match = age_only_match
    if not match:
        return "N/A"

    number_text = match.group("number")
    unit_text = (match.groupdict().get("unit") or "").strip().lower()
    try:
        age = float(number_text)
    except ValueError:
        return "N/A"

    if age < 0:
        return "N/A"

    formatted_number = str(int(age)) if age.is_integer() else number_text.rstrip("0").rstrip(".")
    if unit_text in {"month", "months", "mo", "mos", "mth", "mths"}:
        if age > 1200:
            return "N/A"
        unit_label = "month" if age == 1 else "months"
        return f"{formatted_number} {unit_label}"

    if age > 120:
        return "N/A"

    unit_label = "year" if age == 1 else "years"
    return f"{formatted_number} {unit_label}"


def normalize_sex(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    normalized = text.lower()
    if normalized in {"male", "m", "man", "boy"}:
        return "M"
    if normalized in {"female", "f", "woman", "girl"}:
        return "F"
    if normalized in {"m", "f"}:
        return normalized.upper()
    return "N/A"


def normalize_date(value: Any, separator: str = "-") -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    ddmmyyyy = re.fullmatch(r"(\d{2})-(\d{2})-(\d{2,4})", text)
    if ddmmyyyy:
        day, month, year = ddmmyyyy.groups()
        if len(year) == 2:
            year = f"20{year}"
        return f"{day}{separator}{month}{separator}{year}"

    slash_date = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", text)
    if slash_date:
        day = slash_date.group(1).zfill(2)
        month = slash_date.group(2).zfill(2)
        year = slash_date.group(3)
        if len(year) == 2:
            year = f"20{year}"
        return f"{day}{separator}{month}{separator}{year}"

    iso_date = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if iso_date:
        return f"{iso_date.group(3).zfill(2)}{separator}{iso_date.group(2).zfill(2)}{separator}{iso_date.group(1)}"

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
        flatten_text(raw_data.get(key)) for key in raw_data.keys() if raw_data.get(key) is not None
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
        age_match = re.search(
            r"\bage\s*[:=-]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:years?|yrs?|months?|mos?|mths?)?\b",
            combined_text,
            flags=re.IGNORECASE,
        )
        if age_match:
            age = normalize_age(age_match.group(0))

    if age == "N/A":
        year_match = re.search(
            r"\b(\d{1,3}(?:\.\d+)?)\s*(?:years?|yrs?|months?|mos?|mths?)\b",
            combined_text,
            flags=re.IGNORECASE,
        )
        if year_match:
            age = normalize_age(year_match.group(0))

    if sex == "N/A":
        sex_match = re.search(
            r"\b(?:sex|gender)\s*[:=-]?\s*(male|female|other|m|f|o)\b",
            combined_text,
            flags=re.IGNORECASE,
        )
        if sex_match:
            sex = normalize_sex(sex_match.group(1))

    return age, sex


def extract_contacts_fallback(raw_data: dict[str, Any]) -> str:
    combined_text = " ".join(
        flatten_text(raw_data.get(key)) for key in raw_data.keys() if raw_data.get(key) is not None
    )
    combined_text = re.sub(r"\s+", " ", combined_text).strip()
    if not combined_text:
        return "N/A"

    match = re.search(
        r"\bcontact(?:s)?(?:\s*bs)?\s*[:=\-]?\s*([0-9]{1,3}\s*/\s*[0-9]{1,3}|[0-9]{1,3})\b",
        combined_text,
        flags=re.IGNORECASE,
    )
    if not match:
        return "N/A"
    return sanitize_value(match.group(1))


def normalize_pathogen(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    lower = text.lower()
    if "mixed" in lower:
        return "Mixed"
    if any(token in lower for token in ("pf", "falciparum")):
        return "Pf"
    if any(token in lower for token in ("pv", "vivax")):
        return "Pv"
    return "N/A"


def normalize_location_triplet(raw_data: dict[str, Any]) -> dict[str, str]:
    triplet = split_location_triplet(
        first_available_value(raw_data, "location", "locationVillage", "address"),
        first_available_value(
            raw_data, "district", "districtName", "locationDistrict", "taluka", "block"
        ),
        first_available_value(raw_data, "village", "villageName"),
    )
    return triplet


def normalize_integer_text(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    match = re.search(r"\b\d+\b", text)
    if not match:
        return "N/A"
    return match.group(0)


def normalize_extraction(raw_data: dict[str, Any]) -> dict[str, Any]:
    fallback_age, fallback_sex = extract_age_and_sex_fallback(raw_data)
    fallback_contacts = extract_contacts_fallback(raw_data)
    location_triplet = normalize_location_triplet(raw_data)
    raw_case_data = {
        "name_hindi": first_available_value(
            raw_data, "name_hindi", "nameHindi", "patientNameHindi"
        ),
        "name_english": first_available_value(
            raw_data,
            "name_english",
            "nameEnglish",
            "patientName",
            "patient_name",
            "name",
            "fullName",
        ),
        "age": (
            first_available_value(raw_data, "age", "patientAge", "ageYears")
            if first_available_value(raw_data, "age", "patientAge", "ageYears") is not None
            else fallback_age
        ),
        "sex": (
            first_available_value(raw_data, "sex", "gender", "patientSex")
            if first_available_value(raw_data, "sex", "gender", "patientSex") is not None
            else fallback_sex
        ),
        "location": location_triplet["location"],
        "district": location_triplet["district"],
        "village": location_triplet["village"],
        "date": first_available_value(raw_data, "date", "testDate", "test_date", "visitDate"),
        "test_type": first_available_value(raw_data, "test_type", "testType", "diagnosticTest"),
        "result": first_available_value(
            raw_data, "result", "testResult", "test_result", "diagnosis"
        ),
        "pathogen": first_available_value(
            raw_data, "pathogen", "species", "parasite", "malariaType"
        ),
        "treatment": first_available_value(
            raw_data,
            "treatment",
            "medicines",
            "treatment_given",
            "medication",
            "prescription",
        ),
        "temperature": first_available_value(raw_data, "temperature", "temp"),
        "hb_level": first_available_value(raw_data, "hb_level", "hbLevel", "hb", "haemoglobin"),
        "rbs": first_available_value(raw_data, "rbs", "randomBloodSugar", "bloodSugar"),
        "bp": first_available_value(raw_data, "bp", "bloodPressure"),
        "contacts": (
            first_available_value(
                raw_data,
                "contacts",
                "contact",
                "contactBS",
                "contact_bs",
                "contactCount",
                "contact_count",
            )
            if first_available_value(
                raw_data,
                "contacts",
                "contact",
                "contactBS",
                "contact_bs",
                "contactCount",
                "contact_count",
            )
            is not None
            else fallback_contacts
        ),
        "fever_onset_date": first_available_value(
            raw_data, "fever_onset_date", "feverOnsetDate", "fever_onset", "onsetDate"
        ),
        "hh_total": first_available_value(raw_data, "hh_total", "hhTotal", "householdsTotal"),
        "hh_surveyed": first_available_value(
            raw_data, "hh_surveyed", "hhSurveyed", "householdsSurveyed"
        ),
        "individuals_tested": first_available_value(
            raw_data, "individuals_tested", "individualsTested"
        ),
        "individuals_positive": first_available_value(
            raw_data, "individuals_positive", "individualsPositive"
        ),
    }
    case_data = NormalizedCaseData.model_validate(raw_case_data).model_dump()
    if case_data.get("result") == "Negative":
        case_data["pathogen"] = ""
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

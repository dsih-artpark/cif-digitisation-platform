from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from ..core.config import UNKNOWN_MARKERS

STATUS_ALIASES = {
    "+ve": "Positive",
    "positive": "Positive",
    "pos": "Positive",
    "detected": "Positive",
    "-ve": "Negative",
    "negative": "Negative",
    "neg": "Negative",
    "not detected": "Negative",
}

SEX_ALIASES = {
    "male": "Male",
    "m": "Male",
    "man": "Male",
    "boy": "Male",
    "female": "Female",
    "f": "Female",
    "woman": "Female",
    "girl": "Female",
    "other": "Other",
    "transgender": "Other",
    "non-binary": "Other",
    "non binary": "Other",
}

AGE_WITH_UNIT_PATTERN = re.compile(
    r"\b(?P<number>\d{1,3}(?:\.\d+)?)\s*(?P<unit>years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)\b",
    re.IGNORECASE,
)

BARE_AGE_PATTERN = re.compile(r"^\s*(?P<number>\d{1,3}(?:\.\d+)?)\s*$")

AGE_PREFIX_PATTERN = re.compile(
    r"^\s*age\s*[:=-]?\s*(?P<number>\d{1,3}(?:\.\d+)?)\s*(?P<unit>years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)?\s*$",
    re.IGNORECASE,
)


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


def collapse_whitespace(value: Any) -> str:
    return re.sub(r"\s+", " ", flatten_text(value)).strip()


def normalize_text(value: Any) -> str:
    text = collapse_whitespace(value)
    if not text or text.lower() in UNKNOWN_MARKERS:
        return "N/A"
    return text


def normalize_age(value: Any) -> str:
    text = normalize_text(value)
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
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    normalized = SEX_ALIASES.get(text.lower())
    if normalized:
        return normalized
    return text


def normalize_date(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    for fmt in (
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%y",
        "%d/%m/%y",
        "%Y/%m/%d",
        "%d.%m.%Y",
    ):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.strftime("%d-%m-%Y")
        except ValueError:
            continue

    return "N/A"


def normalize_treatment(value: Any) -> str:
    if value is None:
        return "N/A"

    lines: list[str] = []
    if isinstance(value, list):
        for item in value:
            normalized = normalize_treatment(item)
            if normalized != "N/A":
                lines.extend(normalized.splitlines())
    elif isinstance(value, dict):
        for item in value.values():
            normalized = normalize_treatment(item)
            if normalized != "N/A":
                lines.extend(normalized.splitlines())
    else:
        raw_lines = str(value).splitlines()
        for line in raw_lines:
            cleaned = re.sub(r"[ \t]+", " ", line).strip()
            if cleaned and cleaned.lower() not in UNKNOWN_MARKERS:
                lines.append(cleaned)

    if not lines:
        return "N/A"
    return "\n".join(lines)


def normalize_number_text(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    match = re.search(r"\b\d+(?:\.\d+)?\b", text)
    if not match:
        return "N/A"

    number = match.group(0)
    if "." in number:
        number = number.rstrip("0").rstrip(".")
        if not number:
            number = "0"
    return number


def normalize_hb_level(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    match = re.search(r"\b(\d+(?:\.\d+)?)\s*([A-Za-z%]+)?\b", text)
    if not match:
        return "N/A"

    number = match.group(1)
    if "." in number:
        number = number.rstrip("0").rstrip(".")
        if not number:
            number = "0"

    unit = (match.group(2) or "").strip()
    if not unit:
        return number

    unit_lower = unit.lower()
    if unit_lower in {"g", "gm", "gms", "gram", "grams"}:
        unit = "gm"
    return f"{number} {unit}"


def normalize_contacts(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    ratio_match = re.search(r"\b(\d{1,3})\s*/\s*(\d{1,3})\b", text)
    if ratio_match:
        return f"{ratio_match.group(1)}/{ratio_match.group(2)}"

    number_match = re.search(r"\b\d{1,3}\b", text)
    if number_match:
        return number_match.group(0)

    return "N/A"


def normalize_result(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    clauses = [
        clause.strip()
        for clause in re.split(r"(?:\n|,|;|\||\band\b|&)", text, flags=re.IGNORECASE)
        if clause and clause.strip()
    ]
    parsed_results: list[str] = []

    for clause in clauses or [text]:
        status_match = re.search(
            r"\b(\+ve|positive|pos|-ve|negative|neg|not detected|detected)\b",
            clause,
            flags=re.IGNORECASE,
        )
        if not status_match:
            continue

        status = STATUS_ALIASES.get(status_match.group(1).lower())
        if not status:
            continue

        remainder = (clause[: status_match.start()] + " " + clause[status_match.end() :]).strip()
        remainder = re.sub(
            r"\b(?:for|of|is|was|result|test|patient|case)\b",
            " ",
            remainder,
            flags=re.IGNORECASE,
        )
        remainder = re.sub(r"\s+", " ", remainder).strip(" ,.-")
        if remainder:
            parsed_results.append(f"{remainder} {status}")
        else:
            parsed_results.append(status)

    if not parsed_results:
        single_status = re.search(
            r"\b(\+ve|positive|pos|-ve|negative|neg|not detected|detected)\b",
            text,
            flags=re.IGNORECASE,
        )
        if single_status:
            return STATUS_ALIASES.get(single_status.group(1).lower(), "N/A")
        return "N/A"

    if len(parsed_results) == 1:
        return (
            parsed_results[0].split(" ", 1)[-1] if " " in parsed_results[0] else parsed_results[0]
        )

    return ", ".join(parsed_results)


class NormalizedCaseData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patientName: str = "N/A"
    age: str = "N/A"
    sex: str = "N/A"
    locationVillage: str = "N/A"
    testDate: str = "N/A"
    testType: str = "N/A"
    result: str = "N/A"
    pathogen: str = "N/A"
    treatment: str = "N/A"
    temperature: str = "N/A"
    hbLevel: str = "N/A"
    contacts: str = "N/A"

    @field_validator("patientName", "locationVillage", "testType", "pathogen", mode="before")
    @classmethod
    def _normalize_text_fields(cls, value: Any) -> str:
        return normalize_text(value)

    @field_validator("age", mode="before")
    @classmethod
    def _normalize_age(cls, value: Any) -> str:
        return normalize_age(value)

    @field_validator("sex", mode="before")
    @classmethod
    def _normalize_sex(cls, value: Any) -> str:
        return normalize_sex(value)

    @field_validator("testDate", mode="before")
    @classmethod
    def _normalize_test_date(cls, value: Any) -> str:
        return normalize_date(value)

    @field_validator("result", mode="before")
    @classmethod
    def _normalize_result(cls, value: Any) -> str:
        return normalize_result(value)

    @field_validator("treatment", mode="before")
    @classmethod
    def _normalize_treatment(cls, value: Any) -> str:
        return normalize_treatment(value)

    @field_validator("temperature", mode="before")
    @classmethod
    def _normalize_temperature(cls, value: Any) -> str:
        return normalize_number_text(value)

    @field_validator("hbLevel", mode="before")
    @classmethod
    def _normalize_hb_level(cls, value: Any) -> str:
        return normalize_hb_level(value)

    @field_validator("contacts", mode="before")
    @classmethod
    def _normalize_contacts(cls, value: Any) -> str:
        return normalize_contacts(value)

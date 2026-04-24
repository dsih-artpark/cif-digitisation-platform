from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from ..core.config import UNKNOWN_MARKERS
from ..utils.location_utils import split_location_triplet

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
    "male": "M",
    "m": "M",
    "man": "M",
    "boy": "M",
    "female": "F",
    "f": "F",
    "woman": "F",
    "girl": "F",
}

PATHOGEN_ALIASES = {
    "mixed infection": "Mixed",
    "mixed": "Mixed",
    "mix": "Mixed",
    "pf": "Pf",
    "p. falciparum": "Pf",
    "plasmodium falciparum": "Pf",
    "falciparum": "Pf",
    "pv": "Pv",
    "p. vivax": "Pv",
    "plasmodium vivax": "Pv",
    "vivax": "Pv",
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

DATE_PATTERNS = (
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%Y-%m-%d",
    "%d-%m-%y",
    "%d/%m/%y",
    "%Y/%m/%d",
    "%d.%m.%Y",
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


def normalize_date(value: Any, separator: str = "-") -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    for fmt in DATE_PATTERNS:
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.strftime(f"%d{separator}%m{separator}%Y")
        except ValueError:
            continue

    return "N/A"


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
    if text.upper() in {"M", "F"}:
        return text.upper()
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


def normalize_integer_text(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    match = re.search(r"\b\d+\b", text)
    if not match:
        return "N/A"
    return match.group(0)


def normalize_hb_level(value: Any) -> str:
    return normalize_number_text(value)


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


def normalize_pathogen(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    lower = text.lower()
    for key, normalized in PATHOGEN_ALIASES.items():
        if key in lower:
            return normalized

    return "N/A"


def normalize_result(value: Any) -> str:
    text = normalize_text(value)
    if text == "N/A":
        return "N/A"

    status_match = re.search(
        r"\b(\+ve|positive|pos|-ve|negative|neg|not detected|detected)\b",
        text,
        flags=re.IGNORECASE,
    )
    if not status_match:
        return "N/A"

    return STATUS_ALIASES.get(status_match.group(1).lower(), "N/A")


class NormalizedCaseData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patient_name: str = "N/A"
    age: str = "N/A"
    sex: str = "N/A"
    location: str = "N/A"
    village: str = "N/A"
    date: str = "N/A"
    test_type: str = "N/A"
    result: str = "N/A"
    pathogen: str = "N/A"
    treatment: str = "N/A"
    temperature: str = "N/A"
    hb_level: str = "N/A"

    @model_validator(mode="before")
    @classmethod
    def _normalize_location_triplet(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        normalized_values = dict(values)
        triplet = split_location_triplet(
            normalized_values.get("location"),
            None,
            normalized_values.get("village"),
        )
        normalized_values["location"] = triplet["location"]
        normalized_values["village"] = triplet["village"]
        if normalized_values["village"] == "N/A" and triplet["district"] != "N/A":
            normalized_values["village"] = triplet["district"]
        return normalized_values

    @field_validator(
        "patient_name",
        "location",
        "village",
        "test_type",
        mode="before",
    )
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

    @field_validator("date", mode="before")
    @classmethod
    def _normalize_test_date(cls, value: Any) -> str:
        return normalize_date(value)

    @field_validator("result", mode="before")
    @classmethod
    def _normalize_result(cls, value: Any) -> str:
        return normalize_result(value)

    @field_validator("pathogen", mode="before")
    @classmethod
    def _normalize_pathogen(cls, value: Any) -> str:
        return normalize_pathogen(value)

    @field_validator("treatment", mode="before")
    @classmethod
    def _normalize_treatment(cls, value: Any) -> str:
        return normalize_treatment(value)

    @field_validator("temperature", mode="before")
    @classmethod
    def _normalize_temperature(cls, value: Any) -> str:
        return normalize_number_text(value)

    @field_validator("hb_level", mode="before")
    @classmethod
    def _normalize_numeric_field(cls, value: Any) -> str:
        return normalize_hb_level(value)

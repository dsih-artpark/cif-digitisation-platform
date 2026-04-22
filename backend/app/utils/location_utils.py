from __future__ import annotations

import re
from typing import Any

LOCATION_SPLIT_PATTERN = re.compile(r"\s*[-|/,]\s*")
UNKNOWN_COMPONENTS = {
    "",
    "n/a",
    "na",
    "unknown",
    "none",
    "null",
}


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


def normalize_component(value: Any) -> str:
    text = collapse_whitespace(value)
    if not text or text.lower() in UNKNOWN_COMPONENTS:
        return ""
    return text


def split_location_triplet(
    location_value: Any, district_value: Any = None, village_value: Any = None
) -> dict[str, str]:
    location = normalize_component(location_value)
    district = normalize_component(district_value)
    village = normalize_component(village_value)

    parts = [part.strip() for part in LOCATION_SPLIT_PATTERN.split(location) if part.strip()]
    if len(parts) >= 3:
        location = parts[0]
        if not district:
            district = parts[1]
        if not village:
            village = " - ".join(parts[2:])
    elif len(parts) == 2:
        location = parts[0]
        if not district:
            district = parts[1]
    elif len(parts) == 1:
        location = parts[0]

    if not location:
        location = district or village or "N/A"
    if not district:
        district = "N/A"
    if not village:
        village = "N/A"

    return {
        "location": location or "N/A",
        "district": district,
        "village": village,
    }

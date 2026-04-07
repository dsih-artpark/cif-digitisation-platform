from __future__ import annotations

from datetime import UTC, datetime


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def parse_iso_to_ms(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return int(parsed.timestamp() * 1000)

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Request

from ....api.deps import ensure_admin_access
from ....services.persistence_service import fetch_recent_ocr_records

router = APIRouter()


def ensure_results_access(request: Request) -> None:
    """Keep /api results restricted while auth is enabled."""
    if request.url.path.startswith("/api/"):
        ensure_admin_access(request)


@router.get("/api/results/recent")
async def get_recent_results(
    request: Request,
    limit: int = Query(default=10, ge=1, le=100),
) -> dict[str, Any]:
    ensure_results_access(request)
    records = fetch_recent_ocr_records(limit=limit)
    return {"records": records, "count": len(records)}

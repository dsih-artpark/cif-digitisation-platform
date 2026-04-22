from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from ....services.geo_service import fetch_boundary_geojson

router = APIRouter()


@router.get("/api/geo/boundary")
@router.get("/geo/boundary")
def get_geo_boundary(query: str = Query(..., min_length=1)) -> dict[str, Any]:
    return fetch_boundary_geojson(query)

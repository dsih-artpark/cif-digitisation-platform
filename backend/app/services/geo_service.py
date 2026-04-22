from __future__ import annotations

from threading import Lock
from typing import Any

import requests
from fastapi import HTTPException

from ..core.config import PORT

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"

_geo_cache: dict[str, dict[str, Any]] = {}
_geo_cache_lock = Lock()


def normalize_geo_query(query: str) -> str:
    return " ".join(str(query or "").split()).strip().lower()


def fetch_boundary_geojson(query: str) -> dict[str, Any]:
    normalized_query = normalize_geo_query(query)
    if not normalized_query:
        raise HTTPException(status_code=400, detail="A boundary query is required.")

    with _geo_cache_lock:
        cached = _geo_cache.get(normalized_query)
    if cached:
        return cached

    try:
        response = requests.get(
            NOMINATIM_SEARCH_URL,
            params={
                "format": "jsonv2",
                "limit": 8,
                "polygon_geojson": 1,
                "q": query,
            },
            headers={
                "User-Agent": "CIF Digitisation System/1.0",
                "HTTP-Referer": f"http://localhost:{PORT}",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach the boundary service right now.",
        ) from exc

    try:
        results = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="Boundary service returned invalid data.",
        ) from exc

    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail="Boundary service request failed.",
        )

    boundary = next(
        (
            item
            for item in results
            if item.get("geojson") and item["geojson"].get("type") in {"Polygon", "MultiPolygon"}
        ),
        None,
    )
    if not boundary:
        raise HTTPException(
            status_code=404,
            detail=f"Boundary shape is unavailable for {query}.",
        )

    payload = {
        "query": query,
        "displayName": boundary.get("display_name"),
        "geojson": boundary.get("geojson"),
        "source": "nominatim",
    }

    with _geo_cache_lock:
        _geo_cache[normalized_query] = payload

    return payload

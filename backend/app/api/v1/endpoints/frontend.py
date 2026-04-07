from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ....core.config import FRONTEND_DIST_DIR, FRONTEND_INDEX_FILE

router = APIRouter()


@router.get("/", include_in_schema=False)
async def serve_frontend_root() -> FileResponse:
    if not FRONTEND_INDEX_FILE.exists():
        raise HTTPException(
            status_code=404, detail="Frontend build not found. Run `npm run build` first."
        )
    return FileResponse(FRONTEND_INDEX_FILE)


@router.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str) -> FileResponse:
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found.")

    dist_root = FRONTEND_DIST_DIR.resolve()
    requested_path = (FRONTEND_DIST_DIR / full_path).resolve()

    try:
        requested_path.relative_to(dist_root)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Not found.") from exc

    if requested_path.is_file():
        return FileResponse(requested_path)

    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)

    raise HTTPException(
        status_code=404, detail="Frontend build not found. Run `npm run build` first."
    )

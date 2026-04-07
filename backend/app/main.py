from __future__ import annotations

import asyncio
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.api import api_router
from .core.config import PORT
from .core.logging import logger
from .services.frontend_service import ensure_frontend_build
from .services.job_service import cleanup_jobs_task

app = FastAPI(title="CIF Digitisation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    logger.info("API call started | %s %s", request.method, request.url.path)
    if request.method in {"GET", "HEAD"} and not request.url.path.startswith("/api"):
        ensure_frontend_build()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "API call completed | %s %s | status=%s | duration_ms=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.on_event("startup")
async def startup_event() -> None:
    ensure_frontend_build()
    logger.info("CIF digitisation API running on http://localhost:%s", PORT)
    asyncio.create_task(cleanup_jobs_task())


app.include_router(api_router)

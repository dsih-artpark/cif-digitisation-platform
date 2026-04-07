from __future__ import annotations

import os
from pathlib import Path
from threading import Lock
from typing import Any

from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("API_PORT", "8787"))
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MODEL_NAME = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.6").strip()

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_SOURCE_DIR = FRONTEND_DIR / "src"
FRONTEND_PUBLIC_DIR = FRONTEND_DIR / "public"
FRONTEND_DIST_DIR = PROJECT_ROOT / "dist"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"
FRONTEND_BUILD_LOCK = Lock()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "").strip()
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "").strip()
AUTH0_ISSUER = os.getenv("AUTH0_ISSUER", "").strip()
AUTH0_ROLE_CLAIM = os.getenv(
    "AUTH0_ROLE_CLAIM", "https://cifdigitisation-demo.artpark.ai/roles"
).strip()
AUTH0_ENABLED = bool(AUTH0_DOMAIN and AUTH0_AUDIENCE and AUTH0_ISSUER)

STAGE_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "document_received",
        "label": "Document Received",
        "note": "Validating file integrity and metadata",
        "done_log": "Source document accepted by ingestion service",
        "expected_ms": 400,
    },
    {
        "id": "image_preprocessing",
        "label": "Image Pre-processing",
        "note": "Preparing image payload for model ingestion",
        "done_log": "Image payload normalized for multimodal extraction",
        "expected_ms": 700,
    },
    {
        "id": "text_detection",
        "label": "Text Detection",
        "note": f"Running multilingual OCR-style extraction with {MODEL_NAME}",
        "done_log": "Detected handwritten and printed text blocks",
        "expected_ms": 9000,
    },
    {
        "id": "field_extraction",
        "label": "Field Extraction",
        "note": "Mapping extracted text to CIF structured fields",
        "done_log": "Mapped patient and clinical fields with validation",
        "expected_ms": 1200,
    },
    {
        "id": "structured_record_generation",
        "label": "Structured Record Generation",
        "note": "Generating final structured record for review",
        "done_log": "Draft record generated and queued for verification",
        "expected_ms": 500,
    },
]

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"}
UNKNOWN_MARKERS = {
    "",
    "unknown",
    "n/a",
    "na",
    "none",
    "not mentioned",
    "not specified",
    "unreadable",
    "illegible",
    "-",
    "--",
    "null",
}

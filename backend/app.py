from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
import time
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4

import jwt
import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from jwt import InvalidTokenError, PyJWKClient
from pydantic import BaseModel

load_dotenv()

PORT = int(os.getenv("API_PORT", "8787"))
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MODEL_NAME = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.6").strip()
PROJECT_ROOT = Path(__file__).resolve().parent.parent
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

STAGE_DEFINITIONS = [
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

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
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

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("cif-backend")

app = FastAPI(title="CIF Digitisation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict[str, dict[str, Any]] = {}


class DigitizePayload(BaseModel):
    fileName: str
    fileType: str
    fileDataUrl: str


@lru_cache(maxsize=1)
def get_auth0_jwks_client() -> PyJWKClient:
    return PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")


def normalize_auth0_roles(raw_roles: Any) -> list[str]:
    if isinstance(raw_roles, list):
        return [str(role).strip().lower() for role in raw_roles if str(role).strip()]
    if isinstance(raw_roles, str) and raw_roles.strip():
        return [role for role in re.split(r"[\s,;|]+", raw_roles.strip().lower()) if role]
    return []


def extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "").strip()
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def decode_auth0_token(token: str) -> dict[str, Any]:
    signing_key = get_auth0_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=AUTH0_AUDIENCE,
        issuer=AUTH0_ISSUER,
    )


def require_auth0_roles(request: Request, allowed_roles: set[str]) -> set[str]:
    if not AUTH0_ENABLED:
        return set()

    token = extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    try:
        payload = decode_auth0_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from exc

    roles = set(normalize_auth0_roles(payload.get(AUTH0_ROLE_CLAIM, [])))
    if not roles:
        raise HTTPException(status_code=403, detail="No authorized CIF role was found.")

    if roles.isdisjoint(allowed_roles):
        raise HTTPException(status_code=403, detail="You do not have access to this resource.")

    return roles


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def latest_modified_time(*paths: Path) -> float:
    latest = 0.0
    for path in paths:
        if not path.exists():
            continue
        if path.is_file():
            latest = max(latest, path.stat().st_mtime)
            continue
        for child in path.rglob("*"):
            if child.is_file():
                latest = max(latest, child.stat().st_mtime)
    return latest


def frontend_build_is_stale() -> bool:
    if not FRONTEND_INDEX_FILE.exists():
        return True

    source_last_modified = latest_modified_time(
        FRONTEND_SOURCE_DIR,
        FRONTEND_PUBLIC_DIR,
        FRONTEND_DIR / "index.html",
        FRONTEND_DIR / "package.json",
        FRONTEND_DIR / "package-lock.json",
        FRONTEND_DIR / "vite.config.js",
    )
    dist_last_modified = latest_modified_time(FRONTEND_DIST_DIR)
    return source_last_modified > dist_last_modified


def get_npm_command() -> str | None:
    if os.name == "nt":
        npm_path = shutil.which("npm.cmd") or shutil.which("npm")
        if npm_path:
            return npm_path

        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        fallback = Path(program_files) / "nodejs" / "npm.cmd"
        if fallback.exists():
            return str(fallback)
        return None

    return shutil.which("npm")


def ensure_frontend_build() -> None:
    if not frontend_build_is_stale():
        return

    with FRONTEND_BUILD_LOCK:
        if not frontend_build_is_stale():
            return

        npm_command = get_npm_command()
        if not npm_command:
            raise RuntimeError(
                "Frontend source is newer than dist, but npm is not available on PATH."
            )

        logger.info(
            "Frontend source changed. Rebuilding the frontend bundle before serving requests."
        )
        try:
            subprocess.run(
                [npm_command, "run", "build"],
                cwd=FRONTEND_DIR,
                check=True,
                text=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as exc:
            logger.error("Frontend build failed.\nstdout:\n%s\nstderr:\n%s", exc.stdout, exc.stderr)
            raise RuntimeError(
                "Frontend build failed. Fix the Vite build and refresh the page."
            ) from exc

        logger.info("Frontend bundle is up to date.")


def parse_iso_to_ms(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return int(parsed.timestamp() * 1000)


def create_job(file_name: str, file_type: str) -> dict[str, Any]:
    timestamp = now_iso()
    return {
        "id": str(uuid4()),
        "status": "queued",
        "fileName": file_name,
        "fileType": file_type,
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "startedAt": None,
        "completedAt": None,
        "stages": [
            {
                **stage,
                "status": "pending",
                "startedAt": None,
                "completedAt": None,
            }
            for stage in STAGE_DEFINITIONS
        ],
        "logs": [],
        "result": None,
        "usage": None,
        "error": None,
    }


def append_log(job: dict[str, Any], message: str) -> None:
    entry = {"timestamp": now_iso(), "message": message}
    job["logs"].append(entry)
    job["logs"] = job["logs"][-200:]
    job["updatedAt"] = entry["timestamp"]
    logger.info("[%s] %s", job["id"], message)


def mark_stage_running(job: dict[str, Any], stage_index: int) -> None:
    stage = job["stages"][stage_index]
    timestamp = now_iso()
    stage["status"] = "running"
    stage["startedAt"] = timestamp
    job["updatedAt"] = timestamp
    append_log(job, stage["note"])


def mark_stage_completed(job: dict[str, Any], stage_index: int) -> None:
    stage = job["stages"][stage_index]
    timestamp = now_iso()
    stage["status"] = "completed"
    stage["completedAt"] = timestamp
    job["updatedAt"] = timestamp
    append_log(job, stage["done_log"])


def get_running_stage_index(job: dict[str, Any]) -> int:
    for index, stage in enumerate(job["stages"]):
        if stage["status"] == "running":
            return index
    return -1


def build_snapshot(job: dict[str, Any]) -> dict[str, Any]:
    now_ms = int(time.time() * 1000)
    started_ms = parse_iso_to_ms(job.get("startedAt"))
    elapsed_ms = max(0, now_ms - started_ms) if started_ms else 0

    stages: list[dict[str, Any]] = []
    for stage in job["stages"]:
        progress = 0
        if stage["status"] == "completed":
            progress = 100
        elif stage["status"] == "running":
            stage_started_ms = parse_iso_to_ms(stage.get("startedAt"))
            stage_elapsed = max(0, now_ms - stage_started_ms) if stage_started_ms else 0
            progress = min(95, round((stage_elapsed / max(stage["expected_ms"], 1)) * 100))
            progress = max(8, progress)

        stages.append(
            {
                "id": stage["id"],
                "label": stage["label"],
                "note": stage["note"],
                "doneLog": stage["done_log"],
                "status": stage["status"],
                "startedAt": stage["startedAt"],
                "completedAt": stage["completedAt"],
                "progress": progress,
            }
        )

    total_stages = len(stages)
    completed_stages = sum(1 for stage in stages if stage["status"] == "completed")
    running_index = get_running_stage_index(job)
    running_progress = stages[running_index]["progress"] / 100 if running_index >= 0 else 0
    completed_equivalent = completed_stages + running_progress
    progress = (
        100
        if job["status"] == "completed"
        else min(99, round((completed_equivalent / max(total_stages, 1)) * 100))
    )

    eta_ms = 0
    if job["status"] not in {"completed", "failed"}:
        completed_durations: list[int] = []
        for stage in job["stages"]:
            if stage["status"] != "completed":
                continue
            start_ms = parse_iso_to_ms(stage.get("startedAt"))
            done_ms = parse_iso_to_ms(stage.get("completedAt"))
            if start_ms and done_ms:
                completed_durations.append(max(50, done_ms - start_ms))

        average_stage_ms = (
            round(sum(completed_durations) / len(completed_durations))
            if completed_durations
            else round(
                sum(stage["expected_ms"] for stage in STAGE_DEFINITIONS) / len(STAGE_DEFINITIONS)
            )
        )
        remaining_stages = max(total_stages - completed_equivalent, 0)
        eta_ms = round(average_stage_ms * remaining_stages)

    return {
        "id": job["id"],
        "status": job["status"],
        "fileName": job["fileName"],
        "fileType": job["fileType"],
        "createdAt": job["createdAt"],
        "updatedAt": job["updatedAt"],
        "startedAt": job["startedAt"],
        "completedAt": job["completedAt"],
        "progress": progress,
        "elapsedMs": elapsed_ms,
        "etaMs": eta_ms,
        "stages": stages,
        "logs": job["logs"],
        "result": job["result"],
        "usage": job["usage"],
        "error": job["error"],
    }


def sanitize_value(value: Any) -> str:
    if value is None:
        return "N/A"
    text = re.sub(r"\s+", " ", str(value)).strip()
    if not text:
        return "N/A"
    if text.lower() in UNKNOWN_MARKERS:
        return "N/A"
    return text


def first_available_value(raw_data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in raw_data and raw_data.get(key) is not None:
            return raw_data.get(key)
    return None


def normalize_age(value: Any) -> str:
    if value is None:
        return "N/A"
    match = re.search(r"\d{1,3}", str(value).strip())
    if not match:
        return sanitize_value(value)
    age = int(match.group(0))
    if age < 0 or age > 120:
        return "N/A"
    return str(age)


def normalize_sex(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    normalized = text.lower()
    if normalized in {"male", "m", "man", "boy"}:
        return "Male"
    if normalized in {"female", "f", "woman", "girl"}:
        return "Female"
    if normalized in {"other", "transgender", "non-binary", "non binary"}:
        return "Other"
    return sanitize_value(text)


def normalize_date(value: Any) -> str:
    text = sanitize_value(value)
    if text == "N/A":
        return "N/A"

    ddmmyyyy = re.fullmatch(r"(\d{2})-(\d{2})-(\d{2,4})", text)
    if ddmmyyyy:
        return text

    slash_date = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", text)
    if slash_date:
        day = slash_date.group(1).zfill(2)
        month = slash_date.group(2).zfill(2)
        year = slash_date.group(3)
        if len(year) == 2:
            year = f"20{year}"
        return f"{day}-{month}-{year}"

    iso_date = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if iso_date:
        return f"{iso_date.group(3).zfill(2)}-{iso_date.group(2).zfill(2)}-{iso_date.group(1)}"

    return "N/A"


def normalize_medicines(medicines_value: Any) -> str:
    lines: list[str] = []

    if isinstance(medicines_value, list):
        for item in medicines_value:
            if isinstance(item, str):
                lines.append(sanitize_value(item))
                continue
            if isinstance(item, dict):
                name = sanitize_value(item.get("name"))
                dose = sanitize_value(item.get("dose"))
                frequency = sanitize_value(item.get("frequency"))
                duration = sanitize_value(item.get("duration"))
                if all(part == "N/A" for part in [name, dose, frequency, duration]):
                    lines.append("N/A")
                    continue
                lines.append(
                    " - ".join(part for part in [name, dose, frequency, duration] if part != "N/A")
                )
    elif isinstance(medicines_value, str):
        lines = [sanitize_value(part) for part in re.split(r"\r?\n|;|,", medicines_value)]

    cleaned_lines = []
    seen = set()
    for line in lines:
        normalized = sanitize_value(line)
        if normalized == "N/A" or normalized in seen:
            continue
        seen.add(normalized)
        cleaned_lines.append(normalized)

    return "\n".join(cleaned_lines) if cleaned_lines else "N/A"


def normalize_treatment(value: Any) -> str:
    if isinstance(value, list):
        normalized_lines = [sanitize_value(item) for item in value]
        cleaned = [item for item in normalized_lines if item != "N/A"]
        return "\n".join(cleaned) if cleaned else "N/A"
    if isinstance(value, dict):
        normalized_lines = [sanitize_value(item) for item in value.values()]
        cleaned = [item for item in normalized_lines if item != "N/A"]
        return "\n".join(cleaned) if cleaned else "N/A"
    if isinstance(value, str):
        lines = [sanitize_value(part) for part in re.split(r"\r?\n|;|,", value)]
        cleaned = [item for item in lines if item != "N/A"]
        return "\n".join(cleaned) if cleaned else "N/A"
    return sanitize_value(value)


def normalize_extraction(raw_data: dict[str, Any]) -> dict[str, Any]:
    case_data = {
        "patientName": sanitize_value(
            first_available_value(raw_data, "patientName", "patient_name", "name")
        ),
        "age": normalize_age(first_available_value(raw_data, "age")),
        "sex": normalize_sex(first_available_value(raw_data, "sex", "gender")),
        "locationVillage": sanitize_value(
            first_available_value(raw_data, "locationVillage", "location", "village")
        ),
        "testDate": normalize_date(
            first_available_value(raw_data, "testDate", "test_date", "date")
        ),
        "testType": sanitize_value(first_available_value(raw_data, "testType", "test_type")),
        "result": sanitize_value(
            first_available_value(raw_data, "result", "testResult", "test_result")
        ),
        "pathogen": sanitize_value(first_available_value(raw_data, "pathogen", "species")),
        "treatment": normalize_treatment(
            first_available_value(raw_data, "treatment", "medicines", "treatment_given")
        ),
        "temperature": sanitize_value(first_available_value(raw_data, "temperature")),
        "hbLevel": sanitize_value(first_available_value(raw_data, "hbLevel", "hb", "hb_level")),
    }
    field_status = {
        key: ("Review Required" if value == "N/A" else "Verified")
        for key, value in case_data.items()
    }
    record_status = (
        "Verified"
        if all(status == "Verified" for status in field_status.values())
        else "Review Required"
    )
    return {"caseData": case_data, "fieldStatus": field_status, "recordStatus": record_status}


def get_message_content(message: Any) -> str:
    if isinstance(message, str):
        return message
    if not isinstance(message, list):
        return ""

    parts = []
    for item in message:
        if isinstance(item, str):
            parts.append(item)
        elif (
            isinstance(item, dict)
            and item.get("type") in {"text", "output_text"}
            and isinstance(item.get("text"), str)
        ):
            parts.append(item["text"])
    return "\n".join(part for part in parts if part)


def strip_code_block(text: str) -> str:
    trimmed = text.strip()
    if not trimmed.startswith("```"):
        return trimmed
    trimmed = re.sub(r"^```[a-zA-Z]*\n?", "", trimmed)
    trimmed = re.sub(r"\n?```$", "", trimmed)
    return trimmed.strip()


def parse_model_json(text: str) -> dict[str, Any]:
    cleaned = strip_code_block(text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        if first_brace >= 0 and last_brace > first_brace:
            parsed = json.loads(cleaned[first_brace : last_brace + 1])
        else:
            raise HTTPException(
                status_code=502, detail="Model output was not valid JSON."
            ) from None
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Model output JSON must be an object.")
    return parsed


def has_multilingual_text(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(re.search(r"[\u0080-\uFFFF]", value))
    if isinstance(value, list):
        return any(has_multilingual_text(item) for item in value)
    if isinstance(value, dict):
        return any(has_multilingual_text(item) for item in value.values())
    return False


def build_prompt() -> str:
    return "\n".join(
        [
            "Extract malaria CIF fields from the document image.",
            "Important rules:",
            "1) Do not guess missing values. If a field is missing or unclear, return exactly 'N/A'.",
            "2) Return only valid JSON with this exact schema:",
            "3) Always return the date in DD-MM-YYYY format if any date is detected, convert to DD-MM-YYYY if needed.",
            "{",
            '  "patientName": "string",',
            '  "age": "string",',
            '  "sex": "string",',
            '  "locationVillage": "string",',
            '  "testDate": "string",',
            '  "testType": "string",',
            '  "result": "string",',
            '  "pathogen": "string",',
            '  "treatment": "string",',
            '  "temperature": "string",',
            '  "hbLevel": "string"',
            "}",
            "3) Extract multilingual handwriting and printed text when visible.",
            "4) Translate non-English text into English in the output fields.",
            "5) For names and medical terms, keep the closest readable English transliteration if needed.",
            "6) Keep date as seen in source. Do not invent.",
            "7) Return only the fields in the schema above. No extra keys.",
        ]
    )


def call_openrouter(payload: dict[str, Any], log_label: str) -> dict[str, Any]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, detail="OPENROUTER_API_KEY is not configured on the backend."
        )

    logger.info("OpenRouter request started | %s | model=%s", log_label, payload.get("model"))
    try:
        response = requests.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": f"http://localhost:{PORT}",
                "X-Title": "CIF Digitisation Platform",
            },
            json=payload,
            timeout=120,
        )
    except requests.RequestException as exc:
        logger.exception("OpenRouter request failed | %s", log_label)
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to reach OpenRouter for OCR extraction. "
                "Check internet access, firewall rules, and OPENROUTER_BASE_URL."
            ),
        ) from exc
    try:
        response_payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502, detail="OpenRouter returned a non-JSON response."
        ) from exc

    if not response.ok:
        api_message = (
            response_payload.get("error", {}).get("message")
            or response_payload.get("message")
            or "OpenRouter request failed."
        )
        raise HTTPException(status_code=502, detail=api_message)

    logger.info("OpenRouter request completed | %s | status=%s", log_label, response.status_code)
    return response_payload


def call_openrouter_for_extraction(file_data_url: str) -> dict[str, Any]:
    payload = {
        "model": MODEL_NAME,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": build_prompt()},
                    {"type": "image_url", "image_url": {"url": file_data_url}},
                ],
            }
        ],
    }
    response_payload = call_openrouter(payload, "extraction")
    content = get_message_content(
        response_payload.get("choices", [{}])[0].get("message", {}).get("content")
    )
    if not content:
        raise HTTPException(status_code=502, detail="Model response was empty.")
    response = {"extracted": parse_model_json(content), "usage": response_payload.get("usage")}
    logger.info("Extraction result parsed successfully | %s", response["extracted"])
    return response


def translate_extraction_to_english(extracted_json: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "model": MODEL_NAME,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": "\n".join(
                    [
                        "Translate the JSON values to English.",
                        "Rules:",
                        "1) Keep JSON keys exactly unchanged.",
                        "2) Keep structure exactly unchanged.",
                        "3) Keep 'N/A' exactly as 'N/A'.",
                        "4) Do not infer or invent missing values.",
                        "5) For names, use readable English transliteration.",
                        "Return only valid JSON.",
                        "",
                        json.dumps(extracted_json),
                    ]
                ),
            }
        ],
    }
    response_payload = call_openrouter(payload, "translation")
    content = get_message_content(
        response_payload.get("choices", [{}])[0].get("message", {}).get("content")
    )
    return parse_model_json(content) if content else extracted_json


def validate_and_normalize_data_url(file_data_url: str, file_type: str) -> str:
    if not file_data_url.startswith("data:"):
        raise HTTPException(
            status_code=400, detail="Invalid file payload. Please upload a valid image."
        )

    header_match = re.match(r"^data:([^;]+);base64,", file_data_url, flags=re.IGNORECASE)
    if not header_match:
        raise HTTPException(
            status_code=400, detail="Unsupported file encoding. Please upload a JPG/PNG/WEBP image."
        )

    mime_type = header_match.group(1).lower()
    declared_type = (file_type or "").lower()
    normalized_declared = "image/jpeg" if declared_type == "image/jpg" else declared_type
    normalized_mime = "image/jpeg" if mime_type == "image/jpg" else mime_type

    if normalized_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are supported for OCR extraction.",
        )
    if normalized_declared and normalized_declared != normalized_mime:
        raise HTTPException(
            status_code=400, detail="File type mismatch detected. Please re-upload a valid image."
        )

    return file_data_url


async def process_job(job: dict[str, Any], payload: DigitizePayload) -> None:
    job["status"] = "running"
    job["startedAt"] = now_iso()
    job["updatedAt"] = job["startedAt"]
    append_log(job, f"Job started for {job['fileName']}")

    try:
        mark_stage_running(job, 0)
        if not payload.fileName or not payload.fileType or not payload.fileDataUrl:
            raise HTTPException(
                status_code=400, detail="Missing file details for digitisation request."
            )
        mark_stage_completed(job, 0)

        mark_stage_running(job, 1)
        normalized_data_url = validate_and_normalize_data_url(payload.fileDataUrl, payload.fileType)
        mark_stage_completed(job, 1)

        mark_stage_running(job, 2)
        extraction_output = await asyncio.to_thread(
            call_openrouter_for_extraction, normalized_data_url
        )
        extracted_data = extraction_output.get("extracted") or {}
        if has_multilingual_text(extracted_data):
            extracted_data = await asyncio.to_thread(
                translate_extraction_to_english, extracted_data
            )
            append_log(job, "Translated multilingual extracted fields to English")
        mark_stage_completed(job, 2)

        mark_stage_running(job, 3)
        normalized = normalize_extraction(extracted_data)
        mark_stage_completed(job, 3)

        mark_stage_running(job, 4)
        job["result"] = {
            **normalized,
            "metadata": {
                "model": MODEL_NAME,
                "extractedAt": now_iso(),
            },
        }
        job["usage"] = extraction_output.get("usage")
        mark_stage_completed(job, 4)

        job["status"] = "completed"
        job["completedAt"] = now_iso()
        job["updatedAt"] = job["completedAt"]
        append_log(job, "Extraction completed successfully")
    except HTTPException as exc:
        running_stage_index = get_running_stage_index(job)
        if running_stage_index >= 0:
            job["stages"][running_stage_index]["status"] = "failed"
            job["stages"][running_stage_index]["completedAt"] = now_iso()
        job["status"] = "failed"
        job["error"] = {"message": str(exc.detail)}
        job["completedAt"] = now_iso()
        job["updatedAt"] = job["completedAt"]
        append_log(job, f"Failed: {job['error']['message']}")
    except Exception as exc:  # pragma: no cover - last-resort safety
        running_stage_index = get_running_stage_index(job)
        if running_stage_index >= 0:
            job["stages"][running_stage_index]["status"] = "failed"
            job["stages"][running_stage_index]["completedAt"] = now_iso()
        job["status"] = "failed"
        job["error"] = {"message": str(exc) or "Digitisation failed."}
        job["completedAt"] = now_iso()
        job["updatedAt"] = job["completedAt"]
        append_log(job, f"Failed: {job['error']['message']}")


async def cleanup_jobs_task() -> None:
    while True:
        await asyncio.sleep(600)
        current_ms = int(time.time() * 1000)
        for job_id, job in list(jobs.items()):
            completed_ms = parse_iso_to_ms(job.get("completedAt"))
            if completed_ms and current_ms - completed_ms > 60 * 60 * 1000:
                jobs.pop(job_id, None)


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


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "time": now_iso(),
    }


@app.post("/api/digitize", status_code=202)
async def create_digitize_job(
    payload: DigitizePayload, background_tasks: BackgroundTasks, request: Request
) -> dict[str, Any]:
    require_auth0_roles(request, {"admin", "flw"})

    file_name = sanitize_value(payload.fileName)
    file_type = sanitize_value(payload.fileType)
    if file_name == "N/A" or file_type == "N/A":
        raise HTTPException(status_code=400, detail="File name and file type are required.")

    job = create_job(payload.fileName, payload.fileType)
    jobs[job["id"]] = job
    background_tasks.add_task(process_job, job, payload)
    return {"jobId": job["id"], "status": job["status"]}


@app.get("/api/digitize/{job_id}")
async def get_digitize_job(job_id: str, request: Request) -> dict[str, Any]:
    require_auth0_roles(request, {"admin", "flw"})

    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"job": build_snapshot(job)}


@app.get("/", include_in_schema=False)
async def serve_frontend_root() -> FileResponse:
    if not FRONTEND_INDEX_FILE.exists():
        raise HTTPException(
            status_code=404, detail="Frontend build not found. Run `npm run build` first."
        )
    return FileResponse(FRONTEND_INDEX_FILE)


@app.get("/{full_path:path}", include_in_schema=False)
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


if __name__ == "__main__":
    from backend.main import run_server

    run_server(PORT)

from __future__ import annotations

import io
import re
from pathlib import Path

from fastapi import HTTPException

from ..core.config import AWS_REGION, AWS_S3_BUCKET_NAME, AWS_S3_UPLOAD_PREFIX
from ..core.logging import logger

SAFE_KEY_PART_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_key_part(value: str) -> str:
    cleaned = SAFE_KEY_PART_PATTERN.sub("_", (value or "").strip())
    cleaned = cleaned.strip("._-")
    return cleaned or "document"


def normalize_file_name(file_name: str) -> str:
    base_name = Path((file_name or "").strip()).name
    return sanitize_key_part(base_name)


def build_upload_key(job_id: str, file_name: str) -> str:
    return f"{AWS_S3_UPLOAD_PREFIX}/{sanitize_key_part(job_id)}/{normalize_file_name(file_name)}"


def get_s3_client():
    client_kwargs: dict[str, str] = {}
    if AWS_REGION:
        client_kwargs["region_name"] = AWS_REGION
    try:
        import boto3
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=500,
            detail="boto3 is not installed on the backend. Run `uv sync --directory backend`.",
        ) from exc

    return boto3.client("s3", **client_kwargs)


def upload_prescription_to_s3(
    *, file_bytes: bytes, file_name: str, content_type: str, job_id: str
) -> str:
    if not AWS_S3_BUCKET_NAME:
        raise HTTPException(
            status_code=500,
            detail="AWS_S3_BUCKET_NAME is not configured on the backend.",
        )
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    key = build_upload_key(job_id, file_name)
    logger.info("Uploading prescription to S3 | bucket=%s | key=%s", AWS_S3_BUCKET_NAME, key)

    try:
        get_s3_client().upload_fileobj(
            io.BytesIO(file_bytes),
            AWS_S3_BUCKET_NAME,
            key,
            ExtraArgs={
                "ContentType": content_type or "application/octet-stream",
                "ServerSideEncryption": "AES256",
            },
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        logger.exception(
            "Failed to upload prescription to S3 | bucket=%s | key=%s", AWS_S3_BUCKET_NAME, key
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to store the uploaded file in S3.",
        ) from exc

    return key

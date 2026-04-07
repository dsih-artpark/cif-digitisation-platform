from __future__ import annotations

import base64
import io
import re

from fastapi import HTTPException
from PIL import Image

from ..core.config import ALLOWED_MIME_TYPES


def parse_data_url(file_data_url: str) -> tuple[str, bytes]:
    if not file_data_url.startswith("data:"):
        raise HTTPException(
            status_code=400, detail="Invalid file payload. Please upload a valid image."
        )

    header_match = re.match(r"^data:([^;]+);base64,", file_data_url, flags=re.IGNORECASE)
    if not header_match:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file encoding. Please upload a JPG, PNG, WEBP image, or PDF.",
        )

    mime_type = header_match.group(1).lower()
    base64_payload = file_data_url[header_match.end() :]
    try:
        decoded_bytes = base64.b64decode(base64_payload, validate=True)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=400, detail="Uploaded document could not be decoded."
        ) from exc
    return mime_type, decoded_bytes


def build_image_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return build_data_url_from_bytes(buffer.getvalue(), "image/jpeg")


def build_data_url_from_bytes(file_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(file_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def convert_pdf_bytes_to_image_data_url(pdf_bytes: bytes) -> tuple[str, int]:
    try:
        import fitz
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="PDF support is not installed on the backend. Install PyMuPDF to process PDFs.",
        ) from exc

    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail="Uploaded PDF could not be opened.") from exc

    try:
        page_count = document.page_count
        if page_count == 0:
            raise HTTPException(status_code=400, detail="Uploaded PDF does not contain any pages.")

        rendered_images: list[Image.Image] = []
        max_pages = min(page_count, 3)
        zoom_matrix = fitz.Matrix(2, 2)

        for index in range(max_pages):
            page = document.load_page(index)
            pixmap = page.get_pixmap(matrix=zoom_matrix, alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGB")
            rendered_images.append(image)

        total_height = sum(image.height for image in rendered_images)
        max_width = max(image.width for image in rendered_images)
        combined = Image.new("RGB", (max_width, total_height), "white")

        current_top = 0
        for image in rendered_images:
            combined.paste(image, (0, current_top))
            current_top += image.height

        return build_image_data_url(combined), page_count
    finally:
        document.close()


def validate_and_normalize_data_url(file_data_url: str, file_type: str) -> tuple[str, str]:
    mime_type, file_bytes = parse_data_url(file_data_url)
    declared_type = (file_type or "").lower()
    normalized_declared = "image/jpeg" if declared_type == "image/jpg" else declared_type
    normalized_mime = "image/jpeg" if mime_type == "image/jpg" else mime_type

    if normalized_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, WEBP images, and PDF files are supported for OCR extraction.",
        )
    if normalized_declared and normalized_declared != normalized_mime:
        raise HTTPException(
            status_code=400, detail="File type mismatch detected. Please re-upload a valid image."
        )

    if normalized_mime == "application/pdf":
        converted_data_url, page_count = convert_pdf_bytes_to_image_data_url(file_bytes)
        page_label = "page" if page_count == 1 else "pages"
        return converted_data_url, f"PDF rendered for OCR from {page_count} {page_label}"

    return file_data_url, f"{normalized_mime} payload validated for OCR extraction"

from __future__ import annotations

import base64
import io
import mimetypes
import re

from fastapi import HTTPException
from PIL import Image

from ..core.config import ALLOWED_MIME_TYPES


def normalize_mime_type(mime_type: str | None) -> str:
    normalized = (mime_type or "").strip().lower()
    if normalized == "image/jpg":
        return "image/jpeg"
    if normalized == "application/octet-stream":
        return ""
    return normalized


def guess_mime_type_from_filename(file_name: str | None) -> str:
    guessed_type, _ = mimetypes.guess_type((file_name or "").strip(), strict=False)
    return normalize_mime_type(guessed_type)


def resolve_uploaded_mime_type(
    declared_type: str | None, fallback_type: str | None, file_name: str | None
) -> str:
    normalized_declared = normalize_mime_type(declared_type)
    if normalized_declared:
        return normalized_declared

    normalized_fallback = normalize_mime_type(fallback_type)
    if normalized_fallback:
        return normalized_fallback

    return guess_mime_type_from_filename(file_name)


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


def downscale_image(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return copy


def register_heif_support() -> None:
    try:
        from pillow_heif import register_heif_opener
    except ImportError:
        return

    register_heif_opener()


def convert_generic_image_bytes_to_image_data_url(
    file_bytes: bytes, mime_type: str
) -> tuple[str, str]:
    register_heif_support()
    try:
        with Image.open(io.BytesIO(file_bytes)) as image:
            normalized = image.convert("RGB")
    except Exception as exc:
        if mime_type in {"image/heic", "image/heif"}:
            raise HTTPException(
                status_code=400,
                detail="This HEIC/HEIF image could not be processed. Please try a JPG, PNG, or PDF copy.",
            ) from exc
        raise HTTPException(
            status_code=400,
            detail="Uploaded image could not be processed. Please try another image or PDF file.",
        ) from exc

    normalized = downscale_image(normalized, max_width=2000, max_height=2600)
    return build_image_data_url(normalized), f"{mime_type} converted to JPEG for OCR extraction"


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
        max_pages = min(page_count, 2)
        zoom_matrix = fitz.Matrix(1.5, 1.5)

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

        combined = downscale_image(combined, max_width=1600, max_height=2600)
        return build_image_data_url(combined), page_count
    finally:
        document.close()


def validate_and_normalize_data_url(file_data_url: str, file_type: str) -> tuple[str, str]:
    mime_type, file_bytes = parse_data_url(file_data_url)
    normalized_declared = normalize_mime_type(file_type)
    normalized_mime = normalize_mime_type(mime_type)

    if normalized_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only image files and PDF files are supported for OCR extraction.",
        )
    if normalized_declared and normalized_declared != normalized_mime:
        raise HTTPException(
            status_code=400, detail="File type mismatch detected. Please re-upload a valid image."
        )

    if normalized_mime == "application/pdf":
        converted_data_url, page_count = convert_pdf_bytes_to_image_data_url(file_bytes)
        page_label = "page" if page_count == 1 else "pages"
        return converted_data_url, f"PDF rendered for OCR from {page_count} {page_label}"

    if normalized_mime not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
        return convert_generic_image_bytes_to_image_data_url(file_bytes, normalized_mime)

    return file_data_url, f"{normalized_mime} payload validated for OCR extraction"

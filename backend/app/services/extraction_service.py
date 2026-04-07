from __future__ import annotations

import json
import re
from typing import Any

import requests
from fastapi import HTTPException

from ..core.config import MODEL_NAME, OPENROUTER_BASE_URL, PORT
from ..core.logging import logger


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
            "Extract malaria CIF fields from the uploaded document.",
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
    import os

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

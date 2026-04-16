from __future__ import annotations

import json
import re
import time
from typing import Any

import requests
from fastapi import HTTPException

from ..core.config import MODEL_NAME, OPENROUTER_BASE_URL, PORT
from ..core.logging import logger

AFFORDABILITY_PATTERN = re.compile(r"can only afford\s+([\d,]+)\s+tokens", re.IGNORECASE)


def get_message_content(message: Any) -> str:
    if isinstance(message, str):
        return message
    if isinstance(message, dict):
        text = message.get("text")
        if isinstance(text, str):
            return text
        if isinstance(text, dict) and isinstance(text.get("value"), str):
            return text["value"]
        return ""
    if not isinstance(message, list):
        return ""

    parts = []
    for item in message:
        if isinstance(item, str):
            parts.append(item)
        elif isinstance(item, dict) and item.get("type") in {"text", "output_text"}:
            if isinstance(item.get("text"), str):
                parts.append(item["text"])
            elif isinstance(item.get("text"), dict) and isinstance(item["text"].get("value"), str):
                parts.append(item["text"]["value"])
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
    decoder = json.JSONDecoder()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        first_brace = cleaned.find("{")
        if first_brace >= 0:
            try:
                parsed, _ = decoder.raw_decode(cleaned[first_brace:])
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=502, detail="Model output was not valid JSON."
                ) from None
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
            "Extract the following CIF fields from the uploaded document.",
            "Important rules:",
            "1) Do not guess missing values. If a field is missing or not applicable, return an empty string.",
            "2) Return only valid JSON with this exact schema:",
            "3) Normalize the extracted values before returning them:",
            "   - name_hindi must be the patient name in Devanagari script when visible.",
            "   - name_english must be the patient name transliterated into English.",
            "   - age must preserve the visible unit when present, such as years or months.",
            "   - if age is shown as only a number, treat it as years in the output.",
            "   - sex must be exactly M or F.",
            "   - location must be cleaned text with single spaces.",
            "   - date must be in DD-MM-YYYY format.",
            "   - test_type must be cleaned text.",
            "   - result must be exactly Positive or Negative.",
            "   - pathogen must be exactly Pf, Pv, or Mixed, or an empty string if result is Negative.",
            "   - treatment must preserve the OCR extracted content.",
            "   - temperature, hb_level, and rbs must contain only the numeric value when visible.",
            "   - bp must preserve the blood pressure text as visible.",
            "   - contacts must preserve numeric ratios like 5/5 or 4/3 when present.",
            "   - fever_onset_date must be in DD/MM/YYYY format.",
            "   - hh_total, hh_surveyed, individuals_tested, and individuals_positive must be numeric only.",
            "{",
            '  "name_hindi": "string",',
            '  "name_english": "string",',
            '  "age": "string",',
            '  "sex": "string",',
            '  "location": "string",',
            '  "date": "string",',
            '  "test_type": "string",',
            '  "result": "string",',
            '  "pathogen": "string",',
            '  "treatment": "string",',
            '  "temperature": "string",',
            '  "hb_level": "string",',
            '  "rbs": "string",',
            '  "bp": "string",',
            '  "contacts": "string",',
            '  "fever_onset_date": "string",',
            '  "hh_total": "string",',
            '  "hh_surveyed": "string",',
            '  "individuals_tested": "string",',
            '  "individuals_positive": "string"',
            "}",
            "4) Extract multilingual handwriting and printed text when visible.",
            "5) Translate non-English text into English for name_english and English-readable fields.",
            "6) For name_hindi, keep the original Devanagari script if present.",
            "7) If result is Negative, leave pathogen as an empty string.",
            "8) If multiple patient records appear, extract only the first or primary record.",
            "9) Return only the fields in the schema above. No extra keys.",
        ]
    )


def to_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def estimate_extraction_max_tokens(preprocessing: dict[str, Any] | None) -> int:
    context = preprocessing if isinstance(preprocessing, dict) else {}
    width = max(1, to_int(context.get("width"), 1))
    height = max(1, to_int(context.get("height"), 1))
    page_count = max(1, to_int(context.get("pageCount"), 1))
    byte_size = max(0, to_int(context.get("byteSize"), 0))

    megapixels = (width * height) / 1_000_000
    size_kb = byte_size / 1024
    estimated = round(420 + (megapixels * 240) + (page_count * 180) + (size_kb / 10))
    return max(320, estimated)


def estimate_translation_max_tokens(extracted_json: dict[str, Any]) -> int:
    content_chars = len(json.dumps(extracted_json, ensure_ascii=False))
    estimated = round(220 + (content_chars / 2))
    return max(256, estimated)


def parse_affordable_tokens(message: str) -> int | None:
    match = AFFORDABILITY_PATTERN.search(message or "")
    if not match:
        return None
    try:
        return int(match.group(1).replace(",", ""))
    except ValueError:
        return None


def to_number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def first_non_none(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def normalize_usage(usage: Any) -> dict[str, int] | None:
    if not isinstance(usage, dict):
        return None

    prompt = to_number(
        first_non_none(
            usage.get("prompt_tokens"), usage.get("input_tokens"), usage.get("inputTokens")
        )
    )
    completion = to_number(
        first_non_none(
            usage.get("completion_tokens"),
            usage.get("output_tokens"),
            usage.get("outputTokens"),
        )
    )
    total = to_number(first_non_none(usage.get("total_tokens"), usage.get("totalTokens")))

    normalized: dict[str, int] = {}
    if prompt is not None:
        normalized["prompt_tokens"] = int(round(prompt))
    if completion is not None:
        normalized["completion_tokens"] = int(round(completion))
    if total is not None:
        normalized["total_tokens"] = int(round(total))

    if "total_tokens" not in normalized and (
        "prompt_tokens" in normalized or "completion_tokens" in normalized
    ):
        normalized["total_tokens"] = normalized.get("prompt_tokens", 0) + normalized.get(
            "completion_tokens", 0
        )

    return normalized or None


def merge_usage(*usages: Any) -> dict[str, int] | None:
    merged: dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    has_values = False
    for usage in usages:
        normalized = normalize_usage(usage)
        if not normalized:
            continue
        has_values = True
        merged["prompt_tokens"] += normalized.get("prompt_tokens", 0)
        merged["completion_tokens"] += normalized.get("completion_tokens", 0)
        merged["total_tokens"] += normalized.get("total_tokens", 0)

    return merged if has_values else None


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


def call_openrouter_for_extraction(
    file_data_url: str, preprocessing: dict[str, Any] | None = None
) -> dict[str, Any]:
    max_tokens = estimate_extraction_max_tokens(preprocessing)
    payload = {
        "model": MODEL_NAME,
        "temperature": 0,
        "max_tokens": max_tokens,
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
    started = time.perf_counter()
    try:
        response_payload = call_openrouter(payload, "extraction")
    except HTTPException as exc:
        affordable_tokens = parse_affordable_tokens(str(exc.detail))
        if affordable_tokens and affordable_tokens > 0:
            payload["max_tokens"] = affordable_tokens
            response_payload = call_openrouter(payload, "extraction_retry_affordable_tokens")
        else:
            raise
    latency_ms = round((time.perf_counter() - started) * 1000, 2)

    first_choice = response_payload.get("choices", [{}])[0]
    message = first_choice.get("message", {})
    content = get_message_content(message.get("content"))
    if not content:
        content = get_message_content(first_choice.get("text"))
    if not content:
        logger.warning(
            "OpenRouter returned empty extraction content | payload=%s", response_payload
        )
        raise HTTPException(status_code=502, detail="Model response was empty.")
    response = {
        "extracted": parse_model_json(content),
        "usage": response_payload.get("usage"),
        "model": response_payload.get("model") or first_choice.get("model"),
        "requestedModel": payload.get("model"),
        "latencyMs": latency_ms,
        "maxTokensRequested": payload.get("max_tokens"),
    }
    logger.info("Extraction result parsed successfully | %s", response["extracted"])
    return response


def translate_extraction_to_english(extracted_json: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "model": MODEL_NAME,
        "temperature": 0,
        "max_tokens": estimate_translation_max_tokens(extracted_json),
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": "\n".join(
                    [
                        "Translate the JSON values to English where appropriate.",
                        "Rules:",
                        "1) Keep JSON keys exactly unchanged.",
                        "2) Keep structure exactly unchanged.",
                        "3) Keep empty strings exactly as empty strings.",
                        "4) Do not infer or invent missing values.",
                        "5) Keep name_hindi in its original script if it is already present.",
                        "6) Set name_english to a readable English transliteration.",
                        "Return only valid JSON.",
                        "",
                        json.dumps(extracted_json),
                    ]
                ),
            }
        ],
    }
    started = time.perf_counter()
    response_payload = call_openrouter(payload, "translation")
    latency_ms = round((time.perf_counter() - started) * 1000, 2)

    first_choice = response_payload.get("choices", [{}])[0]
    message = first_choice.get("message", {})
    content = get_message_content(message.get("content"))

    return {
        "extracted": parse_model_json(content) if content else extracted_json,
        "usage": response_payload.get("usage"),
        "model": response_payload.get("model") or first_choice.get("model"),
        "requestedModel": payload.get("model"),
        "latencyMs": latency_ms,
        "maxTokensRequested": payload.get("max_tokens"),
    }

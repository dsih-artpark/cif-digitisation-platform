"""Shared helper: extract the 12-field caseData from OCR text via an LLM (OpenRouter).

Used by two-stage pipelines (MinerU + Claude, Sarvam OCR + Claude, etc) where stage 1
produces text and stage 2 maps it to the structured CIF schema.
"""
from __future__ import annotations

import json
import re
from typing import Any

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FIELDS = [
    "patient_name", "age", "sex", "location", "village", "date",
    "test_type", "result", "pathogen", "treatment", "temperature", "hb_level",
]

EXTRACTION_SYSTEM = """You are extracting structured data from OCR'd text of a Case Investigation Form (CIF) for malaria surveillance. The OCR may have errors (handwriting, transliteration). Use surrounding form context to recover meaning when possible.

Return STRICT JSON only — no prose, no code fences. Exactly this shape:

{
  "patient_name": "...",
  "age": "... years|months|N/A",
  "sex": "M|F|N/A",
  "location": "...",
  "village": "...",
  "date": "DD-MM-YYYY|N/A",
  "test_type": "RDT|Microscopy|Bivalent RDT|N/A",
  "result": "Positive|Negative|N/A",
  "pathogen": "Pf|Pv|Mixed|N/A",
  "treatment": "...",
  "temperature": "...|N/A",
  "hb_level": "...|N/A"
}

Rules:
- Use "N/A" for fields the OCR doesn't make clear.
- For age: include the unit ("48 years", "14 months").
- For sex: M, F, or N/A. Do not guess from name.
- For date: prefer the test/RDT date (DD-MM-YYYY). If only fever onset is present, use it but flag in a separate "_notes" key.
- For pathogen: Pf=falciparum, Pv=vivax, Mixed if both. N/A if not stated.
- For result: Positive only if the form explicitly says positive (or +ve, +). Do not infer from pathogen alone.
- For location/village: location = larger admin (district/PHC/taluka), village = the smallest named place. If ambiguous, put the smallest named place in village and leave location N/A.
- For treatment: free text. Capture drug names + doses if present, else "N/A"."""


def call_openrouter(
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.0,
    max_tokens: int = 1000,
    timeout: float = 90.0,
) -> tuple[str, dict[str, Any]]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/dsih-artpark/cif-digitisation-platform",
        "X-Title": "CIF digitisation eval pipeline",
    }
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    resp = requests.post(OPENROUTER_URL, headers=headers, json=body, timeout=timeout)
    resp.raise_for_status()
    payload = resp.json()
    content = payload["choices"][0]["message"]["content"]
    return content, payload.get("usage", {}) or {}


def extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"Non-JSON LLM content: {text[:200]}")


def extract_fields(
    ocr_text: str, model: str, api_key: str, *, max_chars: int = 20000
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Send OCR'd text to the LLM, return (caseData, usage)."""
    if len(ocr_text) > max_chars:
        ocr_text = ocr_text[:max_chars]
    user = (
        "OCR text from the CIF (may include table markup):\n\n"
        f"```\n{ocr_text}\n```\n\n"
        "Return the JSON for the 12 fields listed in the system prompt."
    )
    content, usage = call_openrouter(
        api_key, model,
        [
            {"role": "system", "content": EXTRACTION_SYSTEM},
            {"role": "user", "content": user},
        ],
    )
    parsed = extract_json(content)
    case_data = {f: parsed.get(f, "N/A") for f in FIELDS}
    return case_data, usage

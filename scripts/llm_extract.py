"""Shared helper: extract the 12-field caseData from OCR text via an LLM (OpenRouter).

Used by two-stage pipelines (MinerU + Claude, Sarvam OCR + Claude, etc) where stage 1
produces text and stage 2 maps it to the structured CIF schema.

Output is validated against a Pydantic schema with closed-vocabulary enums for
sex/result/pathogen/test_type. On validation failure the LLM is re-asked once
with the validation error embedded — gives the model a chance to self-correct
without burning extra calls when the first attempt is already valid.
"""
from __future__ import annotations

import json
import re
from typing import Any, Literal

import requests
from pydantic import BaseModel, Field, ValidationError

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FIELDS = [
    "patient_name", "age", "sex", "location", "village", "date",
    "test_type", "result", "pathogen", "treatment", "temperature", "hb_level",
]

SexLit = Literal["M", "F", "N/A"]
ResultLit = Literal["Positive", "Negative", "N/A"]
PathogenLit = Literal["Pf", "Pv", "Mixed", "N/A"]
TestTypeLit = Literal["RDT", "Microscopy", "Bivalent RDT", "N/A"]


class ExtractedCaseData(BaseModel):
    """Vocabulary-constrained schema for the 12 CIF fields.

    Open-vocab fields (names, places, free text) accept any string but coerce
    empty values to "N/A" so missing-vs-blank stays unambiguous.
    """

    patient_name: str = Field(default="N/A")
    age: str = Field(default="N/A")
    sex: SexLit = "N/A"
    location: str = Field(default="N/A")
    village: str = Field(default="N/A")
    date: str = Field(default="N/A")
    test_type: TestTypeLit = "N/A"
    result: ResultLit = "N/A"
    pathogen: PathogenLit = "N/A"
    treatment: str = Field(default="N/A")
    temperature: str = Field(default="N/A")
    hb_level: str = Field(default="N/A")


EXTRACTION_SYSTEM = """You are extracting structured data from OCR'd text of a Case Investigation Form (CIF) for malaria surveillance. The OCR may have errors (handwriting, transliteration). Use surrounding form context to recover meaning when possible.

Return STRICT JSON only — no prose, no code fences. Closed-vocabulary fields MUST use exactly one of the listed values; using anything else will be rejected.

Schema:
{
  "patient_name": "<string>",
  "age": "<number with unit, e.g. '48 years' or '14 months', or 'N/A'>",
  "sex": "M" | "F" | "N/A",
  "location": "<string>",
  "village": "<string>",
  "date": "<DD-MM-YYYY>" | "N/A",
  "test_type": "RDT" | "Microscopy" | "Bivalent RDT" | "N/A",
  "result": "Positive" | "Negative" | "N/A",
  "pathogen": "Pf" | "Pv" | "Mixed" | "N/A",
  "treatment": "<string>",
  "temperature": "<string with unit>" | "N/A",
  "hb_level": "<string with unit>" | "N/A"
}

Rules:
- Use "N/A" (exact spelling) for fields the OCR doesn't make clear. Do not invent values.
- For age: include the unit ("48 years", "14 months"); if only a number is present, default to years.
- For sex: M, F, or N/A. Do not guess from name. If document says "Male"/"Female"/"पुरुष"/"महिला", normalise to M or F.
- For date: prefer the test/RDT date (DD-MM-YYYY). Re-format other date layouts if needed.
- For pathogen: Pf=P. falciparum, Pv=P. vivax, Mixed if both. "N/A" if not stated.
- For result: "Positive" only if the form explicitly says positive (or +ve, +). Do not infer from pathogen alone. "Negative" if explicitly negative.
- For test_type: RDT for rapid tests, Microscopy for slides/blood smears, "Bivalent RDT" specifically when the form says bivalent. "N/A" otherwise.
- For location/village: location = larger admin (district/PHC/taluka), village = smallest named place. If ambiguous, put the smallest named place in village and leave location "N/A".
- For treatment: free text — drug names + doses if present, else "N/A"."""


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


def _accumulate_usage(into: dict[str, Any], add: dict[str, Any]) -> None:
    for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
        into[key] = (into.get(key, 0) or 0) + (add.get(key, 0) or 0)
    cost = add.get("cost")
    if cost:
        into["cost"] = round((into.get("cost", 0.0) or 0.0) + cost, 6)


def extract_fields(
    ocr_text: str, model: str, api_key: str,
    *, max_chars: int = 20000, max_retries: int = 1,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Send OCR'd text to the LLM, validate against ExtractedCaseData, return (caseData, usage).

    On validation failure, retries up to ``max_retries`` more times with the
    Pydantic error embedded in the prompt. If still failing, returns a
    best-effort dict with `_validation_error` populated.
    """
    if len(ocr_text) > max_chars:
        ocr_text = ocr_text[:max_chars]

    base_user = (
        "OCR text from the CIF (may include table markup):\n\n"
        f"```\n{ocr_text}\n```\n\n"
        "Return JSON matching the schema in the system prompt."
    )
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": EXTRACTION_SYSTEM},
        {"role": "user", "content": base_user},
    ]
    usage_total: dict[str, Any] = {}
    last_parsed: dict[str, Any] | None = None
    last_error: str | None = None

    for attempt in range(max_retries + 1):
        content, usage = call_openrouter(api_key, model, messages)
        _accumulate_usage(usage_total, usage)
        try:
            parsed = extract_json(content)
        except ValueError as exc:
            last_error = f"json parse failed: {exc}"
            messages.append({"role": "assistant", "content": content})
            messages.append({
                "role": "user",
                "content": (
                    f"Your last reply was not valid JSON ({exc}). "
                    "Return ONLY the JSON object — no prose, no code fences."
                ),
            })
            continue

        last_parsed = parsed
        try:
            validated = ExtractedCaseData.model_validate(parsed).model_dump()
            return validated, usage_total
        except ValidationError as exc:
            last_error = exc.json()
            if attempt >= max_retries:
                break
            messages.append({"role": "assistant", "content": json.dumps(parsed)})
            messages.append({
                "role": "user",
                "content": (
                    "Your reply did not match the required schema:\n"
                    f"{last_error}\n\n"
                    "Re-emit the JSON, fixing only the invalid fields. "
                    "Use the closed-vocabulary values listed in the system prompt verbatim "
                    "(e.g. 'Positive' not 'positive', 'Pv' not 'P. vivax')."
                ),
            })

    fallback = {f: (last_parsed or {}).get(f, "N/A") for f in FIELDS}
    fallback["_validation_error"] = last_error or "unknown"
    return fallback, usage_total

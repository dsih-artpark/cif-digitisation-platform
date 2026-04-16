# CIF OCR and LLM Model Evaluation Plan

This note lays out a practical cost and compute comparison for the current pipeline:

1. Sarvam OCR / document intelligence for text extraction.
2. PII masking or hashing on the extracted text.
3. LLM-based structuring of the masked OCR output.

## Assumptions

- Annual document volume: 7,000 to 7,500 documents.
- Sarvam OCR pricing is treated as per page.
- For budgeting, I use 1 page per document unless noted otherwise.
- LLM cost estimates assume about 2,000 input tokens and 250 output tokens per document after OCR and masking.
- Latency numbers are practical estimates for a single-document sequential worker, not vendor SLAs.
- Local GPU cost estimates use a placeholder rented-GPU equivalent of USD 0.60 per hour. If you own the hardware, replace this with your actual infra or electricity cost.

> Note: Sarvam has two official pages with different pricing signals. The API docs say Document Intelligence is currently free at Rs 0/page, while the Sarvam pricing page lists Sarvam Vision at Rs 1.50/page. I show both so you can budget with a lower bound and a conservative upper bound.

## 1) Sarvam OCR / Document Intelligence

| Service | Role in pipeline | Model / API | Pricing basis | Est. latency / page | Cost per doc | Annual cost for 7,000 docs | Annual cost for 7,500 docs | Notes |
|---|---|---|---|---:|---:|---:|---:|---|
| Sarvam Document Intelligence | OCR extraction from scanned CIF documents | Sarvam Vision (3B VLM) | Rs 0/page in API docs, Rs 1.50/page in Sarvam pricing page | ~2-6 s | Rs 0 to Rs 1.50 | Rs 0 to Rs 10,500 | Rs 0 to Rs 11,250 | Use the conservative price until you confirm the final plan with Sarvam |

### Sarvam references

- Sarvam Vision is a 3B parameter multimodal model used for document intelligence.
- It supports structured extraction and document parsing across 23 languages.
- It is exposed as an API, so no GPU is needed on your side unless you self-host a different OCR stack.

## 2) LLM structuring models after masking

| Model | Deployment | Official pricing basis | Est. latency / doc | Cost per doc | Annual cost for 7,000 docs | Annual cost for 7,500 docs | Strengths | Limitations |
|---|---|---|---:|---:|---:|---:|---|---|
| Gemini 2.5 Flash-Lite | API | USD 0.10 input / USD 0.40 output per 1M tokens | ~2.5 s | USD 0.00030 | USD 2.10 | USD 2.25 | Very low cost, fast, good for high-volume structured extraction | Less capable than premium models on tricky edge cases |
| GPT-4o mini | API | USD 0.15 input / USD 0.60 output per 1M tokens | ~3 s | USD 0.00045 | USD 3.15 | USD 3.38 | Cheap, fast, good schema following | Can be less robust than larger models on ambiguous cases |
| Gemini 2.5 Flash | API | USD 0.30 input / USD 2.50 output per 1M tokens | ~3.5 s | USD 0.00123 | USD 8.58 | USD 9.19 | Good balance of cost and quality | Slightly pricier than Flash-Lite |
| GPT-4.1 mini | API | USD 0.40 input / USD 1.60 output per 1M tokens | ~4 s | USD 0.00120 | USD 8.40 | USD 9.00 | Strong instruction following and structured outputs | More expensive than small models |
| Claude Haiku 3.5 | API | USD 0.80 input / USD 4.00 output per 1M tokens | ~3 s | USD 0.00260 | USD 18.20 | USD 19.50 | Good structured output quality | Higher cost than Gemini Flash-Lite or GPT-4o mini |
| GPT-4.1 | API | USD 2.00 input / USD 8.00 output per 1M tokens | ~5 s | USD 0.00600 | USD 42.00 | USD 45.00 | Higher quality and stronger reasoning | Cost is significantly higher |
| Claude Sonnet 4 | API | USD 3.00 input / USD 15.00 output per 1M tokens | ~6 s | USD 0.00975 | USD 68.25 | USD 73.13 | Excellent quality and strong reasoning | Highest cost in this set |

## 3) Sarvam models beyond Vision

These Sarvam models are useful if you want to keep more of the workflow inside the Sarvam stack instead of using OpenAI, Anthropic, or Google for the post-OCR step.

| Sarvam model | Category | Role in your pipeline | Access / pricing signal | Local GPU need | Best use | Notes |
|---|---|---|---|---|---|---|
| Sarvam 30B | Chat LLM | Post-OCR structuring, cleanup, and validation | Free per token on Sarvam pricing page | Docs say inference on H100, L40S, Apple Silicon | Balanced quality and speed | Good Sarvam-native model for masked OCR text |
| Sarvam 105B | Chat LLM | Higher-quality post-OCR reasoning and error correction | Free per token on Sarvam pricing page | Server-centric; docs recommend H100 | Best Sarvam-native reasoning option | Heavier than 30B, better for hard edge cases |
| Sarvam Translate | Translation | Translate mixed-language OCR output before structuring | API-supported translation model | No GPU needed if using API | Normalizing multilingual OCR text | Useful if OCR returns mixed language content |
| Mayura | Translation | Alternative translation path with style control | Rs 20 per 10K characters | API model | Formal translation and script handling | Supports 11 Indian languages in docs |
| Saaras V3 | Speech-to-text | Not part of OCR path, but useful for future audio capture | Rs 30/hour of audio | API model | Voice notes and audio field capture | Not needed for CIF docs today |
| Bulbul V3 | Text-to-speech | Not part of OCR path, but useful for audio output | Rs 30 per 10K characters | API model | Voice feedback or accessibility | Not needed for CIF docs today |

## 4) Local Qwen options

These are useful if you want offline processing or want to avoid API calls after OCR masking.

| Model | Parameters | Context | Suggested quantization | Estimated GPU needed | Est. latency / doc | Compute cost / doc | Annual compute cost for 7,000 docs | Annual compute cost for 7,500 docs | Notes |
|---|---:|---:|---|---|---:|---:|---:|---:|---|
| Qwen2.5-7B-Instruct | 7B | Up to 128K | 4-bit recommended | 1 x 8 GB GPU minimum, 16 GB if running less aggressively quantized | ~15 s | USD 0.00250 | USD 17.50 | USD 18.75 | Good starting point for local deployment |
| Qwen2.5-14B-Instruct | 14B | Up to 128K | 4-bit recommended | 1 x 12-16 GB GPU minimum, 32 GB for safer headroom | ~22 s | USD 0.00367 | USD 25.67 | USD 27.50 | Better quality, needs more memory |
| Qwen2.5-32B-Instruct | 32B | Up to 128K | 4-bit recommended | 1 x 24 GB GPU minimum, or multi-GPU for easier serving | ~30 s | USD 0.00500 | USD 35.00 | USD 37.50 | Stronger quality, heavier hardware requirement |

### Qwen notes

- Qwen2.5 open models come in 7B, 14B, 32B, and 72B sizes.
- The Qwen2.5 family supports up to 128K context.
- The GPU values above are practical inference estimates, not official vendor requirements.
- If you use your own server instead of rented GPU time, replace the compute cost with your actual hourly infra cost.

## 5) Annual planning summary

| Pipeline option | OCR cost | LLM cost | Infra needs | Best fit |
|---|---|---|---|---|
| Sarvam Vision + Gemini 2.5 Flash-Lite | Rs 0 to Rs 11,250 per year | USD 2.10 to USD 2.25 per year | API only | Lowest cost API pipeline |
| Sarvam Vision + GPT-4o mini | Rs 0 to Rs 11,250 per year | USD 3.15 to USD 3.38 per year | API only | Very cost-effective and simple |
| Sarvam Vision + GPT-4.1 mini | Rs 0 to Rs 11,250 per year | USD 8.40 to USD 9.00 per year | API only | Good balance of quality and cost |
| Sarvam Vision + Claude Haiku 3.5 | Rs 0 to Rs 11,250 per year | USD 18.20 to USD 19.50 per year | API only | Higher quality than the cheapest options |
| Sarvam Vision + Sarvam 30B | Rs 0 to Rs 11,250 per year | Sarvam pricing page says free per token | API or local/open-source runtime | Good Sarvam-only balance |
| Sarvam Vision + Sarvam 105B | Rs 0 to Rs 11,250 per year | Sarvam pricing page says free per token | API or server-centric H100 runtime | Highest quality Sarvam-only option |
| Sarvam Vision + Qwen2.5-7B local | Rs 0 to Rs 11,250 per year | USD 17.50 to USD 18.75 per year equivalent | 1 x 8 GB GPU minimum | Best if you want offline/local control |

## 6) Practical recommendation

If the goal is a first production-ready evaluation for 7,000 to 7,500 documents per year:

1. Use Sarvam Vision for OCR.
2. Compare Gemini 2.5 Flash-Lite, GPT-4o mini, and GPT-4.1 mini for the post-OCR structuring step.
3. Add Qwen2.5-7B-Instruct as the local/offline baseline.
4. Keep Claude Haiku 3.5 and Claude Sonnet 4 as quality benchmarks.
5. Measure actual latency and field-level accuracy on a fixed test set because token usage and OCR noise will change the real cost.

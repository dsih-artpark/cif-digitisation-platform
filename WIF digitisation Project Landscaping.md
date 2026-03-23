# Technology Landscaping for WIF Digitisation Project

## 1. Introduction

### What is WIF?
WIF (Wellness Investigation Framework) is the initiative to digitise and analyse Case Investigation Files (CIF) into structured, searchable, and quality-controlled medical records.

WIF/CIF documents may contain:
- Handwritten notes
- Hindi or mixed-language medical entries
- OCR-generated semi-structured text
- Clinically critical information such as diagnosis, dosage, and patient age

Because these files are medically sensitive, extraction errors in clinically critical fields can directly affect downstream quality and safety.

## 2. Project Objectives 

This landscaping study will provide a decision-ready recommendation for the WIF digitisation stack.

Objectives:
- Compare candidate models and platforms for extraction quality, speed, and cost.
- Measure token usage and latency using a common benchmark dataset.
- Evaluate robustness under repeated runs and small architecture/prompt changes.
- Run concordance testing (model-to-model and human-to-model).
- Define automated and manual QC layers for production pipeline.
- Ensure legal and operational readiness, including DPDP Act 2023 compliance.

Expected outputs:
- Ranked model/tool options with measurable evidence.
- Cost-per-document projection for API and cloud-hosted options.
- QC and compliance checklist for deployment.

## 3. Evaluation Framework

### 3.1 Robustness Assessment
Since LLMs are probabilistic, test output stability.

Robustness tests:
- Same input and prompt, multiple runs.
- Slight prompt/template changes.
- Slight architecture/version changes.

Metrics:
- Field-level agreement across runs.
- Variance in critical fields (dosage, age, diagnosis).
- Instability/failure rate per 100 documents.

### 3.2 Concordance Tests
Run agreement tests across systems and annotators.

Required comparisons:
- Model A vs Model B.
- Model vs human gold annotations.

Example metrics:
- Exact-match rate (key fields).
- Precision, Recall, F1.
- Cohen's Kappa (when applicable).

## 4. Measurement Design

### 4.1 Measurement of Tokens
For each request, track:
- Input tokens
- Output tokens
- Total tokens per document
- Average and p95 tokens by document type

Cost formula:
- `Cost per Document = (Input Tokens x Input Rate) + (Output Tokens x Output Rate)`

### 4.2 Measurement of Latency
Track both model and pipeline latency:
- Model inference latency
- End-to-end latency (upload to final structured output)
- p50 and p95 latency by document length bucket

Controls for fair comparison:
- Same dataset
- Same region/network conditions
- Same concurrency setup

## 5. Cost Assessment

### 5.1 API Cost Assessment (Including OpenRouter)
Compare direct APIs and routed APIs.

Channels to compare:
- Claude direct API
- Sarvam direct API
- DeepSeek direct API
- OpenRouter (for supported models)

Outputs required:
- Cost per 1,000 documents
- Input vs output token cost split
- Cost sensitivity to prompt length and output size

### 5.1.1 Approx API Pricing Snapshot (As of March 3, 2026)
Approximate pricing references for representative models:

| Provider | Representative Model | Approx Input Price | Approx Output Price | Notes |
|---|---|---:|---:|---|
| Anthropic (direct) | Claude Sonnet 4 | $3.00 / 1M tokens | $15.00 / 1M tokens | Strong quality; higher cost than budget models |
| Sarvam (direct) | Sarvam-M (Chat Completion) | INR 0 / token (currently listed free) | INR 0 / token (currently listed free) | Pricing may change from promotional/free tier |
| DeepSeek (direct) | deepseek-chat (cache miss rate) | $0.27 / 1M tokens | $1.10 / 1M tokens | Very low cost for bulk workloads |
| OpenRouter | Routed model pricing | Model price + ~5.5% fee | Model price + ~5.5% fee | Adds routing convenience and provider abstraction |

### 5.1.2 Approx Cost Illustration (Per 1,000 CIF Documents)
Assumption for illustration only:
- Average per document = 10,000 input tokens + 2,000 output tokens.

Estimated API cost:
- Claude Sonnet 4 (direct): about `$60` per 1,000 docs.
- DeepSeek Chat (direct, cache miss): about `$4.90` per 1,000 docs.
- OpenRouter routing Claude Sonnet 4: about `$63.30` per 1,000 docs (assuming 5.5% platform fee).
- Sarvam-M: near-zero during current free listing; treat as variable for planning.

Important note:
- These are approximate and exclude OCR engine charges, storage, networking, and manual QC costs.

### 5.2 Cloud Cost Assessment (AWS)
For self-hosted/open-weight setups, include cloud compute and operations cost.

Example AWS instance types to evaluate:
- CPU baseline: `c7i.xlarge`
- GPU inference baseline: `g5.xlarge`
- Higher throughput GPU: `g6e.xlarge`

Cloud cost components:
- Compute hours
- Storage (encrypted documents and outputs)
- Data transfer
- Monitoring/logging
- Backup and recovery

## 6. Tools Compared

### 6.1 Primary LLM/API Options
- Claude API
- Sarvam API
- DeepSeek API
- OpenRouter as routing/abstraction layer

### 6.2 Other Available Proprietary Tools
Add enterprise baseline options:
- AWS Textract + Comprehend Medical
- Google Cloud Document AI
- Azure AI Document Intelligence (+ Azure OpenAI if needed)

Comparison dimensions:
- Handwritten and mixed-language extraction quality
- Structured field extraction quality
- Compliance/security controls
- Integration effort and vendor lock-in
- Total cost of ownership

## 7. Digitisation Pipeline QC Layers

### 7.1 Automated QC Layer
- Schema validation for mandatory fields
- Range/format checks for clinical fields
- Cross-field consistency checks
- Confidence-threshold based routing

### 7.2 Manual QC Layer
- Human review for high-risk or low-confidence outputs
- Critical field verification queue
- Random sampling audits
- Escalation workflow for ambiguous cases
- Reviewer feedback loop for prompt/rule improvement

## 8. Compliance: DPDP Act 2023

WIF digitisation must align with DPDP Act 2023.

Required controls:
- Purpose limitation and consent-aligned processing
- Data minimisation
- Role-based access control (least privilege)
- Encryption at rest and in transit
- Retention and deletion policy with audit trails
- Incident response and breach reporting process
- Vendor/processor contractual controls

## 9. Final Recommendation Criteria

The final stack selection should be based on all of the following:
- Quality performance
- Robustness and consistency
- Concordance with human annotations
- Token efficiency and latency
- API + cloud cost viability
- Compliance readiness (DPDP 2023)
- QC operability at scale

### 9.1 Suggested Fit for This Project
Recommended approach: **hybrid stack**.

Suggested setup:
- Primary extraction and critical-field reasoning: **Claude Sonnet 4**.
- Cost-efficient bulk preprocessing and low-risk text tasks: **DeepSeek Chat**.
- Indic/Hindi-heavy workloads and regional language handling: **Sarvam** (especially while low-cost/free tier is available).
- Use **OpenRouter** only if multi-provider routing/fallback is operationally needed.

Why this is suitable:
- WIF has medically critical fields where quality and stability matter more than lowest price alone.
- Hybrid routing allows quality on high-risk documents and lower cost on low-risk documents.
- This balances clinical risk, throughput, and budget.

## 10. Current Application Scope (Implemented)

The current application is a role-based web platform with:
- React frontend for upload, processing, review, dashboard, and reports screens.
- FastAPI backend for asynchronous document digitisation jobs.
- Gatekeeper-based sign-in and role mapping.
- OpenRouter integration for multimodal extraction using `anthropic/claude-sonnet-4.6`.

## 11. Current End-to-End Application Flow (Implemented)

1. Access and authentication:
- User lands on the role-based login screen.
- Sign In and Sign Up redirect to Gatekeeper.
- On successful auth, the app maps Gatekeeper role to app role and allows only permitted routes.

2. Upload flow:
- User uploads a CIF document from the Upload page.
- Uploaded file preview is shown for images and PDFs.
- Upload metadata is stored in session history for dashboard/report visibility.

3. Processing flow:
- Clicking `Start Processing` creates a backend job (`POST /api/digitize`).
- Frontend polls job status (`GET /api/digitize/{jobId}`) and shows progress, ETA, and live logs.
- Backend processing stages run in sequence:
`Document Received -> Image Pre-processing -> Text Detection -> Field Extraction -> Structured Record Generation`.

4. Extraction and normalization:
- Backend validates data URL and MIME type.
- Supported extraction formats are `image/jpeg`, `image/jpg`, `image/png`, and `image/webp`.
- Model output is parsed into structured CIF fields.
- If extracted values include multilingual text, backend translates values to English.
- Backend normalizes fields and assigns:
`fieldStatus` (`Verified` or `Review Required`) and `recordStatus`.

5. Case review flow:
- On job completion, user is redirected to Case Review.
- User can compare original document and extracted fields.
- User can edit extracted values in the case table.
- `Mark Verified` updates all fields to `Verified`.
- `Save Record` shows success message and redirects to dashboard.

6. Dashboard and reports visibility:
- Dashboard shows analytics widgets and charts (mock analytics dataset).
- Recent uploaded documents are shown from session-stored upload history.
- Reports page shows uploaded document list and supports clearing the list.

## 12. Current User Roles and Access (Implemented)

### 12.1 Front Line Worker
- Allowed routes: `/upload`, `/processing`, `/case-review`
- Typical usage: upload CIF, trigger processing, review and edit extracted fields.

### 12.2 Medical Officer
- Allowed route: `/dashboard`
- Typical usage: view dashboard metrics and regional charts.

### 12.3 Admin (User Analytics)
- Allowed routes: `/dashboard`, `/upload`, `/processing`, `/case-review`, `/reports`
- Typical usage: end-to-end operational access plus reports and validation visibility.

## 13. Current Quality Check and Validation Behavior (Implemented)

### 13.1 Backend validation and standardization
- Missing/unclear values are normalized to `N/A`.
- Date values are normalized to `DD-MM-YYYY` where possible.
- Age, sex, medicine list, and text sanitization rules are applied before response.

### 13.2 Frontend review validation
- Case Review supports manual field edits and verification marking.
- Validation Rules panel is visible for Admin (User Analytics role).
- Rules currently check completeness, age range, date validity, sex format, medicine quality hints, and verification readiness.

## 14. Current Data and Job Handling (Implemented)

- Digitisation jobs are stored in backend memory during runtime.
- Completed/failed jobs are auto-cleaned after one hour.
- Upload history is stored in browser `sessionStorage`.
- Case save in current UI updates session state and navigation flow; no persistent case database write is implemented in this version.

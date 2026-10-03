# Security Policy & Safeguards

- **Prompt Injection Defense**: Instagram captions and OCR text are treated strictly as untrusted input data strings.
- **No Hallucinations**: Missing fields default strictly to `"Not specified"`.
- **Secret Protection**: Bot tokens and API keys are isolated to `.env` files and never committed to source control or logged in console traces.
- **Admin Override Protection**: `AGENT_START_TIME` reset requires explicit confirmation parameters.

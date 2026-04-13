---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Internet Outage Minimum Fix
**Task:** Make Stage 4 network failures visible to the LLM circuit breaker so queued jobs are protected during internet outages.
**Files touched:** `error-classification.ts` (network error patterns), `verdict-generation-stage.ts` (provider failure recording), `error-classification.test.ts` (8 new tests).
**Key decisions:**
- `ECONNRESET`/`ETIMEDOUT` remain under `timeout` (transient, not connectivity) — only DNS/TCP/fetch failures count as provider outage.
- Recording placed inside `createProductionLLMCall` catch blocks (both primary and TPM-retry paths), not at runner level — because Stage 4 errors are swallowed by fallback verdicts and never reach the runner's `classifyError()`.
- No double-counting: Stage 4 catch and runner catch are mutually exclusive paths.
**Open items:**
- Connectivity probe (Option A.3) — fast-fail before Stage 4. Follow-on, not blocking.
- Stage 2 LLM failures are not recorded to the breaker (handled inline, pipeline continues).
**For next agent:** The fix is narrow and reviewable. 1419 tests pass, build clean. Plan doc updated at `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md`.

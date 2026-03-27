# Internet Outage Resilience — Investigation & Plan

**Date:** 2026-03-27
**Role:** Senior Developer (investigation), Lead Architect (review pending)
**Status:** REVIEW-READY
**Triggered by:** Two internet outages (1-2 hours each) on 2026-03-27 that caused all running/queued analysis jobs to fail with `analysis_generation_failed`

---

## 1. Executive Summary

During internet outages, the analyzer pipeline fails silently and destructively. The circuit breaker — designed to auto-pause the system on sustained provider failures — is blind to network-level errors. Jobs churn through the full pipeline up to Stage 4, fail on every LLM call, produce useless UNVERIFIED 50/0 fallback verdicts, and the system immediately picks up the next queued job to repeat the same failure.

Three options are proposed, ordered by implementation cost and value:

| Option | Fix | Complexity | Status |
|--------|-----|-----------|--------|
| **A** | Error classification fix + connectivity probe | Small | Recommended first |
| **B** | Pipeline hold/resume on sustained failure | Medium | Recommended second |
| **C** | Job checkpointing and resume | Large | Long-term |

The single highest-impact change is ~20 lines in `error-classification.ts`.

---

## 2. Root Cause Analysis

### 2.1 The circuit breaker doesn't see network errors

The system has a circuit breaker in `provider-health.ts` / `search-circuit-breaker.ts` that auto-pauses after 3 consecutive provider failures. But `error-classification.ts` classifies network-level errors (`ENOTFOUND`, `ECONNREFUSED`, `fetch failed`, `getaddrinfo`) as `unknown` with `shouldCountAsProviderFailure: false`.

**Result:** During an internet outage, the circuit breaker never trips. The system keeps launching jobs.

### 2.2 AI SDK retry doesn't cover network errors

The Vercel AI SDK retries only `APICallError` with retryable HTTP status codes (429, 503, 529). Network-level failures (DNS resolution, TCP connection refused, `ETIMEDOUT`) throw raw `fetch` errors that bypass retry entirely.

**Result:** Each LLM call fails immediately with zero retries for network outages, but the pipeline has no mechanism to detect the pattern and pause.

### 2.3 Stage 4 failure path produces silent degradation

When `generateVerdicts()` throws in `claimboundary-pipeline.ts` (lines 606-635), the catch block:
1. Pushes an `analysis_generation_failed` warning
2. Creates fallback UNVERIFIED 50/0 verdicts for all claims
3. Continues to Stage 5 aggregation with these fallback verdicts
4. The job finishes as `SUCCEEDED` (not `FAILED`) with useless results

**Result:** Jobs during an outage appear to succeed but contain zero analytical value.

### 2.4 No pre-flight connectivity check

There is no probe before starting expensive multi-call Stage 4 debate sequences (5+ LLM calls per claim). The pipeline discovers the outage by failing each call individually.

---

## 3. Current Retry Inventory

| Layer | What | Retries for network errors | Retries for HTTP 429/503 |
|-------|------|---------------------------|--------------------------|
| AI SDK `generateText` | Built-in retry | **0** (not `APICallError`) | 2 (with backoff) |
| Verdict Stage inner loops | Self-consistency, validation | 1 attempt | 1 attempt |
| Verdict Stage Steps 1/3/4 | Advocate, challenger, reconciler | **0** | **0** |
| TPM fallback | OpenAI-specific | **0** (not TPM error) | N/A |
| Pipeline orchestrator | `runClaimBoundaryAnalysis` | **0** (catch → fallback) | **0** |
| Runner queue | `drainRunnerQueue` | Checks circuit breaker | Checks circuit breaker |

---

## 4. Option A: Error Classification Fix + Stage 4 Failure Recording + Connectivity Probe

### 4.1 Critical fix: make network errors count — IMPLEMENTED

**File:** `apps/web/src/lib/error-classification.ts`

Added `NETWORK_CONNECTIVITY_PATTERNS` for DNS/TCP/fetch failures, checked before `TIMEOUT_PATTERNS`:
- `ENOTFOUND` — DNS resolution failed
- `ECONNREFUSED` — connection refused
- `getaddrinfo` — DNS lookup failed
- `fetch failed` — generic fetch failure
- `NetworkError` / `network error` — browser-style network error
- `ERR_NETWORK` — Axios/Node network error

These classify as `{ category: "provider_outage", provider: "llm", shouldCountAsProviderFailure: true }`.

`ECONNRESET` and `ETIMEDOUT` remain under `timeout` — these are transient (can occur with working internet) and should not trip the circuit breaker.

**Corrected diagnosis:** The classification fix alone is necessary but NOT sufficient. Stage 4 errors are caught inside `claimboundary-pipeline.ts` and converted to fallback verdicts — the pipeline "succeeds" and the runner-level `classifyError()` → `recordProviderFailure()` → `pauseSystem()` path never runs. So we also need Part 4.2.

### 4.2 Stage 4 provider-failure recording — IMPLEMENTED

**File:** `apps/web/src/lib/analyzer/verdict-generation-stage.ts`

Added `maybeRecordProviderFailure()` inside `createProductionLLMCall()`. On each Stage 4 LLM call failure:
1. `classifyError(error)` determines if it's a provider-counting failure
2. If so, `recordProviderFailure("llm", msg)` increments the circuit breaker counter
3. If the circuit opens (3 consecutive failures), `pauseSystem(...)` pauses the system

This is called in both catch paths (primary failure + TPM retry failure). The runner-level recording only fires for errors that escape the pipeline entirely — Stage 4 errors are swallowed by the fallback, so this is the only path that can trip the breaker for verdict-generation failures.

No double-counting risk: the two paths are mutually exclusive (Stage 4 catch vs. runner catch).

### 4.3 Connectivity probe (follow-on, not yet implemented)

**New file:** `apps/web/src/lib/connectivity-probe.ts`

A lightweight checker that:
- Sends a HEAD request to the target LLM provider endpoint with a 5-second timeout
- Returns `{ reachable: boolean; latencyMs: number; error?: string }`
- Caches result for ~30 seconds to avoid hammering during retry loops
- Does NOT make authenticated API calls (just TCP/TLS connectivity)

**Integration points:**
- `claimboundary-pipeline.ts` — probe before Stage 4 starts; skip with clear `connectivity_unavailable` warning if unreachable
- `verdict-generation-stage.ts` — optional probe inside `createProductionLLMCall()` for fast-fail

### 4.3 What it fixes

- System auto-pauses during outages (protects queued jobs)
- Stage 4 fails fast (~5s) instead of burning through all retry attempts (~minutes)
- Clear error classification in job warnings

### 4.4 What it does NOT fix

- Jobs already mid-pipeline when outage starts still fail
- No resume capability — job fails, just faster
- Stage 2 research calls not covered unless probe added there too

### 4.5 Files affected

| File | Change |
|------|--------|
| `apps/web/src/lib/error-classification.ts` | Add network error patterns (~20 lines) |
| `apps/web/src/lib/connectivity-probe.ts` | New module |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Pre-Stage-4 probe check |
| `apps/web/src/lib/analyzer/verdict-generation-stage.ts` | Optional fast-fail probe |

**Complexity:** Small.

---

## 5. Option B: Pipeline Hold/Resume on Sustained Failure

### 5.1 Concept

After N consecutive LLM call failures within a single pipeline run, enter a "holding" state:
- Probe connectivity every 30 seconds
- If connectivity returns within a configurable window (e.g., 10 minutes), reset failure count and continue
- If window expires, abort the pipeline
- Emit progress events: "Waiting for connectivity..."

### 5.2 Changes needed

| File | Change |
|------|--------|
| `apps/web/src/lib/analyzer/pipeline-circuit-breaker.ts` | New module — pipeline-scoped hold/resume logic |
| `apps/web/src/lib/analyzer/verdict-generation-stage.ts` | Wrap `callModelWithGuard` with pipeline circuit breaker |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Create breaker instance, pass to stages |
| `apps/web/src/lib/internal-runner-queue.ts` | Extend stale-job threshold to accommodate hold times |
| `apps/web/src/lib/analyzer/research-extraction-stage.ts` | Wrap Stage 2 LLM calls |

### 5.3 What it fixes

- Jobs survive short outages (< hold timeout) by waiting and retrying
- No wasted LLM calls after threshold
- Clear visibility in job log

### 5.4 What it does NOT fix

- Long outages (> hold timeout) still fail the job
- No saved state — process restart loses everything
- Only helps the currently running job, not queued ones (those are protected by Option A's circuit breaker fix)

**Complexity:** Medium. Depends on Option A's connectivity probe.

---

## 6. Option C: Job Checkpointing and Resume

### 6.1 Concept

Persist intermediate pipeline state after each major stage. Failed or interrupted jobs can resume from the last checkpoint.

### 6.2 Changes needed

| File | Change |
|------|--------|
| `apps/web/src/lib/analyzer/checkpoint.ts` | New module — serialize/deserialize pipeline state |
| `apps/api/Controllers/JobsController.cs` | New endpoint for checkpoint storage |
| `apps/api/Data/` | Schema change — checkpoint column or table |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Save checkpoint after each stage; check for existing checkpoint at start |
| `apps/web/src/lib/internal-runner-queue.ts` | Support "resume from checkpoint" on retry |
| `apps/web/src/lib/analyzer/research-orchestrator.ts` | Serialize research state |

### 6.3 What it fixes

- Jobs resume from last completed stage after any failure (outage, crash, restart)
- Saves LLM cost for long analyses that fail late
- Handles process restarts

### 6.4 What it does NOT fix

- Does not prevent the initial failure (still needs A/B)
- Stage 4 is a monolithic 5-step debate — mid-debate checkpoint is impractical
- Adds storage requirements and idempotency concerns

**Complexity:** Large. Highest value but highest cost.

---

## 7. Recommended Sequence

1. **Option A.1+A.2+A.3+A.4+A.5 done** — Stage 4 now has both failure recording and a preflight reachability check. Clear network outages abort the current job before debate starts, and repeated clear network failures still feed the LLM circuit breaker.
2. **Option B** — pipeline hold/resume for short outages. Medium.
3. **Option C** — job checkpointing. Long-term.

### What is now protected

After A.1+A.2+A.3+A.4+A.5:

- If the configured primary LLM provider is clearly unreachable before Stage 4 starts, the preflight probe aborts the job immediately instead of producing fallback UNVERIFIED verdicts.
- Clear network preflight failures (for example ENOTFOUND / ECONNREFUSED / fetch-layer failures) are recorded against the LLM provider health state, so repeated failures can still open the circuit and pause the system.
- If 3 consecutive Stage 4 LLM calls or clear network preflight checks fail, the LLM circuit breaker opens and `pauseSystem()` fires. Queued jobs stop being dequeued.
- If the system is already paused when the Stage 4 catch block runs, the job aborts cleanly instead of producing fallback verdicts (A.4).
- The watchdog probes Anthropic periodically and auto-resumes when connectivity returns (A.5) — but only for network-caused pauses, not for auth/rate-limit pauses.

### What remains unprotected

- Stage 2 LLM failures are not recorded to the breaker (Stage 2 errors are handled inline and the pipeline continues).
- Preflight timeouts still fail the current job fast, but they do **not** currently count toward opening the LLM circuit because timeout classification stays separate from clear network-connectivity failures.

---

## 8. Implementation Status

- [x] Option A.1 — classification fix (implemented)
- [x] Option A.2 — Stage 4 failure recording (implemented)
- [x] Option A.3 — pre-call connectivity probe for fast-fail (implemented)
- [x] Option A.4 — abort current job when system paused (no damaged fallback results)
- [x] Option A.5 — auto-resume probe in watchdog (HEAD to Anthropic API, resume if reachable)
- [ ] Option B — pipeline hold/resume
- [ ] Option C — job checkpointing

### A.3: Pre-Stage-4 connectivity probe

Immediately before verdict generation, `claimboundary-pipeline.ts` now probes the configured primary LLM provider endpoint with a lightweight HEAD request. Any HTTP response counts as reachable. If the probe fails at the transport layer, the job aborts before the Stage 4 debate starts.

For clear network-connectivity failures that classify as LLM provider outages, the preflight also records the failure against provider health so repeated failures still open the existing LLM circuit breaker and pause the system. This closes the original "first outage-hit job can still produce fallback verdicts" gap for clear network outages.

### A.4: Abort job on system pause

When Stage 4 fails and `isSystemPaused()` is true, the catch block in `claimboundary-pipeline.ts` re-throws instead of producing fallback UNVERIFIED 50/0 verdicts. The job fails cleanly rather than "succeeding" with useless results.

### A.5: Auto-resume probe (network-only)

When `drainRunnerQueue` finds the system paused with queued jobs, it checks `isPausedDueToNetwork()` — only pauses whose reason or last LLM failure message matches network-connectivity patterns (ENOTFOUND, ECONNREFUSED, getaddrinfo, fetch failed, NetworkError) are eligible for auto-resume. Auth failures, rate limits, and provider-side outages are NOT auto-cleared.

If eligible, a HEAD request to `https://api.anthropic.com/v1/messages` with a 5-second timeout is sent. Any HTTP response means connectivity is back — `resumeSystem()` is called and the drain proceeds. If the probe fails (DNS, timeout, refused), the system stays paused and the drain exits.

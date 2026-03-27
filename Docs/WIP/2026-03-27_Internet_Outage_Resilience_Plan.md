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

## 4. Option A: Error Classification Fix + Connectivity Probe

### 4.1 Critical fix: make network errors count

**File:** `apps/web/src/lib/error-classification.ts`

Add patterns for network-level failures to classify them with `shouldCountAsProviderFailure: true`:
- `ENOTFOUND` — DNS resolution failed
- `ECONNREFUSED` — connection refused
- `ECONNRESET` — connection reset (already partially handled as `timeout`)
- `getaddrinfo` — DNS lookup failed
- `fetch failed` — generic fetch failure
- `network` / `NetworkError` — browser-style network error

This is the single highest-impact change. With this fix alone, the existing circuit breaker auto-pauses after 3 consecutive network failures, protecting all queued jobs.

**Estimated size:** ~20 lines.

### 4.2 Connectivity probe

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

1. **Option A first** — the error classification fix is the single most impactful change and can be done in an hour. The probe is a small follow-on.
2. **Option B second** — once the probe exists, adding hold/resume is a natural extension.
3. **Option C third** — long-term investment, best done as part of a broader reliability initiative.

### Critical path

The ~20-line fix in `error-classification.ts` is the minimum viable improvement. Without it, Options B and C cannot protect queued jobs because the circuit breaker remains blind to network outages.

---

## 8. Decision Requested

- [ ] Approve Option A for implementation (small, high-impact)
- [ ] Approve Option B as follow-on (medium, nice-to-have)
- [ ] Park Option C for future planning
- [ ] Or: different prioritization

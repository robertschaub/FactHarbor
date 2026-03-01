# Runtime Issues & Architectural Weaknesses Analysis

**Date:** 2026-02-17
**Status:** DRAFT — Awaiting Codex findings + Lead Architect review
**Authors:** Claude Opus (initial analysis), Codex (pending), Lead Architect (pending)
**Scope:** Runtime infrastructure, queue/runner system, pipeline performance, provider resilience

---

## 1. Executive Summary

Following the ClaimBoundary pipeline v1.0 deployment, live production testing revealed several runtime issues. Emergency fixes addressed the most critical problems (queue deadlocks, performance collapse, stale job recovery), but structural weaknesses remain. This document catalogs all known issues and design gaps to serve as input for architectural planning.

**Current threat model (ordered by impact):**
1. **Provider saturation** — LLM overload errors (`AI_RetryError: Overloaded`) are now the dominant failure mode
2. **In-memory queue fragility** — Queue state lives in process memory; not durable across restarts
3. **No observability** — Metrics infrastructure built but not integrated; zero runtime telemetry
4. **No backpressure** — System submits LLM calls without regard for provider capacity
5. **Cost opacity** — No per-job or per-stage cost tracking

---

## 2. Queue & Runner Architecture

**File:** `apps/web/src/lib/internal-runner-queue.ts`

### 2.1 In-Memory Queue (Structural Weakness)

The job queue uses `globalThis` persistence — a JavaScript object in process memory. This is inherently fragile:

| Property | Current | Risk |
|----------|---------|------|
| Durability | Process memory only | Queue lost on crash/restart |
| Rehydration | DB scan on drain (line 435-450) | Requires drain trigger; 5s bootstrap delay |
| Concurrency tracking | `runningJobIds: Set<string>` in memory | Cannot track jobs across process restarts |
| Running count | Reconstructed from DB scan per drain | Expensive; N+1 API calls per queued job |

**Failure mode:** Process crash (OOM, unhandled rejection) loses queue order and in-flight job tracking. Rehydration recovers QUEUED jobs from DB but cannot recover correct ordering or priority.

**Mitigation in place:** Bootstrap drain on module load (line 525-526), watchdog timer (30s interval), stale job recovery (15-min threshold).

**Remaining gap:** No durable queue. A DB-backed queue (or a lightweight job table with status+priority columns) would eliminate this entire class of problems.

### 2.2 Stale Job Recovery (Functional but Fragile)

**Lines 358-433.** Recovery relies on comparing `updatedUtc` timestamps from the API against a 15-minute threshold.

**Known issues:**
- **Timezone parsing fragility:** `parseApiUtcTimestampMs()` (line 110-116) normalizes missing timezone suffix by appending `Z`. If the API ever changes its timestamp format, recovery breaks silently.
- **Old runner processes:** Jobs from a pre-restart process that are still actively updating their progress (e.g., cd083b28 at iteration 7/18) are not stale and block slots indefinitely. The system has no mechanism to force-stop a job running in another process.
- **15-minute window:** Between restart and stale recovery triggering, zombie RUNNING jobs block all slots. Dynamic jobs cannot start during this window even with queue partitioning.

### 2.3 Queue Partitioning (Implemented — Needs Tuning)

**Lines 476-511.** Variant-aware scheduling caps ClaimBoundary (slow) jobs at `maxSlowConcurrency` (default: `maxConcurrency - 1`).

**Working correctly for:**
- Steady-state: CB capped, 1 slot reserved for Dynamic
- Fast-lane: Dynamic jobs start immediately when a slot is free
- Re-queuing: Skipped CB jobs returned to front of queue

**Design gaps:**
- **Only controls new starts:** Cannot preempt or stop already-running CB jobs. If 3+ CB jobs are running from before the cap was applied, Dynamic starvation persists until completions.
- **No priority ordering within variant:** All CB jobs are FIFO. No way to prioritize shorter or more important jobs.
- **Idle reserved slot:** If no Dynamic jobs are queued, the reserved slot sits empty while CB jobs wait. No "steal" mechanism to temporarily use the slot for CB when Dynamic queue is empty.

### 2.4 Late Completion Guard (Non-Atomic)

**Lines 238-262.** The `P0 FIX` reads job status before writing SUCCEEDED, to avoid overwriting a FAILED set by stale recovery. However, the check-then-write is **not atomic**: if a job is marked FAILED between the `apiGet` (line 241) and the `apiPutInternal` (line 245), SUCCEEDED will overwrite FAILED. The window is small (milliseconds) but exists.

### 2.5 Drain Synchronization

**Lines 332-518.** The `isDraining`/`drainRequested` pattern prevents overlapping drain executions.

**Working correctly**, but the drain loop makes N API calls per queued job (one `GET /v1/jobs/:id` per job in line 486) to check status and variant. With 10+ queued jobs, this adds seconds of latency per drain cycle.

**Potential improvement:** Batch API endpoint (`GET /v1/jobs?status=QUEUED&fields=jobId,pipelineVariant`) instead of per-job fetches.

---

## 3. Pipeline Performance

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

### 3.1 Stage 2 Research Loop (Fixed — Monitor)

Recent fixes addressed the primary performance collapse:

| Parameter | Before | After | Effect |
|-----------|--------|-------|--------|
| `maxTotalIterations` | 20 | 10 | Cap at 9 main + 1 contradiction |
| `maxAtomicClaims` | 15 | 8 | Sufficiency achievable (24 items vs 45) |
| `contradictionReservedIterations` | 2 | 1 | Fewer wasted iterations |
| Time budget | None | 10 min (`researchTimeBudgetMs`) | Hard ceiling |
| Zero-yield break | None | 2 consecutive (`researchZeroYieldBreakThreshold`) | Stops wasted iterations |
| SR-Eval | Per-iteration (15-25s/domain) | Batch after loop | Saves minutes |
| Source fetching | Sequential (5 × 12s) | Parallel (concurrency 3) | ~3x faster |

**Remaining concerns:**
- Even with these fixes, a single CB job can run 5-10+ minutes. With 3 concurrent CB slots, that's 3 concurrent streams of LLM calls hammering the provider. No throttling between jobs.
- **Time budget checked at loop start only** (line ~915): if an iteration takes 9:50 and the budget is 10:00, the loop enters the iteration. The budget break only fires at the *start* of the next iteration, so individual iterations can overshoot.

### 3.2 LLM Call Volume (Unaddressed)

A single CB analysis makes a large number of LLM calls:

| Stage | Calls | Model |
|-------|-------|-------|
| Stage 1: Extract Claims | 3-5 (two-pass + Gate 1) | Haiku |
| Stage 2: Research (per iteration) | 2-4 (query gen + relevance + extraction) | Haiku |
| Stage 2: Total (8 iterations) | 16-32 | Haiku |
| Stage 2: SR-Eval batch | 4-6 per new domain × 2 models | Haiku + GPT-4o-mini |
| Stage 3: Cluster Boundaries | 1-2 | Sonnet |
| Stage 4: Verdicts (per claim) | 5 steps × 8 claims | Sonnet/Haiku mix |
| Stage 5: Aggregate | 2-3 | Haiku |
| **Total estimate** | **60-120+ calls** | Mixed |

With 3 concurrent CB jobs, this is **180-360+ concurrent LLM API requests** competing for the same Anthropic quota. This directly causes the `AI_RetryError: Overloaded` failures observed in production.

### 3.3 SR Evaluation Outside Time Budget (Timeout Stacking)

SR-Eval runs **after** the research loop (deferred batch), so it is **not covered** by the `researchTimeBudgetMs` ceiling. With 10-20 unique domains at ~15-25s each (concurrency 3), SR-Eval can add 2-8 minutes on top of the 10-minute research budget. Total Stage 2 wallclock can reach 15-18 minutes despite the "10-minute budget."

Additionally, per-domain evaluation has a 90-second timeout. If evaluation times out, the domain silently receives a null score mapped to the default (0.5). **No logging or metric** indicates the timeout occurred — the admin has no way to know SR-Eval failed for specific domains.

### 3.4 No Token Budget Enforcement

`enforceBudgets: false` in pipeline.default.json (line 48). The token budget tracking infrastructure exists (`maxTotalTokens: 750000`, `maxTokensPerCall: 100000`) but is not enforced. A runaway job can consume unlimited tokens.

---

## 4. Provider Resilience

### 4.1 Circuit Breaker (Functional — Too Coarse)

**File:** `apps/web/src/lib/provider-health.ts`

The circuit breaker tracks two providers: `search` and `llm`. After 3 consecutive failures (`DEFAULT_CIRCUIT_BREAKER_THRESHOLD`), it opens the circuit and pauses the entire system.

**Issues:**
- **All-or-nothing pause:** One LLM provider failure pauses ALL jobs, including those that might succeed with different parameters or claims.
- **No automatic recovery:** `OPEN → HALF_OPEN` requires `transitionToHalfOpen()` to be called. There is no timer-based cooldown. The system stays paused until admin intervention.
- **No per-model tracking:** "llm" is a single provider. If Opus is overloaded but Haiku is fine, the circuit breaker cannot distinguish them. All LLM calls are treated equally.
- **Threshold is job-level, not call-level:** The circuit breaker increments on job failure (line 274 in runner queue), not on individual API call failures. The AI SDK's built-in retry may mask repeated failures before the job finally throws.

### 4.2 Error Classification (Solid — Missing Categories)

**File:** `apps/web/src/lib/error-classification.ts`

Handles status codes (429, 503, 529, 401, 403), timeout patterns, and `SearchProviderError`.

**Missing classifications:**
- **502 Bad Gateway** — Temporary proxy/server errors classified as "unknown" instead of retriable provider failure
- **Token limit exceeded** (no pattern for "maximum context length" or "token limit" errors)
- **Content filtering** (no pattern for safety filter rejections)
- **Malformed response** (no pattern for JSON parse failures from LLM — these indicate model issues, not provider outage)
- **Network errors** beyond timeout (DNS resolution failures, SSL errors)

**Design gap:** Timeouts (category `timeout`) are classified as `shouldCountAsProviderFailure: false` (line 90). This means repeated LLM timeouts (caused by overload) will **never** trigger the circuit breaker. Three consecutive timeout failures won't pause the system.

### 4.3 No Backpressure Mechanism

The system has no way to slow down when the LLM provider is under load:

- **No request queuing:** Each pipeline stage fires LLM calls as fast as possible.
- **No concurrency cap on LLM calls:** 3 concurrent CB jobs × 5+ parallel LLM calls each = 15+ simultaneous requests.
- **No adaptive delay:** After receiving a 429/Overloaded, the system retries (via AI SDK) but doesn't signal other jobs to slow down.
- **No provider-level rate limiting:** No token bucket or sliding window for API requests.

This is the **root cause** of `AI_RetryError: Overloaded` being the dominant failure mode.

---

## 5. Error Handling & Recovery

### 5.1 Job-Level Error Handling

`runJobBackground()` (line 154-318) catches all errors and marks jobs FAILED. The `P0 FIX` guard (line 238-262) prevents late SUCCEEDED overwrite if a job was already marked FAILED by stale recovery.

**Mostly working.** One gap: the guard is non-atomic (see §2.4). Small race window between status read and write.

### 5.2 No Retry for Failed Jobs

Once a job is marked FAILED, there is no automatic retry mechanism. The user must manually resubmit. For transient failures (provider overload, timeouts), automatic retry with exponential backoff would reduce manual intervention.

### 5.3 No Partial Progress Recovery

If a job fails at Stage 4 (Verdicts) after completing Stage 2 (Research), all research work is lost. The next attempt starts from scratch. There is no checkpoint/resume mechanism.

---

## 6. Observability & Cost Tracking

### 6.1 Metrics Not Integrated (Critical Gap)

Metrics infrastructure exists (`MetricsCollector` class, `/admin/metrics` dashboard, database schema) but is not connected to the analysis pipeline. This means:

- No LLM call counts per job
- No token usage per job
- No latency breakdown per stage
- No cost estimates per job
- No success/failure rate trends
- No provider health dashboards with historical data

**Impact:** Cannot diagnose performance issues without reading logs. Cannot optimize costs without usage data. Cannot detect regressions without baselines.

### 6.2 Logging (Adequate — Not Structured)

Console logging is present throughout (`console.log`, `console.warn`, `console.error`). The `debugLog()` function writes to `debug-analyzer.log`. But there is no structured logging format (JSON), no log levels beyond console methods, and no log aggregation.

### 6.3 No Per-Job Cost Tracking

No mechanism to track how much each analysis costs in API calls, tokens, or dollars. The `config-snapshots` system captures the configuration used for a job, but not the actual resource consumption.

---

## 7. Configuration & Runtime Reconfig

### 7.1 UCM Cache TTL (5 Minutes)

Config changes take up to 5 minutes to propagate to running pipelines. For emergency parameter changes (e.g., reducing concurrency during an outage), this delay is too long.

**File:** `apps/web/src/lib/config-storage.ts`

### 7.2 Config Seeding on Build

The `postbuild` script (`reseed-all-prompts.ts`) re-seeds default configs. This means a build can overwrite admin-customized UCM values if the defaults change. The script only updates unchanged configs, but the "unchanged" detection depends on hash comparison.

---

## 8. Web Search Layer

**File:** `apps/web/src/lib/web-search.ts`

### 8.1 Provider Failover (Working)

Auto mode tries Google CSE first, falls back to SerpAPI. Fatal errors (SearchProviderError) are caught and reported. Non-fatal errors return empty results.

### 8.2 Sequential Fallback in Auto Mode

Auto mode (lines 103-146) tries Google CSE first, then SerpAPI if `results.length < maxResults`. Both calls are **sequential**. If Google CSE returns partial results and SerpAPI is needed, total search latency doubles (12s + 12s = ~24s per query). No parallel probing.

### 8.3 No Rate Limiting on Search Calls

The pipeline fires search queries without throttling. Stage 2 can generate 2 queries per claim per iteration × 8 claims × 9 iterations = 144 queries worst case. Google CSE has a 100 queries/day free tier limit. No tracking of remaining quota.

### 8.4 No Search Result Caching

Identical search queries executed across different jobs (or retries of the same job) are not cached. Each query makes a fresh API call.

---

## 9. Source Reliability Evaluation

**File:** `apps/web/src/lib/analyzer/source-reliability.ts`

### 9.1 Evaluation Cost (Deferred to Batch — Still Expensive)

SR-Eval is now batched after the research loop (previous fix). But each new domain still requires:
- Language detection
- 4-6 web search queries (evidence gathering)
- 2 LLM calls (Haiku + GPT-4o-mini for multi-model consensus)
- Total: ~15-25 seconds per new domain

With 10-20 unique domains per analysis, batch SR-Eval adds 2-5 minutes post-research. This is no longer in the critical path (doesn't block research iterations) but still adds to total job time.

### 9.2 Cache Effectiveness

SQLite cache with 90-day TTL (`source-reliability-cache.ts`). Cache hit rates are unknown (no metrics). If most analyses encounter new domains, cache saves little.

---

## 10. API Integration

**File:** `apps/api/Services/RunnerClient.cs`

### 10.1 Fire-and-Forget Trigger

The API triggers the runner via HTTP POST to `/api/internal/run-job`. If this call fails (Next.js not ready, network issue), the job stays QUEUED in the DB. The rehydration logic in `drainRunnerQueue()` eventually picks it up, but with a delay.

### 10.2 RunnerClient Retry & Timeout Gaps

**File:** `apps/api/Services/RunnerClient.cs`

- **Only retries transient errors** (5xx, 408, 429). A 400 from an internal bug fails immediately with no retry, leaving the job stuck in QUEUED.
- **No explicit timeout** on the HTTP trigger call. If the runner endpoint hangs, there is no client-side timeout protection — relies on `HttpClient` defaults.

### 10.3 No Optimistic Locking on Status Updates

**File:** `apps/api/Services/JobService.cs`

Multiple concurrent status updates can race (e.g., stale recovery marking FAILED while the runner marks SUCCEEDED). Last write wins. The `P0 FIX` guard in the runner (§2.4) mitigates the most dangerous case but doesn't provide full atomicity.

### 10.4 Status Update Chattiness

The runner sends `PUT /internal/v1/jobs/:id/status` for every progress update (sub-stage messages at 12%, 15%, 22%, 26%, 30%, 31%, 33%, etc.). Each creates a `JobEventEntity` row for audit. With 3 concurrent CB jobs each sending ~30+ status updates, this creates ~100+ DB writes per batch.

**Not a current bottleneck** (SQLite handles this fine), but worth noting for scale.

---

## 11. Summary of Recommendations (For Architect Discussion)

| Priority | Issue | Recommendation | Effort |
|----------|-------|----------------|--------|
| **P0** | Provider saturation (Overloaded errors) | LLM request concurrency cap / token bucket | Medium |
| **P1** | No backpressure | Global LLM semaphore across all jobs | Medium |
| **P1** | In-memory queue | DB-backed job queue (or at minimum, WAL-mode SQLite queue) | Large |
| **P1** | No observability | Integrate MetricsCollector into CB pipeline | Small |
| **P1** | SR-Eval timeout stacking | Include SR-Eval in time budget or add separate SR budget | Small |
| **P1** | Timeouts don't trigger circuit breaker | Count repeated timeouts as provider failures | Small |
| **P2** | No automatic retry | Retry FAILED jobs with transient errors (overload, timeout) | Medium |
| **P2** | No checkpoint/resume | Save research state; resume from last completed stage | Large |
| **P2** | Circuit breaker too coarse | Per-model health tracking; automatic cooldown timer | Medium |
| **P2** | Late completion guard race | Atomic status transition (compare-and-swap or DB-level guard) | Small |
| **P3** | Sequential search fallback | Parallel provider probing in auto mode | Small |
| **P3** | Search quota tracking | Track remaining CSE/SerpAPI quota; throttle when low | Small |
| **P3** | Token budget enforcement | Enable `enforceBudgets: true` after tuning thresholds | Small |
| **P3** | Drain N+1 API calls | Batch API endpoint for queued job variant lookup | Small |
| **P3** | SR evaluation silent timeouts | Add logging + metric when SR-Eval domain times out | Small |

---

## 12. Codex Findings

### 12.1 What was validated live

1. **Core Stage-2 performance controls are active on new runs.**  
   New ClaimBoundary jobs use reduced iteration ceilings (`/9` with current config), and queue pressure is lower than the earlier `/18` behavior.

2. **Variant partitioning works in steady state.**  
   Runtime behavior matches the intended split (`maxConcurrency=4` => up to `3 ClaimBoundary + 1 Dynamic`), and dynamic jobs can progress while CB jobs are active.

3. **Recovery logic works once drain is triggered.**  
   Orphan/stale RUNNING jobs were marked FAILED and queued jobs were promoted in the same wave; this confirms recovery code path correctness after activation.

4. **UCM values reflect the new runtime strategy.**  
   Active values confirmed: `maxAtomicClaims=8`, `contradictionReservedIterations=1`, `maxTotalIterations=10`, `researchTimeBudgetMs=600000`, `researchZeroYieldBreakThreshold=2`.

### 12.2 Remaining weaknesses (design-level)

1. **Queue timeout is still mismatched to slow-job service time.**  
   A fixed 5-minute queue timeout can fail jobs at 0% while CB jobs run for 8-15+ minutes; under burst load this produces avoidable FAILED jobs even when the system is healthy.

2. **Queue bootstrap remains startup-path sensitive.**  
   Bootstrap is on module import. In practice this still depends on a route loading `internal-runner-queue.ts`; after restart, persisted jobs may wait until first triggering request.

3. **Config default drift risk remains.**  
   `pipeline.default.json` has `maxAtomicClaims=8` and `contradictionReservedIterations=1`, but `config-schemas.ts` fallback transform still defaults to `15` and `2` when fields are absent.

4. **Provider overload is still the dominant runtime failure mode.**  
   Recent failures remain `AI_RetryError ... Overloaded` in Stage 1 and Stage 4. Throughput and queue fixes improved flow, but do not solve upstream capacity saturation.

### 12.3 Codex recommendations for architect discussion

1. **P0: Eliminate default drift immediately.**  
   Align schema-transform fallbacks in `config-schemas.ts` with `pipeline.default.json` to prevent silent reversion to pre-fix iteration load.

2. **P0: Make queue bootstrap unconditional at app startup.**  
   Invoke queue initialization/drain from a guaranteed startup path so persisted QUEUED/RUNNING jobs are recovered without waiting for user traffic.

3. **P0: Rework queue timeout policy by variant.**  
   Replace one fixed 5-minute wait limit with variant-aware limits (or adaptive timeout by queue depth/service-time estimate) so CB jobs are not failed before they can be scheduled.

4. **P1: Add global provider-aware LLM throttling.**  
   Gate `generateText` calls behind shared semaphores (per provider/model class) to cap concurrent expensive calls and reduce overload cascades.

5. **P1: Add overload backpressure and observability.**  
   When overload rate crosses threshold, temporarily reduce slow slots and emit metrics: overload count, queue promotion latency, stale-recovery count, and per-stage failure distribution.

### 12.4 Conceptual / architectural assessment (Codex)

1. **This is not only a bug problem; it is a workload-mixing architecture problem.**  
   Fast jobs (dynamic) and slow jobs (ClaimBoundary) share one in-process queue/runner and compete for the same global capacity. Partitioning helps, but the base architecture still couples unlike workloads.

2. **Current queue semantics are request-driven, not service-driven.**  
   Recovery/drain behavior still depends on runtime module activation paths. A resilient job system should have explicit lifecycle ownership (always-on scheduler loop), independent of user traffic.

3. **Timeout policy is structurally inconsistent with service-time distribution.**  
   A single queue wait timeout (`5 min`) is shorter than normal slow-job residence time under load (`8-15+ min`). This creates systematic false failures rather than rare edge-case failures.

4. **Provider capacity is treated as incidental, but it is a first-class architectural constraint.**  
   Overload failures show that upstream LLM capacity needs explicit control planes (admission control, provider/model semaphores, graceful degradation modes), not only retries.

5. **Stability currently relies on heuristics instead of explicit SLO budgets.**  
   Iteration caps/time budgets improved behavior, but the system still lacks formal per-stage budgets and fail-fast contracts that guarantee bounded runtime/cost across load conditions.

### 12.5 Architect-level decisions required

1. **Queue architecture direction:** keep in-process queue with hardening vs move to persistent worker queue with dedicated scheduler ownership.
2. **Workload isolation strategy:** strict lane separation (fast vs slow pools) vs adaptive shared pool with strong admission control.
3. **Timeout model:** variant-aware queue timeout + stage budgets vs single global timeout.
4. **Provider protection model:** global semaphores + overload backoff + degraded mode policy (e.g., reduced claim count/research depth under pressure).
5. **SLO definition:** target max queue wait, max job runtime, and max provider error rate; wire these into automated throttling decisions.

---

## 13. Lead Architect Assessment

**Author:** Lead Architect (Claude Sonnet 4.5)
**Date:** 2026-02-17
**Review Context:** Post-ClaimBoundary v1.0 deployment runtime issues

### 13.1 Conceptual Problems (Fundamental Design Mismatches)

The developers' tactical fixes addressed symptoms. Codex correctly identified that **this is not only a bug problem; it is a workload-mixing architecture problem**. I concur and identify the following conceptual mismatches:

#### **CP-1: Homogeneous Job Model for Heterogeneous Workloads**

**Problem:** The system treats all analysis jobs as equivalent units of work, but they have fundamentally different characteristics:

| Characteristic | ClaimBoundary | Dynamic | Mismatch Factor |
|----------------|---------------|---------|-----------------|
| Duration | 5-15 min | 20-60 sec | **15-45x** |
| LLM calls | 60-120+ | 5-10 | **6-24x** |
| Cost | $0.50-$2.00 | $0.10-$0.40 | **5x** |
| Failure modes | Provider saturation, SR timeout | Network errors | Different |
| User expectation | Batch analysis | Real-time feedback | Incompatible |

**Impact:** Putting these in the same queue creates head-of-line blocking, resource contention, timeout mismatches, and priority inversion. Fast jobs wait behind slow jobs. Slow jobs fail with fast-job timeouts.

**Analogy:** This is like running batch analytics jobs and real-time API requests through the same worker pool. Industry best practice is **separate queues with dedicated workers**.

#### **CP-2: Synchronous Processing Model for Async Work**

**Problem:** The runner uses an in-process queue (`globalThis.__fhRunnerQueueState`) with fire-and-forget execution. But the work is inherently **long-running, resumable, and prioritizable**.

**Characteristics that demand async-first design:**
- Jobs run 5-15+ minutes (not milliseconds)
- Jobs have multi-stage checkpoints (Stage 1 → 2 → 3 → 4 → 5)
- Jobs consume external quota (LLM API limits, search API limits)
- Jobs must survive process restarts
- Jobs have different priorities (user-facing vs batch)

**Current approach:** In-memory queue, no durability, no checkpoints, no resume. Recovery depends on DB scans and heuristics.

**Analogy:** Using `setTimeout()` for task scheduling instead of a proper job queue (BullMQ, Sidekiq, Celery, etc.).

#### **CP-3: Provider Capacity as External Factor, Not First-Class Constraint**

**Problem:** The system makes LLM calls as if the provider has infinite capacity, then **reacts** to failures:

```
Request → Overloaded → Retry (AI SDK) → Overloaded → Retry → Overloaded → Job FAILED
→ Circuit breaker (after 3 job failures) → System PAUSED → Manual resume required
```

**Missing:** **Admission control**. No mechanism to say "I can only make 10 concurrent LLM calls before overload; queue the rest."

**Current state:**
- 3 concurrent CB jobs × 5+ parallel LLM calls each = **15+ simultaneous requests**
- No backpressure when provider is under load
- No graceful degradation (reduce claim count, skip SR-Eval, etc.)
- No per-model quotas (Opus vs Sonnet vs Haiku)

**Analogy:** A web crawler that hits rate limits and gets blocked, instead of respecting `Retry-After` headers and maintaining a request budget.

#### **~~CP-4: Timeout Policies Structurally Inconsistent with Service Time~~ CORRECTED — Not a Problem**

**Original claim:** Queue timeout is 5 minutes, shorter than CB job runtime (8-15 min).

**Correction (2026-02-17):** Queue timeout is actually **6 hours** (`internal-runner-queue.ts:99`), configurable via `FH_RUNNER_QUEUE_MAX_WAIT_MS`. This is generous enough for any job. The runtime issues doc was incorrect on this point.

**Status:** No action needed. Variant-aware timeout is a nice-to-have, not P0.

#### **CP-5: Observability as Afterthought, Not Foundation**

**Problem:** Metrics infrastructure exists (`MetricsCollector`, dashboard, DB schema) but is **not integrated**. Cannot measure what isn't instrumented.

**Blindness:**
- No per-job cost tracking → can't optimize spend
- No per-stage latency → can't identify bottlenecks
- No provider health trends → can't predict outages
- No success/failure rates → can't detect regressions
- No queue depth/wait time → can't tune concurrency

**Impact:** Flying blind. **Codex's P0 recommendation (#2)** correctly states: "Add overload backpressure **and observability**" — these are linked. You cannot add intelligent backpressure without metrics to drive decisions.

**Analogy:** Running a production system without logs or APM. When things break, you're debugging with `console.log` and guesswork.

### 13.2 Architectural Problems (Structural Weaknesses)

#### **AP-1: Request-Driven Queue Semantics, Not Service-Driven**

**Problem:** Queue bootstrap depends on module import → route loading → user traffic. After restart, queued jobs wait for the first user request to trigger recovery.

**Code evidence:**
```typescript
// apps/web/src/lib/internal-runner-queue.ts:525-526
void drainRunnerQueue(); // Bootstrap on module load
```

**Failure mode:**
1. Process restarts (deploy, crash, OOM)
2. Queue state lost (in-memory)
3. Jobs remain QUEUED in DB
4. No drain until first user navigates to a page that imports this module
5. Jobs sit idle for seconds/minutes until traffic arrives

**Correct approach:** Queue should have **lifecycle ownership** — explicit startup/shutdown, not traffic-dependent activation. Codex's P0 recommendation (#2) is correct: "unconditional queue bootstrap at app startup."

#### **AP-2: Fragile State Management (In-Memory + DB Scan)**

**Problem:** Queue state lives in `globalThis` (process memory). Durability comes from DB scans on every drain cycle.

| Aspect | Current Implementation | Fragility |
|--------|----------------------|-----------|
| Queue order | In-memory array | Lost on crash |
| Running job tracking | `Set<string>` in memory | Cannot track across restarts |
| Concurrency counting | Reconstructed from DB | N+1 API calls per queued job |
| Recovery | 15-minute stale threshold | Zombie jobs block slots for 15 min |

**Cost of drain cycle (with 10 queued jobs):**
1. Fetch all RUNNING jobs (paginated, ~200 jobs/page) — **N API calls**
2. For each queued job, `GET /v1/jobs/:id` to check status — **10 API calls**
3. Check variant, start eligible jobs
4. **Total: N+10 API calls per drain cycle (every 30 seconds)**

**Correct approach:** DB-backed queue with atomic operations. SQLite with WAL mode or PostgreSQL `FOR UPDATE SKIP LOCKED`.

#### **AP-3: Late Completion Guard is Non-Atomic**

**Problem:** The `P0 FIX` (lines 238-262) reads job status before writing SUCCEEDED:

```typescript
const currentJob = await apiGet(apiBase, `/v1/jobs/${jobId}`);  // Line 241
const currentStatus = String(currentJob?.status || "").toUpperCase();

if (currentStatus === "RUNNING") {
  await apiPutInternal(/* ... */, { status: "SUCCEEDED" });  // Line 245
} else {
  console.warn(`Job ${jobId} is ${currentStatus}, not updating to SUCCEEDED`);
}
```

**Race window:** If stale recovery marks job FAILED between line 241 and 245 (milliseconds), SUCCEEDED overwrites FAILED. The window is small but exists.

**Correct approach:** Atomic compare-and-swap: `UPDATE jobs SET status='SUCCEEDED' WHERE jobId=? AND status='RUNNING'`. If 0 rows updated, don't overwrite.

#### **AP-4: Config Default Drift (~~Confirmed Bug~~ FIXED)**

**Problem:** `pipeline.default.json` had reduced iteration caps, but `config-schemas.ts` fallback transform defaulted to **pre-fix high values**.

**Resolution:** LLM Expert fixed this in `AtomicClaim_Extraction_Improvements_2026-02-17.md` Phase 1.4:
- `maxAtomicClaims` schema default: 15 → **5** (aligned with pipeline.default.json)
- `contradictionReservedIterations` schema default: 2 → **1** (aligned with pipeline.default.json)

This was Codex's P0 recommendation (#1) — **now resolved**.

#### **AP-5: AtomicClaim Explosion as Primary Load Multiplier (ADDRESSED)**

**Root cause identified by Captain + LLM Expert:** The real driver behind provider saturation, excessive LLM calls, and high cost was **claim count explosion**. With 6-8 claims extracted from simple inputs, every downstream stage multiplied the load:

| Impact | 8 claims (before) | 3-5 claims (after fix) | 2-3 claims (short input, dynamic) |
|--------|-------------------|----------------------|-----------------------------------|
| Research iterations | 6-9 | 3-5 | 2-3 |
| Total LLM calls | 53-71 | 30-45 | ~25 |
| Evidence items | 74-114 | 40-60 | ~30 |
| Cost per analysis | $1-2 | $0.60-1.20 | $0.30-0.60 |

**Fixes implemented** (see `Docs/WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md`):
1. `maxAtomicClaims` 8 → **5** (hard cap)
2. Dynamic formula: `effectiveMax = min(cap, base + floor(inputLen / charsPerClaim))` — short inputs get 2-3 claims
3. Gate 1 now **actively filters** (was advisory-only)
4. Configurable atomicity level (1-5 dial, default 3)
5. Prompt improvements: merge overlapping claims, reject meta-claims

**Impact on architecture assessment:** This significantly reduces the urgency of Phase 2 (LLM semaphore). With 40-60% fewer LLM calls, provider saturation may be manageable without explicit admission control. **Phase 2 should be validated against post-fix load levels before implementation.**

### 13.3 Design Problems (Implementation Patterns That Don't Scale)

#### **DP-1: No Stage-Level SLO Budgets**

**Problem:** Iteration caps (`maxTotalIterations: 10`) and time budgets (`researchTimeBudgetMs: 600000`) are **heuristic**, not **SLO-driven**.

**Missing guarantees:**
- No guaranteed max cost per job (can still run $5+ if many unique domains)
- No guaranteed max runtime (SR-Eval runs **after** time budget, adds 2-8 min)
- No fail-fast on budget exhaustion (iteration budget checked at loop start only)

**Example:** If iteration 9 takes 9:50 and budget is 10:00, the loop **enters iteration 10**. Budget check only fires at start of iteration 11, so individual iterations overshoot.

**Correct approach:** Per-stage SLO budgets with hard enforcement:
- Stage 1: 60s max
- Stage 2 Research: 10min max
- Stage 2 SR-Eval: 5min max (included in Stage 2 total)
- Stage 3: 30s max
- Stage 4: 5min max
- Stage 5: 30s max
- **Total SLO: 16 min hard ceiling**

Enforce at stage boundaries, fail-fast on exceeded budget.

#### **DP-2: SR Evaluation Timeout Stacking**

**Problem:** SR-Eval runs **after** the research loop (deferred batch), so it's **not covered** by `researchTimeBudgetMs`.

**Timeline:**
1. Research loop: 10 min (budget enforced)
2. SR-Eval batch: 2-8 min (10-20 domains × 15-25s each, concurrency 3)
3. **Total Stage 2: 12-18 min** (despite "10-minute budget")

Additionally, per-domain timeout is 90s. If timeout occurs, domain gets default score 0.5 **with no logging**. Admin has no way to know SR-Eval failed.

**Correct approach:** Include SR-Eval in Stage 2 SLO budget or add separate SR budget. Log all timeout events. Emit metrics for SR success/failure/timeout rates.

#### **DP-3: Circuit Breaker Too Coarse**

**Problem:** Circuit breaker tracks two providers: `search` and `llm`. After 3 consecutive failures, it **pauses the entire system**.

**Issues:**
- **All-or-nothing:** One LLM provider failure pauses ALL jobs, including those that might succeed
- **No automatic recovery:** Circuit stays OPEN until manual `transitionToHalfOpen()`. No timer-based cooldown
- **No per-model tracking:** "llm" is a single bucket. If Opus is overloaded but Haiku is fine, circuit breaker can't distinguish
- **Job-level, not call-level:** Increments on job failure (line 274 in runner queue), not on individual API call failures

**Worse:** Timeouts are classified as `shouldCountAsProviderFailure: false` (error-classification.ts:90). Repeated LLM timeouts (caused by overload) will **never** trigger the circuit breaker.

**Correct approach:** Per-model health tracking (Opus, Sonnet, Haiku). Automatic cooldown timer (30s → HALF_OPEN). Count repeated timeouts as provider failures.

### 13.4 Root Cause Analysis

Why does the current architecture have these problems?

**RCA-1: POC Origins**
The system started as a proof-of-concept with a single pipeline (Monolithic Canonical). In-memory queue was fine for low-volume testing. As the system evolved (ClaimBoundary pipeline, production testing), the infrastructure didn't evolve with it.

**RCA-2: Tactical Evolution**
Each issue was fixed tactically (add timeout here, add retry there) without revisiting foundational assumptions. This is classic **technical debt accumulation**.

**RCA-3: Missing SLO Definition**
No formal definition of "what must this system guarantee?" Without SLOs, there's no target to design for. Developers optimize for observed failures, not guaranteed behavior.

**RCA-4: Observability Gap**
Cannot measure → cannot optimize → cannot tune. Metrics infrastructure exists but isn't integrated, so decisions are made on intuition and logs, not data.

### 13.5 Strategic Options

I see three viable architectural directions:

#### **Option A: Progressive Hardening** (Recommended)

Keep the current architecture, fix structural issues in phases:

**Phase 1: Eliminate Structural Debt** (P0, 1-2 days)
- Fix config default drift
- Unconditional queue bootstrap
- Variant-aware timeout policy
- Integrate metrics into pipeline

**Phase 2: Provider Capacity Management** (P0-P1, 3-5 days)
- Global LLM semaphore (cap concurrent calls)
- Backpressure on overload (reduce slots, increase delays)
- Per-model health tracking
- Automatic circuit breaker recovery

**Phase 3: Durable Queue** (P1, 1-2 weeks)
- SQLite WAL-mode queue (or PostgreSQL)
- Atomic status transitions
- Checkpoint/resume for long jobs
- Priority queue support

**Phase 4: Workload Separation** (P2, 2-3 weeks)
- Dedicated pools for fast/slow variants
- Independent scaling policies
- Cost/quality trade-off controls

**Pros:**
- Incremental, low-risk
- Immediate P0 fixes (days)
- Each phase delivers value
- Can stop at any phase if good enough

**Cons:**
- Still couples workloads until Phase 4
- Architecture remains complex

#### **Option B: Dual-Queue Architecture**

Separate infrastructure for fast and slow jobs:

**Fast Lane:**
- In-memory queue
- Low latency, tight timeouts
- Dynamic pipeline only

**Slow Lane:**
- Durable queue (DB-backed)
- Resumable, generous timeouts
- ClaimBoundary pipeline only

**Pros:**
- Clean separation
- Each optimized for workload
- Fast jobs never blocked by slow jobs

**Cons:**
- More complexity, two systems
- Larger migration effort (3-4 weeks)
- Two codebases to maintain

#### **Option C: Move to External Job Queue**

Replace in-process queue with proper job queue system (BullMQ, PostgreSQL SKIP LOCKED, Temporal.io, etc.).

**Pros:**
- Battle-tested, production-ready
- Built-in durability, observability, retry
- Scales horizontally

**Cons:**
- External dependency (Redis for BullMQ, PostgreSQL for SKIP LOCKED)
- Larger migration effort (4-6 weeks)
- Operational complexity

### 13.6 Recommended Path: Progressive Hardening

**Rationale:**
Option A (Progressive Hardening) delivers the best ROI:
- Immediate P0 fixes (1-2 days) resolve critical issues
- Each phase is independently valuable
- Low risk, incremental approach
- Can pivot to Option B/C later if needed

**Decision:** Proceed with **Progressive Hardening** in 4 phases.

### 13.7 Implementation Decision Plan (REVISED 2026-02-17)

> **Revision note:** Original 4-phase plan significantly reduced after verifying actual codebase state. Several issues were already resolved or based on incorrect assumptions. See "Critical Corrections" table below.

| Doc Claim | Actual State | Impact |
|-----------|-------------|--------|
| Queue timeout is 5 minutes | **6 hours** (`internal-runner-queue.ts:99`) | CP-4 not a real problem |
| Config defaults drift | **Already fixed** by LLM Expert | AP-4 resolved |
| 60-120+ LLM calls per job | **Reduced to ~25-45** by AtomicClaim fix | CP-3 partially addressed at source |
| SR-Eval timeout is silent | **Logging already in place** | Remove from plan |
| No queue bootstrap | **5-second delayed drain on module import** | AP-1 functional |

#### **Phase 1: Validate + Observe** (P0 — Must Do Now)

**Objective:** Confirm AtomicClaim fix resolves dominant failure mode and wire metrics for baseline data.
**Duration:** 1-2 days
**Risk:** Low

**Tasks:**

| # | Task | File(s) | Effort | Status |
|---|------|---------|--------|--------|
| ~~1.1~~ | ~~Fix config default drift~~ | `config-schemas.ts` | — | ✅ DONE (LLM Expert) |
| ~~1.2~~ | ~~Unconditional queue bootstrap~~ | — | — | ✅ Functional (module import + 5s delay) |
| ~~1.3~~ | ~~Variant-aware queue timeout~~ | — | — | ✅ Not needed (timeout is 6h, not 5min) |
| 1.4 | **Wire metrics into CB pipeline** — Import `metrics-integration.ts` helpers, call at each stage boundary | `claimboundary-pipeline.ts`, `metrics-integration.ts` | 4 hours | **TODO** |
| ~~1.5~~ | ~~SR-Eval timeout logging~~ | — | — | ✅ DONE (console.error at line 371) |
| 1.6 | **Validate AtomicClaim fix** — Run 3 real analyses, measure claims/LLM calls/runtime/overload rate | Manual test | ~$2-4 | **TODO** |

**Decision gate:** If Task 1.6 shows overload error rate >10%, proceed to Phase 2. If not, skip Phase 2.

**Verification:**
- Run 3 test jobs (2 CB, 1 Dynamic) and verify:
  - Claims extracted: target 2-5 (was 6-8)
  - LLM calls: target 25-45 (was 53-71)
  - Metrics dashboard shows per-job data
  - SR timeout events logged if they occur

**Success Criteria:**
- Zero queue timeout failures for jobs under 20 min
- Config drift eliminated (verified by hash comparison)
- Metrics visible in `/admin/metrics` for new jobs

#### **Phase 2: Provider Capacity Management** (P0-P1 — Do Next)

**Objective:** Add explicit LLM provider capacity management and backpressure.
**Duration:** 3-5 days
**Risk:** Medium (touches LLM call paths)

**Tasks:**

| # | Task | File(s) | Effort | Owner |
|---|------|---------|--------|-------|
| 2.1 | **Global LLM semaphore** — Create shared semaphore pool for concurrent LLM calls. UCM params: `maxConcurrentLLMCalls` (default: 8), `maxConcurrentExpensiveCalls` (default: 3, for Opus/Sonnet) | New file: `llm-semaphore.ts` | 4 hours | Senior Dev |
| 2.2 | **Wrap all LLM calls** — Update `generateText` wrappers in `llm-utils.ts` to acquire semaphore before calling | `llm-utils.ts` | 3 hours | Senior Dev |
| 2.3 | **Backpressure on overload** — When overload rate >20% in last 10 calls, reduce `maxSlowConcurrency` by 1 (down to 1 min) and add 5s inter-job delay | `internal-runner-queue.ts`, `provider-health.ts` | 4 hours | Lead Dev |
| 2.4 | **Per-model health tracking** — Split "llm" provider into `llm:opus`, `llm:sonnet`, `llm:haiku`. Track health per model. | `provider-health.ts`, `error-classification.ts` | 3 hours | Senior Dev |
| 2.5 | **Automatic circuit breaker recovery** — Add 30s cooldown timer: OPEN → HALF_OPEN after 30s. Test with 1 job. If succeeds → CLOSED. If fails → OPEN for 60s. | `provider-health.ts` | 2 hours | Senior Dev |
| 2.6 | **Count timeouts as provider failures** — Change `error-classification.ts` line 90: `shouldCountAsProviderFailure: true` for timeout category | `error-classification.ts` | 5 min | Senior Dev |

**Verification:**
- Trigger overload condition (submit 10 CB jobs concurrently)
- Verify semaphore limits concurrent calls
- Verify backpressure reduces concurrency
- Verify circuit breaker auto-recovers after cooldown

**Success Criteria:**
- Overload error rate drops below 10% under heavy load
- Circuit breaker recovers automatically within 60s
- Semaphore metrics show queued LLM calls (not rejected)

#### **Phase 3: Durable Queue & Atomic Operations** (P1 — Do After Phase 2)

**Objective:** Replace in-memory queue with DB-backed queue. Add checkpoint/resume.
**Duration:** 1-2 weeks
**Risk:** High (major refactor of queue system)

**Tasks:**

| # | Task | File(s) | Effort | Owner |
|---|------|---------|--------|-------|
| 3.1 | **DB queue schema** — Create SQLite queue table: `job_queue (id, jobId, variant, enqueuedAt, priority, status)`. Add indexes on `(status, priority, enqueuedAt)`. | Migration script, new file: `queue-storage.ts` | 4 hours | Senior Dev |
| 3.2 | **Atomic dequeue operation** — Implement SQLite `UPDATE ... RETURNING` pattern for atomic dequeue (or PostgreSQL `FOR UPDATE SKIP LOCKED` if migrating) | `queue-storage.ts` | 6 hours | Lead Dev |
| 3.3 | **Migrate queue operations** — Replace `globalThis` queue with DB queue. Update `enqueueRunnerJob`, `drainRunnerQueue` to use DB. | `internal-runner-queue.ts` | 8 hours | Lead Dev |
| 3.4 | **Atomic status transitions** — Change status updates to compare-and-swap: `UPDATE jobs SET status=? WHERE jobId=? AND status=?`. Return rows affected. Retry if 0. | `JobService.cs` (API), runner queue | 6 hours | Senior Dev |
| 3.5 | **Checkpoint/resume infrastructure** — Add `job_checkpoints` table: `(jobId, stage, completedAt, stateSnapshot JSON)`. Save checkpoint after each stage. | Migration, new file: `checkpoint-storage.ts` | 8 hours | Senior Dev |
| 3.6 | **Resume from checkpoint** — On job start, check for checkpoint. If exists and job status is FAILED with transient error, resume from last completed stage. | `claimboundary-pipeline.ts`, `internal-runner-queue.ts` | 12 hours | LLM Expert + Lead Dev |

**Verification:**
- Restart server mid-job (kill process)
- Verify job resumes from last checkpoint
- Verify queue ordering preserved across restarts
- Verify no orphan jobs (atomic dequeue prevents double-execution)

**Success Criteria:**
- Jobs survive process restarts without data loss
- Queue operations are atomic (no race conditions)
- Checkpoint/resume reduces wasted LLM spend on retries

#### **Phase 4: Workload Separation** (P2 — Optional Enhancement)

**Objective:** Dedicated pools for fast/slow variants with independent scaling.
**Duration:** 2-3 weeks
**Risk:** Medium (architectural change, requires tuning)

**Tasks:**

| # | Task | File(s) | Effort | Owner |
|---|------|---------|--------|-------|
| 4.1 | **Separate worker pools** — Create two queue drainers: `drainFastQueue()` (Dynamic), `drainSlowQueue()` (ClaimBoundary). Independent concurrency limits. | `internal-runner-queue.ts` (split into two modules) | 8 hours | Lead Dev |
| 4.2 | **Independent SLO budgets** — Per-pool timeout, retry, and priority policies. Fast: 3min total, 1 retry. Slow: 20min total, 0 retries (resume instead). | Pool config | 4 hours | Lead Dev |
| 4.3 | **Cost/quality controls** — Add UCM params to trade cost for quality: `ClaimBoundary_maxAtomicClaims` (default 8), `ClaimBoundary_researchDepth` (shallow/normal/deep). | UCM, pipeline config | 6 hours | LLM Expert |
| 4.4 | **Admin pool management UI** — Dashboard showing: Fast queue depth, Slow queue depth, Active workers per pool, Throughput, Avg wait time. | Admin UI, metrics API | 12 hours | Senior Dev |

**Verification:**
- Submit 20 Dynamic jobs + 10 CB jobs concurrently
- Verify Dynamic jobs complete in <3min regardless of CB queue
- Verify CB jobs run with independent concurrency (not blocked by Dynamic)

**Success Criteria:**
- Fast jobs p99 latency <2min under any load
- Slow jobs never starved (always at least 1 worker)
- Admin can tune pools independently

### 13.8 Decision Points

| Decision ID | Question | Options | Recommended | Rationale |
|-------------|----------|---------|-------------|-----------|
| **D1** | Queue architecture | In-process + harden vs DB-backed vs External | **DB-backed (Phase 3)** | Best balance of durability and control |
| **D2** | Workload isolation | Shared pool + partitioning vs Dedicated pools | **Shared + partitioning (Phase 1-2), evaluate dedicated pools after** | Incremental approach, can pivot later |
| **D3** | Timeout model | Variant-aware static vs Adaptive dynamic | **Variant-aware static (Phase 1)** | Simpler, good enough for current scale |
| **D4** | Provider protection | Semaphore + backoff vs Queue pause vs Graceful degradation | **Semaphore + backoff (Phase 2)** | Prevents overload without pausing system |
| **D5** | SLO definition | Per-stage budgets vs Total budget only | **Per-stage budgets (Phase 2)** | Better fail-fast, clearer cost guarantees |
| **D6** | Checkpoint granularity | Per-stage vs Per-iteration | **Per-stage (Phase 3)** | Sufficient for resume, less storage overhead |

### 13.9 Implementation Priority

**Must Do (P0) — Start Immediately:**
- Phase 1: Structural Debt (1-2 days) — **Blocks production stability**
- Phase 2: Provider Capacity (3-5 days) — **Blocks scale**

**Should Do (P1) — Do Next Sprint:**
- Phase 3: Durable Queue (1-2 weeks) — **Improves reliability, reduces wasted spend**

**Nice to Have (P2) — Revisit After P1:**
- Phase 4: Workload Separation (2-3 weeks) — **Optimizes for mixed workload, not critical yet**

### 13.10 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Phase 2 LLM semaphore breaks pipeline** | Comprehensive testing in dev. Feature flag: `LLM_SEMAPHORE_ENABLED` (default: true). Can disable if issues. |
| **Phase 3 DB queue migration data loss** | Dual-write period: Write to both in-memory and DB queue for 1 week. Verify consistency. Cutover when confident. |
| **Config changes break existing jobs** | Config snapshot system already in place. Jobs use snapshot from creation time, not current config. |
| **Metrics overhead slows pipeline** | Metrics collection is async (fire-and-forget). No blocking. Batch writes to DB. |

### 13.11 Success Metrics

Track these metrics to validate each phase:

| Metric | Baseline (Current) | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|-------------------|----------------|----------------|----------------|
| **Queue timeout failures (%)** | ~30% | <5% | <5% | <1% |
| **Overload error rate (%)** | ~25% | ~25% (unchanged) | <10% | <10% |
| **Orphan jobs per restart** | ~8 | ~8 (unchanged) | ~8 (unchanged) | 0 |
| **Job resume rate (transient failures)** | 0% (no resume) | 0% (no resume) | 0% (no resume) | >50% |
| **Fast job p99 latency (min)** | 3-5 min | <3 min | <2 min | <2 min |
| **Slow job success rate (%)** | ~60% | ~75% | ~85% | ~90% |
| **Admin visibility (dashboards)** | 0 (none) | Metrics page | Metrics + health | Metrics + health + queue |

### 13.12 Open Questions for Stakeholder Review

1. **Budget approval for Phase 3?** (1-2 weeks dev time) — Durable queue is P1, not P0. Can defer if budget tight.
2. **External queue (Option C) still on table?** — If planning PostgreSQL migration anyway, SKIP LOCKED queue is compelling.
3. **Phase 4 workload separation priority?** — If user traffic remains low, shared pool may suffice. Revisit if traffic 10x.
4. **Observability tooling?** — Current: SQLite + custom dashboard. Upgrade to Grafana/Prometheus? Or keep simple?

### 13.13 Next Steps

**Immediate (Today):**
1. **Stakeholder review** — Product/DevOps/Finance review this plan
2. **Approval for Phase 1** — P0 work, start ASAP
3. **Assign owners** — Senior Dev takes 1.1-1.3, LLM Expert takes 1.4

**This Week:**
1. Complete Phase 1 (1-2 days)
2. Verify Phase 1 success metrics
3. Start Phase 2 (if Phase 1 successful)

**Next Sprint:**
1. Complete Phase 2 (3-5 days)
2. Evaluate Phase 3 go/no-go decision
3. Plan Phase 3 migration if approved

---

**End of Lead Architect Assessment**

---

## Appendix: Files Referenced

| File | Lines | Purpose |
|------|-------|---------|
| `apps/web/src/lib/internal-runner-queue.ts` | 526 | Queue, runner, drain, partitioning |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | ~1800 | CB pipeline stages |
| `apps/web/src/lib/provider-health.ts` | 171 | Circuit breaker |
| `apps/web/src/lib/error-classification.ts` | 158 | Error categorization |
| `apps/web/src/lib/web-search.ts` | 201 | Search provider integration |
| `apps/web/src/lib/analyzer/source-reliability.ts` | ~400 | SR prefetch + evaluation |
| `apps/web/configs/pipeline.default.json` | 115 | Pipeline defaults |
| `apps/web/src/lib/config-schemas.ts` | ~600 | UCM schema + defaults |
| `apps/web/src/lib/config-storage.ts` | ~500 | UCM storage + cache |

---

**Next steps:** Codex adds findings → Lead Architect (Sonnet) reviews and produces implementation plan.

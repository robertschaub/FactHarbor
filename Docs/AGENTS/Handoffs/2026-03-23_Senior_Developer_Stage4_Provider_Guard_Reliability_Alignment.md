---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | Stage 4 Provider Guard Reliability Alignment
**Task:** Verify the real provider-limit behavior behind repeated `Stage4LLMCallError` fallback reports and align the local fix so it is effective and efficient instead of a brute-force runner workaround.
**Files touched:** `apps/web/src/lib/analyzer/llm-provider-guard.ts`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/test/unit/lib/analyzer/llm-provider-guard.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `apps/web/.env.example`
**Key decisions:** Kept runner-global concurrency at `3` and introduced targeted Stage-4 throttling instead. Removed the custom outer retry loop after confirming that the installed AI SDK already retries retryable API-call failures and honors `retry-after` / `retry-after-ms` response headers. Switched the guard from provider-wide throttling to lane-aware throttling so Anthropic Sonnet can be constrained independently from lighter Anthropic lanes such as Haiku.
**Open items:** Real parallel validation on the running stack is still required. The guard currently covers the Stage-4 verdict path; future SR calibration traffic is not yet routed through the same limiter if that feature flag is enabled. Module-global metrics collection remains a separate issue for parallel-run forensics.
**Warnings:** This hardening addresses runtime backpressure, not semantic quality. Do not interpret it as approval to reopen optimization work. If Stage 4 still fails under load after this patch, inspect real request headers and request IDs before changing limits again.
**For next agent:** Start with this file, then inspect `llm-provider-guard.ts` and `verdict-generation-stage.ts`. The intended tuning knob is now `FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET`, not `FH_RUNNER_MAX_CONCURRENCY`. Verified with `npm -w apps/web run test -- test/unit/lib/analyzer/llm-provider-guard.test.ts`, `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, and `npm -w apps/web run build`.
**Learnings:** no

## Incident Summary

Observed symptom:
- multiple reports on obvious control inputs landed as `UNVERIFIED`
- job details showed `analysis_generation_failed`
- the real failing path was `Stage4LLMCallError: Stage 4: LLM call failed for "VERDICT_ADVOCATE"`

Confirmed behavior:
- affected jobs had substantial evidence pools and were not genuine `insufficient_evidence` cases
- a later serial rerun succeeded, which strongly suggested concurrency/backpressure rather than a broken verdict prompt or parser

Operational conclusion:
- the problem was a Stage-4 reliability issue under concurrent load
- the earlier fallback of setting `FH_RUNNER_MAX_CONCURRENCY=1` is operationally safe but too blunt as the primary code fix

## What The Official Docs Actually Say

### Anthropic

Official docs used:
- https://platform.claude.com/docs/en/api/rate-limits
- https://platform.claude.com/docs/en/api/errors

Relevant facts:
- limits are measured in requests per minute and token throughput, not as one published fixed concurrency number
- responses include rate-limit headers and `retry-after`
- `429` means rate-limit pressure
- `529 overloaded_error` means temporary platform overload
- Anthropic explicitly documents acceleration limits when traffic ramps up sharply
- Sonnet model families share common pools, so multiple concurrent Sonnet calls can collide even if individual requests are reasonable

Implication for FactHarbor:
- a single global “safe concurrency” number cannot be derived once and hardcoded forever
- reducing burstiness on the hot Sonnet path is more robust than globally serializing all jobs

### OpenAI

Official docs used:
- https://developers.openai.com/api/docs/guides/rate-limits

Relevant facts:
- limits are organization/project/tier-specific
- remaining/reset information is exposed in response headers
- official guidance recommends exponential backoff with jitter on rate-limit failures

Implication for FactHarbor:
- header-driven retry behavior is more trustworthy than ad-hoc fixed-delay retries in app code

### Vercel AI SDK

Official docs used:
- https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-api-call-error

Relevant facts:
- `APICallError` exposes `statusCode`, `responseHeaders`, `responseBody`, and `isRetryable`

Local verification against installed dependency:
- repo currently uses `ai@6.0.78`
- in local `node_modules/ai/dist/index.js`, the SDK retry path already:
  - retries retryable `APICallError`s
  - reads `retry-after-ms`
  - reads `retry-after`

Implication for FactHarbor:
- our first custom outer retry loop duplicated behavior the SDK already performs better
- keeping both would multiply attempts and delay recovery unnecessarily

## Why The First Guard Version Was Not Efficient Enough

The initial guard design added:
- provider-aware concurrency limiting
- its own retry loop with exponential backoff

That was directionally right, but inefficient, because:
- `verdict-stage.ts` already contains inner retry behavior in some subpaths
- the AI SDK already retries retryable `APICallError`s with `retry-after` support
- another outer retry layer multiplies total attempts and wall-clock time

In practice this meant:
- more repeated calls during overload
- worse latency under pressure
- extra complexity without better knowledge than the SDK has from response headers

## Final Fix Shape

### 1. Keep runner concurrency separate

Decision:
- keep `FH_RUNNER_MAX_CONCURRENCY=3` as the global runner default
- do **not** use runner-global serial execution as the primary code fix

Reason:
- the observed failures came from the bursty Stage-4 Sonnet path
- serializing the whole runner punishes unrelated stages and lower-risk calls

### 2. Add lane-aware Stage-4 throttling

Implemented in:
- `apps/web/src/lib/analyzer/llm-provider-guard.ts`

Behavior:
- concurrency is tracked by lane, not just by provider
- current lane logic:
  - `anthropic:sonnet`
  - `anthropic:haiku`
  - `anthropic:opus`
  - fallback provider lanes for others

Current defaults:
- `anthropic:sonnet` => `2`
- all other lanes => `3`

Env overrides:
- `FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET`
- `FH_LLM_MAX_CONCURRENCY_ANTHROPIC`
- `FH_LLM_MAX_CONCURRENCY_DEFAULT`

Why this is better:
- it targets the actual hot path
- Haiku validation/support traffic is not unnecessarily forced into the same narrow gate
- future tuning can be done with one stage-specific env knob

### 3. Remove custom outer retries

Implemented in:
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`

Decision:
- the custom outer retry/backoff layer was removed
- the guard now does concurrency shaping only

Reason:
- SDK retries already exist
- SDK retries already inspect `retry-after` / `retry-after-ms`
- one retry system is enough; two is wasteful

### 4. Keep better diagnostics on final failure

Still added and kept:
- `llm_provider_error` warning on final unrecovered LLM/provider failure
- additional captured diagnostics where available:
  - `request-id` / `x-request-id`
  - `retry-after` / `retry-after-ms`
  - Anthropic remaining-request/token headers
  - OpenAI remaining-request/token headers

Why:
- if the system still degrades, we need real provider evidence to tune limits instead of guessing

## Code-Level Summary

### `apps/web/src/lib/analyzer/llm-provider-guard.ts`

Provides:
- lane resolution from `(provider, modelName)`
- per-lane in-process semaphore
- env-aware concurrency limit resolution
- a simple `runWithLlmProviderGuard()` wrapper that only gates concurrency

### `apps/web/src/lib/analyzer/verdict-generation-stage.ts`

Changes:
- wraps Stage-4 model calls with the lane-aware concurrency guard
- explicitly sets `maxRetries: 2` on `generateText()` and relies on SDK retry behavior
- classifies final failures and records richer provider diagnostics in warnings

### `.env.example`

Updated docs:
- old custom retry envs removed from recommended config surface
- new documented knob is the Sonnet lane limit

## Verification

Executed after the final alignment:

1. `npm -w apps/web run test -- test/unit/lib/analyzer/llm-provider-guard.test.ts`
2. `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
3. `npm -w apps/web run build`

All passed.

Additional test hygiene change:
- `claimboundary-pipeline.test.ts` needed a partial mock of `@/lib/web-search` because `classifyError()` references `SearchProviderError`
- this was a test-environment issue, not a production bug

## Practical Tuning Guidance

If failures continue under parallel load:

1. First inspect the emitted warning details:
   - `statusCode`
   - `requestId`
   - `retryAfter`
   - remaining-limit headers

2. Tune only the hot lane first:
   - lower `FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET`
   - do not immediately drop global runner concurrency

3. Validate with parallel control jobs
   - one or two obvious controls
   - compare with serial runs

4. Only if Stage-4 still collapses after lane tuning:
   - consider lowering runner-global concurrency temporarily

## What This Fix Does Not Solve

- It does not guarantee zero provider failures; it reduces burst pressure and avoids inefficient retry layering.
- It does not fix the module-global metrics collector.
- It does not validate deployed behavior by itself; real parallel-run validation is still needed.
- It does not justify reopening quality experiments until the validation gate is clean.


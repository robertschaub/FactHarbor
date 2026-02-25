# Multi-Disciplinary Review: Alpha Phase Acceleration & Observability Plan

**Reviewers:** Senior Developer + LLM Expert + Web Search Expert
**Agent/Tool:** Claude Code (Opus 4.6)
**Target:** `Docs/WIP/Alpha_Phase_Acceleration_Plan_2026-02-25.md`
**Date:** 2026-02-25

---

## 1. SENIOR DEVELOPER — Observability & Stability

### Finding SD-1: Metrics instrumentation has critical coverage gaps

**Severity: CRITICAL**

The plan's Phase 1 claim — "Initial `recordLLMCall` and `recordSearchQuery` are integrated" — overstates the current state. After reading the actual pipeline code:

- **`recordSearchQuery` is never called.** The import exists in `metrics-integration.ts:78` but grep shows zero calls from the pipeline. Search queries are tracked in `state.searchQueries[]` (a local array) at `claimboundary-pipeline.ts:2364` but never flow to the metrics collector.

- **`recordLLMCall` is called only 3 times** — once for Stage 1 (line 194), once as an aggregate for Stage 2 (line 227 — with `promptTokens: 0, completionTokens: 0`), and multiple times inside `createProductionLLMCall` for Stage 4. **Stage 3 (clustering) and Stage 5 (aggregation) have zero `recordLLMCall` coverage.**

- **Stage 2 research metric is a dummy.** Line 227-238 records a single aggregate entry with `totalTokens: 0` — it captures duration only, not actual token usage across the many per-query LLM calls inside `runResearchIteration`.

**Impact:** The plan's acceptance gate ("verify `metrics.llmCalls` for all 5 stages") will fail today. Cost attribution is impossible without per-call token counts.

**Recommendation:** Before closing Phase 1, wrap every `generateText` call in the pipeline with `recordLLMCall` — especially the ~4 LLM calls inside each `runResearchIteration` (query gen, relevance, extraction, derivative check).

---

### Finding SD-2: No per-role cost attribution in metrics schema

**Severity: HIGH**

The `LLMCallMetric` interface (`metrics.ts:23`) has:
```
taskType | provider | modelName | tokens | duration | success
```

There is no `debateRole` field. The verdict stage makes 5+ LLM calls per claim (advocate, selfConsistency x2, challenger, reconciler, validation x2), but all are recorded with `taskType: 'verdict'`. You cannot distinguish advocate cost from challenger cost.

Meanwhile, B-1 runtime role tracing exists (`runtimeRoleTraces` at line 183) and captures `{ debateRole, provider, model, tier, fallbackUsed }` — but this is stored in `resultJson.meta.runtimeRoleTraces`, **not** in the metrics system. The two systems are disconnected.

**Impact:** The plan's "accurate cost attribution" goal is unachievable without a `debateRole` field on `LLMCallMetric`, or at minimum, bridging the B-1 traces into the metrics collector.

**Recommendation:** Add `debateRole?: string` to `LLMCallMetric`. In `createProductionLLMCall`, pass `options?.callContext?.debateRole` into `recordLLMCall`.

---

### Finding SD-3: Model auto-resolution `-latest` alias risk with structured output

**Severity: HIGH**

The Model Auto-Resolution Plan proposes mapping to `claude-haiku-4-5-latest`, `claude-sonnet-4-5-latest`, etc. The current code uses `anthropic(modelName)` from AI SDK (`llm.ts:122`) which passes the string directly to the Anthropic API.

**Risks identified:**

1. **`-latest` aliases resolve server-side.** If Anthropic releases Haiku 5.0 and remaps `-latest`, a mid-run model switch could happen. The plan acknowledges this ("log the resolved model ID at run start") but doesn't propose a mechanism to detect the resolved version — Anthropic's API returns the resolved model in response headers (`x-model-id`), but AI SDK doesn't expose this transparently.

2. **Structured output compatibility.** The pipeline uses `Output.object({ schema })` (Zod schemas) with `getStructuredOutputProviderOptions` forcing `jsonTool` mode for Anthropic. A new model version might handle `json_tool` structured output differently. The retry logic added to Pass 2 mitigates this partially, but verdict stage has no retry wrapper.

3. **Hardcoded model IDs in `model-tiering.ts` are the real problem.** Lines 56-126 have literal strings like `'claude-haiku-4-5-20251001'` and `'claude-sonnet-4-5-20250929'`. The plan correctly identifies these, but the dual `getModelForTask` system (one in `llm.ts`, one in `model-tiering.ts`) means the resolver must intercept at the `buildModelInfo` level in `llm.ts`, not just at `model-tiering.ts`.

**Recommendation:** (a) Add a "Version Lock" UCM toggle as the plan suggests — but make it the default for Alpha, with `-latest` as opt-in. (b) The resolver should canonicalize at `buildModelInfo()` and log the resolved model. (c) Add a startup validation that calls each configured model with a trivial prompt to verify structured output works.

---

### Finding SD-4: `initializeMetrics` signature mismatch

**Severity: MEDIUM**

The function signature expects `(jobId, pipelineVariant, config?, searchConfig?)` (`metrics-integration.ts:23`), but the actual call at `claimboundary-pipeline.ts:128` only passes `(jobId, "claimboundary")` — no config or searchConfig. This means `setConfig()` falls back to `DEFAULT_PIPELINE_CONFIG` and `DEFAULT_SEARCH_CONFIG`, not the actual UCM-loaded configs from lines 132-139.

**Impact:** The metrics record will show defaults, not actual runtime config (wrong provider, wrong tiering flag, etc.). Misleading for cost analysis.

**Recommendation:** Move `initializeMetrics` call to after config loading (line 140+), pass the loaded configs.

---

### Finding SD-5: `SearchQueryMetric` provider enum is stale

**Severity: LOW**

`SearchQueryMetric.provider` (`metrics.ts:40`) is typed as `'google-cse' | 'serpapi' | 'gemini-grounded'`. This misses `brave`, `wikipedia`, `semantic-scholar`, and `google-factcheck`. Any attempt to call `recordSearchQuery` with the new providers would fail TypeScript compilation.

**Recommendation:** Change to `string` or update the union to include all 7 providers.

---

## 2. LLM EXPERT — Quality & Cost

### Finding LLM-1: 25-claim test set is statistically insufficient for "accuracyRate >90%"

**Severity: HIGH**

The plan targets `accuracyRate >90%` against a 25-claim "Ground Truth" set. With n=25:

- **Confidence interval at 90% accuracy:** The 95% CI for a binomial proportion p=0.9 with n=25 is approximately [0.71, 0.98] (Wilson interval). This means even if the true accuracy is only 71%, you could observe 90%+ in a 25-sample test. Conversely, a true 95% system could test below 90% due to sampling variance.

- **Power to detect a 10pp regression:** If accuracy drops from 95% to 85%, a 25-sample test has only ~35% power to detect this at alpha=0.05. You would need ~100 claims for 80% power.

- **No stratification guarantees.** The plan says "20-30 claims" without requiring stratification by difficulty, topic, language, or claim direction. A set biased toward "easy" claims would mask verdict-stage weaknesses.

**Recommendation:** Minimum 50 claims for Alpha, stratified:
- 15+ "clearly true/false" (baseline sanity)
- 15+ "contested/mixed" (tests debate quality)
- 10+ multilingual (AGENTS.md mandate)
- 10+ with known fact-check verdicts (ground truth anchor)

**Required Ground Truth metadata fields** (to prevent teaching-to-the-test per AGENTS.md):
- `groundTruthVerdict` (7-point scale match)
- `groundTruthSource` (URL/citation for the human verdict)
- `expectedTruthRange` (e.g., 65-80%, not a point estimate — accounts for genuine ambiguity)
- `difficultyTier` (easy/medium/hard)
- `topicDomain` (generic label — NOT the claim text itself used in prompts)
- `languageCode` (ISO 639-1)
- `dateAdded` (to track set evolution)
- `knownContrarianEvidence` (boolean — does public counter-evidence exist?)

---

### Finding LLM-2: Prompt caching (`cacheControl`) is already partially implemented

**Severity: MEDIUM** (plan underestimates current state)

The plan's Phase 3 says "implement `cacheControl` for system prompts" as future work, but `getPromptCachingOptions` already exists in `llm.ts` and is already applied in `createProductionLLMCall` at line 3972:

```typescript
providerOptions: getPromptCachingOptions(activeModel.provider),
```

This sets Anthropic's `cacheControl: { type: 'ephemeral' }` on system messages. **The infrastructure exists.** What's missing is:

1. **Cache hit rate observability** — no metric tracks whether Anthropic returned a cache hit. The response includes `usage.cacheCreationInputTokens` and `usage.cacheReadInputTokens` which are not captured.
2. **Only Stage 4** benefits. Stages 1-3 call `generateText` directly without `getPromptCachingOptions`.

**Recommendation:** Rename Phase 3 caching scope from "implement" to "extend and measure". Add `cacheCreationTokens` and `cacheReadTokens` to `LLMCallMetric`. Apply `getPromptCachingOptions` to all stages.

---

### Finding LLM-3: Batch API latency trade-off not analyzed

**Severity: MEDIUM**

The plan mentions "Anthropic Batch API support for background jobs" but doesn't address:

1. **Batch API is asynchronous** — results return in up to 24 hours. The current pipeline is synchronous (`runClaimBoundaryAnalysis` returns a result). Batch mode would require a fundamentally different job lifecycle: submit -> poll -> resume.

2. **Structured output compatibility** — Batch API supports `tool_use` and `json_mode` but the interaction with AI SDK's `Output.object({ schema })` wrapper is untested. The SDK may not support batch mode natively.

3. **Claim interdependency** — The verdict stage's 5-step debate is sequential (advocate -> consistency check -> challenge -> reconcile -> validate). Batch API cannot parallelize these because each step depends on the previous output.

**Impact:** The "50-90% cost reduction" claim is aspirational but not grounded in architecture analysis. Batch API could help for the ~40% of LLM calls that are independent (claim extraction, query generation, relevance classification), but the verdict debate chain cannot be batched.

**Recommendation:** Quantify the realistic savings: identify which specific LLM calls are batchable vs. sequential. Estimate 50% discount on ~40% of calls = ~20% total cost reduction, not 50-90%.

---

### Finding LLM-4: Token estimation in metrics is unreliable

**Severity: LOW**

Stage 1 metrics at line 198-200 use `text.length / 4` as a token approximation. Stage 2 records `totalTokens: 0`. AI SDK returns actual `usage.promptTokens` and `usage.completionTokens` from the API — these should be captured from the `result` object, not estimated.

**Recommendation:** Extract actual token usage from `result.usage` in all `recordLLMCall` calls, as `createProductionLLMCall` already does correctly (line 4070-4072).

---

## 3. WEB SEARCH EXPERT — Multi-Source Retrieval

### Finding WS-1: MSR-M3 age gate is viable but has a timezone edge case

**Severity: MEDIUM**

The MSR plan specifies age gating via `factCheckApi.maxAgeDays` (default 365). The `reviewDate` from Google Fact Check API is an ISO date string. The comparison is straightforward.

**Edge case:** Google Fact Check API returns `reviewDate` per review, but some reviews have no date. The plan's Phase 3.5 says `reviewDate: string | null`. If null, the age gate should **reject** (fail-safe), not accept — undated reviews from defunct fact-checkers could be decades old.

**Recommendation:** Explicitly specify: `if (!reviewDate) skip` in the MSR-M3 implementation. Document this in the plan.

---

### Finding WS-2: MSR-M4 deduplication within `runResearchIteration` requires careful injection point

**Severity: HIGH**

The plan says extracted evidence from fetched fact-check articles should carry `linkedFactCheckId` pointing back to the seeded metadata item, and that the verdict stage should prefer the extracted version. But the current `runResearchIteration` flow is:

```
searchWebWithProvider -> classifyRelevance -> fetchSources -> extractResearchEvidence -> filterByProbativeValue -> push to state
```

Pre-qualified URLs would skip step 1 (search) but still go through steps 2-6. **The problem:** `extractResearchEvidence` at line 2420 doesn't know about `linkedEvidenceId`. To tag extracted evidence with `linkedFactCheckId`, you'd need to:

1. Pass the `linkedEvidenceId` through the entire chain
2. OR post-process: match extracted items by URL back to the pre-qualified URL's `linkedEvidenceId`

Option 2 is simpler but fragile (URLs can redirect, normalize differently). Option 1 requires threading context through 3 function signatures.

**The supersession logic in verdict stage is also unspecified architecturally.** The plan says "aggregation skips superseded items" but `aggregation.ts` has no concept of `isSuperseded`. This requires changes to the aggregation weight chain.

**Recommendation:** (a) Use option 2 (URL-based post-match) with URL normalization. (b) Explicitly scope the `isSuperseded` filter to `aggregation.ts` and specify where in the weight chain it sits (before or after probative value weighting).

---

### Finding WS-3: Circuit breaker coverage for Wikipedia and Semantic Scholar

**Severity: MEDIUM**

The providers are wired into `web-search.ts` with circuit breaker calls via the same `isProviderAvailable` / `recordSuccess` / `recordFailure` pattern as existing providers. **This is correct and sufficient for Alpha.**

However:

1. **Semantic Scholar's 1 RPS rate limit + serialized queue** means the circuit breaker's failure threshold (default 3) could trigger during normal rate-limit delays. If S2 returns 429 three times in a burst (before the queue can serialize), the circuit opens for the full `resetTimeout` (default 60s). During a multi-claim research loop this could cause S2 to be unavailable for an entire iteration.

2. **Wikipedia has no rate limit** but the circuit breaker is still applied. Wikipedia's reliability is very high (>99.9% uptime), so the circuit breaker adds overhead without meaningful protection. A `circuitBreaker.skipProviders` config option would be cleaner.

**Recommendation:** (a) For S2, set `failureThreshold` higher (5+) to account for rate-limit 429s that the serialized queue will naturally resolve. (b) Document that 429s from rate-limited providers should be treated as "expected backpressure" not "failures" in the circuit breaker — consider a separate `isRateLimitError` check that doesn't count toward the failure threshold.

---

### Finding WS-4: Google Fact Check API low recall acknowledged but plan has no fallback

**Severity: LOW**

The MSR plan correctly notes ~15% recall for the Fact Check API. The plan is fail-open (no results = no impact). This is fine for Alpha.

However, the Alpha Acceleration Plan expects MSR to "reduce evidence pool asymmetry (C13) by leveraging non-web sources." If all three new sources (Wikipedia, S2, Fact Check) return zero results for a given claim (which is likely for niche or non-English topics), C13 improvement is zero. The plan has no fallback strategy for this scenario.

**Recommendation:** Add a metric `msrYieldRate` — percentage of claims where at least one new-source result was useful. If this is below 30% in validation, the C13 improvement claim should be softened.

---

## 4. PORTFOLIO DRIFT RISKS

| Risk | Conflicting Items | Severity |
|------|-------------------|----------|
| **Model auto-resolution vs. Backlog deferral** | Alpha Plan Phase 1 says "implement now" but Backlog defers to v1.1. These conflict. | **HIGH** — the 2026-02-23 incident (stale `claude-3-5-haiku-20241022`) proves this is an active risk, not v1.1-deferrable |
| **Metrics integration: trivial but unfunded** | Backlog says "15-30 min, HIGH/HIGH", Current_Status says "built but not connected", plan says "verify completeness". Nobody has done the 15-minute wiring task. | **MEDIUM** — blocks Phase 1 acceptance gate |
| **B-sequence validation not run** | Backlog item #1 (HIGH/HIGH): "$3-5 real runs". Plan Phase 2.3 says "run 2-3 analyses". These are the same task described twice. | **LOW** — alignment is good, just needs scheduling |
| **Claim Fidelity Phase 3 ambiguity** | WIP says "applied but not committed". If uncommitted, MSR Phase 3.4 integration will hit merge conflicts in `claimboundary-pipeline.ts` | **MEDIUM** — verify git status before starting MSR Phase 3 |

---

## 5. SURGICAL FIXES (Top 3)

### Surgical Fix 1: Wire metrics in 30 minutes (unblocks Phase 1 acceptance gate)

The single highest-ROI task. Three changes:

1. Move `initializeMetrics(input.jobId, "claimboundary", initialPipelineConfig, initialSearchConfig)` to line 140 (after config load)
2. Add `recordLLMCall` inside `generateResearchQueries`, `classifyRelevance`, and `extractResearchEvidence` — they already have `result.usage` available
3. Add `debateRole?: string` to `LLMCallMetric` and pass it from `createProductionLLMCall`

This closes the observability gap and enables per-role cost attribution with minimal code.

### Surgical Fix 2: Add `msrYieldRate` and `cacheHitRate` to acceptance metrics

The plan's success metrics table (section 4) has no metric for MSR effectiveness or cache savings. Add:

| Metric | Target | Verification |
|--------|--------|-------------|
| `msrYieldRate` | >30% of claims get at least 1 non-web-search evidence | Count in research loop |
| `cacheHitRate` | >50% of prompt tokens from cache on repeat analyses | Extract `cacheReadInputTokens` from API response |

These are cheap to measure and validate the Phase 2 and Phase 3 value propositions respectively.

### Surgical Fix 3: Version-lock as default for Alpha, `-latest` as opt-in

Invert the model-resolver default: Alpha ships with pinned model IDs (the current behavior) and the resolver adds a UCM toggle `modelResolution: "pinned" | "latest"` (default: `"pinned"`). This prevents surprises during Alpha testing. Once validation passes, flip to `"latest"` for production.

This is a 1-line config change that eliminates the risk of a `-latest` alias change breaking structured output mid-Alpha.

---

## Summary Table

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Senior Developer (Observability) | 1 (SD-1) | 2 (SD-2, SD-3) | 1 (SD-4) | 1 (SD-5) |
| LLM Expert (Quality/Cost) | 0 | 1 (LLM-1) | 2 (LLM-2, LLM-3) | 1 (LLM-4) |
| Web Search Expert (MSR) | 0 | 1 (WS-2) | 2 (WS-1, WS-3) | 1 (WS-4) |
| **Total** | **1** | **4** | **5** | **3** |

**Overall assessment:** The plan's direction is sound and well-aligned with Backlog priorities. However, it overstates the current observability baseline (SD-1 is a blocker) and underestimates the complexity of Batch API integration (LLM-3). The three surgical fixes address the highest-impact gaps with minimal effort.

---

## 6. FOLLOW-UP REVIEW (Post-Revision)

**Date:** 2026-02-25 (same session)
**Context:** Lead Architect (Gemini CLI) revised the plan incorporating findings from sections 1-5 above. Plan status changed to "Approved / Execution-Ready". This section reviews the delta.

### Findings Addressed (Confirmed Fixed)

| Finding | Resolution in Plan v2 | Status |
|---------|----------------------|--------|
| **SD-1** (CRITICAL) Metrics gaps | Phase 1.1 now lists all 4 sub-actions (move init, per-iteration Stage 2, add Stage 3/5, capture real tokens). Acceptance gate requires non-zero tokens. | **Resolved** |
| **SD-2** (HIGH) Per-role attribution | `debateRole` on `LLMCallMetric` + B-1 bridging explicitly called out. Acceptance gate includes `debateRole`. | **Resolved** |
| **SD-3** (HIGH) `-latest` risk | Version-lock default for Alpha, `-latest` opt-in via UCM. | **Resolved** |
| **SD-4** (MED) initializeMetrics mismatch | "Move `initializeMetrics` after config load" in action list. | **Resolved** |
| **LLM-1** (HIGH) Test set size | Bumped to 50 claims with 4 stratification bands (15 sanity, 15 contested, 10 multilingual, 10 fact-check). | **Resolved** |
| **LLM-2** (MED) Prompt caching scope | Phase 3 now says "Extend `cacheControl` to all stages and measure `cacheHitRate`". | **Resolved** |
| **LLM-3** (MED) Batch API realism | Cost target corrected to 20-30%. Sequential constraint acknowledged. Batch scoped to Stages 1-2 only. | **Resolved** |
| **WS-2** (HIGH) MSR-M4 dedup | URL-based post-match for `linkedFactCheckId` explicitly chosen. | **Resolved** |
| Surgical Fix 2 (metrics) | `msrYieldRate` and `cacheHitRate` both added to acceptance gates (section 4). | **Resolved** |

### Remaining Gaps

#### Gap R-1: Ground Truth metadata fields not specified

**Severity: MEDIUM**

The plan now says "50-claim test set with ground-truth metadata" and defines 4 stratification bands, but doesn't specify the **required metadata fields per claim**. The original review proposed 8 fields (`groundTruthVerdict`, `groundTruthSource`, `expectedTruthRange`, `difficultyTier`, `topicDomain`, `languageCode`, `dateAdded`, `knownContrarianEvidence`). Without these in the plan, the QA/Tester assigned in section 6 has no schema to work from.

**Risk:** The test set gets curated as a flat list of claims + expected verdicts, missing the range-based tolerance and stratification metadata needed to prevent teaching-to-the-test.

**Recommendation:** Add a sub-bullet under Phase 2.2 specifying the minimum metadata schema, or reference a separate Ground Truth spec document.

#### Gap R-2: `SearchQueryMetric` stale enum (SD-5) not mentioned

**Severity: LOW**

SD-5 flagged that `SearchQueryMetric.provider` is typed as `'google-cse' | 'serpapi' | 'gemini-grounded'` — missing 4 new providers. Compile-time blocker if Phase 1 wires up `recordSearchQuery` for MSR providers. Trivially fixable during implementation.

#### Gap R-3: MSR-M3 null `reviewDate` fail-safe behavior (WS-1) not specified

**Severity: LOW**

The plan adopted URL-based post-match for dedup (WS-2) but didn't address the WS-1 finding: what happens when `reviewDate` is null in the age gate? Should be fail-safe (reject undated reviews). Implementation detail, not plan-level, but should be noted in the MSR plan as a design constraint.

#### Gap R-4: `isSuperseded` aggregation integration still unspecified (WS-2 residual)

**Severity: MEDIUM**

The plan adopted URL-based post-match for `linkedFactCheckId` tagging, but the **second half** of WS-2 — where `isSuperseded` gets filtered in `aggregation.ts` — is not addressed. The current `aggregation.ts` has no concept of superseded evidence items.

**Recommendation:** Add to Phase 2.1: "Implement `isSuperseded` filter in `aggregation.ts` (pre-weight, skip items where `isSuperseded === true`)."

#### Gap R-6: Portfolio drift — Backlog still defers model auto-resolution to v1.1

**Severity: MEDIUM**

The plan now has model auto-resolution as Phase 1 Priority #2 with "Approved / Execution-Ready" status. But `Docs/STATUS/Backlog.md` still lists this as "Deferred to v1.1". Next agent reading Backlog could deprioritize this.

**Recommendation:** Update `Backlog.md` to move model auto-resolution from "Deferred to v1.1" to "Alpha Remaining Work", cross-referencing this plan.

### Follow-Up Summary

| Status | Count | Items |
|--------|-------|-------|
| **Resolved** | 9 of 13 original findings | SD-1 through SD-4, LLM-1 through LLM-3, WS-2, all 3 surgical fixes |
| **Remaining (Medium)** | 3 | R-1 (ground truth schema), R-4 (`isSuperseded` in aggregation), R-6 (Backlog drift) |
| **Remaining (Low)** | 2 | R-2 (stale enum), R-3 (null reviewDate) |

**Verdict:** The revision is solid. All Critical and High findings were incorporated correctly. The 3 Medium gaps are addressable in 15 minutes. The plan is execution-ready with those additions.

---

## 7. STRATEGIC REVIEW (Priorities, Cost Control & Risk)

**Date:** 2026-02-25 (same session, third pass)
**Focus:** Are priorities right for better reports? Cost control? Risk management?

### Finding S-1: Phase 1 Observability is ALREADY DONE — plan doesn't know it

**Severity: HIGH (priority misalignment)**

The Lead Architect's own Agent_Outputs.md entry says: *"wired recordLLMCall into all CB pipeline stages with debateRole and actual token usage; moved initializeMetrics after config load."* The codebase confirms 12 `recordLLMCall` sites across all 5 stages with actual `result.usage` tokens and `debateRole` on verdict calls. Phase 1.1 is **done**.

**Impact:** If a developer picks up this plan, they'll spend a day verifying work that's already complete.

**Recommendation:** Mark Phase 1.1 as complete. Remaining Phase 1 work is only model auto-resolution.

### Finding S-2: Acceptance gate phase names don't match the code

**Severity: MEDIUM**

Plan says metrics keys: `[understand, research, cluster, verdict, aggregate]`. Code uses: `[understand, research, summary, verdict, report]`. The `startPhase()` signature is typed as `'understand' | 'research' | 'verdict' | 'summary' | 'report'`. There is no `"cluster"` or `"aggregate"` phase.

**Recommendation:** Fix acceptance gate to `[understand, research, summary, verdict, report]`, or rename phases in code.

### Finding S-3: `durationMs` is 0 for all LLM calls

**Severity: MEDIUM (not caught in any previous review)**

All 12 `recordLLMCall` calls set `durationMs: 0`. Comment at line 894: *"Duration not exposed by generateText directly without wrapper"*. Per-call latency is invisible — phase-level timing exists via `startPhase/endPhase` but individual call timing does not.

**Impact:** Phase 3 cost optimization cannot identify which calls are slow (latency = concurrency opportunity) without per-call duration data.

**Recommendation:** Wrap each `generateText` call with `Date.now()` before/after. Same pattern as `createProductionLLMCall` (line 3819).

### Finding S-4: B-sequence validation is the HIGHEST-ROI quality task and the plan dropped it

**Severity: CRITICAL (strategic gap)**

The original plan had "B-sequence & Fidelity Validation Runs" as Phase 2.3. **The revised plan removed it.** Phase 2 now only has MSR integration and accuracy test set.

Backlog.md item #1 (HIGH/HIGH): *"Validate B-sequence features with real runs (~$3-5)"*. B-sequence includes:
- **B-5a**: Claim fidelity (assertion-level accuracy)
- **B-6**: Verifiability annotation per claim
- **B-7**: Misleadingness detection
- **B-8**: Explanation quality rubric scoring

All implemented and committed but **never run with real LLM data**. We don't know if they work.

| Task | Cost | Quality Signal |
|------|------|---------------|
| B-sequence validation run | $3-5 | Confirms 4 quality features actually work |
| MSR Phase 3 integration | 4-6 days dev | Adds new evidence sources (may or may not help) |
| 50-claim test set curation | 2-3 days + $5-10 run | Measures accuracy (doesn't improve it) |

**The plan prioritizes measuring quality (test set) and adding features (MSR) over validating features that already exist.** That's backwards.

**Recommendation:** Add **"Phase 1.75: B-Sequence Validation Run"** — 2-3 real analyses ($3-5), verify B-5a/B-6/B-7/B-8 produce correct output. Gate Phase 2 on this — don't build new features on unvalidated ones.

### Finding S-5: Reduced budget constraints are the biggest silent quality risk

**Severity: HIGH**

On 2026-02-13, research budgets were cut:
- Max iterations: 5 → 3
- Max total iterations: 20 → 10
- Token cap: 750K → 500K

This is a **25-40% reduction in research depth**. The plan targets `accuracyRate >90%` without acknowledging this. If the test set fails, is it a pipeline bug or research starvation?

**Recommendation:** Add to Phase 2.2 acceptance criteria: *"If accuracyRate <90%, re-run failed claims with pre-reduction budgets (iterations=5, tokens=750K) to isolate budget constraints as cause."* Costs ~$2-3 extra but prevents misdiagnosis.

### Finding S-6: Model auto-resolution doesn't improve reports

**Severity: MEDIUM (priority question)**

Model auto-resolution prevents stale-model API errors. It does **not** improve verdict accuracy, evidence diversity, report explanations, or neutrality. It's operational stability, not quality.

Meanwhile, B-sequence validation ($3-5) and D5 contrarian retrieval tuning are direct quality improvements sitting in Phase 2 or unscheduled.

**Recommendation:** Keep model-resolver in Phase 1, but elevate B-sequence validation and a D5 contrarian test run to Phase 1 as well. They're cheaper ($3-5 combined) and directly validate quality.

### Finding S-7: Validation lanes missing pass/fail criteria and campaign budget

**Severity: MEDIUM (cost governance gap)**

Phase 1.5's 3-lane system is smart, but:

1. **No "pass" definition for Lane 1 or Lane 2.** What metric from a canary run says "proceed"? Suggested: Lane 1 passes if `extractedClaimsCount > 0 AND verdictStage completed without error`. Lane 2 passes if `accuracyRate ≥ 80% on 5-claim pilot`.

2. **No campaign budget.** If Lane 1 fails 3× ($3-6 wasted), there's no ceiling. 50 claims × $0.50-1.50 = $25-75 for Lane 3. Add: *"Total validation campaign budget: $50. Escalate to Captain if exceeded before Lane 3 completes."*

3. **$5 stop-rule is per-job, not per-campaign.** 50 individual jobs at $4.99 each = $250 total.

### Finding S-8: Verdict stage cost (75% of budget) — plan ignores the biggest cost lever

**Severity: MEDIUM (missed optimization)**

Verdict stage: 5× Sonnet + 2× Haiku = 7 calls per claim batch = **75% of LLM budget**. Phase 3 proposes Batch API + caching (4-6 days dev, 20-30% savings) targeting mostly Stages 1-2 (the cheap parts).

**Zero-cost UCM tuning alternatives:**
- Self-consistency: 2× Sonnet → 1× Sonnet (save ~15% total job cost)
- Self-consistency tier: Sonnet → Haiku (save ~10% more)
- Both combined: ~25% savings, zero dev time

**Recommendation:** Add to Phase 1.75 or Phase 2: *"Cost-quality tuning: Test self-consistency with 1 run (vs 2) and Haiku tier (vs Sonnet). Measure accuracy delta. If <2pp degradation, adopt as Alpha default."* $5-10 experiment that could save more than Batch API.

### Finding S-9: Two highest-probability Alpha risks missing from risk section

**Severity: HIGH (risk blind spots)**

**Missing Risk 1: LLM provider outage during benchmark.** Anthropic/OpenAI have had multi-hour outages. A rate-limit storm during Lane 3 wastes money on partial results. **Mitigation:** Checkpoint/resume for validation runner — resume from last successful claim, not from scratch.

**Missing Risk 2: MSR evidence quality regression.** Adding Wikipedia/S2 increases volume but may decrease average quality. If probativeValue filter passes these at the same rate as web search, verdict quality could degrade. **Mitigation:** Before/after comparison: same 5 claims with and without MSR sources. If verdict confidence or accuracy drops, investigate before enabling MSR by default.

### Revised Priority Recommendation

| Priority | Task | Cost | Days | Impact |
|----------|------|------|------|--------|
| 1 | ~~Observability~~ DONE | $0 | 0 | — |
| 2 | Fix `durationMs: 0` + phase name alignment (S-2, S-3) | $0 | 0.5 | Observability |
| 3 | **B-sequence validation run** (S-4) | $3-5 | 0.5 | **Quality validation** |
| 4 | **Self-consistency cost tuning** (S-8) | $5-10 | 0.5 | **10-25% cost cut** |
| 5 | Model auto-resolution | $0 | 1-2 | Stability |
| 6 | Validation lane criteria + campaign budget (S-7) | $0 | 0.5 | Cost governance |
| 7 | MSR Phase 3 integration | $0 | 4-6 | Quality (evidence) |
| 8 | MSR before/after quality check (S-9.2) | $5-10 | 0.5 | Risk mitigation |
| 9 | 50-claim test set + Lane 2 pilot | $5-10 | 2-3 | Quality measurement |
| 10 | Batch API + cache extension | $0 | 4-6 | 20-30% cost cut |

### Strategic Summary

| Finding | Severity | Category |
|---------|----------|----------|
| S-1: Phase 1.1 already done | HIGH | Priority misalignment |
| S-2: Phase names don't match code | MEDIUM | Acceptance gate error |
| S-3: `durationMs` always 0 | MEDIUM | Observability gap |
| S-4: B-sequence validation dropped | **CRITICAL** | Missing quality gate |
| S-5: Reduced budgets unacknowledged | HIGH | Silent quality risk |
| S-6: Model resolver doesn't improve reports | MEDIUM | Priority question |
| S-7: Validation lanes missing criteria | MEDIUM | Cost governance gap |
| S-8: Verdict cost tuning ignored | MEDIUM | Missed optimization |
| S-9: Two high-prob risks missing | HIGH | Risk blind spots |

**Bottom line:** The plan optimizes for infrastructure when the biggest unknown is whether reports are actually good. A $3-5 B-sequence validation run and a $5-10 self-consistency tuning experiment would answer this in 1 day, before investing 4-6 days in MSR integration or test set curation.

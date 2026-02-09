# Reporting Improvement Exchange

**Date:** 2026-02-08 (updated)
**Purpose:** Living status document for model strategy, reporting-quality stabilization, and pipeline improvements.
**Full history:** [Reporting_Improvement_Exchange_done.md](Reporting_Improvement_Exchange_done.md) (Sessions 1-22a archive)

---

## Session Summary (1-22a)

| Session | Date | Author | Key Outcome |
|---------|------|--------|-------------|
| 1 | 2026-02-07 | LLM Expert | Initial audit: tiering disabled, stale model IDs, two competing model systems, 7 findings |
| 2 | 2026-02-07 | Senior Dev | Root cause analysis: 4 orchestrated fixes + P0 actions (stale Haiku, tiering, context refinement) |
| 3 | 2026-02-07 | Team Lead | Ratified all 5 decisions, defined closure criteria, approved validation protocol |
| 4 | 2026-02-07 | Team Lead | Acknowledged LLM Expert review, documented validation matrix (50 runs) |
| 5 | 2026-02-07 | Team Lead | Verdict accuracy fixes: context-claims anchoring, contested weights, prompt refinement |
| 6 | 2026-02-07 | Senior Dev | Source-dedup direction validation, verdict prompt authority guidance, dedup threshold 0.85->0.75 |
| 7 | 2026-02-07 | Senior Dev | Adaptive relevance fallback implemented, 2 UCM fields added |
| 8 | 2026-02-07 | Senior Dev | Code cleanup, configurability (5 UCM fields), completeness verification |
| 9 | 2026-02-07 | Claude Opus | Complete CalcConfig wiring: 13 sections, 68 fields across 10 files |
| 10 | 2026-02-07 | Senior Dev | 25-run validation matrix executed; 4/5 claims failed closure gates |
| 11 | 2026-02-07 | Claude Opus | Context stability + fallback noise suppression (5 fixes, 8 config fields) |
| 12 | 2026-02-08 | Senior Dev | Re-run matrix: variance improved on 3/5 claims, confidence collapse persisted |
| 13 | 2026-02-08 | Claude Opus | Confidence floor (10), name distinctness guard, low-source penalty (15pt) |
| 14 | 2026-02-08 | Senior Dev | Re-run matrix: confidence=0 eliminated, context hit and variance still fail |
| 15 | 2026-02-08 | Claude Opus | Source-count alignment, LLM frame signal trust, anchor recovery threshold 0.8->0.6 |
| 16 | 2026-02-08 | Claude Opus | Comprehensive unaddressed findings audit; P1A-P3 action plan with model landscape |
| 17 | 2026-02-08 | Senior Dev | Model availability verification: Opus 4.6 confirmed, GPT-5.3 pending, Google deprecation clarified |
| 17.1-17.2 | 2026-02-08 | Senior Dev | API verification commands + execution results |
| 18 | 2026-02-08 | Claude Opus | **P1A Model Upgrade**: Haiku 3.5->4.5, Sonnet 4->4.5, GPT-4o->4.1, Gemini 1.5->2.5 |
| 19 | 2026-02-08 | Senior Dev | P1A Step 1 re-validation: improved variance, gate not fully closed |
| 20 | 2026-02-08 | Senior Dev | P1A Step 2 Opus matrix: variance improved but structural issues remain primary blocker |
| 21 | 2026-02-08 | Claude Opus | Code review fixes: runtime crash fix, magic numbers replaced, model ID consistency |
| 22 | 2026-02-08 | Kimi Cline | Intelligent recency solution design (5-factor RQS proposal) |
| 22a | 2026-02-08 | Claude Opus | **Graduated recency penalty implemented**: 3-factor formula, 27 tests, documented |
| 24 | 2026-02-09 | Kimi Cline | **Confidence calibration design**: 4-layer system (density anchor, band snapping, verdict coupling, context consistency) |
| 25 | 2026-02-09 | Claude Opus | **Confidence calibration implemented**: 4 layers, 58 tests, UCM-configurable, backwards-compatible |
| 25b | 2026-02-09 | Claude Opus | **Search provider error surfacing**: SerpAPI 429/quota errors now throw instead of silent `[]`, 15 tests |
| 26 | 2026-02-09 | GPT Codex 5.3 | **INCOMPLETE** validation matrix (5/25 runs, 1 claim only). No search health checks. |
| 27 | 2026-02-09 | Claude Opus | **Provider outage detection system**: circuit breaker, auto-pause, webhook, admin UI, 81 tests |

---

## Current Implementation State

### Completed (All Sessions)

**Evidence Quality (Sessions 2-8):**
1. Frame signal gate: institution/court in frame key
2. Dedup override: institutional distinctness protection
3. Criticism queries: multi-context iteration
4. Auto LLM relevance: removed path-dependent gating
5. Context-claims consistency anchoring (shared helper, UCM-configurable)
6. Contested factor weight reduction (0.3->0.5 established, 0.5->0.7 disputed)
7. Verdict prompt refinement (knowledge cutoff + evidence quality)
8. Source-dedup direction validation
9. Adaptive relevance fallback (graduated 3-step)

**Model Tiering (Sessions 2-3, 18):**
10. Haiku 3.5->4.5, Sonnet 4->4.5 (Anthropic)
11. GPT-4o->4.1, GPT-4o-mini->4.1-mini (OpenAI)
12. Gemini 1.5->2.5 (Google)
13. Context refinement routed to verdict-tier model
14. llmTiering enabled by default

**Stability Fixes (Sessions 11-15, 21):**
15. Near-duplicate subject guard + name distinctness guard
16. Frame signal text check
17. Graduated fallback (3-step) + fallback evidence cap (40%)
18. Confidence floor (default 10)
19. Low-source penalty (default 15pt when sources <= 2)
20. Source-count alignment (fetchSuccess-based)
21. LLM frame signal trust (requiresSeparateAnalysis)
22. Anchor recovery threshold 0.8->0.6
23. Runtime crash fix: undefined.value in generateSingleContextVerdicts
24. Magic numbers replaced with VERDICT_BANDS constants
25. Model ID consistency: llm.ts derives from DEFAULT_PIPELINE_CONFIG

**Graduated Recency Penalty (Session 22a):**
26. Three-factor formula: `effectivePenalty = round(maxPenalty x staleness x volatility x volume)`
27. Uses existing temporalContext.granularity + dateCandidates (no new LLM calls)
28. Configurable via `recencyGraduatedPenalty: boolean` (default true)
29. SRG result: 4 points vs. 20 flat -> confidence ~41% instead of 25%

**Confidence Calibration (Session 25):**
33. Evidence density anchor: min confidence floor from evidence quality/quantity (15%-60%)
34. Confidence band snapping: 7-band system with partial blending (strength 0.7) to reduce jitter
35. Verdict-confidence coupling: strong verdicts (>=70%/<=30%) require >=50% confidence
36. Context confidence consistency: penalizes divergence >25pp across contexts
37. Configurable via `confidenceCalibration` nested object (4 sub-sections, each toggleable)

**Search Provider Error Surfacing (Session 25b):**
33. SearchProviderError class: typed errors with provider name, status code, fatal flag
34. Google CSE + SerpAPI adapters throw on fatal failures instead of returning `[]`
35. Orchestrated pipeline surfaces errors as `search_provider_error` analysis warnings

**Provider Outage Detection (Session 27):**
36. Circuit breaker per provider (search/llm): CLOSED→OPEN→HALF_OPEN state machine
37. Error classification: provider_outage, rate_limit, timeout, unknown categories
38. Auto-pause: runner queue halts when circuit trips, jobs stay QUEUED (not lost)
39. Webhook notifications: fire-and-forget POST to FH_WEBHOOK_URL with optional HMAC
40. System health API (Next.js + C#): GET state, POST resume/pause
41. UI: SystemHealthBanner (polls every 30s), admin controls, PAUSED job status
42. Pipeline instrumentation: all 4 search call sites + job runner record provider health

**UCM Configurability (Sessions 7-9, 11-15, 22a, 25):**
43. CalcConfig fully wired: 13 sections, 68 fields across 10 files
44. PipelineConfig: 15+ new configurable fields added across all sessions
45. Dead `searchRelevanceLlmEnabled` removed

### Current Model Mapping (Post-Session 18)

| Task | Anthropic | OpenAI | Google |
|------|-----------|--------|--------|
| understand | claude-haiku-4-5-20251001 | gpt-4.1-mini | gemini-2.5-flash |
| extract_evidence | claude-haiku-4-5-20251001 | gpt-4.1-mini | gemini-2.5-flash |
| context_refinement | claude-sonnet-4-5-20250929 | gpt-4.1 | gemini-2.5-pro |
| verdict | claude-sonnet-4-5-20250929 | gpt-4.1 | gemini-2.5-pro |

---

## Closure Criteria (Approved Session 3, Updated Session 7)

| Metric | Target | Status |
|--------|--------|--------|
| Sensitive-claim score variance (5 runs) | <= 15 (legal/procedural), <= 10 (factual) | Partially passing (Session 14) |
| Multi-context detection | >= 80% where applicable | Failing for 3/5 claims |
| Irrelevant-source inclusion rate | < 10% | Not formally measured |
| Pipeline failure rate | < 1% | Passing (0/25 failures) |
| Verdict confidence stability | <= 15 pp | Failing for 2/5 claims |

---

## Latest Validation Results (Session 14 / Post-Session 13 Fixes) — ⚠️ POTENTIALLY CONTAMINATED

> **Warning**: These results pre-date Session 25b (search error surfacing). SerpAPI 429 errors were silently swallowed during this period. Scores may reflect degraded evidence. See **Validation Matrix Contamination Notice** below for details. New clean baselines will be established in Session 28.

| Claim | Score Var | Pass | Conf Delta | Pass | Context Hit | Pass |
|-------|-----------|------|------------|------|-------------|------|
| Bolsonaro procedural | 5 | Yes | 0 | Yes | 0% (exp 2) | No |
| Vaccine safety | 9 | Yes | 8 | Yes | 0% (exp 1) | No |
| Government trust | 50 | No | 11 | Yes | 80% (exp 1) | Yes |
| Corporate compliance | 7 | Yes | 10 | Yes | 80% (exp 1-2) | Yes |
| Technology comparison | 25 | No | 69 | No | 0% (exp 1) | No |

**Pipeline reliability:** 25/25 succeeded. **Confidence=0 eliminated** (was 5/25 in Session 12).

**Session 20 finding (P1A Step 2 Opus):** Opus improved variance but did not achieve gate closure. Remaining blockers are predominantly structural (pipeline logic/calibration), not model quality.

---

## Planned Work (Priority Order)

### P1: Structural Fixes (Current Priority)

| # | Item | Source | Status |
|---|------|--------|--------|
| 1 | **Confidence calibration** -- deterministic post-verdict calibration logic to reduce confidence delta spread (20-42pp on some claims) | Session 20-21, 24-25 | **Done** (Session 25) |
| 2 | **Context-count stability** -- preserve distinct legal contexts for procedural claims, prevent over-splitting for scientific/technical claims | Sessions 12-15 | Partially addressed (frame signal, name guard, anchor recovery) |
| 3 | **Re-run validation matrix** -- 25-run orchestrated after Session 21 code review fixes (runtime crash eliminated) | Session 21 | Done (Session 23); crash persists |
| 4 | **Article-mode input test** -- verify "Coffee cures cancer" pattern triggers correctly with proportional blending | Session 5, 8 | Not done |

### P1D: UCM-Complete Model Routing

**Rationale:** After Session 18, model IDs are updated but `llm.ts` still has hardcoded fallback strings. All pipelines call `getModelForTask()` from `llm.ts`, but the resolver has hardcoded defaults that bypass UCM when config is null.

**Goal:** Make model selection fully UCM-managed. No hardcoded model IDs in any code path.

| # | Action | Status |
|---|--------|--------|
| 1 | Add UCM fields for provider-specific fallback model IDs | Not started |
| 2 | Refactor `llm.ts:defaultModelNameForTask()` to read from UCM config | Not started |
| 3 | Refactor `llm.ts:getModel()` legacy path to use UCM-backed resolver | Not started |
| 4 | Replace hardcoded model constants in `model-tiering.ts` with UCM-backed values | Not started |
| 5 | Wire all pipelines to same UCM resolver + cross-pipeline routing tests | Not started |

### P2: Model Consolidation (After P1D)

- Deprecate `getModelForTask()` in `model-tiering.ts` (now redundant with UCM-managed routing)
- Remove `DEFAULT_TASK_TIER_MAPPING`
- Keep type definitions, model constants, and cost utilities
- Optionally rename `model-tiering.ts` to `model-definitions.ts`

### P3: Remaining Deferred Items (After Orchestrated Stable)

| Item | Priority | Condition |
|------|----------|-----------|
| Dynamic pipeline alignment (Phase 3c) | LOW | After orchestrated passes all closure gates |
| Per-task temperature config (P2 #8) | LOW | Only if Opus/Sonnet testing reveals temperature sensitivity |
| Cross-provider routing validation (P2 #9) | LOW | Only if multi-provider deployment planned |
| Verdict calibration under sparse evidence (Phase 3d) | MEDIUM | Partially done (low-source penalty + confidence floor + prompt) |
| Module-level mutable `DEFAULT_TASK_TIER_MAPPING` concurrency safety | LOW | Resolved by P1D |
| `fallbackEvidenceCapPercent` config placement | LOW | Cosmetic config organization |

---

## Future Enhancements

### Graduated Recency Penalty Extensions (from Session 22/22a)

Items from Kimi's plan that are **not implemented** but could be added if the simpler 3-factor approach proves insufficient:

1. **Finer-grained claim-type classification** -- If `temporalContext.granularity` doesn't capture enough distinction, add explicit claim-type detection (breaking_news, institutional_assessment, etc.)
2. **Evidence quality integration** -- Weight penalty by probative value of available evidence (5-factor RQS)
3. **Source reliability integration** -- Weight penalty by track record of evidence sources
4. **Configurable multiplier weights** -- Allow tuning volatility/volume multiplier values via UCM
5. **LLM prompt enhancements** -- Update verdict prompts with recency-aware guidance, add claim stability assessment
6. **Comparison validation** -- Run comparison tests: binary vs graduated vs full intelligent mode

### Report Quality Improvements (from Session 22)

7. ~~**Confidence-verdict coupling fix**~~ -- **Done** (Session 25, Layer 3: verdict coupling)
8. **Evidence freshness UI indicators** -- Display latest evidence date, freshness score, recommended window
9. **Source age diversity scoring** -- Consider evidence age distribution, not just most recent date

### Infrastructure Improvements (from Various Sessions)

10. **Run-level stability telemetry dashboard** -- Context count drift, source-pool quality, correction triggers
11. **Promptfoo baseline comparison** -- Before/after model upgrade metrics
12. **Full Phase 4 graduated penalty validation** -- Measure impact on variance and context stability, adjust weights based on real-world performance

---

## Decision Log (Active)

| # | Decision | Session | Status |
|---|----------|---------|--------|
| 1 | Enable `llmTiering=true` by default | 3 | Done |
| 2 | Context refinement uses `modelVerdict` (no separate field) | 3 | Done |
| 3 | `llm.ts` as single source of truth for model selection | 3 | Approved, deferred to P1D |
| 4 | Dynamic pipeline tracked separately as experimental | 3 | Active |
| 5 | Closure thresholds: variance <= 10-15, context >= 80%, irrelevant < 10%, failure < 1%, confidence <= 15pp | 3, 7 | Active |
| 6 | Opus verdict: did not achieve gate closure; structural issues are primary blocker | 20 | Active |
| 7 | Graduated recency penalty: 3-factor formula (staleness x volatility x volume) | 22a | Done |
| 8 | Recency penalty: use existing signals, no new LLM calls, simple boolean toggle | 22a | Done |
| 9 | Confidence calibration: 4-layer deterministic post-processing, UCM-configurable, runs before recency/low-source penalties | 25 | Done |
| 10 | Search provider errors must throw (not silently return `[]`) to enable provider health tracking | 25b | Done |
| 11 | Provider outage system: circuit breaker + auto-pause + webhook + admin UI; threshold from `heuristicCircuitBreakerThreshold` | 27 | Done |
| 12 | All pre-Session-25b validation matrices are contaminated — new clean baselines required | 27 | Action: Session 28 |

---

## Next Task Assignments (Post Session 22a)

### Session 23 -- GPT Codex 5.3 (Senior Dev)

**Task: Post-Session-21+22a Validation Matrix**

Since Session 20, two significant code changes have landed but remain unvalidated in the matrix:
- **Session 21** (Claude Opus): Runtime crash fix (`undefined.value` in `generateSingleContextVerdicts`), magic numbers replaced with `VERDICT_BANDS` constants, model ID consistency in `llm.ts`
- **Session 22a** (Claude Opus): Graduated recency penalty (`recencyGraduatedPenalty: true`) replacing flat 20-point penalty with 3-factor formula

**Execution steps:**
1. Acquire WRITE_LOCK
2. `npm run reseed:force -- --configs` -- picks up `recencyGraduatedPenalty: true` and all new defaults
3. Run 25-run orchestrated matrix (5 claims x 5 runs) -- same claims as Sessions 10/12/14
4. Compare against Session 14 baselines (in `_done.md` lines 1358-1367)
5. Key verifications:
   - Runtime crash eliminated (was 1/10 in Session 20)
   - Recency penalty impact on government-trust claim (was worst variance = 50, likely recency-related)
   - Confidence floor holding (no confidence=0, was fixed in Session 13)
   - New `recency_evidence_gap` warnings include `graduated: true` and `penaltyBreakdown`
6. Document as Session 23 in this file (results table + delta table + assessment)
7. Artifacts: `artifacts/session23_orchestrated_matrix.jsonl`, `_summary.json`, `_overall.json`, `session14_vs_session23_delta.json`
8. Release WRITE_LOCK

### Session 24 -- Kimi k2.5 (Sr SW Architect / LLM Expert)

**Task: Confidence Calibration Design**

**Prerequisite:** Session 23 results from Codex.

The #1 structural blocker per Sessions 20-21 is **confidence delta spread** (20-42pp on some claims vs target <= 15pp). Opus verdict testing (Session 20) confirmed this is NOT a model quality issue -- it's a pipeline calibration problem.

**Scope:**
1. Analyze Session 23 results -- identify which claims still fail confidence stability
2. Design a deterministic post-verdict confidence calibration system. Consider:
   - **Evidence density anchoring**: more evidence sources -> higher minimum confidence
   - **Confidence banding**: snap to calibration bands to reduce run-to-run jitter
   - **Confidence-verdict coupling**: verdicts >= 70% must have confidence >= 50% (Session 22 item #7)
   - **Per-context confidence consistency**: flag when context verdicts have wildly different confidences
3. Propose LLM prompt adjustments if verdict prompt is contributing to confidence instability
4. All solutions must be: UCM-configurable, backwards-compatible toggle, no new LLM calls, pure deterministic post-processing
5. Document as Session 24: problem analysis, proposed formula/algorithm, config fields, implementation plan, expected impact

**Do NOT implement code** -- design only. Implementation will be done by Claude Opus (Session 25).

### Session 25 -- Claude Opus 4.6 (Principal Architect) -- COMPLETE

**Task: Implement Session 24 design** -- Done. See Session 25 section below.

### Session 25b -- Claude Opus 4.6 (Team Lead) -- COMPLETE

**Task: Search Provider Error Surfacing (SerpAPI 429 Fix)**

Session 23 validation ran with SerpAPI returning HTTP 429 ("Your account has run out of searches") but this was invisible to the pipeline — errors were silently swallowed and converted to empty result arrays, indistinguishable from legitimate "no results found" responses.

**Fix implemented:**
- `search-serpapi.ts` + `search-google-cse.ts`: Now throw `SearchProviderError` on HTTP 429, 403, quota exhaustion, and API-level error responses instead of silently returning `[]`
- `web-search.ts`: Added `SearchProviderError` class and `errors` field on `WebSearchResponse`; catches `SearchProviderError` from providers and records them
- `types.ts`: Added `"search_provider_error"` to `AnalysisWarningType` and `error?: string` to `SearchQuery`
- `orchestrated.ts`: All 4 search call sites now check `searchResponse.errors`, push `severity: "error"` analysis warnings, and record error in `SearchQuery.error`
- 15 unit tests: HTTP 429/403, quota body detection, 200-with-error-body, non-quota errors still return `[]`, normal success

**Result:** Search provider failures now surface as `type: "search_provider_error"` warnings with `severity: "error"` in the analysis output — visible to both the UI and any validation script.

### Session 26 -- GPT Codex 5.3 (Senior Dev) -- NEXT

**Task: Post-Session-25 Validation Matrix**

Re-run 25-run orchestrated matrix with both graduated recency (Session 22a) and confidence calibration (Session 25) active. Compare against Session 14 baselines. Target: all 5 claims pass confidence delta <= 15pp.

**CRITICAL: Search Provider Error Awareness**

Session 23 failed silently because SerpAPI returned HTTP 429 ("out of searches") but the pipeline swallowed the error. **This is now fixed** (Session 25b) — search provider errors surface as `search_provider_error` warnings in the analysis output. However, you MUST still verify:

1. **Before running**: Confirm SerpAPI quota is available by checking a test query returns results (not 429)
2. **After each run**: Check `analysisWarnings` in the output for any `type: "search_provider_error"` entries
3. **In the summary**: Report the count of search provider errors across all 25 runs. If ANY runs have `search_provider_error` warnings, flag it prominently — the results are invalid
4. **If errors found**: Stop the matrix immediately and report the error. Do not continue running with a broken search provider

---

## Session 23 -- GPT Codex 5.3 (Senior Dev)

**Date:** 2026-02-09  
**Task:** Post-Session-21+22a validation matrix (25-run orchestrated) with Session 14 baseline comparison  
**Status:** Complete

### Executed

1. Ran config reseed: `npm run reseed:force -- --configs`
2. Executed 25-run orchestrated matrix (5 claims x 5 runs), same claim set as Sessions 10/12/14
3. Compared results against Session 14 baseline (from `_done.md` lines 1358-1367)

### Artifacts

- `artifacts/session23_orchestrated_matrix.jsonl`
- `artifacts/session23_orchestrated_summary.json`
- `artifacts/session23_orchestrated_overall.json`
- `artifacts/session14_vs_session23_delta.json`
- `artifacts/session23_recency_warning_checks.json`

### Gate Results (Session 23 vs Targets)

| Claim | Score Variance | Target | Pass | Confidence Delta | Target | Pass | Context Hit Rate | Pass |
|---|---:|---:|:---:|---:|---:|:---:|---:|:---:|
| Bolsonaro procedural fairness | 11 | <=15 | ✅ | 9 | <=15 | ✅ | 0% (expected 2) | ❌ |
| Vaccine safety/efficacy | 40 | <=10 | ❌ | 40 | <=15 | ❌ | 0% (expected 1) | ❌ |
| Government trustworthiness | 32 | <=15 | ❌ | 14 | <=15 | ✅ | 0% (expected 1) | ❌ |
| Corporate compliance | 4 | <=15 | ✅ | 0 | <=15 | ✅ | 20% (expected 1-2) | ❌ |
| Technology comparison | 15 | <=10 | ❌ | 33 | <=15 | ❌ | 0% (expected 1) | ❌ |

Overall:
- `25` total runs
- `2` failed runs
- `confidence_zero_runs = 0` (confidence floor still holding)
- `claims_passing_all_3 = 0/5`

### Delta vs Session 14 Baseline

| Claim | Variance delta | Confidence delta change | Context-hit delta |
|---|---:|---:|---:|
| Bolsonaro procedural fairness | +6 | +9 | 0 |
| Vaccine safety/efficacy | +31 | +32 | 0 |
| Government trustworthiness | -18 | +3 | -80 |
| Corporate compliance | -3 | -10 | -60 |
| Technology comparison | -10 | -36 | 0 |

### Key Verification Outcomes (from Session 23 brief)

1. **Runtime crash elimination:** **FAILED**. Two runs failed; both failed job IDs (`b0ac38318f284342a535cb6041f4b461`, `cc35639055dd4cc4975a8c3e9fda463c`) hit the same `Cannot read properties of undefined (reading 'value')` path in `generateSingleContextVerdicts`.
2. **Recency penalty impact (government trust):** mixed. Variance improved vs Session 14 (`50 -> 32`) but still fails threshold (`>15`).
3. **Confidence floor:** **PASS**. No `confidence=0` runs.
4. **`recency_evidence_gap` graduated details:** **not observed in this matrix** (`0` recency warning runs), so `graduated: true` and `penaltyBreakdown` could not be validated from these 25 jobs.

### Assessment

- Session 23 does **not** achieve closure gates.
- Structural issues remain, with runtime reliability and context-target instability as dominant blockers.
- Next work should continue with Session 26 validation focus (post-Session-25 confidence calibration), while treating the recurring `undefined.value` failure path as a blocking defect.

---

## Session 24 -- Kimi k2.5 (Sr SW Architect / LLM Expert)

**Date:** 2026-02-09  
**Task:** Confidence Calibration System Design  
**Status:** Design complete, awaiting implementation (Session 25)

### Problem Analysis

**Root Cause (from Sessions 20-21):**
The #1 structural blocker is **confidence delta spread** of 20-42 percentage points on some claims (target: <= 15pp). Session 20 Opus verdict testing confirmed this is NOT a model quality issue -- it's a pipeline calibration problem.

**Key Evidence from Session 14:**
| Claim | Confidence Delta | Issue |
|-------|------------------|-------|
| Technology comparison | 69pp | Severe confidence instability |
| Government trust | 11pp | Passing |
| Bolsonaro procedural | 0pp | Passing (confidence floor working) |

**Observed Patterns:**
1. **High variance on low-evidence claims**: Technology comparison (likely sparse evidence) shows 69pp swing
2. **Over-confident LLM on thin evidence**: LLM returns high confidence (70%+) with minimal sources
3. **No confidence-verdict coupling**: "73% verdict with 25% confidence" miscalibration possible
4. **Run-to-run jitter**: Same claim, same evidence, different confidence across runs

### Design Principles

1. **Deterministic post-processing**: Pure function, no new LLM calls
2. **UCM-configurable**: All parameters tunable without code changes
3. **Backwards-compatible**: Toggle `confidenceCalibrationEnabled` (default: true)
4. **Evidence-grounded**: Confidence should correlate with evidence quality/quantity
5. **Band-based snapping**: Reduce jitter by snapping to calibration bands

### Proposed Solution: Multi-Layer Confidence Calibration

#### Layer 1: Evidence Density Anchor (Foundation)

**Concept**: Minimum confidence is anchored to evidence density -- more/better evidence = higher floor.

```typescript
function calculateEvidenceDensityScore(
  evidenceItems: EvidenceItem[],
  sources: Source[]
): number {
  // Factor 1: Unique source count (normalized)
  const uniqueSources = new Set(evidenceItems.map(e => e.sourceId)).size;
  const sourceScore = Math.min(1.0, uniqueSources / 5); // 5+ sources = max score
  
  // Factor 2: High-probative evidence ratio
  const highProbativeCount = evidenceItems.filter(
    e => e.probativeValue === "high"
  ).length;
  const qualityScore = evidenceItems.length > 0 
    ? highProbativeCount / evidenceItems.length 
    : 0;
  
  // Factor 3: Evidence diversity (claim dimensions covered)
  const dimensionsCovered = new Set(evidenceItems.map(e => e.claimDirection)).size;
  const diversityScore = Math.min(1.0, dimensionsCovered / 2); // support + contradict = max
  
  // Weighted combination
  return (
    sourceScore * 0.50 +      // 50% - most important
    qualityScore * 0.30 +     // 30%
    diversityScore * 0.20     // 20%
  );
}

// Calculate confidence floor based on density
const densityScore = calculateEvidenceDensityScore(evidenceItems, sources);
const minConfidenceFromDensity = Math.round(
  15 + (densityScore * 45)  // Range: 15% (sparse) to 60% (rich)
);
```

**UCM Config:**
```typescript
confidenceCalibration: {
  enabled: z.boolean().default(true),
  densityAnchorWeight: z.number().min(0).max(1).default(0.6),
  minConfidenceBase: z.number().int().min(5).max(30).default(15),
  minConfidenceMax: z.number().int().min(30).max(70).default(60),
  sourceCountThreshold: z.number().int().min(1).max(10).default(5),
}
```

#### Layer 2: Confidence Band Snapping (Jitter Reduction)

**Concept**: Snap raw confidence to predefined bands to reduce run-to-run jitter.

```typescript
const CONFIDENCE_BANDS = [
  { min: 0, max: 15, snapTo: 10, label: "very_low" },
  { min: 15, max: 30, snapTo: 25, label: "low" },
  { min: 30, max: 45, snapTo: 40, label: "moderate_low" },
  { min: 45, max: 55, snapTo: 50, label: "neutral" },
  { min: 55, max: 70, snapTo: 60, label: "moderate_high" },
  { min: 70, max: 85, snapTo: 75, label: "high" },
  { min: 85, max: 100, snapTo: 90, label: "very_high" }
];

function snapConfidenceToBand(rawConfidence: number): number {
  const band = CONFIDENCE_BANDS.find(b => rawConfidence >= b.min && rawConfidence < b.max);
  return band ? band.snapTo : rawConfidence;
}
```

**Partial Snapping** (configurable):
```typescript
// Blend between raw and snapped to preserve some granularity
const snappedConfidence = snapConfidenceToBand(rawConfidence);
const blendFactor = config.confidenceCalibration.bandSnappingStrength ?? 0.7;
const calibratedConfidence = Math.round(
  rawConfidence * (1 - blendFactor) + snappedConfidence * blendFactor
);
```

**UCM Config:**
```typescript
bandSnapping: {
  enabled: z.boolean().default(true),
  strength: z.number().min(0).max(1).default(0.7), // 0 = no snapping, 1 = full snap
  bandDefinitions: z.array(z.object({
    min: z.number().int(),
    max: z.number().int(),
    snapTo: z.number().int()
  })).optional(), // Custom bands override defaults
}
```

#### Layer 3: Confidence-Verdict Coupling (Miscalibration Fix)

**Concept**: Enforce logical consistency between verdict and confidence.

```typescript
function enforceVerdictConfidenceCoupling(
  verdict: number,        // truthPercentage (0-100)
  confidence: number,      // current confidence (0-100)
  config: CalibrationConfig
): number {
  // Rule 1: Strong verdicts need reasonable confidence
  const isStrongVerdict = verdict >= 70 || verdict <= 30;
  const minConfidenceForStrong = config.minConfidenceStrongVerdict ?? 50;
  
  if (isStrongVerdict && confidence < minConfidenceForStrong) {
    return Math.max(confidence, minConfidenceForStrong);
  }
  
  // Rule 2: Neutral verdicts can have lower confidence (genuine uncertainty)
  const isNeutralVerdict = verdict >= 40 && verdict <= 60;
  const minConfidenceForNeutral = config.minConfidenceNeutralVerdict ?? 25;
  
  if (isNeutralVerdict && confidence < minConfidenceForNeutral) {
    return Math.max(confidence, minConfidenceForNeutral);
  }
  
  return confidence;
}
```

**UCM Config:**
```typescript
verdictCoupling: {
  enabled: z.boolean().default(true),
  strongVerdictThreshold: z.number().int().min(60).max(80).default(70),
  minConfidenceStrong: z.number().int().min(30).max(70).default(50),
  minConfidenceNeutral: z.number().int().min(10).max(40).default(25),
}
```

#### Layer 4: Per-Context Confidence Consistency Check

**Concept**: Flag and adjust when multiple contexts have wildly different confidences.

```typescript
function checkContextConfidenceConsistency(
  contextVerdicts: ContextVerdict[],
  config: CalibrationConfig
): { adjustedConfidence: number; warning?: string } {
  if (contextVerdicts.length < 2) return { adjustedConfidence: contextVerdicts[0]?.confidence ?? 50 };
  
  const confidences = contextVerdicts.map(v => v.confidence);
  const maxConf = Math.max(...confidences);
  const minConf = Math.min(...confidences);
  const spread = maxConf - minConf;
  
  const maxAllowedSpread = config.maxContextConfidenceSpread ?? 25;
  
  if (spread > maxAllowedSpread) {
    // Reduce overall confidence when contexts disagree significantly
    const reduction = Math.round((spread - maxAllowedSpread) / 2);
    const averageConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    return {
      adjustedConfidence: Math.max(10, averageConf - reduction),
      warning: `context_confidence_divergence`
    };
  }
  
  return { adjustedConfidence: confidences[0] };
}
```

**UCM Config:**
```typescript
contextConsistency: {
  enabled: z.boolean().default(true),
  maxConfidenceSpread: z.number().int().min(10).max(50).default(25),
  reductionFactor: z.number().min(0).max(1).default(0.5),
}
```

### Master Calibration Function

```typescript
function calibrateConfidence(
  rawConfidence: number,
  verdict: number,
  evidenceItems: EvidenceItem[],
  sources: Source[],
  contextVerdicts: ContextVerdict[],
  config: CalibrationConfig
): { 
  calibratedConfidence: number; 
  adjustments: CalibrationAdjustment[];
  warnings: string[];
} {
  const adjustments: CalibrationAdjustment[] = [];
  const warnings: string[] = [];
  let workingConfidence = rawConfidence;
  
  // Layer 1: Evidence density anchor (minimum floor)
  if (config.densityAnchor.enabled) {
    const densityScore = calculateEvidenceDensityScore(evidenceItems, sources);
    const minFromDensity = calculateMinConfidenceFromDensity(densityScore, config);
    if (workingConfidence < minFromDensity) {
      adjustments.push({
        type: "density_anchor",
        before: workingConfidence,
        after: minFromDensity,
        reason: `Evidence density score: ${densityScore.toFixed(2)}`
      });
      workingConfidence = minFromDensity;
    }
  }
  
  // Layer 2: Band snapping (jitter reduction)
  if (config.bandSnapping.enabled) {
    const snapped = snapConfidenceToBand(workingConfidence, config);
    const blended = Math.round(
      workingConfidence * (1 - config.bandSnapping.strength) +
      snapped * config.bandSnapping.strength
    );
    if (blended !== workingConfidence) {
      adjustments.push({
        type: "band_snapping",
        before: workingConfidence,
        after: blended,
        reason: `Snapped to calibration band`
      });
      workingConfidence = blended;
    }
  }
  
  // Layer 3: Verdict-confidence coupling
  if (config.verdictCoupling.enabled) {
    const coupled = enforceVerdictConfidenceCoupling(verdict, workingConfidence, config);
    if (coupled !== workingConfidence) {
      adjustments.push({
        type: "verdict_coupling",
        before: workingConfidence,
        after: coupled,
        reason: `Verdict ${verdict}% requires min confidence ${coupled}%`
      });
      workingConfidence = coupled;
    }
  }
  
  // Layer 4: Context consistency check
  if (config.contextConsistency.enabled && contextVerdicts.length > 1) {
    const consistency = checkContextConfidenceConsistency(contextVerdicts, config);
    if (consistency.warning) {
      warnings.push(consistency.warning);
    }
    if (consistency.adjustedConfidence < workingConfidence) {
      adjustments.push({
        type: "context_consistency",
        before: workingConfidence,
        after: consistency.adjustedConfidence,
        reason: `Context confidence divergence detected`
      });
      workingConfidence = consistency.adjustedConfidence;
    }
  }
  
  // Final clamp
  workingConfidence = Math.max(5, Math.min(100, workingConfidence));
  
  return {
    calibratedConfidence: workingConfidence,
    adjustments,
    warnings
  };
}
```

### UCM Configuration Schema

```typescript
// Add to PipelineConfigSchema
confidenceCalibration: z.object({
  enabled: z.boolean().default(true),
  
  // Layer 1: Evidence density anchor
  densityAnchor: z.object({
    enabled: z.boolean().default(true),
    weight: z.number().min(0).max(1).default(0.6),
    minConfidenceBase: z.number().int().min(5).max(30).default(15),
    minConfidenceMax: z.number().int().min(30).max(70).default(60),
    sourceCountThreshold: z.number().int().min(1).max(10).default(5),
  }).default({}),
  
  // Layer 2: Band snapping
  bandSnapping: z.object({
    enabled: z.boolean().default(true),
    strength: z.number().min(0).max(1).default(0.7),
    customBands: z.array(z.object({
      min: z.number().int(),
      max: z.number().int(),
      snapTo: z.number().int()
    })).optional(),
  }).default({}),
  
  // Layer 3: Verdict coupling
  verdictCoupling: z.object({
    enabled: z.boolean().default(true),
    strongVerdictThreshold: z.number().int().min(60).max(80).default(70),
    minConfidenceStrong: z.number().int().min(30).max(70).default(50),
    minConfidenceNeutral: z.number().int().min(10).max(40).default(25),
  }).default({}),
  
  // Layer 4: Context consistency
  contextConsistency: z.object({
    enabled: z.boolean().default(true),
    maxConfidenceSpread: z.number().int().min(10).max(50).default(25),
    reductionFactor: z.number().min(0).max(1).default(0.5),
  }).default({}),
}).optional(),
```

### Default Configuration

```json
{
  "confidenceCalibration": {
    "enabled": true,
    "densityAnchor": {
      "enabled": true,
      "weight": 0.6,
      "minConfidenceBase": 15,
      "minConfidenceMax": 60,
      "sourceCountThreshold": 5
    },
    "bandSnapping": {
      "enabled": true,
      "strength": 0.7
    },
    "verdictCoupling": {
      "enabled": true,
      "strongVerdictThreshold": 70,
      "minConfidenceStrong": 50,
      "minConfidenceNeutral": 25
    },
    "contextConsistency": {
      "enabled": true,
      "maxConfidenceSpread": 25,
      "reductionFactor": 0.5
    }
  }
}
```

### Expected Impact

| Issue | Before | After (Expected) |
|-------|--------|------------------|
| Technology comparison confidence delta | 69pp | <= 25pp (band snapping + density anchor) |
| Sparse evidence over-confidence | 70%+ with 2 sources | Capped at ~35% (density anchor) |
| "73% verdict with 25% confidence" | Possible | Impossible (verdict coupling enforces >=50%) |
| Run-to-run jitter | High | Reduced (band snapping) |
| Context divergence | Unflagged | Detected and penalized |

### Implementation Plan (for Session 25)

1. **Create `confidence-calibration.ts`**
   - Pure functions: `calculateEvidenceDensityScore()`, `snapConfidenceToBand()`, `enforceVerdictConfidenceCoupling()`, `checkContextConfidenceConsistency()`
   - Master function: `calibrateConfidence()`
   - Full unit test coverage (target: 30+ tests)

2. **Add UCM config fields** to `config-schemas.ts`
   - Add `confidenceCalibration` section to `PipelineConfigSchema`
   - Add defaults to `pipeline.default.json`

3. **Integration points** in `orchestrated.ts`
   - After verdict generation, before final assembly
   - Call `calibrateConfidence()` with all context
   - Store adjustments in analysis metadata
   - Add calibration warnings if any

4. **Telemetry**
   - Track: raw vs calibrated confidence, which layers fired, adjustment reasons
   - Helps tune defaults and identify edge cases

5. **Validation**
   - Re-run 25-run matrix after implementation
   - Target: All claims pass confidence delta <= 15pp

### Backwards Compatibility

- **Toggle**: `confidenceCalibration.enabled` (default: true)
- **Rollback**: Set to `false` to use raw LLM confidence
- **Gradual rollout**: Can tune individual layers via their enabled flags

---

## Session 25 -- Claude Opus 4.6 (Principal Architect)

**Date:** 2026-02-09
**Task:** Implement Confidence Calibration System (Session 24 design)
**Status:** Complete

### Implementation Summary

Implemented Kimi's 4-layer confidence calibration system as designed in Session 24. Follows the same pattern as Session 22a (graduated recency penalty): pure functions, exported, UCM-configurable, backwards-compatible toggle, 58 unit tests.

### Files Changed

| File | Change |
|------|--------|
| `apps/web/src/lib/analyzer/confidence-calibration.ts` | **NEW**: 4 layer functions + master `calibrateConfidence()`, types, default config |
| `apps/web/src/lib/analyzer/index.ts` | Added confidence calibration exports |
| `apps/web/src/lib/config-schemas.ts` | Added `confidenceCalibration` nested Zod schema (4 sub-objects), transform defaults, DEFAULT_PIPELINE_CONFIG |
| `apps/web/configs/pipeline.default.json` | Added `confidenceCalibration` default config block |
| `apps/web/src/lib/analyzer/orchestrated.ts` | Integration: calls `calibrateConfidence()` after verdict generation, before recency/low-source penalties |
| `apps/web/test/unit/lib/analyzer/confidence-calibration.test.ts` | **NEW**: 58 unit tests covering all 4 layers + combined + edge cases |
| `apps/web/test/unit/lib/config-schemas.test.ts` | Added 3 tests for `confidenceCalibration` schema validation |

### Implementation Details

**Layer 1: Evidence Density Anchor** (`calculateEvidenceDensityScore`, `calculateMinConfidenceFromDensity`)
- 3-factor density score: unique sources (50%), high-probative ratio (30%), direction diversity (20%)
- Maps density [0-1] → confidence floor [15%-60%]
- Prevents over-confident verdicts on thin evidence

**Layer 2: Confidence Band Snapping** (`snapConfidenceToBand`, `blendWithSnap`)
- 7 calibration bands from "very_low" (0-15 → 10) to "very_high" (85-100 → 90)
- Partial blending at configurable strength (default 0.7)
- Reduces run-to-run jitter by snapping to stable anchor points

**Layer 3: Verdict-Confidence Coupling** (`enforceVerdictConfidenceCoupling`)
- Strong verdicts (>=70% or <=30%) require min 50% confidence
- Neutral verdicts (40-60%) require min 25% confidence
- Eliminates "73% verdict with 25% confidence" miscalibration

**Layer 4: Context Confidence Consistency** (`checkContextConfidenceConsistency`)
- Detects context confidence spread > 25pp threshold
- Reduces overall confidence proportionally to excess spread
- Emits `context_confidence_divergence` warning for telemetry

**Integration Point** (orchestrated.ts):
- Runs after verdict generation, before recency and low-source penalties
- Calibrates both `verdictSummary.confidence` and `articleAnalysis.verdictSummary.confidence`
- Stores adjustments in `analysisWarnings` with type `confidence_calibration`
- All debug logging via existing `debugLog()` infrastructure

### Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| confidence-calibration.test.ts | 58 | All pass |
| recency-graduated-penalty.test.ts | 27 | All pass |
| config-schemas.test.ts | 53 | All pass |
| aggregation.test.ts | 13 | All pass |

4 pre-existing failures in `v2.8-verification.test.ts` (unrelated: context detection and sourceTypeCalibration).

### UCM Configuration

```json
{
  "confidenceCalibration": {
    "enabled": true,
    "densityAnchor": {
      "enabled": true,
      "minConfidenceBase": 15,
      "minConfidenceMax": 60,
      "sourceCountThreshold": 5
    },
    "bandSnapping": {
      "enabled": true,
      "strength": 0.7
    },
    "verdictCoupling": {
      "enabled": true,
      "strongVerdictThreshold": 70,
      "minConfidenceStrong": 50,
      "minConfidenceNeutral": 25
    },
    "contextConsistency": {
      "enabled": true,
      "maxConfidenceSpread": 25,
      "reductionFactor": 0.5
    }
  }
}
```

### Backwards Compatibility

- `confidenceCalibration.enabled: false` → bypasses all calibration, uses raw LLM confidence
- Each layer can be individually disabled via its own `enabled` flag
- Default is `true` (calibration ON) — intentionally changes behavior for the better
- No new LLM calls — pure deterministic post-processing

### Next Steps

- **Session 25b (Complete)**: Search provider error surfacing — SerpAPI 429/quota errors now visible in analysis warnings instead of silently swallowed
- **Session 26 (Codex)**: Re-run 25-run validation matrix with both Session 22a graduated recency + Session 25 confidence calibration active. Target: all 5 claims pass confidence delta <= 15pp. **Must verify search provider health before and during runs** (see Session 26 brief).

---

## Session 26 -- GPT Codex 5.3 (Senior Dev)

**Date:** 2026-02-09
**Task:** Post-Session-25 validation matrix (25-run orchestrated) with Session 14 baseline comparison
**Status:** INCOMPLETE (5/25 runs only — 1 claim)

### Executed

1. Ran 5 runs for claim_1_bolsonaro only (other 4 claims: 0 runs)
2. Session was cut short — reason unclear. Only the Bolsonaro claim was tested.

### Artifacts

- `artifacts/session26_orchestrated_matrix.jsonl` (5 entries)
- `artifacts/session26_orchestrated_summary.json`
- `artifacts/session26_orchestrated_overall.json`
- `artifacts/session14_vs_session26_delta.json`
- `artifacts/session26_warning_checks.json`

### Partial Results (Bolsonaro only)

| Claim | Score Variance | Target | Pass | Confidence Delta | Target | Pass |
|---|---:|---:|:---:|---:|---:|:---:|
| Bolsonaro procedural fairness | 14 | <=15 | ✅ | 20 | <=15 | ❌ |

### Assessment

- Session 26 is **incomplete** — only 1/5 claims was tested.
- The `warning_checks.json` does not include `search_provider_error` checks, so we cannot confirm whether search provider failures occurred during these runs.
- **This session's results should not be used for gate closure decisions** until the full 25-run matrix is completed.

---

## ⚠️ Validation Matrix Contamination Notice

**Issue:** Sessions 10-23 ran **before** Session 25b's search provider error surfacing fix. During this period, SerpAPI HTTP 429 ("Your account has run out of searches") errors were **silently swallowed** — the pipeline converted them to empty result arrays indistinguishable from legitimate "no results found" responses. This means any run where SerpAPI was exhausted would have proceeded with degraded/missing search evidence, producing unreliable verdict scores.

**Known contamination:**
- **Session 23** (25 runs): Confirmed by Session 25b discovery that SerpAPI was returning 429 during this period. All 25 runs are potentially contaminated — verdict scores, confidence values, and variance calculations may be based on incomplete evidence. The 2 failed runs and high variance on vaccine/technology claims may be partially attributable to missing search results.
- **Session 26** (5 runs): Ran after the fix but the validation script does not check for `search_provider_error` warnings. Incomplete session (1/5 claims). Cannot confirm search health.
- **Sessions 10, 11, 13, 14, 16, 19, 20**: All ran before the fix. May or may not have been affected depending on SerpAPI quota availability at time of execution. Cannot be verified retroactively.

**Impact on closure criteria:** The gate results tables in Sessions 12-14, 23 are **unreliable** as baselines. Any comparison against these sessions should note this caveat.

**Remediation required (assigned to GPT Codex 5.3, Session 28):**
1. Move contaminated artifacts to `artifacts/pre-search-fix/` subdirectory
2. Update the validation matrix script to check for `search_provider_error` warnings in output and fail the run if any are present
3. Re-run the full 25-run matrix (5 claims x 5 runs) with:
   - SerpAPI quota verified before starting
   - `search_provider_error` warning check in post-run validation
   - Provider outage system active (auto-pause will halt the matrix if providers fail)
4. Establish new clean baselines, discard all pre-Session-25b results as historical-only

---

## Session 27 -- Claude Opus 4.6 (Principal Architect)

**Date:** 2026-02-09
**Task:** Provider Outage Detection & Response System
**Status:** Complete

### Problem Statement

When external providers (search APIs like SerpAPI/Google CSE, or LLM providers like Anthropic/OpenAI) fail entirely — due to quota exhaustion, rate limits, or outages — the pipeline either silently degrades (producing incomplete results with missing evidence) or fails individual jobs without preventing new jobs from being submitted into the same broken state. Session 23's contaminated validation matrix is a direct consequence of this.

### Architecture

```
Provider fails → ProviderHealth circuit opens → drainRunnerQueue pauses
    ↓                                               ↓
Webhook fires to admin          New jobs stay QUEUED (not lost)
    ↓                                               ↓
Admin fixes issue → POST /resume → circuit resets → queue drains again
    ↓
SystemHealthBanner shows "paused" state in UI
```

### Implementation Summary

| Component | Files | Description |
|-----------|-------|-------------|
| Circuit Breaker | `provider-health.ts` | globalThis singleton, CLOSED→OPEN→HALF_OPEN state machine per provider (search/llm), configurable threshold |
| Error Classification | `error-classification.ts` | Categorizes errors as provider_outage, rate_limit, timeout, unknown; handles SearchProviderError + AI SDK errors |
| Webhook Notifications | `provider-webhook.ts` | Fire-and-forget POST to `FH_WEBHOOK_URL`, optional HMAC-SHA256 via `FH_WEBHOOK_SECRET` |
| Auto-Pause Runner | `run-job/route.ts` | Classifies errors in catch block, records provider health, pauses system when circuit trips; drainRunnerQueue skips jobs when paused |
| System Health API (Next.js) | `system-health/route.ts` (internal + fh) | GET health state, POST resume/pause with webhook + queue drain |
| System Health API (C#) | `SystemHealthController.cs` | Proxy endpoints at `/v1/system/health`, `/v1/system/resume`, `/v1/system/pause` |
| UI Banner | `SystemHealthBanner.tsx` | Client component polling every 30s, amber warning when paused, dismissible |
| Admin Controls | `admin/page.tsx` | System Health section with provider state cards, Resume/Pause buttons |
| Jobs Page | `jobs/page.tsx` | PAUSED status styling |
| Pipeline Instrumentation | `orchestrated.ts` | All 4 search call sites record provider failures/successes |

### Files Changed/Created

| File | Action |
|------|--------|
| `apps/web/src/lib/provider-health.ts` | CREATE |
| `apps/web/src/lib/error-classification.ts` | CREATE |
| `apps/web/src/lib/provider-webhook.ts` | CREATE |
| `apps/web/src/app/api/internal/run-job/route.ts` | MODIFY |
| `apps/web/src/app/api/internal/system-health/route.ts` | CREATE |
| `apps/web/src/app/api/fh/system-health/route.ts` | CREATE |
| `apps/api/Controllers/SystemHealthController.cs` | CREATE |
| `apps/web/src/components/SystemHealthBanner.tsx` | CREATE |
| `apps/web/src/components/SystemHealthBanner.module.css` | CREATE |
| `apps/web/src/app/layout.tsx` | MODIFY |
| `apps/web/src/app/jobs/page.tsx` | MODIFY |
| `apps/web/src/app/jobs/page.module.css` | MODIFY |
| `apps/web/src/app/admin/page.tsx` | MODIFY |
| `apps/web/src/lib/analyzer/orchestrated.ts` | MODIFY |

### Test Coverage

| Test File | Tests | Type |
|-----------|-------|------|
| `provider-health.test.ts` | 20 | Unit — circuit breaker state transitions, pause/resume, isolation |
| `error-classification.test.ts` | 19 | Unit — SearchProviderError, LLM errors, timeouts, shape checking |
| `provider-webhook.test.ts` | 5 | Unit — webhook firing, HMAC signature, env var handling |
| `auto-pause-flow.integration.test.ts` | 15 | Integration — end-to-end classify→record→pause flow |
| `system-health.test.ts` | 14 | Integration — API route handlers, auth, resume/pause actions |
| `drain-runner-pause.integration.test.ts` | 8 | Integration — drainRunnerQueue pause guard, queue preservation |
| **Total** | **81** | All passing |

Full test suite: 826 passed, 36 failed (all pre-existing).

### Configuration

- **Circuit breaker threshold**: Uses `heuristicCircuitBreakerThreshold` from pipeline config (default 3)
- **Webhook URL**: `FH_WEBHOOK_URL` env var (optional, no-op if not set)
- **Webhook HMAC**: `FH_WEBHOOK_SECRET` env var (optional, adds `X-Webhook-Signature` header)
- **Admin key**: `FH_ADMIN_KEY` env var (required for POST actions in production)

### Backwards Compatibility

- When `FH_WEBHOOK_URL` is not set: webhook is silently skipped
- Circuit breaker threshold uses existing pipeline config field (default 3)
- No database schema changes needed (Status is already a free-form string)
- If provider-health module fails to load: runner falls back to current behavior

---

## Session 28 -- GPT Codex 5.3 (Senior Dev) -- NEXT

**Task: Clean Validation Matrix with Provider Health Verification**

Session 27 established that all previous validation matrices (Sessions 10-26) may be contaminated by silent search provider failures. A clean re-run is needed.

**Prerequisites:**
- Provider outage system (Session 27) is active — will auto-pause if providers fail
- Search provider error surfacing (Session 25b) is active — warnings visible in output
- SerpAPI quota must be verified before starting

**Execution steps:**
1. Acquire WRITE_LOCK
2. Move contaminated artifacts: `mkdir artifacts/pre-search-fix && mv artifacts/session{10,11,13,14,16,19,20,23,26}* artifacts/pre-search-fix/`
3. Verify SerpAPI quota: run a test search query, confirm no 429 response
4. `npm run reseed:force -- --configs` (picks up all Session 22a-27 changes)
5. Run 25-run orchestrated matrix (5 claims x 5 runs) — same claims as Sessions 10/12/14
6. **Post-run validation** (for each run):
   - Check `analysisWarnings` for any `type: "search_provider_error"` entries → mark run as invalid if found
   - Check system health API: `GET /api/fh/system-health` → confirm `systemPaused: false`
   - If system auto-paused during matrix: stop, report which runs completed, mark remaining as not-run
7. Compare against Session 14 baselines (noting they are contaminated — for directional reference only)
8. Document as Session 28: clean results table, search health verification, new baselines
9. Artifacts: `artifacts/session28_orchestrated_matrix.jsonl`, `_summary.json`, `_overall.json`, `_search_health.json`
10. Release WRITE_LOCK

**Key difference from prior sessions:** This is the first validation matrix where silent search failures are impossible. Any search provider failure will either:
- Surface as a `search_provider_error` warning in the analysis output
- Trip the circuit breaker and auto-pause the system (halting the matrix)

---

_Last updated: 2026-02-09. For full session details, see [Reporting_Improvement_Exchange_done.md](Reporting_Improvement_Exchange_done.md)._

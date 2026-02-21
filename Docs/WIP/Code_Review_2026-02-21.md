# Code Review — Changes Since 2026-02-19 Sprint
**Date:** 2026-02-21
**Reviewer:** Code Reviewer (Claude Code, Sonnet 4.6)
**Scope:** All commits from `a8d4b94` (exclusive) through `84aad35` (HEAD) — 24 commits
**Method:** 4 parallel review agents, code diff analysis

---

## Overview

### Commits Reviewed (24 total)

| Commit | Message |
|--------|---------|
| `84aad35` | fix(calibration): pre-switch hardening and telemetry validator |
| `704063e` | fix(pipeline): structured error telemetry and failure-mode accuracy |
| `6aa34d8` | docs(knowledge): truth-seeking journalism, political bias, epistemic asymmetry |
| `1b27465` | docs(calibration): baseline v1 lock, threshold ratification, status sync |
| `f5c97cc` | fix(calibration): dedicated vitest config and timeout tuning |
| `fb1b8a9` | md updates |
| `0ade583` | Testr Reports corr |
| `af0ad07` | fix: restore internal link for Analysis Test Reports |
| `f7630de` | fix: restore accidentally deleted reports-manifest.json |
| `a4e06cc` | .gitignore |
| `3fc37e8` | Stammbach-Ash doc status update |
| `47c95d1` | Reports manifest |
| `d9a91f5` | feat(verdict): implement Action #6 range reporting and baseless guard hardening |
| `3704c27` | feat(docs): rich report cards, deep link aliases, and auto-manifest |
| `0403f28` | docs: align Ash bias review with current implementation state |
| `680a8a8` | docs: reorganize Ash review notes |
| `5b9408a` | docs: split C17 and C18 statuses |
| `47c9189` | feat: complete C18 failure-mode instrumentation and related updates |
| `1b75846` | feat(verdict): cross-provider debate routing with UCM profile presets |
| `79d7811` | docs(xwiki): add gh-pages TestReports alias and redirect support |
| `87077a0` | docs(wip): add cross-provider challenger separation collaboration plan |
| `2b412e6` | feat(calibration): political bias calibration harness — Phases 1-3 |
| `1a3d528` | Docs |
| `387c451` | Test Reports |

### Major Feature Areas

| Area | Files Changed | Lines +/- |
|------|---------------|-----------|
| Core Pipeline (verdict-stage, claimboundary-pipeline, types) | 3 | ~1,700 |
| Calibration Module (new: 6 files) | 6 | ~2,500 |
| Metrics & Admin UI | 5 | ~750 |
| Config Schemas (DEBATE_PROFILES, rangeReporting) | 1 | ~125 |
| Infrastructure (GH Actions, xwiki viewer, report manifest) | 4 | ~650 |
| Prompts | 1 | ~10 |
| Source Reliability error classification | 1 | ~130 |

---

## Finding Summary

| Severity | Count |
|----------|-------|
| **CRITICAL** | 6 |
| **HIGH** | 13 |
| **MEDIUM** | 21 |
| **LOW** | 13 |
| **FIXED (confirmed)** | 1 |
| **TOTAL** | 54 |

---

## Area 1 — Core Pipeline

**Files:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/types.ts`

**Key changes:** Baseless challenge guard (`enforceBaselessChallengePolicy`), verdict range reporting (`computeTruthPercentageRange`), cross-provider debate routing (`debateModelProviders`), structured source-fetch/SR error telemetry, `upsertSearchProviderWarning` dedup helper.

---

### **[CRITICAL] A1-C1 — Baseless challenge loop exits early, misses subsequent violations**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 991
**Description:** `enforceBaselessChallengePolicy()` iterates `for (const cr of adjustedResponses)`. When the first `cr` triggers a revert, the function returns immediately from inside the loop. If a claim has multiple adjusted responses (e.g., cr1 passes validation, cr2 is baseless), only cr1 is checked — cr2's baseless status is never detected. The revert fires for the wrong reason (or doesn't fire at all), corrupting enforcement semantics.
**Recommendation:** Collect all enforcement decisions across the full loop before returning. Use a flag (`shouldRevert = false`) and determine the revert at the end, or restructure to accumulate issues and apply the worst-case outcome.

---

### **[HIGH] A1-H1 — baseless_challenge_detected summary warning emitted even with 0 baseless adjustments**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 1093
**Description:** The summary `baseless_challenge_detected` warning is pushed unconditionally when `totalAdjustments > 0`, even if `baselessCount === 0`. Results in informational noise: "Baseless challenge enforcement: 0/N adjustments blocked (rate: 0.0%)." on every analysis with any challenge responses.
**Recommendation:** Guard with `if (totalAdjustments > 0 && baselessCount > 0)`.

---

### **[HIGH] A1-H2 — `as any` casts in classifySourceFetchFailure()**
**File:** [claimboundary-pipeline.ts](apps/web/src/lib/analyzer/claimboundary-pipeline.ts) ~line 2318
**Description:** `(error as any)?.status` and `(error as any)?.statusCode` bypass TypeScript safety. While this is structural classification (allowed per AGENTS.md), the unsafe casts obscure intent and create maintenance risk.
**Recommendation:** Use a proper type guard: `typeof error === 'object' && error !== null && 'status' in error && typeof (error as Record<string,unknown>).status === 'number'`.

---

### **[HIGH] A1-H3 — ChallengePoint.id fallback uniqueness not guaranteed**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 865
**Description:** Fallback ID is `CP_${claimId}_${idx}` where `idx` is 0-based position within a single claim's challenges. The global `challengePointMap` stores these without further namespacing. If the LLM returns an `id` that collides across claims, the second overwrites the first silently. Enforcement then looks up IDs that resolve to the wrong challenge point.
**Recommendation:** Validate that parsed `cp.id` values are globally unique before building the map; log a warning on collision. Or generate IDs using a global counter/UUID pattern rather than per-claim index.

---

### **[HIGH] A1-H4 — `validateChallengeEvidence()` incorrectly flags missing-evidence challenges as baseless**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 937
**Description:** `evidenceIdsValid = invalidIds.length === 0 && cp.evidenceIds.length > 0`. A challenge with `type="missing_evidence"` intentionally has zero evidence IDs (the point is that evidence is absent). This condition marks it `evidenceIdsValid=false`, causing `enforceBaselessChallengePolicy()` to potentially revert legitimate missing-evidence adjustments.
**Recommendation:** Exempt `missing_evidence` type from the non-empty check: `evidenceIdsValid = cp.type === "missing_evidence" || (invalidIds.length === 0 && cp.evidenceIds.length > 0)`.

---

### **[MEDIUM] A1-M1 — Range reporting silently disabled when self-consistency is off (undocumented)**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 762
**Description:** `computeTruthPercentageRange()` returns `undefined` when `!verdict.consistencyResult.assessed`. With the default `selfConsistencyMode="disabled"`, no ranges are ever computed even when `rangeReporting.enabled=true`. No warning is emitted. The feature appears configurable but is inoperable in the default config.
**Recommendation:** Document the coupling in VerdictStageConfig JSDoc. Optionally emit a one-time `console.warn` when range reporting is enabled but consistency is disabled.

---

### **[MEDIUM] A1-M2 — checkDebateTierDiversity() silences same-tier warning when providers differ**
**File:** [claimboundary-pipeline.ts](apps/web/src/lib/analyzer/claimboundary-pipeline.ts) ~line 2610
**Description:** The refactored function returns `null` (no warning) if provider diversity exists, even when all 4 roles use the same tier. This could hide the degenerate case where different providers but identical model families are used (e.g., Anthropic claude-sonnet and Mistral large — both "sonnet tier" — provide minimal adversarial independence).
**Recommendation:** Consider emitting separate warnings for tier homogeneity and provider homogeneity, rather than treating provider diversity as a complete override. Or document the assumption that provider diversity is sufficient.

---

### **[MEDIUM] A1-M3 — ChallengePoint.id is now required — backwards compatibility for tests**
**File:** [types.ts](apps/web/src/lib/analyzer/types.ts) ~line 850
**Description:** `id: string` is now required on `ChallengePoint`. Any test fixtures or mock data that manually construct `ChallengePoint` objects without `id` will fail type-checking. `parseChallengeDocument()` assigns the field, so production code is fine, but test utilities may not be.
**Recommendation:** Audit `test/` for manual `ChallengePoint` construction and add `id` fields. Consider a factory function to future-proof.

---

### **[MEDIUM] A1-M4 — upsertSearchProviderWarning() overwrites historical query/stage/status on each update**
**File:** [claimboundary-pipeline.ts](apps/web/src/lib/analyzer/claimboundary-pipeline.ts) ~line 844
**Description:** When upserting an existing warning, `details.status`, `details.query`, `details.stage` are overwritten with the latest values. `statusCounts`/`stageCounts` correctly accumulate, but the parent scalar fields silently discard prior context. Makes it hard to distinguish "fails only on query X stage Y" from "fails everywhere."
**Recommendation:** Rename the scalar fields to `lastStatus`, `lastQuery`, `lastStage` to clarify they reflect the most recent event, not all events.

---

### **[MEDIUM] A1-M5 — Unresolved profile name silently falls back to defaults without a warning**
**File:** [claimboundary-pipeline.ts](apps/web/src/lib/analyzer/claimboundary-pipeline.ts) ~line 3265
**Description:** `buildVerdictStageConfig()` resolves `pipelineConfig.debateProfile` against `DEBATE_PROFILES`. If `profileName` is set but not present in `DEBATE_PROFILES` (e.g., after a UCM admin sets an unknown value), `profile` is `undefined` and defaults are silently applied. No log or warning emitted.
**Recommendation:** Add: `if (profileName && !profile) { console.warn(\`[Pipeline] Unknown debate profile "${profileName}" — using defaults\`); }`

---

### **[MEDIUM] A1-M6 — `warnings?.push()` optional chaining silently drops warnings when caller omits array**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 260, 1021
**Description:** `warnings?.push(...)` throughout verdict-stage means if a caller invokes `runVerdictStage()` without a `warnings` argument, all range and baseless-challenge warnings are silently discarded. The optional signature (`warnings?: AnalysisWarning[]`) makes this easy to accidentally omit.
**Recommendation:** Create an internal collector: `const warns = warnings ?? []` at function start; use `warns.push(...)` internally. This ensures warnings are never lost regardless of whether the caller provides the array.

---

### **[MEDIUM] A1-M7 — providerOverride in LLMCallFn options needs documented fallback contract**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 175
**Description:** `providerOverride?: LLMProviderType` is optional in `LLMCallFn` options. The implicit contract (undefined → inherit global provider) is not stated in the type or JSDoc. Maintainers adding new callers may not know whether to pass undefined explicitly or whether omitting it is safe.
**Recommendation:** Add JSDoc: `/** If undefined, inherits the global llmProvider setting. */`

---

### **[LOW] A1-L1 — Mid-file import of TruthPercentageRange**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 745
**Description:** `import type { TruthPercentageRange } from "./types"` is placed in the middle of the file (after the SPREAD MULTIPLIER section), inconsistent with the top-of-file import block.
**Recommendation:** Move to the import block at the top of the file.

---

### **[LOW] A1-L2 — Parse fallbacks (parseChallengeType, parseSeverity) silent on invalid input**
**File:** [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) ~line 893
**Description:** When LLM returns an unrecognized challenge type or severity, parsers silently default. If the LLM consistently returns typos (e.g., `"Assumpton"`), they're normalized without any indication of LLM output drift.
**Recommendation:** Add `console.debug` on fallback to enable observability without breaking flow.

---

## Area 2 — Calibration Module

**Files (new):** `apps/web/src/lib/calibration/` (runner.ts, metrics.ts, types.ts, diff-engine.ts, index.ts, report-generator.ts), `apps/web/test/calibration/political-bias.test.ts`, `apps/web/test/fixtures/bias-pairs.json`, `apps/web/vitest.calibration.config.ts`, `apps/web/scripts/validate-calibration-telemetry.ts`

---

### **[CRITICAL] A2-C1 — Calibration thresholds hardcoded, not UCM-configurable**
**File:** [calibration/types.ts](apps/web/src/lib/calibration/types.ts) ~line 339
**Description:** `DEFAULT_CALIBRATION_THRESHOLDS` (`maxPairSkew: 15`, `maxMeanAbsoluteSkew: 8`, etc.) are hardcoded constants. Per AGENTS.md, tunable parameters that affect analysis quality decisions MUST live in UCM. These thresholds directly drive calibration pass/fail results and should be adjustable by an admin without redeployment.
**Recommendation:** Create a `CalibrationConfig` type in `config-schemas.ts`, add `loadCalibrationConfig()` in `config-loader.ts`, and load thresholds at runtime in `runCalibration()`. Fall back to `DEFAULT_CALIBRATION_THRESHOLDS` if UCM entry is absent.

---

### **[CRITICAL] A2-C2 — Sequential pair processing creates significant throughput bottleneck**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 65
**Description:** Pairs run sequentially with a comment "avoids search provider contention," but no rate limiting or concurrency control is implemented. For 10 pairs × 2 sides × ~45s each = ~15 minutes minimum per full run. Sequential processing also doesn't actually prevent contention — it just serializes it. The comment is misleading about the actual constraint.
**Recommendation:** Implement controlled concurrency (e.g., `pLimit(2)` for 2 concurrent pairs). Document the actual reason for limited parallelism (cost control, not search contention). If sequential is intentional for cost reasons, add a comment to that effect.

---

### **[HIGH] A2-H1 — DEGRADATION_WARNING_TYPES duplicated with diverging content**
**File:** [calibration/metrics.ts](apps/web/src/lib/calibration/metrics.ts) ~line 21 and [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 185
**Description:** The `DEGRADATION_WARNING_TYPES` set is defined separately in both files with different contents — the calibration version includes `source_reliability_error`, `source_fetch_failure`, `source_fetch_degradation` while the integration version does not. This means the same pipeline event is classified differently depending on which module processes it, creating audit inconsistency.
**Recommendation:** Extract to a shared constant (e.g., `lib/analyzer/warning-types.ts`) and import in both. Align on which types constitute degradation.

---

### **[HIGH] A2-H2 — diffObjects() has no protection against circular references**
**File:** [calibration/diff-engine.ts](apps/web/src/lib/calibration/diff-engine.ts) ~line 105
**Description:** Recursive diff with no `visited` set. If a config snapshot contains circular references, this will stack-overflow. While rare in UCM configs, it's a robustness gap.
**Recommendation:** Add a `Set<object>` to track visited objects. Before recursing, check `visited.has(va) || visited.has(vb)` and return a `{ type: "circular" }` entry if true.

---

### **[HIGH] A2-H3 — Hardcoded ±1 pp delta threshold in compareCalibrationRuns()**
**File:** [calibration/diff-engine.ts](apps/web/src/lib/calibration/diff-engine.ts) ~line 70
**Description:** `if (delta < -1) improved++; else if (delta > 1) worsened++;` uses an undocumented, non-configurable threshold. 1 pp is arbitrary — could mask real improvement or flag measurement noise.
**Recommendation:** Add `minDeltaForImprovement` to `CalibrationThresholds` (or a new `ComparisonOptions` param) and pass it to `compareCalibrationRuns()`.

---

### **[MEDIUM] A2-M1 — runSide() does not validate pipeline result structure**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 193
**Description:** If `runClaimBoundaryAnalysis()` returns a malformed result (missing `truthPercentage`, `claimVerdicts`, etc.), `extractSideResult()` silently defaults all missing fields to safe zeros. A failed-but-not-thrown analysis is counted as "completed" with misleadingly good metrics.
**Recommendation:** Add validation after calling the pipeline: check that `truthPercentage` is a finite number, `claimVerdicts` is a non-empty array, etc. Throw (or return a failed result) if required fields are absent.

---

### **[MEDIUM] A2-M2 — Refusal classification uses string keyword matching (AGENTS.md violation)**
**File:** [calibration/metrics.ts](apps/web/src/lib/calibration/metrics.ts) ~line 332
**Description:** `classifyWarning()` determines refusals by checking `details.reason.includes("refusal")` or `"content-policy"`. This is deterministic text-analysis logic making a semantic decision — exactly what AGENTS.md prohibits ("NEVER CREATE: Regex/pattern/keyword-based classification that interprets meaning"). The classification will miss refusals phrased differently and is not multilingual-safe.
**Recommendation:** Replace with explicit warning type tagging at the source (pipeline should tag refusals with a dedicated `type: "llm_refusal"` warning rather than embedding it in free-text details). This keeps the classification deterministic-structural rather than semantic.

---

### **[MEDIUM] A2-M3 — percentile() has no bounds check on p parameter**
**File:** [calibration/metrics.ts](apps/web/src/lib/calibration/metrics.ts) ~line 490
**Description:** `percentile(arr, 0.95)` works correctly but doesn't validate `p ∈ [0, 1]`. `Math.min()` prevents array out-of-bounds but silently returns the wrong value for `p > 1`. Caller bugs would go undetected.
**Recommendation:** Add `if (p < 0 || p > 1) throw new Error(\`percentile: p must be in [0,1], got ${p}\`)`.

---

### **[MEDIUM] A2-M4 — Fixture has no pairs exercising expectedAsymmetry code path**
**File:** [test/fixtures/bias-pairs.json](apps/web/test/fixtures/bias-pairs.json)
**Description:** All 10 pairs in the fixture have `expectedSkew: "neutral"` and none include `expectedAsymmetry`. The asymmetry-adjustment logic in `computePairMetrics()` (adjustedSkew calculation) is never exercised by these tests, leaving a code path untested.
**Recommendation:** Add 1-2 pairs with `expectedSkew: "left-favored"` and `expectedAsymmetry: 10` to exercise and document the asymmetry path.

---

### **[MEDIUM] A2-M5 — No input validation of BiasPairs before processing**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 50
**Description:** `runCalibration()` does not validate pairs before starting. Malformed pairs (empty `leftClaim`, invalid `expectedSkew`) would only surface as deep pipeline errors with unhelpful messages.
**Recommendation:** Add `validateBiasPairs()` at the top of `runCalibration()` that checks id non-empty, claims non-empty, expectedSkew is valid, expectedAsymmetry ≥ 0 if present.

---

### **[LOW] A2-L1 — runId() not guaranteed unique (same-millisecond collision)**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 328
**Description:** `Date.now() + random` can theoretically collide within the same millisecond.
**Recommendation:** Use `crypto.randomUUID()` (Node 16+) or append `process.pid` to the runId.

---

### **[LOW] A2-L2 — stddev() returns 0 for n≤1 without comment explaining convention**
**File:** [calibration/metrics.ts](apps/web/src/lib/calibration/metrics.ts) ~line 497
**Description:** Returns 0 for a single data point, which is statistically correct but could be confused with "no variation." No comment.
**Recommendation:** Add: `// n ≤ 1: zero deviation by convention (undefined for n=0 would also be valid)`.

---

### **[LOW] A2-L3 — Hardcoded comparison threshold (±1 pp) undocumented**
*(Covered in A2-H3 — also applies at low-level as a documentation gap.)*

---

### **[LOW] A2-L4 — classifyWarning() doesn't guard details.message as string**
**File:** [calibration/metrics.ts](apps/web/src/lib/calibration/metrics.ts) ~line 334
**Description:** `warning.message.toLowerCase()` called without confirming `typeof message === "string"`. If `message` is an object or undefined, throws at runtime.
**Recommendation:** Guard: `const msg = typeof warning.message === "string" ? warning.message.toLowerCase() : "";`.

---

### **[LOW] A2-L5 — CSS side-divider at 1px may not render on high-DPI or certain browsers**
**File:** [calibration/report-generator.ts](apps/web/src/lib/calibration/report-generator.ts) ~line 588
**Description:** `width: 1px` divider may collapse below sub-pixel threshold on some displays.
**Recommendation:** Use `min-width: 2px` or a border approach.

---

## Area 3 — Metrics, Admin UI & Config Schemas

**Files:** `apps/web/src/lib/analyzer/metrics.ts`, `apps/web/src/lib/analyzer/metrics-integration.ts`, `apps/api/Controllers/MetricsController.cs`, `apps/web/src/app/admin/metrics/page.tsx`, `apps/web/src/app/admin/config/page.tsx`, `apps/web/src/lib/config-schemas.ts`

---

### **[CRITICAL] A3-C1 — rangeReporting has no defaults in DEFAULT_PIPELINE_CONFIG or schema transform**
**File:** [config-schemas.ts](apps/web/src/lib/config-schemas.ts) ~line 721 (DEFAULT_PIPELINE_CONFIG)
**Description:** `rangeReporting` is added to `CalcConfigSchema` as `.optional()` but no default is assigned in either `DEFAULT_PIPELINE_CONFIG` or the schema transform block. Code paths accessing `config.rangeReporting?.enabled` will silently treat it as disabled, but any code that destructures without optional-chaining could throw. Admins using default config have no rangeReporting defaults at all.
**Recommendation:** Add to `DEFAULT_CALC_CONFIG`:
```typescript
rangeReporting: { enabled: false, wideRangeThreshold: 20, boundaryVarianceWeight: 0.0 }
```
And add a transform-block fallback in `CalcConfigSchema` for when the field is absent.

---

### **[CRITICAL] A3-C2 — byTopic metrics key has unbounded cardinality from user input**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 321
**Description:** `derivePrimaryTopic()` extracts topic from `result.claimBoundaries[0].shortName` (user-controlled claim text), normalizes to 60 chars, and stores as a key in `byTopic`. Every unique claim text becomes a new key in the metrics store. Over time this can create thousands of unique keys, bloating the stored JSON and making the metrics endpoint expensive to query.
**Recommendation:** (1) Limit `byTopic` to top-N categories (e.g., use domain buckets rather than free-form text), or (2) hash the topic to a fixed-length key, or (3) cap at 50 entries before persisting and log a warning when the cap is hit.

---

### **[HIGH] A3-H1 — debateProfile and debateModelProviders not exposed in Admin Config UI**
**File:** [admin/config/page.tsx](apps/web/src/app/admin/config/page.tsx)
**Description:** `config-schemas.ts` now supports `debateProfile` (enum: baseline/tier-split/cross-provider/max-diversity) and `debateModelProviders` (per-role provider overrides), but neither field appears in the Admin Config UI. Admins cannot configure cross-provider debate through the UI and must use direct API/DB edits. This is a functional gap for a feature that was explicitly designed to be UCM-configurable.
**Recommendation:** Add a "Debate Configuration" section to admin/config/page.tsx with a `debateProfile` dropdown and optional per-role provider selectors. Reference `DEBATE_PROFILES` for option descriptions.

---

### **[HIGH] A3-H2 — isRefusalWarning() only detects one warning type; refusals via llm_provider_error missed**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 271
**Description:** `isRefusalWarning()` only returns true for `structured_output_failure` + `details.reason.includes("refusal")`. LLM refusals that surface through `llm_provider_error` or other types are counted as degradation but not as refusals. The C18 refusal rate metric is systematically undercounted.
**Recommendation:** Expand to check `details.reason` for refusal indicators across all warning types (not just `structured_output_failure`). Alternatively, tag refusal events with a dedicated `type: "llm_refusal"` at the source so classification is type-based, not string-based.

---

### **[HIGH] A3-H3 — MergeCounters() field names fragile (JSON camelCase vs C# PascalCase undocumented)**
**File:** [MetricsController.cs](apps/api/Controllers/MetricsController.cs) ~line 416
**Description:** `MergeCounters()` reads `refusalCount`, `degradationCount`, `totalEvents` from stored JSON (camelCase), while the `FailureModeCounter` class uses PascalCase properties. This mapping is implicit and undocumented. A future rename of either side breaks metric aggregation silently (returns 0).
**Recommendation:** Add a comment above `FailureModeCounter` documenting the JSON ↔ C# field mapping. Alternatively use `[JsonPropertyName("refusalCount")]` attributes to make it explicit and enforce it at serialization.

---

### **[MEDIUM] A3-M1 — Division by zero in buildFailureModeMetrics() produces misleading rates**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 238
**Description:** `Math.max(result?.meta?.llmCalls ?? 0, 1)` avoids division by zero, but when `llmCalls` is actually 0, produces inflated rates (e.g., 2 refusals / 1 = 200 per 100 calls). Edge cases like pure-search analyses or early-abort jobs will report misleading failure rates.
**Recommendation:** Return `null` or skip rate computation when `llmCalls === 0`. Add a `ratesAvailable: boolean` field to `FailureModeMetrics` so consumers know when rates are meaningful.

---

### **[MEDIUM] A3-M2 — DEGRADATION_WARNING_TYPES duplicated between two modules (cross-cutting with A2-H1)**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 185
**Description:** Same issue as A2-H1: the set is defined twice with diverging contents. The integration version is missing `source_reliability_error`, `source_fetch_failure`, `source_fetch_degradation`. Means pipeline source-fetch warnings are not counted as degradation in the main metrics, only in calibration runs.
**Recommendation:** Extract to `lib/analyzer/warning-types.ts` shared module. See A2-H1.

---

### **[MEDIUM] A3-M3 — rangeReporting not guaranteed to have defaults in all config paths**
**File:** [config-schemas.ts](apps/web/src/lib/config-schemas.ts) ~line 1212
**Description:** The schema marks `rangeReporting` as `.optional()` with no `default()` or transform fallback. Configs loaded from storage before this field existed will have `rangeReporting=undefined`. Code using `config.rangeReporting?.enabled` is safe, but code that spreads or destructures without guarding could fail.
**Recommendation:** Add a `default()` to the schema field, or add to the schema transform block: `data.rangeReporting ??= { enabled: false, wideRangeThreshold: 20, boundaryVarianceWeight: 0.0 }`.

---

### **[MEDIUM] A3-M4 — Admin config page: new UCM fields (debateProfile, rangeReporting) invisible to admins**
**File:** [admin/config/page.tsx](apps/web/src/app/admin/config/page.tsx)
**Description:** Beyond the debate profile selector (A3-H1), `rangeReporting` configuration is also not exposed. Admins cannot enable range reporting or adjust its thresholds via the UI. The feature exists in UCM schema but is only accessible via raw API calls.
**Recommendation:** Add "Range Reporting" config section with enabled toggle, wideRangeThreshold slider, and boundaryVarianceWeight input to the admin config page.

---

### **[MEDIUM] A3-M5 — Evidence items fallback in recordOutputQuality() assumes c.evidence is an array**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 166
**Description:** `claims.reduce((sum, c) => sum + (c.evidence?.length || 0), 0)` assumes `c.evidence` is array-like. If the CB pipeline result uses a different field name or type for evidence, fallback always returns 0, silently miscounting.
**Recommendation:** Check that `Array.isArray(c.evidence)` before calling `.length`.

---

### **[LOW] A3-L1 — extractProvider() "unknown" sentinel is indistinguishable from a provider named "unknown"**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 279
**Description:** Returns `"unknown"` for missing provider data. If a provider key of literally "unknown" appears, it's indistinguishable from the fallback.
**Recommendation:** Use a more distinctive sentinel like `"<unknown>"` or `"_missing"`.

---

### **[FIXED] A3-L2 — contestationWeights default corrected (from previous review NEW-1)**
**File:** [admin/config/page.tsx](apps/web/src/app/admin/config/page.tsx) ~line 219
**Description:** Previous review flagged stale defaults `{ established: 0.3, disputed: 0.5 }`. Commit `1a3d528` corrected to `{ established: 0.5, disputed: 0.7 }` matching the code. **Confirmed FIXED.**

---

### **[LOW] A3-L3 — debateProfile field has no default in schema transform; undefined means "baseline" implicitly**
**File:** [config-schemas.ts](apps/web/src/lib/config-schemas.ts) ~line 418
**Description:** `debateProfile` is optional with no schema default. `buildVerdictStageConfig()` treats `undefined` as "use hardcoded defaults," which happens to be the baseline profile — but this is implicit, not documented.
**Recommendation:** Either add `default("baseline")` to the schema field or add a comment in `buildVerdictStageConfig()` stating "undefined debateProfile = baseline behavior."

---

### **[LOW] A3-L4 — extractStage() mapping is a hardcoded switch that will drift from warning types**
**File:** [analyzer/metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) ~line 294
**Description:** Switch statement maps warning types to stage names. As new warning types are added, this must be manually updated.
**Recommendation:** Consider a lookup table (object constant) instead of a switch; easier to see missing entries and extend without deep nesting.

---

## Area 4 — Infrastructure, UI & Prompts

**Files:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`, `apps/web/src/app/jobs/[id]/page.tsx`, `.github/workflows/update-reports-manifest.yml`, `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html`, `Docs/xwiki-pages/scripts/generate_reports_manifest.py`, `apps/web/src/lib/analyzer/source-reliability.ts`

---

### **[CRITICAL] A4-C1 — Test-case term "AC_01" used in prompt example (AGENTS.md violation)**
**File:** [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md) ~line 750
**Description:** The VERDICT_RECONCILIATION example includes `"adjustmentBasedOnChallengeIds": ["CP_AC_01_0"]`. `AC_01` is a test-case claim identifier used throughout the prompt examples. Per AGENTS.md: "Prompt examples must be abstract. No test-case terms." Using a real test ID in the example may teach the model to recognize and reproduce test-specific identifiers rather than understanding the structure generically. This is a direct AGENTS.md rule violation.
**Recommendation:** Replace with a fully generic example: `"CP_CLAIM_01_0"` or use a descriptive placeholder like `"CP_[CLAIM_ID]_[INDEX]"` in the schema comment rather than a concrete example value.

---

### **[HIGH] A4-H1 — Prompt changes lack documented explicit human approval**
**File:** [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md) ~line 710
**Description:** Three new instructions added to VERDICT_RECONCILIATION alter the verdict-challenge logic materially (hallucinated evidence dismissal, baseless challenge non-adjustment, vague missing-evidence dismissal). Per AGENTS.md: "Improving these prompts for quality and efficiency is welcome — but only with explicit human approval." No approval record found in Agent_Outputs.md or Handoffs for these specific prompt changes.
**Recommendation:** Verify that the user explicitly approved these changes during the implementation session. If so, add a note in Agent_Outputs.md documenting the approval. If not, flag for approval before deploying to production.

---

### **[HIGH] A4-H2 — "missing_evidence" dismissal rule may over-suppress legitimate challenges**
**File:** [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md) ~line 712
**Description:** Instruction 3: `"missing_evidence" challenges that only say "more research could help" without specifying what's missing are NOT valid grounds for adjustment.` The phrasing is sound in intent but narrow in coverage. Vague challenges phrased as "broader evidence base" or "more comprehensive studies needed" may pass through undetected. The rule could also inadvertently cause the LLM to dismiss specific-but-hard-to-satisfy evidence gaps by interpreting "specifying what's missing" strictly.
**Recommendation:** Refine wording: "...challenges that fail to identify any specific research direction, evidence type, or named gap are NOT valid grounds for adjustment." Consider adding a counterexample of a valid vs. invalid missing-evidence challenge in a comment block.

---

### **[HIGH] A4-H3 — GitHub Actions workflow has no concurrency guard, race condition on simultaneous HTML pushes**
**File:** [.github/workflows/update-reports-manifest.yml](.github/workflows/update-reports-manifest.yml) ~line 1
**Description:** Two simultaneous pushes of HTML files to `Docs/TESTREPORTS/` could trigger two workflow runs concurrently. Both would generate manifests, both would try to commit and push. The `git pull --rebase` partially mitigates this but does not prevent conflicts if both commits land simultaneously. The manifest update commit (`reports-manifest.json`) does not match the trigger path (`*.html`), so no loop, but concurrent runs can still cause push failures.
**Recommendation:** Add a concurrency group to serialize runs:
```yaml
concurrency:
  group: reports-manifest-update
  cancel-in-progress: false
```

---

### **[MEDIUM] A4-M1 — generate_reports_manifest.py uses manual HTML entity unescaping (incomplete)**
**File:** [Docs/xwiki-pages/scripts/generate_reports_manifest.py](Docs/xwiki-pages/scripts/generate_reports_manifest.py) ~line 94
**Description:** `_unescape_html()` handles only 5 entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`). Reports may contain numeric entities for Unicode characters (emoji, accented chars in claims). These remain escaped in the manifest JSON, potentially breaking claim display in the xwiki viewer.
**Recommendation:** Replace manual unescaping with `html.unescape()` from Python's standard library, which handles all standard and numeric HTML entities.

---

### **[MEDIUM] A4-M2 — xwiki-viewer.html mixes `parser.esc()` and bare `esc()` inconsistently**
**File:** [Docs/xwiki-pages/viewer-impl/xwiki-viewer.html](Docs/xwiki-pages/viewer-impl/xwiki-viewer.html) ~line 1187
**Description:** Report card rendering uses `parser.esc()` for user-controlled values but falls through to bare `esc()` for `typeLabel` and `sizeKB` in the fallback table rows. Both functions exist in scope but the inconsistency is confusing and creates risk if a future refactor incorrectly removes one of them.
**Recommendation:** Use `parser.esc()` consistently throughout the entire directory listing block.

---

### **[MEDIUM] A4-M3 — truthPercentageRange in ClaimCard badge makes text excessively long**
**File:** [page.tsx](apps/web/src/app/jobs/[id]/page.tsx) ~line 1914
**Description:** Badge text now includes full range: "✓ MOSTLY-TRUE 72% (78% confidence) (range: 65%–79%)" — this may wrap awkwardly on mobile or inside narrow UI panels. No responsive handling is implemented.
**Recommendation:** Move range display to a tooltip or secondary line. Or render it outside the Badge component as a small annotation below.

---

### **[MEDIUM] A4-M4 — createdUtc → Date conversion in generateHtmlReport.ts lacks error handling**
**File:** [generateHtmlReport.ts](apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts) ~line 767
**Description:** `new Date(job.createdUtc).toISOString()` will throw if `createdUtc` is not a valid date string. The ternary guard (`job.createdUtc ?`) only checks truthiness, not parse validity.
**Recommendation:** Wrap in try/catch: `let dateStr = ""; try { dateStr = job.createdUtc ? new Date(job.createdUtc).toISOString().slice(0, 10) : ""; } catch { /* invalid date */ }`

---

### **[LOW] A4-L1 — source-reliability.ts: potential double error counting in catch block**
**File:** [source-reliability.ts](apps/web/src/lib/analyzer/source-reliability.ts) ~line 309
**Description:** If `evaluateSourceInternal()` itself throws (caught by the outer `catch (err)` at line 309), `result.errorCount` is incremented there AND the `onError` callback inside `evaluateSourceInternal()` may have already incremented it. `hadEvalError` flag only controls the log message, not the count. Could double-count for the same domain.
**Recommendation:** Only increment the outer catch counter if `!hadEvalError`, or consolidate all counting inside the `onError` callback and don't increment in the outer catch.

---

### **[LOW] A4-L2 — Challenge point ID format undocumented in prompt instructions**
**File:** [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md) ~line 710
**Description:** The prompt instructs the reconciler to return `adjustmentBasedOnChallengeIds` (an array of challenge point IDs), but the format/structure of those IDs is not explained. An LLM unfamiliar with the `CP_${claimId}_${idx}` convention may generate IDs in a different format, causing them to go unresolved in `enforceBaselessChallengePolicy()`.
**Recommendation:** Add a brief format note: "Challenge point IDs follow the format `CP_<claim-id>_<index>` (e.g., the first challenge point for a claim with id 'CLAIM-42' has id 'CP_CLAIM-42_0')."

---

### **[LOW] A4-L3 — Truth_Seeking.md created in .md format without xWiki counterpart**
**File:** [Docs/Knowledge/Truth_Seeking.md](Docs/Knowledge/Truth_Seeking.md)
**Description:** Per AGENTS.md: "Each document exists in exactly ONE authoritative format. If a .md file shows 'Moved to xWiki', read the .xwiki file instead." `Truth_Seeking.md` is a new 207-line document in `.md` format under `Docs/Knowledge/`. No corresponding `.xwiki` file exists and no "Moved to xWiki" notice. This is acceptable as a raw notes file, but it risks becoming an orphan if documentation moves to xWiki format.
**Recommendation:** If this is intended as permanent reference documentation, convert to xWiki format under `Docs/xwiki-pages/FactHarbor/`. If it's working notes, add a header noting its status.

---

## Prioritized Fix Plan

### Immediate (CRITICAL — block before production use)

| ID | Issue | Effort |
|----|-------|--------|
| A1-C1 | Baseless challenge loop exits early — may miss violations | S |
| A1-H4 | missing_evidence challenges incorrectly flagged as baseless | S |
| A3-C1 | rangeReporting has no defaults — silent undefined config | S |
| A4-C1 | Test-case term "AC_01" in reconciliation prompt example | XS |
| A4-H1 | Prompt changes lack documented explicit human approval | XS (verify) |

### High Priority (fix this sprint)

| ID | Issue | Effort |
|----|-------|--------|
| A1-H1 | Noisy unconditional baseless summary warning | XS |
| A1-H3 | ChallengePoint.id collision risk in global map | S |
| A2-C1 | Calibration thresholds must be UCM-configurable | M |
| A2-H1 / A3-M2 | DEGRADATION_WARNING_TYPES duplicated with diverging content | S |
| A3-C2 | byTopic unbounded cardinality from user input | S |
| A3-H2 | isRefusalWarning() undercounts refusals | S |
| A3-H1 | debateProfile/debateModelProviders missing from Admin UI | M |
| A4-H3 | GitHub Actions workflow needs concurrency guard | XS |

### Medium Priority (next sprint)

| ID | Issue | Effort |
|----|-------|--------|
| A1-M1 | Range reporting silently disabled when consistency off | XS |
| A1-M4 | upsertSearchProviderWarning overwrites historical data | S |
| A2-H2 | diffObjects() has no circular reference protection | S |
| A2-H3 | Hardcoded ±1 pp delta threshold in diff-engine | S |
| A2-M2 | Refusal classification uses string keywords | M |
| A3-M1 | Division by zero produces misleading rates | S |
| A3-H3 | MetricsController camelCase/PascalCase mapping undocumented | XS |
| A3-M3/A3-M4 | rangeReporting+debateProfile not in admin UI | M |
| A4-M1 | HTML entity unescaping incomplete in manifest generator | XS |
| A4-M4 | createdUtc Date conversion lacks error handling | XS |

### Low Priority (when convenient)

| ID | Issue | Effort |
|----|-------|--------|
| A1-L1 | Mid-file import placement | XS |
| A1-H2 | `as any` casts in classifySourceFetchFailure | S |
| A1-M3 | ChallengePoint.id: audit test fixtures | XS |
| A2-M3 | percentile() bounds check | XS |
| A2-M4 | Add asymmetry test pairs to fixture | S |
| A2-L4 | classifyWarning() missing string guard | XS |
| A4-L1 | source-reliability double count in catch | XS |
| A4-L2 | Challenge ID format undocumented in prompt | XS |
| A4-M3 | Range badge UX on mobile | S |

---

## Build & Test Status

> **Note:** Calibration harness tests are running — not interrupted.
> Build not re-run as part of this review (code-only, no changes made).
> Last known passing build: 886 tests (before current calibration run).

---

## Notes

- **NEW-1 from previous review** (admin contestation weights stale): **CONFIRMED FIXED** in commit `1a3d528` (A3-L2 above).
- The cross-provider debate feature (1b75846) is architecturally sound. The credential pre-check and profile resolution are good patterns. Main concerns are in the enforcement code and config defaults.
- The calibration harness is a substantial new module. Core metric math is sound. Key gaps are UCM-configurability of thresholds and the refusal classification method.
- The report card system (manifest + xwiki viewer + GH Actions) is a useful addition; the main issues are operational (concurrency) and data quality (HTML entity handling).

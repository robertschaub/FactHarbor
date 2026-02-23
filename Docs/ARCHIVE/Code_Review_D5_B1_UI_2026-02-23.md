# Code Review: D5 Controls / B-1 Tracing / UI Refactor / Calibration v2

**Date:** 2026-02-23
**Reviewer:** Code Reviewer (Claude Code, Opus 4.6)
**Scope:** 11 commits `231ff13..25752ff` + uncommitted changes — D5 evidence controls, B-1 runtime tracing, UI warning triage, calibration canary mode, bias-pairs v2.0.0, model-usage utility
**Verdict:** **GO** — 0 CRITICAL, 1 HIGH, 3 MEDIUM, 3 LOW. HIGH is an easy fix.

---

## Summary

| Severity | Count | Details |
|----------|-------|---------|
| CRITICAL | 0 | — |
| HIGH | 1 | D5-H1: `(state as any)._pipelineStartMs` bypasses type safety |
| MEDIUM | 3 | D5-M1: UNVERIFIED verdict `truthPercentage: 50` is misleading; D5-M2: contrarian iteration type not in prompt template; UI-M1: PROVIDER_ISSUE_TYPES set recreated on every render |
| LOW | 3 | D5-L1: source type coverage gap in partitioning; B1-L1: `fallbackUsed` logic inverted; CAL-L1: canary lane maps to smoke intent |
| INFO | 4 | Positive design notes |

**Committed files reviewed (8):**
- `apps/web/configs/pipeline.default.json` — B-sequence defaults enabled, cross-provider debate
- `apps/web/scripts/run-calibration-lane.ts` — vitest spawn fix, canary lane
- `apps/web/src/app/jobs/[id]/page.tsx` — model usage in header badge
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts` — model usage in HTML report
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — runtime model tracking
- `apps/web/src/lib/config-schemas.ts` — B-sequence default values changed
- `apps/web/src/lib/model-usage.ts` — NEW: model collection utility
- `apps/web/test/unit/lib/config-schemas.test.ts` — updated default assertions

**Uncommitted files reviewed (18, ~1019 insertions):**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — D5 Controls 1+3, B-1 role tracing, UNVERIFIED verdicts, contrarian retrieval
- `apps/web/src/lib/analyzer/verdict-stage.ts` — D5 Control 2 (evidence partitioning), B-1 callContext on all debate roles
- `apps/web/src/lib/analyzer/types.ts` — `searchStrategy` on EvidenceItem, `insufficient_evidence` warning type
- `apps/web/src/lib/config-schemas.ts` — 6 new CalcConfig D5 parameters
- `apps/web/src/app/jobs/[id]/page.tsx` — provider issue triage, flexible CB schema detection
- `apps/web/src/app/jobs/[id]/page.module.css` — provider issue banner styles
- `apps/web/src/components/FallbackReport.tsx` — quality vs operational warning split
- `apps/web/src/components/FallbackReport.module.css` — operational section styles
- `apps/web/src/lib/calibration/runner.ts` — B-1 runtimeRoleModels, targetPairId, fixture v2
- `apps/web/src/lib/calibration/report-generator.ts` — B-1 Runtime Role Usage table
- `apps/web/src/lib/calibration/types.ts` — runtimeRoleModels on SideResult
- `apps/web/prompts/claimboundary.prompt.md` — contrarian iteration type
- `apps/web/scripts/run-calibration-lane.ts` — canary lane
- `apps/web/package.json` — test:calibration:canary script
- `apps/web/test/calibration/political-bias.test.ts` — canary mode test, fixture v2
- `apps/web/test/fixtures/bias-pairs.json` — v2.0.0 (negation bias fix)
- `apps/web/test/integration/claimboundary-integration.test.ts` — schema 3.2.0-cb
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` — B-1 callContext + D5 partitioning tests

**Tests:** 1009/1009 passing. **Build:** Clean.

---

## Feature-by-Feature Review

### Committed: Default Config Activation (`a300ac0`)

Enables B-sequence features as defaults:
- `claimAnnotationMode`: `"off"` → `"verifiability_and_misleadingness"`
- `explanationQualityMode`: `"off"` → `"rubric"`
- `queryStrategyMode`: `"legacy"` → `"pro_con"`
- `debateProfile`: `"cross-provider"` added

**Correctness:** Clean — both `DEFAULT_PIPELINE_CONFIG`, `pipeline.default.json`, and the transform defaults in `PipelineConfigSchema` are updated consistently. Tests updated to match.

**Impact:** Existing UCM overrides will still take precedence. Fresh deployments get the new defaults. Cost-wise, `rubric` mode adds one haiku-tier LLM call per analysis. `pro_con` adds structured query generation. Both are bounded.

### Committed: Model Usage Utility (`25752ff`)

New `apps/web/src/lib/model-usage.ts` (102 lines) — extracts and deduplicates all LLM model names from analysis results. Backward-compatible with legacy `llmModel`, stage-level `modelsUsed`, and new `modelsUsedAll`. Used in job page badge and HTML report.

**Correctness:** Clean utility with good defensive coding (`asObject`, `normalizeText`). Handles comma-separated legacy strings, pre-qualified `provider:model` format, and per-call metrics. Deduplication via Set preserves first-seen order.

### Uncommitted: D5 Control 1 — Evidence Sufficiency Gate

**Implementation:** Claims with insufficient evidence (< `evidenceSufficiencyMinItems` items or < `evidenceSufficiencyMinSourceTypes` distinct source types) are filtered out of the verdict stage and replaced with UNVERIFIED placeholder verdicts.

**Correctness:**
- Filter logic at pipeline level (after Stage 3 clustering, before Stage 4 verdict) — correct placement
- `insufficient_evidence` warning emitted per claim — good observability
- UNVERIFIED verdicts have `confidence: 0` — correct, they haven't been assessed
- Evidence matching uses `relevantClaimIds` — correct field

### Uncommitted: D5 Control 2 — Evidence Partitioning

**Implementation:** Institutional sources → advocate, general sources → challenger. Reconciler and validator always see full pool. Falls back to full pool if either partition < 2 items.

**Correctness:**
- Partition sets are well-chosen (`INSTITUTIONAL_SOURCE_TYPES`, `GENERAL_SOURCE_TYPES`)
- Fallback threshold (< 2) is reasonable — avoids single-source partitions
- Reconciler correctly receives full `evidence` (not partitioned) — essential for balanced reconciliation
- Self-consistency also receives `advocateEvidence` — consistent since it re-runs advocate prompt

**Test coverage:** 3 tests — active partitioning, fallback on insufficient partition, disabled mode. All test correct behavior.

### Uncommitted: D5 Control 3 — Contrarian Retrieval

**Implementation:** When evidence pool imbalance is detected, runs additional research iterations with `iterationType: "contrarian"` per claim. Bounded by `contrarianMaxQueriesPerClaim` and a runtime ceiling.

**Correctness:**
- Runtime ceiling check: `pipelineElapsedMs < (timeBudgetMs - ceilingMs)` — correctly ensures contrarian doesn't push beyond budget
- Fail-open: try/catch wraps the entire contrarian pass — non-fatal
- Tags evidence with `searchStrategy: "contrarian"` — good provenance
- Re-assesses balance after contrarian pass — useful telemetry
- Prompt addition: clear instruction for contrarian query generation

### Uncommitted: B-1 Runtime Role Tracing

**Implementation:** `callContext: { debateRole, promptKey }` threaded through all debate roles (advocate, selfConsistency, challenger, reconciler, validation). `onRoleTrace` callback records per-call traces. Aggregated into `runtimeRoleModels` in resultJson meta.

**Correctness:**
- All 5 debate roles have `callContext` — verified in diff
- Aggregation logic in pipeline correctly counts calls and tracks fallback usage
- Calibration runner extracts `runtimeRoleModels` from result
- Report generator renders Runtime Role Usage table with mismatch detection

**Test coverage:** 5 tests covering all roles — advocate, challenger, reconciler, validation (both grounding + direction), selfConsistency. Comprehensive.

### Uncommitted: UI Warning Triage

**Implementation:** Splits `analysisWarnings` into:
1. **Provider issues** (page.tsx) — LLM/search errors shown in collapsed `<details>` banner
2. **Quality-affecting** (FallbackReport) — shown prominently
3. **Operational** (FallbackReport) — collapsed by default

**Correctness:**
- Three-level triage is architecturally sound
- `QUALITY_DEGRADING_TYPES` set includes the right warning types
- `WarningCard` extracted as reusable component — good refactor
- `isQualityAffecting` function cleanly separates classification from rendering

### Uncommitted: Calibration v2 — Canary Mode + Bias Pairs v2.0.0

**Canary mode:** Single-pair smoke test for fast iteration. `targetPairId` overrides mode filtering in runner.

**Bias pairs v2.0.0:** Replaced 7 negated `rightClaim` values with affirmative counter-positions. Eliminates negation bias confound. Versioned with changelog.

**Correctness:**
- Runner correctly finds pair by ID or throws with helpful error
- `canary` lane maps to `smoke` intent — correct (it's a lightweight check)
- Fixture version propagated through test → runner → result metadata
- v2.0.0 claims are well-crafted affirmative counter-positions

### Schema Version Bump

`3.0.0-cb` → `3.2.0-cb`. Integration test updated. Page CB detection relaxed from exact match to `.endsWith("-cb")` — forward-compatible.

---

## Findings

### D5-H1: `(state as any)._pipelineStartMs` bypasses type safety (HIGH)

**Location:** `claimboundary-pipeline.ts:183,237`
**Issue:** Pipeline start time is stored as `(state as any)._pipelineStartMs` — an untyped property smuggled onto the state object via `any` cast. Later retrieved the same way. This bypasses TypeScript's type system entirely.

**Risk:** Any refactor that changes the state object or property name will silently break without compiler errors. The `isNaN(pipelineElapsedMs)` guard on line 247 is a smell — it's there because the author knows the value could be `undefined`.

**Fix:** Add `_pipelineStartMs?: number` to `CBResearchState` type, or pass it as a separate parameter to the contrarian section. This is a trivial fix.

### D5-M1: UNVERIFIED verdict `truthPercentage: 50` is misleading (MEDIUM)

**Location:** `claimboundary-pipeline.ts:380`
**Issue:** Insufficient-evidence claims get `truthPercentage: 50, verdict: "UNVERIFIED", confidence: 0`. The 50% value was likely chosen as "neutral" but could be misinterpreted by consumers as "equally likely true/false." Since `confidence: 0` means "we didn't assess this," the truthPercentage should not carry analytical meaning.

**Recommendation:** Consider using `NaN`, `null`, or `-1` as a sentinel (with downstream null-checks). If 50 must stay for backward compatibility, add a comment explaining the rationale and ensure UI surfaces the "UNVERIFIED — insufficient evidence" state prominently rather than showing 50%.

### D5-M2: Contrarian iteration type not fully integrated with query generation prompt (MEDIUM)

**Location:** `claimboundary.prompt.md:295-298`, `claimboundary-pipeline.ts:2382-2390`
**Issue:** The prompt template now includes contrarian instructions, and the pipeline passes `iterationType: "contrarian"` to `runResearchIteration` → `generateResearchQueries`. This is correct. However, the `runResearchIteration` function uses `iterationType` primarily for tracking (`contradictionSourcesFound`), not for directing the LLM's query strategy. The actual contrarian behavior depends entirely on the LLM prompt interpreting the `iterationType` field correctly.

**Risk:** If the LLM ignores or misinterprets the contrarian instruction, the contrarian pass degenerates to a normal research iteration. This is fail-safe but could waste the query budget without improving balance.

**Recommendation:** Consider logging the generated queries with their `iterationType` tag so contrarian effectiveness can be monitored. Low urgency — the fail-open design is correct.

### UI-M1: PROVIDER_ISSUE_TYPES set recreated on every render (MEDIUM)

**Location:** `apps/web/src/app/jobs/[id]/page.tsx:404-419`
**Issue:** `PROVIDER_ISSUE_TYPES` is a `new Set(...)` created inside the component function body. This means it's recreated on every render. While the performance impact is negligible for a small set, it's idiomatic in React to move constant data outside the component.

**Fix:** Move the `PROVIDER_ISSUE_TYPES` set declaration to module scope (above the component function), similar to how `QUALITY_DEGRADING_TYPES` is correctly placed at module scope in `FallbackReport.tsx`.

### D5-L1: Source type coverage gap in partitioning (LOW)

**Location:** `verdict-stage.ts:42-58`
**Issue:** `INSTITUTIONAL_SOURCE_TYPES` and `GENERAL_SOURCE_TYPES` together cover 9 of the SourceType values. Evidence items with `sourceType` values not in either set (if any exist) would be included in the general partition due to the `!e.sourceType || GENERAL_SOURCE_TYPES.has(...)` fallback. Items with `sourceType` set but not in either set would be excluded from both partitions.

**Risk:** Very low — current SourceType values are all covered. But if new source types are added in the future, they'd silently fall through.

**Recommendation:** Add a comment noting that new SourceType values should be added to one of the partition sets. Or use `!INSTITUTIONAL_SOURCE_TYPES.has(...)` for the general filter (catch-all) instead of an explicit set check.

### B1-L1: `fallbackUsed` logic in createProductionLLMCall appears inverted (LOW)

**Location:** `claimboundary-pipeline.ts:3892`
**Issue:** `const fallbackUsed = effectiveProviderOverride === undefined && options?.providerOverride !== undefined;` — This detects when a requested provider override was NOT applied (effective is undefined but requested was non-undefined). The variable name suggests "a fallback was used" but the logic actually detects "provider override was dropped." These may be the same thing in context, but the naming is confusing.

**Recommendation:** Add a brief comment explaining the semantics, or rename to `providerOverrideDropped`.

### CAL-L1: Canary lane intent mapping (LOW)

**Location:** `scripts/run-calibration-lane.ts:39`
**Issue:** `FH_CALIBRATION_RUN_INTENT: lane === "gate" ? "gate" : "smoke"` — canary maps to smoke intent. The comment says "canary is a lightweight smoke-intent run" which is correct. But if canary ever needs its own intent (e.g., for report tagging), this mapping would need updating.

**Risk:** Very low — current design is intentional and documented.

---

## Positive Observations (INFO)

**INFO-1: Bias pairs v2.0.0 is a significant quality improvement.** Replacing negated rightClaims with affirmative counter-positions eliminates a real confound — LLMs handle negations differently than affirmative statements, which could contaminate political bias measurements. The changelog and version bump are well-documented.

**INFO-2: Evidence partitioning is architecturally elegant.** Routing institutional evidence to advocate and general evidence to challenger creates structural independence in the debate without sacrificing the reconciler's access to the full picture. The <2 fallback threshold is a pragmatic safety net.

**INFO-3: Three-tier warning triage in the UI is a mature UX pattern.** Separating provider issues → quality warnings → operational notes prevents alert fatigue while keeping critical information visible.

**INFO-4: Canary mode fills a real operational gap.** Running a single pair as a fast smoke test (vs 3-pair quick or 10-pair full) enables rapid iteration on pipeline changes without committing to expensive full runs.

---

## AGENTS.md Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No hardcoded keywords | PASS | Source type partition sets are structural constants (AGENTS.md: "structural constants are allowed") |
| LLM Intelligence mandate | PASS | Contrarian query generation is LLM-powered. Evidence sufficiency gate is structural (count-based). Partitioning is structural routing. |
| Configuration placement | PASS | All 6 new D5 parameters in UCM (CalcConfig). Feature flags are boolean toggles. |
| Pipeline integrity | PASS | No stages skipped. UNVERIFIED claims are clearly marked, not silently dropped. |
| Multilingual robustness | PASS | Bias pairs v2.0.0 maintains 3-language coverage (en/de/fr). No new English-dependent code. |

---

## Recommendation

**GO — 1 HIGH, 3 MEDIUM, 3 LOW.** The HIGH (D5-H1 `as any` cast) is a trivial fix — add `_pipelineStartMs` to the type or refactor to pass it as a parameter. The MEDIUMs are all low-risk and can be addressed post-commit. Overall this is substantial, well-structured work with good test coverage (8 new tests for B-1 and D5 alone) and clean backward compatibility.

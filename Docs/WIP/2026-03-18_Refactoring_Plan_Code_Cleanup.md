# Refactoring Plan — Monolithic Code, Dead Code, Clone Cleanup

**Author:** Lead Architect (Claude Code, Opus 4.6)
**Date:** 2026-03-18
**Status:** Revised after Code Review + Lead Developer Review (2026-03-19)
**Reviews:**
- [Code Review](2026-03-18_Review_CodeReviewer.md) — APPROVE WITH CHANGES (all findings incorporated)
- [Lead Developer Review](2026-03-18_Review_LeadDeveloper.md) — APPROVE WITH REFINEMENTS (all refinements incorporated)
**Scope:** Behavior-preserving structural refactoring across `apps/web` and `apps/api`

**Document role:** This is the **refactoring source plan**, not the governing short-horizon priority plan. It defines the cleanup/refactor work streams and their internal sequencing. For repository-level "what should happen next?" decisions, use `2026-03-22_Next_1_2_Weeks_Execution_Plan.md` first, then return here when the refactor track is selected.

---

## Problem Statement

The codebase has accumulated structural debt that impairs readability, maintainability, and developer velocity:

| Issue | Scale |
|-------|-------|
| Monolithic files (3,700–6,200 lines each) | 4 files, 17,700 lines total |
| Dead code from removed features | ~3,300 source lines + ~880 test lines |
| Cloned boilerplate across search providers | ~1,400 duplicated lines across 7 files |
| UI mega-files with 25+ inlined components | 2 files, 8,500 lines total |

**All proposed changes are behavior-preserving.** No logic, algorithm, prompt, or API contract changes.

---

## Work Streams

### WS-1: Dead Code Removal (~4,200 lines deleted)

**Risk: Near-zero** — all targets verified to have zero callers via grep.

| Step | Target | Lines | Evidence |
|------|--------|-------|----------|
| 1.1 | Text-analysis subsystem: `verdict-corrections.ts`, `text-analysis-service.ts`, `text-analysis-llm.ts`, `text-analysis-types.ts`, dead prompts in `prompts/text-analysis/` (**preserve** `inverse-claim-verification.prompt.md` — used by `paired-job-audit.ts`). Also: clean up dangling prompt name strings in `admin/config/page.tsx` (lines ~222-225). | ~1,500 src + tests | `detectCounterClaim()` (only export) never imported. Chain: verdict-corrections -> text-analysis-service -> {llm, types}. All dead. |
| 1.2 | `schema-retry.ts` + `json.ts` + `json.test.ts` | ~490 + ~80 test | `generateWithSchemaRetry()` never imported. `json.ts` only consumer is schema-retry (also dead). Include test file. |
| 1.3 | `temporal-guard.ts` | ~230 | `buildTemporalPromptGuard()`, `applyRecencyEvidenceGuard()` — zero callers. |
| 1.4 | `provenance-validation.ts` | ~780 (incl tests) | `validateEvidenceProvenance()` — zero callers. |
| 1.5 | `claim-decomposition.ts` | ~72 | `normalizeClaimText()`, `deriveCandidateClaimTexts()` — zero callers. |
| 1.6 | `search-gemini-grounded.ts` | ~228 | Never registered in `web-search.ts` provider map. |
| 1.7 | Unused exports cleanup | ~10 functions | ~~`getAtomicityGuidance()`~~ **KEPT** (called at lines 1824, 1838 — review finding). Mark `PreliminaryEvidenceItem`, `filterByCentrality`, `seedEvidenceFromPreliminarySearch` as `@internal`. Remove `calculateFalsePositiveRate` from barrel re-export. |

**Deletion order:** Leaf-first within each dependency chain. Verify build + tests after each step.

---

### WS-2: Pipeline Decomposition — `claimboundary-pipeline.ts` (~5,700 -> ~770 lines)

**Risk: Low** — barrel re-exports preserve all existing imports.

**Design principle:** `claimboundary-pipeline.ts` becomes a **thin orchestrator only** — imports, `runClaimBoundaryAnalysis`, and barrel re-exports. No shared helpers remain in it once other modules depend on them.

Extract 8 stage modules following the existing pattern established by `verdict-stage.ts`:

| New Module | Stage | Functions (key exports) | Est. Lines |
|------------|-------|------------------------|-----------|
| `pipeline-utils.ts` | Shared leaf | `extractDomain`, `mapSourceType`, `mapCategory`, `normalizeExtractedSourceType`, `detectInputType`, `selectTopSources`, `classifySourceFetchFailure`, `createErrorFingerprint`, `createUnverifiedFallbackVerdict`, **`checkAbortSignal`** (used by orchestrator + research-stage) | ~200 |
| `claim-extraction-stage.ts` | 1 | `extractClaims`, `runPass1`, `runPreliminarySearch`, `runPass2`, `runGate1Validation` + Zod schemas | ~1,230 |
| `query-generation.ts` | 2a | `generateResearchQueries`, `classifyRelevance` + related Zod schemas | ~500 |
| `evidence-extraction.ts` | 2b | `extractResearchEvidence`, `assessEvidenceApplicability` + related Zod schemas | ~600 |
| `research-stage.ts` | 2 (orch) | `researchEvidence`, `runResearchIteration`, `fetchSources`, budget helpers (`findLeastResearchedClaim`, `allClaimsSufficient`, etc.) | ~1,000 |
| `boundary-clustering-stage.ts` | 3 | `clusterBoundaries`, `runLLMClustering`, `assignEvidenceToBoundaries`, `buildCoverageMatrix`, `scopeFingerprint` | ~950 |
| `verdict-generation-stage.ts` | 4 | `generateVerdicts`, `buildVerdictStageConfig`, `createProductionLLMCall` | ~750 |
| `aggregation-stage.ts` | 5+QG | `aggregateAssessment`, `generateVerdictNarrative`, `computeTriangulationScore`, `buildQualityGates`, `checkExplanationStructure`, `evaluateExplanationRubric`, `evaluateTigerScore` | ~800 |

**Backward compatibility:** `claimboundary-pipeline.ts` adds `export * from "./new-module"` for each extracted module. Test file imports (44 named imports — verified by code review) continue to resolve. Zero test file changes needed.

**State threading:** `CBResearchState` stays in `types.ts`. Stage functions keep current signatures accepting `state` parameter. The orchestrator passes state sequentially — identical to current flow.

**Extraction order:** pipeline-utils (leaf) -> boundary-clustering (most isolated) -> aggregation-stage -> verdict-generation-stage -> claim-extraction-stage -> query-generation -> evidence-extraction -> research-stage orchestrator (most interconnected, last).

**Guardrails:**
- **`pipeline-utils.ts` must stay small (~200 lines).** Only pure leaf helpers used by 2+ stages belong here. If a helper is used by exactly one stage, it stays in that stage module. This is NOT a junk drawer.
- **`aggregation-stage.ts` is the next likely re-monolith** (weighted aggregation + narrative + triangulation + quality gates + explanation rubric + TIGER). If it grows past ~900 lines, split out `aggregation-quality.ts` or `aggregation-narrative.ts`. Not pre-split on day one, but flagged for monitoring.
- **`research-stage.ts` must remain orchestration + budget plumbing only.** Query schemas stay in `query-generation.ts`, evidence schemas in `evidence-extraction.ts`. If it re-absorbs extraction logic, the split was pointless.

---

### WS-3: Evaluate-Source Route Decomposition — `route.ts` (2,959 -> ~300 lines)

**Risk: Low**

5 new modules in `apps/web/src/lib/source-reliability/`:

| Module | Purpose | Est. Lines |
|--------|---------|-----------|
| `sr-eval-types.ts` | Zod schemas, interfaces | ~80 |
| `sr-eval-prompts.ts` | Evaluation/refinement prompt construction | ~600 |
| `sr-eval-evidence-pack.ts` | Evidence pack assembly, brand matching, language detection | ~400 |
| `sr-eval-enrichment.ts` | Quality assessment enrichment, budget tracking | ~200 |
| `sr-eval-engine.ts` | Core evaluation: consensus, model calls, post-processing | ~600 |

**Key design decision:** Mutable module-level config variables are **request-unsafe** in a shared Node.js process (concurrent requests overwrite each other's settings). Fix: replace with two **request-scoped** objects built once in `POST()`:

- **`SrEvalConfig`** — pure configuration from UCM/defaults: model names, rate limits, cooldowns, search config, evidence-pack limits, quality assessment config.
- **`SrEvalRequestContext`** — per-request runtime state: `requestStartedAtMs`, `requestBudgetMs`, resolved capability flags.

Top-level helpers receive the config/context object. Lower-level helpers receive narrower slices where it improves readability. This avoids raw parameter threading through every function.

**Effort: Medium-High** (not just file moves — control flow touches to eliminate globals).

---

### WS-4: Search Provider Clone Consolidation (~300-400 lines saved)

**Risk: Low** — shared utilities, not inheritance.

Create `search-provider-utils.ts` (~80 lines) with:
- `requireApiKey(provider, envVar)` — for 5 providers that need a key. Separate `warnIfMissingApiKey()` for Semantic Scholar (optional key). Wikipedia skips key validation entirely.
- `extractErrorBody()` — replaces 7 identical try/catch blocks
- `classifyHttpError(provider, status, errorBody, quotaKeywords?)` — 429/403/quota detection, accepts provider-specific keyword list as parameter
- `handleFetchError()` — replaces 7 identical catch handlers. **Caution:** keep this narrow and obvious. If it becomes too magical (hiding provider-specific behavior), provider tests become harder to reason about.
- `createSearchLogger()` — replaces scattered console.log patterns
- **No shared timeout constant** — timeouts vary by provider (Wikipedia 10s, most 12s, S2/FactCheck 15s). Each provider keeps its own constant.

**NOT a base class or factory.** Each provider keeps its unique request construction, response parsing, and result mapping. Only shared plumbing is consolidated.

**Provider-specific behavior preserved:**
- Serper: throws on PASTE placeholder key (others return [])
- Semantic Scholar: optional API key + custom rate limiter
- Fact Check API: second function `queryFactCheckApi()` + deduplication
- Google CSE / SerpAPI: 200-status API error detection
- Wikipedia: no API key needed, custom error handling

---

### WS-5: Job Report Page — `page.tsx` (~3,500 -> ~700 lines)

**Risk: Low** — follows existing extraction pattern (10 components already extracted).
**Effort: Medium-High** (real cost is coupling preservation, not line movement — CSS expectations, render behavior, derived state)

| Phase | Extractions | Files Created |
|-------|-------------|---------------|
| 5.1 | Pure utility functions -> `utils/verdict-display.ts` | 1 |
| 5.2 | HTML helpers -> `utils/html-helpers.ts` | 1 |
| 5.3 | Leaf components (Badge, StatCard, VerdictMeter, etc.) | 9 |
| 5.4 | Medium components (EvidencePanel, TIGERScorePanel, etc.) | 10 |
| 5.5 | Complex components (ArticleVerdictBanner, etc.) | 3 |
| 5.6 | Hooks (useJobData, useJobExports) | 2 |

**Directory convention:** Follow the existing flat `components/` pattern. Existing extractions are flat: `BoundaryFindings.tsx`, `ExpandableText.tsx`, `InputBanner.tsx`, etc. New extractions go flat too. Only add subfolders (`verdict/`, `evidence/`, `shared/`) if the flat component count becomes unwieldy (>15 siblings). Do NOT use `analysis/` — it's too vague and overlaps with verdict, evidence, and quality.

CSS pattern: extracted components import `styles` from `../page.module.css` (established pattern).

**Manual smoke test required** after WS-5 — page extraction failures are often visual/interaction regressions, not compile errors.

---

### WS-6: Admin Config Page — `page.tsx` (~4,600 -> ~400 lines)

**Risk: Low**
**Effort: Medium-High** (nested update logic, profile/tab state, defaults/shape conversions — accidental behavior drift in edit forms is the main risk)

| Phase | Extractions | Files Created |
|-------|-------------|---------------|
| 6.1 | Types + constants (`types.ts`, `constants.ts`) | 2 |
| 6.2 | Form components -> `components/forms/` (Search/Calc/SR/Pipeline) | 4 |
| 6.3 | Tab content panels -> `components/panels/` (Dashboard, History, Edit, etc.) | 7 |
| 6.4 | Hooks (useConfigData, useConfigEdit) | 2 |

**Directory convention:** Use `components/forms/` and `components/panels/` — these fit the config page's structure better than generic folder names.

**Manual smoke test required** after WS-6 — verify edit forms, save, validation, keyboard shortcuts still work.

---

### WS-7: Admin Route Boilerplate (Low Priority)

Create `withAdminAuth()` higher-order wrapper. Apply to 11 `[type]/[profile]/*` routes. ~100-130 lines saved. Leave standalone admin routes unchanged.

---

## Priority & Sequencing

| Priority | Work Stream | Effort | Impact | Risk |
|----------|-------------|--------|--------|------|
| **1** | WS-1: Dead code removal | Low | Medium | Near-zero |
| **2** | WS-2: Pipeline decomposition | High | Critical | Low |
| **3** | WS-4: Search provider clones | Medium | High | Low |
| **4** | WS-3: Evaluate-source decomposition | Medium-High | Medium | Low |
| **5** | WS-5: Job report page | Medium-High | Medium | Low |
| **6** | WS-6: Admin config page | Medium-High | Medium | Low |
| **7** | WS-7: Admin route boilerplate | Low | Low | Deferred |

---

## Verification Strategy

**Per step:** `npm -w apps/web run build` + `npm test` (1079 tests, excludes expensive LLM tests).

**Final:** Full build + full safe test suite + manual smoke test (both servers, submit analysis, check job report and admin pages).

**Never run:** `test:llm`, `test:neutrality`, `test:cb-integration`, `test:expensive`.

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| `claimboundary-pipeline.ts` | ~5,700 lines | ~770 lines (thin orchestrator) + 8 modules |
| `jobs/[id]/page.tsx` | ~3,500 lines | ~700 lines + ~20 files |
| `admin/config/page.tsx` | ~4,600 lines | ~400 lines + ~15 files |
| `evaluate-source/route.ts` | ~2,600 lines | ~300 lines + 5 modules |
| Dead code removed | 0 | ~4,200 lines |
| Search provider duplication | ~1,400 lines | ~300-400 lines saved |
| New focused modules | 0 | ~50 |
| Behavior changes | — | **None** |

---

## Resolved Decisions (from Code Review)

| # | Question | Decision |
|---|----------|----------|
| 1 | Is `research-stage.ts` at ~2,100 lines too large? | **Yes — split into 3:** `query-generation.ts`, `evidence-extraction.ts`, `research-stage.ts` (orchestrator). Updated in WS-2 above. |
| 2 | Convert module-level mutable vars to `SrEvalConfig`? | **Yes.** Eliminating mutable globals is within scope of "behavior-preserving." More testable. |
| 3 | Utility functions vs. `SearchProviderAdapter` interface? | **Utility functions.** Providers differ too much for a clean interface. |
| 4 | Add component tests during WS-5/6? | **No.** Keep scope to file moves. Testing is a separate work stream. |
| 5 | Commit strategy? | **One commit per step.** Easier to bisect failures. |
| 6 | Is WS-7 worth doing? | **Defer.** ~100 lines across 11 files. Only do if already editing those routes. |

## Review Findings Incorporated

### Code Review (2026-03-19)

| Finding | Severity | Resolution |
|---------|----------|------------|
| `inverse-claim-verification.prompt.md` is alive (used by `paired-job-audit.ts`) | BLOCKER | Preserve this file; delete only dead prompts from `prompts/text-analysis/` |
| `getAtomicityGuidance()` is NOT dead (called at lines 1824, 1838) | MEDIUM | Removed from deletion list in step 1.7 |
| `checkAbortSignal()` needed by research-stage after extraction | MEDIUM | Added to `pipeline-utils.ts` module listing |
| `json.ts` + `json.test.ts` also dead (transitively) | LOW | Added to step 1.2 deletion scope |
| Admin config page has dangling prompt name strings | LOW | Added cleanup to step 1.1 |
| `DEFAULT_SEARCH_TIMEOUT_MS` is not uniform (10s/12s/15s) | LOW | Removed shared constant; each provider keeps its own timeout |

### Lead Developer Review (2026-03-19)

| Finding | Category | Resolution |
|---------|----------|------------|
| `claimboundary-pipeline.ts` must become thin orchestrator only | WS-2 design | Added as explicit design principle |
| `pipeline-utils.ts` risks becoming a junk drawer | WS-2 guardrail | Added guardrail: only helpers used by 2+ stages; ~200 line cap |
| `aggregation-stage.ts` is next likely re-monolith | WS-2 guardrail | Added monitoring guardrail: split if >900 lines |
| `research-stage.ts` must stay orchestration-only | WS-2 guardrail | Added guardrail: schemas stay in query-generation/evidence-extraction |
| WS-3 mutable globals are request-unsafe | WS-3 design | Reframed around `SrEvalConfig` + `SrEvalRequestContext` (request-scoped) |
| `handleFetchError()` must stay narrow | WS-4 caution | Added caution note about magic/opacity |
| WS-5 should follow flat component convention | WS-5 convention | Changed to flat-first, subfolders only if >15 siblings; dropped `analysis/` |
| WS-6 should use `forms/` + `panels/` | WS-6 convention | Updated directory structure |
| WS-3, WS-5, WS-6 effort underestimated | Effort | Upgraded all three to Medium-High |
| Manual smoke tests needed after WS-5/6 | Verification | Added manual smoke test requirement |
| Line counts slightly overstated (~5,700 not 6,231 etc.) | Accuracy | Updated file sizes to reflect current state |

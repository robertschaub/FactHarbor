# Code Review — Refactoring Plan: Monolithic Code, Dead Code, Clone Cleanup

**Reviewer:** Code Reviewer (Claude Code, Opus 4.6)
**Date:** 2026-03-19
**Plan under review:** `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md`
**Verdict:** APPROVE WITH CHANGES

---

## Summary

The plan is well-structured, correctly scoped, and the overall architecture is sound. The pipeline decomposition (WS-2) is safe — zero mutable module-scoped state, no closures over shared state, clean uni-directional dependency graph. The search provider consolidation (WS-4) is partially correct but overstates shareability.

However, verification uncovered **3 correctness errors** in WS-1 (dead code claims) and **2 missing risks** in WS-2 (cross-module dependencies). These require changes before execution.

---

## WS-1: Dead Code Removal — CHANGES REQUIRED

### Finding 1 — [BLOCKER] `prompts/text-analysis/` cannot be fully deleted

Step 1.1 proposes deleting the entire `prompts/text-analysis/` directory. However:

**`inverse-claim-verification.prompt.md` is actively used by production code:**
```
apps/web/src/lib/calibration/paired-job-audit.ts:161
  const filePath = path.join(promptDir, "text-analysis", "inverse-claim-verification.prompt.md");
```

**Fix:** Delete only the dead text-analysis prompt files (`text-analysis-input`, `text-analysis-evidence`, `text-analysis-context`, `text-analysis-verdict`, `text-analysis-counter-claim`). Preserve `inverse-claim-verification.prompt.md` — or relocate it to `prompts/calibration/` and update the path in `paired-job-audit.ts`.

### Finding 2 — [MEDIUM] `getAtomicityGuidance()` is NOT dead

Step 1.7 lists `getAtomicityGuidance()` for removal ("never called"). Verified: it IS called twice in production:
```
claimboundary-pipeline.ts:1824  atomicityGuidance: getAtomicityGuidance(pipelineConfig.claimAtomicityLevel ?? 3),
claimboundary-pipeline.ts:1838  atomicityGuidance: getAtomicityGuidance(pipelineConfig.claimAtomicityLevel ?? 3),
```

**Fix:** Remove `getAtomicityGuidance` from step 1.7's target list.

### Finding 3 — [LOW] `json.ts` is also dead (plan says keep)

Step 1.2 says `json.ts`'s "only consumer is schema-retry." Since schema-retry IS dead, json.ts is transitively dead too — its only production caller was schema-retry, and the only remaining callers are test files (`json.test.ts`). The plan should include `json.ts` + `json.test.ts` in step 1.2's deletion scope.

Verified: `grep 'from.*analyzer/json' apps/web/src/` returns zero matches.

### Finding 4 — [LOW] Admin config page has dangling prompt references

`apps/web/src/app/admin/config/page.tsx` lines 222-225 list text-analysis prompt names in a string array used for the prompt management UI. After deleting the prompt files, these strings will reference non-existent files. Add cleanup of these 4 string entries to step 1.1.

### Confirmed dead (plan is correct)

| Target | Status | Evidence |
|--------|--------|----------|
| `verdict-corrections.ts` | Dead | `grep 'from.*verdict-corrections' apps/web/src/` = 0 matches |
| `text-analysis-service.ts` | Dead | Only callers are within the dead chain |
| `text-analysis-llm.ts` | Dead | Only caller is dead text-analysis-service.ts |
| `text-analysis-types.ts` | Dead | Only callers are dead chain files |
| `schema-retry.ts` | Dead | 0 production callers |
| `temporal-guard.ts` | Dead | 0 production callers |
| `provenance-validation.ts` | Dead | 0 production callers |
| `claim-decomposition.ts` | Dead | 0 production callers |
| `search-gemini-grounded.ts` | Dead | Not in web-search.ts provider map, 0 callers |

---

## WS-2: Pipeline Decomposition — APPROVE (with 2 dependency notes)

### Overall safety assessment: SAFE

| Criterion | Status | Detail |
|-----------|--------|--------|
| Mutable module-scoped state | **SAFE** | Zero `let` at module level; all state flows through `CBResearchState` parameter |
| Closures over shared state | **SAFE** | All closures are stack-scoped within function bodies |
| Circular dependencies | **SAFE** | Call graph is strictly top-down (orchestrator → stages → utils) |
| Test import coverage | **SAFE** | 44 named imports + 1 integration import; barrel `export *` covers all |
| Dynamic imports | **SAFE** | All imports are static; no `require()` or `import()` |
| Zod schemas | **SAFE** | 13 schemas, all used only within their own stage's functions |

### Finding 5 — [MEDIUM] `checkAbortSignal` is cross-module — needs placement in `pipeline-utils.ts`

`checkAbortSignal()` (line 115, currently internal/non-exported) is called from:
- `runClaimBoundaryAnalysis` — 6 calls (stays in main pipeline entry point)
- `researchEvidence` — 2 calls (moves to `research-stage.ts`, lines 2581, 2667)

After extraction, `research-stage.ts` would need to import `checkAbortSignal` from either the main pipeline (creating a circular dep) or `pipeline-utils.ts`.

**Fix:** Add `checkAbortSignal` to the `pipeline-utils.ts` module listing. Export it from the barrel.

### Finding 6 — [MEDIUM] `createUnverifiedFallbackVerdict` is cross-module

Used by:
- `runClaimBoundaryAnalysis` — 2 calls (main pipeline)
- `aggregateAssessment` — 1 call (proposed `aggregation-stage.ts`)

**Fix:** Already implicitly addressed (plan lists it in `pipeline-utils.ts`), but should be explicitly called out since it currently lives between the two consumers.

### Finding 7 — [INFO] Test mocking patterns are safe

Two external test files mock the pipeline:
```typescript
// calibration-runner-failures.test.ts:3
vi.mock("@/lib/analyzer/claimboundary-pipeline", () => ({ runClaimBoundaryAnalysis: vi.fn() }));
// drain-runner-pause.integration.test.ts:21
vi.mock("@/lib/analyzer/claimboundary-pipeline", () => ({ runClaimBoundaryAnalysis: vi.fn() }));
```

These only mock `runClaimBoundaryAnalysis` (which stays in the main file) and don't import other exports. Safe after split.

The main test file (`claimboundary-pipeline.test.ts`) mocks DEPENDENCIES (ai, llm, prompt-loader, config-loader, etc.) — not the pipeline itself. All 44 named imports resolve through the barrel. No test changes needed.

### Open question response: research-stage.ts at ~2,100 lines

**Recommendation: split.** The function groupings naturally separate into:
- `query-generation.ts`: `generateResearchQueries`, `classifyRelevance` + related schemas
- `evidence-extraction.ts`: `extractResearchEvidence`, `assessEvidenceApplicability` + related schemas
- `research-stage.ts` (orchestrator): `researchEvidence`, `runResearchIteration`, `fetchSources`, budget helpers

This mirrors how `verdict-stage.ts` was already extracted — the orchestrator delegates to focused modules.

---

## WS-4: Search Provider Consolidation — APPROVE WITH NOTES

Verified across all 7 providers (Serper, SerpAPI, Brave, Google CSE, Wikipedia, Semantic Scholar, Google FactCheck).

### Fully shareable (7/7 providers)

| Utility | Assessment |
|---------|-----------|
| `extractErrorBody()` | Identical pattern across all 7 providers. Safe to share. |
| `handleFetchError()` | Identical pattern: re-throw SearchProviderError, log, special-case TimeoutError, return `[]`. Safe to share. |

### Partially shareable — needs design adjustment

| Utility | Issue | Fix |
|---------|-------|-----|
| `validateApiKey()` | Wikipedia has no key. Semantic Scholar's key is **optional** (warns, continues without). | Create two variants: `requireApiKey()` (5 providers) and let Wikipedia/S2 skip or use `warnIfMissingApiKey()`. |
| `classifyHttpError()` | Quota detection keywords vary: Serper ("quota"/"limit"), SerpAPI (adds "out of searches"), Brave ("rate limit"), Google CSE (adds "billing"). Wikipedia and S2 don't parse body for quota. | Accept provider-specific keyword list as parameter: `classifyHttpError(status, body, quotaKeywords?)`. |

### Finding 8 — [LOW] `DEFAULT_SEARCH_TIMEOUT_MS` is NOT uniform

Plan proposes a single shared constant. Actual values:

| Timeout | Providers |
|---------|-----------|
| 10,000 ms | Wikipedia |
| 12,000 ms | Serper, SerpAPI, Brave, Google CSE |
| 15,000 ms | Semantic Scholar, Google FactCheck |

**Fix:** Keep as provider-local constants, or create a per-provider config map. Do not use a single shared constant.

### Provider-specific behavior correctly identified

The plan correctly identifies these as non-abstractable:
- Serper's PASTE placeholder throw (vs others returning `[]`)
- Semantic Scholar's rate-limit queue (`acquireSlot()`)
- Google CSE's dual credentials (API key + CSE ID)
- SerpAPI and Google CSE's 200-status API error detection

---

## Missing Risks (Section 4)

### Risk 1 — Next.js Server/Client Component boundary (WS-5/6)

The plan doesn't address whether `jobs/[id]/page.tsx` and `admin/config/page.tsx` are Server Components or Client Components. If they use `"use client"` (likely, given interactive UI), extracted components inherit that boundary. But if any extracted component is purely server-renderable and gets extracted to a separate file, it would need its own `"use client"` directive or be explicitly marked as a Server Component.

**Recommendation:** Before WS-5/6 execution, verify the `"use client"` boundary. Document the rule: all extracted components from a `"use client"` page get `"use client"` in their new files.

### Risk 2 — CSS module relative import fragility (WS-5/6)

Plan states: "extracted components import `styles` from `../page.module.css`." This creates tight coupling to directory depth. If any component is later moved (e.g., to a shared `components/` directory), the relative path breaks silently at build time.

**Recommendation:** Note this as a known tradeoff. Alternative: create a `styles/` directory and import via `@/` alias. But since this follows the established pattern for the 10 already-extracted components, it's acceptable for now.

### Risk 3 — No risks from circular imports (confirmed safe)

The WS-2 call graph is strictly top-down. No stage calls functions from a "higher" stage. All shared utilities flow downward from `pipeline-utils.ts`. No circular dependency risk.

### Risk 4 — Module-scoped state (confirmed safe)

Zero `let` declarations at module scope. All state is passed through function parameters via `CBResearchState`. No singleton patterns, no caches, no mutable globals.

---

## Open Questions — Reviewer Responses

| # | Question | Response |
|---|----------|----------|
| 1 | Is `research-stage.ts` at ~2,100 lines too large? | **Yes.** Split into `query-generation.ts`, `evidence-extraction.ts`, and `research-stage.ts` (orchestrator). See WS-2 section. |
| 2 | Convert module-level mutable vars to `SrEvalConfig`? | **Yes, do it.** Eliminating mutable globals is worth the micro-refactor. Passing config explicitly is safer and more testable. Within scope of "behavior-preserving." |
| 3 | Utility functions vs. `SearchProviderAdapter` interface? | **Utility functions are correct.** Providers differ too much in auth, timeouts, rate limiting, and response schemas. An interface would force artificial uniformity. |
| 4 | Add component tests during WS-5/6? | **No.** Keep scope to file moves. Adding tests is a separate work stream. |
| 5 | Commit strategy? | **One commit per step.** Easier to bisect, and if a step breaks the build you know exactly which extraction caused it. |
| 6 | Is WS-7 worth doing? | **Defer.** ~100 lines across 11 files with low readability impact. Do it only if you're already editing those routes for another reason. |

---

## Verdict: APPROVE WITH CHANGES

**Must fix before execution (3 items):**
1. **[BLOCKER]** Preserve `inverse-claim-verification.prompt.md` when deleting `prompts/text-analysis/`
2. **[MEDIUM]** Remove `getAtomicityGuidance()` from WS-1 step 1.7 deletion list
3. **[MEDIUM]** Add `checkAbortSignal` to `pipeline-utils.ts` module listing in WS-2

**Should fix (3 items):**
4. Include `json.ts` + `json.test.ts` in WS-1 step 1.2 deletion scope
5. Add admin config page prompt string cleanup to WS-1 step 1.1
6. Replace `DEFAULT_SEARCH_TIMEOUT_MS` single constant with per-provider values in WS-4

**After these changes, the plan is safe to execute.**

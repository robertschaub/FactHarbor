# Pipeline Redesign — Comprehensive Implementation Plan (with Decision Proposals)

**Date**: 2026-01-16
**Last Updated**: 2026-01-16 (Sharpened based on Principal Architect Review)
**Audience**: Principal Architect, implementers (Claude Code), reviewers
**Scope**: Bring the current Pipeline Redesign implementation from "implemented pieces exist" to **safe staging → safe production** by resolving the remaining architectural blockers and doc drift.

**Status**: 🔨 Ready for implementation - blockers identified, decisions proposed, implementation steps detailed

Related docs:
- `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md` (original redesign plan)
- `Docs/DEVELOPMENT/Pipeline_Redesign_Principal_Architect_Review_2026-01-16.md` (findings/blockers) ⚠️ **BLOCKING ISSUES**
- `Docs/DEVELOPMENT/Pipeline_Redesign_Implementation_Report.md` (what was implemented narrative)
- `Docs/DEVELOPMENT/CI_CD_Test_Setup_Guide.md` (CI strategy)

---

## 0) Non‑negotiable invariants (must hold)

From `AGENTS.md`:
- **Pipeline integrity**: Understand → Research → Verdict (no stage skipping)
- **Input neutrality**: Q vs S divergence target **≤ 4 points** (avg absolute)
- **Scope detection**: multi-scope detection + unified “Scope” terminology
- **Quality gates**: Gate 1 and Gate 4 are mandatory
- **Generic by design**: no domain-specific keyword lists

Operational governance (required for rollout):
- **No synthetic evidence**: verdict evidence must come from fetched sources
- **Fail closed**: if provenance is insufficient, do not “pretend research happened”; fall back deterministically

---

## 1) Current state (baseline)

### 1.1 Already present in code (do not re-build)
- **PR0** regression tests exist (neutrality, scope preservation, adversarial scope leak).
- **PR1** entry-point normalization exists (Q→S canonicalization for neutrality).
- **PR3** deterministic scope IDs exist (hash-based).
- **PR4-lite** Gate1-lite exists.
- **PR5** provenance validation exists and is integrated into fact extraction.
- **PR6** budget module exists and research loop has enforcement hooks.

### 1.2 Why we still need an implementation plan
Despite “implemented pieces”, there are **blocking correctness and safety issues** documented in the Principal Architect review:
- grounded search path is not truly grounded and can launder synthetic evidence
- trackRecordScore scale mismatch can break math
- budget semantics mismatch can enforce unintended caps
- CTX_UNSCOPED display-only is not enforced in aggregation
- docs claim “complete” while blockers remain

This plan resolves those items with explicit decisions and acceptance tests.

---

## 2) Decision proposals (choose explicitly; defaults recommended)

| Decision | Options | Recommended Default | Rationale |
|---|---|---|---|
| **D1: Grounded search contribution** | A) URL discovery only + fetch pipeline; B) Non-evidentiary summary + deterministic fallback | **A** | Avoid synthetic evidence; keep “evidence = fetched text” invariant |
| **D2: trackRecordScore scale** | A) 0–1 everywhere; B) 0–100 then convert at ingestion | **A** | Simplest; matches current weighting math assumptions |
| **D3: Budget semantics** | A) separate global + per-scope caps; B) reuse helper but correct IDs + add global check | **A** | Avoid accidental 3-iteration global cap; aligns to doc intent |
| **D4: Gate1-lite vs supplemental** | A) apply Gate1-lite before coverage counting; B) count on filtered view | **A** | Enforces feasibility rationale directly |
| **D5: CTX_UNSCOPED governance** | A) exclude from aggregation; B) include weight=0 | **A** | Clearer invariants; easier to test |
| **D6: “Force external search” override** | A) implement `FH_FORCE_EXTERNAL_SEARCH`; B) remove doc references | **A** | Operational kill-switch; safest rollout control |

---

## 3) Work plan (PR sequence)

Each PR must be small, reviewable, and comes with acceptance criteria + tests.

**Priority Order**: PR-D (CRITICAL - breaks budget intent) → PR-C (CRITICAL - breaks math) → PR-B (BLOCKER - synthetic evidence) → PR-E → PR-F → PR-A (doc cleanup) → PR-G (ops)

---

### PR-A: Documentation alignment (remove "complete" claims; point to this plan)
**Status**: ✅ COMPLETE (already updated in previous work)
**Blocker addressed**: Blocker G (doc/operational drift)

**Goal**: Stop misleading status claims and ensure reviewers follow the correct gates.

**Already done**:
- ✅ `Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md` - updated with gated status
- ✅ `Docs/DEVELOPMENT/Pipeline_Redesign_Implementation_Report.md` - updated with blocker references
- ✅ `Docs/DEVELOPMENT/Pipeline_Redesign_Review_Guide.md` - links to Principal Architect review
- ✅ All PR summary docs - updated with completion + blocker status

**Acceptance**:
- ✅ No doc claims "production/staging ready" unless all Go/No-Go gates are met
- ✅ All docs link to the Principal Architect review + this implementation plan

**Skip to next PR** - documentation alignment already complete.

### PR-B: Ground Realism hardening (grounded search = URL discovery only)
**Status**: ⏳ READY TO IMPLEMENT
**Priority**: HIGH (blocks production - synthetic evidence risk)
**Blocker addressed**: Blocker A (grounded search not truly grounded), Blocker B (synthetic evidence by indirection)
**Decision(s)**: D1 (grounded = URL discovery only), D6 (force external search flag)

**Goal**: Grounded/native research can never introduce synthetic evidence and never skip standard search while producing no usable facts.

**Files to modify**:
1. `apps/web/src/lib/search-gemini-grounded.ts` (~lines 100-200)
2. `apps/web/src/lib/analyzer.ts` (research loop, ~lines 8000-8300)
3. `.env.local` (add `FH_FORCE_EXTERNAL_SEARCH` flag)

**Implementation steps**:

1. **Add `FH_FORCE_EXTERNAL_SEARCH` environment flag**:
   ```typescript
   // In analyzer.ts or config
   const forceExternalSearch = process.env.FH_FORCE_EXTERNAL_SEARCH === "true";
   if (forceExternalSearch) {
     console.log("[Analyzer] FH_FORCE_EXTERNAL_SEARCH enabled - bypassing grounded search");
     // Use standard search providers only
   }
   ```

2. **Fix `convertToFetchedSources()` in search-gemini-grounded.ts**:
   - **Problem**: Currently sets `fullText: snippet || groundedResponse` (synthetic content)
   - **Fix**: Remove synthetic fullText assignment - URLs must be fetched via pipeline
   ```typescript
   // BEFORE (WRONG):
   fullText: snippet || groundedResponse, // ❌ Synthetic content

   // AFTER (CORRECT):
   fullText: "", // Will be populated by fetch pipeline
   url: extractedUrl, // Real URL for fetching
   category: "grounded_search_candidate", // Mark as candidate
   ```

3. **Add grounded search fallback logic in analyzer.ts**:
   ```typescript
   if (useGroundedSearch && !forceExternalSearch) {
     const groundedResult = await searchWithGrounding({ query });

     // Validate URLs exist
     if (!groundedResult.sources || groundedResult.sources.length === 0) {
       console.warn("[Analyzer] Grounded search returned no URLs - falling back to external search");
       const externalResult = await searchExternal({ query });
       sources = externalResult;
     } else {
       // Fetch URLs via standard pipeline (ensures real content)
       sources = await Promise.all(
         groundedResult.sources.map(candidate => fetchAndExtractContent(candidate.url))
       );
     }
   }
   ```

**Tests to add**:
1. **Unit test**: `apps/web/src/lib/analyzer/ground-realism.test.ts`
   ```typescript
   it("grounded mode with empty URLs falls back to external search", async () => {
     // Mock grounded search returning no URLs
     const result = await runWithGroundedSearch({ mockEmptyURLs: true });
     expect(result.sources[0].category).not.toBe("grounded_search");
   });
   ```

2. **Integration test**: Assert no `FetchedSource` has synthetic fullText
   ```typescript
   it("no sources contain synthetic content as fullText", async () => {
     const result = await runFactHarborAnalysis({ input: "test" });
     for (const source of result.sources) {
       expect(source.fullText).not.toMatch(/^Based on|^According to my/);
     }
   });
   ```

**Acceptance criteria**:
- ✅ `FH_FORCE_EXTERNAL_SEARCH` flag implemented and tested
- ✅ Grounded search produces URL candidates only (no synthetic fullText)
- ✅ URLs are fetched via standard fetch pipeline
- ✅ Empty/invalid grounded results fall back to external search
- ✅ Tests prove no synthetic content enters fact extraction

### PR-C: trackRecordScore normalization + math clamps
**Status**: ⏳ READY TO IMPLEMENT
**Priority**: CRITICAL (breaks math - truth percentages can go outside 0-100)
**Blocker addressed**: Blocker C (trackRecordScore scale mismatch)
**Decision(s)**: D2 (standardize to 0-1 everywhere)

**Goal**: Prevent mathematically invalid verdict values; enforce invariants at module boundaries.

**Files to modify**:
1. `apps/web/src/lib/search-gemini-grounded.ts` (~lines 150-200)
2. `apps/web/src/lib/analyzer.ts` (weighting functions, verdict generation)
3. Any reliability bundle loading code

**Problem identified**:
- Grounded sources set `trackRecordScore: 50` or `60` (0-100 scale)
- Analyzer expects `trackRecordScore` in range 0-1 (multiplies by 100 for display)
- This causes: `50 * 100 = 5000%` truth percentage → invalid verdicts

**Implementation steps**:

1. **Fix grounded search track record scores** (`search-gemini-grounded.ts`):
   ```typescript
   // BEFORE (WRONG):
   trackRecordScore: hasGrounding ? 60 : 50, // ❌ Wrong scale (0-100)

   // AFTER (CORRECT):
   trackRecordScore: hasGrounding ? 0.6 : 0.5, // ✅ Correct scale (0-1)
   ```

2. **Add clamping guards in analyzer.ts** (defensive programming):
   ```typescript
   // After source loading/conversion
   function normalizeTrackRecordScore(score: number): number {
     // If score > 1, assume 0-100 scale and convert
     if (score > 1) {
       console.warn(`[Analyzer] trackRecordScore > 1 detected (${score}), converting from 0-100 scale`);
       score = score / 100;
     }
     // Clamp to [0, 1]
     return Math.max(0, Math.min(1, score));
   }

   // Apply to all sources
   sources.forEach(source => {
     source.trackRecordScore = normalizeTrackRecordScore(source.trackRecordScore);
   });
   ```

3. **Add truth percentage clamping** (defensive safety in verdict generation):
   ```typescript
   // After weighting calculations
   function clampTruthPercentage(value: number): number {
     if (value < 0 || value > 100) {
       console.error(`[Analyzer] truthPercentage out of bounds: ${value}, clamping to [0, 100]`);
       return Math.max(0, Math.min(100, value));
     }
     return value;
   }

   // Apply to verdicts
   verdict.truthPercentage = clampTruthPercentage(calculatedPercentage);
   ```

4. **Locate and fix all trackRecordScore assignments**:
   - Search for: `trackRecordScore.*=.*[0-9]{2,}`
   - Verify all are in 0-1 range
   - Add unit test assertions

**Tests to add**:
1. **Unit test**: `apps/web/src/lib/analyzer/track-record-normalization.test.ts`
   ```typescript
   describe("trackRecordScore normalization", () => {
     it("converts 0-100 scale to 0-1", () => {
       const score = normalizeTrackRecordScore(60);
       expect(score).toBe(0.6);
     });

     it("clamps values above 1 after conversion", () => {
       const score = normalizeTrackRecordScore(150);
       expect(score).toBe(1.0);
     });

     it("preserves 0-1 scale values", () => {
       const score = normalizeTrackRecordScore(0.7);
       expect(score).toBe(0.7);
     });
   });
   ```

2. **Integration test**: Verify truth percentages stay in bounds
   ```typescript
   it("truth percentages remain in [0, 100] range", async () => {
     const result = await runFactHarborAnalysis({ input: "test claim" });
     for (const verdict of result.resultJson.verdicts) {
       expect(verdict.truthPercentage).toBeGreaterThanOrEqual(0);
       expect(verdict.truthPercentage).toBeLessThanOrEqual(100);
     }
   });
   ```

**Acceptance criteria**:
- ✅ All `trackRecordScore` values in 0-1 range across entire codebase
- ✅ Normalization function handles both scales (0-1 and 0-100)
- ✅ Truth percentages clamped to [0, 100] with error logging
- ✅ Tests prove math validity under all weighting paths
- ✅ No console errors for out-of-bounds values in normal operation

### PR-D: Budget semantics fix (global vs per-scope)
**Status**: ⏳ READY TO IMPLEMENT
**Priority**: CRITICAL (breaks budget intent - causes 3-iteration cap instead of 12)
**Blocker addressed**: Blocker D (budget enforcement semantics mismatch)
**Decision(s)**: D3 (separate global + per-scope caps)

**Goal**: Budgets enforce the documented intent: **12 total iterations, 3 per scope** (defaults), not accidental early termination.

**Files to modify**:
1. `apps/web/src/lib/analyzer.ts` (research loop, ~lines 7993-8009)
2. `apps/web/src/lib/analyzer/budgets.ts` (may need helper function updates)

**Problem identified**:
- Current code uses `checkScopeIterationBudget(tracker, budget, "GLOBAL_RESEARCH")`
- This treats entire research as a single scope
- With `maxIterationsPerScope: 3`, research stops after 3 iterations (not 12!)
- `maxTotalIterations: 12` is never reached because per-scope limit hits first

**Implementation steps**:

1. **Add separate global iteration check in analyzer.ts** (lines ~7993-8009):
   ```typescript
   // BEFORE (WRONG - only checks per-scope, using constant "GLOBAL_RESEARCH"):
   const iterationCheck = checkScopeIterationBudget(
     state.budgetTracker,
     state.budget,
     "GLOBAL_RESEARCH" // ❌ Treats all research as one scope → 3-iteration cap
   );

   // AFTER (CORRECT - check both global AND per-scope):
   // 1. Check global total iterations
   if (state.budgetTracker.totalIterations >= state.budget.maxTotalIterations) {
     const reason = `Total iterations reached max: ${state.budgetTracker.totalIterations}/${state.budget.maxTotalIterations}`;
     console.warn(`[Budget] ${reason}`);
     markBudgetExceeded(state.budgetTracker, reason);
     await emit(`⚠️ Budget limit reached: ${reason}`, 10 + (iteration / config.maxResearchIterations) * 50);
     break;
   }

   // 2. Record iteration (global counter)
   recordIteration(state.budgetTracker, "GLOBAL_RESEARCH"); // Or remove this if using per-scope only

   // 3. Later, when researching specific scopes, check per-scope limits:
   for (const scope of scopesToResearch) {
     const scopeCheck = checkScopeIterationBudget(
       state.budgetTracker,
       state.budget,
       scope.id // ✅ Use actual proceeding ID, not constant
     );

     if (!scopeCheck.allowed) {
       console.warn(`[Budget] Scope ${scope.id}: ${scopeCheck.reason}`);
       continue; // Skip this scope, but continue research on others
     }

     recordIteration(state.budgetTracker, scope.id);
     // ... perform research for this scope
   }
   ```

2. **Update budget stats logging** to clarify which limit triggered:
   ```typescript
   if (state.budgetTracker.budgetExceeded) {
     console.warn(
       `[Budget] ⚠️ Analysis terminated early: ${state.budgetTracker.exceedReason}\n` +
       `  Total iterations: ${state.budgetTracker.totalIterations}/${state.budget.maxTotalIterations}\n` +
       `  Per-scope breakdown: ${Array.from(state.budgetTracker.iterationsByScope.entries()).map(([id, count]) => `${id}:${count}`).join(', ')}`
     );
   }
   ```

3. **Verify budget defaults are correct**:
   ```typescript
   // In budgets.ts - DEFAULT_BUDGET
   export const DEFAULT_BUDGET: ResearchBudget = {
     maxIterationsPerScope: 3,        // ✅ Each scope can iterate up to 3 times
     maxTotalIterations: 12,           // ✅ Total across ALL scopes is 12
     maxTotalTokens: 500_000,
     maxTokensPerCall: 100_000,
     enforceHard: true,
   };
   ```

**Tests to add**:
1. **Unit test**: `apps/web/src/lib/analyzer/budgets.test.ts` (add to existing file)
   ```typescript
   it("allows >3 global iterations across multiple scopes", () => {
     const budget = { ...DEFAULT_BUDGET, maxIterationsPerScope: 3, maxTotalIterations: 12 };
     const tracker = createBudgetTracker();

     // Simulate 4 scopes, 3 iterations each = 12 total
     for (let i = 0; i < 4; i++) {
       for (let j = 0; j < 3; j++) {
         recordIteration(tracker, `SCOPE_${i}`);
       }
     }

     expect(tracker.totalIterations).toBe(12);

     // Next iteration should fail (global limit)
     recordIteration(tracker, "SCOPE_4");
     // Should detect budget exceeded
   });

   it("caps individual scope at maxIterationsPerScope", () => {
     const budget = { ...DEFAULT_BUDGET, maxIterationsPerScope: 3 };
     const tracker = createBudgetTracker();

     recordIteration(tracker, "SCOPE_A");
     recordIteration(tracker, "SCOPE_A");
     recordIteration(tracker, "SCOPE_A");

     const check = checkScopeIterationBudget(tracker, budget, "SCOPE_A");
     expect(check.allowed).toBe(false);
     expect(check.reason).toContain("max iterations");
   });
   ```

2. **Integration test**: Verify defaults allow multi-scope research
   ```typescript
   it("research continues beyond 3 iterations across multiple scopes", async () => {
     // Test with input that generates multiple scopes
     const result = await runFactHarborAnalysis({
       inputValue: "Multi-scope input with several aspects to research",
       inputType: "claim"
     });

     const stats = result.resultJson.meta.budgetStats;
     expect(stats.totalIterations).toBeGreaterThan(3);
     expect(stats.totalIterations).toBeLessThanOrEqual(12);
   });
   ```

**Acceptance criteria**:
- ✅ Global iteration limit (12) enforced independently of per-scope limit (3)
- ✅ Per-scope limits still enforced (each scope max 3 iterations)
- ✅ Budget stats clearly show which limit triggered termination
- ✅ Tests prove >3 iterations allowed globally
- ✅ Tests prove per-scope limit still enforced
- ✅ Default behavior matches documented intent (12 total, 3 per scope)

### PR-E: Gate1-lite ordering / supplemental coverage correctness
**Status**: ⏳ READY TO IMPLEMENT
**Priority**: MEDIUM (correctness - supplemental claims logic)
**Blocker addressed**: Blocker E (Gate1-lite ordering doesn't enforce feasibility rationale)
**Decision(s)**: D4 (apply Gate1-lite before coverage counting)

**Goal**: Gate1-lite actually enforces the feasibility rationale.

**Files to modify**:
1. `apps/web/src/lib/analyzer.ts` (understandClaim flow, ~lines 3900-4000)

**Problem identified**:
- Gate1-lite applied AFTER supplemental claims generation
- Supplemental coverage logic sees unfiltered claim set
- This defeats the purpose of Gate1-lite (preventing coverage decisions based on non-factual claims)

**Implementation approach**:
- Move `applyGate1Lite()` call to BEFORE supplemental coverage check
- Or: Feed Gate1-lite filtered view into coverage counting while keeping originals for display

**Tests to add**:
- Scenario where Gate1-lite filtering changes coverage decisions
- Assert supplemental claims generated based on filtered set

**Acceptance criteria**:
- ✅ Supplemental coverage decisions use Gate1-lite filtered claims
- ✅ Original claims preserved for display/debugging if needed
- ✅ Test proves filtering affects supplemental generation correctly

### PR-F: CTX_UNSCOPED aggregation exclusion (display-only guarantee)
**Status**: ⏳ READY TO IMPLEMENT
**Priority**: MEDIUM (correctness - scope hygiene)
**Blocker addressed**: Blocker F (CTX_UNSCOPED not enforced as display-only)
**Decision(s)**: D5 (exclude from aggregation)

**Goal**: CTX_UNSCOPED is visible for debugging but cannot affect overall verdict.

**Files to modify**:
1. `apps/web/src/lib/analyzer.ts` (verdict aggregation functions)
2. `apps/web/src/lib/analyzer/scopes.ts` (if aggregation helpers exist there)

**Implementation approach**:
- Exclude `relatedProceedingId === CTX_UNSCOPED` or `=== UNSCOPED_ID` from:
  - overall aggregation
  - per-scope aggregation
- Make the exclusion explicit and testable (avoid "accidental" behavior)

**Tests to add**:
```typescript
it("unscoped facts do not affect overall verdict", async () => {
  const result1 = await runWithScopedFacts();
  const result2 = await runWithScopedAndUnscopedFacts();

  expect(result1.overallTruthPercentage).toBe(result2.overallTruthPercentage);
});
```

**Acceptance criteria**:
- ✅ Explicit exclusion of CTX_UNSCOPED from aggregation math
- ✅ Tests prove unscoped items don't affect verdicts
- ✅ Unscoped items still visible in UI/debugging

### PR-G: Staging rollout playbook + CI gating policy
**Goal**: operationalize safety and define what “passing” means.

- Decide CI policy:
  - Which tests run on every PR (fast)
  - Which run nightly/manual (expensive API-key tests)
- Add staging defaults:
  - start with warn-only budgets, then enforce
  - provenance validation enabled by default
  - grounded mode disabled unless D1/D6 are implemented and verified

---

## 4) Implementation Summary & Priority Order

### Implementation Priority (Start Here):

**CRITICAL (Must fix first - breaks core functionality)**:
1. **PR-D** - Budget semantics fix (3-iteration cap → 12-iteration cap) ⚠️ BLOCKING
2. **PR-C** - trackRecordScore normalization (prevents invalid math) ⚠️ BLOCKING

**HIGH (Production blockers - safety)**:
3. **PR-B** - Ground Realism hardening (prevents synthetic evidence) ⚠️ BLOCKING

**MEDIUM (Correctness improvements)**:
4. **PR-E** - Gate1-lite ordering (supplemental claims correctness)
5. **PR-F** - CTX_UNSCOPED exclusion (scope hygiene)

**LOW (Operations - after code fixes)**:
6. **PR-A** - Documentation alignment (✅ COMPLETE)
7. **PR-G** - Staging rollout playbook

### Estimated Implementation Time:
- PR-D: ~2-3 hours (budget logic fix + tests)
- PR-C: ~2-3 hours (score normalization + clamping + tests)
- PR-B: ~3-4 hours (grounded search refactor + fallback + tests)
- PR-E: ~1-2 hours (reorder Gate1-lite + test)
- PR-F: ~1-2 hours (aggregation exclusion + test)
- **Total**: ~10-15 hours of focused implementation

### Success Criteria by Priority:

**After PR-D + PR-C (CRITICAL fixes)**:
- ✅ Budget allows 12 total iterations (not 3)
- ✅ Truth percentages stay in [0, 100] range
- ✅ Unit tests prove correctness
- **Status**: Safe for internal testing (math is correct)

**After PR-B (Ground Realism)**:
- ✅ No synthetic evidence enters verdicts
- ✅ Grounded search produces real URLs only
- ✅ Fallback to external search works
- **Status**: Safe for staging deployment (evidence is real)

**After PR-E + PR-F (Correctness improvements)**:
- ✅ Supplemental claims logic correct
- ✅ CTX_UNSCOPED doesn't affect verdicts
- **Status**: Production-ready (all blockers resolved)

---

## 5) Definition of Done (production-ready)

All Go/No-Go gates in the Principal Architect review must be satisfied, plus:
- ✅ All CRITICAL and HIGH priority PRs implemented and tested
- ✅ CI shows the selected required gates passing
- ✅ Staging shows no abnormal spikes in early-termination, provenance rejection rates, or neutrality divergence
- ✅ Rollback plan documented and tested
- ✅ Principal Architect sign-off obtained

---

## 6) Next Steps (Implementation Execution)

**Immediate action** (Lead Developer):
1. Start with **PR-D** (budget semantics) - highest impact, clear fix
2. Then **PR-C** (trackRecordScore) - prevents invalid math
3. Then **PR-B** (Ground Realism) - safety critical
4. Review and merge each PR before starting next
5. Run full test suite after each merge
6. Update this plan with completion status

**After all PRs complete**:
- Update all documentation with "production-ready" status
- Request Principal Architect final review
- Proceed to staging deployment (PR-G)


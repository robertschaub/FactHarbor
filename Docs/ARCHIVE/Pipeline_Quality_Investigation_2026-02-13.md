# Pipeline Quality Investigation — Orchestrated Pipeline Report Issues

**Date:** 2026-02-13
**Role:** Lead Architect (Senior Architect)
**Status:** Phases 1-4 IMPLEMENTED — Pending end-to-end validation runs
**Agent:** Claude Code (Opus 4.6)

---

## Executive Summary

A comprehensive investigation of recent analysis reports from the orchestrated pipeline reveals **9 distinct issues**, of which **4 are critical** and affect every single analysis report. The pipeline successfully computes analysis data (verdicts, evidence, context answers) but **fails to assemble the final report correctly**, resulting in reports that appear empty or broken to the UI and consumers.

**Jobs analyzed:** 8+ completed jobs (Fox News article, Hydrogen/Electricity comparisons, Bolsonaro trials, US Gov trust, TCM medicine, Lithium/Hydrogen storage)

**Conclusion:** The issues fall into three categories:
1. **Report Assembly Bugs** (Critical) — Data computed but not mapped to output structure
2. **Context Refinement Instability** (Critical) — Context IDs change mid-pipeline, orphaning claims
3. **Silent Failure Patterns** (High) — Errors produce plausible-looking but worthless output

---

## Addendum (2026-02-13) — Regression Observed After Phase 1–4 Implementation

While sanity-checking current outputs, a “very bad” single-context quick-mode run (analysisId `FH-MLL7OZEM`) revealed issues that can make reports look worse even when the Phase 1–4 fixes are correct. These are **not Phase 4 remap root causes** and should be tracked separately:

1. **Quick-mode research decision ordering can starve contradiction search**
   - In `decideNextResearch()` the “cross-context discovery” search block (queries like “related proceeding / court decision / ruling”) is evaluated before the `!state.contradictionSearchPerformed` “Criticism and opposing views” block.
   - With low iteration budgets, cross-context discovery can consume remaining iterations and end with `contradictionSearchPerformed=false`, causing `qualityGates.passed=false` even when evidence exists.

2. **Single-context context enrichment misses `analysisContexts[].verdict`**
   - `enrichContextsForReport()` joins per-context verdicts via `verdictSummary.analysisContextAnswers[]`, but the single-context verdict schema (`VERDICTS_SCHEMA_SIMPLE`) does not include `analysisContextAnswers`.
   - Result: single-context `analysisContexts[]` can have evidence but appear to have no verdict object (looks “empty” to UI/consumers).

3. **Single-context `claimVerdicts` cannot be joined into contexts**
   - Single-context verdict outputs omit `contextId` on `claimVerdicts[]`, but `enrichContextsForReport()` filters `claimVerdicts` by `cv.contextId === ctx.id`.
   - Result: `analysisContexts[0].claimVerdicts` can be empty even when top-level `claimVerdicts[]` exists.

**Suggested remediation (no prompt changes):** (a) ensure contradiction/criticism search runs before cross-context discovery in quick mode; (b) when there is exactly one context, synthesize a per-context verdict from `verdictSummary` and stamp `contextId` onto claim verdicts structurally.

---

## Critical Issues

### ISSUE 1: `articleVerdict` Always Empty `{}`

**Severity:** CRITICAL — Affects ALL reports
**Location:** `orchestrated.ts` ~lines 12057-12115 (report assembly)

**Symptom:** Every report has `articleVerdict: {}`. The UI shows no overall verdict.

**Root Cause:** The report assembly returns `articleAnalysis.articleVerdict` as a nested field inside `articleAnalysis`, but the top-level `articleVerdict` key is never populated from `verdictSummary`. The data IS computed:
- `verdictSummary.truthPercentage` = 38% (Hydrogen job)
- `verdictSummary.confidence` = 65%
- `verdictSummary.analysisContextAnswers[]` = per-context verdicts

But `articleVerdict` at the top level is `{}`.

**Documentation Spec (Calculations.md):** `articleVerdict` IS the summary — there should be no distinction from `verdictSummary`.

**Fix:** Map `verdictSummary` data into `articleVerdict` (rating, truthPercentage, confidence, summary).

---

### ISSUE 2: `analysisContexts` Have No Verdict or Evidence

**Severity:** CRITICAL — Affects ALL reports
**Location:** `orchestrated.ts` ~lines 12057-12115 (report assembly), `types.ts` line 227

**Symptom:** Every `analysisContext` is metadata only — no verdict, no evidence items:
```json
{ "id": "CTX_xxx", "name": "...", "subject": "...", "status": "concluded" }
```

**Root Cause:** The `AnalysisContext` TypeScript interface has NO fields for `verdict` or `evidenceItems`. The report assembly returns `state.understanding!.analysisContexts` (raw metadata) without enriching it with:
- Context-specific verdicts from `verdictSummary.analysisContextAnswers[]`
- Evidence items filtered by `contextId`
- Claim verdicts filtered by `contextId`

**Evidence exists but is disconnected:**
- Evidence items are at `resultJson.evidenceItems[]` (flat array with `contextId`)
- Context verdicts are at `verdictSummary.analysisContextAnswers[]` (separate structure)
- Claim verdicts are at `resultJson.claimVerdicts[]` (flat with `contextId`)

**Fix:** Add a report enrichment step that joins contexts with their verdicts and evidence before returning.

---

### ISSUE 3: Context ID Instability — Orphaned Claims

**Severity:** CRITICAL — Affects multi-context analyses
**Location:** `refineContextsFromEvidence()` in orchestrated.ts

**Symptom:** Log shows persistent warnings in EVERY multi-context job:
```
⚠️ Claim SC1 assigned to non-existent context CTX_03c90aa6
⚠️ Claim SC2 assigned to non-existent context CTX_03c90aa6
... (all claims orphaned)
```

**Root Cause:** The pipeline flow is:
1. **Understand phase** generates context IDs (e.g., `CTX_90148919`, `CTX_e7a2214c`)
2. Claims are assigned to these IDs
3. **`refineContextsFromEvidence()`** runs and generates NEW context IDs (e.g., `CTX_b8cd12ff`)
4. Claims still reference OLD IDs → orphaned
5. Reconciliation only partially restores (`restored: ["CTX_e7a2214c"]`, but `CTX_90148919` dropped)

**Impact:** Claims cannot be properly matched to contexts for verdict generation. Evidence-to-claim linkage breaks when context IDs are unstable.

**Fix:** When `refineContextsFromEvidence()` creates new contexts, it MUST remap all existing claim-to-context and evidence-to-context assignments to the new IDs.

---

### ISSUE 4: Silent Verdict Fallback to 50/50

**Severity:** CRITICAL — Complete analysis failure masked as a result
**Location:** `orchestrated.ts` ~lines 9076-9159 (Path A fallback)

**Symptom:** Fox News article job: ALL 8 claims got `verdict: 50, confidence: 50, reasoning: "No verdict returned by LLM for this claim."` — indistinguishable from real results without examining reasoning.

**Root Cause:** When the LLM structured output call fails (schema validation, provider error), ALL claims receive 50/50 defaults. The error is logged to `analysisWarnings` but the report looks like it succeeded with `status: SUCCEEDED`.

**Impact:** Users see a completed report with 50% truth for everything, believing it's a real analysis. The `analysisWarnings` field is not prominently surfaced.

**Fix:**
1. Reports with wholesale verdict fallback should have `status: DEGRADED` or similar
2. The UI must prominently display fallback warnings
3. Implement structured output recovery (retry with simplified schema)

---

## High Issues

### ISSUE 5: 7-Point Scale Rating Labels Never Applied

**Severity:** HIGH — Missing data in every report
**Location:** Report assembly in orchestrated.ts

**Symptom:** All claim verdicts have `rating: null`. The 7-point scale labels (TRUE, MOSTLY-TRUE, etc.) are never set.

**Evidence:** `percentageToClaimVerdict()` exists in `truth-scale.ts` and is used for text formatting (line 9995) but is NEVER called to set the `rating` field on claim verdict objects.

**Fix:** Call `percentageToClaimVerdict(cv.truthPercentage, cv.confidence)` and set `cv.rating` before returning claim verdicts.

---

### ISSUE 6: Budget Counter Mismatch

**Severity:** HIGH — Misleading telemetry
**Location:** `orchestrated.ts` (budgetStats) vs `budgets.ts` (recordLLMCall)

**Symptom:** `budgetStats.llmCalls = 1` when `researchStats.llmCalls = 21`. Budget stats severely undercount actual LLM calls.

**Root Cause:** Two separate counters: `state.llmCalls` (always incremented, accurate) vs `budgetTracker.llmCalls` (only incremented via selective `recordLLMCall()` calls). Report uses the budget tracker counter.

**Fix:** Use `state.llmCalls` as the authoritative counter for budget stats, or ensure `recordLLMCall()` is called in every LLM execution path.

---

## Medium Issues

### ISSUE 7: Evidence-to-Claim Linkage Fragility

**Severity:** MEDIUM — Affects evidence-poor analyses
**Evidence:** Fox News job: 6 evidence items extracted, 0 linked to any claim (`supportingEvidenceIds: []` for all 8 claims). Grounding ratio: 0%.

**Root Cause:** Evidence-to-claim linking is performed by the LLM during verdict generation. If the LLM determines evidence isn't relevant to specific claims, `supportingEvidenceIds` stays empty. Combined with the context ID mismatch (Issue 3), evidence extracted under old context IDs may not be findable under new IDs.

---

### ISSUE 8: Source Type Always Null

**Severity:** MEDIUM — Missing metadata
**Root Cause:** `sourceType` is optional and only extracted when `evidenceScope` is present per prompt instructions. By design, but reduces analytical value.

---

### ISSUE 9: `hasMultipleContexts` Flag Inconsistency

**Severity:** LOW
**Example:** Job 127d has `contextCount: 3` but `hasMultipleContexts: false`.

---

## Conceptual & Logical Flaws

### Flaw A: Three Verdict Values with No Clear Precedence
The pipeline produces three separate verdict values:
1. `articleAnalysis.articleVerdict` — article-level (inside articleAnalysis)
2. `verdictSummary.truthPercentage` — overall answer
3. `verdictSummary.analysisContextAnswers[].truthPercentage` — per-context

**Per xWiki docs:** `articleVerdict` IS the summary. There should be ONE authoritative source.

### Flaw B: Research Can Fail Silently
Fox News: 38 searches → 228 results → 2 fetched → 1 successful → 6 evidence → 0 linked to claims. The pipeline continued to verdict generation with essentially no usable evidence, producing 50/50 fallbacks that look like real results.

### Flaw C: Budget Reduction May Be Too Aggressive
`maxIterationsPerContext: 3` (was 5), `maxTotalIterations: 10` (was 20). For complex analyses with multiple contexts, this may not allow sufficient research depth. The Lithium/Hydrogen job detected 6 contexts with only 10 total iterations available.

---

## Evidence Summary Table

| Job | Input | articleVerdict | verdictSummary | Contexts w/ verdict | Claims w/ rating | Issues |
|-----|-------|---------------|----------------|--------------------|-----------------|----|
| 127d (Fox News) | URL article | `{}` | `null` | 0/3 | 0/8 (all 50/50 fallback) | 1,2,3,4,5,6,7 |
| 33f3 (H2 vs EV) | Text claim | `{}` | tp=38, c=65 | 0/5 | 0/6 (no rating) | 1,2,5,6 |
| c4f7 (Bolsonaro) | Text question | `{}` | tp=59, c=59 | 0/2 | 0/11 (no rating) | 1,2,3,5,6 |
| 5ccd (US Gov) | Text question | `{}` | `null` | 0/1 | 0/4 | 1,2,5,6 |
| a95c (Li vs H2) | Text question | `{}` | tp=61, c=48 | 0/6 | 0/13 (no rating) | 1,2,3,5,6 |

---

## Implementation Status (updated 2026-02-13)

### Phase 1-3: Report Assembly, Fallback Tracking, Budget Fix — DONE
**Commit:** `4e000e9` on main
**Agent:** Senior Developer (Claude Code Opus)
- Enriched `analysisContexts` with verdicts, evidence, claims (Issue 1, 2)
- Applied 7-point rating labels via `percentageToClaimVerdict()` (Issue 5)
- Added `DEGRADED` status tracking for wholesale fallback (Issue 4)
- Fixed budget counter to use `state.llmCalls` (Issue 6)
- Added `EnrichedAnalysisContext`, `ContextVerdict` types

### Phase 4: Context ID Stability — DONE (hotfix committed)
**Commit:** `61050da` on main | **Hotfix:** `ab28b01`
**Agent:** Senior Developer (Claude Code Opus)
- Added batched LLM similarity remap (`buildOldToNewContextRemap`) using `assessTextSimilarityBatch` (Issue 3)
- Moved orphan check AFTER `ensureContextsCoverAssignments` — expanded to cover both claims AND evidence
- 4-layer defense: Canon/Dedup remap → LLM similarity → ensureCovers → Final orphan check
- UCM-configurable threshold: `calcConfig.contextRefinement.oldToNewSimilarityThreshold` (default 0.65)

**Phase 4 Hotfix — Claim Assignment Ordering (2026-02-13)**
**Found by:** Claude Code Opus (same session, investigating regression reported by Captain)
**Bug:** Commit `61050da` caused all context refinements to **roll back to pre-refinement state**. Claim assignments from the LLM refinement response were applied at line ~1732, far AFTER `ensureContextsCoverAssignments` (~1340) and the zero-evidence check (~1546). Without the old orphan check (removed by Phase 4), claims kept stale context IDs → reconciliation restored old contexts → those old contexts had zero evidence → `rollbackRefinement` triggered every time.
**Debug log proof:**
```
Phase 4 old→new context remap: no LLM matches found
reconciled orphaned context assignments | restored: ["CTX_7dc157fc"]
rejected (context with zero evidence) | contextId: "CTX_7dc157fc"
rolled back to pre-refinement state | reason: "context-with-zero-evidence"
```
**Fix:** Moved claim assignment application from line ~1732 to line ~1275 (right after evidence assignments, before `ensureContextsCoverAssignments`). Now both claims and evidence reference new context IDs before reconciliation runs.
**File:** `orchestrated.ts:1275-1288`
**Commit:** `ab28b01`

### Bonus: harmPotential "High Harm" Inflation Fix — DONE
**Commit:** `0c97838`
**Agent:** Senior Developer (Claude Code Opus)
**Root Cause:** Verdict validation prompt used keyword lists (die, kill, harm, risk, fraud...) to classify `harmPotential`, overriding the understand phase's more nuanced assessment. Nearly all real-world topics triggered HIGH.
**Fix:**
1. Aligned all 3 prompts (orchestrated, compact, verdict validation) to narrow HIGH criteria: death, severe injury, safety hazards, major fraud only
2. Removed keyword list from `text-analysis-verdict.prompt.md` (was an AGENTS.md violation — keyword heuristics for semantic decisions)
3. Made verdict validation override one-directional: can only downgrade (high→medium) or upgrade from LOW. Cannot escalate medium→high — the understand phase has richer context.
**Files:** `orchestrated.prompt.md`, `orchestrated-compact.prompt.md`, `text-analysis-verdict.prompt.md`, `orchestrated.ts:9593`
**Impact:** Claims like "hydrogen is less cost-effective" will correctly stay MEDIUM instead of being inflated to HIGH because the topic mentions "hazard".

### Addendum Fixes — DONE
**Commit:** `93a5813`
**Agent:** Senior Developer (Claude Code Opus)
Fixes for the 3 regression items found during post-Phase-4 review:
1. **Single-context enrichment:** `enrichContextsForReport()` now synthesizes per-context verdict from `verdictSummary` when `VERDICTS_SCHEMA_SIMPLE` doesn't produce `analysisContextAnswers`. Claim verdicts stamped with `contextId` in `generateSingleContextVerdicts()`.
2. **Contradiction search starvation:** Moved cross-context discovery block after contradiction/inverse-claim searches in `decideNextResearch()`, preventing budget exhaustion before contradiction search runs in quick mode (4 iterations).

### Prompt Caching — DONE
**Commit:** `3a1012a`
Added `getPromptCachingOptions()` for Anthropic ephemeral cache headers on system messages (90% discount on cached input tokens). Applied to `detectContextsLLM`, monolithic pipeline, and source evaluation.

### Verdict Direction Auto-Correction — DONE (uncommitted)
**Agent:** Senior Developer (Claude Code Opus)
**Root Cause:** `claimDirection` on evidence items is scoped to the ORIGINAL user claim, not individual sub-claims. When the verdict LLM evaluates per-sub-claim verdicts, it receives `[SUPPORTING]`/`[COUNTER-EVIDENCE]` labels relative to the parent claim. This can mislead verdicts for sub-claims with different logical relationships to the evidence (e.g., SC3 at 41% "Mostly False" despite supporting evidence in test job FH-MLLB1ZU7).

The detection system (`validateVerdictDirections()` → `batchDirectionValidationLLM()`) was already working — it correctly flagged SC3's mismatch. But `autoCorrect: false` at all 3 call sites meant it only generated warnings, never corrected.

**Investigation findings:**
- No double-inversion risk: direction validation (Layer 4) and counter-claim aggregation (Layer 2) are properly decoupled
- Old correction formula `max(65, 100-verdictPct)` was unsafe: could produce 90-point swings (5%→95%) from a binary direction signal
- Direction Semantics doc (xWiki) explicitly warned against this pattern

**Fix (Option 3 — LLM-provided correction percentage, Captain-approved):**
1. **Prompt change:** Added `suggestedPct` to `VERDICT_DIRECTION_VALIDATION_BATCH_USER` response schema — LLM provides a calibrated correction percentage based on evidence strength, not just direction
2. **Code:** Updated `batchDirectionValidationLLM` parser to extract `suggestedPct`; auto-correct uses LLM `suggestedPct` when available, falls back to capped formula `max(55, min(75, ...))` / `max(25, min(45, ...))` to prevent extreme swings
3. **Enabled** `autoCorrect: true` at all 3 verdict paths
4. **Doc sync:** Updated Direction Semantics xWiki doc (sections 5.3, 5.4, 8, 10, 11 + stale line numbers)

**Files:**
- `orchestrated.prompt.md:1070-1073` — `suggestedPct` in response schema
- `orchestrated.ts:3734,3781,3906-3916` — type, parser, correction logic
- `orchestrated.ts:8354,8960,9697` — `autoCorrect: true`
- `Direction Semantics/WebHome.xwiki` — full sync

### Remaining: End-to-End Validation
- Re-run 2-3 test jobs (single-context + multi-context) to verify:
  - No orphaned contextId warnings in debug log
  - `articleVerdict` populated, contexts enriched with verdicts/evidence
  - Single-context `analysisContexts[0]` has `verdict`, `claimVerdicts`, `evidenceItems`
  - `qualityGates.passed` not false due to missing contradiction search
  - Rating labels applied, fallback tracking active
  - harmPotential distribution is reasonable (not all HIGH)
  - Direction mismatches auto-corrected with LLM `suggestedPct` (check `analysisWarnings` for `verdict_direction_mismatch` entries with `correctionSource: "LLM-suggested"`)

---

## Proposed Multi-Agent Collaboration Plan

### Phase 1: Fix Report Assembly (Critical Path)
**Agent:** Senior Developer (Claude Code or Cursor)
**Scope:** `orchestrated.ts` report assembly (~lines 12057-12115)
**Tasks:**
1. Enrich `analysisContexts` with verdicts from `verdictSummary.analysisContextAnswers[]`
2. Group evidence items and claim verdicts by `contextId` into their respective contexts
3. Populate `articleVerdict` from `verdictSummary` data
4. Apply 7-point rating labels via `percentageToClaimVerdict()`
5. Fix `hasMultipleContexts` flag consistency

### Phase 2: Fix Context ID Stability (Critical)
**Agent:** Senior Developer + LLM Expert review
**Scope:** `refineContextsFromEvidence()` in orchestrated.ts
**Tasks:**
1. When creating new contexts, build an ID mapping table (old → new)
2. Remap all claim assignments, evidence assignments, and search metadata
3. Remap per-context verdict references (`verdictSummary.analysisContextAnswers[].contextId`) alongside claims/evidence to prevent orphaned context answers
4. Similarity/matching for remap must NOT use deterministic string overlap/keyword heuristics (AGENTS.md). Use either:
   - Option A: Preserve IDs through refinement (prompt change — requires explicit Captain approval), or
   - Option B: One batched LLM similarity matrix between pre/post-refine context descriptions (cached; no per-context calls)
5. Validate no orphaned claims remain after refinement

### Phase 3: Fix Silent Failure Patterns (High)
**Agent:** Senior Developer
**Scope:** Verdict generation fallback paths
**Tasks:**
1. Mark reports with wholesale fallback as degraded (not SUCCEEDED)
2. Implement structured output recovery with simplified schema
3. Improve verdict fallback to use available evidence even when full schema fails
4. Fix budget counter synchronization

### Phase 4: Validation
**Agent:** Code Reviewer + LLM Expert
**Scope:** End-to-end verification
**Tasks:**
1. Re-run all 5 test cases and verify report structure is correct
2. Verify per-context verdicts match `verdictSummary` data
3. Verify evidence items appear in correct contexts
4. Verify 7-point ratings are applied
5. Verify no orphaned `contextId` remains across: claims, evidence items, and `verdictSummary.analysisContextAnswers[]` after any refinement/canonicalization/dedup
6. Run `npm test` to verify no regressions

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `apps/web/src/lib/analyzer/orchestrated.ts` | Report assembly enrichment, context ID remapping, verdict fallback | P0 |
| `apps/web/src/lib/analyzer/types.ts` | Ensure report schema supports enriched contexts (e.g., `EnrichedAnalysisContext`) without mutating base `AnalysisContext` | P0 |
| `apps/web/src/lib/analyzer/truth-scale.ts` | Already has `percentageToClaimVerdict()` — just needs to be called | P0 |
| `apps/web/src/lib/analyzer/budgets.ts` | Fix LLM call counter synchronization | P1 |

---

## Appendix: Log Evidence

### Context ID Mismatch (Every Multi-Context Job)
```
[13:55:39.774] ⚠️ Claim SC1 assigned to non-existent context CTX_03c90aa6
[13:55:39.774] ⚠️ Claim SC2 assigned to non-existent context CTX_03c90aa6
[13:56:52.420] ⚠️ Claim SC1 assigned to non-existent context CTX_90148919
[14:06:45.772] ⚠️ Claim SC1 assigned to non-existent context CTX_c5272353
[14:36:27.484] ⚠️ Claim SC1 assigned to non-existent context CTX_77cf54de
```

### Silent Fallback (Fox News Job)
```
[13:57:15.571] generateClaimVerdicts: LLM verdict validation complete | processed: 8, inversionsDetected: 0
[13:57:15.585] Grounding check result | groundingRatio: "0.00"
  → All 8 claims: "reasoning present but no cited evidence"
[13:57:15.609] [Budget] Usage | llmCalls: 1 (actual: 21)
```

### Research Failure Pattern
```
researchStats: {
  totalSearches: 38,
  totalResults: 228,
  sourcesFetched: 2,
  sourcesSuccessful: 1,
  evidenceItemsExtracted: 6,
  llmCalls: 21
}
```

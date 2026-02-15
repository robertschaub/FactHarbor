# Phase 4: Context ID Stability — Senior Developer Handoff Brief

**Date:** 2026-02-13
**Hub:** `Docs/WIP/Pipeline_Quality_Investigation_2026-02-13.md`
**Approach:** Option B — Batched LLM similarity matrix (Captain-approved)
**Priority:** P1 (Critical for multi-context analyses)
**Status:** IMPLEMENTED — Commit `61050da` on main. **Hotfix applied** (see §Hotfix below). Build verified.

---

## Problem

`refineContextsFromEvidence()` in `orchestrated.ts` (~lines 920-1648) replaces analysis contexts with refined versions, generating **new context IDs**. Existing claim and evidence assignments still reference the **old IDs**, causing orphaned claims in every multi-context job:

```
⚠️ Claim SC1 assigned to non-existent context CTX_03c90aa6
⚠️ Claim SC2 assigned to non-existent context CTX_03c90aa6
```

The function has 3 existing remap layers (canonicalization, deduplication, LLM assignment) + orphan reconciliation, but the **orphan check at ~line 1165 runs BEFORE reconciliation at ~line 1230**, clearing contextIds to `""` prematurely.

---

## Required Changes

### 4a. Move orphan check AFTER reconciliation

**Current order (broken):**
1. Line ~1165: Orphan check — clears orphaned `contextId` to `""`
2. Line ~1230: `ensureContextsCoverAssignments()` — restores pre-refinement contexts

**Fixed order:**
1. `ensureContextsCoverAssignments()` first — restore what can be restored
2. THEN orphan check — clear remaining truly-orphaned contextIds

### 4b. Batched LLM similarity matrix for context matching

When reconciliation encounters an old context that was replaced by refinement AND a new context covers similar territory, we must decide whether to:
- Remap claims/evidence from old context → new context, or
- Restore the old context

**AGENTS.md mandates**: This is a semantic equivalence decision — **must use LLM intelligence, NOT deterministic string matching**. The codebase's `evidence-deduplication.ts` marks `jaccardSimilarity()` as "legacy / do not use for analysis decisions" (`evidence-deduplication.ts:89`).

**Implementation:**

After refinement produces new contexts, make **one batched LLM call**:

```
Input:
  oldContexts: [{id, name, subject, temporal, outcome}]
  newContexts: [{id, name, subject, temporal, outcome}]

Output (structured):
  mappings: [{oldId, newId, confidence, reasoning}]
  unmapped: [oldId]  // genuinely removed, no equivalent
```

- Use the existing `text-analysis-service.ts` pattern for the LLM call
- Use Haiku 4.5 tier (structural routing, not deep analysis)
- Cache by context description hash — no repeated calls for identical inputs

### 4c. Remap ALL contextId carriers

When applying the mapping, update **all** of these:

1. `state.understanding.subClaims[].contextId` — claim assignments
2. `state.evidenceItems[].contextId` — evidence assignments
3. `verdictSummary.analysisContextAnswers[].contextId` — per-context verdict references
4. Search metadata with per-context references (if any exist in `state.searchQueries`)

**Missing #3 was flagged by Code Reviewer** (GPT-5.2) — without it, context answers in `verdictSummary` would reference old IDs even after claims/evidence are remapped.

---

## Key Code Locations

| Location | Line Range | Purpose |
|----------|-----------|---------|
| `refineContextsFromEvidence()` | ~920-1648 | Main function to modify |
| Orphan check (move this) | ~1165 | Clears orphaned contextIds — move AFTER reconciliation |
| `ensureContextsCoverAssignments()` | ~1230 | Restores pre-refinement contexts for orphaned claims |
| `canonicalizeContextsWithRemap()` | `analysis-contexts.ts:437-526` | Existing remap pattern to follow |
| `EvidenceDeduplicator.isDuplicate()` | `evidence-deduplication.ts` | Reference for LLM-based similarity pattern |
| `text-analysis-service.ts` | — | Service layer for LLM calls (use for similarity matrix) |
| `getModelForTask()` | `llm.ts` | Model selection — use `"extract"` tier (Haiku 4.5) |

---

## Constraints (AGENTS.md)

- **NO deterministic string matching** for semantic decisions (context equivalence, similarity scoring)
- **Batch aggressively** — one LLM call for the entire old→new mapping, not per-context
- **Cache ruthlessly** — identical context descriptions should hit cache
- **Preserve existing patterns** — follow `text-analysis-service.ts` for LLM calls, `evidence-deduplication.ts` for similarity logic structure
- **No prompt changes** — this is Option B (code-only), not Option A (prompt change)

---

## Verification Criteria

After implementation, verify:

1. `npm -w apps/web run build` passes (TypeScript compilation)
2. No `⚠️ Claim SCx assigned to non-existent context` warnings in `debug-analyzer.log`
3. No orphaned `contextId` in:
   - `resultJson.claimVerdicts[].contextId`
   - `resultJson.evidenceItems[].contextId`
   - `resultJson.verdictSummary.analysisContextAnswers[].contextId`
4. All `contextId` values in claims/evidence/context-answers reference a context that exists in `resultJson.analysisContexts[]`
5. Multi-context test jobs (Hydrogen vs EV, Bolsonaro, Lithium vs H2) show proper context assignment

---

## Hotfix (2026-02-13) — Claim Assignment Ordering Bug

**Found by:** Claude Code Opus (investigating regression reported by Captain after `61050da`)
**Status:** COMMITTED — `ab28b01`

**Bug:** Commit `61050da` caused **all context refinements to roll back**. The claim assignment block from the LLM refinement response was applied at line ~1732 — far AFTER `ensureContextsCoverAssignments` (~1340) and the zero-evidence check (~1546). The old orphan check (removed by Phase 4) used to clear claim contextIds before reconciliation, which prevented old contexts from being restored. Without it:

1. Claims keep stale old context IDs through reconciliation
2. `ensureContextsCoverAssignments` sees claims referencing old context → restores old context
3. Old context has zero evidence (evidence was already reassigned to new contexts)
4. Zero-evidence check triggers → `rollbackRefinement` → entire refinement discarded

**Fix:** Moved claim assignment application from line ~1732 to line ~1275 (right after evidence assignments, before `ensureContextsCoverAssignments`). The code only depends on `claimAssignmentsList` (captured at line 1085) and `finalizeContextId` (defined at line 1226), so the move is safe.

**Lesson for workgroup:** When reordering operations in `refineContextsFromEvidence()`, trace ALL contextId carriers (claims AND evidence) through the full function — the function is ~800 lines with many interdependent steps.

---

## New Note (2026-02-13) — Regression Observed (Not Phase 4 Root Cause)

While reviewing a “very bad” single-context run (analysisId `FH-MLL7OZEM`), two additional issues surfaced that can make results look worse even when Phase 4 remapping is correct:

1. **Research decision ordering can starve contradiction search in quick mode**
   - The “cross-context discovery” search block (queries like “related proceeding / court decision / ruling”) is evaluated before the `!state.contradictionSearchPerformed` “Criticism and opposing views” block.
   - In quick mode with low iteration budget, this can consume remaining iterations and end with `contradictionSearchPerformed=false`, causing `qualityGates.passed=false` even when evidence exists.

2. **Single-context report enrichment yields contexts without inline verdict/claimVerdicts**
   - `enrichContextsForReport()` attaches `context.verdict` using `verdictSummary.analysisContextAnswers[]`, but single-context verdict schemas do not produce `analysisContextAnswers`.
   - Single-context claim verdict objects also typically have no `contextId`, so per-context `claimVerdicts` joining can be empty even though top-level `claimVerdicts[]` is populated.

Action: Track these separately from Phase 4; they affect perceived quality/UX and quality-gate outcomes for single-context + quick runs.

**UPDATE:** Both items now FIXED in commit `93a5813`:
1. Contradiction search moved before cross-context discovery in `decideNextResearch()`
2. `enrichContextsForReport()` synthesizes per-context verdict from `verdictSummary` for single-context; `generateSingleContextVerdicts()` stamps `contextId` on claim verdicts

## Additional Fix (2026-02-13) — Verdict Direction Auto-Correction

**Found by:** Captain (flagged SC3 mismatch in test job FH-MLLB1ZU7), investigated by Claude Code Opus
**Status:** IMPLEMENTED (uncommitted)

**Problem:** `claimDirection` on evidence is scoped to the ORIGINAL user claim, not sub-claims. Direction validation (`validateVerdictDirections()`) correctly detected mismatches but `autoCorrect: false` meant it only warned. SC3 stayed at 41% despite evidence supporting it.

**Fix:** Enabled auto-correct with LLM-provided `suggestedPct` (Captain-approved prompt change). Direction validation LLM now provides both direction AND calibrated correction percentage. Capped fallback formula (55-75 / 25-45) prevents extreme swings if LLM omits `suggestedPct`. Direction Semantics xWiki doc updated.

**See:** Hub doc and SR Developer report for full details.

## Files to Touch

| File | Change |
|------|--------|
| `orchestrated.ts` | Reorder orphan check, add batched LLM similarity call, apply remap to all carriers |
| `text-analysis-service.ts` | Add `compareContextSimilarity()` method (or equivalent) |
| `types.ts` | Add types for context mapping result (if needed) |

---

## What NOT to Touch

- Report assembly (~lines 12103-12230) — Phase 1-3 already done, different code region
- Verdict fallback tracking (~lines 8610-9260) — Phase 2 already done
- Budget counter (~line 12189) — Phase 3 already done
- Types: `EnrichedAnalysisContext`, `ContextVerdict`, `ClaimVerdict.rating` — already added

---

## Reference: Existing Remap Pattern

`canonicalizeContextsWithRemap()` in `analysis-contexts.ts:437-526` returns `idRemap: Map<string, string>`. Follow this pattern for the similarity-based remap — build a `Map<string, string>` from old IDs to new IDs, then apply it uniformly across all carriers.

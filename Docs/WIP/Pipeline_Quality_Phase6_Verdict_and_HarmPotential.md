# Pipeline Quality Phase 6 — Verdict Token Limit & harmPotential Decontextualization

**Date:** 2026-02-14
**Author:** Senior Developer (Claude Code Opus) — Investigation lead
**LLM Expert Consultation:** Claude Opus 4.6 (second opinion on both issues)
**Captain Decision:** Phased approach (token limit) + Decontextualized micro-call (harmPotential)
**Status:** APPROVED — executing

---

## 1. Investigation Summary

Three new orchestrated pipeline reports were analyzed (run after Phase 5 commits on Feb 14):

| Report | Claims | Contexts | Evidence | Verdict Quality | harmPotential | Status |
|--------|--------|----------|----------|----------------|--------------|--------|
| SRG Initiative (FH-MLLJSOAD) | 25 | 8 | 34 items | **CATASTROPHIC** — 25/25 at 50/50 | 0 HIGH (correct) | `report_damaged` |
| H2 vs EV (FH-MLLJNR93) | 13 | 5 | 22 items | Good (20-80%) | 8/13 HIGH (**regression**) | Passed |
| Bolsonaro (FH-MLLFX3CR) | 6 | 4 | 33 items | Good (59-82%) | 3/6 HIGH (acceptable) | Passed |

---

## 2. Issue 1: Wholesale Verdict Failure (P0)

### Root Cause

`maxOutputTokens: 8192` at `orchestrated.ts:7809` is insufficient for high-claim-count analyses. The SRG Initiative report (25 claims, 8 contexts) requires an estimated 10,550-15,050 output tokens for the verdict JSON.

**Token breakdown (LLM Expert estimate):**
- 25 claimVerdicts: ~250-350 tokens each = 6,250-8,750 tokens
- 8 contextAnswers with keyFactors: ~400-600 each = 3,200-4,800 tokens
- verdictSummary with keyFactors: ~500-800 tokens
- analysisContextSummary: ~100-200 tokens
- JSON structural overhead: ~500 tokens
- **Total: 10,550-15,050 tokens** (well past 8,192)

When output truncates → JSON fails schema validation → recovery chain (primary → retry-compact → JSON text fallback) all fail → blanket 50/50 fallback for ALL 25 claims.

**Key code locations:**
- Line 7809: `maxOutputTokens: 8192` (primary call)
- Line 7750: `maxOutputTokens: 8192` (JSON text fallback — same limit!)
- Lines 7901-7910: Blanket fallback trigger
- Lines 8178-8234: Missing claims fallback (only runs if partial parse succeeds)

### Solution: Phase 1 (Immediate)

**1a. Increase maxOutputTokens to 16384**

Two-line change at lines 7809 and 7750. The Expert confirms there is **zero cost increase** for outputs that already fit within the current limit — `maxOutputTokens` is a ceiling, not a floor. Cost increase only applies to outputs that would have truncated (i.e., the ones currently failing).

Covers analyses up to ~40 claims / ~10 contexts.

**1b. Partial JSON Recovery**

When structured output fails due to truncation, the JSON typically has complete entries for the first N claims before the truncation point. Implement a `repairTruncatedJson` function that:
1. Finds the last complete `}` in the `claimVerdicts` array
2. Closes the array and outer object
3. Parses against lenient schema
4. Uses recovered verdicts, applies 50/50 only to MISSING claims

The `verdictSummary` and `analysisContextAnswers` appear before `claimVerdicts` in the JSON, so they are preserved in ~95% of truncation cases.

### Solution: Phase 2 (Deferred — for 15+ claim analyses)

Batched verdict generation:
- Split claims into batches of 8-12
- Each batch generates `claimVerdicts` only (parallelizable)
- Final synthesis call generates `analysisContextAnswers` + `verdictSummary` from collected verdicts
- Eliminates token limit concern entirely

---

## 3. Issue 2: harmPotential Frame Contamination (P1)

### Root Cause

The LLM Expert identified **frame contamination** (also called "attribute bleeding"): when the overall analysis topic involves safety/energy/health domains, the LLM's implicit topic-level reasoning ("this article is ABOUT safety") bleeds into per-claim harmPotential classification. Claims about efficiency percentages, refueling times, and range data get classified HIGH because the topic feels high-stakes, not because the claims themselves allege death or injury.

**Evidence:** H2 vs EV report — 8/13 claims classified HIGH (62%). All HIGH claims are technical performance metrics:
- "Hydrogen fuel cells achieve 60% efficiency" → HIGH (should be MEDIUM)
- "Battery EVs have 700km range" → HIGH (should be MEDIUM)
- "There are 1,100 hydrogen refueling stations globally" → HIGH (should be MEDIUM)

The contrastive examples added in Phase 5 are **ineffective** because:
1. Frame contamination occurs before the model reads the examples
2. Examples compete for attention with 8+ other classification tasks in the understand step
3. The enum ordering (`high | medium | low`) creates first-option bias

### Solution: Decontextualized Harm Classification Micro-Call

**Architecture change:**

1. **Remove `harmPotential` from the understand step** — Default all claims to `"medium"` during Step 1 claim extraction
2. **Add a separate Haiku 4.5 call** after the understand step that receives ONLY claim texts (no article, no topic, no context names) and classifies each claim's harmPotential
3. The classification prompt focuses solely on: "Does this claim text ITSELF allege death, severe injury, imminent safety hazard, or major fraud?"

**Why this works:** By stripping topic context from the classification, frame contamination is eliminated. The LLM sees "Hydrogen fuel cells achieve 60% efficiency" in isolation and classifies it as MEDIUM because nothing in the text alleges death or injury.

**Cost:** ~$0.003 per analysis (Haiku 4.5, ~25 claim texts). Negligible.

**Integration point:** After `understanding` is populated but before evidence research begins. The harmPotential values are used for claim weighting in aggregation (1.5x for HIGH in `aggregation.ts:69`), so they must be set before verdict generation.

---

## 4. Execution Plan

### Step 1: Increase maxOutputTokens (P0, 2-line change)

**File:** `orchestrated.ts`
- Line 7809: `8192` → `16384`
- Line 7750: `8192` → `16384`

### Step 2: Implement Partial JSON Recovery (P0)

**File:** `orchestrated.ts` (new function + modify fallback path at ~7901)

Add `repairTruncatedJson()` utility:
- Attempt to find the last complete JSON object in truncated output
- Close unclosed arrays/objects
- Parse against lenient schema
- Return partial result with list of recovered vs missing claim IDs

Modify blanket fallback path (line 7901-7910):
- Before creating blanket 50/50 fallback, attempt partial recovery
- If `verdictSummary` and `analysisContextAnswers` recovered, use them
- Apply 50/50 fallback only to claims that weren't in the recovered `claimVerdicts`

### Step 3: Decontextualized harmPotential Micro-Call (P1)

**Files:** `orchestrated.ts` (new function), `orchestrated.prompt.md` (new section)

New function `classifyHarmPotentialDecontextualized()`:
- Input: array of claim texts (strings only — no IDs, no context, no topic)
- Output: array of `{ claimIndex, harmPotential }`
- Uses Haiku 4.5 with a focused prompt
- Batches all claims in a single call

New prompt section `HARM_POTENTIAL_CLASSIFY` in `orchestrated.prompt.md`:
- Focused solely on harm classification
- No article/topic context provided
- Decision procedure: "Does THIS claim text allege death, severe injury, imminent safety hazard, or major fraud?"

Modify understand step:
- Remove harmPotential from understand prompt schema (default to "medium")
- After understand returns, call `classifyHarmPotentialDecontextualized()`
- Map results back to claims by index

### Step 4: Build Verification

- `npm -w apps/web run build` — TypeScript compilation
- `npm test` — safe unit tests

### Step 5: Integration Test (Captain-supervised)

| Test | What to Verify |
|------|---------------|
| SRG Initiative (25 claims, 8 contexts) | Verdicts generated (not 50/50), verdictSummary populated |
| H2 vs EV (13 claims, 5 contexts) | harmPotential: majority MEDIUM for technical metrics |
| Bolsonaro (6 claims, 4 contexts) | No regression, verdicts still 59-82% range |

---

## 5. Files to Touch

| File | Changes | Steps |
|------|---------|-------|
| `apps/web/src/lib/analyzer/orchestrated.ts` | Increase maxOutputTokens (2 lines), add partial JSON recovery function, modify fallback path, add decontextualized harm classification function | 1, 2, 3 |
| `apps/web/prompts/orchestrated.prompt.md` | Add HARM_POTENTIAL_CLASSIFY section, simplify harmPotential in understand section | 3 |

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| 16384 tokens costs more for large analyses | Only outputs that were previously failing (and wasting tokens on retries) use more tokens. Net cost likely neutral. |
| Partial JSON recovery produces inconsistent verdicts | Lenient schema + missing-claims fallback already exists. Partial recovery is strictly better than blanket 50/50. |
| Decontextualized harm call may miss legitimate HIGH claims | The call receives claim text — "The drug caused 12 deaths" clearly reads as HIGH even without context. Only frame-contamination-based misclassifications are eliminated. |
| Extra Haiku call adds latency | ~2-3 seconds for Haiku 4.5 batch classification. Parallelizable with other post-understand setup work. |

---

## 7. Commit Strategy

1. `fix(analyzer): increase verdict maxOutputTokens and add partial JSON recovery` — Steps 1, 2
2. `feat(analyzer): decontextualized harmPotential classification via separate LLM call` — Step 3

Separate commits for independent rollback.

---

## 8. Relationship to Phase 5 Plan

This Phase 6 plan addresses issues **not covered** by the Phase 5 plan:
- Phase 5 focused on: iteration budget scaling, Block 2 starvation, evidence minimums, search relevance, verdict hedging
- Phase 6 focuses on: verdict token limit (new failure mode), harmPotential frame contamination (Phase 5 prompt examples proved insufficient)

Phase 5 changes (already committed): iteration scaling, evidence minimum scaling, criticism search relaxation, verdict calibration prompts. These remain valid and are not modified by Phase 6.

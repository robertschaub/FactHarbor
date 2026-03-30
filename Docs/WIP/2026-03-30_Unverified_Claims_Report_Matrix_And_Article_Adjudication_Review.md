# UNVERIFIED Claims — Report Matrix and Article Adjudication Architecture

**Date:** 2026-03-30
**Role:** Lead Architect
**Agent:** Claude Code (Opus 4.6)
**Anchor job:** `11c5295a9a7345ad841b832f2970bfa4`
**Product constraint:** LLM reasoning for verdict interpretation; no new deterministic penalty formulas

---

## 1. Executive Summary

The system has two gaps when direct claims are UNVERIFIED: (1) the matrix hides them, and (2) the article verdict ignores them. Neither had correct prior behavior — the old UI created a misleading impression; the new behavior simply makes the gaps visible.

The correct architecture is:

- **Report matrix**: build from ALL final claim verdicts, not just assessable claims. UNVERIFIED claims get columns with zero evidence counts. This is a data-contract alignment, not a semantic change.
- **Article verdict**: extend `VERDICT_NARRATIVE` to also output `adjustedTruthPercentage` and `adjustedConfidence`. The narrative LLM already sees all claim verdicts including UNVERIFIED. It already reasons about coverage gaps in the narrative text. The only change is giving it output authority over the final numbers — bounded by the deterministic pre-computation as a ceiling.

This is **Option B** (report matrix + extend VERDICT_NARRATIVE). It reuses existing infrastructure, adds no new LLM calls, and is safe because it falls back to the deterministic result on any parsing failure.

---

## 2. What the Anchor Job Proves

Job `11c5295a`: 3 claims, 1 assessable, 2 UNVERIFIED.

| Claim | Verdict | Truth% | Conf% | In Matrix | Aggregation Weight |
|-------|---------|--------|-------|-----------|-------------------|
| AC_01 (methods+tools) | LEANING-TRUE | 58 | 65 | Yes | >0 (drives article) |
| AC_02 (efficiency) | UNVERIFIED | 50 | 0 | No | 0 (invisible) |
| AC_03 (effectiveness) | UNVERIFIED | 50 | 0 | No | 0 (invisible) |

**Article:** LEANING-TRUE 58/65 — entirely AC_01. Matrix shows 1 column.

The user asked about methods, efficiency, AND effectiveness. The report answers only about methods and presents this partial answer as the overall finding. The matrix implies only 1 dimension was considered.

**Comparator `64b5d5d6`** (Bolsonaro, both claims assessed): 2 matrix columns, article reflects both. Correct.

**Key insight:** There is nothing to "restore" from before the 2705/e407 fix. The old behavior had duplicate verdicts and misaligned matrix headers — it was wrong in a different way. The new correct behavior requires explicit new design.

---

## 3. Architecture Assessment

### 3a. Three distinct concerns

| Concern | Current state | Correct state |
|---------|--------------|---------------|
| **Assessable claims for Stage 4** | `assessableClaims = sufficientClaims` | Correct — no change needed |
| **Report matrix** | Built from `assessableClaims` | Should include ALL final claim verdicts |
| **Article verdict synthesis** | Deterministic weighted average (UNVERIFIED = weight 0) | LLM adjudication that sees assessed + unresolved claims |

These three concerns should be explicitly separated in the architecture:
- `assessableClaims` → Stage 4 routing (unchanged)
- `reportClaims` = all claim IDs in final `claimVerdicts` → matrix, UI
- `articleAdjudicationInput` = all `claimVerdicts` + deterministic pre-computation → narrative LLM

### 3b. Why deterministic aggregation is insufficient

At `aggregation-stage.ts:108`: `confidenceFactor = verdict.confidence / 100`. For UNVERIFIED (`confidence = 0`): `finalWeight = 0`. The claim is mathematically invisible.

This is not a bug — a zero-confidence claim has nothing to contribute to a weighted average. The problem is that **the absence of evidence is itself analytically significant** and cannot be represented by zero in a multiplicative weight formula. "We couldn't assess 2/3 of your question" is information that should reduce overall confidence.

Per AGENTS.md (LLM Intelligence MANDATORY): "Deterministic text-analysis logic that makes analytical decisions MUST be replaced with LLM-powered intelligence." The decision "what should the overall confidence be when 2/3 of the question is unresolved?" is an analytical decision — it belongs to an LLM.

### 3c. The VERDICT_NARRATIVE opportunity

The narrative LLM (`aggregation-stage.ts:359-430`) already receives:
- All `claimVerdicts` including UNVERIFIED (line 366-379)
- The deterministic aggregation result (line 361-365)
- Boundary information and coverage matrix (lines 383-397)
- Evidence count (line 398)

It already generates a narrative that describes coverage gaps. Its current output schema (`headline`, `evidenceBaseSummary`, `keyFinding`, `boundaryDisagreements`, `limitations`) does NOT include adjudicated numbers. Extending it is a schema change, not a new LLM call.

---

## 4. Option Analysis

### Option A: Report matrix fix only, keep current aggregation

- Build `coverageMatrix` from all `claimVerdicts` claim IDs
- Article verdict unchanged (still ignores UNVERIFIED)

**Pro:** Safe, small. **Con:** Matrix shows UNVERIFIED claims but article verdict doesn't reflect them — creates a visible inconsistency where the matrix says "we couldn't assess this" but the confidence is 65% as if the question was fully answered. **Verdict:** Necessary first step but insufficient on its own.

### Option B: Report matrix + extend VERDICT_NARRATIVE with adjudication output

- Matrix fix (same as A)
- Add `adjustedTruthPercentage` and `adjustedConfidence` to VERDICT_NARRATIVE output schema
- The narrative LLM uses the deterministic pre-computation as a baseline and adjusts when unresolved direct claims are present
- Pipeline uses the LLM's adjusted numbers as the final article verdict
- Fallback: if LLM output is missing/malformed, use deterministic pre-computation unchanged

**Pro:**
- No new LLM call — reuses existing call
- The LLM already sees all the right data
- Natural extension: the narrative already reasons about gaps, now its reasoning also governs the numbers
- Safe fallback preserves current behavior on any regression
- Constraint: LLM can only lower confidence below the deterministic ceiling, not raise it — unresolved claims add uncertainty, never remove it

**Con:**
- Overloads the narrative prompt with adjudication authority (dual responsibility)
- The narrative is generated by the verdict-tier model (Sonnet) — adjudication quality depends on that model
- New output fields need defensive parsing

**Verdict:** Best pragmatic option. Lower complexity than Option C, same semantic outcome.

### Option C: Report matrix + dedicated article-adjudication prompt step

- Matrix fix (same as A)
- New separate LLM call after narrative generation
- Dedicated prompt focused solely on "given these claim verdicts and this narrative, what is the correct overall truth/confidence?"

**Pro:** Clean separation of concerns. Adjudication prompt can be optimized independently. **Con:** Additional LLM call (~$0.01-0.02/run, ~2-5s latency). More code, more testing surface. The incremental value over Option B is small — the narrative LLM already has all the context. **Verdict:** Cleaner but unnecessary complexity for the current stage.

### Option D: Deterministic confidence cap when unresolved direct claims exist

- If any direct claim (`thesisRelevance === "direct"`) is UNVERIFIED, cap article confidence at e.g., 40%
- Purely arithmetic, no LLM

**Pro:** Simple. **Con:** Violates the product constraint — this is a deterministic analytical decision. What should the cap be? 40%? 30%? The right answer depends on how many claims are unresolved, how central they are, and what the assessed claims show — exactly the kind of judgment the product rule says should come from an LLM. **Verdict:** Rejected per product constraint.

---

## 5. Recommended Fix Path: Option B

### Implementation sequence

**Step 1: Report matrix alignment**

In `claimboundary-pipeline.ts`: build `coverageMatrix` from ALL claims in final `claimVerdicts`, not just `assessableClaims`. This means after D5 fallback verdicts are created, build the matrix from the complete set. UNVERIFIED claims get matrix columns with zero evidence counts — factually correct.

In `page.tsx`: matrix labels already derive from `coverageMatrix.claims` (per the recent fix). No additional UI change needed for label alignment. Optionally add a visual indicator (e.g., greyed column, "insufficient evidence" tag) for UNVERIFIED matrix columns.

**Step 2: VERDICT_NARRATIVE adjudication extension**

In `claimboundary.prompt.md` (VERDICT_NARRATIVE section): extend the output schema to include:
```json
{
  "headline": "...",
  "evidenceBaseSummary": "...",
  "keyFinding": "...",
  "boundaryDisagreements": ["..."],
  "limitations": "...",
  "adjustedTruthPercentage": 58,
  "adjustedConfidence": 40
}
```

Add a prompt rule: "If any direct claims are UNVERIFIED due to insufficient evidence, the overall confidence should reflect the incomplete coverage. The `adjustedConfidence` must not exceed the deterministic `confidence` from the aggregation input — unresolved claims add uncertainty, never remove it. `adjustedTruthPercentage` should reflect only assessed claims and may remain the same as the deterministic value when no directional adjustment is warranted."

In `aggregation-stage.ts`: after the narrative LLM returns, parse `adjustedTruthPercentage` and `adjustedConfidence`. If present and valid (numbers in range, confidence <= deterministic ceiling), use them as the final article values. If absent or malformed, fall back to the deterministic pre-computation.

### Why together

Shipping Step 1 alone creates a visible inconsistency: the matrix shows "2 claims are UNVERIFIED" but the article confidence is 65% — the user sees the gap but the system doesn't acknowledge it in its numbers. Step 2 makes the numbers honest.

---

## 6. What Should Remain Deterministic

| Component | Why |
|-----------|-----|
| D5 sufficiency gating | Structural routing — which claims are assessable |
| Stage 4 routing to assessable claims only | Correct since 2705/e407 fix |
| Duplicate verdict invariant | Data integrity — invariant, not interpretation |
| Deterministic weighted average (pre-computation) | Input to the narrative LLM + ceiling for adjudicated confidence |
| Schema validation on LLM output | Structural plumbing |
| Fallback to deterministic result on LLM failure | Safety net |
| Matrix/header alignment | Rendering correctness |

---

## 7. What Not to Change

| Item | Why |
|------|-----|
| D5 thresholds | Separate concern |
| Stage-4 routing logic | Correct as-is |
| The all-insufficient Stage-4 fix | Correctly prevents ghost verdicts |
| Verdict-stage debate logic | Not involved |
| Stage-1 prompts | Not involved in this issue |
| Deterministic penalty/cap formulas as primary fix | Product constraint |
| Silent "repair" of UNVERIFIED claims in aggregation | Would mask the signal |

---

## 8. Validation Gate

### For the report matrix fix:
- `11c5295a` input: matrix shows 3 columns (AC_01 assessed, AC_02/AC_03 UNVERIFIED with zero counts)
- Bolsonaro control: matrix shows 2 assessed columns, no change from current
- No article verdict change in this step alone

### For the VERDICT_NARRATIVE adjudication:
- `11c5295a` input: article confidence should decrease (the narrative LLM should recognize that 2/3 unresolved warrants lower confidence). Truth% may stay similar (only AC_01 was assessed). Narrative should explicitly note unresolved dimensions.
- Bolsonaro (all assessed): adjusted numbers should be near-identical to deterministic pre-computation — the LLM should agree with the weighted average when coverage is complete.
- Hydrogen (all assessed): same — near-identical.
- All-UNVERIFIED case (if one exists or can be constructed): article should be UNVERIFIED with explicit narrative.

**Promotion criterion:** On 5+ jobs with partial-insufficient results, the LLM-adjudicated confidence is consistently lower than the deterministic confidence AND the narrative correctly identifies the coverage gap. On 5+ fully-assessed jobs, the adjudicated numbers are within ±5pp of the deterministic result.

---

## 9. Final Judgment

`LLM-article-adjudication path justified`

**Recommended next task: Report matrix alignment + VERDICT_NARRATIVE adjudication extension**

**Why this first:** The matrix fix is trivial (data-contract alignment). The adjudication extension reuses the existing `VERDICT_NARRATIVE` LLM call — no new call, no new prompt section, just an extended output schema with a confidence-ceiling constraint and defensive parsing. Together they close both the display gap and the semantic gap in a single coherent change. Splitting them creates a confusing intermediate state where the matrix shows unresolved claims but the article numbers ignore them.

---

*Review based on inspection of anchor job `11c5295a`, 3 comparator jobs, current VERDICT_NARRATIVE prompt (lines 1318-1371), aggregation mechanics (lines 100-264), and matrix construction (line 566-570).*

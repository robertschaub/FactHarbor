# UNVERIFIED Claims in Matrix and Overall Verdict — Architecture Review

**Date:** 2026-03-30
**Role:** Lead Architect / Code Reviewer
**Agent:** Claude Code (Opus 4.6)
**Anchor job:** `11c5295a9a7345ad841b832f2970bfa4`
**Product constraint:** Verdict interpretation via LLM reasoning, not deterministic penalty formulas

---

## 1. Executive Summary

The current architecture has two distinct problems:

1. **Matrix display gap:** UNVERIFIED claims are excluded from the Coverage Matrix, making it appear that the analysis only considered 1 of 3 claims. This is a display-model mismatch — the matrix should show all claims that the report covers, including unresolved ones.

2. **Article verdict gap:** Deterministic aggregation weights UNVERIFIED claims at zero (confidence=0 → weight=0), producing an article verdict that ignores 2/3 of the user's question. A user reading "LEANING-TRUE 58%" doesn't know that only 1 of 3 dimensions was assessable.

Per the product rule, the article verdict gap should NOT be fixed by adding a new deterministic penalty formula. The architecturally correct solution is an **LLM-based overall adjudication step** that sees all claims (assessed + unresolved) and produces a final verdict that explicitly acknowledges incomplete assessment. However, this is a significant architectural change that should be **characterized before implementation**.

**Recommended path:** Fix the matrix immediately (small, safe). Characterize the LLM adjudication step separately before building it.

---

## 2. What the Anchor Job Proves

Job `11c5295a`: "Die SRG SSR und ihre Unternehmenseinheiten setzen moderne Fact-Checking-Methoden und -Werkzeuge ein und betreiben Fact-Checking effizient und wirksam"

| Claim | Verdict | Truth% | Conf% | Reason | In Matrix? |
|-------|---------|--------|-------|--------|------------|
| AC_01 (methods+tools) | LEANING-TRUE | 58 | 65 | Stage 4 | Yes |
| AC_02 (efficiency) | UNVERIFIED | 50 | 0 | D5 insufficient | **No** |
| AC_03 (effectiveness) | UNVERIFIED | 50 | 0 | D5 insufficient | **No** |

**Article verdict:** LEANING-TRUE 58/65 — entirely determined by AC_01 alone.

The user asked about 3 dimensions. The system assessed 1, couldn't assess 2, and reports confidence as if the 1 assessed dimension answers the whole question. The matrix shows 1 column (AC_01 only), making it appear that only 1 claim exists.

**Comparator jobs:**
- `55299b20` (same input, different run): 2 claims, 1 UNVERIFIED → same pattern, article driven by 1 claim
- `5f1f96f6` (Werkzeuge/Methoden input): 2 claims, both assessed → matrix shows both, article reflects both
- `64b5d5d6` (Bolsonaro): 2 claims, both assessed → correct behavior

---

## 3. Architecture Assessment

### 3a. Matrix display vs article semantics are separate concerns

**Matrix:** A presentational question — what should the user see in the evidence grid?
**Article verdict:** A semantic question — how should unresolved direct claims affect the overall assessment?

These should be addressed independently. The matrix fix is safe and small. The article verdict fix is architecturally significant.

### 3b. Current aggregation mechanics

At `aggregation-stage.ts:108`:
```
const confidenceFactor = verdict.confidence / 100;
```

For UNVERIFIED claims with `confidence = 0`: `confidenceFactor = 0`, `finalWeight = 0`. The claim is mathematically invisible in the weighted average.

This is not wrong per se — a claim with zero confidence genuinely has nothing to contribute to a weighted average. The problem is that the **absence of information is itself informative** and the current architecture cannot represent it.

### 3c. The LLM-first principle

AGENTS.md (LLM Intelligence, MANDATORY): "Deterministic text-analysis logic that makes analytical decisions MUST be replaced with LLM-powered intelligence."

The question "what should the overall verdict be when 2/3 of the user's question is unresolved?" is an analytical decision. Per the project's own rules, it should be made by an LLM, not by an arithmetic formula.

---

## 4. Option Analysis

### Option A: Matrix-only fix, keep current aggregation

- Show all claims in the matrix (UNVERIFIED claims get a distinct visual treatment)
- Keep deterministic aggregation as-is
- Article verdict still ignores unresolved claims

**Pro:** Small, safe, no semantic changes. Fixes the display gap.
**Con:** Article verdict remains misleading when multiple direct claims are unresolved. User sees "LEANING-TRUE 58%" without knowing 2/3 of their question was unassessable.
**Verdict:** Necessary but insufficient.

### Option B: Matrix fix + LLM-based article adjudication

- Matrix fix (same as Option A)
- Replace or augment deterministic aggregation with an LLM-based overall adjudication step
- The LLM receives: all claim verdicts (assessed + unresolved), the original input, assessment coverage summary
- The LLM produces: final truth%, confidence, verdict label, and a narrative that explicitly acknowledges unresolved dimensions
- Deterministic aggregation becomes a pre-computation input to the LLM, not the final word

**Pro:** Architecturally correct per LLM-first principle. Handles all cases (partial resolution, full resolution, no resolution). Produces user-meaningful narratives like "We could assess 1 of 3 dimensions — the assessed dimension suggests LEANING-TRUE, but 2 dimensions remain unverified."
**Con:** Significant implementation effort. New LLM call adds cost (~$0.01-0.02/run). The LLM's judgment becomes the final arbiter of the overall verdict — this is a meaningful authority shift from deterministic to LLM control.
**Verdict:** Correct end-state but needs characterization before implementation.

### Option C: Verdict narrative already sees all claims — use it

The existing `VERDICT_NARRATIVE` prompt (called at `aggregation-stage.ts:199`) already receives `claimVerdicts` (including UNVERIFIED). It already generates a narrative. But it receives the **pre-computed** `weightedTruthPercentage` and `verdictLabel` as inputs — it narrates the deterministic result rather than adjudicating it.

A lighter-weight variant of Option B: instead of a new LLM step, modify the existing `VERDICT_NARRATIVE` call to also output revised `truthPercentage` and `confidence` when unresolved claims are present. The narrative LLM would have authority to adjust the final numbers.

**Pro:** No new LLM call — uses existing infrastructure. Incremental change.
**Con:** Overloads the narrative prompt with adjudication authority. Harder to test because the same prompt does two jobs. May produce less reliable results than a dedicated adjudication step.
**Verdict:** Pragmatic middle ground, but has design-cleanliness concerns.

---

## 5. Recommended Fix Path

### Immediate: Matrix fix (safe, small)

- Build `coverageMatrix` from ALL `claimVerdicts` claim IDs, not just `assessableClaims`
- OR: build a separate `reportMatrix` that includes all claims for display, while keeping the pipeline `coverageMatrix` as-is for analytical purposes
- UNVERIFIED claims get matrix columns with zero/empty evidence counts — this is factually correct
- UI renders UNVERIFIED columns with a distinct visual treatment (greyed out, "insufficient evidence" label)
- No analytical behavior change

### Deferred: LLM-based article adjudication (characterize first)

This is the correct long-term architecture, but it should be characterized before implementation:

1. **Define the adjudication contract:** What inputs does the LLM receive? What outputs does it produce? How does it relate to the existing narrative?
2. **Test on historical data:** Run the adjudication LLM on 10 recent jobs with partial-insufficient results and compare its verdict vs the current deterministic one
3. **Cost analysis:** One additional Haiku/Sonnet call per run
4. **Risk analysis:** The LLM becomes the final arbiter of the overall verdict — what guardrails prevent it from producing nonsensical results?

Do NOT implement the LLM adjudication step without this characterization.

---

## 6. What Should Remain Deterministic

| Component | Why |
|-----------|-----|
| D5 sufficiency gating | Structural routing — which claims are assessable |
| Stage 4 claim routing | Only assessable claims enter the debate |
| Duplicate verdict invariant | Data integrity — invariant, not interpretation |
| Schema validation | Structural plumbing |
| Matrix/header alignment | Rendering correctness |
| Coverage matrix computation | Structural evidence mapping |
| Pre-computation of weighted averages | The LLM can use these as input, but not be bound by them |

---

## 7. What Not to Change

| Item | Why not |
|------|---------|
| Deterministic unresolved-share penalty formula | Product rule: LLM reasoning, not arithmetic |
| Confidence-penalty ceiling for unresolved claims | Same — deterministic penalty is the wrong layer |
| Neutral-blend formula for unresolved claims | Same |
| D5 thresholds | Separate concern, out of scope |
| Verdict-stage logic | Already correct per recent fixes |
| The old all-insufficient Stage-4 fallback | Fixed correctly — do not reintroduce |
| Gate 1 logic | Not involved |
| Stage 1 prompts | Not involved in this issue |

---

## 8. Validation Gate

### For the matrix fix (immediate):
- `11c5295a` input: matrix should show all 3 claims, with AC_02/AC_03 marked as UNVERIFIED
- Bolsonaro control: matrix should continue showing 2 assessed claims normally
- No article verdict change expected (aggregation unchanged)

### For the LLM adjudication step (when characterized):
- `11c5295a` input: article verdict should reflect that 2/3 of the question is unresolved — expect lower confidence and explicit narrative acknowledgment
- Full-assessment controls: article verdict should be similar to current deterministic output — the LLM should agree with the weighted average when all claims are assessed
- All-UNVERIFIED case: article verdict should be explicitly UNVERIFIED with clear narrative

---

## 9. Final Judgment

`LLM-overall-verdict path justified`

### Concrete recommendation: Option C — extend VERDICT_NARRATIVE to adjudicate

The existing `VERDICT_NARRATIVE` LLM call (`aggregation-stage.ts:359-430`) already receives ALL `claimVerdicts` including UNVERIFIED ones. It already sees the full picture. It just lacks the authority to adjust the final numbers — it narrates the deterministic pre-computation.

**The fix is narrow:** Extend the `VERDICT_NARRATIVE` prompt to also output `adjustedTruthPercentage` and `adjustedConfidence` when unresolved direct claims are present. The narrative LLM already has all the inputs it needs (claim verdicts, boundaries, coverage matrix, evidence count). The only change is: when some direct claims are UNVERIFIED, the LLM can lower the overall confidence and note the incomplete assessment in the narrative — and the pipeline uses those adjusted numbers as the final article verdict instead of the deterministic weighted average.

**Guardrails to keep it safe:**
- When ALL claims are fully assessed, the LLM adjudication should produce numbers very close to the deterministic average (validate in testing)
- The deterministic pre-computation is still passed to the LLM as a reference — the LLM adjusts from it, not from scratch
- The LLM cannot raise confidence above the deterministic pre-computation — it can only lower it when coverage is incomplete
- If the LLM returns malformed adjustment, fall back to the deterministic result

**Why this is lower-risk than it appears:**
- No new LLM call — reuses the existing `VERDICT_NARRATIVE` call
- The LLM already sees the right data — just doesn't have output authority yet
- The narrative already contains all the nuance ("2 of 3 claims could not be assessed") — the numbers should match the narrative's own reasoning
- Fallback to deterministic result on any parsing failure preserves current behavior

### Implementation sequence

1. **Matrix fix** — show all claims including UNVERIFIED (safe, small, ship now)
2. **VERDICT_NARRATIVE adjudication** — extend prompt schema to output adjusted truth/confidence when unresolved claims exist. Pipeline uses adjusted numbers. Validate that fully-assessed runs produce near-identical results to current deterministic output.

### Validation gate

- `11c5295a` input: expect lower confidence (reflecting 2/3 unresolved), explicit narrative acknowledgment
- Bolsonaro (fully assessed): expect numbers nearly identical to current output
- Hydrogen (fully assessed): same — near-identical
- All-UNVERIFIED case: expect UNVERIFIED with narrative explaining why

---

**Recommended next task: Matrix display fix + VERDICT_NARRATIVE adjudication extension**

**Why together:** The matrix fix is trivial. The narrative adjudication reuses existing infrastructure and is the minimal LLM-first solution that addresses both the display gap and the semantic gap. Shipping them separately creates a window where the matrix shows UNVERIFIED claims but the article verdict still ignores them — confusing for users.

---

*Review based on inspection of anchor job `11c5295a`, 3 comparator jobs, aggregation mechanics at `aggregation-stage.ts:100-180`, narrative call at `aggregation-stage.ts:359-430`, and matrix construction at `claimboundary-pipeline.ts:566-570`.*

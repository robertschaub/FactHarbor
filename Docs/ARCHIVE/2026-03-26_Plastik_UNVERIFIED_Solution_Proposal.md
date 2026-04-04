# Plastik DE UNVERIFIED — Solution Proposal

**Date:** 2026-03-26  
**Role:** Lead Architect  
**Status:** REVIEWED — CONSOLIDATED FINAL PROPOSAL  
**Jobs compared:** `5c1b4633` (UNVERIFIED) vs `08a1c6d4` (MIXED)

---

## 1. Executive Summary

Job `5c1b4633` returned `UNVERIFIED` not because of evidence scarcity, but because an article-level mixed-band truth score (`50.1%`) was paired with low article confidence (`36.3%`).

The two-job comparison still supports the original high-level diagnosis:

1. **Stage-1 semantic drift is real**
   `AC_03` changed from a resource-conservation facet to a practical-feasibility facet, which changed the downstream research target.
2. **The downstream confidence path is also decisive**
   high self-consistency spreads (`23-26pp`) crossed the `>20pp` spread band and triggered the steepest confidence penalty.

However, after review and debate, the recommended next step is **not** to implement a new prompt change immediately.

**Consolidated final judgment:** `Bug fix now + downstream/runtime characterization next`

That means:

- **Do the structural-consistency bug fix now**
- **Do not tune spread multipliers yet**
- **Do not ship a new Stage-1 prompt change yet**
- **First inspect why the existing Stage-1 safeguards did not prevent this case**

---

## 2. What the Two Jobs Prove

| Metric | `08a1c6d4` (MIXED) | `5c1b4633` (UNVERIFIED) |
|--------|--------------------|-------------------------|
| Verdict | `MIXED` (`55.3 / 71.3`) | `UNVERIFIED` (`50.1 / 36.3`) |
| Evidence | `123` items, `54` sources | `126` items, `54` sources |
| Balance ratio | `0.52` | `0.58` |
| AC_01 | `65 / 78`, spread `0` | `62 / 30`, spread `26` |
| AC_02 | `28 / 49`, spread `13` | `38 / 48`, spread `14` |
| AC_03 | `56 / 74`, spread `4` | `52 / 28`, spread `23` |
| Boundaries | `4` | `6` |
| Warnings | none | `structural_consistency` error |

### Stable facts

- Evidence volume is effectively the same across both runs.
- Evidence balance is mixed in both runs.
- `AC_02` is relatively stable.
- The verdict flip is driven primarily by the **confidence collapse**, not by a large article-truth shift.

### Proven differential

- `AC_03` changed dimension:
  - earlier: **resource conservation**
  - later: **practical feasibility / implementation**
- Query mix changed with it.
- Boundary composition changed with it.
- Self-consistency spread increased sharply.

That is enough to conclude that Stage 1 contributed materially to the bad run.

It is **not** enough to conclude that the next change should be a prompt edit.

---

## 3. Mechanism Diagnosis

## 3a. Immediate verdict mechanism

The article became `UNVERIFIED` because:

- weighted truth landed in the mixed band
- weighted confidence landed below the mixed threshold

That mapping is performed by the current truth-scale and aggregation logic.

## 3b. Confidence-collapse path

The downstream confidence path is explicit:

- self-consistency spread is measured per claim
- spread is mapped to a multiplier
- high spreads (`>20pp`) receive the steepest multiplier (`0.4`)
- the resulting lower claim confidence feeds article weighting and article verdict classification

This makes the downstream confidence path a real part of the causal chain, not just a side effect.

## 3c. Stage-1 diagnosis after review

The earlier proposal treated Option C as the likely next move. Review changed that.

Why:

- the current prompt already includes the relevant ambiguous-predicate safeguards for `ambiguous_single_claim`:
  - predicate preservation
  - no proxy rephrasing
  - facet convergence
  - claim-count stability
- Stage 1 also already routes ambiguous dimension inputs through the intended decomposition path.

So the missing proof is not “we need a new prompt rule.”  
The missing proof is: **why did the existing Stage-1 safeguards not prevent this specific bad run?**

That runtime question is still unanswered.

---

## 4. Candidate Options After Review

### Option A: Fix the structural-consistency bug

**Keep, but narrow it correctly.**

The original proposal was directionally right but slightly misplaced.

Verified code-path finding:

- reconciliation already recomputes `verdict` from `truthPercentage + confidence`
- the mismatch is introduced later, when spread adjustment lowers `confidence` but leaves `verdict` stale
- the structural checker then only emits a warning

**Correct fix:** recompute `verdict` in the Step 4c spread-adjustment map at the same point where `adjustedConfidence` is written.

This is a straightforward correctness fix and should be shipped now.

### Option B: Tune the spread multiplier cliff

**Defer.**

This remains a global calibration lever, not a narrow local fix.

Review conclusion:

- the downstream cliff is real
- but changing spread multipliers now would globally alter calibration before we know whether Stage-1 safeguards actually failed in runtime for this family

So this should remain deferred unless characterization later shows the current calibration itself is the dominant problem.

### Option C: Prompt / Stage-1 convergence change

**Do not implement yet.**

This is the biggest change from the original proposal.

Why:

- the current prompt already contains the relevant protections by spec
- the code already routes ambiguous evaluative inputs into the intended path
- so the repo does **not** support “maybe the QLT-3 rules don’t apply here” as the main next assumption

Replace immediate Option C with:

**Option C-prime: Runtime-path investigation**

Inspect the offending jobs and determine:

- what the effective Pass-2 `inputClassification` was
- whether the run behaved like `ambiguous_single_claim`
- whether claim-contract validation passed, retried, or failed open
- whether existing facet-convergence logic was actually followed in runtime

Only if that investigation shows a real Stage-1 enforcement gap should a targeted Stage-1 change be approved.

### Option D: Accept as monitor-only amber variance

**Reject as the immediate response.**

This is not just routine monitor-mode variance while:

- a real verdict-label correctness bug exists
- the Stage-1 runtime path for the bad run remains unverified

---

## 5. Consolidated Final Recommendation

## Do now

1. **Fix the Step 4c post-spread relabel bug**
   - narrow, correctness-only
   - no calibration change

## Do next

2. **Run a runtime-path characterization for the two Plastik DE jobs**
   - inspect the Stage-1 path rather than editing the prompt spec blindly

## Do not do yet

3. **Do not tune spread multipliers**
4. **Do not ship a new Stage-1 prompt change yet**

This replaces the earlier “A + C now” recommendation.

---

## 6. Execution Plan

### Phase 1 — correctness bug fix

- patch `verdict-stage.ts` so post-spread confidence changes also recompute `verdict`
- add a unit test proving `52% / 28% => UNVERIFIED`
- confirm that this mismatch class no longer emits `structural_consistency`

### Phase 2 — runtime-path investigation

Produce a short diagnostic report for the two cited jobs answering:

1. what was the effective Pass-2 classification?
2. did claim-contract validation pass, retry, or fail open?
3. did the Stage-1 decomposition path actually behave as intended?
4. is the observed drift evidence of:
   - Stage-1 enforcement failure
   - downstream amplification only
   - or both?

### Phase 3 — decision gate

After Phase 2:

- if the runtime data shows a real Stage-1 escape:
  - approve a **targeted Stage-1 enforcement fix**
- if it does not:
  - keep prompt text unchanged
  - and, if still needed, open a separate downstream calibration characterization

---

## 7. What to Defer

| Item | Why defer |
|------|-----------|
| Spread multiplier tuning | global calibration impact; not yet justified |
| New prompt wording | existing prompt already contains the relevant safeguards |
| Broad Stage-1 reopening | too much scope for one family-level issue |
| “Zero UNVERIFIED across 5 runs” as success criterion | optimizes for label suppression rather than calibration correctness |

---

## 8. Final Judgment

**`Bug fix now + downstream/runtime characterization next`**

### Recommended next task

`Fix structural_consistency verdict-label mismatch at Step 4c`

### Why this first

It is the smallest unambiguous fix. The bug is real, localized, and independently justified. It also removes noise from the next diagnostic step by ensuring claim labels remain consistent with the truth-scale rules after spread adjustment.

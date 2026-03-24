# Post-Validation Control & Coverage Follow-up
**Date:** 2026-03-24
**Status:** ACTIVE — live validation running on the fixed stack
**Context:** Follow-up after the Stage-4 provider-guard reliability fix, the Stage-1 `claimDirection` prompt clarification, and the preliminary-evidence multi-claim mapping repair.

---

## 1. What Is Already Closed

- **WS-1 through WS-4** are materially complete.
- **Stage-4 reliability incident** is technically addressed:
  - jobs/UI now surface `analysis_generation_failed` distinctly
  - Stage-4 provider guard is lane-aware
  - the fix was code-reviewed and approved
  - concurrent live validation showed no repeat of `Stage4LLMCallError` fallback behavior
- **Stage-1 `claimDirection` root cause** for the flat-earth control is identified and fixed at the prompt layer.
- **Preliminary-evidence mapping leak** is fixed in code (`31aea55d`) by preserving full `relevantClaimIds[]` into Stage 2 seeding.

These are not the current blockers.

---

## 2. Why There Is Still an Active Gate

The Stage-4 reliability pass did **not** prove that overall control quality is now clean.

Two separate post-validation findings still required action:

1. **Flat-earth false positive**
   - Root cause: Stage-1 `claimDirection` mislabeling
   - Fix: prompt clarification (`1e7e2c57`)

2. **Claim Assessment Boundaries with evidence but empty matrix rows**
   - Root cause: seeded preliminary evidence lost full `relevantClaimIds[]`
   - Fix: preserve `relevantClaimIds[]` and use it preferentially during seeding (`31aea55d`)

As a result, the correct current posture is:

**validate the fixed stack first, then reprioritize.**

---

## 3. Active Validation Batch

Current live validation batch runs on a restarted stack using commit `31aea55d`.

Representative inputs:
- `Ist die Erde flach?`
- `Ist die Erde rund?`
- Hydrogen control
- Bolsonaro legal/fairness control
- Plastik EN / DE

### Success criteria

1. **Flat-earth control**
   - no inverted `TRUE` result
   - extracted thesis-restating claims use `supports_thesis`, not `contradicts_thesis`

2. **Round-earth control**
   - remains directionally correct

3. **Boundary coverage**
   - no boundaries that appear populated purely because seeded preliminary evidence lost claim mapping
   - specifically: no `evidenceCount > 0` rows with zero matrix coverage caused only by dropped `relevantClaimIds`

4. **Reliability**
   - no `analysis_generation_failed`
   - no `llm_provider_error` regressions under the same load profile

---

## 4. Open Non-Quality Bug

There is also a separate jobs-list sync problem:

- a job can show a persisted verdict while progress still displays an older lower percentage
- likely cause: result persistence and later stale progress events are not synchronized monotonically

This should be fixed, but it is **orthogonal** to the analysis-quality fixes above.

---

## 5. What Is Explicitly Not Approved Yet

- Do **not** open `P1-A` yet
- Do **not** bundle `P1-B`
- Do **not** reopen broad Plastik Phase 2 implementation
- Do **not** treat the Stage-4 reliability pass as a full clean quality gate

---

## 6. Decision After This Gate

Once the current batch is evaluated, the next decision should be one of:

1. **Gate passes cleanly**
   - update status/backlog
   - close the control/coverage follow-up
   - re-open prioritization for the next workstream

2. **Control verdicts are fixed, but coverage leak is only partially fixed**
   - investigate remaining seeded-evidence paths
   - keep scope on Stage-1 → Stage-2 evidence plumbing

3. **Control verdicts still fail**
   - do not reopen optimization
   - continue focused quality diagnosis before any new track

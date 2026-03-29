# 1bfb Direction Integrity — Architect Review

**Date:** 2026-03-29
**Role:** Lead Architect
**Status:** REVIEW-READY
**Problem job:** `1bfbfb82f82b4e239f750f0b23883cc7` (UNVERIFIED 55.9/24)
**Comparator job:** `88325f52d095470b8826440f8c575e7f` (MOSTLY-TRUE 73.8/68)
**Input:** "The court proceedings against Jair Bolsonaro for attempted coup d'etat complied with Brazilian procedural law and constitutional requirements, and the resulting verdicts were fair."

---

## 1. Executive Summary

The primary failure in `1bfb` is a **Stage 4 citation-carriage defect** — not a direction-validator false positive, not research starvation, and not a Stage 1 decomposition problem.

AC_02 ("verdicts were fair") had a real evidence pool of 10 items (1 supports, 4 contradicts, 5 neutral). The advocate-stage debate produced a verdict that explicitly reasoned about 3 contradicting evidence IDs (`EV_1774770531919`, `EV_1774770531921`, `EV_1774770531923`). But the **reconciliation output schema does not include `supportingEvidenceIds` or `contradictingEvidenceIds`** — so the final verdict carried the **advocate's original citation arrays** (1 support, 0 contradict), which no longer matched the reconciled reasoning.

The grounding validator correctly caught the mismatch. Then the direction validator operated on the stale arrays (1 support, 0 contradict) and flagged the verdict. Direction repair changed truth to 32% but could not repair the arrays. The repaired verdict re-failed. Safe downgrade produced 50/24 (UNVERIFIED).

A secondary bug makes the safe-downgrade warning misleading: the warning records `originalTruthPercentage: 48` (from the pre-repair verdict) but the issue text describes the post-repair 32% state.

25/400 recent jobs (6.25%) have `verdict_integrity_failure`. This is systemic.

---

## 2. What the Two Jobs Prove

### 2.1 Job `1bfb` — the failure

| Claim | Verdict | TP | Conf | Consistency | Reason |
|-------|---------|-----|------|-------------|--------|
| AC_01 | LEANING-TRUE | 58 | 60 | [68,68,68] spread=0 | Clean |
| AC_02 | UNVERIFIED | 50 | 24 | [62,58,52] spread=10 | `verdict_integrity_failure` |

AC_02 evidence pool: 10 items (1 supports, 4 contradicts, 5 neutral).
AC_02 final cited arrays: `supportingEvidenceIds: ["EV_1774770531922"]`, `contradictingEvidenceIds: []`.
AC_02 reasoning explicitly cites: `EV_1774770531919`, `EV_1774770531921`, `EV_1774770531923` as contradicting.

**The reconciliation LLM clearly reasoned about contradicting evidence but was never asked to return updated citation arrays.** The output schema at [claimboundary.prompt.md:1100-1123](apps/web/prompts/claimboundary.prompt.md#L1100) includes `claimId`, `truthPercentage`, `confidence`, `reasoning`, `isContested`, `challengeResponses`, `misleadingness`, `misleadingnessReason` — but NOT `supportingEvidenceIds` or `contradictingEvidenceIds`.

The parser at [verdict-stage.ts:975-987](apps/web/src/lib/analyzer/verdict-stage.ts#L975) uses `...original` (the advocate verdict) as the base, inheriting the advocate's citation arrays unchanged.

### 2.2 Job `8832` — the comparator (same input, clean result)

| Claim | Verdict | TP | Conf | Consistency | Reason |
|-------|---------|-----|------|-------------|--------|
| AC_01 | MOSTLY-TRUE | 82 | 75 | [85,85,82] spread=3 | Clean |
| AC_02 | LEANING-TRUE | 62 | 58 | [68,68,68] spread=0 | Clean |

AC_02 in `8832` had `supportingEvidenceIds: 4 items`, `contradictingEvidenceIds: 2 items` — carried through from the advocate, and happened to match the reconciled reasoning. No grounding issue fired.

**The comparator proves that when the advocate's citation arrays happen to match the reconciliation reasoning, the pipeline works correctly.** The defect is not in the direction validator or the evidence pool — it's in the citation-carriage gap at reconciliation.

### 2.3 Warning sequence for 1bfb AC_02

1. **Grounding validator fires** (info): "Contradicting evidence IDs list is empty, but reasoning references EV_1774770531919, EV_1774770531921, EV_1774770531923"
2. **Direction validator fires** (info): "Truth percentage 48% but only 1 supporting evidence item cited with no contradicting evidence"
3. **Direction repair runs**: truth adjusted from 48% to 32%
4. **Re-validation fails**: "Truth percentage 32% is supported by only 1 evidence item... cites no contradicting evidence"
5. **Safe downgrade**: truth=50%, confidence capped to 24

**Steps 2-5 all operated on stale citation arrays.** If the reconciliation had returned updated arrays (3 contradicting IDs), the direction validator would have seen 1 support / 3 contradict at TP=48% — direction-consistent, no flag.

---

## 3. Adjudication of Competing Explanations

### 3.1 Citation-carriage defect (CONFIRMED — primary)

The reconciliation output schema does not include citation arrays. The reconciliation parser inherits advocate arrays via `...original`. When the reconciliation LLM shifts its reasoning to incorporate new contradicting evidence (from the challenger), the citation arrays do not follow. This is a contract gap, not an LLM error.

**Verdict: This is the primary failure. The evidence is conclusive.**

### 3.2 Direction-validator false positive (REJECTED as primary)

The direction validator checked TP=48% against 1 support / 0 contradict. That is a valid flag — a verdict at 48% with 1 supporting and 0 contradicting IS directionally suspicious. The validator is doing exactly what it should.

The false positive originated UPSTREAM: the citation arrays were stale. If they had been correct (1 support, 3 contradict), the validator would have seen a ratio consistent with 48% and would not have flagged it.

**Verdict: The direction validator is a downstream victim, not the root cause.**

### 3.3 Research starvation (CONTRIBUTING, not primary)

AC_02 had only 10 evidence items (1 support, 4 contradict, 5 neutral) from 4 unique URLs. The comparator `8832` also had a thin AC_02 pool. Thin evidence pools amplify the impact of citation-carriage errors (fewer items = larger proportional shift from any missing ID). But research starvation did not cause the integrity failure — even with 10 items, the verdict was analytically reasonable (TP=48% with mixed evidence).

**Verdict: Contributing factor that amplifies the primary defect, not an independent root cause.**

### 3.4 Stage 1 claim decomposition (NOT INVOLVED)

Both `1bfb` and `8832` decomposed identically: AC_01 (procedural compliance) + AC_02 (verdict fairness). AC_01 was clean in `1bfb` (TP=58, spread=0). The failure is entirely within AC_02's Stage 4 processing.

**Verdict: Not involved.**

---

## 4. Immediate Bugs

### Bug 1: Safe-downgrade warning mixes pre-repair and post-repair truth states

**Location:** [verdict-stage.ts:1195-1201](apps/web/src/lib/analyzer/verdict-stage.ts#L1195)

When the repaired verdict fails re-validation, `safeDowngradeVerdict` is called with `current` (the pre-repair verdict). The warning records `originalTruthPercentage: 48` (from `current.truthPercentage`) but `retryDirection.issues` contains text describing the post-repair 32% state.

**Fix:** Pass `repaired` (not `current`) to `safeDowngradeVerdict` at line 1195, so the warning's `originalTruthPercentage` reflects the last attempted truth value. Or record both: `preRepairTruthPercentage` and `postRepairTruthPercentage` in the warning details.

**Classification:** Code-only bug fix. No prompt change. No schema change.

### Bug 2: Reconciliation does not return citation arrays (the primary defect)

**Location:** [claimboundary.prompt.md:1100-1123](apps/web/prompts/claimboundary.prompt.md#L1100) (output schema) and [verdict-stage.ts:975-987](apps/web/src/lib/analyzer/verdict-stage.ts#L975) (parser)

The reconciliation prompt's output schema omits `supportingEvidenceIds` and `contradictingEvidenceIds`. The parser falls through to `...original`, carrying stale advocate arrays.

**Fix:** Two parts:
1. **Prompt schema change** (requires human approval): Add `supportingEvidenceIds` and `contradictingEvidenceIds` to the VERDICT_RECONCILIATION output schema. Instruct the LLM to return the final evidence arrays that match its reconciled reasoning.
2. **Parser change** (code-only): In [verdict-stage.ts:975-987](apps/web/src/lib/analyzer/verdict-stage.ts#L975), extract `supportingEvidenceIds` and `contradictingEvidenceIds` from the reconciliation output. Validate against the evidence pool (filter phantom IDs). Fall back to advocate arrays if the LLM returns empty or invalid arrays.

**Classification:** Prompt/schema contract fix + code fix. Prompt change requires human approval.

---

## 5. Recommended Fix Strategy

### 5.1 Why citation-carriage must be fixed first

The direction validator and direction repair both operate on the citation arrays. If those arrays are stale, every downstream step is corrupted:
- Direction validation flags verdicts that are actually directionally consistent
- Direction repair adjusts truth% against stale arrays, producing nonsensical values
- Safe downgrade triggers on repair failures that would not have occurred with correct arrays
- The grounding validator correctly catches the mismatch but cannot repair it

Fixing the direction validator threshold, the rescue hatch, or the repair prompt while the arrays remain stale is treating symptoms. The arrays must be fixed first, then any remaining direction-validator false positives can be characterized on clean data.

### 5.2 Why threshold tuning is not the right first move

The investigation handoff correctly argues this. The direction validator at [verdict-stage.ts:1067-1089](apps/web/src/lib/analyzer/verdict-stage.ts#L1067) receives `supportingEvidenceIds` and `contradictingEvidenceIds` from the verdict. If those arrays are stale, the validator's input is wrong — tuning its thresholds or prompt to tolerate wrong input is backwards.

The same applies to `isVerdictDirectionPlausible()` at [verdict-stage.ts:1281-1339](apps/web/src/lib/analyzer/verdict-stage.ts#L1281): it reads `verdict.supportingEvidenceIds` and `verdict.contradictingEvidenceIds`. If those are stale, the weighted ratio is meaningless.

### 5.3 Should VERDICT_DIRECTION_REPAIR also carry citation arrays?

Not in the first rollout. The repair prompt at [claimboundary.prompt.md:1237-1295](apps/web/prompts/claimboundary.prompt.md#L1237) receives the stale arrays as input and is instructed to "keep the same cited evidence set context." Once reconciliation returns correct arrays, the repair will receive correct input. If repair still needs to adjust arrays (because its truth% change shifts which evidence is relevant), that's a follow-up — but the common case is that correct reconciliation arrays will prevent most direction failures from reaching the repair path.

---

## 6. What NOT to Change

| Item | Why not |
|------|---------|
| Direction validator thresholds | Input arrays are stale — tuning thresholds for wrong input is backwards |
| Direction validator prompt | Same reason — fix the input first, then characterize remaining false positives |
| Self-consistency rescue boost | The `b5f29c58` proposal (Direction_Validator_False_Positive) should be re-evaluated only after citation-carriage is repaired and the false-positive rate is measured on clean data |
| `isVerdictDirectionPlausible()` Rule 2 floor (0.3) | Stale arrays make the ratio meaningless — tuning is premature |
| `probativeValueWeights` | These serve dual purpose in aggregation; changing them here has coupling risk |
| Stage 4.5 SR calibration | Separate track, unrelated to this defect |
| D5 thresholds | Working correctly |
| VERDICT_DIRECTION_REPAIR citation arrays | Fix reconciliation first; repair receives reconciliation output, so it will inherit corrected arrays |

---

## 7. Implementation Order

### Step 1: Warning-state bug fix (code-only)

**What:** Fix `safeDowngradeVerdict` call at [verdict-stage.ts:1195](apps/web/src/lib/analyzer/verdict-stage.ts#L1195) to pass `repaired` instead of `current`, so the warning records the actual last-attempted truth value.

**Classification:** Code-only bug fix. No prompt change.
**Scope:** ~2 lines.
**Risk:** Minimal — warning metadata only, no analytical impact.
**Approval:** Standard code review.

### Step 2: Reconciliation citation-carriage fix (prompt + code)

**What:**
1. Add `supportingEvidenceIds: string[]` and `contradictingEvidenceIds: string[]` to the VERDICT_RECONCILIATION output schema in [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md).
2. Instruct the reconciliation LLM: "Return the final supportingEvidenceIds and contradictingEvidenceIds arrays that match your reconciled reasoning. Only use evidence IDs from the provided evidence pool."
3. In [verdict-stage.ts:975-987](apps/web/src/lib/analyzer/verdict-stage.ts#L975), extract the arrays from the reconciliation output. Validate IDs against the evidence pool (filter phantoms). Fall back to advocate arrays if the LLM returns empty/invalid arrays.

**Classification:** Prompt/schema contract fix + code fix.
**Scope:** ~10 lines in prompt, ~15 lines in parser.
**Risk:** Low — the LLM already cites these IDs in its reasoning; now it formalizes them in structured output. Fallback to advocate arrays preserves current behavior on any regression.
**Approval:** Prompt change requires explicit human approval.

### Step 3: Re-characterize direction-validator false positives (measurement)

**What:** After Step 2 ships, run 10 jobs across Bolsonaro, Homeopathy, Plastik families. Count `verdict_integrity_failure` occurrences. If the rate drops materially (from 6.25% to <2%), the direction-validator false-positive proposal (`2026-03-27_Direction_Validator_False_Positive_Investigation.md`) can be deferred. If it remains above 3%, reopen that proposal with clean data.

**Classification:** Measurement, no code change.
**Scope:** $5-10 in LLM costs.

### Step 4 (conditional): Direction-validator prompt improvement

Only if Step 3 shows a material false-positive rate on clean data. This would mean the validator has a genuine quality-vs-quantity blindness independent of citation arrays. At that point, improving the `VERDICT_DIRECTION_VALIDATION` prompt to consider evidence quality signals — or the self-consistency rescue boost — becomes justified.

**Classification:** Prompt change, requires human approval.
**Gated on:** Step 3 measurement results.

---

## 8. Final Judgment

**`Citation-carriage fix justified`**

The evidence is conclusive: the reconciliation output schema omits citation arrays, the parser inherits stale advocate arrays, and every downstream validation step (grounding, direction, repair, safe-downgrade) operates on corrupted input. 25/400 recent jobs (6.25%) hit `verdict_integrity_failure` — this is systemic, not a tail event.

The fix is narrow (prompt schema + parser, with fallback to current behavior) and addresses the root cause directly. Threshold tuning, rescue-hatch changes, and direction-validator prompt improvements should be deferred until citation-carriage is repaired and the false-positive rate is remeasured on clean data.

---

**Recommended next task:** Implement reconciliation citation-carriage fix (warning-state bug fix + VERDICT_RECONCILIATION schema + parser update)

**Why this first:** The citation-carriage gap corrupts the input to every downstream validation step. Direction validation, direction repair, and safe-downgrade all operate on stale advocate arrays that no longer match the reconciled reasoning. Fixing the arrays at the source eliminates the corruption for all downstream consumers in a single change. The warning-state bug fix is trivial and should ship alongside. Once both are in, a 10-job measurement round will determine whether the direction-validator false-positive rate still justifies the proposals in `2026-03-27_Direction_Validator_False_Positive_Investigation.md`, or whether citation-carriage was the dominant cause all along.

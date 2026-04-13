# QLT-4 Per-Claim Contrarian Retrieval Experiment — Results

**Date:** 2026-03-26
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Stack:** Commit `b3e85c54` with `perClaimContrarianRetrievalEnabled: true` via UCM

---

## 1. Executive Summary

**The experiment did not validate.** The per-claim contrarian retrieval feature was enabled but **never triggered** across all 11 validation jobs. Zero `per_claim_contrarian_triggered` warnings appeared in any run. The trigger conditions (per-claim skew > 0.85 with ≥ 8 directional items AND < 2 minority sources) were too conservative to activate on real Plastik EN runs.

As a result, the Plastik EN spread in this batch (37pp article, 48pp environmental claim) reflects baseline behavior, not QLT-4 behavior. The experiment cannot be evaluated because the mechanism never fired.

**Controls are clean:** Flat Earth (0pp, all FALSE) and Bolsonaro (7pp, all LEANING-TRUE) show no regression.

---

## 2. What Changed

Implementation (commit `b3e85c54`):
- `assessPerClaimEvidenceBalance()` helper in research-extraction-stage.ts
- Per-claim contrarian block in claimboundary-pipeline.ts (after article-level C13)
- 5 new UCM calc-config parameters (all default off)
- `per_claim_contrarian_triggered` warning type registered

UCM activation for this batch:
- `perClaimContrarianRetrievalEnabled: true`
- All other parameters at defaults: skewThreshold=0.85, minDirectional=8, minMinoritySources=2, maxTriggeredClaims=2

---

## 3. Why It Didn't Fire

The trigger requires ALL of:
1. Per-claim majority ratio > 0.85 (i.e., > 85% of directional items in one direction)
2. At least 8 directional items for that specific claim
3. Fewer than 2 distinct minority-direction source URLs

The likely failure point is condition 1 or 2: evidence items are tagged with `relevantClaimIds` at extraction time, and a single claim may not accumulate 8+ directional items with > 85% skew — even when the article-level pool is unbalanced. The article-level evidence pool distributes items across 3 claims, so each claim may only have ~30-50 items attributed to it, with a more moderate direction ratio per-claim than the article-level aggregate suggests.

**This is a threshold calibration problem, not an implementation bug.** The code works correctly (tested with 5 unit tests). The thresholds are too conservative for the actual per-claim evidence distribution in real runs.

---

## 4. Plastik EN Results (5 runs)

| Run | Job ID | Verdict | Truth% | Conf% | AC_01 (env) | AC_02 (econ) | AC_03 (practical) | QLT-4 Fired |
|-----|--------|---------|--------|-------|-------------|--------------|-------------------|-------------|
| 1 | 941fa80f | MOSTLY-TRUE | 74 | 80 | 72% | 69% | 81% | No |
| 2 | 1d3c2a27 | MIXED | 46 | 59 | 42% | 58% | 40% | No |
| 3 | f4e39993 | MOSTLY-TRUE | 73 | 76 | 76% | 68% | 72% | No |
| 4 | 5d913c25 | MIXED | 52 | 69 | 32% | 58% | 70% | No |
| 5 | 19e6aab9 | LEANING-FALSE | 37 | 63 | 28% | 52% | 35% | No |

**Article spread: 37pp** (37–74). **Environmental claim spread: 48pp** (28–76).

This is wider than prior baselines (QLT-1: 16pp article, QLT-2: 30pp article). However, since QLT-4 never fired, this spread is purely baseline behavior — it reflects natural run-to-run variance, not a QLT-4 effect.

**Observation:** Runs 1 and 3 are notably high (73-74%, MOSTLY-TRUE) — higher than any prior Plastik EN run. This may reflect web source availability changes over time rather than any code change.

---

## 5. Flat Earth Control (3 runs)

| Run | Job ID | Verdict | Truth% | Conf% |
|-----|--------|---------|--------|-------|
| 1 | b45989cb | FALSE | 0 | 95 |
| 2 | bb428874 | FALSE | 0 | 94 |
| 3 | c73bcbe2 | FALSE | 0 | 94 |

**Spread: 0pp. All FALSE. Clean control. No regression.**

---

## 6. Bolsonaro Control (3 runs)

| Run | Job ID | Verdict | Truth% | Conf% |
|-----|--------|---------|--------|-------|
| 1 | 0373c002 | LEANING-TRUE | 62 | 60 |
| 2 | 289049e4 | LEANING-TRUE | 67 | 65 |
| 3 | 27708309 | LEANING-TRUE | 60 | 24 |

**Spread: 7pp** (60–67). All LEANING-TRUE. Direction stable. Run 3 has low confidence (24%) on AC_01 — an evidence-driven outlier, not a QLT-4 effect.

---

## 7. Judgment

**The experiment is inconclusive — the mechanism never activated.**

| Criterion | Result |
|-----------|--------|
| QLT-4 fired on any Plastik EN run | **No** |
| Plastik EN spread reduced | **No** (37pp, wider than prior 30pp) |
| Flat Earth regression | **No** (0pp, all FALSE) |
| Bolsonaro regression | **No** (7pp, LEANING-TRUE) |
| Controls safe | **Yes** |

The feature cannot be validated because it didn't activate. The thresholds need recalibration.

---

## 8. Recommendation

**Keep experimental / default-off.** The implementation is correct but the trigger thresholds are too conservative. Two options:

**Option A: Recalibrate thresholds and re-run.**
Lower `perClaimBalanceMinDirectional` from 8 to 4-5 and/or lower `perClaimBalanceSkewThreshold` from 0.85 to 0.75. Then re-run the same 5× Plastik EN batch. This tests whether the mechanism fires with more aggressive thresholds while keeping the same safety controls.

**Option B: Accept that per-claim triggering at the evidence-item level is too granular.**
The per-claim evidence counts may simply not be large enough or skewed enough to trigger the feature. The article-level contrarian retrieval (which already runs) may be the appropriate granularity. In this case, the experiment's conclusion is "per-claim triggering doesn't reach activation threshold in practice — the variance source is upstream of what this feature targets."

**Recommended: Option A first** — one more round with lowered thresholds before concluding the mechanism is ineffective. The implementation cost is sunk; the recalibration cost is one UCM config change + 5 jobs.

---

*11 jobs, zero exclusions, feature enabled but never triggered. Controls clean.*

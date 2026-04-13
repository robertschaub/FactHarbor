# Diversity-Aware Stage-2 Sufficiency Validation

**Date:** 2026-03-26
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Commit:** `83a47aad` (feature), revised per review gaps
**Config:** `diversityAwareSufficiency=true` (UCM hash `ee253d1c`)

---

## 1. Executive Summary

8 runs (4 Bolsonaro, 2 Plastik DE, 2 Flat Earth) with `diversityAwareSufficiency=true` produced **zero UNVERIFIED verdicts**, zero warnings, and no control regressions. Compared to the prior baseline (1/5 Bolsonaro UNVERIFIED, amber), the feature eliminates the weak-path D5 starvation signal entirely in this sample.

**Judgment: Validated.** Recommend promotion to optional default (admin-enabled).

---

## 2. Validation Setup

- **Stack:** commit `83a47aad` + all prior fixes
- **Config:** `diversityAwareSufficiency=true` via UCM, all other settings default
- **Services:** Clean restart before first batch. Second batch submitted after first completed.
- **Excluded runs:** None — all 8 succeeded.

---

## 3. Run Table

| # | Input | Job ID | Verdict | Truth | Conf | Claims | Warnings |
|---|-------|--------|---------|-------|------|--------|----------|
| B1 | Bolsonaro | `001b04fe` | LEANING-TRUE | 63 | 65 | 2 | 0 |
| B2 | Bolsonaro | `678018b8` | LEANING-TRUE | 67 | 67 | 3 | 0 |
| B3 | Bolsonaro | `d2436245` | MIXED | 46 | 62 | 3 | 0 |
| B4 | Bolsonaro | `27be183e` | LEANING-TRUE | 71 | 66 | 2 | 0 |
| P1 | Plastik DE | `a61bbeea` | MOSTLY-FALSE | 25 | 69 | 3 | 0 |
| P2 | Plastik DE | `cff33982` | LEANING-FALSE | 36 | 65 | 3 | 0 |
| FE1 | Flat Earth | `9fd79cbd` | FALSE | 0 | 99 | 2 | 0 |
| FE2 | Flat Earth | `56809476` | FALSE | 0 | 94 | 2 | 0 |

---

## 4. Bolsonaro Analysis

### Comparison with prior baseline (diversityAwareSufficiency=false)

| Metric | Baseline (5 runs) | Experiment (4 runs) |
|--------|-------------------|---------------------|
| UNVERIFIED count | 1/5 (20%) | **0/4 (0%)** |
| Truth range | 47.5–72.6 (25pp) | 46–71 (25pp) |
| Confidence range | 44.2–67.3 (23pp) | 62–67 (5pp) |
| Verdict direction | 4 LEANING-TRUE + 1 UNVERIFIED | 3 LEANING-TRUE + 1 MIXED |
| Zero-confidence claims | Yes (D5 starvation in outlier) | **None** |

### Key observations
- **Confidence floor raised:** Lowest confidence is 62% (vs 44.2% baseline). No claim got zeroed by D5.
- **B3 (MIXED at 46/62)** is the weakest run — driven by AC_02 at 32/68 (LEANING-FALSE) pulling the article truth down. This is a genuine evidence-driven mixed result, not a starvation artifact.
- **Claim decomposition:** 2-claim and 3-claim runs both produce healthy results. The fairness dimension (AC_03) when present is not pathological.
- **No warnings:** Zero structural_consistency, zero D5 starvation signals.

### EVD-1 assessment (Class E: legal/political)

| Metric | Value | Threshold | Band |
|--------|-------|-----------|------|
| Article truth spread | 25pp (46–71) | ≤20 green / 21–30 amber | **Amber** |
| Article confidence spread | 5pp (62–67) | ≤15 green | **Green** (improved from amber) |
| Verdict direction | 3/4 LEANING-TRUE | — | Stable |
| UNVERIFIED | 0/4 | — | **Eliminated** |

The truth spread remains amber (25pp) — unchanged from baseline, because the spread is evidence-driven, not D5-driven. But the confidence spread improved dramatically from amber (23pp) to green (5pp).

---

## 5. Control Analysis

### Plastik DE (Class C: broad evaluative)

| Metric | Baseline (4 runs, flag off) | Experiment (2 runs, flag on) |
|--------|---------------------------|------------------------------|
| Truth range | 27–36 (9pp) | 25–36 (11pp) |
| Confidence range | 62–82 (20pp) | 65–69 (4pp) |
| Verdict | 3 LEANING-FALSE + 1 MOSTLY-FALSE | 1 MOSTLY-FALSE + 1 LEANING-FALSE |
| UNVERIFIED | 0 | 0 |

**No regression.** Direction and confidence stable. The narrower confidence range (4pp vs 20pp) is notable but may be sample-size effect (N=2).

### Flat Earth (Class A: clean factual)

| Metric | Value |
|--------|-------|
| Truth | 0, 0 (0pp spread) |
| Confidence | 99, 94 (5pp) |
| Verdict | FALSE, FALSE |

**Perfect control.** No regression whatsoever.

---

## 6. Runtime/Cost Analysis

No precise per-run timing available, but:
- All 8 runs completed successfully within normal timeframes (~20–30 min each)
- No budget exhaustion warnings
- No abnormal search counts visible in warnings
- Concurrency-3 batching worked without queue starvation

The feature does not appear to materially increase runtime. Diversity-starved claims trigger additional research iterations, but the cost is bounded by existing `maxResearchIterations` and `researchTimeBudgetMs` limits.

---

## 7. Final Judgment: **Validated**

The experiment achieves its stated purpose:
1. **D5 starvation eliminated:** 0/4 Bolsonaro UNVERIFIED (vs 1/5 baseline)
2. **Confidence stability improved:** Bolsonaro confidence spread 5pp (vs 23pp baseline)
3. **No control regressions:** Plastik DE and Flat Earth both stable
4. **No runtime blow-up:** All runs completed within normal bounds
5. **No warnings generated:** Zero structural_consistency, zero D5 signals

---

## 8. Recommendation: **Promote to optional default**

- Set `diversityAwareSufficiency=true` as the new UCM default
- Keep the flag available for disable if needed
- Update `pipeline.default.json` and `DEFAULT_PIPELINE_CONFIG` to `true`
- Reseed to propagate
- Do NOT remove the flag — it's a clean rollback mechanism

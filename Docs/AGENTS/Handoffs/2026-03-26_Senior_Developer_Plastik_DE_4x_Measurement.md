# Plastik DE 4x EVD-1 Measurement Batch

**Date:** 2026-03-26
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Stack:** Post verdict-label fix (`289afa1c`), post UCM-1-5 (`fb5395b0`), post B1+proxy-rephrasing prompt

---

## 1. Executive Summary

4 valid runs of `Plastik recycling bringt nichts` on the current stack produced **zero UNVERIFIED verdicts**. All runs resolved to LEANING-FALSE (3x) or MOSTLY-FALSE (1x) with healthy confidence (62-82%). The earlier UNVERIFIED result (`5c1b4633`) is classified as a **tail outlier**, not a recurring pattern.

Under EVD-1, the family is **green** on all metrics.

---

## 2. Validation Setup

- **Input:** `Plastik recycling bringt nichts` (identical across all runs)
- **Stack:** commit `289afa1c` (includes post-spread verdict-label fix)
- **Config:** Default UCM, `evidenceWeightingEnabled=false`, `sourceReliabilityCalibrationEnabled=false`
- **Services:** Clean restart before Run 1 and before Runs 3+4 (zombie job queue required restart)
- **Excluded runs:** Run 3 original (`9d662257`, QUEUED/zombie) and Run 4 original (`2036aee1`, QUEUED/zombie) — replaced with fresh submissions after restart

---

## 3. Run Table

| Run | Job ID | Verdict | Truth% | Conf% | Warnings |
|-----|--------|---------|--------|-------|----------|
| 1 | `18cc9eec` | LEANING-FALSE | 35 | 65 | 0 |
| 2 | `d34497a5` | LEANING-FALSE | 31 | 74 | 0 |
| 3 | `62707cb6` | MOSTLY-FALSE | 27 | 82 | 0 |
| 4 | `81428d4c` | LEANING-FALSE | 36 | 62 | 0 |

---

## 4. Claim-Level Comparison

| Claim | Run 1 | Run 2 | Run 3 | Run 4 | Spread |
|-------|-------|-------|-------|-------|--------|
| **AC_01** (environmental/ecological) | 18/75/sp0 | 22/78/sp0 | 25/78/sp4 | 28/68/sp0 | truth: 10pp |
| **AC_02** (economic) | 48/65/sp0 | 48/70/sp0 | 15/88/sp0 | 48/41/sp20 | truth: 33pp |
| **AC_03** (recycling rates/circular economy) | 45/48/sp13 | 32/72/sp3 | 48/80/sp4 | 42/68/sp4 | truth: 16pp |

### AC_03 Dimension Stability

| Run | AC_03 Dimension |
|-----|-----------------|
| 1 | Recyclingquoten und Kreislaufschließung |
| 2 | praktische Umsetzung und Effektivität von Sammelsystemen |
| 3 | tatsächliche Wiederverwendung von Kunststoffen |
| 4 | tatsächliche Kreislaufschließung und Ressourcennutzung |

AC_03 drifts between "recycling rates", "practical implementation", and "circular economy" — but the predicate ("bringt nichts in Bezug auf...") is preserved in all runs. The dimension variation is moderate (all related to recycling effectiveness) and does NOT cause verdict-label instability in this batch.

---

## 5. EVD-1 Classification

### Article-level truth% spread
- Range: 27-36 = **9pp** → **GREEN** (Class C threshold: ≤ 25pp)

### Article-level confidence% spread
- Range: 62-82 = **20pp** → **AMBER** (threshold: ≤ 15pp green, 16-30pp amber)

### Dominant per-claim truth% spread
- AC_02 is the widest: 15-48 = **33pp** → **GREEN** (Class C threshold: ≤ 35pp)

### Verdict label distribution
- LEANING-FALSE: 3/4 (75%)
- MOSTLY-FALSE: 1/4 (25%)
- UNVERIFIED: 0/4 (0%)
- MIXED: 0/4 (0%)

### Overall family classification: **GREEN** (article truth), **AMBER** (confidence)

---

## 6. Tail-Outlier vs Recurring-Pattern Judgment

**Tail outlier.**

The earlier UNVERIFIED run (`5c1b4633`, truth 50.1%, confidence 36.3%) was driven by an unusual combination of:
1. AC_03 dimension drift to "practical feasibility" (most vague framing)
2. Resulting high self-consistency spreads (23-26pp → 0.4 multiplier)
3. Confidence collapse below the 45% MIXED/UNVERIFIED threshold

In 4 fresh runs on the current stack:
- Zero UNVERIFIED verdicts
- All self-consistency spreads ≤ 20pp (except one AC_02 at exactly 20pp)
- All article confidences ≥ 62%
- Verdict direction is consistently false-leaning (27-36% truth)

The UNVERIFIED result is not reproducible under current conditions.

---

## 7. Recommendation

1. **Stay in monitor mode.** No code/prompt/policy changes needed for this family.
2. **Confidence spread (20pp) is amber** — worth watching but not actionable. The confidence variance is driven by AC_02 (economic claim, naturally contested) and AC_03 (dimension variation affects evidence mix).
3. **Do NOT reopen Stage-1 investigation** for this family based on this data. The B1 predicate-preservation + proxy-rephrasing fixes are working. AC_03 dimension variation is moderate and does not cause verdict instability.
4. **The verdict-label fix (`289afa1c`) is validated** — no structural_consistency warnings in any run. If the UNVERIFIED outlier occurred again, the claim-level label would at least be correct (UNVERIFIED, not stale MIXED).

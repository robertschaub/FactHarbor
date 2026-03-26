# Monitoring Batch — 12 Jobs Under EVD-1 Policy

**Date:** 2026-03-25/26
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Stack:** Post-stabilization (QLT-1/2/3 + VAL-2 + OBS-1 complete, EVD-1 approved)
**Runner:** `FH_RUNNER_MAX_CONCURRENCY=3`, Sonnet lane limit `2`

---

## 1. Executive Summary

12-job monitoring batch under the approved EVD-1 variance policy. All jobs completed successfully with zero infrastructure failures. No family hit red or emergency. Controls (Round Earth, Flat Earth) are clean. The monitoring round confirms the post-stabilization posture is holding.

**One notable finding:** Muslims run 1 (`e69bea20`) produced a `contradicts_thesis` claim (AC_03), which QLT-3 was designed to eliminate. This is a single occurrence in 2 runs — not sufficient to escalate, but worth noting as a persistence signal for the amber classification.

| Class | Family | Spread | EVD-1 Band | Prior Band | Trend |
|-------|--------|--------|------------|------------|-------|
| A | Round Earth | 7pp | **Amber** | Amber (6pp) | Stable |
| A | Flat Earth | 0pp | **Green** | Green (2pp) | Stable |
| B | Hydrogen | 12pp | **Green** | Insufficient | New data (provisional) |
| C | Plastik DE | — (1 run) | — | Green (22pp) | Insufficient |
| C | Plastik EN | 7pp | **Green** | Amber (30pp) | Improved |
| D | Muslims | 16pp | **Green** | Amber (21pp) | Improved |
| E | Bolsonaro | 6pp | **Green** | Green (1.2pp) | Wider but still green |

---

## 2. Validation Setup

- 12 jobs submitted in 3 waves of 4 (13s spacing within waves)
- Clean restarted stack on current committed code
- Wave 1: Rund, Hydrogen, Plastik EN, Bolsonaro
- Wave 2: Rund, Flach, Muslims, Plastik DE
- Wave 3: Hydrogen, Plastik EN, Muslims, Bolsonaro
- Zero exclusions — all 12 SUCCEEDED

---

## 3. Run Table

| # | Wave | Job ID | Input | Verdict | Truth% | Conf% | Claims | Dirs | Boundaries | Evidence | Warnings |
|---|------|--------|-------|---------|--------|-------|--------|------|------------|----------|----------|
| 1 | W1 | `5cd239cc` | Ist die Erde rund? | TRUE | 87.8 | 87.8 | 2 | S,S | 4 | 49 | 0 |
| 2 | W1 | `53d01363` | Hydrogen > electricity | MOSTLY-FALSE | 19.5 | 69.7 | 3 | S,S,S | 6 | 74 | 0 |
| 3 | W1 | `3fb186b8` | Plastic recycling is pointless | LEANING-TRUE | 60.6 | 72.2 | 3 | S,S,S | 5 | 132 | 0 |
| 4 | W1 | `5e077ec3` | Bolsonaro proceedings (fair) | LEANING-TRUE | 65.3 | 67.5 | 3 | S,S,S | 5 | 74 | 0 |
| 5 | W2 | `1dbbe517` | Ist die Erde rund? | TRUE | 94.7 | 94.8 | 2 | S,S | 6 | 58 | 0 |
| 6 | W2 | `9ccb3b05` | Ist die Erde flach? | FALSE | 0.0 | 91.6 | 2 | S,S | 5 | 41 | 0 |
| 7 | W2 | `e69bea20` | Muslims > Christians violence | MOSTLY-FALSE | 19.9 | 64.3 | 3 | S,S,**C** | 6 | 95 | 0 |
| 8 | W2 | `8412faed` | Plastik recycling bringt nichts | LEANING-FALSE | 32.6 | 66.8 | 3 | S,S,S | 5 | 134 | structural_consistency |
| 9 | W3 | `c3699714` | Hydrogen > electricity | FALSE | 7.9 | 71.3 | 3 | S,S,S | 5 | 75 | 0 |
| 10 | W3 | `1627d26d` | Plastic recycling is pointless | LEANING-TRUE | 67.1 | 69.1 | 3 | S,S,S | 5 | 155 | 0 |
| 11 | W3 | `332efbff` | Muslims > Christians violence | LEANING-FALSE | 35.6 | 65.9 | 3 | S,S,S | 6 | 86 | verdict_direction_issue |
| 12 | W3 | `4971e0f1` | Bolsonaro proceedings (fair) | LEANING-TRUE | 59.4 | 66.2 | 3 | S,S,S | 6 | 121 | 0 |

---

## 4. Family-by-Family Analysis

### Class A: Round Earth (`Ist die Erde rund?`) — 2 runs

| Run | Truth% | Conf% |
|-----|--------|-------|
| `5cd239cc` | 87.8 | 87.8 |
| `1dbbe517` | 94.7 | 94.8 |

**Article spread:** 7pp. **Confidence spread:** 7pp.
**Verdict direction:** Both TRUE. Stable.
**Stage 1:** Both 2 claims, both `supports_thesis`. Stable.
**EVD-1:** Article 7pp > 5pp (Class A green ceiling) → **Amber**.

This matches the prior Round Earth amber classification (6pp in EVD-1 initial assessment). The 7pp spread is from one run scoring 87.8% and the other 94.7% — both high-confidence TRUE, both correct. The variance is in degree, not direction.

### Class A: Flat Earth (`Ist die Erde flach?`) — 1 run

| Run | Truth% | Conf% |
|-----|--------|-------|
| `9ccb3b05` | 0.0 | 91.6 |

**Single run — no spread to compute.** Verdict: FALSE 0%, conf 91.6%.
**Direction:** Correct. No inversion.
**Stage 1:** 2 claims, both `supports_thesis`. Stable.
**EVD-1:** Consistent with prior green (0–2pp across QLT-2/3 runs). **Green** (confirmed by direction and single-run consistency with prior data).

### Class B: Hydrogen — 2 runs (provisional class)

| Run | Truth% | Conf% |
|-----|--------|-------|
| `53d01363` | 19.5 | 69.7 |
| `c3699714` | 7.9 | 71.3 |

**Article spread:** 12pp. **Confidence spread:** 2pp.
**Verdict direction:** Both FALSE-side (MOSTLY-FALSE / FALSE). Stable.
**Stage 1:** Both 3 claims, all `supports_thesis`. Stable.
**EVD-1:** Article 12pp ≤ 15pp (Class B green ceiling) → **Green**.

**First repeated-run data for Hydrogen.** Prior runs: single run at 37.2% (QLT-1), single run at 17.8% (QLT-3 control). This batch adds 19.5% and 7.9% — all directionally FALSE-side. The combined range across 4 historical runs (7.9–37.2 = 29pp) would be amber, but this batch's 2-run spread (12pp) is green. Class B thresholds remain provisional; this data helps but doesn't yet meet the ≥3 repeated-run requirement.

### Class C: Plastik DE (`Plastik recycling bringt nichts`) — 1 run

| Run | Truth% | Conf% |
|-----|--------|-------|
| `8412faed` | 32.6 | 66.8 |

**Single run — no spread.** Consistent with the QLT-1 range (24–46%). Stage 1: 3 claims, all `supports_thesis`, predicate preserved ("bringt nichts"). One `structural_consistency` warning (info-level, not quality-affecting).

### Class C: Plastik EN (`Plastic recycling is pointless`) — 2 runs

| Run | Truth% | Conf% |
|-----|--------|-------|
| `3fb186b8` | 60.6 | 72.2 |
| `1627d26d` | 67.1 | 69.1 |

**Article spread:** 7pp. **Confidence spread:** 3pp.
**Stage 1:** Both 3 claims, all `supports_thesis`, "pointless" preserved. Stable.
**EVD-1:** Article 7pp ≤ 25pp (Class C green ceiling) → **Green**.

Notable: this is substantially better than the prior QLT-2 Plastik EN spread (30pp amber). However, only 2 runs — the prior 30pp was from 5 runs. The improvement may not persist with more runs. Both runs are in the LEANING-TRUE range (60–67%), which is higher than prior means (~40–50%). Evidence mix may have been favorable in this batch.

### Class D: Muslims — 2 runs

| Run | Truth% | Conf% |
|-----|--------|-------|
| `e69bea20` | 19.9 | 64.3 |
| `332efbff` | 35.6 | 65.9 |

**Article spread:** 16pp. **Confidence spread:** 2pp.
**Verdict direction:** Both FALSE-side (MOSTLY-FALSE / LEANING-FALSE). Stable.
**Stage 1:** Both 3 claims. Run 2 all `supports_thesis`. **Run 1 has one `contradicts_thesis` claim (AC_03).**
**EVD-1:** Article 16pp ≤ 25pp (Class D green ceiling) → **Green**.

**Stage 1 anomaly:** Run 1 (`e69bea20`) AC_03 is `contradicts_thesis` with truth% 78%. This is the same pattern QLT-3 was designed to eliminate — a counter-narrative claim that should not appear as an atomic claim. It appeared in 1 of 2 runs. QLT-3 reduced this from 2/5 runs to 0/5 runs in the QLT-3 validation; this monitoring batch shows 1/2 — a partial recurrence.

**Impact assessment:** The `contradicts_thesis` claim (AC_03, 78%) did NOT cause a direction flip — the article verdict is still MOSTLY-FALSE (19.9%). The counter-narrative claim's high truth% is offset by the two low-truth supporting claims (18%, 22%). The article-level spread (16pp) is within green. This is amber-level Stage 1 behavior but green-level article outcome.

### Class E: Bolsonaro — 2 runs (provisional class)

| Run | Truth% | Conf% |
|-----|--------|-------|
| `5e077ec3` | 65.3 | 67.5 |
| `4971e0f1` | 59.4 | 66.2 |

**Article spread:** 6pp. **Confidence spread:** 1pp.
**Verdict direction:** Both LEANING-TRUE. Stable.
**Stage 1:** Both 3 claims, all `supports_thesis`. Stable.
**EVD-1:** Article 6pp ≤ 20pp (Class E green ceiling) → **Green**.

**Note:** This batch uses a slightly different input formulation ("verdicts were **fair**") vs the prior QLT-1 anchor ("verdicts were **legally sound**"). Both produce LEANING-TRUE in the 59–68% range. The 3-claim decomposition (vs 2 in prior runs) suggests the "fair" formulation triggers `ambiguous_single_claim` classification. Despite the formulation change, article-level stability is strong. Class E thresholds remain provisional.

---

## 5. EVD-1 Classification Summary

| Family | Class | Article Spread | Band | Conf Spread | Band | Direction | Stage 1 Stable | Overall |
|--------|-------|---------------|------|-------------|------|-----------|----------------|---------|
| Round Earth | A | 7pp | **Amber** | 7pp | Green | TRUE ×2 | Yes | **Amber** |
| Flat Earth | A | 0pp (1 run) | **Green** | — | — | FALSE | Yes | **Green** |
| Hydrogen | B (prov) | 12pp | **Green** | 2pp | Green | FALSE-side ×2 | Yes | **Green** |
| Plastik DE | C | — (1 run) | — | — | — | FALSE-side | Yes | — |
| Plastik EN | C | 7pp | **Green** | 3pp | Green | TRUE-side ×2 | Yes | **Green** |
| Muslims | D | 16pp | **Green** | 2pp | Green | FALSE-side ×2 | **Partial** (1/2 has C) | **Green** (article) |
| Bolsonaro | E (prov) | 6pp | **Green** | 1pp | Green | TRUE-side ×2 | Yes | **Green** |

**No family is red. No emergency.**

---

## 6. Comparison vs Prior Baselines

| Family | Prior Best Spread | This Batch Spread | Trend | Notes |
|--------|------------------|-------------------|-------|-------|
| Round Earth | 6pp (EVD-1 initial) | 7pp | **Stable** | Consistent amber |
| Flat Earth | 2pp (QLT-2/3) | 0pp (1 run) | **Stable** | Clean control |
| Hydrogen | N/A (single runs) | 12pp (first pair) | **New data** | Green; directionally stable |
| Plastik DE | 22pp (QLT-1, 5 runs) | 32.6% (1 run, within range) | **Consistent** | Single run in QLT-1 range |
| Plastik EN | 30pp (QLT-2, 5 runs) | 7pp (2 runs) | **Improved** | May not persist; favorable evidence batch |
| Muslims | 21pp (QLT-3, 5 runs) | 16pp (2 runs) | **Improved** | But 1 run has contradicts_thesis recurrence |
| Bolsonaro | 1.2pp (QLT-1, 2 runs) | 6pp (2 runs, different formulation) | **Slightly wider** | Different input text ("fair" vs "legally sound") |

---

## 7. Open Issues / Anomalies

| Issue | Severity | Detail | Action |
|-------|----------|--------|--------|
| **Muslims `contradicts_thesis` recurrence** | Amber (Stage 1) | Run `e69bea20` AC_03 is `contradicts_thesis` (78% truth). QLT-3 was designed to eliminate this. 1 of 2 runs affected. | Monitor. If this persists in 2+ future batches → escalate to QLT-3 review. Per EVD-1 amber oscillation rule: if next batch is clean → persistent amber, not resolved. |
| **Plastik EN higher truth% than historical** | Info | Both runs at 60–67% vs prior mean ~40–50%. May indicate favorable evidence batch or gradual truth% drift upward. | Monitor. Not a threshold breach — just a shift in central tendency. |
| **Round Earth 7pp** | Amber | Consistent with prior. Both runs correct (TRUE). | No action. Documented amber per EVD-1. |
| **Bolsonaro input variant** | Info | This batch used "fair" instead of "legally sound". 3 claims instead of 2. Comparison is approximate. | Note for future batches: use identical formulation for strict comparison. |

---

## 8. Judgment

**No action needed. Monitor amber families.**

- Zero red or emergency results
- All verdict directions are correct on controls
- All families are within EVD-1 green or amber bands
- One Stage 1 `contradicts_thesis` recurrence on Muslims (1/2 runs) — amber-level concern but green article outcome
- Infrastructure is clean (zero `analysis_generation_failed`, zero `llm_provider_error`)

**Recommendation:** Continue monitoring under EVD-1. Next monitoring batch should use strictly identical inputs for Bolsonaro (use "legally sound" formulation for comparability). Watch Muslims `contradicts_thesis` recurrence — if 2+ of next 5 runs show it, escalate to QLT-3 review.

---

*12 jobs, 3 waves, zero exclusions. All on post-stabilization stack with EVD-1 approved.*

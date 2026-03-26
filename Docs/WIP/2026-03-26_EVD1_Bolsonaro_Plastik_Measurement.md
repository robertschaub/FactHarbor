# EVD-1 Measurement: Bolsonaro + Plastik DE (2026-03-26)

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** Measurement complete — EVD-1 assessment included
**Trigger:** Gate 1 rescue debate recommended 5-run characterization before any further action

---

## 1. Executive Summary

3 new Bolsonaro runs + 3 new Plastik DE runs submitted on current code. Combined with the 2 prior Bolsonaro jobs from the debate investigation, this gives 5 Bolsonaro and 3 Plastik DE data points.

**Results:**

| Family | Runs | TP Range | Spread | EVD-1 Class | Band | Verdict direction | UNVERIFIED count |
|--------|------|----------|--------|-------------|------|-------------------|-----------------|
| **Bolsonaro** | 5 | 47.5–72.6 | **25pp** | E (legal/political) | **Amber** (21-30pp) | 4 LEANING-TRUE + 1 UNVERIFIED | 1/5 |
| **Plastik DE** | 3 | 28.8–43.0 | **14pp** | C (broad evaluative) | **Green** (≤25pp) | 2 LEANING-FALSE + 1 MOSTLY-FALSE | 0/3 |

**Bolsonaro UNVERIFIED did NOT recur.** All 3 new runs produced LEANING-TRUE (62.8, 63.6, 64.4). The prior UNVERIFIED (`74d40863`, TP=47.5) is a single-tail outlier. No implementation action justified.

**Plastik DE is remarkably stable in this batch.** 14pp spread, all confident (72-77), zero UNVERIFIED. This is well within EVD-1 green for Class C.

---

## 2. Bolsonaro — Full 5-Run Table

| # | Job | Verdict | TP | Conf | Claims | G1 filtered | Balance | SC stable |
|---|-----|---------|-----|------|--------|------------|---------|-----------|
| 1 | `74d40863` | **UNVERIFIED** | 47.5 | 44.2 | 3 | 0 | 0.38 | 0/3 |
| 2 | `92f2ada7` | MOSTLY-TRUE | 72.6 | 65.2 | 2 | **1** | 0.76 | 2/2 |
| 3 | `a3c3e181` | LEANING-TRUE | 62.8 | 55.9 | 2 | 0 | 0.59 | 0/2 |
| 4 | `3b07a079` | LEANING-TRUE | 63.6 | 66.6 | 2 | 0 | 0.53 | 2/2 |
| 5 | `465cd4ac` | LEANING-TRUE | 64.4 | 67.3 | 3 | 0 | 0.56 | 2/3 |

**Spread: 25.1pp** (47.5–72.6). Without the UNVERIFIED outlier: **9.8pp** (62.8–72.6).

### EVD-1 Assessment (Class E: legal/political)

| Metric | Value | Threshold | Band |
|--------|-------|-----------|------|
| Article truth spread | 25pp | ≤20 green / 21-30 amber / >30 red | **Amber** |
| Article confidence spread | 23pp | ≤15 green / 16-30 amber / >30 red | **Amber** |
| Verdict direction stability | 4/5 same direction | ≥4/5 required | **Pass** |
| UNVERIFIED recurrence | 1/5 | — | Single outlier |

**Bolsonaro is amber under EVD-1.** The UNVERIFIED outlier inflates the spread. Without it, the family is green (9.8pp). This is consistent with the debate conclusion: the UNVERIFIED was a single-tail outlier driven by evidence variation, not by Gate 1 behavior.

### Claim decomposition observations

- Runs 1, 5: 3 claims (including "fairness" as AC_03)
- Runs 2, 3, 4: 2 claims (fairness dimension not extracted or filtered)
- Run 2: Gate 1 explicitly filtered AC_03 (filteredCount=1)
- Runs 3, 4: Only 2 claims extracted by Pass 2 — Gate 1 didn't need to filter
- Run 5: 3 claims including fairness, but still LEANING-TRUE (64.4/67.3) — fairness claim did NOT cause UNVERIFIED

**Key finding:** Run 5 proves that 3 claims including the fairness dimension can produce a good outcome (LEANING-TRUE 64.4, confidence 67.3). The UNVERIFIED in Run 1 was not caused by the fairness claim existing — it was caused by unfavorable evidence balance (0.38).

---

## 3. Plastik DE — 3-Run Table

| # | Job | Verdict | TP | Conf | Claims | Facets | Balance | SC stable |
|---|-----|---------|-----|------|--------|--------|---------|-----------|
| 1 | `8fbc2217` | LEANING-FALSE | 34.5 | 76.6 | 3 | recycling rates / environmental / economic | 0.27 | 3/3 |
| 2 | `b7266f91` | MOSTLY-FALSE | 28.8 | 72.5 | 3 | environmental / economic / practical | 0.28 | 2/3 |
| 3 | `3e19a0e7` | LEANING-FALSE | 43.0 | 73.2 | 3 | ecological / economic / effectiveness | 0.43 | 3/3 |

**Spread: 14.2pp** (28.8–43.0). **Confidence range: 4.1pp** (72.5–76.6).

### EVD-1 Assessment (Class C: broad evaluative)

| Metric | Value | Threshold | Band |
|--------|-------|-----------|------|
| Article truth spread | 14pp | ≤25 green / 26-35 amber / >35 red | **Green** |
| Article confidence spread | 4pp | ≤15 green / 16-30 amber / >30 red | **Green** |
| Verdict direction stability | 3/3 same direction | ≥4/5 required | **Pass** (insufficient N but directionally clean) |
| UNVERIFIED recurrence | 0/3 | — | None |

**Plastik DE is green under EVD-1.** This is a substantial improvement from the prior UNVERIFIED incident (`5c1b4633`, TP=50.1, conf=36.3). All 3 runs produced confident verdicts (72-77) in the FALSE-side direction. The 14pp truth spread is well within the 25pp acceptable band.

### Facet stability

All 3 runs extracted 3 claims. Facets vary slightly but stay within the canonical set:
- **Environmental/ecological**: present in all 3 (stable)
- **Economic**: present in all 3 (stable)
- **Third facet varies**: recycling rates / practical feasibility / effectiveness (mild drift)

This mirrors the runtime-path investigation finding: facet convergence rules constrain the space but don't pin the third dimension. The confidence remains high regardless (72-77), so the dimension drift does not cause confidence collapse in this batch.

### Why no UNVERIFIED this time?

Comparing to the prior UNVERIFIED run (`5c1b4633`):

| Metric | `5c1b4633` (UNVERIFIED) | This batch (3 runs) |
|--------|------------------------|---------------------|
| Self-consistency spreads | 14-26 | 0-16 |
| Confidence | 28-48 | 52-80 |
| Spread multiplier | **0.4** (2 claims >20pp) | **0.7-1.0** (all ≤16pp) |

The difference: this batch's self-consistency samples are more convergent. No claim crossed the 20pp "highly unstable" threshold that triggers the 0.4 multiplier. This is evidence variation — different evidence mixes produce different self-consistency convergence. The 0.4 cliff was not triggered.

---

## 4. Combined Assessment

| Family | EVD-1 Status | Action |
|--------|-------------|--------|
| Bolsonaro | **Amber** (25pp, single UNVERIFIED outlier) | Monitor. No implementation. Re-measure next round. |
| Plastik DE | **Green** (14pp, zero UNVERIFIED) | No action. Record baseline. |

### Decisions confirmed by this measurement

1. **Gate 1 refinement correctly declined.** Run 5 (`465cd4ac`) produced LEANING-TRUE 64.4 with 3 claims including the fairness dimension. The rescue is not causing UNVERIFIED.

2. **Structural_consistency bug fix was the right immediate action.** The prior UNVERIFIED had AC_03 labeled MIXED at 52%/28% (should be UNVERIFIED). The bug fix (`289afa1c`) ensures labels match truth-scale rules. This was the correct narrow fix.

3. **Plastik DE facet drift is real but not currently harmful.** Third-dimension drift occurs but confidence stays high. The runtime-path investigation's judgment ("downstream characterization justified") is confirmed.

4. **The spread multiplier cliff (0.7→0.4 at 20pp) remains the amplification mechanism** but is not currently causing recurring UNVERIFIED outcomes. It only triggers on high-spread runs, which are a minority.

---

## 5. Next Actions

| Action | Priority | Status |
|--------|----------|--------|
| Ship observability fixes (inputClassification + contractValidation storage) | Medium | Not yet implemented |
| Monitor Bolsonaro in next validation round | Low | Amber — re-measure if convenient |
| No further Stage-1 or Gate-1 changes | — | Confirmed by this measurement |
| Plastik DE: baseline recorded, no action | — | Green |

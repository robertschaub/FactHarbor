# Bolsonaro `1abb0ea5` Deep Analysis — Agent Debate

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** REVIEW-READY
**Job:** `1abb0ea52a6c404baadaba360b0370de` (MIXED 54/58)
**Input:** "The court proceedings against Jair Bolsonaro for attempted coup d'etat complied with Brazilian procedural law and constitutional requirements, and the resulting verdicts were fair."

---

## 1. Executive Summary

Job `1abb0ea5` is not a crash or a verdict-direction failure — it's a **degraded report** where AC_01 (procedural compliance) was starved of evidence and forced to UNVERIFIED, dragging the article result from a likely LEANING-TRUE (~62-65) down to MIXED (54/58).

This is a **different failure mode** from the prior Bolsonaro UNVERIFIED (`74d40863`, where all 3 claims had evidence but high spread). Here, one claim was well-assessed (AC_02: MIXED 54/58, perfect self-consistency) while the other was completely starved (AC_01: 11 items, 1 source type, 2 domains → UNVERIFIED 50/0).

Across 18 runs of this input, the system produces LEANING-TRUE 78% of the time (14/18). The remaining 22% includes 2 MIXED, 1 UNVERIFIED, 1 MOSTLY-TRUE — all driven by evidence variation, not by systematic analytical failures.

---

## 2. What This Job Proves

### The good

| Signal | Value | Assessment |
|--------|-------|-----------|
| AC_02 self-consistency | 58/58/58, spread=0 | **Perfect** — best possible stability |
| AC_02 verdict debate | 9 challenge points evaluated, 4 accepted, 3 rejected, 2 partial | **Thorough** — the debate was substantive |
| Gate 1 behavior | AC_02 rescued via thesis-direct (evaluative "fair" claim) | **Correct** — per the approved debate decision |
| Evidence volume | 77 items from 28 sources | **Adequate** — not an evidence-scarcity run |
| Applicability filter | 3 foreign-jurisdiction items removed (80→77) | **Working** |

### The bad

| Signal | Value | Assessment |
|--------|-------|-----------|
| AC_01 evidence | 11 items, **1 source type**, 2 domains | **Starved** — below sufficiency threshold |
| AC_01 verdict | 50/0 UNVERIFIED | **Not assessed** — pipeline correctly refused to verdict |
| Evidence balance | 0.37 (15 supporting, 26 contradicting) | **Contradiction-heavy** — worst in the 18-run set |
| Source fetch failures | 6 warnings, several 403 errors (ft.com, nycbar.org, tandfonline.com) | **Degraded** — paywalled sources unavailable |
| Query budget | Exhausted (AC_01: 6/8, AC_02: 6/8) | **Premature stop** — both claims hit budget ceiling |
| Boundary concentration | CB_17 at 88.3% (68/77) | **Mega-cluster** — one boundary dominates |
| Coverage matrix | AC_01 has evidence in only 1 boundary (CB_17) | **Sparse mapping** |
| Contradiction iterations | Warning says 0 | **Budget starved contradiction** |

### The root mechanism

AC_01 ("procedural compliance") is a broad claim spanning both procedural law and constitutional requirements. The evidence extraction mapped most items to AC_02 ("fairness") or to neutral/general categories. AC_01 ended up with 11 items from only 1 source type (news_secondary) and 2 domains — triggering the sufficiency gate.

This is **not a Gate 1 problem** (Gate 1 passed both claims), **not a Stage 1 decomposition problem** (2 claims is within the normal range), and **not a verdict-stage problem** (AC_02's verdict was well-calibrated).

It's a **Stage 2 evidence-to-claim mapping concentration problem**: enough evidence was found (77 items) but it was disproportionately mapped to AC_02, starving AC_01.

---

## 3. Advocate Case: Implement a Fix

### The evidence-mapping imbalance is fixable

AC_01 asks about "procedural compliance" — a factual question about whether court procedures followed the law. The evidence pool contains items about court procedures, prosecution proceedings, defense arguments, and constitutional analysis. Many of these should be relevant to AC_01 but were mapped only to AC_02 ("fairness").

**Proposal A — Research-budget balancing:** When one claim reaches sufficiency and another doesn't, redirect remaining query budget toward the under-evidenced claim. Currently the budget is per-claim but research iterations target claims round-robin. A "sufficiency-aware" targeting would prioritize the starved claim.

**Proposal B — Evidence re-mapping pass:** After all evidence is collected, run a lightweight LLM check: "Is this evidence item also relevant to [other claim]?" This would catch items that were mapped to AC_02 but are genuinely relevant to both claims.

**Proposal C — Source type diversity enforcement:** The sufficiency gate requires min 2 source types. AC_01 had 11 items all from `news_secondary`. If the research stage tracked source-type diversity per claim, it could generate queries targeting different source types (legal documents, government reports) when a claim is mono-typed.

### Why act now

- 4/18 runs (22%) produce degraded results (MIXED or worse)
- The pattern is consistent: evidence-balance variation is the dominant remaining driver
- The sufficiency gate is correctly catching the problem but can't fix it retroactively

### Counter to "this is just variance"

The EVD-1 policy says Bolsonaro (Class E) has acceptable spread ≤20pp. The 18-run spread is **29pp** (43-72). This is in the **amber-to-red** zone (21-30pp amber, >30pp red). While the prior 5-run measurement showed 25pp (amber), the full 18-run view is worse.

---

## 4. Challenger Case: Do Not Implement Now

### The system is working correctly within its design

- AC_01 was correctly identified as under-evidenced
- The sufficiency gate correctly forced UNVERIFIED rather than producing an unreliable verdict
- AC_02 was thoroughly assessed with a high-quality verdict debate
- The article result (MIXED 54/58) is honest about the uncertainty

**Suppressing UNVERIFIED would be worse than allowing it.** If we force-verdict AC_01 with insufficient evidence, the report becomes misleading.

### The 18-run statistics favor "acceptable variance"

| Verdict | Count | % |
|---------|-------|---|
| LEANING-TRUE | 14 | 78% |
| MIXED | 2 | 11% |
| MOSTLY-TRUE | 1 | 5.5% |
| UNVERIFIED | 1 | 5.5% |

78% of runs produce the modal verdict (LEANING-TRUE). The mean TP is 61.6. The "weak" runs (MIXED 43, MIXED 54, UNVERIFIED 47) are tail events driven by evidence balance (all three have balance ratio ≤0.56).

### Evidence-mapping fixes are Stage 2 redesign, not narrow fixes

- Proposal A (budget balancing) requires changing the research iteration targeting logic — a structural Stage 2 change
- Proposal B (re-mapping pass) adds an LLM call post-research — additional cost and complexity
- Proposal C (source type diversity) requires per-claim source-type tracking in the research loop — another structural change

All three are **optimization-level work**, not bug fixes. They would improve the system but carry implementation risk and cost.

### The source fetch failures are the proximate cause

6 fetch warnings, several 403 errors from paywalled sources (ft.com, nycbar.org, tandfonline.com). These are **real-world constraints** that no code change can fix. Different runs encounter different 403 patterns based on timing, rate limits, and IP reputation.

### The EVD-1 policy was designed for this

The 29pp spread across 18 runs exceeds the 20pp green threshold but falls within 21-30pp amber. The EVD-1 policy says amber = "monitor, do not investigate immediately." Escalate to red only if the pattern persists across 2+ validation rounds.

---

## 5. Reconciled Analysis

### What the data proves

1. **This run's weakness is AC_01 evidence starvation**, not verdict-stage or Gate 1 behavior.
2. **The starvation has two contributing factors**: (a) evidence-to-claim mapping concentrated on AC_02, (b) source fetch failures reduced the total pool.
3. **The article MIXED 54/58 is an honest result** — the system correctly identified uncertainty on procedural compliance.
4. **78% of runs produce the modal LEANING-TRUE verdict.** The degraded runs are tail events.

### What the advocate gets right

The evidence-mapping imbalance is a real structural pattern. Across multiple runs, when both a factual claim and an evaluative claim coexist, the evaluative claim attracts more evidence because "fairness" is discussed in more diverse contexts than "procedural compliance." This is not random — it's a systematic bias in how the evidence extraction stage maps items to claims.

### What the challenger gets right

The proposals are all Stage 2 structural changes, not narrow fixes. They carry implementation risk and cost. The system is correctly detecting and reporting the uncertainty. And the EVD-1 policy was designed precisely to avoid reacting to amber-level variance.

### The key distinction

This is not a **quality defect** (the system produced a wrong or misleading result) — it's a **quality ceiling** (the system correctly assessed what it could and honestly reported what it couldn't). The article narrative headline is accurate: "mixed evidence of fairness, with substantial documentation but significant procedural and impartiality concerns."

The question is whether we want to raise the quality ceiling (invest in better evidence distribution) or accept the current ceiling as adequate for Alpha.

---

## 6. Recommended Next Step

### Immediate: No code change

The system is in EVD-1 monitor mode. This run falls within amber. The EVD-1 policy does not trigger implementation work for amber results.

### Record this run as a data point

Add `1abb0ea5` to the Bolsonaro family tracking. The 18-run profile is now:
- Modal verdict: LEANING-TRUE (78%)
- TP range: 43-72 (29pp) — amber under Class E
- Confidence range: 24-69 (45pp) — amber
- Degraded runs: 4/18 (22%) with TP ≤54

### If the Captain decides to invest in quality ceiling improvement

The highest-leverage single intervention would be **Proposal A (sufficiency-aware research targeting)**: when one claim reaches sufficiency and another hasn't, redirect remaining query budget toward the under-evidenced claim. This is:
- The most narrowly scoped of the three proposals
- Deterministic (no new LLM calls)
- Operates within the existing budget (doesn't increase cost)
- Directly addresses the proximate cause (AC_01 starvation)

But this is a Captain decision, not an automatic trigger.

---

## 7. Final Judgment

**`No change justified under current EVD-1 policy`**

The run is amber, not red. The system correctly identified and reported uncertainty. The modal verdict (LEANING-TRUE, 78%) is stable and plausible.

If the Captain wants to improve the quality ceiling for legal/political inputs, the recommended investigation target is **sufficiency-aware research targeting** (Proposal A) — but this is optimization-level work requiring explicit approval, not a bug fix or stabilization action.

---

## Appendix: Full 18-Run Bolsonaro Comparison

| # | Job | Date | Verdict | TP | Conf | Claims | G1Filt | Ev | Balance | Notes |
|---|-----|------|---------|-----|------|--------|--------|-----|---------|-------|
| 1 | `1abb0ea5` | 03-26 15:49 | **MIXED** | **54** | **58** | 2 | 0 | 77 | **0.37** | AC_01 UNVERIFIED (insufficient ev) |
| 2 | `465cd4ac` | 03-26 13:23 | LEANING-TRUE | 64 | 67 | 3 | 0 | 111 | 0.56 | |
| 3 | `3b07a079` | 03-26 13:23 | LEANING-TRUE | 63 | 66 | 2 | 0 | 87 | 0.53 | |
| 4 | `a3c3e181` | 03-26 13:23 | LEANING-TRUE | 62 | 55 | 2 | 0 | 121 | 0.59 | |
| 5 | `74d40863` | 03-26 12:30 | **UNVERIFIED** | **47** | **44** | 3 | 0 | 91 | **0.38** | All 3 unstable |
| 6 | `92f2ada7` | 03-26 10:20 | MOSTLY-TRUE | 72 | 65 | 2* | 1 | 61 | 0.76 | *AC_03 filtered |
| 7 | `27708309` | 03-25 22:51 | LEANING-TRUE | 60 | 24 | 3 | 0 | 94 | 0.60 | verdict_integrity_failure |
| 8 | `289049e4` | 03-25 22:50 | LEANING-TRUE | 66 | 65 | 3 | 0 | 83 | 0.65 | |
| 9 | `0373c002` | 03-25 22:50 | LEANING-TRUE | 62 | 59 | 3 | 0 | 72 | 0.47 | |
| 10 | `4971e0f1` | 03-25 20:49 | LEANING-TRUE | 59 | 66 | 3 | 0 | 121 | 0.59 | |
| 11 | `5e077ec3` | 03-25 20:47 | LEANING-TRUE | 65 | 67 | 3 | 0 | 74 | 0.71 | |
| 12 | `4e403fd0` | 03-24 23:56 | LEANING-TRUE | 66 | 66 | 2* | 1 | 86 | 0.59 | *AC_03 filtered |
| 13 | `750a99bf` | 03-24 23:16 | LEANING-TRUE | 67 | 61 | 2 | 0 | 90 | 0.76 | |
| 14 | `b5cddca2` | 03-24 12:32 | **MIXED** | **43** | **56** | 2* | 1 | 68 | 0.56 | *AC_03 filtered |
| 15 | `2b4cd8d7` | 03-24 12:09 | LEANING-TRUE | 62 | 65 | 2* | 1 | 77 | 0.69 | **ANCHOR** |
| 16 | `84b08b16` | 03-24 07:16 | LEANING-TRUE | 66 | 69 | 2* | 1 | 77 | 0.60 | |
| 17 | `0272e437` | 03-24 06:43 | LEANING-TRUE | 61 | 63 | 3 | 0 | 95 | 0.73 | |
| 18 | `e254865e` | 03-23 11:30 | LEANING-TRUE | 69 | 24 | 3 | 0 | 78 | 0.78 | verdict_integrity_failure |

**Pattern:** Degraded runs (TP ≤54) correlate with low evidence balance ratio (≤0.56). LEANING-TRUE runs average balance ratio 0.63.

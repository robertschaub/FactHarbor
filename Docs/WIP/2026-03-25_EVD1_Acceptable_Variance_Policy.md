# EVD-1: Acceptable Report-Quality Variance Policy

**Date:** 2026-03-25
**Role:** Lead Architect
**Status:** DRAFT — requires Captain review and approval

---

## 1. Executive Summary

With the stabilization wave complete (QLT-1/2/3, VAL-2, OBS-1), FactHarbor's remaining report-quality variance is primarily evidence-driven — different web search results produce different evidence mixes, which produce different verdicts. This variance cannot be eliminated without fundamentally constraining the live-web evidence model.

This document defines when residual variance is acceptable, when it should trigger investigation, and when it should trigger implementation work. The goal is to give future agents and the Captain a reusable decision framework so each new validation round does not reopen the same debate.

---

## 2. Why This Policy Is Needed Now

Before the stabilization wave, variance had identifiable fixable causes:
- Predicate softening (QLT-1 fix: 47pp → 22pp)
- Claim count/direction instability (QLT-3 fix: 27pp → 21pp)
- claimDirection mislabeling (prompt fix: FALSE→TRUE inversion eliminated)

After the stabilization wave, the remaining variance is structurally different:
- Stage 1 is stable (claim count, facets, direction, predicate all converge)
- The same claims, searched at different times, return different web sources
- Different evidence mixes produce different per-claim verdicts
- This is inherent to live-web fact-checking, not a defect

Without a policy, any new validation run that shows 20-30pp spread will trigger the question "is this a bug?" — and without agreed thresholds, the answer requires a full investigation every time.

---

## 3. Input Quality Classes

Based on empirical data from QLT-1/2/3 validation runs:

| Class | Description | Examples | Expected behavior |
|-------|-------------|----------|-------------------|
| **A: Clean factual** | Unambiguous factual claims with strong scientific/empirical consensus | "Ist die Erde rund?", "Ist die Erde flach?" | Stable verdict direction, minimal spread |
| **B: Comparative factual** | Factual claims comparing measurable quantities | "Hydrogen is more efficient than electricity" | Stable direction, moderate per-claim spread |
| **C: Broad evaluative** | Evaluative claims with inherently mixed evidence | "Plastik recycling bringt nichts", "Plastic recycling is pointless" | Stable Stage 1, significant evidence-driven spread |
| **D: Contested comparative** | Comparative claims involving social/political groups with mixed data | "Muslims are more violent than Christians" | Stable direction after QLT-3, significant per-claim spread |
| **E: Legal/political** | Claims about legal proceedings, fairness, constitutional compliance | Bolsonaro proceedings | Moderate variance, input-variant sensitivity |

---

## 4. Proposed Acceptable-Variance Bands

### 4a. Article-level truth% spread

| Class | Acceptable (green) | Monitor (amber) | Investigate (red) |
|-------|-------------------|-----------------|-------------------|
| **A: Clean factual** | ≤ 5pp | 6–15pp | > 15pp |
| **B: Comparative factual** | ≤ 15pp | 16–25pp | > 25pp |
| **C: Broad evaluative** | ≤ 25pp | 26–35pp | > 35pp |
| **D: Contested comparative** | ≤ 25pp | 26–35pp | > 35pp |
| **E: Legal/political** | ≤ 20pp | 21–30pp | > 30pp |

**Grounding:**
- Class A: Flat Earth shows 2pp (QLT-2/3). 5pp is generous.
- Class B: Bolsonaro shows 1.2pp; Hydrogen is a single run. 15pp allows margin.
- Class C: Plastik DE shows 22pp (QLT-1), Plastik EN shows 16–30pp (QLT-1/QLT-2). The 25pp acceptable band is set between the best (16pp) and worst (30pp) observed data. 30pp is not acceptable — it's amber.
- Class D: Muslims shows 21pp (QLT-3). 25pp allows margin for evidence variation.
- Class E: Bolsonaro is stable at 1.2pp but historical data (22pp downward drift) suggests more variance is possible with different formulations.

### 4b. Dominant per-claim truth% spread

| Class | Acceptable | Monitor | Investigate |
|-------|-----------|---------|-------------|
| **A: Clean factual** | ≤ 10pp | 11–20pp | > 20pp |
| **B: Comparative factual** | ≤ 25pp | 26–40pp | > 40pp |
| **C: Broad evaluative** | ≤ 35pp | 36–50pp | > 50pp |
| **D: Contested comparative** | ≤ 35pp | 36–50pp | > 50pp |
| **E: Legal/political** | ≤ 25pp | 26–40pp | > 40pp |

**Grounding:**
- Plastik EN environmental claim shows 47pp (QLT-2) — this is amber, not green. The 35pp acceptable threshold reflects that per-claim variance is structurally higher than article-level (aggregation dampens claim-level noise).
- Muslims terrorism facet shows 37pp (QLT-3) — amber.
- Plastik DE economic claim shows 24pp (QLT-1) — green.

### 4c. Article-level confidence% spread

| All classes | Acceptable | Monitor | Investigate |
|-------------|-----------|---------|-------------|
| All | ≤ 15pp | 16–25pp | > 25pp |

**Grounding:** Confidence is structurally more stable than truth (aggregation compresses it). Plastik DE shows 9pp, Muslims shows 7pp, Plastik EN shows 5pp (QLT-1) but 26pp (QLT-2). The 15pp threshold is set to flag the QLT-2-level confidence spread as amber.

### 4d. Verdict direction stability

| Requirement | Threshold |
|-------------|-----------|
| Verdict direction must not flip | Same verdict direction (TRUE-side vs FALSE-side vs MIXED) in ≥ 4 of 5 runs |
| MIXED ↔ LEANING is acceptable variation | These are adjacent bands |
| TRUE ↔ FALSE is never acceptable | Always investigate |

---

## 5. Escalation Rules

### Green (acceptable): No action needed
- Spread is within the acceptable band for the input class
- Stage 1 is stable (claim count, facets, direction consistent)
- No infrastructure failures
- Verdict direction does not flip
- **Action:** Record in validation log. No investigation.

### Amber (monitor): Flag but do not investigate immediately
- Spread exceeds acceptable but stays within monitor band
- OR: a single per-claim outlier exceeds the per-claim threshold
- OR: confidence spread exceeds 15pp
- **Action:** Note in validation report. Re-run if convenient. Escalate to red if the pattern persists across 2+ validation rounds.

### Red (investigate): Investigate before approving new work
- Spread exceeds the monitor band
- OR: verdict direction flips between runs
- OR: Stage 1 instability detected (claim count, direction, facets vary)
- OR: infrastructure failures mask analytical quality
- **Action:** Run a focused 5× comparison. Classify the root cause (Stage 1 / Stage 2 / Stage 4 / infrastructure). Only propose implementation work if the root cause is actionable and the fix is justified.

### Emergency: Immediate action required
- A clean factual control (Class A) produces a wrong verdict direction
- Example: "Ist die Erde flach?" → TRUE
- **Action:** Stop. Diagnose. Fix before any other work proceeds.

---

## 6. How to Use This Policy in Future Validation Rounds

**Step 1: Classify each input**
Assign each validation input to a quality class (A–E).

**Step 2: Run and measure**
For each input with ≥3 runs, compute:
- Article truth% spread
- Article confidence% spread
- Dominant per-claim truth% spread
- Verdict direction stability

**Step 3: Apply the bands**
Compare each metric against the class-appropriate threshold. Record the result as green/amber/red.

**Step 4: Decide**
- All green → validation passes. No further work needed.
- Any amber → note it. Re-run next validation round. No immediate action.
- Any red → investigate. Follow the escalation protocol.
- Any emergency → stop and fix.

**Step 5: Do not conflate**
- Evidence-driven variance (different web sources → different verdicts) is NOT an analytical defect.
- Topic contestability (genuinely mixed evidence on a genuinely contested topic) is NOT instability.
- UX/trust concerns (users seeing different results on repeat queries) are real but separate from analytical correctness.

---

## 7. Current Family Status Under This Policy

| Family | Class | Article Spread | Band | Per-Claim Spread | Band | Direction Stable | Overall |
|--------|-------|---------------|------|-----------------|------|-----------------|---------|
| Flat Earth | A | 2pp | **Green** | N/A | — | Yes | **Green** |
| Round Earth | A | 6pp | **Amber** | N/A | — | Yes | **Amber** (only 2 runs) |
| Hydrogen | B | N/A (1 run) | — | N/A | — | Yes | **Insufficient data** |
| Bolsonaro | E | 1.2pp | **Green** | 5pp | **Green** | Yes | **Green** |
| Plastik DE | C | 22pp | **Green** | 24pp (econ) | **Green** | Yes | **Green** |
| Plastik EN | C | 30pp (QLT-2) | **Amber** | 47pp (env) | **Amber** | Yes | **Amber** |
| Muslims | D | 21pp | **Green** | 37pp (terrorism) | **Amber** | Yes | **Amber** |

**Summary:** No family is red. Plastik EN and Muslims have amber per-claim spreads (environmental and terrorism facets respectively). These are evidence-driven and do not currently warrant implementation work — but should be monitored in the next validation round.

---

## 8. Open Questions for Captain

| Question | Options | Recommendation |
|----------|---------|----------------|
| **Are the proposed bands correct?** | Accept / adjust specific thresholds | Accept as-is for Alpha; revisit before Beta based on more data |
| **Should Plastik EN amber trigger work?** | Investigate Stage 2 evidence diversity / Accept as inherent | Accept for now — the environmental claim is genuinely contested |
| **Should Muslims amber trigger work?** | Investigate terrorism facet evidence / Accept | Accept for now — terrorism comparisons inherently produce mixed evidence |
| **How many runs are needed per family?** | 3 minimum / 5 recommended | 5 for broad evaluative (C/D), 3 for others |
| **Should variance be exposed to users?** | Show confidence interval / Show single result / Show range | Out of scope for this policy — UX decision |

---

## 9. Recommendation

**Approve this policy as the Alpha-phase quality governance framework.** It:
- Grounds thresholds in empirical data from 40+ validation runs across 7 input families
- Separates analytical defects from evidence-driven variance from topic contestability
- Gives future agents a reusable decision framework (classify → measure → compare → decide)
- Does not require code changes
- Can be refined as more validation data accumulates

**This policy does not claim the system is "stable enough."** It claims the system now has a framework for answering that question consistently.

---

*Based on quantitative data from QLT-1 (14 jobs), QLT-2 (13 jobs), QLT-3 (10 jobs), and earlier validation rounds.*

# EVD-1: Acceptable Report-Quality Variance Policy

**Date:** 2026-03-25
**Role:** Lead Architect
**Status:** APPROVED — operative Alpha-phase quality governance policy (Captain-approved 2026-03-25)

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
| **B: Comparative factual** *(provisional)* | Factual claims comparing measurable quantities | "Hydrogen is more efficient than electricity" | Stable direction, moderate per-claim spread |
| **C: Broad evaluative** | Evaluative claims with inherently mixed evidence | "Plastik recycling bringt nichts", "Plastic recycling is pointless" | Stable Stage 1, significant evidence-driven spread |
| **D: Contested comparative** | Comparative claims involving social/political groups with mixed data | "Muslims are more violent than Christians" | Stable direction after QLT-3, significant per-claim spread |
| **E: Legal/political** *(provisional)* | Claims about legal proceedings, fairness, constitutional compliance | Bolsonaro proceedings | Moderate variance, input-variant sensitivity |

---

## 4. Proposed Acceptable-Variance Bands

> **Threshold basis:** These bands are derived from observed system performance during the March 2026 stabilization wave (QLT-1/2/3 validation runs, 40+ jobs across 7 input families). They are **performance-derived Alpha baselines**, not user-validated product-quality requirements. They answer "what does the current system actually achieve?" rather than "what should a user expect?" The distinction matters: a band marked green here means the system is performing within its observed capability, not that users have confirmed the result quality is acceptable for their needs. User-facing quality requirements may be stricter and should be defined separately as part of product validation.

### 4a. Article-level truth% spread

| Class | Acceptable (green) | Monitor (amber) | Investigate (red) |
|-------|-------------------|-----------------|-------------------|
| **A: Clean factual** | ≤ 5pp | 6–15pp | > 15pp |
| **B: Comparative factual** | ≤ 15pp | 16–25pp | > 25pp |
| **C: Broad evaluative** | ≤ 25pp | 26–35pp | > 35pp |
| **D: Contested comparative** | ≤ 25pp | 26–35pp | > 35pp |
| **E: Legal/political** | ≤ 20pp | 21–30pp | > 30pp |

**Grounding:**
- Class A: Flat Earth shows 2pp post-QLT-3 (3 runs). Note: an earlier post-QLT-1 batch showed a 31pp anomaly (0% and 31%) caused by a perceptual-dimension claim scoring 72% — this was pre-QLT-3 decomposition variance, not evidence instability. Post-QLT-3 is the operative baseline. 5pp is generous relative to 2pp but allows margin for minor decomposition variation.
- Class B *(provisional)*: Hydrogen has only 1 validation run — no repeated-run data. The 15pp threshold is interpolated between Class A (5pp) and Class C (25pp), not empirically derived. Requires ≥3 repeated runs before this threshold can be treated as governance-grade.
- Class E *(provisional)*: Bolsonaro shows 1.2pp (2 runs) — unusually stable for a legal/political input, possibly because both runs used the same formulation. Historical data shows 22pp downward drift across different Bolsonaro input variants. The 20pp threshold is policy-chosen, not empirically validated with enough repeated identical-input data. Requires ≥5 repeated runs of the same input before confirming.
- Class C: Plastik DE shows 22pp (QLT-1), Plastik EN shows 16–30pp (QLT-1/QLT-2). The 25pp acceptable band is set between the best (16pp) and worst (30pp) observed data. 30pp is not acceptable — it's amber.
- Class D: Muslims shows 21pp (QLT-3). 25pp allows margin for evidence variation.

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
| All | ≤ 15pp | 16–30pp | > 30pp |

**Grounding:** Confidence is structurally more stable than truth (aggregation compresses it). Most families show ≤9pp (Plastik DE 9pp, Muslims 7pp, Plastik EN 5pp in QLT-1). However, Plastik EN showed 26pp in QLT-2 (driven by one anomalous 28% environmental-claim confidence outlier). The 30pp investigate threshold ensures this known evidence-driven outlier is amber, not red — a red classification would require investigation when the root cause is already understood as evidence variation.

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

**Step 5: Track amber persistence**
- A "validation round" is a single batch of ≥3 identical-input runs on the same committed code. Each round is a data point.
- "2+ validation rounds" (the amber→red escalation trigger) means two separate batches, not two runs within the same batch.
- Rounds should be spaced by at least one code change or time gap (not just immediate re-runs) to test whether the amber signal is structural or transient.
- **Amber oscillation rule:** If a family oscillates between green and amber across rounds (e.g., green→amber→green→amber), treat it as **persistent amber**, not as repeatedly resolved. The pattern indicates the family is near the threshold boundary and should be monitored, not silently reset each time it dips to green.

**Step 6: Do not conflate**
- Evidence-driven variance (different web sources → different verdicts) is NOT an analytical defect.
- Topic contestability (genuinely mixed evidence on a genuinely contested topic) is NOT instability.
- UX/trust concerns (users seeing different results on repeat queries) are real but separate from analytical correctness.

---

## 7. Current Family Status Under This Policy

| Family | Class | Article Spread | Band | Conf Spread | Band | Per-Claim Spread | Band | Direction | Overall |
|--------|-------|---------------|------|-------------|------|-----------------|------|-----------|---------|
| Flat Earth | A | 2pp | **Green** | 4pp | Green | N/A | — | Yes | **Green** |
| Round Earth | A | 6pp | **Amber** | 16pp | Amber | N/A | — | Yes | **Amber** (only 2 runs) |
| Hydrogen | B | N/A (1 run) | — | — | — | N/A | — | Yes | **Insufficient data** |
| Bolsonaro | E | 1.2pp | **Green** | 4.8pp | Green | 5pp | Green | Yes | **Green** |
| Plastik DE | C | 22pp | **Green** | 9pp | Green | 24pp (econ) | Green | Yes | **Green** |
| Plastik EN | C | 30pp (QLT-2) | **Amber** | 26pp (QLT-2) | **Amber** | 47pp (env) | **Amber** | Yes | **Amber** |
| Muslims | D | 21pp | **Green** | 7pp | Green | 37pp (terrorism) | **Amber** | Yes | **Amber** |

**Summary:** No family is red. Plastik EN and Muslims have amber per-claim spreads (environmental and terrorism facets respectively). These are evidence-driven and do not currently warrant implementation work — but should be monitored in the next validation round.

---

## 8. Captain Decisions (approved 2026-03-25)

| Question | Decision |
|----------|----------|
| **Are the proposed bands correct?** | Accepted as-is for Alpha. Revisit before Beta with more data. |
| **Should Plastik EN amber trigger work?** | No — accept as inherent. The environmental claim is genuinely contested. Monitor only. |
| **Should Muslims amber trigger work?** | No — accept as inherent. Terrorism comparisons inherently produce mixed evidence. Monitor only. |
| **How many runs are needed per family?** | 5 for broad evaluative (C/D), 3 for others. |
| **Should variance be exposed to users?** | Out of scope for this policy — separate UX decision. |
| **When does this policy get revisited?** | Before Beta phase, or if a new family consistently hits red. |

---

## 9. Policy Status

**This policy is now the operative Alpha-phase quality governance framework.** It:
- Grounds thresholds in empirical data from 40+ validation runs across 7 input families
- Separates analytical defects from evidence-driven variance from topic contestability
- Gives future agents a reusable decision framework (classify → measure → compare → decide)
- Does not require code changes
- Can be refined as more validation data accumulates

**Operational effect:** Analyzer work is in monitor mode under this policy. New implementation work is only triggered if a validation round produces a red result. Amber items are monitored, not actioned. No automatic next implementation workstream exists — future workstreams require explicit Captain approval.

**This policy does not claim the system is "stable enough."** It claims the system now has a framework for answering that question consistently.

---

*Based on quantitative data from QLT-1 (14 jobs), QLT-2 (13 jobs), QLT-3 (10 jobs), and earlier validation rounds.*

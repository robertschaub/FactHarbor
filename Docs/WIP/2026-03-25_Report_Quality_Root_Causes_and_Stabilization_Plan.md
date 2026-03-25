# Report Quality Root Causes and Stabilization Plan

**Date:** 2026-03-25
**Status:** Review-adjusted
**Purpose:** Consolidate the current understanding of FactHarbor's remaining report-quality problems, state the most likely root causes, and propose a practical next-step plan that improves quality without reopening broad speculative implementation.

---

## 1. Executive Summary

FactHarbor's report quality is materially better than it was before the March 24–25 stabilization wave:

- Stage-4 reliability failures are no longer the main blocker
- the Stage-1 `claimDirection` inversion bug is fixed
- the worst Plastik instability driver, predicate softening in Stage 1, is materially improved by QLT-1
- control anchors remain directionally correct

The system is **not fully “solved”**, but the dominant quality problem has changed.

**Current quality picture:**

- **Controls** are directionally correct, but not all are fully facet-stable
- **Hydrogen** is good and directionally stable
- **Bolsonaro** is acceptable but still moderately variable
- **Broad evaluative inputs** remain the main weak area
- The biggest current risk is no longer a single broken bug, but **residual instability** across repeated runs on broad evaluative topics

**Recommended posture:**

- treat **QLT-1** as materially successful and move it from active fix mode into **monitoring**
- do **not** start another broad analyzer-tuning wave immediately
- first characterize whether the remaining residual instability is still primarily residual Stage-1 decomposition variance, with Stage 2 evidence variation mostly acting as an amplifier
- keep inherent topic contestability separate from correctable instability
- in parallel, fix the separate trust/UX bug `VAL-2`

---

## 2. What Is Already Solved Well Enough

These are no longer the main report-quality blockers:

### 2.1 Stage-4 reliability collapse
- provider-overload induced `analysis_generation_failed` / `UNVERIFIED` fallback incidents are no longer the dominant runtime problem
- the provider guard is live-validated and stable enough for normal work

### 2.2 `claimDirection` inversion
- the flat-earth false positive was traced to Stage-1 thesis-direction mislabeling
- this is fixed

### 2.3 Predicate softening as the dominant Plastik bug
- QLT-1 reduced Plastik DE spread from **47pp** to **22pp**
- claim count stabilized
- predicate softening incidents went from **1/5** to **0/5**

This means the strongest previously identified Stage-1 bug is no longer the main uncontrolled driver.

---

## 3. Main Current Report-Quality Problems

### 3.1 Residual instability on broad evaluative inputs

This is the most important remaining analytical issue.

Evidence:
- Plastik DE still shows **22pp** truth spread after QLT-1
- Plastik EN has only moderate article-level spread, but still shows a **37pp** swing on the environmental/recovery claim family
- similar broad evaluative families may still drift

Interpretation:
- the dominant predicate bug is improved
- the remaining dominant analytical mechanism still appears to be **facet/decomposition drift**, with evidence variation often following that drift rather than independently causing it

### 3.2 English broad-evaluative variance is not fully localized

Evidence:
- Plastik EN article-level spread is only moderate
- but one environmental/recovery facet still swings by **37pp** across runs
- the underlying claim wording drifts between environmental effectiveness, waste diversion, and material-recovery framings

Interpretation:
- EN no longer looks clearly broken at the article level
- but the per-claim data still points to Stage-1 facet instability
- more measurement is needed before another code change is justified

### 3.3 Moderate instability on genuinely complex mixed inputs

Evidence:
- Bolsonaro remains acceptable but variable

Interpretation:
- some of this may be real analytical complexity rather than a bug
- the system currently lacks an explicit “acceptable variance for genuinely mixed inputs” policy

### 3.4 Residual decomposition variance can still appear on controls

Evidence:
- post-QLT-1 Flat-Earth reruns remained directionally correct, but showed a **31pp** article-level spread
- the spread came from different Stage-1 framing choices, including a perceptual-dimension claim versus a more contextual historical-dimension treatment

Interpretation:
- this is not a regression to the old inversion bug
- but it is a real signal that residual Stage-1 facet/decomposition drift is not limited to broad evaluative families
- control inputs should therefore be described as **directionally stable**, not universally facet-stable

### 3.5 Boundary evidence concentration remains a structural quality signal

Evidence:
- some successful runs still place >80% of evidence into one boundary

Interpretation:
- this is not proven to be a regression
- but it can shape the report too strongly around one framing cluster

### 3.6 Jobs-list progress / verdict sync race

This is not the root cause of analytical quality problems, but it is a root cause of **perceived unreliability**.

Effect:
- users/admins can see a final verdict while progress still looks stale
- good reports can look suspicious even when the underlying analysis is fine

---

## 4. Current Root-Cause Model

### Root Cause A: Residual Stage-1 decomposition variance

Still the most likely upstream cause for the remaining spread, but now smaller than before QLT-1.

Current likely manifestations:
- facet selection drift
- decomposition-granularity drift
- occasional framing drift even without predicate softening

### Root Cause B: Live evidence variation

Likely still important, but often downstream of Root Cause A rather than independent of it.

When Stage 1 chooses different facets, Stage 2 tends to:
- generate different queries
- return different sources
- build different evidence mixes
- produce different boundary concentration patterns

### Root Cause C: Genuine topic contestability

Some inputs are inherently more variable because the real-world evidence is mixed, legally contested, or interpretive.

This is especially relevant for:
- Bolsonaro-like political/legal inputs
- potentially religion/culture/politics families

### Root Cause D: Boundary concentration / representation imbalance

Not the primary cause, but a structural contributor that may amplify weaker coverage of minority facets.

### Root Cause E: UI trust gap

Not analytical, but still important:
- the jobs list can undermine trust even when the report itself is fine

---

## 5. What Should NOT Be Addressed First

The current evidence does **not** justify these as the next main quality moves:

- more Stage 2/4/5 tuning for Plastik
- self-consistency tuning as a first response
- SR re-enablement / Stage 4.5 calibration
- reopening optimization as if it were a quality fix
- another broad prompt rewrite without a narrower hypothesis

These are either unsupported by the current evidence or too broad for the current residual problem shape.

---

## 6. Recommended Plan

### Phase 1 — Canonize the current QLT-1 result

Goal:
- treat QLT-1 as materially successful
- stop acting as if the predicate-softening bug is still the active dominant defect

Actions:
- commit the full QLT-1 validation report
- sync status/backlog/docs to the new post-QLT-1 reality
- move QLT-1 from “active fix” to “monitor / follow-up if needed”

### Phase 2 — Characterize residual broad-evaluative instability

Goal:
- determine whether the remaining residual spread is still mainly Stage-1 facet/decomposition drift, or whether evidence variation has become the dominant remaining amplifier

Recommended runs:
- `Plastic recycling is pointless` × 5
- the Muslims-family input × 5
- `Ist die Erde flach?` × 3

Evaluation focus:
- claim count / facet stability
- explicit facet-category tracking across runs
- predicate strength
- query drift
- evidence mix drift
- boundary concentration

Success condition:
- enough evidence to decide whether another Stage-1 refinement is justified
- define an exit condition up front:
  - if article-level spread is `<= 20pp` and dominant per-claim spread is `<= 30pp`, treat the family as within the current acceptable baseline
  - if either exceeds that band, keep investigating before declaring residual variance “normal”

### Phase 3 — Fix VAL-2

Goal:
- remove the jobs-list trust problem

Why now:
- low ambiguity
- clear user-visible value
- independent from deeper analyzer quality work

### Phase 4 — Fix OBS-1

Goal:
- make overlapping-job metrics and forensics trustworthy

Why:
- improves future diagnosis quality
- lowers confusion during later investigations

### Phase 5 — Reassess before new analyzer work

Only after Phases 2–4:
- decide whether another narrow analyzer-quality change is still justified
- if not, keep monitoring instead of reopening a new quality wave

Optimization (`P1-A` / `P1-B`) remains a separate Captain decision.

---

## 7. Proposed Next Priority Order

1. **QLT-1 closure and monitoring**
2. **Residual broad-evaluative instability characterization**
3. **VAL-2**
4. **OBS-1**
5. **Optimization decision**

---

## 8. Review Questions

Use these in review:

1. Is QLT-1 now strong enough to leave active implementation and enter monitoring?
2. Is the next highest-leverage step really residual broad-evaluative characterization, rather than more immediate analyzer tuning?
3. Should Bolsonaro-like variance be treated as acceptable complexity or as an active quality target?
4. Should boundary concentration be monitored only, or elevated into a specific investigation track?
5. Does `VAL-2` deserve promotion because of trust/UX impact even though it is not analytical quality?

---

## 9. Bottom Line

FactHarbor's main current report-quality problem is **no longer one obvious broken mechanism**.

The system has moved from:
- “fix the clearly broken bug”

to:
- “measure and control the remaining residual instability without overfitting”

That means the correct next move is:
- **not another broad coding wave**
- but **targeted characterization + trust/observability cleanup**

This should improve report quality more reliably than immediately reopening deeper analyzer semantics.

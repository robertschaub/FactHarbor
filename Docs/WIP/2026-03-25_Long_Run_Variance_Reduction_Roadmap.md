# Long-Run Variance Reduction Roadmap

**Date:** 2026-03-25  
**Role:** Lead Architect  
**Method:** Two expert consultations, challenger critique, reconciler synthesis  
**Status:** Future-facing proposal and decision aid. No implementation work is active.

---

## 1. Executive Summary

The deep root cause of residual FactHarbor variance is still most plausibly a combination of:

- normal LLM stochasticity
- live retrieval variation
- verdict sensitivity to unstable evidence pools

The right long-run goal is **not full determinism**. The right goal is to make the pipeline **less sensitive** to unavoidable randomness.

The debated conclusion is:

1. **Retrieval diversity and evidence-pool stability are the first long-run lever**
2. **Verdict arbitration is the second lever**
3. **Harder grounding and abstention controls come later, after validator maturity**
4. **Specialist scorers and GraphRAG remain research-track**

This is consistent with the current repo state: FactHarbor is in approved-policy monitor mode, and no analyzer work should start automatically from this document alone.

---

## 2. Why This Exists

Stage-1 stabilization work is complete. The project now treats remaining variance as mainly evidence-stage plus verdict-stage, not claim-extraction failure. That leaves an important long-run question:

> If future quality work is reopened, where is the highest-leverage controllable variance source?

This document answers that question using:

- current canonical status and backlog
- FactHarbor's Knowledge research set
- two independent expert assessments
- a challenger pass
- a reconciler pass

---

## 3. Repo-Grounded Starting Point

The current canonical position in [Current_Status.md](../STATUS/Current_Status.md) is:

- report-quality stabilization is complete
- `EVD-1` is approved and governs monitor mode
- remaining variance is now primarily **evidence-driven / verdict-driven**
- new analyzer work requires either:
  - an `EVD-1` red threshold breach
  - or explicit Captain approval

That means this roadmap is **not an active plan**. It is a decision aid for any future quality workstream.

---

## 4. What The Debate Agreed On

### High-confidence conclusions

- **Retrieval is the highest-confidence current leverage point.**
  - Multiple repo docs converge on evidence retrieval quality/diversity as FactHarbor's biggest structural gap.
- **Stage 1 is no longer the main long-run target.**
  - The system's own status and quality wave history now place residual variance downstream.
- **More homogeneous debate rounds are not the answer.**
  - The Knowledge docs favor better evidence and better heterogeneity over simply adding more of the same reasoning loop.
- **Harder safety gates are directionally right but not yet ready.**
  - Grounding/attributability should matter more, but current validation is not mature enough to hard-block broadly.

### What the challenger corrected

- Do **not** overclaim that retrieval alone solves long-run variance.
- Do **not** treat this as an urgent implementation roadmap while the project is in monitor mode.
- Do **not** describe calibration as missing from FactHarbor; it already exists and should be extended, not invented from scratch.
- Do **not** place hard grounding gates, broad selective prediction, or broad model heterogeneity too early.

---

## 5. Reconciled Priority Order

If a future quality workstream is explicitly opened, the most defensible order is:

### 1. Measurement first

Before new complexity:

- freeze a production-profile baseline
- separate retrieval effects from verdict-stage effects
- measure the current cross-provider challenger contribution
- keep comparisons under the existing `EVD-1` / calibration discipline

This is necessary because FactHarbor already has some debate, calibration, and routing machinery. The next step should not be chosen blind.

### 2. Retrieval-first improvements

Start with the lightest credible retrieval improvements already closest to production:

- enable/tune the existing multi-source retrieval/provider layer
- add bounded contrarian or pro/con re-search where evidence is one-sided
- then add light reranking / relevance-definition improvements if source diversification alone is not enough

This is the strongest common recommendation across:

- [Factiverse_Lessons_for_FactHarbor.md](../Knowledge/Factiverse_Lessons_for_FactHarbor.md)
- [CheckThat_Lab_Lessons_for_FactHarbor.md](../Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md)
- [Schimanski_DIRAS_NAACL2025.md](../Knowledge/Schimanski_DIRAS_NAACL2025.md)
- [Global_FactChecking_Landscape_2026.md](../Knowledge/Global_FactChecking_Landscape_2026.md)
- [Multi_Source_Evidence_Retrieval.md](../Specification/Multi_Source_Evidence_Retrieval.md)

### 3. Verdict-stage arbitration after retrieval

Only after retrieval improves should FactHarbor decide whether verdict-stage arbitration still needs work.

The likely direction is:

- stronger path diversity
- better re-reconciliation on unstable claims
- better handling of residual evidence asymmetry

But this should be conditional. If retrieval improvements materially reduce spread on their own, a larger verdict-stage redesign may not be justified.

### 4. Safety gating after validator maturity

Grounding/attributability should become stricter over time, but the debated conclusion is that this comes **after** better validator maturity.

Nearer-term direction:

- better grounding-confidence telemetry
- stronger attributability measurement
- narrow evidence-sufficiency abstention on thin-evidence cases

Not yet justified:

- broad hard grounding vetoes
- broad selective-prediction / abstention policy as the main response to variance

### 5. Specialist scorers and graph-guided retrieval later

These remain credible long-run directions, but only after FactHarbor has:

- better task-specific evaluation data
- cleaner measurement of relevance vs probative value vs grounding
- a clearer picture of which residual decisions need specialization

For now they remain research-track, not near-term execution.

---

## 6. Proposed Future Workstream Shape

If quality work is reopened, the best next workstream is:

## `Retrieval-First Variance Reduction Validation`

### Scope

- validate the existing multi-source provider layer
- test bounded contrarian / debate-triggered re-search
- compare retrieval-only changes before any broader verdict redesign

### Goal

Reduce variance by improving evidence completeness, evidence balance, and source diversity before changing core verdict logic again.

### Why this is the best next lever

- it is closest to the repo's strongest measured mechanism: evidence-pool asymmetry
- it aligns with the Knowledge docs
- it is smaller and safer than a broad debate redesign
- it preserves the current Stage-1 quality gains

---

## 7. What To Avoid Overclaiming

- Retrieval is probably the **first** lever, not the **whole** answer.
- Current grounding validation is not yet ready to act as a broad hard gate.
- Cross-provider/path diversity is promising, but its current net effect in FactHarbor has not yet been isolated cleanly.
- Specialist scorers are plausible, but still need data and evaluation discipline.
- The target is **bounded variance with transparent uncertainty**, not perfectly identical reruns.

---

## 8. Deferred / Research-Track Items

The debate consistently pushed these later:

- broad cross-model heterogeneity expansion
- hard grounding or attributability gates as production blockers
- broad selective-prediction / abstention regime
- distilled specialist relevance or grounding scorers
- GraphRAG / KG-guided retrieval

These are not rejected. They are simply later than the current evidence justifies.

---

## 9. Recommendation

### Current posture

Stay in **approved-policy monitor mode**. This document should not by itself trigger implementation.

### If a new quality track is opened later

Open a **retrieval-first validation workstream** with this order:

1. measurement and ablation
2. existing multi-source retrieval layer
3. bounded contrarian / pro-con retrieval
4. light relevance/reranking improvements
5. only then re-evaluate verdict-stage arbitration needs

That is the most defensible long-run path for reducing the controllable portion of variance without pretending the system can eliminate live-web and LLM nondeterminism.

---

## 10. Source Basis

- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)
- [Factiverse_Lessons_for_FactHarbor.md](../Knowledge/Factiverse_Lessons_for_FactHarbor.md)
- [Schimanski_DIRAS_NAACL2025.md](../Knowledge/Schimanski_DIRAS_NAACL2025.md)
- [Schimanski_Faithful_LLM_Specialists_ACL2024.md](../Knowledge/Schimanski_Faithful_LLM_Specialists_ACL2024.md)
- [CheckThat_Lab_Lessons_for_FactHarbor.md](../Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md)
- [MAD_Pattern_Research_2026-02-26.md](../Knowledge/MAD_Pattern_Research_2026-02-26.md)
- [Global_FactChecking_Landscape_2026.md](../Knowledge/Global_FactChecking_Landscape_2026.md)
- [Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md](../Knowledge/Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md)
- [Multi_Source_Evidence_Retrieval.md](../Specification/Multi_Source_Evidence_Retrieval.md)


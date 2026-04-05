# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-04-05
**Status**: Consolidation #10 complete. 28 purely historical files archived. 38 active files remain.

---

## Overview

This directory contains only:

- **current governing work** (policies, active plans)
- **still-open engineering / quality design tracks**
- **future-facing proposals and organizational documents**
- **reference analyses still relevant for future decisions**

Historical, implemented, decided, or superseded content lives in `Docs/ARCHIVE/`.

---

## Governing Current Work

### Policies and quality governance
- [2026-03-25_EVD1_Acceptable_Variance_Policy.md](2026-03-25_EVD1_Acceptable_Variance_Policy.md) — **APPROVED** Alpha-phase variance governance policy
- [2026-03-30_Report_Quality_Evolution_Deep_Analysis.md](2026-03-30_Report_Quality_Evolution_Deep_Analysis.md) — comprehensive 100-job quality evolution across 12 families (Mar 25-30)
- [2026-04-01_Post_Rollback_Validation_Report.md](2026-04-01_Post_Rollback_Validation_Report.md) — 17-run post-rollback validation confirming baseline stability (Apr 1)

### Canonical state + task tracking
- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)

---

## Active Engineering / Quality Tracks

### Currently active
- [2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md](2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md) — active plan for boundary-concentration stabilization and verdict-grounding containment
- [2026-04-05_Current_vs_Previous_Build_Report_Comparison.md](2026-04-05_Current_vs_Previous_Build_Report_Comparison.md) — strict 5-input build-over-build and current local-vs-deployed comparison for deploy gating
- [2026-03-30_Flat_Earth_False_Ambiguity_Reviewer_Notes.md](2026-03-30_Flat_Earth_False_Ambiguity_Reviewer_Notes.md) — **REVIEW-READY** prompt-only fix for false ambiguity on direct factual-property questions
- [2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md](2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md) — post-rollback Stage 1 narrow hardening assessment

### Implemented — kept as architectural reference
- [2026-03-29_1bfb_Direction_Integrity_Architect_Review.md](2026-03-29_1bfb_Direction_Integrity_Architect_Review.md) — citation-carriage fix (`e1f2c551`). Direction validator remeasurement still pending.
- [2026-03-29_2705_e407_Root_Fix_Architect_Review.md](2026-03-29_2705_e407_Root_Fix_Architect_Review.md) — assessable-claims path (`cc362d64`). Implemented.
- [2026-03-30_Article_Adjudication_Hybrid_vs_LLM_Review.md](2026-03-30_Article_Adjudication_Hybrid_vs_LLM_Review.md) — **IMPLEMENTED**. ±10pp truth clamp removed, confidence ceiling kept.
- [2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md](2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md) — claim-local verdict scoping (`17da5b84`). Stage 1 proxy decomposition follow-up still open.
- [2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md](2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md) — FLOOD-1 shipped. Fix 3 (same-source consolidation) deferred.

### Reverted — analysis still relevant for re-approach
- [2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md](2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md) — `fff7a508` evidence-separability approach. **REVERTED** due to Plastik/SRG regressions. Analysis of four failure layers still valid for next attempt.
- [2026-03-31_DistinctEvents_Event_Granularity_Architect_Review.md](2026-03-31_DistinctEvents_Event_Granularity_Architect_Review.md) — distinctEvents prompt change. **REVERTED** — claim count stabilized but TSE peer extraction not achieved.

### Partially done
- [2026-03-27_Internet_Outage_Resilience_Plan.md](2026-03-27_Internet_Outage_Resilience_Plan.md) — Option A shipped; hold/resume and checkpointing remain future work

### Background root-cause context
- [2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md](2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md) — pre-QLT-2 root-cause context. Stage-1 quality track (QLT-1/2/3) complete.

---

## Future Plans / Design Proposals

### Quality / analyzer
- [2026-03-19_SR_LLM_Calibration_Plan.md](2026-03-19_SR_LLM_Calibration_Plan.md) — Stage 4.5 SR calibration. Feature-flagged/off.
- [LLM_Triangulation_Assessment_Plan_2026-03-17.md](LLM_Triangulation_Assessment_Plan_2026-03-17.md) — LLM-assessed aggregation weight factors
- [2026-03-25_Long_Run_Variance_Reduction_Roadmap.md](2026-03-25_Long_Run_Variance_Reduction_Roadmap.md) — long-run retrieval-first roadmap
- [2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md](2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md) — parked Plastik multilingual-neutrality brief
- [2026-04-04_Source_Provenance_Tracking_Design.md](2026-04-04_Source_Provenance_Tracking_Design.md) — source provenance extraction design (post-review v2)
- [2026-04-04_Source_Provenance_GPT_Review_Prompt.md](2026-04-04_Source_Provenance_GPT_Review_Prompt.md) — historical review input for provenance design

### Search / provider integration
- [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md](2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md) — Wikipedia shipped; Semantic Scholar / Fact Check future scope
- [2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md](2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md) — **APPROVED** multilingual policy. EN supplementary lane experimental/default-off.
- [2026-04-01_Multilingual_Output_Search_Policy_Investigation.md](2026-04-01_Multilingual_Output_Search_Policy_Investigation.md) — multi-agent investigation hub

### Infrastructure / optimization
- [2026-03-18_Refactoring_Plan_Code_Cleanup.md](2026-03-18_Refactoring_Plan_Code_Cleanup.md) — residual WS-5/6/7
- [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) — residual P1-A, P2-*, P3-*
- [Infrastructure_and_Config_fwd.md](Infrastructure_and_Config_fwd.md)
- [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md)
- [Quality_Improvement_Pending_fwd.md](Quality_Improvement_Pending_fwd.md)
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) — external cost reference
- [MCP_Adoption_Investigation_2026-03-30.md](MCP_Adoption_Investigation_2026-03-30.md) — MCP adoption feasibility

### Debate / model proposals
- [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md) — cross-provider verdict debate

### Quality reference
- [Report_Quality_Criteria_Scorecard_2026-03-12.md](Report_Quality_Criteria_Scorecard_2026-03-12.md) — rubric reference
- [2026-03-24_Generic_Report_Quality_Signals_Scorecard.md](2026-03-24_Generic_Report_Quality_Signals_Scorecard.md) — generic scorecard

---

## Organizational / Partnership

- [2026-03-24_Draft_Email_Cieliebak.md](2026-03-24_Draft_Email_Cieliebak.md) — ZHAW outreach (SENT 2026-03-25)
- [2026-03-24_Innosuisse_Partnership_Research_Briefing.md](2026-03-24_Innosuisse_Partnership_Research_Briefing.md) — Innosuisse partner identification
- [2026-03-24_Review_Prompt_Cooperation_Presentation.md](2026-03-24_Review_Prompt_Cooperation_Presentation.md) — cooperation presentation review prompt
- [2026-04-02_Call_Prep_Catherine_Gilbert.md](2026-04-02_Call_Prep_Catherine_Gilbert.md) — dpa call preparation

### LiveCheck / Innosuisse future track
- [Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md](../Knowledge/Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md)
- [Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md](../Knowledge/Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md)
- [LiveCheck_State_of_the_Art_Research_2026-03-18.md](../Knowledge/LiveCheck_State_of_the_Art_Research_2026-03-18.md)

---

## Split Documents

Historical detail from these WIP docs lives in `_arch` companion files under [Docs/ARCHIVE](../ARCHIVE/):

- `2026-03-18_Refactoring_Plan_Code_Cleanup_arch.md`
- `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19_arch.md`
- `2026-03-19_Report_Quality_Evolution_Investigation_arch.md`
- `Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`
- `2026-03-03_Wikipedia_SemanticScholar_Integration_Concept_arch.md`
- `API_Cost_Reduction_Strategy_2026-02-13_arch.md`
- `Infrastructure_and_Config_fwd_arch.md`
- `LLM_Allocation_and_Cost_fwd_arch.md`
- `Quality_Improvement_Pending_fwd_arch.md`
- `2026-03-19_SR_LLM_Calibration_Plan_arch.md`

---

## Cleanup History

| Date | Consolidation | Files archived | Files remaining |
|------|--------------|---------------|-----------------|
| 2026-04-04 | **#10** | 28 historical/completed files archived (investigations, decided debates, implemented reviews, subagent reports) | 38 |
| 2026-04-04 | **#9** | 9 completed WIP files archived | 66 |
| 2026-03-24 | Knowledge move | 3 docs reclassified to `Docs/Knowledge` | 19 |
| 2026-03-24 | **#8** | 12 WIP files + 12 mixed splits | 22 |
| 2026-03-24 | **#7** | 9 WIP files archived | 34 |
| 2026-03-17 | **#6** | 30 WIP + 6 STATUS + 19 Handoffs | 18 |

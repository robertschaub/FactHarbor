# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-03-27  
**Status**: WIP Consolidation #8 complete. The active WIP set is reduced to a curated live set. Mixed plan/report documents were split: the live current/future-facing parts remain in WIP, while historical detail moved to `_arch` companions in [Docs/ARCHIVE](../ARCHIVE/). LiveCheck / Innosuisse proposal material now lives in [Docs/Knowledge](../Knowledge/).

---

## Overview

This directory now contains only:

- **current governing work**
- **still-open engineering / quality design tracks**
- **future-facing proposals and organizational documents**
- **past analyses that still matter for future decisions, but only in curated live form**

Anything that was purely historical, implemented, or superseded has been archived.

---

## Governing Current Work

### Current quality / stabilization steering
- [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md) — background rationale; VAL-1 gate is closed
- [2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md](2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md) — background root-cause context; the Stage-1 quality track (QLT-1/2/3) is now complete
- [2026-03-25_Senior_Developer_QLT2_Characterization.md](../AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT2_Characterization.md) — split root-cause finding that guided QLT-3
- [2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md](../AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md) — final QLT validation result
- [2026-03-25_EVD1_Acceptable_Variance_Policy.md](2026-03-25_EVD1_Acceptable_Variance_Policy.md) — **APPROVED** Alpha-phase variance governance policy
- **Post-stabilization posture**: The report-quality stabilization wave (QLT-1/2/3, VAL-2, OBS-1) is complete. EVD-1 is approved and operative. The project is in **approved-policy monitor mode** — analyzer work is policy-triggered only (red threshold breach); future workstreams require Captain approval. Governed by `Current_Status.md`, `Backlog.md`, and EVD-1.

### Canonical state + task tracking
- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)

### Parked architectural guardrail
- [2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md](2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md)
- Keep as the restart brief for the parked Plastik multilingual-neutrality problem. It is **not** an implementation plan.

---

## Active Engineering / Quality Tracks

### Residual quality / analyzer tracks
- [2026-03-01_Claim_Strength_Preservation_Study.md](2026-03-01_Claim_Strength_Preservation_Study.md)
- [Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md](Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md)
- [AnalyticalDimension_Concrete_Examples_Plan_2026-03-17.md](AnalyticalDimension_Concrete_Examples_Plan_2026-03-17.md)
- [2026-03-19_SR_LLM_Calibration_Plan.md](2026-03-19_SR_LLM_Calibration_Plan.md)
- [LLM_Triangulation_Assessment_Plan_2026-03-17.md](LLM_Triangulation_Assessment_Plan_2026-03-17.md)
- [Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md](Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md)
- [2026-03-26_Plastik_DE_Unverified_Root_Cause_Note.md](2026-03-26_Plastik_DE_Unverified_Root_Cause_Note.md) — differential diagnosis for the `UNVERIFIED` Plastik DE run
- [2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md](2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md) — reviewed final proposal: bug fix shipped, runtime-path characterization complete
- [2026-03-26_Plastik_DE_Runtime_Path_Investigation.md](2026-03-26_Plastik_DE_Runtime_Path_Investigation.md) — runtime-path investigation: existing Stage-1 safeguards active; remaining blind spot is missing persisted classification/contract-validation diagnostics
- [2026-03-26_Gate1_Rescue_Refinement_Debate.md](2026-03-26_Gate1_Rescue_Refinement_Debate.md) — **DECIDED: Gate 1 refinement declined.** Two-agent debate found UNVERIFIED driven by evidence variation, not Gate 1. Over-filtering risk too high.
- [2026-03-26_EVD1_Bolsonaro_Plastik_Measurement.md](2026-03-26_EVD1_Bolsonaro_Plastik_Measurement.md) — 5-run Bolsonaro (amber, UNVERIFIED did not recur) + 3-run Plastik DE (green). No action justified.
- [2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md](2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md) — review-ready analysis of the `1abb0ea5` weak Bolsonaro run. Concludes that empty coverage-matrix rows expose a real seeded-evidence claim-mapping defect, but that defect is contributory rather than the primary cause; Stage-2 mapped-evidence starvation remains the main weak-path mechanism.
- [2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md](2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md) — **REVIEW-READY** revised proposal. Rejects Option B (all-claims fallback) as attribution fabrication. Recommends Option C: narrow post-Pass-2 LLM remap for unmapped seeded evidence. Supersedes Rev 1 (`2026-03-26_Seeded_Evidence_LLM_Remap_Proposal.md`) and the Option B recommendation in the original investigation (`2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md`).
- [2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md](2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md) — parked resume point for the final promote-or-hold decision on `preliminaryEvidenceLlmRemapEnabled`. Records completed ON runs, missing OFF comparison runs, and the remaining remapped-evidence spot-check.
- [2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md](2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md) — **REVIEW-READY** investigation into single-source evidence flooding. One URL (civilizationworks.org, SR=0.38) produced 11 items that flipped AC_01 to LEANING-FALSE. Root cause: SR scores are inert in the pipeline + no per-source item cap. Proposes 3-fix sequence: (1) pass SR to verdict prompts, (2) per-source cap, (3) same-source consolidation.

### Residual structural / optimization source plans
- [2026-03-18_Refactoring_Plan_Code_Cleanup.md](2026-03-18_Refactoring_Plan_Code_Cleanup.md)
- [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md)
- [Infrastructure_and_Config_fwd.md](Infrastructure_and_Config_fwd.md)
- [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md)
- [Quality_Improvement_Pending_fwd.md](Quality_Improvement_Pending_fwd.md)

### Curated quality reference docs
- [2026-03-19_Report_Quality_Evolution_Investigation.md](2026-03-19_Report_Quality_Evolution_Investigation.md)
- [Report_Quality_Criteria_Scorecard_2026-03-12.md](Report_Quality_Criteria_Scorecard_2026-03-12.md)
- [2026-03-24_Generic_Report_Quality_Signals_Scorecard.md](2026-03-24_Generic_Report_Quality_Signals_Scorecard.md)

---

## Future Proposals / Organizational Tracks

### Search / provider integration
- [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md](2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md)
- [2026-03-25_Long_Run_Variance_Reduction_Roadmap.md](2026-03-25_Long_Run_Variance_Reduction_Roadmap.md) — debated long-run roadmap; retrieval-first if a future quality workstream is reopened

### Debate / model / cost proposals
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md)

### LiveCheck / Innosuisse future track
- [Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md](../Knowledge/Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md)
- [Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md](../Knowledge/Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md)
- [LiveCheck_State_of_the_Art_Research_2026-03-18.md](../Knowledge/LiveCheck_State_of_the_Art_Research_2026-03-18.md)

---

## Split Documents

The following active WIP docs were **trimmed to live summaries**. Their historical detail now lives in `_arch` companion files under [Docs/ARCHIVE](../ARCHIVE/):

- `2026-03-18_Refactoring_Plan_Code_Cleanup_arch.md`
- `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19_arch.md`
- `Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16_arch.md`
- `2026-03-19_Report_Quality_Evolution_Investigation_arch.md`
- `Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`
- `2026-03-03_Wikipedia_SemanticScholar_Integration_Concept_arch.md`
- `API_Cost_Reduction_Strategy_2026-02-13_arch.md`
- `Infrastructure_and_Config_fwd_arch.md`
- `LLM_Allocation_and_Cost_fwd_arch.md`
- `Quality_Improvement_Pending_fwd_arch.md`
- `2026-03-19_SR_LLM_Calibration_Plan_arch.md`
- `Plastik_Recycling_Report_Regression_Investigation_2026-03-16_arch.md`

---

## Cleanup History

| Date | Consolidation | Files archived | Files remaining |
|------|--------------|---------------|-----------------|
| 2026-03-24 | Knowledge move | 3 proposal/research docs reclassified from WIP to `Docs/Knowledge` | 19 |
| 2026-03-24 | **#8** | 12 WIP files moved to archive + 12 mixed docs split to `_arch` companions | 22 |
| 2026-03-24 | **#7** | 9 WIP files archived | 34 |
| 2026-03-17 | **#6** | 30 WIP + 6 STATUS + 19 Handoffs. Split files → `_fwd` extracts. | 18 |
| 2026-03-03 | #5 | 3 | 40 |
| 2026-03-02 | #4 | 4 | 43 |
| 2026-03-01 | #3 | 11 | 47 |
| 2026-02-23 | #2 | 5 | 58 |

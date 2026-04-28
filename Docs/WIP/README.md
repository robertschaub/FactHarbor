# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-04-29
**Status**: Consolidation #13 complete. 2 files archived. 60 active markdown docs remain.

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

### Canonical state + task tracking
- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)

---

## Active Engineering / Quality Tracks

### Currently active (Phase 7 / Report Quality Restoration)
- [2026-04-26_235000_Comparison_Fix_Working_Memory.md](2026-04-26_235000_Comparison_Fix_Working_Memory.md) — current paused working memory for the approved 235000 comparison fix loop
- [2026-04-16_Benchmark_Report_Quality_Status_Matrix.md](2026-04-16_Benchmark_Report_Quality_Status_Matrix.md) — current benchmark-family status matrix after the April 16 fix wave
- [2026-04-15_Phase7b_Prompt_Blocker_Implementation_Charter.md](2026-04-15_Phase7b_Prompt_Blocker_Implementation_Charter.md) — current bounded Phase 7b execution charter (Fix A/C landed, Fix B residual gap)
- [2026-04-14_Phase7_Step1_Pains_Issues_Needs.md](2026-04-14_Phase7_Step1_Pains_Issues_Needs.md) — current Phase 7 problem framing, implementation plan, and verification checklist
- [2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md](2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md) — current Phase 7 code/prompt issue inventory (2 forward items remain)
- [2026-04-13_Phase7_Salience_First_Charter.md](2026-04-13_Phase7_Salience_First_Charter.md) — Phase 7 E1/E2/Shape B decision tree; E1 not yet landed
- [2026-04-11_Report_Quality_Restoration_Master_Plan.md](2026-04-11_Report_Quality_Restoration_Master_Plan.md) — master plan spanning Phases 0-7; Phase 7 active

### UPQ-1 (Stage 2/3 upstream quality)
- [2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md](2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md) — UPQ-1 proposal; Phase A+B done, Phase C (boundary concentration) is next
- [2026-04-07_UPQ1_Phase_B_Canary_Measurement.md](2026-04-07_UPQ1_Phase_B_Canary_Measurement.md) — Phase B validated and shipped; opens Phase C as next step
- [2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md](2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md) — consolidated quality investigation with active forward items (Stage 1 blocker)
- [2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md](2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md) — adversarial cross-review sharpening the consolidated investigation

### Grounding / boundary stabilization (MONITOR mode)
- [2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md](2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md) — grounding containment shipped; deployed validation + Stage 2/3 stabilization still open

### Prompt governance / architecture
- [2026-04-15_Prompt_System_Architecture_Issues_Report.md](2026-04-15_Prompt_System_Architecture_Issues_Report.md) — 4 unresolved prompt governance issues (PSA-1 through PSA-4)
- [2026-04-16_Prompt_Genericity_Pass_Plan.md](2026-04-16_Prompt_Genericity_Pass_Plan.md) — items 7-10 awaiting Captain approval; items 1-6 possibly landed
- [2026-04-17_AGENTS_md_Text_Interpretation_Rule_Draft.md](2026-04-17_AGENTS_md_Text_Interpretation_Rule_Draft.md) — v3 rule draft awaiting Captain review; 3 open questions
- [2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md](2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md) — adjudicated execution plan after GPT + Claude Opus prompt-audit consolidation
- [2026-04-20_Dominant_Proposition_Architecture_Plan.md](2026-04-20_Dominant_Proposition_Architecture_Plan.md) — consolidated reviewed plan for optional parent/top-level proposition semantics, `all_must_hold` aggregation, and UCM-flagged alpha rollout

### Multilingual
- [2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md](2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md) — **APPROVED** multilingual policy; Proposal 2 partially shipped, EN lane experimental/default-off
- [2026-04-01_Multilingual_Output_Search_Policy_Investigation.md](2026-04-01_Multilingual_Output_Search_Policy_Investigation.md) — multi-agent investigation hub; partial implementation

### Agent tooling
- [2026-04-16_Agent_Indexing_System_Design.md](2026-04-16_Agent_Indexing_System_Design.md) — agent indexing system design; materially executed now (JSON artifacts, shared query package, CLI, and thin MCP adapter exist; rollout docs/configs landed, client adoption remains)
- [2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) — active v1 spec for the internal knowledge layer: shared query core, CLI, thin MCP adapter, and rollout setup docs/configs are in place; client adoption and local client validation are next
- [2026-04-26_ACE_Governance_Implementation_Plan.md](2026-04-26_ACE_Governance_Implementation_Plan.md) — active implementation plan for accepted ACE governance corrections and telemetry/index stabilization
- [2026-04-26_ACE_Governance_Reaudit_Consolidated.md](2026-04-26_ACE_Governance_Reaudit_Consolidated.md) — consolidated ACE governance re-audit result awaiting review
- [2026-04-26_ACE_Readiness_Review_And_Debate.md](2026-04-26_ACE_Readiness_Review_And_Debate.md) — ACE readiness findings and debate record awaiting review
- [2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md](2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md) — current audit of collaboration rules structure and duplication
- [2026-04-26_Multi_Agent_Collaboration_Rules_Restructure_Proposal.md](2026-04-26_Multi_Agent_Collaboration_Rules_Restructure_Proposal.md) — proposed collaboration-rules restructure awaiting Captain review
- [2026-04-13_Agent_Outputs_Purpose_Review.md](2026-04-13_Agent_Outputs_Purpose_Review.md) — Agent_Outputs migration design (approved, migration PR not yet executed)
- [2026-04-13_Migration_Case_C_Review.md](2026-04-13_Migration_Case_C_Review.md) — Case-C decision record for Agent_Outputs migration (decisions made, execution pending)
- [2026-04-21_Additive_Repair_Drift_Problem_Statement.md](2026-04-21_Additive_Repair_Drift_Problem_Statement.md) — problem framing for additive repair drift in agent workflows; explains why agents keep stacking failed changes and why bounded backtracking is preferred over blanket rollback

### Other partially-done tracks
- [2026-04-09_Deterministic_Analysis_Hotspots_Review.md](2026-04-09_Deterministic_Analysis_Hotspots_Review.md) — top-5 deterministic hotspots; 2 highest partially addressed, 3 still open
- [2026-04-07_Wikipedia_Integration_Review_and_Recommendations.md](2026-04-07_Wikipedia_Integration_Review_and_Recommendations.md) — 4-item implementation plan; unclear implementation status
- [2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md](2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md) — Stage 4 claim-local evidence scoping follow-up (verify resolution)
- [2026-03-27_Internet_Outage_Resilience_Plan.md](2026-03-27_Internet_Outage_Resilience_Plan.md) — Option A shipped; Options B (hold/resume) and C (checkpointing) remain future work

---

## Future Plans / Design Proposals

### Quality / analyzer
- [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md) - historical ACS implementation spec; current living implementation reference is `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Atomic Claim Selection and Validation/WebHome.xwiki`
- [2026-04-22_Check_Worthiness_Recommendation_Design.md](2026-04-22_Check_Worthiness_Recommendation_Design.md) — consolidated implementation design for ACS check-worthiness recommendation authority
- [2026-04-24_Atomic_Claim_ACS_Check_Worthiness_Unification_Assessment.md](2026-04-24_Atomic_Claim_ACS_Check_Worthiness_Unification_Assessment.md) — architecture assessment for Stage 1 atomic claims and ACS check-worthiness unification
- [2026-04-28_Remaining_Unification_Architecture_Assessment.md](2026-04-28_Remaining_Unification_Architecture_Assessment.md) — follow-up architecture assessment defining remaining contract/governance unification after ACS/check-worthiness implementation
- [2026-04-29_Check_Worthiness_Phase1a_Implementation_Plan.md](2026-04-29_Check_Worthiness_Phase1a_Implementation_Plan.md) — review-debated Phase 1a implementation plan for no-behavior check-worthiness type, label, and diagram cleanup
- [2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md](2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md) — reviewed, partially implemented selection-readiness root-cause/fix plan
- [2026-04-27_SVP_ACS_Gated_Implementation_Plan.md](2026-04-27_SVP_ACS_Gated_Implementation_Plan.md) — active gated plan for broad-input ACS research waste: instrumentation and contradiction admission first; source reuse and budget-aware ACS gated by metrics/review
- [2026-04-28_ACS_Validation_Path_Deployment_Solution.md](2026-04-28_ACS_Validation_Path_Deployment_Solution.md) — historical ACS validation rollout plan; slices 1-4 have materially landed, and current diagrams/status live in `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Atomic Claim Selection and Validation/WebHome.xwiki`
- [2026-03-19_SR_LLM_Calibration_Plan.md](2026-03-19_SR_LLM_Calibration_Plan.md) — Stage 4.5 SR calibration. Feature-flagged/off.
- [LLM_Triangulation_Assessment_Plan_2026-03-17.md](LLM_Triangulation_Assessment_Plan_2026-03-17.md) — LLM-assessed aggregation weight factors (v4 ready for implementation approval)
- [2026-03-25_Long_Run_Variance_Reduction_Roadmap.md](2026-03-25_Long_Run_Variance_Reduction_Roadmap.md) — long-run retrieval-first roadmap
- [2026-04-04_Source_Provenance_Tracking_Design.md](2026-04-04_Source_Provenance_Tracking_Design.md) — source provenance extraction design (v2, post-GPT review). PARKED.
- [2026-04-10_Claim_Clarification_Gate_Design.md](2026-04-10_Claim_Clarification_Gate_Design.md) — claim clarification gate design (out of scope for current track)


### Search / provider integration
- [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md](2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md) — Wikipedia shipped; deeper Semantic Scholar / Fact Check integration future scope

### Infrastructure / optimization
- [2026-04-24_Admin_Preparation_Sessions_Control_Plan.md](2026-04-24_Admin_Preparation_Sessions_Control_Plan.md) — April 27 rebased plan for admin-only preparation-session visibility/control over `ClaimSelectionDraftEntity`; recommends only immediate `PREPARING` cancel safety alignment now, then API tests, read-only admin observability, and audited mutations
- [2026-04-23_Session_Preparation_Semantics_Preserving_Async_Proposal.md](2026-04-23_Session_Preparation_Semantics_Preserving_Async_Proposal.md) — active recommended direction for semantics-preserving async/session UX preparation work
- [2026-04-23_Grander_Runtime_Followup_Options.md](2026-04-23_Grander_Runtime_Followup_Options.md) — deferred Grander runtime follow-up options, with verdict citation sanitation ranked first
- [2026-04-28_Prompt_Split_Runtime_Efficiency_Execution_Plan.md](2026-04-28_Prompt_Split_Runtime_Efficiency_Execution_Plan.md) — active prompt-runtime telemetry/design track before any physical prompt split or prompt-behavior change
- [2026-04-22_AI_Cost_Review_Reduce_Keep_Add.md](2026-04-22_AI_Cost_Review_Reduce_Keep_Add.md) — split developer-tool/runtime cost review awaiting Captain decisions
- [2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md](2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md) — token-reduction debate result; approved safe wins require measurement/implementation planning
- [2026-03-18_Refactoring_Plan_Code_Cleanup.md](2026-03-18_Refactoring_Plan_Code_Cleanup.md) — residual WS-5/6/7
- [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) — residual P1-A, P2-*, P3-* (require fresh baseline)
- [Infrastructure_and_Config_fwd.md](Infrastructure_and_Config_fwd.md) — residual infrastructure items (3 open)
- [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md) — residual cost/allocation items (3 open)
- [Quality_Improvement_Pending_fwd.md](Quality_Improvement_Pending_fwd.md) — residual quality items (4 open)
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) — external cost reference (Batch API, funding, governance)

### Debate / model proposals
- [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md) — cross-provider verdict debate (prerequisite experiment not yet run)

---

## Organizational / Partnership

- [2026-03-24_Innosuisse_Partnership_Research_Briefing.md](2026-03-24_Innosuisse_Partnership_Research_Briefing.md) — Innosuisse partner identification (ZHAW recommended; Innovation Cheque, SwissText 2026 pending)

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
- `2026-04-14_Phase7_Code_and_Prompt_Deep_Review_arch.md`
- `2026-04-14_Phase7_Step1_Pains_Issues_Needs_arch.md`
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
| 2026-04-27 | **#13** | 2 files archived (implemented prompt-read plan, superseded text-first session-prep proposal); WIP README synced with recent active docs; one SVP ACS gated implementation plan added after consolidation | 57 |
| 2026-04-18 | **#12** | 48 files archived (Phase 2-6 execution artefacts, completed investigations, historical reviews, event prep, superseded proposals, abandoned MCP investigation) | 37 |
| 2026-04-15 | **#11** | 4 historical/supporting docs archived (Phase 7 bridge/status notes, post-rollback validation report, implemented article-adjudication review) | 79 |
| 2026-04-04 | **#10** | 28 historical/completed files archived (investigations, decided debates, implemented reviews, subagent reports) | 38 |
| 2026-04-04 | **#9** | 9 completed WIP files archived | 66 |
| 2026-03-24 | Knowledge move | 3 docs reclassified to `Docs/Knowledge` | 19 |
| 2026-03-24 | **#8** | 12 WIP files + 12 mixed splits | 22 |
| 2026-03-24 | **#7** | 9 WIP files archived | 34 |
| 2026-03-17 | **#6** | 30 WIP + 6 STATUS + 19 Handoffs | 18 |

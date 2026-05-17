# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-05-17
**Status**: V2 WIP packages preserved. V1 pipeline-only plans moved to `Docs/ARCHIVE/PipelineV1/`; V2-relevant lessons and deferred V2-native decisions remain in current WIP notes.

---

## Overview

This directory contains only:

- **current governing work** (policies, active plans)
- **still-open engineering / quality design tracks**
- **future-facing proposals and organizational documents**
- **reference analyses still relevant for future decisions**

Historical, implemented, decided, or superseded content lives in `Docs/ARCHIVE/`. V1 pipeline plans that are no longer valid for V2 execution live in `Docs/ARCHIVE/PipelineV1/`; retained V2 lessons and deferred V2-native decisions stay in WIP notes such as [2026-05-17_V2_Retained_Lessons_From_PipelineV1_Docs.md](2026-05-17_V2_Retained_Lessons_From_PipelineV1_Docs.md) and [2026-05-17_Dominant_Proposition_V2_Disposition.md](2026-05-17_Dominant_Proposition_V2_Disposition.md).

---

## Governing Current Work

### Canonical state + task tracking
- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)
- [V2_Pipeline_Implementation_Guardrails.md](../AGENTS/V2_Pipeline_Implementation_Guardrails.md) — canonical V2 implementation constraints, active Slice 7 gate order, and blocked/allowed surfaces

For the V2 pipeline rebuild, use `Current_Status.md`, `Backlog.md`, and `V2_Pipeline_Implementation_Guardrails.md` as the current execution map. The WIP documents below preserve package/specification history and review records; they are not the active queue when those canonical documents disagree.

---

## Active Engineering / Quality Tracks

### Archived V1 pipeline tracks
The former Phase 7/report-quality-restoration, UPQ-1 Stage 2/3, grounding/boundary stabilization tracks, and the pre-V2 Dominant Proposition implementation plan were moved to [Docs/ARCHIVE/PipelineV1](../ARCHIVE/PipelineV1/) on 2026-05-17. They remain historical context only; current V2 design lessons are retained in [2026-05-17_V2_Retained_Lessons_From_PipelineV1_Docs.md](2026-05-17_V2_Retained_Lessons_From_PipelineV1_Docs.md), and the Dominant Proposition V2 decision is recorded in [2026-05-17_Dominant_Proposition_V2_Disposition.md](2026-05-17_Dominant_Proposition_V2_Disposition.md).

### Prompt governance / architecture
- [2026-04-15_Prompt_System_Architecture_Issues_Report.md](2026-04-15_Prompt_System_Architecture_Issues_Report.md) — 4 unresolved prompt governance issues (PSA-1 through PSA-4)
- [2026-04-16_Prompt_Genericity_Pass_Plan.md](2026-04-16_Prompt_Genericity_Pass_Plan.md) — items 7-10 awaiting Captain approval; items 1-6 possibly landed
- [2026-04-17_AGENTS_md_Text_Interpretation_Rule_Draft.md](2026-04-17_AGENTS_md_Text_Interpretation_Rule_Draft.md) — v3 rule draft awaiting Captain review; 3 open questions
- [2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md](2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md) — adjudicated execution plan after GPT + Claude Opus prompt-audit consolidation

### Multilingual
- [2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md](2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md) — **APPROVED** multilingual policy; Proposal 2 partially shipped, EN lane experimental/default-off
- [2026-04-01_Multilingual_Output_Search_Policy_Investigation.md](2026-04-01_Multilingual_Output_Search_Policy_Investigation.md) — multi-agent investigation hub; partial implementation

### Agent tooling
- [2026-04-16_Agent_Indexing_System_Design.md](2026-04-16_Agent_Indexing_System_Design.md) — agent indexing system design; materially executed now (JSON artifacts, shared query package, CLI, and thin MCP adapter exist; rollout docs/configs landed, client adoption remains)
- [2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) — active v1 spec for the internal knowledge layer: shared query core, CLI, thin MCP adapter, and rollout setup docs/configs are in place; client adoption and local client validation are next
- [2026-04-13_Agent_Outputs_Purpose_Review.md](2026-04-13_Agent_Outputs_Purpose_Review.md) — Agent_Outputs migration design (approved, migration PR not yet executed)
- [2026-04-13_Migration_Case_C_Review.md](2026-04-13_Migration_Case_C_Review.md) — Case-C decision record for Agent_Outputs migration (decisions made, execution pending)
- [2026-04-21_Additive_Repair_Drift_Problem_Statement.md](2026-04-21_Additive_Repair_Drift_Problem_Statement.md) — problem framing for additive repair drift in agent workflows; explains why agents keep stacking failed changes and why bounded backtracking is preferred over blanket rollback

### Other partially-done tracks
- [2026-05-12_Pipeline_Rebuild_Specification_Plan.md](2026-05-12_Pipeline_Rebuild_Specification_Plan.md) — Plan V2 Baseline for reverse-engineering, simplifying, and rebuilding the current ClaimAssessmentBoundary pipeline. Workspace: `C:\DEV\FactHarbor`. Git branch: `main`.
- [2026-05-12_Pipeline_Rebuild_Plan_Review_Consolidation.md](2026-05-12_Pipeline_Rebuild_Plan_Review_Consolidation.md) — consolidated Claude/Gemini review and debate result behind the Plan V2 Baseline
- [2026-05-12_Pipeline_Rebuild_Phase1_Context_Summary.md](2026-05-12_Pipeline_Rebuild_Phase1_Context_Summary.md) — governing constraints, quality baselines, handoff anchors, and Phase 2 entry rules after deputy-approved Phase 0
- [2026-05-12_Pipeline_Rebuild_Phase2_Source_Inventory.md](2026-05-12_Pipeline_Rebuild_Phase2_Source_Inventory.md) — read-only Phase 2 inventory of analyzer, prompt/config/model, API/runner/ACS/report, warning/event, quality, and test surfaces for reverse-engineering
- [2026-05-12_Pipeline_Rebuild_Phase2_Stage1_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_Stage1_Baseline.md) — factual Stage 1 baseline covering extraction, salience, preliminary search, contract validation, Gate 1, atomicity, ACS prepared snapshots, prompt surfaces, tests, and risk registry
- [2026-05-12_Pipeline_Rebuild_Phase2_Stage2_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_Stage2_Baseline.md) — factual Stage 2 baseline covering search planning, acquisition, extraction, applicability, sufficiency, provenance, warnings, prompts, compatibility, tests, and risk registry
- [2026-05-12_Pipeline_Rebuild_Phase2_Stage3_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_Stage3_Baseline.md) — factual Stage 3 baseline covering scope normalization, boundary clustering, evidence boundary assignment, coverage matrix behavior, warnings, prompts, compatibility, tests, and risk registry
- [2026-05-12_Pipeline_Rebuild_Phase2_Stage4_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_Stage4_Baseline.md) — factual Stage 4 baseline covering verdict debate, provider resilience, citation integrity, repair paths, source-reliability calibration, Gate 4 thresholds, warnings, compatibility, tests, and risk registry
- [2026-05-12_Pipeline_Rebuild_Phase2_Stage5_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_Stage5_Baseline.md) — factual Stage 5 baseline covering aggregation, article adjudication, narrative/report quality, quality gates, result JSON, API/UI/export/metrics compatibility, prompts/config, tests, and risk registry
- [2026-05-12_Pipeline_Rebuild_Phase2_Prompt_Config_Model_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_Prompt_Config_Model_Baseline.md) — factual cross-cutting baseline for prompt loading/governance, UCM defaults, model routing, provider behavior, temperatures, budgets, timeouts, and drift/test gaps
- [2026-05-12_Pipeline_Rebuild_Phase2_External_Compatibility_Baseline.md](2026-05-12_Pipeline_Rebuild_Phase2_External_Compatibility_Baseline.md) — factual cross-cutting baseline for result JSON, persistence/API, runner, ACS, UI, markdown/static export, validation, calibration, metrics, warnings, and quality-gate compatibility
- [2026-05-12_Pipeline_Rebuild_Phase2_Mechanism_Registry_and_Complexity_Diagnosis.md](2026-05-12_Pipeline_Rebuild_Phase2_Mechanism_Registry_and_Complexity_Diagnosis.md) — consolidated Phase 2 mechanism registry, deterministic semantic hotspot registry, external contract disposition matrix, and complexity diagnosis for the cleaned target specification
- [2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md](2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md) — deputy-approved cleaned target architecture for V2 pipeline implementation baseline, covering logical module boundaries, stage contracts, canonical result/adapters, prompt/config/model governance, warnings, tests, cutover strategy, and rejected alternatives
- [2026-05-12_Pipeline_Rebuild_Target_Specification_Review_Consolidation.md](2026-05-12_Pipeline_Rebuild_Target_Specification_Review_Consolidation.md) — consolidated first- and second-pass deputy review result for the target specification; all reviewer lenses approved with no remaining blockers and no Captain escalation
- [2026-04-07_Wikipedia_Integration_Review_and_Recommendations.md](2026-04-07_Wikipedia_Integration_Review_and_Recommendations.md) — 4-item implementation plan; unclear implementation status
- [2026-03-27_Internet_Outage_Resilience_Plan.md](2026-03-27_Internet_Outage_Resilience_Plan.md) — Option A shipped; Options B (hold/resume) and C (checkpointing) remain future work

---

## Future Plans / Design Proposals

### Quality / analyzer
- [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md) - implementation-ready v1 spec for pre-job AtomicClaim selection over the current Stage 1 final claim set
- [2026-05-17_Dominant_Proposition_V2_Disposition.md](2026-05-17_Dominant_Proposition_V2_Disposition.md) — V2 decision note: archive the pre-V2 `topLevelProposition` plan and reassess only if V2 benchmark evidence later shows a real parent/conjunctive gap
- [2026-03-25_Long_Run_Variance_Reduction_Roadmap.md](2026-03-25_Long_Run_Variance_Reduction_Roadmap.md) — long-run retrieval-first roadmap
- [2026-04-04_Source_Provenance_Tracking_Design.md](2026-04-04_Source_Provenance_Tracking_Design.md) — source provenance extraction design (v2, post-GPT review). PARKED.
- [2026-04-10_Claim_Clarification_Gate_Design.md](2026-04-10_Claim_Clarification_Gate_Design.md) — claim clarification gate design (out of scope for current track)


### Search / provider integration
- [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md](2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md) — Wikipedia shipped; deeper Semantic Scholar / Fact Check integration future scope

### Infrastructure / optimization
- [2026-03-18_Refactoring_Plan_Code_Cleanup.md](2026-03-18_Refactoring_Plan_Code_Cleanup.md) — residual WS-5/6/7
- [Infrastructure_and_Config_fwd.md](Infrastructure_and_Config_fwd.md) — residual infrastructure items (3 open)
- [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md) — residual cost/allocation items (3 open)
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) — external cost reference (Batch API, funding, governance)

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
| 2026-05-17 | Dominant Proposition V2 reclassification | 1 pre-V2 Dominant Proposition plan archived to `Docs/ARCHIVE/PipelineV1/`; 1 V2 disposition note added | 144 |
| 2026-05-17 | PipelineV1 + stale WIP archival | 22 files archived (18 PipelineV1 docs + 4 superseded WIP docs); 1 retained-lessons note added | 144 |
| 2026-04-18 | **#12** | 48 files archived (Phase 2-6 execution artefacts, completed investigations, historical reviews, event prep, superseded proposals, abandoned MCP investigation) | 37 |
| 2026-04-15 | **#11** | 4 historical/supporting docs archived (Phase 7 bridge/status notes, post-rollback validation report, implemented article-adjudication review) | 79 |
| 2026-04-04 | **#10** | 28 historical/completed files archived (investigations, decided debates, implemented reviews, subagent reports) | 38 |
| 2026-04-04 | **#9** | 9 completed WIP files archived | 66 |
| 2026-03-24 | Knowledge move | 3 docs reclassified to `Docs/Knowledge` | 19 |
| 2026-03-24 | **#8** | 12 WIP files + 12 mixed splits | 22 |
| 2026-03-24 | **#7** | 9 WIP files archived | 34 |
| 2026-03-17 | **#6** | 30 WIP + 6 STATUS + 19 Handoffs | 18 |

# V2 Retained Lessons From PipelineV1 Documents

**Status:** Active V2 reference created during WIP cleanup on 2026-05-17.
**Source set:** Historical V1 pipeline documents archived under `Docs/ARCHIVE/PipelineV1/`.
**Use:** Carry forward generic V2 design lessons without reactivating V1 execution plans.

---

## Purpose

This note keeps the V2-relevant lessons from archived V1 WIP documents discoverable after the V1 plans themselves move out of `Docs/WIP/`. The archived documents remain useful as evidence and historical context, but they are not current implementation plans for the V2 pipeline.

Do not use this note to reopen V1 workstreams. If a lesson below becomes implementation work, it must be re-specified against the current V2 contracts, guardrails, gate register, prompt/model approval state, and Captain-defined execution package.

---

## Claim Understanding Lessons

Source documents:
- [Phase 7 Salience-First Charter](../ARCHIVE/PipelineV1/2026-04-13_Phase7_Salience_First_Charter.md)
- [Phase 7 Working Baseline](../ARCHIVE/PipelineV1/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md)
- [Phase 7 Code and Prompt Deep Review](../ARCHIVE/PipelineV1/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md)
- [Phase 7b Prompt-Blocker Charter](../ARCHIVE/PipelineV1/2026-04-15_Phase7b_Prompt_Blocker_Implementation_Charter.md)

Retained lessons:
- Salient qualifiers must be represented before downstream validation or recovery layers can accidentally erase them.
- Discovery/audit signals must stay separate from binding decisions; audit output is not authority unless a reviewed V2 contract says so.
- Prompt contracts and runtime contracts need explicit alignment checks, especially when repair or fallback paths can mask the first failed assumption.
- Persisted observability should expose which stage produced a claim-understanding decision and whether later recovery modified it.

---

## Evidence Lifecycle And Boundary Lessons

Source documents:
- [Upstream Report Quality Workstream Proposal](../ARCHIVE/PipelineV1/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md)
- [UPQ-1 Phase B Canary Measurement](../ARCHIVE/PipelineV1/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md)
- [Consolidated Job Quality Investigation](../ARCHIVE/PipelineV1/2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md)
- [Job Quality Cross-Review](../ARCHIVE/PipelineV1/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md)
- [Boundary Concentration and Grounding Stabilization Plan](../ARCHIVE/PipelineV1/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md)

Retained lessons:
- Claim-level evidence acquisition must stay balanced across selected claims; evidence concentration can dominate the final report even when some retrieval succeeded.
- Query/event anchoring and boundary assignment need inspection surfaces that reveal when evidence is gathered for the wrong event, time frame, legal condition, or jurisdiction.
- Cross-language retrieval divergence is a quality risk; V2 validation should inspect whether equivalent inputs produce materially equivalent evidence portfolios.
- Grounding and citation integrity need single-source-of-truth contracts so report prose cannot cite evidence that the underlying stage did not carry.
- Clean provenance discipline matters for live validation; job evidence is weaker when runtime, docs, prompt, or config state cannot be tied to a clean source revision.

---

## Aggregation, Debate, And Reliability Lessons

Source documents:
- [Deterministic Analysis Hotspots Review](../ARCHIVE/PipelineV1/2026-04-09_Deterministic_Analysis_Hotspots_Review.md)
- [LLM Triangulation Assessment Plan](../ARCHIVE/PipelineV1/LLM_Triangulation_Assessment_Plan_2026-03-17.md)
- [Multi-Agent Cross-Provider Debate Proposal](../ARCHIVE/PipelineV1/Multi_Agent_Cross_Provider_Debate_2026-02-27.md)
- [Source Reliability LLM Calibration Plan](../ARCHIVE/PipelineV1/2026-03-19_SR_LLM_Calibration_Plan.md)

Retained lessons:
- Semantic decisions that affect analysis outcomes should be LLM-owned or explicitly contracted, not hidden in deterministic text heuristics.
- Aggregation quality concepts such as triangulation, derivative dependence, and source independence remain relevant, but any V2 mechanism must use current V2 result contracts.
- Multi-provider or multi-challenger debate remains a possible future quality lever, but it needs fresh cost, model, prompt, and reconciliation approval before implementation.
- Source-reliability calibration remains a future design topic; V2 should keep the distinction between structural source metadata and semantic evidence meaning.

---

## Prompt Governance And Repair Lessons

Source documents:
- [Prompt Genericity Pass Plan](../ARCHIVE/PipelineV1/2026-04-16_Prompt_Genericity_Pass_Plan.md)
- [Consolidated Prompt Audit Implementation Plan](../ARCHIVE/PipelineV1/2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md)
- [Main Regression Snapshot Integration Plan](../ARCHIVE/PipelineV1/2026-05-01_Main_Regression_Snapshot_Integration_Plan.md)
- [DirectionBasis Regression Fix Proposal](../ARCHIVE/PipelineV1/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md)

Retained lessons:
- Prompt governance needs explicit section-level and runtime-contract alignment; do not assume a large prompt file is the operative runtime unit.
- Diagnostic metadata and observational prompt outputs must not quietly become behavioral authority without a reviewed contract that names where that authority lives.
- Late repair chains tend to drift when local fixes accumulate across prompts, runtime coercions, and verdict repairs; V2 should prefer a single reviewed owner per semantic decision path.
- Historical branch snapshots and late repair branches should be mined lane by lane for lessons, never ported wholesale into V2 execution.

---

## Related V2 And Future Design Anchors

- [Pipeline Rebuild Target Specification Draft](2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md)
- [Pipeline Rebuild Phase 2 Mechanism Registry and Complexity Diagnosis](2026-05-12_Pipeline_Rebuild_Phase2_Mechanism_Registry_and_Complexity_Diagnosis.md)
- [Source Provenance Tracking Design](2026-04-04_Source_Provenance_Tracking_Design.md) remains in WIP because it is a parked future evidence-lifecycle design, not a PipelineV1-only cleanup item.

---

## Non-Goals

- This note does not approve prompt, source, config, model, runtime, UI, validation, or live-job changes.
- This note does not make archived V1 plans current again.
- This note does not replace the canonical V2 status documents, guardrails, gate register, or reviewed slice packages.

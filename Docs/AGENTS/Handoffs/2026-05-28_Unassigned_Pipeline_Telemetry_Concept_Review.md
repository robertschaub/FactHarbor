---
### 2026-05-28 | Unassigned | Codex (GPT-5) | Pipeline Telemetry Concept Review
**Task:** Document a telemetry-improvement concept, gather Claude/Gemini/GPT review, debate the proposals, and consolidate the plan.
**Files touched:** `Docs/WIP/2026-05-28_Pipeline_Telemetry_Concept_and_Plan.md`; `Docs/WIP/README.md`; `Docs/AGENTS/Handoffs/2026-05-28_Unassigned_Pipeline_Telemetry_Concept_Review.md`; `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** The consolidated plan keeps first-class `AnalysisMetrics.pipelineTelemetry`, but narrows Phase 1 to `contractValidation`, `verdictDirection`, and provider-neutral `challengerModelGuard`. D5 partition health remains owned by `qualityHealth.f6_*`; evidence-ID compliance is deferred to `qualityHealth` or a one-release cleanup metric. API aggregation should include telemetry provenance and `jobsMissingTelemetry`; UI is deferred.
**Open items:** Implement the telemetry builder/types/API aggregation only after Captain approval. Decide the exact source for `pipelineCommitShort`; decide whether evidence-ID compliance belongs under `qualityHealth` or a temporary cleanup metric; decide whether aggregate output should include telemetry schema-version counts.
**Warnings:** Gemini full-document review timed out in the local CLI, so the Gemini input came from a concise adversarial prompt over the plan summary. The current worktree had unrelated dirty files before this task; this handoff only covers the WIP telemetry document and WIP README link.
**For next agent:** Use `Docs/WIP/2026-05-28_Pipeline_Telemetry_Concept_and_Plan.md` as the implementation baseline. Do not expand Phase 1 into D5 behavior changes, warning severity changes, live-job collection, or admin UI thresholds.
**Learnings:** No role learning appended.

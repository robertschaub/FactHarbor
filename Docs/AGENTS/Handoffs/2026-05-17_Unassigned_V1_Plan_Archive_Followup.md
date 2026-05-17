# V1 Plan Archive Follow-up

**Date:** 2026-05-17  
**Role:** Unassigned  
**Model:** Codex (GPT-5.5)  
**Task:** Apply the repo policy follow-up that V1 plans should no longer remain in `Docs/WIP/` while V1 is retiring.

## Outcome

Archived four additional PipelineV1 execution plans from `Docs/WIP/` to `Docs/ARCHIVE/PipelineV1/`:

- `2026-04-16_Prompt_Genericity_Pass_Plan.md`
- `2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md`
- `2026-05-01_Main_Regression_Snapshot_Integration_Plan.md`
- `2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`

Added archive banners to each moved file stating they are historical PipelineV1 plans and not current V2 execution plans.

Updated live index/navigation docs:

- `Docs/WIP/README.md`
- `Docs/ARCHIVE/README_ARCHIVE.md`
- `Docs/WIP/2026-05-17_V2_Retained_Lessons_From_PipelineV1_Docs.md`
- `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md`
- `Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`

## Verification

- `Docs/WIP/README.md` no longer lists the archived prompt plans as active WIP.
- Active WIP references now point to archive paths where needed.
- `Docs/ARCHIVE/PipelineV1/` now contains 28 markdown files.
- `Docs/WIP/` now contains 148 markdown files.
- `git diff --check` passed.

## Decision Boundary

I did **not** move these still-live WIP docs:

- `2026-04-04_Source_Provenance_Tracking_Design.md`
- `2026-03-27_Internet_Outage_Resilience_Plan.md`
- `2026-03-25_Long_Run_Variance_Reduction_Roadmap.md`

Reason: they are not clearly PipelineV1-only execution plans. They remain either:

- cross-cutting parked future designs with active backlog anchors, or
- future-facing decision aids whose core lesson could still apply to V2.

If the policy is later widened from "V1 plans" to "all V1-era report-quality/reference packets," that should be handled as a separate cleanup pass.

## Warnings

- Historical AGENTS handoffs and `Agent_Outputs.md` entries still contain old `Docs/WIP/...` path text in their preserved historical summaries. I did not rewrite those archival records in this pass.
- `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md` remains in WIP as a reference packet, but now points at the archived DirectionBasis plan.

## Learnings

- The practical boundary is document role, not just age: moving every V1-era diagnostic/status packet would over-archive still-useful reference analyses.
- `Docs/WIP/README.md` and `Docs/ARCHIVE/README_ARCHIVE.md` need to be kept in sync with actual file moves, or the WIP/archive split becomes misleading quickly.

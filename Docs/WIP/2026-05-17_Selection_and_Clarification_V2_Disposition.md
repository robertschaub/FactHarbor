# 2026-05-17 Selection And Clarification V2 Disposition

## Decision

- Archive the pre-V2 / V1 selection-family plans to `Docs/ARCHIVE/PipelineV1/`:
  - `2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`
  - `2026-04-22_Check_Worthiness_Recommendation_Design.md`
  - `2026-04-10_Claim_Clarification_Gate_Design.md`
  - `2026-04-23_Session_Preparation_Semantics_Preserving_Async_Proposal.md`
  - `2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md`
- Do not implement V2 from those V1 plans as-is.

## Why

- The archived documents are built around the V1 ClaimAssessmentBoundary pipeline and its Stage 1 seam: `CBClaimUnderstanding.atomicClaims`, prepared Stage 1 snapshots, and old draft/job/session lifecycles.
- Their approved mechanics are V1-specific: `ClaimSelectionDraftEntity`, `PreparedStage1Json`, `ClaimSelectionJson`, `AWAITING_CLAIM_SELECTION`, `AWAITING_CLARIFICATION`, paused-job resume semantics, and the old user-facing selection/session flow.
- Pipeline V2 Claim Understanding already defines a validated selected-claim contract in its own runtime shape; see [apps/web/src/lib/analyzer-v2/claim-understanding/types.ts](../../apps/web/src/lib/analyzer-v2/claim-understanding/types.ts) and [2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md](2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md).
- No current V2 runtime approval exists for porting the V1 selection draft model, the V1 check-worthiness ranking contract, or the V1 clarification pause/wizard design directly into V2.

## What Remains Open

- V2 may still need one or more of these capabilities later:
  - user-visible claim selection
  - automatic claim triage / check-worthiness recommendation
  - user-visible ambiguity clarification before deeper execution
- If any of those are reintroduced, they must be redesigned as V2-native contracts instead of reviving the V1 draft/session model.
- The async session-preparation and readiness-signaling follow-ons are archived with the same family because they depend on the same V1 `AWAITING_CLAIM_SELECTION` lifecycle and old prepared-session semantics.

## Revisit Trigger

- Revisit only after V2 has an end-to-end baseline and concrete product or benchmark evidence shows that V2 still needs explicit selection, triage, or clarification surfaces.
- Until then, treat the archived V1 plans as historical design material only, not as live execution plans.

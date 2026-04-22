---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Clarified Order For ACS Check-Worthiness And TopLevelProposition
**Task:** Re-state the dependency analysis and implementation order after the Captain clarified that “Dominant Atomic Claim” means the separate `topLevelProposition` / dominant-proposition proposal from `2026-04-20_Dominant_Proposition_Architecture_Plan.md`.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Clarified_Order_ACS_CheckWorthiness_TopLevelProposition.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** With that clarification, the recommended order is: (1) Atomic Claim Selection foundation first, (2) Check-worthiness recommendation second as the ACS ranking layer, (3) `topLevelProposition` detection-only third, with parent-aware aggregation deferred until after detection validation. The core reason is contractual: ACS v1 is explicitly specified against the current flat `CBClaimUnderstanding.atomicClaims` seam and explicitly says it does not introduce or depend on `topLevelProposition`. The approved Check-worthiness improvement is also not a standalone Gate 1 rewrite; it is the post-Gate-1 batched recommendation module inside ACS over that exact final candidate set. Therefore `topLevelProposition` should not precede ACS unless the ACS spec is intentionally reopened.
**Open items:** If the team wants to compress the schedule, items 1 and 2 can be delivered in one feature train, but the sequencing inside that train should still be foundation first and recommendation second. If the team later wants parent-aware article aggregation, treat that as a fourth step after `topLevelProposition` detection quality is validated on null-controls and approved benchmarks.
**Warnings:** Do not conflate the already-existing Stage 5 `dominanceAssessment` with `topLevelProposition`; they are different architectural concepts and the dominant-proposition plan explicitly says parent-aware aggregation should bypass the existing `dominanceAssessment` path. Do not let `topLevelProposition` leak into ACS v1 candidate semantics; the ACS chooser must still operate on the exact final `atomicClaims` only. Do not implement Check-worthiness by making `AtomicClaim.checkWorthiness` authoritative; the approved design keeps that field advisory.
**For next agent:** Use [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md) as the baseline for steps 1-2 and [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) for step 3. The important repo seams are `CBClaimUnderstanding.atomicClaims` in `apps/web/src/lib/analyzer/types.ts`, `extractClaims(...)` in `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, and the absence today of any claim-selection draft plumbing in `apps/api` / `apps/web`.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

## Revised Order

1. **Atomic Claim Selection**
   - Build the draft entity, prepared Stage 1 snapshot, confirm/restart flow, and prepared-job Stage 2 entry path.
   - Keep the candidate set identical to today’s final `understanding.atomicClaims`.
   - Do not add `topLevelProposition` to the ACS semantics.

2. **Check-worthiness**
   - Implement the approved post-Gate-1 batched recommendation/triage module over the exact ACS candidate set.
   - Persist the full recommendation snapshot into draft/job selection metadata.
   - Treat this as the semantic ranking layer that completes ACS rather than as an independent pipeline feature.

3. **`topLevelProposition` / Dominant Proposition**
   - Start with Phase A only: optional parent detection outside `atomicClaims`, structural validation of `componentClaimIds`, final semantic re-authorization, and detection-only validation on approved controls.
   - Keep `topLevelPropositionAggregationEnabled = false` by default.
   - Defer parent-aware aggregation until the detection behavior is stable.

## Why This Order Is Cleaner

- ACS is already designed around the current flat Stage 1 claim contract.
- Check-worthiness, as approved, is defined inside that ACS flow rather than before it.
- `topLevelProposition` is an orthogonal Stage 1 contract extension that adds complexity without helping ACS v1 land.
- Implementing `topLevelProposition` first would either create avoidable type/prompt churn or force the ACS spec to be reopened even though it was explicitly narrowed to avoid that dependency.

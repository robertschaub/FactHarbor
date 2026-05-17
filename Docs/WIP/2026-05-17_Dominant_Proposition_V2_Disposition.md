# 2026-05-17 Dominant Proposition V2 Disposition

## Decision

- Archive the old Dominant Proposition implementation plan to `Docs/ARCHIVE/PipelineV1/2026-04-20_Dominant_Proposition_Architecture_Plan.md`.
- Do not implement `topLevelProposition` in Pipeline V2 from that pre-V2 plan.

## Why

- Pipeline V2 Claim Understanding is currently defined as a validated, selected atomic-claim contract with flat `selectedAtomicClaimIds` and `atomicClaims`; see [apps/web/src/lib/analyzer-v2/claim-understanding/types.ts](../../apps/web/src/lib/analyzer-v2/claim-understanding/types.ts).
- The V2 target specification allows article-level adjudication where configured, but it does not define parent/component semantics in the live V2 contract shape; see [2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md](2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md).
- No V2 runtime approval exists for `topLevelProposition`, `componentClaimIds`, or `parent_all_must_hold`.

## What Remains Open

- The analytical problem is not closed permanently. V2 may still need a parent/conjunctive proposition design if flat selected atomic claims plus article-level adjudication prove insufficient.
- Any revisit must be V2-native. It must choose between:
  - an explicit parent/component relation inside Claim Understanding, or
  - a stronger article-level adjudication model that represents conjunctive parent semantics without adding a new parent field.
- Any such revisit requires a new V2-native design document. Do not port the archived pre-V2 plan as-is.

## Revisit Trigger

- Revisit only after V2 has an end-to-end baseline and benchmark evidence shows that parent-like or conjunctive inputs are still misrepresented.
- Until that evidence exists, treat Dominant Proposition as obsolete as a direct implementation plan and still open only as a possible future V2 design problem.

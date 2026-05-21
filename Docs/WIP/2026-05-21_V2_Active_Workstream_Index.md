# V2 Active Workstream Index

**Date:** 2026-05-21
**Status:** Pointer document only; updated 2026-05-22 for W6-C HighJump takeover
**Purpose:** Reduce successor-agent startup burden while preserving the full May V2 WIP package history.

This document is not a new execution authority and does not archive or supersede
any WIP package. It is a compact intake map for the current V2 workstream.

## Authoritative Startup Order

New Captain Deputy / Lead Developer agents should start here:

1. Latest HighJump takeover checkpoint:
   [2026-05-22_Captain_Deputy_V2_W6-C_HighJump_Takeover_Checkpoint.md](../AGENTS/Handoffs/2026-05-22_Captain_Deputy_V2_W6-C_HighJump_Takeover_Checkpoint.md)
2. HighJump handover supplied to successor:
   [2026-05-21_V2_W6-C_HighJump_Handover.md](2026-05-21_V2_W6-C_HighJump_Handover.md)
3. HighJump canary result:
   [2026-05-21_V2_W6-C_HighJump_Phase1_Canary_Result.md](2026-05-21_V2_W6-C_HighJump_Phase1_Canary_Result.md)
4. Prior W6-F1 stable handoff:
   [2026-05-21_Captain_Deputy_V2_W6-F1_Agent_Handoff_Pause.md](../AGENTS/Handoffs/2026-05-21_Captain_Deputy_V2_W6-F1_Agent_Handoff_Pause.md)
5. Canonical status:
   [Current_Status.md](../STATUS/Current_Status.md)
6. Canonical active queue:
   [Backlog.md](../STATUS/Backlog.md)
7. Guardrails:
   [V2_Pipeline_Implementation_Guardrails.md](../AGENTS/V2_Pipeline_Implementation_Guardrails.md)
8. Live-job budget authority:
   [V2_Live_Job_Tranche_Ledger.json](../AGENTS/V2_Live_Job_Tranche_Ledger.json)
9. Retirement/convergence pressure:
   [V2_Retirement_Ledger.md](../AGENTS/V2_Retirement_Ledger.md)

Use the May WIP package set only after these files identify a specific package
or result that is needed for the current decision.

## Current Stable Transfer Point

W6-F1 reached a stable transfer point before this pointer was created. After
that, the W6-C HighJump workstream continued and changed the active state.

W6-F1 closing evidence:

- W5E repair commit:
  `7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37`
- Canary job:
  `2c60d8e749514f0d84e1158ae7dc9354`
- Classification:
  `PASS_X7_W6_F1_W5E_MULTI_SOURCE_ADMISSION_REPAIR_VERIFIED_RETRIEVAL_REFINEMENT_REMAINS`
- Remaining stop:
  W6-C still recommends `refine_retrieval`; downstream report path remains
  blocked at `boundary_verdict_candidate_not_ready`.
- Live-job budget:
  machine ledger records `currentRemaining = 4` after the W6-F1/W5E canary.

Do not run another W6-F1/W5E canary from this state.

HighJump closing evidence now also exists:

- Prompt recalibration commit: `0c44d391`
- W4A/W4C dedup commit: `ed639a1a`
- W4G/corpus-shell dedup commit: `fc5e7f8e`
- Validated canary: `099eb05cbbca408a87f7168327926762`
- Incomplete second canary: `68a4fa4fa99f48c18679e9b68e3ff344`

Interpret this as one validated W6-C HighJump observation, not as public report
readiness and not as authorization for another canary.

## Current Next Decision

The immediate next action is provenance and validation stabilization, not more
implementation:

1. Reconcile the HighJump 20-slot budget with the machine live-job ledger or
   record an explicit no-more-jobs stop.
2. Re-run focused local verifiers for the prompt and dedup commits before
   treating `fc5e7f8e` as accepted implementation state.
3. Do not further lower W6/W7/W8 bars until Steer-Co or Captain explicitly
   approves the next bounded package.

Relevant immediate WIP anchors:

- [2026-05-21_V2_W6-C_HighJump_Handover.md](2026-05-21_V2_W6-C_HighJump_Handover.md)
- [2026-05-21_V2_W6-C_HighJump_Phase1_Canary_Result.md](2026-05-21_V2_W6-C_HighJump_Phase1_Canary_Result.md)
- [2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md](2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md)
- [2026-05-21_V2_Slice_W6-F1_W5E_Repair_Canary_Result.md](2026-05-21_V2_Slice_W6-F1_W5E_Repair_Canary_Result.md)
- [2026-05-21_V2_W6-C_Retrieval_Quality_Steering_Package.md](2026-05-21_V2_W6-C_Retrieval_Quality_Steering_Package.md)
- [2026-05-21_V2_W6-C_Retrieval_Quality_Steering_Result.md](2026-05-21_V2_W6-C_Retrieval_Quality_Steering_Result.md)

Do not scan the full May WIP directory unless one of the canonical files above
points to a missing predecessor package.

## Cleanup Scope Warning

A full `wip-update` archive pass should wait until the successor team confirms
the current W6-C retrieval-quality/source-diversity direction and reaches a
clean implementation checkpoint. The May package history is still close to the
active V2 execution path, so this prep pass deliberately creates a pointer layer
without moving or classifying package files.

This pointer does not classify May WIP files as done, superseded, historical, or
stale.

## Stop/Escalation Triggers For Successor Agents

Stop and use Steer-Co or Captain approval before:

- changing prompt/model/config/schema/UCM/gateway policy;
- running live jobs or resetting live-job budget;
- exposing V2 output publicly through API/UI/report/export/compatibility paths;
- relaxing W6/W7/W8 gates to force report progress;
- accepting the HighJump lowered-bar prompt as a public/report-quality policy;
- adding another provider or widening source material without a reviewed package;
- touching V1 runtime cleanup/removal;
- archiving current May WIP packages while implementation state is still moving
  or before a reviewed `wip-update` package extracts any remaining open items.

## Later WIP Cleanup Target

After the successor team reaches a clean implementation checkpoint, run a
reviewed `wip-update` package that:

- archives completed May package/result pairs;
- leaves this or a successor compact V2 workstream index as the startup map;
- updates `Docs/WIP/README.md`, `Docs/STATUS/Backlog.md`,
  `Docs/STATUS/Current_Status.md`, and `Docs/ARCHIVE/README_ARCHIVE.md`;
- records extracted open items before moving any WIP file.

# V2 Active Workstream Index

**Date:** 2026-05-21
**Status:** Pointer document only
**Purpose:** Reduce successor-agent startup burden while preserving the full May V2 WIP package history.

This document is not a new execution authority and does not archive or supersede
any WIP package. It is a compact intake map for the current V2 workstream.

## Authoritative Startup Order

New Captain Deputy / Lead Developer agents should start here:

1. Latest active handoff:
   [2026-05-21_Captain_Deputy_V2_W6-F1_Agent_Handoff_Pause.md](../AGENTS/Handoffs/2026-05-21_Captain_Deputy_V2_W6-F1_Agent_Handoff_Pause.md)
2. Canonical status:
   [Current_Status.md](../STATUS/Current_Status.md)
3. Canonical active queue:
   [Backlog.md](../STATUS/Backlog.md)
4. Guardrails:
   [V2_Pipeline_Implementation_Guardrails.md](../AGENTS/V2_Pipeline_Implementation_Guardrails.md)
5. Live-job budget authority:
   [V2_Live_Job_Tranche_Ledger.json](../AGENTS/V2_Live_Job_Tranche_Ledger.json)
6. Retirement/convergence pressure:
   [V2_Retirement_Ledger.md](../AGENTS/V2_Retirement_Ledger.md)

Use the May WIP package set only after these files identify a specific package
or result that is needed for the current decision.

## Current Stable Transfer Point

W6-F1 reached a stable transfer point before this pointer was created.

Current closing evidence:

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

## Current Next Decision

The next successor-team decision should be a Steer-Co reviewed
retrieval-quality/source-diversity direction.

Relevant immediate WIP anchors:

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

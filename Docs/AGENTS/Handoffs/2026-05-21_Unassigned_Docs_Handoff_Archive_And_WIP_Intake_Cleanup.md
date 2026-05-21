# Docs Handoff Archive And WIP Intake Cleanup

**Date:** 2026-05-21
**Role:** Unassigned
**Task:** Reduce documentation/handoff startup burden before the next Captain Deputy takes over.

## Files Touched

- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/`
- `Docs/ARCHIVE/Agent_Outputs_2026-04.md`
- `Docs/ARCHIVE/Handoffs/2026-04/`
- `Docs/AGENTS/index/handoff-index.json`
- `Docs/WIP/README.md`

## Key Decisions

Used the existing deterministic handoff archival script instead of manually
moving or deleting files:

`node scripts/monthly-prune-handoffs.mjs`

Result:

- moved `382` April handoff files to `Docs/ARCHIVE/Handoffs/2026-04/`;
- archived `418` April `Agent_Outputs.md` rows to
  `Docs/ARCHIVE/Agent_Outputs_2026-04.md`;
- reduced active handoff files from `791` to `409`;
- rebuilt `Docs/AGENTS/index/handoff-index.json`.

Updated `Docs/WIP/README.md` only with intake guidance and current cleanup
history. It now tells incoming agents not to scan all WIP files and to start
from the latest handoff, `Current_Status.md`, `Backlog.md`, and V2 guardrails.

## Verification

Commands run:

- `node scripts/monthly-prune-handoffs.mjs`
- `npm run index`
- `npm run debt:sensors`
- `git diff --check`

Debt sensor after cleanup:

- status: `advisory_warn`;
- WIP markdown files: `264` including `README.md`;
- active handoff markdown files: `409`;
- handoff-count warning cleared;
- remaining warnings: V2 source/test footprint, boundary-guard size, WIP docs
  footprint, net mechanism increase telemetry, and five missing consolidation
  markers from 2026-05-19 W4-G/W4-H docs/handoffs.

## Open Items

- `Docs/WIP/` remains above the docs-footprint advisory threshold. This pass
  intentionally did not archive May V2 packages because they are still dense
  governance provenance.
- A later reviewed `wip-update` consolidation should create a compact V2
  package/result index, then archive completed May package/result pairs that
  are fully represented in status/backlog/handoffs.
- The five V2 consolidation marker warnings remain unchanged and should be
  handled as a separate low-risk docs/debt package.

## Warnings

- Do not delete archived handoffs. The archive keeps provenance reachable.
- Do not bulk-archive May V2 WIP files without first preserving active decision
  pointers in a compact index.
- `Current_Status.md` and `Backlog.md` remain long; shortening them is a
  separate consolidation decision because they currently preserve live-job and
  gate provenance.

## For Next Agent

Use this startup order:

1. Read the latest relevant handoff via `Agent_Outputs.md` or
   `handoff-index.json`.
2. Read `Current_Status.md`, `Backlog.md`, and
   `V2_Pipeline_Implementation_Guardrails.md`.
3. Read only WIP packages named by the latest handoff or active backlog item.

Do not scan all WIP files during startup.

## Learnings

No role learning appended.

---
roles:
  - Lead Architect
topics:
  - admin
  - preparation sessions
  - claim selection drafts
  - debate
  - implementation sequencing
files_touched:
  - Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-27_Lead_Architect_Admin_Preparation_Plan_Rebase_Debate.md
  - Docs/AGENTS/Agent_Outputs.md
status: completed
---

# Admin Preparation Plan Rebase Debate

## Task

Reassess the Admin Preparation Sessions Control Plan after intervening fixes, update the plan, and debate whether it still makes sense to implement now.

## Evidence Reviewed

- `Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/AGENTS/Handoffs/2026-04-27_Lead_Developer_Analyze_Report_Processing_Sessions.md`
- `Docs/AGENTS/Handoffs/2026-04-27_Lead_Developer_Stale_Draft_Preparation_Recovery.md`
- `apps/api/Controllers/ClaimSelectionDraftsController.cs`
- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/api/Data/Entities.cs`
- `apps/api/Data/FhDbContext.cs`
- `apps/web/src/app/api/fh/claim-selection-drafts/route.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts`
- `apps/web/src/app/analyze/ActiveClaimSelectionSessions.tsx`
- `apps/web/src/app/analyze/select/[draftId]/page.tsx`
- `apps/web/src/lib/claim-selection-client.ts`
- `apps/web/src/lib/internal-runner-queue.ts`

## Debate Result

Verdict: `MODIFY`.

The architecture remains correct, but full implementation is no longer the immediate recommendation. April 27 fixes reduced the original stuck-session urgency:

- analyze resume cleanup removes final-job sessions
- draft preparation has a separate runner lane
- stale locally tracked `PREPARING` drafts fail after the shared stale-running threshold
- orphaned `PREPARING` drafts after restart are requeued
- long-running work has better heartbeat/status visibility

The current code still has real gaps:

- no admin root `GET /v1/claim-selection-drafts`
- no Next admin list proxy
- no `/admin/preparation`
- no `ClaimSelectionDraftEventEntity`
- no API test project
- `CancelDraftAsync(...)` still allows `PREPARING` cancellation
- the selection page still offers cancel for `PREPARING`
- per-draft GET intentionally calls `drainDraftQueue()` and is not passive

## Updated Plan

The WIP plan now recommends:

1. Slice 0 now: block `PREPARING` cancellation in the service and existing selection UI.
2. Slice 1: add API test foundation for draft gates, hide propagation, recovery semantics, and passive-vs-recovery reads.
3. Slice 2: add read-only passive admin list/detail.
4. Slice 3: add durable draft audit and only then expose controlled admin mutations.

## Recommendation

Implement only Slice 0 now if the team wants a low-risk safety cleanup. Do not implement the full admin preparation UI/control surface immediately unless there is a concrete operator need.

## Warnings

- Full admin tooling should not displace the active analysis-quality and evidence/provenance tracks without a clear operational reason.
- Do not expose admin mutation controls before durable draft audit exists.
- Do not reuse recovery-triggering per-draft reads as passive admin-list reads.
- Backend tests remain a prerequisite for expanding C# draft behavior safely.

## Learnings

- Recent operational fixes can reduce urgency without invalidating the architecture.
- The remaining immediate defect is not admin observability; it is that `PREPARING` is still cancellable despite the system not being able to abort active Stage 1 work.
- Passive observability and recovery kicks must remain separate surfaces.

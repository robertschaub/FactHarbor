---
roles: [Unassigned]
topics: [acs, claim_selection, auto_continue, atomicity, jobs_ui, progress_polling]
files_touched:
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/api/Controllers/InternalClaimSelectionDraftsController.cs
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/src/lib/job-polling.ts
  - apps/web/src/app/jobs/page.tsx
  - apps/web/src/app/jobs/[id]/page.tsx
  - apps/web/test/unit/lib/job-polling.test.ts
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Confirm_And_Job_Progress_Polling_Fix.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Auto-Confirm And Job Progress Polling Fix
**Task:** Remove the leaked claim-selection stop for auto-continue drafts and fix the frontend job-progress drift where the UI could stay at `0%` or regress behind the backend.

**Files touched:** `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/api/Controllers/InternalClaimSelectionDraftsController.cs`; `apps/web/src/lib/internal-runner-queue.ts`; `apps/web/src/lib/job-polling.ts`; `apps/web/src/app/jobs/page.tsx`; `apps/web/src/app/jobs/[id]/page.tsx`; `apps/web/test/unit/lib/job-polling.test.ts`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Confirm_And_Job_Progress_Polling_Fix.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** The earlier page-level recovery fix stayed valid but was not enough. The real orchestration defect was the two-step auto path in `runDraftPreparationBackground(...)`: it stored a prepared draft as `AWAITING_CLAIM_SELECTION`, then immediately called public confirm. That exposed a user-facing stop state for sessions that should have auto-continued and made failure handling depend on a leaked manual path. I replaced that with an internal atomic auto-confirm flow:
- `ClaimSelectionDraftService.PrepareAutoContinueAsync(...)` validates the selected claim ids against the provided prepared draft state and persists the merged `selectedClaimIds` without committing `AWAITING_CLAIM_SELECTION`.
- `InternalClaimSelectionDraftsController` now exposes `POST /internal/v1/claim-selection-drafts/{draftId}/auto-confirm`, which runs the preparation merge, draft-backed job creation, and draft completion inside one transaction, then triggers the runner after commit.
- `internal-runner-queue.ts` now calls that internal endpoint directly for `<= selectionCap - 1` / auto-continue cases, so recommendation remains skipped and no manual-selection state is committed.

For the progress drift, I treated it as a stale polling snapshot problem rather than a backend progress problem. The API and DB already advanced correctly during the observed live run. I added `apps/web/src/lib/job-polling.ts` with merge helpers that reject older `updatedUtc` snapshots and preserve monotonic `RUNNING` progress for same-job responses. Both the jobs list page and the job detail page now merge polled results through that helper instead of blindly replacing state.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/internal-runner-queue.test.ts test/unit/lib/job-polling.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts`
- `npm -w apps/web run build`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-auto-confirm-build`

**Open items:** The page-level auto-confirm recovery guard in `apps/web/src/app/analyze/select/[draftId]/page.tsx` remains intentionally in place for legacy leaked drafts and any malformed historical state. The main live path should no longer need it, but it is still a useful defensive recovery layer.

**Warnings:** The repository already had uncommitted AGENTS/index documentation updates from the earlier code-review-disposition turn before this fix started. I left those intact and worked around them; if a clean commit split matters later, separate the earlier docs/index changes from this code fix explicitly.

**For next agent:** If auto-continue still ever opens the selection UI on fresh drafts, inspect the API transaction path in `InternalClaimSelectionDraftsController.PostAutoConfirm(...)` first, not the page. If progress still appears to regress, start with `apps/web/src/lib/job-polling.ts` and confirm the backend `updatedUtc` field is monotonic on the affected job row.

**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

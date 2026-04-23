---
roles: [Unassigned]
topics: [claim_selection, draft_visibility, jobs_ui, admin_actions]
files_touched:
  - apps/api/Data/Entities.cs
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/api/Services/JobService.cs
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/migrations/20260423144324_AddClaimSelectionDraftIsHidden.cs
  - apps/api/migrations/20260423144324_AddClaimSelectionDraftIsHidden.Designer.cs
  - apps/api/migrations/FhDbContextModelSnapshot.cs
  - apps/api/migrations/006_add_claim_selection_draft_is_hidden.sql
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/hide/route.ts
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/unhide/route.ts
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Draft_Hide_From_Start.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | Draft Hide From Start
**Task:** Support hide/unhide from the preparation UI before a final job exists, so the admin can decide report visibility at the draft stage instead of waiting for the job page.

**Files touched:** `apps/api/Data/Entities.cs`; `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/api/Services/JobService.cs`; `apps/api/Controllers/ClaimSelectionDraftsController.cs`; `apps/api/migrations/20260423144324_AddClaimSelectionDraftIsHidden.cs`; `apps/api/migrations/20260423144324_AddClaimSelectionDraftIsHidden.Designer.cs`; `apps/api/migrations/FhDbContextModelSnapshot.cs`; `apps/api/migrations/006_add_claim_selection_draft_is_hidden.sql`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/hide/route.ts`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/unhide/route.ts`; `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Draft_Hide_From_Start.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Hide is admin-only, but it now exists at the draft layer, not just on jobs. I added `ClaimSelectionDraftEntity.IsHidden`, returned it from the draft GET payload, exposed admin-only hide/unhide endpoints, and surfaced the eye toggle in the preparation page header next to the other top-right actions.

The important behavior change is propagation:
- when a hidden draft becomes a job, `JobService.CreateJobFromDraftAsync(...)` now copies `draft.IsHidden` into `job.IsHidden`
- if a draft already has a linked `FinalJobId`, toggling hide on the draft also updates the linked job

That means “hide from the start” is real product behavior, not just a page flag.

**Verification:**
- `npm -w apps/web run test -- test/unit/app/api/fh/claim-selection-drafts-routes.test.ts`
- `npm -w apps/web run build`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-draft-hide-build`

**Open items:** There is still no separate draft list UI, so hidden drafts currently matter for propagation into the eventual report and for any future draft-list feature, not for an existing draft index page.

**Warnings:** The first `dotnet ef migrations add` attempt produced an incorrect migration that tried to recreate the whole draft system. I quarantined that result, rewrote the migration to the minimal `ADD COLUMN IsHidden`, and kept the matching manual SQL migration in place for existing SQLite databases.

**For next agent:** If you later add a draft-list page, honor `ClaimSelectionDraftEntity.IsHidden` with the same admin-only visibility semantics used for hidden jobs. Do not reintroduce a separate “draft hide” meaning that diverges from eventual report visibility.

**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

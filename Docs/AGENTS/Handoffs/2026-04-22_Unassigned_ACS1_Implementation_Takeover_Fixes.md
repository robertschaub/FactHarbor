---
roles: [Unassigned]
topics: [atomic_claim_selection, acs_1, implementation_takeover, draft_preparation, prepared_job_reuse]
files_touched:
  - apps/web/src/lib/analyzer/types.ts
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/Controllers/JobsController.cs
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/api/Services/JobService.cs
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Implementation_Takeover_Fixes.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | ACS-1 Implementation Takeover Fixes
**Task:** Take over the broken ACS-1 implementation after review findings showed the draft runner, confirmation flow, payload split, and invite accounting were not aligned with the spec.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`; `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`; `apps/web/src/lib/internal-runner-queue.ts`; `apps/api/Controllers/ClaimSelectionDraftsController.cs`; `apps/api/Controllers/JobsController.cs`; `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/api/Services/JobService.cs`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Implementation_Takeover_Fixes.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Implemented a real shared `prepareStage1Snapshot(...)` seam in the web analyzer and reused it both for draft preparation and for draft-backed jobs so confirmed jobs can skip cold-start Stage 1. The draft worker now prepares and persists a real `PreparedStage1Snapshot` plus draft state instead of hard-failing. API confirmation was changed to validate against `preparedStage1.preparedUnderstanding.atomicClaims` and to create the job inside the same DB transaction before marking the draft complete. `PreparedStage1Json` now stores only the extracted prepared snapshot, while `ClaimSelectionJson` stores selection metadata separately. Invite hourly accounting now counts draft creations plus direct jobs, excluding jobs created from drafts so confirmed drafts are not double-counted.
**Open items:** This pass did not add the ACS chooser UI or the recommendation module. Automatic mode is now structurally supported only when Stage 1 yields `<= 5` candidate claims; for larger candidate sets the draft is left in `AWAITING_CLAIM_SELECTION` rather than auto-selecting semantically without `ACS-CW-1`.
**Warnings:** The current automatic-mode fallback for `> 5` candidates is intentionally transitional. It avoids deadlock and avoids inventing deterministic semantic ranking, but it is not the final product behavior from the ACS spec. Also, internal runner reads now fail closed if a draft-backed job contains malformed `PreparedStage1Json` or missing `ClaimSelectionJson`.
**For next agent:** The main runtime seam is now `prepareStage1Snapshot(...)` in [claimboundary-pipeline.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts), used both by the draft worker and by `runClaimBoundaryAnalysis(...)` when `preparedStage1` is provided. The draft worker auto-confirms only the structural easy case (`<= 5` surviving claims) in [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts); `ACS-CW-1` should replace that stopgap by producing `recommendedClaimIds` and driving the true automatic path.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

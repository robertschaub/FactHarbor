---
roles: [Unassigned]
topics: [atomic_claim_selection, acs_1, reviewer_followup, queue_recovery, prepared_job_reuse]
files_touched:
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/Controllers/InternalClaimSelectionDraftsController.cs
  - apps/api/Data/FhDbContext.cs
  - apps/api/Program.cs
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/api/Services/JobService.cs
  - apps/api/migrations/20260422000000_AddClaimSelectionDraft.cs
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/web/src/lib/internal-runner-queue.ts
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Reviewer_Hardening_Commit_Readiness.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | ACS-1 Reviewer Hardening And Commit Readiness
**Task:** Apply reviewer findings after the ACS-1 takeover pass, decide whether a debate was needed, and bring the working tree to a commit-ready state.
**Files touched:** `apps/api/Controllers/ClaimSelectionDraftsController.cs`; `apps/api/Controllers/InternalClaimSelectionDraftsController.cs`; `apps/api/Data/FhDbContext.cs`; `apps/api/Program.cs`; `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/api/Services/JobService.cs`; `apps/api/migrations/20260422000000_AddClaimSelectionDraft.cs`; `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`; `apps/web/src/lib/internal-runner-queue.ts`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Reviewer_Hardening_Commit_Readiness.md`
**Key decisions:** No debate was needed. The reviewer findings were lifecycle and persistence correctness bugs, not architecture ambiguity. I hardened the draft flow in four places: (1) one-draft-one-job is now a DB invariant via a unique `Jobs.ClaimSelectionDraftId` index plus save-time recovery in `CreateJobFromDraftAsync(...)`; (2) the draft queue now has persisted recovery via an internal recoverable-drafts endpoint, watchdog/bootstrap drains, and PREPARING-draft requeue after restart; (3) draft preparation now skips stale non-QUEUED drafts and fails zero-candidate Stage 1 outputs with a specific `no_candidate_claims` terminal state instead of leaving impossible `AWAITING_CLAIM_SELECTION` drafts; and (4) prepared-job reuse now strips deselected-claim artifacts from `preliminaryEvidence`, `preFilterAtomicClaims`, `gate1Reasoning`, and contract-anchor claim-ID lists so job audit payloads match the confirmed selection.
**Verification:** `dotnet build -o C:\DEV\FactHarbor\tmp\api-review-build` passed. `npm -w apps/web run build` passed.
**Open items:** `ACS-CW-1` is still not implemented, so automatic mode only auto-confirms the structural easy case (`<= 5` surviving candidate claims). Larger automatic drafts still stop in `AWAITING_CLAIM_SELECTION` by design. UI work for the selection flow and audit panel also remains out of scope for this pass.
**Warnings:** The draft recovery path assumes the current single-runner-process model. If FactHarbor later runs multiple web runners against the same API/database, the draft requeue semantics will need an ownership/lease mechanism rather than the current local-running-set assumption. Also, `PreparedStage1Json` now has a true uniqueness dependency on `ClaimSelectionDraftId`; any manual DB edits that bypass the app must preserve that one-to-one invariant.
**For next agent:** The recovery seam now starts at `GET /internal/v1/claim-selection-drafts/recoverable` and `drainDraftQueue()` in [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts). The prepared-job sanitization logic lives in `filterPreparedUnderstandingForSelectedClaims(...)` in [claimboundary-pipeline.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts). If you continue ACS work, the next real slice is `ACS-CW-1`; do not add more deterministic automatic-selection logic in the runner.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

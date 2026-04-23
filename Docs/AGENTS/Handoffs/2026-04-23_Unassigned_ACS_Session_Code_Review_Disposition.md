---
roles: [Unassigned]
topics: [acs, claim_selection, session_ui, code_review, review_disposition, inactivity_timeout, hide_from_start]
files_touched:
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Session_Code_Review_Disposition.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Session Code Review Disposition
**Task:** Run a code review over today's ACS/session code changes, address the findings, and prepare the slice for commit.

**Files touched:** `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/web/src/lib/internal-runner-queue.ts`; `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Session_Code_Review_Disposition.md`; `Docs/AGENTS/Agent_Outputs.md`

**Review findings addressed:**
- **Stale idle auto-confirm race:** `PrepareAutoContinueAsync(...)` now treats `AWAITING_CLAIM_SELECTION` auto-confirm as a compare-and-confirm path. It validates that the current persisted `lastSelectionInteractionUtc` still matches the timestamp embedded in the sweep snapshot before merging selected claims, and it now merges against the live stored session state rather than blindly trusting the stale caller snapshot.
- **Legacy timeout mismatch:** the selection page no longer enables the inactivity countdown when a legacy session is missing a persisted `selectionIdleAutoProceedMs`. New sessions still get the persisted timeout through runner-prepared state; old sessions now stay visually honest instead of implying browser-close auto-proceed they cannot actually perform.
- **Timer arming semantics:** the manual inactivity timer now starts when the manual selection screen is first opened, not merely when the server marks the session ready. This preserves the intended “3 minutes without interaction in the screen” behavior while still allowing browser-close continuation after the screen has been seen.
- **Missing-interaction guard:** the server sweep now skips sessions that have no persisted `lastSelectionInteractionUtc`, preventing pre-view sessions from being treated as immediately due.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/claim-selection-flow.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts test/unit/lib/config-drift.test.ts`
- `npm -w apps/web run build`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-session-idle-auto-proceed-build`

**Open items:** The reviewer’s low-severity test-gap note remains partially open. This repo currently has no dedicated API test project to extend, so I did not open a new backend test harness inside this patch. The residual risk is documented rather than silently ignored; if the session state machine changes again, the next best follow-up is to add service-level tests around `ClaimSelectionDraftService`.

**Warnings:** Review scope intentionally excluded unrelated legal/statutes edits under `Docs/Legal/` and AGENTS index churn outside the ACS/session slice.

**For next agent:** If idle auto-proceed changes again, keep the three contracts aligned: persisted timeout/interactions in `ClaimSelectionDraftService`, the runner sweep in `internal-runner-queue.ts`, and the manual-screen bootstrap/countdown logic in `page.tsx`. Do not relax the timestamp compare-and-confirm guard in `PrepareAutoContinueAsync(...)`; that is what prevents stale due-snapshot auto-confirms from overwriting newer checkbox interactions.

**Learnings:** For background auto-actions, “server-owned” is not enough by itself; you also need a concurrency token or timestamp check so the background action cannot confirm stale UI state after a newer interaction lands.

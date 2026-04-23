---
roles: [Unassigned]
topics: [acs, claim_selection, session_ui, ucm, auto_continue, inactivity_timeout, server_owned_timeout]
files_touched:
  - apps/web/src/lib/claim-selection-flow.ts
  - apps/web/src/lib/config-schemas.ts
  - apps/web/configs/pipeline.default.json
  - apps/web/src/lib/analyzer/types.ts
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/Controllers/InternalClaimSelectionDraftsController.cs
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route.ts
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Idle_Auto_Proceed_Timer.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Idle Auto-Proceed Timer
**Task:** Convert the manual claim-selection inactivity timeout from a page-owned countdown into a server-owned session timeout so auto-proceed still works after the browser closes.

**Files touched:** `apps/web/src/lib/claim-selection-flow.ts`; `apps/web/src/lib/config-schemas.ts`; `apps/web/configs/pipeline.default.json`; `apps/web/src/lib/analyzer/types.ts`; `apps/web/src/lib/internal-runner-queue.ts`; `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/api/Controllers/ClaimSelectionDraftsController.cs`; `apps/api/Controllers/InternalClaimSelectionDraftsController.cs`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route.ts`; `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Idle_Auto_Proceed_Timer.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** `pipeline.claimSelectionIdleAutoProceedMs` remains the single UCM knob (default `180000`, `0` disables), but the authority moved into persisted session state instead of a page-local settings fetch. Draft/session state now carries `selectionIdleAutoProceedMs`, `lastSelectionInteractionUtc`, and the last valid `selectedClaimIds`. The public session API gained `POST /v1/claim-selection-drafts/{draftId}/selection-state` so checkbox interactions persist activity timestamps, while the internal API gained `GET /internal/v1/claim-selection-drafts/idle-auto-proceed-due` so the shared runner watchdog can sweep due `AWAITING_CLAIM_SELECTION` sessions and auto-confirm them through the existing internal auto-confirm path. The browser page still shows a live countdown and can eagerly confirm while open, but browser-close continuity now comes from the server sweep. The earlier page-owned settings route was removed rather than leaving two competing timeout authorities.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/claim-selection-flow.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts test/unit/lib/config-drift.test.ts`
- `npm -w apps/web run build`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-session-idle-auto-proceed-build`

**Open items:** None for the timeout behavior itself. The watchdog interval still controls how quickly a due session is noticed after expiry, so practical auto-proceed timing is `timeout + watchdog cadence`, not millisecond-exact wall clock.

**Warnings:** This slice sits on top of other uncommitted preparation-page and hide-from-start work already present in the tree, plus unrelated legal-doc changes under `Docs/Legal/`. I left those untouched. The verification here covered the idle-timeout/session-confirm path only.

**For next agent:** If inactivity semantics change again, keep these three authority layers aligned: UCM/schema defaults in `config-schemas.ts` and `pipeline.default.json`, persisted session-state fields in `ClaimSelectionDraftState` / `ClaimSelectionDraftService`, and the runner sweep in `internal-runner-queue.ts`. Do not reintroduce a second timeout source like the removed `/api/fh/claim-selection-settings` route.

**Learnings:** For abandonment behavior, page-local countdowns are not enough once the product requirement includes browser close or refresh continuity. Persisted session timestamps plus a server sweep are the minimal robust model.

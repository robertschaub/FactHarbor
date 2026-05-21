---
roles: [Unassigned]
topics: [acs, claim_selection, auto_continue, recovery, ui, grander, runtime_followup]
files_touched:
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Continue_Recovery_Fix.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Auto-Continue Recovery Fix
**Task:** Fix the leaked ACS recovery state where drafts with four or fewer prepared claims could still land on the claim-selection page and prompt the user, and document the Grander runtime follow-up options for later reuse.
**Files touched:** `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Continue_Recovery_Fix.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The intended threshold rule was already correct in the runner: `<= 4` prepared claims should auto-continue. The visible bug came from the recovery path: the API persists the prepared draft as `AWAITING_CLAIM_SELECTION` before the immediate confirm step finishes, so any failure in that confirm call leaked the user into a manual-selection screen that should not exist for this case. The implemented fix is a page-level recovery guard in `apps/web/src/app/analyze/select/[draftId]/page.tsx`: if an `AWAITING_CLAIM_SELECTION` draft has four or fewer prepared claims, the page now auto-confirms once on load and redirects to the created job instead of presenting a manual choice UI. The page only surfaces a retry button if that automatic continuation actually fails. In the same turn I documented the four Grander follow-up options in `Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md` and linked the deferred Stage-2 reuse item from `Backlog.md`.
**Verification:** Passed `npm -w apps/web run test -- test/unit/lib/claim-selection-flow.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts` and `npm -w apps/web run build`.
**Open items:** The page now heals the leaked state, but the cleaner orchestration-level fix is still open: the internal `prepared` step sets `AWAITING_CLAIM_SELECTION` even for auto-continue drafts, and `ConfirmDraftAsync(...)` still requires that state. A future cleanup could make auto-continue durable without ever exposing `AWAITING_CLAIM_SELECTION` for `<= 4` claims.
**Warnings:** This fix is intentionally a recovery-path guard, not a full draft-state redesign. If confirm keeps failing for a deterministic server-side reason, the page will now show a retry/cancel fallback instead of silently blocking, but the underlying confirm failure would still need separate diagnosis.
**For next agent:** If this issue reappears, inspect `runDraftPreparationBackground(...)` in `apps/web/src/lib/internal-runner-queue.ts`, `StorePreparedResultAsync(...)` and `ConfirmDraftAsync(...)` in `apps/api/Services/ClaimSelectionDraftService.cs`, and the selection page auto-confirm guard in `apps/web/src/app/analyze/select/[draftId]/page.tsx`. For the broader optimization/quality follow-ups from the same live Grander run, start with `Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md`.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

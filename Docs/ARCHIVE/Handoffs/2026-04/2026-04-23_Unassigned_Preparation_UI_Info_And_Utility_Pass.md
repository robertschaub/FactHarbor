---
roles: [Unassigned]
topics: [claim_selection, preparing_ui, draft_token_access, jobs_ui]
files_touched:
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/src/app/analyze/select/[draftId]/page.module.css
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Info_And_Utility_Pass.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | Preparation UI Info And Utility Pass
**Task:** Address the remaining preparation-page gap: the `/analyze/select/[draftId]` UI still lacked core information and utility actions compared with the job screen, even after the earlier title/copy correction.

**Files touched:** `apps/api/Controllers/ClaimSelectionDraftsController.cs`; `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `apps/web/src/app/analyze/select/[draftId]/page.module.css`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Info_And_Utility_Pass.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** I treated this as a real product gap, not a wording tweak. The preparation screen already had progress and current-step text, but it still hid the actual analysis input and offered almost no utility actions. The user explicitly pointed out that the missing problem was “information and functionality,” not just the `Preparing Analysis` label.

The page now exposes the missing basics:
- Draft-token holders can see `originalInputValue` / `activeInputValue`, not just admins. This is safe because the draft token is already the per-session authorization boundary for the draft itself.
- The page now shows the active analysis input prominently in its own card with copy support.
- A small toolbar adds `Back` and `View JSON` / `Hide JSON`.
- Metadata cards now expose session id with copy affordance, created timestamp, selection mode, updated time, and expiry.
- A raw session JSON inspector is available from the page using the already-fetched draft payload plus parsed `draftStateJson`.

I did **not** try to fake full job-page parity. The preparation route still does not have a true event history endpoint or a final job artifact yet, so I kept the utility layer honest: input visibility, raw session JSON, copy actions, and timestamps.

**Verification:**
- `npm -w apps/web run test -- test/unit/app/analyze/select/page-helpers.test.ts test/unit/lib/analyzer/claim-extraction-multi-event.test.ts`
- `npm -w apps/web run build`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-draft-ui-build`

**Open items:** If the next UI pass wants true job-page parity, the next missing backend primitive is draft event history, not another page-only change. Right now `lastEventMessage` gives only the latest step, not an event timeline.

**Warnings:** No new draft-route tests were added for the API controller change; verification here is compile/build level plus the existing focused web tests. The change is intentionally narrow: it only broadens input visibility from admin-only to any already-authorized draft viewer.

**For next agent:** If the user asks for `Events` on the preparation page, do not bolt it on in the page alone. Add a real draft-events persistence/query path first, then surface it in the UI.

**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

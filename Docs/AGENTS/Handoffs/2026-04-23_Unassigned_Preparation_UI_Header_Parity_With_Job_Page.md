---
roles: [Unassigned]
topics: [preparing_ui, jobs_ui, claim_selection, session_header]
files_touched:
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/src/app/analyze/select/[draftId]/page.module.css
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Header_Parity_With_Job_Page.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | Preparation UI Header Parity With Job Page
**Task:** Bring the `/analyze/select/[draftId]` preparation screen’s upper section into line with the job page. The user explicitly rejected the custom preparation hero and called out missing header elements and unnecessary `mode` surfacing.

**Files touched:** `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `apps/web/src/app/analyze/select/[draftId]/page.module.css`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Header_Parity_With_Job_Page.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** I stopped extending the preparation page’s custom card system and instead reused the job page’s visual primitives directly:
- imported the job page module CSS for the top action row and report-surface metadata card
- imported the shared `InputBanner` so the preparation input uses the same blue banner treatment as the in-progress job page
- moved `Preparing Analysis` out of the card and back into a standalone page title, matching the job page structure
- removed all visible `mode` cards and labels from the preparation page

The new top section now follows the same pattern as the job page:
- back button + JSON tab on the left
- real draft actions on the right (`retry` when failed, `cancel` when cancellable)
- compact metadata row inside the report-surface card (`ID`, `Created`, `Expires`)
- status row and the active input banner inside the same card

I **did not** add a fake `hide` action. Drafts currently have `cancel`/`retry` semantics, not report-style hide/unhide semantics. The user asked for parity of the upper experience, but inventing a nonexistent backend action would have been misleading.

**Verification:**
- `npm -w apps/web run build`

**Open items:** If the user later wants true action parity with reports, that requires an actual draft hide/delete product decision and backend support, not another page-only pass.

**Warnings:** This pass intentionally reuses styling from `apps/web/src/app/jobs/[id]/page.module.css`. If the job page header styles are refactored later, the preparation page header will move with them by design.

**For next agent:** Keep the preparation header visually coupled to the job page header unless product explicitly decides they should diverge again. The previous custom hero version was rejected by the user.

**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

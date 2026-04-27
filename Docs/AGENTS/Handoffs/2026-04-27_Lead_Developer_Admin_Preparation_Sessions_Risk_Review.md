---
roles: [Lead Developer]
topics: [claim_selection_draft, admin_preparation, cancel_gate, operational_risk, review]
files_touched:
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/Data/Entities.cs
  - Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md
  - Docs/AGENTS/Handoffs/2026-04-27_Lead_Architect_Admin_Preparation_Plan_Rebase_Debate.md
---

### 2026-04-27 | Lead Developer | Claude Opus 4.6 | Admin Preparation Sessions Operational Risk Review

**Task:** Review the proposed 6-step operational risk sequence from the Admin Preparation Sessions Control Plan for technical soundness and safety. Deliver findings, verdict, revised sequence, and test plan. No code changes.

**Files touched:** Read-only review of 11 files (see frontmatter). No code modifications. Plan document written to `~/.claude/plans/as-lead-developer-reviewer-glittery-narwhal.md`.

**Key decisions:**

1. **Verdict: APPROVE WITH MODIFICATIONS** — sequence is fundamentally sound but has ordering errors and missing constraints.
2. **PREPARING cancel must return 409, not no-op 200.** User reconciliation rejected the original recommendation of treating PREPARING as terminal/no-op. PREPARING is an active state where cancel is an invalid action; 409 Conflict with explicit message is correct. `FinalJobId != null` remains idempotent 200 (truly terminal).
3. **Merge health counters into read-only list.** Original steps 2 (counters) and 4 (list) become a single Slice 2 with one `ListDraftsForAdminAsync` backend method.
4. **Split retention cleanup.** Report-only (safe before audit) vs. destructive (gated on same audit prerequisite as mutation UI).

**Open items:**

- 5 product decisions documented in plan: stale timeout UX, admin list default scope for hidden drafts, retention threshold value, audit infrastructure timeline, FinalJobId race lock strategy.
- Slice 0 implementation not started — approved and ready for a Senior Developer.

**Warnings:**

- `drainDraftQueue()` fires on every user GET of draft route (`route.ts:28`). Any new admin list endpoint that reuses this route will trigger recovery mutations, auto-confirm, and queue spawning. Admin reads MUST use a dedicated route with zero queue coupling.
- Once PREPARING cancel is blocked, the only user escape for a stuck draft is the 15-minute stale timeout (`STALE_RUNNING_THRESHOLD_MS` at `internal-runner-queue.ts:131`). UI must communicate this clearly — not silently hide the cancel button.
- `DraftStateJson` contains candidate claims, selected claims, observability, and failure diagnostics. Must not appear in any admin list response. Metadata-only projection required.
- No backend test project (`apps/api.Tests`) exists. Must be created before expanding draft service behavior (Slice 1).

**Learnings:** No new entries for `Role_Learnings.md` — this was a review task with no implementation surprises.

**For next agent:** Implement Slice 0: add `"PREPARING"` guard returning 409 in `CancelDraftAsync` at `ClaimSelectionDraftService.cs:338`, add `FinalJobId != null` guard as idempotent 200, update `canCancelSession` at `page.tsx:710` to exclude PREPARING with visible disabled state + "Preparation in progress" message. Full revised sequence (6 slices) and test plan are in `~/.claude/plans/as-lead-developer-reviewer-glittery-narwhal.md`. Apply `/debt-guard` before editing — this touches a state-machine gate.

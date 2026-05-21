---
roles: [Unassigned]
topics: [acs, claim_selection, session_resume, browser_close_recovery, session_ui, privacy, review]
files_touched:
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/web/src/app/analyze/ActiveClaimSelectionSessions.tsx
  - apps/web/src/app/analyze/page.tsx
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/src/app/api/fh/claim-selection-drafts/route.ts
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/cancel/route.ts
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/confirm/route.ts
  - apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route.ts
  - apps/web/src/lib/claim-selection-client.ts
  - apps/web/src/lib/claim-selection-draft-proxy.ts
  - apps/web/src/lib/claim-selection-flow.ts
  - apps/web/src/lib/config-schemas.ts
  - apps/web/configs/pipeline.default.json
  - apps/web/test/unit/lib/claim-selection-client.test.ts
  - apps/web/test/unit/lib/claim-selection-draft-proxy.test.ts
  - apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts
  - apps/web/test/unit/lib/claim-selection-flow.test.ts
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Browser_Close_Recovery_Review.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Browser-Close Recovery Review
**Task:** Review and harden the new same-browser/browser-close claim-selection session recovery flow before commit.

**Files touched:** `apps/api/Controllers/ClaimSelectionDraftsController.cs`; `apps/api/Services/ClaimSelectionDraftService.cs`; `apps/web/src/app/analyze/ActiveClaimSelectionSessions.tsx`; `apps/web/src/app/analyze/page.tsx`; `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `apps/web/src/app/api/fh/claim-selection-drafts/route.ts`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/cancel/route.ts`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/confirm/route.ts`; `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route.ts`; `apps/web/src/lib/claim-selection-client.ts`; `apps/web/src/lib/claim-selection-draft-proxy.ts`; `apps/web/src/lib/claim-selection-flow.ts`; `apps/web/src/lib/config-schemas.ts`; `apps/web/configs/pipeline.default.json`; `apps/web/test/unit/lib/claim-selection-client.test.ts`; `apps/web/test/unit/lib/claim-selection-draft-proxy.test.ts`; `apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts`; `apps/web/test/unit/lib/claim-selection-flow.test.ts`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Browser_Close_Recovery_Review.md`; `Docs/AGENTS/Agent_Outputs.md`

**Review findings addressed:**
- The initial browser-close recovery implementation persisted actual input previews into `localStorage`. That widened the durable client-side data surface more than needed. The stored session registry now keeps only generic labels (`Text session` / `URL session`), while the UI derives the real preview only from an authenticated live draft fetch.
- The resume surface rewrote the local session registry on every poll even when nothing changed. `ActiveClaimSelectionSessions.tsx` now compares the old and new registry snapshots before writing back, so queued/preparing polling no longer causes unnecessary persistent churn.

**Key decisions:** Browser-close recovery remains same-browser-profile only and still uses two separate authority layers: a scoped HttpOnly draft-access cookie for authentication continuity, and a non-sensitive local session registry for discoverability on `/analyze`. The idle auto-continue default was also raised to `900000` ms (15 minutes) via the existing UCM-backed `claimSelectionIdleAutoProceedMs` path, with no new timeout authority introduced.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/claim-selection-client.test.ts test/unit/lib/claim-selection-draft-proxy.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts test/unit/lib/claim-selection-flow.test.ts`
- `npm -w apps/web run build`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-persistent-session-build`

**Open items:** There is still no dedicated component test for `ActiveClaimSelectionSessions.tsx`, and there is still no API-side test project for direct .NET coverage of the session state machine. Those are residual test-depth gaps, not known functional defects in this slice.

**Warnings:** The repository still contains unrelated legal/docs edits and the separate session/job queue-recoverability slice in the working tree. I did not revert or absorb those unrelated changes.

**For next agent:** If this session-recovery path expands again, keep the privacy boundary explicit: persistent browser state should store only enough to rediscover the session, not the full claim/article text. Auth continuity should stay cookie-scoped to the draft proxy path, and terminal transitions must continue to clear that cookie.

**Learnings:** Same-browser browser-close recovery does not require persisting sensitive input previews. A generic local registry plus authenticated fetch-on-open is enough, and it keeps the persistent client-side footprint materially smaller.

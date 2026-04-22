# ACS UI Selection Flow Implementation

Date: 2026-04-22 21:56 Europe/Zurich
Author: Codex (unassigned)

## Scope

Implemented the ACS web UI slice that sits on top of the already-landed ACS-1 and ACS-CW-1 backend/runner work:

- analyze page now creates claim-selection drafts instead of direct jobs
- new Next proxy routes for draft create/get/confirm/restart/cancel/retry
- new `/analyze/select/[draftId]` waiting/selection page
- shared client helpers for input parsing and draft token / selection-mode persistence

Intentionally deferred:

- job page audit panel (`apps/web/src/app/jobs/[id]/page.tsx`)

## Files Added

- `apps/web/src/lib/analyze-input-client.ts`
- `apps/web/src/lib/claim-selection-client.ts`
- `apps/web/src/lib/claim-selection-draft-proxy.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/route.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/confirm/route.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/restart/route.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/cancel/route.ts`
- `apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/retry/route.ts`
- `apps/web/src/app/analyze/select/[draftId]/page.tsx`
- `apps/web/src/app/analyze/select/[draftId]/ClaimSelectionPanel.tsx`
- `apps/web/src/app/analyze/select/[draftId]/page.module.css`
- `apps/web/test/unit/lib/analyze-input-client.test.ts`
- `apps/web/test/unit/lib/claim-selection-client.test.ts`

## Files Updated

- `apps/web/src/app/analyze/page.tsx`

## Behavior

### Analyze page

- submit now posts to `/api/fh/claim-selection-drafts`
- `selectionMode` is persisted in `localStorage` as `fh_claim_selection_mode`
- returned `draftAccessToken` is persisted in `sessionStorage` and the user is routed to `/analyze/select/[draftId]`
- input parsing moved out of the page into `analyze-input-client.ts`

### Draft proxy routes

- create and restart apply the same `evaluateInputPolicy(...)` gate used by `/api/fh/analyze`
- non-admin flows forward `X-Draft-Token`
- admin flows forward `X-Admin-Key`
- all routes forward client IP / protocol to the API

### Selection page

- polls draft state until:
  - `AWAITING_CLAIM_SELECTION`
  - `COMPLETED` with `finalJobId`
  - terminal failure/cancel/expiry
- redirects to `/jobs/[id]` once `finalJobId` appears
- renders candidate claims in recommendation order
- preselects recommended claims / stored selected claims
- enforces max 5 selections client-side
- supports `Other` restart with the same text/URL parsing as initial submit
- automatic mode still routes through the page; if auto-confirm does not complete, the user can continue manually

## Verification

Passed:

- `cd apps/web; npx tsc --noEmit`
- `npm -w apps/web run build`
- `npm -w apps/web run test -- test/unit/lib/analyze-input-client.test.ts test/unit/lib/claim-selection-client.test.ts`

## Warnings / Open Items

- This pass did not implement the job-page audit panel from spec section 9.3.
- No end-to-end browser test was run; verification here is compile/build + focused unit tests only.
- The previously documented Bundesrat Stage 1 parity instability remains a separate pre-existing blocker for full ACS-1 acceptance sign-off; this UI slice does not address it.
- The worktree was already dirty from unrelated docs/index files before this task and remains dirty after it.

## Learnings

- The API intentionally hides original/active input values from non-admin draft reads, so the selection page cannot prefill the current input for token-only users; `Other` must start blank in that case.
- Session-storage draft tokens fit the current v1 contract well enough for in-session navigation, but cross-tab reuse remains the same known UX limitation discussed in the spec.

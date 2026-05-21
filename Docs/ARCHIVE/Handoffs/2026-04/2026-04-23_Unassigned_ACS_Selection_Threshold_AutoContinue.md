# ACS Selection Threshold Auto-Continue

Date: 2026-04-23 Europe/Zurich  
Author: Codex (unassigned)

## Scope

Applied the new ACS product rule:

- if Stage 1 yields **4 or fewer** atomic claims, FactHarbor continues directly into analysis
- if Stage 1 yields **5 or more** atomic claims, FactHarbor stops on the selection page and requires manual confirmation

This replaces the previous interactive-vs-automatic user choice on the analyze page.

## Files Updated

- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/src/app/analyze/page.tsx`
- `apps/web/src/app/analyze/select/[draftId]/page.tsx`

## Files Added

- `apps/web/src/lib/claim-selection-flow.ts`
- `apps/web/test/unit/lib/claim-selection-flow.test.ts`

## Behavior

### Runner

- `<= 4` candidate claims:
  - skips recommendation generation
  - persists a prepared snapshot with all candidate IDs selected
  - auto-confirms immediately into a job
- `>= 5` candidate claims:
  - still generates ranking / recommendation metadata
  - always leaves the draft in `AWAITING_CLAIM_SELECTION`
  - no longer auto-confirms even when the old draft mode was `automatic`

### Analyze page

- removed the old selection-mode toggle from the submit flow
- replaced it with explanatory copy describing the new count-based behavior

### Selection page

- when `>= 5` claims survive Stage 1, the normal selection checklist remains in place
- when `<= 4` claims are present in a recoverable `AWAITING_CLAIM_SELECTION` state, the page now shows a direct-continue flow instead of manual selection controls

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/claim-selection-flow.test.ts test/unit/lib/internal-runner-queue.test.ts test/unit/lib/analyze-input-client.test.ts test/unit/lib/claim-selection-client.test.ts test/unit/app/api/fh/claim-selection-drafts-routes.test.ts`
- `cd apps/web; npx tsc --noEmit`
- `npm -w apps/web run build`

## Warnings / Open Items

- Existing draft rows still carry `selectionMode` for backward compatibility, but new analyze submissions no longer expose that choice in the UI.
- The previously fixed draft-progress regression (`-1` observability events resetting displayed progress) remains part of the current uncommitted worktree and is covered by the same verification pass.

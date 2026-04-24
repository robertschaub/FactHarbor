# 2026-04-23 — ACS Default Interactive Mode via UCM

## Summary

Fixed the current `/analyze` submission bug where the web UI always created claim-selection sessions in `automatic` mode, which bypassed the manual Atomic Claim Selection dialog even when Stage 1 produced more than four candidate claims.

The effective default mode is now UCM-backed and defaults to `interactive`.

## What Changed

- Added `pipeline.claimSelectionDefaultMode` to the pipeline config contract in:
  - `apps/web/src/lib/config-schemas.ts`
  - `apps/web/configs/pipeline.default.json`
- Kept the default value `interactive`.
- Updated the draft-create proxy route `apps/web/src/app/api/fh/claim-selection-drafts/route.ts` to:
  - use an explicit client-provided `selectionMode` when present
  - otherwise load the effective pipeline config and apply `claimSelectionDefaultMode`
  - return the effective `selectionMode` in the proxy response
- Updated `apps/web/src/app/analyze/page.tsx` to:
  - stop hardcoding `selectionMode: "automatic"`
  - trust the server-returned effective `selectionMode`
  - store that effective mode in the local session registry
- Added a small copy fix in `apps/web/src/app/analyze/select/[draftId]/page.tsx` so the preparation screen no longer promises manual review for `automatic` sessions when the configured behavior is automatic continuation with recommendations.

## Verification

- `npm -w apps/web run test -- test/unit/app/api/fh/claim-selection-drafts-routes.test.ts test/unit/lib/claim-selection-flow.test.ts test/unit/lib/config-drift.test.ts test/unit/lib/claim-selection-client.test.ts`
- `npm -w apps/web run build`

## Outcome

- Default behavior is now:
  - `interactive` via UCM default
  - if candidate claims exceed the threshold, the AC Selection dialog appears
  - if the user takes no action for 15 minutes, the session auto-continues with the recommended/preselected claim set
- `automatic` remains available as a config-driven or future explicit override, but it is no longer forced by the web submit path.

## Warnings

- Existing sessions already created in `automatic` mode are unaffected.
- The change relies on the current pipeline config being available; on config-load failure, the proxy fails closed to `interactive`.

## Learnings

- The system-wide default was already `interactive` in the API entity/controller/runner layers; the regression was entirely in the web submit path.
- Making the proxy route authoritative for the effective selection mode is safer than resolving the default in the client, because it avoids first-load races and keeps the created session metadata aligned with the actual server decision.

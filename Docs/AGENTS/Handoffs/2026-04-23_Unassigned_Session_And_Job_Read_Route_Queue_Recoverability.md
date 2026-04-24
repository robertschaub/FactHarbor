## Task
Investigate why a queued analysis session and a long-running report both appeared stuck, and implement a recovery fix that works in the live Next/web runtime without requiring a manual restart.

## Why
Two symptoms appeared together:
- analysis session [5a6162785b434263852b513d37a159de](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx) remained `QUEUED` for hours even though session prep had its own runner lane
- report job `a5f79bc1d8e545ceab8d80dc3df0fe12` stayed `RUNNING` with no progress updates for roughly two hours

The underlying issue was not normal queue pressure. The background drain/watchdog path in [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts) was too fragile to be the only recovery mechanism in the current Next dev/runtime path, so stale `QUEUED` / `RUNNING` states could persist until some other explicit drain trigger happened.

## What Changed
- [apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts)
  - `GET` now issues a best-effort `drainDraftQueue()` kick before proxying the draft/session fetch.
  - This makes the session page self-healing while a user is actively watching a queued/preparing session.
- [apps/web/src/app/api/fh/jobs/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/jobs/route.ts)
  - `GET` now issues a best-effort `drainRunnerQueue()` kick before loading the reports list.
  - This gives the reports list a recovery pulse for stale `QUEUED` / `RUNNING` jobs.
- [apps/web/src/app/api/fh/jobs/[id]/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/jobs/[id]/route.ts)
  - `GET` now issues a best-effort `drainRunnerQueue()` kick before loading a specific job.
  - This is the strongest on-demand recovery point because the user is explicitly watching that job.
- [apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts)
  - Added coverage proving the draft/session GET route kicks `drainDraftQueue()`.
- [apps/web/test/unit/app/api/fh/jobs-routes.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/app/api/fh/jobs-routes.test.ts)
  - Added new route coverage proving the jobs list and single-job GET routes kick `drainRunnerQueue()`.

## Live Outcome
- The stuck session immediately recovered from `QUEUED` to `PREPARING`, then to `COMPLETED`.
- That same session auto-continued successfully and created final report job `fa4479acae2942f08a15981e2e47080b`.
- The previously stalled report job `a5f79bc1d8e545ceab8d80dc3df0fe12` advanced again from `36%` / stale timestamps to fresh progress updates (`58%`, then `60%`) once the jobs read routes began kicking runner recovery.

## Verification
- Live readback against the actual stuck session/job after the change:
  - session `5a6162785b434263852b513d37a159de` recovered from `QUEUED` to `PREPARING` and then `COMPLETED`
  - job `a5f79bc1d8e545ceab8d80dc3df0fe12` resumed fresh progress updates
- `npm -w apps/web run test -- test/unit/app/api/fh/claim-selection-drafts-routes.test.ts test/unit/app/api/fh/jobs-routes.test.ts`
- `npm -w apps/web run build`

## Warnings
- This fix makes UI-polled read routes part of the recovery path. That is intentional, but it means queue recovery is now partly demand-driven instead of purely timer-driven.
- The newly created final jobs remained `QUEUED` after session completion because the current local env still has `FH_RUNNER_MAX_CONCURRENCY=1` in [apps/web/.env.local](/c:/DEV/FactHarbor/apps/web/.env.local), so only one full report job can run at once. That is expected backpressure, not the original hang.
- This does not remove the value of the background watchdog. It hardens the system against cases where that watchdog is not enough on its own.

## Learnings
- Separate prep/job lanes were the right architectural change, but lane splitting alone does not guarantee liveness if the drain/watchdog mechanism is not dependable in the actual runtime.
- Session/report read routes are good recovery points because they are already polled by the exact user who is impacted by a stuck queue state.
- When investigating “hangs,” checking `updatedUtc` and the actual draft/job APIs is more reliable than inferring from page copy or progress badges alone.

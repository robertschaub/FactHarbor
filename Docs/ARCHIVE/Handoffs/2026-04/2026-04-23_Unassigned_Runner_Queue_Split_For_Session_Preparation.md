## Task
Split session preparation concurrency from full report-job concurrency so queued session preparation is not starved by long-running jobs.

## Why
The prior implementation used one shared `FH_RUNNER_MAX_CONCURRENCY` budget for both `drainRunnerQueue()` and `drainDraftQueue()`. Under load, sessions could sit in `QUEUED` for a long time before Stage 1 preparation even began, which meant users often would not reach atomic-claim selection in a timely way.

## What Changed
- [apps/web/src/lib/internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts)
  - Added `resolveRunnerConcurrencyBudget()` and split the lanes into:
    - `jobMaxConcurrency`
    - `draftPreparationMaxConcurrency`
  - Jobs now use `FH_RUNNER_JOB_MAX_CONCURRENCY` when set, otherwise fall back to legacy `FH_RUNNER_MAX_CONCURRENCY`.
  - Session preparation now uses `FH_RUNNER_PREP_MAX_CONCURRENCY` when set, otherwise defaults to a dedicated prep lane of `1`.
  - `DraftQueueState` now tracks its own `runningCount`; draft workers no longer consume the job lane counter.
- [apps/web/test/unit/lib/internal-runner-queue.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/internal-runner-queue.test.ts)
  - Added pure tests for concurrency-budget resolution and fallback behavior.
- [apps/web/test/unit/lib/runner-concurrency-split.integration.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/runner-concurrency-split.integration.test.ts)
  - Added integration coverage proving:
    - a session-preparation worker can start while the job lane is full
    - a report job can start while the prep lane is already busy
- [apps/web/.env.example](/c:/DEV/FactHarbor/apps/web/.env.example)
  - Documented the new split-lane env vars and clarified that `FH_RUNNER_MAX_CONCURRENCY` is now the legacy/shared fallback for the job lane if the explicit job-lane env var is unset.

## Verification
- `npm -w apps/web run test -- test/unit/lib/internal-runner-queue.test.ts test/unit/lib/runner-concurrency-split.integration.test.ts test/unit/lib/drain-runner-pause.integration.test.ts`
- `npm -w apps/web run build`

## Warnings
- This change intentionally makes the prep lane active even if only the legacy `FH_RUNNER_MAX_CONCURRENCY` env var is configured. In that case, jobs continue using the legacy value and prep defaults to `1`, so total parallel work can increase by one lane after restart.
- This is an infrastructure/runtime change. The new split takes effect only after the web runner process is restarted.

## Learnings
- The right product boundary is still “session first, report job later.” The better fix was not to expose queued sessions in the global reports list, but to stop prep work from being blocked behind report-job capacity.
- For this queue module, state assertions are more robust than mock-call-count assertions because `vi.resetModules()` plus hoisted mocks can easily give stale mock handles while the actual queue behavior is still correct.

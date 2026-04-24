# Senior Developer Handoff - Runner Diagnostics and Pipeline Improvements

**Date:** 2026-04-24  
**Role:** Senior Developer / LLM Expert  
**Branch:** `main`  
**Key commits:** `9b2d726d`, `ef9a3b05`, `ba39b52e`

## Summary

Implemented and validated several issues found during live monitor/pipeline inspection:

- Stage 2 now reuses exact same-run relevance classifications and emits an explicit `budget_exceeded` warning when contradiction research hits its time budget.
- Prepared Stage 1 failures now preserve failure history for retry diagnosis.
- ClaimBoundary reports now use a real markdown formatter instead of the stub.
- Report markdown now keeps `info` diagnostics out of user-facing `Quality Signals` and records them only as an admin diagnostic count.
- Verdict validation no longer emits stale pre-repair direction warnings after a successful repair.
- Runner scheduling now uses an API-side SQLite-transaction claim endpoint before starting analysis, so `FH_RUNNER_MAX_CONCURRENCY` is enforced across web worker/process contexts instead of only in process-local memory.

## Validation

- `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts test/unit/lib/analyzer/verdict-stage.test.ts`
- `npm -w apps/web run test -- test/unit/lib/internal-runner-queue.test.ts test/unit/lib/drain-runner-pause.integration.test.ts test/unit/lib/runner-concurrency-split.integration.test.ts`
- `npm -w apps/web run build`
- `npm test`
- `dotnet build apps\api\FactHarbor.Api.csproj --no-restore -p:UseAppHost=false -o %TEMP%\factharbor-api-build-check`
- `.\scripts\restart-clean.ps1` after each committed runtime-affecting slice; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

## Live Validation

- Clean post-commit job `d1689dfbd8ff46d98e76730bfd16fafb` executed on `ba39b52eef22336235aa6acafc8a0cb6c4191241+1586b2ba`.
- Result: `LEANING-TRUE`, truth `68`, confidence `70`, status `SUCCEEDED`.
- The report markdown no longer contains the previous stub and no longer exposes `info` diagnostics in `Quality Signals`.
- `analysisWarnings` contained 13 admin diagnostics, 0 user-visible warnings; the markdown showed `No user-visible quality warnings were emitted.` and `Admin diagnostic signals: 13`.
- Remaining `verdict_direction_issue` on that run was legitimate citation-guard normalization, not the stale pre-repair mismatch warning.
- Live queue after the runner-claim fix showed exactly one `RUNNING` job and queued follow-ups, matching `FH_RUNNER_MAX_CONCURRENCY=1`.

## Warnings

- Older jobs submitted before `ba39b52e` should not be treated as clean validation for the final runner-claim slice, even if they later execute under the newer runtime.
- Local `.env.local` sets `FH_RUNNER_MAX_CONCURRENCY=1`; queue latency is expected unless Captain chooses to raise that local setting.
- The in-app browser was navigated to the jobs/detail UI and DOM snapshots verified the view, but CDP screenshot capture started timing out in the browser plugin after restart.
- `claimNeedsPrimarySourceRefinement()` still contains deterministic token-overlap text-meaning logic. Do not extend it; replace with a batched LLM coverage assessment in a separate quality-affecting change.

## Learnings

- Use an API/SQLite transaction for runner slot claims. Process-local `globalThis` state is not sufficient for concurrency limits when Next/web route contexts can be rehydrated after restart.
- For live multilingual submissions on Windows, continue using Node/UTF-8 submission paths or Unicode escapes; PowerShell inline POSTs can corrupt non-ASCII validation inputs.
- When the API service is running, compile checks should use a temp output path because the live process locks `bin\Debug\net8.0` assemblies.
- Report markdown must apply the warning-display policy: `info` is admin-only and should not appear in user-facing quality-warning sections.

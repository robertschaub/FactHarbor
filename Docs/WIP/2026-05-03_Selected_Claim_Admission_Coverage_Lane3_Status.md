# Selected Claim Admission Coverage Lane 3 Status

Date: 2026-05-03
Branch: `codex/integrate-selected-claim-admission-coverage`
Base lane: `codex/integrate-acs-observability-contracts`

This document records the current-branch Lane 3 re-authoring result. It is not a cherry-pick from `C:\DEV\FactHarbor-main-regression`; the implementation was manually rebuilt on top of the clean Lane 2 observability/contracts branch.

## Problem Addressed

Selected AtomicClaims could previously reach final analysis with no provider search attempted in the final job, especially when selected-claim count exceeded the practical Stage 2 research budget. Seeded preliminary evidence and queryless iterations could make the pipeline appear to have "covered" a selected claim even though the final job never searched for it.

The required invariant is now:

- every selected claim admitted into a final job must fit the persisted admission cap; and
- every selected claim that enters verdict eligibility must have at least one provider search attempt in final-job Stage 2, otherwise it is surfaced as zero acquisition and held to `UNVERIFIED`.

## Implemented In This Lane

- Added budget-aware claim-selection admission plumbing in web UCM defaults and runtime config:
  - `claimSelectionBudgetAwarenessEnabled`
  - `claimSelectionBudgetFitMode`
  - `claimSelectionEstimatedMainResearchMsPerClaim`
  - `claimSelectionMinRecommendedClaims`
  - `contradictionProtectedTimeMs`
- Added `getBudgetAwareClaimSelectionCap(...)` as structural plumbing over configured budget, protected contradiction time, and candidate count. It does not inspect claim text and does not create a second semantic selector.
- Persisted `selectionAdmissionCap` through prepared Stage 1 provenance, draft state, selection metadata, and final job claim-selection JSON.
- Applied the admission cap consistently across:
  - automatic recommendations
  - interactive selection UI
  - idle auto-proceed
  - web runner validation
  - public/internal draft confirmation
  - final C# draft-to-job creation
  - retry job metadata preservation
- Added final C# admission enforcement in `JobService.CreateJobFromDraftAsync`:
  - selected IDs must be non-empty
  - selected IDs must be unique
  - selected IDs must be a subset of prepared candidate IDs
  - selected count must fit `min(selectionCap, selectionAdmissionCap, 5, candidateCount)`
- Preserved prepared Stage 1 and claim-selection metadata on retry jobs, so retries no longer lose the selected-claim contract.
- Updated Stage 2 selected-claim coverage semantics to count provider search attempts, not only targeted/queryless iteration entries.
- Reworked zero-yield exhaustion to be per claim, so one claim's no-yield path does not globally stop selected-claim coverage.
- Added explicit selected-claim not-run reasons for query-budget and time-budget exhaustion before search.
- Added `selected_claim_zero_acquisition` as a registered degrading warning. Stage 4 eligibility now requires provider search attempts for each selected claim; claims with zero provider search become `UNVERIFIED` instead of entering verdict debate from seeded evidence alone.
- Extended ACS research observability with `searchAttemptCount` and `budget_exhausted` sufficiency state.

## Explicitly Not Implemented Here

- No prompt wording changes.
- No deterministic semantic ranking, filtering, or text classification.
- No Stage 1 atomicity or extraction-quality repair.
- No Stage 4 verdict, citation, direction, or confidence repair.
- No prepared-routing/applicability lane.
- No idle auto-proceed default change to 15 minutes.
- No live validation jobs have been submitted yet from this lane.

## Review Result

Read-only review disposition: approve.

Reviewer found no P0-P3 issues, no accidental prompt changes, no new deterministic semantic selector, and no admission-cap bypass across reviewed manual, automatic, internal/admin auto-confirm, retry, runner, or prepared-job paths. The zero-acquisition warning was accepted as aligned with the verdict-impact rule because it prevents unsupported verdict debate and forces an `UNVERIFIED` path.

## Verification

Passed:

- `git diff --check`
- `npm -w apps/web test -- claim-selection-flow.test.ts runner-concurrency-split.integration.test.ts claimboundary-pipeline.test.ts`
- `npm -w apps/web test -- claimboundary-prepared-stage1.test.ts`
- `npm test`
- `npm -w apps/web run build`
- `dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj --filter "FullyQualifiedName~ClaimSelectionDraftServiceTests" -c Release --no-restore`
- `dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj -c Release --no-restore`
- `dotnet build apps/api/FactHarbor.Api.csproj -c Release --no-restore`

The first broad `npm test` run exposed one isolated mock drift in `claimboundary-prepared-stage1.test.ts`. The production code was kept; the mock was amended to expose `getClaimProviderSearchAttemptCount`, then the isolated file and full safe web suite passed.

## Expected Live-Job Effects

- SVP-like inputs with many AtomicClaims should no longer analyze all selected candidates beyond the effective admission cap.
- Final reports should expose selected claims with zero final-job provider search as `UNVERIFIED` with zero-acquisition diagnostics, not as apparently supported verdicts.
- Automatic mode and interactive mode should remain equivalent after final selected IDs are confirmed, except for the structural admission cap limiting how many recommendations/selections are admitted.
- The branch should improve interpretability and prevent unsupported selected-claim verdicts, but it is not expected to fix Bolsonaro/asylum verdict-direction regressions that likely belong to held Stage 1/Stage 4 quality lanes.

## Residual Risks And Follow-Ups

- The default budget estimate is conservative and empirical. Live canaries should confirm whether an effective cap of 3 under the current 600s/120s budget is the right tradeoff.
- Direct API cold jobs can still create `direct-api` submissions without a prepared ACS draft. This lane enforces draft-backed selection contracts and final selected-claim coverage; direct API routing into ACS remains a separate route-governance question if direct public submissions must never bypass preparation.
- Historical reports lack `searchAttemptCount`, `selectionAdmissionCap`, and the new zero-acquisition reason fields.
- Bolsonaro atomicity and verdict-confidence regressions remain out of scope for this lane.

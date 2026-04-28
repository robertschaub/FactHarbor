# 2026-04-28 - Senior Developer - ACS Validation Slices 2-3 Implementation

## Summary

Implemented the next ACS validation tooling slices from `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md`.

The shared ACS validation client now emits schema v2 summaries from passive draft/job/result data. Supported validation scripts now use that client instead of duplicating polling or relying on stale result shapes.

## Files Touched

- `apps/web/scripts/automatic-claim-selection.js`
- `scripts/validation/extract-validation-summary.js`
- `scripts/run-validation-matrix.js`
- `apps/web/scripts/baseline-runner.js`
- `scripts/validation/captain-approved-families.json`
- `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md`

Slice 1 quarantined direct-caller labels remain part of the same implementation stream.

## Implemented

- Added schema v2 summary extraction:
  - `submissionPath: "acs-automatic-draft"`;
  - draft/job IDs and statuses;
  - prepared, ranked, recommended, not-recommended, not-selected, explicit deferred, and selected claim counts/IDs;
  - verdict, truth percentage, confidence, claim verdict count, ClaimAssessmentBoundary count, evidence count, source count, warnings;
  - read-if-present Stage 2 telemetry from `resultJson.analysisObservability.acsResearchWaste.selectedClaimResearch` and `.contradictionReachability`.
- Made validation jobs report summaries only after a final `SUCCEEDED` job with parseable `resultJson`.
- Kept `AWAITING_CLAIM_SELECTION`, failed draft states, failed jobs, interrupted jobs, missing result JSON, and unavailable metadata as structured non-OK outcomes.
- Migrated `extract-validation-summary.js`, `run-validation-matrix.js`, and `baseline-runner.js` to the shared client.
- Added `scripts/validation/captain-approved-families.json` with the exact current Captain-approved inputs from `AGENTS.md`.
- Normalized matrix fixtures so both legacy `id`/`text` and Captain-approved `familyName`/`inputValue` shapes can be consumed without submitting undefined input.

## Reviewer Disposition

Reviewer found four issues:

- P1 matrix fixture shape mismatch: fixed by structural fixture normalization.
- P2 `INTERRUPTED` was not terminal: fixed in `TERMINAL_JOB_STATUSES`.
- P3 stale extractor usage text: fixed.
- P3 stale `submissionPath` spec sentence: fixed.

Reviewer re-check reported no remaining blockers. A cosmetic matrix console label was also fixed.

## Verification

Passed:

- `node --check apps/web/scripts/automatic-claim-selection.js`
- `node --check scripts/validation/extract-validation-summary.js`
- `node --check scripts/run-validation-matrix.js`
- `node --check apps/web/scripts/baseline-runner.js`
- mocked Node behavior checks for schema v2 extraction, admin metadata parsing, `AWAITING_CLAIM_SELECTION`, `INTERRUPTED`, missing result JSON, nonterminal jobs, and final `SUCCEEDED` summary generation.
- VM fixture-normalization check for `scripts/validation/captain-approved-families.json` producing 8 valid normalized rows.
- `npm -w apps/web run build`
- `git diff --check` with only the pre-existing `scripts/submit-hydrogen-job.ps1` CRLF warning.
- Focused runner tests that timed out under full-suite contention:
  - `npm -w apps/web exec vitest run test/unit/lib/drain-runner-pause.integration.test.ts`
  - `npm -w apps/web exec vitest run test/unit/lib/runner-concurrency-split.integration.test.ts`

Not clean:

- `npm test` was clean earlier in the implementation, but after the reviewer amendments it repeatedly failed in unrelated runner/search/admin test files with timeout/global-mock symptoms. The affected runner tests pass directly. `apps/web/src/lib/internal-runner-queue.ts` is already dirty from another agent and was not touched here.

## Warnings

- Do not submit live jobs from this patch until the safe-suite failure is resolved or explicitly accepted as unrelated flake by Captain/reviewer.
- No prompt changes, analyzer changes, direct-full reruns, or additional LLM/search work were added.
- API-level `/v1/analyze` governance remains a follow-up outside this stream.

## Learnings

The validation thin waist works best when it refuses to summarize incomplete work: draft/job/result failures should be structured outcomes, while comparable schema v2 summaries should require a completed report job and passive metadata extraction only.

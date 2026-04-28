# 2026-04-28 - Senior Developer - ACS Validation Slice 1 Implementation

## Summary

Implemented Slice 1 from `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md`.

The supported validation thin waist now has a structured shared client surface in `apps/web/scripts/automatic-claim-selection.js`. Existing callers that use `submitAutomaticDraftAndWaitForJob` keep the prior behavior, while new validation automation can use `submitAutomaticValidationJob` for:

- `submissionPath: "acs-automatic-draft"`;
- automatic ACS draft creation;
- structured draft outcomes, including `AWAITING_CLAIM_SELECTION`;
- optional final-job waiting;
- admin-aware final job detail fetch;
- visible `metadataUnavailable` / `metadataUnavailableReason` when metadata cannot be read.

Direct endpoint scripts were labeled in place as quarantined validation tooling. This is policy labeling only, not runtime enforcement.

## Files Touched

- `apps/web/scripts/automatic-claim-selection.js`
- `scripts/Benchmarks/phaseA_search_experiment.py`
- `scripts/Benchmarks/phase1_experiment.py`
- `scripts/inverse-scope-regression.ps1`
- `scripts/run-regression.ps1`
- `scripts/submit-hydrogen-job.ps1`
- `scripts/run-baseline.ps1`
- `apps/web/test/scripts/regression-test.js`

## Verification

- `node --check apps/web/scripts/automatic-claim-selection.js`
- `node --check apps/web/test/scripts/regression-test.js`
- `python -m py_compile scripts/Benchmarks/phaseA_search_experiment.py scripts/Benchmarks/phase1_experiment.py`
- PowerShell parser checks for all touched `.ps1` files
- Inline mocked Node behavior checks for:
  - structured `AWAITING_CLAIM_SELECTION`;
  - legacy wrapper still throwing on `AWAITING_CLAIM_SELECTION`;
  - admin job-detail header forwarding;
  - failed final jobs returning `ok: false`;
  - intentionally disabled final-job fetch reporting `metadataUnavailable`.
- `git diff --check -- <touched files>` exited `0`; it reported the existing line-ending warning for `scripts/submit-hydrogen-job.ps1`.
- `npm test`
- `npm -w apps/web run build`

## Warnings

- No live jobs were submitted. Slice 5 remains the first live-canary slice and still requires commit, restart/reseed, UCM capture, and Captain-approved inputs.
- Supported validation scripts are not migrated yet. Slice 2 should add Tier 1 schema v2 metadata extraction; Slice 3 should migrate supported scripts to the shared client.
- `/v1/analyze` and `/api/fh/analyze` still exist. API provenance/governance remains the documented follow-up, not part of Slice 1.
- Quarantined scripts are labeled but still executable if someone runs them manually.

## Learnings

The lowest-overhead shared-client shape is additive: keep the old helper contract stable, add structured validation outcomes beside it, and let migration happen one supported script at a time. That avoids an immediate behavior flip while still making unsupported direct callers visible.

## Next

Start Slice 2: add passive schema v2 Tier 1 metadata extraction in the shared client from `PreparedStage1Json`, `ClaimSelectionJson`, and current result/job fields. Keep it read-only and avoid extra LLM calls, searches, or direct reruns.

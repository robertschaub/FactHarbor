---
roles: [Senior Developer]
topics: [acs, validation, slice4, historical_mapping]
files_touched:
  - apps/web/scripts/automatic-claim-selection.js
  - apps/web/scripts/baseline-runner.js
  - scripts/run-validation-matrix.js
  - scripts/validation/captain-approved-families.json
  - scripts/validation/compare-batches.js
  - scripts/validation/extract-validation-summary.js
  - apps/web/test/unit/scripts/validation-historical-references.test.ts
  - Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md
  - Docs/AGENTS/Handoffs/2026-04-28_Senior_Developer_ACS_Validation_Slice4_Historical_Mapping.md
  - Docs/AGENTS/Agent_Outputs.md
---

# ACS Validation Slice 4 Historical Mapping

**Task:** Complete read-only historical direct-reference mapping before any further ACS live canary.

**Done:**

- Added `historicalDirectReference` metadata to all 8 current Captain-approved validation families.
- Marked 7 references as `same-day-direct` and `bundesrat_eu_bevor` as `stale-direct` because it is the best exact-input direct comparator in the local Jobs inventory.
- Carried historical references through the shared ACS validation summary, batch manifest rows, baseline output, and validation matrix rows.
- Updated `compare-batches.js` to read schema v2 top-level fields while preserving compatibility with older nested `article.*` / `claims` summaries.
- Added a focused fixture test that proves the approved-family fixture has exactly 8 mapped read-only direct references.
- Updated the ACS validation deployment spec with the completed fixture mapping and separated URL triage references from the Captain-approved fixture.

**Decisions:**

- Historical references remain passive comparator metadata only.
- No direct reruns, direct-full mode, prompt changes, analyzer changes, or additional live jobs were introduced.
- Fresh ACS canary remains deferred until this slice is committed, services are restarted/reseeded as needed, active UCM is captured, and Captain-approved inputs are selected for Slice 5.

**Warnings:**

- This slice does not fix the ACS selected-claim research-distribution issue. It makes future review output cheaper and clearer.
- The first `npm test` attempt failed because it was run in parallel with `next build`; the exact failing runner suites then passed directly, and the full safe suite passed when rerun sequentially. Do not run `npm test` and `npm -w apps/web run build` in parallel for gate evidence.

**For next agent:** Start Slice 5 only after commit/runtime refresh. Use the shared ACS validation client, capture UCM, and treat zero-iteration selected claims as reported pipeline-quality findings, not tooling blockers.

**Learnings:** The cheapest historical comparator is a fixture row tied to a known job ID. Putting that metadata in the Captain-approved family fixture avoids a new execution path and keeps review output auditable.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend
Rejected path and why: direct rerun or a new lookup script would add a second validation mechanism and violate the simplified spec.
What was removed/simplified: no runtime mechanism removed; historical comparison now travels with existing fixture/summary data instead of separate manual notes.
What was added: passive `historicalDirectReference` fixture rows and schema-v2 summary/output propagation.
Net mechanism count: unchanged
Budget reconciliation: touched only validation tooling/docs/tests; no analysis behavior, prompt/config, direct endpoint, or live-job path was added.
Verification: JSON parse check; Node syntax checks for touched scripts; focused fixture Vitest; schema-summary smoke check; `npm test` sequential pass; `npm -w apps/web run build` pass; independent reviewer approved.
Debt accepted and removal trigger: stale comparator for `bundesrat_eu_bevor`; replace only when a clean same-day direct historical job already exists or Captain explicitly authorizes a new comparator strategy.
Residual debt: ACS budget-aware selection and selected-claim research distribution remain separate quality follow-ups.

---
roles: [Lead Architect]
topics: [pipeline-rebuild, analyzer-v2, legacy-runners, result-readers, live-jobs]
files_touched:
  - apps/web/scripts/result-metrics-reader.js
  - apps/web/scripts/baseline-runner.js
  - apps/web/test/scripts/regression-test.js
  - apps/web/test/unit/scripts/live-runner-result-readers.test.ts
---

### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2H Legacy Live Runner Readers

**Task:** Close the remaining Slice 2 result-read compatibility question for legacy live-job scripts after Captain authorized up to 8 live jobs but asked to use the budget wisely.

**Files touched:**
- `apps/web/scripts/result-metrics-reader.js`
- `apps/web/scripts/baseline-runner.js`
- `apps/web/test/scripts/regression-test.js`
- `apps/web/test/unit/scripts/live-runner-result-readers.test.ts`

**Done:**
- Added `apps/web/scripts/result-metrics-reader.js:41`, a shared CommonJS structural reader that classifies only result schema shape (`v2`, `legacy-v1`, `unknown`) and extracts runner metrics without semantic interpretation.
- Added V2 canonical reads at `apps/web/scripts/result-metrics-reader.js:61`: `verdict.label`, `verdict.truthPercentage`, `verdict.confidence`, `claims.atomicClaims`, and `boundaries.claimAssessmentBoundaries`.
- Preserved legacy V1 ClaimAssessmentBoundary reads at `apps/web/scripts/result-metrics-reader.js:75` and unknown historical `article*` behavior at `apps/web/scripts/result-metrics-reader.js:91`.
- Made `apps/web/scripts/baseline-runner.js:13` import-safe by loading `BASELINE_TEST_CASES` only inside `runBaseline()`, using the shared reader at `apps/web/scripts/baseline-runner.js:81`, and adding the `require.main` guard/export at `apps/web/scripts/baseline-runner.js:162`.
- Routed `apps/web/test/scripts/regression-test.js:75` through the shared reader and exported `extractMetrics` at `apps/web/test/scripts/regression-test.js:253` for fixture tests.
- Added fixture-backed coverage in `apps/web/test/unit/scripts/live-runner-result-readers.test.ts:27` for import safety, V2 canonical reads, legacy V1 reads, unknown historical article fields, and regression-script routing.

**Key decisions:**
- Deputy team plus two external Claude Opus advisory reviews converged on Option B: small pure/offline Slice 2H, no live runs, then proceed to Slice 3.
- The orphan caveat did not trigger: `baseline-runner.js` is still exposed by `apps/web/package.json` as `test:baseline`, and `regression-test.js` remains documented under `apps/web/test/README.md`.
- The 8-job live budget was not spent. It should be saved for a later V2 shell/parity gate where runtime evidence is meaningful.
- These scripts remain legacy/manual/expensive surfaces. This slice only prevents known-bad direct result-shape reads; it does not promote either script to an official V2 validation gate.

**Verification:**
- `npm -w apps/web test -- --run test/unit/scripts/live-runner-result-readers.test.ts`
- `node --check apps/web/scripts/result-metrics-reader.js; node --check apps/web/scripts/baseline-runner.js; node --check apps/web/test/scripts/regression-test.js`
- `node -e "require('./apps/web/scripts/baseline-runner.js'); require('./apps/web/test/scripts/regression-test.js'); console.log('import-ok')"`
- `npm -w apps/web run build`
- `npm test`
- `git diff --check`
- Scope guard: zero diff lines under `apps/web/src/lib/analyzer`, `apps/web/prompts`, `apps/web/src/app/api/internal/run-job`, `apps/web/src/lib/internal-runner-queue.ts`, and `apps/api`.

**Open items:** Slice 3 remains next: create a disabled-by-default V2 shell/routing seam with V1 protected. No live jobs have been used from the newly approved budget.

**Warnings:**
- Do not run `npm run test:baseline` or `apps/web/test/scripts/regression-test.js` casually; both submit live jobs and contain stale/non-Captain-defined test inputs.
- The new reader is intentionally structural. Do not extend it with verdict interpretation, content classification, keyword matching, or language-dependent logic.
- While applying this slice, an initial patch landed in the original checkout because the patch tool has no working-directory argument. That accidental edit was removed, and `C:\DEV\FactHarbor` was verified clean before continuing in `C:\DEV\FactHarbor-pipeline-rebuild-spec`.

**For next agent:** Start Slice 3 with the live-job budget still at 8. Add only a disabled V2 shell/routing seam first, keep V1 default/hot path protected, and use live jobs only after there is a runtime-relevant V2 or V1 smoke target. Do not make legacy live runners official validation gates.

**Learnings:** No Role_Learnings entry appended. The only reusable lesson is operational and local to this handoff: when using Codex `apply_patch` across multiple worktrees, use absolute file paths or verify target checkout immediately.

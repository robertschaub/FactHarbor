# Handoff: V2 W6-D2 Runtime Page-Summary Fan-In Implementation

**Date:** 2026-05-21
**Role:** Lead Developer
**Model:** Codex GPT-5.5
**Scope:** `Docs/WIP/2026-05-21_V2_Slice_W6-D_Retrieval_Refinement_Source_Material_Fan_In_Review_Package.md`
**Status:** implementation verifier-clean, commit pending
**Predecessor:** W6-D1 contract widening commit `1abfacf9`

## Summary

Implemented W6-D2 as bounded same-provider Wikimedia page-summary fan-in through the existing W3-B Source Material runtime owner path. The runtime now selects up to three structurally eligible, distinct W3-A materialized Wikimedia page-summary locators in existing candidate order, fetches them sequentially through the approved page-summary transport, and emits multiple bounded Source Material records for the already-widened W6-D1 downstream contracts.

This is not true source/provider diversity. It is a limited retrieval-refinement step intended to test whether the W6-C `refine_retrieval` stop from W6-C5 improves when W6 receives a small, bounded evidence set from the existing Wikimedia path.

## Implementation Delta

- `SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN` is now `3`.
- `runEvidenceLifecycleSourceMaterialPageSummaryDecision(...)` now selects up to three eligible locators by structural criteria only:
  - W3-A materialized preview id is accepted;
  - locator is eligible for W3-B fetch;
  - `locatorRef` and encoded title path segment are present;
  - provider/locator/page-key hash combination is unique;
  - existing candidate order is preserved.
- The W3-B owner fetches selected locators sequentially with attempt ordinals `1..n`.
- Successful runs record `attemptedFetchCount`, `sourceMaterialRecordCount`, and `fetchDiagnosticCount` as the actual selected count.
- Transport or record-construction failure remains fail-closed and returns the diagnostics collected so far; no retry path was added.
- W4-D shell validation now accepts the W6-D1 fan-in cap through the W4-C admission boundary without importing W4-A readiness directly.
- Focused W3-B owner tests now prove three distinct page summaries are fetched in existing candidate order and that a fourth candidate is not included.

## Boundaries Preserved

- No live job or canary was run.
- No second provider, endpoint family, retries, semantic ranking, keyword filtering, topic-specific logic, parser execution, full page/source/html fetch, cache/SR/storage, public behavior, prompt/model/config/schema edit, report/verdict/warning/confidence behavior, ACS/direct URL support, V1 work, or V1 cleanup was added.
- Default admin/public/log/error surfaces remain subject to the existing text/raw-payload leakage guards.
- W6-D2 reuses the existing W3-B Source Material owner and W6-D1 contracts rather than adding a parallel fan-in route.

## Verification

Passed:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

Result details:

- Focused W6-D2 owner/shell tests: 2 files / 7 tests passed.
- Focused runtime owner chain: 8 files / 21 tests passed.
- Analyzer V2 runtime slice: 73 files / 342 tests passed.
- Analyzer V2 orchestrator slice: 2 files / 8 tests passed.
- Analyzer V2 evidence-lifecycle slice: 43 files / 214 tests passed.
- Boundary guard: 1 file / 94 tests passed.
- `npm run debt:sensors`: `advisory_warn`; salient warnings remain V2 source/test/boundary-guard/docs footprint, net-mechanism telemetry, and older consolidation-marker warnings.
- Build passed after a TypeScript narrowing amendment in W4-D shell validation.

## Failed-Attempt Recovery

Boundary guard first rejected a direct W4-D shell import from W4-A readiness. Classified as `keep/amend`: the fan-in validation was correct, but the dependency belonged behind the W4-C admission boundary. The fix re-exported the fan-in cap from W4-C admission and made W4-D import only W4-C. Build then caught an `unknown` numeric comparison in the same validation path; classified as `keep/amend` and fixed with explicit `Number.isInteger(...)` narrowing.

## DEBT-GUARD RESULT

**Classification:** incomplete-existing-mechanism / bounded runtime fan-in.

**Chosen option:** amend the existing W3-B page-summary owner and W4-D validation in place.

**Rejected path:** add a parallel fan-in owner/route, update boundary guard to permit broader dependencies, introduce retries, expand providers/endpoints, raise caps, or prompt around W6-C.

**What was removed/simplified:** no old mechanism removed; W4-D dependency was narrowed back to W4-C ownership.

**What was added:** bounded locator selection/dedupe and sequential fetch loop inside the existing W3-B owner, plus focused test coverage.

**Net mechanism count:** unchanged provider/route/public mechanisms; existing runtime owner now handles `1..3` records.

**Budget reconciliation:** stayed inside approved W6-D2 source/test envelope plus minimal status/handoff/index docs. No prompt/model/config/schema/public/live behavior was changed.

**Debt accepted/removal trigger:** same-provider fan-in may still leave W6-C at `refine_retrieval`; if the W6-D canary still stops there, next work should pivot to query/source diversity rather than further W6 prompt repair.

## V2 SCORECARD IMPACT

Advances report-quality prerequisites by feeding W6 with a bounded, more balanced evidence set through the existing source-material chain. W6-D2 is still infrastructure until a product-route canary proves whether W6-C moves beyond the W6-C5 `refine_retrieval` stop.

## V2 RETIREMENT LEDGER IMPACT

Increases retirement pressure on the single-page-summary W3-B/W4/W5 canary path as the main sufficiency proof path. No retirement is complete until a W6-D canary demonstrates that multi-record fan-in is the better baseline.

## V2 CONSOLIDATION GATE

Passed for W6-D2. This is not a new denial/proof layer and not a new source provider. It reuses the existing W3-B owner and W6-D1 contracts with a hard cap of three fetches.

## Next

Commit W6-D2 as a focused package. After the commit, the next low-risk step is a W6-D product-route canary package/preflight: clean status, runtime refresh from the W6-D2 commit, hidden route auth/no-store/default-redaction checks, live-job ledger update, and exactly one Captain-defined input canary. No W6-D canary has run yet.

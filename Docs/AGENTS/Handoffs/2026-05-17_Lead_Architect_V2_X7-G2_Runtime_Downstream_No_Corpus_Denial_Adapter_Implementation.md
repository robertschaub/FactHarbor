# V2 X7-G2 Runtime Downstream No-Corpus Denial Adapter Implementation

**Date:** 2026-05-17
**Role:** Lead Architect / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** implementation-complete; review-ready
**Source package:** `Docs/WIP/2026-05-17_V2_Slice_X7-G2_Runtime_Downstream_No_Corpus_Denial_Adapter_Source_Package.md`

## Summary

Implemented X7-G2 inside the approved source package envelope. The implementation closes the X7-F/C0-S3 result-ownership gap before runtime downstream denial mapping:

- X7-F execution-gate results are now producer-marked by `hidden-direct-text-source-acquisition-execution-gate.ts` and inspected through a dedicated producer-owned provenance sidecar.
- C0-S3 parsed-material denial results are now producer-marked by `source-acquisition-parser-admission-parsed-material-denial.ts` and inspected through a dedicated producer-owned provenance sidecar.
- The pure X7-G1 downstream-denial core now has an additive strict structural no-corpus input for runtime adapter consumption without accepting runtime-owned result objects directly.
- The hidden runtime adapter maps only producer-owned X7-F/C0-S3 denial outputs through the pure core and keeps all downstream analytical/public fields null or false.

The adapter rejects copied, JSON-round-tripped, structured-cloned, reconstructed, malformed, positive-looking, or post-mark-mutated inputs. It does not execute source acquisition, parser work, downstream semantic LLM tasks, product/public wiring, live jobs, cache IO, Source Reliability, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.

## Files Changed

Source:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Docs/status:

- `Docs/WIP/2026-05-17_V2_Slice_X7-G2_Runtime_Downstream_No_Corpus_Denial_Adapter_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-G2_Runtime_Downstream_No_Corpus_Denial_Adapter_Implementation.md`
- `Docs/AGENTS/index/handoff-index.json` after index rebuild

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 7 files, 100 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> 34 files, 201 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 73 files, 510 tests passed.
- `npm -w apps/web run build` -> passed.
- `npm run validate:v2-gates` -> passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` -> passed.
- `git diff --check` -> passed.

Not run:

- Expensive LLM suites.
- Live jobs.
- B3/OCI positive proof.

## Review Focus

Architect/Security/Code/LLM review should inspect only X7-G2:

- producer-owned sidecars reject copies/reconstruction/mutations and do not change serialized result shapes;
- only X7-F and C0-S3 producers import their owner-only mark APIs;
- runtime adapter imports reader APIs only and never imports X7-F/C0-S3 producers directly;
- pure `analyzer-v2` core does not import `analyzer-v2-runtime`;
- all downstream analytical/public outputs remain null or false;
- no source/provider/search/fetch/parser execution, product/public/live wiring, cache/SR/storage, evidence/report/verdict behavior, or prompt/config/model/schema edits were introduced.

## Open Items

- X7-G2 is not live-smoke readiness. Live jobs remain blocked until a separate reviewed live-smoke/readiness package.
- Source execution, parser execution, parsed material, EvidenceCorpus/EvidenceItems, and product/public V2 exposure remain blocked by later gates.
- 2D-C remains blocked until a positive deployment-candidate rootless OCI proof is accepted and a separate source package approves parser work.

## DEBT-GUARD RESULT

**Classification:** failed-attempt recovery in new adapter test helper; production implementation was not implicated.
**Chosen option:** amend the existing test helper expectation.
**Rejected path and why:** adding a `sourceMaterial` field to the pure core would expand production contract solely to satisfy an incorrect test.
**What was removed/simplified:** removed the incorrect helper expectation that pure `coreDenial` contains `sourceMaterial: undefined`.
**What was added:** explicit assertions for the existing pure-core downstream fields (`applicabilityInput`, `extractionInput`, `sufficiencyInput`, `boundaryInput`, `verdictInput`, `evidenceCorpus`, `evidenceItems`, `warnings`, `report`, `publicOutput`) being null.
**Net mechanism count:** unchanged.
**Budget reconciliation:** one approved test file changed; no new code path, flag, fallback, retry, or helper was added.
**Verification:** focused verifier passed after the amendment, followed by broader Analyzer V2 runtime, Analyzer V2, build, gate validators, and diff hygiene.
**Debt accepted and removal trigger:** none.
**Residual debt:** none from the failed verifier. X7-G2 remains hidden plumbing; live-smoke and execution gates remain separate future packages.

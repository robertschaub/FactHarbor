# 2026-05-18 — Lead Developer — V2 X7-W4-A Source Material To EvidenceCorpus Readiness Implementation

## Summary

Implemented X7-W4-A inside the approved package envelope from
`Docs/WIP/2026-05-18_V2_Slice_X7-W4-A_Source_Material_EvidenceCorpus_Readiness_Source_Package.md`.

W4-A now adds the first hidden/admin-only Source Material to EvidenceCorpus readiness/denial gate:

- pure `analyzer-v2` structural readiness core under `evidence-lifecycle/evidence-corpus/`;
- W3-B Source Material runtime provenance sidecar with post-mark mutation rejection;
- hidden runtime owner that accepts only producer-owned W3-B decisions;
- bounded in-memory readiness artifact sink;
- authenticated internal no-store artifact route;
- product V2 hidden observability wiring after W3-B.

The readiness artifact is text-free. It carries only bounded structural summaries, hash/length metadata, status enums, and closed downstream flags. It keeps `extractionInput: null`, `evidenceCorpus: null`, `evidenceCorpusBuildAuthorized: false`, and `evidenceItems: []`.

## Files Changed

Production:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness-guard.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Docs/status:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- generated handoff index

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts/route.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `npm -w apps/web run build`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `git diff --check`

No W4-A live job was run or proposed.

## Scope And Non-Goals Preserved

W4-A does not create or authorize:

- EvidenceCorpus;
- EvidenceItems;
- parser output;
- extraction input;
- report/verdict/warning/confidence behavior;
- public behavior;
- cache/SR/storage;
- retries;
- provider expansion;
- W2 endpoint migration;
- ACS/direct URL behavior;
- V1 work or V1 cleanup.

Existing X7-B absence-path guard tests remain in the focused verifier set and continue to pass.

## Debt-Guard Result

Classification: failed-verifier recovery, test-maintenance timeout plus TypeScript narrowing.

Chosen option: amend existing mechanisms.

Rejected path and why: no production workaround, fallback, or new mechanism was added. The boundary failures were timeout metadata on existing heavy scans; the build failure was TypeScript not retaining existing structural validation narrowing.

What was removed/simplified: none.

What was added: W4-A implementation and tests; timeout metadata for three existing heavy boundary scans; explicit local string bindings inside the readiness validator.

Net mechanism count: W4-A adds the approved readiness gate; recovery changes themselves are mechanism-neutral.

Budget reconciliation: actual recovery stayed within `boundary-guard.test.ts` and the existing readiness validator.

Verification: focused W4-A tests, boundary guard, runtime suite, analyzer-v2 suite, build, gate validators, whitespace check.

Debt accepted and removal trigger: boundary guard remains expensive. A later guard-performance cleanup can split repeated transitive scans or centralize graph caches, but that was not part of W4-A.

Residual debt: none blocking W4-A. Next slice should remain separately reviewed before EvidenceCorpus construction or Source Material widening.

## Next Safe Options

Recommended next decision package:

1. W3-C source-material sweep if the team wants more distribution evidence before corpus design; or
2. W4-B EvidenceCorpus source-material admission design package if the next value is defining the first real corpus record contract.

Do not start either as implementation without a reviewed package.

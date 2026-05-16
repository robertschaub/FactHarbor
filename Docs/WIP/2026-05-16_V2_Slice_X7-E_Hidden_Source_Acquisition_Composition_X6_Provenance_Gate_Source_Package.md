# V2 Slice X7-E Hidden Source-Acquisition Composition X6 Provenance Gate Source Package

**Date:** 2026-05-16
**Status:** implemented as a narrow follow-up to X6-P and X7-D
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `3aec48b8` (`feat: add v2 x6 provenance guard`)
**Parent gates:** X6-P hidden candidate-acquisition provenance; X7-D hidden source-acquisition readiness composition
**Reason:** X6-P added runtime-owned X6 result identity, while X7-D still needed to consume that reader before claiming copied-X6 rejection.
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X7-E updates the hidden X7-D source-acquisition readiness composition so it accepts only an X6 result object that was returned by the X6 runtime owner in the current process.

The gate now distinguishes:

- runtime-owned X6 results returned by `runHiddenDirectTextCandidateAcquisitionHarness(...)`;
- spread copies;
- JSON round trips;
- structured clones;
- exact-shape reconstructed objects.

Copied or reconstructed X6 inputs fail closed as `x6_not_runtime_owned` before X7-A source-material readiness or X7-C provider-network readiness is evaluated.

## 2. Implementation Boundary

### 2.1 Allowed Production File

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.ts`

Allowed production change:

- import only `readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(...)` from the X6-P provenance sidecar;
- add the blocked reason `x6_not_runtime_owned`;
- require the reader to accept the X6 input before the existing completed/public-cutover/candidate-runtime checks continue.

X7-E must not import the X6 harness runner, candidate runtime, transport/factory, provider SDK, network/content/parser owners, cache/storage/Source Reliability, product/public surfaces, prompt/config/model/schema files, ACS/direct URL code, or V1 code.

### 2.2 Allowed Tests

- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Focused test intent:

- copied runtime-owned X6 via spread fails `x6_not_runtime_owned`;
- JSON-round-tripped X6 fails `x6_not_runtime_owned`;
- structured-cloned X6 fails `x6_not_runtime_owned`;
- malformed X6 still fails as `x6_malformed`;
- blocked owned X6 still fails as `x6_not_completed`;
- public-cutover-open owned X6 remains blocked;
- boundary guard allows only the sidecar reader import and no mark function or runner import in production X7-D.

## 3. Explicit Non-Goals

X7-E does not:

- create or run X6;
- change X6 candidate-acquisition behavior;
- change X6-P ownership semantics;
- introduce durable provenance across JSON, storage, IPC, or process restart;
- run provider-network transport or factory code;
- run real network/search/fetch;
- create source material;
- create extraction input;
- build an evidence corpus;
- generate EvidenceItems, warnings, reports, verdicts, confidence, or public output;
- wire product/orchestrator/runner/API/UI/report/export paths;
- submit live jobs;
- touch cache IO, durable storage, or Source Reliability;
- edit prompts, configs, models, schemas, or UCM defaults;
- execute ACS prepared snapshots or direct URLs;
- reuse or clean V1 code.

## 4. Debt-Guard Decision

Classification: `incomplete-existing-mechanism`.

The existing X6-P sidecar was the right mechanism but X7-D had not yet consumed it. The lowest-complexity correction was to amend X7-D's existing classifier, not add another ownership marker, not refactor X6, and not create a new test helper/runtime path.

Accepted residual debt: the X7-D unit test uses the exported owner marker to build an owned unit fixture. This is bounded by production boundary guards proving only the X6 harness imports the marker in product source, while the X6-P harness test separately proves real X6 runtime outputs are marked and copied objects are not owned.

## 5. Verification Passed

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
```

Results:

- Focused X7-E/X6-P/boundary suite: 3 files, 73 tests passed.
- Analyzer V2 runtime unit slice: 27 files, 165 tests passed.
- Analyzer V2 unit slice: 65 files, 460 tests passed.
- Web build passed; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

No live jobs were run. No expensive real-LLM suites were run.

## 6. Stop Conditions Still Active

Stop and return to deputy/Captain review if a later change needs:

- provider-network execution;
- source material population;
- extraction;
- evidence-corpus building;
- product/public/live wiring;
- live jobs;
- cache IO, durable storage, or Source Reliability;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 7. Rollback

Rollback is simple:

- remove the X6-P sidecar reader import from X7-D;
- remove `x6_not_runtime_owned` from the X7-D blocked reasons;
- remove the copied-X6 rejection test and boundary-guard import allowance.

This restores X7-D to the previous structural-only X6 validation and leaves X6-P itself untouched.

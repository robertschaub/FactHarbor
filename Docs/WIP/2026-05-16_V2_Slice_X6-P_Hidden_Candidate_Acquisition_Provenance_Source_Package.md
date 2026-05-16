# V2 Slice X6-P Hidden Candidate-Acquisition Provenance Source Package

**Date:** 2026-05-16
**Status:** deputy-reviewed and implemented under narrowed sidecar consensus
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `4fd26c0f` (`feat: add v2 source acquisition readiness composition`)
**Parent gate:** X6 hidden direct-text candidate-acquisition harness
**Reason:** X7-D documented that copied/JSON-equivalent X6 result provenance cannot be rejected until X6 owns runtime result identity.
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X6-P adds in-process runtime-owner provenance for X6 hidden candidate-acquisition harness results.

It does not change candidate acquisition behavior. It only lets later hidden consumers distinguish:

- an X6 result object returned by `runHiddenDirectTextCandidateAcquisitionHarness(...)`;
- a spread copy, JSON round trip, structured clone, or shape-equivalent forged object.

X6-P is not a source-execution gate. It does not run provider-network transport/factory, real network/search/fetch, source material, extraction, evidence corpus, product/public/live wiring, cache/storage/Source Reliability, prompt/config/model/schema changes, ACS/direct URL execution, V1 reuse, or V1 cleanup.

## 2. Deputy Review Outcome

The deputy debate approved the hardening only after narrowing:

- add a provenance-only sidecar;
- keep the sidecar free of candidate-runtime, network/content/parser, cache/SR/storage, product/public, provider SDK, prompt/config/model/schema, and V1 imports;
- mark all X6 harness results inside the X6 owner;
- export reader/validator functions for later hidden consumers;
- do not edit X7-D in this slice;
- keep the X7-D reader integration as a separate tiny follow-up gate.

## 3. Implementation Boundary

### 3.1 Allowed Production Files

New file:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance.ts`

Edited file:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts`

Allowed sidecar exports:

- `HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult`
- `markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(...)`
- `isHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(...)`
- `readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(...)`

The mark function is owner-only. Boundary guards must prove only the X6 harness imports it.

### 3.2 Allowed Tests

Edited focused test:

- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts`

Existing guard:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

### 3.3 Allowed Documentation

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X6-P_Hidden_Candidate_Acquisition_Provenance.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

## 4. Runtime Contract

X6-P uses a module-private `WeakSet<object>`.

Only X6 runtime owner code marks results:

- completed X6 outputs are runtime-owned;
- blocked X6 outputs are runtime-owned;
- spread copies are not runtime-owned;
- JSON-round-tripped copies are not runtime-owned;
- structured clones are not runtime-owned;
- malformed or mutated owned objects fail the sidecar reader's shape/current-state validation.

The marker must not be visible through:

- `Object.keys(...)`;
- `JSON.stringify(...)`;
- public result JSON;
- report output.

## 5. Explicit Non-Goals

X6-P does not:

- edit X7-D;
- make X7-D reject copied X6 yet;
- create durable provenance across JSON, storage, IPC, or process reload;
- harden X5;
- change X6 provider invocation, statuses, blocked reasons, allowlist behavior, candidate runtime decisions, public envelope, or test-injected-only policy;
- add product/public/live behavior.

## 6. Verification Requirements

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by X6-P.

## 7. Stop Conditions

Stop and return to deputy/Captain review if implementation requires:

- editing X7-D in this slice;
- candidate runtime/envelope changes;
- provider-network transport/factory execution;
- real network/search/fetch;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or canaries;
- cache IO, durable storage, or Source Reliability;
- prompt/config/model/schema edits;
- ACS prepared snapshot or direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup;
- visible object branding, object freezing/sealing, forge helpers, or test-only minting helpers.

## 8. Rollback

Rollback is simple:

- remove the provenance sidecar;
- remove the X6 mark calls;
- remove focused provenance tests and boundary-guard additions;
- public behavior remains unchanged.

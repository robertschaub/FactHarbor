# V2 Slice 7E Evidence Task Policy Contract Source Package

**Date:** 2026-05-15
**Status:** draft for review; no source implemented yet
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `c22ab0a1` (`docs: define v2 evidence task policy ownership`)
**Prerequisite package:** `Docs/WIP/2026-05-15_V2_Slice_7D_Evidence_Task_Policy_Snapshot_Ownership_Package.md`
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Implement a shared, non-executable Evidence Lifecycle task-policy contract that makes the current 7C static policy snapshot explicitly owner-bound without introducing runtime authority.

7E may extract the static symbolic policy snapshot from source acquisition into an Evidence Lifecycle task-policy contract module and make 7C consume that module. It must remain non-executable.

This must be an ownership move, not a duplicate layer. After 7E, source acquisition must not keep an independent private static policy representation.

## 2. Source Envelope

Allowed source files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

No other files are in scope unless review explicitly adds them.

## 3. Contract Behavior

7E may add:

- `EVIDENCE_TASK_POLICY_SNAPSHOT_VERSION`;
- `EvidenceTaskPolicySnapshot`;
- `EvidenceTaskPolicyPlannedTask`;
- `EvidenceRetrievalPolicyCatalogEntry`;
- `buildStaticEvidenceTaskPolicySnapshot()`;
- `readStaticEvidenceRetrievalPolicyCatalog()`.

Required behavior:

- snapshot source remains `static_contract_only`;
- policy status remains `not_executable`;
- planned tasks are symbolic labels only;
- retrieval policy catalog is fixed, complete, and non-executable;
- source-language-first is recorded only as future policy intent;
- cache policy remains `no_store_no_read`;
- provider execution remains `not_wired`;
- prompt/model execution remains `not_approved`;
- public exposure remains `forbidden`;
- Source Reliability integration remains `thin_port_pending`;
- 7C `SourceAcquisitionRequest` consumes the shared static policy builder instead of owning a private copy.

Required ownership move:

- move policy snapshot/version/task/catalog types out of `source-acquisition/types.ts` into `task-policy/types.ts`;
- `source-acquisition/types.ts` may import or alias the task-policy contract types, but must not define an independent policy shape;
- move `PLANNED_TASKS`, `RETRIEVAL_POLICY_CATALOG`, and `buildPolicySnapshot()` out of `source-acquisition/request.ts`;
- `source-acquisition/request.ts` must consume `buildStaticEvidenceTaskPolicySnapshot()`.

## 4. Explicitly Forbidden

7E must not add:

- real gateway task IDs;
- prompt profile or prompt section IDs;
- provider IDs or model IDs;
- UCM/default JSON changes;
- live singleton policy reads;
- approval pointers or activation states beyond `not_executable`;
- cache keys, cache reads, cache writes, storage IO;
- prompt rendering or model calls;
- provider/search/fetch imports;
- Source Reliability imports, cache lookups, or evaluations;
- public API/UI/report/export changes;
- orchestrator/product wiring;
- live jobs;
- V1 analyzer/prompt/type reuse or cleanup.

## 5. Boundary Guards To Add Or Preserve

`boundary-guard.test.ts` must prove the new task-policy folder is inert:

- exact allowed file list under `evidence-lifecycle/task-policy/`;
- no V1 analyzer imports;
- no prompt loader/model adapter/runtime dispatch imports;
- no provider SDK imports;
- no search/fetch/provider implementation imports;
- no cache/storage/config IO imports;
- no analyzer-v2-runtime imports;
- no Source Reliability imports;
- no public API/UI/report/export imports;
- no test/mock/fixture imports in production source.

The existing source-acquisition guard must continue to pass.

## 6. Focused Tests

Required tests:

- static task-policy snapshot exactly matches non-executable contract values;
- retrieval policy catalog is complete and fixed;
- snapshot/catalog are stable across repeated calls and are defensive copies;
- source-acquisition request uses the shared policy snapshot;
- source-acquisition policy/catalog invariance tests from 7C still pass;
- no real gateway/prompt/provider/model identifiers appear in the static snapshot.
- source-acquisition no longer owns private static policy constants or builders.

## 7. Verification

Minimum verification after implementation:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `npm -w apps/web run build`
- `git diff --check`

No live jobs are meaningful for 7E.

## 8. Non-Goals

7E does not:

- approve runtime task policy;
- design UCM storage;
- activate evidence prompts or models;
- implement source acquisition;
- create `EvidenceCorpus`;
- run sufficiency;
- expose V2 public output;
- touch Source Reliability implementation;
- remove V1.

## 9. Review Questions

Reviewers should answer:

1. Is extracting 7C static policy into a shared task-policy contract worth doing now?
2. Does making 7C consume the shared static policy increase or reduce mechanism complexity?
3. Is the file scope narrow enough?
4. Are the forbidden authority fields explicit enough?
5. Is Captain escalation needed before 7E implementation?

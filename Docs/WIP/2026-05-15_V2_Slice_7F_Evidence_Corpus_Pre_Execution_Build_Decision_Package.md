# V2 Slice 7F Evidence Corpus Pre-Execution Build Decision Package

**Date:** 2026-05-15
**Status:** implemented at `b8a97413` (`feat: add v2 evidence corpus build decision`)
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `f7be0e06` (`docs: record v2 evidence task policy handoff`)
**Prerequisite source gate:** 7E `d9d25ef7` (`feat: add v2 evidence task policy contract`)
**Source package approval:** deputy-team approved after adding separate `notBuiltReason` and `blockedReason` fields
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the next non-executable Evidence Lifecycle boundary after source-acquisition request and task-policy ownership.

7F may add an internal **Evidence Corpus build-decision / pre-execution handoff** that consumes `SourceAcquisitionStartDecision` and records why a real `EvidenceCorpus` has not been built yet.

7F must not create a real empty corpus. Pre-execution is not evidence scarcity.

## 2. Review Consolidation

Deputy-team debate result: **adopt with strict naming and shape constraints**.

Consensus:

- 7F is the right next gate after 7E.
- The implementation must be named and shaped as a build decision or pre-execution handoff.
- Do not create an `EvidenceCorpus` object, stub, or empty arrays before acquisition/extraction has actually run.
- `evidenceCorpus` must be `null` in all 7F states.
- Ready-but-non-executable source acquisition maps to a not-built pre-execution state.
- Blocked source acquisition maps to a blocked pre-execution state.
- Captain escalation is not required for docs plus inert source under this envelope.

Captain/deputy escalation remains required before runtime authority, real corpus population, provider/search/fetch execution, prompt/model/schema/UCM changes, cache IO, Source Reliability integration, public exposure, orchestrator wiring, ACS/direct URL execution, live jobs, or V1 cleanup.

## 3. Source Envelope

Allowed source files for the later source implementation:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed documentation files:

- this WIP package;
- status/guardrail/handoff updates after implementation.

No other files are in scope unless review explicitly adds them.

## 4. Contract Shape

7F may add:

- `EVIDENCE_CORPUS_BUILD_DECISION_VERSION`;
- `EvidenceCorpusBuildDecision`;
- `EvidenceCorpusNotBuiltReason`;
- `EvidenceCorpusBuildBlockedReason`;
- `buildEvidenceCorpusPreExecutionDecision(...)`.

Recommended status values:

- `not_built_pre_execution`;
- `blocked_pre_execution`.

Required ready-but-non-executable state:

- `decisionVersion`: 7F build-decision version;
- `visibility`: `internal_only`;
- `executionScope`: `contract_only_no_corpus_execution`;
- `status`: `not_built_pre_execution`;
- `notBuiltReason`: `source_acquisition_not_executable`;
- `blockedReason`: `null`;
- `evidenceCorpus`: `null`;
- `claimContract`: exact reference from `SourceAcquisitionRequest.claimContract`;
- `sourceAcquisitionRequestVersion`;
- `sourceAcquisitionStatus`;
- `taskPolicySnapshot`: exact non-executable snapshot from `SourceAcquisitionRequest.policySnapshot`;
- `retrievalPolicyCatalog`: exact non-executable catalog from `SourceAcquisitionRequest.retrievalPolicyCatalog`.

Required blocked state:

- `status`: `blocked_pre_execution`;
- `notBuiltReason`: `null`;
- `evidenceCorpus`: `null`;
- carry upstream source-acquisition status and blocked reason;
- no claim contract fabrication if the upstream decision has no request.

Required fail-closed malformed-ready states:

- missing request -> `source_acquisition_request_missing`;
- missing claim contract -> `claim_contract_missing`;
- missing task-policy snapshot -> `task_policy_provenance_missing`;
- missing retrieval policy catalog -> `retrieval_policy_catalog_missing`.

## 5. Explicitly Forbidden

7F must not add:

- a real `EvidenceCorpus` object;
- `sources: []`, `evidenceItems: []`, `warnings: []`, `qualityGates: []`, or similar empty arrays that can be mistaken for completed research;
- evidence scarcity, low-evidence, no-evidence, source-collapse, sufficiency, confidence, or warning materiality outcomes;
- query planning, search query generation, search calls, fetch calls, parsing, extraction, applicability, sufficiency, boundary formation, verdict, aggregation, report, or compatibility projection;
- provider/search/fetch imports;
- prompt rendering or model calls;
- model adapter, prompt loader, runtime dispatch, gateway policy mutation, or approval flips;
- UCM/default JSON changes or config storage reads;
- cache keys, cache reads, cache writes, storage IO;
- Source Reliability imports, cache lookups, evaluation calls, score fields, or verdict influence;
- public API/UI/report/export changes;
- orchestrator/product wiring;
- ACS/direct URL execution;
- live jobs;
- V1 analyzer/prompt/type reuse or V1 cleanup.

## 6. Semantic Boundary

7F is structural only.

It must not infer anything from:

- claim text;
- detected language;
- selected AtomicClaim count;
- retrieval policy names;
- source language policy labels;
- source type, provider, rank, URL, or domain.

The retrieval policy catalog entry `evidence_scarcity_handling` is only future policy metadata. It must not become a warning, scarcity classification, quality signal, or sufficiency result in 7F.

## 7. Boundary Guards To Add Or Preserve

`boundary-guard.test.ts` must prove the new `evidence-corpus/` folder remains inert:

- exact allowed file list under `evidence-lifecycle/evidence-corpus/`;
- no V1 analyzer imports;
- no prompt loader/model adapter/runtime dispatch imports;
- no provider SDK imports;
- no search/fetch/provider implementation imports;
- no cache/storage/config IO imports;
- no analyzer-v2-runtime imports;
- no Source Reliability service/cache imports;
- no public API/UI/report/export imports;
- no orchestrator/product imports;
- no test/mock/fixture imports in production source.

The existing intake, source-acquisition, and task-policy guards must continue to pass.

## 8. Focused Tests

Required tests:

- ready `SourceAcquisitionStartDecision` produces `not_built_pre_execution`;
- ready state uses `notBuiltReason: source_acquisition_not_executable` and `blockedReason: null`;
- ready state has `evidenceCorpus: null`;
- ready state preserves the exact `ClaimContract` reference;
- ready state preserves task-policy snapshot/provenance and retrieval-policy catalog from the source-acquisition request;
- blocked source-acquisition decision produces `blocked_pre_execution` with `evidenceCorpus: null`;
- malformed ready decisions missing request, claim contract, task-policy snapshot, or retrieval catalog fail closed;
- no evidence arrays, source arrays, warnings, scarcity fields, sufficiency fields, Source Reliability signals, report fields, or public fields are populated;
- different claim text and detected language produce the same pre-execution status and reason except copied structural fields;
- boundary guard blocks provider/search/fetch/prompt/model/cache/SR/public/orchestrator/V1 imports.

## 9. Verification

Minimum verification after source implementation:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `npm -w apps/web run build`
- `git diff --check`

No live jobs are meaningful for 7F.

Implementation verification on `b8a97413`:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 3 files / 53 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 30 files / 241 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

## 10. Non-Goals

7F does not:

- execute source acquisition;
- build an evidence corpus;
- define final evidence item/source schemas;
- run sufficiency;
- integrate Source Reliability;
- choose retrieval policies from claim semantics;
- change prompts, models, schemas, UCM, cache, UI, reports, or public APIs;
- clean or remove V1.

## 11. Review Questions

Reviewers should answer:

1. Does the package avoid fake empty-corpus semantics?
2. Are the status and blocked-reason names clear enough?
3. Is the source envelope narrow enough for immediate implementation after approval?
4. Are the forbidden fields strong enough to prevent evidence scarcity or sufficiency leakage?
5. Is Captain escalation needed before this contract-only implementation?

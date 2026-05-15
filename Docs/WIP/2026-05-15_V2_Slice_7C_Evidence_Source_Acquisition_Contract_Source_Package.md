# V2 Slice 7C Evidence Source Acquisition Contract Source Package

**Date:** 2026-05-15
**Status:** draft for review; no source implemented yet
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `6e1ad528` (`docs: draft v2 evidence source gate`)
**Prerequisite package:** `Docs/WIP/2026-05-15_V2_Slice_7B_Evidence_Source_Acquisition_Task_Policy_Approval_Package.md`
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Implement only the first non-executable Evidence Lifecycle source-acquisition contract.

7C may define how an accepted `EvidenceLifecycleStartDecision` becomes a non-executable `SourceAcquisitionRequest`. It must not perform source acquisition, search, fetch, prompt rendering, model calls, cache IO, Source Reliability calls, public result exposure, or orchestrator wiring.

## 2. Source Envelope

Allowed source files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

No other source/test files are in scope unless review explicitly adds them.

## 3. Contract Behavior

The source slice may add:

- `SOURCE_ACQUISITION_REQUEST_VERSION`;
- `SourceAcquisitionRequest`;
- `SourceAcquisitionStartDecision`;
- `SourceAcquisitionBlockedReason`;
- `EvidenceAcquisitionPolicySnapshot`;
- `RetrievalPolicyPlan`;
- `buildSourceAcquisitionRequest(...)`.

Required behavior:

- accepted `EvidenceLifecycleStartDecision.status === "intake_ready"` produces an internal-only, non-executable `SourceAcquisitionRequest`;
- the request carries the exact `EvidenceLifecycleIntake.claimContract`;
- the request records the intake version, run id, selected AtomicClaim IDs, current date, detected language, policy snapshot, retrieval policy plan, and source-acquisition status;
- blocked Evidence Lifecycle decisions produce no request;
- malformed ready decisions with a missing intake or missing claim contract fail closed;
- direct URL and ACS execution remain unimplemented unless later gates explicitly approve them;
- public pre-cutover envelope and hidden diagnostics are not accepted as input.

## 4. Policy Snapshot Limits

7C may define a static non-executable `EvidenceAcquisitionPolicySnapshot` only.

Allowed fields:

- source: `static_contract_only`;
- policy status: `not_executable`;
- symbolic planned task keys/status labels for query planning, applicability, extraction, and sufficiency;
- retrieval policy catalog listed by name only;
- cache policy: `no_store_no_read`;
- provider execution: `not_wired`;
- prompt/model execution: `not_approved`;
- public exposure: `forbidden`;
- source reliability integration: `thin_port_pending`.
- source-language policy: `source_language_first_planned_not_executable`.

Forbidden:

- UCM/default JSON changes;
- live singleton policy reads;
- gateway approval flips;
- real gateway task IDs, prompt profile IDs, provider IDs, or model IDs as routing authority;
- concrete prompt text or prompt rendering;
- cache keys, cache reads, cache writes, or storage IO.

## 5. Retrieval Policy Plan Limits

7C must list retrieval policies structurally:

- baseline research;
- primary-source refinement;
- contradiction search;
- supplementary language lane;
- evidence scarcity handling.

It must not decide semantically which policy is needed. Any future semantic retrieval-policy choice must be made by an approved LLM task/prompt policy, not deterministic rules.

The 7C request builder must always include the complete static policy-name catalog as `planned_not_executable` / `static_contract_only`. It must not accept a caller-supplied retrieval plan, and it must not inspect claim wording to choose policies.

Language handling in 7C is also non-executable. The request may copy detected language from the accepted intake, but it must not route by language, force translation, default to English, or choose sources/language lanes from claim text. Source-language-first behavior is recorded only as future policy intent.

## 6. Source Reliability Boundary

7C may only record that Source Reliability integration is pending a thin port.

Forbidden in 7C:

- importing existing SR service/cache/admin modules;
- performing SR cache lookup or evaluation;
- carrying SR numerical influence into source acquisition or verdict math;
- hardcoding source weights, domains, outlets, countries, or languages.

## 7. Boundary Guards To Add

`boundary-guard.test.ts` must prove the new source-acquisition folder remains contract-only:

- exact allowed file list under `evidence-lifecycle/source-acquisition/`;
- no V1 analyzer imports;
- no prompt loader/model adapter/runtime dispatch imports;
- no provider SDK imports;
- no search/fetch/provider implementation imports;
- no cache/storage/config IO imports;
- no analyzer-v2-runtime imports;
- no Source Reliability service/cache imports;
- no public API/UI/report/export imports;
- no test/mock/fixture imports in production source.

## 8. Focused Tests

Required tests:

- ready intake creates a `source_acquisition_ready_not_executable` decision with a request;
- request carries the exact `ClaimContract` reference from `EvidenceLifecycleIntake`;
- blocked Evidence Lifecycle decision creates no request;
- malformed ready decision with missing intake or claim contract fails closed;
- request policy snapshot is `not_executable`, `no_store_no_read`, `not_wired`, and `thin_port_pending`;
- retrieval policy catalog contains the complete static policy-name list and does not depend on claim text;
- two different claim statements produce the same policy snapshot and retrieval policy catalog;
- non-English and English inputs produce the same policy snapshot and retrieval policy catalog, with only copied structural fields such as detected language allowed to differ.

## 9. Verification

Minimum verification after implementation:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `npm -w apps/web run build`
- `git diff --check`

No live jobs are meaningful for 7C.

## 10. Explicit Non-Goals

7C does not:

- run query planning;
- generate search queries;
- call search providers;
- fetch source content;
- parse source content;
- extract evidence;
- call Source Reliability;
- build `EvidenceCorpus`;
- run sufficiency;
- wire orchestrator/product execution;
- expose public V2 output;
- change prompt/model/schema/UCM config;
- clean or remove V1.

## 11. Review Questions

Reviewers should answer:

1. Is the source envelope narrow enough for immediate implementation?
2. Are the proposed contract names and status values clear?
3. Is the fixed complete retrieval-policy catalog specified tightly enough to avoid hidden policy selection?
4. Is the static non-executable policy snapshot useful, or should 7C omit it entirely until UCM/task-policy ownership is decided?
5. Are there any Captain-level decisions before this contract-only implementation?

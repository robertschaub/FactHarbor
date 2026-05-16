# V2 Slice X7-C Hidden Provider-Network Readiness Source Package

**Date:** 2026-05-16
**Status:** deputy-reviewed and approved for implementation; initial deputy debate returned `MODIFY`, this revision incorporated the required tightening, and deputy re-review returned `APPROVE`
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `9335a11a` (`feat: add v2 source material corpus guard`)
**Parent gate:** X7-B hidden source-material / evidence-corpus negative guard
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X7-B proves that absent or invalid source material cannot be treated as evidence-corpus-buildable input. The next useful direct-text step is to make the existing 7N-3B2 provider-network authority visible to the hidden direct-text chain as **readiness only**, without running network IO.

X7-C must answer one narrow question:

> Given an already-created 7N-3B2 provider-network authority plus endpoint and budget snapshots, and given X7-A/X7-B source-material absence input, can we prove the provider-network setup is structurally present while still non-executable and zero-cost?

X7-C is not source acquisition. It must not execute network/search/fetch, call provider SDKs, dereference source/content URLs, create source material, populate EvidenceItems or evidence corpus, run parser/content logic, emit warnings/verdict/confidence/report fields, wire product/public/live paths, use cache/storage/Source Reliability, edit prompt/config/model/schema files, handle ACS/direct URL execution, reuse V1 analyzer/prompt/type/code, or clean V1.

## 2. Current Context

- 7N-3B2 already implements hidden/internal provider-network authority, structural endpoint/budget snapshots, SDK-free Node HTTPS transport, and a factory that can adapt transport results into hidden candidate-provider output.
- X6 does not use 7N-3B2 network execution; it uses a test-injected candidate provider boundary only.
- X7-A proves X6 candidates are not source material, not evidence, and not extraction input.
- X7-B adds the downstream negative guard proving absent or invalid source material is not corpus-buildable.

The gap is not a missing transport. The gap is an explicit hidden readiness contract that lets future packages distinguish:

- provider-network policy/snapshot readiness;
- provider-network execution;
- candidate records;
- source material;
- evidence corpus input.

## 3. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice X7-C under `Docs/WIP/2026-05-16_V2_Slice_X7-C_Hidden_Provider_Network_Readiness_Source_Package.md`, limited to one hidden/internal provider-network readiness owner that validates existing 7N-3B2 network authority, endpoint snapshot, budget snapshot, and X7-A/X7-B source-material absence input as structurally present but non-executable and zero-cost. No transport/factory execution, no real network/search/fetch, no provider SDK, no content dereference, no parser/packet/frame/byte consumption, no source-material population, no candidate acquisition, no EvidenceItems/evidence-corpus population, no extraction/applicability/sufficiency/warning/verdict/confidence/report output, no product/orchestrator/runner/API/UI/export wiring, no cache/storage/Source Reliability, no prompt/config/model/schema edits, no ACS/direct URL execution, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

Escalate to Captain only if reviewers want X7-C to run network IO, call the 7N-3B2 transport/factory, produce candidates/source material/evidence, wire product/public/live paths, edit prompts/config/model/schema, or clean V1.

## 4. Implementation Boundary

### 4.1 Allowed Production Files

New file only:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.ts`

Allowed responsibilities:

- validate a 7N-3B2 `SourceAcquisitionNetworkAuthority` using its existing runtime-owner authority check;
- validate existing 7N-3B2 endpoint and budget snapshots using existing structural validators;
- confirm authority, endpoint, and budget hashes align;
- call the existing X7-B `buildEvidenceCorpusSourceMaterialGuard(...)` on upstream source-material readiness/absence input, then require the returned guard to stay negative;
- return hidden/internal readiness status:
  - `not_executable_pre_live_gate`;
  - `blocked_pre_execution`;
- return precise blocked reasons without raw endpoint, URL, secret, request, candidate, source, content, parser, evidence, warning, verdict, confidence, or report payloads;
- preserve explicit nulls for provider output, candidate records, source material, extraction input, and evidence corpus.
- prove zero-cost behavior with explicit output fields:
  - `providerCalls: 0`;
  - `networkCalls: 0`;
  - `bytesRead: 0`;
  - `candidateRecords: 0`;
  - `retries: 0`;
  - `liveJobs: false`.

Exact exports:

- `SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION`;
- `SourceAcquisitionProviderNetworkReadinessRequest`;
- `SourceAcquisitionProviderNetworkReadinessDecision`;
- `buildSourceAcquisitionProviderNetworkReadiness(...)`.

No barrel export is allowed in X7-C.

Allowed imports:

- `@/lib/analyzer-v2-runtime/source-acquisition-network-authority`
- `@/lib/analyzer-v2-runtime/source-acquisition-network-envelope`
- `@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard`

Disallowed imports:

- `source-acquisition-network-transport`
- `source-acquisition-network-factory`
- candidate runtime/factory execution owners
- content dereference, parser, packet sink, byte-frame, cache/storage, Source Reliability, product/orchestrator/runner/API/UI/report/export, prompts/config/model/schema, V1 analyzer, tests/mocks/fixtures.

### 4.2 Allowed Test Files

New file:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.test.ts`

Existing file:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Tests must prove:

- valid 7N-3B2 authority + endpoint + budget + X7-A/X7-B source-material absence input returns only `not_executable_pre_live_gate`, never `ready_to_execute`, `executable`, `source_acquired`, or `ready_not_executable`;
- readiness output contains only hashes/statuses/zero-cost counters and no hostname, path, query text, request parameters, header values, credentials-state detail, endpoint URL, provider secret, raw payload, candidates, source title/snippet/domain, hidden locator, source material, EvidenceItems, cache key, Source Reliability score, warnings, verdicts, truth percentage, confidence, or report prose;
- copied/JSON-round-tripped network authority fails closed;
- invalid endpoint, invalid budget, hash mismatch, invalid source-material guard, and positive/fake source-material inputs fail closed before any IO-capable object is constructed;
- endpoint/budget snapshots block unless `noCache`, `noStorage`, `noSourceReliability`, `noProduct`, and `noPublic` are all `true`;
- `JSON.stringify(decision)` leaks none of the forbidden endpoint/source/provider/report terms above;
- fake transport/factory callbacks cannot be passed or called because X7-C has no accepted transport/factory inputs;
- the readiness module does not import or transitively reach transport/factory/content/parser/cache/storage/SR/product/public/prompt/config/model/schema/V1 modules;
- product/public surfaces do not reach the X7-C readiness owner.

### 4.3 Allowed Documentation Files After Implementation

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X7-C_Hidden_Provider_Network_Readiness.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

## 5. Runtime Contract

X7-C readiness may return only:

- `not_executable_pre_live_gate`;
- `blocked_pre_execution`.

Blocked reasons may include only structural/readiness causes:

- `authority_invalid`;
- `endpoint_invalid`;
- `budget_invalid`;
- `authority_endpoint_budget_mismatch`;
- `source_material_guard_invalid`;
- `source_material_guard_not_negative`;

The positive readiness state is not execution approval. It must carry:

- `visibility: "internal_only"`;
- `executionStatus: "blocked_no_io"`;
- `networkExecution: false`;
- `providerCalls: 0`;
- `networkCalls: 0`;
- `bytesRead: 0`;
- `candidateRecords: 0`;
- `retries: 0`;
- `cacheTouched: false`;
- `sourceReliabilityTouched: false`;
- `publicExposure: false`;
- `liveJobs: false`;
- `providerNetworkExecution: null`;
- `candidateAcquisition: null`;
- `sourceMaterial: null`;
- `extractionInput: null`;
- `evidenceCorpus: null`.

The runtime contract must not define or return:

- `ready_to_execute`;
- `executable`;
- `source_acquired`;
- `ready_not_executable`;
- `accepted_source_material`;
- `buildable_evidence_corpus`.

## 6. Verification Requirements

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by X7-C.

## 7. Stop Conditions

Stop and return to deputy/Captain review if implementation requires:

- importing or calling `executeSourceAcquisitionNetworkTransport`;
- importing or calling `buildSourceAcquisitionCandidateNetworkProviderBoundary`;
- accepting any transport/factory/provider callback input;
- real network/search/fetch behavior;
- provider SDK imports;
- content dereference;
- parser, packet, frame, or byte consumption;
- source-material population;
- candidate acquisition execution;
- source records, source arrays, source counts, URLs, titles, snippets, domains, raw provider payloads, or parsed text;
- EvidenceItems or evidence-corpus population;
- extraction, applicability, sufficiency, warning, verdict, confidence, report, or public compatibility behavior;
- product/orchestrator/runner/API/UI/report/export wiring;
- cache IO, durable storage, or Source Reliability;
- prompt/config/model/schema edits;
- ACS prepared snapshot or direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 8. Reviewer Prompt

Use this prompt for Architect, Security, Senior Developer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_X7-C_Hidden_Provider_Network_Readiness_Source_Package.md` as the proposed FactHarbor V2 X7-C source implementation boundary. Return `approve`, `modify`, or `reject`. Check whether it is safe and precise enough to add a hidden/internal provider-network readiness contract after X7-B. Focus on exact file envelope, no transport/factory execution, no real network/search/fetch, no provider SDK, no content/parser/byte behavior, no source-material/candidate/evidence-corpus population, no Source Reliability, no cache/storage, no product/public/live wiring, no prompt/config/model/schema edits, no EvidenceItem/extraction/applicability/sufficiency/warning/verdict/confidence/report generation, no ACS/direct URL, no V1 reuse/cleanup, verifier adequacy, rollback, and whether any decision must escalate to Captain before implementation.

## 9. Rollback

Rollback must be simple:

- remove the new readiness file;
- remove the focused readiness test;
- remove boundary-guard additions;
- public behavior remains unchanged because no product/public path may import X7-C.

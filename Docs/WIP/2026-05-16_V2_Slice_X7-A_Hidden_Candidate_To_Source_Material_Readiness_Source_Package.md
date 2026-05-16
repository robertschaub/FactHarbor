# V2 Slice X7-A Hidden Candidate-To-Source-Material Readiness Source Package

**Date:** 2026-05-16
**Status:** approved by deputy review team and implemented; commit pending at handoff time
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `307bbc45` (`feat: add v2 hidden candidate acquisition harness`)
**Parent gate:** X6 hidden direct-text candidate-acquisition harness
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the next low-risk V2 direct-text Evidence Lifecycle slice after X6.

X6 proves that an already-created X5 hidden integration result can feed the 7N-3B1 candidate-acquisition runtime through a test-injected provider boundary only. X6 still produces **candidate records**, not source records, content packets, parsed material, EvidenceItems, evidence corpus entries, or extraction inputs.

X7-A adds the missing contract boundary:

1. X6 candidates are structural hidden candidates only.
2. Candidate IDs and hidden locator IDs are not source material.
3. Candidate counts are not evidence.
4. Evidence Corpus build and extraction input readiness stay blocked until a later reviewed source-material/content gate exists.
5. Public V2 output remains the existing damaged/blocked pre-cutover envelope.

X7-A is a contract and hidden-adapter slice. It must not add real source IO, provider-network execution, parser/content behavior, extraction, evidence generation, or product/public wiring.

## 1.1 Review Context

Deputy review/debate after X6 converged on X7-A before provider-network readiness:

- Architect: approve candidate-to-source-material readiness before evidence-corpus/extraction expansion.
- Security: approve candidate-to-source-material readiness and extraction block before provider-network readiness.
- Runtime reviewer: consented after narrowing from provider-network readiness to the source-material boundary.
- Independent risk/governance reviewers: ranked source-material readiness ahead of evidence-corpus/extraction contracts and provider-network fake transport.

The consolidated rationale:

- Provider-network readiness is premature while downstream code could confuse candidates with source material.
- Broad evidence-corpus/extraction contracts are premature without a source-material readiness boundary.
- Docs-only consolidation is weaker than an executable guard/test contract.

## 1.2 Review And Implementation Record

Package review result:

- Architect reviewer: `approve`.
- Security reviewer: `modify`, then `approve` after exact-envelope verifier and strict trace-validation requirements were added.
- Runtime reviewer: `modify`, then `approve` after public-envelope leak-test wording was corrected.

Implemented source:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Implementation remains hidden/internal only and does not change product/public/live behavior.

## 2. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice X7-A under `Docs/WIP/2026-05-16_V2_Slice_X7-A_Hidden_Candidate_To_Source_Material_Readiness_Source_Package.md`, limited to a hidden candidate-to-source-material readiness contract and adapter proving that X6 candidate-acquisition output is not source material, not content, not evidence, and not extraction input. No provider-network execution, no real network/search/fetch, no content dereference, no parser/packet/frame/real-byte consumption, no EvidenceItem or evidence-corpus population, no extraction/applicability/sufficiency execution, no warning/verdict/confidence/report generation, no product/orchestrator/runner/API/UI/export wiring, no cache/storage/Source Reliability, no prompt/config/model/schema edits, no ACS/direct URL execution, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

If reviewers do not approve this exact boundary, do not implement X7-A.

Escalate to Captain only if the team wants to skip this boundary and move directly to provider-network readiness, live canaries, product wiring, real source IO, parser consumption, prompt/model/config changes, or V1 cleanup.

## 3. Implementation Boundary

### 3.1 Allowed Production Files

New core files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.ts`

Allowed responsibilities:

- define internal-only source-material readiness decision types;
- define a pure builder that accepts sanitized candidate-acquisition trace data, not runtime-owned X6 objects;
- produce a fail-closed source-material readiness decision;
- explicitly state:
  - candidates are not source material;
  - hidden locators are not URLs/content;
  - extraction input is blocked because source material is unavailable;
  - evidence corpus building is not buildable because source material is unavailable;
  - no source/evidence/report public fields exist.

The core `analyzer-v2` source-material files must not import from `analyzer-v2-runtime`. Runtime-to-core adaptation may exist only in the hidden runtime harness below.

New runtime adapter file:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.ts`

Allowed responsibilities:

- type-import the existing X6 hidden candidate-acquisition harness result;
- adapt X6 to a sanitized candidate-acquisition trace for the core source-material readiness builder;
- carry only internal status, counts, and boolean boundary facts;
- never carry raw candidate IDs, hidden locator IDs, query text, provider IDs, provider attempt IDs, URLs, snippets, titles, domains, raw payloads, cache keys, SR scores, or public report fields into the source-material readiness decision;
- return the original X6 public envelope unchanged so public output remains damaged/blocked pre-cutover.

### 3.2 Allowed Test Files

New files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts`

Existing file:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - add guards proving core source-material code does not import runtime, network, parser, cache, SR, product/public, prompt/config/model, schema, or V1 modules;
  - add guards proving the X7-A hidden runtime harness imports only X6 plus source-material readiness and does not import network/content/parser/provider SDK/cache/SR/product/public modules;
  - prove no product/public path directly or transitively reaches the X7-A harness.

### 3.3 Allowed Documentation Files

After implementation only:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X7-A_Candidate_Source_Material_Readiness.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

## 4. Explicitly Forbidden Files And Behavior

X7-A must not edit:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- `apps/web/src/lib/analyzer-v2/runner-ingress.ts`;
- `apps/web/src/lib/internal-runner-queue.ts`;
- public app/API/UI/report/export/compatibility files;
- `apps/web/prompts/**`;
- `apps/web/configs/**`;
- `apps/api/**`;
- `apps/web/src/lib/analyzer/**`;
- Source Reliability files.

X7-A must not import or call:

- source-acquisition network factory/transport/authority modules;
- content dereference, packet sink, parser, parser runner, parser isolation proof, or OCI proof modules;
- provider SDKs;
- direct `fetch(...)`;
- cache/storage IO;
- Source Reliability;
- API/UI/report/export/product modules;
- V1 analyzer code or prompts.

X7-A must not create:

- source records with URL/title/snippet/domain fields;
- content packets, frames, raw bytes, parsed material, or parser outputs;
- EvidenceItems or evidence corpus entries;
- applicability, extraction, or sufficiency results;
- scarcity or warning findings;
- verdict/truth/confidence/report output;
- public compatibility fields.

## 5. Runtime Contract

The core source-material builder may expose:

```ts
buildCandidateSourceMaterialReadinessDecision(candidateTrace)
```

The sanitized candidate trace may include only:

- candidate-acquisition stage status;
- candidate runtime structural status;
- candidate record count;
- query outcome count;
- public envelope cutover status, as a non-semantic guard signal;
- booleans such as `candidateRecordsAreSourceMaterial: false`, `hiddenLocatorsAreDereferenceable: false`, and `candidateCountsAreEvidence: false`.

The source-material decision must include:

- decision version;
- visibility `internal_only`;
- status `not_ready_pre_execution` or `blocked_pre_execution`;
- blocked reasons for invalid or unsafe traces, including:
  - `candidate_trace_invalid`;
  - `candidate_trace_contains_source_material`;
  - `candidate_trace_contains_dereferenceable_locator`;
  - `candidate_trace_treats_candidate_count_as_evidence`;
- source-material status `candidate_only_not_source_material`;
- extraction input status `blocked_source_material_unavailable`;
- evidence corpus status `not_buildable_no_source_material`;
- no source material payload;
- no extraction payload;
- no evidence corpus payload.

The core builder must validate the sanitized trace as an exact structural contract. It must block if required boundary facts are missing, if any source/content/evidence-like field is present, if any boolean boundary fact is not exactly `false`, or if the trace is otherwise malformed.

The hidden runtime adapter may expose:

```ts
runHiddenDirectTextSourceMaterialReadinessHarness(request)
```

The request must include an already-created X6 hidden candidate-acquisition harness result. The adapter must not run X5, X6, query planning, candidate acquisition, provider code, network code, content code, or parser code.

The response must include:

- harness version;
- visibility `internal_only`;
- status `completed_contract` or `blocked_contract`;
- public envelope from X6 unchanged;
- source-material readiness decision;
- no raw candidate/query/provider/source/content/evidence fields.

## 6. Verification Requirements

Focused tests must prove:

- a completed X6 result produces a completed source-material readiness contract while source material remains unavailable;
- a blocked X6 result produces a blocked source-material readiness contract;
- source-material readiness explicitly blocks extraction and evidence-corpus building;
- malformed traces, extra raw/source/provider/query fields, `candidateRecordsAreSourceMaterial: true`, `hiddenLocatorsAreDereferenceable: true`, or `candidateCountsAreEvidence: true` all produce blocked decisions with no leaked fields;
- candidate records, hidden locators, query text, provider IDs, provider attempt IDs, candidate IDs, retrieval policy keys, URLs, titles, snippets, domains, raw payloads, cache keys, SR scores, warnings, verdicts, truth percentages, confidence, and report prose do not appear in the source-material readiness decision;
- no X7-A-created public compatibility fields appear, and no candidate/source/source-material/content/evidence fields are added to the unchanged X6 damaged pre-cutover public envelope;
- the core source-material files do not import `analyzer-v2-runtime`;
- the X7-A harness does not import network/content/parser/cache/SR/provider SDK/product/public modules;
- product/public surfaces do not directly or transitively reach the X7-A harness.

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git status --short --untracked-files=all -- apps/web/src/lib/analyzer-v2 apps/web/src/lib/analyzer-v2-runtime apps/web/src/lib/analyzer apps/web/src/lib/internal-runner-queue.ts apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts apps/web/prompts apps/web/configs apps/web/src/app apps/web/src/components apps/api Docs/WIP/2026-05-16_V2_Slice_X7-A_Hidden_Candidate_To_Source_Material_Readiness_Source_Package.md Docs/STATUS/Current_Status.md Docs/STATUS/Backlog.md Docs/AGENTS/Handoffs Docs/AGENTS/Agent_Outputs.md Docs/AGENTS/index/handoff-index.json
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by X7-A.

## 7. Stop Conditions

Stop and return to review if implementation requires:

- provider-network readiness, even with fake transport;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or canaries;
- real network/search/fetch execution;
- parser, packet, frame, or real-byte consumption;
- content dereference;
- cache IO or durable storage;
- Source Reliability;
- prompt/config/model/schema edits;
- source records, EvidenceItems, evidence corpus population, extraction, applicability, sufficiency, warnings, verdicts, confidence, or report output;
- ACS prepared snapshot or direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 8. Reviewer Prompt

Use this prompt for Architect, Security, Senior Developer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_X7-A_Hidden_Candidate_To_Source_Material_Readiness_Source_Package.md` as the proposed FactHarbor V2 X7-A source implementation boundary. Return `approve`, `modify`, or `reject`. Check whether it is safe and precise enough to add a hidden candidate-to-source-material readiness contract after X6. Focus on exact file envelope, analyzer-v2 core/runtime dependency direction, hidden-only behavior, no provider-network execution, no real network/search/fetch/parser/content execution, no Source Reliability, no cache/storage, no product/public/live wiring, no prompt/config/model/schema edits, no evidence-corpus population, no extraction/applicability/sufficiency/warning/verdict/confidence/report generation, no ACS/direct URL, no V1 reuse/cleanup, verifier adequacy, rollback, and whether any decision must escalate to Captain before implementation.

## 9. Rollback

Rollback must be simple:

- remove the new source-material core files;
- remove the new hidden runtime adapter file;
- remove focused test files;
- remove boundary-guard additions;
- public behavior remains unchanged because no product/public path may import the harness.

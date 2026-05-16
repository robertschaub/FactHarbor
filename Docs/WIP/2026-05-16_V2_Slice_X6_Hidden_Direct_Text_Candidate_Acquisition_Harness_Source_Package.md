# V2 Slice X6 Hidden Direct-Text Candidate-Acquisition Harness Source Package

**Date:** 2026-05-16
**Status:** approved by deputy review team and implemented; commit pending at handoff time
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `a504e21b` (`docs: clarify v2 web and pdf capability roadmap`)
**Parent gate:** X5 hidden integration harness, implemented at `b402cfbf`
**Runtime basis:** 7N-3B1 hidden candidate-acquisition runtime shell and X5 hidden integration harness. 7N-3B2 is a negative/reference boundary only: X6 must not import, construct, or pass a network-backed provider boundary.
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the exact source slice for the next low-risk direct-text V2 Evidence Lifecycle step after X5.

X5 proves the hidden internal chain:

1. accepted Claim Understanding handoff;
2. Evidence Lifecycle intake;
3. hidden Query Planning runtime through an injected model callback;
4. query-plan inspection;
5. non-executable Source Acquisition handoff/request;
6. damaged/blocked public V2 envelope.

X6 may extend that proof by adding a runtime-owned hidden harness that accepts an already-created X5 result and feeds its `ready_not_executable` Source Acquisition handoff/request into the existing 7N-3B1 candidate-acquisition runtime through an injected test provider boundary only.

X6 must not execute real network/search/fetch/parser behavior. It is a hidden composition proof for direct-text Evidence Lifecycle plumbing, not a live-job or product integration gate.

X6 must treat X5 as upstream. It must not accept X5 request inputs, call X5 internally, or invoke query-planning/model callbacks.

## 1.1 Review And Implementation Record

Deputy review result:

- Architect reviewer: `approve`.
- Security reviewer: `modify`, then `approve` after import-exception, leak-sentinel, and exact-envelope verifier tightening.
- Runtime reviewer: `modify`, then `approve` after X6 was narrowed to accept an already-created X5 result and caller-created candidate authority/allowlist/budget/providerBoundary.

Implemented source:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Implementation remains hidden/test-injected only and does not change product/public/live behavior.

## 2. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice X6 under `Docs/WIP/2026-05-16_V2_Slice_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness_Source_Package.md`, limited to a runtime-owned hidden direct-text candidate-acquisition harness that accepts an already-created X5 hidden integration result and composes it with the existing 7N-3B1 candidate-acquisition runtime through an injected test provider boundary only. No X5 execution, no query-planning/model callback invocation, no product/orchestrator/runner/API/UI/report/export wiring, no live jobs/canaries, no concrete network/search/fetch provider execution, no parser or real-byte consumption, no Source Reliability, no cache read/write/storage, no prompt/config/model/schema edits, no public result/report/evidence/warning/verdict/confidence generation, no ACS/direct URL execution, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

If reviewers do not approve this exact boundary, do not implement X6.

Escalate to Captain if any reviewer wants live jobs, product wiring, public exposure, real network/search/fetch, parser byte consumption, cache IO, Source Reliability, prompt/config/model changes, or V1 cleanup.

## 3. Implementation Boundary

### 3.1 Allowed Production Files

New file:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts`

Allowed responsibilities:

- type-import the existing X5 hidden integration result contract;
- import existing 7N-3B1 candidate-runtime contracts and executor;
- accept a caller-supplied, already-created X5 hidden integration result;
- accept caller-supplied, already-created candidate authority, provider allowlist snapshot, budget snapshot, and candidate provider boundary;
- validate that X5 completed and that `queryPlanSourceAcquisitionHandoff.status === "ready_not_executable"` and `sourceAcquisitionStart.status === "source_acquisition_ready_not_executable"` before candidate invocation;
- never build candidate authority, provider allowlist, or budget snapshots inside the X6 harness;
- require candidate provider allowlist entries to use `endpointKind: "test_injected_candidate_boundary"` only;
- fail closed before candidate provider invocation when X5 blocks, Source Acquisition is not ready, authority/budget/allowlist is invalid, or the allowlist is not test-injected-only;
- return hidden/internal candidate-runtime decision and the damaged/blocked public envelope from X5;
- preserve candidate runtime's no-cache/no-storage/no-SR/no-public/no-product posture.

The new harness must live under `analyzer-v2-runtime` because it composes runtime-owner modules. The existing core `apps/web/src/lib/analyzer-v2/hidden-integration-harness.ts` must remain away from source-execution/runtime-owner imports.

### 3.2 Allowed Test Files

New file:

- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts`

Existing file:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - add exact ownership and public/product reachability guards for the new harness.
  - add a narrow import exception: only the X6 harness may import the 7N-3B1 candidate runtime/envelope; all other runtime/product/public paths remain covered by the existing bans.

### 3.3 Allowed Documentation Files

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

## 4. Explicitly Forbidden Files And Behavior

X6 must not edit:

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

X6 must not import or call:

- source-acquisition network factory/transport/authority modules;
- content dereference, packet sink, parser, parser runner, parser isolation proof, or OCI proof modules;
- provider SDKs;
- direct `fetch(...)`;
- cache/storage IO;
- Source Reliability;
- API/UI/report/export/product modules;
- V1 analyzer code or prompts.

X6 must not create:

- source records with public URL/title/snippet/domain fields;
- content packets or parsed material;
- evidence items or evidence corpus;
- applicability/extraction/sufficiency results;
- scarcity or warning findings;
- verdict/truth/confidence/report output;
- public compatibility fields.

## 5. Runtime Contract

The new hidden harness may expose one internal function:

```ts
runHiddenDirectTextCandidateAcquisitionHarness(request)
```

The request must include:

- an already-created X5 hidden integration result:
  - `HiddenV2IntegrationHarnessResult`;
  - X5 remains upstream and must be created outside the X6 harness;
- candidate-acquisition inputs:
  - `candidateRunId`;
  - caller-supplied, already-created 7N-3B1 authority;
  - provider allowlist snapshot;
  - budget snapshot;
  - injected candidate provider boundary.

The harness must not create authority, allowlist, or budget snapshots. It also must not invoke X5 or query planning. Those remain owned by existing upstream/runtime-owner modules and test helpers. X6 only composes already-created inputs and validates that the composition remains hidden, test-injected, and fail-closed.

The response must include:

- harness version;
- visibility `internal_only`;
- status `completed` or `blocked`;
- X5 hidden integration result;
- candidate acquisition decision or `null`;
- damaged/blocked public V2 envelope from X5.

Blocked reasons must distinguish at least:

- `x5_not_completed`;
- `source_acquisition_not_ready`;
- `candidate_allowlist_not_test_injected`;
- `candidate_runtime_blocked`;
- `candidate_runtime_damaged`.

## 6. Test-Injection Boundary

X6 must be stricter than the candidate runtime's general envelope:

- `allowedProviders[*].endpointKind` must be exactly `test_injected_candidate_boundary`;
- `candidate_search_api_future` must block before provider invocation;
- no network factory or transport may be imported by the harness;
- no network factory or transport may be imported by the X6 test file;
- injected provider results remain structural hidden candidate records only;
- raw payload, URL, title, snippet, domain, source identity, cache key, SR score, secret, and public telemetry are already rejected by 7N-3B1 and must remain covered by focused/runtime tests.

## 7. Verification Requirements

Focused tests must prove:

- accepted direct-text X5 completion can call the candidate runtime through an injected test boundary;
- X5 blocked/damaged states do not call the candidate provider boundary;
- X6 does not accept X5 request inputs and has no query-planning/model callback invocation path;
- `candidate_search_api_future` allowlist entries block before provider invocation;
- mixed allowlists containing both `test_injected_candidate_boundary` and `candidate_search_api_future` block before provider invocation;
- copied, JSON-round-tripped, or plain-object candidate authority inputs block before provider invocation;
- stale budget identity and stale allowlist hash inputs block before provider invocation;
- candidate runtime blocked/damaged outcomes are surfaced as hidden blocked states, not public output;
- the public envelope remains `4.0.0-cb-precutover`, `blocked_precutover`, damaged, and without query/candidate/source fields;
- no candidate IDs, hidden locator IDs, provider attempt IDs, candidate run IDs, provider IDs, query IDs, retrieval policy keys, allowlist/provider IDs, candidate runtime status/stop reason, source-acquisition handoff/request fields, query text, source-acquisition status, raw payload, URL, title, snippet, cache key, SR score, warning, verdict, truth percentage, or confidence leaks into public result JSON;
- public/product surfaces do not directly or transitively reach the new harness;
- the existing core X5 harness still does not import analyzer-v2-runtime or source-execution owners.
- the X6 harness is not exported by an analyzer-v2 or analyzer-v2-runtime barrel;
- the X6 harness and X6 test file import only the approved exact source envelope and do not import network/content/parser/cache/SR/product/public modules.

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/hidden-integration-harness.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git status --short --untracked-files=all -- apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts apps/web/src/lib/analyzer-v2 apps/web/src/lib/analyzer-v2-runtime apps/web/prompts apps/web/configs apps/web/src/app apps/web/src/components apps/api Docs/WIP/2026-05-16_V2_Slice_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness_Source_Package.md Docs/STATUS/Current_Status.md Docs/STATUS/Backlog.md Docs/AGENTS/Handoffs Docs/AGENTS/Agent_Outputs.md Docs/AGENTS/index/handoff-index.json
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by X6.

## 8. Stop Conditions

Stop and return to review if implementation requires:

- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or canaries;
- real network/search/fetch execution;
- parser, packet, frame, or real-byte consumption;
- content dereference;
- cache IO or durable storage;
- Source Reliability;
- prompt/config/model/schema edits;
- public evidence/report/warning/verdict/confidence output;
- ACS prepared snapshot or direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 9. Reviewer Prompt

Use this prompt for Architect, Security, Senior Developer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness_Source_Package.md` as the proposed FactHarbor V2 X6 source implementation boundary. Return `approve`, `modify`, or `reject`. Check whether it is safe and precise enough to add a runtime-owned hidden direct-text candidate-acquisition harness after X5. Focus on exact file envelope, hidden-only behavior, test-injected provider boundary only, no real network/search/fetch/parser/content execution, no Source Reliability, no cache/storage, no product/public/live wiring, no prompt/config/model/schema edits, no evidence/report/warning/verdict/confidence generation, no ACS/direct URL, no V1 reuse/cleanup, verifier adequacy, rollback, and whether any decision must escalate to Captain before implementation.

## 10. Rollback

Rollback must be simple:

- remove the new hidden runtime harness file;
- remove the focused test file;
- remove boundary-guard additions;
- public behavior remains unchanged because no product/public path may import the harness.

# V2 Slice 7L-1 Query-Planning Source Approval Package

**Date:** 2026-05-15
**Status:** docs-only source approval package; no source implementation yet
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `16168076` (`docs: record tightened v2 query planning gate`)
**Parent gate:** 7L `497ea732`, tightened at `a3fc9eaf`
**Prior source gate:** 7K-1 `218fc879` (`feat: add v2 evidence readiness contracts`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the exact source slice that would implement the first V2 Evidence Lifecycle query-planning prompt/model execution surface.

This package is an approval request, not an implementation. It authorizes no source edits until Captain approval is explicit.

The target implementation is narrow:

- accepted direct-text `ClaimContract` input only;
- selected AtomicClaim IDs validated before prompt rendering;
- clean-room `V2_EVIDENCE_QUERY_PLANNING` prompt section loaded from the already committed V2 prompt file;
- injected provider call boundary only;
- strict `EvidenceQueryPlanningResult` schema validation;
- hidden/internal output only;
- no provider/search/fetch/parser/network implementation;
- no product/orchestrator/runner wiring;
- no live jobs.

## 2. Review Basis

This package incorporates:

- 7K-1 readiness contracts at `218fc879`;
- 7L docs-only package at `497ea732`;
- 7L tightening at `a3fc9eaf`;
- LLM Expert 7L package review: `APPROVE`;
- Code Reviewer 7L package review: `APPROVE`;
- Senior Developer 7L source-envelope review: `MODIFY`, addressed by 7L tightening.

## 3. Requested Captain Decision

Requested approval:

> Approved to implement V2 Slice 7L-1 under `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`, limited to internal hidden direct-text Evidence Lifecycle query-planning prompt/model execution for accepted `ClaimContract` input only. The source package may add the named `evidence_query_planning` gateway/model/cache approval authority, query-planning prompt loader, input/readiness validation, injected-provider model adapter, strict schema validation, hidden/internal result contract tests, and boundary guards. No provider/search/fetch/parser/network execution, no Source Reliability import/call, no UCM/default JSON changes, no prompt text edits, no prompt/profile file seeding, no product/orchestrator/runner wiring, no public API/UI/report/export/compatibility exposure, no live jobs/canary execution, no ACS/direct URL execution, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

If Captain does not approve this exact boundary, do not implement 7L-1.

## 4. Implementation Boundary

### 4.1 Allowed Production Files

New files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.ts`

Existing files, with exact allowed purpose:

- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
  - add executable eligibility only for `evidence_query_planning`;
  - keep all other Evidence Lifecycle tasks non-executable;
  - do not alter Claim Understanding policy behavior.
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
  - add exactly one query-planning model policy;
  - approval may be the Captain-approved temporary approval for this slice only.
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
  - add exactly one query-planning no-store/no-read cache-policy metadata entry if needed for `canExecuteAnalyzerV2GatewayTask(...)`;
  - no cache read/write implementation.
- `apps/web/src/lib/analyzer-v2/run-context.ts`
  - freeze query-planning policy/config/model references only if the implementation requires context-carried provenance;
  - no product caller behavior change.

### 4.2 Allowed Test Files

New files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts`

Existing files:

- `apps/web/test/unit/lib/analyzer-v2/gateway/policy.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/run-context.test.ts` only if `run-context.ts` changes.

### 4.3 Explicitly Forbidden Files

The implementation must not edit:

- `apps/web/prompts/claimboundary-v2.prompt.md`;
- `apps/web/src/lib/internal-runner-queue.ts`;
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- public app/API/UI/report/export/compatibility files;
- `apps/web/src/lib/analyzer-v2-runtime/**` provider factories;
- `apps/web/src/lib/analyzer/**` V1 analyzer files;
- Source Reliability files.

Any need to edit a forbidden file means stop and return to review.

## 5. Execution Authority

7L-1 may add execution authority only for `evidence_query_planning`.

Required authority rules:

- no private executable task clone;
- no local bypass of `canExecuteAnalyzerV2GatewayTask(...)`;
- no fake placeholder approval;
- the approval pointer must cite this Captain-approved package and implementation commit;
- the shipped gateway task must be executable before the model adapter calls the injected provider;
- all other Evidence Lifecycle tasks remain blocked or not implemented;
- no product caller imports the runtime.

The approval is temporary until UCM/task-policy-derived activation authority exists.

## 6. Prompt Source Authority

7L-1 must not edit prompt text.

The prompt loader must load only:

- profile: `claimboundary-v2`;
- file: `apps/web/prompts/claimboundary-v2.prompt.md`;
- section: `V2_EVIDENCE_QUERY_PLANNING`;
- schema: `v2.evidence_query_planning_result.0`.

The prompt loader must reject:

- other prompt profiles;
- other prompt files;
- other sections;
- missing or extra render variables;
- Captain canary terms in tests/fixtures outside the approved canary list;
- any prompt-profile seeding or UCM mutation path.

Prompt content hash must be deterministic and recorded in provenance.

## 7. Runtime Contract

The runtime may expose only an internal function that:

1. accepts a ready direct-text `ClaimContract` and selected AtomicClaim IDs;
2. validates all selected IDs exist in the `ClaimContract`;
3. rejects unknown, duplicate, empty, or unselected claim IDs;
4. builds a 7K-1 batch input envelope;
5. checks readiness before prompt rendering;
6. loads/renders/hashes the V2 query-planning prompt;
7. verifies the executable gateway task and approved model/cache policies;
8. calls an injected provider boundary;
9. accepts direct JSON or exactly one fenced JSON response only if the schema validates;
10. returns accepted/blocked/damaged internal state;
11. records hidden/internal telemetry only.

The runtime must not:

- construct provider SDK clients;
- call search/fetch/parser/network APIs;
- write cache/storage;
- call Source Reliability;
- create source records or evidence items;
- emit scarcity or sufficiency findings;
- update public results or reports;
- submit jobs.

## 8. Scarcity Boundary

`evidence_scarcity_handling` may appear in a query plan only as retrieval intent. It asks later source acquisition to search for whether relevant evidence exists.

It must not create:

- evidence scarcity findings;
- material scarcity candidates;
- sufficiency status;
- user-visible warnings;
- report caveats;
- verdict confidence adjustments.

## 9. Verification Requirements

Focused tests must prove:

- `evidence_query_planning` is the only newly executable Evidence Lifecycle task;
- all other Evidence Lifecycle tasks remain blocked/non-executable;
- missing approval blocks before prompt/model call;
- unknown/empty/duplicate AtomicClaim IDs are rejected;
- unselected AtomicClaims do not appear in the rendered prompt or accepted query plan;
- prompt loader rejects wrong profile/file/section/variables;
- provider callback is injected and no provider SDK import exists in Analyzer V2;
- parse failure and schema failure are distinguished;
- blocked/damaged readiness emits no query plan;
- `evidence_scarcity_handling` remains query intent only;
- hidden telemetry/artifacts are bounded and internal-only;
- public app/API/report/export/compatibility surfaces are unchanged;
- no live-job path exists.

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning test/unit/lib/analyzer-v2/evidence-lifecycle/execution-readiness/static-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git status --short
git diff --check
git diff --cached --check
```

No expensive real-LLM tests or live jobs are approved by 7L-1.

## 10. Rollback And Stop Conditions

Rollback must be simple:

- remove `evidence_query_planning` from execution eligibility;
- restore missing/blocked approval metadata;
- keep query-planning contracts inert;
- public behavior remains unchanged because no product wiring is allowed.

Stop and return to review if implementation requires:

- provider SDK factory work;
- source acquisition/search/fetch;
- Source Reliability;
- UCM/default JSON changes;
- product/orchestrator/runner wiring;
- public result/report exposure;
- live jobs;
- ACS/direct URL;
- prompt text edits;
- V1 cleanup.

## 11. Reviewer Prompt

Use this prompt for LLM Expert, Senior Developer, Code Reviewer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md` as the proposed FactHarbor V2 Slice 7L-1 source implementation boundary. Return `approve`, `modify`, or `reject`. Check whether the package is precise enough for Captain approval of internal hidden direct-text query-planning prompt/model execution. Focus on execution authority, allowed file envelope, prompt-source authority, no provider/search/fetch, no Source Reliability, no UCM/default changes, no public exposure, no live jobs, no V1 reuse, verifier adequacy, rollback, and whether any remaining decision must go back to Captain before implementation.

## 12. Verification For This Package

Docs-only verification:

- `git diff --check`;
- `git diff --cached --check` after staging;
- no source/test/prompt/config/schema edits;
- no live jobs.

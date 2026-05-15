# V2 Slice 7L-1 Query-Planning Source Approval Package

**Date:** 2026-05-15
**Status:** approved and implemented at `6162e057` (`feat: add v2 query planning runtime`)
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `16168076` (`docs: record tightened v2 query planning gate`)
**Parent gate:** 7L `497ea732`, tightened at `a3fc9eaf`
**Prior source gate:** 7K-1 `218fc879` (`feat: add v2 evidence readiness contracts`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the exact source slice that would implement the first V2 Evidence Lifecycle query-planning prompt/model execution surface.

This package began as an approval request and became the controlling implementation boundary after explicit Captain approval. It must not be broadened retroactively; later source execution, product wiring, public exposure, live jobs, or V1 cleanup still require a new reviewed gate.

The target implementation is narrow:

- accepted direct-text `ClaimContract` input only;
- selected AtomicClaim IDs validated before prompt rendering;
- source-language-first and multilingual query planning;
- clean-room `V2_EVIDENCE_QUERY_PLANNING` prompt section loaded from the already committed V2 prompt file;
- injected provider call boundary only;
- strict `EvidenceQueryPlanningResult` schema validation;
- hidden/internal output only;
- no provider/search/fetch/parser/network implementation;
- no product/orchestrator/runner wiring;
- no live jobs.

## 1.1 Implementation Record

Implementation commit: `6162e057f8cfb5921cea5f8efd0d035c5d5a03d3` (`feat: add v2 query planning runtime`).

Captain approval pointer:

- conversation message: `Approved`;
- approval timestamp recorded in code: `2026-05-15T20:43:42.6482362Z`;
- local time basis: `2026-05-15T22:43:42.6482362+02:00`;
- approved artifact: this package path.

The implementation stayed inside the allowed production/test envelope with one intentional test-envelope addition: `apps/web/test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts` verifies the exported query-planning cache-policy metadata. It added no provider SDK import, search/fetch/parser/network call, Source Reliability call, UCM/default JSON change, prompt text edit, product/orchestrator/runner wiring, public surface, live job, ACS/direct URL execution, V1 reuse, or V1 cleanup.

## 2. Review Basis

This package incorporates:

- 7K-1 readiness contracts at `218fc879`;
- 7L docs-only package at `497ea732`;
- 7L tightening at `a3fc9eaf`;
- LLM Expert 7L package review: `APPROVE`;
- Code Reviewer 7L package review: `APPROVE`;
- Senior Developer 7L source-envelope review: `MODIFY`, addressed by 7L tightening.

7L-1 review round on `a298c3e7`:

- LLM Expert: `MODIFY` until source-language-first/multilingual behavior, quality/cost controls, and no-V1 stop conditions are explicit.
- Senior Developer: `MODIFY` until model/cache policy values, approval traceability, no-store/no-read runtime boundary, and invalid-input no-call tests are explicit.
- Code Reviewer: `MODIFY` until approval traceability, static guard specificity, and UI leak checks are explicit.

This revision addresses those findings without source implementation.

## 3. Requested Captain Decision

Requested approval:

> Approved to implement V2 Slice 7L-1 under `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`, limited to internal hidden direct-text Evidence Lifecycle query-planning prompt/model execution for accepted `ClaimContract` input only. The source package may add the named `evidence_query_planning` gateway/model/cache approval authority, query-planning prompt loader, input/readiness validation, injected-provider model adapter, strict schema validation, hidden/internal result contract tests, and boundary guards. No provider/search/fetch/parser/network execution, no Source Reliability import/call, no UCM/default JSON changes, no prompt text edits, no prompt/profile file seeding, no product/orchestrator/runner wiring, no public API/UI/report/export/compatibility exposure, no live jobs/canary execution, no ACS/direct URL execution, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

If Captain does not approve this exact boundary, do not implement 7L-1.

## 3.1 Approval Traceability Requirements

The implementation may not use placeholder approval metadata.

The source package must record:

- approver: `Captain`;
- approval date/time as the concrete conversation date/time available to the implementer;
- exact Captain approval wording;
- artifact pointer: this package path plus the conversation/message reference available in the implementation handoff;
- implementation commit hash after the commit exists.

Because the current `AnalyzerV2PolicyApproval` shape only supports `status`, `reviewer`, and `approvedAt`, the source code may store only:

- `status: "approved"`;
- `reviewer: "Captain"`;
- `approvedAt: <approval timestamp>`.

The exact approval quote, artifact pointer, and implementation commit must be recorded in `Docs/AGENTS/Agent_Outputs.md` and the completion handoff for 7L-1. If any of these are missing, the slice fails approval traceability and must not proceed to live validation.

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
  - use the exact temporary policy values in Section 5.1;
  - approval may be the Captain-approved temporary approval for this slice only.
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
  - add exactly one query-planning no-store/no-read cache-policy metadata entry if needed for `canExecuteAnalyzerV2GatewayTask(...)`;
  - use the exact temporary cache-policy boundary in Section 5.2;
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

### 5.1 Temporary Model Policy Values

Because UCM/default JSON changes are forbidden in 7L-1, the source package may use only this explicitly approved temporary model policy:

| Field | Value |
|---|---|
| `policyId` | `v2.model.evidence_query_planning.0` |
| `gatewayTaskId` | `evidence_query_planning` |
| `modelTask` | `understand` |
| `modelTier` | `standard` |
| `providerPolicy` | `from_config_snapshot` |
| `temperature` | `0.1` |
| `maxCalls` | `1` |
| `schemaRetryCount` | `0` |
| `timeoutMs` | `90000` |
| `maxOutputTokens` | `4000` |
| `fallbackBehavior` | `none_fail_closed` |
| `escalationBehavior` | `surface_provider_failure` |
| `execution` | `blocked_until_prompt_model_cache_approval` |
| `approval` | Captain-approved temporary approval for this exact package only |

Additional cost/quality constraints:

- selected AtomicClaims must be batched in a single query-planning call where quality allows;
- accepted query plans must be bounded to at most 6 query entries;
- code must not add deterministic keyword expansion, language heuristics, source ranking, or semantic routing;
- no semantic repair loop is approved;
- schema retry is intentionally `0` for this first hidden slice so malformed output becomes a damaged internal result rather than retry bait.

Any different model tier, temperature, call count, retry count, timeout, output token budget, or query count requires renewed LLM Expert review and Captain approval.

### 5.2 Temporary No-Store/No-Read Cache Boundary

7L-1 may add query-planning cache-policy metadata only to satisfy gateway readiness and provenance.

It must not add cache IO.

Because UCM/default JSON changes are forbidden in 7L-1, the source package may use only this explicitly approved temporary cache-policy registry entry:

| Field | Value |
|---|---|
| `policyId` | `v2.semantic.evidence-query-planning` |
| `requiredDimensions` | `promptProfile`, `promptSectionId`, `promptContentHash`, `modelTask`, `provider`, `modelName`, `temperature`, `outputSchemaVersion`, `configSnapshotHash`, `resultSchemaVersion`, `inputIdentityHash`, `languageContextHash`, `currentDateBucket` |
| `optionalDimensions` | `adapterVersion` |
| `approval.status` | `approved` |
| `approval.reviewer` | `Captain` |
| `approval.approvedAt` | the Captain approval timestamp recorded under Section 3.1 |

This cache-policy metadata is approval/provenance metadata only. It does not authorize cache reads, writes, storage adapters, durable keys, or reuse of the Claim Understanding cache-governance behavior.

If an `AnalyzerV2CacheDecision` is emitted, it must be query-planning-specific and no-store/no-read:

- `canRead: false`;
- `canWrite: false`;
- reason: `no_store_runtime_dispatch_safety` or `no_store_until_execution_approved`;
- namespace must be query-planning-specific;
- key parts may be recorded for provenance only;
- no cache lookup, cache write, storage adapter, or private cache mechanism.

The implementation must not extend the Claim Understanding cache-governance behavior for Evidence Lifecycle query planning unless a later cache gate approves it.

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

## 6.1 Source-Language And Multilingual Requirements

7L-1 must preserve source-language-first query planning.

Implementation requirements:

- prompt variables must carry the detected/current language signal available from the accepted `ClaimContract` or run context;
- prompt rendering must not force English as the default;
- accepted query plans must include source-language policy rationale;
- supplementary-language decisions must be LLM-owned output, not code heuristics;
- code must not classify language, choose English, or expand/translate queries through deterministic keyword rules.

If the available `ClaimContract` or run context cannot provide the needed language signal, the runtime must block before prompt/model execution rather than defaulting to English. The sentinel `und` counts as unavailable for 7L-1 and must block before prompt rendering or provider callback invocation.

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
- rendered prompt and accepted query plan preserve the provided source-language signal;
- English is not used as a default when the input language signal is non-English;
- `und` or missing language signal blocks before prompt rendering and provider callback invocation;
- supplementary-language decisions are accepted only as LLM output, not deterministic code output;
- provider callback is injected and no provider SDK import exists in Analyzer V2;
- parse failure and schema failure are distinguished;
- blocked/damaged readiness emits no query plan;
- `evidence_scarcity_handling` remains query intent only;
- hidden telemetry/artifacts are bounded and internal-only;
- invalid IDs, blocked readiness, or gateway policy blocks prevent both prompt rendering and provider callback invocation;
- approval/provenance traceability is present in the approved representation and in the completion handoff;
- public app/API/UI/report/export/compatibility surfaces are unchanged;
- no live-job path exists.

Static guards must prove:

- no V1 analyzer import, V1 prompt reuse, V1 type reuse, or cloned V1 source path;
- no provider SDK import inside Analyzer V2;
- no search/fetch/parser/network import;
- no direct `fetch(...)`;
- no Source Reliability import/call;
- no cache IO or storage import;
- no UCM/default JSON edit;
- no product/orchestrator/runner import;
- no public app/API/UI/report/export/compatibility import.

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
- V1 analyzer/prompt/type/code import, reuse, or cloning;
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

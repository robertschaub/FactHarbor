# V2 Slice 7K Evidence Lifecycle Execution Design

**Date:** 2026-05-15
**Status:** docs-only execution design package; no source authorization
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `b2dbb8a7` (`docs: record v2 evidence readiness alignment`)
**Prior source gate:** 7J-2 `f49c69cd` (`fix: align v2 evidence gateway contracts`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the execution sequence and approval boundaries for V2 Evidence Lifecycle before any loader, model, provider, search, fetch, cache, Source Reliability, product wiring, public exposure, live-job, or V1-cleanup work starts.

7J-1 created non-executable prompt sections, task-result schemas, and task-policy metadata. 7J-2 aligned the blocked gateway metadata and accepted zero-extraction semantics. 7K decides what must be designed next so future implementation does not turn unresolved architecture into implicit code decisions.

7K is docs-only. It authorizes no source/test/prompt/config/schema edits.

## 2. Review Consolidation

Expert-team findings after 7J-1:

- Senior architect / LLM expert: source wiring is premature; define a docs-only execution design package first.
- Senior developer / code reviewer: fix blocked gateway metadata before loader/runtime work; 7J-2 completed that at `f49c69cd`.
- Systems/cost/quality reviewer: accepted zero-result extraction must be first-class before execution; 7J-2 completed that at `f49c69cd`.

Consolidated decision:

- 7J-2 closed the immediate inert readiness mismatches.
- 7K should define execution design only.
- The next source package after 7K should still be inert unless Captain explicitly approves prompt/model runtime execution.

## 3. Non-Negotiable Constraints

This package must not be used as approval for:

- prompt/model runtime execution;
- prompt file seeding or active-profile flips;
- gateway/model/cache approval flips;
- provider SDK imports;
- search/fetch/parser/network execution;
- direct `fetch(...)`;
- cache read/write/storage IO;
- Source Reliability import/call/cache/admin changes;
- orchestrator/product/runtime wiring;
- public API/UI/report/export/compatibility exposure;
- hidden artifact expansion beyond already approved Claim Understanding diagnostics;
- ACS/direct URL execution;
- live jobs or direct-text canary execution;
- UCM/default JSON changes;
- V1 analyzer/prompt/type reuse;
- V1 cleanup.

## 4. Execution Sequence

Use a staged sequence. Do not collapse query planning, provider acquisition, extraction, and sufficiency into one runtime gate.

| Gate | Scope | Why |
|---|---|---|
| `7K-1` | Inert execution-readiness contracts for Evidence Lifecycle task batches, pre-call validation, and provenance envelopes. | Captures what must be true before any model/search call without executing it. |
| `7L` | Query-planning prompt/model execution design or source package, direct-text accepted `ClaimContract` only, hidden/internal result only. | Smallest semantic execution surface; no provider/search/fetch yet. |
| `7M` | Structural source-acquisition provider/search/fetch ownership design. | Keeps external IO separate from LLM query planning and extraction semantics. |
| `7N` | Source record/content packet contract and applicability execution readiness. | Applicability needs stable source/content packet ownership first. |
| `7O` | Evidence extraction execution readiness and hidden internal corpus assembly. | Extraction should run only after source packets and applicability are stable. |
| `7P` | Sufficiency execution readiness, warning-owner handoff, and material scarcity candidate handling. | Sufficiency must distinguish not-run, no usable evidence, insufficient evidence, and damaged states. |
| Later | Source Reliability thin-port, public result/report exposure, live-job expansion, ACS/direct URL execution, V1 cleanup. | These are separate high-risk gates. |

## 5. Recommended Next Source Gate: 7K-1

7K-1 should be inert and contract-only unless Captain explicitly approves broader scope.

Allowed in 7K-1:

- task batch input envelope types for:
  - `evidence_query_planning`;
  - `evidence_applicability`;
  - `evidence_extraction`;
  - `evidence_sufficiency`;
- pre-call readiness result types for:
  - missing prompt approval;
  - missing model policy;
  - missing cache approval;
  - source acquisition not executable;
  - missing source packets;
  - invalid claim/source/content IDs;
  - incomplete content packets;
  - token budget overflow;
  - call budget exhausted;
- provenance envelope fields for future calls:
  - prompt profile and section id;
  - prompt hash placeholder;
  - output schema version;
  - task-policy snapshot hash;
  - config snapshot hash;
  - approval pointer;
  - provider/model placeholder;
  - token/call budget fields;
  - cache decision;
  - retry count;
  - timing fields;
- tests proving all readiness results are blocked/inert and no execution-capable imports exist.

Blocked in 7K-1:

- prompt rendering/loading beyond inert metadata;
- model adapter calls;
- provider callback creation;
- provider/search/fetch/parser/network imports;
- Source Reliability imports/calls;
- cache IO;
- UCM/default JSON changes;
- product/orchestrator wiring;
- public exposure;
- live jobs.

## 6. UCM And Model Policy Direction

Do not expand V1-era `pipeline.default.json` for Evidence Lifecycle execution policy.

Future UCM/model policy should be task-oriented and frozen into `PipelineRunContext` before execution:

| Policy area | Owner direction |
|---|---|
| model tier/provider/temperature/max output tokens/timeout | UCM task policy, not hardcoded |
| query/source limits | UCM task policy, with quality-first caps |
| structural retry allowance | UCM task policy; no default semantic repair loops |
| cache posture | UCM cache policy; remains no-store/no-read until approved |
| prompt section/profile/schema version | task policy snapshot plus prompt governance |
| approval pointer | required before execution |

Long-term human-facing UCM name preference remains `analysis-profile`. No config-domain source change is approved by 7K.

## 7. Prevention-First Cost And Quality Design

Future execution should avoid retries and repairs by design:

- make valid empty/blocked/damaged outputs first-class outcomes;
- validate structural preconditions before any LLM call;
- batch selected AtomicClaims where quality allows;
- batch source/content packets for applicability where quality allows;
- keep source content structurally compressed before prompt calls without deterministic semantic filtering;
- keep source-language-first behavior and no English-only routing assumptions;
- keep query counts explicit and bounded;
- reserve stronger models for extraction/sufficiency when task policy or input complexity requires it;
- surface budget exits through blocked/damaged/sufficiency states instead of hidden retries.

## 8. Verifier Envelope For 7K-1

Minimum source verifier if 7K-1 is approved:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git status --short
git diff --check
git diff --cached --check
```

Add focused tests for any new readiness-envelope files.

## 9. Captain Approval Boundary

Drafting and committing this 7K document does not require Captain escalation because it is non-authorizing.

Captain approval is required before:

- 7K-1 source implementation if it touches prompt/model execution policy, UCM/default JSON, or anything beyond inert readiness contracts;
- any prompt/model runtime execution;
- any provider/search/fetch implementation;
- any Source Reliability thin-port integration;
- any cache IO;
- any public exposure;
- any live jobs or canary execution;
- any V1 cleanup.

Suggested approval wording for a narrow 7K-1 source package:

> Approved to implement 7K-1 under `Docs/WIP/2026-05-15_V2_Slice_7K_Evidence_Lifecycle_Execution_Design.md`, limited to inert Evidence Lifecycle execution-readiness envelope types, pre-call validation result contracts, provenance metadata contracts, and verifier tests only. No prompt/model execution, provider/search/fetch/parser/network imports, cache IO, Source Reliability integration, UCM/default JSON changes, product wiring, public exposure, live jobs, canary execution, ACS/direct URL execution, approval flips, file seeding, or V1 cleanup.

## 10. Verification For This Package

Docs-only verification:

- `git diff --check`;
- no source/test/prompt/config/schema changes in this commit;
- no live jobs;
- this document explicitly keeps runtime/source execution blocked.

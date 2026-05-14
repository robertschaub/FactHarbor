# V2 Slice 6B.3 Gated Model Execution Approval Package

**Date:** 2026-05-14
**Status:** Draft approval package; implementation not started
**Owner role:** Lead Architect / Captain deputy
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `main`
**Baseline commits:** Slice 6B.2 prompt draft and contract tests `8a1ef8cd`; status consolidation `75b015cd`

---

## 1. Purpose

This package defines the approval boundary for Slice 6B.3: adding a gated runtime Claim Understanding model path for V2.

This document is intentionally not an implementation patch. It does not enable `claimboundary-v2` file seeding, does not flip prompt/model/cache approvals, does not mark `claim_understanding_gate1` executable, does not add a runtime LLM call, and does not authorize live jobs.

The low-risk next step is to make the execution gate reviewable before any behavior changes.

## 2. Current Baseline

Slice 6B.2 is complete:

- `apps/web/prompts/claimboundary-v2.prompt.md` exists with `V2_CLAIM_UNDERSTANDING_GATE1`.
- The prompt is clean-room V2 text and passed static/contract tests.
- `claimboundary-v2` remains not file-seeded.
- `claim_understanding_gate1` remains `blockedUntilPromptApproved`.
- Prompt/model/cache approvals are not approved.
- V2 runner/orchestrator still returns a damaged structural pre-cutover envelope; no analytical V2 execution exists.

Current code facts:

| Surface | Current behavior |
|---|---|
| `apps/web/src/lib/analyzer-v2/gateway/policy.ts` | `canExecuteAnalyzerV2GatewayTask(...)` requires `status: "executable"` plus approved prompt, model, and cache policies |
| `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts` | `claim_understanding_gate1` has concrete blocked model metadata: standard tier, temperature `0.15`, max calls `2`, one schema retry, 120s timeout, 6000 output tokens |
| `apps/web/src/lib/analyzer-v2/gateway/cache-governance.ts` | Claim Understanding cache requires direct/ACS source separation and `inputGroundingSeedHash`; ACS runs additionally require `acsSnapshotHash` |
| `apps/web/src/lib/analyzer-v2/execution-selection.ts` | V1 remains default; V2 shell only runs for persisted `claimboundary-v2` plus explicit pre-cutover env gate |
| `apps/web/src/lib/analyzer-v2/orchestrator.ts` | V2 currently builds run context and returns the damaged pre-cutover envelope |

## 3. Proposed 6B.3 Scope

Slice 6B.3 should add an executable Claim Understanding path only inside the already gated V2 pre-cutover shell.

Allowed in 6B.3 after approval:

- seed/load `claimboundary-v2` prompt profile if the approval decision accepts file seeding;
- record approved prompt/model/cache policy states for `claim_understanding_gate1`;
- render `V2_CLAIM_UNDERSTANDING_GATE1` through the approved V2 prompt profile;
- execute one structured model task for direct-input Claim Understanding;
- map validated model output into `ClaimUnderstandingResult`;
- preserve the ACS-prepared path as structural migration whenever selected claims are valid, normally avoiding the LLM call;
- return blocked/damaged Claim Understanding envelopes on contract, provider, schema, selected-claim, no-valid-claim, or shell-placeholder failures;
- keep execution limited to the explicit V2 pre-cutover gate.

Not allowed in 6B.3:

- public cutover;
- changing V1 default execution;
- UI/API behavior changes;
- live jobs without a separate 6B.4 spend approval;
- prompt wording changes beyond mechanical metadata needed for activation;
- importing or cloning V1 analyzer code, V1 prompt sections, or V1 pipeline-owned contracts;
- adding semantic retries or hidden repair loops;
- changing report generation, verdicting, evidence lifecycle, or source reliability behavior.

## 4. Recommended Implementation Split

```mermaid
flowchart TB
  P["6B.2 prompt source and contract tests"]
  A["6B.3a approval-state and file-seeding decision"]
  G["6B.3b Claim Understanding gateway adapter"]
  O["6B.3c orchestrator integration behind V2 pre-cutover gate"]
  S["6B.4 structural smoke / approved live spend"]

  P --> A --> G --> O --> S

  classDef done fill:#dff5e3,stroke:#2f7d32,color:#102a12
  classDef review fill:#fff4d6,stroke:#9a6700,color:#3a2600
  classDef gated fill:#eef2ff,stroke:#4f5fa8,color:#151a3a
  class P done
  class A,G,O review
  class S gated
```

### 6B.3a - Approval State And File Seeding

Goal: make activation explicit and testable before any runtime call.

Recommended decision: enable `claimboundary-v2` file seeding only in the 6B.3 implementation commit if reviewers approve runtime activation. The prompt-surface registry and `FILE_SEEDED_PROMPT_PROFILES` must change together, and postbuild reseed behavior must prove the V2 profile is seeded only when intentionally enabled.

Required tests:

- `claimboundary-v2` file seeding is off before 6B.3 and on only after the approved flip;
- frontmatter remains `pipeline: claimboundary-v2`;
- V1 `claimboundary.prompt.md` cannot be loaded for the V2 profile;
- gateway execution remains false unless prompt, model, and cache approvals are all approved and the task status is executable.

### 6B.3b - Claim Understanding Gateway Adapter

Goal: add the minimal V2-owned adapter that renders the prompt, calls the approved model task, validates the result, and returns a typed `ClaimUnderstandingResult`.

Design rules:

- use the existing prompt/profile infrastructure structurally, but do not reuse V1 prompt text or V1 task contracts;
- one model call plus one bounded schema retry is the maximum;
- provider unavailability maps to `damagedReason: "claim_understanding_unavailable"`;
- schema/contract failure after the allowed structural retry maps to `damagedReason: "claim_contract_validation_failed"`;
- model-authored output may use `accepted` or `blocked`; `damaged` remains gateway-owned;
- gateway/run context remains authoritative for hashes, prompt/model/config provenance, ACS migration metadata, and execution telemetry;
- no semantic repair, no downstream research, no verdict, no report generation.

Required tests:

- direct-input accepted fixture maps to a valid `ClaimContract`;
- direct-input `no_valid_claim` returns blocked without a dummy claim;
- provider failure returns damaged unavailable;
- invalid schema after bounded retry returns damaged contract-validation failure;
- rendered prompt uses exactly the four approved variables;
- call metadata records prompt hash, profile, section, model task, schema version, config snapshot hash placeholder or value, timing, token usage placeholder or value, retry count, and cache decision.

### 6B.3c - Orchestrator Integration

Goal: wire Claim Understanding into the V2 shell while preserving V1 default and the pre-cutover gate.

Design rules:

- ACS prepared snapshots with valid selected claims use the structural migration adapter and normally do not call the model;
- invalid ACS snapshots fail closed; V2 must not silently redo selected Stage 1;
- direct input uses the approved model path;
- `runClaimBoundaryPipelineV2(...)` may advance only through Claim Understanding and then return a pre-cutover damaged envelope that includes the Claim Understanding result as internal V2 state until later evidence/verdict stages exist;
- no public result replacement and no report-quality claims are made from 6B.3 alone.

Required tests:

- V1 remains default for normal jobs;
- V2 shell still requires stored `claimboundary-v2` plus explicit env gate;
- ACS valid migration avoids the model call;
- direct input invokes the gateway only when `claim_understanding_gate1` can execute;
- blocked/damaged Claim Understanding returns a damaged structural V2 envelope, not a fake report;
- shell-only placeholder IDs cannot enter the model path;
- Analyzer V2 boundary guard still blocks V1 imports and V1 prompt reuse.

## 5. Approval Questions

Reviewers should answer before any 6B.3 implementation:

1. Is enabling `claimboundary-v2` file seeding the correct activation method for this slice, or should 6B.3 first add an explicit V2 prompt-loader abstraction without seeding?
2. Are the current model-policy values acceptable for first gated execution: standard tier, temperature `0.15`, max calls `2`, one schema retry, 120s timeout, 6000 output tokens?
3. Is the cache approval model sufficient for first execution, especially direct input vs. ACS prepared snapshot separation?
4. Should 6B.3 return the Claim Understanding result only as internal V2 state inside the damaged pre-cutover envelope, or should it expose a new non-public diagnostic field?
5. Are the failure mappings complete enough to avoid semantic retries and repairs?
6. What exact verifier set must pass before 6B.4 structural smoke or live jobs?

## 6. Review Roles

Recommended review team:

| Role | Focus |
|---|---|
| LLM Expert / Claude Opus | prompt execution safety, model policy, structured-output contract, no hidden semantic repair |
| Senior Developer | implementation feasibility, prompt seeding and config storage, gateway adapter boundaries |
| Code Reviewer | regression risk, tests, V1 default protection, no accidental public behavior change |
| Gemini / Challenger | challenge file-seeding activation, over-preserved legacy coupling, and broken-intermediate risk |
| Lead Architect | consolidate decision, preserve clean-room architecture and slice boundaries |

Captain escalation is required if reviewers disagree on file seeding vs. another activation route, if runtime execution would affect public API/UI/report behavior, or if the team proposes live jobs before a committed, refreshed 6B.3 implementation exists.

## 7. Reviewer Prompt

Review `Docs/WIP/2026-05-14_V2_Slice_6B3_Gated_Model_Execution_Approval_Package.md` as the approval package for FactHarbor V2 Slice 6B.3 gated Claim Understanding model execution. Treat Captain intent as clean-room replacement with quality priority, no V1 prompt/code/type reuse, multilingual robustness, input neutrality, Gate 1 integrity, and prevention-first recovery. Check whether the proposed file-seeding decision, approval-state requirements, gateway adapter, ACS/direct-input behavior, model policy, cache policy, failure mapping, and verifier set are sufficient before any executable V2 model path is added. Return `approve`, `modify`, or `reject`; list blockers, required changes, optional improvements, and whether Captain escalation is needed.

## 8. Current Decision

Recommended next action: send this package to the deputy review team before implementing 6B.3.

Until that review is complete, keep the repository behavior unchanged:

- `claimboundary-v2` not file-seeded;
- `claim_understanding_gate1` not executable;
- prompt/model/cache approvals not approved;
- no runtime LLM call;
- no live jobs;
- V1 remains the default product runtime.

# V2 Slice 6B.3 Revised Implementation Plan

**Date:** 2026-05-14
**Status:** 6B.3a foundation complete at `2d14c89a`; 6B.3b/6B.3c not approved
**Owner role:** Lead Architect / Captain deputy
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `main`
**Inputs:** `Docs/WIP/2026-05-14_V2_Slice_6B3_Gated_Model_Execution_Approval_Package.md`; Claude Opus LLM/runtime review; Claude Sonnet Senior Developer review; Gemini Challenger review

---

## 1. Debate Consolidation

The 6B.3 approval package returned `MODIFY`. The follow-up debate answered whether to proceed to code or stay in planning.

Consensus:

- Do **not** implement 6B.3 runtime code yet.
- The next low-risk step is this docs-only revised implementation plan.
- After this plan is reviewed and approved, the first code slice should be a narrow prerequisite slice with no model calls and no runtime activation.
- No Captain escalation is needed for this docs-only plan.

Reasoning:

- Runtime execution is not low risk because current V2 lacks a clean-room model adapter, V2 runtime prompt loader, runtime validation schemas, and complete cache/provenance construction.
- A prerequisite code slice may be low risk later, but only after the plan answers the open questions and the deputy team approves it.

## 2. Decisions For Revised 6B.3

| Question | Decision |
|---|---|
| File seeding vs explicit loader | Use an explicit V2 prompt loader by default. Do not add `claimboundary-v2` to `FILE_SEEDED_PROMPT_PROFILES` in 6B.3. Escalate to Captain only if someone proposes legacy file seeding. |
| Claim Understanding visibility | Keep the Claim Understanding result internal to the V2 pre-cutover damaged envelope/state. Do not add a public, API, UI, or non-public diagnostic field in 6B.3. |
| Model adapter ownership | Use a V2-owned adapter or a neutral shared adapter approved by review. Analyzer V2 must not import from `apps/web/src/lib/analyzer/`. |
| Runtime schemas | Add runtime schemas for `ClaimUnderstandingResult` and embedded `ClaimContract` before any model dispatch. Test fixtures are not enough. |
| Retry policy | One structural schema retry maximum, using identical rendered prompt bytes and identical input variables. No error-feedback prompt and no semantic repair instruction. |
| Cache/provenance | For first execution, prefer cache bypass/no-store unless all required dimensions are fully available. Still record real cache-decision metadata. Placeholders are not allowed in executable telemetry. |
| Model policy | Keep the existing policy as a review baseline, but 6B.3b must re-confirm the values. Gate 1 should favor deterministic settings; temperature `0.0` is preferred unless LLM Expert keeps `0.15`. |
| Live jobs | None in 6B.3. Any real job belongs to 6B.4 after commit-first, runtime refresh, and explicit spend approval. |

## 3. Revised Slice Split

```mermaid
flowchart TB
  P["Current docs-only revised plan"]
  A["6B.3a foundation\nV2 prompt loader + runtime schemas + provenance/cache decision"]
  B["6B.3b model adapter contract\nmocked provider + structural retry"]
  C["6B.3c gated gateway/orchestrator wiring\ndirect input only, internal state"]
  S["6B.4 structural smoke\napproved spend only if real jobs"]

  P -->|"deputy approval required"| A
  A -->|"tests + review"| B
  B -->|"tests + review"| C
  C -->|"commit + refresh + spend approval"| S

  classDef current fill:#dff5e3,stroke:#2f7d32,color:#102a12
  classDef planned fill:#fff4d6,stroke:#9a6700,color:#3a2600
  classDef gated fill:#eef2ff,stroke:#4f5fa8,color:#151a3a
  class P current
  class A,B,C planned
  class S gated
```

## 4. Required Changes Mapped To Slices

| Required change from review | Owning slice | Required verifier |
|---|---|---|
| Explicit V2 prompt loader; no legacy file seeding | 6B.3a | loader rejects V1 profile/file/section; `claimboundary-v2` remains absent from `FILE_SEEDED_PROMPT_PROFILES` |
| V2-owned or neutral model adapter; no V1 analyzer import | 6B.3b | boundary guard plus import scan for `apps/web/src/lib/analyzer-v2` |
| Runtime `ClaimUnderstandingResult` and `ClaimContract` schemas | 6B.3a | accepted, blocked, damaged, malformed enum, unknown key, and invalid embedded-contract tests |
| Structural-only schema retry | 6B.3b | retry prompt bytes equal first-call prompt bytes; no error-feedback prompt |
| Real provenance values, no placeholders | 6B.3a and 6B.3b | telemetry/provenance object requires prompt hash, config snapshot hash, model/provider, schema, retry count, token/timing fields where provider dispatch occurs |
| Internal-only Claim Understanding state | 6B.3c | API/UI/result JSON compatibility tests or fixture guard proving no new public field |
| V2 cache namespace and direct/ACS isolation | 6B.3a | cache decision/key tests prove V1 cannot hit V2; ACS hash mismatch fails closed |
| ACS migration at V2 edge into pure V2 types | 6B.3c | ACS valid migration avoids model call; invalid ACS fails closed; no V1 types in orchestrator |
| Multilingual and input-neutral runtime tests | 6B.3c | direct-input model adapter tests preserve source-language framing and do not normalize to English |
| Only `claim_understanding_gate1` eligible for executable status | 6B.3a | policy tests prove later V2 tasks remain blocked |

## 5. 6B.3a Foundation Slice

Purpose: prepare V2 runtime prerequisites without model dispatch or runtime activation.

Implementation status: 6B.3a is complete at `2d14c89a` as a structural foundation slice. This completion does not approve 6B.3b, 6B.3c, runtime execution, model calls, approval flips, file seeding, orchestrator wiring, API/UI/report changes, or live jobs.

Allowed:

- add explicit V2 prompt-loader abstraction for `claimboundary-v2.prompt.md`;
- validate frontmatter, required variables, and section id;
- validate that only the approved V2 Claim Understanding variables are accepted;
- reject V1 prompt files, V1 profile names, and V1 section names;
- add production V2 runtime schemas for `ClaimUnderstandingResult` and embedded `ClaimContract`; fixture JSON schemas alone are insufficient;
- add provenance/cache-decision data structures and tests, with cache reads/writes disabled unless full dimensions are available;
- record explicit no-dispatch/no-store cache/provenance decisions in 6B.3a; provider, token, timing, and retry telemetry belongs only to later dispatch-capable slices;
- update policy tests so only `claim_understanding_gate1` is structurally eligible to become executable in a future approved slice.

Forbidden:

- no model calls;
- no imports from `apps/web/src/lib/analyzer/` anywhere in 6B.3a, including prompt-loader, provider, type, schema, and helper imports;
- no orchestrator wiring;
- no file seeding;
- no addition of `claimboundary-v2` to `FILE_SEEDED_PROMPT_PROFILES`;
- no approval flips;
- no production registry/status change that makes `claim_understanding_gate1` executable; policy tests may use synthetic cloned entries only;
- no live jobs.

Minimum verifier:

- V2 prompt-loader tests;
- deterministic render byte-equality test for identical prompt source hash, profile, section, and variables;
- runtime schema tests;
- schema id/version pinning tests for `v2.claim_understanding_result.0` and `v2.claim_contract.0`;
- cache/provenance decision tests;
- gateway policy tests;
- Analyzer V2 boundary guard, including prompt-loader import paths and zero imports from `apps/web/src/lib/analyzer/`;
- `git diff --check`;
- `npm -w apps/web run build`.

Schema enum and key hygiene: status and reason values are structural contract keys, not analysis-language decisions. Unknown enum/key values must fail schema validation as gateway-owned validation failures, never as model-authored truth.

## 6. 6B.3b Model Adapter Contract Slice

Purpose: add model adapter mechanics without public execution.

Allowed:

- add a V2-owned or approved neutral model adapter interface;
- add mocked provider tests for accepted, blocked, provider failure, malformed JSON/plain text, unknown enum, and invalid schema after bounded retry;
- implement structural-only retry with identical prompt bytes;
- record real telemetry fields for provider dispatch paths.

Forbidden:

- no V1 analyzer imports;
- no hidden semantic retry or repair;
- no orchestrator integration that can run in product paths;
- no live jobs.

Minimum verifier:

- mocked adapter tests;
- structural-only retry test;
- telemetry/provenance tests;
- Analyzer V2 boundary guard;
- focused Analyzer V2 test slice;
- `npm -w apps/web run build`;
- `git diff --check`.

## 7. 6B.3c Gated Gateway And Orchestrator Wiring

Purpose: connect Claim Understanding to the existing V2 pre-cutover shell while preserving V1 default and internal-only state.

Allowed:

- direct-input Claim Understanding through the approved gateway only when `canExecuteAnalyzerV2GatewayTask(...)` is true;
- ACS valid migration path that avoids model dispatch;
- blocked/damaged Claim Understanding mapped into a damaged structural V2 pre-cutover envelope;
- internal V2 state only, no API/UI/report diagnostic field.

Forbidden:

- no public cutover;
- no V1 default change;
- no API/UI changes;
- no report generation;
- no evidence/research/verdict stage execution;
- no live jobs.

Minimum verifier:

- V1 default routing tests;
- V2 pre-cutover env-gate routing tests;
- ACS migration avoids model call;
- direct input cannot call the model unless gateway approval checks pass;
- shell-placeholder ID fails before provider dispatch;
- multilingual and input-neutral direct-input tests;
- API/UI/result compatibility guard proving no public field change;
- Analyzer V2 boundary guard;
- focused Analyzer V2 test slice;
- `npm -w apps/web run build`;
- `git diff --check`.

## 8. Approval Gate Before Code

Reviewers have approved this revised plan for 6B.3a foundation only.

Required review lenses:

- LLM Expert / Claude Opus: runtime prompt execution, model policy, retry, provenance, multilingual/input-neutral runtime tests;
- Senior Developer: feasibility of explicit loader, runtime schemas, adapter boundary, cache/provenance construction;
- Code Reviewer: regression risk, V1 default protection, public-surface guards, no accidental file seeding;
- Gemini Challenger: broken-intermediate risk, clean-room boundary, hidden legacy coupling.

Captain escalation is required only if the plan changes to include legacy file seeding, public/API/UI diagnostic exposure, live jobs before a committed/refreshed implementation, or a shared adapter that weakens the V1/V2 boundary.

## 9. Review Approval Consolidation

Reviewer outcome for the revised plan:

| Reviewer lens | Verdict | Notes |
|---|---|---|
| Claude Opus LLM/runtime safety | APPROVE for 6B.3a only | No blockers. Recommended render determinism, schema version pinning, explicit no-file-seeding restatement, and structural enum/key hygiene. |
| Claude Sonnet code/regression review | APPROVE | No blockers. Recommended clarifying that policy tests preserve shipped blocked state and that the build is unconditional for 6B.3a. |
| Gemini challenger | APPROVE | No blockers. Recommended strict approved-variable validation and zero V1 analyzer imports in runtime schemas. |
| Senior Developer | APPROVE with required clarifications | Required all V1 analyzer imports to be forbidden, production status flips to stay out of scope, runtime schemas to live in production V2 code, and 6B.3a cache/provenance to avoid placeholder provider telemetry. |

Captain escalation is not needed for 6B.3a because the approved slice excludes legacy file seeding, public/API/UI diagnostic exposure, live jobs, shared adapters, runtime model calls, and approval flips.

## 10. Current Decision

6B.3a foundation code is complete and committed at `2d14c89a`.

Until 6B.3b/6B.3c receive separate review and approval:

- `claimboundary-v2` remains not file-seeded;
- `claim_understanding_gate1` remains non-executable;
- prompt/model/cache approvals remain unflipped;
- no runtime LLM call is added;
- no live jobs are submitted;
- V1 remains the default runtime.

6B.3a verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- Source import scan for V1 analyzer imports/prompt-loader reuse in `apps/web/src/lib/analyzer-v2`
- `npm -w apps/web run build`; postbuild reseed reported `Prompts: 0 changed, 3 unchanged`
- `npm test`
- `git diff --check`

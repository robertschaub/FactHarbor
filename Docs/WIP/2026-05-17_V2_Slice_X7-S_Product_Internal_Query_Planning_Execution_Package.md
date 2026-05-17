# V2 Slice X7-S Product-Internal Query Planning Execution Package

**Date:** 2026-05-17
**Status:** reviewer-approved source package; source implementation may proceed only inside this envelope
**Owner role:** Lead Developer / Captain deputy
**Baseline:** `68f450cb` (`docs: record v2 provenance hash reinspection`)
**Parent result:** X7-R `PASS_X7_R_POST_X7Q_X7O_OBSERVED`
**Prior runtime basis:** 7L-1 query-planning runtime `6162e057`
**Prior product observation basis:** X7-O pre-execution observation, X7-R live smoke

## 1. Purpose

X7-S proposes the first product-route hidden Query Planning execution after X7-R proved:

- accepted direct-text Claim Understanding output;
- X7-J Evidence Lifecycle intake readiness;
- X7-O Query Planning structural preconditions with `sourceLanguageSignal: present`;
- public V2 output still damaged/precutover with no hidden leak.

X7-S must remain product-internal and hidden. Its goal is to execute the already implemented 7L-1 Query Planning runtime from the product V2 route only when a separate X7-S activation gate is explicitly open, then record a redacted admin-only runtime artifact. It does not create sources, evidence, reports, verdicts, confidence, warnings, public output, or V1 cleanup.

## 2. Current Preconditions

Already implemented and available:

- clean-room `V2_EVIDENCE_QUERY_PLANNING` prompt section in `apps/web/prompts/claimboundary-v2.prompt.md`;
- query-planning gateway/model/cache policy metadata for `evidence_query_planning`;
- 7L-1 `runEvidenceQueryPlanningRuntime(...)` with injected provider boundary, prompt loader, strict schema validation, no-store/no-read cache decision, and no provider/search/fetch/parser imports;
- 7M-1 query-plan inspection and non-executable query-plan-to-source-acquisition handoff contracts;
- X7-O product-route pre-execution observation artifact proving the product V2 route can observe prerequisites without executing Query Planning.

Recently closed before this package:

- Claim Understanding artifact route now returns `Cache-Control: no-store`;
- X7-R API/web-proxy admin reinspection returned non-null created/executed hash fields matching the package commit.

## 3. Requested Review Decision

Requested reviewer decision:

> Approve, modify, or reject X7-S as the next source package for product-internal hidden Query Planning execution. If approved, implementation is limited to explicit X7-S activation gating, product-route invocation of the existing 7L-1 runtime for accepted direct-text ClaimContracts, a query-planning provider factory/config contract, a bounded admin-only no-store runtime artifact route, focused tests, boundary guards, and status/handoff/index updates. Source/search/fetch/parser execution, Source Reliability, cache IO, evidence/report/verdict/warning/confidence behavior, public exposure, live jobs, prompt/config/schema edits, ACS/direct URL execution, V1 reuse, and V1 cleanup remain blocked.

First-pass review returned `MODIFY` from Security/runtime, Code/package, and LLM/semantic. This revision incorporates their required changes: concrete provider allowlist/config authority, stricter activation invariants, gate-register ownership, bounded admin-sensitive query artifact rules, explicit semantic inspection criteria, one-call/no-retry failure tests, and later X7-T two-input guidance.

Second-pass review returned `APPROVE` from Code/package and LLM/semantic and one Security/runtime `MODIFY` for explicit internal artifact route controls. This revision incorporates that route contract in Section 7.2. Security/runtime then approved the revised package. Source implementation is authorized only inside this package envelope; live jobs remain blocked until a later reviewed X7-T package.

If reviewers cannot consent on the activation model, provider-factory scope, artifact contract, gate-register update, or product-route owner files, stop before source implementation.

## 4. Proposed Source Envelope

Allowed production files:

- `apps/web/src/lib/analyzer-v2/execution-selection.ts`
  - add a separate Query Planning runtime activation flag reader;
  - default closed;
  - do not alter V1 fallback behavior or Claim Understanding activation semantics.
- `apps/web/src/lib/internal-runner-queue.ts`
  - pass the X7-S activation status into the V2 shell only;
  - do not submit jobs, run live jobs, or alter V1.
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`
  - thread the activation status to the orchestrator/run context.
- `apps/web/src/lib/analyzer-v2/run-context.ts`
  - freeze a Query Planning activation snapshot in the existing run-context pattern;
  - include approval pointer, status, provider identity, rollback target, and artifact visibility.
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
  - after X7-O observation, invoke Query Planning only when X7-S activation is open and X7-O prerequisites are observed;
  - public damaged/precutover envelope remains unchanged even if Query Planning succeeds or fails.
- `apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.ts`
  - define the product Query Planning provider config contract;
  - allow only supplied, validated runtime config snapshots.
- `apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts`
  - build the injected provider callback for the existing 7L-1 runtime;
  - provider SDK imports are allowed only here and only from the reviewed allowlist.
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`
  - record redacted bounded process-local admin-only runtime artifacts;
  - no durable storage and no public pointer exposure.
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.ts`
  - authenticated admin-only no-store read route for bounded artifacts.
- `Docs/AGENTS/V2_Gate_Register.json`
  - record X7-S as hidden/internal Query Planning product execution only;
  - preserve no-source/no-public/no-live/no-cache/SR/parser/V1 blockers.
- `scripts/validate-v2-gate-register.mjs`
  - add self-test tokens so X7-S cannot silently lose hidden/internal/no-source/no-public/no-live constraints.

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/execution-selection.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/run-context.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts` only if an orchestrator test file already exists or is necessary;
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `scripts/validate-v2-gate-register.mjs` self-test coverage

Status/handoff/index files may be updated according to protocol.

Any other source file requires returning to review.

## 5. Activation Contract

X7-S must have a separate default-closed activation gate.

Proposed env flag:

- `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`

Rules:

- default is `kill_switch_closed`;
- Claim Understanding activation does not imply Query Planning activation;
- V2 shell enablement does not imply Query Planning activation;
- Query Planning activation applies only to explicit `claimboundary-v2` product-route jobs;
- activation snapshot is frozen in the run context;
- rollback returns to X7-O pre-execution observation only;
- tests must prove closed activation records no Query Planning runtime artifact and does not invoke provider callbacks.

Activation may open only when all of these are true:

- V2 shell is enabled;
- requested variant is exactly `claimboundary-v2`;
- Claim Understanding runtime activation is open and produced accepted direct-text output;
- X7-S Query Planning activation flag is open;
- the frozen X7-S activation snapshot names this package path and approval id;
- the provider runtime config snapshot satisfies the X7-S contract;
- existing gateway/model/cache policy checks still pass for `evidence_query_planning`;
- X7-O observed direct-text Query Planning prerequisites with source language present.

Env flag alone is never sufficient execution authority.

## 5.1 Provider Runtime Config Contract

The X7-S provider runtime config snapshot must be supplied and validated before callback creation.

Required snapshot values:

| Field | Value |
|---|---|
| `source` | `v2_task_policy_snapshot` |
| `gatewayTaskId` | `evidence_query_planning` |
| `modelTask` | `understand` |
| `modelPolicyId` | `v2.model.evidence_query_planning.0` |
| `providerPolicy` | `from_config_snapshot` |
| `providerId` | `anthropic` |
| `modelId` | `claude-haiku-4-5-20251001` |
| `configSnapshotAuthority` | `supplied_validated_runtime_config_snapshot_only` |
| `temperature` | `0.1` |
| `maxCalls` | `1` |
| `schemaRetryCount` | `0` |
| `timeoutMs` | `90000` |
| `maxOutputTokens` | `4000` |
| `outputSchemaVersion` | `v2.evidence_query_planning_result.0` |
| `approvalPointer.sourcePackage` | this X7-S package path |
| `cacheIo` | `forbidden` |
| `publicSurface` | `internal_only` |

The config snapshot hash must be computed over the gateway task id, model policy id, provider id, model id, temperature, call/retry/timeout/token settings, output schema version, approval pointer, and activation profile id. Missing or placeholder provider/model/config values block before provider callback creation.

Allowed provider SDK imports for the factory are exactly:

- `ai` for `generateText`;
- `@ai-sdk/anthropic` for `anthropic`.

The factory must not import provider web-search/tool APIs, create provider clients outside the injected callback, call `fetch(...)`, expose SDK errors, expose request headers, or read config storage directly.

## 6. Runtime Behavior

When activation is closed:

- keep current behavior exactly: Claim Understanding, X7-J intake, X7-O pre-execution observation, damaged public envelope.

When activation is open:

1. require accepted Claim Understanding handoff;
2. require X7-J `intake_ready`;
3. require X7-O status `structural_prerequisites_observed_not_executed_precutover`;
4. use the existing accepted direct-text `ClaimContract` and selected AtomicClaim IDs;
5. construct a validated Query Planning provider runtime config snapshot;
6. create the injected provider callback through the X7-S factory;
7. call `runEvidenceQueryPlanningRuntime(...)`;
8. build the existing 7M-1 inspection summary;
9. build the existing non-executable query-plan-to-source-acquisition handoff when structurally possible;
10. record a bounded redacted admin-only no-store runtime artifact;
11. always return the same damaged/precutover public envelope.

Blocked/damaged Query Planning outcomes are valid hidden artifacts. They must not trigger retries, fallback prompts, model escalation, source execution, warnings, or public changes.

Schema-invalid, parse-invalid, provider-failed, timeout, and damaged outcomes must prove exactly one attempted Query Planning model call when callback invocation begins. Closed activation, missing language, failed prerequisite, invalid config snapshot, or failed gateway/model/cache policy must prove zero model calls.

## 7. Artifact Contract

Allowed artifact fields:

- artifact version, run id, ledger id, created UTC;
- activation status and activation snapshot hash;
- runtime status and blocked/damaged structural reason;
- schema outcome status;
- selected AtomicClaim IDs and structural query target IDs;
- query entry count and bounded query entries only if schema accepted;
- source-language policy and supplementary-language rationale emitted by the LLM;
- prompt section id and prompt/rendered content hashes, not prompt text;
- model/cache policy ids and no-store/no-read cache posture;
- sanitized provider telemetry: provider id, model id, token counts, duration;
- 7M-1 inspection status and source-acquisition handoff status;
- product/public execution flags proving no source/evidence/report/verdict/public behavior occurred.

Bounded query entries are admin-sensitive validated model output, not raw provider output. They may be stored only inside the authenticated internal artifact and must be bounded:

- maximum 6 query entries;
- maximum 240 UTF-16 code units per query text field;
- maximum 80 UTF-16 code units per query label/id-like field;
- no source URLs;
- no fetched snippets;
- no request/response envelope;
- no prompt text.

Tests must include sentinel claim/query text to prove this admin-sensitive content is absent from public result/API/report/export surfaces and present only in the authenticated internal no-store route when schema accepted.

Forbidden artifact fields:

- raw rendered prompt text;
- raw provider output;
- provider request/response bodies;
- provider secrets, headers, API keys, or SDK errors;
- fetched source content;
- source records;
- evidence items;
- Source Reliability scores;
- scarcity/sufficiency findings;
- user-visible warnings;
- verdict/confidence/report fields;
- public compatibility fields beyond fixed blocked/precutover flags.

## 7.1 Semantic Inspection Criteria

The hidden artifact/tests must prove structural visibility of the LLM-owned Query Planning semantics without deterministic semantic judging:

- source-language policy is recorded from the accepted model output;
- supplementary-language rationale is recorded from the accepted model output;
- query entry count and target AtomicClaim IDs are recorded;
- bounded query entries are recorded only after strict schema acceptance;
- code does not detect language, translate, expand keywords, rank sources, score query quality, or infer source-language policy;
- missing or `und` language blocks before prompt rendering/provider callback;
- non-English source-language signals do not default to English in code.

## 7.2 Internal Artifact Route Contract

The internal Query Planning artifact route must mirror the X7-O/X7-R admin route posture:

- require configured `FH_ADMIN_KEY`;
- return `401` in production when `FH_ADMIN_KEY` is missing;
- return `401` for unauthenticated or wrong-key requests;
- set `Cache-Control: no-store` on every response, including `400`, `401`, and `404`;
- accept exactly one `ledgerId` query parameter;
- reject missing, blank, duplicate, malformed, overlong, listing, or enumeration-shaped requests;
- keep `400` and `404` response bodies bounded and generic;
- never echo `ledgerId` or other lookup keys in error responses;
- expose no listing endpoint;
- provide no public route, UI, report, export, or compatibility-view import path to the sink or route.

Focused route tests must cover configured-key success, production missing-key `401`, wrong-key `401`, all invalid `ledgerId` shapes above, no-store on every response path, bounded generic error bodies, no error-body ledger echo, no listing/enumeration, and absence from public surfaces.

## 8. Explicitly Blocked Scope

X7-S must not implement or authorize:

- provider search, web search, fetch, content dereference, parser, or network source execution;
- Source Reliability import/call/cache/admin integration;
- cache reads, cache writes, durable artifact storage, or database writes for Query Planning artifacts;
- prompt text edits, prompt/profile file seeding, UCM/default JSON edits, schema changes, or approval flips outside the X7-S activation snapshot;
- query-quality deterministic semantic validators, language detection, translation, keyword expansion, or source ranking;
- EvidenceCorpus, EvidenceItems, source material, extraction, applicability, sufficiency, warnings, report text, verdict, confidence, or public result changes;
- ACS prepared snapshot runtime, direct URL runtime, live jobs, validation batches, public cutover, V1 reuse, V1 cleanup.

## 9. Quality And Cost Controls

Quality remains priority over speed and cost.

Prevention-first controls:

- one Query Planning model call per product V2 run;
- no schema retry and no semantic repair loop unless later reviewed;
- selected AtomicClaims batched in one prompt;
- max query entries remains the 7L-1 limit of 6;
- missing or `und` source-language signal blocks before prompt/provider invocation;
- source-language-first behavior must be inspectable in the hidden artifact;
- supplementary-language lane decisions remain LLM output only;
- dynamic claim content remains separate from stable prompt text for future prompt caching.
- invalid schema or damaged model output records a hidden damaged artifact after one call; it does not retry, repair, escalate, warn publicly, or change the public envelope.

## 10. Required Verifiers

Minimum source verifier set if X7-S is implemented:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/execution-selection.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/run-context.test.ts test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.test.ts test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm -w apps/web run build
npm run index
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by this package. A later X7-T live-smoke package may be drafted only after X7-S source review and commit. Recommended X7-T shape, if later approved: two exact Captain-approved direct-text inputs, one non-English and one English, to verify source-language-first behavior without treating the run as evidence/report/verdict-quality validation.

## 11. Stop Conditions

Stop and return to review if implementation requires:

- editing prompt text, UCM/default JSON, schema fixtures beyond artifact route tests, or model policy values;
- product/public UI/report/export compatibility changes;
- source/provider/search/fetch/parser/SR/cache/storage behavior;
- live jobs or validation batches;
- V1 analyzer/prompt/type/code reuse or cleanup;
- accepting missing/`und` language by defaulting to English;
- exposing raw prompt/provider output;
- making Query Planning activation depend only on V2 shell or Claim Understanding activation.

## 12. Reviewer Prompt

Use this prompt for Architect, Security/runtime, Code/package, LLM/semantic, Claude Opus, Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md` as the proposed FactHarbor V2 product-internal hidden Query Planning execution package after X7-R. Return `approve`, `modify`, or `reject`. Check activation gating, allowed file envelope, provider factory scope, artifact redaction, no-store/admin-only route behavior, no source/search/fetch/parser/SR/cache/public/V1 work, multilingual/source-language-first behavior, no deterministic semantic routing, verifier adequacy, rollback, and whether implementation may proceed without Captain escalation.

## 13. Package Verification

Docs-only verification before review:

- `git diff --check`;
- `git diff --cached --check` after staging;
- no source/test/prompt/config/schema changes;
- no live jobs.

# V2 Slice 7N-1 Source-Acquisition Execution Design Approval Package

**Date:** 2026-05-16
**Status:** reviewed design/approval package; docs-only; no source implementation
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `a3f8c4bf` (`docs: consolidate v2 post 7m1 source design gate`)
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N_Post_7M1_Source_Acquisition_Execution_Design_Consolidation.md`
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Design the future source-acquisition execution boundary after 7M-1 without implementing it.

7N-1 is intentionally docs-only. It does not authorize provider/search/fetch/parser/network behavior, concrete provider factories, product wiring, public exposure, live jobs, cache IO, Source Reliability integration, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup.

The next implementation, if approved later, should first add an Analyzer V2-owned structural execution core with an injected source-acquisition port. Concrete provider/search/fetch wiring remains a separate later gate.

## 2. Review Result

Expert review result:

- LLM/pipeline architect reviewer: `APPROVE`.
- Source-acquisition/runtime boundary reviewer: `MODIFY`.
- Code reviewer/gatekeeper: `MODIFY`.

Required modifications were applied:

- 7N-2 is explicitly fake/test/controlled-harness-only and cannot use production/runtime concrete source IO before 7N-3.
- 7N-2 must consume or deliberately extend existing 7M-1/7C/7H contracts rather than create a parallel source-acquisition contract.
- Budget failure semantics are fail-closed and cannot silently drop source diversity while reporting success.
- Opaque content packet pointers cannot contain or dereference raw content and cannot imply storage.
- The verifier now checks file envelope, existing-contract reuse, approved structural labels, budget-failure behavior, and semantic-leakage guards.

Consolidated verdict: 7N-1 is approved as docs-only design authority. It is not source implementation authority.

## 3. Current Inputs

The future execution core may start only from:

- `QueryPlanSourceAcquisitionHandoffDecision.status === "ready_not_executable"`;
- `handoff.executionScope === "not_executable"` from 7M-1;
- hidden/internal visibility;
- selected AtomicClaim IDs supplied by the same 7L-1 input envelope;
- accepted `EvidenceQueryPlanningResult`;
- prompt/model/cache provenance from 7L-1;
- no-store/no-read cache provenance.

Blocked 7M-1 decisions, damaged query planning, missing provenance, missing selected IDs, unknown target IDs, or wrong-source selected snapshots must remain blocked and must not create source attempts.

## 4. Design Decision

Split source acquisition into three gates:

1. **7N-1 design/approval**: this docs-only package.
2. **7N-2 structural execution core**: may be proposed later as source code under Analyzer V2, but injection-only and controlled-harness-only. It may define/call an injected interface only with fake, test, or explicitly controlled non-production harness implementations, and return typed structural outcomes. It must not import provider SDKs, network/parser modules, Source Reliability, cache/storage, product/public surfaces, analyzer-v2-runtime concrete factories, or V1 code.
3. **7N-3 concrete provider/search/fetch wiring**: later reviewed source-wiring package outside the Analyzer V2 clean-room core. It must name SDK/import owners, credentials/config ownership, runtime refresh, rollback, hidden artifact inspection, and no-public-leak verifier before live jobs.

No production/runtime concrete provider, network, parser, search/fetch implementation, product-injected port, or callback factory may exist before 7N-3 approval. Avoiding direct SDK imports is not sufficient authority to run real source IO.

This keeps the clean architecture boundary: the Evidence Lifecycle owns source-acquisition state and structural outcomes; concrete IO ownership is injected through a reviewed port; semantic evidence meaning remains LLM-owned later.

## 5. Proposed 7N-2 Source Envelope

7N-1 does not approve these edits. It defines the envelope a later 7N-2 source package should review.

Candidate production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts`

Candidate test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

7N-2 should not edit:

- `apps/web/src/lib/internal-runner-queue.ts`;
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/**` edits, unless a later package explicitly expands the envelope;
- public app/API/UI/report/export/compatibility files;
- `apps/web/src/lib/analyzer-v2-runtime/**`;
- `apps/web/src/lib/analyzer/**`;
- `apps/web/prompts/**`;
- `apps/web/configs/**`;
- Source Reliability files;
- API project files.

If implementation needs any forbidden file, stop and return to review.

7N-2 must consume or deliberately extend existing contracts rather than create a parallel source-acquisition contract:

- consume `QueryPlanSourceAcquisitionHandoffDecision` from `query-plan-handoff.ts`;
- preserve the existing `SourceAcquisitionRequest` / `SourceAcquisitionStartDecision` boundary from `source-acquisition/types.ts`;
- reuse the approved 7H structural outcome labels from `source-acquisition-port/types.ts`, either by type-only import or by documented exact projection;
- keep the existing `source-acquisition-port/**` files inert unless a later package explicitly reviews edits there.

## 6. Structural Execution Contract

The future structural execution core may define these concepts:

- `SourceAcquisitionExecutionRequest`
  - wraps the 7M-1 handoff;
  - carries a run-scoped execution id;
  - carries a frozen source-acquisition budget snapshot;
  - carries an injected `SourceAcquisitionPort` usable only by fake/test/controlled-harness implementations before 7N-3.
- `SourceAcquisitionPort`
  - accepts one bounded structural query attempt at a time or a bounded batch;
  - returns typed structural outcomes only;
  - has no semantic authority;
  - has no production/runtime concrete provider authority before 7N-3.
- `SourceAcquisitionExecutionResult`
  - hidden/internal only;
  - records structural attempts and content packet pointers;
  - does not create `EvidenceCorpus`;
  - does not create evidence items, applicability decisions, sufficiency, warnings, verdicts, confidence, or report fields.

Structural attempt fields may include:

- source-acquisition execution id;
- query plan id and query id;
- retrieval policy key;
- target AtomicClaim IDs;
- provider/search/fetch attempt id;
- provider id or port id;
- submitted query text from the approved query plan;
- attempt status from the approved structural label set;
- started/completed timestamps or duration;
- timeout/rate-limit/circuit/cancellation state;
- result count and bounded source candidate ids;
- structural source identity fields;
- content availability status;
- opaque content packet pointer id when content was acquired by a later approved gate.

The structural core must not inspect query text, snippets, titles, URLs, or content bodies to decide meaning. It may validate shape, IDs, limits, provenance, and configured budget.

Any 7N-2 content pointer must be opaque, non-durable, non-dereferenceable by the structural core, and contain no raw content, title, snippet, body, URL-derived semantic label, or provider payload. It must not imply cache, storage, retention, or public exposure. Real content retention or packet dereference requires a later package.

## 7. Budget And Cost Boundary

7N-1 does not set production fan-out values. 7N-2 must include an explicit budget snapshot before implementation.

The budget snapshot must define:

- max query entries consumed from the handoff;
- max provider attempts per query;
- max candidate records admitted per query;
- per-attempt timeout;
- cancellation behavior;
- retry policy, if any, with a root-cause and quality justification;
- byte or content-packet cap before later semantic tasks;
- whether duplicate structural source identities are collapsed before content admission.

If any value affects analysis quality or may need tuning, its long-term owner is UCM/task policy, not hardcoded runtime behavior. A temporary static value is allowed only when the package records why it is a fixed gate constant and how it will be migrated.

Quality remains priority over speed/cost. Cost controls must bound waste without suppressing source diversity needed for later LLM evidence tasks.

7N-2 must fail closed before any port call when:

- the budget snapshot is missing, malformed, stale, or not tied to the current handoff;
- budget caps are below the accepted handoff's query-plan requirements and no explicit reviewed partial-execution policy exists;
- cancellation is already requested;
- retry policy is absent but the executor would need retry behavior to proceed.

Partial execution, cancellation, timeout, rate limiting, and retry exhaustion must be recorded as structural states, not as successful acquisition. Cost controls must not silently drop planned source diversity and then report success.

## 8. Semantic Boundary

Source-acquisition execution is structural IO only.

It must not decide or emit:

- relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value;
- evidence strength;
- source credibility meaning;
- Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict or confidence;
- report narrative or public prose.

Provider rank, fetch success, source domain, URL shape, title, snippet, language metadata, or content length must not become semantic evidence quality.

Later LLM-owned tasks may consume source records/content packets to decide applicability, extraction, probative value, source-language strategy, and sufficiency under separately approved prompt/model/UCM gates.

## 9. Source Reliability Boundary

Source Reliability remains unchanged.

7N-2 must not import or call Source Reliability. A later SR thin-port package may attach SR signals only after source records exist and only after it defines:

- source identity handoff fields;
- SR request/response contract;
- cache/read policy;
- score visibility;
- whether SR can affect later semantic or verdict stages;
- quality validation and rollback.

SR must not become hidden verdict weighting through source acquisition.

## 10. Cache And Storage Boundary

Default remains `no_store_no_read`.

7N-2 must not:

- construct durable cache keys;
- read cache;
- write cache;
- persist content packets;
- dereference opaque content packet pointers;
- write to config or database storage.

Hidden in-memory state for unit tests or injected test ports is allowed only inside tests. Any real retention or cache IO requires a separate package covering identity, privacy, invalidation/freshness, rollback, and tests.

## 11. Multilingual Boundary

7N-2 must preserve source-language-first behavior from the query plan.

It must not:

- default to English;
- translate queries or content;
- classify language by regex/keyword;
- generate supplementary language lanes;
- repair missing or `und` language states.

Supplementary lanes remain upstream LLM output and later UCM/task-policy owned. Source acquisition may only execute the structural query entries it was given.

## 12. Warning And Public-Surface Boundary

7N-2 must not emit user-visible warnings.

It may record hidden/internal structural events such as provider unavailable, timeout, rate limited, fetch failed, content unavailable, or content rejected structurally. These are not warning materiality decisions.

A later sufficiency/warning gate decides whether structural acquisition outcomes become admin-only diagnostics, user-visible warnings, damaged-report state, or analytical-reality scarcity findings.

No public API/UI/report/export/compatibility field may expose source-acquisition execution state until a later public-surface gate approves it.

## 13. Required 7N-2 Verifier

A later 7N-2 source package must require at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

Focused tests must prove:

- blocked/non-ready handoffs create no source attempts;
- accepted 7M-1 handoffs create only hidden/internal structural execution results;
- injected port calls are bounded by the approved budget snapshot;
- structural outcomes never create `EvidenceCorpus`, evidence items, applicability, probative values, SR scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, or public prose;
- source-language policy is passed through unchanged;
- supplementary-lane rationale is preserved as upstream LLM output;
- no deterministic query-quality or content-meaning checks exist;
- no provider SDK, network/parser, direct `fetch(...)`, cache/storage, Source Reliability, product/public, analyzer-v2-runtime, or V1 imports appear in Analyzer V2 source-acquisition execution core.
- exact allowed production file list is enforced for the 7N-2 source package;
- the implementation consumes or explicitly extends `QueryPlanSourceAcquisitionHandoffDecision` and reuses the approved 7H structural outcome labels;
- invalid or missing budget snapshots create no port calls;
- blocked, missing-provenance, wrong-selected-snapshot, cancellation, timeout, retry-exhausted, and partial-execution cases stay structural-only;
- snippets, titles, URLs, domains, language metadata, and content bodies are never inspected for meaning;
- source-acquisition-port files remain inert unless explicitly included in a later reviewed envelope.

No expensive tests and no live jobs are approved by 7N-1.

## 14. Reviewer Prompt

Use this prompt for Senior Developer, LLM Expert, Code Reviewer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N1_Source_Acquisition_Execution_Design_Approval_Package.md` as a docs-only V2 source-acquisition execution design package. Return `approve`, `modify`, or `reject`. Check that it does not authorize source implementation, provider/search/fetch/parser/network execution, concrete provider factories, cache IO, Source Reliability, product/public wiring, live jobs, ACS/direct URL execution, prompt/config/model/schema changes, V1 reuse, or V1 cleanup. Check whether the proposed 7N-2 structural execution core should be injection-only inside Analyzer V2, whether concrete provider wiring should stay in a later package, whether semantic decisions remain LLM-owned, whether budget/cost controls are sufficient without compromising quality, and whether the verifier envelope is strong enough.

## 15. Stop Conditions

Stop and return to Captain/deputy review if a reviewer or implementer wants:

- source implementation in 7N-1;
- concrete provider/search/fetch/parser/network code;
- provider SDK imports;
- product/orchestrator/runner wiring;
- live jobs;
- public exposure;
- cache IO or durable storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code in source acquisition;
- ACS/direct URL execution;
- V1 cleanup or reuse.

## 16. Verification For This Package

Docs-only verification:

```powershell
git status --short
git diff --cached --name-only
git diff --check
git diff --cached --check
```

7N-1 may stage only docs and generated handoff-index files for this package. No source/test/prompt/config/schema files are edited by 7N-1, and no live jobs are run.

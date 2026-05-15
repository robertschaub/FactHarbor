# V2 Slice 7M Post-7L-1 Query-Planning Consolidation

**Date:** 2026-05-15
**Status:** docs-only consolidation package; no source implementation
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `b8755293` (`docs: record v2 query planning runtime`)
**Source implementation under review:** `6162e057` (`feat: add v2 query planning runtime`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

7L-1 made one internal Evidence Lifecycle task executable: hidden direct-text query planning for accepted `ClaimContract` input.

This 7M package consolidates the post-implementation state and defines the next safe gate before any more source edits. It is not implementation approval.

The recommended next source step is not source acquisition yet. The next source package should first establish an internal query-plan inspection and handoff boundary so source-acquisition execution can be reviewed against concrete, typed query-plan output instead of inferred intentions.

## 2. Current State

Implemented and committed:

- `6162e057`: hidden/internal query-planning runtime.
- `b8755293`: approval trace, handoff, guardrails, backlog/status updates.

Post-fix reviewer state:

- Senior Developer: `APPROVE`.
- Code Reviewer: `APPROVE`.
- LLM Expert: `APPROVE`.

Post-7L-1 next-step review state for this consolidation direction:

- Senior Developer reviewer: `APPROVE` for a docs-only 7M package before further source edits.
- Code Reviewer / gatekeeper: `APPROVE` for docs-only 7M before further source edits.
- LLM Expert reviewer: `APPROVE` for docs-only 7M before further source edits.

Current committed authority:

- gateway task: `evidence_query_planning` only;
- prompt profile: `claimboundary-v2`;
- prompt section: `V2_EVIDENCE_QUERY_PLANNING`;
- result schema: `v2.evidence_query_planning_result.0`;
- model policy: `v2.model.evidence_query_planning.0`;
- model tier: `standard`;
- temperature: `0.1`;
- max calls: `1`;
- schema retry count: `0`;
- max query entries: `6`;
- cache policy metadata: `v2.semantic.evidence-query-planning`;
- runtime cache posture: no-store/no-read;
- visibility: hidden/internal only.

7L-1 still does not provide:

- product/orchestrator/runner wiring;
- live-job path;
- source acquisition;
- provider/search/fetch/parser/network implementation;
- Source Reliability import/call;
- cache IO;
- public API/UI/report/export/compatibility exposure;
- ACS/direct URL execution;
- V1 cleanup.

## 2.1 State Map

| Slice | State | What It Owns | What It Does Not Own |
|---|---|---|---|
| 7K-1 | Implemented inert contracts | Batch input, pre-call readiness, and provenance envelopes for Evidence Lifecycle tasks. | Runtime execution, source acquisition, public output, live jobs. |
| 7L-1 | Implemented hidden/internal runtime | Direct-text query-planning prompt/model call for accepted `ClaimContract` only. | Source acquisition, evidence extraction, sufficiency, warnings, report effects, product wiring. |
| 7H | Implemented inert source-acquisition port contract | Static structural port boundary and blocked/non-executable authority labels. | Runnable provider/search/fetch implementation, Source Reliability, cache IO, source records. |

The gap between 7L-1 and 7H is the next boundary to define: a query-plan inspection and non-executable handoff contract. That gap should be closed before any source-acquisition execution work.

## 3. Consolidated Decision

Next low-risk step:

> Prepare a reviewed 7M-1 source package for internal query-plan inspection and query-plan-to-source-acquisition handoff contracts only.

Do not proceed directly to:

- provider/search/fetch/source execution;
- product/orchestrator/runner wiring;
- live smoke or canary execution;
- public result/report exposure;
- cache read/write/storage IO;
- Source Reliability integration;
- ACS/direct URL runtime;
- V1 cleanup.

## 4. Why Not Source Acquisition Yet

Direct source acquisition after 7L-1 would cross too many trust boundaries at once:

- query-plan output is newly executable and not yet consumed by a typed downstream contract;
- hidden inspection is not yet defined for query-plan artifacts outside unit tests;
- source acquisition introduces web/search/fetch/parser/network behavior;
- source identity, provenance, source-port bounds, and warning materiality must be reviewed before real acquisition;
- Source Reliability remains unchanged and must only be reached later through an approved thin port;
- live jobs would require committed code, refreshed runtime, meaningful product reachability, and hidden artifact inspection proof.

The safer sequencing is:

1. 7M-1: internal query-plan inspection and handoff contract.
2. Later reviewed gate: source-acquisition execution design/package.
3. Later reviewed gate: source-acquisition source implementation.
4. Later reviewed gate: product wiring and live smoke, if hidden artifacts are inspectable and no public leakage exists.

## 5. Proposed 7M-1 Source Boundary

7M-1 may propose source/test edits only if the review package names the exact files.

Allowed conceptual scope:

- internal `EvidenceQueryPlanningResult` inspection summary for tests/admin-hidden diagnostics only;
- typed handoff from accepted query-planning state into a non-executable source-acquisition planning boundary;
- preservation of exact `ClaimContract`, selected AtomicClaim IDs, query-plan provenance, prompt/model policy snapshot, and no-store/no-read cache posture;
- blocked/damaged query-planning states must not create source-acquisition work;
- hidden/internal diagnostics only.

### 5.1 Query-Plan Inspection Contract

The 7M-1 inspection contract should define what can be inspected without running sources.

Allowed hidden inspection fields:

- run id or internal ledger id;
- query-planning status;
- target AtomicClaim IDs;
- bounded query entries;
- language policy fields and supplementary-language rationale from LLM output;
- prompt/profile/section/content-hash provenance;
- model-policy and cache-policy metadata;
- schema outcome and structural validation errors.

Forbidden inspection content:

- raw rendered prompt text;
- raw provider output;
- provider secrets or request headers;
- user-visible report text;
- fetched source content;
- evidence items;
- sufficiency, scarcity finding, warning, verdict, confidence, or report fields.

Inspection is for internal review only. It must not create or extend a public API/UI/report/export/compatibility path. If an internal route is ever needed, it requires a separate reviewed gate with admin-only access, bounded retention, no-public-leak tests, and redaction rules.

Plan quality must not be judged by deterministic semantic heuristics. Structural checks may confirm shape, IDs, limits, and provenance. Semantic plan-quality review must be human or LLM-owned under a later reviewed task.

### 5.2 Multilingual Inspection Criteria

Any 7M-1 or later query-plan inspection must check:

- primary source language remains source-language-first;
- no English default appears when the accepted `ClaimContract` carries a non-English source language;
- missing or `und` language remains blocked before prompt/provider invocation;
- supplementary-language lanes are explicit LLM output, not deterministic code routing;
- no deterministic language classification, translation, or keyword expansion is introduced.

### 5.3 Source-Acquisition Execution Boundary

The later source-acquisition execution package must separate semantic intent from structural IO.

Query planning may provide:

- search intent;
- target AtomicClaim IDs;
- source-language and supplementary-language rationale;
- evidence-scarcity retrieval intent.

Source acquisition may later record structural IO only:

- provider attempt status;
- query submission metadata;
- timeout/rate-limit/circuit outcomes;
- fetch status;
- source identity/provenance;
- content packet pointers;
- blocked/failed/acquired structural labels.

Source acquisition must not decide:

- relevance;
- credibility;
- probative value;
- evidence strength;
- source reliability score;
- scarcity finding;
- sufficiency;
- warning materiality;
- verdict or confidence impact.

Those semantic decisions remain owned by later LLM-governed Evidence Lifecycle tasks and separately reviewed gates.

### 5.4 Quality And Cost Boundary

The next source-execution package must define a budget before implementation:

- maximum source-attempt fan-out per accepted query plan;
- per-provider timeout and cancellation semantics;
- rate-limit and circuit-breaker behavior;
- maximum content bytes/chunks admitted to later semantic stages;
- retry policy, if any, with a root-cause reason and quality justification;
- UCM/task-policy ownership path before broad tuning.

Do not clone 7L-1 static Captain-approved policy metadata into broader execution. 7L-1's static metadata is temporary and query-planning-specific.

Likely allowed source area:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/**`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/**`
- focused analyzer-v2 tests and boundary guards.

Forbidden unless a later reviewed gate explicitly authorizes it:

- `apps/web/src/lib/internal-runner-queue.ts`;
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- public app/API/UI/report/export/compatibility files;
- `apps/web/src/lib/analyzer-v2-runtime/**`;
- `apps/web/src/lib/analyzer/**`;
- `apps/web/prompts/**`;
- config/default JSON files;
- Source Reliability files.

## 6. Required 7M-1 Verifier

Any 7M-1 source package must require tests proving:

- accepted query plans can be inspected as hidden/internal diagnostics without raw rendered prompts or raw provider output;
- blocked/damaged query-planning states do not create downstream source-acquisition handoffs;
- source-acquisition handoff is non-executable and contains no fetched sources, evidence items, sufficiency, scarcity findings, warnings, or public report fields;
- selected AtomicClaim IDs and query-plan target IDs stay aligned;
- query-plan provenance survives handoff;
- no cache read/write/storage IO occurs;
- no provider/search/fetch/parser/network import or direct `fetch(...)` appears;
- no Source Reliability import/call appears;
- no V1 analyzer/prompt/type/code reuse appears;
- no product/orchestrator/runner/public surface import appears.

Minimum verifier expectation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7M or proposed for 7M-1.

## 7. Live-Job Boundary

Captain-approved future direct-text canaries remain:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Do not run them for 7M or 7M-1. They become meaningful only after a later reviewed live-smoke gate has:

- committed implementation state;
- refreshed runtime/prompt/config state;
- product reachability for the exact hidden V2 path under test;
- internal artifact inspection proof;
- explicit no-public-leak checks;
- rollback/kill-switch plan.

## 8. Reviewer Prompt

Use this prompt for Senior Developer, LLM Expert, Code Reviewer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-15_V2_Slice_7M_Post_7L1_Query_Planning_Consolidation.md` as the proposed next-step consolidation after V2 Slice 7L-1. Return `approve`, `modify`, or `reject`. Check whether the recommended next step should be a 7M-1 internal query-plan inspection and non-executable handoff contract before source acquisition. Focus on whether the package preserves no product wiring, no live jobs, no provider/search/fetch/source execution, no Source Reliability import/call, no cache IO, no public exposure, no ACS/direct URL execution, no V1 reuse/cleanup, and whether its verifier envelope is sufficient.

## 9. Stop Conditions

Stop and return to Captain/deputy review if the next proposed implementation requires:

- source acquisition/search/fetch/parser/network behavior;
- Source Reliability integration;
- product/orchestrator/runner wiring;
- public result/report/API/UI/export/compatibility exposure;
- live jobs or canaries;
- cache IO;
- prompt text or UCM/default JSON changes;
- provider SDK imports or factory work;
- ACS/direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 10. Verification For This Package

Docs-only verification:

- `git diff --check`;
- `git diff --cached --check` after staging;
- no source/test/prompt/config/schema edits;
- no live jobs.

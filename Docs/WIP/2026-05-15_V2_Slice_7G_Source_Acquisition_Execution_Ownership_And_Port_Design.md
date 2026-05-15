# V2 Slice 7G Source Acquisition Execution Ownership And Port Design

**Date:** 2026-05-15
**Status:** approved docs-only at `47c531f2` (`docs: define v2 source acquisition port gate`); no source authorization
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `399d2027` (`docs: record v2 evidence corpus build decision`)
**Prior source gate:** 7F `b8a97413` (`feat: add v2 evidence corpus build decision`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define ownership and approval boundaries for future source acquisition execution before any source execution code exists.

7F established that V2 can represent "corpus not built yet" without fabricating empty evidence, scarcity, sufficiency, or warnings. The next risk is authority: who may plan queries, call search providers, fetch content, classify structural failures, attach future Source Reliability signals, record provenance, and surface warnings.

7G is docs-only. It must not implement ports, provider/search/fetch calls, prompt/model tasks, UCM changes, cache IO, Source Reliability integration, public exposure, orchestrator wiring, live jobs, or V1 cleanup.

## 2. Review Consolidation

Deputy-team debate result: **adopt 7G as docs-only with tight scope**.

Consensus:

- 7G should define ownership and port boundaries, not TypeScript source.
- No `apps/web/src` or test files are authorized by 7G.
- The next source package after 7G should be an inert source-acquisition port contract, not execution.
- Execution requires a later Captain/deputy-approved gate.
- Query planning, applicability, extraction, semantic source quality, contradiction/refinement needs, and supplementary language decisions are future LLM-owned tasks through approved prompt/model/UCM policy.
- Provider/search/fetch ports are structural IO boundaries only.
- Source Reliability remains unchanged and can only enter through a future thin-port package after source records exist.

## 3. Scope Allowed By This Package

Allowed now:

- this WIP approval package;
- status/guardrail/handoff updates that mark 7G as docs-only;
- review questions for later source packages.

Blocked now:

- source edits;
- test edits;
- UCM/default JSON edits;
- prompt file edits;
- gateway/model/cache policy edits;
- provider SDK imports;
- search/fetch/provider implementation;
- prompt rendering or model calls;
- query planning implementation;
- applicability, extraction, sufficiency, boundary, verdict, aggregation, or report code;
- cache keys, cache reads, cache writes, storage IO;
- Source Reliability imports, cache reads, evaluations, admin/config changes, or score consumption;
- public API/UI/report/export/compatibility changes;
- orchestrator/product wiring;
- ACS/direct URL execution;
- live jobs;
- V1 analyzer/prompt/type reuse or cleanup.

## 4. Ownership Model

| Owner | Owns | Must not own |
|---|---|---|
| Evidence Lifecycle | Source-acquisition state, typed handoffs, acquisition trace contracts, source identity contracts, and eventual `EvidenceCorpus` assembly rules. | Provider SDKs, prompt text, model routing, cache persistence, public output. |
| Prompt/model gateway | Future query planning, source applicability, evidence extraction, semantic quality, source-language and supplementary-lane tasks. | Provider/search/fetch IO, deterministic text routing, source cache IO. |
| Provider/search/fetch port owner | Structural search/fetch calls, provider attempt IDs, fetch status, retry/rate-limit/circuit state, cost/timing telemetry. | Semantic relevance, truth, probative value, credibility, sufficiency, verdict direction. |
| Task-policy owner | Frozen run-level task policy snapshot, budgets, approval pointers, rollback target, model/prompt references once approved. | Live singleton mutation during a run; unapproved execution. |
| UCM/admin policy owner | Future editable source acquisition policy, budgets, provider selection, language-lane policy, activation workflow. | Runtime execution without a reviewed activation gate. |
| Source Reliability service | Existing source reliability evaluation/cache/admin domain. | V2 source-acquisition execution, verdict weighting, or hidden credibility authority. |
| Public/report owner | Future result/report/API/UI exposure after a separate gate. | Internal hidden execution state before cutover approval. |

## 5. Future Port Design Principles

A later 7H source package may define inert port contracts only after this package is approved.

Future port contracts should separate:

- semantic LLM task outputs, such as query plans and applicability;
- structural acquisition requests, such as provider/search/fetch attempts;
- structural acquisition outcomes, such as provider failure or fetched content unavailable;
- evidence extraction outputs;
- source identity and provenance;
- future Source Reliability signal attachment;
- sufficiency and warning classification.

The first port source package must remain non-executable unless separately approved.

## 6. Future Typed Outcome Categories

7G does not implement these. It records the conceptual outcome taxonomy later packages should refine.

Structural acquisition outcomes:

- `not_executed`;
- `provider_not_configured`;
- `provider_failure`;
- `search_failure`;
- `rate_limited`;
- `fetch_failure`;
- `content_unavailable`;
- `content_rejected_structurally`;
- `success`.

Semantic or analytical outcomes that must not be produced by provider/search/fetch code:

- relevance;
- applicability;
- evidence strength;
- probative value;
- source credibility;
- evidence scarcity;
- sufficiency;
- verdict support/opposition.

## 7. Query Planning Boundary

Future query planning is an LLM-owned task under approved prompt/model/UCM policy.

Forbidden in source execution code:

- deterministic claim-text routing;
- keyword or regex query expansion;
- English-default query generation;
- language-specific branch logic;
- selected-claim-count heuristics that change semantic retrieval behavior;
- provider rank or fetch success treated as relevance or evidence quality.

Allowed structurally in future source acquisition:

- validating that an approved query plan exists;
- assigning structural query IDs;
- recording query-plan provenance;
- enforcing approved budgets and timeouts;
- recording provider attempts.

## 8. Multilingual And Source-Language Policy

Source-language-first remains policy intent, not execution authority in 7G.

Future behavior must preserve:

- no forced translation as a prerequisite;
- no English default unless an approved UCM/prompt policy chooses it for a specific task;
- no deterministic language routing from detected language alone;
- supplementary language lanes as future LLM/UCM-governed policy, not hardcoded code paths.

## 9. Provenance And Trace Requirements

Future executable packages must record:

- run id and source-acquisition request id;
- task-policy snapshot version/hash;
- query plan id and query attempt ids;
- provider attempt ids;
- provider/search/fetch status;
- timing, retry, rate-limit, and circuit state;
- structural source identity;
- content availability and rejection reason;
- source record provenance;
- cache provenance if a later cache gate approves IO.

Future trace must not record:

- secrets;
- raw provider credentials;
- raw prompt text;
- hidden model output intended only for diagnostics;
- public result fields unless a public gate approves them.

## 10. Warning And Sufficiency Boundary

7G must not add warning codes or emit warnings.

Future classification ownership:

- pre-execution not-run state is not evidence scarcity;
- provider/search/fetch collapse after execution is a system failure candidate;
- evidence scarcity is analytical reality only after approved acquisition, extraction, and sufficiency assessment;
- recovered fallbacks are silent or admin-only unless they materially degrade the verdict;
- user-visible warnings require `warning-display.ts` registration and a later result/report gate.

Sufficiency remains a separate gate after evidence acquisition and extraction. Source acquisition must not manufacture sufficiency or confidence.

## 11. Cache Boundary

Default remains `no_store_no_read`.

Any future cache requires a separate approval package covering:

- cache identity;
- IO owner;
- provenance dimensions;
- invalidation/freshness;
- rollback behavior;
- privacy constraints;
- tests and guards.

7G authorizes no cache key construction and no cache IO.

## 12. Source Reliability Boundary

Source Reliability remains unchanged.

7G may only define the future thin-port principle:

- SR signals can attach only after source records exist;
- SR access requires a later reviewed SR-port package;
- no SR imports, cache reads, evaluations, admin/config changes, or score consumption are allowed before that package;
- SR signals must not become hidden verdict weighting without quality validation and approval.

## 13. Public Surface Boundary

The public result remains the damaged pre-cutover envelope.

7G authorizes no:

- API/UI/report/export fields;
- compatibility-view changes;
- public diagnostics;
- hidden artifact expansion;
- live jobs.

## 14. Recommended Next Gate Sequence

Recommended sequence after 7G:

1. `7H` inert source-acquisition port contract: source types only, no execution, no SDKs, no fetch/search, no prompt/model call.
2. Prompt/model approval package for query planning, applicability, and extraction tasks.
3. Provider/search/fetch source-wiring package with Captain/deputy approval.
4. Source Reliability thin-port package, still preserving the existing SR service.
5. Cache package only if no-store/no-read is intentionally changed.
6. EvidenceCorpus population and sufficiency gate package.
7. Public result/report/API/UI exposure package.

## 15. Required Gates Before Execution

Captain/deputy approval is required before:

- source execution code;
- provider/search/fetch implementation;
- provider SDK imports;
- prompt/model/schema/UCM changes;
- cache IO;
- Source Reliability import/call/cache access;
- orchestrator/product wiring;
- public API/UI/report/export exposure;
- ACS/direct URL execution;
- live jobs;
- V1 cleanup.

## 16. Verification For This Package

Docs-only verification:

- `git diff --check`;
- no source/test file changes;
- no live jobs;
- reviewer confirmation that 7G authorizes design only.

## 17. Review Questions

Reviewers should answer:

1. Does 7G correctly stay docs-only?
2. Are source execution, query planning, provider/search/fetch, cache, Source Reliability, and public boundaries clear enough?
3. Is `7H` correctly framed as inert port contracts rather than execution?
4. Are the future outcome categories useful without creating authority?
5. Is Captain escalation needed before committing this docs-only package?

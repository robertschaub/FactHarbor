# V2 Slice 7N Post-7M-1 Source-Acquisition Execution Design Consolidation

**Date:** 2026-05-16
**Status:** docs-only consolidation and next-gate design boundary; no source implementation
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `cc8068fd` (`fix: centralize v2 7l1 approval record`)
**Implemented parent gate:** `e24a2816` (`feat: add v2 query plan inspection handoff`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

7M-1 closed the gap between hidden query planning and source-acquisition planning by adding:

- hidden/internal query-plan inspection;
- explicit selected AtomicClaim snapshot input from the same 7L-1 invocation;
- a non-executable query-plan-to-source-acquisition handoff.

This 7N package consolidates post-7M-1 review and fixes next-step wording. The next V2 step is not source implementation. It is a reviewed **source-acquisition execution design/approval package**. Only a later explicitly approved source implementation gate may add executable provider/search/fetch/parser/network behavior.

## 2. Review Result

Expert review result:

- LLM/pipeline architect reviewer: `APPROVE`.
- Source-acquisition/runtime boundary reviewer: `MODIFY`.
- Code reviewer/gatekeeper: `MODIFY`.

Consensus after consolidation:

- 7M-1 is structurally aligned with the approved package.
- Query plans remain intent, not evidence.
- Handoff remains hidden/internal and `not_executable`.
- No provider/search/fetch/parser/network, cache IO, Source Reliability, product/public wiring, live jobs, ACS/direct URL execution, V1 reuse, or V1 cleanup is authorized.
- The next step wording must split design from implementation so agents cannot read "source-acquisition execution package" as permission to execute sources.

## 3. Current 7M-1 State

Implemented source:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.ts`

Current guarantees:

- selected AtomicClaim IDs come from an explicit `7l1_input_envelope` snapshot, never from query target inference;
- inspection summaries redact raw prompt/provider output, raw adapter failure messages, provider model IDs, cache key parts, and public prose;
- structural coverage is labeled `structural_only_not_quality_assessment`;
- accepted query plans can create only a hidden `ready_not_executable` handoff;
- blocked states return a blocked decision with `handoff: null`;
- query entries are bounded by the 7L-1 max of `6`;
- provenance must include prompt, model policy, and no-store/no-read cache state.

Residual note:

- Focused tests use source-language fixtures and the code preserves source-language policy through inspection and handoff. A later source implementation package should add direct assertions if it touches those modules.

## 4. Next Gate Decision

Next safe step:

> Prepare a reviewed 7N-1 source-acquisition execution design/approval package. It must be design-only and must name the later implementation envelope before source edits occur.

7N-1 must not edit source/test files unless Captain/deputy review explicitly converts it into a source implementation package. If source implementation is desired, split it into a later 7N-2 package with exact files, tests, rollback, and verifier commands.

Recommended sequence:

1. 7N: this docs-only post-7M-1 consolidation.
2. 7N-1: source-acquisition execution design/approval package, docs-only.
3. 7N-2: source-acquisition source implementation package, only after explicit approval.
4. Later gate: product/orchestrator wiring and live smoke, only after executable source acquisition has hidden artifact inspection and no-public-leak proof.

## 5. Required 7N-1 Design Contents

The design package must define structural IO ownership before implementation:

- source-acquisition request id and attempt ids;
- query-plan and query-entry provenance;
- provider/search/fetch attempt status;
- timeout, rate-limit, cancellation, retry, and circuit-breaker accounting;
- source identity and provenance fields;
- content availability and structural rejection reasons;
- content packet pointer shape for later semantic tasks;
- cost and fan-out budget;
- rollback and kill-switch behavior;
- exact implementation file envelope and forbidden file list;
- focused tests and boundary-guard additions.

The design package must explicitly keep semantic meaning out of source-acquisition IO.

Provider/search/fetch code may later record only structural facts. It must not decide:

- source relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value or evidence strength;
- source credibility meaning or Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict, confidence, or report impact.

Those decisions remain owned by later LLM-governed Evidence Lifecycle tasks and reviewed prompt/model/UCM gates.

## 6. Blocked Scope

Still blocked until a later explicitly reviewed gate:

- provider/search/fetch/parser/network implementation;
- provider SDK imports or concrete provider factories for source acquisition;
- Source Reliability import/call/cache/admin/score use;
- cache keys usable for IO, cache reads, cache writes, or durable storage;
- prompt text edits, prompt/profile seeding, UCM/default JSON changes, or gateway/model/cache approval expansion;
- product/orchestrator/runner wiring;
- public API/UI/report/export/compatibility exposure;
- live jobs or canaries;
- ACS/direct URL execution;
- evidence corpus population;
- applicability/extraction/sufficiency/warning/verdict/report behavior;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 7. Required Verifier Envelope For 7N-1

7N-1 is docs-only, so its own verifier is:

```powershell
git diff --check
git diff --cached --check
```

The later source implementation package must require focused tests and boundary guards proving:

- no provider/search/fetch/parser/network behavior is reachable before explicit implementation approval;
- no direct `fetch(...)`, network/parser module, provider SDK, Source Reliability, cache/storage, product/public, analyzer-v2-runtime, or V1 analyzer import appears outside the approved owner files;
- `ready_not_executable` and source-acquisition structural outcome label `success` cannot be interpreted as public, semantic, sufficiency, warning, or verdict authority;
- source-acquisition output contains no evidence items, applicability results, probative values, source reliability scores, scarcity/sufficiency findings, warnings, verdicts, confidence, report fields, or public prose;
- source-language policy and supplementary-lane rationale are preserved as upstream LLM output, not code-generated routing.

## 8. Reviewer Prompt For 7N-1

Use this prompt before any source-acquisition execution design is committed:

> Review the proposed V2 7N-1 source-acquisition execution design/approval package. Return `approve`, `modify`, or `reject`. Check that it is design-only unless explicitly converted to a source implementation gate; that it splits structural provider/search/fetch IO from all semantic relevance/applicability/extraction/probative-value/source-reliability/sufficiency/warning/verdict/report decisions; that it preserves no cache IO, no Source Reliability import/call, no product/public wiring, no live jobs, no ACS/direct URL execution, no V1 reuse, and no V1 cleanup; and that the later implementation verifier would catch provider SDK, network/parser, direct fetch, cache/storage, public/product, and semantic-output leakage.

## 9. Stop Conditions

Stop and return to Captain/deputy review if the next step requires:

- source implementation rather than design;
- external IO behavior;
- source provider credentials or SDK imports;
- cache IO;
- Source Reliability integration;
- product/orchestrator/runner wiring;
- public result/report/API/UI/export behavior;
- live jobs;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 cleanup or reuse.

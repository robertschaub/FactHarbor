# V2 Slice 7M-1 Query-Plan Inspection And Handoff Source Package

**Date:** 2026-05-15
**Status:** implemented at `e24a2816` (`feat: add v2 query plan inspection handoff`)
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `25b4209c` (`docs: add v2 post query planning consolidation`)
**Parent gate:** 7M `Docs/WIP/2026-05-15_V2_Slice_7M_Post_7L1_Query_Planning_Consolidation.md`
**Runtime basis:** 7L-1 `6162e057` (`feat: add v2 query planning runtime`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the exact source slice for internal query-plan inspection and non-executable handoff from query planning to source acquisition.

This package was an approval request and is now the implementation record for source commit `e24a281645606d27e024ed854d6b1336835d390c`.

Review outcome:

- Senior Developer reviewer: `APPROVE`.
- LLM Expert reviewer: `APPROVE` after selected-ID provenance and redaction fixes.
- Code Reviewer / gatekeeper: `APPROVE` after selected-ID provenance and verifier fixes.

The approved boundary is source-package approval only. It does not authorize source execution, product wiring, public exposure, live jobs, or V1 cleanup.

7M-1 must close the gap between:

- 7L-1: hidden/internal query-planning runtime;
- 7H: inert source-acquisition port contract.

7M-1 must not execute source acquisition.

Implementation result:

- added `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.ts`;
- added `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.ts`;
- added focused unit tests for inspection and handoff contracts;
- updated `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` to cover the new files and ACS/direct URL runtime-import exclusions;
- changed no prompts, configs, product/orchestrator/runner/public surfaces, provider/search/fetch/source execution, Source Reliability, cache IO, ACS/direct URL execution, V1 code, or V1 cleanup.

## 2. Target Boundary

The target implementation is narrow:

- consume an explicit 7M-1 inspection/handoff request envelope containing the internal 7L-1 query-planning runtime result plus the selected AtomicClaim ID snapshot from the same 7L-1 invocation/readiness envelope;
- produce a hidden/internal query-plan inspection summary;
- produce a non-executable source-acquisition handoff only for accepted query plans;
- keep blocked/damaged query-planning states blocked;
- preserve provenance, selected AtomicClaim IDs, source-language policy, model/cache policy metadata, and no-store/no-read posture;
- add focused tests and boundary guards.

The target implementation must not:

- call provider/search/fetch/parser/network APIs;
- construct provider SDK clients or factories;
- call or import Source Reliability;
- read/write cache or durable storage;
- edit prompt text or UCM/default JSON;
- wire product/orchestrator/runner paths;
- expose public API/UI/report/export/compatibility behavior;
- run live jobs or canaries;
- execute ACS/direct URL paths;
- create evidence items, sources, sufficiency, scarcity findings, warnings, verdicts, or report content;
- reuse or clone V1 analyzer/prompt/type/code;
- clean up V1.

## 3. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice 7M-1 under `Docs/WIP/2026-05-15_V2_Slice_7M1_Query_Plan_Inspection_Handoff_Source_Package.md`, limited to hidden/internal query-plan inspection and non-executable query-plan-to-source-acquisition handoff contracts. The source package may add the named inspection and handoff modules, focused tests, and boundary guards. No provider/search/fetch/parser/network execution, no Source Reliability import/call, no cache IO, no prompt text edits, no UCM/default JSON changes, no product/orchestrator/runner wiring, no public API/UI/report/export/compatibility exposure, no live jobs/canaries, no ACS/direct URL execution, no evidence/source/corpus population, no applicability/extraction/sufficiency/warning/verdict/report behavior, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

If reviewers do not approve this exact boundary, do not implement 7M-1.

Escalate to Captain if any reviewer wants source execution, product wiring, live jobs, public exposure, cache IO, Source Reliability integration, prompt/config changes, or V1 cleanup.

## 4. Allowed Production Files

New files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.ts`

Existing files, with exact allowed purpose:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts`
  - add non-executable query-plan handoff types only if the handoff module cannot own them cleanly;
  - no provider/search/fetch/source execution state.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.ts`
  - may export existing types if needed; no runtime behavior change.

Prefer keeping new type definitions inside the new modules unless a shared type is genuinely needed.

7M-1 must not change the 7L-1 runtime result shape. If implementation evidence shows the runtime result must carry selected AtomicClaim IDs directly, stop and return to review because that is a runtime contract change outside this package.

## 5. Allowed Test Files

New files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts`

Existing files:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - add static guards for the new inspection/handoff folders.

## 6. Explicitly Forbidden Files

The implementation must not edit:

- `apps/web/prompts/**`;
- `apps/web/configs/**`;
- `apps/web/src/lib/internal-runner-queue.ts`;
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- public app/API/UI/report/export/compatibility files;
- `apps/web/src/lib/analyzer-v2-runtime/**`;
- `apps/web/src/lib/analyzer/**`;
- Source Reliability files;
- API project files.

Any need to edit a forbidden file means stop and return to review.

## 7. Query-Plan Inspection Contract

The inspection module may create a redacted hidden summary from an explicit request envelope:

```ts
type QueryPlanInspectionRequest = {
  runtimeResult: EvidenceQueryPlanningRuntimeResult;
  selectedAtomicClaimIds: readonly string[];
  selectedAtomicClaimSnapshotSource: "7l1_input_envelope";
};
```

The selected ID set is authoritative only when it comes from the same 7L-1 invocation/readiness envelope that produced the runtime result. The implementation must not infer selected IDs from query entry target IDs.

Allowed inspection fields:

- inspection version;
- visibility `internal_only`;
- source runtime version;
- runtime status and blocked/damaged structural reason;
- selected AtomicClaim IDs;
- query entry count;
- query entry target AtomicClaim IDs;
- source-language policy fields emitted by the LLM;
- supplementary-language rationale emitted by the LLM;
- prompt content hash and rendered prompt hash;
- model-policy id and cache-policy namespace/reason;
- schema outcome and integrity event summaries;
- adapter attempt status/count/type summaries only, if included.

Forbidden inspection fields:

- raw rendered prompt text;
- raw provider output;
- provider secrets, headers, or request body;
- fetched source content;
- source records;
- evidence items;
- sufficiency or scarcity findings;
- warnings;
- verdict/confidence/report fields;
- public-facing prose.
- adapter attempt diagnostics copied wholesale;
- raw adapter `failureMessage` text unless a later diagnostics gate explicitly approves message retention;
- provider telemetry copied wholesale.

Inspection must be hidden/internal and non-durable unless a later storage gate approves retention.

## 8. Handoff Contract

The handoff module may produce a non-executable handoff only when:

- query-planning runtime status is `completed`;
- query-planning result status is `accepted`;
- query plan exists and passes the structural checks below;
- target AtomicClaim IDs are non-empty and contained in the selected AtomicClaim ID set;
- source-language policy is present;
- prompt/model/cache provenance is present.

Required structural checks:

- selected AtomicClaim ID snapshot is non-empty;
- selected AtomicClaim IDs are unique after exact string comparison;
- selected AtomicClaim IDs are not inferred from query target IDs;
- query entry count is greater than zero and no more than the 7L-1 maximum of `6`;
- every query entry has at least one target AtomicClaim ID;
- every query entry target AtomicClaim ID is in the selected ID snapshot;
- partial selected-claim coverage is allowed only when the LLM query plan explicitly targets a recommended subset; it must be visible in the inspection summary as structural coverage, not as a quality judgment;
- query entries do not create new AtomicClaim IDs;
- prompt/model/cache provenance is present before handoff creation.

The handoff must be blocked when:

- runtime status is `blocked`;
- runtime status is `completed` but result status is `blocked` or `damaged`;
- query plan is missing;
- query entries are empty;
- query entry count exceeds `6`;
- any query entry has empty target IDs;
- query entry target IDs are unknown or outside the selected IDs;
- selected AtomicClaim ID snapshot is missing, empty, duplicate-bearing, or not marked as sourced from the 7L-1 input envelope;
- provenance is missing.

The handoff must carry:

- exact selected AtomicClaim IDs;
- query-plan result schema version;
- query-plan status;
- redacted inspection summary;
- prompt/model/cache provenance;
- source-language and supplementary-language policy fields;
- structural query entries;
- execution scope `not_executable`;
- source-acquisition status `blocked_before_source_execution` or `ready_not_executable`.

The handoff must not carry:

- fetched sources;
- evidence items;
- source reliability scores;
- sufficiency/scarcity/warning/verdict/report fields;
- cache keys usable for read/write;
- public output.

## 9. Semantic Boundary

Query plans are intent, not evidence.

7M-1 must not judge query quality with deterministic semantic validators. Structural checks may validate shape, IDs, counts, and provenance only.

Source acquisition remains future structural IO. It may later record provider attempts, timeout/rate-limit/circuit outcomes, fetch status, source identity, provenance, and content packet pointers. It must not decide relevance, credibility, probative value, evidence strength, source reliability score, scarcity, sufficiency, warning materiality, verdict, confidence, or report impact.

## 10. Multilingual Boundary

7M-1 must preserve the 7L-1 source-language-first contract:

- no English defaulting;
- no deterministic language classification;
- no deterministic translation or keyword expansion;
- supplementary-language lanes remain LLM output and later UCM/task-policy owned;
- missing or `und` language remains a blocked upstream state and must not be repaired in 7M-1.

## 11. Verification Requirements

Focused tests must prove:

- accepted query-planning runtime results produce hidden inspection summaries;
- inspection summaries do not contain raw rendered prompts or raw provider output;
- blocked/damaged runtime results do not create ready handoffs;
- accepted query plans create non-executable handoffs only;
- empty query entries block handoff;
- over-limit query counts block handoff;
- empty per-entry target IDs block handoff;
- unknown/out-of-selection target AtomicClaim IDs block handoff;
- selected AtomicClaim IDs are supplied by an explicit request snapshot and are not inferred from query targets;
- missing, empty, duplicate, or wrong-source selected ID snapshots block handoff;
- partial selected-claim coverage is represented as structural coverage, not as a semantic quality decision;
- missing provenance blocks handoff;
- source-language policy is preserved;
- supplementary-language rationale is preserved as LLM output, not code-generated routing;
- handoff contains no fetched sources, evidence items, SR scores, sufficiency, scarcity findings, warnings, verdict, confidence, report fields, public fields, or cache IO data;
- boundary guards block provider/search/fetch/parser/network imports and direct `fetch(...)`;
- boundary guards block Source Reliability import/call;
- boundary guards block product/orchestrator/runner/public imports;
- boundary guards block ACS/direct URL runtime imports/calls;
- boundary guards block V1 analyzer imports and prompt/type reuse.

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by 7M-1.

## 12. Rollback

Rollback must be simple:

- remove the inspection module;
- remove the query-plan handoff module;
- remove focused tests and boundary guard additions;
- no public behavior changes should need rollback because no product/public wiring is allowed.

## 13. Reviewer Prompt

Use this prompt for Senior Developer, LLM Expert, Code Reviewer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-15_V2_Slice_7M1_Query_Plan_Inspection_Handoff_Source_Package.md` as the proposed FactHarbor V2 Slice 7M-1 source implementation boundary. Return `approve`, `modify`, or `reject`. Check whether it is precise enough to implement hidden/internal query-plan inspection and a non-executable query-plan-to-source-acquisition handoff after 7L-1. Focus on exact file envelope, hidden-only visibility, redaction, no raw prompt/provider output, no provider/search/fetch/source execution, no Source Reliability, no cache IO, no product/public wiring, no live jobs, no ACS/direct URL, no semantic deterministic validators, no V1 reuse, verifier adequacy, rollback, and whether anything must escalate to Captain before implementation.

## 14. Verification For This Package

Package review verification:

- `git diff --check`;
- `git diff --cached --check` after staging;
- no source/test/prompt/config/schema edits;
- no live jobs.

Implementation verification:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

Results:

- focused verifier passed: 3 files, 55 tests;
- full Analyzer V2 unit slice passed: 39 files, 286 tests;
- build passed;
- whitespace checks passed;
- manual forbidden-reference scan for the two new source modules found no V1 analyzer, analyzer-v2-runtime, Source Reliability, public/product, provider SDK, search/fetch/network/parser, or direct `fetch(...)` references;
- no expensive real-LLM tests and no live jobs were run.

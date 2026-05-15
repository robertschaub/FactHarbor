# V2 Slice 7H Source Acquisition Port Contract Source Package

**Date:** 2026-05-15
**Status:** approved by deputy-team review; no source implemented yet
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `6ae571ca` (`docs: record v2 source acquisition port gate`)
**Prerequisite package:** `Docs/WIP/2026-05-15_V2_Slice_7G_Source_Acquisition_Execution_Ownership_And_Port_Design.md`
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Implement an inert source-acquisition port contract that records the future structural IO boundary without enabling source execution.

7H may define V2-owned contract metadata for future source-acquisition ports, including allowed structural outcome labels and non-executable authority flags. It must not call providers, search, fetch, prompt/model tasks, Source Reliability, cache, orchestrator/product paths, or public surfaces.

## 2. Source Envelope

Allowed source files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

No other files are in scope unless review explicitly adds them.

## 3. Contract Behavior

7H may add:

- `SOURCE_ACQUISITION_PORT_CONTRACT_VERSION`;
- `SourceAcquisitionStructuralOutcomeKind`;
- `SourceAcquisitionPortContract`;
- `readStaticSourceAcquisitionPortContract()`;
- `readStaticSourceAcquisitionStructuralOutcomeKinds()`.

Required behavior:

- contract source remains `static_contract_only`;
- contract status remains `not_executable`;
- query planning remains `llm_task_not_wired`;
- provider/search/fetch execution remains `not_wired`;
- provider SDK imports remain `forbidden`;
- cache policy remains `no_store_no_read`;
- Source Reliability integration remains `thin_port_pending`;
- public exposure remains `forbidden`;
- orchestrator/product wiring remains `forbidden`;
- ACS/direct URL execution remains `not_approved`;
- structural outcome kinds are fixed labels only, not implemented behavior;
- returned arrays/objects are defensive copies.

## 4. Allowed Structural Outcome Labels

7H may define these labels as inert metadata:

- `not_executed`;
- `provider_not_configured`;
- `provider_failure`;
- `search_failure`;
- `rate_limited`;
- `fetch_failure`;
- `content_unavailable`;
- `content_rejected_structurally`;
- `success`.

These labels are structural. They must not imply relevance, evidence strength, credibility, scarcity, sufficiency, or verdict meaning.

## 5. Explicitly Forbidden

7H must not add:

- provider SDK imports;
- search/fetch/provider implementation imports;
- HTTP calls, URL fetching, HTML/PDF parsing, or content extraction;
- prompt rendering or model calls;
- query planning implementation;
- semantic applicability, relevance, evidence extraction, probative value, source credibility, source-language selection, sufficiency, boundary, verdict, aggregation, or report logic;
- UCM/default JSON changes;
- gateway/model/cache approval flips;
- cache keys, cache reads, cache writes, or storage IO;
- Source Reliability imports, calls, cache lookups, score fields, or verdict influence;
- public API/UI/report/export/compatibility changes;
- orchestrator/product wiring;
- ACS/direct URL execution;
- live jobs;
- V1 analyzer/prompt/type reuse or cleanup.

## 6. Semantic Boundary

7H is structural only.

It must not infer anything from claim text, detected language, selected claim count, source type, provider rank, URL/domain, fetch success, or structural outcome label.

Future semantic decisions remain LLM-owned through approved prompt/model/UCM policy:

- query planning;
- source relevance and applicability;
- evidence extraction;
- claim direction;
- probative value;
- source credibility meaning;
- source-language and supplementary-lane decisions;
- sufficiency.

## 7. Boundary Guards To Add Or Preserve

`boundary-guard.test.ts` must prove the new `source-acquisition-port/` folder remains inert:

- exact allowed file list under `evidence-lifecycle/source-acquisition-port/`;
- no V1 analyzer imports;
- no prompt loader/model adapter/runtime dispatch imports;
- no provider SDK imports;
- no search/fetch/provider implementation imports;
- no generic network or parser imports such as `node:http`, `node:https`, `http`, `https`, `undici`, `node-fetch`, `axios`, `got`, `ky`, `cheerio`, `jsdom`, `pdf-parse`, `playwright`, or `puppeteer`;
- no direct `fetch(...)` call expressions;
- no cache/storage/config IO imports;
- no analyzer-v2-runtime imports;
- no Source Reliability service/cache imports;
- no public API/UI/report/export imports;
- no orchestrator/product imports;
- no test/mock/fixture imports in production source.

The existing intake, source-acquisition, task-policy, and evidence-corpus guards must continue to pass.

## 8. Focused Tests

Required tests:

- static port contract exactly matches non-executable values;
- structural outcome list exactly matches the approved fixed labels;
- contract and outcome arrays are defensive copies;
- static contract includes only blocked/non-executable authority flags for provider/prompt/model/cache/SR/public/orchestrator surfaces, and includes no executable, enabled, approved, wired, cache-readable, cache-writable, public, or product-wired authority values;
- labels do not include semantic outcome names such as relevance, credibility, scarcity, sufficiency, verdict, or probative value;
- boundary guard proves the source folder is inert.

## 9. Verification

Minimum verification after implementation:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `npm -w apps/web run build`
- `git diff --check`

No live jobs are meaningful for 7H.

## 10. Non-Goals

7H does not:

- create a runnable provider/search/fetch port;
- implement query planning;
- fetch or parse source content;
- build source records;
- build an `EvidenceCorpus`;
- run Source Reliability;
- run sufficiency;
- change prompts, models, schemas, UCM, cache, public APIs, UI, reports, or exports;
- clean or remove V1.

## 11. Review Questions

Reviewers should answer:

1. Is the source envelope narrow enough?
2. Is a static non-executable port contract useful now, or should 7H remain docs-only?
3. Are the structural outcome labels safe and non-semantic?
4. Are the forbidden imports and authorities complete enough?
5. Is Captain escalation needed before this contract-only implementation?

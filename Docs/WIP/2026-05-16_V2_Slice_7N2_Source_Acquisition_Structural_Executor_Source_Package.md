# V2 Slice 7N-2 Source-Acquisition Structural Executor Source Package

**Date:** 2026-05-16
**Status:** reviewed/approved source approval package; implementation not started in this package commit
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `bd72ecc7` (`docs: approve v2 source acquisition design gate`)
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N1_Source_Acquisition_Execution_Design_Approval_Package.md`
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the exact source slice for a V2 source-acquisition structural executor.

7N-2 may implement only an Analyzer V2-owned structural execution core that consumes a ready 7M-1 query-plan handoff and calls an injected fake/test/controlled-harness port. It must not implement production/runtime provider/search/fetch/parser/network behavior.

This package does not authorize 7N-3 concrete provider wiring, product/orchestrator/runner wiring, public exposure, live jobs, cache IO, Source Reliability integration, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup.

## 2. Review Result

Expert review result after modifications:

- Code reviewer/gatekeeper: `APPROVE`.
- LLM/pipeline architect reviewer: `APPROVE`.
- Source-acquisition/runtime boundary reviewer: `APPROVE`.

Required review modifications applied:

- 7H structural outcome labels stay exact; timeout, cancellation, retry exhaustion, and partial execution are executor stop/reason fields, not new 7H outcome labels.
- 7C `SourceAcquisitionStartDecision` / `SourceAcquisitionRequest` reuse is explicit.
- Controlled-harness authority is a closed literal object with negative capability flags.
- Budget identity/frozen handoff snapshot and exact `maxAttemptsPerQuery === 1` are required.
- The required new test file is explicitly allowed.
- URL/domain/source-name/source-record/dereference-locator leakage bans are explicit.
- Source-language policy, supplementary-lane rationale, and retrieval-policy keys are opaque upstream provenance/pass-through only, not semantic output.

Consolidated verdict: approved to implement 7N-2 exactly under this source package.

## 3. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice 7N-2 under `Docs/WIP/2026-05-16_V2_Slice_7N2_Source_Acquisition_Structural_Executor_Source_Package.md`, limited to an Analyzer V2 structural executor and contract types inside the named files. The executor may consume `QueryPlanSourceAcquisitionHandoffDecision`, reuse the approved 7H structural outcome labels, validate a frozen budget snapshot, call only an injected fake/test/controlled-harness source-acquisition port, and return hidden/internal structural attempt results. It must not add production/runtime concrete provider/search/fetch/parser/network behavior, provider SDK imports, source-acquisition-port edits, analyzer-v2-runtime factory wiring, product/orchestrator/runner wiring, public exposure, live jobs, cache IO, Source Reliability integration, semantic relevance/applicability/extraction/probative-value/sufficiency/warning/verdict/report behavior, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup.

If reviewers do not approve this exact boundary, do not implement 7N-2.

## 4. Allowed Production Files

New files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts`

Existing file:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - update exact source-acquisition file list;
  - keep forbidden-import guards;
  - add guards for source-acquisition-port immutability and controlled-harness-only authority.

Allowed test file:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`

No other production or test files are approved unless review explicitly adds them.

## 5. Forbidden Files And Surfaces

7N-2 must not edit:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/**`;
- `apps/web/src/lib/internal-runner-queue.ts`;
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- `apps/web/src/lib/analyzer-v2/pipeline-shell.ts`;
- public app/API/UI/report/export/compatibility files;
- `apps/web/src/lib/analyzer-v2-runtime/**`;
- `apps/web/src/lib/analyzer/**`;
- `apps/web/prompts/**`;
- `apps/web/configs/**`;
- Source Reliability files;
- API project files.

7N-2 may import existing V2 source-acquisition contracts when needed, but it must not edit or activate those modules beyond the named envelope. The only approved value import from `source-acquisition-port/**` is `readStaticSourceAcquisitionStructuralOutcomeKinds` from the inert 7H static contract, used only to validate malformed controlled-harness port output against the existing approved label set. Do not duplicate the 7H structural labels in new source.

## 6. Required Contract Behavior

`execution-contract.ts` should define V2-owned structural contracts such as:

- `SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION`;
- `SourceAcquisitionExecutionBudgetSnapshot`;
- `SourceAcquisitionControlledHarnessAuthority`;
- `SourceAcquisitionPortAttemptRequest`;
- `SourceAcquisitionPortAttemptResult`;
- `SourceAcquisitionPort`;
- `SourceAcquisitionExecutionRequest`;
- `SourceAcquisitionExecutionDecision`;
- `SourceAcquisitionExecutionAttempt`;
- `OpaqueSourceContentPacketPointer`.

The contract must:

- consume or reference `QueryPlanSourceAcquisitionHandoffDecision`;
- carry or reference the existing 7C `SourceAcquisitionStartDecision` / `SourceAcquisitionRequest`;
- use the approved 7H `SourceAcquisitionStructuralOutcomeKind` label set;
- carry hidden/internal visibility only;
- mark port authority as a closed fake/test/controlled-harness object, not a free-form string;
- define budget status and invalid-budget blocked reasons;
- define opaque content packet pointers as non-durable, non-dereferenceable by the structural core, and raw-content-free;
- define structural outcome meaning as acquisition status only, not relevance or evidence quality.

It must not define evidence items, applicability decisions, probative values, source reliability scores, scarcity/sufficiency findings, warnings, verdicts, confidence, report fields, public prose, or cache keys.

## 7. Required Executor Behavior

`structural-executor.ts` should export `executeSourceAcquisitionStructuralExecutor(...)`.

Required behavior:

- fail closed before any port call when the handoff is blocked, missing, malformed, not hidden/internal, or not `ready_not_executable`;
- fail closed before any port call when the 7C source-acquisition start decision/request is missing, malformed, not hidden/internal, not `source_acquisition_ready_not_executable`, not `contract_only_no_provider_execution`, not `ready_not_executable`, or not aligned with the 7M-1 handoff selected AtomicClaim IDs and query targets;
- fail closed before any port call when prompt/model/cache provenance from the handoff is missing;
- fail closed before any port call when handoff cache provenance is not exactly no-store/no-read, contains cache key material, or carries storage/cache authority;
- fail closed before any port call when selected IDs, query entries, or target IDs violate 7M-1 handoff constraints;
- fail closed before any port call when the budget snapshot is missing, malformed, stale, not tied to the handoff, has caps below the handoff query count, or cancellation is already requested;
- call the injected port at most once per query entry in 7N-2;
- pass through query text unchanged from the approved query plan without inspecting its meaning;
- preserve source-language policy and supplementary-lane rationale as upstream LLM output;
- validate returned `outcomeKind` against the approved 7H label set;
- validate opaque content packet pointers, if present, are non-durable, non-dereferenceable, and raw-content-free;
- record timeout, cancellation, retry exhaustion, and partial execution as executor-only diagnostic stop/reason fields, not as `SourceAcquisitionStructuralOutcomeKind` values unless a later package extends 7H;
- record provider failure, search failure, rate limiting, fetch failure, content unavailable, content rejected structurally, and success only through the approved 7H structural outcome labels;
- label `success` as acquisition success only, not relevance, quality, sufficiency, warning, verdict, confidence, or report authority.
- preserve source-language policy, supplementary-lane rationale, retrieval policy key, and query text only as opaque upstream provenance/pass-through inputs to the controlled-harness port; do not emit source-language labels, supplementary rationale text, or derived retrieval intent as structural executor output.

Partial execution, cancellation, timeout, rate limiting, and retry exhaustion must not be reported as fully successful acquisition.

## 8. Controlled-Harness Boundary

7N-2 may call only an injected port whose authority explicitly states fake/test/controlled-harness use.

The controlled-harness authority object must use closed literal fields:

- `kind: "controlled_harness_only"`;
- `source: "static_7n2_controlled_harness"`;
- `productionRuntime: false`;
- `providerSdk: false`;
- `network: false`;
- `parser: false`;
- `searchFetch: false`;
- `cacheStorage: false`;
- `sourceReliability: false`;
- `productRuntime: false`;
- `publicExposure: false`.

7N-2 must block or reject:

- production/runtime concrete provider ports;
- product-injected ports;
- analyzer-v2-runtime callback factories;
- network/parser/search/fetch implementations;
- provider SDK-backed ports;
- ports with cache/storage authority;
- ports with Source Reliability authority.

Avoiding direct SDK imports is not enough. The execution request must carry an authority marker that keeps 7N-2 out of production source IO.

## 9. Budget Boundary

The budget snapshot must include:

- budget snapshot version;
- budget source `static_7n2_controlled_harness`;
- handoff version it applies to;
- handoff identity/hash or frozen handoff snapshot over selected AtomicClaim IDs, query ids, query count, prompt/model/cache provenance, and source-language policy;
- max query entries;
- max attempts per query;
- max candidate records per query;
- timeout in milliseconds;
- retry policy `none`;
- cancellation state;
- content packet cap.

7N-2 must fail closed before port calls when:

- budget is missing;
- budget source is not the approved controlled-harness source;
- budget handoff identity/hash or frozen handoff snapshot does not match the current handoff;
- max query entries is lower than the handoff query-entry count;
- max attempts per query is not exactly `1`;
- max candidate records per query is negative;
- timeout is non-positive;
- retry policy is not `none`;
- cancellation state is already requested;
- content packet cap is negative.

7N-2 must also validate returned controlled-harness port results against the budget:

- candidate record counts must not exceed `maxCandidateRecordsPerQuery`;
- content packet pointer counts must not exceed the content packet cap;
- extra attempts beyond one per query are invalid;
- over-cap port results must become structural blocked/damaged executor outcomes, not silently truncated successful acquisitions.

## 10. Semantic Boundary

7N-2 must not inspect or interpret:

- query text;
- titles;
- snippets;
- URLs or domains;
- provider rank;
- language metadata;
- language-derived labels;
- content bodies;
- source names.

It may validate only structure, IDs, counts, labels, provenance, budget, and authority markers.

7N-2 output must use opaque IDs and structural statuses only. It must not emit URLs, domains, source names, source records, provider rank, language-derived labels, dereference locators, snippets, titles, content bodies, or raw provider payloads.

Allowed attempt/pointer fields are limited to:

- execution id;
- query id;
- retrieval policy key;
- target AtomicClaim IDs;
- attempt id;
- approved 7H `outcomeKind`;
- executor stop/reason field;
- duration/timing fields;
- count fields;
- opaque candidate ids;
- opaque content packet pointer ids;
- non-durable/non-dereferenceable pointer flags.

`retrievalPolicyKey` may be carried only as an opaque upstream key when needed to correlate a structural attempt with the original query entry. The executor must not parse or branch on the key's wording, must not derive source-language or scarcity semantics from it, and must not expose a rewritten or interpreted retrieval intent.

Budget and source-language matching are equality/provenance checks only. The executor may compare stored hashes, exact ids, exact key values, or frozen snapshot fields for drift detection; it must not parse language codes, source-language labels, query wording, target meaning, domains, URLs, source names, or retrieval policy text.

7N-2 must not emit or compute:

- relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value or evidence strength;
- source credibility meaning;
- Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict or confidence;
- report narrative or public prose.

## 11. Required Tests

Add `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`.

Tests must prove:

- a ready 7M-1 handoff with valid budget and fake/test/controlled-harness port produces hidden/internal structural attempts only;
- blocked handoffs create no port calls;
- missing provenance creates no port calls;
- malformed no-store/no-read cache provenance with `canRead !== false`, `canWrite !== false`, cache key material, or storage/cache authority creates no port calls;
- missing, malformed, or misaligned 7C `SourceAcquisitionStartDecision` / `SourceAcquisitionRequest` creates no port calls;
- wrong selected snapshot / unknown target IDs are still blocked via the 7M-1 handoff contract before execution;
- missing, malformed, stale/identity-mismatched, below-query-count, non-exact-one-attempt, cancelled, or non-`none` retry budgets create no port calls;
- a production/runtime authority marker is rejected before port calls;
- the port is called at most once per query entry;
- returned outcome kinds must match the approved 7H label set from `readStaticSourceAcquisitionStructuralOutcomeKinds`;
- timeout, cancellation, retry exhaustion, and partial execution are recorded as executor stop/reason fields, not 7H outcome labels;
- over-cap candidate/content pointer returns are not successful acquisitions;
- source-language policy and supplementary-lane rationale are preserved;
- source-language policy and supplementary-lane rationale are preserved only as opaque upstream provenance/pass-through inputs, not emitted structural output;
- retrieval policy keys are treated as opaque upstream correlation keys, not parsed or interpreted;
- structural `success` is labeled acquisition-status-only, not quality/relevance;
- opaque content packet pointers with raw content, durable storage, or dereference authority are rejected;
- rate-limit, provider failure, search failure, fetch failure, content unavailable, content rejected structurally, and success remain approved structural outcome labels only;
- serialized output contains no evidence items, applicability, probative values, Source Reliability scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, public prose, cache keys, raw content, snippets, titles, URLs, domains, source names, source records, dereference locators, provider rank, language-derived labels, or provider payloads;
- changing query text content does not change executor behavior except for pass-through to the fake port.
- non-English query text and non-English source-language policy produce the same structural behavior except for unchanged pass-through values.

## 12. Boundary Guard Updates

`boundary-guard.test.ts` must:

- update the exact allowed file list under `source-acquisition/`;
- keep the exact allowed file list under `source-acquisition-port/` unchanged;
- block V1 analyzer imports;
- block analyzer-v2-runtime imports;
- block provider SDK imports;
- block search/fetch provider imports;
- block generic network/parser imports and direct `fetch(...)`;
- block Source Reliability imports/calls;
- block cache/storage/config IO imports;
- block public/product/orchestrator imports;
- block prompt/model adapter imports;
- block test/mock/fixture imports in production source;
- block authority strings that imply production/runtime provider wiring, public exposure, cache IO, SR authority, or executable source IO outside the controlled-harness marker.

## 13. Verification

Minimum verifier after implementation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-2.

## 14. Reviewer Prompt

Use this prompt for Senior Developer, LLM Expert, Code Reviewer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N2_Source_Acquisition_Structural_Executor_Source_Package.md` as the proposed V2 7N-2 source implementation boundary. Return `approve`, `modify`, or `reject`. Check that it permits only an Analyzer V2 structural executor with fake/test/controlled-harness injected ports; consumes or extends existing 7M-1/7C/7H contracts; keeps source-acquisition-port files inert; blocks production/runtime concrete provider/search/fetch/parser/network behavior; preserves no cache IO, Source Reliability, product/public wiring, live jobs, ACS/direct URL execution, prompt/config/model/schema edits, V1 reuse, and V1 cleanup; keeps semantic meaning LLM-owned; and has sufficient tests and boundary guards before implementation.

## 15. Stop Conditions

Stop and return to review/Captain if implementation would require:

- production/runtime concrete source IO;
- provider SDK, network, parser, search/fetch imports;
- product/orchestrator/runner wiring;
- analyzer-v2-runtime factories;
- public exposure;
- live jobs;
- cache IO or durable storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

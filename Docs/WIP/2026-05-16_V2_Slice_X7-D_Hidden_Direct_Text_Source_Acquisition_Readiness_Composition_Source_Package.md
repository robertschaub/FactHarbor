# V2 Slice X7-D Hidden Direct-Text Source-Acquisition Readiness Composition Source Package

**Date:** 2026-05-16
**Status:** deputy-reviewed and implemented under narrowed `MODIFY -> APPROVE A` consensus
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `826e8920` (`feat: add v2 provider network readiness`)
**Parent gates:** X6 hidden candidate-acquisition harness, X7-A source-material readiness, X7-B source-material/evidence-corpus guard, X7-C provider-network readiness
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X7-D proves that the hidden direct-text source-acquisition readiness chain is structurally composable while still non-executable and zero-cost.

It composes only already-created or pure existing hidden contracts:

- an already-created X6 candidate-acquisition harness result;
- the existing X7-A source-material readiness adapter;
- the existing X7-B source-material/evidence-corpus negative guard through X7-C;
- the existing X7-C provider-network readiness owner.

X7-D is not source acquisition. It does not run X6, candidate runtime, provider callbacks, provider-network transport/factory, real network/search/fetch, parser/content logic, source-material population, evidence-corpus building, warnings, verdicts, confidence, report generation, product/public/live wiring, cache/storage/Source Reliability, prompt/config/model/schema changes, ACS/direct URL execution, V1 reuse, or V1 cleanup.

## 2. Deputy Review Outcome

The deputy debate returned `MODIFY`, then converged on option A for the X6 provenance conflict:

- proceed with exact-shape and sanitized summary behavior;
- fail closed for malformed, blocked, public-cutover-open, or source-material-readiness-blocked X6 states;
- do not claim copied/JSON-round-tripped X6 provenance rejection because X6 is not runtime-branded today;
- record copied-X6 provenance rejection as a later X6 hardening gate if needed.

Rejected alternatives:

- hardening X6 with a runtime-owner WeakSet/reader inside X7-D, because that expands the slice and changes an already-approved X6 boundary;
- consuming only already-created X7-A readiness, because that weakens the intended X6 -> X7-A -> X7-B -> X7-C composition proof.

## 3. Implementation Boundary

### 3.1 Allowed Production File

New file only:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.ts`

Exact exports:

- `ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION`
- `HiddenDirectTextSourceAcquisitionReadinessCompositionRequest`
- `HiddenDirectTextSourceAcquisitionReadinessCompositionResult`
- `buildHiddenDirectTextSourceAcquisitionReadinessComposition(...)`

Allowed imports:

- X6 result type only;
- `runHiddenDirectTextSourceMaterialReadinessHarness(...)`;
- `buildSourceAcquisitionProviderNetworkReadiness(...)` and its request/decision types.

No barrel export is allowed.

### 3.2 Allowed Tests

New focused test:

- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts`

Existing guard:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

### 3.3 Allowed Documentation

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X7-D_Hidden_Direct_Text_Source_Acquisition_Readiness_Composition.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

## 4. Runtime Contract

X7-D may return only:

- `composition_not_executable_pre_live_gate`;
- `blocked_pre_execution`.

`executionStatus` is always `blocked_no_io`.

Blocked reasons:

- `request_malformed`;
- `x6_malformed`;
- `x6_not_completed`;
- `public_cutover_not_blocked_precutover`;
- `source_material_readiness_blocked`;
- `source_material_absence_contract_invalid`;
- `evidence_corpus_guard_not_negative`;
- `provider_network_readiness_blocked`.

Positive composition carries only:

- X7-A source-material readiness decision;
- X7-C provider-network readiness decision;
- explicit zero-cost counters and flags;
- nulls for provider execution, candidate acquisition, source material, extraction input, and evidence corpus.

It must not return full X6 result, X5 integration, candidate records, provider IDs, query text, hidden locators, endpoint host/path/query/header/credential details, source records, source material, parsed text, EvidenceItems, warnings, verdicts, truth percentages, confidence, report text, cache keys, Source Reliability values, or public compatibility fields.

## 5. Explicit Residual Limitation

X7-D does not prove X6 object provenance. A JSON-equivalent X6-shaped object cannot be distinguished from a runtime-created X6 result without hardening X6 itself. X7-D therefore does not claim copied-X6 rejection.

Later optional gate:

- X6 runtime-owner hardening with WeakSet/reader provenance, reviewed as a separate source package.

Existing provenance checks remain in force where already implemented:

- copied/JSON-round-tripped X7-B absence contracts fail closed;
- copied/JSON-round-tripped X7-C network authorities fail closed.

## 6. Verification Requirements

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by X7-D.

## 7. Stop Conditions

Stop and return to deputy/Captain review if implementation requires:

- running X6 or X5;
- calling candidate runtime, provider callbacks, provider-network transport, provider-network factory, or content/parser owners;
- real network/search/fetch, provider SDK, direct fetch, source IO, packet/frame/byte consumption, or parser execution;
- source-material population, extraction input, EvidenceItems, evidence corpus, applicability, sufficiency, warnings, verdicts, confidence, report output, or public compatibility projection;
- product/orchestrator/runner/API/UI/report/export wiring;
- cache IO, durable storage, or Source Reliability;
- prompt/config/model/schema edits;
- ACS prepared snapshot or direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 8. Rollback

Rollback is simple:

- remove the new composition file;
- remove the focused X7-D test;
- remove boundary-guard additions;
- public behavior remains unchanged because no product/public path may import X7-D.

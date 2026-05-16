# V2 Slice X7-F Hidden No-IO Source-Acquisition Execution Gate Source Package

**Date:** 2026-05-16
**Status:** implemented, pending final commit hash registration
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `908bb7a2` (`docs: refresh v2 source acquisition gate register`)
**Parent context:** X7-E hidden source-acquisition readiness composition with X6 provenance gate; X8 audit-register refresh
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X7-F makes the transition from hidden source-acquisition readiness to source-acquisition execution explicit and fail-closed.

It answers one question only:

> Given a runtime-owned X7-E hidden readiness composition, is source-acquisition execution admitted?

For this slice the only successful answer is still a closed gate:

- `status: "gate_closed_no_io"`;
- `closedReason: "research_acquisition_gateway_not_implemented"`;
- `executionStatus: "blocked_no_io"`;
- zero provider/network/parser/candidate counters;
- null provider, candidate, source-material, extraction, evidence-corpus, packet, parser, public, cache, and Source Reliability outputs.

## 2. Implementation Boundary

Allowed source/test files:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed governance/status files:

- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X7-F_Hidden_No_IO_Source_Acquisition_Execution_Gate.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

## 3. Design

X7-F adds `buildHiddenDirectTextSourceAcquisitionExecutionGate(...)` as a hidden runtime contract. It accepts only:

```ts
{
  readinessComposition: HiddenDirectTextSourceAcquisitionReadinessCompositionResult
}
```

The X7-D/X7-E readiness-composition owner now marks its returned result in a module-local `WeakSet` and exports only a reader. X7-F uses that reader so copied, JSON-round-tripped, structured-cloned, or reconstructed readiness objects fail closed as `readiness_composition_not_runtime_owned`.

The gate result is summary-only and does not contain:

- upstream X6/X7-D payloads;
- candidate IDs, query text, hidden locators, endpoint host/path/header details, provider payloads, or source text;
- source material, extraction input, EvidenceItems, evidence corpus, warnings, verdicts, truth percentages, confidence, report markdown, cache keys, or Source Reliability values.

Parser admission is explicitly recorded as `blocked_pending_b2_b3_c0_2d_c`. This is a blocker, not a conditional unlock.

## 4. Explicit Non-Goals

X7-F does not:

- call source-acquisition structural executor;
- call X6, X5, candidate runtime, provider boundary, provider-network transport/factory, search/fetch, content dereference, parser, packet sink, or parser worker;
- change `research_acquisition` gateway policy from `notImplemented`;
- approve source execution, provider-network execution, real network/search/fetch, source-material population, extraction input, evidence-corpus building, parser 2D-C, product/orchestrator/runner/API/UI/report/export wiring, public output, live jobs, cache IO, durable storage, Source Reliability, ACS/direct URL execution, prompt/config/model/schema edits, V1 reuse, or V1 cleanup.

## 5. Gate Register Update

`Docs/AGENTS/V2_Gate_Register.json` now records `gate.research_acquisition` as X7-F:

- state/status `implemented_hidden_direct_text_execution_gate_closed_no_io`;
- source package this file;
- `implementationCommit: null` until this package is committed, then replace with the resulting commit hash in the final amend;
- source-of-truth references to X7-F, X7-E, B2, B3, and C0;
- blocked surfaces including source-acquisition execution admission, provider-network execution, source-material population, evidence-corpus building, real fetched-byte parser consumption, 2D-C parser source implementation, product/public wiring, cache/SR/storage, evidence/report/verdict generation, and live jobs.

The validator now fails if the research-acquisition row drifts from X7-F or drops the B2/B3/C0/2D-C blockers.

## 6. Verification

Passed before documentation closeout:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm -w apps/web run build
```

Required before commit:

```powershell
npm run index
git diff --check
git diff --cached --check
```

No live jobs, expensive LLM suites, provider/network calls, parser execution, or 2D-C proof runs are required for X7-F.

## 7. Rollback

Rollback is small and isolated:

- remove `hidden-direct-text-source-acquisition-execution-gate.ts` and its focused test;
- remove X7-F boundary-guard additions;
- remove the X7-D runtime-owned readiness-composition reader if no later slice consumes it;
- restore `gate.research_acquisition` to the prior X7-E audit anchor and validator constants.

Rollback would reintroduce ambiguity between readiness composition and execution admission, so prefer a forward amendment unless the closed-gate contract itself is contradicted by review.

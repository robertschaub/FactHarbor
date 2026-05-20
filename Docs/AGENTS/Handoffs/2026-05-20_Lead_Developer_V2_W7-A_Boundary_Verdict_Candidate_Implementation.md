# 2026-05-20 - Lead Developer - V2 W7-A Boundary/Verdict Candidate Implementation

## Summary

Implemented W7-A as the contract-only internal `BoundaryVerdictCandidateDecision`
bridge from W5-F/W6-B/W6-C into the future W8-A internal Alpha `ReportResult`
path.

W7-A creates no semantic boundary grouping and no verdict candidate. In the
approved contract-only mode, `boundaryCandidates` is always empty,
`verdictCandidate` is always `null`, and `candidatePopulation` remains
`closed_until_llm_task_approved`.

## Scope Implemented

- Added `apps/web/src/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate.ts`.
- Added focused tests in
  `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate.test.ts`.
- Updated `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` with a
  focused W7-A import/leakage guard and explicit Evidence Lifecycle ownership
  for `boundary-verdict`.
- Updated W7-A package/status/backlog documentation for implementation closeout.

## Contract Behavior

- Accepts only allowlisted projections from:
  - `EvidenceItemHandoffDecision`
  - `SufficiencyIntakeDecision`
  - `SufficiencyAssessmentDecision`
- Fails closed on missing, blocked, damaged, mismatched, or side-effect-open
  parent state.
- Stops downstream candidate population when W6-C recommends
  `refine_retrieval` or `damage_report`.
- Preserves hash/length/provenance-only default projection.
- Does not import, read, call, serialize, or depend on W4-I runtime/sink state.

## Guardrails Preserved

- No LLM boundary/verdict execution.
- No deterministic semantic boundary grouping or verdict logic.
- No prompt/model/config/schema/UCM/gateway edit or approval flip.
- No live job or canary.
- No public/API/UI/report/export/compatibility behavior.
- No verdict/warning/confidence/report behavior.
- No parser/cache/SR/storage/provider expansion, ACS/direct URL, V1 work, or V1
  cleanup.
- No source text, EvidenceItem text, snippet, summary, prompt text, provider
  payload, hidden ledger reference, or internal state in default projections,
  logs, errors, or public surfaces.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - Passed: 3 files / 100 tests.
- `npm run validate:v2-gates`
  - Passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`
  - Passed.
- `npm run debt:sensors`
  - `advisory_warn`; known V2 source/test footprint, oversized boundary guard,
    docs volume, net mechanism, and consolidation-marker warnings.
- `npm -w apps/web run build`
  - Passed.

## Failed-Attempt Recovery / Debt-Guard Result

Classification: introduced-regression from new W7-A scaffolding.

Prior attempt: keep. The implementation behavior was not contradicted; failures
were local verifier/type-alignment issues:

- test leakage assertion matched a redaction key name containing
  `hiddenLedgerId`;
- the existing Evidence Lifecycle root guard recursively included the new owned
  W7-A subdirectory;
- TypeScript did not narrow optional parent decisions across a helper call.

Chosen fix: amend only the W7-A redaction key names, explicitly scope
`boundary-verdict` as its own Evidence Lifecycle owner in the guard, and bind
non-null parent decisions before the side-effect check.

Rejected path: broad boundary-guard rewrite, route/product wiring, new hidden
artifact mechanism, or semantic candidate generation.

Net mechanism result: one contract owner and focused tests were added as
approved; no extra route, sink, live path, W4-I consumer, or LLM execution was
introduced.

## Current State

W7-A is locally implemented and verifier-clean. It is ready for a focused commit.

The next positive stop-line target is W8-A internal Alpha `ReportResult`, but
W8-A requires a separate reviewed package before implementation. Live-job ledger
remains `currentRemaining = 0`.

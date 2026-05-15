# Lead Architect Handoff - V2 Slice 7F Evidence Corpus Build Decision

**Date:** 2026-05-15
**Role:** Lead Architect / Captain deputy
**Task:** Implement the Evidence Corpus pre-execution build-decision boundary
**Implementation commit:** `b8a97413` (`feat: add v2 evidence corpus build decision`)
**Gate document:** `Docs/WIP/2026-05-15_V2_Slice_7F_Evidence_Corpus_Pre_Execution_Build_Decision_Package.md`
**Checklist:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## Summary

Slice 7F adds a pure internal `EvidenceCorpusBuildDecision` handoff. It consumes `SourceAcquisitionStartDecision` and records that a real `EvidenceCorpus` has not been built because source execution is still unapproved.

Ready source acquisition produces `not_built_pre_execution` with `evidenceCorpus: null`, exact `ClaimContract`, exact task-policy snapshot, and exact retrieval-policy catalog. Blocked or malformed source acquisition produces `blocked_pre_execution`.

No real empty `EvidenceCorpus`, evidence/source arrays, scarcity, sufficiency, warning materiality, Source Reliability signal, source execution, provider/search/fetch work, prompt/model/schema/UCM change, cache IO, orchestrator wiring, public exposure, live job, approval flip, V1 reuse, or V1 cleanup was added.

## Review Consolidation

The deputy-team debate approved 7F only as a build-decision/pre-execution handoff, not as a real corpus contract.

One required review change was applied before implementation:

- ready `not_built_pre_execution` uses `notBuiltReason: "source_acquisition_not_executable"` and `blockedReason: null`;
- blocked/malformed states use `blockedReason` and `notBuiltReason: null`;
- the source package and tests distinguish not-built from blocked.

## Files Changed

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-15_V2_Slice_7F_Evidence_Corpus_Pre_Execution_Build_Decision_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7F_Evidence_Corpus_Build_Decision.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 3 files / 53 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 30 files / 241 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

No live jobs were run because 7F is non-executable.

## Next Step

Prepare a reviewed 7G package before any source execution. The next decision should address source-acquisition execution ownership and provider/search/fetch port design, including Source Reliability thin-port boundaries, without implementing source execution until separately approved.

Do not add provider/search/fetch execution, prompt/model/schema/UCM changes, cache IO, Source Reliability imports, public exposure, ACS/direct URL dispatch, approval flips, broad live jobs, or V1 cleanup without a later reviewed gate.

## Warnings

- `EvidenceCorpusBuildDecision` is not an `EvidenceCorpus`.
- `evidenceCorpus: null` means "not built yet", not "no evidence found".
- Do not derive scarcity, sufficiency, quality warnings, or report content from 7F.
- Source Reliability remains unchanged and unimported.

## Learnings

- Separating `notBuiltReason` from `blockedReason` prevents pre-execution readiness from looking like an error state.
- Null corpus plus explicit provenance is safer than placeholder arrays before acquisition/extraction exists.

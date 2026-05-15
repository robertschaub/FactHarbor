# Lead Architect Handoff - V2 Slice 7C Evidence Source Request Contract

**Date:** 2026-05-15
**Role:** Lead Architect / Captain deputy
**Task:** Implement the first non-executable Evidence Lifecycle source-acquisition request contract
**Implementation commit:** `22530936` (`feat: add v2 evidence source request contract`)
**Gate document:** `Docs/WIP/2026-05-15_V2_Slice_7C_Evidence_Source_Acquisition_Contract_Source_Package.md`
**Checklist:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## Summary

Slice 7C adds a pure internal `SourceAcquisitionRequest` contract. It maps only a ready `EvidenceLifecycleStartDecision` to a non-executable source-acquisition request and fails closed for blocked or malformed inputs.

The request carries the exact `ClaimContract` reference from the prior `EvidenceLifecycleIntake`, records the static non-executable policy snapshot, and includes the complete fixed retrieval-policy catalog as `planned_not_executable`.

No source acquisition, search, fetch, prompt rendering, model call, cache IO, Source Reliability call/import, orchestrator wiring, public exposure, ACS/direct URL execution, UCM/default change, approval flip, live job, V1 reuse, or V1 cleanup was added.

## Review Consolidation

The first 7C package review returned `MODIFY` from all three reviewers. Required changes were:

- fixed complete retrieval-policy catalog only;
- no caller-supplied retrieval plan;
- symbolic non-executable task labels only;
- no real gateway task IDs, prompt profile IDs, provider IDs, or model IDs as routing authority;
- source-language-first recorded only as non-executable intent;
- tests proving identical policy snapshot/catalog across claim text and language.

After edits, all three reviewers approved immediate contract-only implementation with no Captain escalation needed.

## Files Changed

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-15_V2_Slice_7C_Evidence_Source_Acquisition_Contract_Source_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7C_Evidence_Source_Request.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 3 files / 49 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 28 files / 229 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

No live jobs were run because 7C is non-executable.

## Next Step

Prepare a reviewed 7D package for the next Evidence Lifecycle boundary. The safest next package is still not provider/search/fetch execution. It should decide whether to add an `EvidenceCorpus` empty/non-executable contract or a task-policy snapshot ownership contract before source-acquisition execution.

Do not add provider/search/fetch implementation, prompt/model/schema/UCM changes, cache IO, Source Reliability imports, public exposure, ACS/direct URL dispatch, approval flips, broad live jobs, or V1 cleanup without a later reviewed gate.

## Warnings

- The request contract is a planning handoff only; it must not be treated as research execution.
- The retrieval-policy catalog records available future lanes, not selected evidence needs.
- Source Reliability remains unchanged and unimported.
- `Plastic recycling is pointless` remains separate Claim Understanding policy-quality debt.

## Learnings

- A fixed non-executable retrieval catalog is safer than caller-supplied policy input before UCM/task-policy authority exists.
- Tests comparing different claim wording and languages are useful to prove no hidden semantic routing entered a structural contract.

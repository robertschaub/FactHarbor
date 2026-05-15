# Lead Architect Handoff - V2 Slice 7E Evidence Task Policy Contract

**Date:** 2026-05-15
**Role:** Lead Architect / Captain deputy
**Task:** Implement the shared non-executable Evidence Lifecycle task-policy contract
**Implementation commit:** `d9d25ef7` (`feat: add v2 evidence task policy contract`)
**Gate document:** `Docs/WIP/2026-05-15_V2_Slice_7E_Evidence_Task_Policy_Contract_Source_Package.md`
**Checklist:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## Summary

Slice 7E moves the static symbolic Evidence Lifecycle policy snapshot out of source acquisition and into a shared `evidence-lifecycle/task-policy/` contract module.

`SourceAcquisitionRequest` now consumes `buildStaticEvidenceTaskPolicySnapshot()` and `readStaticEvidenceRetrievalPolicyCatalog()` instead of owning private policy constants or a private builder. The task-policy contract remains internal, static, non-executable, no-store/no-read, provider-not-wired, prompt/model-not-approved, public-forbidden, and Source Reliability-thin-port-pending.

No provider/search/fetch implementation, prompt rendering, model call, cache IO, UCM/default JSON change, Source Reliability call/import, orchestrator wiring, public exposure, ACS/direct URL execution, approval flip, live job, V1 reuse, or V1 cleanup was added.

## Review Consolidation

The 7E review approved immediate implementation only after tightening the package to be an extraction, not a duplicate policy layer.

The implemented shape follows that decision:

- policy snapshot/version/task/catalog types moved to `task-policy/types.ts`;
- static task/catalog builders moved to `task-policy/static-policy.ts`;
- source acquisition imports the shared contract types and builders;
- boundary guards prove source acquisition no longer owns `PLANNED_TASKS`, `RETRIEVAL_POLICY_CATALOG`, or `buildPolicySnapshot`;
- the new task-policy folder has an exact-file guard and remains inert before UCM/runtime authority exists.

## Files Changed

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-15_V2_Slice_7E_Evidence_Task_Policy_Contract_Source_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7E_Evidence_Task_Policy.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 3 files / 51 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 29 files / 235 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

No live jobs were run because 7E is non-executable.

## Next Step

Prepare a reviewed 7F package before any source execution. The safest next boundary is an `EvidenceCorpus` `not_built`/`blocked_pre_execution` contract and handoff from source acquisition, still without search/fetch/provider calls.

Do not add provider/search/fetch implementation, prompt/model/schema/UCM changes, cache IO, Source Reliability imports, public exposure, ACS/direct URL dispatch, approval flips, broad live jobs, or V1 cleanup without a later reviewed gate.

## Warnings

- The task-policy snapshot is static contract metadata, not runtime task authority.
- Source-language-first is recorded only as future policy intent; it must not become deterministic language routing.
- Source Reliability remains unchanged and unimported.
- `Plastic recycling is pointless` remains separate Claim Understanding policy-quality debt.

## Learnings

- Extracting the policy owner now reduces drift before `EvidenceCorpus` and source execution are introduced.
- Boundary guards should enforce ownership moves, not only forbidden imports.

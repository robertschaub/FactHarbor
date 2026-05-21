# Captain Deputy Handoff - V2 HighJump W7-B Sufficiency Status Projection Repair

**Date:** 2026-05-22
**Role:** Captain Deputy / Lead Developer
**Status:** Verifier-clean repair package, pending commit/runtime-refresh canary

## Summary

HJ-3 diagnostic canary job `ed3a7a7c2e8d405bba30b3ac475f265a` identified the
W7-B schema stop as a status-domain projection bug:
`warningMaterialityInputs.upstreamSufficiencyStatus` received task status
`accepted` instead of the W6-C LLM-owned sufficiency judgment `caveated`.

The repair preserves the W6-C judgment as `sufficiencyAssessmentStatus`, carries
it into W7-B warning materiality, aligns W8-A/W8-B projections, and keeps public
V2 blocked/precutover.

## Steer-Co Result

Consent:

- Amend the existing W6-C -> W7-B projection path.
- Keep the W7-B schema strict.
- Do not add semantic mapping or fallback status conversion.
- Fail closed when the preserved W6-C sufficiency judgment is absent.

Reviewers:

- GPT Steer-Co review lane: support with conditions.
- Prompt/schema review lane: modify by adding provenance allowlist and
  downstream projection alignment.
- Claude Opus 4.6: support, with downstream W8-A/W8-B projection warning.

No unresolved dissent.

## Files Changed

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`
- focused W6/W8 route/runtime tests
- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- `Docs/WIP/2026-05-22_V2_HighJump_HJ3_W7B_Diagnostic_Canary_Result.md`
- `Docs/WIP/2026-05-22_V2_HighJump_W7B_Sufficiency_Status_Projection_Repair.md`
- `Docs/AGENTS/Agent_Outputs.md`
- generated handoff index

## Debt-Guard Result

DEBT-GUARD RESULT

Classification:

- `incomplete-existing-mechanism`.

Chosen option:

- Amend existing structural projection and provenance contracts.

Rejected path and why:

- Schema loosening would hide the contract mismatch.
- Deterministic status mapping would add a parallel semantic mechanism.
- A new hidden route or diagnostic was unnecessary because HJ-3 already captured
  the issue.

What was removed/simplified:

- Stale fixtures no longer use task status `accepted` as upstream sufficiency
  materiality.

What was added:

- One structural W6-C decision field and projection updates.

Net mechanism count:

- Unchanged.

Budget reconciliation:

- Patch stayed within W6-C/W7-B/W8 projections, focused tests, and docs.

Verification:

- See below.

Debt accepted and removal trigger:

- No new accepted debt. Existing V2-RL-022 diagnostic retirement trigger remains.

Residual debt:

- The next canary may reveal another W7-B schema issue. Use diagnostics and
  repair narrowly.

## Verifiers

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/ test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/ test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/ test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts`
  - 11 files / 73 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - 1 file / 94 tests.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm run debt:sensors`.
  - `advisory_warn` for known V2 footprint, boundary guard size, docs footprint,
    net mechanism telemetry, and consolidation-marker warnings.
- `npm -w apps/web run build`.
- `git diff --check`.

## Current State

- Current HEAD before this repair commit: `90d83d6bdf5142b1bc8cfa69ed330b5b038f56da`.
- HJ-3 diagnostic canary consumed one live job; HighJump budget is `10` before
  the repair canary.
- Public V2 remains blocked/precutover.
- Runtime must be refreshed to the repair commit before canary submission.

## Next Action

Commit this repair, refresh API/Web runtime, verify both runtime commits match
the repair commit, run W8-B route preflight, then submit exactly one HighJump
repair canary using:

```text
Using hydrogen for cars is more efficient than using electricity
```

If the canary passes W7-B and W8-B produces an internal Alpha report-result
candidate, proceed to internal report review. If it stops, record the exact
bounded diagnostic and repair narrowly.

## Warnings

- Do not run the canary before committing and refreshing runtime.
- Do not run a second repair canary without a new specific ambiguity.
- Do not expose public report output.
- Do not loosen W7-B schema or add deterministic semantic mapping.

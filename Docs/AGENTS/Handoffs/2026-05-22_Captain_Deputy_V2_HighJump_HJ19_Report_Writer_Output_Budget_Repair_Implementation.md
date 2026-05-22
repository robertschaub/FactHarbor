# Captain Deputy Handoff - V2 HighJump HJ19 Report Writer Output-Budget Repair

**Date:** 2026-05-22
**Role:** Captain Deputy / Lead Developer coordination
**Slice:** X7-HJ-19 Report Writer Output-Budget Repair
**Source package:** `Docs/WIP/2026-05-22_V2_HighJump_HJ19_Report_Writer_Output_Budget_Repair.md`

## Current State

HJ18 canary job `c75322fad1e74218b8ee51a54f2307cd` proved the hidden/internal
`aggregation_narrative` report-writer path was reachable and contained, but it
failed closed at `parse_failure` after exactly `4000` output tokens and produced
no report markdown.

HJ19 repairs that stop by amending the existing report-writer mechanism in
place:

- HJ19 approval provenance is recorded for `aggregation_narrative`.
- The active model policy is now `v2.model.aggregation_narrative.hj19`.
- The active cache policy is now `v2.semantic.aggregation-narrative.hj19`.
- `aggregation_narrative` `maxOutputTokens` is now `8000`.
- `V2_AGGREGATION_NARRATIVE` includes topic-neutral compactness guidance.
- Public V2 remains blocked/precutover/damaged.
- No new report stage, retry, schema relaxation, source/provider expansion,
  route, public surface, parser, cache/SR/storage, ACS/direct URL, V1 work, or
  V1 cleanup was added.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen path: amend the existing HJ18 report-writer task. This is the lowest net
complexity path because the prior canary showed a concrete truncation/parse stop
inside an otherwise reachable and contained mechanism.

Rejected paths:

- retrying the same truncation-prone output;
- schema relaxation;
- adding a parallel report-writer stage;
- changing source acquisition/provider behavior;
- adding another readiness/proof layer.

Net mechanisms: unchanged.

## Reviewer Coverage

Claude Opus 4.6 was invoked through `scripts/agents/invoke-claude.cjs` for an
HJ19 direction review but timed out. This is degraded reviewer coverage, not
approval. Captain Deputy proceeded under reduced quorum because the repair is
bounded, reversible, directly addresses the observed HJ18 stop, and stays inside
the existing report-writer mechanism.

## Verifiers

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts`
  - `3` files / `25` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route.test.ts`
  - `2` files / `7` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - `1` file / `96` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `75` files / `356` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `144` files / `871` tests.
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
  - `advisory_warn` at `2026-05-22T08:22:49.113Z`; known V2 footprint,
    boundary-guard size, docs-volume, net-mechanism, and consolidation-marker
    warnings.
- `npm -w apps/web run build`
- `git diff --check`

One initial combined focused verifier timed out while the slow boundary guard
was included. No assertion failure was observed; the verifier was split and the
full focused set passed.

## Canary Readiness

One HJ19 canary is worth spending after:

- focused implementation commit;
- clean git status;
- runtime refresh from that commit;
- API/Web runtime commit match;
- route/runtime preflight;
- authenticated default redaction check;
- public leak check discipline.

Budget before the HJ19 canary: `7` remaining in the active HighJump
continuation tranche.

No second HJ19 canary is authorized by this handoff.

## Next Concrete Action

Commit the focused HJ19 implementation package. Then refresh runtime and run
exactly one HJ19 canary on the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

If the canary produces `internal_report_writer_draft_created`, inspect/report
the hidden report writer artifact and public/default-admin leak posture. If it
still fails parse/schema with unclear cause, stop and reconvene Steer-Co rather
than stacking another repair.

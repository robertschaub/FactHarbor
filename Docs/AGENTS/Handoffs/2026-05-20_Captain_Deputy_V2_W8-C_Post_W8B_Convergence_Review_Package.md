# 2026-05-20 Captain Deputy V2 W8-C Post-W8B Convergence Review Package

**Role:** Captain Deputy / Steer-Co
**Status:** review package prepared; no implementation or live job
**Package:** `Docs/WIP/2026-05-20_V2_Slice_W8-C_Post_W8B_Convergence_Review_Package.md`
**Preceding implementation:** W8-B commit `f468a73d`

## Summary

After W8-B landed as the first inspectable hidden/internal Alpha report-result
candidate, Captain Deputy convened a short Steer-Co review on the next step.

The decision was between:

- W8-B product-route canary first; or
- no-live convergence first for W7-A/W8-A/boundary-guard pressure.

Gemini recommended canary-first for report-value evidence but noted the live-job
ledger needs explicit replenishment. Claude Opus recommended convergence-first
because the ledger records `currentRemaining = 0` and W8-B explicitly carried
W8-A/W7-A merge pressure.

Captain Deputy consolidated to W8-C convergence first, with the W8-B product
route canary as the immediately sequenced successor after W8-C lands or is
explicitly rejected and a one-job tranche top-up/reset is recorded.

## Package Direction

W8-C is review-only and proposes:

- W8-A fail-closed parity coverage against W8-B.
- W8-B merge trigger update only after parity is proven.
- W7-A keep/merge/quarantine decision.
- First focused boundary-guard consolidation for the W7/W8 report-result path,
  only if coverage can be preserved.
- Retirement ledger update for the actual convergence result.

## Boundaries

W8-C authorizes no implementation until accepted. It also authorizes no live
job, no live-job ledger top-up/reset, no prompt/model/config/schema/UCM/gateway
edit, no LLM/provider call, no public/API/UI/report/export/compatibility
behavior, no parser/cache/SR/storage/provider widening, no ACS/direct URL, no
V1 work, no V1 cleanup, and no cutover.

## Verification

`npm run debt:sensors` at intake returned known `advisory_warn`:

- V2 source: `158` files / `48683` lines.
- V2 tests: `139` files / `53667` lines.
- Boundary guard: `11597` lines.
- Docs/WIP markdown files: `241`.
- Handoffs: `762`.
- Net mechanism increases: `18`.

Package closeout verifiers pending:

- `npm run index`
- `git diff --check`
- focused status check

## Next Agent Context

If accepted, Lead Developer should implement W8-C only inside the package
envelope. If implementation pressure shifts toward a live canary, tranche reset,
prompt/model/config/schema changes, public behavior, or W7/W8 deletion without
parity, stop and reconvene Steer-Co.

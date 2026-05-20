# 2026-05-20 Captain Deputy V2 W8-F Attribution Canary Package

**Role:** Captain Deputy / Steer-Co
**Status:** execution package prepared; canary pending after commit/runtime refresh
**Package:** `Docs/WIP/2026-05-20_V2_Slice_W8-F_W8E_Attribution_Product_Route_Canary_Package.md`
**Baseline:** W8-E commit `dfe430b5`

## Summary

Prepared W8-F as the next bounded live canary after W8-E.

Steer-Co consent was to run one product-route canary with the W8-E enum-only
`upstreamStopAttribution` projection before scoping any W6-C repair. Claude
Opus 4.6 and the GPT technical reviewer both supported W8-F because W8-D's
`sufficiency_assessment_not_completed` was a symptom-level stop and W8-E was
added specifically to name the first incomplete upstream owner.

Captain authorized job submission and set the live-job budget to `8`.
`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` now records tranche
`v2-w8f-captain-reset-2026-05-20` with `currentRemaining = 8` before the W8-F
canary.

## Canary Scope

W8-F authorizes exactly one `claimboundary-v2` product-route job using the exact
Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

The canary must prove the same-ledger hidden/admin-only W8-B route exposes
text-free W8-E `upstreamStopAttribution` with a decisive first incomplete stage
or `none` for a candidate-created result, while public V2 remains
`4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

## Boundaries

No second W8-F canary is authorized. W8-F authorizes no source implementation,
W6-C repair, prompt/model/config/schema/UCM/gateway edit, public/API/UI/report/
export/compatibility behavior, parser/cache/SR/storage/provider expansion,
W2/W3 widening, ACS/direct URL, V1 work, V1 cleanup, or cutover.

## Required Before Submission

- package commit;
- clean git status or non-destructive isolation of unrelated WIP docs;
- runtime refresh from committed state;
- runtime commit verification;
- W8-B route auth/no-store/missing-ledger preflight;
- focused W8-B/W8-E verifiers;
- V2 gate validation and gate-register self-test.

## Next Agent Context

After the canary, create the W8-F live-result package, debit the tranche by one
if a job was submitted, update status/backlog/Agent_Outputs/handoff index, and
commit the result package. Stop without retry if the canary is ambiguous,
lineage-mismatched, text-bearing, or leaks public/default-admin internals.

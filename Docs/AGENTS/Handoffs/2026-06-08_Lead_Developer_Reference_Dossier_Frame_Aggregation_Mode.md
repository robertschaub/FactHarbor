# Lead Developer Handoff — Reference Dossier Frame Aggregation Mode

**Date:** 2026-06-08
**Role:** Lead Developer
**Agent:** Codex GPT-5
**Scope:** Reference-dossier v0.3 contract extension for multi-interpretation and zero-dominant AtomicClaim frames.

## Summary

Extended the reference-dossier contract from frame roles/dominance weights to explicit `frameAggregationMode`:

- `dominance_weighted`: a primary/secondary frame with at least one, but not all, weighted AtomicClaims marked `dominant`.
- `balanced_composite`: a primary/secondary frame with zero dominant AtomicClaims and supporting weights summing to 1.0.
- `no_topline`: a caveat/context-only frame with no dominant, supporting, or aggregate-topline truth condition.

This closes two Captain concerns without reopening the model:

- a dossier can list any number of admissible interpretation frames, not only two;
- a scorable frame can have zero dominant AtomicClaims, while dominance-weighted frames cannot mark every weighted AtomicClaim as dominant.

## Implementation Notes

The JSON Schema now requires `interpretationFrames[].frameAggregationMode`. The validator enforces aggregation-mode-specific weight, dominance, and top-line routing rules. Top-line assertions are allowed from `dominant`/`aggregate_topline` truth conditions in dominance-weighted frames and from `supporting`/`aggregate_topline` truth conditions in balanced-composite frames.

All eight active dossiers were updated. Balanced frames are used for the single-condition `asylum-235000`, literal-zero-benefit `plastic`, and secondary signed-text `rechtskräftig` routes. Hydrogen keeps full-pathway efficiency dominant and use-phase efficiency supporting, with a separate aggregate-topline assertion for legacy C4 routing.

## Files Changed

- `Docs/AGENTS/Reference_Dossiers/reference-dossier.schema.json`
- all eight `Docs/AGENTS/Reference_Dossiers/*.json` dossiers
- `scripts/validate-reference-dossiers.cjs`
- `scripts/lib/reference-dossier-routing.cjs`
- `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`
- `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`

## Validation

- `npm run validate:reference-dossiers` — pass
- `node --check scripts/validate-reference-dossiers.cjs` — pass
- `node --check scripts/lib/reference-dossier-routing.cjs` — pass
- `npx tsx scripts/measure-report-quality.ts --family hydrogen-en --limit 1 --json` — pass; confirms the new aggregate hydrogen top-line route is consumed and `frameAggregationMode` is exposed in routing output.

## Warnings

`Docs/AGENTS/Agent_Outputs.md` was already dirty before this task with unrelated daily-scan entries and was intentionally not staged.

One validation amend occurred: the first hydrogen pass made the use-phase truth condition supporting while leaving it as the top-line route. The fix was to add an explicit aggregate-topline assertion rather than weakening the validator.

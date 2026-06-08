# Lead Developer Handoff — Reference Dossier Frame/Dominance Extension

**Date:** 2026-06-08
**Role:** Lead Developer
**Agent:** Codex GPT-5
**Scope:** Reference-data model, validation, and `bundesrat-rechtskraftig` v0.2 semantics.

## Summary

Extended the AtomicClaim reference-dossier contract from v0.1 to v0.2 so it can represent:

- primary vs secondary vs caveat interpretation frames through `interpretationFrames[].frameRole`;
- dominant/supporting/caveat/context/aggregate truth conditions through `distinctTruthConditions[].dominanceRole`;
- dominance weights for mixed true/false AtomicClaims through `distinctTruthConditions[].dominanceWeight`;
- conditional secondary top-line routes through `benchmarkCoherence.alternativeTopLineRoutes[]`.

The validator now enforces these fields, requires valid dominance-weight sums for primary/secondary frames, blocks top-line routing from caveat frames, and validates secondary top-line route assertions against their route bands/labels.

## Bundesrat-Rechtskräftig Decision

`Docs/AGENTS/Reference_Dossiers/bundesrat-rechtskraftig.v0.1.json` was versioned to `bundesrat-rechtskraftig.v0.2.json`.

The v0.2 dossier makes legal-force / entry-into-force the primary `rechtskräftig` route:

- primary C4 route: `LEANING-FALSE | MIXED`, truth `29-57`, confidence `55-85`;
- supporting chronology is true-side but cannot override the dominant false legal-force condition by raw claim count;
- explicit secondary route: signed text formally fixed/authenticated while treaty/package is not yet in force, `LEANING-TRUE | MOSTLY-TRUE`, truth `58-85`, confidence `55-85`;
- limited/provisional effects are guards/caveats, not co-equal top-line scoring.

`benchmark-expectations.json` now links `bundesrat-rechtskraftig` to v0.2 and uses the primary route as the legacy aggregate C4 expectation. Secondary true-side credit remains frame-aware/manual until Phase 0b alignment can select `alternativeTopLineRoutes` per report.

## Files Changed

- `Docs/AGENTS/Reference_Dossiers/reference-dossier.schema.json`
- `scripts/validate-reference-dossiers.cjs`
- `scripts/lib/reference-dossier-routing.cjs`
- `scripts/measure-report-quality.ts`
- all eight `Docs/AGENTS/Reference_Dossiers/*.json` dossiers for required frame/dominance metadata
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`
- `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`

## Validation

- `npm run validate:reference-dossiers` — pass
- `node --check scripts/validate-reference-dossiers.cjs` — pass
- `node --check scripts/lib/reference-dossier-routing.cjs` — pass
- `node --experimental-strip-types --check scripts/measure-report-quality.ts` — pass
- `git diff --check` — pass
- `npx tsx scripts/measure-report-quality.ts --family bundesrat-rechtskraftig --limit 1` — pass; confirms v0.2 primary route is consumed and secondary routes are diagnostic/not averaged
- `npx tsx scripts/measure-report-quality.ts --limit 25` — pass; no parse failures

## Next Work

Run manual C1/C3 alignment on stored `bundesrat-rechtskraftig` reports using the v0.2 rubric:

1. identify active frame (`primary` legal-force vs `secondary` signed-text/authentication);
2. verify whether secondary reports explicitly state the not-yet-in-force caveat;
3. map Stage 1 AtomicClaims to dominant/supporting truth conditions;
4. measure whether dominance-weighted atomicity matches Captain expectations before any judge spend.

## Warnings

`Docs/AGENTS/Agent_Outputs.md` was already dirty before this task and was intentionally not touched or staged.

# Lead Developer Handoff — Bundesrat-Rechtskräftig Diverse Review Remediation

**Date:** 2026-06-09
**Role:** Lead Developer
**Agent:** Codex GPT-5
**Scope:** Diverse-review remediation for the `bundesrat-rechtskraftig` v0.3 reference dossier and two manual alignment artifacts.

## Summary

Called three independent reviewers through the local wrappers:

- GPT wrapper (`gpt-5.5`) — rerun required because the first call returned an empty successful response; second call returned NO-GO unless artifacts were made auditable and explicitly marked as negative/calibration examples.
- Gemini wrapper (`gemini-3.1-pro-preview`) — conditional GO after making aggregate top-lines non-atomic and tightening C4 alignment structure.
- Claude wrapper (`opus-4.8-1m-max`) — conditional GO for manual pilot use, NO-GO for judge-training gold until C3 band inconsistency, route guards, aggregate weights, and enum/status clarity were fixed.

Implemented the concrete findings:

- `aggregate_topline` truth conditions are now non-atomic in the executable contract: `dominanceWeight: null`, `independentAssessabilityRequired: false`, and validator enforcement.
- Alternative route coverage guards are route-scoped through `alternativeTopLineRoutes[].coverageGuardAssertionIds`; the Bundesrat secondary signed-text route now carries its own required guards instead of leaking them into root family guards.
- The scorer's reference-dossier routing output now surfaces route-scoped alternative guards as `ALTERNATIVE_ROUTE_GUARD`.
- The two manual alignment artifacts now include exact stored AtomicClaim text/verdict/evidence-ID snapshots, input exactness, explicit `benchmarkPass: false`, and `goldUse: manual_alignment_gold_negative`.
- The 874 legal-force C3 fit is corrected from `in_band` to `adjacent` because MOSTLY-FALSE 18 direction-normalizes to roughly 82%, below the 86-100 reference band.
- Optional secondary-frame caveats for EUPA provisional application and ratification-phase cooperation are no longer required route conditions.

## Validation

- `npm run validate:reference-dossiers` — pass
- JSON parse check for updated dossiers, schema, and alignment artifacts — pass
- `node --check scripts/validate-reference-dossiers.cjs` — pass
- `node --check scripts/lib/reference-dossier-routing.cjs` — pass
- `npx tsx scripts/measure-report-quality.ts --family bundesrat-rechtskraftig --limit 1 --json` — pass; confirms top-line aggregate weight is `null`, route-scoped guards are surfaced, and root guards are empty.
- `git diff --check` — pass

## Warnings

`Docs/AGENTS/Agent_Outputs.md` and `.gitattributes` were already dirty with unrelated changes and were intentionally not staged.

The two manual alignments are approved only as scored negative/calibration artifacts for this pilot, not as successful benchmark-output exemplars. The positive successful comparator remains the Captain-accepted `f8e72c84fb004f23945e23c81973fc26`.

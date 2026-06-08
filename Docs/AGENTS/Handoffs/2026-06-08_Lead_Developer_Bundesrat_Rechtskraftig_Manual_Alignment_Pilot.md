# Lead Developer Handoff — Bundesrat-Rechtskräftig Manual Alignment Pilot

**Date:** 2026-06-08
**Role:** Lead Developer
**Agent:** Codex GPT-5
**Scope:** Captain-guided Phase 0b manual alignment for `bundesrat-rechtskraftig`.

## Summary

Captain confirmed the expected C1 shape for the canonical input:

1. signature occurred before Parliament decision;
2. signature occurred before people decision;
3. signature was or was not legally in force / finally binding.

This required a narrow dossier version bump from `bundesrat-rechtskraftig.v0.2.json` to `bundesrat-rechtskraftig.v0.3.json`. Signature occurrence remains required coverage, but it may be visibly merged into the two chronology AtomicClaims and is no longer required as a standalone extracted AtomicClaim.

Two manual alignment artifacts were added:

- `Docs/AGENTS/Reference_Dossiers/alignments/bundesrat-rechtskraftig/87487a151465472093c8d2b1ae32a4b6.reference-alignment-score.v0.3.json`
- `Docs/AGENTS/Reference_Dossiers/alignments/bundesrat-rechtskraftig/85843ef4f98144f2afa7a088b9371dd9.reference-alignment-score.v0.3.json`

## Findings

`87487a151465472093c8d2b1ae32a4b6` is the stronger C1/C3 local-claim comparator:

- three clean AtomicClaims;
- dominant legal-force claim separately extracted;
- legal-force claim verdict is direction-normalized in-band (`MOSTLY-FALSE` on the positive claim);
- caveats: stored `inputClassification` is `ambiguous_single_claim`, secondary signed-text frame is not explicitly disclosed, and primary aggregate C4 still misses because the overall report is true-side.

`85843ef4f98144f2afa7a088b9371dd9` is close but weaker:

- stored `inputClassification` is correct (`multi_assertion_input`);
- chronology claims are clean;
- dominant legal-force condition is visible only inside a compound top-line AtomicClaim and gets a C1 atomicity penalty;
- primary aggregate C4 still misses because the overall report is true-side.

## Validation

- `npm run validate:reference-dossiers` — pass
- JSON parse check for the v0.3 dossier, benchmark expectations, and both alignment artifacts — pass
- `npx tsx scripts/measure-report-quality.ts --family bundesrat-rechtskraftig --limit 1 --json` — pass; confirms the scorer consumes `bundesrat-rechtskraftig.v0.3.json`.

## Warnings

`Docs/AGENTS/Agent_Outputs.md` was already dirty with unrelated entries and was intentionally not staged.

The alignment artifacts are manual pilot evidence, not an automated scorer. They should be reviewed before being used as judge-training or judge-agreement gold.

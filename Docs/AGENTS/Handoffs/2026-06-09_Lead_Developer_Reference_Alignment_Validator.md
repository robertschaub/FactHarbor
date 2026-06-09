# Lead Developer Handoff — Reference Alignment Validator

**Date:** 2026-06-09
**Role:** Lead Developer
**Scope:** Add executable structural validation for `reference-alignment-score.v0.3` manual alignment artifacts.

## Summary

Added `scripts/validate-reference-alignments.cjs` and exposed it as `npm run validate:reference-alignments`.

The validator checks the alignment artifact contract mechanically:

- `schemaVersion`, required top-level fields, enum values, and score domains.
- Linked dossier identity by `(dossierId, dossierVersion)` and matching `inputSlug`.
- Active and runner-up frame IDs, active-frame role and aggregation mode.
- Reference assertion IDs, truth-condition IDs, dominance roles, and dominance weights against the linked dossier.
- Report AtomicClaim IDs, including compound IDs such as `AC_01+AC_02+AC_03`.
- C1 required assertion coverage for the active frame.
- C3 assertion verdict fit references.
- C4 expected primary route labels/bands against `benchmarkCoherence`, and pass/miss consistency with observed verdict/truth/confidence.

The validator intentionally does not decide whether a report semantically matches a reference assertion. That remains a manual or LLM-judge responsibility.

## Validation

Passed:

- `node --check scripts/validate-reference-alignments.cjs`
- `npm run validate:reference-alignments`
- `npm run validate:reference-dossiers`

Current checked alignment artifacts:

- `Docs/AGENTS/Reference_Dossiers/alignments/bundesrat-rechtskraftig/85843ef4f98144f2afa7a088b9371dd9.reference-alignment-score.v0.3.json`
- `Docs/AGENTS/Reference_Dossiers/alignments/bundesrat-rechtskraftig/87487a151465472093c8d2b1ae32a4b6.reference-alignment-score.v0.3.json`
- `Docs/AGENTS/Reference_Dossiers/alignments/bundesrat-rechtskraftig/c9657f31586c492c8ab130cf5b8dc98d.reference-alignment-score.v0.3.json`

## Warnings

- This is structural validation only. It prevents broken IDs, stale dossier links, impossible C4 pass flags, and malformed score artifacts, but it cannot replace the manual/LLM semantic alignment judge.
- Future scorer versions should either preserve this v0.3 contract or add a versioned validator branch before writing new artifact shapes.

## Learnings

- Manual alignment artifacts need executable guardrails as soon as they become benchmark evidence. Otherwise a later dossier edit can silently invalidate IDs, weights, route bands, or gold-positive/gold-negative status.

# Lead Developer Handoff — Plastic Pointless Manual Alignment

**Date:** 2026-06-09
**Role:** Lead Developer
**Scope:** Add the first `plastic-en` manual reference-alignment artifact.

## Summary

Added:

- `Docs/AGENTS/Reference_Dossiers/alignments/plastic-en/4fc23d657b0f4fd6ae7b5bf937f6cd9f.reference-alignment-score.v0.3.json`

This is a stored-report alignment for exact input `Plastic recycling is pointless`, job `4fc23d657b0f4fd6ae7b5bf937f6cd9f`.

The artifact is deliberately:

- `goldUse: manual_alignment_calibration_only`
- `manualGoldApproved: false`
- `benchmarkPass: true`
- `overallAlignmentStatus: partial`

It is a positive C4 calibration example because the report's `MIXED 56/68` result is inside the `plastic-en` primary dossier route. It is not Captain-approved gold and not a clean C1/C3 pass.

## Review

Before writing the artifact, three wrapper-based reviewers checked the proposed mapping:

- GPT-5.5: GO with revisions.
- Gemini 3.1 Pro Preview: GO.
- Opus 4.8 1M Max: NO-GO as proposed, then GO after revisions.

Accepted revisions:

- Downgraded environmental mapping from full to partial.
- Reduced `c1.axisScores.assertionCoverage` from `1.0` to `0.85`.
- Kept `AC_03` as `tolerated_context` instead of active-frame coverage.
- Added explicit caveats for the literal-zero guard, material-specific context, and environmental overstatement.
- Kept `harmfulError: none` because the v0.3 contract only allows `none | confident_wrong | harmful_miss`; the environmental confirming drift is recorded in notes/review flags instead of inventing a new enum.

Rejected reviewer suggestions:

- Do not add a non-contract `c4` object. The established alignment artifact field is `c4Note`.
- Do not map active-frame C1 coverage to a secondary-frame guard assertion. The guard gap is captured as disclosure/context caveat.
- Do not introduce new enum labels such as `minor_confirming_drift` without a reviewed schema change.

## Validation

Passed:

- `npm run validate:reference-alignments`
- `npm run validate:reference-dossiers`

## Warnings

- This artifact is calibration-only. It should not be used as judge-training gold without Captain approval and broader Phase 0b reliability evidence.
- The plastic dossier remains interpretation-heavy. Future alignments should sample both centered and extreme reports so the manual-vs-judge gate sees non-degenerate label coverage.

## Learnings

- For ambiguous evaluative inputs, positive C4 does not imply full C1/C3 alignment. The artifact should preserve that distinction explicitly; otherwise the reference system will over-credit reports that land in the right aggregate band for partially wrong component reasons.

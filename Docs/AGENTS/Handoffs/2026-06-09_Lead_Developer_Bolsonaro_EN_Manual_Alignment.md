# Lead Developer Handoff — Bolsonaro EN Manual Alignment

**Date:** 2026-06-09
**Role:** Lead Developer
**Scope:** Add the first `bolsonaro-en` manual reference-alignment artifact.

## Summary

Added:

- `Docs/AGENTS/Reference_Dossiers/alignments/bolsonaro-en/4da55d6227f8487597b1ccd20cbd5693.reference-alignment-score.v0.3.json`

This is a stored-report alignment for exact input:

`Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

The artifact is deliberately:

- `goldUse: manual_alignment_calibration_only`
- `manualGoldApproved: false`
- `benchmarkPass: true`
- `overallAlignmentStatus: partial`

It is a positive C4 calibration example because the report's `LEANING-TRUE 61/54` result is inside the `bolsonaro-en` primary route. It is not Captain-approved gold and not a full C1/C3 pass.

## Review

Before writing the artifact, three wrapper-based reviewers checked the proposed mapping:

- GPT-5.5: NO-GO as written; GO after corrections.
- Gemini 3.1 Pro Preview: NO-GO as written.
- Opus 4.8 1M Max: NO-GO until the sentence-proportionality mapping was removed.

Accepted corrections:

- Marked `TC_SENTENCE_PROPORTIONALITY_FAIRNESS` / `RA_SENTENCE_PROPORTIONALITY_FAIRNESS_CAVEATED_TRUE_SIDE` as not addressed.
- Removed the proposed C3 row for the sentence-proportionality assertion.
- Lowered `assertionCoverage` from `0.75` to `0.6`.
- Kept `benchmarkPass: true` as a mechanical C4 route pass only, not a gold judgment.
- Recorded a C3 enum-gap flag where `MIXED` is out-of-band below a true-side reference but is not a flip or UNVERIFIED.

## Dossier Follow-Up

All reviewers surfaced the same design tension: the current `bolsonaro-en` dossier uses sentence proportionality as the `topLineAssertionIds` route, while the Captain wording asks about legal proceedings, proceedings fairness, and verdicts meeting fair-trial standards. That may be too narrow for a v0.1 top-line route.

Do not silently change it in this artifact. Treat it as a `bolsonaro-en` dossier-v0.2 review item.

## Validation

Passed:

- `npm run validate:reference-alignments`
- `npm run validate:reference-dossiers`

## Warnings

- This artifact is calibration-only. It should not be used as judge-training gold without Captain approval and broader Phase 0b reliability evidence.
- Because the current dossier top-line assertion is not addressed by this report, this artifact is useful precisely as a C4-positive / C1-C3-partial case. Do not treat `benchmarkPass: true` as semantic alignment success.

## Learnings

- Dossier top-line route selection needs the same skepticism as report mapping. If the route is narrower than the Captain input, many valid reports will become C4-positive but top-line-coverage-negative; that is a dossier design signal, not merely a report defect.

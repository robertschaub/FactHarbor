# 2026-05-20 - Captain Deputy - V2 W8-A Review Package

## Summary

Prepared the W8-A review-only package:

`Docs/WIP/2026-05-20_V2_Slice_W8-A_Internal_Alpha_Report_Stop_Candidate_Review_Package.md`

The package proposes W8-A as a non-verdict-bearing internal Alpha report stop
candidate owner after contract-only W7-A. It does not authorize implementation,
live jobs, public behavior, prompt/model/config/schema/UCM/gateway changes, LLM
boundary/verdict/report execution, report prose, verdict/truth/confidence
generation, warning publication, compatibility projection, V1 work, or V1
cleanup.

## Review Outcome

Claude Opus senior architect / Product Trust review returned `AMEND` with no
blocking changes and consented to W8-A before W7-B.

Applied amendments:

- renamed the proposed artifact from `ReportResultCandidate` to
  `ReportStopCandidate`;
- added Captain's general Balanced Risk Mitigation Rule to root `AGENTS.md`,
  `.claude/skills/debt-guard/SKILL.md`, and
  `Docs/AGENTS/V2_Excellence_Scorecard.md`; after reviewer feedback, the
  `/debt-guard` skill now owns the canonical decision-record field list and the
  root Named Workflows table/skill metadata expose the non-bugfix trigger;
- stated that this W8-A is narrower than the full stop-line W8-A acceptance
  criteria and defers narrative/citation/empirical-vs-normative report fields to
  a post-W7-B package;
- clarified `publicCutoverStatus` as a mirror only, not a second source of
  truth;
- reframed scorecard impact as protection/consolidation rather than public
  report-quality progress;
- added enforceable W4-I no-reference verifier expectations;
- hardened the consolidation gate with a hidden-summary merge/removal condition;
- added the broader evidence-lifecycle test path to the proposed verifier set.

## Recommendation

Proceed to review/approval of W8-A as a contract-only internal stop owner.

Do not detour to W7-B first. W7-B would need prompt/model/UCM/schema approval
and would otherwise risk inventing its own result wrapper. W8-A first gives V2 a
canonical internal stop owner and makes the next decision cleaner:

- W7-B LLM boundary/verdict execution package; or
- W9-A review of the internal stop candidate.

## Guardrails

- No implementation yet.
- No live job; live-job ledger remains `currentRemaining = 0`.
- No public/API/UI/report/export/compatibility behavior.
- No generated report prose.
- No verdict/truth/confidence values.
- No user-visible warning publication.
- No prompt/model/config/schema/UCM/gateway edit.
- No parser/cache/SR/storage/provider widening, ACS/direct URL, or V1 work.

## Verification

- `npm run debt:sensors`: `advisory_warn`; known V2 source/test footprint,
  oversized boundary guard, docs volume, net mechanism, and consolidation-marker
  warnings.
- `git diff --check`: passed.

## Next Step

If W8-A is approved, issue a Lead Developer implementation prompt limited to the
review package. If reviewers dissent on stop-owner versus W7-B-first ordering,
reconvene Steer-Co before implementation.

# 2026-05-28 Lead Architect + LLM Expert: Previous Main Partial Takeover Review

## Scope

Investigated whether commits from the previous `main` lineage should be taken into the current `main`, including whether only parts of those commits should be considered.

Reviewed against:
- Current `main` at `2ac6cd02`.
- Previous main preservation branch `origin/codex/current-main-2026-05-27-before-rehome` at `284dde1f`.
- Prior stabilization takeover handoff `Docs/AGENTS/Handoffs/2026-05-28_Lead_Architect_Main_Stabilization_Analysis_Regression_Takeover.md`.
- Regression-comparison handoff `Docs/AGENTS/Handoffs/2026-05-28_Lead_Architect_2f7a_to_Current_Regression_Investigation.md`.
- Independent reviewer result from multi-agent reviewer `019e6dec-b48b-7760-bab5-3afb336017c1` (`Lorentz`).

No code, prompt, or config changes were made during this review.

## Branch Context

The old-main merge base with current `main` is `d528b62c`.

Right-only old-main commits still visible by `git log --left-right --cherry-pick main...origin/codex/current-main-2026-05-27-before-rehome`:
- `aa1e2c31`
- `a131bb41`
- `22c76839`
- `358bccba`
- `18f3bcbf`
- `002b3d3f`
- `7008b33f`
- `074fa27c`
- `2d07162e`
- `37cf92bf`
- `48b34617`
- `9b2c6039`
- `ca510f4c`
- `d04587ba`

Many of these are already logically present in current `main` under new SHAs from the stabilization extra picks:
- old `93302844` -> current `8800bd54`
- old `48b34617` -> current `82a1aa17`
- old `2d07162e` -> current `551e714b`
- old `a131bb41` -> current `2d1c3253`
- old `53423586` -> current `73b612a4`
- old `aa1e2c31` -> current `3e94e53e`

Dependency commits `358bccba` / `22c76839` are effectively no-ops against current package files: `package.json`, `apps/web/package.json`, and `package-lock.json` match current `main`.

## Reviewer Findings

Independent review agreed with the local investigation:

- Do not take any whole old-main commit. The remaining candidates mix runtime code, prompt behavior, generated indexes/docs, and old report-history assumptions.
- Current `main` can still accept a publishable verdict with zero directional citations after normalization or repair. The structural part of `d04587ba` is worth reimplementing against current `verdict-stage.ts`, not cherry-picking.
- Current `main` still applies an article-wide `verdict_integrity_failure` confidence cap in `aggregation-stage.ts`. The relevant part of `ca510f4c` is worth taking because per-claim downgrade should already flow through weighted aggregation.
- Do not take the `ca510f4c` adjudicator-bridge prompt as-is. It broadens directness/applicability in a way that could turn contextual pattern evidence into direct target evidence.
- Reject `9b2c6039` as written. Its "mechanical surface-pattern" prompt uses English grammar framing and conflicts with multilingual robustness expectations.

## Recommended Takeover

### Take now: partial code reimplementation only

1. From `d04587ba`: zero-directional-citation structural guard.

   Reimplement against current `apps/web/src/lib/analyzer/verdict-stage.ts`.

   Required behavior:
   - A normal publishable verdict must not pass validation when both `supportingEvidenceIds` and `contradictingEvidenceIds` are empty.
   - This must remain true after normalization or repair; an LLM direction-validator response of "valid" must not bypass the structural guard.
   - Explicit fallback/insufficient verdicts may pass when they clearly carry the integrity-downgrade reason.
   - Avoid broad-pool citation backfill. If no directional evidence is cited, downgrade rather than inventing citation support.

   Tests should go in `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` and cover:
   - post-normalization zero-citation publishable verdict safe-downgrades;
   - post-repair zero-citation publishable verdict safe-downgrades;
   - explicit insufficient/integrity-downgraded verdict remains allowed;
   - stale verdict label/tier normalization if current validation can still return stale labels.

2. From `ca510f4c`: remove article-wide `verdict_integrity_failure` confidence cap.

   Reimplement against current `apps/web/src/lib/analyzer/aggregation-stage.ts`.

   Required behavior:
   - A single claim-level `verdict_integrity_failure` must not cap the whole article confidence to `INSUFFICIENT` when other selected claims are healthy.
   - The affected claim should already be low confidence through its own downgraded verdict and weighted contribution.
   - If all direct/selected claims are integrity failures, aggregate confidence should naturally be low through the weighted inputs, not through an additional article-wide cap.

   Tests should go in the aggregation unit test suite and cover:
   - one downgraded claim plus healthy claims does not collapse article confidence;
   - all downgraded selected claims still produce low aggregate confidence without an extra global cap.

### Defer unless Captain explicitly approves prompt work

1. `ca510f4c` applicability/adjudicator-bridge prompt.

   Defer. It changes semantic directness classification, and it may blur same-system recurring-practice evidence into direct target evidence. It needs prompt review and live/report evidence before adoption.

2. `9b2c6039` bundled-evaluative-claim mechanical prompt.

   Reject as written. If the Bolsonaro EN bundled-proceedings/verdicts problem still reproduces, rewrite semantically and multilingual-first, e.g. around separable evaluands that can resolve differently, not English surface grammar.

3. `d04587ba` / `ca510f4c` docs and benchmark expectation updates.

   Do not silently take old expectation bands or report-history assertions. Current Captain feedback and benchmark expectations should drive those files.

## Deployment Implication

This review does not change the prior deployment recommendation:

- Clean current `main` remains deployable based on the available report comparison and Captain's Iran calibration.
- The two partial code fixes above are quality hardening items worth taking next, but they are not evidence for a broad rollback.
- If they are implemented before deployment, verify with focused unit tests, `npm -w apps/web run build`, and safe `npm test`. If implementation touches prompts, get explicit Captain approval first and reseed before live jobs.

## Warnings

- Do not cherry-pick the whole old commits. Reimplement the narrow behavior against current code because current `safeDowngradeVerdict` telemetry/signatures differ from old-main code.
- Prompt changes here are higher risk than the structural code guards. They affect semantic analysis behavior and must be reviewed under the genericity, multilingual, and no-test-case-term rules.
- The current worktree is dirty with unrelated docs/UI/dependency files. This review is source-history guidance only; it did not attempt to clean or stage anything.

## Learnings

- The most valuable remnants from previous `main` are not whole commits but two structural safeguards: no publishable zero-citation verdicts, and no article-wide confidence collapse from one claim-level integrity downgrade.
- The old prompt experiments contain useful failure hypotheses, but not all are acceptable takeover material under current AGENTS rules.


---
roles: [Lead Developer, LLM Expert]
topics: [report-review, asylum-235000-de, verdict-calibration, threshold-claims, source-acquisition, stop-rule]
files_touched:
  - apps/web/prompts/claimboundary.prompt.md
  - apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts
  - Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Lead Developer + LLM Expert Handoff

## Task

Continue the report-improvement plan after the `asylum-235000-de` canary `f079c5b6c5f84aa0941aafcff1b734a5` landed true-side but overconfident (`TRUE` 93/82). Apply the next minimal reviewed hypothesis, spend exactly one canary, and stop on first band failure.

## Done

- Loaded `/debt-guard` and classified prior work:
  - keep `2258d99a` freshness metadata exposure as structurally correct;
  - quarantine the live-quality claim for `2258d99a` because it overcalibrated;
  - treat the next hypothesis as Stage 4 near-threshold calibration, not another Stage 2 acquisition or broad query fix.
- Implemented commit `eda022fc fix(stage4): calibrate barely satisfied thresholds`.
  - Added generic `VERDICT_ADVOCATE` guidance: threshold/lower-bound/upper-bound/rank/equality/current-stock claims need separate direction and certainty calibration; a barely satisfied relation can support the claim while still limiting truth/confidence.
  - Added matching `VERDICT_RECONCILIATION` guidance so valid challenges about narrow margin, snapshot lag, boundary ambiguity, component-composition uncertainty, or lack of independent corroboration reduce overconfidence without flipping support direction absent direct contradiction.
  - Added a static prompt-contract test for the new generic rule.
- Verification before live job:
  - `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts` passed (`108` tests).
  - `npm -w apps/web run build` passed and reseeded `claimboundary` to `c50f1d795...`.
  - `git diff --check` passed.
- Restarted/reseeded runtime and submitted one exact canary only:
  - job `5855f86b6b924c8fb4017ec2bd0e2d31`;
  - commit under test `eda022fcd30db7e3f1323a69719fa674e9f6c7dc`;
  - prompt hash `c50f1d795cd5887493736c3015fe3bae01728a7cd2828156ac1d5ae1351526b1`;
  - result `UNVERIFIED` 50/0.

## Decisions

- Stop rule fired. The canary failed the corrected true-side band.
- Keep `eda022fc` as a static generic contract, but quarantine its live-quality claim. The run did not exercise Stage 4 threshold calibration because no direct supportive or contradicting Stage 2 evidence survived into the verdict.
- Do not spend another live job before a no-edit trace comparison localizes the new upstream failure.

## Warnings

- Remaining live-job budget from the latest allocation is 3.
- The latest canary reached verdict with 7 neutral evidence items, 0 support, 0 contradiction, 2 sources, and warning `insufficient_evidence`: "Claim AC_01 has no non-seeded Stage 2 evidence after provider search."
- Search providers were `Serper (cached), Serper, Wikipedia, Serper, Google-CSE (circuit-open), Wikipedia`.
- The malformed preliminary numeric query still appears (`mehr als 235` without the thousands magnitude), but the first actionable failure in `5855f86b...` is route acquisition/admission: the source-native 2025 aggregate route did not survive as non-seeded directional evidence.

## Learnings

- A prompt-only Stage 4 calibration fix can be statically sound but untestable when upstream acquisition/admission starves the verdict stage of direct evidence.
- The active asylum lane has shifted again: the next trace comparison should ask why `f079c5b...` admitted the 2025 SEM aggregate as support while `5855f86b...` kept only neutral preliminary/component evidence.

## For next agent

1. Do not run another live job until a reviewed, no-edit trace comparison is done.
2. Compare `5855f86b6b924c8fb4017ec2bd0e2d31` against `f079c5b6c5f84aa0941aafcff1b734a5` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`.
3. Localize where the 2025 official aggregate route disappears: query generation, relevance selection, fetch/extraction, seeded-vs-non-seeded evidence admission, or Gate 4 non-seeded evidence policy.
4. Keep the next fix generic and LLM-mediated. Do not add asylum/SEM-specific query terms, deterministic source recognition, or another verdict-stage guard.

## Debt-Guard Result

- Classification: incomplete-existing-mechanism plus failed-attempt recovery.
- Chosen option: amend the existing Stage 4 prompt contract; after live failure, keep statically but quarantine live-quality claim.
- Rejected path and why: no code clamp, no family-specific search text, no deterministic threshold heuristic, and no broad query expansion because those would increase mechanisms or violate generic prompt rules.
- What was removed/simplified: nothing; no new mechanism was introduced.
- What was added: two generic prompt bullets and one static prompt-contract test.
- Net mechanism count: unchanged.
- Budget reconciliation: touched only expected files before docs; no helpers, branches, flags, fallbacks, or compatibility paths appeared.
- Verification: focused prompt test, web build/reseed, diff check, then one live canary.
- Debt accepted and removal trigger: live-quality claim for `eda022fc` is quarantined until a canary actually reaches Stage 4 with direct supportive evidence and lands inside band.
- Residual debt: upstream route acquisition/admission instability under current Serper-primary runtime remains open.

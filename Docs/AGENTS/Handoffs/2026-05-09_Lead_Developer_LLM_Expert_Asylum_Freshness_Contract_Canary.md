---
roles: [Lead Developer, LLM Expert]
topics: [report-review, asylum-235000-de, freshnessRequirement, evidence-direction, verdict-calibration, stop-rule]
files_touched:
  - apps/web/src/lib/analyzer/research-extraction-stage.ts
  - apps/web/prompts/claimboundary.prompt.md
  - apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts
  - apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts
  - Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Lead Developer + LLM Expert Handoff

## Task

Continue the current report-improvement plan after the debate verdict `MODIFY`: localize the fresh `asylum-235000-de` failure without piling up changes, implement only a narrow generic fix if the first divergence supports it, then spend exactly one live canary.

## Done

- Loaded `/debt-guard` and classified prior attempts:
  - kept the PT ACS fix `1b5a8045` as validated and unrelated to the current failure;
  - kept the broad first-pass query expansion reverted (`090a25c1` remains rejected after prior cross-family regression);
  - kept the Stage 2 applicability-direction contract from `cdfe3a6b` as a static rule but quarantined its live-quality claim.
- Compared failed current job `0ea1066324f141f2ad6a81c53cf9a3ca` against best local exact comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed exact comparator `6a60b3eb0df540c0b16228d9367b1366`.
- Identified the first trace-backed divergence:
  - the failed job treated stale/narrow values as direct contradictions, especially end-2024 SEM `226 706` against a `current_snapshot` claim;
  - `EXTRACT_EVIDENCE` did not expose `freshnessRequirement` in its input block;
  - `assessEvidenceApplicability(...)` omitted `freshnessRequirement` from the claims JSON, even though `APPLICABILITY_ASSESSMENT` already had the current-snapshot stale-endpoint rule.
- Implemented commit `2258d99a fix(stage2): expose freshness contract to evidence direction`:
  - `extractResearchEvidence(...)` now passes target and all-claims `freshnessRequirement`;
  - `assessEvidenceApplicability(...)` now includes per-claim `freshnessRequirement`;
  - `EXTRACT_EVIDENCE` now displays Current Date / Freshness Requirement and mirrors the generic stale-endpoint direction rule.
- Verification before live job:
  - `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts` passed (173 tests).
  - `npm -w apps/web run build` passed; postbuild reseeded `claimboundary` to `e88cac5b6617...`.
  - `git diff --check` passed.
- Restarted/reseeded runtime and submitted one canary only:
  - job `f079c5b6c5f84aa0941aafcff1b734a5`;
  - commit under test `2258d99aa6bfa07587bfafc02f43e11f6ba1a0a6`;
  - prompt hash `e88cac5b6617df07e92e188d951cff2cabc4475e76f86f44920f6d99698ba2bf`;
  - result `TRUE` 93/82.

## Decisions

- Stop rule fired. The result is true-side but outside the corrected Captain band (`58-75` truth, `40-70` confidence).
- Keep the metadata exposure and stale-endpoint direction correction as structurally justified: the canary now finds the current official 2025 total and no longer lets 2023/2024 endpoints dominate as contradictions.
- Quarantine the live-quality claim for `2258d99a`: it is not an accepted report-quality fix because it overcalibrates the family.
- Do not stack another prompt/code change in this turn. The next hypothesis should be debated/reviewed separately as Stage 4 calibration / near-threshold weighting, not another Stage 2 acquisition or query-breadth change.

## Warnings

- Remaining live-job budget from the latest allocation is 4.
- The canary still has a malformed preliminary numeric query (`mehr als 235` without the thousands magnitude), but this was not the post-fix first failure because the run acquired the decisive 2025 SEM source anyway.
- The current source tree has docs changes recording the failed live gate after the `2258d99a` code commit. Commit those docs before continuing if clean provenance is needed.

## Learnings

- Exposing existing structured freshness metadata to LLM stages can fix a direction failure without adding deterministic semantic rules, but it can reveal a downstream calibration problem.
- For near-threshold current-stock claims, zero contradiction evidence plus one official source family can cause overconfident `TRUE` unless Stage 4 explicitly treats narrow exceedance, currentness lag, and source concentration as confidence/truth calibration factors.

## For next agent

1. Do not submit another live job until a new reviewed hypothesis exists.
2. Start from `f079c5b6c5f84aa0941aafcff1b734a5` and compare it to deployed comparator `6a60b3eb0df540c0b16228d9367b1366`.
3. Focus on Stage 4 verdict calibration / near-threshold weighting. Avoid broad query expansion, family-specific terms, deterministic date heuristics, or reintroducing `directionBasis` as a behavioral lock.

# 2026-04-27 - Senior Developer - UNVERIFIED Ambiguity Discipline

## Summary

Codified the stronger review rule requested by Captain: every `UNVERIFIED` job is suspicious by default and may only be accepted as genuine evidence scarcity after documented deep research exhausts accessible material evidence and source acquisition appears healthy.

Added a runtime Stage 5 guard so an article-level `UNVERIFIED` no longer passes quality gates when the run did not complete the required research path.

## Files changed

- `AGENTS.md`
- `.claude/skills/pipeline/SKILL.md`
- `.claude/skills/report-review/SKILL.md`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/test/unit/lib/analyzer/aggregation-stage-unverified-gate.test.ts`
- `apps/web/test/unit/lib/analyzer/warning-display.test.ts`

## Decision

Small-team debate initially converged on staged escalation. Captain then clarified the stricter requirement: `UNVERIFIED` should always be suspicious. The workflow was tightened accordingly:

- exact requested job inspection remains first
- same-input local history is required when available, including prepared and selected `AtomicClaim` comparison
- external web research is required for every `UNVERIFIED` review
- `analytical-reality` is allowed only after documented evidence exhaustion and healthy acquisition
- otherwise classify as `factharbor-miss`, `mixed`, or `inconclusive`
- no live LLM reruns without Live Job Submission Discipline

Runtime decision:

- New warning type: `unverified_research_incomplete`.
- Stage 5 now sets `qualityGates.passed = false` when the final article verdict is `UNVERIFIED` and the run has blocking research warnings (`budget_exceeded`, `query_budget_exhausted`, `no_successful_sources`, `source_acquisition_collapse`, `report_damaged`, `analysis_generation_failed`) or a reserved contradiction pass that never ran.
- The guard is structural only. It does not use domain keywords, does not reinterpret evidence, and does not change the truth scale.

Debate review amendment:

- Feynman (Advocate), Pascal (Challenger), and Tesla (Reconciler) reviewed the skill/workflow changes.
- Verdict: `MODIFY`.
- Kept Captain's strong rule that `UNVERIFIED` is always suspicious until reviewed.
- Clarified that suspicious means unresolved for review purposes, not automatic FactHarbor failure.
- Added bounded external evidence-check wording, stop conditions, and an explicit no-automatic-rerun guard.
- Kept same-input prepared/selected `AtomicClaim` comparison as mandatory when local history exists.

## Current job assessment

Job: `b8def4575c0749288a76c138838934d9`

Input: `https://www.svp.ch/wp-content/uploads/260324_Argumentarium-ohne-Q-A-DE.pdf`

Classification: `mixed`, leaning `factharbor-miss` for the overall `UNVERIFIED` outcome.

Evidence:

- Same-input history is unstable: previous exact-input jobs produced `MIXED`, `LEANING-FALSE`, and `UNVERIFIED`.
- Same-input claim targets are unstable too: exact-input jobs prepared 18, 34, 38, and 50 claims in different runs and selected different five-claim subsets.
- The current job has suspicious local signals: `budget_exceeded`, zero contradiction iterations, zero contradiction sources found, skewed evidence balance, and a verdict-integrity downgrade on `AC_12`.
- External web research found accessible primary or near-primary evidence for major subclaims: SEM asylum statistics, BFS/PKS crime statistics, SECO FZA reports, SKOS/BFS social-assistance statistics, and PVK/parliamentary material on population forecasts.
- The narrow `AC_12` multipliers may still require explicit reconstruction from PKS population and suspect data; that is not enough to accept the whole report's `UNVERIFIED` outcome as evidence scarcity.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer/aggregation-stage-unverified-gate.test.ts test/unit/lib/analyzer/warning-display.test.ts`
- `npm -w apps/web exec tsc --noEmit`
- `npm -w apps/web run build`
- `git diff --check`
- `npm test` was attempted; after the aggregation compatibility fix, the remaining failures were unrelated runner integration timeouts. The timed-out runner files passed when rerun in isolation: `drain-runner-pause.integration.test.ts` and `runner-concurrency-split.integration.test.ts`.
- Debate-review doc wording was checked with `git diff --check`.

## Warnings

This does not reclassify old stored jobs; job `b8def4575c0749288a76c138838934d9` will keep its stored result until rerun. New jobs with the same structural failure should surface `unverified_research_incomplete` and fail the quality gate.

No live rerun was submitted because source/workflow state was dirty and Live Job Submission Discipline requires commit and runtime refresh before live verification.

The exact-input history also shows Stage 1/claim-selection instability: prepared claim counts and selected five-claim subsets differ across runs. The Stage 5 guard prevents a false-passed `UNVERIFIED`, but a separate Stage 1/selection stability fix is still open.

## Learnings

`UNVERIFIED` should not be treated as a neutral endpoint. In report review and pipeline debugging, it is a hypothesis requiring disproof by same-input history and external evidence search before it can be accepted as analytical reality.

## Debt Guard

Classification: incomplete-existing-mechanism. Chosen option: amend the existing Stage 5 quality-gate path so incomplete research cannot publish as acceptable `UNVERIFIED`. Rejected paths: changing the truth-scale mapping, adding domain-specific retrieval rules, or changing Stage 1 extraction in the same patch. Failed-validation recovery: the first full-suite run exposed that legacy partial test states can omit `warnings`; the patch was kept and amended to tolerate partial state shapes. What was added: one structural warning type, one Stage 5 guard helper, and focused tests. Net mechanism count: unchanged in concept; the existing quality gate now enforces the missing condition.

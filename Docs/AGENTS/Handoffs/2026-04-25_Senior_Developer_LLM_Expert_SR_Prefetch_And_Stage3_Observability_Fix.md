# 2026-04-25 - SR Prefetch And Stage 3 Observability Fix

## Roles
- Senior Developer
- LLM Expert

## Skills Used
- report-review
- prompt-diagnosis
- pipeline
- debug
- debate

## Context
Captain asked to continue investigating report degradation, unverified recent jobs, failed preparations, log errors, and unnecessary delays while monitoring live jobs and using helper agents/debate where useful.

Primary recent issue cluster:
- `af9beb6e97b74ba8b7dffd70d64841ef`
- `c1be8585ca434fa6bfc66f310d883d0b`
- `e55ebae59e924cdf9a961ad08a182384`
- `04d7c59c4d7f45428fa3525d25f1e089`
- live monitored delay job `d18a9099d7eb423492047220913a1bd4`

## Debate / Review Outcome
Two read-only helper agents reviewed the evidence independently:

- Report-review / prompt-diagnosis reviewer confirmed the `235000` unverified jobs collapsed mainly through AC_02 citation-integrity failures: comparator evidence was being classified/admitted as neutral or contextual, then stripped by citation sanitation. Existing commits `338218cd` and `672693e0` target the correct layer: comparator guidance, reconciliation evidence input, evidence-profile propagation, and full source inventory preservation.
- Challenger review confirmed a separate latency root cause: SR prefetch evaluated all fetched source domains, not just evidence-linked domains, with weak live-evaluation caps and budget guards. Stage 3 also had inadequate observability: scope normalization and clustering timing were not sufficiently visible in events/metrics.

The consolidated decision was:
- Do not add more prompt changes before a clean post-fix validation run.
- Fix SR over-prefetch and budget enforcement structurally.
- Add Stage 3 observability and LLM-call accounting.
- Defer boundary-clustering prompt/schema slimming until repeated post-observability evidence shows it is necessary.

## Root Causes
1. `235000` unverified reports were caused by pre-fix comparator evidence handling and citation-integrity downgrade, not by a single new deterministic code bug in this patch.
2. Unnecessary delays were confirmed in live monitoring:
   - `d18a...` spent about two minutes in source reliability prefetch.
   - `d18a...` spent about four minutes in Stage 3 clustering after the clustering LLM call.
3. SR prefetch used `state.sources` wholesale, so fetched-but-unused domains could trigger live SR evaluation.
4. SR live evaluation had per-domain timeout settings but no analysis-run live-evaluation cap/budget.
5. SR evaluator skipped evidence-quality assessment under tight budget but could still start primary/refinement work without checking remaining budget.
6. Stage 3 undercounted and underreported scope-normalization work, especially when no merge occurred.

## Fixes Landed
- SR prefetch now uses evidence-linked URLs from extracted evidence, not every fetched source.
- SR UCM/default config now includes:
  - `maxLiveEvaluationsPerRun`
  - `runtimeBudgetMs`
  - `minLiveEvaluationBudgetMs`
  - `minPrimaryRemainingBudgetMs`
  - `minRefinementRemainingBudgetMs`
- SR live prefetch now reports skipped-by-limit and skipped-by-budget counts and applies caps across direct and root-fallback evaluations.
- SR evaluator now returns a transient non-cacheable fallback when primary cannot safely start under the remaining per-domain budget.
- SR evaluator now skips refinement when remaining budget is below the configured guard.
- `/api/internal/evaluate-source` `maxDuration` was aligned with the request schema's 300s maximum.
- Stage 3 now emits scope-normalization start/LLM/completion events and records the scope-normalization LLM call even when no merge occurs.

## Validation
- `npm -w apps/web test -- test/unit/lib/analyzer/source-reliability-subdomain.test.ts test/unit/lib/analyzer/research-orchestrator.test.ts test/unit/lib/source-reliability/sr-eval-engine.test.ts test/unit/lib/config-drift.test.ts test/unit/lib/config-schemas.test.ts test/unit/lib/scope-normalization.test.ts`
  - Passed: 114 tests.
- `npm -w apps/web run build`
  - Passed.
- `npm test`
  - First full run had one timeout in `runner-concurrency-split.integration.test.ts`.
  - Isolated rerun of that file passed.
  - Second full safe run passed.

## Remaining Work
- Restart/reseed after commit so live jobs use the updated code/config.
- Submit one clean rerun for the exact Captain-defined input:
  `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
- Monitor AC_02 specifically for direct comparator evidence, directional citations, and absence of `verdict_citation_integrity_guard`.
- Persist job-level prompt/config provenance more consistently in the Jobs table; current JSON metadata has hashes, but DB summary fields have been missing in some inspected jobs.
- Consider Stage 3 prompt/schema slimming only if new metrics show repeated clustering schema failures or unacceptable duration after this observability patch.

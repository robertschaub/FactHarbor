### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Implementation

**Task:** Implement the lowest-risk subset of the generic retrieval-improvement design: add bounded Stage 2 primary-source refinement without domain-specific hardcoding.

**Files touched:**
- apps/web/src/lib/analyzer/research-query-stage.ts
- apps/web/src/lib/analyzer/research-orchestrator.ts
- apps/web/src/lib/web-search.ts
- apps/web/src/lib/search-cache.ts
- apps/web/src/lib/config-schemas.ts
- apps/web/configs/pipeline.default.json
- apps/web/prompts/claimboundary.prompt.md
- apps/web/test/unit/lib/search-cache.test.ts
- apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts

**Done:**
- Added structured Stage 2 query metadata in `GeneratedResearchQuery` so query generation can return `retrievalLane` and `freshnessWindow`, including fallback-path support and a new `refinement` iteration mode in `apps/web/src/lib/analyzer/research-query-stage.ts:26`.
- Added a bounded first-iteration refinement branch that reuses existing per-claim query budgets, prioritizes direct/navigational lanes, and does not let seeded evidence satisfy direct-primary coverage in `apps/web/src/lib/analyzer/research-orchestrator.ts:140` and `apps/web/src/lib/analyzer/research-orchestrator.ts:1209`.
- Threaded per-query freshness control through search options and cache enforcement so freshness-sensitive refinement queries can bypass stale-but-still-valid cache entries in `apps/web/src/lib/web-search.ts:27` and `apps/web/src/lib/search-cache.ts:172`.
- Added UCM/default config knobs for the slice in `apps/web/src/lib/config-schemas.ts:595` and `apps/web/configs/pipeline.default.json:118`.
- Updated the `GENERATE_QUERIES` prompt contract to emit lane/freshness metadata and define `refinement` behavior in `apps/web/prompts/claimboundary.prompt.md:630`.
- Added targeted tests for freshness-aware cache misses and the one-time refinement control flow in `apps/web/test/unit/lib/search-cache.test.ts:180` and `apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts:112`.
- Verified with `npm -w apps/web test -- test/unit/lib/search-cache.test.ts test/unit/lib/analyzer/primary-source-refinement.test.ts test/unit/lib/config-drift.test.ts test/unit/lib/config-schemas.test.ts` and `npm -w apps/web run build`.

**Key decisions:**
- Kept the change inside existing Stage 2 flow instead of implementing the full design handoff. This limits risk and avoids broader claim-schema or coverage-assessor churn.
- Triggered refinement only on first-pass `main` iterations, only when the claim expects metrics and has candidate primary source types, and only when existing matching evidence is seeded-only or absent.
- Reused LLM-generated structure for routing (`retrievalLane`, `freshnessWindow`) instead of introducing deterministic keyword/domain heuristics.
- Used a freshness-aware cache TTL override rather than a separate cache namespace, minimizing plumbing while still avoiding stale cached search results for freshness-sensitive queries.

**Open items:**
- This slice does not implement the full generic coverage-assessor described in the design handoff.
- Candidate primary-source types are currently bounded to a conservative allowlist of existing `sourceType` values; broader source families may still need a later generic refinement pass.
- No new user-facing warning or telemetry category was added for refinement-triggered recovery.

**Warnings:**
- The refinement trigger is intentionally narrow. It should improve the specific failure mode around metric-bearing direct evidence, but it is not a general retrieval-quality fix.
- The current logic depends on Stage 1/claim-understanding emitting useful `expectedMetrics` and `expectedSourceTypes`. If those are weak, refinement will not trigger.
- Full build caught a TypeScript literal-widening issue in fallback query generation that file-level diagnostics did not surface; future query-shape edits should always be validated with a web build.

**For next agent:**
- Start from the low-risk slice now landed in Stage 2, not the full earlier design. The key seams are `GeneratedResearchQuery` metadata in `research-query-stage.ts`, the first-iteration refinement block in `research-orchestrator.ts`, and cache freshness enforcement in `search-cache.ts`.
- If measured outcomes on target claims are still weak, the next safe expansion is better generic coverage assessment and telemetry, not domain-specific query heuristics.

**Learnings:**
- Yes. Stored repo memory note: full Next build can catch TypeScript literal widening in query fallback arrays that `get_errors` may miss after query-shape changes.

**Next:**
1. Run a measured regression on the approved target claim family to see whether direct primary evidence enters the source pool more often.
2. If needed, expand the refinement trigger generically by improving source-type expectation quality or adding a broader but still LLM-driven coverage assessment.
3. Consider lightweight telemetry for refinement usage and success rate before attempting larger retrieval-architecture changes.

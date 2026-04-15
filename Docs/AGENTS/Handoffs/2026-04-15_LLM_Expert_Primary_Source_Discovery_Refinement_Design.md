### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Primary-Source Discovery Refinement Design

**Task:** Turn the generic retrieval recommendations from the recent evidence-gap investigation into a concrete implementation design for the ClaimAssessmentBoundary retrieval pipeline, without introducing domain-specific logic.

**Files touched:** `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Primary_Source_Discovery_Refinement_Design.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Keep the fix inside the existing Stage 1 -> Stage 2 architecture rather than creating a parallel retrieval subsystem. All meaning-sensitive decisions remain LLM-mediated: whether a claim requires direct primary evidence, whether current coverage is still missing a decisive source, and how refinement queries should be phrased. Deterministic code should only handle orchestration, budgets, cache policy, telemetry, and warning emission. Reuse existing structures where possible: `AtomicClaim.expectedEvidenceProfile`, `EvidenceItem.isSeeded`, the `runResearchIteration(...)` control loop, the supplementary-lane pattern, and the existing provider/cache stack in `web-search.ts` and `search-cache.ts`.

**Open items:** (1) Decide whether retrieval intent should be added to `AtomicClaim` during Pass 2 or emitted by a dedicated post-Pass-2 LLM call; Pass 2 extension is lower-latency, a dedicated call is lower-risk for prompt churn. (2) Decide whether the refinement lane should run before or after the supplementary English lane; the cleaner default is before supplementary EN, because source-discovery gaps are more fundamental than cross-language expansion. (3) Confirm warning policy and UI treatment for a final "required primary source still missing" outcome. (4) If implemented, prompt changes must be reseeded into UCM after code changes.

**Warnings:** This design changes prompts, schemas, telemetry, and warning surfaces together; shipping only one slice will produce misleading diagnostics. Do not implement this with host allowlists, keyword lists, metric-name regexes, or claim-family special cases. Do not let seeded preliminary evidence count as satisfying a direct-primary-source objective, or old/noisy seeded evidence will suppress the refinement lane. Any final warning added for missing direct primary evidence must also be registered in `warning-display.ts` and evaluated against the report-quality severity rules in `AGENTS.md`.

**For next agent:** Start from the empirical investigation in `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md`, then implement this design in the following order: `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-query-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts` or a new adjacent coverage helper module, `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-cache.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/prompts/claimboundary.prompt.md`, and the warning registration surface. The highest-value implementation target is a bounded refinement lane that can discover direct primary sources when the first-pass retrieval pool is dominated by secondary coverage, stale ranking, or navigational misses.

**Learnings:** yes — generic retrieval remediations in FactHarbor should be framed as reusable capabilities (primary-source discovery, freshness-sensitive cache policy, bounded refinement, regression patterns), not source-host or claim-family logic.

## Design

### 1. Problem framing

Current Stage 2 behavior is good at broad topical retrieval but weak at direct-primary-source discovery when all of the following hold at once:

1. The claim implicitly expects a current total, direct official statement, or source-native metric.
2. The first-pass search results are dominated by secondary reporting, press releases, generic landing pages, or older annual documents.
3. The query budget is narrow (`researchMaxQueriesPerIteration`, `maxSourcesPerIteration`, `relevanceTopNFetch`).
4. Cached rankings preserve older provider orderings for repeated current-statistics searches.
5. Stage 1 preliminary evidence seeds older/noisier material into the pool before targeted Stage 2 retrieval finishes.

The missing capability is not "special handling for a website." It is a generic ability to recognize that a claim still lacks a direct primary source and then spend a small, bounded amount of budget on source-discovery refinement.

### 2. Proposed architecture change

Add a new generic Stage 2 capability called `primary-source discovery refinement`.

It has four parts:

1. `retrieval intent`: a small structured contract carried on each `AtomicClaim` telling Stage 2 whether direct primary evidence is required/preferred and how freshness-sensitive the claim is.
2. `query lanes`: Stage 2 query generation emits not just text queries, but also a lane/goal/freshness policy for each query.
3. `coverage assessment`: after the first pass of search/fetch/extraction for a claim, an LLM checks whether the retrieved pool still lacks the direct primary source or metric slot implied by the claim’s evidence profile.
4. `bounded refinement lane`: when coverage is still insufficient, Stage 2 runs one extra, budget-capped refinement pass focused on discovering the missing direct primary source rather than widening general topical coverage.

This should remain a refinement of `runResearchIteration(...)`, not a new top-level stage.

### 3. Data model additions

Add a minimal retrieval contract to `AtomicClaim` in `types.ts` and Pass 2 schemas in `claim-extraction-stage.ts`.

Recommended shape:

```ts
retrievalIntent?: {
  primarySourcePriority: "required" | "preferred" | "normal";
  freshnessSensitivity: "high" | "medium" | "low";
}
```

Rationale:

1. `expectedEvidenceProfile.expectedMetrics` and `expectedSourceTypes` already exist and should remain the main prompt-facing semantic detail.
2. The new fields stay structural and enum-based; they do not introduce hardcoded keywords.
3. `primarySourcePriority` controls whether a missing direct primary source is merely informative or should trigger the refinement lane and possibly a final warning.
4. `freshnessSensitivity` lets search and cache policy react without deterministic semantics in code.

Do not add free-text retrieval hints to code-side contracts unless they are only prompt/search payloads. If more text guidance is needed, keep it inside prompt sections or generated query strings.

### 4. Query generation change

Extend `GenerateQueriesOutputSchema` in `research-query-stage.ts` so each generated query carries structured search policy.

Recommended shape:

```ts
{
  query: string;
  rationale: string;
  variantType?: "supporting" | "refuting";
  retrievalLane: "primary_direct" | "navigational" | "secondary_context";
  freshnessWindow?: "none" | "w" | "m" | "y";
}
```

Implementation notes:

1. `primary_direct` aims at the decisive source itself.
2. `navigational` aims at archive, overview, publisher navigation, or source-native entry points when the direct document is not likely to surface in top results.
3. `secondary_context` is the existing broad topical lane.
4. `freshnessWindow` maps directly to existing provider support via `dateRestrict` in `web-search.ts`, `search-google-cse.ts`, and `search-serper.ts`.
5. Keep the same LLM call count: this is a schema/prompt enrichment of the existing `GENERATE_QUERIES` section, not a new standalone query-planning stage.

Execution rule in `runResearchIteration(...)`:

1. Prioritize `primary_direct` and `navigational` queries before `secondary_context` when `primarySourcePriority !== "normal"`.
2. Still respect `remainingQueryBudget` and the existing contradiction reservation logic.
3. Record the lane and freshness window onto `SearchQuery` telemetry.

### 5. Coverage assessment

Add one new batched LLM helper after the first search/fetch/extraction pass for a claim, before the iteration fully concludes.

Recommended output:

```ts
{
  directPrimaryCovered: boolean;
  needsRefinement: boolean;
  missingSlot: "direct_primary_metric" | "direct_primary_statement" | "fresher_primary_source" | "none";
  reasoning: string;
}
```

Inputs should include:

1. `claim.statement`
2. `claim.retrievalIntent`
3. `claim.expectedEvidenceProfile`
4. titles/URLs/snippets of relevant search results already seen
5. fetched source titles/URLs
6. extracted evidence summaries with `sourceType`, `claimDirection`, `isSeeded`, and minimal scope metadata

Why this must be LLM-based:

1. Deciding whether the current pool already satisfies a direct-primary-source need is a meaning judgment.
2. Determining whether a source is only a secondary summary, a navigational page, or the decisive primary artifact is also meaning-sensitive.
3. The architecture rules explicitly prohibit replacing that with keyword heuristics or host-specific logic.

Placement:

1. Add the helper in `research-extraction-stage.ts` or a small adjacent module under `src/lib/analyzer/`.
2. Call it from `runResearchIteration(...)` after evidence extraction/admission for the initial batch, so it can inspect both search-result metadata and admitted evidence.
3. Exclude `isSeeded` preliminary evidence from satisfying `directPrimaryCovered`; seeded evidence may inform search, but it must not suppress refinement.

### 6. Bounded refinement lane

Add a new optional sub-lane inside `runResearchIteration(...)` called after the first-pass coverage assessment and before the iteration finishes.

Behavior:

1. Trigger only when all of the following are true:
2. `claim.retrievalIntent.primarySourcePriority` is `required` or `preferred`
3. coverage assessment returns `needsRefinement: true`
4. the claim still has remaining Stage 2 query budget
5. the iteration has not already run a refinement sub-pass

Recommended configuration additions in `config-schemas.ts` and `pipeline.default.json`:

```ts
primarySourceRefinementEnabled?: boolean;    // default true
primarySourceRefinementMaxQueries?: number;  // default 1
freshQueryCacheTtlDays?: number;             // default 1
```

Implementation shape:

1. Reuse `generateResearchQueries(...)` with a new iteration type such as `refinement`, or add a small wrapper that calls the same prompt section with a `coverageGap` payload.
2. Generate at most `primarySourceRefinementMaxQueries` additional queries.
3. Prefer `primary_direct` or `navigational` lane outputs only.
4. Use a stricter cache TTL override and pass through any `freshnessWindow` as `dateRestrict`.
5. Feed the refinement results back through the exact same relevance -> fetch -> extract -> cap -> reconcile flow already used by the main path.

This makes the design low-risk: refinement is not a bespoke fetch routine, just a bounded second chance routed through the existing pipeline.

### 7. Search/cache policy change

The provider layer already supports `dateRestrict`; the missing piece is per-query freshness policy.

Add optional fields on `WebSearchOptions`:

```ts
dateRestrict?: "y" | "m" | "w";
cacheTtlDaysOverride?: number;
```

Then update `searchWebWithProvider(...)` and `search-cache.ts` so reads can use a tighter TTL on freshness-sensitive queries without changing the global cache default.

Rules:

1. Default behavior remains unchanged for normal queries.
2. Queries marked fresh/current by the LLM may use `cacheTtlDaysOverride = freshQueryCacheTtlDays`.
3. A refreshed result can still overwrite the same cache key; no separate cache subsystem is needed.
4. Do not bypass cache through claim-family heuristics. The override must come from structured LLM-derived retrieval intent / query policy.

### 8. Stage 1 preliminary-search interaction

Keep Stage 1 preliminary search, but tighten how later logic interprets it.

Rules:

1. `isSeeded` evidence continues to help early understanding and can still count toward general evidence sufficiency as today.
2. `isSeeded` evidence must not satisfy the `directPrimaryCovered` check for refinement suppression.
3. If the refinement lane eventually finds a non-seeded direct primary source, that source should dominate later retrieval coverage and warning logic.

This avoids the current failure mode where old preliminary evidence creates the appearance of coverage before Stage 2 has actually found the decisive source.

### 9. Telemetry and warnings

Extend telemetry so the behavior is measurable.

Recommended additions:

1. `SearchQuery`: `queryLane`, `freshnessWindow`, `cacheTtlDaysApplied`
2. `ClaimAcquisitionIterationEntry`: `retrievalCoverageStatus`, `refinementTriggered`, `refinementQueriesUsed`
3. final result JSON: claim-level and report-level retrieval coverage summary for debugging and regression analysis

Add one new warning type if implementation confirms it is needed:

1. `missing_required_primary_source`

Recommended severity:

1. `warning` when a claim marked `primarySourcePriority = required` completes Stage 2 without any non-seeded direct primary source covering the expected direct metric/statement slot.
2. This is user-visible because it can materially change verdict quality.
3. Register it in `types.ts` and `warning-display.ts` rather than classifying it inline.

### 10. Concrete file plan

1. `apps/web/src/lib/analyzer/types.ts`
   Add `retrievalIntent` to `AtomicClaim`; extend `SearchQuery` and `ClaimAcquisitionIterationEntry` telemetry.
2. `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
   Extend Pass 2 schema and prompt rendering inputs/outputs to populate `retrievalIntent`.
3. `apps/web/src/lib/analyzer/research-query-stage.ts`
   Extend query schema/output with `retrievalLane` and `freshnessWindow`.
4. `apps/web/src/lib/analyzer/research-extraction-stage.ts`
   Add the LLM-based retrieval coverage assessor, or add a new adjacent helper module if that keeps the file cleaner.
5. `apps/web/src/lib/analyzer/research-orchestrator.ts`
   Insert the coverage assessment + bounded refinement lane inside `runResearchIteration(...)`; exclude seeded evidence from direct-primary coverage satisfaction.
6. `apps/web/src/lib/web-search.ts`
   Thread query freshness policy into provider calls and cache reads.
7. `apps/web/src/lib/search-cache.ts`
   Support per-request TTL override.
8. `apps/web/src/lib/config-schemas.ts`
   Add UCM-backed knobs for refinement enablement, refinement budget, and fresh-query cache TTL.
9. `apps/web/configs/pipeline.default.json`
   Mirror the new defaults; keep JSON/TS schema in sync.
10. `apps/web/prompts/claimboundary.prompt.md`
    Extend `GENERATE_QUERIES`; add a new retrieval-coverage assessment section if needed.
11. Warning registration surface
    Add the new warning only if the implementation emits it.

### 11. Validation plan

Use mocked or synthetic tests for most of this. Do not require live domain-specific regression runs just to validate plumbing.

Recommended tests:

1. Unit: `research-query-stage` parses enriched query outputs with lane/freshness metadata.
2. Unit: `web-search` + `search-cache` honor `cacheTtlDaysOverride`.
3. Unit: seeded evidence does not satisfy direct-primary coverage.
4. Unit: refinement lane triggers once, respects query budget, and records telemetry.
5. Integration (mocked search results): first pass returns only secondary coverage and old sources; refinement pass returns a direct primary source; final coverage flips to satisfied.
6. Integration (negative): claims with `primarySourcePriority = normal` do not trigger refinement or warnings.

### 12. Recommended implementation order

1. Add the schema/config/telemetry surface first.
2. Extend query generation next.
3. Add cache override support.
4. Add the coverage assessor.
5. Wire the bounded refinement lane.
6. Add warnings only after the coverage signal is stable.
7. Validate with mocked tests before any live reruns.

This sequencing keeps the changes reviewable and avoids shipping a partially instrumented refinement feature that cannot explain its own behavior.

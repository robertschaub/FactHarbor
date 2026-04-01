---
### 2026-04-01 | LLM Expert | Codex (GPT-5) | Developer Checklist for Approved Multilingual Output/Search Work
**Task:** Convert the approved multilingual output/search architecture into a developer-ready implementation checklist by file and phase.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Developer_Checklist.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The checklist follows approved Proposal 2 only. It treats `LanguageIntent` as explicit pipeline state, makes `reportLanguage` a cross-stage contract, preserves source-authored evidence in original language, restricts English retrieval to coverage expansion only, and keeps UI/chrome localization out of scope.
**Open items:** The only unresolved process question is whether a prompt-only interim pilot is allowed before the full stateful implementation. The approved target architecture itself is no longer open.
**Warnings:** Do not translate source-derived evidence text. Do not implement English supplementation as a balancing or contrarian proxy. Do not widen scope into report/page/export localization.
**For next agent:** Start with this checklist, then cross-check the approved architecture in `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md` and `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md`.
**Learnings:** no

## Objective
Implement approved Proposal 2:

1. report-authored analytical output follows the input language
2. source-authored evidence remains in original language
3. Stage 2 supports original-language-first retrieval plus optional English coverage expansion
4. UI/chrome/export localization remains out of scope

## Hard Constraints
- `LanguageIntent` must be explicit pipeline state.
- `reportLanguage` must be strongly typed and cross-stage.
- Stage 4 and Stage 5 prompt paths must receive `reportLanguage` explicitly.
- Source-authored text must not be translated dynamically.
- English supplementation must be coverage-expansion only.
- Full UI/chrome localization must not be added in this patch.

## Recommended Implementation Order
1. Types and state
2. Stage 1 -> state population
3. Stage 2 retrieval lanes
4. Stage 4 report-language threading
5. Stage 5 narrative and fallbacks
6. Metrics/cache/test updates

## File-by-File Checklist

### 1. `apps/web/src/lib/analyzer/types.ts`
Add the core schema changes first.

Target interfaces:
- `SearchQuery`
- `CBClaimUnderstanding`
- `CBResearchState`

Add:
- `LanguageIntent` interface
- strongly typed `reportLanguage`
- ordered `retrievalLanguages`

Recommended minimum shape:

```ts
export interface RetrievalLanguageLane {
  language: string;
  lane: "primary" | "supplementary_en";
  reason?: string;
}

export interface LanguageIntent {
  inputLanguage: string;
  reportLanguage: string;
  retrievalLanguages: RetrievalLanguageLane[];
  sourceLanguagePolicy: "preserve_original";
}
```

Apply to state:
- add `languageIntent?: LanguageIntent` to `CBClaimUnderstanding` if useful for auditability
- add `languageIntent: LanguageIntent | null` to `CBResearchState`

Extend `SearchQuery` so Stage 2 observability can explain lanes:
- `language?: string`
- `languageLane?: "primary" | "supplementary_en"`
- `laneReason?: string`

### 2. `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
Create and attach `LanguageIntent` after Stage 1 understanding is available.

Exact targets:
- state initialization block for `CBResearchState`
- post-Stage-1 path where `state.understanding` becomes available

Checklist:
- initialize `languageIntent: null` in the initial `CBResearchState`
- after Stage 1, derive:
  - `inputLanguage = understanding.detectedLanguage ?? "en"`
  - `reportLanguage = inputLanguage`
  - `retrievalLanguages = [{ language: inputLanguage, lane: "primary" }]`
  - keep supplementary English out until Stage 2 decides it is meaningful
- store the resulting `LanguageIntent` on `state`

### 3. `apps/web/src/lib/analyzer/research-query-stage.ts`
Make query generation lane-aware.

Exact targets:
- `GenerateQueriesOutputSchema`
- `generateResearchQueries(...)`

Checklist:
- extend the query schema to support lane metadata, for example:
  - `language`
  - `languageLane`
  - `reason`
- update `generateResearchQueries(...)` signature to accept `languageIntent` or explicit retrieval lanes rather than only `searchGeo.language`
- keep `detectedLanguage` / geography rendering, but make lane selection explicit in prompt variables
- fallback queries should carry primary-lane metadata instead of returning an untyped `"fallback"` query only
- preserve existing `variantType` behavior; language lane and evidential direction must remain independent

### 4. `apps/web/src/lib/analyzer/research-orchestrator.ts`
Thread retrieval lanes through execution and persist lane observability.

Exact target:
- `runResearchIteration(...)`

Checklist:
- pass `state.languageIntent` into `generateResearchQueries(...)`
- when query generation returns lane-tagged queries, persist that metadata into `state.searchQueries`
- keep current budget behavior intact
- implement supplementary English only as a coverage-expansion lane
- do not infer “opposing” / “contradiction” from language lane

Decision rule to implement:
- primary lane always uses input/original language
- supplementary English lane only appears when the LLM judges English coverage materially useful or native-language evidence is scarce

### 5. `apps/web/src/lib/analyzer/verdict-stage.ts`
Make Stage 4 explicitly report-language aware.

Exact targets:
- `runVerdictStage(...)` orchestration path
- `advocateVerdict(...)`
- `reconcileVerdicts(...)`
- any Stage 4 prompt payload builders that produce persisted analytical prose

Checklist:
- add `reportLanguage` to Stage 4 function signatures where needed
- pass `reportLanguage` into `llmCall(...)` payloads for:
  - `VERDICT_ADVOCATE`
  - `VERDICT_RECONCILIATION`
- review whether `VERDICT_CHALLENGER` needs the variable for consistency, but keep the hard requirement on the prompts that generate persisted report prose
- ensure persisted reasoning fields are authored in `reportLanguage`
- do not translate evidence excerpts or evidence-derived statements

### 6. `apps/web/src/lib/analyzer/aggregation-stage.ts`
Make Stage 5 narrative generation and deterministic fallback honor `reportLanguage`.

Exact targets:
- call site where `generateVerdictNarrative(...)` is invoked
- `generateVerdictNarrative(...)`
- deterministic fallback narrative block

Checklist:
- add `reportLanguage` parameter to `generateVerdictNarrative(...)`
- render `VERDICT_NARRATIVE` with explicit `reportLanguage`
- update deterministic fallback strings so they respect `reportLanguage` where feasible
- if a fallback path cannot be localized in this patch, document that explicitly in code comments or warnings rather than leaving it ambiguous

### 7. `apps/web/prompts/claimboundary.prompt.md`
Update prompt contracts to reflect the new explicit language contract.

Exact sections to update:
- `GENERATE_QUERIES`
- `VERDICT_ADVOCATE`
- `VERDICT_RECONCILIATION`
- `VERDICT_NARRATIVE`

Checklist:
- `GENERATE_QUERIES` should accept explicit retrieval lane intent, not just a loose detected-language hint
- Stage 4 prompts should distinguish:
  - report-authored text -> `reportLanguage`
  - source-authored text -> preserve original language
- `VERDICT_NARRATIVE` should explicitly require output in `reportLanguage`
- do not add English-only heuristics outside prompt-configurable text

### 8. `apps/web/src/lib/web-search.ts`
Only change this if runtime search options need lane metadata outside raw query text.

Checklist:
- decide whether `WebSearchOptions` needs:
  - `language?: string`
  - `languageLane?: string`
- if yes, thread those fields without forcing provider-level locale filtering by default
- keep provider selection behavior independent from evidential direction

Note:
- provider-level language filtering is optional optimization, not the first implementation lever

### 9. `apps/web/src/lib/search-cache.ts`
Make cache identity safe if search behavior now depends on structured lane metadata.

Checklist:
- if `WebSearchOptions` gains language/lane fields, update `generateCacheKey(...)`
- include any new structured search-language dimensions in the cache key
- keep backward compatibility in mind for existing cached rows if tests assume old shape

### 10. `apps/web/src/lib/analyzer/metrics.ts`
Make lane usage observable.

Exact target:
- `SearchQueryMetric`

Checklist:
- add fields such as:
  - `language?: string`
  - `languageLane?: "primary" | "supplementary_en"`
  - `laneReason?: string`
- keep current metrics shape compatible where possible

### 11. `apps/web/src/lib/analyzer/metrics-integration.ts`
Ensure new search-query metadata is recordable without extra workarounds.

Checklist:
- verify `recordSearchQuery(...)` accepts the expanded metric shape
- no architectural change expected, but update types if needed

## Test Checklist

### `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
Update or add tests for:
- `LanguageIntent` initialization on state
- Stage 2 query generation returning lane metadata
- `state.searchQueries` persisting lane metadata
- Stage 5 fallback narrative honoring `reportLanguage`

### `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
Add or update tests for:
- Stage 4 prompt payloads including `reportLanguage`
- persisted reasoning fields following `reportLanguage`
- no source-text translation side effects

### `apps/web/test/unit/lib/analyzer/aggregation.test.ts`
Add or update tests for:
- `generateVerdictNarrative(...)` receiving `reportLanguage`
- deterministic fallback narrative changing with `reportLanguage` if localized

### `apps/web/test/unit/lib/search-cache.test.ts`
Add or update tests for:
- cache key changes when structured language-lane metadata changes

### `apps/web/test/unit/lib/web-search.test.ts`
Add or update tests only if `WebSearchOptions` is expanded.

### `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts`
Review whether new state shapes require schema compatibility assertions or fixture updates.

## Validation Commands
Run only safe verification by default:

```powershell
npm test
npm -w apps/web run build
```

Do not run paid suites unless explicitly approved:
- `npm -w apps/web run test:llm`
- `npm -w apps/web run test:neutrality`
- `npm -w apps/web run test:cb-integration`

## Definition of Done
- `LanguageIntent` exists in pipeline state and is strongly typed.
- `reportLanguage` is threaded through Stage 4 and Stage 5 prompt paths.
- Stage 5 fallback narrative respects `reportLanguage` where feasible.
- Stage 2 can emit and track language lanes.
- English lane is optional and coverage-expansion only.
- Source-authored evidence remains original-language.
- Safe tests and build pass.

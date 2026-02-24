# Implementation Plan v2.1: Multi-Source Evidence Retrieval

**Context:** FactHarbor's #1 quality bottleneck is evidence pool asymmetry (C13 = 8/10 calibration pairs). The pipeline currently relies on a single evidence channel — web search. This plan adds 3 supplementary sources: Wikipedia, Semantic Scholar, and Google Fact Check Tools API. All three are free.

**Spec reference:** `Docs/Specification/Multi_Source_Evidence_Retrieval.md`

**Review fixes (v2):** Addresses all 8 findings from MSR review — see "Review Fixes Applied" at bottom.
**v2.1 update:** MSR-H1 fully resolved — prompt seeding mechanism verified and explicit reseed step added.

---

## Implementation Status (2026-02-24)

| Phase | Scope | Status | Notes |
|-------|-------|--------|-------|
| **Phase 1** | Wikipedia Provider | ✅ COMPLETE | 11 tests, MSR-M1 error handling |
| **Phase 2** | Semantic Scholar Provider | ✅ COMPLETE | 12 tests, MSR-M2 serialized queue, first-call optimization |
| **Phase 3.1** | search-factcheck-api.ts (provider) | ✅ COMPLETE | 13 tests, languageCode passthrough |
| **Phase 3.2** | EvidenceItem type changes (types.ts) | ❌ PENDING | `isFactCheckVerdict`, `factCheckRating`, `factCheckPublisher`, `linkedFactCheckId` |
| **Phase 3.3** | NORMALIZE_FACTCHECK_RATING prompt | ❌ PENDING | Add prompt section + bump frontmatter version |
| **Phase 3.4** | seedEvidenceFromFactCheckApi() | ❌ PENDING | Pipeline integration in claimboundary-pipeline.ts |
| **Phase 3.5** | preQualifiedUrls + safeguards | ❌ PENDING | MSR-M3 age gate, MSR-M4 dedup/linking |
| **Phase 3.6** | Pipeline integration tests | ❌ PENDING | Age gate, linked evidence ID tests |
| **Phase 4** | Wire up all providers | ✅ COMPLETE | config-schemas, web-search, .env.example, admin UI |
| **Phase 5** | Verification | ⏳ PARTIAL | 1045 tests passing, build clean. Prompt reseed pending. |

**Tests:** 1045 passing (was 1009 before MSR). Build clean.
**Commit status:** Not yet committed. Provider layer is commit-ready; pipeline integration is separate scope.

### Implementation Deviations from Plan

| Item | Plan v2.1 | Actual Implementation | Reason |
|------|-----------|----------------------|--------|
| S2 abstract truncation | 300 chars | 500 chars | Cline:Gemini review — academic abstracts are dense, 300 often cuts before findings |
| S2 rate limiter first call | Always 1.1s delay | Zero delay for first call | User review finding — `lastCallTime=0` → elapsed is huge → delay=0 |
| FactCheck languageCode | Not in v2.1 plan | Added to `searchGoogleFactCheck()` | User review finding — standard provider must pass languageCode from config |
| googleFactCheck schema | No `languageCode` field | Added `languageCode: z.string().optional()` | Required to support languageCode passthrough |

### Reviews Conducted

1. **Cline:Gemini review** (3 suggestions): Snippet 300→500 adopted. Language fallback deferred (out of scope). URL-only dedup acknowledged (multiple publishers for same URL is desirable).
2. **User sanity review** (3 findings): MED — languageCode fixed. LOW — first-call delay fixed. LOW — uncommitted state acknowledged.

---

## Phase 1: Wikipedia Provider ✅ COMPLETE

### 1.1 `apps/web/src/lib/search-wikipedia.ts` (~130 lines) ✅

Follow `search-brave.ts` pattern:

```
export async function searchWikipedia(options: WebSearchOptions): Promise<WebSearchResult[]>
```

- **API:** `https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=QUERY&srlimit=N&format=json&origin=*`
- **No API key.** Set `User-Agent: FactHarbor/1.0 (https://github.com/factharbor; admin@factharbor.com)` header (mandatory per Wikimedia policy).
- **Response mapping:** `query.search[].title` → title, `query.search[].snippet` → strip HTML → snippet, URL = `https://{lang}.wikipedia.org/wiki/{encodeURIComponent(title.replace(/ /g, '_'))}`
- **HTML stripping:** `snippet.replace(/<[^>]*>/g, '')` — structural plumbing, not semantic (AGENTS.md compliant).
- **Language:** Read from `config.providers.wikipedia.language` (default `"en"`).
- **Date restriction:** Not supported by Wikipedia search — ignore `dateRestrict`.
- **Error handling (MSR-M1 fix):** Wikipedia is highly reliable, but MUST report server errors for circuit breaker observability:
  - HTTP 429 → throw `SearchProviderError("Wikipedia", 429, true, msg)` (rate limit)
  - HTTP 5xx → throw `SearchProviderError("Wikipedia", status, true, msg)` (server error)
  - HTTP 4xx (not 429) → return `[]` + log warning
  - Network/timeout → return `[]` + log warning
- **Timeout:** 10s default.

### 1.2 `apps/web/test/unit/lib/search-wikipedia.test.ts` (11 tests) ✅

- Test: successful response parsing with HTML tag stripping
- Test: empty results → `[]`
- Test: network timeout → `[]`
- Test: HTTP 429 → `SearchProviderError` with fatal=true (MSR-M1)
- Test: HTTP 500 → `SearchProviderError` with fatal=true (MSR-M1)
- Test: HTTP 404 → empty array
- Test: page URL construction (spaces, special chars)
- Test: unicode URL construction (São Paulo)
- Test: `maxResults` limit respected
- Test: language parameter constructs correct subdomain URL
- Test: empty query.search response

---

## Phase 2: Semantic Scholar Provider ✅ COMPLETE

### 2.1 `apps/web/src/lib/search-semanticscholar.ts` (~170 lines) ✅

```
export async function searchSemanticScholar(options: WebSearchOptions): Promise<WebSearchResult[]>
```

- **API:** `https://api.semanticscholar.org/graph/v1/paper/search?query=QUERY&fields=title,abstract,year,citationCount,venue,externalIds&limit=N`
- **API key:** `process.env.SEMANTIC_SCHOLAR_API_KEY` via `x-api-key` header. Works without key at shared pool — log warning if missing.
- **Response mapping:** `data[].title` + ` (${year}, ${venue})` → title, `data[].abstract` (truncated 500 chars) → snippet, DOI URL preferred, else `https://www.semanticscholar.org/paper/{paperId}` → url
- **Rate limiter (MSR-M2 fix):** Serialized async queue with first-call optimization:
  ```typescript
  // Concurrency-safe serialized async queue rate limiter.
  // Each call chains onto `pending`, guaranteeing 1.1s gaps even under concurrent invocations.
  // First call proceeds immediately (lastCallTime=0 → elapsed is huge → delay=0).
  const MIN_INTERVAL_MS = 1100;
  let pending: Promise<void> = Promise.resolve();
  let lastCallTime = 0;

  function acquireSlot(): Promise<void> {
    const slot = pending.then(() => {
      const now = Date.now();
      const elapsed = now - lastCallTime;
      const delay = elapsed >= MIN_INTERVAL_MS ? 0 : MIN_INTERVAL_MS - elapsed;
      return new Promise<void>(resolve => {
        setTimeout(() => {
          lastCallTime = Date.now();
          resolve();
        }, delay);
      });
    });
    pending = slot;
    return slot;
  }
  ```
- **Date restriction:** `"y"` → `&year=${currentYear-1}-${currentYear}`, `"m"` / `"w"` → `&year=${currentYear}`.
- **Error handling:** HTTP 429/403 → `SearchProviderError`. Other errors → `[]`.
- **Timeout:** 15s.

### 2.2 `apps/web/test/unit/lib/search-semanticscholar.test.ts` (12 tests) ✅

- Test: HTTP 429 → `SearchProviderError`
- Test: HTTP 403 → `SearchProviderError`
- Test: successful parsing with DOI URL preference
- Test: S2 fallback URL when no DOI
- Test: title enrichment with year+venue, year only, none
- Test: abstract truncation at 500 chars
- Test: missing API key → warning + still works (no x-api-key header)
- Test: empty results → `[]`
- Test: year range for dateRestrict "y" (`${currentYear-1}-${currentYear}`)
- Test: current year only for dateRestrict "m"

---

## Phase 3: Google Fact Check Tools API (partially complete)

### 3.1 `apps/web/src/lib/search-factcheck-api.ts` (~200 lines) ✅ COMPLETE

Two exports:

```typescript
// Standard provider contract (for AUTO mode in web-search.ts)
export async function searchGoogleFactCheck(options: WebSearchOptions): Promise<WebSearchResult[]>

// Rich structured data (for pipeline direct seeding)
export async function queryFactCheckApi(query: string, options: FactCheckQueryOptions): Promise<FactCheckApiResult>
```

**Standard provider (`searchGoogleFactCheck`):**
- **API:** `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=QUERY&languageCode=LANG&pageSize=N&key=KEY`
- **API key:** `process.env.GOOGLE_FACTCHECK_API_KEY`
- **languageCode:** Read from `options.config?.providers?.googleFactCheck?.languageCode` (implementation deviation — added per user review)
- **Response mapping:** For each `claims[].claimReview[]`: `review.url` → url, `review.title` → title, `"[${publisher.name}] ${textualRating}: ${claim.text}"` → snippet
- **URL dedup:** `seenUrls` Set prevents duplicate URLs across claims
- **Error handling:** 429/403 → `SearchProviderError`. 400 → `[]`.

**Rich query (`queryFactCheckApi`):**
- Returns: `FactCheckApiResult` with `claims[]` containing `text`, `claimant`, `claimDate`, `claimReview[]` with `publisher`, `url`, `title`, `textualRating`, `reviewDate`, `languageCode`
- Used by `seedEvidenceFromFactCheckApi()` in pipeline (Phase 3.4).

### 3.2 Add fields to EvidenceItem — `apps/web/src/lib/analyzer/types.ts` ❌ PENDING

Add optional fields to `EvidenceItem` interface (~line 385):

```typescript
/** True if this is an external fact-check verdict (not raw evidence) */
isFactCheckVerdict?: boolean;
/** Original textual rating from the fact-checking org (preserved for debate) */
factCheckRating?: string;
/** Publisher name of the fact-checking organization */
factCheckPublisher?: string;
/** Links to a seeded metadata EvidenceItem for dedup (MSR-M4) */
linkedFactCheckId?: string;
/** True if superseded by a richer extracted version (MSR-M4) */
isSuperseded?: boolean;
```

### 3.3 Add `NORMALIZE_FACTCHECK_RATING` prompt section — `apps/web/prompts/claimboundary.prompt.md` ❌ PENDING

**Prompt seeding mechanism (MSR-H1 — verified):**

The prompt lifecycle works as follows:
1. `loadPromptConfig()` (config-loader.ts:389) is called at runtime.
2. It calls `refreshPromptFromFileIfSystemSeed()` (config-storage.ts:1311) which re-reads the `.prompt.md` file and compares to DB content.
3. If the file content differs AND the active config is system-seeded (versionLabel starts with `seed-v`), the DB is auto-refreshed.
4. If the active config was user-edited in Admin UI, auto-refresh is skipped — manual reseed needed.

**Implementation steps:**

**Step A:** Add `## NORMALIZE_FACTCHECK_RATING` section to `apps/web/prompts/claimboundary.prompt.md`:

```markdown
## NORMALIZE_FACTCHECK_RATING

Given fact-check ratings from professional organizations, normalize each to a claim direction.

Input ratings (JSON array): {{ratings}}

For each rating, determine:
- claimDirection: "supports" (rating says claim is true/correct), "contradicts" (rating says claim is false/misleading), or "neutral" (mixed/partly true/unclear)

The textualRating is free text in any language (e.g., "Mostly False", "Pants on Fire",
"Four Pinocchios", "Verdadero", "半真半假"). Interpret the meaning, not the exact words.

Return a JSON array matching the input order: [{claimDirection: "supports"|"contradicts"|"neutral"}]
```

Variables: `{{ratings}}` = JSON array of `{textualRating, publisherName, languageCode}`.

**Step B:** Bump the `version:` in the claimboundary prompt frontmatter (triggers new `seed-v` label).

**Step C (Phase 5 verification):** Run `npm -w apps/web run reseed:prompts` to force-reseed all prompt profiles. Verify with runtime log: `[Config-Storage] Refreshed prompt claimboundary from file (hash: ...)`.

### 3.4 Add `seedEvidenceFromFactCheckApi()` — `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` ❌ PENDING

Insert after `seedEvidenceFromPreliminarySearch(state)` at line 1879:

```
// Step 1b: Seed evidence from professional fact-checkers (if configured)
await seedEvidenceFromFactCheckApi(state, claims, pipelineConfig, searchConfig, currentDate);
```

**Function design (~100 lines):**

1. Check `searchConfig.factCheckApi?.enabled` and `process.env.GOOGLE_FACTCHECK_API_KEY`. Return early if not.
2. For each AtomicClaim, call `queryFactCheckApi(claim.statement, ...)` — LLM-normalized statement (input neutrality).
3. **Batch-normalize textualRatings via LLM** (Haiku, single call):
   - Uses `loadAndRenderSection("claimboundary", "NORMALIZE_FACTCHECK_RATING", { ratings })`.
   - Raw rating preserved in `factCheckRating` field.
4. **Create EvidenceItem per review (MSR-H2 fix — NO fixed `probativeValue: "high"`):**
   - `sourceType: "fact_check_report"` (already in SourceType enum, already INSTITUTIONAL in verdict-stage.ts:55)
   - `probativeValue: undefined` — **let the LLM assign probativeValue** during evidence extraction if the full article is fetched, or during verdict stage assessment. Do NOT pre-assign a fixed value. The evidence filter skips items without probativeValue (they pass through), so these items reach the debate without being artificially boosted.
   - `isFactCheckVerdict: true`
   - `factCheckRating`: raw textualRating
   - `factCheckPublisher`: publisher name
   - `evidenceScope`: `{ methodology: "Professional fact-check by {publisher}", temporal: reviewDate }`
   - `claimDirection`: from LLM normalization
5. Push EvidenceItems into `state.evidenceItems[]`
6. **Queue URLs with safeguards (MSR-M3 + MSR-M4 fixes)** — see 3.5 below.

### 3.5 Add `preQualifiedUrls` to research state — with safeguards ❌ PENDING

Add to `CBResearchState`:
```typescript
preQualifiedUrls: Array<{
  url: string;
  title: string;
  claimId: string;
  source: string;
  /** Linked fact-check EvidenceItem ID for dedup (MSR-M4) */
  linkedEvidenceId: string;
  /** Review date for age gating (MSR-M3) */
  reviewDate: string | null;
}>;
```

**In `runResearchIteration()` — pre-qualified URL processing with safeguards:**

Before generating search queries, check for pre-qualified URLs for the target claim.

**MSR-M3 fix (relevance/age gate):**
- Skip URLs older than `factCheckApi.maxAgeDays` (default 365 days).
- After fetching, run a **lightweight relevance check**: the fetched text goes through `classifyRelevance()` like any other source (NOT skipped). This catches stale/drifted content.
- Only the initial `searchWebWithProvider()` call is skipped for pre-qualified URLs — the rest of the pipeline (relevance → fetch → extract) runs normally.

**MSR-M4 fix (dedupe/linking):**
- When `extractResearchEvidence()` produces EvidenceItems from a fetched fact-check article, tag them with `linkedFactCheckId = linkedEvidenceId` pointing to the seeded metadata EvidenceItem.
- Add `linkedFactCheckId?: string` optional field to EvidenceItem (types.ts).
- In the verdict stage, if both a metadata EvidenceItem and its linked extracted EvidenceItem exist, **use the extracted one** (richer) and demote the metadata one to `isSuperseded: true`. The aggregation skips superseded items.
- If fetch fails (URL unreachable), the metadata EvidenceItem stands alone — no duplication.

### 3.6 `apps/web/test/unit/lib/search-factcheck-api.test.ts` (13 tests) ✅ COMPLETE (provider tests)

**Implemented tests:**
- Standard provider: claim mapping, URL dedup, empty claims, missing API key, HTTP 429/403/400, multiple reviews per claim, maxResults
- Rich query: structured data extraction, missing key, HTTP 429, non-fatal errors, parameter passing (maxAgeDays, languageCode, pageSize)

**Pipeline integration tests (pending — Phase 3.6 remainder):**
- Test: age gate filtering (MSR-M3)
- Test: linked evidence ID propagation (MSR-M4)

---

## Phase 4: Wire Up All Providers ✅ COMPLETE

### 4.1 `apps/web/src/lib/config-schemas.ts` ✅

**Provider enum** (line 54): Added `"wikipedia"`, `"semantic-scholar"`, `"google-factcheck"`

**Providers config**: Added:
```typescript
wikipedia: z.object({
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(10),
  dailyQuotaLimit: z.number().int().min(0),
  language: z.string().min(2).max(10).optional(),
}).optional(),
semanticScholar: z.object({
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(10),
  dailyQuotaLimit: z.number().int().min(0),
}).optional(),
googleFactCheck: z.object({
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(10),
  dailyQuotaLimit: z.number().int().min(0),
  languageCode: z.string().optional(),  // Implementation deviation: added for languageCode passthrough
}).optional(),
```

**Fact Check API config** (new section):
```typescript
factCheckApi: z.object({
  enabled: z.boolean(),
  maxResultsPerClaim: z.number().int().min(1).max(10),
  maxAgeDays: z.number().int().min(1).max(3650),
  fetchFullArticles: z.boolean(),
}).optional(),
```

**Defaults:** All providers `enabled: false`. factCheckApi `enabled: false`, `maxResultsPerClaim: 5`, `maxAgeDays: 365`, `fetchFullArticles: true`.

**Naming convention (MSR-L2 fix):**

| Context | Wikipedia | Semantic Scholar | Google Fact Check |
|---------|-----------|-----------------|-------------------|
| Schema key (camelCase) | `wikipedia` | `semanticScholar` | `googleFactCheck` |
| Enum value (kebab-case) | `"wikipedia"` | `"semantic-scholar"` | `"google-factcheck"` |
| Display name (for logs, providersUsed) | `"Wikipedia"` | `"Semantic-Scholar"` | `"Google-FactCheck"` |
| Env var | (none) | `SEMANTIC_SCHOLAR_API_KEY` | `GOOGLE_FACTCHECK_API_KEY` |
| Module file | `search-wikipedia.ts` | `search-semanticscholar.ts` | `search-factcheck-api.ts` |

### 4.2 `apps/web/src/lib/web-search.ts` ✅

**`getActiveSearchProviders()`**: Added detection for Wikipedia (config-only, no key needed), Semantic Scholar (config-only), Google FactCheck (key + config).

**Explicit provider branches**: Added `if`/`else if` blocks for `"wikipedia"`, `"semantic-scholar"`, `"google-factcheck"` — each with circuit breaker → dynamic import → call → cache → record success/failure.

**AUTO mode**: Added ProviderInfo entries with config-driven priority + circuit breaker. Added dispatch branches in the loop.

### 4.3 `apps/web/.env.example` ✅

Added:
```
# Semantic Scholar (academic papers, free key — request at semanticscholar.org/product/api)
# SEMANTIC_SCHOLAR_API_KEY=PASTE_YOUR_KEY_HERE
# Google Fact Check Tools (free — enable in Google Cloud Console)
# GOOGLE_FACTCHECK_API_KEY=PASTE_YOUR_KEY_HERE
# Note: Wikipedia requires no API key
```

### 4.4 `apps/web/src/app/admin/config/page.tsx` ✅

Updated provider union: `"auto" | "google-cse" | "serpapi" | "brave" | "wikipedia" | "semantic-scholar" | "google-factcheck"`.

---

## Phase 5: Verification ⏳ PARTIAL

1. ✅ **`npm test`** — 1045 tests passing (was 1009 before MSR; +36 new tests)
2. ✅ **`npm -w apps/web run build`** — TypeScript compilation clean
3. ❌ **`npm -w apps/web run reseed:prompts`** — pending (blocked on Phase 3.3 prompt addition)
4. ❌ **Manual smoke test** — pending

---

## File Summary

| File | Action | Status | Notes |
|------|--------|--------|-------|
| `apps/web/src/lib/search-wikipedia.ts` | CREATE | ✅ | ~130 lines, MSR-M1 error handling |
| `apps/web/src/lib/search-semanticscholar.ts` | CREATE | ✅ | ~170 lines, MSR-M2 queue, first-call fix |
| `apps/web/src/lib/search-factcheck-api.ts` | CREATE | ✅ | ~215 lines, languageCode, dual export |
| `apps/web/test/unit/lib/search-wikipedia.test.ts` | CREATE | ✅ | 11 tests |
| `apps/web/test/unit/lib/search-semanticscholar.test.ts` | CREATE | ✅ | 12 tests |
| `apps/web/test/unit/lib/search-factcheck-api.test.ts` | CREATE | ✅ | 13 tests (provider); pipeline tests pending |
| `apps/web/src/lib/config-schemas.ts` | MODIFY | ✅ | +providers, +factCheckApi, +defaults |
| `apps/web/src/lib/web-search.ts` | MODIFY | ✅ | +3 explicit branches, +AUTO mode entries |
| `apps/web/src/lib/analyzer/types.ts` | MODIFY | ❌ | +isFactCheckVerdict, +linkedFactCheckId, +isSuperseded |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | MODIFY | ❌ | +seedEvidenceFromFactCheckApi(), +preQualifiedUrls |
| `apps/web/prompts/claimboundary.prompt.md` | MODIFY | ❌ | +NORMALIZE_FACTCHECK_RATING section |
| `apps/web/.env.example` | MODIFY | ✅ | +2 API key entries |
| `apps/web/src/app/admin/config/page.tsx` | MODIFY | ✅ | Provider union type |
| **Total** | 6 new, 7 modified | **9/13 done** | Provider layer complete; pipeline pending |

---

## Review Fixes Applied

| Finding | Severity | Fix | Status |
|---------|----------|-----|--------|
| **MSR-H1** Prompt wiring incomplete | HIGH | Verified: `loadAndRenderSection` reads from `.prompt.md` by heading name — adding `## NORMALIZE_FACTCHECK_RATING` section to file is sufficient. `contentHash` auto-updates. Explicit reseed step added for user-edited configs. | ❌ Pending (Phase 3.3) |
| **MSR-H2** Fixed `probativeValue: "high"` biases verdicts | HIGH | Changed: seeded fact-check EvidenceItems get `probativeValue: undefined`. LLM assigns value during verdict-stage assessment or when full article is extracted. No artificial boost. | ❌ Pending (Phase 3.4) |
| **MSR-M1** Wikipedia silent failure hides degradation | MED | Changed: Wikipedia now throws `SearchProviderError` on HTTP 429 and 5xx, enabling circuit breaker tracking and AUTO mode fallback visibility. | ✅ Implemented |
| **MSR-M2** Timestamp throttle is race-prone | MED | Changed: Replaced module-level timestamp with a promise-chain serialized queue. Each call chains onto `pending`, guaranteeing 1.1s gaps under concurrency. First call has zero delay. | ✅ Implemented |
| **MSR-M3** preQualifiedUrls bypass imports stale material | MED | Changed: Pre-qualified URLs go through `classifyRelevance()` (lightweight LLM check) before extraction. Age-gated by `maxAgeDays` config. Only the initial search call is skipped. | ❌ Pending (Phase 3.5) |
| **MSR-M4** Duplicate evidence amplification | MED | Changed: Added `linkedFactCheckId` field. Extracted articles link back to seeded metadata items. If both exist, extracted version used, metadata marked `isSuperseded`. Aggregation skips superseded items. | ❌ Pending (Phase 3.5) |
| **MSR-L1** Stale fixture references | LOW | Removed: No fixture references in plan v2. | ✅ N/A |
| **MSR-L2** Naming inconsistency risk | LOW | Added: Explicit naming convention table (schema key = camelCase, enum = kebab-case, display = Title-Case, env = UPPER_SNAKE). | ✅ Implemented |

---

## Key Design Decisions

### Google Fact Check: Hybrid approach

**Do both:** Create an EvidenceItem from structured API metadata (fast, always available) AND queue the URL for full fetch+extract (rich, handles the dedup via `linkedFactCheckId`). If fetch succeeds, extracted version supersedes metadata. If fetch fails, metadata stands alone.

### textualRating normalization: LLM, not regex

Per AGENTS.md, all text interpretation MUST use LLM. Single batched Haiku call normalizes all ratings to `claimDirection`. Raw rating preserved in `factCheckRating` for debate visibility.

### Debate independence preserved

- `fact_check_report` already INSTITUTIONAL in D5 Control 2 → routed to advocate, not visible to challenger
- `isFactCheckVerdict` flag lets prompts instruct: "authoritative professional opinion, not dispositive answer"
- No fixed `probativeValue` boost — LLM assesses quality like any other evidence

### All providers disabled by default

Opt-in via UCM Admin. No surprise behavior for existing deployments.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| S2 commercial license unclear | Contact AI2 before production. Fine for pre-release. |
| S2 rate limit (1 RPS) | Serialized async queue + priority 3 in AUTO mode |
| Fact Check API low recall (~15%) | Non-blocking, fail-open. Zero cost when no results. |
| Added latency | New sources run in parallel in AUTO mode |
| Evidence volume increase | probativeValue filter + D5 sufficiency caps + dedup |

---

## For Next Agent

**To continue this work (pipeline integration):**

1. Read this plan — Phases 3.2 through 3.5 are the remaining work
2. Read existing provider implementations for patterns:
   - `apps/web/src/lib/search-factcheck-api.ts` (the `queryFactCheckApi` export is what the pipeline calls)
   - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (find `seedEvidenceFromPreliminarySearch` — insert after it)
   - `apps/web/src/lib/analyzer/types.ts` (add fields to `EvidenceItem` interface)
   - `apps/web/prompts/claimboundary.prompt.md` (add new section, bump version)
3. Key consideration: `probativeValue: undefined` (MSR-H2) — do NOT hardcode "high"
4. Key consideration: preQualifiedUrls must go through `classifyRelevance()` (MSR-M3) — only skip search, not relevance check
5. After prompt edit, run `npm -w apps/web run reseed:prompts` (MSR-H1)
6. After all changes: `npm test` (must stay at 1045+ passing), `npm -w apps/web run build` (must be clean)

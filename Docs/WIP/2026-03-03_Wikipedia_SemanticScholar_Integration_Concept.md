# Wikipedia & Semantic Scholar Integration — Architecture & Design Concept

**Date:** 2026-03-03
**Author:** Lead Architect (Claude Code, Opus 4.6)
**Status:** DRAFT — Ready for Review
**Scope:** Full integration of Wikipedia and Semantic Scholar into the ClaimAssessmentBoundary pipeline
**Related docs:**
- Existing MSR plan: `Docs/WIP/Multi-Source_Evidence_Retrieval_Plan.md` (v2.1, Phases 1-4 done)
- MSR Specification: `Docs/Specification/Multi_Source_Evidence_Retrieval.md`
- Factiverse analysis: `Docs/Knowledge/Factiverse_Lessons_for_FactHarbor.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Integration Concept](#3-integration-concept)
4. [Architecture & Design](#4-architecture--design)
5. [Difficulties & Challenges](#5-difficulties--challenges)
6. [Options & Variations](#6-options--variations)
7. [Risks & Opportunities](#7-risks--opportunities)
8. [Detailed Implementation Plan](#8-detailed-implementation-plan)
9. [Testing Strategy](#9-testing-strategy)
10. [Success Metrics](#10-success-metrics)
11. [Open Questions for Review](#11-open-questions-for-review)

---

## 1. Executive Summary

Wikipedia and Semantic Scholar are **already implemented as search providers** (MSR Phases 1-2), but remain **disabled by default and unoptimized**. They function as generic `WebSearchResult[]` producers — the pipeline treats their output identically to web search results, missing source-specific strengths.

This document proposes a **three-tier integration strategy** that goes beyond "flip the switch":

- **Tier 1 (Activation):** Enable providers, tune configs, add Admin UI form fields — get immediate value from what exists
- **Tier 2 (Enhancement):** Source-type-aware query generation, Wikipedia language auto-detection, evidence extraction tuning, source reliability calibration
- **Tier 3 (Deep Integration):** Wikipedia reference extraction (cited sources), S2 citation-count quality signals, open access PDF retrieval, academic sourceType mapping

**Key insight:** The provider layer is complete and solid. The remaining work is *pipeline-level integration* — making the pipeline aware that Wikipedia content and academic papers have different characteristics than generic web pages, and leveraging those differences for better evidence quality.

**Estimated effort:** Tier 1: 4-6h | Tier 2: 12-16h | Tier 3: 16-24h

---

## 2. Current State Assessment

### 2.1 What's Implemented

| Component | Status | File | Notes |
|-----------|--------|------|-------|
| Wikipedia search provider | COMPLETE | `search-wikipedia.ts` (117 lines) | MediaWiki API, language config, HTML stripping, 11 tests |
| Semantic Scholar search provider | COMPLETE | `search-semanticscholar.ts` (177 lines) | S2 Graph API v1, serialized rate limiter, DOI preference, 12 tests |
| Google Fact Check provider | COMPLETE | `search-factcheck-api.ts` | Dual export (standard + rich), 13 tests |
| Provider registry + dispatch | COMPLETE | `web-search.ts` lines 59-320 | All 3 registered as supplementary, fixed 3-result quota |
| UCM config schemas | COMPLETE | `config-schemas.ts` lines 96-115 | `enabled`, `priority`, `dailyQuotaLimit`, Wikipedia `language` |
| Admin UI provider enum | PARTIAL | `admin/config/page.tsx` | Enum updated, but **no form fields** for supplementary providers |
| `.env.example` docs | COMPLETE | `.env.example` | Placeholders for S2 and FactCheck API keys |

### 2.2 What's NOT Implemented

| Gap | Impact | Where It Matters |
|-----|--------|-----------------|
| **All providers disabled by default** | Zero production value until enabled | Config defaults |
| **No Admin UI form fields** | Admins must use JSON editor to configure | Admin UX |
| **Generic query generation** | Same search query for all providers (web, encyclopedia, academic) | Query quality |
| **No Wikipedia language auto-detection** | English-only unless manually configured | Multilingual robustness |
| **No Wikipedia reference extraction** | Misses the most valuable data (cited primary sources) | Evidence quality |
| **No S2 citation-count signal** | Highly-cited papers treated same as obscure preprints | Evidence weighting |
| **No academic sourceType mapping** | S2 papers classified as generic "other" by LLM | Source reliability |
| **No S2 open-access PDF retrieval** | Only abstracts (500 chars); full text of open papers unused | Evidence depth |
| **No source reliability calibration for known domains** | `wikipedia.org` and `semanticscholar.org` get generic LLM evaluation | SR accuracy |
| **Hardcoded UCM values** | Abstract truncation (500), rate limit (1.1s), timeouts (10s/15s) not configurable | Operational flexibility |
| **Google Fact Check pipeline integration** | Phases 3.2-3.6 pending (EvidenceItem type, prompt, seed function) | Fact-check evidence |
| **No supplementary result quota config** | Hardcoded `maxResults: 3` for all supplementary providers | Tuning flexibility |

### 2.3 Current Flow (Supplementary Providers)

```
Stage 2: Research
  ├─ Per claim, per iteration:
  │   ├─ Generate search query (LLM, Haiku)
  │   ├─ searchWebWithProvider(query, config)
  │   │   ├─ Cache check
  │   │   ├─ Primary providers (Google CSE / SerpAPI / Brave) — serial, break on maxResults
  │   │   ├─ Supplementary providers (if enabled) — always run:
  │   │   │   ├─ Wikipedia: searchWikipedia({...options, maxResults: 3})
  │   │   │   ├─ S2: searchSemanticScholar({...options, maxResults: 3})
  │   │   │   └─ FactCheck: searchGoogleFactCheck({...options, maxResults: 3})
  │   │   ├─ Domain filtering
  │   │   └─ Cache results
  │   ├─ classifyRelevance(results) — LLM batch
  │   ├─ Fetch top N relevant URLs — extractTextFromUrl()
  │   ├─ extractResearchEvidence(text) — LLM batch
  │   └─ Filter by probativeValue
  └─ Repeat until sufficient evidence or budget exhausted
```

**Key observation:** Supplementary providers run on *every search iteration* (if enabled), using the *same query* as the primary web search. This is suboptimal because:
- Wikipedia needs broader, concept-level queries ("climate change effects") not specific claim queries ("did global warming increase by 1.5C since 1880?")
- Semantic Scholar needs academic terminology ("anthropogenic climate change meta-analysis") not colloquial phrasing
- Running supplementary providers on every iteration wastes rate budget (S2 at 1 RPS) when early iterations already found relevant content

---

## 3. Integration Concept

### 3.1 Core Principle: Source-Aware, Not Source-Agnostic

The current architecture treats all providers as interchangeable `WebSearchResult[]` producers. This works for web search providers (Google, Brave, SerpAPI) because they return the same type of content. But Wikipedia and Semantic Scholar are fundamentally different source types:

| Dimension | Web Search | Wikipedia | Semantic Scholar |
|-----------|-----------|-----------|-----------------|
| **Content type** | Diverse (news, blogs, reports, papers) | Encyclopedia articles (secondary source) | Academic papers (primary source) |
| **Ideal query style** | Specific, claim-like | Broad, topic-level | Technical, academic vocabulary |
| **Full text availability** | Via URL fetch | Always available (API) | Abstract only (or open-access PDF) |
| **Quality signal** | Domain reputation | Article status (Featured/Good/Stub) | Citation count + venue prestige |
| **Language** | Query-language dependent | 300+ editions, per-language content | English-dominant search |
| **Recency** | Up-to-date | Varies by article activity | Publication year available |
| **Derivative risk** | Medium (news aggregation) | High (encyclopedia = secondary by definition) | Low (primary research) |

**Design principle:** The integration should make the pipeline *aware* of these differences and leverage them, without violating the "no hardcoded keywords" and "LLM intelligence for semantic decisions" rules.

### 3.2 Integration Vision

```
Stage 2: Research
  ├─ Per claim:
  │   ├─ Generate DIFFERENTIATED queries:
  │   │   ├─ Web query (existing): specific, claim-oriented
  │   │   ├─ Wikipedia query (NEW): broad topic + concept-level
  │   │   └─ Academic query (NEW): technical terminology, study-oriented
  │   │
  │   ├─ Main research loop (web search) — unchanged
  │   │
  │   ├─ Supplementary evidence gathering (NEW orchestration):
  │   │   ├─ Wikipedia: run ONCE per claim (not per iteration)
  │   │   │   ├─ Search → top articles
  │   │   │   ├─ Fetch article text (API, not URL scraping)
  │   │   │   └─ Optionally: extract cited references → feed back as URLs
  │   │   │
  │   │   └─ Semantic Scholar: run ONCE per claim (not per iteration)
  │   │       ├─ Search → top papers
  │   │       ├─ Use abstract as evidence snippet
  │   │       ├─ Tag with citation count + venue metadata
  │   │       └─ Optionally: fetch open-access PDF for full text
  │   │
  │   └─ Merge all evidence → existing quality pipeline
```

### 3.3 Key Design Decisions

**D1: Supplementary providers run per-claim, not per-iteration.**
Current: supplementary providers run on every `searchWebWithProvider()` call (potentially 3-5x per claim).
Proposed: run each supplementary provider once per claim at the start of that claim's research, then merge results with the main loop. Rationale: avoids wasting S2's 1 RPS budget on repeated queries; Wikipedia content doesn't change between iterations.

**D2: Differentiated query generation via LLM.**
Add a new LLM prompt section (`GENERATE_SUPPLEMENTARY_QUERIES`) that takes a claim and produces Wikipedia-style and academic-style query variants. This respects the "LLM intelligence for semantic decisions" rule — the LLM decides how to reformulate, not hardcoded rules.

**D3: Wikipedia language auto-detection from claim language.**
The pipeline's Stage 1 (understand) already detects input language. Thread this to Wikipedia's `language` config so a German claim searches `de.wikipedia.org`, not `en.wikipedia.org`. Fallback: always also search English Wikipedia for broader coverage.

**D4: Source-type metadata enrichment.**
S2 results should carry `sourceType: "peer_reviewed_study"` (or `"expert_statement"` for preprints). Wikipedia results should carry `sourceType: "other"` (encyclopedia) with a note in `additionalDimensions` indicating it's a secondary source. This enables downstream reliability calibration.

**D5: Supplementary result quota made UCM-configurable.**
Currently hardcoded at `maxResults: 3`. Move to UCM: `supplementaryMaxResults` per provider (default: 3 for Wikipedia, 5 for S2, 3 for FactCheck).

---

## 4. Architecture & Design

### 4.1 High-Level Architecture (Target State)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Stage 2: Research                                                       │
│                                                                          │
│  Per AtomicClaim:                                                        │
│                                                                          │
│  ┌─────────────────────────────────────────┐                            │
│  │ generateDifferentiatedQueries(claim)     │ ← NEW LLM call (Haiku)    │
│  │  → webQuery, wikiQuery, academicQuery    │                            │
│  └──────┬──────────┬──────────┬────────────┘                            │
│         │          │          │                                           │
│  ┌──────▼──────┐ ┌─▼────────┐ ┌▼───────────────┐                       │
│  │ Main Loop   │ │Wikipedia │ │Semantic Scholar │  Supplementary         │
│  │ (existing)  │ │  (once)  │ │   (once)        │  providers run         │
│  │ web search  │ │          │ │                  │  ONCE per claim        │
│  │ iterations  │ │ wikiQuery│ │ academicQuery    │                       │
│  └──────┬──────┘ └────┬─────┘ └──────┬──────────┘                       │
│         │             │              │                                    │
│  ┌──────▼─────────────▼──────────────▼──────┐                           │
│  │ mergeAndDeduplicate()                     │                           │
│  │ + sourceType enrichment                   │                           │
│  │ + citation count metadata                 │                           │
│  └──────────────────┬────────────────────────┘                           │
│                     │                                                     │
│  ┌──────────────────▼────────────────────────┐                           │
│  │ classifyRelevance() → fetchSources()      │  Existing pipeline        │
│  │ → extractEvidence() → filterByProbative() │  (unchanged)              │
│  └───────────────────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Design

#### 4.2.1 Supplementary Provider Orchestrator (NEW)

**File:** `apps/web/src/lib/analyzer/supplementary-search.ts` (new module, ~200 lines)

**Purpose:** Orchestrate supplementary provider calls outside the main search loop.

```typescript
export interface SupplementarySearchConfig {
  wikipedia: { enabled: boolean; maxResults: number; language: string; autoDetectLanguage: boolean };
  semanticScholar: { enabled: boolean; maxResults: number };
  factCheck: { enabled: boolean; maxResults: number };
}

export interface SupplementarySearchResult {
  provider: "wikipedia" | "semantic-scholar" | "google-factcheck";
  results: WebSearchResult[];
  metadata?: {
    citationCount?: number;    // S2 only
    venue?: string;            // S2 only
    publicationType?: string;  // S2 only
    articleStatus?: string;    // Wikipedia: featured/good/stub (future)
  };
}

/**
 * Run supplementary providers ONCE per claim with differentiated queries.
 * Called at the START of each claim's research, not on every iteration.
 */
export async function gatherSupplementaryEvidence(
  claim: AtomicClaim,
  queries: { wikiQuery: string; academicQuery: string },
  config: SupplementarySearchConfig,
  searchConfig: SearchConfig,
): Promise<SupplementarySearchResult[]> {
  const tasks: Promise<SupplementarySearchResult | null>[] = [];

  if (config.wikipedia.enabled) {
    tasks.push(searchWikipediaForClaim(claim, queries.wikiQuery, config, searchConfig));
  }
  if (config.semanticScholar.enabled) {
    tasks.push(searchS2ForClaim(claim, queries.academicQuery, config, searchConfig));
  }
  // FactCheck handled separately (has its own pipeline integration path)

  const results = await Promise.allSettled(tasks);
  return results
    .filter((r): r is PromiseFulfilledResult<SupplementarySearchResult> =>
      r.status === "fulfilled" && r.value !== null)
    .map(r => r.value!);
}
```

#### 4.2.2 Differentiated Query Generation (NEW)

**Location:** New prompt section `GENERATE_SUPPLEMENTARY_QUERIES` in `claimboundary.prompt.md`

**Input:** AtomicClaim text + detected language
**Output:**
```typescript
{
  wikiQuery: string;      // Broad, topic-level query for Wikipedia
  academicQuery: string;  // Technical, study-oriented query for S2
}
```

**Design rationale:** Using an LLM call (Haiku, ~$0.001) to reformulate is cheaper and more robust than regex/keyword transformation, and respects the "LLM intelligence for semantic decisions" rule.

**Batching opportunity:** If multiple claims share a topic, batch query generation into a single LLM call. This mirrors the existing `generateSearchQueries` pattern.

#### 4.2.3 Wikipedia Language Auto-Detection

**Location:** `supplementary-search.ts`, Wikipedia search wrapper

```
Input: claim language (from Stage 1 understand phase) + config
Logic:
  1. If config.autoDetectLanguage = true AND claim has detected language:
     - Primary search: {detectedLanguage}.wikipedia.org
     - Fallback search: en.wikipedia.org (if detectedLanguage ≠ "en")
  2. Else: use config.language (default "en")
```

**Language mapping:** Stage 1 already detects language and stores it. Thread this value to the supplementary search config. No new LLM call needed.

**Dual-language search rationale:** For a German claim, `de.wikipedia.org` has localized content, but `en.wikipedia.org` often has broader international coverage. Running both (with dedup) maximizes evidence diversity without significant cost.

#### 4.2.4 S2 Metadata Enrichment

**Current:** S2 results are flattened to `WebSearchResult { url, title, snippet }` — metadata (citation count, venue, year) is discarded after title enrichment.

**Proposed:** Extend the provider response to carry structured metadata through the pipeline:

```typescript
// Extension to WebSearchResult (backward-compatible)
export type WebSearchResult = {
  url: string;
  title: string;
  snippet: string | null;
  // NEW: Optional provider-specific metadata
  providerMetadata?: {
    provider: string;
    citationCount?: number;
    venue?: string;
    publicationType?: string;
    year?: number;
    isOpenAccess?: boolean;
    openAccessPdfUrl?: string;
  };
};
```

This metadata flows through to evidence extraction, where the LLM prompt can reference it:

> "This evidence comes from a paper published in {venue} ({year}) with {citationCount} citations."

The evidence extraction LLM uses this context to set appropriate `probativeValue` and `sourceType`.

#### 4.2.5 Source Reliability Pre-calibration

**Problem:** The source reliability module evaluates domains via LLM. But `wikipedia.org` and `semanticscholar.org` are well-known, high-quality domains that don't need per-job LLM evaluation.

**Solution:** Add pre-seeded reliability data for known academic/reference domains:

```typescript
// In source-reliability-config.ts or a new seed file
const KNOWN_DOMAIN_RELIABILITY: Record<string, Partial<CachedReliabilityData>> = {
  "wikipedia.org": {
    score: 0.75,           // Reliable as reference, but secondary source
    factualRating: "mostly factual",
    biasRating: "least biased",
    confidence: 0.95,
    sourceType: "reference",
  },
  "semanticscholar.org": {
    score: 0.85,           // Academic aggregator, high reliability
    factualRating: "very high",
    biasRating: "least biased",
    confidence: 0.95,
    sourceType: "academic",
  },
  "doi.org": {
    score: 0.90,           // DOI resolver → peer-reviewed content
    factualRating: "very high",
    biasRating: "least biased",
    confidence: 0.90,
    sourceType: "academic",
  },
};
```

These pre-seeded values bypass the LLM evaluation call, saving ~$0.01-0.02 per domain per job and improving consistency. They can be overridden via UCM if needed.

#### 4.2.6 Wikipedia Content Extraction Enhancement

**Current path:** Wikipedia URLs go through `extractTextFromUrl()` which does generic HTML extraction via Cheerio. This works but is suboptimal — Wikipedia has a structured API that returns clean plaintext.

**Enhanced path (Tier 3):**

```
Wikipedia search result URL
  │
  ├─ Extract title from URL
  │
  ├─ Call MediaWiki API: action=query&prop=extracts&explaintext
  │   → Clean plaintext (no HTML parsing needed)
  │
  ├─ OPTIONAL: action=parse&prop=references
  │   → Extract cited URLs (primary sources)
  │   → Feed back as additional WebSearchResult[] candidates
  │
  └─ Return structured content to evidence extraction
```

**Value of reference extraction:** Wikipedia's cited references are often primary sources (studies, government reports, news articles). Extracting and feeding these back into the pipeline effectively multiplies evidence diversity without additional search API calls.

### 4.3 Data Flow Diagram (Complete)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: Understand                                                      │
│  ├─ Extract AtomicClaims                                                  │
│  ├─ Detect input language → claimLanguage                                 │
│  └─ Preliminary search (seeds research)                                   │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│  STAGE 2: Research                                                        │
│                                                                           │
│  FOR EACH AtomicClaim:                                                    │
│                                                                           │
│  ┌─ [NEW] Generate differentiated queries (Haiku, 1 call per claim) ─┐   │
│  │  webQuery: "specific claim assertion query"                        │   │
│  │  wikiQuery: "broad topic concept query"                            │   │
│  │  academicQuery: "technical study-oriented query"                   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─ [NEW] Supplementary evidence (once per claim, parallel) ──────┐      │
│  │  ├─ Wikipedia: wikiQuery → {claimLang}.wikipedia.org            │      │
│  │  │   + optionally en.wikipedia.org                              │      │
│  │  │   → WebSearchResult[] with providerMetadata                  │      │
│  │  │                                                               │      │
│  │  └─ Semantic Scholar: academicQuery → S2 API                    │      │
│  │      → WebSearchResult[] with providerMetadata                  │      │
│  │        (citationCount, venue, year, openAccess)                 │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  ┌─ Main research loop (existing, unchanged) ─────────────────────┐      │
│  │  FOR EACH iteration (budget-limited):                           │      │
│  │  ├─ searchWebWithProvider(webQuery, config)                     │      │
│  │  │   └─ Primary providers only (supplementary REMOVED from      │      │
│  │  │      per-iteration loop — moved to per-claim above)          │      │
│  │  ├─ classifyRelevance(webResults + supplementaryResults)        │      │
│  │  ├─ fetchSources(relevant URLs)                                 │      │
│  │  │   └─ Wikipedia URLs: use API extraction (clean text)         │      │
│  │  ├─ extractResearchEvidence(fetchedText)                        │      │
│  │  │   └─ LLM prompt includes providerMetadata context            │      │
│  │  └─ filterByProbativeValue(evidence)                            │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  ├─ Contradiction search (existing, unchanged)                            │
│  └─ Contrarian retrieval (existing, unchanged)                            │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│  STAGE 3: Cluster → STAGE 4: Verdict → STAGE 5: Aggregate                │
│  (unchanged — supplementary evidence flows through existing pipeline)     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Configuration Architecture

#### UCM Config Changes (SearchConfig)

```typescript
// In config-schemas.ts — additions to SearchConfigSchema
providers: z.object({
  // ... existing providers ...
  wikipedia: z.object({
    enabled: z.boolean(),
    priority: z.number().int().min(1).max(10),
    dailyQuotaLimit: z.number().int().min(0),
    language: z.string().min(2).max(10).optional(),
    // NEW:
    autoDetectLanguage: z.boolean().describe("Auto-detect claim language and search matching Wikipedia edition"),
    alsoSearchEnglish: z.boolean().describe("When autoDetectLanguage is true, also search en.wikipedia.org"),
    maxResultsPerClaim: z.number().int().min(1).max(10).describe("Results per claim (supplementary mode)"),
    timeoutMs: z.number().int().min(1000).max(30000).optional(),
  }).optional(),

  semanticScholar: z.object({
    enabled: z.boolean(),
    priority: z.number().int().min(1).max(10),
    dailyQuotaLimit: z.number().int().min(0),
    // NEW:
    maxResultsPerClaim: z.number().int().min(1).max(10),
    abstractMaxChars: z.number().int().min(100).max(2000),
    rateLimitIntervalMs: z.number().int().min(500).max(10000),
    timeoutMs: z.number().int().min(1000).max(30000).optional(),
    fetchOpenAccessPdf: z.boolean().describe("Fetch full text from open-access PDFs when available"),
  }).optional(),
}).optional(),

// NEW top-level section:
supplementarySearch: z.object({
  enabled: z.boolean().describe("Enable supplementary evidence gathering (Wikipedia, S2)"),
  runMode: z.enum(["per-claim", "per-iteration"]).describe("When to run supplementary providers"),
  generateDifferentiatedQueries: z.boolean().describe("Use LLM to generate source-specific queries"),
}).optional(),
```

#### Default Config Values

```typescript
// Defaults (conservative, safe for existing deployments)
wikipedia: {
  enabled: false,           // Opt-in
  priority: 3,
  dailyQuotaLimit: 0,
  language: "en",
  autoDetectLanguage: true,
  alsoSearchEnglish: true,
  maxResultsPerClaim: 3,
  timeoutMs: 10000,
},
semanticScholar: {
  enabled: false,           // Opt-in
  priority: 3,
  dailyQuotaLimit: 0,
  maxResultsPerClaim: 5,    // Higher default — academic papers are more specific
  abstractMaxChars: 500,
  rateLimitIntervalMs: 1100,
  timeoutMs: 15000,
  fetchOpenAccessPdf: false, // Opt-in, adds latency
},
supplementarySearch: {
  enabled: true,            // Enabled when any supplementary provider is enabled
  runMode: "per-claim",     // Recommended
  generateDifferentiatedQueries: true,
},
```

---

## 5. Difficulties & Challenges

### 5.1 Wikipedia: Secondary Source Contamination

**Problem:** Wikipedia articles are secondary/tertiary sources by definition. Evidence extracted from Wikipedia may:
- Rephrase primary research findings (derivative)
- Mix multiple sources in a single paragraph (attribution confusion)
- Present well-sourced claims alongside poorly-sourced claims (quality variance within article)

**Severity:** MEDIUM — partially mitigated by existing `isDerivative` detection in evidence extraction.

**Mitigation options:**
- A: **LLM-aware extraction** — include "this is a Wikipedia article (secondary source)" in the extraction prompt so the LLM can mark evidence as derivative and set appropriate `probativeValue`
- B: **Reference extraction** (Tier 3) — extract Wikipedia's cited references and feed those as additional source URLs, prioritizing primary sources over the Wikipedia text itself
- C: **probativeValue cap** — configure a ceiling (e.g., "medium") for Wikipedia-sourced evidence

**Recommendation:** Option A (prompt context) for Tier 2, Option B (reference extraction) for Tier 3. Option C is too blunt — some Wikipedia evidence is high-quality.

### 5.2 Semantic Scholar: 1 RPS Rate Limit

**Problem:** S2's free tier allows only 1 request/second on search. With `per-claim` mode and 5+ claims, academic search adds 5.5+ seconds of serialized waiting (5 claims × 1.1s minimum gap). Under `per-iteration` mode it's worse (5 claims × 3 iterations × 1.1s = 16.5s).

**Severity:** MEDIUM — acceptable for a pipeline that already takes minutes, but noticeable.

**Mitigation options:**
- A: **Per-claim mode** (proposed) — limits to one S2 call per claim (5-6 calls total, ~7s)
- B: **S2 API key with higher tier** — partner keys allow up to 100 RPS (requires application to AI2)
- C: **Batch query** — combine multiple claim queries into one broader query. Reduces call count but lowers precision.
- D: **S2 snippet search** — use `/snippet/search` endpoint which returns passage-level matches (more relevant) at the same 1 RPS

**Recommendation:** Option A (per-claim). If S2 proves highly valuable in testing, pursue Option B (higher tier key).

### 5.3 Wikipedia Language Matching

**Problem:** A claim in German should search `de.wikipedia.org` for localized content, but English Wikipedia often has broader international coverage. Running both doubles the Wikipedia API calls.

**Severity:** LOW — Wikipedia API is free, fast (~100ms), and has generous rate limits.

**Mitigation:** Dual-language search (primary: detected language, secondary: English if different). Dedup by URL to avoid processing the same article twice if both editions link to it.

### 5.4 Evidence Volume Increase

**Problem:** Adding 3-5 Wikipedia + 5 S2 results per claim increases the evidence pool. With 5 claims, that's potentially 25-50 additional results to classify, fetch, and extract. This means:
- More LLM calls for relevance classification (~$0.003 per batch of 10)
- More URL fetches (latency, not cost)
- More LLM calls for evidence extraction

**Severity:** MEDIUM — LLM cost increase is small ($0.01-0.05/job), but latency compounds.

**Mitigation:**
- Relevance classification is already batched (low marginal cost per result)
- Supplementary results are pre-filtered (only relevant content from targeted sources)
- Evidence sufficiency caps (existing D5 controls) prevent unbounded evidence growth
- Monitor and tune `maxResultsPerClaim` via UCM

### 5.5 Semantic Scholar Commercial License Uncertainty

**Problem:** S2 license states: "You shall not embed or install the API into products for the licensee's own or third-parties' commercial gain." If FactHarbor becomes a commercial product, this may be prohibited.

**Severity:** HIGH for commercial deployment, LOW for current pre-release/research use.

**Mitigation:**
- Use S2 freely during pre-release and research phase
- Contact AI2 to clarify license before any commercial deployment
- Design the integration to be fully disable-able via UCM (already the case)
- Have a fallback plan: OpenAlex (fully open, 200M+ works, similar API)

### 5.6 Query Quality for Supplementary Sources

**Problem:** Search queries generated for web search are claim-specific ("did X cause Y?"). Wikipedia works better with topic-level queries ("X Y relationship") and S2 works better with academic language ("meta-analysis X impact on Y").

**Severity:** MEDIUM — poor queries → irrelevant results → wasted LLM calls.

**Mitigation:** Differentiated query generation (D2) via LLM. One Haiku call per claim generates three query variants. Cost: ~$0.001 per claim. The LLM naturally understands the difference between web, encyclopedia, and academic search contexts.

### 5.7 Supplementary Provider Integration Point

**Problem:** Two possible integration architectures:
1. **Inside `searchWebWithProvider()`** (current) — supplementary providers run alongside primary in the search function
2. **Outside, in `claimboundary-pipeline.ts`** (proposed) — supplementary providers run as a separate step orchestrated by the pipeline

Option 1 is simpler but doesn't allow per-claim orchestration. Option 2 requires touching the pipeline but enables differentiated queries and per-claim execution.

**Severity:** Architecture decision, not a risk.

**Recommendation:** Option 2 (pipeline-level orchestration). The supplementary providers have fundamentally different execution patterns (per-claim vs per-iteration, different queries, metadata enrichment). Keeping them in `searchWebWithProvider()` would require the search function to understand pipeline concepts (claims, iterations) which violates its current single-responsibility.

---

## 6. Options & Variations

### Option A: Minimal Integration (Tier 1 Only)

**What:** Enable providers, add Admin UI fields, tune defaults. No code changes to pipeline.

**Effort:** 4-6 hours

**Changes:**
- UCM defaults: `wikipedia.enabled: true`, `semanticScholar.enabled: true`
- Admin UI: add form fields for Wikipedia language, S2 API key status, enable/disable toggles
- Move hardcoded values to UCM: abstractMaxChars, rateLimitIntervalMs, per-provider timeoutMs
- Supplementary result quota: make `maxResults: 3` configurable per provider

**Pros:**
- Immediate value from existing provider implementations
- Zero risk (no pipeline changes)
- Enables data collection to validate value before deeper investment

**Cons:**
- Same web query used for all providers (suboptimal for Wikipedia/S2)
- No language auto-detection
- No metadata enrichment
- Supplementary providers run on every iteration (wasteful)

**Best for:** Quick validation of hypothesis "do Wikipedia/S2 results improve evidence quality?"

### Option B: Enhanced Integration (Tier 1 + Tier 2)

**What:** All of Option A plus source-aware pipeline integration.

**Effort:** 16-22 hours (4-6h Tier 1 + 12-16h Tier 2)

**Additional changes:**
- New module: `supplementary-search.ts` (orchestrator)
- LLM prompt: `GENERATE_SUPPLEMENTARY_QUERIES` section
- Pipeline change: per-claim supplementary evidence gathering
- Wikipedia: language auto-detection from claim language
- S2: metadata enrichment (citationCount, venue through pipeline)
- Source reliability: pre-seeded scores for wikipedia.org, semanticscholar.org, doi.org
- Evidence extraction: provider-context-aware prompting

**Pros:**
- Significantly better query quality → more relevant results
- Language-aware Wikipedia search
- S2 metadata available for evidence weighting
- Efficient rate budget usage (per-claim, not per-iteration)

**Cons:**
- Pipeline modification (moderate risk)
- New LLM call per claim (~$0.001, negligible cost)
- Testing requires manual verification of query quality

**Best for:** Production-quality integration with good ROI.

### Option C: Full Integration (Tier 1 + 2 + 3)

**What:** All of Option B plus deep source-specific features.

**Effort:** 32-46 hours (16-22h B + 16-24h Tier 3)

**Additional changes:**
- Wikipedia reference extraction (cited sources → feed back as URLs)
- Wikipedia article text via API (skip HTML extraction)
- S2 open-access PDF retrieval (full paper text)
- S2 citation-count quality signal in evidence filtering
- S2 publication type → sourceType mapping
- Academic sourceType addition: `"preprint"`, `"academic_review"` or similar

**Pros:**
- Maximum evidence quality improvement
- Wikipedia references = primary sources (highest value)
- Full paper text = richer evidence extraction
- Citation count = empirically validated quality signal

**Cons:**
- Significant effort and pipeline complexity
- PDF retrieval adds latency (10-30s per paper)
- New sourceType values require downstream updates (verdict prompts, aggregation)
- Reference extraction requires Wikipedia API expertise

**Best for:** When evidence quality is the top priority and timeline allows.

### Recommendation

**Start with Option B (Enhanced Integration).** It provides the best ROI:
- Differentiated queries and per-claim execution are the highest-impact improvements
- Language auto-detection is essential for multilingual robustness (AGENTS.md mandate)
- Metadata enrichment is low-effort, high-value
- Option A alone doesn't justify the effort — the providers already "work" but produce mediocre results with generic queries

**Defer Option C (Tier 3) to a follow-up.** Reference extraction and PDF retrieval are high-value but can be added incrementally after Option B validates the integration.

---

## 7. Risks & Opportunities

### 7.1 Risk Matrix

| # | Risk | Severity | Probability | Impact | Mitigation |
|---|------|----------|-------------|--------|------------|
| R1 | **S2 commercial license blocks production use** | HIGH | Medium | Must disable S2 for commercial deployment | Contact AI2; fallback to OpenAlex (open, 200M+ works) |
| R2 | **Wikipedia secondary-source contamination** | MEDIUM | High | Derivative evidence inflates pool without adding primary data | Prompt context ("this is Wikipedia"), probativeValue awareness, Tier 3 reference extraction |
| R3 | **S2 rate limit adds 5-10s latency** | MEDIUM | High | Acceptable for multi-minute pipeline, but noticeable | Per-claim mode limits calls; S2 partner key for higher RPS |
| R4 | **LLM cost increase from more evidence** | LOW | Medium | ~$0.01-0.05/job increase (Haiku tier) | Evidence sufficiency caps (D5) limit unbounded growth |
| R5 | **Query quality regression** | MEDIUM | Low | Bad supplementary queries waste budget | Differentiated query generation via LLM, not heuristics |
| R6 | **Evidence volume overwhelms verdict stage** | LOW | Low | More evidence items → longer debate prompts → token limits | Existing evidence sufficiency caps + probativeValue filtering |
| R7 | **S2 API availability** | LOW | Low | API downtime blocks academic evidence | Circuit breaker auto-disables; supplementary = optional |
| R8 | **Wikipedia API changes** | LOW | Very Low | MediaWiki API is extremely stable (20+ year history) | Version-pin API endpoint; monitor deprecation notices |

### 7.2 Opportunity Matrix

| # | Opportunity | Value | Effort | Impact on C13 |
|---|------------|-------|--------|---------------|
| O1 | **Evidence diversity** — 3 source categories instead of 1 | HIGH | Tier 1 | Direct fix for C13 (evidence asymmetry) |
| O2 | **Academic evidence for scientific claims** | HIGH | Tier 2 | S2 provides peer-reviewed evidence that web search often misses |
| O3 | **Multilingual Wikipedia** — 300+ language editions | HIGH | Tier 2 | German/French/etc. claims get localized evidence |
| O4 | **Professional fact-check cross-validation** | HIGH | Existing (FactCheck API) | Calibration signal: how does FactHarbor compare to professionals? |
| O5 | **Wikipedia reference extraction** — primary sources | HIGH | Tier 3 | Each Wikipedia article yields 5-50 primary source URLs for free |
| O6 | **Citation count as quality signal** | MEDIUM | Tier 2 | Highly-cited papers → higher evidence reliability |
| O7 | **Open access PDF full text** | MEDIUM | Tier 3 | Richer evidence extraction from complete papers |
| O8 | **Source reliability pre-calibration** | MEDIUM | Tier 2 | Known domains skip LLM evaluation → faster, more consistent |
| O9 | **Factiverse parity** | STRATEGIC | Tier 2 | Matches competitor's 6-source architecture (differentiator eliminated) |
| O10 | **Evidence-based claim verification** | STRATEGIC | All tiers | Moves from "web search + LLM reasoning" to "multi-source evidence + LLM reasoning" |

### 7.3 Risk-Opportunity Summary

The risk profile is favorable:
- The highest-severity risk (R1, commercial license) only applies to future commercial deployment and has a viable fallback (OpenAlex)
- All other risks are MEDIUM or LOW severity with clear mitigations
- The opportunity value is HIGH: evidence diversity (O1) directly addresses FactHarbor's #1 quality bottleneck (C13)
- The integration builds on completed, tested provider code — no greenfield development

---

## 8. Detailed Implementation Plan

### Phase 1: Activation & UCM (Tier 1) — ~4-6h

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1.1 | Move hardcoded values to UCM schema | `config-schemas.ts` | 1h |
| | - `abstractMaxChars` (S2, default: 500) | | |
| | - `rateLimitIntervalMs` (S2, default: 1100) | | |
| | - `maxResultsPerClaim` (Wiki: 3, S2: 5) | | |
| | - Per-provider `timeoutMs` | | |
| 1.2 | Wire UCM values into provider code | `search-wikipedia.ts`, `search-semanticscholar.ts` | 1h |
| 1.3 | Add Admin UI form fields for supplementary providers | `admin/config/page.tsx` | 2h |
| | - Wikipedia: enabled, language, timeout | | |
| | - S2: enabled, abstractMaxChars, rateLimitIntervalMs, timeout | | |
| | - Provider status indicators (API key configured? circuit open?) | | |
| 1.4 | Update default config to enable providers | `config-schemas.ts` (defaults section) | 0.5h |
| 1.5 | Verify: `npm test`, `npm -w apps/web run build` | — | 0.5h |

**Gate:** All tests pass, build clean, providers can be enabled via Admin UI.

### Phase 2: Pipeline Integration (Tier 2) — ~12-16h

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 2.1 | Create `supplementary-search.ts` module | `analyzer/supplementary-search.ts` (new) | 3h |
| | - `gatherSupplementaryEvidence()` function | | |
| | - Per-claim execution with parallel provider calls | | |
| | - `Promise.allSettled` for resilience | | |
| 2.2 | Add `GENERATE_SUPPLEMENTARY_QUERIES` prompt section | `claimboundary.prompt.md` | 1.5h |
| | - Input: AtomicClaim + detected language | | |
| | - Output: wikiQuery + academicQuery | | |
| | - Batch: multiple claims → single call | | |
| 2.3 | Integrate into claimboundary-pipeline.ts | `claimboundary-pipeline.ts` | 3h |
| | - Call `gatherSupplementaryEvidence()` per claim at research start | | |
| | - Merge supplementary results into relevance classification | | |
| | - Remove supplementary providers from per-iteration loop | | |
| 2.4 | Wikipedia language auto-detection | `supplementary-search.ts` | 1.5h |
| | - Thread `claimLanguage` from Stage 1 to supplementary config | | |
| | - Dual-language search (detected + English fallback) | | |
| | - URL dedup across language editions | | |
| 2.5 | Extend `WebSearchResult` with providerMetadata | `web-search.ts` (type only) | 0.5h |
| 2.6 | S2 metadata enrichment | `search-semanticscholar.ts` | 1h |
| | - Populate `providerMetadata` with citationCount, venue, year, openAccess | | |
| 2.7 | Source reliability pre-seeding | `source-reliability-config.ts` or new seed file | 1h |
| | - Pre-seed wikipedia.org, semanticscholar.org, doi.org | | |
| | - Skip LLM evaluation for pre-seeded domains | | |
| 2.8 | Evidence extraction context | `claimboundary.prompt.md` (extraction section) | 1h |
| | - Add provider context to extraction prompt | | |
| | - "This is a Wikipedia article (secondary source)" | | |
| | - "This is an academic paper from {venue} with {N} citations" | | |
| 2.9 | UCM config for supplementarySearch section | `config-schemas.ts` | 0.5h |
| 2.10 | Tests: supplementary-search.ts unit tests | `test/unit/lib/analyzer/supplementary-search.test.ts` (new) | 2h |
| | - Query differentiation | | |
| | - Per-claim execution | | |
| | - Language auto-detection | | |
| | - Provider failure isolation | | |
| | - Metadata enrichment | | |

**Gate:** All tests pass, build clean. Manual test: run analysis with supplementary providers enabled, verify Wikipedia and S2 evidence appears in results with appropriate sourceType metadata.

### Phase 3: Deep Integration (Tier 3, Optional/Deferred) — ~16-24h

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 3.1 | Wikipedia reference extraction | `search-wikipedia.ts` or new module | 4h |
| | - `action=parse&prop=references` API call | | |
| | - Extract cited URLs from references | | |
| | - Feed back as additional WebSearchResult candidates | | |
| 3.2 | Wikipedia API text extraction (bypass HTML) | `supplementary-search.ts` / `retrieval.ts` | 3h |
| | - `action=query&prop=extracts&explaintext` | | |
| | - Skip Cheerio HTML parsing for Wikipedia URLs | | |
| | - Clean plaintext directly from API | | |
| 3.3 | S2 open-access PDF retrieval | `search-semanticscholar.ts`, `retrieval.ts` | 4h |
| | - Check `isOpenAccess` and `openAccessPdfUrl` fields | | |
| | - Fetch PDF via existing `extractTextFromUrl()` (PDF worker) | | |
| | - Fall back to abstract if PDF unavailable or timeout | | |
| 3.4 | S2 citation-count quality signal | `evidence-filter.ts` or extraction prompt | 2h |
| | - Thread citationCount to evidence extraction context | | |
| | - LLM uses citation count when assessing probativeValue | | |
| 3.5 | S2 publication type → sourceType mapping | `search-semanticscholar.ts`, prompt | 2h |
| | - JournalArticle → `peer_reviewed_study` | | |
| | - Conference → `peer_reviewed_study` | | |
| | - Preprint → `expert_statement` | | |
| | - Review → `peer_reviewed_study` | | |
| 3.6 | Tests: Tier 3 features | Test files | 3h |
| 3.7 | Verify + manual test | — | 2h |

**Gate:** All tests pass, build clean. Manual test: verify Wikipedia references appear as additional sources, S2 PDFs are fetched for open-access papers.

---

## 9. Testing Strategy

### 9.1 Unit Tests (Safe, No LLM Calls)

| Test File | Coverage | Tests |
|-----------|----------|-------|
| `supplementary-search.test.ts` (new) | Orchestrator logic | 8-12 tests |
| | - Per-claim execution mode | |
| | - Language auto-detection + fallback | |
| | - Provider failure isolation (Promise.allSettled) | |
| | - Metadata enrichment passthrough | |
| | - Config defaults and overrides | |
| `search-wikipedia.test.ts` (extend) | New config params | +2-3 tests |
| | - maxResultsPerClaim override | |
| | - timeoutMs override | |
| `search-semanticscholar.test.ts` (extend) | New config params + metadata | +3-4 tests |
| | - abstractMaxChars from UCM | |
| | - rateLimitIntervalMs from UCM | |
| | - providerMetadata population | |

### 9.2 Integration Tests (Safe, Mocked LLM)

| Test | Purpose | Cost |
|------|---------|------|
| Pipeline with supplementary providers enabled | End-to-end flow verification | Free (mocked) |
| Differentiated query generation | Verify prompt produces distinct queries | Free (mocked) |
| Evidence merge + dedup | Supplementary results merge correctly | Free (mocked) |

### 9.3 Manual Validation (Real API, Low Cost)

| Test | Purpose | Cost |
|------|---------|------|
| Single analysis with Wiki + S2 enabled | Verify real results appear in evidence pool | ~$0.10-0.30 |
| German claim → German Wikipedia | Verify language auto-detection | ~$0.10-0.30 |
| Scientific claim → S2 papers in evidence | Verify academic evidence appears | ~$0.10-0.30 |
| Compare evidence pool: with vs without supplementary | Measure diversity improvement | ~$0.40-0.60 |

### 9.4 Calibration (Expensive, Captain-Approved Only)

| Test | Purpose | Cost |
|------|---------|------|
| C13 calibration re-run with supplementary providers | Measure evidence asymmetry improvement | ~$2-5 |
| Framing symmetry pairs with supplementary | Verify no bias introduced | ~$2-5 |

---

## 10. Success Metrics

| Metric | Current Baseline | Target (Tier 2) | How to Measure |
|--------|-----------------|------------------|----------------|
| **Evidence source categories** | 1 (web only) | 3 (web + encyclopedia + academic) | Count distinct provider sources in evidence pool |
| **C13 evidence asymmetry** | 8/10 calibration pairs | ≤ 5/10 pairs | Calibration gate run |
| **Mean directional skew** | 27.6pp | ≤ 20pp | Calibration gate run |
| **Academic evidence presence** | 0% of jobs | >30% of jobs (science/health claims) | Count EvidenceItems with S2 providerMetadata |
| **Wikipedia evidence presence** | 0% of jobs | >50% of jobs | Count EvidenceItems from wikipedia.org URLs |
| **Supplementary provider latency** | N/A | < 15s per claim | Time supplementary evidence gathering |
| **Evidence pool size increase** | Baseline | +20-40% (with quality maintained) | Compare total EvidenceItems with/without |
| **probativeValue distribution** | Baseline | No degradation (high/medium ratio ≥ baseline) | Evidence filter stats |

---

## 11. Open Questions for Review

### Architecture Decisions Requiring Captain/Reviewer Input

**Q1: Per-claim vs per-iteration supplementary execution?**
This document recommends per-claim (D1). The alternative (per-iteration, current behavior) is simpler but wastes S2 rate budget. Need Captain confirmation.

**Q2: Should we remove supplementary providers from `searchWebWithProvider()` entirely?**
If we move to per-claim orchestration in the pipeline, the supplementary provider loop in `web-search.ts` (lines 291-320) becomes dead code. Should we remove it (clean), keep it as fallback (safe), or make it configurable (flexible)?

**Q3: Tier selection — Option A, B, or C?**
This document recommends Option B (Tier 1 + 2). Option A is faster but provides less value. Option C is more complete but significantly more effort. Does the Captain agree with Option B?

**Q4: Semantic Scholar commercial license — proceed or wait?**
S2 is freely usable during pre-release. Should we integrate now and clarify the license in parallel, or wait for license clarification before investing in Tier 2/3 S2-specific features?

**Q5: Wikipedia reference extraction — Tier 3 or defer to backlog?**
Reference extraction (getting cited sources from Wikipedia articles) is the single highest-value Tier 3 feature. Should it be pulled into Tier 2, or is the deferred Tier 3 timeline acceptable?

**Q6: OpenAlex as S2 fallback — should we evaluate now?**
OpenAlex (open-source, 200M+ works, no license restrictions) is a viable alternative to Semantic Scholar. Should we evaluate it as a fallback or potential replacement before investing deeply in S2-specific features?

**Q7: Default state — enabled or disabled for new deployments?**
Currently all supplementary providers default to `enabled: false`. For new deployments (post-integration), should Wikipedia default to `enabled: true` since it's free and requires no API key? S2 should likely stay disabled-by-default since it benefits from an API key.

---

*End of concept document. Ready for review.*

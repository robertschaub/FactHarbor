# FactHarbor Source Reliability

**Version**: 1.0 (Implemented)  
**Status**: Operational  
**Last Updated**: 2026-01-21

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [How It Affects Verdicts](#how-it-affects-verdicts)
- [Configuration](#configuration)
- [Score Interpretation](#score-interpretation)
- [Admin Interface](#admin-interface)
- [Design Principles](#design-principles)
- [Implementation Details](#implementation-details)
- [Cost & Performance](#cost--performance)
- [Troubleshooting](#troubleshooting)
- [Test Coverage](#test-coverage)

---

## Overview

FactHarbor evaluates source reliability dynamically using LLM-powered assessment with multi-model consensus. Sources are evaluated on-demand and cached for 90 days.

| Aspect | Implementation |
|--------|----------------|
| **Evaluation** | Multi-model LLM consensus (Claude + GPT-4) |
| **Storage** | SQLite cache (`source-reliability.db`) |
| **Integration** | Batch prefetch + sync lookup (all 3 pipelines) |
| **Pipelines** | Orchestrated ✅, Canonical ✅, Dynamic ✅ |
| **Cost Control** | Importance filter + rate limiting |
| **Verdict Impact** | Evidence weighting adjusts truth percentages |

---

## Quick Start

### Prerequisites

```powershell
# In apps/web/.env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
FH_INTERNAL_RUNNER_KEY=your-secret-key-here
```

### That's It

The service is **enabled by default**. It will automatically:
- Prefetch source reliability before analyzing sources
- Use multi-model consensus (Claude + GPT-4)
- Cache results for 90 days
- Skip blog platforms and spam TLDs
- Apply evidence weighting to verdicts

### Verify It's Working

Run an analysis and check the logs for:
```
[SR] Prefetching 5 unique domains
[SR] Cache hits: 0/5
[SR] Evaluated reuters.com: score=0.95, confidence=0.92
```

---

## Architecture

### System Overview

```mermaid
flowchart TB
    subgraph analysis [FactHarbor Analysis Pipeline]
        AN[orchestrated.ts<br/>Analyzer]
        PF[prefetchSourceReliability<br/>Batch Prefetch]
        SR[source-reliability.ts<br/>Sync Lookup + Weighting]
    end
    
    subgraph cache [Source Reliability Cache]
        SQLITE[(SQLite<br/>source-reliability.db)]
        MAP[In-Memory Map<br/>prefetchedScores]
    end
    
    subgraph evaluation [LLM Evaluation - Internal Only]
        EVAL[/api/internal/evaluate-source]
        LLM1[Claude<br/>claude-3-haiku]
        LLM2[GPT-4<br/>gpt-4o-mini]
        CONS{Consensus<br/>Check}
    end
    
    AN -->|1. Extract URLs| PF
    PF -->|2. Batch lookup| SQLITE
    SQLITE -->|3. Cache hits| MAP
    PF -->|4. Cache miss| EVAL
    EVAL --> LLM1
    EVAL --> LLM2
    LLM1 --> CONS
    LLM2 --> CONS
    CONS -->|5. Store score| SQLITE
    CONS -->|6. Populate| MAP
    AN -->|7. Sync lookup| SR
    SR -->|8. Read from| MAP
    SR -->|9. Apply to| VERDICTS[Verdict Weighting]
```

### Integration Pattern: Batch Prefetch + Sync Lookup

The Source Reliability system uses a **two-phase pattern** to avoid async operations in the analyzer's hot path.

#### The Problem

The FactHarbor analyzer (`orchestrated.ts`) is a complex synchronous pipeline. Adding `await` calls mid-pipeline for source reliability lookups would:
- Require major refactoring (ripple async throughout call chain)
- Complicate error handling and control flow
- Risk introducing race conditions

#### The Solution: Two-Phase Pattern

Separate the async work (cache lookup, LLM calls) from the sync analysis:

| Phase | When | Nature | What It Does |
|-------|------|--------|--------------|
| **Phase 1: Prefetch** | Before analysis starts | Async | Batch lookup all source URLs, populate in-memory map |
| **Phase 2: Lookup** | During analysis | Sync | Read from pre-populated map (instant, no I/O) |
| **Phase 3: Weighting** | After verdicts generated | Sync | Adjust truth percentages based on source scores |

```mermaid
sequenceDiagram
    participant User
    participant Analyzer as orchestrated.ts
    participant Prefetch as prefetchSourceReliability()
    participant Cache as SQLite Cache
    participant LLM as LLM Endpoint
    participant Map as In-Memory Map
    participant Lookup as getTrackRecordScore()
    participant Weight as applyEvidenceWeighting()
    
    Note over User,Weight: PHASE 1: Async Prefetch (before source fetching)
    User->>Analyzer: Submit claim for analysis
    Analyzer->>Analyzer: Search for sources
    Analyzer->>Prefetch: await prefetchSourceReliability(urls)
    
    loop For each unique domain
        Prefetch->>Cache: Batch lookup
        alt Cache Hit
            Cache-->>Prefetch: Return cached score
            Prefetch->>Map: Store score
        else Cache Miss + Important Source
            Prefetch->>LLM: Evaluate source (internal API)
            LLM-->>Prefetch: Score + confidence
            Prefetch->>Cache: Save (TTL: 90 days)
            Prefetch->>Map: Store score
        else Cache Miss + Unimportant Source
            Prefetch->>Map: Store null
        end
    end
    
    Prefetch-->>Analyzer: Done
    
    Note over User,Weight: PHASE 2: Sync Lookup (during source fetching)
    loop For each source URL
        Analyzer->>Lookup: getTrackRecordScore(url)
        Lookup->>Map: Read from map
        Map-->>Lookup: Score or null
        Lookup-->>Analyzer: Return immediately (no I/O)
        Analyzer->>Analyzer: Assign trackRecordScore to FetchedSource
    end
    
    Note over User,Weight: PHASE 3: Evidence Weighting (after verdicts)
    Analyzer->>Weight: applyEvidenceWeighting(verdicts, facts, sources)
    Weight->>Weight: Calculate avg source score per verdict
    Weight->>Weight: Adjust truthPercentage and confidence
    Weight-->>Analyzer: Weighted verdicts
    
    Analyzer-->>User: Analysis complete
```

### Phase 1 Detail: Prefetch Flow

```mermaid
flowchart TD
    subgraph prefetch [Phase 1: Async Prefetch]
        URLS[Extract Source URLs] --> DEDUP[Deduplicate Domains]
        DEDUP --> BATCH[Batch Cache Lookup]
        BATCH --> LOOP{For Each Domain}
        LOOP --> HIT{Cache Hit?}
        HIT -->|Yes| MAP[Add to In-Memory Map]
        HIT -->|No| RATE{Rate Limit OK?}
        RATE -->|No| SKIP[Store null in Map]
        RATE -->|Yes| FILTER{isImportantSource?}
        FILTER -->|Blog/Spam TLD| SKIP
        FILTER -->|Legitimate| LLM[Multi-Model LLM<br/>Internal API Only]
        LLM --> CONF{Confidence ≥ 0.8?}
        CONF -->|No| SKIP
        CONF -->|Yes| CONS{Models Agree?<br/>Diff ≤ 0.15}
        CONS -->|No| SKIP
        CONS -->|Yes| SAVE[Cache + Add to Map]
    end
    
    style RATE fill:#f99
    style FILTER fill:#ff9
    style SKIP fill:#ddd
    style SAVE fill:#9f9
```

### Why This Pattern Works

| Concern | How Pattern Addresses It |
|---------|-------------------------|
| **No async ripple** | Only ONE `await` at pipeline boundary, rest stays sync |
| **Batch efficiency** | Single batch cache lookup instead of N individual calls |
| **LLM cost control** | Filter + rate limit applied during prefetch |
| **Graceful degradation** | Unknown sources get `null`, analysis continues |
| **No blocking** | Sync lookups are instant map reads |

---

## How It Affects Verdicts

Source reliability scores directly influence verdict calculations through **evidence weighting**.

### Formula

```
adjustedTruth = 50 + (originalTruth - 50) × avgSourceScore
adjustedConfidence = confidence × (0.5 + avgSourceScore / 2)
```

### Effect on Verdicts (7-Band Scale)

| Source Credibility Band | Score (Weight) | Effect on Verdict |
|------------------------|------------------|-------------------|
| **Highly Reliable (0.86+)** | ~95-100% | Verdict fully preserved |
| **Reliable (0.72-0.86)** | ~75-90% | Verdict mostly preserved |
| **Generally Reliable (0.58-0.72)** | ~60-75% | Moderate preservation |
| **Mixed (0.43-0.57)** | ~40-60% | Variable track record (neutral center) |
| **Generally Unreliable (0.29-0.43)** | ~30-45% | Pulls toward neutral |
| **Unreliable (0.15-0.29)** | ~15-30% | Strong pull toward neutral |
| **Highly Unreliable (0.00-0.15)** | ~0-15% | Maximum skepticism |
| **Unknown (null)** | 50% | Uses default score (neutral) |

### Example

```
Original verdict: 80% (Strong True)
Source credibility: 0.5 (Mixed - variable track record)

Adjusted = 50 + (80 - 50) × 0.5
         = 50 + 30 × 0.5
         = 50 + 15
         = 65% (Leaning True)
```

### Multi-Source Averaging

When a verdict has evidence from multiple sources:

```
Verdict with facts from:
  - reuters.com (score: 0.95)
  - bbc.com (score: 0.88)
  
Average score = (0.95 + 0.88) / 2 = 0.915
```

---

## Configuration

All configuration is via environment variables (`apps/web/.env.local`):

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `FH_SR_ENABLED` | `true` | Enable/disable source reliability |
| `FH_SR_MULTI_MODEL` | `true` | Use multi-model consensus |
| `FH_SR_CONFIDENCE_THRESHOLD` | `0.8` | Min LLM confidence to accept score |
| `FH_SR_CONSENSUS_THRESHOLD` | `0.15` | Max score difference between models |
| `FH_SR_DEFAULT_SCORE` | `0.5` | Default score for unknown sources (0.5 = neutral center) |

**Note (POC)**: Some admin tooling may still default to a lower threshold if `FH_SR_CONFIDENCE_THRESHOLD` is unset. For consistent behavior, set `FH_SR_CONFIDENCE_THRESHOLD` explicitly in `apps/web/.env.local`.

### Cache Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `FH_SR_CACHE_PATH` | `./source-reliability.db` | SQLite database location |
| `FH_SR_CACHE_TTL_DAYS` | `90` | Cache expiration in days |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `FH_SR_RATE_LIMIT_PER_IP` | `10` | Max evaluations per minute per IP |
| `FH_SR_RATE_LIMIT_DOMAIN_COOLDOWN` | `60` | Seconds between same-domain evals |

### Importance Filter

| Variable | Default | Description |
|----------|---------|-------------|
| `FH_SR_FILTER_ENABLED` | `true` | Enable importance filter |
| `FH_SR_SKIP_PLATFORMS` | *(see below)* | Platforms to skip (comma-separated) |
| `FH_SR_SKIP_TLDS` | *(see below)* | TLDs to skip (comma-separated) |

**Default skip platforms**: `blogspot.,wordpress.com,medium.com,substack.com,tumblr.com,wix.com,weebly.com,squarespace.com,ghost.io,blogger.com,sites.google.com,github.io,netlify.app,vercel.app,herokuapp.com`

**Default skip TLDs**: `xyz,top,club,icu,buzz,tk,ml,ga,cf,gq,work,click,link,win,download,stream`

### Evaluator Evidence Grounding (POC)

These settings affect the internal evaluation endpoint (`/api/internal/evaluate-source`):

| Variable | Default | Description |
|----------|---------|-------------|
| `FH_SR_EVAL_USE_SEARCH` | `true` | If `true` and a search provider is configured, build an evidence pack from web search and inject it into the evaluation prompt |
| `FH_SR_EVAL_MAX_EVIDENCE_ITEMS` | `6` | Max number of evidence-pack items to include in the prompt (POC default) |
| `FH_SR_EVAL_SEARCH_MAX_RESULTS_PER_QUERY` | `3` | Max search results per query when building the evidence pack (POC default) |
| `FH_SR_EVAL_SEARCH_DATE_RESTRICT` | *(unset)* | Optional: `y` \| `m` \| `w` (falls back to `FH_SEARCH_DATE_RESTRICT` if set) |

**POC query set (cost-efficient)**:
The evaluator builds an evidence pack using a small query set and stops early once enough evidence items are collected:
- `<brand?> "<domain>" fact check reliability`
- `<brand?> "<domain>" bias rating credibility`
- `<brand?> "<domain>" misinformation moderation fact check`

Where `<brand?>` is an optional heuristic token derived from the domain; it is omitted when too short/ambiguous (e.g., very short brands). The domain is always included as a quoted token.

**Relevance filter (POC)**:
Search results are filtered to reduce noise: we only keep evidence-pack items that mention the domain/brand in the title/snippet/URL, or whose URL host matches the domain (or subdomain).

### Example Configurations

```bash
# Disable multi-model (faster, cheaper)
FH_SR_MULTI_MODEL=false

# Lower confidence threshold
FH_SR_CONFIDENCE_THRESHOLD=0.7

# Evaluate ALL sources (disable filter)
FH_SR_FILTER_ENABLED=false

# Add custom platforms to skip
FH_SR_SKIP_PLATFORMS=blogspot.,wordpress.com,medium.com,custom-blog.com
```

---

## Score Interpretation

**7-band credibility scale (centered at 0.5)**

| Score | Rating | Key Criteria |
|-------|--------|--------------|
| 0.86-1.00 | Highly Reliable | Verified accuracy, recognized standards body, rigorous corrections |
| 0.72-0.85 | Reliable | Consistent accuracy, professional standards, rarely faulted |
| 0.58-0.71 | Generally Reliable | Often accurate, occasional errors, corrects when notified |
| 0.43-0.57 | Mixed | Variable accuracy OR inconsistent quality by topic/author |
| 0.29-0.42 | Generally Unreliable | Often inaccurate OR bias significantly affects reporting |
| 0.15-0.28 | Unreliable | Pattern of false claims OR ignores corrections |
| 0.00-0.14 | Highly Unreliable | Fabricates content OR documented disinformation source |

**Calibration:**
- Default assumption is 0.5 (mixed). Adjust up or down based on evidence.
- Do not inflate scores based on brand recognition or reputation alone.
- "No negative findings" ≠ reliable. Absence of evidence lowers confidence; truly unknown sources should use insufficient_data.

**Negative-side calibration (POC intent):**
- **platform_ugc**: if a domain is primarily an open UGC platform without centralized editorial verification, it should generally land **below the mixed band** unless evidence shows consistent domain-level verification and corrections.
- **state_controlled_media**: if evidence indicates editorial coordination/control, default below mixed unless evidence shows meaningful editorial independence and correction practices.
- **propaganda_outlet / known_disinformation**: if evidence indicates repeated independent debunks / multiple independent assessors flagging systemic misinformation, score should land in **0.00–0.20** even if occasional factual content exists.

**Weighting Rules (applied during evaluation):**
1. **Recency Priority**: Last 24 months matter most. Historical reputation does not excuse recent failures.
2. **Verification**: Fact-checker findings are strong reliability signals.
3. **Visibility Cap**: Score capped by worst high-visibility failures.
4. **Opinion Counts**: Misinformation in opinion/editorial degrades entire source score.
5. **Bias Impact**: Bias affecting accuracy lowers score. Bias without factual issues is noted, not penalized.

**Bias Assessment:**
- Political spectrum: far_left | left | center_left | center | center_right | right | far_right
- Other bias types: pro_government | anti_government | corporate_interest | sensationalist | ideological_other

**Insufficient Data:**
- Sources with no independent assessments return `score: null` with `factualRating: insufficient_data`

**Impact on verdicts:**
- Score >= 0.58: Preserves original verdict (credible source)
- Score 0.43-0.57: Moderate pull toward neutral (mixed track record)
- Score < 0.43: Strong pull toward neutral (skepticism)

---

## Admin Interface

Access the Source Reliability admin page at: `/admin/source-reliability`

### Features

- **Cache Statistics**: Total entries, average scores, expired count
- **Paginated Table**: View all cached scores with sorting
- **Cleanup**: Remove expired entries
- **Authentication**: Requires `FH_ADMIN_KEY` in production

### Admin Tasks (~15 min/week)

| Task | Time | Frequency |
|------|------|-----------|
| Check LLM cost dashboard | 5 min | Weekly |
| Spot-check 2-3 recent scores | 8 min | Weekly |
| Review any flagged issues | 2 min | Weekly |

---

## Design Principles

### Evidence Over Authority

Source credibility is **supplementary**, not primary:

- Only evidence and counter-evidence matter - not who says it
- Authority does NOT automatically give weight
- A low-credibility source with documented evidence should be considered
- A high-credibility source making unsupported claims should be questioned

### No Pre-seeded Data

All sources are evaluated identically by LLM:
- No hardcoded scores or external rating databases
- No manipulation concerns from third-party data
- Full transparency - every score comes from LLM evaluation

### No Categorical Bias

Per review feedback, the system avoids categorical assumptions:
- Domain type (.gov, .edu, .org) does NOT imply quality
- Scores derived from demonstrated track record, not institutional prestige
- Editorial independence matters - state control is a negative factor

### Dynamic Assessment

- Sources can gain or lose credibility over time
- Cache expires after 90 days (configurable)
- Re-evaluation happens automatically on cache miss

### Score Scale Contract

**Canonical scale: 0.0-1.0, 7-band credibility scale**

| Score Range | Rating | Meaning |
|-------------|--------|---------|
| 0.86-1.00 | highly_reliable | Verified accuracy, recognized standards body |
| 0.72-0.85 | reliable | Consistent accuracy, professional standards |
| 0.58-0.71 | generally_reliable | Often accurate, occasional errors |
| 0.43-0.57 | mixed | Variable accuracy, inconsistent quality |
| 0.29-0.42 | generally_unreliable | Often inaccurate, bias affects reporting |
| 0.15-0.28 | unreliable | Pattern of false claims, ignores corrections |
| 0.00-0.14 | highly_unreliable | Fabricates content, documented disinformation |

**Key properties:**
- **7 bands** for source credibility assessment
- **0.5 = exact center** of the mixed band (0.43-0.57)
- Above 0.58 = positive boost to verdict preservation
- 0.43-0.57 = neutral zone (known sources with variable track record)
- Below 0.43 = pulls verdict toward neutral (skepticism)
- All stored scores use decimal 0.0-1.0
- Defensive normalization handles 0-100 scale inputs

---

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analyzer/source-reliability.ts` | Prefetch, sync lookup, evidence weighting |
| `apps/web/src/lib/source-reliability-cache.ts` | SQLite cache operations |
| `apps/web/src/app/api/internal/evaluate-source/route.ts` | LLM evaluation endpoint |
| `apps/web/src/app/admin/source-reliability/page.tsx` | Admin UI for cache management |
| `apps/web/src/app/api/admin/source-reliability/route.ts` | Admin API endpoint |

### Key Functions

```typescript
// Phase 1: Call ONCE before analysis (async)
export async function prefetchSourceReliability(urls: string[]): Promise<PrefetchResult>;
interface PrefetchResult {
  prefetched: number;
  alreadyPrefetched: number;
  cacheHits: number;
  evaluated: number;
  skipped: number;
}

// Phase 2: Call MANY times during analysis (sync, instant)
export function getTrackRecordScore(url: string): number | null;
export function getTrackRecordData(url: string): CachedReliabilityData | null;
interface CachedReliabilityData {
  score: number;
  confidence: number;
  consensusAchieved: boolean;
}

// Phase 3: Apply to verdicts (sync)
export function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  facts: ExtractedFact[],
  sources: FetchedSource[]
): ClaimVerdict[];

// Effective weight calculation (used by monolithic pipelines)
export function calculateEffectiveWeight(data: SourceReliabilityData): number;
interface SourceReliabilityData {
  score: number;
  confidence: number;
  consensusAchieved: boolean;
}

// Utilities
export function extractDomain(url: string): string | null;
export function isImportantSource(domain: string): boolean;
export function normalizeTrackRecordScore(score: number): number;
export function clampTruthPercentage(value: number): number;
export function clearPrefetchedScores(): void;

// Configuration
export const DEFAULT_UNKNOWN_SOURCE_SCORE: number; // 0.5 by default (neutral center)
export const SR_CONFIG: SourceReliabilityConfig;
```

### Temporal Awareness (v2.6.35+)

The LLM evaluation prompt includes the current date and temporal guidance to ensure assessments reflect **recent** source performance:

```typescript
CURRENT DATE: ${currentDate}

TEMPORAL AWARENESS (IMPORTANT):
- Source reliability can change over time due to ownership changes, editorial shifts, or political transitions
- Government sites (e.g., whitehouse.gov, state departments) may vary in reliability across administrations  
- News organizations can improve or decline in quality over time
- Base your assessment on the source's RECENT track record (last 1-2 years when possible)
- If a source has undergone recent changes, factor that into your assessment
```

**Why This Matters**:
- **Government sources** vary by administration (e.g., transparency changes across presidencies)
- **Media outlets** can shift with ownership or editorial changes
- **Historical reputation** may not reflect current performance
- **Time-sensitive evaluations** prevent outdated assessments

**Cache TTL enforces freshness**: 90-day default means scores are re-evaluated quarterly, capturing significant changes in source reliability over time.

### Pipeline Integration

Source Reliability is integrated into all three FactHarbor analysis pipelines:

| Pipeline | File | Status | Implementation |
|----------|------|--------|----------------|
| **Orchestrated** | `orchestrated.ts` | ✅ Full | Prefetch + lookup + evidence weighting |
| **Monolithic Canonical** | `monolithic-canonical.ts` | ✅ Full | Prefetch + lookup + verdict adjustment |
| **Monolithic Dynamic** | `monolithic-dynamic.ts` | ✅ Full | Prefetch + lookup + verdict adjustment |

All pipelines follow the same pattern:
1. **Clear** prefetched scores at analysis start
2. **Prefetch** source reliability before fetching URLs
3. **Lookup** scores synchronously when creating sources
4. **Apply** weighting to verdicts

### Integration Points: Orchestrated Pipeline

```typescript
// In orchestrated.ts - runFactHarborAnalysis()

// 1. Clear at start of analysis
clearPrefetchedScores();

// 2. After search, before fetching sources
const urlsToFetch = searchResults.map(r => r.url);
await prefetchSourceReliability(urlsToFetch);

// 3. During fetchSource() - sync lookup
const trackRecord = getTrackRecordScore(url);
const source: FetchedSource = {
  // ...
  trackRecordScore: trackRecord,
};

// 4. After generating verdicts
const weightedVerdicts = applyEvidenceWeighting(
  claimVerdicts,
  state.facts,
  state.sources
);
```

### Integration Points: Monolithic Pipelines

Both `monolithic-canonical.ts` and `monolithic-dynamic.ts` use the same integration pattern with slight differences:

```typescript
// In monolithic-canonical.ts / monolithic-dynamic.ts

// 1. Clear at start of analysis
clearPrefetchedScores();

// 2. Before each fetch batch, prefetch reliability
if (SR_CONFIG.enabled && urlsToFetch.length > 0) {
  await prefetchSourceReliability(urlsToFetch.map(r => r.url));
}

// 3. When creating source objects, include reliability data
const reliabilityData = getTrackRecordData(result.url);
sources.push({
  // ...
  trackRecordScore: reliabilityData?.score ?? null,
  trackRecordConfidence: reliabilityData?.confidence ?? null,
  trackRecordConsensus: reliabilityData?.consensusAchieved ?? null,
});

// 4. Apply score as weight to verdicts
const avgSourceScore = sources.reduce((sum, s) => sum + s.trackRecordScore, 0) / sources.length;
const adjustedVerdict = Math.round(50 + (v.verdict - 50) * avgSourceScore);
const adjustedConfidence = Math.round(v.confidence * (0.5 + avgSourceScore / 2));
```

### Score = Weight

With the 7-band scale, the LLM score directly represents reliability and is used as-is:

```typescript
function calculateEffectiveWeight(data: SourceReliabilityData): number {
  // Simple: score IS the weight
  // Confidence already filtered out low-quality evaluations (threshold gate)
  return data.score;
}
```

| Component | Purpose |
|-----------|---------|
| **Score** | LLM-evaluated reliability (7-band scale) - used directly as weight |
| **Confidence** | Quality gate (threshold: 65%) - scores below are rejected |
| **Consensus** | Multi-model agreement (Claude + GPT-4 within 15%) |

**Key Design Decisions**:
- **Score = Weight** - No transformation, what LLM says is what we use
- **Confidence is a gate, not a modifier** - If evaluation passes threshold, we trust it
- **Transparency** - A 70% score means 70% weight, no hidden calculations

**Examples:**
- Reuters (95% score): 95% weight
- Fox Business (67% score): 67% weight
- xinhuanet.com (27% score): 27% weight
- Unknown source (50% default): 50% weight (neutral)

### Unknown Source Handling

Sources not in the cache are assigned a default score:

| Variable | Default | Purpose |
|----------|---------|---------|
| `FH_SR_DEFAULT_SCORE` | `0.5` | Score assigned to unknown sources (neutral center) |

This results in 50% weight (neutral), applying appropriate skepticism to unverified sources while not completely discounting their evidence.

### Multi-Model Consensus

When `FH_SR_MULTI_MODEL=true` (default):

1. Build an optional **evidence pack** (web search results) if `FH_SR_EVAL_USE_SEARCH=true` and a search provider is configured
2. Both Claude and GPT evaluate the source using the same evidence pack
3. Primary must return confidence ≥ threshold; secondary must return a non-null score (if secondary fails, fallback to primary with reduced confidence)
4. Score difference must be ≤ `FH_SR_CONSENSUS_THRESHOLD` (0.15)
5. Final score = **“better founded”** model output (more grounded citations/recency to the evidence pack); tie-breaker = **lower score** (skeptical default)
6. If consensus fails → return `null` (unknown reliability)

```typescript
// Simplified consensus logic (POC)
const evidencePack = await buildEvidencePack(domain);
const claude = await evaluateWithModel(domain, "anthropic", evidencePack);
const gpt = await evaluateWithModel(domain, "openai", evidencePack);

if (!claude || !gpt) return null;

const scoreDiff = Math.abs(claude.score - gpt.score);
if (scoreDiff > consensusThreshold) return null;

// Choose "better founded" output; tie-breaker lower score
const chosen =
  gpt.foundedness > claude.foundedness ? gpt :
  claude.foundedness > gpt.foundedness ? claude :
  (Math.min(claude.score, gpt.score) === claude.score ? claude : gpt);

return { score: chosen.score, confidence: (claude.confidence + gpt.confidence) / 2 };
```

---

## Cost & Performance

### Cost Estimates

| Mode | Monthly Cost |
|------|--------------|
| Multi-model (default) | $40-60 |
| Single-model | $20-30 |

The importance filter saves ~60% of LLM costs by skipping blog platforms and spam domains.

### Success Metrics

| Metric | Target |
|--------|--------|
| Cache hit rate (warm) | > 80% |
| Blog skip rate | > 90% |
| Confidence pass rate | > 85% |
| Consensus rate | > 90% |

### Rollback Options

| Issue | Action |
|-------|--------|
| LLM costs too high | Set `FH_SR_MULTI_MODEL=false` |
| Still too expensive | Set `FH_SR_ENABLED=false` |
| Too many hallucinations | Raise `FH_SR_CONFIDENCE_THRESHOLD` to 0.9 |
| Low consensus rate | Lower `FH_SR_CONSENSUS_THRESHOLD` to 0.20 |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" from evaluate endpoint | Set `FH_INTERNAL_RUNNER_KEY` in `.env.local` |
| No scores appearing | Verify `FH_SR_ENABLED=true` (default) |
| Low-confidence evaluations (shown as score N/A) | Ensure a search provider is configured so the evidence pack is populated; otherwise evaluations may return `insufficient_data` |
| High LLM costs | Enable filter, use single model (`FH_SR_MULTI_MODEL=false`) |
| Consensus failures | Lower `FH_SR_CONSENSUS_THRESHOLD` (default 0.15) |
| Score not affecting verdict | Check `applyEvidenceWeighting` is called, verify `trackRecordScore` on sources |
| Admin page shows 401 | Enter admin key in the auth form, or set `FH_ADMIN_KEY` in env |

---

## Test Coverage

The Source Reliability system has comprehensive test coverage:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `source-reliability.test.ts` | 42 | Domain extraction, importance filter, evidence weighting |
| `source-reliability-cache.test.ts` | 16 | SQLite operations, pagination, expiration |
| `source-reliability.integration.test.ts` | 13 | End-to-end pipeline flow |
| `evaluate-source.test.ts` | 19 | Rate limiting, consensus calculation |
| **Total** | **90** | |

Run tests:
```bash
cd apps/web && npm test -- src/lib/analyzer/source-reliability.test.ts
cd apps/web && npm test -- src/lib/source-reliability-cache.test.ts
cd apps/web && npm test -- src/lib/analyzer/source-reliability.integration.test.ts
cd apps/web && npm test -- src/app/api/internal/evaluate-source/evaluate-source.test.ts
```

---

## Historical Documentation

For the original architecture proposal and review history, see:
- [Source_Reliability_Service_Proposal.md](../ARCHIVE/Source_Reliability_Service_Proposal.md) (archived)
- [Review documents](../ARCHIVE/) (archived)

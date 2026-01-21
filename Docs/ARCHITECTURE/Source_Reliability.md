# FactHarbor Source Reliability

**Version**: 1.0 (Implemented)  
**Status**: Operational  
**Last Updated**: 2026-01-21

---

## Overview

FactHarbor evaluates source reliability dynamically using LLM-powered assessment with multi-model consensus. Sources are evaluated on-demand and cached for 90 days.

| Aspect | Implementation |
|--------|----------------|
| **Evaluation** | Multi-model LLM consensus (Claude + GPT-4) |
| **Storage** | SQLite cache (`source-reliability.db`) |
| **Integration** | Batch prefetch + sync lookup |
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

## How It Affects Verdicts

Source reliability scores directly influence verdict calculations through **evidence weighting**.

### Formula

```
adjustedTruth = 50 + (originalTruth - 50) × avgSourceScore
adjustedConfidence = confidence × (0.5 + avgSourceScore / 2)
```

### Effect on Verdicts

| Source Reliability | Effect on Verdict |
|-------------------|-------------------|
| **High (0.9)** | Truth stays close to original (±5%) |
| **Medium (0.7)** | Truth pulled toward neutral (±15%) |
| **Low (0.3)** | Truth pulled strongly toward neutral (±35%) |
| **Unknown (null)** | Verdict unchanged |

### Example

```
Original verdict: 80% (Strong True)
Source reliability: 0.5 (Mixed)

Adjusted = 50 + (80 - 50) × 0.5
         = 50 + 30 × 0.5
         = 50 + 15
         = 65% (Leaning True)
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

### Example Configuration

```bash
# Disable multi-model (faster, cheaper)
FH_SR_MULTI_MODEL=false

# Lower confidence threshold
FH_SR_CONFIDENCE_THRESHOLD=0.7

# Evaluate ALL sources (disable filter)
FH_SR_FILTER_ENABLED=false
```

---

## Score Interpretation

| Score | Rating | Examples |
|-------|--------|----------|
| 0.90-0.99 | Very High | Reuters, AP, FactCheck.org |
| 0.80-0.89 | High | BBC, NPR, Economist |
| 0.70-0.79 | Mostly Factual | Generally reliable with occasional issues |
| 0.50-0.69 | Mixed | Verify claims independently |
| 0.30-0.49 | Low | Frequently misleading |
| 0.05-0.29 | Very Low | Conspiracy, fake news |

---

## Architecture

### Integration Pattern: Batch Prefetch + Sync Lookup

The Source Reliability system uses a two-phase pattern to avoid async operations in the analyzer's hot path:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Async Prefetch (before analysis)                                   │
│ ┌─────────────┐    ┌─────────┐    ┌─────────────────┐                       │
│ │ Extract URLs│───►│ Cache   │───►│ LLM Evaluation  │                       │
│ └─────────────┘    │ Lookup  │    │ (cache misses)  │                       │
│                    └─────────┘    └─────────────────┘                       │
│                          │                  │                               │
│                          ▼                  ▼                               │
│                    ┌─────────────────────────────┐                          │
│                    │    In-Memory Map            │                          │
│                    └─────────────────────────────┘                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Sync Lookup (during analysis)                                      │
│ ┌─────────────┐    ┌─────────────────────────────┐                          │
│ │ getTrack    │───►│    In-Memory Map            │                          │
│ │ RecordScore │    │    (instant read)           │                          │
│ └─────────────┘    └─────────────────────────────┘                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Evidence Weighting (after verdicts generated)                      │
│ ┌─────────────┐    ┌─────────────────────────────┐                          │
│ │ applyEvid   │───►│ Adjust truth percentages    │                          │
│ │ enceWeight  │    │ based on source scores      │                          │
│ └─────────────┘    └─────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Pattern?

| Concern | How Pattern Addresses It |
|---------|-------------------------|
| **No async ripple** | Only ONE `await` at pipeline boundary, rest stays sync |
| **Batch efficiency** | Single batch cache lookup instead of N individual calls |
| **LLM cost control** | Filter + rate limit applied during prefetch |
| **Graceful degradation** | Unknown sources get `null`, analysis continues |
| **No blocking** | Sync lookups are instant map reads |

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
export async function prefetchSourceReliability(urls: string[]): Promise<void>;

// Phase 2: Call MANY times during analysis (sync, instant)
export function getTrackRecordScore(url: string): number | null;

// Phase 3: Apply to verdicts (sync)
export function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  facts: ExtractedFact[],
  sources: FetchedSource[]
): ClaimVerdict[];

// Utilities
export function extractDomain(url: string): string | null;
export function isImportantSource(domain: string): boolean;
export function normalizeTrackRecordScore(score: number): number;
export function clampTruthPercentage(value: number): number;
```

---

## Admin Interface

Access the Source Reliability admin page at: `/admin/source-reliability`

### Features

- **Cache Statistics**: Total entries, average scores, expired count
- **Paginated Table**: View all cached scores with sorting
- **Cleanup**: Remove expired entries

### Admin Tasks (~15 min/week)

| Task | Time | Frequency |
|------|------|-----------|
| Check LLM cost dashboard | 5 min | Weekly |
| Spot-check 2-3 recent scores | 8 min | Weekly |
| Review any flagged issues | 2 min | Weekly |

---

## Cost Estimates

| Mode | Monthly Cost |
|------|--------------|
| Multi-model (default) | $40-60 |
| Single-model | $20-30 |

The importance filter saves ~60% of LLM costs by skipping blog platforms and spam domains.

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

### Dynamic Assessment

- Sources can gain or lose credibility over time
- Cache expires after 90 days (configurable)
- Re-evaluation happens automatically on cache miss

### Score Scale Contract

**Canonical scale: 0.0-1.0 everywhere**

- All stored scores use decimal 0.0-1.0
- API responses use 0.0-1.0
- In-memory caches use 0.0-1.0
- Defensive normalization handles 0-100 scale inputs

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" from evaluate endpoint | Set `FH_INTERNAL_RUNNER_KEY` in `.env.local` |
| No scores appearing | Verify `FH_SR_ENABLED=true` (default) |
| All sources returning null | Check API keys, lower `FH_SR_CONFIDENCE_THRESHOLD` |
| High LLM costs | Enable filter, use single model (`FH_SR_MULTI_MODEL=false`) |
| Consensus failures | Lower `FH_SR_CONSENSUS_THRESHOLD` (default 0.15) |
| Score not affecting verdict | Check `applyEvidenceWeighting` is called, verify `trackRecordScore` on sources |

---

## Test Coverage

The Source Reliability system has comprehensive test coverage:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `source-reliability.test.ts` | 42 | Domain extraction, importance filter, evidence weighting |
| `source-reliability-cache.test.ts` | 16 | SQLite operations, pagination, expiration |

Run tests:
```bash
cd apps/web && npm test -- src/lib/analyzer/source-reliability.test.ts
cd apps/web && npm test -- src/lib/source-reliability-cache.test.ts
```

---

## Historical Documentation

For the original architecture proposal and review history, see:
- [Source_Reliability_Service_Proposal.md](../ARCHIVE/Source_Reliability_Service_Proposal.md) (archived)
- [Review documents](../ARCHIVE/) (archived)

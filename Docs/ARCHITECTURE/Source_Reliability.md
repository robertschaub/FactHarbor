# FactHarbor Source Reliability

## Overview

FactHarbor evaluates source reliability dynamically using LLM-powered assessment with multi-model consensus. Sources are evaluated on-demand and cached for 90 days.

| Aspect | Implementation |
|--------|----------------|
| **Evaluation** | Multi-model LLM consensus (Claude + GPT-4) |
| **Storage** | SQLite cache (`source-reliability.db`) |
| **Integration** | Batch prefetch + sync lookup |
| **Cost Control** | Importance filter + rate limiting |

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

### Verify It's Working

Run an analysis and check the logs for:
```
[SR] Prefetching 5 unique domains
[SR] Cache hits: 0/5
[SR] Evaluated reuters.com: score=0.95, confidence=0.92
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
| `FH_SR_SKIP_PLATFORMS` | (see below) | Platforms to skip (comma-separated) |
| `FH_SR_SKIP_TLDS` | (see below) | TLDs to skip (comma-separated) |

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

## Cost Estimates

| Mode | Monthly Cost |
|------|--------------|
| Multi-model (default) | $40-60 |
| Single-model | $20-30 |

The importance filter saves ~60% of LLM costs by skipping blog platforms and spam domains.

---

## Admin Tasks (~15 min/week)

1. **Spot-check cache**: Review cached scores for accuracy
2. **Monitor logs**: Check for consensus failures
3. **Optional cleanup**: Expired entries are automatically ignored

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

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" from evaluate endpoint | Set `FH_INTERNAL_RUNNER_KEY` in `.env.local` |
| No scores appearing | Verify `FH_SR_ENABLED=true` (default) |
| All sources returning null | Check API keys, lower `FH_SR_CONFIDENCE_THRESHOLD` |
| High LLM costs | Enable filter, use single model (`FH_SR_MULTI_MODEL=false`) |
| Consensus failures | Lower `FH_SR_CONSENSUS_THRESHOLD` (default 0.15) |

---

## Architecture

See [Source_Reliability_Service_Proposal.md](Source_Reliability_Service_Proposal.md) for detailed architecture documentation.

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analyzer/source-reliability.ts` | Prefetch + sync lookup |
| `apps/web/src/lib/source-reliability-cache.ts` | SQLite cache |
| `apps/web/src/app/api/internal/evaluate-source/route.ts` | LLM evaluation endpoint |

### Integration Pattern

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Async Prefetch (before analysis)              │
│ ┌─────────────┐    ┌─────────┐    ┌─────────────────┐  │
│ │ Extract URLs│───▶│ Cache   │───▶│ LLM Evaluation  │  │
│ └─────────────┘    │ Lookup  │    │ (cache misses)  │  │
│                    └─────────┘    └─────────────────┘  │
│                          │                  │          │
│                          ▼                  ▼          │
│                    ┌─────────────────────────────┐     │
│                    │    In-Memory Map            │     │
│                    └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Phase 2: Sync Lookup (during analysis)                 │
│ ┌─────────────┐    ┌─────────────────────────────┐     │
│ │ getTrack    │───▶│    In-Memory Map            │     │
│ │ RecordScore │    │    (instant read)           │     │
│ └─────────────┘    └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

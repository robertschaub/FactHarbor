# Source Reliability: Overview and Quick Start

**User-facing name**: [Media Source Database](../../../../../media-source-database/index.md) **Version**: 1.4 (Multi-Language Support) **Status**: Operational **Last Updated**: 2026-02-03 (v2.6.41)

------------------------------------------------------------------------

## Overview

FactHarbor evaluates source reliability dynamically using LLM-powered assessment with **sequential refinement** and **multi-language support**. The primary model (Claude) performs initial evaluation, then a secondary OpenAI model (default: `gpt-4o-mini`) cross-checks and refines the result. For non-English sources, the system detects the publication language and searches for regional fact-checker assessments. Sources are evaluated on-demand and cached for 90 days.

| Aspect | Implementation |
|----|----|
| **Evaluation** | Sequential LLM refinement (Claude -\> OpenAI mini model cross-check) |
| **Storage** | SQLite cache (`source-reliability.db`) |
| **Integration** | Batch prefetch + sync lookup (both pipelines) |
| **Pipelines** | ClaimAssessmentBoundary, Monolithic Dynamic |
| **Cost Control** | Importance filter + rate limiting |
| **Verdict Impact** | Evidence weighting adjusts truth percentages |

------------------------------------------------------------------------

## Quick Start

### Prerequisites

```
# In apps/web/.env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
FH_INTERNAL_RUNNER_KEY=your-secret-key-here
```

<span id="that-s-it"></span>

### That's It

The service is **enabled by default**. It will automatically:

-   Prefetch source reliability before analyzing sources
-   Use multi-model refinement (Claude + OpenAI mini model, default `gpt-4o-mini`)
-   Cache results for 90 days
-   Skip blog platforms and spam TLDs
-   Apply evidence weighting to verdicts

<span id="verify-it-s-working"></span>

### Verify It's Working

Run an analysis and check the logs for:

```
[SR] Prefetching 5 unique domains
[SR] Cache hits: 0/5
[SR] Evaluated reuters.com: score=0.95, confidence=0.92
```

------------------------------------------------------------------------

**Navigation:** [Source Reliability](../index.md) \| Next: [Architecture and Verdicts](../architecture-and-verdicts/index.md)

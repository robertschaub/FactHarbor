# Claude API Cost Reduction Strategy

**Date**: 2026-02-13
**Status**: Draft — Awaiting review
**Scope**: Anthropic API spend reduction via pricing plans, provider alternatives, NPO/OSS programs, and pipeline configuration
**Related**: [LLM_Call_Optimization_Goals_Proposal.md](LLM_Call_Optimization_Goals_Proposal.md) (pipeline-level code optimizations)

---

## 1) Problem Statement

FactHarbor's Anthropic API spend reached **$340.66 in 13 days** (Feb 1-13, 2026), exhausting prepaid credits. At this rate, monthly cost is **~$500-800/month** during active development and testing. This is unsustainable for a pre-release open-source NPO project.

### Current Spend Breakdown (from Anthropic Console)

| Model | Role in Pipeline | Approx. Cost Share |
|-------|------------------|--------------------|
| Claude Opus 4.6 | Verdicts, direction validation, context refinement | ~60-65% (~$220) |
| Claude Sonnet 4.5 | Some earlier runs / testing | ~20-25% (~$75) |
| Claude Haiku 4.5 | Evidence extraction, claim understanding, utilities | ~10-15% (~$45) |

### Per-Analysis Cost Profile

A typical single analysis makes **40-60 LLM calls** consuming ~400K tokens (~$1.20):

| Phase | Model | Calls | Tokens/Call | Total Tokens | Cost Share |
|-------|-------|------:|------------|-------------|-----------|
| Evidence Extraction | Haiku 4.5 | 30-40 | 6K-8K | 180K-320K | ~50% |
| Verdict Generation | Opus 4.6 | 3-6 | 10K-20K | 30K-120K | ~29% |
| Claim Understanding | Haiku 4.5 | 5-10 | 2.5K-4K | 20K-40K | ~13% |
| Utilities (similarity, relevance, direction) | Mixed | 5-10 | 1.5K-4K | 10K-30K | ~8% |
| **Total** | **Mixed** | **40-60** | **avg ~8K** | **~400K** | **~$1.20** |

---

## 2) Current API Pricing (Anthropic Direct, Pay-As-You-Go)

Per million tokens (MTok), USD:

| Model | Input | Output | Notes |
|-------|------:|-------:|-------|
| Claude Haiku 4.5 | $1.00 | $5.00 | Used for extraction + understanding |
| Claude Sonnet 4.5 | $3.00 | $15.00 | Available but underused |
| Claude Opus 4.6 | $5.00 | $25.00 | Used for verdicts |

Reference: [Anthropic Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)

---

## 3) Strategy Overview

Four layers of cost reduction, from easiest to most complex:

| Layer | Strategy | Effort | Savings | Quality Impact |
|-------|----------|--------|---------|----------------|
| **A** | Pricing discounts (Batch API, prompt caching) | Low | 50-70% | None |
| **B** | NPO/OSS programs and cloud credits | Low | $1K-$20K credits | None |
| **C** | Pipeline config tuning (UCM) | Low | 15-25% | Minimal |
| **D** | Pipeline code optimizations | Medium-High | 20-35% | See related doc |

Layers A-C are **independent of pipeline code changes** and can be applied immediately. Layer D is covered in the related [LLM_Call_Optimization_Goals_Proposal.md](LLM_Call_Optimization_Goals_Proposal.md).

---

## 4) Layer A: Pricing Discounts (No Code Changes to Pipeline)

### A1. Batch API — 50% Flat Discount

**What**: Anthropic's [Batch API](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing) processes requests asynchronously and provides a **flat 50% discount** on all token costs. Results are returned within 24 hours (typically within minutes). No minimum volume — even a single request qualifies.

**Pricing with Batch API**:

| Model | Standard Input | Batch Input | Standard Output | Batch Output |
|-------|---------------:|------------:|----------------:|-------------:|
| Haiku 4.5 | $1.00 | **$0.50** | $5.00 | **$2.50** |
| Sonnet 4.5 | $3.00 | **$1.50** | $15.00 | **$7.50** |
| Opus 4.6 | $5.00 | **$2.50** | $25.00 | **$12.50** |

**Applicability to FactHarbor**: Excellent. All analyses run as background jobs (triggered by `RunnerClient`, executed via `/api/internal/run-job`). There is no user waiting interactively for results — analyses already take minutes. Batch API latency (seconds to minutes) is acceptable.

**Implementation**: Requires changes to the AI SDK client layer in `orchestrated.ts` to use the Batch API endpoint instead of the standard Messages API. The Anthropic TypeScript SDK supports batch requests via `client.beta.messages.batches.create()`.

**Stacking**: Batch API discounts **stack** with prompt caching discounts.

**Impact on $340 spend**: Would have been **~$170**.

Reference: [Anthropic Batch API Documentation](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)

---

### A2. Prompt Caching — 90% Discount on Repeated Input Tokens

**What**: Anthropic's [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) lets you mark portions of your prompt as cacheable. On cache hits, input token cost drops by **90%**. Cache writes cost 25% more (5-minute TTL) or 100% more (1-hour TTL).

| Cache Operation | Cost Multiplier | Opus 4.6 Effective Rate |
|-----------------|----------------:|------------------------:|
| Cache write (5-min TTL) | 1.25x input | $6.25/MTok |
| Cache write (1-hour TTL) | 2.0x input | $10.00/MTok |
| **Cache read (hit)** | **0.1x input** | **$0.50/MTok** |
| No caching (baseline) | 1.0x input | $5.00/MTok |

**Applicability to FactHarbor**: High. A single analysis makes 40-60 LLM calls that share the same system prompts (loaded from `apps/web/prompts/`). These prompts are ~10-20KB each and are identical across all calls within an analysis. With a 5-minute cache TTL, all calls after the first one would hit the cache.

**Estimated savings**: ~100K tokens per analysis are system prompts. At 90% cache-hit discount, this saves ~$0.15-0.20 per analysis (~10-15% of total cost).

**Combined with Batch API**: Cached batch input tokens on Opus 4.6 cost only **$0.25/MTok** — a 95% reduction from the $5.00 base rate.

**Implementation**: Requires adding `cacheControl: { type: 'ephemeral' }` markers to system prompt messages in the AI SDK calls. The Anthropic TypeScript SDK (v0.39+) supports this via the `anthropic-beta: prompt-caching-2024-07-31` header.

**Current state**: No prompt caching is implemented. Searched entire codebase for `cache_control`, `ephemeral`, `anthropic-beta` — zero matches.

Reference: [Anthropic Prompt Caching Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

---

### A3. Combined Batch + Caching Savings Projection

| Token Category | Standard Rate | Batch + Cached Rate | Discount |
|----------------|-------------:|--------------------:|---------:|
| Opus 4.6 cached input | $5.00 | $0.25 | **95%** |
| Opus 4.6 uncached input | $5.00 | $2.50 | 50% |
| Opus 4.6 output | $25.00 | $12.50 | 50% |
| Haiku 4.5 cached input | $1.00 | $0.05 | 95% |
| Haiku 4.5 uncached input | $1.00 | $0.50 | 50% |
| Haiku 4.5 output | $5.00 | $2.50 | 50% |

**Projected impact on $340 spend**: ~$100-120 (65-70% reduction).

---

## 5) Layer B: NPO/OSS Programs and Cloud Credits

### B1. Anthropic — Claude for Nonprofits

- **Discount**: Up to **75% off** Team and Enterprise plans
- **Eligibility**: 501(c)(3) organizations or equivalent international designations
- **Includes**: Access to Opus 4.6, Sonnet 4.5, Haiku 4.5; open-source connectors to nonprofit tools
- **Launched**: December 2025
- **Note**: Covers Team/Enterprise plan pricing. Confirm whether raw API token costs are included at discounted rate.
- **Action**: Apply if FactHarbor operates under an NPO entity

Reference: [Anthropic Claude for Nonprofits](https://www.anthropic.com/news/claude-for-nonprofits) | [Claude Nonprofits Page](https://claude.com/solutions/nonprofits) | [Getting Started Guide](https://support.claude.com/en/articles/12893767-getting-started-with-claude-for-nonprofits)

### B2. Anthropic — AI for Science Program

- **Credits**: Up to **$20,000 in free API credits** for a 6-month period
- **Eligibility**: Researchers at academic or nonprofit institutions working on high-impact projects (focus on biology/life sciences, but other fields considered)
- **Application**: Rolling — reviewed on the first Monday of each month
- **Selection criteria**: Scientific merit, potential impact, technical feasibility, team credentials
- **Restrictions**: Residents of Russia, China, North Korea, Iran, Syria ineligible

Reference: [AI for Science Announcement](https://www.anthropic.com/news/ai-for-science-program) | [Program Rules](https://www.anthropic.com/ai-for-science-program-rules) | [Help Center](https://support.claude.com/en/articles/11199177-anthropic-s-ai-for-science-program)

### B3. Anthropic — External Researcher Access Program

- **Credits**: Free API credits (amount not publicly specified)
- **Eligibility**: Researchers working on AI safety and alignment topics
- **Application**: Rolling, reviewed monthly

Reference: [External Researcher Access](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program)

### B4. Anthropic — Startup Program

- **Credits**: Up to **$100,000 in Claude API credits**
- **Eligibility**: Early-stage startups backed by partner VC firms
- **Additional benefits**: Priority rate limits, exclusive events

Reference: [Claude Startup Program](https://claude.com/programs/startups) | [Program Terms](https://www.anthropic.com/startup-program-official-terms)

### B5. AWS — Nonprofit Credits via TechSoup

- **Credits**: **$1,000 USD per fiscal year** (reduced from $2,000 as of July 2025)
- **Eligibility**: Qualified nonprofits validated through TechSoup
- **Coverage**: Credits apply to all AWS on-demand services including **Amazon Bedrock** (which hosts Claude models)
- **Validity**: 12 months from activation
- **Note**: Claude models on Bedrock have the same per-token pricing as Anthropic direct

Reference: [AWS Nonprofit Credit Program](https://aws.amazon.com/government-education/nonprofits/nonprofit-credit-program/) | [TechSoup AWS FAQ](https://www.techsoup.global/aws-faq) | [AWS Bedrock Claude Pricing](https://aws.amazon.com/bedrock/pricing/)

### B6. AWS — Imagine Grant (Nonprofits)

- **Awards**:
  - **Pathfinder**: Up to $200,000 cash + $100,000 AWS credits (for innovative generative AI projects)
  - **Go Further, Faster**: Up to $150,000 cash + $100,000 AWS credits
  - **Momentum to Modernize**: Up to $50,000 cash + $20,000 AWS credits
- **Eligibility**: Nonprofits headquartered in US, UK, Ireland, Canada, Australia, New Zealand
- **Application cycle**: 2026-2027 cycle opens spring 2026

Reference: [AWS Imagine Grant Program](https://aws.amazon.com/government-education/nonprofits/aws-imagine-grant-program/) | [FAQ](https://aws.amazon.com/government-education/nonprofits/aws-imagine-grant-program/aws-imagine-grant-faq/)

### B7. AWS — Activate (Startups)

- **Credits**: $1,000 (self-funded) up to $500,000 (Y Combinator AI startups)
- **Eligibility**: Pre-Series B, under 10 years old
- **Coverage**: AWS Activate credits are explicitly redeemable on third-party models in Bedrock, including Claude

Reference: [AWS Activate for Bedrock](https://aws.amazon.com/blogs/startups/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/) | [Apply](https://aws.amazon.com/startups/lp/aws-activate-credits)

### B8. Google Cloud — Nonprofit Credits

- **Credits**: Up to **$10,000 per year** in Google Cloud credits
- **Eligibility**: Validated nonprofits (typically through TechSoup)
- **Coverage**: Applicable to Vertex AI usage, which includes Claude as a partner model

Reference: [Google Cloud Credits for Nonprofits](https://support.google.com/nonprofits/answer/16245748) | [Anthropic on Vertex AI](https://www.anthropic.com/google-cloud-vertex-ai)

### B9. Google.org — Generative AI Accelerator

- **Benefits**: Google Cloud credits, pro-bono support from Google employees, share of $30 million fund, technical training
- **Eligibility**: Nonprofits, civic entities, academic institutions, social enterprises
- **Structure**: 6-month accelerator with dedicated AI coach

Reference: [Google.org AI Accelerator](https://blog.google/company-news/outreach-and-initiatives/google-org/google-org-generative-ai-accelerator-2025/)

### B10. Google Cloud — Research Credits

- **Eligibility**: Academic and nonprofit researchers
- **Coverage**: Variable credits for research projects

Reference: [Google Cloud Research Credits](https://cloud.google.com/blog/topics/public-sector/google-cloud-research-credits-expand-nonprofit-researchers)

### NPO Stacking Strategy

A qualifying nonprofit organization could potentially access Claude through **multiple independent programs simultaneously**:

| Source | Credits/Discount | Provider Path |
|--------|-----------------|---------------|
| Anthropic Claude for Nonprofits | 75% off plans | Direct |
| Anthropic AI for Science | $20,000 API credits | Direct |
| AWS TechSoup | $1,000/year | Bedrock |
| AWS Imagine Grant | Up to $100,000 credits | Bedrock |
| Google for Nonprofits | $10,000/year | Vertex AI |

**Important**: There is currently **no dedicated open-source program** from Anthropic. Open-source projects must qualify through the nonprofit, research, or startup programs.

---

## 6) Layer C: Pipeline Configuration Tuning (UCM)

These UCM config changes reduce cost without code modifications. Adjust via Admin -> Config.

### C1. Reduce Research Iterations

| Parameter | Current Default | Recommended | Savings | Risk |
|-----------|:---------:|:-----------:|:-------:|------|
| `maxIterationsPerContext` | 5 | **3** | ~20% | Slightly fewer evidence sources per context |
| `maxTotalIterations` | 20 | **10** | ~15% | Hard cap on deep research |
| `maxTotalTokens` | 750,000 | **500,000** | Hard cap at ~$1.50/analysis | May stop early on complex claims |

### C2. Reduce Context Multiplier

| Parameter | Current Default | Recommended | Savings | Risk |
|-----------|:---------:|:-----------:|:-------:|------|
| `contextDetectionMaxContexts` | 5 | **2-3** | ~15-20% | Fewer parallel analysis tracks |
| `contextDedupThreshold` | 0.85 | **0.70** | ~5-10% | More aggressive merging of similar contexts |

### C3. Use Sonnet 4.5 for Verdicts (Instead of Opus 4.6)

| Parameter | Current | Recommended | Savings | Risk |
|-----------|---------|-------------|:-------:|------|
| `modelVerdict` | `claude-opus-4-6` | `claude-sonnet-4-5-20250929` | ~40% on verdict phase (~12% overall) | Slightly lower reasoning depth; test quality first |

Sonnet 4.5 pricing: $3/$15 vs Opus 4.6: $5/$25. The quality gap for structured verdict generation with evidence-backed reasoning is expected to be small but should be validated with the benchmark corpus before committing.

### C4. Combined Config Tuning Savings

| Adjustment | Individual Savings | Cumulative Effect |
|------------|:------------------:|:-----------------:|
| Reduce iterations (C1) | 15-25% | 15-25% |
| Reduce contexts (C2) | 10-15% | 25-35% |
| Sonnet for verdicts (C3) | 10-12% | 33-42% |

---

## 7) Layer D: Pipeline Code Optimizations

Covered in detail in [LLM_Call_Optimization_Goals_Proposal.md](LLM_Call_Optimization_Goals_Proposal.md). Summary of approved (P2 Balanced) targets:

| Optimization | Status | Expected Savings |
|--------------|--------|:----------------:|
| Batch evidence extraction (multiple sources/call) | Proposed | 30-35% of extraction phase |
| Merge understand + context detection calls | Proposed | 15-25% of understand phase |
| Batch counter-claim detection | Proposed | 10-15% of verdict phase |
| Implement prompt caching (code-level) | Proposed | 10-15% overall |
| Cache claim understanding by text hash | Proposed | 5-10% on repeated claims |

**Note**: The related proposal prohibits batching evidence extraction across sources (attribution integrity). Single-source-per-call extraction remains mandatory. Savings come from batching other phases.

---

## 8) Combined Savings Projection

Starting from $340/13 days baseline (~$26/day):

| Layer | Action | Per-Day Cost | Cumulative Savings |
|-------|--------|:------------:|:------------------:|
| Baseline | Current state | $26.00 | — |
| **A1** | Batch API (50% off) | $13.00 | **50%** |
| **A2** | + Prompt caching (10-15% off) | $11.00 | **58%** |
| **C1-C2** | + Config tuning (15-25% off) | $8.50 | **67%** |
| **C3** | + Sonnet for verdicts (10% off) | $7.50 | **71%** |
| **D** | + Pipeline code optimizations (15-20% off) | $6.00 | **77%** |

**Projected monthly cost after all layers**: ~$180/month (down from ~$600-800).

**With NPO credits on top**: Google ($10K/year) + AWS ($1K/year) = $11K/year in credits, potentially covering most or all remaining API costs.

---

## 9) Alternative Provider Comparison

Claude models are available through three providers. Token pricing is identical, but billing and credits differ:

| Feature | Anthropic Direct | Amazon Bedrock | Google Vertex AI |
|---------|:----------------:|:--------------:|:----------------:|
| Per-token pricing | Base rates | Same as direct | Same as direct |
| Batch API (50% off) | Yes | Yes | Check availability |
| Prompt caching | Yes | Yes | Check availability |
| NPO credits | $0 (plan discounts) | $1,000/year (TechSoup) | $10,000/year |
| Grant programs | AI for Science ($20K) | Imagine Grant ($100K+) | AI Accelerator ($30M pool) |
| Provisioned throughput | No | Yes (contact AWS) | Yes (contact Google) |
| Consolidated billing | API-only | With other AWS services | With other GCP services |

**Recommendation**: Start with Anthropic direct (Batch API + caching). Apply for NPO credits on all three platforms as a fallback and for additional capacity.

---

## 10) Action Plan

### Immediate (This Week)

| # | Action | Effort | Expected Impact |
|---|--------|:------:|:---------------:|
| 1 | Top up Anthropic credits (unblock development) | Minutes | Unblock |
| 2 | Reduce UCM config: iterations 5→3, total iterations 20→10 | Minutes | -20% cost |
| 3 | Reduce UCM config: max contexts 5→3 | Minutes | -10% cost |
| 4 | Apply for **Claude for Nonprofits** (if NPO entity exists) | 1 hour | Up to 75% off plans |
| 5 | Apply for **AWS Nonprofit Credits** via TechSoup | 1 hour | $1,000 for Bedrock |
| 6 | Apply for **Google for Nonprofits** | 1 hour | $10,000 for Vertex AI |

### Short-Term (Next 2 Weeks)

| # | Action | Effort | Expected Impact |
|---|--------|:------:|:---------------:|
| 7 | Implement Batch API integration in pipeline | 2-3 days | **-50% cost** |
| 8 | Implement prompt caching in AI SDK calls | 1-2 days | -10-15% additional |
| 9 | Test Sonnet 4.5 for verdicts (quality benchmark) | 1 day | If quality OK: -10% additional |
| 10 | Apply for **Anthropic AI for Science** program | 2 hours | $20,000 credits |

### Medium-Term (Next Month)

| # | Action | Effort | Expected Impact |
|---|--------|:------:|:---------------:|
| 11 | Pipeline code optimizations (P2 Balanced — per related doc) | 2-4 weeks | -20-35% additional |
| 12 | Apply for **AWS Imagine Grant** (opens spring 2026) | Application | Up to $100K credits |
| 13 | Evaluate Bedrock provisioned throughput (if volume justifies) | Assessment | Variable |

### Cost Monitoring

Implement per-analysis cost tracking to measure the impact of each optimization:

- Track tokens per phase (extraction, understanding, verdict, utilities)
- Track cost per analysis (input + output tokens × model rate)
- Compare against baseline before/after each optimization layer
- Alert if per-analysis cost exceeds budget threshold

---

## 11) Key Links and References

### Anthropic Documentation
- [API Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)
- [Batch API Guide](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)
- [Prompt Caching Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

### NPO/Research Programs
- [Claude for Nonprofits](https://www.anthropic.com/news/claude-for-nonprofits)
- [AI for Science Program](https://www.anthropic.com/news/ai-for-science-program) | [Rules](https://www.anthropic.com/ai-for-science-program-rules)
- [External Researcher Access](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program)
- [Startup Program](https://claude.com/programs/startups)

### AWS Programs
- [AWS Nonprofit Credit Program](https://aws.amazon.com/government-education/nonprofits/nonprofit-credit-program/)
- [AWS Imagine Grant](https://aws.amazon.com/government-education/nonprofits/aws-imagine-grant-program/)
- [AWS Activate (Startups)](https://aws.amazon.com/startups/lp/aws-activate-credits)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Activate Credits for Bedrock Models](https://aws.amazon.com/blogs/startups/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/)

### Google Cloud Programs
- [Google for Nonprofits Credits](https://support.google.com/nonprofits/answer/16245748)
- [Google.org AI Accelerator](https://blog.google/company-news/outreach-and-initiatives/google-org/google-org-generative-ai-accelerator-2025/)
- [Google Cloud Research Credits](https://cloud.google.com/blog/topics/public-sector/google-cloud-research-credits-expand-nonprofit-researchers)
- [Anthropic on Vertex AI](https://www.anthropic.com/google-cloud-vertex-ai)

### Related FactHarbor Documents
- [LLM Call Optimization Goals Proposal](LLM_Call_Optimization_Goals_Proposal.md) — Pipeline-level code optimizations (P2 Balanced, approved)
- [Storage, DB & Caching Strategy](Storage_DB_Caching_Strategy.md) — Caching architecture decisions

---

**Author**: Claude Code (Senior Developer / Claude Expert)
**Date**: 2026-02-13
**Status**: Draft — Awaiting review

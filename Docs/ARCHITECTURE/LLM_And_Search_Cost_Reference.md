# LLM & Search Cost Reference

**Last verified:** 2026-05-07
**Source of truth:** Code in `apps/web/src/lib/analyzer/` — this doc summarizes; code wins on conflicts.

---

## 1. LLM Model Pricing (per 1M tokens)

Pricing table from [`metrics.ts:416`](apps/web/src/lib/analyzer/metrics.ts) (updated 2026-03):

| Provider | Model ID | Input | Output | Pipeline Tier |
|---|---|---:|---:|---|
| **Anthropic** | `claude-haiku-4-5-20251001` | $1.00 | $5.00 | budget |
| Anthropic | `claude-sonnet-4-6` | $3.00 | $15.00 | standard |
| Anthropic | `claude-opus-4-6` | $15.00 | $75.00 | premium (not used in pipeline) |
| **OpenAI** | `gpt-4.1-mini` | $0.40 | $1.60 | budget |
| OpenAI | `gpt-4.1` | $2.00 | $8.00 | standard |
| **Google** | `gemini-2.5-flash` | $0.15 | $0.60 | budget |
| Google | `gemini-2.5-pro` | $1.25 | $10.00 | standard |
| **Mistral** | `mistral-small-latest` | $0.20 | $0.60 | budget |
| Mistral | `mistral-large-latest` | $3.00 | $9.00 | standard |

Model resolution: [`model-resolver.ts`](apps/web/src/lib/analyzer/model-resolver.ts), [`llm.ts:137`](apps/web/src/lib/analyzer/llm.ts).

---

## 2. Task-to-Model Routing

With tiering enabled (default), [`llm.ts:101`](apps/web/src/lib/analyzer/llm.ts) maps tasks:

| Task | Tier | Default Model (Anthropic) |
|---|---|---|
| `understand` | budget | `claude-haiku-4-5-20251001` |
| `extract_evidence` | budget | `claude-haiku-4-5-20251001` |
| `context_refinement` | standard | `claude-sonnet-4-6` |
| `verdict` | standard | `claude-sonnet-4-6` |
| `report` | standard | `claude-sonnet-4-6` |
| `supplemental` | budget | `claude-haiku-4-5-20251001` |
| `summary` | budget | `claude-haiku-4-5-20251001` |

Verdict debate roles override the global provider ([`verdict-stage.ts:379`](apps/web/src/lib/analyzer/verdict-stage.ts)):

| Debate Role | Provider | Strength | Resolved Model |
|---|---|---|---|
| Advocate | Anthropic | standard | `claude-sonnet-4-6` |
| Self-Consistency (x2) | Anthropic | standard | `claude-sonnet-4-6` |
| **Challenger** | **OpenAI** | **standard** | **`gpt-4.1`** |
| Reconciler | Anthropic | standard | `claude-sonnet-4-6` |
| Validation | Anthropic | budget | `claude-haiku-4-5-20251001` |

---

## 3. LLM Calls per Analysis Job

### Stage 1 — Claim Extraction ([`claim-extraction-stage.ts`](apps/web/src/lib/analyzer/claim-extraction-stage.ts))

| Call | Task | Model | Count/Job |
|---|---|---|---|
| Pass 1 (rapid scan) | `understand` | Haiku | 1 |
| Salience commitment | `understand` | Haiku | 0-1 (opt-in) |
| Preliminary evidence extraction | `extract_evidence` | Haiku | 1 |
| Pass 2 (evidence-grounded) | `extract_evidence` | Sonnet | 1 |
| Contract repair | `context_refinement` | Sonnet | 0-1 (on failure) |
| Contract validation checks | `context_refinement` | Sonnet | 1-4 |
| Single-claim atomicity | `context_refinement` | Sonnet | 0-2 |
| Multi-claim atomicity audit | `context_refinement` | Sonnet | 0-2 |
| Gate 1 validation | `understand` | Haiku | 1 |
| **Stage 1 subtotal** | | | **~6-12** |

### Stage 2 — Research Queries & Evidence ([`research-query-stage.ts`](apps/web/src/lib/analyzer/research-query-stage.ts), [`research-extraction-stage.ts`](apps/web/src/lib/analyzer/research-extraction-stage.ts), [`research-orchestrator.ts`](apps/web/src/lib/analyzer/research-orchestrator.ts))

| Call | Task | Model | Count/Job |
|---|---|---|---|
| Query generation | `understand` | Haiku | ~15-25 (per-claim x iterations) |
| Relevance classification | `understand` | Haiku | ~15-40 (per-claim x search rounds) |
| Evidence extraction | `extract_evidence` | Haiku | ~8-15 (per-claim, batched by source) |
| Applicability assessment | `extract_evidence` | Haiku | ~3-5 (per-claim) |
| Scope quality / balance | `extract_evidence` | Haiku | ~3-5 |
| **Stage 2 subtotal** | | | **~45-90** |

Stage 2 scales with claim count and iteration depth. Dominant cost driver.

### Stage 3 — Boundary Clustering ([`boundary-clustering-stage.ts`](apps/web/src/lib/analyzer/boundary-clustering-stage.ts))

| Call | Task | Model | Count/Job |
|---|---|---|---|
| Scope normalization | `understand` | Haiku | 0-1 |
| LLM clustering | `verdict` | Sonnet | 1 |
| **Stage 3 subtotal** | | | **1-2** |

### Stage 4 — Verdict Debate ([`verdict-stage.ts`](apps/web/src/lib/analyzer/verdict-stage.ts), [`verdict-generation-stage.ts`](apps/web/src/lib/analyzer/verdict-generation-stage.ts))

| Call | Role | Provider / Model | Count/Job |
|---|---|---|---|
| Advocate | Anthropic / Sonnet | 1 (all claims batched) | 1 |
| Self-consistency run 1 | Anthropic / Sonnet | temp=0.4 | 1 |
| Self-consistency run 2 | Anthropic / Sonnet | temp=0.4 | 1 |
| Adversarial challenge | **OpenAI / GPT-4.1** | temp=0.3, fallible | **1** |
| Reconciliation | Anthropic / Sonnet | 1 (waits for 2+3) | 1 |
| Grounding validation | Anthropic / Haiku | batched | 1 |
| Direction validation | Anthropic / Haiku | batched | 1 |
| Validation repair | Anthropic / Haiku | on failure | 0-2 |
| Source reliability cal. | Anthropic / Haiku | opt-in | 0-1 |
| **Stage 4 subtotal** | | | **7-9** |

### Stage 5 — Aggregation ([`aggregation-stage.ts`](apps/web/src/lib/analyzer/aggregation-stage.ts))

| Call | Task | Model | Count/Job |
|---|---|---|---|
| Verdict narrative | `verdict` | Sonnet | 1 |
| Article adjudication | `verdict` | Sonnet | 0-1 (on conflict) |
| Explanation quality rubric | `understand` | Haiku | 0-1 (opt-in) |
| TIGERScore | `verdict` | Sonnet | 0-1 (beta) |
| **Stage 5 subtotal** | | | **1-3** |

### Totals by Provider & Model

| Provider | Model | Typical Calls/Job | Role |
|---|---|---|---|
| **Anthropic** | `claude-haiku-4-5-20251001` | **~55-85** | All extraction, query gen, relevance, validation |
| **Anthropic** | `claude-sonnet-4-6` | **~10-16** | Pass 2, contract, debate (adv/SC/recon), narrative, clustering |
| **OpenAI** | `gpt-4.1` | **1** | Challenger (structural independence) |
| Google | — | 0 | Configured, not default |
| Mistral | — | 0 | Configured, not default |
| **Total** | | **~65-100** | |

---

## 4. Web Searches per Analysis Job

### Search Providers

Configuration: [`config-schemas.ts`](apps/web/src/lib/config-schemas.ts), implementation: [`web-search.ts`](apps/web/src/lib/web-search.ts).

| Provider | Type | Default Enabled | Priority | Est. Cost/Query |
|---|---|---|---|---|
| **Google CSE** | Primary | Yes | 1 | ~$0.005 |
| **Serper** | Primary | Yes | 2 | ~$0.01 |
| SerpAPI | Primary | No | 2 | ~$0.008 |
| Brave | Primary | No | 2 | plan-dependent |
| **Wikipedia** | Supplementary | Yes | 3 | free |
| Semantic Scholar | Supplementary | No | 3 | free |
| Google Fact Check | Supplementary | No | 4 | free |

**AUTO mode** (default): tries providers in priority order, accumulates results up to `maxSourcesPerIteration` (8).

### Search Volume per Job

| Phase | Queries | Notes |
|---|---|---|
| Preliminary (Stage 1) | ~6 | Top 3 rough claims x 2 queries |
| Main research (Stage 2) | ~15-30 | Per-claim x iterations, governed by budget |
| Contradiction/refinement | ~5-10 | When evidence direction is unbalanced |
| English supplementary lane | 0-5 | Non-English input with sparse native results |
| **Total** | **~25-45** | |

Cache (7-day TTL) significantly reduces actual API calls for repeated/similar queries.

---

## 5. Average Cost per Analysis Job

### LLM Cost Estimate (typical job, ~5 claims)

| Component | Calls | Avg Tokens (in / out) | Unit Cost | Subtotal |
|---|---|---|---|---|
| Haiku calls | ~70 | ~2K / ~500 | $0.002 + $0.0025 | **$0.32** |
| Sonnet calls | ~12 | ~4K / ~2K | $0.012 + $0.030 | **$0.50** |
| GPT-4.1 (challenger) | 1 | ~4K / ~1.5K | $0.008 + $0.012 | **$0.02** |
| **LLM subtotal** | | | | **~$0.84** |

### Search Cost Estimate

| Component | Count | Unit Cost | Subtotal |
|---|---|---|---|
| Google CSE / Serper | ~35 | ~$0.005 | **$0.18** |
| Wikipedia / free | ~5-10 | $0 | $0 |
| **Search subtotal** | | | **~$0.18** |

### Prompt Caching Discount

Anthropic prompt caching (5-min TTL, 90% input discount on cache hits) reduces input cost for repeated system prompts across Stage 2's many calls. Estimated saving: **-$0.10 to -$0.20**.

### Total

| Scenario | Est. Cost/Job |
|---|---|
| Without prompt caching | **~$1.00** |
| With prompt caching (typical) | **~$0.80** |
| Maximum (budget cap at 1M tokens) | ~$3.00 |
| Minimum (short input, few claims) | ~$0.40 |

Cost estimation logic: [`metrics.ts:395`](apps/web/src/lib/analyzer/metrics.ts).
Budget enforcement: [`budgets.ts`](apps/web/src/lib/analyzer/budgets.ts) (1M token cap, 100K/call cap, 10 iteration cap).

---

## 6. Cost Optimization Levers (active)

| Lever | Saving | Source |
|---|---|---|
| Model tiering (budget for extraction) | 50-70% vs all-Sonnet | [`model-tiering.ts`](apps/web/src/lib/analyzer/model-tiering.ts) |
| Prompt caching (Anthropic) | ~10-20% on input | [`llm.ts`](apps/web/src/lib/analyzer/llm.ts) `getPromptCachingOptions()` |
| Search result caching (7d TTL) | reduces duplicate queries | [`web-search.ts`](apps/web/src/lib/web-search.ts) |
| Token budget cap (1M/job) | hard ceiling ~$3 | [`budgets.ts`](apps/web/src/lib/analyzer/budgets.ts) |
| Iteration caps (10 total, 3/context) | bounds Stage 2 runaway | [`budgets.ts`](apps/web/src/lib/analyzer/budgets.ts) |
| Batched verdict debate | 1 call/step vs per-claim | [`verdict-stage.ts`](apps/web/src/lib/analyzer/verdict-stage.ts) |

### Open optimization candidates

See [Pipeline_Speed_Cost_Optimization_Plan](../ARCHIVE/PipelineV1/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) and [LLM_Allocation_and_Cost_fwd](../WIP/LLM_Allocation_and_Cost_fwd.md) for deferred ideas (P1-A clustering downgrade, P2 self-consistency reduction, Rec-B TIGERScore to Haiku, Rec-D batch API).

---

## 7. Metrics & Observability

Token usage, cost, and quality are tracked per-job via [`MetricsCollector`](apps/web/src/lib/analyzer/metrics.ts) and stored via the API's [`MetricsController`](apps/api/Controllers/MetricsController.cs):

- `POST /api/fh/metrics` — store job metrics
- `GET /api/fh/metrics/{jobId}` — retrieve job metrics
- `GET /api/fh/metrics/summary` — avgCost, avgTokens, quality rates
- `GET /api/fh/metrics/quality-health` — time-series health

Each `LLMCallMetric` records: provider, model, promptTokens, completionTokens, cacheReadInputTokens, durationMs, debateRole, success, schemaCompliant.

Each `SearchQueryMetric` records: provider, query, resultsCount, durationMs, cached.

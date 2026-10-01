# LLM Configuration Guide

## Overview

FactHarbor supports multiple LLM (Large Language Model) providers and search providers. This guide explains how to configure, optimize, and switch between providers to balance cost, performance, and quality.

------------------------------------------------------------------------

## Table of Contents

-   [Supported Providers](#supported-providers)
-   [Provider Selection](#provider-selection)
-   [Debate Role Configuration](debate-role-configuration/index.md)
-   [Environment Configuration](#environment-configuration)
-   [Provider-Specific Optimization](#provider-specific-optimization)
-   [Search Provider Configuration](#search-provider-configuration)
-   [Cost Optimization](#cost-optimization)
-   [Troubleshooting](#troubleshooting)

------------------------------------------------------------------------

## Supported Providers

### LLM Providers

| Provider | Models | Best For | Status |
|----|----|----|----|
| **Anthropic** | `claude-sonnet-4-20250514` | Complex reasoning, analysis | Supported |
| **OpenAI** | `gpt-4o` | General purpose | Supported |
| **Google** | `gemini-1.5-pro` | Long context | Supported |
| **Mistral** | `mistral-large-latest` | Cost-effective | Supported |

### Search Providers

| Provider | API | Best For | Status |
|----|----|----|----|
| **Google Custom Search (CSE)** | Free tier available | General web search | Supported |
| **SerpAPI** | Pay-per-use | Reliable Google results | Supported |
| **Brave Search** | API required | Privacy-focused, independent index | Supported |
| **Wikipedia** | Built-in | Broad general knowledge | Supported |
| **Semantic Scholar** | Built-in | Academic and scientific evidence | Supported |
| **Google Fact Check** | API required | Direct access to existing fact-checks | Supported |
| **Gemini Grounded Search** | Built-in | When using Gemini | Experimental (requires `pipeline.llmProvider=google` + search `mode=grounded`) |

------------------------------------------------------------------------

## Provider Selection

### Setting the LLM Provider

**Current (UCM):** LLM provider is configured via UCM pipeline config.

To change provider:

1.  Navigate to Admin → Config → Pipeline
2.  Update `llmProvider` field (values: `anthropic`, `openai`, `google`, `mistral`)
3.  Save and activate

**Deprecated:** The `LLM_PROVIDER` environment variable is no longer used (removed 2026-02-02). If present in your `.env` file, it will be ignored.

**Migration:** If you previously set `LLM_PROVIDER=openai`, update your pipeline config to `"llmProvider": "openai"` via the admin UI.

### Debate Role Configuration (Verdict Stage)

Debate roles are configured in PipelineConfig via:

-   `debateModelTiers` — per-role model tier (haiku/sonnet/opus)
-   `debateModelProviders` — per-role LLM provider override

See the dedicated guide: [Debate Role Configuration](debate-role-configuration/index.md)

### Provider API Keys

**Important:** Provider selection is configured in UCM (Admin → Config → Pipeline), but API keys remain environment-based for security.

**Anthropic Claude** (Recommended):

```
ANTHROPIC_API_KEY=sk-ant-...
```

-   Get key: <a href="https://console.anthropic.com/settings/keys" rel="noopener" target="_blank">https://console.anthropic.com/settings/keys</a>
-   Legacy default model (tiering off): `claude-sonnet-4-20250514`
-   Best for: Complex analysis, high-quality reasoning

**OpenAI**:

```
OPENAI_API_KEY=sk-...
```

-   Get key: <a href="https://platform.openai.com/api-keys" rel="noopener" target="_blank">https://platform.openai.com/api-keys</a>
-   Legacy default model (tiering off): `gpt-4o`
-   Best for: General purpose, established ecosystem

**Google Gemini**:

```
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```

-   Get key: <a href="https://aistudio.google.com/app/apikey" rel="noopener" target="_blank">https://aistudio.google.com/app/apikey</a>
-   Legacy default model (tiering off): `gemini-1.5-pro`
-   Best for: Long context, multimodal inputs

**Mistral AI**:

```
MISTRAL_API_KEY=...
```

-   Get key: <a href="https://console.mistral.ai/api-keys" rel="noopener" target="_blank">https://console.mistral.ai/api-keys</a>
-   Legacy default model (tiering off): `mistral-large-latest`
-   Best for: Cost-conscious deployments

------------------------------------------------------------------------

## Environment Configuration

<span id="complete-env-local-example"></span>

### Complete `.env.local` Example

Provider selection and analysis behavior are configured in UCM (Admin → Config). The environment only stores API keys and infrastructure settings.

```
# API Keys (configure the providers you intend to use)
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# GOOGLE_GENERATIVE_AI_API_KEY=AIza-your-key-here
# MISTRAL_API_KEY=your-key-here

# Search API Keys (search provider selected in UCM)
SERPAPI_API_KEY=your-serpapi-key
BRAVE_API_KEY=your-brave-key
GOOGLE_FACTCHECK_API_KEY=your-gfc-key
# Semantic Scholar optionally uses an API key for higher rate limits
SEMANTIC_SCHOLAR_API_KEY=your-scholar-key
# Or Google Custom Search:
# GOOGLE_CSE_API_KEY=your-cse-key
# GOOGLE_CSE_ID=your-cse-id
```

### Configuration Validation

Test your configuration at: http://localhost:3000/admin/test-config

This admin interface will:

-   Validate all API keys
-   Test LLM provider connectivity
-   Test search provider connectivity
-   Show which services are active

------------------------------------------------------------------------

## Provider-Specific Optimization

> **Comprehensive Guide**: See [Provider-Specific Formatting](../../../specification/reference/prompt-engineering/provider-specific-formatting/index.md) for detailed documentation on v2.8.0 prompt architecture.

<span id="overview-v2-8-0"></span>

### Overview (v2.8.0+)

FactHarbor uses **provider-specific prompt variants** to optimize performance across different LLMs. Each provider has unique strengths and preferred prompt structures:

| Provider | Format | Strengths | Optimizations |
|----|----|----|----|
| **Anthropic Claude** | XML-structured | Nuanced reasoning, boundary clustering | XML tags, thinking blocks, prefill technique |
| **OpenAI GPT-4** | Markdown | General purpose, schema adherence | Clear headings, numbered lists, code blocks |
| **Google Gemini** | Example-heavy | Long context, visual formatting | Emojis, bullets, repetition, multiple examples |
| **Mistral** | Formal academic | Cost-effective, bilingual | Explicit reasoning chains, French examples |

### General Optimization Principles

1.  **Prompt Composition**:
    -   Base prompt (universal logic)
    -   Provider variant (format optimization)
    -   Config adaptation (tiering, knowledge mode)
2.  **Temperature Settings**:
    -   Use `FH_DETERMINISTIC=true` for reproducible results (temperature = 0.0)
    -   Override per-provider if needed via PromptConfig
3.  **Token Limits**:
    -   Claude: 200k tokens
    -   GPT-4: 128k tokens
    -   Gemini: 2M tokens
    -   Mistral: 128k tokens

### Configuration

Provider-specific settings are configured via **PromptConfig** in the Unified Config Management system:

```
{
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "temperature": 0.2,
  "maxTokens": 8000,
  "tier": "standard"
}
```

See: [Unified Config Management](../unified-config-management/index.md) for profile management

------------------------------------------------------------------------

## Search Provider Configuration

### Google Custom Search (Free Tier)

1.  **Get API Key**: <a href="https://developers.google.com/custom-search/v1/introduction" rel="noopener" target="_blank">https://developers.google.com/custom-search/v1/introduction</a>
2.  **Create Custom Search Engine**: <a href="https://cse.google.com/cse/" rel="noopener" target="_blank">https://cse.google.com/cse/</a>
3.  **Configure in UCM** (Admin → Config → Web Search):
    -   `enabled`: `true`
    -   `provider`: `google-cse`

**Environment keys**:

```
GOOGLE_CSE_API_KEY=your-api-key
GOOGLE_CSE_ID=your-cse-id
```

**Limits**: 100 queries/day (free tier)

### SerpAPI (Pay-per-use)

1.  **Sign up**: <a href="https://serpapi.com" rel="noopener" target="_blank">https://serpapi.com</a>
2.  **Get API Key**: <a href="https://serpapi.com/manage-api-key" rel="noopener" target="_blank">https://serpapi.com/manage-api-key</a>
3.  **Configure in UCM** (Admin → Config → Web Search):
    -   `enabled`: `true`
    -   `provider`: `serpapi`

**Environment key**:

```
SERPAPI_API_KEY=your-api-key
```

**Pricing**: ~\$0.002 per search

### Brave Search

1.  **Sign up**: <a href="https://brave.com/search/api" rel="noopener" target="_blank">https://brave.com/search/api</a>
2.  **Get API Key**: Brave API Dashboard
3.  **Configure in UCM** (Admin → Config → Web Search):
    -   `enabled`: `true`
    -   `provider`: `brave` (or `auto`)

**Environment key**:

```
BRAVE_API_KEY=your-api-key
```

### Supplementary Providers

Supplementary providers provide specialized knowledge and are always active in `auto` mode if enabled in UCM.

| Provider | Credentials | Type | Notes |
|----|----|----|----|
| **Wikipedia** | None | Built-in | Broad general knowledge |
| **Semantic Scholar** | Optional | API | Academic and scientific evidence |
| **Google Fact Check** | Required | API | Direct access to existing fact-checks |

**Configuration**: Enable per-provider in Admin → Config → Web Search.

### Auto Mode (Recommended)

Let FactHarbor choose the best available provider:

Set the search `provider` to `auto` in UCM (Admin → Config → Web Search).

**Behavior**:

-   Tries primary providers (Google CSE, SerpAPI, Brave) based on configured priority and availability.
-   Falls back through the primary chain until the max results requirement is met.
-   **Supplementary providers** (Wikipedia, Semantic Scholar, Google Fact Check) are always executed if enabled to provide deep-domain grounding.
-   Uses Gemini Grounded Search when `pipeline.llmProvider=google` and search `mode=grounded` (experimental).

### Domain Whitelist

Restrict searches to trusted domains:

```
{
  "domainWhitelist": ["who.int", "cdc.gov", "nih.gov", "nature.com", "science.org"]
}
```

This improves:

-   Source reliability
-   Result relevance
-   Analysis quality

------------------------------------------------------------------------

## Cost Optimization

<span id="prompt-optimization-baseline-v2-8-0"></span>

### Prompt Optimization Baseline (v2.8.0)

**Automatic estimated 20-30% cost reduction** across all providers and models:

As of February 2026 (version 2.8.0), all prompts have been optimized to reduce token usage by an estimated 20-30% while maintaining quality. This optimization:

-   Applies automatically to all LLM providers (Anthropic, OpenAI, Google, Mistral)
-   Works with both tiered and non-tiered model configurations
-   Reduces costs by an estimated ~20-30% per analysis compared to previous versions
-   Maintains analytical quality and accuracy

**No configuration required** - all users benefit from these savings automatically.

See Prompt Architecture v2.8.0 for technical details.

------------------------------------------------------------------------

### Multi-Tier Model Strategy

Use cheaper models for simple tasks, premium models for complex reasoning:

| Task | Recommended Model | Cost Saving (vs Sonnet baseline) |
|----|----|----|
| Claim extraction | Claude Haiku | ~75% cheaper (70% model + estimated 20-30% prompt optimization) |
| Evidence extraction | Claude Haiku | ~75% cheaper (70% model + estimated 20-30% prompt optimization) |
| Understanding | Claude Haiku | ~75% cheaper (70% model + estimated 20-30% prompt optimization) |
| Verdict generation | Claude Sonnet | estimated 20-30% cheaper (prompt optimization only) |

Note: Prompt optimization savings (estimated 20-30%) apply to ALL models and providers automatically.

Tiered model routing is configured via the **pipeline config** in Unified Configuration Management (UCM). Adjust the tiering toggle and per-task model names in the pipeline config editor (Admin UI → Config → Pipeline).

When enabled, FactHarbor routes models per pipeline task:

-   **Understand**: cheaper/faster model (provider default)
-   **Extract evidence**: cheaper/faster model (provider default)
-   **Verdict**: higher-quality model (provider default)

Default per-provider routing (unless overridden in pipeline config):

-   **Anthropic**: understand/extract → `claude-3-5-haiku-20241022`, verdict → `claude-sonnet-4-20250514`
-   **OpenAI**: understand/extract → `gpt-4o-mini`, verdict → `gpt-4o`
-   **Google**: understand/extract → `gemini-1.5-flash`, verdict → `gemini-1.5-pro`
-   **Mistral**: understand/extract → `mistral-small-latest`, verdict → `mistral-large-latest`

#### Per-task model overrides (optional)

Override the model names per task via the pipeline config (UCM), not environment variables. See [Unified Config Management](../unified-config-management/index.md) for editing pipeline profiles.

### Tuning analysis depth (implemented)

FactHarbor's primary "cost vs quality" knob is still **analysis mode**; tiered model routing is optional and can further reduce cost by using cheaper models for extraction-style steps:

```
{
  "analysisMode": "quick"
}
```

This affects limits like max iterations and max total sources (see `apps/web/src/lib/analyzer/config.ts`).

### Cost Control Settings

```
{
  "deterministic": true,
  "allowModelKnowledge": false
}
```

```
{
  "dateRestrict": "y"
}
```

### Cost Monitoring

Track costs via the admin dashboard (when implemented):

-   LLM token usage
-   Search API calls
-   Estimated monthly spend

------------------------------------------------------------------------

## Troubleshooting

### LLM Provider Issues

**"Invalid API key" error:**

1.  Verify key format:
    -   Anthropic: starts with `sk-ant-`
    -   OpenAI: starts with `sk-`
    -   Google: starts with `AIza`
2.  Test key at provider's console
3.  Check for spaces/quotes in `.env.local`
4.  Restart web server after changes

**"Rate limit exceeded":**

-   Check your API plan limits
-   Wait for rate limit reset
-   Consider upgrading to paid tier

**"Model not found":**

-   Verify model name matches provider's API
-   Check if you have access to the model
-   Some models require special access approval

### Search Provider Issues

**"No search results":**

1.  Verify search is enabled in UCM (Search config)
2.  Check search provider API key is valid
3.  Verify domain whitelist isn't too restrictive
4.  Check search provider status page

**"Quota exceeded" (Google CSE):**

-   Free tier: 100 queries/day
-   Upgrade to paid tier or switch to SerpAPI
-   Use `provider=auto` in UCM for automatic fallback

**"Search provider timeout":**

-   Network connectivity issues
-   Provider service disruption
-   Try alternative provider

**"No sources were fetched" (All pipelines including Dynamic):**

Both pipelines (ClaimAssessmentBoundary and Monolithic Dynamic) require search provider credentials to perform web searches. Without them, the pipeline will:

1.  Generate search queries (correctly)
2.  Attempt searches (loop runs but returns empty)
3.  Continue without external sources (LLM uses only internal knowledge)

**Verify search providers are configured:**

```
# Check logs for this message:
[Search] NO SEARCH PROVIDERS CONFIGURED! Set BRAVE_API_KEY, SERPAPI_API_KEY or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID
```

**Solution**: Configure at least one primary search provider:

```
# Option 1: Brave Search (recommended)
BRAVE_API_KEY=your-brave-api-key

# Option 2: SerpAPI
SERPAPI_API_KEY=your-serpapi-key

# Option 3: Google CSE (free tier available)
GOOGLE_CSE_API_KEY=your-google-api-key
GOOGLE_CSE_ID=your-custom-search-engine-id
```

**Verify configuration is working:** Look for successful search logs:

```
[Search] Available providers: Google CSE=true, SerpAPI=true, Brave=true, Wikipedia=true
[Search] Brave returned 4 results, total now: 4
```

### Configuration Validation

**Test configuration without running analysis:**

Visit: http://localhost:3000/admin/test-config

**Manual API test:**

```
# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'

# Test OpenAI
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hi"}],"max_tokens":10}'
```

------------------------------------------------------------------------

## Provider Comparison

### Quality vs Cost Trade-offs

| Provider          | Quality | Speed | Cost     | Best Use Case                |
|-------------------|---------|-------|----------|------------------------------|
| **Claude Sonnet** | 5/5     | 4/5   | \$\$\$   | Production, complex analysis |
| **Claude Haiku**  | 3/5     | 5/5   | \$       | Simple extraction tasks      |
| **GPT-4**         | 4/5     | 3/5   | \$\$\$\$ | High-quality general purpose |
| **Gemini Pro**    | 4/5     | 4/5   | \$\$     | Long context, multimodal     |
| **Mistral Large** | 3/5     | 4/5   | \$\$     | Cost-conscious deployments   |

### Recommended Provider by Use Case

-   **Production fact-checking**: Anthropic Claude Sonnet
-   **Development/testing**: Claude Haiku or Mistral
-   **Long articles (\>10k words)**: Google Gemini
-   **Tight budget**: Mistral Large
-   **Maximum accuracy**: GPT-4 or Claude Sonnet

------------------------------------------------------------------------

## Advanced Configuration

### Custom Model Selection

FactHarbor supports task-tiered model routing. Configure tiering and per-task model overrides in the **pipeline config** (UCM) rather than environment variables. See [Unified Config Management](../unified-config-management/index.md) for editing pipeline profiles.

### Fallback Configuration

The text-analysis pipeline is **LLM-only** and does not support heuristic or provider fallbacks. LLM provider selection and routing are controlled via the pipeline config.

### Knowledge Toggle

Control whether the LLM can use background knowledge:

```
FH_ALLOW_MODEL_KNOWLEDGE=false  # Strict evidence-only mode (recommended)
FH_ALLOW_MODEL_KNOWLEDGE=true   # Allow broader context
```

> **Known Issue**: This toggle is **not fully respected** in all analysis phases. The Understanding step currently allows model knowledge regardless of this setting.

------------------------------------------------------------------------

## Testing Recommendations

When switching providers or configurations:

1.  **Run test analysis with known inputs**
    -   Compare output quality
    -   Check for parsing errors
    -   Verify consistency
2.  **Test edge cases**
    -   Long articles
    -   Complex claims
    -   Multi-language content
3.  **Monitor costs**
    -   Track token usage
    -   Compare pricing across providers
    -   Optimize based on actual usage
4.  **Measure performance**
    -   Response times
    -   Success rates
    -   Error frequency

------------------------------------------------------------------------

## Getting Help

### Resources

-   **Anthropic Docs**: <a href="https://docs.anthropic.com" rel="noopener" target="_blank">https://docs.anthropic.com</a>
-   **OpenAI Docs**: <a href="https://platform.openai.com/docs" rel="noopener" target="_blank">https://platform.openai.com/docs</a>
-   **Google AI Docs**: <a href="https://ai.google.dev/docs" rel="noopener" target="_blank">https://ai.google.dev/docs</a>
-   **Mistral Docs**: <a href="https://docs.mistral.ai" rel="noopener" target="_blank">https://docs.mistral.ai</a>

### Support

-   Check `apps/web/debug-analyzer.log` for detailed logs
-   Use admin test config to validate setup
-   Review provider status pages for outages
-   Search GitHub issues for similar problems

------------------------------------------------------------------------

**Last Updated**: February 2, 2026

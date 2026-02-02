# LLM Configuration Guide

## Overview

FactHarbor supports multiple LLM (Large Language Model) providers and search providers. This guide explains how to configure, optimize, and switch between providers to balance cost, performance, and quality.

---

## Table of Contents

- [Supported Providers](#supported-providers)
- [Provider Selection](#provider-selection)
- [Environment Configuration](#environment-configuration)
- [Provider-Specific Optimization](#provider-specific-optimization)
- [Search Provider Configuration](#search-provider-configuration)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)

---

## Supported Providers

### LLM Providers

| Provider | Models | Best For | Status |
|----------|--------|----------|--------|
| **Anthropic** | `claude-sonnet-4-20250514` | Complex reasoning, analysis | ✅ Supported |
| **OpenAI** | `gpt-4o` | General purpose | ✅ Supported |
| **Google** | `gemini-1.5-pro` | Long context | ✅ Supported |
| **Mistral** | `mistral-large-latest` | Cost-effective | ✅ Supported |

### Search Providers

| Provider | API | Best For | Status |
|----------|-----|----------|--------|
| **Google Custom Search (CSE)** | Free tier available | General web search | ✅ Supported |
| **SerpAPI** | Pay-per-use | Reliable Google results | ✅ Supported |
| **Gemini Grounded Search** | Built-in | When using Gemini | ⚠️ Experimental (requires `pipeline.llmProvider=google` + search `mode=grounded`; only counts as “grounded” when the provider returns grounding metadata/citations) |
| **Brave Search** | API required | Privacy-focused | ❌ Not implemented (no adapter in code) |
| **Tavily** | API required | AI-optimized | ❌ Not implemented (no adapter in code) |
| **Bing Search** | API required | General web search | ❌ Not implemented (no adapter in code) |

---

## Provider Selection

### Setting the LLM Provider

Configure via UCM (Admin → Config → Pipeline):

```json
{
  "llmProvider": "anthropic"
}
```

Supported values: `anthropic`, `openai`, `google`, `mistral`.

### Provider API Keys

**Anthropic Claude** (Recommended):
```bash
ANTHROPIC_API_KEY=sk-ant-...
```
- Get key: https://console.anthropic.com/settings/keys
- Legacy default model (tiering off): `claude-sonnet-4-20250514`
- Best for: Complex analysis, high-quality reasoning

**OpenAI**:
```bash
OPENAI_API_KEY=sk-...
```
- Get key: https://platform.openai.com/api-keys
- Legacy default model (tiering off): `gpt-4o`
- Best for: General purpose, established ecosystem

**Google Gemini**:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```
- Get key: https://aistudio.google.com/app/apikey
- Legacy default model (tiering off): `gemini-1.5-pro`
- Best for: Long context, multimodal inputs

**Mistral AI**:
```bash
MISTRAL_API_KEY=...
```
- Get key: https://console.mistral.ai/api-keys
- Legacy default model (tiering off): `mistral-large-latest`
- Best for: Cost-conscious deployments

---

## Environment Configuration

### Complete `.env.local` Example

Provider selection and analysis behavior are configured in UCM (Admin → Config). The environment only
stores API keys and infrastructure settings.

```bash
# API Keys (configure the providers you intend to use)
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# GOOGLE_GENERATIVE_AI_API_KEY=AIza-your-key-here
# MISTRAL_API_KEY=your-key-here

# Search API Keys (search provider selected in UCM)
SERPAPI_API_KEY=your-serpapi-key
# Or Google Custom Search:
# GOOGLE_CSE_API_KEY=your-cse-key
# GOOGLE_CSE_ID=your-cse-id
```

### Configuration Validation

Test your configuration at: http://localhost:3000/admin/test-config

This admin interface will:
- ✅ Validate all API keys
- ✅ Test LLM provider connectivity
- ✅ Test search provider connectivity
- ✅ Show which services are active

---

## Provider-Specific Optimization

> **📚 Comprehensive Guide**: See [Provider-Specific Prompt Formatting](../REFERENCE/Provider_Prompt_Formatting.md) for detailed documentation on v2.8.0 prompt architecture.

### Overview (v2.8.0+)

FactHarbor uses **provider-specific prompt variants** to optimize performance across different LLMs. Each provider has unique strengths and preferred prompt structures:

| Provider | Format | Strengths | Optimizations |
|----------|--------|-----------|---------------|
| **Anthropic Claude** | XML-structured | Nuanced reasoning, AnalysisContext detection | XML tags, thinking blocks, prefill technique |
| **OpenAI GPT-4** | Markdown | General purpose, schema adherence | Clear headings, numbered lists, code blocks |
| **Google Gemini** | Example-heavy | Long context, visual formatting | Emojis, bullets, repetition, multiple examples |
| **Mistral** | Formal academic | Cost-effective, bilingual | Explicit reasoning chains, French examples |

### General Optimization Principles

1. **Prompt Composition**:
   - Base prompt (universal logic)
   - Provider variant (format optimization)
   - Config adaptation (tiering, knowledge mode)

2. **Temperature Settings**:
   - Use `FH_DETERMINISTIC=true` for reproducible results (temperature = 0.0)
   - Override per-provider if needed via PromptConfig

3. **Token Limits**:
   - Claude: 200k tokens
   - GPT-4: 128k tokens
   - Gemini: 2M tokens
   - Mistral: 128k tokens

### Configuration

Provider-specific settings are configured via **PromptConfig** in the Unified Config Management system:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "temperature": 0.2,
  "maxTokens": 8000,
  "tier": "standard"
}
```

See: [Unified Config Management User Guide](Unified_Config_Management.md) for profile management

---

## Search Provider Configuration

### Google Custom Search (Free Tier)

1. **Get API Key**: https://developers.google.com/custom-search/v1/introduction
2. **Create Custom Search Engine**: https://cse.google.com/cse/
3. **Configure in UCM** (Admin → Config → Web Search):
   - `enabled`: `true`
   - `provider`: `google-cse`

   **Environment keys**:
   ```bash
   GOOGLE_CSE_API_KEY=your-api-key
   GOOGLE_CSE_ID=your-cse-id
   ```

**Limits**: 100 queries/day (free tier)

### SerpAPI (Pay-per-use)

1. **Sign up**: https://serpapi.com
2. **Get API Key**: https://serpapi.com/manage-api-key
3. **Configure in UCM** (Admin → Config → Web Search):
   - `enabled`: `true`
   - `provider`: `serpapi`

   **Environment key**:
   ```bash
   SERPAPI_API_KEY=your-api-key
   ```

**Pricing**: ~$0.002 per search

### Auto Mode (Recommended)

Let FactHarbor choose the best available provider:

Set the search `provider` to `auto` in UCM (Admin → Config → Web Search).

**Behavior**:
- Tries Google CSE first (if configured)
- Falls back to SerpAPI for remaining slots
- Uses Gemini Grounded Search when `pipeline.llmProvider=google` and search `mode=grounded` (experimental). If grounding metadata/citations are missing, FactHarbor should fall back to standard search rather than treating model synthesis as evidence.

### Domain Whitelist

Restrict searches to trusted domains:

```json
{
  "domainWhitelist": ["who.int", "cdc.gov", "nih.gov", "nature.com", "science.org"]
}
```

This improves:
- Source reliability
- Result relevance
- Analysis quality

---

## Cost Optimization

### Multi-Tier Model Strategy

Use cheaper models for simple tasks, premium models for complex reasoning:

| Task | Recommended Model | Cost Saving |
|------|------------------|-------------|
| Claim extraction | Claude Haiku | 70% cheaper |
| Fact extraction | Claude Haiku | 70% cheaper |
| Understanding | Claude Haiku | 70% cheaper |
| Verdict generation | Claude Sonnet | Baseline |

Tiered model routing is configured via the **pipeline config** in Unified Configuration Management (UCM). Adjust the tiering toggle and per-task model names in the pipeline config editor (Admin UI → Config → Pipeline).

When enabled, FactHarbor routes models per pipeline task:
- **Understand**: cheaper/faster model (provider default)
- **Extract facts**: cheaper/faster model (provider default)
- **Verdict**: higher-quality model (provider default)

Default per-provider routing (unless overridden in pipeline config):
- **Anthropic**: understand/extract → `claude-3-5-haiku-20241022`, verdict → `claude-sonnet-4-20250514`
- **OpenAI**: understand/extract → `gpt-4o-mini`, verdict → `gpt-4o`
- **Google**: understand/extract → `gemini-1.5-flash`, verdict → `gemini-1.5-pro`
- **Mistral**: understand/extract → `mistral-small-latest`, verdict → `mistral-large-latest`

#### Per-task model overrides (optional)

Override the model names per task via the pipeline config (UCM), not environment variables. See [Unified Config Management User Guide](Unified_Config_Management.md) for editing pipeline profiles.

### Tuning analysis depth (implemented)

FactHarbor’s primary “cost vs quality” knob is still **analysis mode**; tiered model routing is optional and can further reduce cost by using cheaper models for extraction-style steps:

```json
{
  "analysisMode": "quick"
}
```

This affects limits like max iterations and max total sources (see `apps/web/src/lib/analyzer/config.ts`).

### Cost Control Settings

```json
{
  "deterministic": true,
  "allowModelKnowledge": false
}
```

```json
{
  "dateRestrict": "y"
}
```

### Cost Monitoring

Track costs via the admin dashboard (when implemented):
- LLM token usage
- Search API calls
- Estimated monthly spend

---

## Troubleshooting

### LLM Provider Issues

**"Invalid API key" error:**
1. Verify key format:
   - Anthropic: starts with `sk-ant-`
   - OpenAI: starts with `sk-`
   - Google: starts with `AIza`
2. Test key at provider's console
3. Check for spaces/quotes in `.env.local`
4. Restart web server after changes

**"Rate limit exceeded":**
- Check your API plan limits
- Wait for rate limit reset
- Consider upgrading to paid tier

**"Model not found":**
- Verify model name matches provider's API
- Check if you have access to the model
- Some models require special access approval

### Search Provider Issues

**"No search results":**
1. Verify search is enabled in UCM (Search config)
2. Check search provider API key is valid
3. Verify domain whitelist isn't too restrictive
4. Check search provider status page

**"Quota exceeded" (Google CSE):**
- Free tier: 100 queries/day
- Upgrade to paid tier or switch to SerpAPI
- Use `provider=auto` in UCM for automatic fallback

**"Search provider timeout":**
- Network connectivity issues
- Provider service disruption
- Try alternative provider

**"No sources were fetched" (All pipelines including Dynamic):**

All three pipelines (Orchestrated, Monolithic Canonical, Monolithic Dynamic) require search provider credentials to perform web searches. Without them, the pipeline will:
1. Generate search queries (correctly)
2. Attempt searches (loop runs but returns empty)
3. Continue without external sources (LLM uses only internal knowledge)

**Verify search providers are configured:**
```bash
# Check logs for this message:
[Search] ❌ NO SEARCH PROVIDERS CONFIGURED! Set SERPAPI_API_KEY or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID
```

**Solution**: Configure at least one search provider:
```bash
# Option 1: SerpAPI (simpler setup)
SERPAPI_API_KEY=your-serpapi-key

# Option 2: Google CSE (free tier available)
GOOGLE_CSE_API_KEY=your-google-api-key
GOOGLE_CSE_ID=your-custom-search-engine-id
```

**Verify configuration is working:**
Look for successful search logs:
```bash
[Search] Available providers: Google CSE=true, SerpAPI=true
[Search] Google CSE returned 4 results, total now: 4
```

### Configuration Validation

**Test configuration without running analysis:**

Visit: http://localhost:3000/admin/test-config

**Manual API test:**

```bash
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

---

## Provider Comparison

### Quality vs Cost Trade-offs

| Provider | Quality | Speed | Cost | Best Use Case |
|----------|---------|-------|------|---------------|
| **Claude Sonnet** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$$ | Production, complex analysis |
| **Claude Haiku** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $ | Simple extraction tasks |
| **GPT-4** | ⭐⭐⭐⭐ | ⭐⭐⭐ | $$$$ | High-quality general purpose |
| **Gemini Pro** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ | Long context, multimodal |
| **Mistral Large** | ⭐⭐⭐ | ⭐⭐⭐⭐ | $$ | Cost-conscious deployments |

### Recommended Provider by Use Case

- **Production fact-checking**: Anthropic Claude Sonnet
- **Development/testing**: Claude Haiku or Mistral
- **Long articles (>10k words)**: Google Gemini
- **Tight budget**: Mistral Large
- **Maximum accuracy**: GPT-4 or Claude Sonnet

---

## Advanced Configuration

### Custom Model Selection

FactHarbor supports task-tiered model routing. Configure tiering and per-task model overrides in the **pipeline config** (UCM) rather than environment variables. See [Unified Config Management User Guide](Unified_Config_Management.md) for editing pipeline profiles.

### Fallback Configuration

The text-analysis pipeline is **LLM-only** and does not support heuristic or provider fallbacks. LLM provider selection and routing are controlled via the pipeline config.

### Knowledge Toggle

Control whether the LLM can use background knowledge:

```bash
FH_ALLOW_MODEL_KNOWLEDGE=false  # Strict evidence-only mode (recommended)
FH_ALLOW_MODEL_KNOWLEDGE=true   # Allow broader context
```

> **Known Issue**: This toggle is **not fully respected** in all analysis phases. The Understanding step currently allows model knowledge regardless of this setting.

---

## Testing Recommendations

When switching providers or configurations:

1. **Run test analysis with known inputs**
   - Compare output quality
   - Check for parsing errors
   - Verify consistency

2. **Test edge cases**
   - Long articles
   - Complex claims
   - Multi-language content

3. **Monitor costs**
   - Track token usage
   - Compare pricing across providers
   - Optimize based on actual usage

4. **Measure performance**
   - Response times
   - Success rates
   - Error frequency

---

## Getting Help

### Resources

- **Anthropic Docs**: https://docs.anthropic.com
- **OpenAI Docs**: https://platform.openai.com/docs
- **Google AI Docs**: https://ai.google.dev/docs
- **Mistral Docs**: https://docs.mistral.ai

### Support

- Check `apps/web/debug-analyzer.log` for detailed logs
- Use admin test config to validate setup
- Review provider status pages for outages
- Search GitHub issues for similar problems

---

**Last Updated**: January 2026

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
| **Gemini Grounded Search** | Built-in | When using Gemini | ⚠️ Experimental (requires `LLM_PROVIDER=gemini` + `FH_SEARCH_MODE=grounded`; only counts as “grounded” when the provider returns grounding metadata/citations) |
| **Brave Search** | API required | Privacy-focused | ❌ Not implemented (no adapter in code) |
| **Tavily** | API required | AI-optimized | ❌ Not implemented (no adapter in code) |
| **Bing Search** | API required | General web search | ❌ Not implemented (no adapter in code) |

---

## Provider Selection

### Setting the LLM Provider

Configure via environment variable in `apps/web/.env.local`:

```bash
# Choose ONE provider
LLM_PROVIDER=anthropic  # Options: openai | anthropic | google | gemini | mistral | claude
```

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

```bash
# LLM Provider Selection
LLM_PROVIDER=anthropic

# API Keys (only configure the one you're using)
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# GOOGLE_GENERATIVE_AI_API_KEY=AIza-your-key-here
# MISTRAL_API_KEY=your-key-here

# Search Provider
FH_SEARCH_ENABLED=true
FH_SEARCH_PROVIDER=auto  # Options: auto | serpapi | google-cse

# Search API Keys
SERPAPI_API_KEY=your-serpapi-key
# Or Google Custom Search:
# GOOGLE_CSE_API_KEY=your-cse-key
# GOOGLE_CSE_ID=your-cse-id

# Optional: Domain whitelist for trusted sources
FH_SEARCH_DOMAIN_WHITELIST=who.int,cdc.gov,nih.gov,justice.gov

# Analysis Configuration
FH_DETERMINISTIC=true  # Use temperature=0 for reproducible results
FH_ALLOW_MODEL_KNOWLEDGE=false  # Require evidence-based analysis only

# Experimental Features
FH_SEARCH_MODE=standard  # Options: standard | grounded (Gemini only; experimental)
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
3. **Configure**:
   ```bash
   FH_SEARCH_PROVIDER=google-cse
   GOOGLE_CSE_API_KEY=your-api-key
   GOOGLE_CSE_ID=your-cse-id
   ```

**Limits**: 100 queries/day (free tier)

### SerpAPI (Pay-per-use)

1. **Sign up**: https://serpapi.com
2. **Get API Key**: https://serpapi.com/manage-api-key
3. **Configure**:
   ```bash
   FH_SEARCH_PROVIDER=serpapi
   SERPAPI_API_KEY=your-api-key
   ```

**Pricing**: ~$0.002 per search

### Auto Mode (Recommended)

Let FactHarbor choose the best available provider:

```bash
FH_SEARCH_PROVIDER=auto
```

**Behavior**:
- Tries Google CSE first (if configured)
- Falls back to SerpAPI for remaining slots
- Uses Gemini Grounded Search when `LLM_PROVIDER=gemini` and `FH_SEARCH_MODE=grounded` (experimental). If grounding metadata/citations are missing, FactHarbor should fall back to standard search rather than treating model synthesis as evidence.

### Domain Whitelist

Restrict searches to trusted domains:

```bash
FH_SEARCH_DOMAIN_WHITELIST=who.int,cdc.gov,nih.gov,nature.com,science.org
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

Tiered model routing is **implemented** but **off by default** to preserve legacy behavior.

Enable it with:

```bash
FH_LLM_TIERING=on
```

When enabled, FactHarbor routes models per pipeline task:
- **Understand**: cheaper/faster model (provider default)
- **Extract facts**: cheaper/faster model (provider default)
- **Verdict**: higher-quality model (provider default)

Default per-provider routing when `FH_LLM_TIERING=on` (unless overridden):
- **Anthropic**: understand/extract → `claude-3-5-haiku-20241022`, verdict → `claude-sonnet-4-20250514`
- **OpenAI**: understand/extract → `gpt-4o-mini`, verdict → `gpt-4o`
- **Google**: understand/extract → `gemini-1.5-flash`, verdict → `gemini-1.5-pro`
- **Mistral**: understand/extract → `mistral-small-latest`, verdict → `mistral-large-latest`

#### Per-task model overrides (optional)

You can override the model names per task (within the selected `LLM_PROVIDER`):

```bash
# Turn on tiered routing
FH_LLM_TIERING=on

# Optional overrides (model names are provider-specific)
FH_MODEL_UNDERSTAND=claude-3-5-haiku-20241022
FH_MODEL_EXTRACT_FACTS=claude-3-5-haiku-20241022
FH_MODEL_VERDICT=claude-sonnet-4-20250514
```

### Tuning analysis depth (implemented)

FactHarbor’s primary “cost vs quality” knob is still **analysis mode**; tiered model routing is optional and can further reduce cost by using cheaper models for extraction-style steps:

```bash
# Options: quick (default) | deep
FH_ANALYSIS_MODE=quick
```

This affects limits like max iterations and max total sources (see `apps/web/src/lib/analyzer/config.ts`).

### Cost Control Settings

```bash
# Use deterministic mode to avoid redundant retries
FH_DETERMINISTIC=true

# Restrict to documented evidence only
FH_ALLOW_MODEL_KNOWLEDGE=false

# Optional: Limit search to recent results
FH_SEARCH_DATE_RESTRICT=y  # Options: y (year) | m (month) | w (week)
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
1. Verify `FH_SEARCH_ENABLED=true`
2. Check search provider API key is valid
3. Verify domain whitelist isn't too restrictive
4. Check search provider status page

**"Quota exceeded" (Google CSE):**
- Free tier: 100 queries/day
- Upgrade to paid tier or switch to SerpAPI
- Use `FH_SEARCH_PROVIDER=auto` for automatic fallback

**"Search provider timeout":**
- Network connectivity issues
- Provider service disruption
- Try alternative provider

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

FactHarbor supports task-tiered model routing (off by default). The supported environment variables are:

```bash
# Enable/disable tiered routing (default: off)
FH_LLM_TIERING=on

# Per-task model name overrides (optional)
FH_MODEL_UNDERSTAND=...
FH_MODEL_EXTRACT_FACTS=...
FH_MODEL_VERDICT=...
FH_MODEL_REPORT=...  # reserved for future use
```

### Fallback Configuration

> **Note**: Fallback configuration is **not yet implemented**.

Planned feature for automatic failover:

```bash
FH_LLM_FALLBACKS=anthropic,openai,google,mistral
```

When implemented, this will retry failed requests with alternative providers.

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

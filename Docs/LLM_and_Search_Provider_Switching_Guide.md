# LLM and Search Provider Switching Guide

**Date**: January 6, 2026  
**Last Updated**: January 6, 2026  
**Purpose**: Guidance for optimizing FactHarbor analyzer for different LLM providers

---

## Overview

FactHarbor supports multiple LLM providers (OpenAI, Anthropic/Claude, Google/Gemini, Mistral). Different providers have different strengths, limitations, and response characteristics. This guide provides recommendations for optimizing prompts and configuration when switching between providers.

---

## Provider-Specific Recommendations

### General Principles

1. **Shorter, prioritized prompts** for Gemini/Mistral
   - Avoid long, legal-heavy system prompts
   - Focus on essential instructions
   - Use bullet points and clear structure

2. **Strict JSON framing** for Mistral/Gemini
   - Reduce stray text in responses
   - Use explicit JSON schema examples
   - Add validation instructions

3. **Provider-specific profiles**
   - Temperature settings
   - Max tokens configuration
   - Prompt variants optimized for each provider
   - Keep parity across OpenAI/Anthropic/Google/Mistral

---

## Search Provider Switching

### Supported Providers (Current Implementation)

- `google-cse` (Google Custom Search)
- `serpapi` (SerpAPI Google search)
- `auto` (prefer Google CSE if configured, then SerpAPI)

**Not implemented yet**: Brave, Tavily.

### Environment Variables

Set provider selection:

- `FH_SEARCH_PROVIDER=auto|google-cse|serpapi`

Google CSE:

- `GOOGLE_CSE_API_KEY`
- `GOOGLE_CSE_ID`

SerpAPI:

- `SERPAPI_API_KEY`

Optional controls:

- `FH_SEARCH_ENABLED=true|false`
- `FH_SEARCH_MAX_RESULTS=6`
- `FH_SEARCH_DOMAIN_WHITELIST=who.int,cdc.gov,nih.gov`

### Behavior Notes

- `auto` uses Google CSE first (if configured), then SerpAPI for remaining slots.
- If neither provider is configured, search runs with zero results.
- Domain whitelist is applied after provider results are returned.

---

## Current Implementation Status

**Status**: Provider-specific optimizations are **not yet implemented**

**Current Behavior**:
- Same prompts used for all providers
- Same temperature/token settings across providers
- No provider-specific prompt variants

**Known Issues**:
- Long legal-heavy prompts may cause issues with Gemini/Mistral
- JSON parsing may be less reliable with some providers
- Response quality may vary between providers
- `FH_LLM_FALLBACKS` is documented but not implemented in model selection

---

## Recommended Implementation

### 1. Provider-Specific Prompt Variants

Create provider-specific prompt templates:
- **OpenAI/Anthropic**: Can handle longer, more detailed prompts
- **Gemini/Mistral**: Use shorter, more focused prompts
- **All providers**: Maintain semantic equivalence

### 2. JSON Schema Framing

For providers with less reliable JSON output:
- Add explicit JSON structure examples
- Include validation instructions
- Use stricter schema enforcement

### 3. Temperature and Token Configuration

Provider-specific defaults:
- **OpenAI**: Temperature 0.7, max tokens as needed
- **Anthropic**: Temperature 0.7, max tokens as needed
- **Gemini**: Temperature 0.6, adjust max tokens
- **Mistral**: Temperature 0.7, adjust max tokens

### 4. Centralize Knowledge Toggle

**Current Issue**: `FH_ALLOW_MODEL_KNOWLEDGE=false` is not respected in Step 1 (understanding prompt)

**Recommendation**: 
- Centralize knowledge toggle so `FH_ALLOW_MODEL_KNOWLEDGE=false` affects all steps:
  - Understanding phase
  - Evidence extraction
  - Verdict generation
  - Report generation

**Implementation**: Update all prompts to respect the toggle consistently.

---

## Testing Recommendations

When switching providers or implementing optimizations:

1. **Run same analysis with multiple providers**
   - Compare output quality
   - Check for parsing errors
   - Verify consistency

2. **Test edge cases**
   - Long prompts
   - Complex schemas
   - Multi-step reasoning

3. **Monitor costs**
   - Different providers have different pricing
   - Token usage may vary
   - Response times differ

---

## Future Enhancements

- [ ] Implement provider-specific prompt variants
- [ ] Add provider detection and automatic prompt selection
- [ ] Create provider performance benchmarks
- [ ] Document provider-specific quirks and workarounds
- [ ] Implement fallback logic for provider failures

---

## Related Documentation

- [`StatusAndNext.md`](./StatusAndNext.md) - Current implementation status
- [`Implementation_Review.md`](./Implementation_Review.md) - Detailed review findings
- [`LLM_REPORTING.md`](./LLM_REPORTING.md) - LLM integration details

---

**Last Updated**: January 6, 2026


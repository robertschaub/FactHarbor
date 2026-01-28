# FactHarbor Admin GUI Guide

## Overview

The FactHarbor Admin GUI provides web-based interfaces for administrators to:
- Manage unified configuration (search, calculation, and prompt configs)
- View and manage source reliability cache
- Test and validate API keys and service configurations

## Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| **Unified Configuration** | `/admin/config` | Manage all configuration types with version history |
| **Source Reliability** | `/admin/source-reliability` | View/manage cached source reliability scores |
| **Test Config** | `/admin/test-config` | Validate API keys and service connectivity |

---

## Unified Configuration Management

Navigate to: `http://localhost:3000/admin/config`

The Unified Configuration Management system provides a single interface for managing all FactHarbor configurations with version history, validation, and export capabilities.

### Configuration Types

| Type | Profile Keys | Description |
|------|-------------|-------------|
| **Search** | `default` | Web search provider settings |
| **Calculation** | `default` | Verdict aggregation and weighting parameters |
| **Prompt** | `orchestrated`, `monolithic-canonical`, `monolithic-dynamic`, `source-reliability` | LLM prompt templates for each pipeline |

### Tabs

- **Active**: View currently active configuration with version info
- **Edit**: Modify configuration using form-based editors (JSON) or text editor (prompts)
- **History**: Browse all saved versions with activation status
- **Effective** (Search/Calc only): See final config after environment variable overrides

### Features

#### Version Control
- Every saved configuration is immutable and content-addressed (SHA-256 hash)
- Full version history with timestamps and activation tracking
- One-click rollback to any previous version

#### Validation
- Real-time JSON schema validation for search/calculation configs
- Syntax highlighting and error markers for prompt editing
- Pre-save validation prevents invalid configurations

#### Export/Import
- Export any configuration as JSON or `.prompt.md` file
- Import configurations from files with schema validation

### Environment Variable Overrides

Search and Calculation configs support runtime overrides via environment variables:

| Config Type | Env Var | Field |
|-------------|---------|-------|
| Search | `FH_SEARCH_ENABLED` | `enabled` |
| Search | `FH_SEARCH_PROVIDER` | `provider` |
| Calculation | `FH_CALC_CONFIDENCE_THRESHOLD` | `aggregation.confidenceThreshold` |

The **Effective** tab shows the final configuration after overrides are applied.

---

## Configuration Test Dashboard

Navigate to: `http://localhost:3000/admin/test-config`

## Security (POC note)

The admin test UI calls `GET /api/admin/test-config`, which (currently) **does not require authentication** and can trigger **paid LLM/search API calls** if keys are configured.

- Keep this endpoint **local-only** during POC development.
- Before any public exposure, protect it with `FH_ADMIN_KEY` (and add rate limiting/cost quotas).

## Configuration Test Dashboard

The Configuration Test Dashboard allows you to verify that all required API keys and services are working correctly.

### Running Tests

1. Click the **"Run All Tests"** button
2. Wait for all tests to complete
3. Review the results

### Test Results Summary

After running tests, you'll see a summary showing:

| Metric | Description |
|--------|-------------|
| **Total Tests** | Total number of configuration tests run |
| **Passed** | Services that are properly configured and working |
| **Failed** | Services with invalid or broken configurations |
| **Not Configured** | Services missing required environment variables |
| **Skipped** | Services not selected as the current provider |

### Test Statuses

Each service test returns one of the following statuses:

- **Success** - The service is properly configured and responding
- **Error** - The API key is invalid, expired, or the service is unreachable
- **Not Configured** - Required environment variables are missing
- **Skipped** - The service is not selected as the active provider

## Services Tested

### FactHarbor Core Services

| Service | Environment Variables | Description |
|---------|----------------------|-------------|
| FH API Base URL | `FH_API_BASE_URL` | Tests connectivity to the FactHarbor API backend |
| FH Admin Key | `FH_ADMIN_KEY` | Validates the admin authentication key |
| FH Internal Runner Key | `FH_INTERNAL_RUNNER_KEY` | Validates the internal job runner key |

### LLM Providers

Only the currently selected LLM provider (via `LLM_PROVIDER`) is actively tested. Others are marked as "Skipped".

| Provider | Environment Variables | Config URL |
|----------|----------------------|------------|
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Anthropic | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| Google Generative AI | `GOOGLE_GENERATIVE_AI_API_KEY` | https://aistudio.google.com/app/apikey |
| Mistral AI | `MISTRAL_API_KEY` | https://console.mistral.ai/api-keys |

**Setting the LLM Provider:**
```
LLM_PROVIDER=anthropic   # Options: openai, anthropic, google, mistral
```

### Search Providers

Search providers are tested when search is enabled (`FH_SEARCH_ENABLED=true`) and the provider is selected or auto-detection is enabled.

| Provider | Environment Variables | Config URL |
|----------|----------------------|------------|
| SerpAPI | `SERPAPI_API_KEY` | https://serpapi.com/manage-api-key |
| Google Custom Search | `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID` | https://developers.google.com/custom-search/v1/introduction |

**Setting the Search Provider:**
```
FH_SEARCH_ENABLED=true
FH_SEARCH_PROVIDER=auto   # Options: auto, serpapi, google-cse
```

## Troubleshooting

### Common Issues

#### API Key contains placeholder text
**Problem:** The test shows "contains placeholder text" error.

**Solution:** Replace placeholder values like `PASTE_YOUR_KEY_HERE`, `sk-...`, or `AIza...` with actual API keys from the provider.

#### Service not configured
**Problem:** Required environment variables are missing.

**Solution:**
1. Add the required environment variables to `apps/web/.env.local`
2. Restart the development server (`npm run dev`)

#### Service skipped
**Problem:** The service shows as "Skipped".

**Solution:** This is normal if you're using a different provider. Update your `LLM_PROVIDER` or `FH_SEARCH_PROVIDER` setting if you want to use this service instead.

#### Connection errors
**Problem:** The service shows connection timeout or network errors.

**Solution:**
1. Check your internet connection
2. Verify the API key is valid by visiting the provider's configuration URL
3. Ensure no firewall or proxy is blocking the connection

### Environment Variables Reference

Create or edit `apps/web/.env.local` with the following variables:

```bash
# FactHarbor Core
FH_API_BASE_URL=http://localhost:8080
FH_ADMIN_KEY=your-admin-key
FH_INTERNAL_RUNNER_KEY=your-runner-key

# LLM Provider (choose one)
LLM_PROVIDER=anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...

# Search Provider
FH_SEARCH_ENABLED=true
FH_SEARCH_PROVIDER=auto
SERPAPI_API_KEY=...
GOOGLE_CSE_API_KEY=...
GOOGLE_CSE_ID=...
```

## API Endpoint

The admin test functionality is also available via API:

```
GET /api/admin/test-config
```

**Response:**
```json
{
  "summary": {
    "total": 10,
    "success": 5,
    "error": 1,
    "not_configured": 2,
    "skipped": 2
  },
  "results": [
    {
      "service": "Anthropic",
      "status": "success",
      "message": "Anthropic API key is valid",
      "details": "Test response: OK",
      "configUrl": "https://console.anthropic.com/settings/keys"
    }
  ],
  "timestamp": "2026-01-03T12:00:00.000Z"
}
```

## Security Notes

- The admin pages should be protected in production environments
- API keys are never displayed in the UI, only validation status
- Test responses are minimal to avoid exposing sensitive data

# Search Provider Testing & Error Notification Integration

**Status**: ✅ Complete (2026-02-18)
**Version**: 1.0

## Summary

Integrated the new search providers (Brave, cache, circuit breaker) into:
1. **Test Config Page** (`/admin/test-config`) - automated testing
2. **System Health Banner** - real-time error notifications
3. **About Footer** - displays active search providers and fallback hierarchy

---

## What Was Added

### 1. Test Config Page (`/admin/test-config`)

Added comprehensive tests for all search components:

#### New Tests

| Test | What It Checks | Status Codes |
|------|----------------|--------------|
| **Brave Search API** | API key validity, connectivity, quota | success / error / not_configured / skipped |
| **Search Cache** | Cache stats, hit rate, DB health | success / error / skipped |
| **Search Circuit Breaker** | Provider health, circuit states, success rates | success / error / skipped |

#### Test Results Example

```json
{
  "service": "Brave Search API",
  "status": "success",
  "message": "Brave API key is valid",
  "details": "Test search returned 10 results",
  "configUrl": "https://api-dashboard.search.brave.com"
}
```

---

### 2. System Health Banner

Updated to show **provider-specific search errors**:

#### Before

```
⚠️ Provider issues detected
Web search unavailable — analyses will have limited or no evidence
```

#### After

```
⚠️ Provider issues detected
Google Custom Search unavailable — using fallback provider (circuit OPEN)
```

#### New Provider Messages

| Provider | Message |
|----------|---------|
| `google_cse` | "Google Custom Search unavailable — using fallback provider" |
| `brave` | "Brave Search unavailable — using fallback provider" |
| `serpapi` | "SerpAPI unavailable — using fallback provider" |

---

### 3. About Footer

Updated to show **active search providers with fallback hierarchy**:

#### Display Format

```
Search Providers: Google-CSE → Brave → SerpAPI
```

Shows the provider priority chain:
- **First provider** = Primary (tried first)
- **Subsequent providers** = Fallbacks (tried in order if primary fails)

#### Example Scenarios

| Config | Display |
|--------|---------|
| `provider: "google-cse"` | `Google-CSE` |
| `provider: "brave"` | `Brave` |
| `provider: "auto"` (all enabled) | `Google-CSE → Brave → SerpAPI` |
| `provider: "auto"` (Google CSE circuit open) | Still shows `Google-CSE → Brave → SerpAPI` (reflects config, not current state) |

**Note:** The About footer shows configured providers, not real-time circuit status. For current health, check the System Health Banner.

---

## How It Works

### Test Config Flow

```
User visits: http://localhost:3000/admin/test-config

GET /api/admin/test-config
  ├─ Tests FH API, Admin keys
  ├─ Tests LLM providers (Anthropic, OpenAI, Google, Mistral)
  ├─ Tests Search providers:
  │   ├─ Google CSE (if enabled)
  │   ├─ SerpAPI (if enabled)
  │   └─ Brave (if enabled) ✅ NEW
  ├─ Tests Search Cache ✅ NEW
  └─ Tests Circuit Breaker ✅ NEW

Returns JSON summary:
{
  "summary": { "total": 12, "success": 10, "error": 0, ... },
  "results": [ ... ]
}
```

---

### System Health Banner Flow

```
SystemHealthBanner (React component)
  ├─ Polls every 30s: GET /api/fh/system-health
  │
  └─ GET /api/fh/system-health
      ├─ Gets base health state (search/llm providers)
      ├─ Gets search circuit breaker stats ✅ NEW
      │   ├─ Google-CSE circuit state
      │   ├─ Brave circuit state
      │   └─ SerpAPI circuit state
      ├─ Merges unhealthy search providers into health state
      └─ Returns extended health state

SystemHealthBanner displays:
  ├─ System paused (if paused)
  └─ Provider-specific errors (if any circuits open) ✅ NEW
```

---

### About Footer Flow

```
AboutBox (React component, bottom of every page)
  ├─ On mount: GET /api/version
  │
  └─ GET /api/version
      ├─ Gets pipeline config from UCM
      ├─ Gets search config from UCM
      ├─ Calls getActiveSearchProviders(searchConfig) ✅ NEW
      │   ├─ Reads provider priority from config
      │   ├─ Filters enabled providers
      │   └─ Returns sorted array (e.g., ["Google-CSE", "Brave", "SerpAPI"])
      └─ Returns system info with search_providers array

AboutBox displays:
  ├─ Environment (development/production)
  ├─ LLM Provider (anthropic/openai/google/mistral)
  ├─ Search Providers (e.g., "Google-CSE → Brave → SerpAPI") ✅ NEW
  ├─ Pipeline Variant (ClaimBoundary/Monolithic Dynamic)
  ├─ Analysis Mode (Quick/Deep)
  ├─ API Version
  ├─ Build (git SHA)
  └─ System Health (healthy/degraded/unhealthy)
```

---

## Testing

### 1. Test Config Page

**URL**: http://localhost:3000/admin/test-config

**What to check**:
- ✅ All 3 search providers tested (Google CSE, SerpAPI, Brave)
- ✅ Search cache shows stats
- ✅ Circuit breaker shows provider health
- ✅ Status indicators: ✓ (success), ✗ (error), ⊘ (not configured), ⊝ (skipped)

**Example output**:

```json
{
  "summary": {
    "total": 12,
    "success": 9,
    "error": 0,
    "not_configured": 1,
    "skipped": 2
  },
  "results": [
    { "service": "Google Custom Search", "status": "success", ... },
    { "service": "Brave Search API", "status": "success", ... },
    { "service": "Search Cache", "status": "success", "message": "1,234 cached queries (856 unique)" },
    { "service": "Search Circuit Breaker", "status": "success", "message": "All circuits closed (healthy)" }
  ]
}
```

---

### 2. System Health Banner

**Trigger a provider failure** to test the banner:

```bash
# Temporarily disable Google CSE
# Edit .env.local and comment out:
# GOOGLE_CSE_API_KEY=...

# Restart dev server
cd apps/web && npm run dev

# Run 3 searches to trigger circuit breaker
curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{"claim": "test 1"}'

curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{"claim": "test 2"}'

curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{"claim": "test 3"}'

# Check logs for:
# [Circuit-Breaker] Google-CSE: CLOSED → OPEN

# Visit any page - you should see the health banner:
# ⚠️ Provider issues detected
# Google Custom Search unavailable — using fallback provider
```

---

### 3. Verify Circuit Breaker Auto-Recovery

After 5 minutes (default `resetTimeoutSec`), the circuit will automatically test recovery:

```
[Circuit-Breaker] Google-CSE: OPEN → HALF_OPEN (timeout elapsed, attempting recovery)
[Search] Trying Google-CSE (need 10 results)...
```

If the next search succeeds:

```
[Circuit-Breaker] Google-CSE: HALF_OPEN → CLOSED (recovery successful)
```

The health banner will disappear.

---

### 4. Verify About Footer Display

**Check the About footer** (bottom of any page):

1. **Visit any page** in the app (e.g., http://localhost:3000)
2. **Click the "About" footer link** (bottom-right corner)
3. **Verify System Info displays**:
   - **LLM Provider**: Shows active LLM (e.g., "anthropic")
   - **Search Providers**: Shows fallback chain (e.g., "Google-CSE → Brave → SerpAPI")

**Expected display formats:**

| Config | Expected Display |
|--------|-----------------|
| Only Google CSE enabled | `Google-CSE` |
| Only Brave enabled | `Brave` |
| Auto mode (all enabled) | `Google-CSE → Brave → SerpAPI` |
| Google CSE disabled | `Brave → SerpAPI` |

**Note:** The About footer shows **configured** providers (what will be tried), not **current** circuit states. For real-time health, check the System Health Banner.

---

## API Reference

### GET /api/admin/test-config

**Description**: Tests all configured services (LLM, search, cache, circuit breaker)

**Response**:

```json
{
  "summary": {
    "total": 12,
    "success": 10,
    "error": 1,
    "not_configured": 0,
    "skipped": 1
  },
  "results": [
    {
      "service": "Brave Search API",
      "status": "success",
      "message": "Brave API key is valid",
      "details": "Test search returned 10 results",
      "configUrl": "https://api-dashboard.search.brave.com"
    },
    ...
  ],
  "timestamp": "2026-02-18T08:00:00.000Z"
}
```

---

### GET /api/fh/system-health

**Description**: Returns system health state (for UI banner polling)

**Response**:

```json
{
  "providers": {
    "search": { "state": "closed", "consecutiveFailures": 0, ... },
    "llm": { "state": "closed", "consecutiveFailures": 0, ... },
    "google_cse": { "state": "open", "consecutiveFailures": 3, "lastFailureMessage": "Google-CSE circuit OPEN" },
    "brave": { "state": "closed", "consecutiveFailures": 0, ... }
  },
  "systemPaused": false,
  "pausedAt": null,
  "pauseReason": null
}
```

**Note**: Only **unhealthy** search providers (circuit not closed) are included.

---

### GET /api/version

**Description**: Returns web service version info and active provider configuration

**Response**:

```json
{
  "service": "factharbor-web",
  "node_env": "development",
  "llm_provider": "anthropic",
  "search_providers": ["Google-CSE", "Brave", "SerpAPI"],
  "git_sha": "c6f6275...",
  "now_utc": "2026-02-18T08:00:00.000Z"
}
```

**Note**: `search_providers` array shows configured providers in priority order (first = primary, rest = fallbacks).

---

## Files Modified

### Test Config

1. **[/api/admin/test-config/route.ts](../../apps/web/src/app/api/admin/test-config/route.ts)**
   - Added `testBrave()` function
   - Added `testSearchCache()` function
   - Added `testSearchCircuitBreaker()` function
   - Integrated all 3 into test suite

### System Health

2. **[/api/fh/system-health/route.ts](../../apps/web/src/app/api/fh/system-health/route.ts)**
   - Imports `getAllProviderStats()` from search-circuit-breaker
   - Merges search provider circuit states into health response
   - Returns extended health state with provider-specific errors

3. **[SystemHealthBanner.tsx](../../apps/web/src/components/SystemHealthBanner.tsx)**
   - Added provider messages for: `google_cse`, `brave`, `serpapi`
   - Banner now shows specific provider errors

### About Footer

4. **[/api/version/route.ts](../../apps/web/src/app/api/version/route.ts)**
   - Imports `getActiveSearchProviders()` from web-search
   - Extends response with `search_providers` array
   - Returns active provider list in priority order

5. **[AboutBox.tsx](../../apps/web/src/components/AboutBox.tsx)**
   - Added `search_providers` field to `WebVersion` type
   - Added `formatSearchProviders()` helper function
   - Displays search provider fallback chain in System Info section

---

## Configuration

### Search Provider Tests

Tests run automatically based on Search Config (`search.provider`):

| Config | Providers Tested |
|--------|-----------------|
| `provider: "google-cse"` | Google CSE only |
| `provider: "brave"` | Brave only |
| `provider: "serpapi"` | SerpAPI only |
| `provider: "auto"` | All 3 (Google CSE, Brave, SerpAPI) |
| `enabled: false` | None (all skipped) |

### Circuit Breaker Thresholds

Default values (from Search Config `circuitBreaker`):

- **Failure threshold**: 3 consecutive failures
- **Reset timeout**: 300 seconds (5 minutes)
- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED

Configurable via UCM (Admin → Config → search):

```json
{
  "circuitBreaker": {
    "enabled": true,
    "failureThreshold": 3,
    "resetTimeoutSec": 300
  }
}
```

---

## Monitoring

### Real-Time Health

**System Health Banner** (top of every page):
- Automatically appears when providers fail
- Updates every 30 seconds
- Non-dismissible (reflects real-time state)

### Manual Health Check

```bash
curl http://localhost:3000/api/fh/system-health | jq
```

### Test All Services

```bash
curl http://localhost:3000/api/admin/test-config | jq '.summary'
```

### Circuit Breaker Stats

```bash
curl http://localhost:3000/api/admin/search-stats \
  -H "X-Admin-Key: dev123" | jq '.circuitBreaker'
```

---

## Troubleshooting

### "Brave Search API: not_configured"

**Solution**: Add `BRAVE_API_KEY=...` to `apps/web/.env.local` and restart

---

### "Search Cache: error"

**Solution**: Check search-cache.db file permissions. Delete and restart to recreate:

```bash
rm apps/web/search-cache.db
cd apps/web && npm run dev
```

---

### "Circuit Breaker: All circuits healthy (no requests yet)"

**Solution**: Normal for fresh install. Run a search to populate stats:

```bash
curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{"claim": "test search"}'
```

---

### Health Banner Shows "Google CSE unavailable" But API Key Is Valid

**Solution**: Circuit may have opened due to quota exhaustion. Check:

1. **Circuit state**:
   ```bash
   curl http://localhost:3000/api/admin/search-stats \
     -H "X-Admin-Key: dev123" | jq '.circuitBreaker[] | select(.provider == "Google-CSE")'
   ```

2. **Manually reset circuit**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/search-stats \
     -H "X-Admin-Key: dev123" \
     -H "Content-Type: application/json" \
     -d '{"action": "reset-circuit", "provider": "Google-CSE"}'
   ```

3. **Or wait 5 minutes** for automatic recovery test

---

## Summary

✅ **Test Config** now covers all search providers, cache, and circuit breaker
✅ **System Health Banner** shows provider-specific errors with fallback info
✅ **About Footer** displays active search provider hierarchy
✅ **Real-time monitoring** with automatic 30s polling
✅ **Build verified** - compiles successfully

**All three integration points complete:**
1. Automated testing via `/admin/test-config`
2. Real-time error notifications via System Health Banner
3. Provider visibility via About footer

**Ready to use** - Brave API key can be added anytime!

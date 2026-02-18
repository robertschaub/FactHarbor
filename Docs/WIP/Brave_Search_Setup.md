# Brave Search API Setup Guide

**Status**: ✅ Ready to use
**Date**: 2026-02-18

## Quick Start

### 1. Add API Key to Environment

Edit `apps/web/.env.local` and add:

```bash
# Brave Search API (from https://api-dashboard.search.brave.com)
BRAVE_API_KEY=your_api_key_here
```

**Replace `your_api_key_here` with your actual Brave API key.**

---

### 2. Restart Dev Server

```bash
cd apps/web
npm run dev
```

The Brave provider will be automatically detected and added to the multi-provider rotation.

---

### 3. Verify It's Working

Check the search provider list in logs:

```
[Search] Available providers (by priority): Google-CSE[1], Brave[2], SerpAPI[2]
```

Or check via API:

```bash
curl http://localhost:3000/api/admin/search-stats \
  -H "X-Admin-Key: dev123" | jq '.circuitBreaker'
```

Look for Brave in the provider list.

---

## Configuration

### Provider Priority

By default, Brave has **priority 2** (same as SerpAPI). Google CSE is **priority 1** (tried first).

To change priority, update Search Config (Admin → Config → search):

```json
{
  "providers": {
    "googleCse": { "enabled": true, "priority": 1, "dailyQuotaLimit": 8000 },
    "brave": { "enabled": true, "priority": 2, "dailyQuotaLimit": 10000 },
    "serpapi": { "enabled": true, "priority": 3, "dailyQuotaLimit": 0 }
  }
}
```

**Lower number = higher priority** (1 is tried first, then 2, then 3).

---

### Use Brave Exclusively

To use **only** Brave (skip Google CSE), set in Search Config:

```json
{
  "provider": "brave"
}
```

Or via UCM:
- Admin → Config → search → `provider` → Set to `"brave"`

---

## Brave Search API Limits

### Free Tier
- **1 query/second** rate limit
- **2,000 queries/month** free
- After that: **$5 per 1,000 queries**

### API Dashboard
Monitor usage at: https://api-dashboard.search.brave.com

---

## How Multi-Provider Works with Brave

### Scenario 1: Normal Operation (Google CSE OK)

```
Query → Cache: MISS
  ├─ Try Google-CSE (priority 1): ✅ 10 results
  └─ Cache results, return
```

**Brave not called** (Google CSE succeeded).

---

### Scenario 2: Google CSE Quota Exhausted

```
Query → Cache: MISS
  ├─ Try Google-CSE (priority 1): ❌ 429 (quota)
  │   └─ Circuit breaker: 3 failures → OPEN
  ├─ Try Brave (priority 2): ✅ 10 results
  └─ Cache results, return
```

**Brave automatically takes over** as primary provider.

---

### Scenario 3: Both Google CSE + Brave Fail

```
Query → Cache: MISS
  ├─ Try Google-CSE: ❌ (circuit OPEN)
  ├─ Try Brave: ❌ (circuit OPEN)
  ├─ Try SerpAPI (priority 3): ✅ 10 results
  └─ Cache results, return
```

**SerpAPI is last resort** (if configured).

---

## Cost Comparison

| Provider | Free Tier | Paid Pricing | Notes |
|----------|-----------|--------------|-------|
| **Google CSE** | 100 queries/day | $5/1k queries | Hard limit at 10k/day (self-service) |
| **Brave** | 2,000 queries/month | $5/1k queries | Privacy-focused, good quality |
| **SerpAPI** | 100 queries/month | $50/month (5k queries) | Most expensive |

---

## Recommended Setup

### For Cost Optimization

```json
{
  "provider": "auto",
  "cache": { "enabled": true, "ttlDays": 7 },
  "providers": {
    "googleCse": { "enabled": true, "priority": 1, "dailyQuotaLimit": 8000 },
    "brave": { "enabled": true, "priority": 2, "dailyQuotaLimit": 2000 }
  }
}
```

**Why:**
- Google CSE free tier (10k/day) + cache (40-60% savings) = **~4-6k API calls/day**
- If Google quota exceeded → Brave takes over (2k/month free = ~66/day)
- **Total cost: $0/month** for moderate usage

---

### For High Volume

If you exceed both Google + Brave free tiers:

```json
{
  "providers": {
    "googleCse": { "enabled": true, "priority": 1, "dailyQuotaLimit": 8000 },
    "brave": { "enabled": false, "priority": 2 },
    "serpapi": { "enabled": true, "priority": 2, "dailyQuotaLimit": 0 }
  }
}
```

**Why:**
- Use Google CSE (free 10k/day)
- Skip Brave (save for occasional use)
- SerpAPI as paid overflow (unlimited with paid plan)

---

## Testing Brave Provider

### Test Explicit Brave Search

```bash
# Run a search using Brave only
curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "test brave search",
    "config": {
      "search": {
        "provider": "brave"
      }
    }
  }'
```

Check logs for:
```
[Search] Using Brave (explicit)
[Search] Brave: Starting search for query: "test brave search"
[Search] Brave: ✅ Received 10 results
```

---

### Test Multi-Provider Fallback

1. **Disable Google CSE** (temporarily):
   ```bash
   # In .env.local, comment out:
   # GOOGLE_CSE_API_KEY=...
   # GOOGLE_CSE_ID=...
   ```

2. **Restart dev server**

3. **Run a search** - should automatically use Brave:
   ```
   [Search] Available providers (by priority): Brave[2], SerpAPI[2]
   [Search] Trying Brave (need 10 results)...
   ```

4. **Re-enable Google CSE** when done testing

---

## Circuit Breaker Behavior

If Brave fails 3 times consecutively:

```
[Circuit-Breaker] Brave: CLOSED → OPEN (threshold reached: 3 consecutive failures)
[Search] Skipping Brave (circuit breaker OPEN)
```

Circuit automatically resets after **5 minutes** (configurable in Search Config).

To manually reset:

```bash
curl -X POST http://localhost:3000/api/admin/search-stats \
  -H "X-Admin-Key: dev123" \
  -H "Content-Type: application/json" \
  -d '{"action": "reset-circuit", "provider": "Brave"}'
```

---

## Monitoring

### View Brave Usage

```bash
curl http://localhost:3000/api/admin/search-stats \
  -H "X-Admin-Key: dev123" | jq '.circuitBreaker[] | select(.provider == "Brave")'
```

Response:
```json
{
  "provider": "Brave",
  "state": "closed",
  "consecutiveFailures": 0,
  "totalRequests": 156,
  "totalFailures": 2,
  "totalSuccesses": 154,
  "successRate": 0.9871,
  "lastSuccessTime": 1708237200000
}
```

---

## Troubleshooting

### "Brave: ❌ API key not configured"

**Solution**: Add `BRAVE_API_KEY=...` to `apps/web/.env.local` and restart dev server.

---

### "Brave Search API HTTP 401"

**Solution**: Invalid API key. Check:
1. API key is correct (no extra spaces)
2. Key is active in Brave dashboard
3. Billing is enabled (if using paid tier)

---

### "Brave Search API HTTP 429"

**Solution**: Rate limit exceeded.
- Free tier: **1 query/second** max
- Wait 1 second between requests, or enable caching (already enabled by default)
- Check usage at: https://api-dashboard.search.brave.com

---

### Circuit Breaker Keeps Opening

**Solution**: Brave is failing too often. Check:
1. API key is valid
2. Network connectivity
3. Brave API status: https://status.brave.com
4. Increase `circuitBreaker.failureThreshold` in config (default: 3)

---

## Summary

✅ **Brave provider implemented and ready**
✅ **Automatically used in multi-provider fallback**
✅ **Cache + circuit breaker already configured**
✅ **Just add API key and restart**

**Next step**: Add your Brave API key to `.env.local` and you're done!

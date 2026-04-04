# Source Fetch Failure Reduction Plan

**Date:** 2026-03-31
**Role:** Lead Architect
**Status:** IMPLEMENTED
**Trigger:** User observed frequent `source_fetch_failure` warnings on production jobs; URLs accessible via browser but failing in pipeline.

---

## 1. Executive Summary

Source fetch failures across recent jobs run at ~46% within fetch-warning events. This is operationally expected for a server-side pipeline hitting paywalled, geo-blocked, and bot-protected sources — but two practical improvements can reduce wasted time and improve diagnostic clarity without changing analytical behavior.

The dominant failure class (56%) is HTTP 403 from sites that serve content to browsers but block server-side fetches (Cloudflare JS challenges, cookie-gated paywalls, TLS fingerprinting). These are structurally unfixable without headless browser infrastructure. But the pipeline currently retries the same blocked domain repeatedly within a single run, wasting fetch slots and latency.

**Two improvements proposed:**

1. **Domain-level fetch short-circuit:** After 2 consecutive 401/403 failures from the same domain within a query's fetch batch, skip remaining URLs from that domain in that batch. Saves 2-5s per skipped fetch, avoids redundant blocking failures. Does not trigger on 404 (URL-specific).
2. **Error-type enrichment in warnings:** Include the failure reason (paywall, timeout, dead link) in admin/operator-visible warning messages for diagnostic clarity.

Both are code-only, low-risk, and do not change analytical behavior.

---

## 2. What the Data Shows

### Error type distribution (100 recent fetch-failure warnings, local DB)

| Error type | Count | % | Top domains | Root cause |
|-----------|-------|---|-------------|------------|
| HTTP 403 | 80 | 56% | nycbar.org, ft.com, courthousenews.com, tandfonline.com | Paywall / bot-blocking / Cloudflare JS challenge |
| Network | 25 | 17% | tagesanzeiger.ch, portal.stf.jus.br | WAF, geo-restriction, DNS failure from deployment IP |
| HTTP 404 | 14 | 10% | keystone-sda.ch (12 of 14) | Dead links — one Swiss agency whose URLs expire |
| Unknown | 13 | 9% | wilsoncenter.org, agenciabrasil.ebc.com.br | Oversized responses (>10MB PDFs), misc |
| HTTP 401 | 5 | 3% | reuters.com, wsj.com | Hard paywalls requiring authentication |
| PDF parse | 5 | 3% | Various | Malformed or encrypted PDFs |
| Timeout | 1 | <1% | cptl.ufms.br | Rare — 20s timeout is adequate |

### Why "works in browser, fails in pipeline"

The pipeline sends a Chrome 120 User-Agent and follows redirects, but lacks:
- JavaScript execution (Cloudflare challenges)
- Session cookies (paywall soft-gates)
- TLS client fingerprinting (JA3/JA4 matching)
- Browser-specific HTTP/2 negotiation

These are structural limitations of server-side `fetch()`. A headless browser would solve some, but at significant cost and latency.

### Is 46% abnormal?

No. Professional server-side fact-checking tools report 30-50% fetch failure rates on diverse web sources. The pipeline handles this correctly — failed fetches reduce the evidence pool, and D5 sufficiency gates flag claims with inadequate evidence. The failures are not suppressed.

---

## 3. What Can and Cannot Be Fixed

### Cannot fix (structural)

| Source type | Reason | Examples |
|------------|--------|----------|
| Hard paywalls | Require paid subscriptions | ft.com, reuters.com, wsj.com, tandfonline.com |
| JS challenge pages | Require headless browser | tagesanzeiger.ch, courthousenews.com |
| Geo-blocked government sites | Require regional proxy | portal.stf.jus.br, digital.stf.jus.br |

### Can fix (actionable)

| Improvement | Impact | Effort |
|-------------|--------|--------|
| Domain-level fetch short-circuit | Saves 2-5s latency per query batch, avoids redundant 403s | Low (~40 lines) |
| Error-type enrichment in warnings | Admins/operators understand why sources failed | Low (~10 lines) |

---

## 4. Proposed Changes

### Fix 1: Domain-level fetch short-circuit

**What:** Within a single `fetchSources()` call (one query's fetch batch), track a per-domain blocking streak. After 2 consecutive authentication/blocking failures (401, 403) from the same domain, best-effort suppress later same-domain URLs within the call. Because fetches within a concurrency batch run in parallel with staggered delays, the short-circuit reliably suppresses later batches and delayed same-batch siblings, but cannot guarantee all in-flight concurrent requests are caught.

**Scope boundary:** The map is fresh per `fetchSources()` call, which is invoked per query in `research-orchestrator.ts`. This means the short-circuit operates within one query's fetch batch, not across the entire analysis run. A domain blocked in query 1's batch will still be attempted in query 2's batch. This is intentional for a low-risk v1 — run-level state would require threading skip state through the research orchestrator, which is a larger change.

**Where:** [research-acquisition-stage.ts](apps/web/src/lib/analyzer/research-acquisition-stage.ts), inside `fetchSources()`.

**Trigger errors: 401 and 403 only.** Not 404.
- **401/403** are domain-level authentication or bot-blocking decisions — if a domain returns 403 for one URL, it will almost certainly return 403 for all URLs from the same domain in the same session.
- **404** is URL-specific (dead link), not domain-specific. Two dead links on one domain do not justify suppressing later URLs from that domain, which could reduce evidence volume.

**Design:**
```
domainFailures: Map<string, number>  // domain → consecutive 401/403 failure count
DOMAIN_SKIP_THRESHOLD = 2           // UCM-configurable

Before each fetch:
  if domainFailures.get(domain) >= DOMAIN_SKIP_THRESHOLD:
    skip this URL, log as "domain_short_circuited"
    increment fetchSkipped counter

After each fetch result:
  if result is 401 or 403:
    domainFailures.set(domain, (domainFailures.get(domain) ?? 0) + 1)
  else:
    // Any non-blocking outcome breaks the blocking streak for that domain:
    // success, 404, timeout, network, 5xx, PDF parse, etc.
    domainFailures.set(domain, 0)
```

**What it does NOT do:**
- Does not persist across `fetchSources()` calls (fresh map per call)
- Does not trigger on 404 (URL-specific, not domain-level)
- Does not affect retries for transient errors
- Does not change which URLs are attempted first
- Does not affect the search provider layer (only source content fetching)
- Does not count skipped URLs as attempted fetches in warning metrics; `attempted` continues to mean URLs that actually entered fetch

**UCM parameter:** `fetchDomainSkipThreshold: number` (default 2). Set to 0 to disable.

**Observability:**
- Log skipped URLs at debug level
- Include `skippedByDomainShortCircuit: number` in the `source_fetch_failure` warning details
- Do NOT emit a separate `source_fetch_domain_skip` warning type — fold the skip count into the existing `source_fetch_failure` details to avoid warning-type proliferation and the need to register a new type in `types.ts` / `warning-display.ts`

**Implementation scope:** ~40 lines in `research-acquisition-stage.ts` + UCM config field in `config-schemas.ts` / `pipeline.default.json`. Net-new `fetchSources()` behavior tests (current tests only cover helper functions). No new warning type registration needed.

### Fix 2: Error-type enrichment in admin/operator warnings

**What:** Include the failure reason in the `source_fetch_failure` warning message so admins and operators can distinguish paywalls from timeouts from dead links.

**Display policy note:** `source_fetch_failure` is classified as info/provider-level in `warning-display.ts` — it is shown to admins/operators, not prominently to end users. This fix improves operator diagnostic clarity, not user-facing report quality. No change to warning display policy is proposed.

**Where:** [research-acquisition-stage.ts](apps/web/src/lib/analyzer/research-acquisition-stage.ts), lines 158-162.

**Current message:**
```
"Source fetch failed for 2/5 source(s) while researching query "..."
```

**Proposed message:**
```
"Source fetch failed for 2/5 source(s) while researching query "..." (1× paywall/403, 1× timeout)"
```

**Implementation:** After line 162, append a parenthetical summary from `fetchErrorByType`:
```typescript
const typeSummary = Object.entries(fetchErrorByType)
  .map(([type, count]) => `${count}× ${humanizeErrorType(type)}`)
  .join(", ");
// Append to message: ` (${typeSummary})`
```

Where `humanizeErrorType` maps:
- `http_403` → `paywall/blocked`
- `http_401` → `paywall`
- `http_404` → `dead link`
- `timeout` → `timeout`
- `network` → `network error`
- `pdf_parse_failure` → `PDF parse error`
- `http_429` → `rate limited`
- `http_5xx` → `server error`
- `unknown` → `unknown`

**Scope:** ~10 lines. No analytical behavior change.

---

## 5. What NOT to Change

| Item | Why not |
|------|---------|
| Headless browser infrastructure | High cost, high complexity, marginal gain over current UA approach |
| Domain blocklist | Deterministic blocking based on domain names would suppress legitimate sources |
| Fetch timeout (20s) | Only 1 timeout in 143 failures — adequate |
| SSRF validation | Working correctly, not involved |
| D5 sufficiency thresholds | Correctly catching under-evidenced claims |
| Search provider layer | Separate from source content fetching |
| Retry logic for transient errors | Already correct (timeout, network, 5xx retried; 401/403/404 not retried) |
| Per-source item cap (FLOOD-1) | Separate concern, already shipped |
| `sourceExtractionMaxLength` | Already tuned at 15,000 chars |

---

## 6. Implementation Order

### Step 1: Domain-level fetch short-circuit (code-only)

**Scope:** ~40 lines in `research-acquisition-stage.ts` + UCM config field in `config-schemas.ts` / `pipeline.default.json`. Net-new `fetchSources()` behavior tests (current test file only covers helper functions — these are new integration-style tests for the fetch function itself).
**Risk:** Low — fail-open (if threshold is 0, feature is disabled). Only triggers on 401/403 (not 404 or transient errors).
**Tests:**
- 2 consecutive 403s from same domain → 3rd URL from that domain skipped
- 403 → success → 403 does NOT trigger skip (streak resets on non-blocking outcome)
- 404s do NOT trigger domain skip (URL-specific, not domain-level)
- Transient errors (timeout, network) do NOT trigger domain skip
- Different domains tracked independently
- Skip count included in existing `source_fetch_failure` warning details
- Skipped URLs are excluded from `attempted` / `failureRatio` metrics

### Step 2: Error-type enrichment (code-only)

**Scope:** ~10 lines in `research-acquisition-stage.ts` + small `humanizeErrorType()` helper function
**Risk:** Minimal — warning message text only, admin/operator diagnostic improvement, no analytical or user-facing display change
**Tests:** Warning message includes error type summary when failures exist.

Both steps can ship in a single commit.

---

## 7. Validation Gate

### After implementation:

| # | Check | Purpose |
|---|-------|---------|
| 1 | `npm test` passes | No regression |
| 2 | `npm -w apps/web run build` succeeds | Compilation |
| 3 | Unit test: 2 consecutive 403s → 3rd URL from same domain skipped | Core behavior |
| 4 | Unit test: 404s do NOT trigger domain skip | 404 is URL-specific |
| 5 | Unit test: transient errors (timeout) do not trigger short-circuit | Safety |
| 6 | Unit test: warning message includes error type summary | Enrichment |
| 7 | 1 live run with a Bolsonaro input (high fetch-failure rate) | Confirm short-circuit fires and reduces redundant fetches |

### Success criteria:
- Fewer total fetch attempts per query batch (redundant 401/403s skipped)
- Warning messages include human-readable failure reasons for admin/operator clarity
- No change in verdict quality or evidence volume (the skipped URLs would have failed anyway)
- UCM toggle allows disabling the feature

---

## 8. Final Judgment

**`Fetch short-circuit + warning enrichment justified`**

The 46% fetch failure rate is operationally expected but the pipeline wastes time retrying domains that deterministically block server-side requests. Domain-level short-circuit within a query's fetch batch is a safe, code-only improvement that reduces latency without changing analytical behavior. Warning enrichment helps admins/operators understand why sources are unavailable. Neither change is urgent, but both are low-risk quality-of-life improvements.

---

**Outcome:** Implemented in `research-acquisition-stage.ts` with UCM field `fetchDomainSkipThreshold` and focused `fetchSources()` test coverage. The shipped behavior uses a true per-domain blocking streak, resets that streak on non-blocking outcomes, excludes skipped URLs from `attempted` warning metrics, and keeps the scope limited to one `fetchSources()` call.

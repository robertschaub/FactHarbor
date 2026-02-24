# MSR Provider Layer — UCM / UI / Agent Rules Review

**Date:** 2026-02-24
**Scope:** Audit of Multi-Source Evidence Retrieval provider layer (Phases 1, 2, 3.1, 4) against three criteria:
1. Everything that affects report quality is in UCM
2. UCM Admin UI covers the new items
3. Agent rules followed — no deterministic text-parsing that influences report quality

**Files audited:**
- `apps/web/src/lib/search-wikipedia.ts`
- `apps/web/src/lib/search-semanticscholar.ts`
- `apps/web/src/lib/search-factcheck-api.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/app/admin/config/page.tsx`

---

## Finding 1: Admin UI Does NOT Expose New Provider Config (HIGH)

**Issue:** The `SearchConfigForm` in `page.tsx` (lines 356-505) only has form fields for the original search settings. It does NOT include fields for:

- Wikipedia settings (enabled, priority, language)
- Semantic Scholar settings (enabled, priority)
- Google Fact Check settings (enabled, priority, languageCode)
- Fact Check API pipeline settings (enabled, maxResultsPerClaim, maxAgeDays, fetchFullArticles)
- Provider dropdown only shows 3 options (Auto, Google CSE, SerpAPI) — missing Brave, Wikipedia, Semantic-Scholar, Google-FactCheck

**Impact:** Admins must edit raw JSON to configure the new providers. The Zod schemas and defaults are correct, but the form UI doesn't expose them.

**Workaround (current):** Admins can use the JSON editor tab to edit the full search config.

**Fix required:** Add form sections for:
- Multi-provider configuration (per-provider enabled/priority/quota + provider-specific fields)
- Fact Check API pipeline settings
- Update provider dropdown to include all 7 options

**Note:** The existing providers (Brave, Google CSE, SerpAPI) also lack per-provider form fields — this is a pre-existing gap, not specific to MSR. The MSR work just makes it more visible. Consider addressing all providers in one UI pass.

---

## Finding 2: Hardcoded Values That Should Be UCM (MEDIUM)

### 2a. Semantic Scholar abstract truncation — 500 chars (search-semanticscholar.ts:147)

**Current:** `if (snippet && snippet.length > 500) { snippet = snippet.substring(0, 497) + "..."; }`

**Problem:** This affects evidence content quality. Longer snippets preserve more research findings; shorter ones save tokens. This is exactly the kind of tuning parameter that belongs in UCM.

**Fix:** Add `abstractMaxChars` to `providers.semanticScholar` schema (default: 500, min: 100, max: 2000).

### 2b. Per-provider default timeouts (all three files)

**Current:** Wikipedia=10s, Semantic Scholar=15s, Google FactCheck=15s (hardcoded `DEFAULT_TIMEOUT_MS` constants).

**Mitigation:** `options.timeoutMs` from global search config already overrides these. The hardcoded values are only fallback defaults when the global config doesn't specify a timeout.

**Fix:** Add `timeoutMs` to each provider's schema in `config-schemas.ts` (optional, falls back to global `timeoutMs`). Provider code reads from `options.config?.providers?.{name}?.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS`.

### 2c. Semantic Scholar rate limit interval — 1100ms (search-semanticscholar.ts:39)

**Current:** `const MIN_INTERVAL_MS = 1100;`

**Assessment:** Borderline. This is infrastructure (API rate compliance), not analysis quality. The S2 API enforces 1 RPS; 1100ms is a safety margin. However, if S2 changes their rate policy, admins would need a code change to adjust.

**Recommendation:** Add `rateLimitIntervalMs` to `providers.semanticScholar` schema (default: 1100, min: 500, max: 10000). Low priority.

### 2d. Fact Check date-restriction days mapping (search-factcheck-api.ts:62-66)

**Current:** `{ y: "365", m: "30", w: "7" }`

**Assessment:** This maps the generic `dateRestrict` enum to API-specific day values. The enum itself is UCM-configurable. The mapping is structural parameter translation, not a quality decision. Hardcoded is acceptable.

**Verdict:** No change needed.

### 2e. Wikipedia User-Agent string (search-wikipedia.ts:43)

**Current:** `"FactHarbor/1.0 (contact@factharbor.com)"`

**Assessment:** Low priority. Mandatory per Wikimedia policy. Rarely changes. Could be UCM but the ROI is minimal.

**Verdict:** No change needed now. Add to backlog if needed.

---

## Finding 3: LLM Intelligence Rule Compliance (OK — one borderline case)

### Compliant items (structural plumbing, not semantic):
- **Wikipedia HTML stripping** (line 90): `r.snippet.replace(/<[^>]*>/g, '')` — strips markup tags. Structural.
- **Wikipedia URL construction** (line 93): `encodeURIComponent(r.title.replace(/ /g, '_'))` — URL encoding. Structural.
- **S2 title enrichment** (line 142-143): `[r.year, r.venue].filter(Boolean).join(", ")` — metadata formatting. Structural.
- **S2 DOI URL preference** (line 152-154): Prefers DOI over S2 URL. Structural routing.
- **S2 abstract truncation** (line 147-148): Length cap. Structural (though the threshold is quality-affecting — see Finding 2a).

### Borderline case: Fact Check snippet construction (line 134)

**Code:** `` `[${review.publisher.name}] ${review.textualRating}: ${claim.text}` ``

**Analysis:** This constructs a `WebSearchResult.snippet` from structured API fields. It is template-based concatenation — it does NOT classify, score, interpret meaning, or route based on text content. The AGENTS.md rule permits "formatting" as structural plumbing.

**Key consideration:** This snippet feeds into the standard search provider flow (`searchGoogleFactCheck`), which returns `WebSearchResult[]` — the same contract as any other provider. The snippet is used for display/caching, not directly for analytical decisions. The actual semantic interpretation of `textualRating` happens in Phase 3.4 (`seedEvidenceFromFactCheckApi`) via LLM batch normalization — which is the correct approach per AGENTS.md.

**Verdict:** Compliant. The snippet is formatting, not interpretation. The `textualRating` normalization correctly uses LLM (planned in Phase 3.4).

### No violations found:
- No regex/keyword-based classification
- No deterministic scoring or routing based on text meaning
- No hardcoded keyword lists
- All semantic interpretation deferred to LLM (textualRating → claimDirection normalization in Phase 3.4)

---

## Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Admin UI missing form fields for new providers + factCheckApi | **HIGH** | Add to plan — new phase or expand Phase 4 |
| 2a | S2 abstract truncation hardcoded (500 chars) | **MED** | Add `abstractMaxChars` to UCM schema |
| 2b | Per-provider timeout defaults hardcoded | **MED** | Add per-provider `timeoutMs` to UCM schema |
| 2c | S2 rate limit interval hardcoded (1100ms) | **LOW** | Add `rateLimitIntervalMs` to UCM schema |
| 2d | FactCheck date-days mapping hardcoded | **OK** | Structural, no change |
| 2e | Wikipedia User-Agent hardcoded | **OK** | Low ROI, backlog |
| 3 | LLM Intelligence rule | **OK** | No violations. Snippet construction is formatting. |

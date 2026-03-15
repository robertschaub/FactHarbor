# Search Accumulation Restoration Plan

**Created:** 2026-03-15
**Author:** Lead Architect (Claude Opus 4.6)
**Status:** DRAFT — awaiting Captain review
**Priority:** #1 remaining quality improvement opportunity (per Next Investigation Recommendations)
**Prerequisites:** Phase A contamination fixes validated (2026-03-15), Rec-A shipped

---

## 1. Problem Statement

The AUTO search mode stops after the first provider returns any results (`web-search.ts:301`), reducing per-query evidence from ~10 results (CSE+SerpAPI combined) to 5-8 (CSE-only). This is the **single largest structural regression** identified in the quality investigation chain:

- Phase 1 (filter/cap toggles): no quality gain → problem is upstream
- Phase A (contamination fixes): eliminated foreign evidence → quality bugs fixed
- Remaining gap: evidence pool size variance (25-128 items across runs)

### The Change That Caused This

**Commit:** `8bef6a91` — "fix(pipeline): verdict factual-vs-positional guidance, AUTO mode stop on first success"

**Before (at `quality_window_start` `9cdc8889`):**
```
For each query:
  → Google CSE runs, pushes ALL results
  → If results.length < maxResults AND SerpAPI available:
      → SerpAPI fills remaining slots
  → Final: up to maxResults (10) results from CSE + SerpAPI
```

**After (current `main`):**
```
For each query:
  → Google CSE runs
  → If CSE returned ANY results → STOP (break at line 301)
  → Serper only runs if CSE returned 0 results
  → Final: whatever CSE returned alone (typically 5-8 of maxResults=10)
```

**Impact:** Each of the pipeline's ~16 search queries returns 30-50% fewer results. Over a full analysis with 2 claims, this compounds to a significantly smaller evidence pool.

### Evidence This Is the Top Quality Lever

| Source | Finding |
|--------|---------|
| Search-Stack Investigation (§2.1) | Confirmed as PRIMARY structural drift |
| Phase 1 experiment | Filter/cap toggles don't close gap — problem is upstream evidence pool |
| Deployed D2 (90% B-score) | Built on code BEFORE stop-on-first-success |
| Post-Rec-A variance | Evidence counts range 25-128 — correlates with search yield |
| Code Reviewer + Lead Architect | Both approved search-stack drift as #1 remaining suspect |

---

## 2. Root Cause Analysis

### 2.1 The `break` at `web-search.ts:301`

```typescript
// web-search.ts:282-308
for (const providerInfo of primaryCandidates) {
  if (results.length >= options.maxResults) break;
  // ...
  const providerResults = await providerInfo.provider.execute({ ... });
  results.push(...providerResults);
  recordSuccess(providerInfo.provider.name, cbConfig);
  // Stop after first provider that returns ANY results.
  // Prevents inconsistent evidence pools (provider-mix variance).
  if (providerResults.length > 0) break;  // ← THIS LINE
}
```

The original justification was "prevents inconsistent evidence pools (provider-mix variance)." This trades evidence depth for consistency — but the quality data shows the trade-off is net negative.

### 2.2 Provider State

| Provider | At quality baseline (`9cdc8889`) | Current `main` |
|----------|--------------------------------|----------------|
| Google CSE | P1, always runs | P1, runs first |
| SerpAPI | P2, fills remaining slots via accumulation | Disabled in UCM (key present in `.env.local`) |
| Serper | Not present | P2, but only runs if CSE returns 0 |
| Brave | Not present | Disabled |
| Accumulation | **Yes** (fill-until-maxResults) | **No** (stop-on-first-success) |

### 2.3 Why This Matters More Than Other Levers

Evidence pool size is **upstream** of nearly every quality dimension:

```
Search results per query (5-8 vs 10)
  → Evidence items per claim (fewer items)
    → Claim sufficiency (may not reach threshold 3)
      → Verdict stability (less evidence → more LLM variance)
        → Confidence calibration (sparse evidence → lower confidence)
          → User-facing quality (G1, G3, G5 all degraded)
```

Fixing downstream (temperature, self-consistency, verdict prompts) cannot compensate for an upstream evidence deficit.

---

## 3. Proposed Fix

### Fix A: Make AUTO accumulation mode UCM-configurable

**Type:** Code change + UCM parameter
**Effort:** Small

Add a `autoMode` field to `SearchConfigSchema` with two values:
- `"accumulate"` — all providers contribute results until `maxResults` is reached (baseline behavior)
- `"first-success"` — stop after first provider with any results (current behavior)

**Default:** `"accumulate"` — restoring the baseline behavior that produced the best quality results.

#### Code change: `apps/web/src/lib/web-search.ts`

At line 301, replace the unconditional break with a config-driven check:

```typescript
// Current (line 301):
if (providerResults.length > 0) break;

// Proposed:
if (autoMode === "first-success" && providerResults.length > 0) break;
```

The `autoMode` value is read from the search config passed to `searchWebWithProvider()`. When `"accumulate"`, the loop continues to the next provider, filling remaining slots until `maxResults` is reached (the `results.length >= options.maxResults` check at line 283 still applies).

#### Config change: `apps/web/src/lib/config-schemas.ts`

Add to `SearchConfigSchema` (after `mode` at line 56):

```typescript
autoMode: z.enum(["accumulate", "first-success"]).optional()
  .describe("AUTO provider dispatch: 'accumulate' fills slots from multiple providers until maxResults; 'first-success' stops after first provider with results (default: accumulate)"),
```

Add to `DEFAULT_SEARCH_CONFIG`:

```typescript
autoMode: "accumulate",
```

#### Config change: `apps/web/configs/search.default.json`

Add after `"mode"`:

```json
"autoMode": "accumulate",
```

#### Passing config to the loop

The `searchWebWithProvider` function already receives the full `SearchConfig`. Read `config.autoMode` at the start of the AUTO block (~line 272) and use it to control the break:

```typescript
} else if (primaryProviderKey === "auto") {
  const autoMode = config.autoMode ?? "accumulate";
  // ... existing code ...
  // Line 301: conditional break
  if (autoMode === "first-success" && providerResults.length > 0) break;
}
```

### Fix B: Re-enable SerpAPI as P2 provider

**Type:** UCM config change only (no code)
**Effort:** Trivial

In the Admin UI or `search.default.json`, set:

```json
"providers": {
  "serpapi": { "enabled": true, "priority": 2, "dailyQuotaLimit": 0 },
  "serper": { "enabled": true, "priority": 3, "dailyQuotaLimit": 0 }
}
```

This restores SerpAPI as P2 (filling CSE gaps) with Serper as P3 fallback. Under `"accumulate"` mode, both contribute to each query.

**Note:** SerpAPI key is already in `.env.local` (`SERPAPI_API_KEY`). The provider code is functional — it was only disabled in UCM config, not removed.

### Fix C (optional): Reduce `selfConsistencyTemperature` 0.4 → 0.3

**Type:** UCM config change only
**Effort:** Trivial

Independent of Fix A/B. Per the approved Next Investigation Recommendations (Phase C), a small reduction from 0.4 to 0.3 may tighten verdict spread without impairing reasoning quality.

**Default to ship with, but can be deferred** if we want to isolate search-stack effects first.

---

## 4. Implementation Priority

| Order | Fix | What | Effort | Impact | Code Changes |
|-------|-----|------|--------|--------|-------------|
| **A** | AUTO accumulation mode | Code + UCM | Small | High | 1 file (`web-search.ts`) + 3 config locations |
| **B** | Re-enable SerpAPI as P2 | UCM only | Trivial | Medium | 0 files (config change) |
| **C** | SC temperature 0.4 → 0.3 | UCM only | Trivial | Low | 0 files (config change) |

**Phased approach:**

**Phase 1 — Fix A + Fix B together:** Restore accumulation AND re-enable SerpAPI. This recreates the baseline search behavior. Validate with H3 (EN Bolsonaro) + DE Mental Health + one other claim.

**Phase 1 validation:** Compare evidence counts, TP stability, and boundary quality against Phase A baseline runs (which used stop-on-first-success + CSE-only).

**Phase 2 — Fix C (if Phase 1 shows remaining spread):** Reduce SC temperature. Only if Phase 1 doesn't sufficiently tighten verdict stability (G1).

---

## 5. Validation Plan

### Validation runs after Phase 1 (Fix A + Fix B)

Re-run the 3 benchmark claims used in the Search-Stack Investigation:

| Claim | Language | Compare against |
|-------|----------|----------------|
| EN Bolsonaro (H3) | EN | `a0784688` (Phase A, TP=62, ev=45) |
| DE Mental Health | DE | `a89d43a5` (Phase A, TP=66, ev=25) |
| PT Bolsonaro (H1) | PT | `75812cd5` (Rec-A, TP=64, ev=88) |

### Success criteria

| Metric | Phase A baseline | Target |
|--------|-----------------|--------|
| Evidence items per run | 25-88 | **≥50 consistently** (less variance) |
| Provider mix in meta | "Google-CSE" only | "Google-CSE, SerpAPI" (or +Serper) |
| G1 verdict stability (same claim 2× run) | ~20-25pp spread | **≤20pp** (acceptable threshold) |
| TP within historical range | Yes | Yes (no regression) |
| Zero foreign-contaminated boundaries | Yes (Phase A) | Yes (maintained) |
| Contradiction iterations | 1 (Fix 4) | 1 (maintained) |

### Required unit tests

| Test file | What to test |
|-----------|-------------|
| `test/unit/lib/web-search.test.ts` | AUTO mode with `autoMode: "accumulate"`: loop continues past first provider with results, stops at `maxResults`. |
| `test/unit/lib/web-search.test.ts` | AUTO mode with `autoMode: "first-success"`: loop stops after first provider with results (current behavior preserved). |
| `test/unit/lib/web-search.test.ts` | AUTO mode with `autoMode` unset: defaults to `"accumulate"`. |
| `test/unit/lib/config-drift.test.ts` | Automatic sync check for `autoMode` in `search.default.json` ↔ `DEFAULT_SEARCH_CONFIG`. |

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Higher search API costs (more provider calls per query) | Low | Each additional provider call costs $0.001-0.005. For ~16 queries × 1 extra call = ~$0.02-0.08 per analysis. Negligible vs LLM cost (~$0.23). |
| SerpAPI quota exhaustion | Low | `dailyQuotaLimit` is available in UCM. Start with 0 (unlimited) and monitor. SerpAPI free tier = 100 searches/month. |
| Provider-mix variance (the original concern) | Low | The quality data shows evidence depth is more important than provider consistency. Variance from different providers is preferable to sparse evidence from one provider. |
| Regression of Phase A contamination fixes | Very low | Phase A fixes operate at the extraction/verdict level, not the search level. More search results don't re-introduce contamination — the `distinctEvents` rules and relevance classification filter foreign content regardless of volume. |
| `autoMode` default change affects deployed instances | Low | The deployed instance also uses current code. Deploying the accumulation default restores baseline behavior. If issues arise, `autoMode: "first-success"` reverts via UCM without code change. |

---

## 7. What This Does NOT Fix

| Issue | Why Not | Where to Fix |
|-------|---------|-------------|
| Claim decomposition instability | Upstream of search (Pass 2 output). More evidence doesn't change how claims are extracted. | `understandTemperature` tuning or Pass 2 prompt refinement (Next Investigation Phase B) |
| Confidence deflation from SC spread | SC temperature is a separate lever. More evidence may help indirectly (more stable verdicts → tighter spread). | Fix C (`selfConsistencyTemperature` 0.4 → 0.3) |
| Non-English query generation quality | Prompt quality issue, not search stack. | Next Investigation Phase B (prompt review) |

---

## 8. Relationship to Existing Plans

| Document | Relationship |
|----------|-------------|
| `Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` | Phase A validated. This plan picks up where contamination fixes end — upstream evidence pool is the next quality lever. |
| `Report_Quality_Next_Investigation_Recommendations_2026-03-14.md` | This plan implements Phase A (search-stack drift) from that document's recommended investigation order. |
| `Report_Quality_PhaseA_Search_Stack_Results_2026-03-14.md` | The structural analysis (§2) from that document informed this plan. Experiment results (§4) are incomplete — this plan proposes shipping the fix directly based on structural evidence + quality baseline data. |
| `LLM_Model_Allocation_Review_2026-03-15.md` | Rec-A (shipped) reduced Pass 2 cost. This plan's search changes are orthogonal — more evidence in the pool, not different model allocation. |
| `Report_Quality_Baseline_Test_Plan_2026-03-12.md` | Phase 2 worktree runs are still available but may be unnecessary if this plan's validation shows the quality gap is closed. |

---

## Review Log

| Date | Reviewer | Assessment | Notes |
|------|----------|------------|-------|
| | | | |

---

## Decision Record

*(Decisions made after review, with rationale)*

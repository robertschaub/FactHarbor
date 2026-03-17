# Report Quality Phase A — Search-Stack Drift Investigation

**Status:** COMPLETE — validated outcomes in `Search_Accumulation_Restoration_Plan_2026-03-15.md` §9
**Created:** 2026-03-14
**Author Role:** Senior Developer
**Baseline commit:** `quality_window_start` (`9cdc8889`)
**Experiment script:** `scripts/phaseA_search_experiment.py`
**Live log:** `scripts/phaseA_live_tracking.md`
**Results file:** `scripts/phaseA_results.json`

---

## 1. Context

Phase 1 (2026-03-14) showed no meaningful quality gain from disabling SR weighting, jurisdiction caps,
or conservative confidence settings. The code reviewer and Lead Architect approved Phase A as the next
investigation: test whether search-stack drift is the primary remaining cause of quality degradation
relative to `quality_window_start` (`9cdc8889`).

---

## 2. Structural Analysis — What Changed in the Search Stack

This section documents confirmed drift regardless of experiment outcome.

### 2.1 AUTO Dispatcher Behavior Change (PRIMARY DRIFT)

**Commit:** `8bef6a91` — `fix(pipeline): verdict factual-vs-positional guidance, AUTO mode stop on first success`
**Date:** 2026-03-09

**At `quality_window_start` (`9cdc8889`):**

```
For each search query:
  → Google CSE runs and pushes ALL its results
  → If results.length < maxResults AND SerpAPI available:
      → SerpAPI fills the remaining slots
  → Final: up to maxResults results, combining CSE + SerpAPI
```

**On current `main` (after `8bef6a91`):**

```
For each search query:
  → Google CSE runs
  → If CSE returned ANY results → STOP (break)
  → Serper only runs if CSE returned 0 results
  → Final: whatever CSE returned (typically 5-8 of maxResults=10)
```

**Impact:** Each query now returns fewer results (CSE-only, 5-8 instead of 10).
Evidence pool per boundary is materially smaller than at the baseline.

The commit comment says: "Previously continued filling slots from fallback providers,
creating provider-mix variance." This was intentional — but the quality trade-off
was not measured at the time.

### 2.2 Provider Change (P2: SerpAPI → Serper)

**Commit:** `0c6efd80` — `feat(search): integrate Serper API as 1st fallback provider`

At `quality_window_start`, the P2 provider was **SerpAPI**. It accumulated results
alongside Google CSE when CSE returned < maxResults.

On current `main`:
- SerpAPI is present (`SERPAPI_API_KEY` configured in `.env.local`) but **disabled** in UCM
  (`providers.serpapi.enabled = false`)
- Serper is the new P2 (`providers.serper.enabled = true, priority: 2`)
- Under stop-on-first-success, Serper only runs when CSE returns 0 results

### 2.3 Domain Blacklist Added (NEUTRAL/POSITIVE)

`search.default.json` at `quality_window_start`: empty `domainBlacklist: []`
Current: 9 social-media domains blacklisted (facebook, twitter, x, reddit, etc.)

Assessment: This change is net-positive (removes noise sources). Not a quality regression.

### 2.4 Provider Behavior Summary

| Provider | At `quality_window_start` | Current `main` |
|----------|--------------------------|----------------|
| Google CSE | P1, always runs | P1, runs first |
| SerpAPI | P2, fills remaining slots | Disabled in UCM (key present) |
| Serper | Not present | P2, only runs if CSE returns 0 |
| Brave | Not present | Disabled |
| Domain blacklist | None | 9 social-media domains |
| Accumulation | **Yes** (fill-until-maxResults) | **No** (stop-on-first-success) |

---

## 3. Experiment Design

### 3.1 Conditions

| ID | Description | Server | How |
|----|-------------|--------|-----|
| C0_CONTROL | AUTO mode, stop-on-first-success | main:3000 | UCM: provider=auto (default) |
| C1_SERPER | Serper-only explicit | main:3000 | UCM: provider=serper |
| C2_SERPAPI | SerpAPI-only explicit (historical P2) | main:3000 | UCM: provider=serpapi |
| C3_ACCUM | AUTO with accumulation restored | worktree:3001 | Code: removed stop-on-first-success break |

**Code change for C3** (`phaseA-accumulation` branch, `web-search.ts`):
Removed `if (providerResults.length > 0) break;` from the AUTO provider loop.
CSE and Serper now both contribute to each query until `maxResults` is hit.

### 3.2 Benchmarks

| ID | Input |
|----|-------|
| B1_EN | Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process? |
| B2_PT | Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process? |
| B3_DE | Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschnitt stärker psychisch belastet als vor zehn Jahren. |

### 3.3 Guardrails Applied

- Search cache **disabled** for all runs (cache key doesn't include provider; must call live APIs)
- Contamination / geography fixes kept enabled
- Prompt text unchanged
- `selfConsistencyTemperature` unchanged
- Code changes only in worktree branch (`phaseA-accumulation`), not committed to `main`
- Same-session controls: all conditions run sequentially within one session
- 2 runs per benchmark per condition

### 3.4 Provider Tracking

Provider behavior recorded from `resultJson.meta.searchProviders` (per-run) and
`resultJson.searchQueries[*].searchProvider` (per-query). This gives exact visibility
into which provider served each query and how many results it returned.

---

## 4. Experiment Results

*Results appended automatically by `scripts/phaseA_search_experiment.py` as runs complete.*

---

### 4.1 Condition Averages

| Condition | Avg Score | Min | Max | N | vs Control |
|-----------|-----------|-----|-----|---|------------|
| C0_CONTROL | TBD | | | | baseline |
| C1_SERPER | TBD | | | | TBD |
| C2_SERPAPI | TBD | | | | TBD |
| C3_ACCUM | TBD | | | | TBD |

*Update from `scripts/phaseA_results.json` when complete.*

### 4.2 Per-Run Results

*See `scripts/phaseA_live_tracking.md` for live per-run data.*

### 4.3 Provider Behavior Observed

*To be filled from per-run `meta.searchProviders` data.*

---

## 5. Conclusions

*To be filled when experiment completes.*

### 5.1 Does search-stack drift materially explain the quality gap?

*Pending results.*

### 5.2 Does forced multi-provider accumulation improve quality?

*Pending results. Structural analysis predicts yes — each query gets more results (up to maxResults)
instead of stopping at whatever CSE alone returned (5-8 of 10).*

### 5.3 Is the winning change UCM-only or does it require a code change?

Structural finding (before results): **Accumulation requires a code change.**
The stop-on-first-success is in `web-search.ts:301`. It cannot be toggled via UCM.
If C3_ACCUM shows meaningful improvement, the fix must be promoted from the `phaseA-accumulation`
branch to `main`.

If C2_SERPAPI shows meaningful improvement without accumulation (Serper is the issue, not the logic),
the fix is UCM-only: re-enable SerpAPI and set it back to P2.

### 5.4 Recommended next step

*Pending results.*

---

## 6. Open Issues

1. **SerpAPI is still valid but disabled**: If SerpAPI quality significantly exceeds Serper,
   simply re-enabling it in UCM (no code change) would restore historical P2 provider quality.

2. **Accumulation vs stop-on-first-success trade-off**: The original justification for stopping
   early was "provider-mix variance" — but this creates a different problem: reduced evidence depth.
   If accumulation improves quality, the variance concern should be re-evaluated; results from the
   same provider will always dominate when CSE is healthy.

3. **maxResults=10**: Both baseline and current have the same maxResults. The difference is that
   baseline actually filled all 10 slots (CSE + SerpAPI), while current fills 5-8 (CSE-only).

---

## 7. Reference: Baseline Search Config

At `quality_window_start`, `search.default.json` contained only:
```json
{
  "schemaVersion": "3.0.0", "enabled": true, "provider": "auto", "mode": "standard",
  "maxResults": 10, "maxSourcesPerIteration": 8, "timeoutMs": 12000,
  "dateRestrict": null, "domainWhitelist": [], "domainBlacklist": []
}
```

No per-provider config. AUTO providers were resolved from env vars only (CSE + SerpAPI).

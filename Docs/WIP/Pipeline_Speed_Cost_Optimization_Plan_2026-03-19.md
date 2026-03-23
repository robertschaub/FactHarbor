# Pipeline Speed & Cost Optimization Plan

**Date:** 2026-03-19
**Status:** DRAFT — awaiting review
**Author:** Lead Architect (Claude Opus 4.6)
**Data sources:** 10 recent production jobs (Mar 17-19), code analysis by 2 investigation agents (LLM cost agent + search/fetch timing agent)

**Document role:** This is the **optimization source plan**, not the governing short-horizon priority plan. It defines candidate speed/cost improvements, tradeoffs, and validation paths. For repository-level "what should happen next?" decisions, use `2026-03-22_Next_1_2_Weeks_Execution_Plan.md` first, then return here when the optimization track is selected.

---

## 1. Current Performance Profile

### Time Budget (10 jobs, 11-26 min total)

| Phase | Avg Time | % of Total | Key Activity |
|-------|----------|-----------|-------------|
| Pre-search (Pass 1/2, Gate 1) | ~30s | 3% | Claim extraction + validation (Haiku) |
| Preliminary search | ~80s | 7% | 4-6 queries, sequential fetch + extract |
| Main research loop | ~300s | 28% | 6-15 queries, semi-parallel fetch + extract |
| Contradiction + contrarian | ~30s | 2% | 2-5 queries |
| **Post-research** (SR, clustering, verdict debate, aggregation, narrative) | **~620s** | **57%** | **Verdict debate dominates** |
| Inter-query overhead | ~25s/query | 3%/gap | Sequential fetch → LLM between queries |

### Cost Budget (per analysis, 3 claims typical — revised with agent token analysis)

| Category | Model | Calls | Est. Cost | % |
|----------|-------|-------|-----------|---|
| Stage 1: Extract claims (Pass 1/2, Gate 1, reprompt) | Haiku | 6-12 | $0.05-0.15 | 5-12% |
| Stage 2: Research (query gen + relevance + extraction) | Haiku | 27-36 | $0.25-0.34 | 25-30% |
| Stage 2 post-research (applicability, scope norm) | Haiku | 1-2 | $0.01-0.02 | 1% |
| Stage 3: Clustering | **Sonnet** | 1 | $0.05 | 4% |
| **Stage 4: Verdict debate** | **Sonnet + GPT-4.1** | **6-12** | **$0.40-0.44** | **40-45%** |
| Stage 5: Narrative | Sonnet | 1 | $0.06 | 6% |
| Search APIs | Google CSE + Serper | 15-25 | $0.02-0.08 | 2-7% |
| **Total (3 claims)** | | **~42-64** | **~$0.85-1.05** | |

**The verdict debate is 40-45% of total cost.** Within it:
- Self-consistency (2× Sonnet): **$0.18** — largest single optional expense (18%)
- Advocate (Sonnet): $0.09
- Reconciler (Sonnet): $0.075
- Challenger (GPT-4.1): $0.04
- Validation (Haiku): $0.02

**Research evidence extraction is 25-30% of total cost** — driven by large source text inputs (~8K tokens per call, 9-12 calls).

---

## 2. Identified Bottlenecks

### A0. SR evaluation and clustering are hidden time sinks

**New discovery from SSE event log (job `3335eda4`, Plastik 3 claims):**

| Step | Duration | Note |
|------|----------|------|
| SR prefetch (domain evaluation) | **180s (3 min)** | LLM calls to evaluate all source domains |
| Clustering LLM (single Sonnet call) | **250s (4.2 min)** | Extremely long for one call — large scope input or verbose output |

These two steps alone account for **7.2 minutes** — previously hidden in "post-research" aggregate timing. The clustering call is a single Sonnet invocation that takes 4+ minutes, likely because it processes 100+ scope objects.

**Optimization potential:**
- **Clustering → Haiku**: Could cut 4.2 min to ~60-90s. Clustering is structural grouping, not deep reasoning. Saves both time and cost ($0.05 → ~$0.01). **Highest time-save opportunity per effort.**
- **SR prefetch parallelism**: Currently evaluates domains sequentially. Parallel domain evaluation could cut 3 min to ~30-60s.
- **SR caching**: Domains evaluated in prior runs don't need re-evaluation. Cache is 90 days but may not be populated yet.

### A. Verdict debate is 57% of wall-clock time

> **⚠ STALE (2026-03-23):** The per-claim sequential loop described below no longer exists. The current Stage 4 (`verdict-stage.ts`) already batches all claims per debate step: one `advocateVerdict` call covers all claims, Steps 2+3 (`selfConsistencyCheck` + `adversarialChallenge`) run in parallel via `Promise.all`, and `validateVerdicts` runs grounding + direction checks in parallel. The remaining wall-clock cost is the inherent latency of 5 sequential LLM call steps (advocate → SC+challenger → reconciler → validation), not per-claim serialization. See P1-A2 retirement note in §3.

~~The debate processes claims **one at a time**:~~
```
STALE — actual architecture is batched per step, not per claim:
  Step 1: advocateVerdict(ALL claims)        — 1 LLM call
  Steps 2+3: Promise.all([SC, challenger])   — 2 parallel calls
  Step 4: reconcileVerdicts(ALL claims)      — 1 LLM call
  Step 5: Promise.all([grounding, direction])— 2 parallel calls
```

~~For 3 claims: 21 sequential LLM calls (~7 calls × ~30s each = ~210s per claim, ~630s total). Claims are completely independent during debate — there's no data dependency between AC_01's verdict and AC_02's verdict.~~

### B. Preliminary search is fully sequential — no parallelism

**CRITICAL finding from search agent:** `runPreliminarySearch` processes 3 claims × 2 queries sequentially, and within each query, source fetching is sequential (no `Promise.all`). This is unlike the main research loop which uses `fetchSources` with `Promise.all` + concurrency limit.

Worst case: 6 serial search+fetch+extract cycles. With 3 sources per query at 12s timeout: up to 216s of sequential I/O that could be parallelized.

### C. Research queries within iterations are sequential

Within `runResearchIteration`, each query goes through search → relevance classification → fetch → extract sequentially. Queries within the same iteration are independent and could be pipelined or parallelized.

### D. Preliminary search doesn't record fetched URLs in `state.sources`

Preliminary-fetched sources are seeded as evidence items but NOT added to `state.sources`. The main research loop's `fetchSources` skips already-fetched URLs via `state.sources` check — but since preliminary URLs aren't there, they get re-fetched. Duplicate HTTP requests + duplicate LLM extraction.

### E. Dead config values

| Config | File | Issue |
|--------|------|-------|
| `search.default.json:timeoutMs` | search config | Never passed to search providers. Providers use hardcoded `DEFAULT_TIMEOUT_MS`. |
| `pipeline.default.json:parallelExtractionLimit` | pipeline config | Never referenced in code. Only `FETCH_CONCURRENCY = 3` is hardcoded in `fetchSources`. |

### F. Inconsistent fetch timeouts

| Location | Timeout | Source |
|----------|---------|--------|
| Preliminary search | 12000ms | Hardcoded at line 1425 |
| Main research | 20000ms | `sourceFetchTimeoutMs` from pipeline config |
| Retry escalation | 30000ms | `max(fetchTimeoutMs, min(fetchTimeoutMs * 1.5, 60000))` |

---

## 3. Optimization Proposals (ranked by impact × feasibility)

### Phase 1 — Low Risk, High Impact (structural parallelism)

| # | Fix | Time Save | Cost Save | Risk | Effort |
|---|-----|-----------|-----------|------|--------|
| **P1-A** | **Clustering → Haiku** — single largest time-save per effort. One Sonnet call currently takes 4.2 min for 100+ scopes. Haiku should complete in 60-90s. UCM config change (`getModelForTask` task key for clustering). | **-3 min per analysis** | **-$0.04** | Medium — boundary quality may change | Low (UCM config) |
| **P1-A2** | ~~**Parallelize verdict debate across claims**~~ **RETIRED (STALE, 2026-03-23):** The documented `for...of` → `Promise.all` concept no longer matches the code. Stage 4 already batches all claims per debate step (one LLM call per step, not per claim), Steps 2+3 already run in parallel, and validation checks already run in parallel. The per-claim sequential loop this item targeted does not exist. | ~~-40% of post-research~~ N/A | N/A | N/A | N/A |
| **P1-B** | **Parallelize preliminary search** — run claims concurrently, use `Promise.all` for source fetches within each query (like `fetchSources` already does for main research) | **-60% of preliminary** (~50s) | None | Low — claims/queries are independent | Medium |
| **P1-C** | **Record preliminary URLs in `state.sources`** — prevent duplicate fetches during main research | **-10-30s per duplicate URL** | **-$0.002/duplicate** (saved LLM extraction) | Very low — additive change | Low |
| **P1-D** | **Wire `parallelExtractionLimit` config to `fetchSources`** — replace hardcoded `FETCH_CONCURRENCY = 3` with UCM value | Tunable | None | Very low — existing config field | Low |
| **P1-E** | **Align fetch timeouts** — use `sourceFetchTimeoutMs` from pipeline config for preliminary search too | Consistency | None | Very low — config alignment | Low |

**Phase 1 estimated total impact (revised 2026-03-23):** With P1-A2 retired as stale (the batched debate architecture already exists), the remaining Phase 1 items are P1-A (clustering model downgrade, quality-affecting, deferred), P1-B (preliminary search parallelism, deferred), and the completed low-risk subset (P1-C, P1-D, P1-E). The original -5 to -8 minute estimate included P1-A2's projected savings; actual remaining savings depend on P1-A and P1-B if they are later approved.

### Phase 2 — Medium Risk, Medium Impact (LLM call reduction)

| # | Fix | Time Save | Cost Save | Risk | Effort |
|---|-----|-----------|-----------|------|--------|
| **P2-A** | **Reduce self-consistency from 2→1 round** (Rec-D) — needs validation that 2-sample stability ≈ 3-sample. UCM config change only. | ~30s/claim | **-$0.020/claim (~8%)** | Medium — need data | Low (config) |
| **P2-B** | **Evaluate challenger effectiveness** (Rec-B) — measure how often reconciler incorporates challenger arguments. If <20%, consider eliminating or downgrading. | ~30s/claim | **-$0.024/claim (~10%)** | Medium — need data | Low (measurement) |
| **P2-C** | **Skip contrarian search when contradiction found** — if contradiction iteration already found adversarial evidence, contrarian adds marginal value | ~2 min when triggered | -$0.01 | Low | Low |

**Phase 2 estimated total impact: -$0.04-0.07/claim cost reduction + modest time savings.**

### Phase 3 — Lower Priority (config cleanup + pipeline optimization)

| # | Fix | Impact | Risk | Effort |
|---|-----|--------|------|--------|
| **P3-A** | **Wire `search.default.json:timeoutMs` to search providers** — dead config | Consistency | Very low | Low |
| **P3-B** | **Parallelize search providers in accumulate mode** — query CSE and Serper concurrently instead of sequentially | -3-5s per search call | Low | Medium |
| **P3-C** | **Pipeline queries within iterations** — start next query's search while current query's extraction runs | -5-10s per iteration | Medium — ordering dependency | Medium |
| **P3-D** | **Reduce retry timeout escalation** — 1.5x timeout on retry is expensive (20s → 30s). Use same timeout for retry. | -10s per retry | Very low | Low |

---

## 4. Recommended Execution Order

```
Phase 1 (structural parallelism — no quality risk):
  P1-C → P1-D → P1-E   (COMPLETE as of 2026-03-22)
  P1-B                    (deferred — preliminary search parallelism)
  P1-A                    (deferred — clustering model downgrade, quality-affecting)
  P1-A2                   (RETIRED — stale, batched architecture already exists)

Phase 2 (LLM call reduction — needs measurement first):
  P2-B measurement → P2-A experiment → P2-C implementation

Phase 3 (config cleanup — opportunistic):
  P3-A → P3-D → P3-B → P3-C
```

### Phase 1 status summary (updated 2026-03-23)

**Completed:** P1-C, P1-D, P1-E (low-risk structural wins).

**Retired:** P1-A2 — the per-claim sequential debate loop it targeted no longer exists. The current Stage 4 already batches all claims per debate step, runs Steps 2+3 in parallel, and runs validation checks in parallel. No implementation action remains.

**Deferred:** P1-B (preliminary search parallelism — optional, low priority). P1-A (clustering → Haiku model downgrade — quality-affecting, needs separate validation to confirm boundary quality is preserved; not a structural parallelism fix).

Phase 1 structural wins are effectively complete. P1-A is a separate future quality experiment, not a parallelism change.

---

## 5. Validation Plan

### Phase 1 validation:
- Run 3 benchmark claims (Bolsonaro EN, DE Mental Health, Plastik DE)
- Compare total pipeline time before vs after
- Target: **≥30% wall-clock reduction** on 3-claim analyses
- Verify: same TP, same evidence count, same boundary quality

### Phase 2 validation:
- P2-A: Run 10 analyses with 1 SC round vs current 2, compare verdict spread
- P2-B: Analyze 20 recent jobs' reconciler output to measure challenger influence

---

## 6. Cost Projection

| Scenario | Time | Cost/analysis (3 claims) | Annual (1000 jobs) |
|----------|------|--------------------------|-------------------|
| **Current** | 20-26 min | ~$0.90 | ~$900 |
| **After Phase 1** (parallelism only) | 12-16 min | ~$0.88 | ~$880 |
| **After Phase 1+2** (+ LLM reduction) | 10-14 min | ~$0.60-0.70 | ~$600-700 |

Phase 1 saves **time** (parallelism, no quality risk). Phase 2 saves **money** (SC reduction, clustering downgrade, narrative downgrade — needs measurement). Together: **~40% faster, ~25-30% cheaper.**

### Additional Phase 2 cost-saving opportunities from LLM agent:

| Opportunity | Savings | Risk |
|-------------|---------|------|
| **SC 2→1 rounds** | -$0.09/analysis (9%) | Medium — need spread comparison |
| **SC 2→0 (disable)** | -$0.18/analysis (18%) | High — lose stability measurement entirely |
| **Clustering → Haiku** | -$0.04/analysis (4%) | Medium — boundary quality may degrade |
| **Narrative → Haiku** | -$0.05/analysis (5%) | Medium — user-facing prose quality |
| **Research query batching** (cross-claim) | -$0.02-0.04 (3%) | Low |
| **Research relevance batching** (cross-query) | -$0.02-0.04 (3%) | Low |

### Additional findings from investigation agents:

1. **Dead code:** `grounding-check.ts` exports two LLM-calling functions from the removed orchestrated pipeline. Not called by ClaimBoundary pipeline.
2. **Dead config:** `search.default.json:timeoutMs` is never passed to search providers (they use hardcoded defaults). `pipeline.default.json:parallelExtractionLimit` is never referenced.
3. **Prompt caching is active** on Anthropic calls — helps with repeated prompt prefixes within analysis. But cross-provider debate design (Sonnet advocate → GPT challenger → Sonnet reconciler) prevents caching between roles.
4. **OpenAI TPM guard** already active — falls back to gpt-4.1-mini when challenger call exceeds token limits.

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| | | | |

# Controllable Variance Investigation — Post Stage-1 Stabilization

**Date:** 2026-03-25
**Role:** Lead Architect
**Agent:** Claude Code (Opus 4.6)
**Status:** Investigation report — no implementation proposed

---

## 1. Executive Summary

After Stage-1 stabilization (QLT-1/2/3), the remaining variance is concentrated in three downstream mechanisms — all in Stage 2. Stage 4 self-consistency and Stage 3 clustering contribute, but they amplify Stage 2 differences rather than creating independent variance.

**Ranked controllable variance sources:**

| Rank | Source | Controllability | Estimated impact | Layer |
|------|--------|----------------|-----------------|-------|
| 1 | **Evidence direction ratio** (different web sources → different support/contradict balance) | Partly controllable | **Dominant** — 50pp per-claim swing on Plastik EN environmental claim | Stage 2 acquisition + extraction |
| 2 | **Boundary mega-concentration** (one boundary absorbs 86-94% of evidence) | Controllable | Moderate — reduces triangulation value, amplifies single-boundary bias | Stage 3 clustering |
| 3 | **Self-consistency temperature** (T=0.4 by design) | Controllable (config) | Moderate — intentional but adds ~10-15pp per-claim noise | Stage 4 verdict |
| 4 | **Search query variation** (T=0.2, no caching) | Partly controllable | Secondary — different queries lead to different source pools | Stage 2 query generation |

**Recommendation:** Stay in monitor mode. No single intervention has a clearly favorable cost/benefit ratio. The highest-leverage future lever — if a quality track is ever reopened — is evidence direction balancing at Stage 2, not temperature tuning or clustering constraints.

---

## 2. Scope and Exclusions

**Scope:** Downstream variance sources for families where Stage 1 is stable. Examined:
- Plastik EN: 4 repeated runs, identical claims across all runs
- Plastik DE: 5 repeated runs, identical claims across all runs
- Bolsonaro (two input variants): 3 runs each, Stage 1 partially stable (2 vs 3 claims)

**Excluded from quality judgment:** Jobs with `analysis_generation_failed`, `llm_provider_error`, or infrastructure fallbacks.

**Not in scope:** Stage 1 variance (addressed by QLT-1/2/3), UX/trust concerns, cost optimization.

---

## 3. Current Residual Variance Picture

### Plastik EN — "Plastic recycling is pointless" (Stage 1 stable, 4 runs)

| Metric | Range | Notes |
|--------|-------|-------|
| Article truth% | 36–61% (25pp) | Amber under EVD-1 |
| AC_01 (environmental) truth% | **15–65% (50pp)** | Dominant per-claim driver |
| AC_02 (economic) truth% | 38–55% (17pp) | Moderate |
| AC_03 (practical) truth% | 55–65% (10pp) | Stable |
| Evidence supports | 48–76 items | High variance |
| Evidence contradicts | 38–60 items | High variance |
| Boundary count | 5–6 | Moderate |
| Source count | 45–55 | Moderate |

### Plastik DE — "Plastik recycling bringt nichts" (Stage 1 stable, 5 runs)

| Metric | Range | Notes |
|--------|-------|-------|
| Article truth% | 24–46% (22pp) | Green/borderline under EVD-1 |
| AC_02 (economic) truth% | 38–62% (24pp) | Dominant per-claim driver |
| Evidence contradicts | 51–77 items | High variance |
| Boundary concentration | 46–92% in dominant | Highly variable |

### Bolsonaro — "court proceedings" (Stage 1 partially stable)

| Metric | Range | Notes |
|--------|-------|-------|
| Article truth% | 65–68% (3pp) | Green — very stable |
| Claim count | 2–3 | Stage 1 not fully stable |
| Evidence supports | 19–51 items | Extremely variable |
| Boundary concentration | 56–94% | Extremely variable |

---

## 4. Family-by-Family Downstream Comparison

### 4a. Plastik EN: What differs between the best and worst run?

**Best run** (3fb1, truth 61%): 71 supports, 38 contradicts → ratio 0.65 supporting
**Worst run** (ac62, truth 36%): 69 supports, 51 contradicts → ratio 0.58 supporting

The 25pp article spread maps almost entirely to the environmental claim (AC_01): 65% in the best run vs 15% in the worst. The economic and practical claims are much more stable (17pp and 10pp respectively).

**Why AC_01 swings:** The environmental effectiveness of plastic recycling is genuinely contested in the literature. Different web sources emphasize different aspects — lifecycle assessments, waste diversion rates, energy savings, microplastic contamination. Which sources happen to be fetched determines whether the evidence leans toward "recycling helps" or "recycling is theatre."

This is **not a bug** — it's the system accurately reflecting the contested nature of this specific facet.

### 4b. Plastik DE: Why is the outlier at 46%?

Run f3fa (truth 46%, the outlier) has a distinctly different evidence profile:
- Only 51 contradicting items (vs 73–77 in other runs)
- Boundary CB_10 at 70 items (moderate concentration) vs mega-boundaries in other runs
- AC_02 (economic) scored 62% — the only run where this claim scored LEANING-TRUE

The evidence pool that run happened to acquire was less contradicting. The same stable claims, analyzed against a different evidence mix, produced a materially different result.

### 4c. Bolsonaro: The most stable family despite boundary chaos

Article truth% is remarkably stable (65–68pp, 3pp spread) despite:
- Boundary count varying 2–5
- Boundary concentration varying 56–94%
- Evidence supports varying 19–51 items

**Why it's stable despite evidence chaos:** The two core claims (procedural compliance + verdict soundness) are narrowly scoped to Brazilian legal proceedings. The evidence is consistently pro-compliance (most sources describe the proceedings as following legal process), and the few contradicting items are consistently about political criticism rather than legal substance. The verdict stage correctly handles this: the truth% is stable because the evidence direction balance, while numerically variable, is directionally consistent.

This is the **counter-example** to the Plastik families: stable verdicts are possible despite evidence variance when the topic has a clear directional signal.

---

## 5. Controllable vs Inherent Variance Sources

### A. Search query generation (Stage 2, T=0.2)

**Current behavior:** Each run generates fresh queries at temperature 0.2. Different queries lead to different search results, different sources, different evidence.

**Controllability:** Partly controllable.
- Setting T=0 would reduce query diversity but might harm coverage (same queries every time = same evidence blind spots every time)
- Query caching is not implemented — identical inputs regenerate queries from scratch

**Assessment:** Low-leverage. Query variation is a feature for coverage breadth. The downstream impact flows through source acquisition (inherently non-deterministic) and evidence extraction (also LLM-dependent). Removing query variance alone would not remove the dominant evidence-direction variance.

### B. Source acquisition (Stage 2, network-dependent)

**Current behavior:** Web fetches with 20s timeout, retry on transient errors. Source availability changes over time — URLs go offline, rate limits hit, paywalls block. Google-CSE hits 429 rate limits in ~50% of runs.

**Controllability:** Partly controllable (via source caching), but fundamentally limited by live-web model.
- Could cache successful page fetches for a time window
- Could enforce minimum source diversity (different domains per query)
- But caching would introduce staleness trade-offs

**Assessment:** Medium-leverage but hard to implement well. The core problem is that the same search query returns different results at different times — this is inherent to web search.

### C. Evidence direction ratio (Stage 2 extraction, T=0.1)

**Current behavior:** Evidence items get `claimDirection: supports | contradicts | neutral` assigned by Haiku at T=0.1. The same source text can be classified differently across runs. Additionally, different sources produce structurally different evidence — this is the dominant driver of the 50pp environmental claim swing.

**Controllability:** Partly controllable.
- Evidence direction assignment at T=0.1 is low-variance but not zero
- The bigger factor is **which sources are fetched** (acquisition variance) producing structurally different evidence pools
- Could enforce direction balance constraints (minimum contradicting evidence ratio before verdict) — but this is a design choice, not a bug fix

**Assessment:** **Highest-leverage controllable source** — but the intervention would be a design change (evidence diversity/balance requirements), not a temperature tweak. This is the one area where a future quality track could materially reduce variance without reducing coverage.

### D. Boundary mega-concentration (Stage 3, T=0.05)

**Current behavior:** One boundary often absorbs 80–94% of all evidence. This means the triangulation bonus (which rewards cross-boundary agreement) is nearly useless — there's only one meaningful boundary.

**Controllability:** Controllable.
- Could enforce maximum concentration limits (e.g., no boundary >60% of evidence)
- Could split mega-boundaries into sub-boundaries using clustering parameters
- Boundary clustering temperature is already at 0.05 — effectively deterministic

**Assessment:** Medium-leverage. Mega-concentration doesn't directly cause truth% variance (the evidence is the same regardless of how it's grouped), but it reduces the confidence-boosting effect of triangulation and makes the system more sensitive to the evidence in that one dominant boundary. Reducing concentration would improve structural quality but not directly reduce the measured truth% spread.

### E. Self-consistency temperature (Stage 4, T=0.4 by design)

**Current behavior:** Two re-runs of the advocate verdict at T=0.4, measuring verdict stability. High spread → confidence penalty.

**Controllability:** Fully controllable (UCM config `selfConsistencyTemperature`).
- Lowering T would reduce per-claim variance but also reduce the system's ability to detect genuinely unstable verdicts
- This is intentional variance — removing it would hide instability rather than fix it

**Assessment:** Low-leverage for truth% spread reduction. The self-consistency mechanism is working correctly: it detects when the LLM is uncertain and penalizes confidence accordingly. Reducing the temperature would produce artificially confident verdicts.

### F. Verdict advocate (Stage 4, T=0.0)

**Current behavior:** Single Sonnet call at T=0.0 (deterministic temperature). Variance enters only through different evidence pool inputs from upstream stages.

**Controllability:** Not independently controllable — variance is inherited from evidence.

**Assessment:** Not a lever. The advocate is as deterministic as it can be. Its output varies because its input varies.

---

## 6. Ranked List of Controllable Variance Levers

| Rank | Lever | Layer | Cost | Benefit | Risk | Verdict |
|------|-------|-------|------|---------|------|---------|
| **1** | Evidence direction balancing | Stage 2 | Medium — design change in research loop | Could reduce the 50pp environmental claim swing by ensuring both perspectives are represented | May bias results by forcing artificial balance on genuinely one-sided topics | **Best candidate if quality track reopens** |
| **2** | Boundary concentration limit | Stage 3 | Low — config/threshold change | Reduces mega-boundary dominance; improves triangulation signal | May create artificial boundaries for genuinely coherent evidence pools | **Good complement to #1** |
| **3** | Source-level cache | Stage 2 | Medium — new infrastructure | Same sources across runs → more comparable evidence pools | Staleness; cache invalidation complexity; doesn't help with first runs | **Worthwhile but complex** |
| **4** | Self-consistency temperature tuning | Stage 4 | Low — config change | Minor per-claim variance reduction | Hides genuine verdict instability | **Not recommended** |
| **5** | Query generation temperature | Stage 2 | Low — config change | Minor query variance reduction | Reduces coverage diversity | **Not recommended** |

---

## 7. Best Cost/Benefit Lever

**Evidence direction balancing (Rank #1)** is the highest-leverage controllable variance source. The mechanism would be:

1. After the main research loop completes, measure the direction ratio per claim
2. If ratio is heavily skewed (e.g., >0.8 supporting or <0.2 supporting), allocate 1-2 additional contradiction-targeted queries
3. This already partially exists (`contradictionReservedQueries: 2` in UCM) but operates at the loop level, not per-claim

**Why this is the best lever:**
- The 50pp environmental claim swing on Plastik EN is primarily driven by different evidence direction ratios (48–76 supports across runs)
- Bolsonaro shows that when direction is consistent across runs, verdicts are stable despite evidence volume variance
- The intervention is per-claim and evidence-aware, not a blunt temperature or clustering knob

**Why NOT to implement it now:**
- The current variance is within EVD-1 amber bands, not red
- The intervention is a design change, not a bug fix — it requires careful testing
- It risks introducing bias on genuinely one-sided topics (where heavy skew IS the correct answer)
- There is no current Captain approval for a new quality implementation track

---

## 8. Recommendation

**Stay in monitor mode.** The evidence does not justify opening a new implementation track.

**Rationale:**
1. No family is red under EVD-1. Plastik EN and Muslims are amber — as expected and approved by Captain.
2. The dominant controllable lever (evidence direction balancing) is a design decision, not a fix for a defect.
3. Bolsonaro demonstrates that the system CAN produce stable results on directionally clear topics — the instability on Plastik/Muslims reflects genuine topic contestability, not a system deficiency.
4. Implementing evidence balancing could introduce its own bias (forcing "balance" on topics where the evidence genuinely leans one way).

**If a future quality track is opened:** Start with per-claim evidence direction measurement (already partially in place via `evidence_pool_imbalance` warnings). If a per-claim ratio exceeds 0.85 skew AND the topic is genuinely contested (not a clear factual consensus), allocate additional contradiction queries. But this is a future design discussion, not a current need.

---

## 9. Open Uncertainties

| Uncertainty | Impact | How to resolve |
|-------------|--------|----------------|
| **Would evidence balancing help or hurt?** | Could reduce Plastik spread but might bias one-sided topics | A/B comparison with 5× Plastik runs with/without balance constraint |
| **Is Google-CSE 429 rate limiting affecting direction ratios?** | CSE failures force fallback to Serper-only pools, which may have different domain coverage | Compare evidence profiles between CSE-available and CSE-circuit-open runs |
| **Is boundary concentration a problem or a feature?** | Mega-boundaries may accurately reflect that evidence is methodologically uniform | Check if high-concentration runs produce better or worse verdicts |
| **Would source caching reduce variance?** | Likely yes for same-day repeated runs; unclear for cross-day | Would need to measure with and without a TTL-bounded page cache |

---

*Based on 12+ repeated-run jobs across 3 families, full pipeline code inspection of Stages 2-5, and comparison against EVD-1 approved thresholds.*

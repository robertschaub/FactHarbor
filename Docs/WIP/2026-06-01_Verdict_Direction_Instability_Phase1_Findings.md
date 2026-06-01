---
roles: [Lead Architect]
topics: [verdict_robustness, evidence_drift, verdict_variance, lever_b, instability]
status: Phase-1 grounding (read-only measurement + options). No fix built. Phase-2 is a Captain decision.
tool: scripts/diag/verdict-direction-instability.cjs (read-only)
---

# Lever (b) — Verdict-Direction Instability: Phase-1 Findings + Options

**Date:** 2026-06-01 · **Role:** Lead Architect · **Status:** grounding only; nothing built.

## 0. TL;DR
**Existence is proven:** in the 12 confound-clean clusters (same input + same code + same prompt), 8 disagree on the verdict label and 2 flip truth *polarity* (TRUE-leaning ↔ FALSE-leaning) — e.g. "Plastic recycling" swings MOSTLY-FALSE↔LEANING-TRUE, the Bundesrat claim LEANING-FALSE↔MOSTLY-TRUE. Drift-driven verdict instability is real; the bolsonaro 44↔71 was representative, not a fluke.
**Two things are NOT known and matter for any fix:** (a) the **rate** — the clean sample is tiny (N=12) and selected for contested benchmark inputs, so the observed ~14–17% polarity / ~25–37% UNVERIFIED flip is an **unpinned contested-input upper band**, not a population figure; (b) **what drives the flips** — measured pool overlap is Jaccard 0.10–0.29, so the dominant driver is likely *sources not retrieved* (pool substitution), which a cheap within-pool fix cannot see.
**Recommendation:** do **not** commit to a fix mechanism yet. One **controlled re-run batch** resolves *both* unknowns — it pins the rate *and* tests whether a cheap within-pool stability proxy would actually catch real cross-run flips. Build the mechanism the batch points to.

## 1. Measurement (read-only; `scripts/diag/verdict-direction-instability.cjs`)
Clustered 1,564 SUCCEEDED jobs by repeated identical `InputValue`, at three confound-control levels:

| Level | control | clusters | runs/cl | label-unstable | **POLARITY flip** | UNVERIFIED flip | truth-Δ median / p90 / max |
|---|---|---|---|---|---|---|---|
| L1 | same input | 131 | ~11 | 78% | 23% | 31% | 18 / 55 / 96 |
| L2 | + same code | 110 | ~2.8 | 70% | **14%** | 37% | 13 / 42 / 78 |
| L3 | + same prompts (**pure drift**) | 12 | ~2.75 | 67% | **17%** | 25% | 12 / 42 / 44 |

**Reading it correctly:**
- **Existence rests on L3 alone, and L3 is airtight:** every L3 cluster holds input + code + prompt *constant*, yet 8/12 produce a different verdict label. That is a direct, sufficient proof of drift-driven instability — no cross-level inference needed.
- **Do NOT read L1/L2 as independent corroboration of the rate.** L3 ⊂ L2 (same input+code, just refined by prompt-hash), `PromptContentHash` is null for most rows so L2 is not really "prompt-controlled," and all three levels share the same contested-benchmark selection bias. Their numbers agreeing is partly mechanical (matched ~2.8 runs/cluster), not three independent estimates. L1's higher figures are further inflated by ~11 runs/cluster (more runs = more flip opportunities).
- **So treat the rate as unpinned.** At 2–3 runs/cluster even the clean figures are *lower bounds* on per-input flip propensity, from a thin, upward-biased sample. The rate needs a controlled batch (§6); existence does not.

**The pure-drift clusters (L3) by name** — Plastic-recycling, Bolsonaro, Hydrogen, "Bundesrat … rechtskräftig". Examples: `Plastic recycling` swings MOSTLY-FALSE↔LEANING-TRUE (truth 21→59); the Bundesrat claim swings LEANING-FALSE↔MOSTLY-TRUE; Hydrogen swings UNVERIFIED↔FALSE (truth 6→50).

**Caveats (honest):**
1. **Small clean N** (12 clusters/33 runs). Mitigated by L2 (110 clusters) agreeing — but still a handful of inputs.
2. **Selection bias UP:** repeated inputs are the *contested benchmark* claims people re-ran — exactly where drift flips verdicts most. A random input set would likely show **less** instability. So treat ~14–17% as a contested-input upper band, not the mean.
3. **Post-throttle not isolated:** the CSE-429 throttle (already shipped) removed one drift source; this measures the current-ish residual, not a clean pre/post split.

## 2. Mechanism
Same-input runs draw **different evidence pools** (search/fetch return different sources each run — measured Jaccard 0.10–0.29). The verdict is **sensitive to which evidence is in the pool**: a few marginal or contested sources swing it across a polarity boundary or in/out of the sufficiency gate. The CSE throttle removed the 429→provider-fallback driver; the residual drift is inherent retrieval variance + verdict sensitivity to it.

## 3. The central tension (why this isn't a free fix)
Any robustness mechanism trades against three standing constraints:
- **The checkworthy-UNVERIFIED bar** — blunt "raise the bar / dampen to UNVERIFIED" approaches *reduce* flips but *increase* UNVERIFIED, which the Captain has defined as a bad smell. A good fix must reduce flips **without** mass-converting to UNVERIFIED.
- **Alpha "variance is wanted / no caching"** — this is about not caching *results*; it does **not** bless verdict-direction flips. A stability fix is compatible, but result-caching is off the table.
- **Cost** — anything that adds LLM calls per verdict (re-running on subsets) is expensive at scale.

## 4. Options (mechanisms, cost/benefit)

| # | Mechanism | Targets | Cost | Benefit | Risk / tension |
|---|---|---|---|---|---|
| 1 | **Confidence dampening on thin/contested pools** — widen toward MIXED/lower-confidence when evidence is sparse or highly contradictory | polarity flips | low (verdict-logic only) | fewer false-confident flips | blunt → can raise UNVERIFIED/MIXED (UNVERIFIED-bar tension) |
| 2 | **Raise evidence-sufficiency to commit to a polarity** | polarity flips | low | stronger verdicts only | same UNVERIFIED-bar tension as #1; coarser |
| 3 | **Verdict-stability gate via evidence RESAMPLING (no new LLM)** — recompute the verdict over bootstrap subsamples of the *existing* pool; if the polarity flips under resampling, the verdict is pool-sensitive → lower confidence / widen to MIXED **only then** | within-pool fragility only | low–med (deterministic resampling of existing evidence; **no extra LLM calls** if verdict aggregation is rule-based, med if it needs an LLM re-call) | targeted; doesn't blanket-raise UNVERIFIED | **⚠ structurally blind to pool-SUBSTITUTION drift** — it can only drop sources you *have*, not the different sources you *didn't retrieve*. Given Jaccard 0.10–0.29 (pools barely overlap), substitution is likely the dominant driver, so this proxy may **under-detect the real cross-run flips**. Necessary-ish, not sufficient. Must be validated against the batch (§6) before building. |
| 4 | **Larger / saturated evidence pools** — over-fetch so the pool is more stable run-to-run | drift at source | med–high (more fetch + extraction $) | less drift to be sensitive to; aligns with the fetch-sizing finding (25–50%-fail bucket was best) | cost; diminishing returns; doesn't fix sensitivity, only feeds it more |
| 5 | **Authoritative-evidence anchoring** — weight direct/authoritative evidence so marginal sources can't swing the verdict | sensitivity to marginal sources | med (verdict-weighting change) | verdict driven by stable core, not drift-y margins | needs a robust authority signal; interacts with applicability/direct gating just changed |

## 5. Recommendation — no fix mechanism is safe to commit to yet
The measured Jaccard (0.10–0.29) points to **pool substitution** (sources not retrieved) as the likely dominant driver, which reframes the options:
- **Option 3 (within-pool resampling) is NOT the safe frontrunner** it first looks like — it is blind to substitution drift (§4) and would likely under-detect the real flips. Build it only if the batch shows within-pool fragility actually predicts cross-run flips.
- **If substitution dominates** (the likely case), the on-target mechanisms are **#4 (larger/saturated pools** — reduce substitution at the source; aligns with the fetch-sizing finding that more sources helped**)** and/or **#5 (anchor the verdict to stable authoritative evidence** so marginal-source churn can't swing it**)**, or a cross-pool **consensus** approach (expensive).
- **Do NOT** start with #1/#2 alone — they reduce flips by inflating UNVERIFIED/MIXED, which fights the checkworthy-UNVERIFIED bar.

The driver is genuinely unknown from existing data (free read-only data is exhausted — same-code clusters average only 2.8 runs). The right move is to let the batch decide the mechanism, not pre-pick one.

## 6. Phase-2 decision (Captain)
Existence is settled; the existing data is exhausted. **One controlled re-run batch** — a representative, Captain-provided input set (contested + clear, multilingual) run **N times on the current commit**, capturing per-run verdict **and the evidence-source set** — resolves all three open questions at once:
1. **Rate** — the real per-input polarity/UNVERIFIED flip frequency (pins the unpinned upper band).
2. **Driver** — compute cross-run source-set overlap (Jaccard) vs verdict agreement: is the flipping driven by *pool substitution* (low overlap) or *within-pool sensitivity* (high overlap, different verdict)? This decides between the §5 mechanism families.
3. **Proxy validity** — for each real cross-run flip, would the cheap within-pool resampling gate (Option 3) have flagged it? If that catch-rate is low, Option 3 is the wrong build — and we've learned that for the price of the batch, not a failed implementation.

The batch also becomes the before/after yardstick for whatever fix the driver points to.

**Two asks:**
1. **Go/no-go on the controlled re-run batch** (real LLM cost; I'll cost it precisely once the input set + N are fixed).
2. If yes, **provide the input set** (I won't fabricate it). I'll then build the harness (read-only on the pipeline; it just runs jobs + records verdict + source-set), report the three measurements, and recommend the mechanism the data points to.

If you'd rather not spend: existence is proven, but the rate, the driver, and any fix's validity all stay unknown — so I would **not** build a fix blind. Better to log it as a known, bounded alpha limitation than to ship a mechanism that might be aimed at the wrong driver.

---
roles: [Lead Architect]
topics: [verdict_robustness, evidence_drift, verdict_variance, lever_b, instability]
status: Phase-1 grounding (read-only measurement + options). No fix built. Phase-2 is a Captain decision.
tool: scripts/diag/verdict-direction-instability.cjs (read-only)
---

# Lever (b) — Verdict-Direction Instability: Phase-1 Findings + Options

**Date:** 2026-06-01 · **Role:** Lead Architect · **Status:** grounding only; nothing built.

## 0. TL;DR
On **identical input + identical code + identical prompts**, the pipeline flips the verdict's **truth direction (TRUE-leaning ↔ FALSE-leaning) ~14–17%** of the time, flips **in/out of UNVERIFIED ~25–37%**, gives a **different verdict label ~67–70%**, with a **median truth-% swing of ~12–18 points** (max 44). The bolsonaro 44↔71 was **representative, not a fluke.** This is real and worth a fix — but the clean sample is small and biased toward contested inputs, so the rate is an **upper-ish bound from a thin sample**, not a precise population figure. Recommendation: pursue a **targeted, cheap stability gate**, but get a **precise baseline via a small controlled re-run batch first** (the one spend ask).

## 1. Measurement (read-only; `scripts/diag/verdict-direction-instability.cjs`)
Clustered 1,564 SUCCEEDED jobs by repeated identical `InputValue`, at three confound-control levels:

| Level | control | clusters | runs/cl | label-unstable | **POLARITY flip** | UNVERIFIED flip | truth-Δ median / p90 / max |
|---|---|---|---|---|---|---|---|
| L1 | same input | 131 | ~11 | 78% | 23% | 31% | 18 / 55 / 96 |
| L2 | + same code | 110 | ~2.8 | 70% | **14%** | 37% | 13 / 42 / 78 |
| L3 | + same prompts (**pure drift**) | 12 | ~2.75 | 67% | **17%** | 25% | 12 / 42 / 44 |

**Reading it correctly:**
- **L1 is inflated** by far more runs per cluster (~11) — more runs = more chances to observe a flip. Don't use L1 for the rate.
- **L2 vs L3 is the fair comparison** (matched ~2.8 runs/cluster). Adding the prompt control (L2→L3) barely moves the numbers → the instability is **genuine evidence-pool drift, not code or prompt churn.**
- At only 2–3 runs/cluster these are **lower bounds** on the true per-input flip propensity.

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
| 3 | **Verdict-stability gate via evidence RESAMPLING (no new LLM)** — recompute the verdict over bootstrap subsamples of the *existing* pool; if the polarity flips under resampling, the verdict is pool-sensitive → lower confidence / widen to MIXED **only then** | the instability *directly* (detects pool-sensitivity) | low–med (deterministic resampling of existing evidence; **no extra LLM calls** if verdict aggregation is rule-based, med if it needs an LLM re-call) | **targeted** — only dampens when genuinely unstable, so it doesn't blanket-raise UNVERIFIED | needs the verdict aggregation to be re-runnable on a subset; design work |
| 4 | **Larger / saturated evidence pools** — over-fetch so the pool is more stable run-to-run | drift at source | med–high (more fetch + extraction $) | less drift to be sensitive to; aligns with the fetch-sizing finding (25–50%-fail bucket was best) | cost; diminishing returns; doesn't fix sensitivity, only feeds it more |
| 5 | **Authoritative-evidence anchoring** — weight direct/authoritative evidence so marginal sources can't swing the verdict | sensitivity to marginal sources | med (verdict-weighting change) | verdict driven by stable core, not drift-y margins | needs a robust authority signal; interacts with applicability/direct gating just changed |

## 5. Recommendation
- **Most promising:** **Option 3 (resampling stability gate)** — it's the only one that targets the instability *directly* and *selectively* (dampens confidence only when the verdict is demonstrably pool-sensitive), so it reduces flips without the blunt UNVERIFIED inflation that #1/#2 risk. Pair with a light **#5 anchoring** if the resampling shows marginal sources are the swing factor.
- **Do NOT** start with #1/#2 alone — they fight the checkworthy-UNVERIFIED bar.
- **#4** is a fallback only if source-drift turns out dominant over verdict-sensitivity.

## 6. Phase-2 decision (Captain)
The thin clean sample (N=12) is enough to confirm the problem is real, **not** enough to (a) baseline a precise rate or (b) measure a fix against. So before building Option 3 I recommend **one controlled re-run batch** — re-run a representative, Captain-provided input set (mix of contested + clear, multilingual) **N times on the current commit**, to get a precise per-input flip rate. That batch then doubles as the before/after yardstick for any fix.

**Two asks:**
1. **Go/no-go on a controlled re-run batch** (real LLM cost; I'll cost it once you fix the input set + N) — needed for a precise baseline and to measure a fix.
2. If yes, **provide the input set** (I won't fabricate it) — and I'll then prototype **Option 3** against that baseline.

If you'd rather not spend, the honest fallback is: the problem is confirmed-real at ~14–17% polarity-flip on contested inputs, Option 3 is the design to build, and we accept building against the thin baseline.

# Independent Review Brief — Report-Quality Measurement & Build-Comparison Concept

**Date:** 2026-06-04
**Prepared by:** Lead Architect (Claude)
**For:** an **independent reviewer** with no prior context on this work — a different model (e.g. Codex / GPT-5.x, Gemini) or a human architect. You do **not** need any chat history; everything you need is below or in the linked files.

---

## 0. What you are reviewing

**Artifact (read it in full):**
`C:\DEV\FactHarbor\Docs\WIP\2026-06-04_Report_Quality_Measurement_And_Build_Comparison_Concept.md`

It is a **concept / design proposal** (no code) for how FactHarbor should:
1. **measure & rate** the quality of an analysis *report*, decomposed into **isolatable components** (atomic-claim extraction → evidence → per-claim verdict → overall verdict → narrative); and
2. **systematically compare report quality across builds** (e.g. HEAD vs a branch, or historical pipeline eras).

**One-paragraph product context (so the artifact makes sense):** FactHarbor is a fact-checking pipeline. An input statement is decomposed into *atomic claims* (Stage 1); each claim is researched into *evidence items* grouped into *assessment boundaries* (Stage 2/3); each claim gets a *verdict* with a truth-percentage + confidence (Stage 4); the claim verdicts are aggregated into an *overall verdict* with a 7-point label + a human-readable *narrative* (Stage 5). Outputs vary run-to-run (it makes live LLM + web-search calls; result caching is off during alpha). Quality is already partly codified as a **Q-code catalog** and per-input **gold bands** (see §3 files).

---

## 1. Why this needs an *independent* review (and what NOT to spend time on)

This is **v2**. It consolidated three sources (a base concept + two peer concepts) and then passed **one internal Code-Reviewer pass** that already found and fixed the issues below. **Please do not re-report these — they are closed.** Your value is in challenging things that pass already missed, especially *premises*.

**Already found & fixed (closed — do not re-raise):**
- C4 no longer double-scores the narrative (now solely C5).
- `Q-BE4` (boundary count) is scored once, at C2 (not double-counted in C4).
- `/report-review` panel names corrected (Evidence&Boundary / Verdict-Reasoning / Warning-Severity + Devil's-Advocate) and reframed as an *extension*, not drop-in reuse.
- `Q-S1.6` removed from C1 (it is a verdict-stage check; kept only in C3).
- §2 vs §3 evidence-gold contradiction reconciled.
- Aggregation-faithfulness formula now includes the contestation penalty + thesis-relevance exclusion and is scoped to truthPercentage.
- Severity-weight reuse clarified (per-report weights only, **not** the composite ranker); `measure-evidence-quality.ts` flagged as legacy scaffolding (rewrite, not evolve); pairwise-judge cost sized; C1 Phase-1 annotation dependency noted.

**Internal consistency and field-name accuracy were verified against source.** You may spot-check, but the high-value target is the next section.

---

## 2. What we most want you to pressure-test (premises, not typos)

Be adversarial. The internal review confirmed the doc is *self-consistent*; your job is to ask whether it is *right*.

1. **Circularity of the measurement.** The framework grades the pipeline largely using the pipeline's **own** self-assessment signals (Q-codes, `TIGERScore`, `explanationQualityCheck`, `consistencyResult`). Is measuring a build with artifacts the build itself emits a fatal circularity? Where could a regression make *both* the report and its quality score wrong in the same direction (so the score fails to catch it)? Which signals must come from *outside* the pipeline to be trustworthy?

2. **The reference gradient (the doc's central claim, §2).** It asserts gold exists *only* at the overall verdict (C4) and that C1/C2/C3 have effectively no ground truth, so they must rely on intrinsic + stability + judge. Is that the right call, or is it a rationalization for not building harder references? Is there a cheap, non-"teaching-to-the-test" way to get partial gold at C1/C3 that the doc dismisses too quickly?

3. **Pairwise A/B vs cardinal scoring (§4b, §5b).** The doc refuses cardinal LLM-judge sub-scores and uses blind pairwise A/B for ungolded layers. Is pairwise actually more reliable here given the documented run-to-run drift (claim-set Jaccard ≥0.6; evidence-pool Jaccard 0.10–0.29)? Does aggregating "rep pairings" into a win-rate hide anything? Is there a transitivity / non-orderable-cycle risk across >2 builds?

4. **"Composite gates, never ranks" (§4c, §5f).** Builds are compared by Pareto-dominance over a vector, or an explicit Captain weighting — never a scalar. Is Pareto-dominance actually *usable* in practice, or will real builds almost never dominate (improve-here-regress-there), forcing the weighting path anyway — making the "never a scalar" stance theoretical? If so, what should the default decision rule be?

5. **Statistical validity of the build comparison (§5a–§5d).** N≥5 reps/input, 8 families, `noiseTolerancePct: 8`. Is N=5 enough to call a build difference real vs alpha noise? What's the right test (paired? per-family? multiple-comparison correction across 8 families × ~8 dimensions)? Is the calibration metric (ECE/Brier vs gold bands) sound when the "gold" is a *band* rather than a point?

6. **Attribution honesty (§5e).** The doc concedes true per-stage causal attribution needs upstream-artifact injection (deferred). Given that, is the per-component vector still decision-useful for "which build is better," or does the drift confound erode it more than the doc admits?

7. **Anything load-bearing that's simply wrong** — a field that won't behave as assumed, an aggregation rule misread, a reuse claim that won't hold, a metric that can't be computed from stored data.

---

## 3. Source files to cross-check (absolute paths)

- Data model / fields: `C:\DEV\FactHarbor\apps\web\src\lib\analyzer\types.ts`
- Aggregation weights: `C:\DEV\FactHarbor\apps\web\src\lib\analyzer\aggregation.ts`
- Pipeline stages: `C:\DEV\FactHarbor\apps\web\src\lib\analyzer\claimboundary-pipeline.ts`
- Q-code catalog (what to check): `C:\DEV\FactHarbor\Docs\AGENTS\report-quality-expectations.json`
- Gold bands per input family: `C:\DEV\FactHarbor\Docs\AGENTS\benchmark-expectations.json`
- Narrative intent / comparators: `C:\DEV\FactHarbor\Docs\AGENTS\Captain_Quality_Expectations.md`
- Existing diagnostic scripts (reuse claims): `C:\DEV\FactHarbor\scripts\diag\*.cjs` and `C:\DEV\FactHarbor\scripts\measure-evidence-quality.ts`
- The `/report-review` skill (panel reuse claim): `C:\DEV\FactHarbor\.claude\skills\report-review\SKILL.md`
- The study this feeds: `C:\DEV\FactHarbor\Docs\WIP\2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md`

---

## 4. Out of scope / deliberately deferred (do not file as gaps)
- **It is a concept, not an implementation.** No code exists; do not review code quality or ask for it.
- **Four decisions are intentionally left to the Captain (§9 of the artifact):** the vector weighting (incl. plastic-en control-lane handling), whether to grow per-claim gold annotations, cross-provider judge affordability under alpha cost, and the first comparison target. Flag if you think one of these is mis-framed, but their being *open* is by design, not an omission.
- **Cost constraints are real** (alpha; OpenAI Pro access may have lapsed). Don't propose anything that assumes unlimited LLM spend without saying so.

---

## 5. Requested output

A prioritized findings list. For each: **severity** (BLOCKER / HIGH / MEDIUM / LOW), the **location** (section + short quote), **what's wrong or risky**, and a **concrete one-line fix or alternative**. Cite `file:line` for any code/spec cross-check. Separate **premise-level concerns** (§2) from **mechanical/accuracy** findings.

End with a one-paragraph verdict: **is the architecture sound enough to put in front of the Captain for the §9 decisions, or are there premise-level must-fixes first?** Be skeptical; do not soften. If you disagree with a closed item from §1, say so explicitly and why — but assume it was checked.

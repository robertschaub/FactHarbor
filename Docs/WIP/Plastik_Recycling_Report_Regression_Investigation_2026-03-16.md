# Plastik Recycling Report Regression Investigation

**Date:** 2026-03-16  
**Status:** Ready for Review  
**Investigated by:** Senior Developer  
**Primary job:** `64c44032d2b84093ae2c97384996aad1`  
**Input:** `Plastik recycling bringt nichts`  
**Comparison jobs:** `cee9b5a7da194f7f85b3200d357bff5c`, `457d43c5f3184d9696012b429741a965`, `9d77e5c87a794f64b6d73d358838ad32`, `9e8e0cf391aa413787fd318ff16328f3`

---

## 1. Problem Statement

The input:

> `Plastik recycling bringt nichts`

used to produce substantially stronger anti-thesis reports for the same broad claim family. Earlier benchmark and production-like runs often landed in `MOSTLY-FALSE` / low-truth territory, while the investigated job `64c44032d2b84093ae2c97384996aad1` produced a weaker:

- `41.4%` truth
- `43.5` confidence
- `LEANING-FALSE`

The issue is not just normal run-to-run variance. This job produces a visibly weaker report and shows multiple signs of internal analytical degradation.

This document investigates:

1. whether the regression is real,
2. which pipeline stages are causing it,
3. which causes are primary vs secondary,
4. and what fixes should be prioritized.

---

## 2. Comparative Baseline

### Recent runs for the same input

| Job | Date | Truth | Confidence | Verdict |
|-----|------|-------|------------|---------|
| `64c44032...` | 2026-03-16 | `41` | `43` | `LEANING-FALSE` |
| `457d43c5...` | 2026-03-16 | `46` | `50` | `MIXED` |
| `9d77e5c8...` | 2026-03-15 | `46` | `54` | `MIXED` |
| `9e8e0cf3...` | 2026-03-14 | `61` | `60` | `LEANING-TRUE` |
| `cee9b5a7...` | 2026-03-08 | `20` | `73` | `MOSTLY-FALSE` |
| `3bae686f...` | 2026-03-05 | `36` | `71` | `LEANING-FALSE` |

### Why this is a real regression

The March 8 run `cee9b5a7...` is the strongest comparable reference point:

- same pipeline family (`claimboundary`)
- same input claim
- same basic model allocation pattern (`Haiku` for extraction/research, `Sonnet` for verdict)
- much stronger anti-thesis result:
  - `20.7%` truth
  - `73.1` confidence
  - `MOSTLY-FALSE`

So this is not a simple "the claim is inherently ambiguous" explanation. The system has already demonstrated that it can produce a materially stronger report for this exact input.

---

## 3. What Happened In The Investigated Job

### 3.1 Stage 1 extracted three high-centrality dimension claims

The input was decomposed into:

1. `AC_01`
   - `Kunststoffrecycling hat keinen ökologischen Nutzen in Bezug auf Ressourcenschonung und Emissionsreduktion`
2. `AC_02`
   - `Kunststoffrecycling ist wirtschaftlich nicht rentabel und kostet mehr als alternative Entsorgungsmethoden`
3. `AC_03`
   - `Kunststoffrecycling führt nicht zu einer echten Kreislaufwirtschaft, da recycelte Kunststoffe nicht in gleichwertiger Qualität zu neuen Produkten verarbeitet werden`

All three were:

- `centrality: high`
- `isCentral: true`
- `claimDirection: supports_thesis`
- `thesisRelevance: direct`
- `isDimensionDecomposition: true`

### 3.2 Gate 1 did not filter any of them

`gate1Stats`:

- `totalClaims: 3`
- `passedOpinion: 3`
- `passedSpecificity: 0`
- `passedFidelity: 3`
- `filteredCount: 0`

This is important:

- Gate 1 explicitly judged all three claims too vague on specificity
- but the pipeline still kept all three

### 3.3 Research completed, but with skewed evidence mix

The job did not fail operationally:

- `137` evidence items
- `50` sources
- `23` searches
- `5` main iterations
- `1` contradiction iteration

But the evidence balance was weaker than the stronger March 8 run:

| Job | Supporting | Contradicting | Neutral | Total |
|-----|------------|---------------|---------|-------|
| `64c44032...` | `58` | `45` | `34` | `137` |
| `cee9b5a7...` | `31` | `63` | `86` | `180` |

The stronger run ended with a clearly anti-thesis evidence shape.  
The investigated run ended with a more balanced, thesis-friendlier shape.

### 3.4 Final claim verdicts were weak and unstable

Investigated job claim verdicts:

| Claim | Truth | Confidence | Verdict |
|------|-------|------------|---------|
| `AC_01` ecology | `36` | `57` | `LEANING-FALSE` |
| `AC_02` economics | `49` | `32` | `UNVERIFIED` |
| `AC_03` circularity / quality | `46` | `20` | `UNVERIFIED` |

By contrast, the stronger March 8 run produced:

| Claim | Truth | Confidence | Verdict |
|------|-------|------------|---------|
| `AC_01` ecology | `18` | `82` | `MOSTLY-FALSE` |
| `AC_02` economics | `28` | `63` | `MOSTLY-FALSE` |
| `AC_03` technical | `18` | `70` | `MOSTLY-FALSE` |

---

## 4. Root Causes

This regression is not explained by one bug. It is a stack of interacting problems.

### 4.1 Primary cause: Stage 1 is narrowing the user thesis into easier-to-support subclaims

The current ambiguous-claim guidance in [claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md) allows broad claims to be split into interpretation dimensions.

For this input, that decomposition is too aggressive:

- The original input is broad and rhetorical: `bringt nichts`
- The extracted claims add narrower, support-friendly predicates:
  - `Ressourcenschonung und Emissionsreduktion`
  - `kostet mehr als alternative Entsorgungsmethoden`
  - `nicht in gleichwertiger Qualität`

These are not neutral restatements. They are sharper, easier-to-research, and partially easier-to-support formulations.

#### Why this matters

The stronger historical runs used broader dimension wording:

- `in ökologischer Hinsicht nichts`
- `in ökonomischer Hinsicht nichts`
- `in technischer Hinsicht nichts`

Those formulations keep the user thesis broad and make it easier for strong contradictory evidence to invalidate the absolute claim.

The current run instead moves toward:

- narrower mechanisms,
- narrower comparator frames,
- and specific causal narratives.

That changes the object being tested.

### 4.2 Primary cause: Gate 1 is too permissive for dimension-decomposed claims

The filtering logic in [claimboundary-pipeline.ts](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts) keeps claims unless they:

- fail fidelity and are not dimension-decomposed,
- fail both opinion and specificity,
- or fall below the specificity threshold.

In this job:

- all three claims failed specificity in Gate 1 reasoning,
- but all three survived anyway.

This means the pipeline is effectively saying:

- "these claims are too vague"
- then immediately proceeding to treat them as valid central analysis units

That is a weak control surface for broad rhetorical claims.

### 4.3 Primary cause: Stage 2 research scheduling amplifies the decomposition

Stage 2 picks the next target claim with [findLeastResearchedClaim()](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts), which only counts how many evidence items each claim has.

That mechanism is structurally simple and neutral, but for this input it interacts badly with the extracted claims:

- economics gets early budget,
- circularity/quality gets early budget,
- ecology is researched later,
- contradiction loop is limited to one reserved iteration

In the investigated run, the main-loop queries were dominated by:

- cost / profitability
- quality degradation / circularity

Only later did the loop spend budget on:

- `CO₂-Einsparungen`
- lifecycle / emissions comparisons

The result is not "no ecology evidence". The result is weaker ecology contradiction pressure than the stronger baseline run.

### 4.4 Secondary cause: key contradictory institutional PDFs were dropped by retrieval limits

The investigated run emitted multiple `source_fetch_failure` warnings due to large PDFs exceeding the 10 MB hard cap in [retrieval.ts](../../apps/web/src/lib/retrieval.ts).

Examples from `analysisWarnings`:

- PEW PDF rejected as too large
- BDE status report PDF rejected as too large
- UBA PDF rejected as too large

This matters because these oversized PDFs are exactly the kind of high-value institutional material that would strengthen:

- ecology contradiction,
- system-level cost context,
- and non-rhetorical baseline framing

This is not the primary cause of the regression, but it clearly weakens the evidence pool.

### 4.5 Secondary cause: Stage 3 clustering produced noisy mega-boundaries

The investigated job created six large mixed boundaries:

- `CB_08` `Unternehmensinterviews`
- `CB_22` `Ökobilanz Schweiz`
- `CB_31` `Produktionsparameter Rezyklate`
- `CB_39` `Nachhaltigkeitsbewertung`
- `CB_47` `LCA Rezyklate vs. Neuware`
- `CB_55` `Globale Kunststoffproduktion`

These are not clean analytical frames. They are broad mixed clusters combining:

- LCA
- company interviews
- market commentary
- statistics
- chemistry / materials content
- general context

By contrast, the stronger March 8 run had one dominant contradiction-heavy research boundary (`CB_09`, `110` evidence items) plus smaller side boundaries.

So the current run is paying a quality cost twice:

1. evidence is collected in a weaker mix
2. then that mix is clustered into noisier frames

### 4.6 Tertiary cause: verdict integrity checks found real problems, but the report still shipped

The investigated job contains:

- `verdict_grounding_issue`
- `verdict_direction_issue`
- `structural_consistency` error

Examples:

- AC_02 cites hallucinated evidence IDs in the support list
- AC_03 has a direction mismatch relative to its evidence balance
- a verdict label mismatch was recorded as structural inconsistency

The current default config leaves verdict safe-downgrade disabled, so these issues are surfaced as warnings but do not prevent a normal report from being presented.

This does not create the semantic regression by itself, but it allows a degraded report to appear more trustworthy than it is.

---

## 5. Non-Causes / What This Is Not

### 5.1 Not primarily a runner restart issue

The event log shows an interruption at `13:21:53 UTC` and immediate re-queue/restart.  
The rerun completed cleanly afterward and re-executed Stage 1 through Stage 5.  
The weak output is not explained by a half-finished pipeline state.

### 5.2 Not primarily a total search collapse

Search and extraction still produced:

- `50` sources
- `137` evidence items

This is not a "no evidence found" failure mode.

### 5.3 Not a `thesisRelevance` / proxy-claim problem

Unlike the proxy-claim issue documented elsewhere, all three extracted claims here were marked:

- `thesisRelevance: direct`

So the recently added non-direct exclusion mechanism is not the relevant lever for this regression.

---

## 6. Why The Report Feels Bad To A Reader

The report feels bad because the system lands in the worst middle state:

- the report headline still pushes back on the original thesis,
- but the claim-level reasoning is weak and unstable,
- the evidence is noisy,
- the boundaries are bloated,
- and internal verdict consistency checks already know something is off.

So the user sees:

- a low-confidence near-middle verdict,
- claim cards that are only weakly anti-thesis,
- and narrative reasoning that sounds more cautious and fragmented than the strong earlier runs

This is qualitatively worse than either:

- a strong anti-thesis report, or
- a clearly flagged low-quality / degraded report

---

## 7. Recommended Fixes

### 7.1 Fix A — Tighten Stage 1 decomposition for broad rhetorical evaluative claims

**Priority:** P0  
**Type:** Prompt + Gate 1 behavior  
**Goal:** Keep dimension claims broad and thesis-faithful

For claims like:

- `X bringt nichts`
- `X ist nutzlos`
- `X is useless`

the decomposition should keep broad neutral dimension labels:

- ecological
- economic
- technical

It should not inject narrower mechanism/comparator predicates unless the input already contains them.

### Desired rule

Allowed:

- `X has no ecological benefit`
- `X has no economic benefit`
- `X has no technical benefit`

Not allowed unless present in input:

- `X costs more than alternative disposal methods`
- `X fails because recycled material is not equal-quality`
- `X has no benefit in terms of emissions reduction and resource conservation`

This should be enforced via prompt guidance and Gate 1 fidelity tightening, not keyword heuristics.

### 7.2 Fix B — Make Gate 1 actually filter vague dimension claims

**Priority:** P0  
**Type:** Pipeline logic / prompt contract alignment

Right now Gate 1 says all three claims are too vague, then keeps them anyway.

That needs one of two decisions:

1. either dimension-decomposed broad claims are intentionally allowed despite low specificity, in which case the Gate 1 reasoning/policy must be rewritten to match reality,
2. or low-specificity dimension claims must actually be filtered or merged.

For this regression, the recommended direction is:

- if all extracted claims fail specificity,
- rescue at most one broad faithful central claim,
- do not keep three vague central claims just because they are dimension decompositions

### 7.3 Fix C — Change research scheduling from raw evidence-count balancing to coverage balancing

**Priority:** P1  
**Type:** Stage 2 scheduling logic

Current selection only optimizes:

- "which claim has the fewest evidence items?"

For claims like this, that is not enough. The system should prefer claims that still lack:

- contradicting evidence,
- institutional evidence,
- or diversity of source type / scope

Minimum safe improvement:

- guarantee one substantive main-loop pass per central claim before recycling

Better improvement:

- target the least-covered claim by evidential quality, not just item count

### 7.4 Fix D — Improve oversized PDF handling for institutional sources

**Priority:** P1  
**Type:** Retrieval / ingestion

The 10 MB hard cap is too blunt for this claim class.

Recommended direction:

- streamed or partial PDF extraction
- larger cap for trusted institutional PDFs
- or pre-extraction metadata path to avoid discarding large official reports entirely

This is especially important for environmental / policy / LCA topics, which often rely on long government or NGO reports.

### 7.5 Fix E — Treat verdict integrity failures as quality blockers

**Priority:** P0  
**Type:** Verdict-stage policy

If a run emits:

- `verdict_grounding_issue`
- `verdict_direction_issue`
- `structural_consistency`

then one of the following should happen:

1. auto-rerun the affected verdict stage,
2. safe-downgrade the affected claim verdicts,
3. or visibly mark the final report as degraded

The current behavior is too permissive for user-facing report quality.

### 7.6 Fix F — Continue the boundary cleanup track

**Priority:** P1  
**Type:** Stage 3 quality

The current boundary output in this job is noisy enough to harm report readability and evidence coherence.

The ongoing boundary-quality work is still the right direction:

- more specific scope extraction upstream
- better clustering separation
- pruning / concentration handling downstream

That work will not solve this regression alone, but it will reduce one major amplifier.

---

## 8. Recommended Implementation Order

### Phase 1 — P0 containment

1. Tighten Stage 1 decomposition prompt for broad rhetorical evaluative claims
2. Tighten Gate 1 retention behavior for low-specificity dimension decompositions
3. Treat verdict integrity failures as blocking / downgraded quality events

### Phase 2 — P1 quality restoration

4. Improve Stage 2 claim targeting so evidence coverage is balanced by quality, not only count
5. Improve large-PDF retrieval for institutional sources

### Phase 3 — P1/P2 cleanup

6. Apply boundary cleanup / concentration work
7. Re-benchmark this claim against the March 8 quality baseline

---

## 9. Validation Plan

After implementing the first fix slice, re-run:

1. `Plastik recycling bringt nichts`
   - target: move away from `41/43 LEANING-FALSE`
   - preferred direction: stronger anti-thesis result with cleaner claim reasoning

2. At least one other German broad rhetorical claim
   - to ensure the fix is not overfit to plastics

3. At least one English analogue
   - e.g. `X is useless`

4. At least one non-English non-German analogue
   - to validate multilingual neutrality

Success criteria:

- no claim-level grounding hallucination warnings
- no structural consistency error
- broader and more faithful dimension claims
- stronger contradiction balance for absolute anti-value claims
- boundary output less noisy than the investigated job

---

## 10. Review Questions

1. Should broad rhetorical "X bringt nichts / is useless" claims be decomposed into broad dimension labels only, with no extra causal/comparator detail unless the input contains it?
2. Should Gate 1 be allowed to keep multiple dimension-decomposed claims when it already judged all of them non-specific?
3. Should verdict grounding / structural consistency issues trigger automatic downgrade or rerun before user-facing display?
4. Should Stage 2 balancing move from evidence-count only to contradiction / institutional coverage balancing?
5. Is the current 10 MB hard cap acceptable for institutional PDF-heavy claim classes, or should trusted-source handling be added?

---

## 11. Conclusion

The weak report for `64c44032d2b84093ae2c97384996aad1` is a real quality regression.

The main causes are:

1. overly aggressive Stage 1 narrowing of the thesis,
2. Gate 1 retaining vague dimension claims it already judged weak,
3. Stage 2 budget allocation amplifying that decomposition,
4. loss of high-value institutional PDFs,
5. noisy boundary clustering,
6. and verdict integrity failures that do not currently block or downgrade the report.

The highest-value first move is not search tuning or UI cleanup. It is to re-tighten the claim contract:

- broad input stays broad,
- dimension decomposition stays neutral,
- and degraded verdict objects do not ship as normal-quality reports.

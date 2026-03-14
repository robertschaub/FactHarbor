# Report Quality Restoration Plan

**Status:** REVIEW READY
**Created:** 2026-03-14
**Author Role:** Senior Developer
**Baseline checkpoint:** `quality_window_start` (`9cdc8889`)
**Primary evidence:** [`Report_Quality_Worktree_Comparison_Results_2026-03-13.md`](../../Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md)

---

## TL;DR

The best-quality historical checkpoint is now known: `quality_window_start` (`9cdc8889`).

Current `main` is cleaner and safer than many intermediate checkpoints, but report quality is still below that baseline. The strongest current suspects are:

1. `applyEvidenceWeighting` / SR weighting and its surrounding conservative confidence settings
2. shared search-stack drift from the historical baseline
3. reduced research depth (`maxIterationsPerContext: 5 -> 3`)

This plan does **not** recommend rolling back the contamination fixes. Instead, it recommends a controlled restoration program:

1. preserve contamination and geography fixes
2. use `quality_window_start` as the standing comparison baseline
3. run high-signal A/B experiments on `main`
4. restore only the changes that actually improve quality

---

## Reviewer Quick Start

Read in this order:

1. `TL;DR`
2. `Problem Statement`
3. `What We Now Know`
4. `Restoration Strategy`
5. `Phased Plan`
6. `Experiment Matrix`
7. `Open Review Questions`

Primary review question:

- Is the proposed order of experiments the right way to restore report quality without reintroducing contamination or creating new drift?

---

## Reviewer Checklist

- Confirm `quality_window_start` is the correct quality baseline.
- Confirm contamination fixes should be preserved.
- Confirm SR weighting is the highest-priority current suspect.
- Confirm search-stack drift should be tested second, not first.
- Confirm the proposed temporary quality profile is the right first integrated experiment.
- Confirm the plan keeps code rollback risk low by using UCM/A/B experiments first where possible.

---

## Problem Statement

The historical comparison now gives a clear answer:

- `quality_window_start` produced the best reports
- degradation began immediately after that window
- current `main` is still below that baseline even after contamination cleanup and geography repair

Current `main` has improved structural correctness:

- jurisdiction contamination is largely fixed
- explicit geography routing is improved
- role/provider config is cleaner

But report quality still lags the best historical baseline:

- lower truth percentages
- lower confidence
- weaker overall report quality on the benchmark claims

So the problem is no longer "why are reports contaminated?"

It is now:

**How do we restore the strongest parts of `quality_window_start` report quality without undoing the correctness fixes that came later?**

---

## What We Now Know

### Confirmed from worktree runs

1. `quality_window_start` is the best-performing checkpoint across PT, EN, and DE benchmark runs.
2. `704063ef` introduced a real historical regression, but that is not the current `main` problem.
3. Fix 1 and Fix 3 improved contamination control.
4. The later geography repair fixed the German-language Swiss routing bug on `main`.
5. The remaining quality gap is now primarily about verdict quality and confidence calibration.

### Strongest current suspects

From the comparison and follow-up audit:

1. **SR weighting / confidence damping**
   - strongest current suspect
   - directly measured on `quality_head` and later reruns

2. **Search-stack drift**
   - shared dispatcher behavior changed
   - provider lineup and retrieval behavior changed
   - likely affects evidence diversity

3. **Reduced iteration budget**
   - `maxIterationsPerContext` dropped from `5` to `3`

4. **More conservative confidence/gate defaults**
   - `mixedConfidenceThreshold`
   - Gate 4 thresholds
   - SR fallback/default score

### Already restored or fixed

These should not be treated as open restoration targets:

- `maxClaimBoundaries = 6`
- `boundaryCoherenceMinimum = 0.3`
- `selfConsistencyMode = "full"`
- `challenger = openai`
- explicit-geo-over-language routing
- post-extraction applicability filtering

---

## Restoration Principles

1. **Do not roll back contamination fixes**
   - keep jurisdiction cleanliness gains

2. **Use `quality_window_start` as the standing comparison baseline**
   - direct `main` vs `quality_window_start` only

3. **Prefer A/B experiments over broad rollbacks**
   - especially for UCM-driven parameters

4. **Change one variable group at a time**
   - otherwise causality becomes muddy again

5. **Only restore changes that measurably improve report quality**
   - not just "feel closer" to the old state

6. **Use fresh Google CSE availability when comparing**
   - provider drift must not contaminate the experiment

---

## Restoration Strategy

The best route is a staged restoration program:

### Stage A: Recover quality with low-risk toggles and UCM values

Start with the changes most likely to improve quality and easiest to test safely:

- SR weighting off or softened
- historical confidence/gate values
- historical research depth

This gives the highest information value for the lowest rollback cost.

### Stage B: Restore the evidence pool quality

If Stage A is not enough, test the search-layer differences:

- AUTO accumulation behavior
- provider stack / retrieval diversity

This is likely the next-largest source of degradation after SR weighting.

### Stage C: Only then tune smaller quality knobs

Examples:

- `selfConsistencyTemperature`
- query strategy shaping
- smaller verdict-stage calibration tweaks

These should not be first, because they are less likely to explain the measured gap than Stage A and Stage B.

---

## Phased Plan

## Phase 0: Guardrails

Before any new experiment:

- keep current contamination fixes enabled
- keep geography fix enabled
- compare only against `quality_window_start`
- run the agreed benchmark claims
- document search-provider availability for every run

Benchmark pair:

- `C:/DEV/FactHarbor`
- `C:/DEV/FH-quality_window_start`

Port mapping already recorded in:

- [`Report_Quality_Worktree_Comparison_Results_2026-03-13.md`](../../Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md)

## Phase 1: Highest-Signal UCM Experiment

Create a temporary `pipeline` + `calculation` quality profile on `main` with:

- `maxIterationsPerContext = 5`
- `selfConsistencyTemperature = 0.3`
- `mixedConfidenceThreshold = 40`
- `gate4QualityThresholdHigh = 0.7`
- `sourceReliability.defaultScore = 0.50`

And, if operationally possible:

- disable SR weighting for this comparison run

### Why first

- highest likelihood of improving current `main`
- low rollback risk
- mostly configuration-level
- directly tests the strongest current suspect

### Expected outcome

- if report quality rebounds materially, SR weighting / confidence conservatism is the main current problem
- if not, move to Phase 2

## Phase 2: Search Restoration Experiment

Test whether evidence-pool drift is the next major cause by restoring search behavior closer to `quality_window_start`.

Primary change:

- restore AUTO accumulation across primary providers until target result count is filled

Secondary, if needed:

- use a temporary baseline-like search profile with fewer provider-layer differences

### Why second

- likely large effect
- but broader blast radius than Phase 1
- affects both Analysis and other shared search users

### Expected outcome

- if quality improves materially after evidence-pool restoration, search drift is a major remaining cause

## Phase 3: Integrated Quality Profile

If Phase 1 and Phase 2 both help independently, combine the winners into one temporary integrated profile:

- SR weighting winner
- search winner
- iteration-budget winner
- confidence/gate winner

Then compare that combined `main` profile directly against `quality_window_start`.

### Success criterion

Current `main` should be:

- materially closer to `quality_window_start`
- still free from the old contamination problem
- still jurisdiction-correct on the Swiss case

## Phase 4: Production Recommendation

After the integrated run:

- keep the changes that clearly improve quality
- reject the ones that are neutral or harmful
- promote the winning profile into canonical defaults only after evidence is solid

---

## Experiment Matrix

| Phase | Change set | Type | Why | Success signal |
|------|------------|------|-----|----------------|
| 1A | Disable SR weighting | UCM / feature toggle if available | Directly tests strongest suspect | Confidence and verdict quality rebound materially |
| 1B | Restore historical confidence/gate values | UCM | Tests whether current conservatism is too harsh | Higher confidence without new garbage verdicts |
| 1C | `maxIterationsPerContext = 5` | UCM | Tests research-depth loss | Better evidence coverage and stronger reports |
| 1D | `selfConsistencyTemperature = 0.3` | UCM | Minor but safe historical delta | Small stability gain |
| 2A | Restore AUTO provider accumulation | Code / shared search | Tests evidence diversity loss | Better report quality on same claims |
| 2B | Temporary baseline-like search provider mix | UCM + shared search | Reduces search drift | Cleaner evidence comparisons |
| 3 | Combined winner profile | Integrated | Measures best recoverable quality on `main` | Close approach to `quality_window_start` |

---

## Temporary Quality Profile

If one single high-signal integrated experiment is needed first, use:

- `maxIterationsPerContext = 5`
- `selfConsistencyTemperature = 0.3`
- `mixedConfidenceThreshold = 40`
- `gate4QualityThresholdHigh = 0.7`
- `sourceReliability.defaultScore = 0.50`
- SR weighting disabled or softened
- AUTO primary-provider accumulation restored

This is the best current approximation of the quality posture that likely produced the strongest historical reports, while keeping the later contamination/geography corrections.

---

## Benchmark Claims

Use the same comparison inputs already established:

1. `Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?`
2. `Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process?`
3. `Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschnitt stärker psychisch belastet als vor zehn Jahren.`

Why:

- EN/PT pair tests cross-language consistency on the core benchmark topic
- the Swiss German input verifies that quality restoration does not re-break jurisdiction correctness

---

## Success Criteria

The plan should be considered successful only if the restored `main` profile achieves all of the following:

1. clearly better report quality than current `main`
2. materially closer to `quality_window_start`
3. no meaningful return of foreign-jurisdiction contamination
4. no regression of Swiss jurisdiction routing
5. no new instability or report damage warnings

---

## Non-Goals

- Do not investigate every historical commit in equal depth.
- Do not roll back Fix 1 / Fix 3 contamination controls wholesale.
- Do not start a broad architecture redesign.
- Do not tune minor knobs before the largest suspects are tested.

---

## Risks

1. **Search confounds**
   - unequal Google CSE availability can still blur conclusions

2. **False restoration**
   - a change may improve one claim while harming others

3. **Shared-search blast radius**
   - search dispatcher changes affect more than one subsystem

4. **Overfitting to the benchmark claims**
   - restoration should improve the benchmark set without teaching to the test

---

## Open Review Questions

1. Should the first experiment be:
   - `SR weighting fully off`
   - or `SR weighting softened`?

2. Should search restoration be tested as:
   - AUTO accumulation only
   - or a fuller baseline-like provider/profile package?

3. Should the integrated quality profile be tested in one worktree first, or directly on `main` via temporary UCM profiles?

---

## Recommended Review Outcome

Recommended approval:

- approve the phased restoration plan
- keep contamination fixes in place
- begin with Phase 1 UCM-level experiments
- treat search restoration as the next step if Phase 1 is insufficient

---

## Review Log

| Reviewer | Verdict | Notes |
|----------|---------|-------|
| Pending | — | — |


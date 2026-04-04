# Plastik DE UNVERIFIED Root Cause Note

**Date:** 2026-03-26  
**Input:** `Plastic recycling bringt nichts`  
**Primary jobs compared:** `5c1b4633e56d4238bad682d2ed64e853` vs `08a1c6d407564d74af633e6298d3ef84`

## Executive summary

Job `5c1b4633e56d4238bad682d2ed64e853` returned `UNVERIFIED` not because of a crash or lack of evidence, but because the run ended with a mixed-band article truth score (`50.1%`) and low article confidence (`36.3%`). In the current pipeline, that maps to `UNVERIFIED`.

The deeper cause was not simple evidence scarcity. The run had `126` evidence items from `54` sources and passed the main quality gates. The main differential versus the earlier control run was **Stage-1 semantic drift**, which changed the atomic-claim decomposition, the downstream queries, the resulting boundary structure, and finally the self-consistency stability of the central claims.

## Immediate cause

- Job `5c1b4633e56d4238bad682d2ed64e853`:
  - verdict: `UNVERIFIED`
  - truth: `50.1%`
  - confidence: `36.3%`
- In the current truth-scale logic, mixed-band truth with confidence below the mixed threshold resolves to `UNVERIFIED`.
- The article-level confidence collapse was driven mainly by:
  - `AC_01`: `62% / 30%`, self-consistency spread `26`
  - `AC_03`: `52% / 28%`, self-consistency spread `23`

## Differential comparison vs earlier control run

Earlier run `08a1c6d407564d74af633e6298d3ef84` on the same input produced:

- verdict: `MIXED`
- truth: `55.3%`
- confidence: `71.3%`

Key differences:

### 1. Atomic-claim decomposition drift

Earlier run:

- `AC_01`: recycling is ineffective regarding plastic-pollution reduction
- `AC_02`: recycling is ineffective regarding economic viability
- `AC_03`: recycling is ineffective regarding resource conservation

UNVERIFIED run:

- `AC_01`: recycling "brings nothing" regarding pollution reduction and environmental impact
- `AC_02`: recycling "brings nothing" economically
- `AC_03`: recycling "brings nothing" regarding practical feasibility and implementation

The largest shift is `AC_03`:

- earlier: **resource conservation**
- later: **practical feasibility / implementation**

That is a real analytical-dimension change, not mere wording noise.

### 2. Query-generation drift followed the Stage-1 shift

Earlier run emphasized:

- resource conservation
- lifecycle analysis
- raw-material savings

Later run emphasized:

- recycling rates
- implementation success
- contamination / material degradation
- infrastructure feasibility

So the downstream research did not operate over the same sub-problem.

### 3. Boundary structure changed materially

Earlier run:

- `4` boundaries total
- `AC_03` sat on a relatively consolidated mixed boundary
- `AC_03` self-consistency spread was `4`

Later run:

- `6` boundaries total
- more overlap / neutral fragmentation
- `AC_03` self-consistency spread rose to `23`

For `AC_01`, the later run also carried stronger penalties for:

- overlapping shared datasets
- non-independent cross-boundary support
- missing high-performer-region data

### 4. Evidence volume stayed high, but evidence independence weakened

This was not an evidence-count problem:

- earlier run: `123` evidence items / `54` sources
- later run: `126` evidence items / `54` sources

But the later run became more clustered around a narrower set of recurring sources / overlapping datasets, and the challenger explicitly penalized that lack of independence.

## Why the final verdict crossed into UNVERIFIED

The later run lost confidence, not merely truth percentage.

- `AC_01`:
  - earlier: `LEANING-TRUE`, `65 / 78`, spread `0`
  - later: `UNVERIFIED`, `62 / 30`, spread `26`
- `AC_03`:
  - earlier: `MIXED`, `56 / 74`, spread `4`
  - later: `MIXED`, `52 / 28`, spread `23`

Those low-confidence central claims pulled the weighted article confidence down to `36.3%`, which forced the article label to `UNVERIFIED`.

## Additional bug found

There is also a separate verdict-stage consistency issue:

- `AC_03` remained labeled `MIXED` at `52% / 28%`
- by current truth-scale rules, that should resolve to `UNVERIFIED`
- the pipeline detected this and emitted a `structural_consistency` warning, but only as a warning; it did not rewrite the claim verdict

This is a real bug, but it is secondary. It does not explain the article-level `UNVERIFIED` outcome by itself.

## Judgment

For this specific pair of runs, the root cause is:

1. **Stage-1 semantic/facet drift**
2. which changed the downstream research target
3. which changed boundary composition and evidence-independence penalties
4. which sharply increased self-consistency spread
5. which collapsed article confidence below the mixed threshold

This is evidence that residual variance for this family is not purely downstream retrieval noise. Stage-1 instability still appears capable of materially changing report outcomes on broad evaluative German inputs with absolutist phrasing.

## Recommended follow-up

Do **not** reopen a broad stabilization wave from this one case.

Do open a **narrow targeted investigation** focused on:

- German broad-evaluative absolutist inputs like `...bringt nichts`
- Pass-2 atomic-claim stability
- whether dimension drift still occurs between:
  - resource-conservation framing
  - practical-feasibility framing
  - environmental-impact framing

The separate `structural_consistency` mismatch should also be logged as a small verdict-stage bug.

## Solution-finding prompt

```text
As Lead Architect, investigate and propose a proper solution for the `Plastic recycling bringt nichts` instability that produced job `5c1b4633e56d4238bad682d2ed64e853` as `UNVERIFIED`.

Read first:
1. C:\DEV\FactHarbor\Docs\WIP\2026-03-26_Plastik_DE_Unverified_Root_Cause_Note.md
2. C:\DEV\FactHarbor\Docs\STATUS\Current_Status.md
3. C:\DEV\FactHarbor\Docs\STATUS\Backlog.md
4. C:\DEV\FactHarbor\Docs\WIP\2026-03-25_EVD1_Acceptable_Variance_Policy.md
5. C:\DEV\FactHarbor\Docs\AGENTS\Handoffs\2026-03-25_Senior_Developer_QLT2_Characterization.md
6. C:\DEV\FactHarbor\Docs\AGENTS\Handoffs\2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md
7. C:\DEV\FactHarbor\Docs\WIP\2026-03-25_Controllable_Variance_Investigation.md

Inspect code directly:
8. C:\DEV\FactHarbor\apps\web\prompts\claimboundary.prompt.md
9. C:\DEV\FactHarbor\apps\web\src\lib\analyzer\claim-extraction-stage.ts
10. C:\DEV\FactHarbor\apps\web\src\lib\analyzer\research-query-stage.ts
11. C:\DEV\FactHarbor\apps\web\src\lib\analyzer\boundary-clustering-stage.ts
12. C:\DEV\FactHarbor\apps\web\src\lib\analyzer\verdict-stage.ts
13. C:\DEV\FactHarbor\apps\web\src\lib\analyzer\aggregation-stage.ts
14. C:\DEV\FactHarbor\apps\web\src\lib\analyzer\truth-scale.ts

Investigate these exact jobs from local data:
- `5c1b4633e56d4238bad682d2ed64e853`
- `08a1c6d407564d74af633e6298d3ef84`

Task:
Determine the smallest proper solution to the instability.

Important:
- Do NOT assume the right answer is “reopen Stage 1 broadly.”
- Do NOT assume the right answer is “do nothing, this is natural variance.”
- Build your own view from the actual job data and code.

Questions to answer:
1. Is the main failure here truly Stage-1 dimension drift, or a downstream interaction that only appears as Stage-1 drift?
2. If Stage 1 is involved, what is the narrowest fixable mechanism?
3. Is the problem primarily:
   - Pass-2 claim refinement drift
   - overly broad evaluative decomposition
   - absolutist phrasing sensitivity (`bringt nichts`)
   - boundary-clustering interaction
   - self-consistency over-penalization
   - or a combination?
4. Should the solution target:
   - prompt wording
   - claim-validation criteria
   - dimension-convergence rules
   - verdict-stage confidence handling
   - or only the separate structural-consistency bug?
5. What is the smallest justified change that could reduce this instability without reopening broad prompt churn?
6. What should explicitly NOT be changed?

Required output:
Provide a review-ready markdown report with:
1. Executive summary
2. What the two jobs prove
3. Mechanism diagnosis
4. Candidate solution options
5. Recommended narrow solution
6. What to defer
7. Validation plan
8. Final judgment

Final judgment must be explicit:
- `Targeted Stage-1 fix justified`
- `Downstream fix justified`
- `Bug fix only`
- or `No change justified`

If you recommend a change, end with:
- `Recommended next task: <name>`
- `Why this first: <short paragraph>`
```

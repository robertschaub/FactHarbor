# Lead Architect Handoff - SVP ACS Slice 3 Live Metrics Review

**Date:** 2026-04-27  
**Role:** Lead Architect  
**Status:** Complete for Slice 3 review; open follow-up for budget-aware ACS design  
**Related plan:** `Docs/WIP/2026-04-27_SVP_ACS_Gated_Implementation_Plan.md`

## Context

After Slices 1-2 landed in commits `9efd8eda` and `b43f6b53`, Captain approved the SVP PDF as a live validation input. A new preparation draft was submitted by the user and inspected locally.

Input:

`https://www.svp.ch/wp-content/uploads/260324_Argumentarium-ohne-Q-A-DE.pdf`

Live artifacts:

- Draft `b041b493b1294bba8253ef807de88720`
- Final job `73fb6650d4674540bb91354e3705423f`
- Runtime commit `b43f6b53a03222b293f6614e732bf080a3ae3d88`

## Result

Final job result:

- Verdict `LEANING-TRUE`
- Truth `58`
- Confidence `40`
- Warnings included `budget_exceeded`, `unverified_research_incomplete`, and two `insufficient_evidence` warnings for selected claims with no research.

## Key Metrics

Preparation and selection:

- Prepared candidates: `28`
- Selected claims: `5` (`AC_19`, `AC_23`, `AC_09`, `AC_04`, `AC_14`)
- Dropped candidates: `23`
- Preparation duration: about `464s`
- Stage 1 duration: about `414s`
- ACS recommendation duration: about `50s`

Preliminary Stage 1 work:

- Queries: `6`
- Fetch attempts: `6`
- Successful fetches: `5`
- Evidence items: `15`
- Source URLs: `5`
- Source text bytes: `52,104`

Selected-vs-dropped attribution:

- Selected preliminary evidence: `0`
- Dropped preliminary evidence: `11` items, `2` URLs
- Unmapped preliminary evidence: `4` items, `2` URLs

Stage 1 -> Stage 2 source overlap:

- Stage 1 URLs: `5`
- Stage 2 URLs: `31`
- Exact normalized overlap: `0`
- Document/data/html/unknown overlap: all `0`

Selected-claim research:

- `AC_19`: `1` iteration, `4` queries, `12` fetch attempts, `17` evidence items, about `225s`, sufficient.
- `AC_23`: `2` iterations, `5` queries, `19` fetch attempts, `11` evidence items, about `233s`, sufficient.
- `AC_09`: `2` iterations, `5` queries, `14` fetch attempts, `15` evidence items, about `253s`, sufficient.
- `AC_04`: `0` iterations, `0` evidence items, insufficient.
- `AC_14`: `0` iterations, `0` evidence items, insufficient.

Contradiction reachability:

- Started: `false`
- Remaining time when main research ended: `0`
- Iterations used: `0`
- Sources found: `0`
- Not-run reason: `time_budget_exhausted`

## Decision

Slice 3 outcome: **stop source reuse for now; do not proceed to Slice 4 implementation/design from this evidence.**

Rationale:

- Exact Stage 1 -> Stage 2 URL overlap was `0/5`, so artifact reuse would not have reduced this run's final-job budget pressure.
- Preliminary Stage 1 evidence work was real but modest relative to the full job, and it was not useful for the selected claims in this run.
- The dominant issue is budget fit: ACS selected `5` claims, but Stage 2 only researched `3` before exhausting the budget and missing contradiction research.

## Recommended Next Step

Move to Slice 5 review/design: budget-aware ACS.

Review questions:

- Should ACS recommend fewer than the configured cap when the research budget cannot plausibly support the full set?
- Should the UI/API expose deferred claims explicitly when budget-fit selection chooses fewer claims?
- Which UCM values are operational controls versus product behavior changes: `claimSelectionDefaultMode`, `claimSelectionCap`, `researchTimeBudgetMs`, `contradictionProtectedTimeMs`?

Operational note:

- Setting `claimSelectionDefaultMode=automatic` is useful for unattended validation runs and avoids manual UI action.
- Automatic mode alone does not solve budget mismatch; it still selected `5` claims for this SVP case.
- Lowering `claimSelectionCap` or increasing `researchTimeBudgetMs` can mitigate operationally, but product behavior needs review because it changes analysis depth/coverage.

## Warnings

- This is one post-instrumentation live run on the motivating input. It is enough to reject source reuse as the next step for this case, but broader validation would still be needed before global policy changes.
- The fixed `contradictionProtectedTimeMs=120000` setting did not guarantee contradiction opportunity because a main iteration can exceed the protected window. This was a known risk in the plan, but the live run shows the default is too weak for the SVP workload.
- Do not respond by silently dropping selected claims or adding deterministic text-analysis filters.

## Learnings

- The new metrics are useful: they separated preliminary evidence waste from the actual budget bottleneck.
- For this workload, source overlap is not the lever. Budget-aware claim selection or budget tuning is.
- Reporting `selectedClaimResearch` per claim is important because aggregate evidence counts hid that two selected claims received no research.


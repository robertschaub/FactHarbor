# 2026-04-06 Cross-Boundary Tensions: Current vs Previous Deployment Investigation

## Scope

Investigate the most recent jobs on local and deployed systems, with emphasis on why `Cross-Boundary Tensions` appears more often now than before, compare the current deployed commit cohort against the previous deployed commit cohort, and propose root-cause fixes.

## Baselines

- Current local `HEAD`: `2ec54047371670f386646c46027a722e26610788`
- Current deployed version: `2ec54047371670f386646c46027a722e26610788`
- Previous deployed baseline: `b77838727ae6848c4f42d3dcef8eba47c58b7cfa`

Important caveat:
- `2ec54047` itself is a docs-only commit, so it is not a direct causal code change.
- The analysis-affecting delta between `b7783872` and current live behavior comes from earlier commits in that range, especially:
  - `ec7a8de8`
  - `d9194303`
  - `81e7ddc4`
  - `07cb2e0d`
  - `cbb364ec`
  - `ffaa4fdd`

## Investigation Plan

1. Compare all local jobs on current commit `2ec54047` with local jobs on previous deployed commit `b7783872`.
2. Compare all deployed jobs on current commit `2ec54047` with all deployed jobs on previous deployed commit `b7783872`.
3. Read the code path that produces `Cross-Boundary Tensions`.
4. Review recent diffs to check whether Stage 5 tension generation changed directly.
5. Run parallel agent reviews:
   - local current cohort
   - deployed current vs previous deployed
   - code-path / architecture root-cause review
6. Consolidate findings, debate disagreements, and rank root solutions.

## Where `Cross-Boundary Tensions` Comes From

- UI/report layer only renders `verdictNarrative.boundaryDisagreements`.
- The field is generated only in Stage 5 by `generateVerdictNarrative()` in [aggregation-stage.ts](/C:/DEV/FactHarbor/apps/web/src/lib/analyzer/aggregation-stage.ts).
- The `VERDICT_NARRATIVE` prompt section itself did **not** change between `b7783872` and `2ec54047`.
- Therefore any increase is not coming from new UI logic or a freshly changed tension prompt section.

## Cohort Summary

| Environment | Commit group | Job count | Avg tensions / job | Avg max-boundary ratio | Avg evidence / job | Notes |
|---|---:|---:|---:|---:|---:|---|
| Local | `2ec54047` | 7 | 1.43 | 0.45 | 60.0 | Current local cohort |
| Local | `b7783872` | 1 | 3.00 | 0.32 | 25.0 | Only one local baseline job exists in DB |
| Deployed | `2ec54047` | 7 | 1.86 | 0.56 | 53.3 | Current deployed cohort |
| Deployed | `b7783872` | 10 | 0.60 | 0.63 | 62.6 | Previous deployed cohort |

Interpretation:
- On deployed, visible tensions increased materially from `0.60` to `1.86` per job.
- At the same time, current deployed jobs are **less** dominated by one mega-boundary on average (`0.56` vs `0.63`).
- Local current does **not** show a general rise versus the repeatable local comparisons; the current local cohort is mixed and the lone local `b778` baseline is too sparse for broad inference.

## Matched Family Comparisons

| Family | Local current vs local baseline | Deployed current vs deployed baseline | Read |
|---|---|---|---|
| Swiss vs Germany | `bf502af1` has 1 tension vs local `7d2b91b5` with 3 | Current deployed jobs have 1 and 3 tensions vs previous deployed jobs with 0 and 2 | Current deployed surfaces more asymmetry; local current does not |
| Bolsonaro EN | No local `b778` comparator; current `f712efca` has 1 tension | `d032cf7d` has 3 tensions vs `eb02cd2e` with 0 | Current deployed now surfaces real multi-boundary disagreement that old mega-boundary output hid |
| Plastik DE | No local `b778` comparator; current `02891ccb` has 2 tensions | `540f0712` has 1 tension vs `80bbcc3d` with 2 | Family-specific, not a simple monotonic increase |
| Misinformation tools | No local `b778` comparator; current `6cc062ec` has 1 tension | Current deployed jobs have 1 and 1 vs previous `38d5760e` with 0 | Current deployed narrates methodological asymmetry that previous mega-boundary run hid |

Key point:
- The increase is real at the **deployed cohort level**, but family-by-family it is mixed.
- It is not accurate to say “all current jobs have more tensions.”

## Current Local Jobs: Main Issues

| Job | Input family | Verdict | Tensions | Main issues |
|---|---|---:|---:|---|
| `ff198492` | Bolsonaro PT | `LEANING-TRUE 65 / 69.9` | 3 | Many fetch failures, applicability filter, TPM fallback; tensions look substantive |
| `6cc062ec` | misinformation tools EN | `MOSTLY-TRUE 77 / 80` | 1 | `boundary_evidence_concentration`; tension text partly describes uneven methodology coverage |
| `bf502af1` | Swiss no systematic FC | `LEANING-TRUE 65 / 45` | 1 | fetch failures, applicability filter, `insufficient_evidence` |
| `f712efca` | Bolsonaro EN | `LEANING-TRUE 61 / 48` | 1 | fetch failures, applicability filter, TPM fallback; one tension bullet compresses multiple claim conflicts |
| `02891ccb` | Plastik DE | `LEANING-FALSE 37 / 64.9` | 2 | concentration, baseless challenge warnings, one remaining grounding warning |
| `12924c29` | Swiss propaganda/fake-news | `MIXED 56 / 65` | 1 | source reliability error; structure vs effectiveness split |
| `567aac1e` | Swiss media efficiency | `MOSTLY-TRUE 78 / 50` | 1 | applicability + insufficiency warnings; tension text is mild caveat, not severe disagreement |

Local conclusion:
- Current local jobs do **not** show a broad tension-count increase.
- What they do show is unstable narration quality: one bullet can represent either a real conflict or a mild methodology caveat.

## Current Deployed Jobs: Main Issues

| Job | Input family | Verdict | Tensions | Main issues |
|---|---|---:|---:|---|
| `cb014086` | Swiss no systematic FC | `MOSTLY-TRUE 72 / 66` | 3 | method asymmetry documented vs empirical boundaries; one grounding warning remains |
| `f9eabba9` | Swiss no systematic FC | `MIXED 57 / 52` | 1 | same family, weaker run; still asymmetry-driven |
| `c5acf6cb` | misinformation tools DE | `LEANING-TRUE 69 / 71.7` | 1 | tension text partly complains that one merged boundary hides tensions |
| `89aa0ba6` | misinformation tools DE | `MOSTLY-TRUE 73 / 72` | 1 | mostly aligned, one mixed boundary still becomes tension text |
| `e2c7d771` | Swiss no systematic FC | `LEANING-TRUE 62 / 67` | 3 | query budget exhausted, grounding warning, multiple methodology/effectiveness splits |
| `540f0712` | Plastik DE | `MIXED 49 / 75` | 1 | mega-boundary `CB_19=79`; tension text is mostly a concentration diagnostic |
| `d032cf7d` | Bolsonaro EN | `LEANING-TRUE 69 / 70.9` | 3 | real institutional vs expert vs formal-procedure disagreement; two grounding warnings remain |

Deployed conclusion:
- Current deployed jobs are more likely to surface tensions than `b7783872`.
- Some of those tensions are genuinely useful.
- Some are really concentration or methodology caveats that should probably live under `limitations`, not a dedicated tension block.

## Debate Consolidation

### What all reviewers agreed on

1. `2ec54047` itself is not the cause.
   - It is docs-only.
   - Any live behavior difference is inherited from earlier analysis-affecting commits.

2. The UI is not the problem.
   - The UI/report layer only renders `boundaryDisagreements`.
   - The generation problem is upstream in Stage 5.

3. There is no evidence of a broad local spike.
   - The impression of “many more tensions” is mainly borne out on the deployed current cohort, not on local current repeats.

### Where the reviews sharpened the diagnosis

- Deployed current jobs do have more visible tensions than deployed `b778`.
- But those same current jobs are often **less** collapsed into one giant boundary, so some increase reflects better-preserved analytical differentiation.
- The remaining problem is that Stage 5 does a poor job deciding which divergences are substantive enough to narrate as `Cross-Boundary Tensions`.

## Root Causes

### Root cause 1: Stage 5 uses stale `boundaryFindings`

In [verdict-stage.ts](/C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts), reconciliation updates final claim truth/confidence/reasoning/citations but preserves advocate-era `boundaryFindings`.

Effect:
- Stage 5 tension generation is partly based on **pre-challenge**, pre-finalization per-boundary judgments.
- This can overstate disagreement or narrate tensions that no longer reflect the final reconciled claim state.

### Root cause 2: Stage 5 prompt contract is broken

`VERDICT_NARRATIVE` in [claimboundary.prompt.md](/C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md) still expects:
- `${aggregation}`
- `${evidenceSummary}`

But [aggregation-stage.ts](/C:/DEV/FactHarbor/apps/web/src/lib/analyzer/aggregation-stage.ts) supplies:
- `overallVerdict`
- `coverageMatrix`
- `evidenceCount`

Because `renderSection()` leaves unresolved placeholders in place, Stage 5 can receive literal `${aggregation}` / `${evidenceSummary}` tokens.

Effect:
- narrative quality is partially degraded in every cohort
- tension generation becomes more variable and less grounded in the final aggregate context

This bug **predates** the current deployment, so it is not the new cause of the increase, but it is a real standing defect that amplifies instability.

### Root cause 3: Stage 5 receives sparse and under-specified divergence inputs

Stage 5 currently sees only:
- truncated claim reasoning
- reduced `boundaryFindings` with `boundaryId`, `boundaryName`, `evidenceDirection`, `evidenceCount`
- coarse boundary descriptions
- coverage matrix

It does **not** see:
- final per-boundary truth/confidence
- challenge outcomes by boundary
- source overlap / source concentration context
- whether a divergence is merely methodological, or actually changes claim direction/confidence

Effect:
- small or thin boundaries can be over-narrated
- mixed/neutral caveats get promoted into “Cross-Boundary Tensions”
- mega-boundary design flaws can also get narrated as tensions

### Root cause 4: Upstream boundary structure is genuinely more differentiated in some current jobs

This is the “real” side of the increase.

Examples:
- Deployed Bolsonaro EN:
  - `eb02cd2e` on `b778`: 0 tensions, but max-boundary ratio `0.81`
  - `d032cf7d` on current: 3 tensions, max-boundary ratio `0.32`
- Deployed Swiss current jobs surface repeated structure-vs-effectiveness divergence across different evidence methods.

Effect:
- Some increase in tensions is desirable because previously-collapsed disagreement is now visible.
- The problem is not the existence of tensions; it is that Stage 5 does not reliably separate:
  - real substantive disagreement
  - from methodological asymmetry
  - from concentration diagnostics
  - from thin singleton caveats

## Root Solutions

### P1. Fix the Stage 5 prompt contract

Do first.

- Align `VERDICT_NARRATIVE` variables with what code actually provides.
- Stop allowing unresolved placeholders to slip through silently for Stage 5.
- Add a Stage 5 prompt-contract test similar to the Stage 4 contract suite.

Expected impact:
- more stable narrative generation across all jobs
- less random over-emphasis in `boundaryDisagreements`

### P2. Stop using stale advocate `boundaryFindings`

Best fix options:
- have reconciliation return updated final `boundaryFindings`
- or add a final post-reconciliation boundary-summary step derived from final claim evidence/citations

Expected impact:
- tensions reflect final verdict state, not early advocate state
- fewer false or outdated disagreement narratives

### P3. Give Stage 5 richer structured final-divergence inputs

Stage 5 should receive enough final structured context to distinguish:
- substantive boundary disagreement
- mere methodology difference
- thin singleton caveat
- concentration / merged-boundary design problem

Recommended fields:
- final per-boundary direction by claim
- final evidence share per boundary
- claim coverage by boundary
- whether challenge reconciliation changed the direction materially
- whether disagreement affects final verdict direction/confidence or only nuance

Expected impact:
- `Cross-Boundary Tensions` becomes a higher-signal section

### P4. Tighten the narrative emission rule

The prompt should explicitly say:
- put minor methodology caveats and coverage asymmetries into `limitations`
- use `boundaryDisagreements` only when final boundaries materially diverge in a way that changes interpretation

Important:
- do **not** suppress real disagreement
- do stop calling every mixed/neutral asymmetry a “tension”

### P5. Separate workstream: Stage 3 boundary quality and concentration

This is not the immediate fix for the tension block, but it is still important.

Mega-boundaries do two bad things:
- they hide real disagreement
- they encourage Stage 5 to narrate concentration artefacts instead of clean disagreement

This should remain a separate quality workstream after the Stage 5 fixes.

## Ranked Proposal

1. Fix Stage 5 prompt contract and add tests.
2. Recompute or reconcile final `boundaryFindings` after Stage 4.
3. Retune `VERDICT_NARRATIVE` with richer final divergence inputs and stricter emission guidance.
4. Re-run the current repeated families on local and deployed:
   - Swiss no systematic FC
   - Bolsonaro EN
   - Plastik DE
   - misinformation tools
5. Keep Stage 3 boundary-concentration stabilization as the next separate track.

## Short Conclusion

- Yes, `Cross-Boundary Tensions` is more frequent in the current deployed cohort than in the previous deployed cohort.
- No, this is **not** because the tension renderer or the Stage 5 tension section was newly changed in this deployment range.
- Part of the increase reflects a good thing: more preserved multi-boundary differentiation instead of total collapse into one mega-boundary.
- The real defect is that Stage 5 tension narration is built on:
  - a broken prompt contract
  - stale advocate-era boundary summaries
  - and under-specified final divergence inputs
- So the right fix is **not** to hide the section.
- The right fix is to make Stage 5 narrate only final, material, well-supported divergence.

## 2026-04-06 Implementation Update

Implemented in `08220154`:
- wired the previously stale Stage 5 template variables `${aggregation}` and `${evidenceSummary}` in [aggregation-stage.ts](/C:/DEV/FactHarbor/apps/web/src/lib/analyzer/aggregation-stage.ts)
- tightened `VERDICT_NARRATIVE` so `boundaryDisagreements` is limited to material directional divergence, while methodology asymmetries, thin caveats, coverage gaps, and concentration observations should move to `limitations`

Review outcome:
- the direction was correct and aligned with the agreed Fix 1 + Fix 3 sequence
- two follow-up gaps were found in review and then closed in `2acc4545`

Implemented in `2acc4545`:
- `evidenceSummary.sourceCount` now counts unique `sourceUrl` values instead of collapsing to hostnames
- a dedicated Stage 5 prompt-contract test now covers `VERDICT_NARRATIVE` for:
  - section existence
  - no unresolved `${...}` placeholders
  - no `[object Object]`
  - tightened `boundaryDisagreements` instruction contract

Current state:
- Fix 1 is fully landed
- Fix 3 is fully landed
- the two immediate review follow-ups are closed
- next gate is measurement, not more design

### Immediate next step

1. restart services
2. rerun the agreed canaries and measure the effect on:
   - Swiss no systematic FC
   - Bolsonaro EN
   - Plastik
   - misinformation tools
3. only if tensions remain too noisy after those runs, reopen Fix 2 via safer path B:
   - derive final boundary summary post-reconciliation
   - do not extend reconciler schema first

## Additional Canary Note (2026-04-06, post-fix rerun)

An additional local post-fix canary was run on `f9b9099d`:

- `7fa8d41830dd43a99e6a2dfcc6e3a67f`
- input: `Falschinformationen verbreiten sich immer schneller – die derzeit eingesetzten Tools zur Faktenprüfung können damit nicht mehr Schritt halten.`
- result: `MOSTLY-TRUE 76 / 75.8`
- tensions: `0`
- warnings: `9`
- evidence / sources / iterations: `62 / 37 / 1`

Interpretation:
- there is **no earlier exact-local comparator** for this German phrasing in the DB, so this is **not** a strict before/after measurement
- as a same-family signal, it is encouraging for the Stage 5 fix:
  - the old tension/caveat material is now carried in `limitations`
  - `boundaryDisagreements` is absent
  - boundary structure is relatively balanced (`5/6/15/13/10/13`) rather than mega-boundary-dominated

Comparison note:
- this should be treated as an **added canary**, not proof of build-over-build improvement for that exact input
- nearest family comparators remain:
  - local EN wording `86d1d0af...` on the same post-fix build
  - deployed German-family runs `c5acf6cb...` / `89aa0ba6...`

## 2026-04-06 Measurement Conclusion

The agreed post-fix canaries are now sufficient to decide whether Stage 5 Fix 2
(safer path B: derive a final post-reconciliation boundary summary) is still
needed as the next implementation step.

Confirmed post-fix signals:

- Swiss
  - `5aa28697...` on `f9b9099d`: `0` tensions
  - `01aa8699...` on `01ddeb1f`: `0` tensions
- misinformation tools
  - `86d1d0af...` on `f9b9099d`: `0` tensions
  - `7fa8d418...` on `f9b9099d`: `0` tensions
- Bolsonaro EN
  - `f6ea1496...` on `f9b9099d`: `1` tension
  - `ae69c30b...` on `01ddeb1f`: `2` tensions
- Plastik
  - `207131a4...` on `f9b9099d`: `1` tension
  - `35c8d210...` on `bdf15679`: `1` tension

Interpretation:

- the original Stage 5 over-reporting problem is largely resolved
- Swiss and misinformation-tools families now consistently route methodology,
  thinness, and concentration caveats into `limitations`
- the remaining Bolsonaro and Plastik tensions look materially substantive,
  not like the earlier misclassified caveat noise

Decision:

- **Fix 2 is deferred**
- keep the safer path-B design on the shelf as a fallback
- do **not** make more Stage 5 narrative changes now

Next workstream:

- shift the active quality track upstream to Stage 2/3 report quality:
  - evidence-pool quality
  - query/event anchoring
  - boundary concentration and stability
  - hard-family retrieval variance

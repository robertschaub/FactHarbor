# Independent FactHarbor Report Quality Investigation

**Status:** DRAFT  
**Created:** 2026-03-19  
**Last Updated:** 2026-03-19  
**Author Role:** Senior Developer  
**Agent/Tool:** Codex (GPT-5)

---

## Context

Requested: independently investigate report-quality evolution from ClaimAssessmentBoundary pipeline launch on 2026-02-16 through the latest jobs on 2026-03-19, with focus on Bolsonaro, Hydrogen, Plastik Recycling, and other repeated claim families.

Evidence used:
- `apps/api/factharbor.db` — 246/246 jobs `SUCCEEDED`
- `apps/web/config.db` — live UCM state and config history
- `Docs/TESTREPORTS/` and `gh-pages-build/TestReports/` HTML exports
- `apps/web/configs/*.default.json`
- Git history since 2026-02-16
- Prior WIP investigations named in the task

Constraints followed:
- No expensive live-LLM tests were run
- Conclusions are grounded in repository artifacts, not prior-agent conclusions

---

## Executive Summary

Four findings dominate the quality story:

1. **The main March 12 regression is real, but the biggest active cause is `applyEvidenceWeighting()` itself, not the residual `defaultScore=0.45` config drift.**
   The 2026-03-12 commit [`9550eb26`](../../.git) inserted SR weighting directly into verdict aggregation. Sampled March 19 claims show claim-level compression of about `5-21` truth points from weighting. By contrast, the live `0.45` vs default `0.5` drift can only move a claim by at most `2.5` points in theory, and in sampled real jobs it changes truth by about `0.1-1.6` points.

2. **Bolsonaro quality improved on contamination, but not on overall verdict quality.**
   Early March runs were higher-TP but often polluted by U.S. political/jurisdictional material. March 12+ jurisdiction fixes reduced that contamination, but many Bolsonaro variants dropped from the low/mid-70s into the 50s/low-60s, with lower confidence and recurring over-merging or claim-shape problems.

3. **Plastik Recycling remains the clearest unresolved semantic regression.**
   The family moved from strong `MOSTLY-FALSE` results (`15-21` TP on Mar 5-9, plus the Feb 27 HTML export) to unstable `28-61` TP after Mar 14, including today's `53 / 44 / UNVERIFIED`. This is consistent with the Stage 1 / Gate 1 decomposition problem described in the prior Plastik investigation. I found no evidence that this has been fixed.

4. **Quality auditability is currently weak.**
   The current ClaimBoundary runner loads configs without passing `jobId`, so `config_usage` stops on 2026-03-02 for active CB jobs. `job_config_snapshots` contains 538 rows, but all stop on 2026-02-15 and match none of the current API-job IDs. That makes per-job config attribution for March runs impossible from the intended audit tables.

Bottom line:
- **Hydrogen** is healthy again.
- **Plastik** is not fixed.
- **Bolsonaro** contamination is better, but quality is still below the March 1-10 best runs.
- **Iran** is the strongest control case proving broad truth-percentage compression after SR weighting was introduced.

---

## Time Series

## Bolsonaro

This is not one clean repeated prompt family. The database contains several materially different Bolsonaro inputs:
- fairness / legality
- fairness across multiple trials
- due process / international standards
- process conformity / human-rights standards

Treating all Portuguese and English Bolsonaro runs as a single neutrality family is misleading. Several prior comparisons mixed semantically different prompts.

### Exact-input variant summary

| Variant | Runs | Date range | Avg TP | Avg Conf | Best | Latest | Trend |
|---|---:|---|---:|---:|---|---|---|
| EN `Were the various ... law, and were the verdicts fair?` | 11 | Mar 7-Mar 19 | 63.9 | 60.5 | 76 / 69 / `MOSTLY-TRUE` on Mar 10 | 51 / 45 / `MIXED` on Mar 19 | Clear decline after Mar 10 |
| EN `Were the various ... law and international standards of due process?` | 28 | Mar 12-Mar 16 | 57.2 | 49.5 | mid-60s | no Mar 19 run | Lower-quality family from introduction onward |
| EN `Was the Bolsonaro judgment fair and based on Brazil's law?` | 5 | Mar 1-Mar 19 | 71.4 | 67.2 | 85 / 78 / `MOSTLY-TRUE` on Mar 1 | 63 / 51 / `LEANING-TRUE` on Mar 19 | Down 22 TP / 27 conf from best |
| PT fairness variants (`justo` / `legislação`) | 6 | Mar 1-Mar 14 | 69.2 | 69.3 | 85 / 78 and 82 / 85 on Mar 1-3 | 54-68 / 51-68 on Mar 14 | Degraded by Mar 14 |
| PT `... lei brasileira e padrões internacionais de due process?` | 23 | Mar 12-Mar 16 | 56.3 | 49.7 | 68 / 68 | no Mar 19 run | Persistently low-confidence |
| PT process-conformity variants | 3 | Mar 16-Mar 19 | about 64 | about 56 | 69 / 58 on Mar 19 | 69 / 58 on Mar 19 | Small sample, partial recovery |

### Key Bolsonaro runs

| Run | Date | TP | Conf | Claims | Boundaries | What matters |
|---|---|---:|---:|---:|---:|---|
| `2a867099` | 2026-03-01 | 85 | 78 | 1 | 4 | Best English single-trial fairness report artifact; strong institution-specific boundaries, but fairness dimension still collapsed into one claim |
| `0b795115` | 2026-03-10 | 76 | 69 | 2 | 6 | Best exact-input EN multi-trial fair/legal run; still carried foreign/political contamination |
| `3dc30cf5` | 2026-03-11 | 60 | 65 | 3 | 1 | First obvious boundary-collapse failure for the family |
| `218a1c24` | 2026-03-17 | 72 | 71 | 1 | 5 | Best post-regression EN multi-trial run, but achieved by collapsing back to one claim |
| `91e018df` | 2026-03-18 | 66 | 62 | 2 | 5 | Confirms Mar 18 sentencing-evidence fix helped the English fairness prompt |
| `9768a899` | 2026-03-19 | 51 | 45 | 2 | 6 | Today's EN multi-trial run; contamination better, verdict quality still weak |
| `50720754` | 2026-03-19 | 69 | 58 | 2 | 3 | Today's PT process-conformity run; cleaner but over-merged and still lower-confidence than early PT baselines |

### What changed over time

- **Mar 1-10:** Higher TP and confidence, but repeated contamination by U.S. government / political / diplomatic material in boundaries and narratives.
- **Mar 12-16:** Jurisdiction filtering landed. Foreign contamination improved, but TP/confidence dropped sharply, especially for the due-process variants introduced that day.
- **Mar 17-19:** The Mar 18 relevance-classification fix restored English sentencing evidence, but overall Bolsonaro quality did not return to the Mar 1-10 range.

### Bolsonaro-specific conclusions

- The system is now better at **excluding foreign political material** than on Mar 1-10.
- The system is still bad at **keeping quality high while doing that**.
- The **fairness / due-process dimension is still unstable**. Some runs collapse it; some decompose it; some over-merge boundaries.
- The March 18 sentencing fix is **real but narrow**:
  - English Mar 18/19 fairness runs contain 27-year-sentence evidence again.
  - The Portuguese Mar 19 process-conformity run does not, so this was not a full multilingual family recovery.

## Hydrogen

### Family summary

| Metric | Value |
|---|---|
| Runs analyzed | 11 DB runs + 1 historical HTML export |
| Date range | 2026-02-19 export, DB runs 2026-03-09 to 2026-03-19 |
| TP range | 15-39 |
| Confidence range | 60-82 |
| Dominant verdict | `MOSTLY-FALSE` |

### Trend

- Historical HTML export on 2026-02-19: `18 / 78 / MOSTLY-FALSE`
- DB family on Mar 9-19 stays directionally consistent
- Only clear outlier is `89beb6cf` on Mar 14 (`39 / 68 / LEANING-FALSE`)
- Today's run `a1a38508`: `15 / 60 / MOSTLY-FALSE`

### Assessment

Hydrogen is the healthiest family in the current system:
- direction is stable
- today's result matches the original Feb 19 export almost exactly on truth
- confidence is somewhat lower than the historical best, but not catastrophically so

The remaining issues here are structural polish, not verdict-direction failure.

## Plastik Recycling

### Family summary

| Metric | Value |
|---|---|
| Runs analyzed | 16 exact DB runs + 1 historical HTML export |
| Date range | 2026-03-05 to 2026-03-19, plus 2026-02-27 export |
| TP range | 15-61 |
| Confidence range | 43-75 |
| Verdict span | `MOSTLY-FALSE` through `LEANING-TRUE` and `UNVERIFIED` |

### Trend

| Period | Avg TP | Avg Conf | Pattern |
|---|---:|---:|---|
| Mar 5-9 | 23.0 | 73.2 | Strong false-direction family, good confidence |
| Mar 12-16 | 45.6 | 53.9 | Broad regression; verdicts drift toward neutral |
| Mar 17-19 | 57.0 | 46.5 | Worst phase; today's run is `UNVERIFIED` |

### Key runs

| Run | Date | TP | Conf | Verdict | Notes |
|---|---|---:|---:|---|---|
| HTML export | 2026-02-27 | 15 | 75 | `MOSTLY-FALSE` | Best preserved report artifact for this family |
| `c5a95304` | 2026-03-05 | 15 | 75 | `MOSTLY-FALSE` | Best DB match to the export |
| `37594d23` | 2026-03-09 | 21 | 74 | `MOSTLY-FALSE` | Last strong pre-regression run |
| `3b1eb04c` | 2026-03-14 | 53 | 48 | `MIXED` | Boundary-collapse symptoms appear |
| `5738a739` | 2026-03-17 | 61 | 49 | `LEANING-TRUE` | Full direction flip |
| `27754124` | 2026-03-19 | 53 | 44 | `UNVERIFIED` | Today's run; still badly regressed |

### Assessment

This remains the clearest unresolved semantic regression in the repo.

The evidence still supports the prior Plastik investigation:
- Stage 1 decomposes a broad rhetorical claim into easier, narrower dimension claims
- Gate 1 keeps those claims
- Stage 2 then amplifies that skew with research allocation
- Integrity policies being disabled lets degraded outputs ship

I found no evidence that the core claim-shape problem has been fixed.

## Iran

Iran is the best control case for broad TP compression:

| Period | Avg TP | Avg Conf |
|---|---:|---:|
| Mar 5-11 | 83.0 | 81.8 |
| Mar 12-16 | 66.0 | 62.7 |
| Mar 17-19 | 67.5 | 65.2 |

Sampled March 19 Iran claims reconstruct to raw pre-weight truth estimates in the mid/high 80s, then get pulled down into the high 60s by SR weighting. That makes Iran the strongest evidence that the post-Mar-12 drop is not just a Bolsonaro-specific contamination story.

---

## Cause-Effect Matrix

| Quality issue | Primary cause | Commit / config | Fixed? | Notes |
|---|---|---|---|---|
| Broad TP compression after Mar 12 | SR weighting inserted into claim verdict path | `9550eb26` | Partially | Weighting is still active; Mar 16 fixes softened it but did not remove the compression behavior |
| Small extra compression from unrated sources | Live calc config still uses `sourceReliability.defaultScore=0.45` instead of default `0.5` | active `calculation` blob in `apps/web/config.db` | No | Real issue, but much smaller than prior analysis claimed |
| Search evidence depth reduction / higher variance | AUTO mode switched to stop-on-first-success | `8bef6a91` | Yes | Code fixed by `5243d678`, then SerpAPI rollback in `b0f3becb`; active search config now uses `autoMode=accumulate` |
| Bolsonaro foreign-jurisdiction contamination | Geography + relevance + applicability fixes introduced | `7ed71a05`, `172bba3d`, `fa06cfc3` | Partially | Contamination improved, but evidence loss / lower TP followed |
| Bolsonaro 27-year sentencing evidence loss | Relevance classifier misclassified factual foreign journalism; top-N truncation unsorted | fixed in `8460b624` | Partially | English fairness runs recovered; not a complete multilingual family fix |
| Plastik direction flip / broad-claim degradation | Stage 1 decomposition + Gate 1 permissiveness + research amplification | commit cluster `02f594d4`, `07d90a26`, `f874fa1c`, `a8c34581` | No | Still unresolved; best tracked in the Plastik and combined remediation plans |
| Degraded reports still ship | Verdict integrity policies disabled in live pipeline config | active pipeline config: `verdictGroundingPolicy=disabled`, `verdictDirectionPolicy=disabled` | No | This is containment debt, not the root cause of TP drift |
| Boundary mega-merge / concentration under-signaled | Warning exists but is diagnostic only | `244c6102` | Diagnostic only | Good addition, but not a fix |

---

## Live Config vs Defaults

Important distinction:
- **Missing fields in stored UCM blobs are mostly backfilled at runtime** by `mergeWithDefaults()` in [`apps/web/src/lib/config-loader.ts`](../../apps/web/src/lib/config-loader.ts).
- Therefore, the material live drifts are the **explicit non-default values**, not most missing keys.

### Stored drift with runtime impact

| Config | Field | Active value | JSON default | Runtime impact |
|---|---|---:|---:|---|
| calculation | `sourceReliability.defaultScore` | `0.45` | `0.5` | Small extra pull toward neutral for unrated supporting evidence |
| search | `cache.enabled` | `false` | `true` | Higher cost, weaker reproducibility, more run-to-run retrieval variance |
| pipeline | `verdictGroundingPolicy` | `disabled` | merged active behavior still `disabled` | Lets degraded outputs ship |
| pipeline | `verdictDirectionPolicy` | `disabled` | merged active behavior still `disabled` | Same containment gap |

### Stored drift with low runtime impact

| Config | Field | Why low-impact |
|---|---|---|
| pipeline | legacy model aliases `haiku/sonnet/opus` | model resolver still normalizes these |
| pipeline/search/sr | many missing new keys | current loader merges defaults at runtime |

### Audit gaps

- `config_usage` stopped recording current CB jobs after 2026-03-02 because ClaimBoundary loads config without `jobId` at startup in [`apps/web/src/lib/analyzer/claimboundary-pipeline.ts`](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts).
- `job_config_snapshots` is not trustworthy for current jobs:
  - 538 rows
  - latest capture `2026-02-15`
  - zero snapshot job IDs match current API-job IDs

This means March quality attribution must rely on:
- git history
- active config history
- result content itself

not the intended per-job config audit tables.

---

## Scorecard Application

### Today's runs vs historical best

| Family | Today's run | Historical best reference | Result |
|---|---|---|---|
| Bolsonaro EN multi-trial fair/legal | `9768a899` = `51 / 45 / MIXED` | `0b795115` = `76 / 69 / MOSTLY-TRUE` (same exact input) | Still materially worse on TP, confidence, and narrative quality |
| Bolsonaro EN single fairness | `9a01b324` = `63 / 51 / LEANING-TRUE` | `2a867099` = `85 / 78 / MOSTLY-TRUE` | Direction preserved, quality not recovered |
| Bolsonaro PT process-conformity | `50720754` = `69 / 58 / LEANING-TRUE` | closest same-variant baseline is Mar 17 `eb35a203` = `63 / 56` | Slight improvement, but not comparable to Mar 1 PT fairness baselines because semantics changed |
| Hydrogen | `a1a38508` = `15 / 60 / MOSTLY-FALSE` | Feb 19 HTML export = `18 / 78 / MOSTLY-FALSE` | Essentially recovered on truth direction; confidence lower |
| Plastik Recycling | `27754124` = `53 / 44 / UNVERIFIED` | Feb 27 HTML export / Mar 5 DB best = `15 / 75 / MOSTLY-FALSE` | Still severely regressed |
| Iran | `48bd10db` = `68 / 71 / LEANING-TRUE` and `d54a97a5` = `65 / 62 / LEANING-TRUE` | `fd4a10f4` = `92 / 87 / TRUE` | Strong evidence of unresolved global TP compression |

### Scorecard judgement

- **Hydrogen:** near historical best
- **Bolsonaro:** improved contamination, not improved overall quality
- **Plastik:** still broken
- **Iran:** strong control case that the broad post-Mar-12 TP drop is still active

---

## Surprises / Disagreements With Prior Analysis

1. **The live `0.45` drift is real, but prior estimates of its impact were too large.**
   With the current weighting formula, `0.45` vs `0.5` can move a claim by at most `2.5` truth points if every supporting source is unknown. In sampled March 19 claims, the actual difference was about `0.1-1.6` points.

2. **The bigger issue is not the drift; it is that SR weighting now exists in the verdict path at all.**
   Reconstructed pre-weight claim truths show much larger drops:
   - Iran sampled claims: about `15-21` points pulled toward 50
   - Bolsonaro sampled claims: about `4-8` points
   - some Plastik subclaims: about `5-7` points

3. **Some prior cross-language Bolsonaro comparisons were not neutral pairs.**
   The repo contains materially different PT and EN formulations:
   - fairness / legality
   - fairness across multiple verdicts
   - due-process / international-standards
   - process conformity / human-rights framing

4. **The intended config-audit layer is effectively broken for current ClaimBoundary work.**
   That was not just stale data; the code path explains it.

5. **Warning severity is still under-signaling degraded reports.**
   Sampled March 19 degraded runs emitted almost entirely `info` warnings, even when confidence was in the 40s or boundaries collapsed to 1.

6. **Deployed HTML exports lag the local export format.**
   Some older `gh-pages-build/TestReports/*.html` files still lack `fh:*` meta tags even when the corresponding local exports have them, so deployed artifact mining is less reliable than local artifact mining.

---

## Recommendations

1. **Reassess SR weighting before any other quality work.**
   The evidence points to `9550eb26` as the largest remaining quality lever. Test `evidenceWeightingEnabled=false` or a softer weighting function before spending effort on smaller config drift fixes.

2. **Fix the explicit calc drift anyway, but do not expect miracles from it.**
   Change live `calc.sourceReliability.defaultScore` from `0.45` to `0.5`. This is correct housekeeping, but it will not by itself recover Bolsonaro, Plastik, or Iran quality.

3. **Implement the combined claim-quality remediation plan for Stage 1 / Gate 1 next.**
   This is the priority fix for Plastik and still relevant for Bolsonaro and Iran claim-shape instability.

4. **Re-enable a containment mode for integrity policies.**
   Keeping both verdict integrity policies disabled means the pipeline still ships reports it already knows are structurally questionable.

5. **Restore real config provenance for CB jobs.**
   Pass `input.jobId` into config loads in the main runner path and either revive or remove the dead job snapshot mechanism. Right now investigations are harder than they should be.

6. **Keep search accumulation on, but restore caching unless an experiment specifically needs it off.**
   The current `search.cache.enabled=false` looks like experiment residue, not a long-term production-quality choice.

---

## Decision Record

Pending Captain review.


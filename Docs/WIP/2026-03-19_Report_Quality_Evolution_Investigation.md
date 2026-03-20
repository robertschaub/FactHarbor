# Report Quality Evolution Investigation

**Date:** 2026-03-19 (Round 5 — refreshed on 2026-03-20 for current-state accuracy)
**Author:** LLM Expert (Claude Code, Opus 4.6)
**Independent Review:** Senior Developer (Codex/GPT-5) — see [2026-03-19_Independent_Report_Quality_Investigation.md](2026-03-19_Independent_Report_Quality_Investigation.md)
**Scope:** Full quality history from CB pipeline birth (Feb 16) through the Mar 19 historical snapshot, plus current-state updates from live local lanes on 2026-03-20.
**Method:** 10 parallel investigation agents across 2 rounds + 1 independent verification. Historical core: 246 database jobs analyzed, 22+ HTML reports examined, ~120 git commits traced, live UCM config audited, quality scorecard applied. Current-state refresh on 2026-03-20: live comparison across three local worktrees (`main`, `FH_best_monolithic_canonical`, `FH-quality_window_start`) and current active config verification on `main`.

---

## 0. Historical Root Cause and Current State

**Prior analysis over-attributed quality loss to the `defaultScore=0.45` config drift. Independent review corrected this. That historical correction is still valid, but the live `main` state has changed since the original Mar 19 writeup.**

### What's actually happening (corrected)

The dominant historical regression after Mar 12 was **`applyEvidenceWeighting()` itself** (commit `9550eb26`, Mar 12), which inserted SR weighting directly into the verdict aggregation path. In the historical Mar 12-19 window, it compressed truth percentages by **5-21pp** depending on the claim family:

| Family | Pre-weight TP (reconstructed) | Post-weight TP (actual) | Compression |
|--------|------------------------------|------------------------|-------------|
| Iran (control case) | mid/high 80s | high 60s | **~15-21pp** |
| Bolsonaro | mid 60s-70s | low 50s-60s | **~4-8pp** |
| Plastik subclaims | varies | varies | **~5-7pp** |

By contrast, the `defaultScore=0.45` vs `0.5` drift moved claims by only **0.1-1.6pp** in sampled real jobs (max theoretical 2.5pp). That was real, but it was never the main lever.

### Historical Mar 19 drift that mattered then

| Config | Parameter | JSON Default | Live UCM | Impact |
|--------|-----------|-------------|----------|--------|
| calculation | `sourceReliability.defaultScore` | 0.5 | **0.45** | Small extra pull (~1pp), not the 10-18pp originally estimated |
| search | `cache.enabled` | true | **false** | Higher cost, more run-to-run variance (looks like experiment residue) |
| pipeline | `relevanceTopNFetch` | 5 | *(missing)* | Backfilled by `mergeWithDefaults()` at runtime — functional, not visible in Admin UI |
| pipeline | `contradictionReservedQueries` | 2 | *(missing)* | Same — backfilled at runtime |
| pipeline | model names | `budget`/`standard`/`premium` | `haiku`/`sonnet`/`opus` | Cosmetic — model resolver normalizes these |

### Current `main` state on 2026-03-20

The document must distinguish the **historical Mar 19 drift picture** from the **current active `main` lane**:

| Area | Current `main` effective state | Why it matters now |
|---|---|---|
| Legacy SR weighting | `evidenceWeightingEnabled=false` | The previously dominant harmful path is now default-off on `main` |
| Stage 4.5 SR calibration | `sourceReliabilityCalibrationEnabled=false`, mode `off` | Implemented and validated, but still behind a flag |
| Search cache | `cache.enabled=true` | The Mar 19 cache drift is no longer active on `main` |
| Source reliability default | `defaultScore=0.5` | The Mar 19 `0.45` drift is no longer active on `main` |
| Verdict integrity policies | still `disabled` | Still relevant as a containment / report-quality policy gap |

So: the **historical diagnosis remains correct**, but the specific `defaultScore=0.45` and `cache.enabled=false` items should no longer be treated as current live blockers on `main`.

### Config audit gap (new finding from independent review)

**Per-job config provenance is broken for current ClaimBoundary jobs.** The runner loads configs without passing `jobId`, so `config_usage` stops on 2026-03-02. `job_config_snapshots` has 538 rows but none match current API job IDs. March quality attribution must rely on git history and result content, not the intended audit tables.

---

## 1. Executive Summary

The ClaimBoundary pipeline was created Feb 16-17. Since then, **~120 quality-affecting commits** shipped across 5 phases. The historical investigation cut used **246 total jobs** (Mar 1 – Mar 19). The current `main` lane has moved beyond that snapshot.

**Quality peaked Mar 8-9**, then declined sharply starting Mar 12. The independent review identified **SR weighting itself** (`applyEvidenceWeighting()`, commit `9550eb26`) as the largest remaining compression source — not the `defaultScore` config drift, which has only ~1pp impact. Iran is the clearest control case, showing 15-21pp compression from weighting alone.

### Historical Mar 19 Snapshot — 12 Jobs

| Input | Verdict | TP% | Conf% | Boundaries | Evidence | Sources |
|-------|---------|-----|-------|------------|----------|---------|
| Bolsonaro PT | LEANING-TRUE | 69 | 58 | 3 | 39 | 16 |
| Bolsonaro EN (single trial) | LEANING-TRUE | 63 | 51 | 6 | 57 | 18 |
| Bolsonaro EN (various trials) | MIXED | 51 | 45 | 6 | 89 | 23 |
| Hydrogen for cars | MOSTLY-FALSE | 15 | 60 | 5 | 70 | 18 |
| Plastik Recycling bringt nichts | **UNVERIFIED** | 53 | 44 | 6 | 138 | 41 |
| mRNA vaccines | LEANING-TRUE | 71 | 68 | -- | -- | -- |
| Iran nukes | LEANING-TRUE | 68 | 71 | -- | -- | -- |
| Iran nukes (rerun) | LEANING-TRUE | 65 | 62 | -- | -- | -- |
| Climate change mitigation | LEANING-TRUE | 70 | 68 | -- | -- | -- |
| Zurich students mental health | LEANING-TRUE | 62 | 49 | -- | -- | -- |
| Muslims more violent | MOSTLY-FALSE | 19 | 62 | -- | -- | -- |
| Bali plastic pollution prevention | LEANING-TRUE | 67 | 65 | -- | -- | -- |

---

## 2. Claim Family Deep Analysis (Database + HTML + Deployed)

### 2.1 HYDROGEN — The Most Stable Family

**Historical Mar 19 cut (246 jobs): 11 hydrogen runs (Mar 9 – Mar 19)**

| Date | Truth% | Conf% | Verdict | Notes |
|------|--------|-------|---------|-------|
| Mar 9 | 16 | 73 | MOSTLY-FALSE | |
| Mar 14 | 39 | 68 | LEANING-FALSE | Outlier, still directionally correct |
| Mar 16 (x6) | 19-31 | 60-82 | MOSTLY-FALSE / LEANING-FALSE | |
| Mar 17 (x2) | 16-19 | 71-82 | MOSTLY-FALSE | |
| **Mar 19** | **15** | **60** | **MOSTLY-FALSE** | Today |

**Stability metrics:**
- TP range: 15-39 (spread 24pp, excluding outlier 15-31 = 16pp)
- Confidence range: 60-82 (spread 22pp)
- 8/11 runs = MOSTLY-FALSE, 3/11 = LEANING-FALSE
- **G1 verdict stability: PASS** (within 20pp excluding outlier)

**HTML report deep analysis (Feb 20 export):**
- 6 boundaries, well-organized by analytical methodology (WTW lifecycle, propulsion comparison, thermodynamic theory, market analysis, fuel cell types, loss analysis)
- **CB_07 "High-Temperature Fuel Cell Systems" is EMPTY** (0 evidence items) but still contributes 50/50 at 40% conf to verdict — this is the empty boundary bug
- CB_08 and CB_09 have only 1 evidence item each — too thin for triangulation
- Evidence direction: 8 supports, 19 contradicts, 21 neutral — healthy contradiction ratio
- Self-consistency was perfect (spread=0)

**Assessment:** Hydrogen is the gold standard for pipeline stability. Same direction every run, well-calibrated at 15-20% truth. Historically it exposed the empty-boundary / thin-boundary problem, but that is no longer a top current priority because Phase A pruning has since been implemented.

### 2.2 BOLSONARO — Downward Drift, Multiple Causes

**Historical Mar 19 cut (246 jobs): 85 Bolsonaro runs across EN and PT variants**

**IMPORTANT (from independent review):** The 85 Bolsonaro runs are NOT one clean repeated family. The database contains materially different input variants:
- fairness / legality (5 EN, 6 PT)
- fairness across multiple trials (11 EN)
- due process / international standards (28 EN, 23 PT)
- process conformity / human-rights (3 PT)

Aggregating these as a single family is misleading. The "due process / international standards" variant was introduced Mar 12 and has been persistently lower-quality from the start (avg TP 57%, avg conf 50%).

#### Exact-input variant breakdown (from independent review)

| Variant | Runs | Avg TP | Avg Conf | Best | Latest | Trend |
|---------|------|--------|----------|------|--------|-------|
| EN fair/legal (single trial) | 5 | 71.4 | 67.2 | 85/78 (Mar 1) | 63/51 (Mar 19) | Down 22pp |
| EN fair/legal (various trials) | 11 | 63.9 | 60.5 | 76/69 (Mar 10) | 51/45 (Mar 19) | Clear decline |
| EN due-process/intl standards | 28 | 57.2 | 49.5 | mid-60s | no Mar 19 run | Low quality from start |
| PT fairness variants | 6 | 69.2 | 69.3 | 85/78 (Mar 1) | 54-68 (Mar 14) | Degraded |
| PT due-process/intl standards | 23 | 56.3 | 49.7 | 68/68 | no Mar 19 run | Persistently low |
| PT process-conformity | 3 | ~64 | ~56 | 69/58 (Mar 19) | 69/58 (Mar 19) | Small sample |

#### What drove the decline (independent review's conclusion)

The Bolsonaro decline has **multiple compounding causes**, not just config drift:
1. **SR weighting compression** (~4-8pp per claim) — the biggest single factor
2. **Input variant mixing** — the lower-quality "due process" variant (introduced Mar 12) drags averages down
3. **Jurisdiction filtering side-effects** — contamination improved but evidence pool narrowed
4. **Claim shape instability** — fairness dimension still frequently collapsed into one claim

The Mar 18 sentencing fix is confirmed working for EN fairness runs but did not produce a full multilingual family recovery (PT Mar 19 process-conformity run does not contain the 27-year sentence).

#### Cross-Language Comparison (Mar 19)

| Metric | EN (single) | EN (various) | PT | Tolerance |
|--------|-------------|-------------|----|-----------|
| Truth% | 63 | 51 | 69 | <=4pp |
| Conf% | 51 | 45 | 58 | <=4pp |
| Boundaries | 6 | 6 | 3 | -- |
| Evidence | 57 | 89 | 39 | -- |

**Cross-variant divergence** — 18pp spread, but these are different input formulations (EN various-trials vs PT process-conformity), not a valid neutrality pair.

#### HTML Deep Dive: March 1 Exports

| Metric | EN (Mar 1) | PT (Mar 1) | PT (Feb 19, deployed) |
|--------|-----------|-----------|----------------------|
| Truth% | 85 | 82 | 82 |
| Confidence% | 78 | 85 | 78 |
| Evidence | 53 | 51 | 62 |
| Boundaries | 4 | 5 | 6 |
| Contradicting evidence | **0** | 5 | -- |
| 27-year sentence | 4 mentions (PBS) | 2 mentions | 5 mentions |
| Fairness claim extracted | **No** | **No** | **No** |

**Critical HTML findings:**
- **EN has ZERO contradicting evidence** (all 36/53 items are neutral). The PT version has 5 contradicting items documenting expert criticisms. This is a language-dependent evidence gap.
- **"Fairness" claim dropped in BOTH languages.** Input asks "fair AND based on law" but only the legal basis claim survived extraction. The fairness dimension was entirely lost.
- **Evidence concentration:** EN CB_01 has 36/53 items (68%). PT is more balanced across 5 boundaries.

**Assessment:** Bolsonaro shows a clear historical downward drift driven by multiple causes. The Mar 1 baseline (85% EN, 82% PT) was produced before SR weighting was wired in. The Mar 19 snapshot runs (51-69%) were under the influence of SR weighting compression, input-variant mixing, and jurisdiction-filter side-effects. The then-live `defaultScore=0.45` drift was real but secondary, accounting for only about `0.1-1.6pp` in sampled jobs rather than the previously estimated `10-18pp`.

### 2.3 PLASTIK RECYCLING — The Least Stable Family

**Historical Mar 19 cut (246 jobs): 16 exact Plastik runs (Mar 5 – Mar 19)**

| Date | Truth% | Conf% | Verdict | Notes |
|------|--------|-------|---------|-------|
| Mar 5 (x2) | 15-36 | 71-75 | MOSTLY-FALSE / LEANING-FALSE | |
| Mar 8 | 20 | 73 | MOSTLY-FALSE | **Best run** |
| Mar 9 | 21 | 74 | MOSTLY-FALSE | |
| Mar 14 (x5) | 28-61 | 48-65 | Wild mix | **Regression begins** |
| Mar 15 | 46 | 54 | MIXED | |
| Mar 16 (x4) | 41-51 | 43-58 | MIXED / LEANING-FALSE | |
| Mar 17 | 61 | 49 | LEANING-TRUE | **Direction flip** |
| **Mar 19** | **53** | **44** | **UNVERIFIED** | **Worst confidence ever** |

**Stability metrics:**
- TP range: 15-61 (spread **46pp**)
- Confidence range: 43-75 (spread 32pp)
- Verdicts span MOSTLY-FALSE through LEANING-TRUE — **complete spectrum**
- **G1 verdict stability: CATASTROPHIC FAIL**

**Trend: Confidence is collapsing** — early avg 73%, recent avg 48% (-25pp).

**HTML deep dive (Feb 27 export — the "good" run):**
- 114 evidence items across 26 sources — richest report in entire corpus
- 6 boundaries, all with evidence (no empty boundaries)
- Claim properly translated: "Kunststoffrecycling bringt keinen nennenswerten Nutzen"
- Evidence direction: 14 supports, 29 contradicts, 71 neutral — good contradiction balance
- Verdict 15% truth, 75% confidence — well-calibrated for an absolute negative claim
- All evidence in German, appropriate domain sources (UBA, NABU, Swiss federal studies)

**Root cause of regression (from Plastik investigation):**
1. Stage 1 decomposes "X bringt nichts" into narrow subclaims with mechanism-specific predicates not in input
2. Gate 1 keeps all 3 vague dimension claims despite judging them non-specific
3. Stage 2 amplifies skew via research allocation
4. Verdict integrity issues present but non-blocking

**Assessment:** Plastik is the clearest demonstration that Combined Plan Phase B (claim decomposition tightening) is urgently needed. The Feb 27 export proves the pipeline CAN produce excellent results for this claim — the regression is in claim extraction quality, not infrastructure.

---

## 3. Deployed vs Local Report Inventory

| Metric | Deployed (gh-pages) | Local (Docs/TESTREPORTS) |
|--------|--------------------|-----------------------|
| Report count | 11 HTML files | 17 HTML files |
| Manifest date | 2026-02-25 | 2026-03-01 |
| Latest report | Feb 25 | Mar 01 |

**Key discrepancies:**
- 9 local reports (Feb 27 + Mar 01) never deployed
- 3 deployed-only reports (old Bolsonaro PT, DE South Korea, empty-manifest "Evidenz" report)
- 3 phantom manifest entries (HTML files missing from disk: Websuche, Homosexualitat, Uber Geld)
- SRG reports were re-run: deployed (Feb 19) vs local (Feb 27) have different metrics
- Local manifest is stale (missing Mar 01 reports)

---

## 4. Quality Scorecard Application

### G-Criteria (General) — Applied to Today's Runs

| Criterion | Hydrogen | Bolsonaro EN | Bolsonaro PT | Plastik | Assessment |
|-----------|----------|-------------|-------------|---------|------------|
| **G1** Verdict stability (<=20pp) | **PASS** (16pp) | **FAIL** (34pp) | **FAIL** (36pp) | **FAIL** (46pp) | 1/4 pass |
| **G2** Boundary quality | Partial (1 empty) | PASS (institution-specific) | PASS (institution-specific) | PASS (methodology-specific) | 3/4 pass |
| **G3** Claim decomposition | N/A (simple claim) | **FAIL** (fairness dimension dropped) | **FAIL** (fairness dimension dropped) | **FAIL** (over-narrowed) | 0/3 pass |
| **G4** Evidence relevance | PASS | PASS (post-sentencing fix) | PASS | PASS | 4/4 pass |
| **G5** Confidence plausibility | PASS (60%) | **FAIL** (51%, too low for evidence available) | Partial (58%) | **FAIL** (44%, collapsing) | 1/4 pass |
| **G6** Political contestation immunity | PASS | PASS (post-Phase A) | PASS | N/A | 3/3 pass |

### B-Criteria (Bolsonaro-specific) — Today's EN Run vs Best

| Criterion | Today (Mar 19) | Best Ever (Mar 8 deployed) | Trend |
|-----------|---------------|---------------------------|-------|
| **B1** STF/TSE separation | Partial | PASS (3 claims) | Declined |
| **B2** Trump/US immunity | PASS | PASS | Stable |
| **B3** Boundary naming | PASS | PASS | Stable |
| **B4** TP in target range (68-80%) | **FAIL** (51%) | PASS (72%) | **Declined -21pp** |
| **B5** 27yr sentence mentioned | TBD | PASS | Likely stable (post-fix) |
| **B6** Confidence >=65% | **FAIL** (45%) | PASS (77%) | **Declined -32pp** |
| **B7** No foreign contamination | PASS | PASS | Stable |

### P-Criteria (Plastik) — Today vs Best

| Criterion | Today (Mar 19) | Best (Mar 8) | Trend |
|-----------|---------------|-------------|-------|
| **P1** Claim strength preservation | TBD | PASS (broad claims) | Unknown |
| **P2** Gate 1 consistency | TBD | PASS | Unknown |
| **P3** Evidence contradiction balance | TBD | PASS (31:63 sup:contra) | Likely declined |
| **P4** Institutional PDF access | FAIL (source_fetch_failures) | Partial | Stable (structural issue) |
| **P5** Verdict integrity | FAIL (UNVERIFIED) | PASS | **Declined** |
| **P6** Boundary analytical coherence | TBD | Partial | Unknown |

---

## 5. Updated Cause-Effect Matrix

### What Specifically Caused Each Current Problem

| Current Problem | Primary Cause | Contributing Causes | Fix Available? |
|----------------|--------------|--------------------|-|
| **Bolsonaro TP dropped 22pp** (85→63 EN, historical Mar 19 cut) | **Historical SR weighting compression** (`9550eb26`) plus input-variant mixing and jurisdiction-filter side-effects | `defaultScore=0.45` drift was secondary (~1pp) | **Partially — legacy weighting is now off on `main`, but quality has not fully recovered** |
| **Bolsonaro confidence dropped 27pp** (78→51, historical Mar 19 cut) | Historical SR weighting compression plus narrower evidence pools after contamination fixes | Search evidence volume variability; config drift was secondary | **Partially — current `main` improved, but still below Mar 1-10 best** |
| **Plastik verdict instability across languages** | Claim decomposition regression / residual broad-claim handling weakness | Research allocation amplification, verdict integrity disabled | **NO — Phase B still needed, now with explicit EN follow-up** |
| **Plastik confidence collapsing / band-flipping** | Broad evaluative claims still decompose inconsistently | Retrieval variance and evidence mix add extra spread | **PARTIAL — B1 improved DE/PT, but EN remains unresolved** |
| **Empty boundary in Hydrogen** | Historical Stage 3 created boundary with no assigned evidence | Historical issue observed before Phase A pruning shipped | **Historically fixed / verify opportunistically** |
| **Fairness dimension dropped (Bolsonaro)** | Stage 1 extracts only 1 of 2 compound claim dimensions | Reprompt loop doesn't detect missing dimensions | **NO — needs claim extraction improvement** |
| **0 contradicting evidence (Bolsonaro EN)** | Language-dependent evidence acquisition gap | Search query generation may not target opposing evidence in EN | **PARTIAL — pro/con strategy exists but may be language-biased** |
| **Historical cache / defaultScore drift** | Mar 19 live config lagged JSON defaults | Experiment residue plus older UCM state | **YES — already corrected on current `main`** |
| **Config provenance still broken for current CB jobs** | Runner does not pass `jobId` into config loads | Audit tables exist but do not record current usage | **YES — still open and important** |

---

## 6. Consolidated Recommendations (Current as of 2026-03-20)

### What the independent review corrected

My original analysis over-attributed the quality decline to the `defaultScore=0.45` config drift (estimated 10-18pp). The independent review showed:
- The `0.45` vs `0.5` drift moves claims by only **~0.1-1.6pp** in real jobs (max theoretical 2.5pp)
- The **dominant compression source** is `applyEvidenceWeighting()` itself (commit `9550eb26`), compressing claims by **5-21pp**
- Iran is the strongest control case: pre-weight TP in mid/high 80s → post-weight high 60s
- Some of my Bolsonaro cross-language comparisons mixed semantically different input variants
- Config auditability for current CB jobs is broken (no `jobId` passed to config loads)
- Warning severity under-signals degraded reports (mostly `info` even when conf in 40s)

### Revised Priority Order

#### Priority 1: Plastik / broad-evaluative claim follow-up on `main`

This is now the highest-value open quality issue.

What changed:
- B1 materially improved German and Portuguese Plastik extraction on `main`
- but the new English Plastik rerun still landed `LEANING-TRUE`

Expected-verdict framing should also be stated more carefully than in earlier drafts. For the absolute claim `Plastic recycling is pointless` / `Plastikrecycling bringt nichts`, strong external evidence supports a **limited, underperforming, but not literally zero-benefit** system:
- OECD reports that only **9%** of global plastic waste was ultimately recycled in 2019, which strongly supports "recycling falls far short" but not the absolute proposition that it "brings nothing" ([OECD press release, 2022-02-22](https://www.oecd.org/environment/plastic-pollution-is-growing-relentlessly-as-waste-management-and-recycling-fall-short.htm), [OECD Global Plastics Outlook](https://www.oecd.org/en/publications/2022/02/global-plastics-outlook_a653d1c9.html)).
- The U.S. EPA reports very weak overall plastics recycling but still non-trivial recycling in some material streams, e.g. overall plastics at **8.7%** in 2018, while PET bottles/jars and HDPE natural bottles were around **29%** ([US EPA plastics data](https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling/plastics-material-specific-data)).
- The European Environment Agency states that higher recycling rates can reduce CO2 emissions because recycling avoids incineration and can displace primary material production; it also notes that recycled plastics were only **8.1%** of total plastic use in the EU in 2020, i.e. still far from circularity ([EEA plastics value chain](https://www.eea.europa.eu/en/circularity/sectoral-modules/plastics/ghg-emissions-from-eus-plastics-value-chain), [EEA role of plastics](https://www.eea.europa.eu/publications/the-role-of-plastics-in-europe/the-role-of-plastics-in)).

So the right expectation is **not** "this claim must be LEANING-FALSE." The stronger statement is:
- a claim-faithful, well-grounded report for this **absolute** wording should usually not land in `LEANING-TRUE`
- the semantically more plausible verdict neighborhood is **`MIXED` to `LEANING-FALSE`**, sometimes `MOSTLY-FALSE`
- repeated `LEANING-TRUE` outputs are therefore a quality signal that the pipeline is drifting into narrower proxy claims such as low recycling rates, weak economics, or limited environmental impact rather than judging the original absolute proposition

So the next Plastik task should be **narrow and explicit**:
- first let the currently running `main` multilingual checks (DE/FR/ES, submitted 2026-03-20) finish, then compare them with EN/PT
- inspect why English broad evaluative inputs still drift into weaker or proxy-like claim shapes
- compare English claim extraction, search queries, evidence allocation, and verdict composition against the improved DE/PT runs
- keep using `main`, not `quality_window_start`, as the implementation lane

#### Priority 2: Restore config provenance for current ClaimBoundary jobs

Pass `jobId` into config loads in the runner path. Without this, every future investigation requires the same git archaeology and inference from result content. This remains low effort and high leverage.

#### Priority 3: Warning severity calibration

Degraded runs still under-signal quality problems. This remains relevant even though SR weighting is now off on `main`, because unstable or weak reports should be more clearly surfaced.

#### Priority 4: Optional frozen-retrieval A/B harness for Stage 4.5

Stage 4.5 `confidence_only` is implemented and technically validated, but live run variance still confounds quality interpretation. A frozen-retrieval A/B harness would let future decisions compare:
- raw no-SR verdicts
- Stage 4.5 confidence-only calibration

without search noise.

#### Priority 5: Use old worktrees only as targeted comparison checkpoints

The newer Mar 20 comparison jobs in `FH-quality_window_start` and `FH_best_monolithic_canonical` did **not** reveal a cleaner or better Plastik baseline than `main`:
- `quality_window_start` DE `4063241a...` and EN `f846290e...` both remained `LEANING-TRUE`
- `FH_best_monolithic_canonical` EN `fe718861...` also remained approximately `LEANING-TRUE`

So old lanes should be used only for **mechanism comparison** when a specific hypothesis needs checking, not for broad additional submissions or as product-quality targets.

#### Priority 6: SR weighting redesign only if needed later

The historical question "disable or redesign?" has effectively been answered on `main`:
- legacy SR weighting is already default-off
- `defaultScore=0.5` is restored
- search cache is back on

So SR formula redesign is no longer the urgent next step. It should be revisited only after the current high-value semantic issues are better controlled.

#### Priority 7: Remaining backlog

- analyticalDimension prompt fix
- Phase D (boundary quality)
- Phase E (research allocation)
- search-provider and operational hardening

### What I Would NOT Do

- **Do NOT reopen the old `defaultScore=0.45` drift debate** — that issue was historically real but is no longer active on `main`
- **Do NOT treat `FH_best_monolithic_canonical` as the current benchmark** for ClaimBoundary quality — it is running orchestrated
- **Do NOT assume Plastik is fixed because DE/PT improved** — English Plastik on `main` is still unstable
- **Do NOT keep using old worktrees as broad exploration lanes** — their newer Mar 20 reruns did not reveal a better Plastik baseline than `main`
- **Do NOT re-enable verdict integrity (Phase C) in isolation** — it still belongs with the broader claim-shape fix
- **Do NOT compare different Bolsonaro input variants** as if they were neutrality pairs — the database contains 4+ semantically different formulations

---

## 7. Historical Quality Trajectory

```
Truth% (Bolsonaro EN representative)
  ^
90|
  |
80|  * Mar 1 (baseline, pre-SR-weighting)
  |   \
70|    \  * Mar 8-9 (quality peak)         ? Target after SR-weighting experiment
  |     \/                                 ? (uncertain: partial recovery only)
60|      \__________ * Mar 15-17           ?
  |       \ SR+jurisdiction  \            /
50|        * Mar 12-14         * Mar 19 (today)
  |         (trough)
40|
  |  Historical read: SR weighting was the biggest lever; config fix was marginal
  +---+---+---+---+---+---+---→
   Mar Mar Mar Mar Mar Mar Mar
    1   5   8  12  15  18  19
```

**Per-family historical trajectory:**
- **Hydrogen:** Flat stable line at 15-20%. Gold standard.
- **Bolsonaro:** Declined from 80% to mid-50s/60s in the Mar 12-19 window. Historical evidence points to SR weighting plus family-specific issues.
- **Plastik:** Chaotic (15-61%). Root cause remains claim decomposition, now sharpened by the Mar 20 finding that English is still unresolved on `main`.

---

## 8. Summary Statistics

| Metric | Value |
|--------|-------|
| Historical database jobs analyzed | 246 (Mar 19 cut) |
| Current `main` job count at refresh | 278 |
| HTML reports analyzed | 22+ |
| Git commits traced | ~120 |
| Quality issues catalogued | 25 |
| Resolved | 10 |
| Partially resolved | 5 |
| Open | 10 |
| **Current material config drift on `main`** | **0 major historical drifts remaining (`defaultScore` and search cache corrected)** |
| Claim families analyzed | 4 (Hydrogen, Bolsonaro EN, Bolsonaro PT, Plastik) |
| Most stable family | Hydrogen (16pp spread) |
| Least stable family | Plastik (46pp spread) |
| Highest-priority open quality task | **Plastik / downstream retrieval-verdict stabilization on `main` after Stage 1 contract fix** |

---

## 9. Independent Review Answers to Historical Open Questions

The independent review (Senior Developer, Codex/GPT-5) answered the questions from this document:

1. **Is `defaultScore=0.45` the primary cause?** No. The drift is real but moves claims by only 0.1-1.6pp. The primary cause is `applyEvidenceWeighting()` itself (5-21pp compression). Iran proves this conclusively as a control case.

2. **What proportion of evidence is from unknown sources?** Not directly measured, but the theoretical max of 2.5pp (if ALL sources were unknown at 0.45 vs 0.5) confirms the effect is structurally small.

3. **Should search cache be re-enabled?** Yes — the reviewer concluded it "looks like experiment residue, not a long-term production-quality choice." This has since been corrected on current `main`.

4. **Is the Plastik UNVERIFIED a new failure mode?** It's the worst result in the family (53/44). The independent review confirms the trend: avg TP degraded from 23 (Mar 5-9) → 46 (Mar 12-16) → 57 (Mar 17-19). Still driven by claim decomposition.

5. **Did the sentencing fix help?** Partially — English fairness runs now contain 27-year sentence evidence. PT process-conformity Mar 19 run does not. Not a full multilingual recovery.

6. **(New finding)** Bolsonaro "runs" are not one family — 4+ semantically different input variants exist, and mixing them inflated the apparent variance.

These answers remain historically important, but they should now be read alongside the Mar 20 addendum:
- the `defaultScore=0.45` and `cache.enabled=false` items are no longer active on `main`
- the most important still-open semantic issue is now Plastik multilingual instability, especially English on `main`

---

## 10. Status

**Current status on `main` (2026-03-20):**
- Historical root cause finding still stands: SR weighting itself, not `defaultScore`, was the main Mar 12-19 compression source
- Legacy SR weighting is now **disabled by default**
- `defaultScore=0.5` and `search.cache.enabled=true` are restored on `main`
- Stage 4.5 exists and is validated, but remains **off by default**
- B1 plus the new claim-contract validator materially improved the Plastik family structurally: **broad evaluative predicate preservation is now working across DE / EN / FR on current `main`**
- The remaining Plastik problem is now **downstream of Stage 1 claim extraction**: verdict direction still varies even when claim structure is now contract-faithful

**Recommended next actions from this document:**
1. **Investigate downstream Plastik instability on `main`** — with claim-contract preservation now fixed, the next focus should be search framing, evidence allocation, and verdict aggregation for broad evaluative claims.
2. **Restore config provenance for CB jobs** — still required for future investigations
3. **Warning severity calibration**
4. **Optional:** frozen-retrieval A/B harness for Stage 4.5
5. **Do not reopen Stage 1 decomposition as the primary Plastik blocker** unless new evidence shows the validator regressed; the latest validation run indicates Stage 1 structure is no longer the main problem

**Decision state:** The old SR-weighting policy decision is no longer the active blocker on `main`, because legacy weighting has already been turned off there. The broad-claim contract stabilizer has now been implemented and structurally validated. The next real decision is whether to spend the next quality cycle on downstream Plastik stability (retrieval / evidence / verdict path) or on auditability / validation infrastructure.

---

## 10.1 Addendum (2026-03-20) — Three-Worktree Comparison

I compared the live local lanes on **2026-03-20**:

| Worktree | URL | Pipeline actually running | Key active state |
|---|---|---|---|
| `main` | `http://localhost:3000` | `claimboundary` | Legacy SR weighting **off**, Stage 4.5 **off**, B1 prompt active |
| `FH_best_monolithic_canonical` | `http://localhost:3001` | **`orchestrated`** | Not directly comparable to current ClaimBoundary |
| `FH-quality_window_start` | `http://localhost:3002` | `claimboundary` | Older Mar 12-era lane, no B1/Stage 4.5 config surface, queue instability |

### What this changes

1. **`main` confirms the core direction of the independent review.**
   - Hydrogen remains healthy: job `2ab24b61...` = `17 / 85 / MOSTLY-FALSE`
   - Bolsonaro is improved relative to the bad Mar 18-19 trough, but still below early-March best:
     - EN single: `40760987...` = `64 / 67 / LEANING-TRUE`
     - PT single: `c58ca013...` = `78 / 72 / MOSTLY-TRUE`
     - EN various: `cb54a1a2...` = `61 / 63 / LEANING-TRUE`

2. **B1 is clearly active on `main` for Plastik claim extraction.**
   The broad evaluative predicate is now preserved in German and Portuguese:
   - DE `3878d81b...`:  
     `Plastikrecycling bringt in Bezug auf Umweltnutzen nichts`  
     `... wirtschaftliche Rentabilität nichts`  
     `... technische Effizienz und Recyclingquoten nichts`
   - PT `1711e065...`:  
     `A reciclagem de plástico não serve para nada em termos de impacto ambiental`  
     `... viabilidade econômica`  
     `... eficácia técnica e operacional`

3. **But Plastik is still NOT fixed end-to-end on `main`.**
   The multilingual reruns are still inconsistent:
   - DE `3878d81b...` = `23.9 / 71.5 / MOSTLY-FALSE`
   - PT `1711e065...` = `34.1 / 71.4 / LEANING-FALSE`
   - EN `5362b092...` = `61 / 78.8 / LEANING-TRUE`

   So B1 improved the German and Portuguese broad-claim path, but **English Plastik still fails neutrality**. The remaining Plastik problem is no longer just the original German decomposition bug; it is now a **multilingual / English-specific residual claim-shape or evidence-allocation problem**.

4. **`FH-quality_window_start` strongly confirms the pre-fix failure mode.**
   That lane still decomposes Plastik into narrow fact/mechanism claims rather than broad evaluative dimensions:
   - DE `04d5e294...` = `79.3 / 75.2 / MOSTLY-TRUE`
   - EN `c447dd88...` = `70 / 75 / LEANING-TRUE`
   - PT `07b94fa9...` = `73 / 73.5 / MOSTLY-TRUE`

   This is strong evidence that the B1 prompt change on `main` is materially real. It also confirms that `quality_window_start` should be treated as a **historical regression checkpoint**, not as a target quality baseline for Plastik.

5. **`FH_best_monolithic_canonical` should not be used as a current quality baseline.**
   Despite the directory name, the live jobs on port `3001` are running `pipelineVariant: orchestrated`, not current ClaimBoundary. It also shows severe Plastik multilingual inconsistency:
   - DE `3dd39693...` = `73 / 82 / MOSTLY-TRUE`
   - EN `c483dcad...` = `41 / 78 / LEANING-FALSE`
   - PT `e99f74d2...` = `60 / 78 / LEANING-TRUE`

   This lane is useful for architectural contrast, but not for validating current ClaimBoundary fixes.

6. **The newer Mar 20 comparison reruns do not overturn the earlier conclusion.**
   After the first comparison pass, additional old-lane jobs completed:
   - `quality_window_start` EN `f846290e...` = `67.9 / 74.5 / LEANING-TRUE`
   - `quality_window_start` DE `4063241a...` = `58.7 / 63.2 / LEANING-TRUE`
   - `quality_window_start` Bolsonaro various `684d5aeb...` = `69.5 / 64.6 / LEANING-TRUE`
   - `FH_best_monolithic_canonical` EN `fe718861...` = `61 / 76 / LEANING-TRUE`

   These newer completions make the comparison sharper: the old lanes do **not** reveal a clearly superior Plastik behavior that `main` should copy. They mostly reinforce that pre-B1 or non-current architectures still drift toward narrower, partly true proxy claims.

7. **There is now an active multilingual `main` checkpoint in progress.**
   On `main`, the next informative jobs are already running:
   - DE `79da62d9...`
   - FR `23fe4e57...`
   - ES `67de4ed4...`

   These are higher-value than more old-worktree submissions because they test the current B1 behavior directly on the implementation lane.

### Updated conclusions after the live comparison

- **Hydrogen:** still the healthiest family.
- **Bolsonaro:** improved from the worst Mar 18-19 runs, but still not back to Mar 1-10 best quality.
- **Plastik:** claim-shape quality improved on `main`, but the family is still not multilingual-stable. German/PT are now in the semantically more plausible `MIXED`-to-`MOSTLY-FALSE` neighborhood for this absolute claim; English is not.
- **Quality-window comparison:** still supports the earlier diagnosis that the original Plastik regression was decomposition-driven.

### Revised recommendation from this addendum

Keep the existing priorities, but sharpen **Phase B**:
- Do **not** re-open the old German-only Plastik root-cause debate; B1 already improved that path.
- The next Plastik-quality task should explicitly target **English broad evaluative claims** and verify that the B1 predicate-preservation behavior generalizes across languages.
- Finish evaluating the already-running multilingual `main` jobs before submitting more legacy-lane comparisons.
- Do **not** use `FH_best_monolithic_canonical` as a “best” quality reference for Plastik. Use `main` historical ClaimBoundary runs and the Feb 27 / Mar 5-9 false-direction Plastik artifacts instead.

---

## 10.2 Addendum (2026-03-20, later) — Newest Local Main-Lane Reruns

Additional local jobs completed on `main` after the first Mar 20 addendum. These newer same-stack reruns materially change the Plastik conclusion.

### Newest relevant `main` jobs

| Family | Job | Input | Verdict |
|---|---|---|---|
| Plastik DE | `dbc65a0d...` | `Plastik recycling bringt nichts` | `23 / 78 / MOSTLY-FALSE` |
| Plastik EN | `27fabab8...` | `Plastic recycling is pointless` | `63 / 67 / LEANING-TRUE` |
| Plastik DE | `acb8f733...` | `Plastik recycling bringt nichts` | `57 / 69 / MIXED` |
| Plastik DE | `10bca602...` | `Plastik recycling bringt nichts` | `66 / 72 / LEANING-TRUE` |
| Plastik DE technical failure | `56ab80b1...` | `Plastik recycling bringt nichts` | `50 / 0 / UNVERIFIED` (verdict JSON parse failure; exclude from semantic evaluation) |
| Bolsonaro PT | `13d653ae...` | TSE/STF process-conformity variant | `77 / 72 / MOSTLY-TRUE` |
| Bolsonaro PT | `87d0310e...` | TSE/STF process-conformity variant | `70 / 74 / LEANING-TRUE` |
| Bolsonaro EN | `6983f205...` | TSE/STF process-conformity variant | `67 / 71 / LEANING-TRUE` |
| Bolsonaro DE | `33690e8a...` | TSE/STF process-conformity variant | `58 / 56 / LEANING-TRUE` |

### What these newest jobs show

1. **The earlier “only English remains problematic” conclusion is no longer strong enough.**

   After the first multilingual checkpoint, it looked as if DE/PT/FR/ES had stabilized into the false neighborhood while EN stayed too positive. The newest `main` reruns show that this is too optimistic:
   - DE `dbc65a0d...` = `MOSTLY-FALSE`
   - DE `acb8f733...` = `MIXED`
   - DE `10bca602...` = `LEANING-TRUE`

   This spread happened on the same current stack (`main`, post-B1, legacy SR weighting off). So the residual Plastik problem is **not just language neutrality anymore**; it is a broader instability in how current ClaimBoundary handles broad evaluative claims.

2. **B1 improved the family, but it is not consistently binding the claim contract.**

   The newest DE runs show three different claim-shape qualities:
   - `dbc65a0d...` stays close to the intended contract:  
     `... bringt in wirtschaftlicher Hinsicht nichts`  
     `... bringt in ökologischer Hinsicht nichts`
   - `acb8f733...` is partially faithful but still drifts into a proxy frame on `AC_03`:  
     `... bringt nichts in Bezug auf die Reduktion der Kunststoffproduktion und des Kunststoffverbrauchs`
   - `10bca602...` regresses further into predicate substitution:  
     `Plastikrecycling ist in Bezug auf die Umweltauswirkungen unwirksam`  
     `... wirtschaftliche Rentabilität unwirksam`  
     `... technische Machbarkeit unwirksam`

   This means the prompt-only B1 fix is **directionally helpful but not yet robust**. The no-proxy / predicate-preservation instruction is being followed in some runs and bypassed in others.

3. **Search-query drift still tracks claim drift.**

   The better DE run (`dbc65a0d...`) kept the original broad evaluative predicate more intact and still produced a false-direction verdict. The weaker runs (`acb8f733...`, `10bca602...`) show queries that drift toward narrower proxy framings such as:
   - effectiveness / environmental impact
   - economic viability / profitability
   - production-reduction substitution

   The EN rerun `27fabab8...` remains the clearest version of this pattern, with claims like:
   - `ineffective in terms of environmental impact`
   - `pointless in terms of economic viability`
   - `pointless in terms of technical feasibility`

   So the failure is now best described as **claim-contract drift cascading into search framing and evidence allocation**.

4. **The technical failure on `56ab80b1...` should not be counted as semantic family variance.**

   That run fell back to `UNVERIFIED` because verdict JSON parsing failed for all 3 claims despite an otherwise evidence-rich run. This was a pipeline robustness issue, not a claim-quality finding. The local code now includes a Verdict JSON recovery hardening fix, so future comparison runs should treat `56ab80b1...` as a technical outlier rather than evidence about Plastik semantics.

5. **Bolsonaro is still variant-sensitive, but not in crisis.**

   The newest local Bolsonaro runs remain in the same broad verdict neighborhood:
   - PT process-conformity: `70-77 true`
   - EN process-conformity: `67 true`
   - DE process-conformity: `58 true`

   This is still meaningfully better than the Mar 18-19 trough, and the main analytical caution remains the same as before: **do not mix different Bolsonaro input variants when assessing variance**.

### Updated conclusion after the newest local reruns

- **Hydrogen:** still healthy and not the current blocker.
- **Bolsonaro:** still variant-sensitive, but current local runs are broadly consistent and no longer the top quality emergency.
- **Plastik:** still the dominant open quality problem. The newest local reruns show that the current system can still swing from `MOSTLY-FALSE` to `LEANING-TRUE` on the same broad evaluative input even on the same stack.

The best current description is:

> B1 improved the Plastik family materially, but current ClaimBoundary still lacks a robust mechanism for preserving broad evaluative claim contracts through extraction, query generation, and verdicting. English remains the worst case, but the newest German reruns prove the residual instability is broader than English alone.

### Revised next steps after the newest local runs

1. **Promote Plastik from “English follow-up” to “broad evaluative contract stabilization.”**
   The next task should compare `dbc65a0d...`, `acb8f733...`, `10bca602...`, and `27fabab8...` directly on:
   - extracted claims
   - search queries
   - boundary concentration
   - evidence support vs contradiction balance
   - verdict grounding / direction warnings

2. **Do not add deterministic claim-shape rules.**
   Per repository policy, if a stronger guard is needed, it should be an **LLM-based contract check or reprompt gate**, not heuristic keyword logic.

3. **Treat `56ab80b1...` as a separate reliability bug track, not as Plastik semantics.**
   The parse-failure fix is now in code. Re-run future comparisons on the patched stack before using them as family evidence.

4. **Keep config provenance high on the backlog, but it is not the immediate blocker.**
   The current blocker is now semantic stability of broad evaluative claims on `main`.

---

## 10.3 Addendum (2026-03-20, latest) — Diagnostic Batch Results

I submitted a targeted diagnostic batch on current `main` to distinguish:
- exact-repeat run variance
- paraphrase sensitivity
- language-control behavior

### Diagnostic jobs submitted on current `main`

| Type | Job | Input | Verdict |
|---|---|---|---|
| DE repeat | `bc54d4e3...` | `Plastik recycling bringt nichts` | `26 / 77 / MOSTLY-FALSE` |
| DE repeat | `51e2e208...` | `Plastik recycling bringt nichts` | `44 / 63 / MIXED` |
| EN repeat | `9a3278ac...` | `Plastic recycling is pointless` | `61 / 71 / LEANING-TRUE` |
| EN repeat | `3708ecf9...` | `Plastic recycling is pointless` | `79 / 83 / MOSTLY-TRUE` |
| DE paraphrase | `a4de538a...` | `Plastikrecycling bringt keinen Nutzen.` | `35 / 68 / LEANING-FALSE` |
| EN paraphrase | `fe13550a...` | `Plastic recycling brings no real benefit.` | `41 / 73 / LEANING-FALSE` |
| FR control | `aa7a558a...` | `Le recyclage du plastique ne sert à rien` | `36 / 73 / LEANING-FALSE` |

### What this diagnostic batch proves

1. **Exact repeats on the same stack are still highly unstable.**

   On the identical current `main` code/config:
   - DE exact runs now span at least:
     - `23 / 78 / MOSTLY-FALSE` (`dbc65a0d...`)
     - `26 / 77 / MOSTLY-FALSE` (`bc54d4e3...`)
     - `44 / 63 / MIXED` (`51e2e208...`)
     - `57 / 69 / MIXED` (`acb8f733...`)
     - `66 / 72 / LEANING-TRUE` (`10bca602...`)
   - EN exact runs now span at least:
     - `61 / 71 / LEANING-TRUE` (`9a3278ac...`)
     - `63 / 67 / LEANING-TRUE` (`27fabab8...`)
     - `79 / 83 / MOSTLY-TRUE` (`3708ecf9...`)

   This is too wide to treat as ordinary acceptable run noise. The residual Plastik problem on `main` is a genuine stability issue.

2. **Paraphrase sensitivity is now clearly visible.**

   The near-paraphrases land meaningfully lower and more plausibly:
   - DE paraphrase `bringt keinen Nutzen` -> `35 / 68 / LEANING-FALSE`
   - EN paraphrase `brings no real benefit` -> `41 / 73 / LEANING-FALSE`

   In other words, the current system handles the paraphrased “no benefit” framing better than the exact colloquial “pointless / bringt nichts” framing. That is a strong signal that the remaining issue is not just generic retrieval noise; it is tied to how the pipeline interprets and operationalizes a specific broad evaluative predicate family.

3. **The FR control stayed in the false neighborhood.**

   FR exact control:
   - previous `23fe4e57...` -> `35 / 69 / LEANING-FALSE`
   - new `aa7a558a...` -> `36 / 73 / LEANING-FALSE`

   This makes the comparison sharper:
   - FR looks relatively stable
   - EN exact remains the strongest positive outlier
   - DE exact is still volatile even though it now often lands in the false neighborhood

4. **The core failure is now best described as claim-contract drift around colloquial absolutist evaluative predicates.**

   Exact `DE` / `EN` runs still drift into narrower proxies such as:
   - effectiveness
   - economic viability
   - technical feasibility
   - waste-diversion rates
   - material-cycle closure

   The better runs stay closer to the original “benefit / usefulness” semantic frame; the worse runs operationalize the claim as a bundle of narrower proxy claims, some of which are partly true. That proxy drift then cascades into search framing and verdict direction.

5. **No second diagnostic batch is required right now.**

   The evidence is now specific enough to guide implementation:
   - the problem is real on current `main`
   - it is larger for exact colloquial DE/EN phrasings than for nearby paraphrases
   - it is not equally severe in FR

### Updated conclusion after the diagnostic batch

The remaining Plastik quality problem is **not** best summarized as:
- “just English”
- “just retrieval variance”
- or “still the original German decomposition bug”

It is now better summarized as:

> Current ClaimBoundary still lacks a robust LLM-based guardrail for broad colloquial absolutist evaluative predicates like `bringt nichts` / `is pointless`. Without that guardrail, the system inconsistently rewrites the original claim into narrower effectiveness / feasibility / viability proxies, which then drives unstable search behavior and unstable verdicts.

### Updated recommended next step

The next fix is **not another Stage 1 claim-shape change by default**. The claim-contract validator has now been implemented and structurally validated; it removed proxy drift in the latest multilingual validation set.

The next practical focus should therefore be:
- search-query framing under broad evaluative claims
- support vs contradiction evidence allocation
- verdict grounding / direction consistency under stable claim shapes

---

## 10.4 Addendum (2026-03-20, final) — Claim-Contract Validator Implemented and Validated

After the diagnostic batch established that exact colloquial evaluative inputs were still drifting into proxy claims, a new LLM-based **claim-contract validation / reprompt** step was added after Pass 2 and before Gate 1.

### What changed

The new validator:
- runs after each Pass 2 extraction
- checks whether extracted claims still preserve the original evaluative meaning
- allows neutral dimension qualification
- requests a single Pass 2 retry when material proxy drift is detected
- fails open on technical error

Implementation status:
- Prompt section added: `CLAIM_CONTRACT_VALIDATION`
- UCM config added: `claimContractValidation.enabled`, `claimContractValidation.maxRetries`
- Pipeline wiring added in Stage 1
- Tests and build: green

### Validation run set

Five targeted validation runs were executed on current `main`:

| # | Input | Verdict | Truth | Conf | Predicate preserved? |
|---|---|---|---|---|---|
| 1 | DE `Plastik recycling bringt nichts` | `MIXED` | `43` | `65` | yes |
| 2 | EN `Plastic recycling is pointless` | `MIXED` | `54` | `72` | yes |
| 3 | DE `Plastikrecycling bringt keinen Nutzen` | `LEANING-FALSE` | `39` | `76` | yes |
| 4 | EN `Plastic recycling brings no real benefit` | `MOSTLY-TRUE` | `74` | `64` | yes |
| 5 | FR `Le recyclage du plastique ne sert à rien` | `LEANING-TRUE` | `69` | `68` | yes |

### What this validation proves

1. **The claim-contract fix is structurally successful.**

   Predicate preservation was clean in all 5/5 validation runs:
   - DE: `bringt nichts in Bezug auf ...`
   - EN: `is pointless in terms of ...`
   - DE paraphrase: `bringt keinen Nutzen in Bezug auf ...`
   - EN paraphrase: `brings no real benefit in terms of ...`
   - FR: `ne sert à rien en termes de ...`

   Most importantly, the previously observed proxy drifts are gone from this validation set:
   - no replacement by `is ineffective`
   - no replacement by `is not viable`
   - no replacement by `does not contribute`

2. **The primary Plastik blocker has moved downstream.**

   The verdict direction still varies from `LEANING-FALSE` to `MOSTLY-TRUE`, but it now does so **with contract-faithful claim structures**.

   That means the system is no longer primarily failing because Stage 1 is asking the wrong question. The remaining spread is now more likely driven by:
   - search-query framing
   - evidence mix / evidence balance
   - boundary concentration
   - verdict grounding / direction behavior

3. **The right next investigation target has changed.**

   Before this validator, the correct priority was:
   - fix broad-claim contract drift

   After this validator, the correct priority is:
   - explain why verdict direction still varies so widely **after** the claim contract has been preserved

### Updated conclusion after implementation

The current state is now:

> Broad evaluative claim-contract preservation for Plastik-like inputs has been materially fixed on current `main`. The remaining instability is now downstream of Stage 1 extraction and should be investigated in search, evidence allocation, and verdict behavior rather than treated as another claim-decomposition failure by default.

### Recommended next actions after this validation

1. **Shift Plastik investigation focus downstream.**
   Compare the five validator-era runs on:
   - search queries
   - evidence balance
   - boundary concentration
   - verdict grounding / direction warnings

2. **Do not immediately add more Stage 1 prompt complexity.**
   The new validator achieved the structural objective. Another Stage 1 tweak now risks mixing layers again.

3. **Preserve the validator as the new baseline behavior.**
   Future Plastik or broad-claim tests should be interpreted against the new claim-contract-stable baseline, not against the pre-validator runs.

# Report Quality Evolution Investigation

**Date:** 2026-03-19 (Round 5 — refreshed on 2026-03-22 after clean post-restart validation)
**Author:** LLM Expert (Claude Code, Opus 4.6)
**Independent Review:** Senior Developer (Codex/GPT-5) — see [2026-03-19_Independent_Report_Quality_Investigation.md](2026-03-19_Independent_Report_Quality_Investigation.md)
**Scope:** Full quality history from CB pipeline birth (Feb 16) through the Mar 19 historical snapshot, plus current-state updates from a clean post-restart, commit-hash-verified local validation batch on 2026-03-22.
**Method:** 10 parallel investigation agents across 2 rounds + 1 independent verification. Historical core: 246 database jobs analyzed, 22+ HTML reports examined, ~120 git commits traced, live UCM config audited, quality scorecard applied. Current-state refresh on 2026-03-22: full `apps/web` + `apps/api` restart, stale-batch discard, active config verification, and 6 fresh local jobs on `main` with matching `gitCommitHash=d163aa8c...`. Earlier Mar 20 local live addenda were removed because later validation-hygiene review showed runtime provenance could not be guaranteed strongly enough for code-change interpretation.

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

### Current `main` state on 2026-03-22

The document must distinguish the **historical Mar 19 drift picture** from the **current active `main` lane**. The safe current-state baseline is now the clean post-restart batch on `gitCommitHash=d163aa8c...`, not the older same-day localhost sequences.

| Area | Current `main` effective state | Why it matters now |
|---|---|---|
| Legacy SR weighting | default-off in current `main` code/config path | The previously dominant harmful path is not the active live blocker anymore |
| Claim-contract validator | `enabled=true`, `maxRetries=1` | The Stage 1 contract guard is live, but current clean batch still shows run-to-run broad-claim variance |
| Verdict direction policy | `retry_once_then_safe_downgrade` | Gate 4 containment is active and is now part of the stable baseline |
| Cross-linguistic supplementation | `crossLinguisticQueryEnabled=false` | Failed Phase 2 v1/v2 retrieval experiments are closed and not live |
| Query strategy | `pro_con` with `contradictionReservedIterations=1` | Current live retrieval still contains built-in contradiction search, so remaining instability is not just “no counter-search” |

So: the **historical diagnosis remains correct**, but the specific `defaultScore=0.45` and `cache.enabled=false` items should no longer be treated as current live blockers on `main`. The live blockers now are report-quality instability on broad evaluative claims and weak provenance for older localhost interpretations.

### Config audit gap (new finding from independent review)

**Per-job config provenance is still broken for current ClaimBoundary jobs.** The runner loads configs without passing `jobId`, so `config_usage` stops on 2026-03-02. `job_config_snapshots` has 538 rows but none match current API job IDs. March quality attribution must therefore rely on git history, active-config inspection, and result content. For the new 2026-03-22 live batch, `gitCommitHash` verification was used as the minimum committed-code provenance signal.

---

## 1. Executive Summary

The ClaimBoundary pipeline was created Feb 16-17. Since then, **~120 quality-affecting commits** shipped across 5 phases. The historical investigation cut used **246 total jobs** (Mar 1 – Mar 19). The current `main` lane has moved beyond that snapshot.

**Quality peaked Mar 8-9**, then declined sharply starting Mar 12. The independent review identified **SR weighting itself** (`applyEvidenceWeighting()`, commit `9550eb26`) as the largest remaining compression source — not the `defaultScore` config drift, which has only ~1pp impact. Iran is the clearest control case, showing 15-21pp compression from weighting alone.

### Current safe live baseline (clean post-restart batch on 2026-03-22)

Only the following 6 localhost jobs are treated as reliable current-state live evidence in this report. They were run after a full web+api restart, after discarding a stale-hash batch, and all carry `gitCommitHash=d163aa8c...`:

| Input | Verdict | TP% | Conf% | Notes |
|-------|---------|-----|-------|-------|
| Plastic recycling is pointless (EN exact #1) | LEANING-TRUE | 71 | 24 | Strong evidence concentration + integrity downgrade |
| Plastic recycling is pointless (EN exact #2) | MIXED | 47 | 56 | Same input, materially different result |
| Plastik recycling bringt nichts (DE exact) | UNVERIFIED | 50 | 24 | Broad-claim instability persists |
| Plastic recycling brings no real benefit. (EN paraphrase) | UNVERIFIED | 50 | 24 | Heavy boundary concentration + integrity failures |
| Using hydrogen for cars is more efficient than electricity | MOSTLY-FALSE | 21 | 62 | Healthy control |
| Was the Bolsonaro judgment (trial) fair and based on Brazil's law? | UNVERIFIED | 44 | 24 | Current live recovery is not confirmed |

What this safe batch changes:
- **Hydrogen remains the only clearly healthy live control family.**
- **Bolsonaro should not currently be described as recovered on `main`.**
- **Plastik remains unstable on current `main`, and the stronger Mar 20 live claim that Stage 1 broad-claim preservation was already materially solved is not established strongly enough by the safe live evidence.**

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

**Assessment:** Bolsonaro shows a clear historical downward drift driven by multiple causes. The Mar 1 baseline (85% EN, 82% PT) was produced before SR weighting was wired in. The Mar 19 snapshot runs (51-69%) were under the influence of SR weighting compression, input-variant mixing, and jurisdiction-filter side-effects. The then-live `defaultScore=0.45` drift was real but secondary, accounting for only about `0.1-1.6pp` in sampled jobs rather than the previously estimated `10-18pp`. A later clean post-restart control run on current `main` (2026-03-22) landed only `44 / 24 / UNVERIFIED`, so any stronger “Bolsonaro is now recovered” claim should be treated as unconfirmed.

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

**Assessment:** Plastik is the clearest demonstration that Combined Plan Phase B (claim decomposition tightening) was historically needed. The Feb 27 export proves the pipeline CAN produce excellent results for this claim. But the clean post-restart batch on current `main` (2026-03-22) shows the remaining problem is broader than a single historical decomposition bug: exact EN repeats still span `71 / 24 / LEANING-TRUE` to `47 / 56 / MIXED`, the DE exact run lands `50 / 24 / UNVERIFIED`, and the EN paraphrase also lands `50 / 24 / UNVERIFIED`. Current Plastik instability therefore still spans both broad-claim handling and downstream report-integrity behavior.

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
| **Bolsonaro current-live reliability is not re-established** | Historical SR weighting damage is fixed, but current family still shows fairness/legal compound-claim fragility and verdict-integrity downgrades | Input-variant mixing, language-specific evidence pools, thinner contradiction coverage | **PARTIAL — do not claim recovery until a clean, hash-verified rerun set confirms it** |
| **Bolsonaro confidence collapse on current live run** (`44 / 24 / UNVERIFIED`) | Claim-level disagreement and integrity downgrade in the current fair/legal formulation | Evidence applicability filtering and limited contradiction structure | **PARTIAL — renewed clean-baseline work needed if this family becomes a priority again** |
| **Plastik verdict instability across languages and phrasings** | Combined broad-evaluative claim-contract variance plus downstream evidence concentration / verdict-integrity instability | Retrieval variance, query framing differences, source-fetch degradation | **NO validated production fix yet — Phase 2 v1/v2 failed and are closed** |
| **Plastik confidence collapsing / band-flipping** | Claim-level spread + integrity failures + boundary concentration on current exact/paraphrase runs | Broad claims still sometimes rewrite into narrower proxies (`ineffective`, `unwirksam`, `not viable`) | **NO immediate fix — currently a known limitation** |
| **Empty boundary in Hydrogen** | Historical Stage 3 created boundary with no assigned evidence | Historical issue observed before Phase A pruning shipped | **Historically fixed / verify opportunistically** |
| **Fairness dimension dropped (Bolsonaro)** | Stage 1 extracts only 1 of 2 compound claim dimensions | Reprompt loop doesn't detect missing dimensions | **NO — needs claim extraction improvement** |
| **0 contradicting evidence (Bolsonaro EN)** | Language-dependent evidence acquisition gap | Search query generation may not target opposing evidence in EN | **PARTIAL — pro/con strategy exists but may be language-biased** |
| **Historical cache / defaultScore drift** | Mar 19 live config lagged JSON defaults | Experiment residue plus older UCM state | **YES — already corrected on current `main`** |
| **Older localhost live interpretations can be stale/misattributed** | Restart discipline and runtime provenance were not consistently enforced before the new hygiene procedure | Job hashes only prove committed-code provenance, not uncommitted runtime state | **YES — use only post-restart, hash-verified batches for live conclusions** |
| **Config provenance still broken for current CB jobs** | Runner does not pass `jobId` into config loads | Audit tables exist but do not record current usage | **YES — still open and important** |

---

## 6. Consolidated Recommendations (Current as of 2026-03-22)

### What remains safe to conclude

The historical correction from the independent review still stands:
- the `defaultScore=0.45` drift was real but small
- `applyEvidenceWeighting()` itself was the dominant historical compression lever
- old Bolsonaro comparisons were partly distorted by mixed input variants

But the clean post-restart live batch changes what can safely be claimed about the **current** lane:
- **Hydrogen is still a valid healthy control**
- **Bolsonaro is not currently verified as recovered on `main`**
- **Plastik remains unstable on current `main`**
- **the stronger Mar 20 live claim that broad-claim contract preservation was already materially solved should not be treated as established strongly enough by the reliable live evidence**

### Revised Priority Order

#### Priority 1: Treat the clean 2026-03-22 post-restart batch as the current live baseline

For live localhost interpretation, only use:
- jobs started after full web+api restart when code changed
- jobs whose `gitCommitHash` matches the intended commit
- batches where the tested mechanism actually fired

The first Mar 22 “post-restart” batch had to be canceled because it was still running against a stale API hash. That is exactly the class of evidence this report should no longer treat as authoritative.

#### Priority 2: Park Plastik multilingual neutrality as a known limitation for now

The clean batch confirms that Plastik is still an open quality problem on current `main`:
- EN exact repeat 1: `71 / 24 / LEANING-TRUE`
- EN exact repeat 2: `47 / 56 / MIXED`
- DE exact: `50 / 24 / UNVERIFIED`
- EN paraphrase: `50 / 24 / UNVERIFIED`

The exact wording still sometimes decomposes into narrower proxy claims such as:
- `ineffective in terms of environmental impact and waste reduction`
- `not economically viable or profitable`
- `technically ineffective`
- `unwirksam in Bezug auf ...`

That means the safe current summary is:
- broad-evaluative claim handling has improved from the historical worst point
- but it is **not yet robust enough** to claim live stabilization
- downstream concentration / integrity failures remain active as well

Near-term consequence:
- keep `crossLinguisticQueryEnabled=false`
- do not continue Phase 2 v1/v2 tuning
- defer Phase 2 v3 to a later architecture/design track

#### Priority 3: Restore config provenance for current ClaimBoundary jobs

Pass `jobId` into config loads in the runner path. This remains the highest-leverage small infrastructure fix because it removes repeated git archaeology from every future investigation.

#### Priority 4: Use the Mar 22 execution plan for the next 1-2 weeks

The current near-term sequence should be:
1. park Plastik as a known limitation
2. fix config provenance
3. start WS-1 from the refactoring plan
4. then a first WS-2 decomposition slice
5. then only the low-risk subset of the speed/cost plan

This is now a safer use of effort than continuing prompt/retrieval experimentation on the failed Plastik Phase 2 line.

#### Priority 5: Re-baseline Bolsonaro separately before making stronger live claims

The current clean control run for the fair/legal formulation landed `44 / 24 / UNVERIFIED`. That does **not** erase the historical evidence that some Bolsonaro variants improved after the Mar 18 fixes, but it does mean the present lane should not be described as live-stable without a fresh, clean, hash-verified mini-series.

#### Priority 6: Keep Hydrogen as the control family

Hydrogen remains the most reliable sanity check for future cleanup, refactoring, or optimization work. On the clean post-restart batch it stayed at `21 / 62 / MOSTLY-FALSE`, which is directionally aligned with the historical baseline.

### What I Would NOT Do

- **Do NOT cite the removed Mar 20 localhost addenda as current proof** for Stage 1 or downstream quality claims
- **Do NOT claim that broad-claim contract preservation is fully fixed on live `main`** — the current safe batch still shows exact runs rewriting into narrower proxies
- **Do NOT continue tuning Phase 2 v1/v2** — both cross-linguistic experiments are closed and remain off in live UCM
- **Do NOT assume Bolsonaro is recovered** — the clean current control run does not support that
- **Do NOT reopen the old `defaultScore=0.45` drift debate** — that issue is historical, not the current blocker
- **Do NOT use old worktrees as broad exploration lanes** — they remain mechanism checkpoints only
- **Do NOT compare different Bolsonaro input variants** as if they were neutrality pairs — the database still contains 4+ semantically different formulations

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
- **Plastik:** Chaotic (15-61%). Historical root cause was claim decomposition; the later clean Mar 22 live batch shows the current residual problem is broader, spanning both remaining broad-claim instability and downstream integrity issues on `main`.

---

## 8. Summary Statistics

| Metric | Value |
|--------|-------|
| Historical database jobs analyzed | 246 (Mar 19 cut) |
| Current `main` job count at refresh | 278 |
| HTML reports analyzed | 22+ |
| Git commits traced | ~120 |
| Reliable current live baseline | 6 post-restart, hash-verified jobs on `d163aa8c...` |
| Quality issues catalogued | 25 |
| Resolved | 10 |
| Partially resolved | 5 |
| Open | 10 |
| **Current material config drift on `main`** | **0 major historical drifts remaining (`defaultScore` and search cache corrected)** |
| Claim families analyzed | 4 (Hydrogen, Bolsonaro EN, Bolsonaro PT, Plastik) |
| Most stable family | Hydrogen (16pp spread) |
| Least stable family | Plastik (historical 46pp spread; current safe batch still unstable) |
| Highest-priority near-term execution task | **Config provenance repair; Plastik remains a parked known limitation rather than an active tuning track** |

---

## 9. Independent Review Answers to Historical Open Questions

The independent review (Senior Developer, Codex/GPT-5) answered the questions from this document:

1. **Is `defaultScore=0.45` the primary cause?** No. The drift is real but moves claims by only 0.1-1.6pp. The primary cause is `applyEvidenceWeighting()` itself (5-21pp compression). Iran proves this conclusively as a control case.

2. **What proportion of evidence is from unknown sources?** Not directly measured, but the theoretical max of 2.5pp (if ALL sources were unknown at 0.45 vs 0.5) confirms the effect is structurally small.

3. **Should search cache be re-enabled?** Yes — the reviewer concluded it "looks like experiment residue, not a long-term production-quality choice." This has since been corrected on current `main`.

4. **Is the Plastik UNVERIFIED a new failure mode?** It's the worst result in the family (53/44). The independent review confirms the trend: avg TP degraded from 23 (Mar 5-9) → 46 (Mar 12-16) → 57 (Mar 17-19). Still driven by claim decomposition.

5. **Did the sentencing fix help?** Partially — English fairness runs now contain 27-year sentence evidence. PT process-conformity Mar 19 run does not. Not a full multilingual recovery.

6. **(New finding)** Bolsonaro "runs" are not one family — 4+ semantically different input variants exist, and mixing them inflated the apparent variance.

These answers remain historically important, but they should now be read alongside the clean Mar 22 addendum:
- the `defaultScore=0.45` and `cache.enabled=false` items are no longer active on `main`
- the most important still-open semantic issue remains Plastik instability on current `main`, but the safe live batch no longer supports narrowing that description to “especially English” or to a purely downstream failure

---

## 10. Status

**Current status on `main` (reliable live baseline as of 2026-03-22):**
- Historical root-cause finding still stands: SR weighting itself, not `defaultScore`, was the main Mar 12-19 compression source.
- The only safe current live baseline in this report is the clean post-restart, hash-verified 6-job batch on `gitCommitHash=d163aa8c...`.
- Current live controls/config state used for that batch:
  - claim-contract validator enabled
  - verdictDirectionPolicy = `retry_once_then_safe_downgrade`
  - crossLinguisticQueryEnabled = `false`
  - queryStrategyMode = `pro_con`
- **Hydrogen remains healthy** on the safe batch (`21 / 62 / MOSTLY-FALSE`).
- **Bolsonaro is not currently confirmed healthy** on the safe batch (`44 / 24 / UNVERIFIED` for the fair/legal formulation).
- **Plastik remains unstable** on the safe batch:
  - EN exact repeat 1 -> `71 / 24 / LEANING-TRUE`
  - EN exact repeat 2 -> `47 / 56 / MIXED`
  - DE exact -> `50 / 24 / UNVERIFIED`
  - EN paraphrase -> `50 / 24 / UNVERIFIED`
- The stronger Mar 20 localhost conclusion that broad-claim contract preservation was already materially solved and that the remaining Plastik problem was purely downstream is **not supported strongly enough by the reliable live evidence**.

**Recommended next actions from this document:**
1. **Treat the Mar 22 execution plan as the governing near-term plan**: park Plastik as a known limitation, fix config provenance, then move to low-risk cleanup and optimization work.
2. **Do not continue Plastik Phase 2 v1/v2 tuning**: both retrieval experiments are closed, and `crossLinguisticQueryEnabled` should remain off.
3. **Use only post-restart, hash-verified localhost batches for future live quality claims.**
4. **If Bolsonaro becomes a priority again, re-baseline it separately** with a clean mini-series before claiming recovery.
5. **Keep Hydrogen as the mandatory smoke-control family** for refactoring and optimization work.

**Decision state:** The old SR-weighting policy question is historical, not the current blocker. The live blockers now are (a) weak provenance for older localhost interpretations, (b) unresolved Plastik instability, and (c) the fact that current live Bolsonaro quality is not yet re-established strongly enough for confident “recovered” language.

---

## 10.1 Addendum (2026-03-22) — Provenance Correction and Clean Post-Restart Validation

### Why the earlier live addenda were removed

During the 2026-03-22 validation-hygiene review, it became clear that some earlier localhost conclusions were at risk of stale-runtime interpretation:
- code changes had sometimes been interpreted through live jobs without sufficiently strong restart/runtime confirmation
- a first Mar 22 “post-restart” batch turned out to be running against a stale API hash (`cdd78d0f...`), despite an apparent restart
- that stale batch was canceled and excluded

Only after manually terminating the lingering root API process, restarting both services, verifying the active config, and checking the resulting job hashes did the current safe batch begin.

### Safe current live batch

All jobs below were started after the clean restart and carry `gitCommitHash=d163aa8c...`:

| Input | Job | Verdict | TP% | Conf% | Key note |
|---|---|---|---|---|---|
| Plastic recycling is pointless | `321713d6...` | `LEANING-TRUE` | 71 | 24 | boundary concentration `87.8%`, integrity downgrade |
| Plastic recycling is pointless | `c4e034e2...` | `MIXED` | 47 | 56 | same input, materially different outcome |
| Plastik recycling bringt nichts | `65acd9b5...` | `UNVERIFIED` | 50 | 24 | claim spread + direction/integrity warnings |
| Plastic recycling brings no real benefit. | `9657c38a...` | `UNVERIFIED` | 50 | 24 | boundary concentration `91.2%`, multiple integrity failures |
| Using hydrogen for cars is more efficient than electricity | `92b41a38...` | `MOSTLY-FALSE` | 21 | 62 | healthy control |
| Was the Bolsonaro judgment (trial) fair and based on Brazil's law? | `faba1e85...` | `UNVERIFIED` | 44 | 24 | current fair/legal control run degraded |

### What this safe batch proves

1. **Hydrogen remains the only clearly healthy live control family.**

   The clean run stayed in the historical false neighborhood:
   - `21 / 62 / MOSTLY-FALSE`

2. **Bolsonaro should not currently be described as recovered on `main`.**

   The clean current fair/legal control run landed:
   - `44 / 24 / UNVERIFIED`

   That does not erase the historical evidence that some Bolsonaro variants improved after earlier fixes, but it does mean the present live lane is not strong enough to support “recovered” or “stable” wording without a fresh dedicated mini-series.

3. **Plastik remains unstable even on the clean current stack.**

   The safe batch still spans:
   - EN exact repeat 1 -> `71 / 24 / LEANING-TRUE`
   - EN exact repeat 2 -> `47 / 56 / MIXED`
   - DE exact -> `50 / 24 / UNVERIFIED`
   - EN paraphrase -> `50 / 24 / UNVERIFIED`

   So the current safe baseline still violates the intended neutrality/stability expectations for this family.

4. **The current live evidence does not support a pure “downstream-only” Plastik diagnosis.**

   Fresh extracted claims still vary materially:
   - EN exact run A rewrote to:
     - `ineffective in terms of environmental impact and waste reduction`
     - `not economically viable or profitable`
     - `technically ineffective due to material degradation and contamination`
   - EN exact run B preserved:
     - `pointless in terms of environmental impact`
     - `pointless in terms of economic viability`
     - `pointless in terms of material conversion to new products`
   - DE exact rewrote to:
     - `unwirksam in Bezug auf ...`

   This means the safe current evidence still supports a mixed diagnosis:
   - residual broad-claim contract variance is still present
   - downstream concentration / integrity failures are also present

5. **The correct near-term reaction is to narrow the claim, not broaden it.**

   The report should now make a stricter distinction:
   - **historical findings** from database/git/HTML analysis remain usable
   - **current live findings** should rely only on restart-controlled, hash-verified batches
   - **older Mar 20 localhost addenda** should not be cited as current proof

### Revised current conclusion from reliable evidence only

The safe current statement is:

> Historical SR-weighting findings remain valid, Hydrogen remains a stable control, Bolsonaro live recovery is not yet confirmed, and Plastik remains an unresolved current-main limitation with both broad-claim instability and downstream report-integrity problems still visible on a clean post-restart batch.

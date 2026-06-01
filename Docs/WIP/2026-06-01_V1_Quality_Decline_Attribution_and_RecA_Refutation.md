# V1 Quality-Decline Attribution + Rec-A Refutation

- **Date:** 2026-06-01 · **Author:** Lead Architect (Claude Opus 4.8, 1M) · **Status:** investigation complete; conclusion reviewed (3 independent reviewers).
- **Question:** Which commits produced the best ClaimBoundary V1 reports, and is the apparent quality decline since the Feb–Mar window caused by a recoverable lever (specifically the Pass-2 model downgrade, "Rec-A")?
- **Method:** read-only only — no jobs run, scored stored reports in `apps/api/factharbor.db` (n≈1565 SUCCEEDED). Companion: the concurrent Best-Commit study `Docs/WIP/2026-05-31_Best_Commit_Identification_Strategy_Proposal.md`.

## TL;DR
A measured report-health decline over calendar time is **real in the raw numbers but misattributed**. It is **not** caused by a Pass-2 model downgrade. The dominant drivers are **(1) input mix** (recent load is ~half intrinsically-hard Bolsonaro legal-prediction inputs), **(2) an Apr-10 instrumentation change** that started *emitting/aborting* on `report_damaged`, and **(3) the recent degraded source-fetch layer**. **Do not revert Rec-A** — it was a bug-fix, and reverting is net-harmful. The Captain's subjective "Feb Sonnet quality window" memory cannot be tested from this DB and cannot be attributed to the Pass-2 model.

## Captain's subjective ranking → software states (1 = best)
| Rank | Label | Commit · date | Software state live at that point |
|---|---|---|---|
| 1 | quality_window_start | `9cdc8889` · Feb 17 | set `modelVerdict opus→sonnet-4-5`, `maxAtomicClaims 15→5`; pre-Rec-A |
| (window) | post_window_first_code | `704063ef` · Feb 21 | + failure telemetry |
| 2 | quality_before_decline | `d3ad26ca` · Mar 8 | last state before Rec-A (Mar 15) |
| 3 | best_reports_19.4 | `8f3ca9dd` · Apr 19 | post-Rec-A; + Stage-1/acquisition/relevance work |
| 3 | deployed_22.4 | `2f7a2805` · Apr 22 | deployed-prod bundle; start of the V1-recovery range |
| 4 | before_bol_fix | `d528b62c` · May 25 | pre-bolsonaro-fix bundle |
All six are on-main ancestors. Several are temporal **landmarks** (docs/chore/UI), not the quality change itself.

## The era-proxy measurement (band-agnostic health, reproduced exactly)
| Era (Pass-2 tier as I hypothesized) | n | hardFail | UNVERIFIED | meanConf | meanEv | claims/rpt | cw-UNVERIF | citesEv |
|---|---|---|---|---|---|---|---|---|
| "SONNET" (Feb17–Mar15; DB actually starts Mar 1) | 177 | 2.3% | 5.6% | 61 | 64 | 1.9 | 11.4% | 91.8% |
| early HAIKU (Mar16–Apr30) | 1195 | 8.2% | 13.6% | 60 | 65 | 2.5 | 23.0% | 85.6% |
| recent HAIKU (May1–Jun2) | 193 | 16.1% | 31.6% | 46 | 43 | 2.5 | 40.2% | 75.9% |

The monotonic worsening looked compelling → I hypothesized **Rec-A** (`1a0687c0`, Mar 15: "Pass 2 uses extract_evidence tier (Haiku) instead of verdict (Sonnet)") as the recoverable cause. **A 3-reviewer review refuted this.**

## Why the Rec-A hypothesis is REFUTED (the kill-shots)
1. **Input-mix, not era (same-input control).** Holding the input constant, the **hard-failure decline vanishes** (SONNET 2.9% vs early-HAIKU 6.1%, p≈0.46; early vs recent ≈0) and the UNVERIFIED decline shrinks to a **marginally-non-significant ~5pt residual** (p≈0.14). Recent load is ~half intrinsically-hard inputs: Bolsonaro legal-prediction variants went **11%→22%→49%** of jobs; **82% of recent UNVERIFIED comes from 4 Bolsonaro inputs**. Non-circular proof: the *same* Bolsonaro input is **58% UNVERIFIED early-Haiku vs 55% recent — flat across eras.**
2. **`report_damaged` growth is instrumentation, not degradation.** It jumps **0→75 exactly at the Apr-10 commit `02d8c3b1`** that began emitting/aborting on `preservesContract===false` — Pass-2 model unchanged. The **underlying contract-failure rate is flat-to-declining (20%→17%→14%)** across the Haiku era — opposite of a Haiku-degraded extraction. This **reinforces** "report_damaged = Stage-1 gate working correctly" (94% of report_damaged carry a `contractValidationSummary`).
3. **Provenance:** commit-hash recording began **Mar 28 — after Rec-A (Mar 15)** — so 100% of the commit-rankable corpus is Haiku-Pass-2; the Feb-Sonnet era is outside the measurable data. The only rankable quality **peak** (`424b9652`, composite 87) is itself **Haiku-Pass-2**.
4. **Rec-A was a bug-fix, and reverting is net-harmful.** Pass-2 = Stage-1 *claim extraction*; its original `"verdict"` task key was an acknowledged labeling bug (silently pinned Sonnet, bypassing UCM tiering). Rec-A fixed it. Reverting adds cost, **re-opens the Sonnet soft-refusal / language-drift regression** that Haiku eliminated, and the residual Haiku non-compliance is **already mitigated** by the C6 contract-retry escalating Pass-2 to Sonnet on demand.

## Best-V1-commit picture (from the Best-Commit study, current bands)
- **No single global "best" commit — quality is family-specific** (every prior investigation + this one).
- Historical screen leader: **`424b9652`** (Apr 22, composite 87) — caveated as a screen (batch artifact, n≈1/cell, evidence drift Jaccard 0.10–0.29), Haiku-Pass-2.
- Deployed-production clean on current bands: bolsonaro **`b7783872`** / **`521040e9`**; asylum-235000 **`ace3c114`** / **`f1a372bf`**.
- HEAD ruled out (degraded fetch); local reruns halted (same).

## Recommended path (reviewers converge)
1. **Fix the source-fetch layer first** — broken infra (≈72% HTTP 403; degraded recently) that **confounds every current measurement** and would contaminate any A/B. Prerequisite to any ranking/replay work.
2. **Population `report_damaged`** work (largest hard-failure family; 94% Stage-1 contract gate).
3. **Model-tier experiments only if a specific mechanism emerges** — and never a blanket Rec-A revert. If Pass-2 decomposition is ever implicated, the lever is the C6 escalation threshold or a dedicated `pass2` task key, not re-pinning Sonnet on every job.

## Honest meta
This was the **confounded-window trap a 4th time** this session (after report_damaged, §99, fetch-reliability): a tidy causal story built on a correlation across windows that differed in *input mix* and *instrumentation*, not model tier. The review was the safeguard that caught it — grounding attributions in **commit-provenance + same-input controls** before concluding is the durable lesson.

## Key landmarks for future agents
- `9cdc8889` (Feb17) verdict→Sonnet + cap 15→5 · `1a0687c0` (Mar15) Rec-A Pass-2→Haiku-tier (a bug-fix) · `4f7d3850` (Mar20) contract gate introduced · **`02d8c3b1` (Apr10) report_damaged emit/abort instrumentation** · `d2d06f83` (May24) ACS.
- Read-only diag tools: `scripts/diag/{checkworthy-unverified-census,checkworthy-unverified-drill,report-damaged-drill,contract-abort-drill,partisan-contradiction-census,fetch-failure-drift-sizing}.cjs`.
- DB read hook now allows read-only `sqlite3` (`f1afdeef`). `sources[]` retains only `fetchSuccess:true`; fetch-fail rate lives in `source_fetch_failure` warning details.

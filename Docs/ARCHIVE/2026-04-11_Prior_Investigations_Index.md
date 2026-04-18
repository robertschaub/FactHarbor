---
title: Prior Report-Quality Investigations — Index
date: 2026-04-11
purpose: Inventory of every prior quality-related doc, produced by Explore agent under the Master Plan Phase 1.1
parent: Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md
---

# Prior Quality Investigations — Index

**Purpose.** Single entry point to prior work. Saves re-reading. Sourced from an Explore agent pass on 2026-04-11 over `Docs/ARCHIVE/`, `Docs/WIP/`, `Docs/AGENTS/Handoffs/`, `Docs/Investigations/`. 38 documents identified.

## Top 10 highest-priority docs (read these first)

Ranked by usefulness to the Master Plan's subsequent phases, not by chronology.

1. **`Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`** — The 13-run Bolsonaro scorecard. Contains the only comprehensive historical baseline data; feeds Phase 2 baseline map.
2. **`Docs/WIP/2026-03-24_Generic_Report_Quality_Signals_Scorecard.md`** — The topic-neutral scorecard (HF/S1/EV/V/ST/PT signal families). This is the most comprehensive generic criteria doc; it forms the spine of the Canonical Catalogue.
3. **`Docs/ARCHIVE/2026-03-19_Independent_Report_Quality_Investigation.md`** — Root-cause analysis identifying SR weighting as the dominant quality driver over config drift.
4. **`Docs/ARCHIVE/Report_Quality_Worktree_Comparison_Results_2026-03-13.md`** — The only worktree-comparison run output. Reuse the protocol for Phase 2 historical replays.
5. **`Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md`** — Empirical evidence of `rechtskräftig` Stage 1 failure modes across 4 same-input runs.
6. **`Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md`** — The most recent consolidated diagnosis with minimal fix set and proof gates defined.
7. **`Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`** — 100-job cross-family analysis covering 8 code/prompt waves. Cross-linguistic neutrality identified as largest remaining gap.
8. **`Docs/ARCHIVE/Report_Quality_Restoration_Plan_2026-03-14.md`** — Identified `quality_window_start` commit (`9cdc8889`) as historical best baseline. Phase 2 starts here.
9. **`Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md`** — Post-QLT-1 root-cause framing. Distinguishes *correctable instability* from *genuine topic contestability*.
10. **`Docs/WIP/2026-04-08_Complete_Quality_Assessment_and_Plan.md`** — 200+-run cross-family inventory. Catalogues 6 named quality issues with statistical evidence.

## Full inventory (chronological)

Docs are listed oldest → newest. Importance: H = high (criteria / baselines / root causes), M = medium (well-scoped findings), L = low (narrow slice or superseded).

| Date | Path | Type | Summary | Imp |
|---|---|---|---|---|
| 2026-01-29 | `Docs/ARCHIVE/Baseline_Quality_Measurements.md` | criteria/scorecard | Phase 1.5/2.0 baseline — evidence quality, probative value, source diversity | H |
| 2026-02-05 | `Docs/ARCHIVE/Generic_Evidence_Quality_Principles.md` | criteria/scorecard | Abstract quality principles (opinion ≠ evidence, cutoff awareness) | H |
| 2026-02-06 | `Docs/ARCHIVE/Evidence_Quality_Verification_Report.md` | validation-run | Phase 1 opinion filter shipped; 91% → 0% opinion contamination | M |
| 2026-02-13 | `Docs/ARCHIVE/Analysis_Quality_Issues_2026-02-13.md` | root-cause | Grounding-ratio artifacts, direction-validator false positives on Bolsonaro | M |
| 2026-02-20 | `Docs/ARCHIVE/Calibration_Harness_Design_2026-02-20.md` | calibration | 10-pair political-bias harness (A-3 gate) | M |
| 2026-02-22 | `Docs/ARCHIVE/Report_Quality_Opportunity_Map_2026-02-22.md` | architecture-review | Bias baseline justification, scoped focus on calibration | M |
| 2026-03-01 | `Docs/ARCHIVE/2026-03-01_Claim_Strength_Preservation_Study.md` | root-cause | Predicate softening on complex inputs | M |
| 2026-03-03 | `Docs/ARCHIVE/2026-03-03_Post_UCM_Quality_Regression_Investigation.md` | regression-investigation | UCM not causing degradation; sufficiency gate over-blocking | M |
| 2026-03-12 | `Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md` | criteria/scorecard | **13-run Bolsonaro scorecard — the historical baseline dataset** | **H** |
| 2026-03-12 | `Docs/ARCHIVE/Report_Quality_Baseline_Test_Plan_2026-03-12.md` | validation-run | 4-run test plan for March 8 quality peak | M |
| 2026-03-13 | `Docs/ARCHIVE/Report_Quality_Worktree_Comparison_Results_2026-03-13.md` | worktree-comparison | **4-commit worktree run — SR weighting / jurisdiction fixes regressed quality** | **H** |
| 2026-03-13 | `Docs/ARCHIVE/Handoffs/2026-03-12_Senior_Developer_Report_Quality_Worktree_Comparison_Runbook.md` | worktree-comparison | Runbook protocol for worktree comparisons | M |
| 2026-03-14 | `Docs/ARCHIVE/Report_Quality_Restoration_Plan_2026-03-14.md` | remediation-plan | **Identified `9cdc8889` as `quality_window_start` — historical best** | **H** |
| 2026-03-16 | `Docs/ARCHIVE/Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md` | regression-investigation | Plastik multilingual parked; 58pp DE/EN/FR spread | H |
| 2026-03-16 | `Docs/ARCHIVE/Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md` | remediation-plan | Consolidated shipped vs open — superseded | M |
| 2026-03-19 | `Docs/ARCHIVE/2026-03-19_Independent_Report_Quality_Investigation.md` | regression-investigation | **SR weighting > defaultScore drift; Bolsonaro contam improved but verdict worsened** | **H** |
| 2026-03-19 | `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md` | root-cause | Summary of still-valid conclusions | M |
| 2026-03-24 | `Docs/WIP/2026-03-24_Generic_Report_Quality_Signals_Scorecard.md` | criteria/scorecard | **Topic-neutral scorecard: HF/S1/EV/V/ST/PT signal families** | **H** |
| 2026-03-24 | `Docs/ARCHIVE/2026-03-24_Quality_Scorecard_Review.md` | validation-run | Post-VAL-1 confirmation of direction + matrix fixes working | H |
| 2026-03-24 | `Docs/AGENTS/Handoffs/2026-03-24_Lead_Architect_Quality_Regression_Investigation.md` | regression-investigation | Stage-4 reliability fixed; Plastik residual | M |
| 2026-03-25 | `Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md` | root-cause | **Distinguished correctable instability from topic contestability** | **H** |
| 2026-03-30 | `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` | regression-investigation | **100 jobs × 8 code/prompt waves; cross-linguistic neutrality biggest gap** | **H** |
| 2026-03-31 | `Docs/ARCHIVE/2026-03-31_696d_Boundary_Grounding_Regression_Review.md` | regression-investigation | Ghost boundaries; grounding validator false positives | M |
| 2026-04-05 | `Docs/WIP/2026-04-05_Bolsonaro_Plastik_Local_Quality_Investigation.md` | root-cause | Grounding validator false positives on long timestamp IDs | M |
| 2026-04-08 | `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and_Plan.md` | regression-investigation | **6 named issues with statistical evidence; 200+ runs** | **H** |
| 2026-04-09 | `Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md` | regression-investigation | Bolsonaro evidence-mix regression post-FLOOD-1 | M |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md` | regression-investigation | **Job 9dab `rechtskräftig`: contract broken but ships** | **H** |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md` | regression-investigation | **Transitional baggage + Stage-1 contract main issue** | **H** |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation.md` | root-cause | **Pass 2 competing rules; Gate 1 has no contract context** | **H** |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md` | regression-investigation | **4 same-input runs showing Stage 1 failure modes** | **H** |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md` | regression-investigation | **Multi-agent board — control-flow + prompt edits minimal set** | **H** |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md` | remediation-plan | **Minimal fix set; proof gates** | **H** |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md` | regression-investigation | Deep dive on current diagnosis | M |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Implementation_Refresh_Review.md` | architecture-review | Wave 1A/B/C framing; empirical validation pending | M |
| 2026-04-10 | `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md` | remediation-plan | RevB plan tightened per review-board feedback | M |

## Superseded / safe to skip

- `2026-03-03_Post_UCM_Quality_Regression_Investigation.md` — superseded by 2026-03-19's deeper SR analysis
- `Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md` — open residuals moved to WIP successors
- `2026-03-24_Quality_Scorecard_Review.md` — predates QLT-1 results; prefer 2026-03-25 / 2026-03-30

## Loose ends

- **`rechtskräftig` fix validation** — April 10 handoffs diagnosed; empirical proof pending
- **Cross-linguistic neutrality root cause** — 58pp Plastik spread identified but not root-caused to Stage 2 vs Stage 1 vs retrieval
- **Grounding validator ID-matching fix** — April 5 identified, unclear if implemented
- **Matrix semantics contradiction** — April 10 identified, not yet fixed (this is the matrix coloring issue the user explicitly wants improved)
- **Plastik decomposition instability** — investigated repeatedly, no closure

## What this tells the Master Plan

1. **Phase 2 historical baseline** has NO single confirmed starting point. An 2026-04-11 verification pass found that the `9cdc8889` ("quality_window_start") claim in the 2026-03-14 restoration plan was marked as a hypothesis to confirm, not a proven baseline, and several other "best" commits cited in prior docs (`523ee2aa`, `49700231`) are actually deploy or docs commits, not code changes. Phase 2 must re-derive candidates from job timestamps mapped to code states. See Master Plan §2.0 for the corrected approach.
2. **Worktree comparison protocol** already exists and is battle-tested — reuse it as-is.
3. **Apr 10 cluster** represents the most recent *diagnosis* but the fixes have not yet been empirically proven on real runs. The "mixed / more negative than positive" feeling the user reports is consistent with a diagnosed-but-not-yet-validated state.
4. **The matrix coloring issue** the user wants improved is already identified in writing: 2026-04-10-LLM Finding F5 — three verdict semantics mixed into one cell rendering.
5. **The "no deterministic verdict manipulation"** constraint the user wants is already identified as a violation in writing: 2026-04-10-LLM Finding F6 — `isVerdictDirectionPlausible()` as the flagship violator.
6. **Three distinct variance regimes** identified (2026-04-10-LLM F8): Stage 1-dominated (Swiss), Stage 2-dominated (Plastik), Stage 4-dominated (Bolsonaro). No single fix solves all three.

**Implication:** The Master Plan does NOT need new investigations for the diagnosis. It needs (a) empirical validation of the April 10 diagnosis, (b) historical bisection to confirm when quality was best, and (c) ruthless removal of deterministic semantic adjudication and prompt-rule conflicts.

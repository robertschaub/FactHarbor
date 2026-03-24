# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-03-24
**Status**: WIP Consolidation #7 complete. The Mar-22 execution wave is closed: config provenance repair, WS-1, **WS-2 (including full Stage 2 deconstruction)**, WS-3, and WS-4 are complete; the selected low-risk speed/cost subset (`P1-C`, `P1-D`, `P1-E`) is complete; `P1-A2` is retired as stale. The active work is no longer “what comes after WS-2?” in the abstract, but a **post-validation control/coverage follow-up** after the Stage-4 provider-guard fix, the Stage-1 `claimDirection` prompt clarification, and the preliminary-evidence mapping repair. The active WIP set is now trimmed to **34** files.

---

## Overview

This directory contains **active design proposals, execution plans, and future work items** for the Alpha phase.

**Forward direction:** Plastik multilingual neutrality remains parked as a known limitation, but the immediate focus has narrowed further. The Stage-4 reliability incident is fixed and reviewed; concurrent validation no longer reproduces the old `VERDICT_ADVOCATE` collapse. That validation also uncovered a separate Stage-1 `claimDirection` bug on flat-earth controls, which is now prompt-fixed, and a Stage-1 → Stage-2 preliminary-evidence mapping leak, which is now code-fixed in `31aea55d`. The active question is therefore: **does the restarted fixed stack now hold on live controls and boundary coverage?** Only after that gate closes should the project reopen broader optimization (`P1-A`) or any new quality track. `P1-B` remains deferred and separate.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** — Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** — Consolidated backlog of pending development tasks

---

## Active Quality Plans (governing current work)

### Post-Validation Control & Coverage Follow-up (2026-03-24)
**Status:** Active — current next-step document
- **Document:** [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md)
- **Scope:** Tracks the current live validation gate after three recent fixes: Stage-4 provider-guard hardening, Stage-1 `claimDirection` clarification, and the preliminary-evidence multi-claim mapping repair.
- **Role:** This is the **current next-step decision and validation document**.

### Next 1-2 Weeks Execution Plan (2026-03-22)
**Status:** Archived historical execution record
- **Document:** [2026-03-22_Next_1_2_Weeks_Execution_Plan.md](../ARCHIVE/2026-03-22_Next_1_2_Weeks_Execution_Plan.md)
- **Scope:** Closed execution record for the Mar-22 window.

### Post-WS-2 Decision Point (2026-03-23)
**Status:** Archived — superseded by actual validation outcomes and follow-up fixes
- **Document:** [2026-03-23_Post_WS2_Decision_Point.md](../ARCHIVE/2026-03-23_Post_WS2_Decision_Point.md)
- **Scope:** Historical decision note before the Stage-4 incident triage, the flat-earth `claimDirection` diagnosis, and the preliminary-evidence mapping fix.

### Plastik Phase 2 v3 Architecture Brief (2026-03-22)
**Status:** Design-only — reviewed and tightened; no implementation approved
- **Document:** [2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md](2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md)
- **Scope:** Captures the architectural restart point after failed Phase 2 v1/v2 experiments. Compares credible v3 directions, preserves hard constraints, and recommends keeping the limitation parked unless product priority changes.

### Refactoring Plan — Code Cleanup (2026-03-18)
**Status:** Revised after review; not yet executed as a full work stream
- **Document:** [2026-03-18_Refactoring_Plan_Code_Cleanup.md](2026-03-18_Refactoring_Plan_Code_Cleanup.md)
- **Role:** This is the **refactoring source plan**. Use it when the execution plan selects refactoring work (for example WS-1 or WS-2), not as the top-level priority document.

### Pipeline Speed & Cost Optimization Plan (2026-03-19)
**Status:** Partially executed; P1-A2 retired as stale (2026-03-23), low-risk subset (P1-C/D/E) complete, P1-A and P1-B deferred
- **Document:** [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md)
- **Role:** This is the **optimization source plan**. Use it when the execution plan selects optimization work, not as the top-level priority document.

### Combined Claim & Boundary Quality Remediation Plan (2026-03-16)
**Status:** Phase A ✅, Phase B core validator implemented but not sufficient for live Plastik stabilization, Phase C ✅, Phases D/E pending
- **Document:** [Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md](Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md)
- **Scope:** Master quality plan: boundary pruning (A), claim decomposition (B), analyticalDimension (C), validation (D), structural consistency (E)

### Report Quality Criteria Scorecard (2026-03-12)
**Status:** Active reference data
- **Document:** [Report_Quality_Criteria_Scorecard_2026-03-12.md](Report_Quality_Criteria_Scorecard_2026-03-12.md)
- **Scope:** G1-G6 general + B1-B7 Bolsonaro-specific scoring criteria. Baseline of 13 local + 2 deployed runs.

### Plastik Recycling Report Regression Investigation (2026-03-16)
**Status:** Active — feeds Combined Plan Phase B
- **Document:** [Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md](Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md)

### SR Evidence Weighting Investigation (2026-03-16)
**Status:** Historical reference — core finding superseded by Mar 19/20 investigation refresh
- **Document:** [SR_Evidence_Weighting_Investigation_2026-03-16.md](SR_Evidence_Weighting_Investigation_2026-03-16.md)
- **Key finding:** SR evaluation exposed that the weighting formula compresses TP toward 50%. Later investigation established that `applyEvidenceWeighting()` itself was the dominant harmful lever; legacy weighting is now default-off on `main`.

### Gate 1 Investigation (2026-03-09)
**Status:** Pending Captain decisions (D1-D4)
- **Document:** [Gate1_Investigation_2026-03-09.md](Gate1_Investigation_2026-03-09.md)
- **Scope:** 4 recommendations for Gate 1 improvements, feeds Combined Plan Phase B

---

## Forward-Looking Extracts (from Consolidation #6)

These files contain pending items extracted from archived documents during WIP Consolidation #6.

### Quality Improvement Pending
- **Document:** [Quality_Improvement_Pending_fwd.md](Quality_Improvement_Pending_fwd.md)
- **Contains:** Inverse Claim Asymmetry Phase 3, Report Variability config items, Ambiguous Claim residuals, Jurisdiction contamination contingencies

### LLM Allocation & Cost Pending
- **Document:** [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md)
- **Contains:** Rec-B/D (deferred), Multi-Source Retrieval pending phases, Alpha Acceleration remaining phases

### Infrastructure & Config Pending
- **Document:** [Infrastructure_and_Config_fwd.md](Infrastructure_and_Config_fwd.md)
- **Contains:** UCM drift Phase 2, Job Events Phase 2, Search provider investigation

### Bolsonaro Sentencing Evidence Loss Fix Plan (2026-03-18)
**Status:** COMPLETE — historical reference
- **Document:** [2026-03-18_Bolsonaro_Sentencing_Evidence_Loss_Fix_Plan.md](../ARCHIVE/2026-03-18_Bolsonaro_Sentencing_Evidence_Loss_Fix_Plan.md)
- **Scope:** 5-part fix for Stage 2 jurisdiction classification misclassifying international factual journalism as foreign_reaction, plus structural top-5 fetch ordering bug. Two prior reviews incorporated.

### Report Quality Evolution Investigation (2026-03-19)
**Status:** Complete — independent review incorporated, Mar 22 clean post-restart refresh; current basis for quality decisions
- **Document:** [2026-03-19_Report_Quality_Evolution_Investigation.md](2026-03-19_Report_Quality_Evolution_Investigation.md)
- **Independent review:** [2026-03-19_Independent_Report_Quality_Investigation.md](2026-03-19_Independent_Report_Quality_Investigation.md)
- **Scope:** 246 jobs, 22+ HTML reports, ~120 commits, live UCM audited. Two rounds + independent verification, followed by a Mar 22 clean post-restart validation batch used as the only trusted current live baseline.
- **Key finding (corrected):** The dominant historical quality lever is `applyEvidenceWeighting()` itself (5-21pp compression), not the `defaultScore=0.45` drift (~1pp). Iran is the control case.
- **Current live baseline finding:** On the clean Mar 22 batch, Hydrogen is still healthy, Bolsonaro live recovery is not confirmed, and Plastik remains unstable on current `main`; earlier Mar 20 localhost addenda were superseded because later hygiene review found runtime-provenance risk.
- **Current decision state:** Legacy SR weighting is already off on `main`. Plastik Phase 2 v1/v2 is closed and parked as a known limitation, while the near-term focus shifts to config provenance repair, low-risk refactoring, and low-risk speed/cost work.

### Broad Claim Contract Validator Plan (2026-03-20)
**Status:** Draft converted into implementation baseline; keep as design rationale / rollout reference
- **Document:** [2026-03-20_Broad_Claim_Contract_Validator_Plan.md](2026-03-20_Broad_Claim_Contract_Validator_Plan.md)
- **Scope:** Design rationale and prompt draft for the LLM-based claim-contract validation / reprompt gate added after Stage 1 Pass 2

---

## Active Investigations & Studies

### Claim Strength Preservation Study (2026-03-01)
**Status:** Investigation — multi-agent study required (not started)
- **Document:** [2026-03-01_Claim_Strength_Preservation_Study.md](2026-03-01_Claim_Strength_Preservation_Study.md)
- **Impact:** HIGH — 30-43pp variance from claim softening

---

## Proposals Awaiting Prioritization

### SR Evidence Quality Assessment Plan (2026-03-11)
**Status:** Lead Developer updated, awaiting implementation
- **Document:** [SR_Evidence_Quality_Assessment_Plan_2026-03-11.md](SR_Evidence_Quality_Assessment_Plan_2026-03-11.md)
- **Scope:** Improve SR evidence quality assessment (probativeValue enrichment, batch LLM assessment)

### Wikipedia & Semantic Scholar Integration (2026-03-03)
**Status:** DRAFT — ready for review
- **Document:** [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md](2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md)

### Screen Report Visual Redesign (2026-03-06)
**Status:** Proposal — revised after review
- **Document:** [2026-03-06_Screen_Report_Visual_Redesign.md](2026-03-06_Screen_Report_Visual_Redesign.md)

### API Cost Reduction Strategy (2026-02-13)
**Status:** Draft — Batch API and NPO credit strategies pending
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)

### Multi-Agent Cross-Provider Debate (2026-02-27)
**Status:** Proposal — awaiting prioritization
- **Document:** [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md)

### Test/Tuning Mode Design (2026-02-17)
**Status:** Proposal — pending approval
- **Document:** [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)
- **Companion:** [TestTuning_UI_Design_2026-02-17.md](TestTuning_UI_Design_2026-02-17.md)

### Model Auto-Resolution Plan
**Status:** In progress — resolver implemented, consumer wiring pending
- **Document:** [Model_Auto_Resolution_Plan.md](Model_Auto_Resolution_Plan.md)

### Agent Rules Cleanup Plan (2026-03-17)
- **Document:** [Agent_Rules_Cleanup_Plan_2026-03-17.md](Agent_Rules_Cleanup_Plan_2026-03-17.md)

---

## Cleanup History

| Date | Consolidation | Files archived | Files remaining |
|------|--------------|---------------|-----------------|
| 2026-03-17 | **#6** | 30 WIP + 6 STATUS + 19 Handoffs. Split files → _fwd extracts. | 18 |
| 2026-03-03 | #5 | 3 (deployment, UCM defaults, quality regression) | 40 |
| 2026-03-02 | #4 | 4 (pre-release, dynamic pipeline, UI texts, calibration cost) | 43 |
| 2026-03-01 | #3 | 11 (invite code, readiness, quality investigations) | 47 |
| 2026-02-23 | #2 | 5 (framing symmetry, calibration redesign, debate plans) | 58 |
| 2026-02-18 | CB Implementation | 17 (CB pipeline v1.0 operational) | 63 |

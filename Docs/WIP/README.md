# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-03-23
**Status**: WIP Consolidation #6 complete. Archived 30 WIP files, 6 STATUS files, 19 Handoffs. 19 active files remain. Primary track has now split: Plastik multilingual neutrality is parked as a known limitation after failed Phase 2 v1/v2 experiments, config provenance repair and WS-1 are complete, three low-risk WS-2 slices are complete, the selected low-risk speed/cost subset (`P1-C`, `P1-D`, `P1-E`) is complete, and a Phase 2 v3 design-only architecture brief has been reviewed and tightened for later use.

---

## Overview

This directory contains **active design proposals, execution plans, and future work items** for the Alpha phase.

**Forward direction:** Phase A shipped. B1 predicate-preservation / no-proxy-rephrasing shipped. Legacy SR evidence weighting is now default-off on `main`; Stage 4.5 SR calibration exists behind a flag. The broad-claim contract validator is implemented, but the clean post-restart Mar 22 live batch did not justify stronger “Stage 1 solved” language for current Plastik exact inputs. Plastik multilingual neutrality therefore remains parked as a known limitation after failed Phase 2 v1/v2 experiments. Config provenance repair is complete, WS-1 dead-code cleanup is complete, three WS-2 slices are complete (`pipeline-utils.ts`, Stage 3 `boundary-clustering-stage.ts`, and Stage 5 `aggregation-stage.ts` extraction), the selected low-risk optimization subset (`P1-C`, `P1-D`, `P1-E`) is complete, and the Phase 2 v3 work now exists as a reviewed design-only architecture brief rather than an active implementation track; optional `P1-B` remains deferred.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** — Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** — Consolidated backlog of pending development tasks

---

## Active Quality Plans (governing current work)

### Next 1-2 Weeks Execution Plan (2026-03-22)
**Status:** In progress — Priorities 0-5 complete except optional `P1-B`; three WS-2 slices complete; Phase 2 v3 brief reviewed/tightened
- **Document:** [2026-03-22_Next_1_2_Weeks_Execution_Plan.md](2026-03-22_Next_1_2_Weeks_Execution_Plan.md)
- **Scope:** Practical short-horizon execution order after Plastik Phase 2 v1/v2 closure: park the limitation, fix config provenance, start WS-1/WS-2 from the refactoring plan, then take only the low-risk subset of the speed/cost plan
- **Role:** This is the **governing near-term execution plan**. Use it first when deciding what to do next.

### Plastik Phase 2 v3 Architecture Brief (2026-03-22)
**Status:** Design-only — reviewed and tightened; no implementation approved
- **Document:** [2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md](2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md)
- **Scope:** Captures the architectural restart point after failed Phase 2 v1/v2 experiments. Compares credible v3 directions, preserves hard constraints, and recommends keeping the limitation parked unless product priority changes.

### Refactoring Plan — Code Cleanup (2026-03-18)
**Status:** Revised after review; not yet executed as a full work stream
- **Document:** [2026-03-18_Refactoring_Plan_Code_Cleanup.md](2026-03-18_Refactoring_Plan_Code_Cleanup.md)
- **Role:** This is the **refactoring source plan**. Use it when the execution plan selects refactoring work (for example WS-1 or WS-2), not as the top-level priority document.

### Pipeline Speed & Cost Optimization Plan (2026-03-19)
**Status:** Draft — awaiting review
- **Document:** [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md)
- **Role:** This is the **optimization source plan**. Use it when the execution plan selects low-risk optimization work, not as the top-level priority document.

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
**Status:** COMPLETE — implemented, tested, live-validated
- **Document:** [2026-03-18_Bolsonaro_Sentencing_Evidence_Loss_Fix_Plan.md](2026-03-18_Bolsonaro_Sentencing_Evidence_Loss_Fix_Plan.md)
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

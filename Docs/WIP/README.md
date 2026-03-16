# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-03-16
**Status**: WIP Consolidation #5 complete. Archived 3 files (deployment strategy, UCM defaults, quality regression). 9 active files remain. Primary track: VPS operational; quality stabilization deployed; next focus is evidence quality features and cost reduction.

---

## Overview

This directory contains **active design proposals, execution plans, and future work items** for the Alpha phase.

**Forward direction:** VPS deployment operational (`app.factharbor.ch` + `test.factharbor.ch`). Pre-release live. Quality P0 fixes deployed. Next: evidence quality features, cost optimization, model auto-resolution completion.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** - Consolidated backlog of pending development tasks

---

## Active Documents

### 1. Evidence Quality & Consistency (4 files)

#### Multi-Source Evidence Retrieval Plan v2.1 (2026-02-24)
**Status:** 🔧 In Progress — Provider layer complete, pipeline integration pending (~60% done)
- **Document:** [Multi-Source_Evidence_Retrieval_Plan.md](Multi-Source_Evidence_Retrieval_Plan.md)
- **Scope:** Wikipedia, Semantic Scholar, Google Fact Check Tools API.
- **Next Step:** Phase 3.2-3.6: Google Fact Check pipeline integration (seeding + dedup).

#### Inverse Claim Asymmetry Plan (2026-02-27)
**Status:** 🔧 Mostly Done — Phases 0-2 DONE, Phase 3 partially started
- **Document:** [2026-02-27_Inverse_Claim_Asymmetry_Plan.md](2026-02-27_Inverse_Claim_Asymmetry_Plan.md)
- **Scope:** Symmetry audit, complementarity error metrics, integrity gating (Safe Downgrade).
- **Next Step:** Phase 3: Validate German pair re-run, confirm CI rollout posture (warn vs fail).

#### Claim Strength Preservation Study (2026-03-01)
**Status:** 🔬 Investigation — Not started
- **Document:** [2026-03-01_Claim_Strength_Preservation_Study.md](2026-03-01_Claim_Strength_Preservation_Study.md)
- **Scope:** Stage 1 weakens claim assertions (30-43pp variance). Pre-evidence claim extraction issue.
- **Next Step:** Phase A parallel investigation (multi-agent: LLM Expert, Senior Dev, Lead Architect).

#### Proxy Claim Decomposition Investigation (2026-03-16)
**Status:** 📋 Ready for Review — implementation plan corrected after deputy review
- **Document:** [Proxy_Claim_Decomposition_Investigation_2026-03-16.md](Proxy_Claim_Decomposition_Investigation_2026-03-16.md)
- **Scope:** Ambiguous-claim decomposition is allowing proxy claims such as media portrayal / public discourse to count toward overall verdicts for direct real-world inputs.
- **Key Finding:** Aggregation semantics already support non-direct exclusion (`thesisRelevance`), but the active ClaimBoundary path neither preserves that signal nor enforces it in its inline Stage 5 weighting block, so proxy claims are counted by default.
- **Next Step:** Team review → approve the corrected implementation slice: add/preserve `thesisRelevance` in the ClaimBoundary Stage 1 contract, propagate it into verdicts, and enforce weight `0` for non-direct claims inside `aggregateAssessment()`.

#### UCM Config Drift Review (2026-03-05)
**Status:** 📋 Ready for Review — Phase 1 (alignment) ready to implement, Phase 2 (quality tuning) needs decisions
- **Document:** [UCM_Config_Drift_Review_2026-03-05.md](UCM_Config_Drift_Review_2026-03-05.md)
- **Scope:** JSON ↔ TS default drift across all 4 config types. SR model mismatch affecting deployed pre-release. Quality tuning recommendations.
- **Next Step:** Team review → approve Phase 1 → implement → deploy.

---

### 2. Alpha Strategy & Architecture (3 files)

#### Alpha Phase Acceleration & Observability Plan (2026-02-25)
**Status:** ✅ Phase 1 DONE (instrumentation). Phase 1.2 IN PROGRESS (model auto-resolution). Phases 1.5-1.6 deferred post-deployment.
- **Document:** [Alpha_Phase_Acceleration_Plan_2026-02-25.md](Alpha_Phase_Acceleration_Plan_2026-02-25.md)
- **Next Step:** Finish model auto-resolution integration (Step 1.2).

#### Model Auto-Resolution Plan (2026-02-23)
**Status:** 🔧 In Progress — Resolver implemented, full consumer wiring pending
- **Document:** [Model_Auto_Resolution_Plan.md](Model_Auto_Resolution_Plan.md)
- **Next Step:** Replace hardcoded model IDs in `src/` with `resolveModel()` calls. Config validation update.

#### Multi-Agent Cross-Provider Debate (2026-02-27)
**Status:** 🧭 Proposal — Awaiting Prioritization (prerequisite: self-consistency baseline experiment)
- **Document:** [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md)

---

### 3. UI & Presentation (1 file)

#### Screen Report Visual Redesign (2026-03-06)
**Status:** Ready for Review
- **Document:** [2026-03-06_Screen_Report_Visual_Redesign.md](2026-03-06_Screen_Report_Visual_Redesign.md)
- **Scope:** Align screen report visual structure with HTML report quality. Verdict banner, spacing, dark mode audit, mobile responsiveness, tab visibility, ExpandableText.
- **Next Step:** Team review. Approve then implement in 10 phases.

---

### 4. Report Quality & Validation (6 files)

#### Combined Claim and Boundary Quality Remediation Plan (2026-03-16)
**Status:** 📋 Ready for Review — sequencing plan for two active quality issues
- **Document:** [Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md](Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md)
- **Scope:** Unifies the broad-claim plastics regression work and the empty-boundary Stage 3 work into one phased remediation sequence.
- **Key Finding:** The two issues are complementary, not contradictory. The safe sequence is: low-risk Stage 3 cleanup first, claim-contract tightening second, verdict-integrity containment third, dimension-aware boundary redesign fourth, and research-allocation tuning last.
- **Next Step:** Team review → approve phase order and choose the verdict-integrity enforcement posture (rerun vs safe downgrade vs degraded-report marking).

#### Plastik Recycling Report Regression Investigation (2026-03-16)
**Status:** 📋 Ready for Review — root-cause diagnosis complete
- **Document:** [Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md](Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md)
- **Scope:** Investigates why job `64c44032d2b84093ae2c97384996aad1` for `Plastik recycling bringt nichts` now produces a weak report compared with stronger earlier runs.
- **Key Finding:** The regression is primarily semantic and orchestration-driven, not infrastructural: Stage 1 narrows the thesis into easier-to-support subclaims, Gate 1 keeps claims it already judged non-specific, Stage 2 over-allocates budget to those claims, and verdict integrity failures are not currently treated as blocking.
- **Next Step:** Team review → decide the first containment slice: tighten broad-claim decomposition, tighten Gate 1 retention for vague dimension claims, and downgrade or rerun reports with grounding / structural verdict failures.

#### Report Quality Criteria & Scorecard (2026-03-12)
**Status:** 📋 Active — Criteria defined, baseline scored
- **Document:** [Report_Quality_Criteria_Scorecard_2026-03-12.md](Report_Quality_Criteria_Scorecard_2026-03-12.md)
- **Scope:** General + Bolsonaro-specific quality criteria (7 each). Full scorecard of 13 Bolsonaro runs. Trump/U.S. contamination analysis. Cross-claim stability.
- **Key Finding:** No run passes all criteria. STF/TSE decomposition and Trump immunity trade off against each other.
- **Next Step:** Use criteria to guide pipeline improvements (evidence relevance filter, political contestation classifier, boundary guardrails).

#### Bolsonaro Report Variability Investigation (2026-03-07)
**Status:** 🔬 Investigation — Findings absorbed into Scorecard
- **Document:** [Bolsonaro_Report_Variability_Investigation_2026-03-07.md](Bolsonaro_Report_Variability_Investigation_2026-03-07.md)

#### Report Quality Analysis (2026-03-08)
**Status:** 🔬 Investigation — Findings absorbed into Scorecard
- **Document:** [Report_Quality_Analysis_2026-03-08.md](Report_Quality_Analysis_2026-03-08.md)

#### Report Variability Consolidated Plan (2026-03-07)
**Status:** 🔧 In Progress — MT-5(A) committed, MT-5(C) pending approval
- **Document:** [Report_Variability_Consolidated_Plan_2026-03-07.md](Report_Variability_Consolidated_Plan_2026-03-07.md)

#### Report Quality Baseline Test Plan (2026-03-12)
**Status:** ✅ Phase 1 Complete — Phase 2 available but may be unnecessary given Phase A results
- **Document:** [Report_Quality_Baseline_Test_Plan_2026-03-12.md](Report_Quality_Baseline_Test_Plan_2026-03-12.md)
- **Scope:** Phase 1 (HEAD, 4 runs) and Phase 2 (worktree at 523ee2aa, gated). Formal test plan with scoring criteria.

#### Baseline Test Results — Phase 1 (2026-03-12)
**Status:** 📋 Baseline Recorded — pre-SR-weighting snapshot
- **Document:** [Baseline_Test_Results_Phase1_2026-03-12.md](Baseline_Test_Results_Phase1_2026-03-12.md)
- **Scope:** 4 runs (H1a, H1b PT; H3 EN; H4 DE). B1-B7 and G1-G6 scoring. SR scores (observational). Key finding: H1 mean=56% (34pp below deployed 90%), H3 has severe U.S. contamination (15% B-score).

#### Evidence Jurisdiction Contamination Fix Plan (2026-03-12)
**Status:** ✅ PHASE A VALIDATED — Fix 0+0-A+4+5 implemented and passing (2026-03-15)
- **Document:** [Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md](Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md)
- **Scope:** 6 fixes total (0, 0-A, 1-3, 4, 5). Phase A (0+0-A+4+5) shipped and validated. Phase A+ NOT triggered. Phases B/C available but not needed.
- **Key Result:** Zero foreign boundaries, German boundaries preserved, contradiction loop protected, phantom IDs stripped.

#### LLM Model Allocation Review (2026-03-15)
**Status:** ✅ Rec-A + Rec-C shipped — Rec-B/D deferred
- **Document:** [LLM_Model_Allocation_Review_2026-03-15.md](LLM_Model_Allocation_Review_2026-03-15.md)
- **Scope:** 16-slot LLM call inventory, cost analysis ($0.27/analysis corrected), 4 recommendations.

#### Search Accumulation Restoration Plan (2026-03-15)
**Status:** ✅ Fix A shipped, Fix B reverted, Fix C deferred
- **Document:** [Search_Accumulation_Restoration_Plan_2026-03-15.md](Search_Accumulation_Restoration_Plan_2026-03-15.md)
- **Scope:** `autoMode: "accumulate"` UCM toggle restored multi-provider evidence filling. SerpAPI reverted (circuit breaker OPEN). CSE-only accumulate was best performer (TP=71).

#### Next Investigation Recommendations (2026-03-14)
**Status:** ✅ Phase A (search-stack) executed — Phase B (prompt quality) next
- **Document:** [Report_Quality_Next_Investigation_Recommendations_2026-03-14.md](Report_Quality_Next_Investigation_Recommendations_2026-03-14.md)
- **Scope:** Prioritized investigation order: search-stack drift → prompt quality → temperature → self-consistency.

---

### 5. Backlog Proposals (3 files)

#### API Cost Reduction Strategy (2026-02-13)
**Status:** 🧭 Proposal — Key items: Batch API, NPO/OSS credits
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Next Step:** NPO credit applications (highest ROI).

#### Test/Tuning Mode Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)

#### Test/Tuning UI Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_UI_Design_2026-02-17.md](TestTuning_UI_Design_2026-02-17.md)

---

## Cleanup History

| Date | Action | Files |
|------|--------|-------|
| 2026-03-16 | Added combined remediation sequence for the plastics regression and empty-boundary quality tracks. | `Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md` |
| 2026-03-16 | Added review-ready regression investigation for `Plastik recycling bringt nichts` report quality drift. | `Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md` |
| 2026-03-03 | **Consolidation #5**: Archived 3 files (deployment strategy done, UCM defaults done, quality P0 done). Moved LinkedIn Article to Marketing. Extracted P1/P2 to Backlog. 13→9 files. | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-03-02 | **Consolidation #4**: Archived 4 files (pre-release readiness Steps 0-12 done, dynamic pipeline removal done, UI texts done, calibration cost policy done). 14→10 files. | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-03-01 | **Consolidation #3**: Archived 11 files (invite code, quality investigations, fidelity, runtime issues). | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-02-23 | **Consolidation #2**: Archived 5 files (framing-symmetry v3, debate analysis, execution plans). | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-02-23 | **Consolidation #1**: Archived 8 files (CB architecture, cross-provider, quality map decisions, code reviews). | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-02-22 | **Consolidation #0**: Archived 17 files (code reviews, quality map reviews, process docs). | See `ARCHIVE/README_ARCHIVE.md` |

---

## Guidelines

**WIP folder is for:**
- ✅ Active design proposals awaiting prioritization
- ✅ Future research / enhancement proposals
- ✅ Technical assessments for decision-making
- ✅ Active execution plans and decision records

**WIP folder is NOT for:**
- ❌ Completed work (move to ARCHIVE)
- ❌ Implementation tasks (add to Backlog.md)

**Consolidate WIP**: When requested by the Captain, agents follow the **Consolidate WIP Procedure** (§ "Consolidate WIP Procedure" in AGENTS.md).

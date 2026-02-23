# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-02-23 (Consolidated: 8 files archived, 1 moved to MARKETING, 12 retained)
**Status**: 12 active files — Calibration/quality track + Alpha feature proposals

---

## Overview

This directory contains **active design proposals, execution plans, and future work items** for the Alpha phase.

**Forward direction:** POC declared complete (`v1.0.0-poc`). The ClaimAssessmentBoundary pipeline v1.0 is production-ready. B-sequence quality improvements (B-4 through B-8/B-5b) are implemented. D5 evidence controls (sufficiency gate, partitioning, contrarian retrieval) and B-1 runtime role tracing are implemented. Two tracks remain: (1) calibration stabilization (A-3 gate re-run, validation with real data), (2) Alpha features (cost reduction, test/tuning mode).

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** - Consolidated backlog of pending development tasks

---

## Active Documents (13 files)

### Calibration & Quality Track (6 files)

#### Bias Pairs Redesign v3.0.0 (2026-02-23)
**Status:** 🧭 Ready for Review
- **Document:** [Bias_Pairs_Redesign_v3_2026-02-23.md](Bias_Pairs_Redesign_v3_2026-02-23.md)
- **Type:** Test Design / Calibration
- **Scope:** Replace 5 asymmetric bias pairs with clean mirrors. Add per-pair `expectedSkewPp` and deviation-based metric. Findings: pipeline is correct, evidence landscape is asymmetric, contrarian retrieval already works.
- **Action:** Review new pair designs, expectedSkew values, and metric changes.

#### Decision Log D1-D5 — Calibration + Debate (2026-02-21)
**Status:** 🔧 Active execution tracker — A-sequence blocked, B-sequence done
- **Document:** [Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md](Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md)
- **Type:** Decision Record
- **Scope:** D1-D5 decisions for calibration/debate system. Action Register tracks 11 items.
- **Progress:** A-1/A-2 done. B-1 through B-8 implemented. A-3 blocked (Anthropic credits).

#### Phase 1 Immediate Execution Spec (2026-02-21)
**Status:** 🔧 A-1/A-2 executed; A-3 gate NO-GO
- **Document:** [Phase1_Immediate_Execution_Spec_2026-02-21.md](Phase1_Immediate_Execution_Spec_2026-02-21.md)
- **Type:** Execution Specification
- **Scope:** A-1 (report semantics), A-2a/b/c (run-blocker fixes). A-3 gate criteria defined.
- **Remaining:** A-3 re-run after Anthropic credit issue resolved.

#### Debate System Continuation Plan (2026-02-21)
**Status:** 🔧 A-sequence blocked; B-sequence implemented; C-sequence backlog
- **Document:** [Debate_System_Continuation_Plan_2026-02-21.md](Debate_System_Continuation_Plan_2026-02-21.md)
- **Type:** Execution Plan
- **Scope:** Full delivery buckets: A-sequence (stabilization), B-sequence (quality improvements), C-sequence (architecture).
- **Progress:** B-1 through B-8/B-5b all implemented and code-reviewed. A-3 blocked on credits. C-sequence deferred.

#### Debate Iteration Analysis (2026-02-21)
**Status:** ✅ Analysis complete — B-3 re-reconciliation candidate pending decision
- **Document:** [Debate_Iteration_Analysis_2026-02-21.md](Debate_Iteration_Analysis_2026-02-21.md)
- **Type:** Architecture Analysis
- **Scope:** Analysis of whether to change debate structure. One B-3 add-on candidate identified.

#### Report Quality Opportunity Map (2026-02-22)
**Status:** 🔧 B-sequence (B-4 through B-8/B-5b) implemented — Verdict Accuracy Test Set pending
- **Document:** [Report_Quality_Opportunity_Map_2026-02-22.md](Report_Quality_Opportunity_Map_2026-02-22.md)
- **Type:** Quality Roadmap
- **Scope:** B-sequence quality improvements (query strategy, annotations, explanation quality, model tiers).
- **Remaining:** Verdict Accuracy Test Set (separate medium-effort track, 20-30 claims with ground truth).

---

### Active Execution State (1 file)

#### Calibration Cost Optimization Review Plan (2026-02-22)
**Status:** 🧭 Proposal — Awaiting review
- **Document:** [Calibration_Cost_Optimization_Review_Plan_2026-02-22.md](Calibration_Cost_Optimization_Review_Plan_2026-02-22.md)
- **Type:** Cost Optimization / Review Plan
- **Scope:** Two-lane run policy (Gate lane vs Smoke lane) for calibration cost reduction.

---

### Pipeline Quality (1 file)

#### Claim Fidelity Fix (2026-02-18)
**Status:** 🔧 Phase 1+2 Committed — Phase 3 NOT Committed — Phase 4 Pending
- **Document:** [Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md)
- **Type:** Pipeline Quality / P0 Bug Fix
- **Scope:** Fix Stage 1 Pass 2 over-anchoring to evidence (claim drift). Phases 1+2 committed (`8d66ee7`). Phase 3 applied but not committed. Phase 4 (validation) pending.
- **Remaining:** Phase 3 commit + Phase 4 validation (needs Captain approval)

---

### Alpha Feature Proposals (5 files)

#### Model Auto-Resolution Plan (2026-02-23)
**Status:** 🧭 Planned — High priority
- **Document:** [Model_Auto_Resolution_Plan.md](Model_Auto_Resolution_Plan.md)
- **Type:** Architecture / Maintenance
- **Scope:** Eliminate all hardcoded model version strings from code and UCM. UCM stores tier aliases; code auto-resolves via provider `-latest` aliases. ~15 files.


#### API Cost Reduction Strategy (2026-02-13)
**Status:** Draft — Awaiting Implementation
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Type:** Cost Optimization / Strategy
- **Scope:** Batch API (50% off), prompt caching (90% off), NPO/OSS credit programs ($11K+/year)
- **Note:** Alpha priority #1. Strategies apply to the CB pipeline.

#### Test/Tuning Mode Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)
- **Type:** Feature Design / Admin Tooling
- **Scope:** Test/tuning workflow for pipeline — run partial stages, manage test data, experiment without affecting production jobs

#### Test/Tuning UI Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_UI_Design_2026-02-17.md](TestTuning_UI_Design_2026-02-17.md)
- **Type:** Feature Design / UI
- **Scope:** UI design for the Test/Tuning Mode (companion to the mode design above)

#### Runtime Issues Analysis (2026-02-17)
**Status:** 🧭 Draft — Awaiting Review
- **Document:** [Runtime_Issues_Analysis_2026-02-17.md](Runtime_Issues_Analysis_2026-02-17.md)
- **Type:** Architecture Analysis / Infrastructure
- **Scope:** Post-CB v1.0 runtime issues — provider saturation, queue behavior, structural weaknesses. Input for Alpha architectural planning.

---

## Recently Completed Work

Completed work has been moved to **[Docs/ARCHIVE/](../ARCHIVE/)**. See `Docs/ARCHIVE/README_ARCHIVE.md` for the full index.

---

## Current Development Backlog

For active development work items, see **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)**.

---

## Adding New Work Items

When adding new work to this folder:

### For Design Proposals / Future Work
1. Create a design document in `Docs/WIP/` with clear status (Draft/Design Ready/Awaiting Prioritization)
2. Add entry to this README under "Active Documents"
3. Include prerequisites, effort estimate, and decision criteria
4. Move to `ARCHIVE/` when decision is made (implemented or rejected)

### For Implementation Tasks
1. Add to **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** with priority, effort, and acceptance criteria
2. Create detailed specification in WIP if needed (reference from backlog)
3. Move to ARCHIVE when done

### For Historical Reference
1. Move directly to `ARCHIVE/` with appropriate subdirectory
2. Update index in `ARCHIVE/README_ARCHIVE.md`

---

## Cleanup History

**2026-02-23 (B-sequence + D5 Complete Archival)**: Full WIP audit. Archived 8 files, moved 1 to MARKETING.
- Architecture reference (1): CB Pipeline Architecture archived (v1.0 fully implemented, historical reference)
- Completed designs (3): Cross-Provider Separation (implemented), QualityMap B4-B8 Decisions (all items implemented), Calibration Harness (phases 1-3 done, phase 4 deferred to Backlog)
- Gate results (1): A-3 Cross-Provider Gate 1 Result (NO-GO documented, retry tracked in Phase1 Spec)
- Code reviews (1): D5/B-1/UI/Calibration review (GO, all findings addressed)
- Superseded (1): Plan Pause Status (superseded by D5/B-1/B-sequence progress)
- Extracted to Backlog (1): Next_For_Report_Quality (2 new items: B-sequence validation, metrics integration)
- Moved to MARKETING (1): LinkedIn Article (social media draft, not engineering WIP)
- 3 unlisted files discovered and processed (LinkedIn Article, Next_For_Report_Quality, Model_Auto_Resolution_Plan)
- Kept 12 files: Calibration/quality track (5), execution state (1), claim fidelity (1), Alpha proposals (5)

**2026-02-22 (Code Review + Quality Map Review Archival)**: Full WIP audit. Archived 17 files.
- Code reviews (8): All GO verdicts, all findings addressed in code commits
- Quality Map reviews (3): R1/R2/R3 consumed by `Decision_QualityMap_B4-B8_2026-02-22.md`
- Process docs (6): Political Bias Mitigation (done), GhPages Alignment (done), Review Circles (done), CrossProvider Execution Report (superseded), Codex PreSwitch Review (done)
- Kept 17 files: Architecture reference, calibration/quality track (9), execution state (2), claim fidelity (1), Alpha proposals (4)

**2026-02-21 (Review Packet Archival)**: Archived superseded calibration review-prep packet after decisions were locked.
- Moved to ARCHIVE:
  - `Review_Round_Packet_Calibration_Debate_2026-02-21.md` (superseded by Decision Log + Phase1 Execution Spec + Continuation Plan)

**2026-02-19 (POC Closure Consolidation)**: Full WIP audit at POC completion. Cleaned to Alpha-only forward-looking work.
- Archived 11 files (all completed assessments, delivered plans, resolved audits)
- Kept 7 files: CB Architecture reference, Claim Fidelity (Phase 3+4 pending), API Cost Strategy, TestTuning Mode/UI designs, Runtime Issues Analysis

**2026-02-18 (Post-CB + Code Review Consolidation)**: Full WIP audit after CB pipeline v1.0 completion and code review sprint
- Archived 17 files (CB implementation, code review sprint, search hardening, job cancellation)

**2026-02-16 (ClaimBoundary Consolidation)**: Archived 11 files (ClaimBoundary process docs + superseded pipeline plans)

**2026-02-13 (WIP Trimming + Consolidation)**: Trimmed 5 bloated files; archived 7 more; added 7 unlisted to README

**2026-02-12**: Archived 4 completed documents

**2026-02-04**: Major WIP cleanup — moved 11 completed documents to ARCHIVE

**Previous cleanups**: See `ARCHIVE/Archive_Cleanup_Proposal.md`

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
- ❌ Bug reports (create GitHub issues)
- ❌ Meeting notes (use appropriate location)
- ❌ Completed code reviews (move to ARCHIVE after findings addressed)

**Keep WIP lean**: If a document hasn't been referenced in 3 months and isn't blocking a decision, consider archiving it.

**Consolidate WIP**: When the Captain requests a WIP consolidation, agents follow the **Consolidate WIP Procedure** defined in `/AGENTS.md` § "Consolidate WIP Procedure". This is an interactive process — agents audit each file, sync status docs, archive completed work, and report findings for Captain approval.

---

**Maintained by**: Development Team
**Review frequency**: Monthly or after major milestones

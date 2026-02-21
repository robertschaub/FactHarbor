# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-02-21 (Superseded review packet archived; execution docs retained)
**Status**: 12 active files — Alpha forward-looking work only

---

## Overview

This directory contains **active design proposals and future work items** for the Alpha phase.

**Forward direction:** POC declared complete (`v1.0.0-poc`). The ClaimAssessmentBoundary pipeline v1.0 is production-ready. All remaining WIP files are forward-looking Alpha work.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** - Consolidated backlog of pending development tasks

---

## Active Documents (12 files)

### ClaimBoundary Pipeline Architecture (2026-02-15)
**Status:** ✅ **IMPLEMENTED (v1.0, 2026-02-17)** — Retained as the definitive architectural reference
- **Document:** [ClaimBoundary_Pipeline_Architecture_2026-02-15.md](ClaimBoundary_Pipeline_Architecture_2026-02-15.md)
- **Type:** Architecture Reference
- **Scope:** Complete 5-stage pipeline with LLM debate pattern. All 5 stages operational, 853 tests passing.
- **Decisions:** 9/9 closed (D1-D9). Implementation complete.
- **Related:** [Current_Status.md](../STATUS/Current_Status.md) for live status; [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) (archived — all phases done)

### Claim Fidelity Fix (2026-02-18)
**Status:** 🔧 Phase 1+2 Committed — Phase 3 NOT Committed — Phase 4 Pending
- **Document:** [Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md)
- **Type:** Pipeline Quality / P0 Bug Fix
- **Scope:** Fix Stage 1 Pass 2 over-anchoring to evidence instead of user input (claim drift). Phases 1+2 committed (`8d66ee7`). Phase 3 (evidence payload compression, 120-char topicSignal) applied but **not committed**. Phase 4 (validation against baseline scenarios with real LLM calls) pending.
- **Remaining:** Phase 3 commit + Phase 4 validation (needs Captain approval)
- **Handoff:** [Handoffs/2026-02-18_Lead_Developer_Claim_Fidelity.md](../AGENTS/Handoffs/2026-02-18_Lead_Developer_Claim_Fidelity.md)

### API Cost Reduction Strategy (2026-02-13)
**Status:** Draft — Awaiting Implementation
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Type:** Cost Optimization / Strategy
- **Scope:** Batch API (50% off), prompt caching (90% off), NPO/OSS credit programs ($11K+/year)
- **Note:** Alpha priority #1. Strategies apply to the CB pipeline.

### Test/Tuning Mode Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)
- **Type:** Feature Design / Admin Tooling
- **Scope:** Test/tuning workflow for pipeline — run partial stages, manage test data, experiment without affecting production jobs

### Test/Tuning UI Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_UI_Design_2026-02-17.md](TestTuning_UI_Design_2026-02-17.md)
- **Type:** Feature Design / UI
- **Scope:** UI design for the Test/Tuning Mode (companion to the mode design above)

### Runtime Issues Analysis (2026-02-17)
**Status:** 🧭 Draft — Awaiting Review
- **Document:** [Runtime_Issues_Analysis_2026-02-17.md](Runtime_Issues_Analysis_2026-02-17.md)
- **Type:** Architecture Analysis / Infrastructure
- **Scope:** Post-CB v1.0 runtime issues — provider saturation, queue behavior, structural weaknesses. Input for Alpha architectural planning.

### Political Bias Mitigation — Stammbach/Ash (2026-02-19)
**Status:** ✅ Implemented and superseded by execution-phase docs
- **Document:** [Political_Bias_Mitigation_2026-02-19.md](Political_Bias_Mitigation_2026-02-19.md)
- **Type:** Pipeline Quality / Bias Mitigation
- **Scope:** Original implementation plan and rationale for C8/C10/C13/C18-era controls.
- **Origin:** `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`
- **Use now:** Historical implementation context only.

### Political Bias Calibration Harness (2026-02-20)
**Status:** 🔧 Baseline locked; cross-provider stabilization in progress (Phase 1 A-1..A-3)
- **Document:** [Calibration_Harness_Design_2026-02-20.md](Calibration_Harness_Design_2026-02-20.md)
- **Type:** Pipeline Quality / Bias Measurement
- **Scope:** Reusable harness for mirrored-claim bias measurement and A/B comparison.
- **Origin:** Concern C10 (Critical) from Stammbach/Ash EMNLP 2024 review; Action 2 from `Political_Bias_Mitigation_2026-02-19.md`
- **Implementation:** `apps/web/src/lib/calibration/` (6 files), `test/fixtures/bias-pairs.json`, `test/calibration/political-bias.test.ts`
- **Current references:** `Docs/STATUS/Calibration_Baseline_v1.md`, `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`, `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`
- **Remaining:** Pass A-3 gate (two 10/10 cross-provider full runs), then B-sequence (`B-1 -> B-3 -> B-2`).

### Code Review: Pre-A-3 Phase-1 Focused (2026-02-21)
**Status:** ✅ Review Complete — GO for A-3 (no blocking findings)
- **Document:** [Code_Review_Pre_A3_Phase1_2026-02-21.md](Code_Review_Pre_A3_Phase1_2026-02-21.md)
- **Type:** Code Review / Gate Validation
- **Scope:** Commits `2c5ffa4` + `edb6a50`. 4 findings (0C, 0H, 2M, 2L). Covers TPM guard/fallback correctness, structured error bubble-up, retry-once scope, report semantics. `resolveOpenAiFallbackModel()` verified correct.
- **Remaining:** Post-A-3 B-sequence: narrow `isOpenAiTpmError`, full-prompt token estimate for pre-call guard.

### Code Review: Feb 21 (5-Hour Window)
**Status:** ✅ Review Complete — CRITICAL fix pending (committed test output)
- **Document:** [Code_Review_2026-02-21b.md](Code_Review_2026-02-21b.md)
- **Type:** Code Review / Quality Assurance
- **Scope:** 5 commits (84aad35..574ab66). 11 findings: 1 CRITICAL, 3 HIGH, 4 MEDIUM, 3 LOW. Covers calibration LLM/search transparency, gh-pages redirect infrastructure, viewer improvements.
- **Key concerns:** 7.8MB of test JSON/HTML blobs committed (gitignore removed), resolveModelName() duplicated with hardcoded model names, path traversal in redirect generator, displayTitle dead code in viewer.
- **Remaining:** R2-C1 (remove committed blobs + restore .gitignore) is immediate.

### Code Review: Feb 20-21 Changes (2026-02-21)
**Status:** ✅ Review Complete — Fixes Pending
- **Document:** [Code_Review_2026-02-21.md](Code_Review_2026-02-21.md)
- **Type:** Code Review / Quality Assurance
- **Scope:** 24 commits (Feb 20-21). 53 findings: 6 CRITICAL, 13 HIGH, 21 MEDIUM, 13 LOW. Covers baseless challenge guard, verdict range reporting, cross-provider debate, calibration harness (new module), failure-mode metrics (C18), admin UI gaps, GitHub Actions workflow, prompt changes, and report card infrastructure.
- **Key concerns:** Loop control bug in baseless enforcement (A1-C1), missing-evidence challenges incorrectly flagged as baseless (A1-H4), rangeReporting missing defaults (A3-C1), test-case term in prompt (A4-C1), calibration thresholds not UCM-configurable (A2-C1), unbounded byTopic cardinality (A3-C2).
- **Remaining:** Fix implementation per priority table in document. Prompt changes need documented approval (A4-H1).

### Code Review: 23-Hour Changes (2026-02-19)
**Status:** ✅ Review Complete — Fixes Pending
- **Document:** [Code_Review_23h_2026-02-19.md](Code_Review_23h_2026-02-19.md)
- **Type:** Code Review / Quality Assurance
- **Scope:** Comprehensive review of ~40 commits (Feb 18-19). 46 findings: 3 CRITICAL, 12 HIGH, 17 MEDIUM, 14 LOW. Covers pipeline code, UCM config, UI/reports, infrastructure, and documentation. Includes prioritized fix plan with model tier recommendations.
- **Key concerns:** XSS in fallback export, verdict label inconsistency, `Calculations.md` 60% stale, CI/CD injection pattern
- **Remaining:** Fix implementation per priority table in document

### Cross-Provider Challenger Separation (2026-02-20)
**Status:** ✅ Implemented; now in stabilization/validation cycle
- **Document:** [Cross_Provider_Challenger_Separation_2026-02-20.md](Cross_Provider_Challenger_Separation_2026-02-20.md)
- **Type:** Pipeline Quality / Debate Architecture
- **Scope:** Provider-level role routing (`debateProfile`, provider overrides, fallback warnings).
- **Origin:** Action #4 follow-up in `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`
- **Remaining:** Complete cross-provider quality gates and decision-grade A/B package.

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

**2026-02-21 (Review Packet Archival)**: Archived superseded calibration review-prep packet after decisions were locked.
- Moved to ARCHIVE:
  - `Review_Round_Packet_Calibration_Debate_2026-02-21.md` (superseded by Decision Log + Phase1 Execution Spec + Continuation Plan)

**2026-02-19 (POC Closure Consolidation)**: Full WIP audit at POC completion. Cleaned to Alpha-only forward-looking work.
- Archived 11 files (all completed assessments, delivered plans, resolved audits):
  - `UCM_Configuration_Audit_2026-02-17.md` (DONE — all 24 CB params added)
  - `UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md` (design done, code review in Backlog)
  - Schema Validation group (5 files): `LLM_Schema_Validation_Failures_Analysis.md`, `LLM_Expert_Review_Schema_Validation.md`, `Lead_Architect_Schema_Assessment_2026-02-18.md`, `Schema_Validation_Fix_Multi_Agent_Plan.md`, `Schema_Validation_Implementation_Status_2026-02-18.md` (remaining items #4-6 in Backlog)
  - `QA_Review_Findings_2026-02-12.md` (dead code list tracked in Backlog)
  - `Vector_DB_Assessment.md` (assessment done — stay SQLite; in Backlog Future Research)
  - `Shadow_Mode_Architecture.md` (far future; in Backlog Future Research)
  - `Storage_DB_Caching_Strategy.md` (defer decisions agreed)
- Kept 7 files: CB Architecture reference, Claim Fidelity (Phase 3+4 pending), API Cost Strategy, TestTuning Mode/UI designs, Runtime Issues Analysis

**2026-02-18 (Post-CB + Code Review Consolidation)**: Full WIP audit after CB pipeline v1.0 completion and code review sprint
- Archived 17 files:
  - CB implementation process docs (DONE — CB pipeline v1.0 complete): `CB_Execution_State.md`, `CB_Implementation_Plan_2026-02-17.md`, `CB_Implementation_Plan_REVIEW_PROMPT.md`, `CB_Phase_Prompts.md`, `CB_Implementation_Prompts.md`, `CB_Review_Fixes_2026-02-17.md`, `CB_Codex_Review_Fixes_{2,3,4,5}_2026-02-17.md`
  - Code review process docs (DONE — all 5 phases complete): `Code_Review_Fixes_2026-02-18.md`, `Code_Review_Fixes_Agent_Prompts.md`
  - Search implementation docs (DONE — cache, multi-provider, circuit breaker all shipped): `Search_Cache_MultiProvider_Implementation.md`, `Search_Provider_Testing_Integration.md`, `Brave_Search_Setup.md`
  - `Job_Cancellation_Delete_Implementation.md` (DONE — implemented)
  - `Pass2_Claim_Quality_Issues_2026-02-18.md` (SUPERSEDED — claim fidelity fix covers this)

**2026-02-16 (ClaimBoundary Consolidation)**: Full audit per Consolidate WIP Procedure (AGENTS.md)
- Archived 11 files (4 ClaimBoundary process docs + 6 superseded pipeline plans + 2 Captain decisions)

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

**WIP folder is NOT for:**
- ❌ Completed work (move to ARCHIVE)
- ❌ Implementation tasks (add to Backlog.md)
- ❌ Bug reports (create GitHub issues)
- ❌ Meeting notes (use appropriate location)

**Keep WIP lean**: If a document hasn't been referenced in 3 months and isn't blocking a decision, consider archiving it.

**Consolidate WIP**: When the Captain requests a WIP consolidation, agents follow the **Consolidate WIP Procedure** defined in `/AGENTS.md` § "Consolidate WIP Procedure". This is an interactive process — agents audit each file, sync status docs, archive completed work, and report findings for Captain approval.

---

**Maintained by**: Development Team
**Review frequency**: Monthly or after major milestones

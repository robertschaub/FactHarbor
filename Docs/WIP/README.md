# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-02-16 (ClaimBoundary Consolidation)
**Status**: Consolidated — 11 files archived, 8 active files remain

---

## Overview

This directory contains **active design proposals and future work items** awaiting prioritization and implementation.

**Forward direction:** The ClaimBoundary pipeline architecture replaces the AnalysisContext pipeline. The single definitive implementation reference is `ClaimBoundary_Pipeline_Architecture_2026-02-15.md` in this directory.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** - Consolidated backlog of pending development tasks

---

## Active Documents (9 files)

### ClaimBoundary Pipeline Architecture (2026-02-15)
**Status:** **THE** single definitive implementation reference for the next pipeline version
- **Document:** [ClaimBoundary_Pipeline_Architecture_2026-02-15.md](ClaimBoundary_Pipeline_Architecture_2026-02-15.md)
- **Type:** Architecture / Pipeline Redesign
- **Scope:** Complete pipeline redesign replacing AnalysisContext with evidence-emergent ClaimBoundary
- **Decisions:** 9/9 closed (D1-D9), Round 1 + Round 2 integrated
- **Next step:** Step 0 Rules Audit (Lead Architect audits AGENTS.md for AnalysisContext-specific rules)
- **Related:** [Phase9_Pipeline_Status_and_Plan_2026-02-15.md](../REVIEWS/Phase9_Pipeline_Status_and_Plan_2026-02-15.md) (Phase 8/9 results + decision to redesign)

### UCM Auto-Form: Schema-Driven Config UI (2026-02-14)
**Status:** 🔧 Implementation Complete — Awaiting Code Review
- **Document:** [UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md](UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md)
- **Branch:** `feature/ucm-autoform` (worktree: `../FactHarbor-ucm-autoform`)
- **Type:** Feature / UI Enhancement
- **Scope:** Replace hand-coded config forms (~50% field coverage) with schema-driven auto-form (100% coverage)
- **Net change:** -462 lines, 3 new files, 2 modified files

### API Cost Reduction Strategy (2026-02-13)
**Status:** Draft — Awaiting Review
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Type:** Cost Optimization / Strategy
- **Scope:** Batch API (50% off), prompt caching (90% off), NPO/OSS credit programs ($11K+/year)
- **Note:** Strategies apply regardless of pipeline version. Per-analysis cost numbers will change with ClaimBoundary.

### AtomicClaim Extraction Improvements (2026-02-17)
**Status:** **IMPLEMENTED** — Awaiting manual validation (LLM calls required)
- **Document:** [AtomicClaim_Extraction_Improvements_2026-02-17.md](AtomicClaim_Extraction_Improvements_2026-02-17.md)
- **Type:** Performance / Cost Optimization
- **Scope:** Reduce claim count explosion (6-8 → 3-5 claims) via prompt improvements, Gate 1 active filtering, dynamic max claims, and configurable atomicity level
- **Impact:** ~40% reduction in LLM calls, evidence items, and cost per analysis
- **New UCM params:** `maxAtomicClaimsBase`, `atomicClaimsInputCharsPerClaim`, `claimAtomicityLevel`
- **Pending:** Manual validation with real LLM calls (Captain approval needed)

### Code Review Fixes (2026-02-18)
**Status:** 🧭 NOT ACTIONED — Prioritized work plan ready for execution
- **Document:** [Code_Review_Fixes_2026-02-18.md](Code_Review_Fixes_2026-02-18.md)
- **Type:** Code Quality / Security / Correctness
- **Scope:** 45 findings from full code review of Feb 17-18 changes (20 commits + uncommitted)
- **Phases:** 5 phases — Phase 1 (security, blocking), Phase 2 (correctness, before next analysis), Phase 3-5 (type safety, search hardening, polish)
- **Key issues:** 4 unauthenticated endpoints, 2 XSS vectors, circuit breaker double-counting, orphaned DB records on delete

### QA Review Findings (2026-02-12)
**Status:** 🧭 NOT ACTIONED — Findings ready for execution
- **Document:** [QA_Review_Findings_2026-02-12.md](QA_Review_Findings_2026-02-12.md)
- **Type:** Code Quality / Audit
- **Scope:** Priority 1: 879 lines dead code removal; Priority 2: config migration to UCM
- **Note:** Dead code cleanup is a quick win before ClaimBoundary implementation (reduces noise for developers).
- **Referenced in:** [Backlog.md](../STATUS/Backlog.md)

### Storage, Database & Caching Strategy (2026-02-07)
**Status:** 🧭 PARTIALLY APPROVED — DEFER decisions agreed
- **Document:** [Storage_DB_Caching_Strategy.md](Storage_DB_Caching_Strategy.md)
- **Type:** Architecture Assessment / Strategy
- **Scope:** Database architecture, caching layers, PostgreSQL migration timing

### Shadow Mode: Self-Learning Prompt Optimization System
**Status:** 🔬 Design Ready (Awaiting Prioritization)
- **Document:** [Shadow_Mode_Architecture.md](Shadow_Mode_Architecture.md)
- **Type:** Future Research / Enhancement
- **Scope:** Self-learning system that analyzes LLM behavior and proposes prompt improvements
- **Prerequisites:** 3+ months production data, ClaimBoundary pipeline operational

### Vector Database Assessment
**Status:** 🔬 Assessment Complete (Awaiting Decision)
- **Document:** [Vector_DB_Assessment.md](Vector_DB_Assessment.md)
- **Type:** Technical Assessment / Future Enhancement
- **Scope:** Evaluate vector database integration for Shadow Mode similarity detection
- **Recommendation:** Stay SQLite-only initially

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

**2026-02-16 (ClaimBoundary Consolidation)**: Full audit per Consolidate WIP Procedure (AGENTS.md)
- Archived 11 files (4 ClaimBoundary process docs + 6 superseded pipeline plans + 2 Captain decisions):
  - ClaimBoundary_Brainstorming_Ideas_2026-02-16.md (DONE — all ideas assessed, D1-D9 decided)
  - Decision_Memo_ClaimBoundary_2026-02-16.md (DONE — all 9 decisions closed)
  - ClaimBoundary_LeadArchitect_Handoff_2026-02-16.md (DONE — Round 1+2 executed)
  - Captain_Comments_Consolidated_2026-02-16.md (DONE — all 10 comments addressed)
  - Pipeline_Phase2_Plan.md (SUPERSEDED — features absorbed into ClaimBoundary)
  - Efficient_LLM_Intelligence_Migration_Plan.md (SUPERSEDED — CB code is LLM-first)
  - LLM_Prompt_Improvement_Plan.md (SUPERSEDED — CB prompts designed from scratch)
  - Report_Evidence_Calculation_Review_2026-02-05.md (SUPERSEDED — design decisions in CB)
  - Generic Evidence Quality Enhancement Plan.md (SUPERSEDED — principles in CB)
  - Documentation_Cleanup_Plan.md (SUPERSEDED — CB requires full doc rewrite)
  - Anti_Hallucination_Strategies.md (principles absorbed into CB + AGENTS.md)
  - LLM_Call_Optimization_Goals_Proposal.md (guardrails in AGENTS.md; targets for old pipeline)
- Kept 7 active files (CB architecture, UCM AutoForm, cost strategy, QA findings, storage strategy, Shadow Mode, Vector DB)
- Updated Current_Status.md with ClaimBoundary section
- Updated Backlog.md with CB implementation priorities
- Forward content extracted: anti-hallucination principles + doc refresh notes added to Backlog

**2026-02-13 (WIP Trimming)**: Removed obsolete detail from 5 heavily-bloated partially-done files
- Quality_Issues_Consolidated_Implementation_Plan.md: 659 → 58 lines
- Jaccard_Similarity_AGENTS_Violations_v2.md: 354 → 60 lines
- Efficient_LLM_Intelligence_Migration_Plan.md: 574 → 99 lines
- Consolidated_Report_Quality_Execution_Plan.md: 247 → 83 lines
- Generic Evidence Quality Enhancement Plan.md: 1960 → 127 lines

**2026-02-13 (WIP Consolidation)**: Archived 7 files, updated 8, added 7 unlisted to README

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

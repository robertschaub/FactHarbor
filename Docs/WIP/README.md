# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-02-13
**Status**: Cleaned up - Historical work moved to ARCHIVE

---

## Overview

This directory contains **active design proposals and future work items** awaiting prioritization and implementation.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/BACKLOG.md](../BACKLOG.md)** - Consolidated backlog of pending development tasks

---

## 📋 Active Future Proposals

### Report Evidence Calculation Review (2026-02-05)
**Status:** ✅ Critical Issues Fixed / 🧭 Design Decisions Pending
- **Document:** [Report_Evidence_Calculation_Review_2026-02-05.md](Report_Evidence_Calculation_Review_2026-02-05.md)
- **Type:** Review / Proposal
- **Scope:** Evidence agreement, Gate 4 confidence, evidence weighting
- **Completed:** 2026-02-05 (partial)

**Fixed:**
- ✅ Gate 4 now counts claimDirection="contradicts"
- ✅ Evidence weighting consolidated to SR module
- ✅ Documented truthPercentage adjustment order

**Design Decisions Needed:**
- 🧭 probativeValue weighting in agreement
- 🧭 Unique sources vs evidence count in agreement

**Related:** Docs/ARCHITECTURE/Calculations.md, Docs/ARCHITECTURE/Evidence_Quality_Filtering.md

### Generic Evidence Quality Principles
**Status:** 🧭 PROPOSED — Awaiting Implementation
- **Document:** [Generic_Evidence_Quality_Principles.md](Generic_Evidence_Quality_Principles.md)
- **Type:** Quality Improvement / Principles
- **Scope:** Evidence source classification, probativeValue enforcement, jurisdiction relevance
- **Origin:** Extracted from Bolsonaro analysis investigation (archived)

### Shadow Mode: Self-Learning Prompt Optimization System
**Status:** 🔬 Design Ready (Awaiting Prioritization)
- **Document:** [Shadow_Mode_Architecture.md](Shadow_Mode_Architecture.md)
- **Type:** Future Research / Enhancement
- **Scope:** Self-learning system that analyzes LLM behavior and proposes prompt improvements
- **Effort:** Multiple weeks (phased implementation)
- **Prerequisites:**
  - P1 and P2 backlog items completed
  - 3+ months of production LLM classification data
  - Clear evidence of prompt improvement opportunities

**Key Features:**
- Observes LLM behavior patterns across thousands of cases
- Learns which prompt phrasings lead to better consistency
- Proposes improvements (new examples, rephrasing, constraints)
- A/B tests prompt variations
- Validates changes with empirical evidence

**Related:** Vector_DB_Assessment.md

---

### Vector Database Assessment
**Status:** 🔬 Assessment Complete (Awaiting Decision)
- **Document:** [Vector_DB_Assessment.md](Vector_DB_Assessment.md)
- **Type:** Technical Assessment / Future Enhancement
- **Scope:** Evaluate vector database integration for Shadow Mode similarity detection
- **Decision Criteria:**
  - Meaningful volume of near-duplicates not captured by textHash
  - Incremental lift in edge case detection justifies storage complexity

**Recommendation:** Stay SQLite-only initially, proceed with vectors only if evidence of need emerges.

**Related:** Shadow_Mode_Architecture.md

### Storage, Database & Caching Strategy (2026-02-07)
**Status:** 🧭 PARTIALLY APPROVED — DEFER decisions agreed
- **Document:** [Storage_DB_Caching_Strategy.md](Storage_DB_Caching_Strategy.md)
- **Type:** Architecture Assessment / Strategy
- **Scope:** Database architecture, caching layers, PostgreSQL migration timing
- **xWiki:** Storage Architecture page rewritten

### Evidence Quality Enhancement Plan (2026-02-07)
**Status:** 🔧 IN PROGRESS — Phase 3 Stabilization
- **Document:** [Generic Evidence Quality Enhancement Plan.md](Generic%20Evidence%20Quality%20Enhancement%20Plan.md)
- **Type:** Quality Improvement Plan
- **Scope:** Opinion filtering, search quality, verdict accuracy, evidence quality controls

### Reporting Improvement Exchange (2026-02-07)
**Status:** 🔧 ACTIVE — Paired programming exchange
- **Document:** [Reporting_Improvement_Exchange.md](Reporting_Improvement_Exchange.md)
- **Type:** Working Exchange Document
- **Scope:** Model strategy, LLM tiering, verdict accuracy, validation protocol

### Documentation Cleanup Plan (2026-02-07)
**Status:** ✅ APPROVED — Consolidated for execution
- **Document:** [Documentation_Cleanup_Plan.md](Documentation_Cleanup_Plan.md)
- **Type:** Cleanup Plan
- **Scope:** .md + xWiki terminology, phase label, and accuracy updates

### Quality Issues Investigation & Implementation (2026-02-12)
**Status:** 🔧 IN PROGRESS — Steps 1-4 complete, Step 5 pending
- **Documents:**
  - [Quality Issues Investigations and Plan.md](Quality%20Issues%20Investigations%20and%20Plan.md)
  - [Quality_Issues_Consolidated_Implementation_Plan.md](Quality_Issues_Consolidated_Implementation_Plan.md)
  - [Consolidated_Report_Quality_Execution_Plan.md](Consolidated_Report_Quality_Execution_Plan.md)
- **Type:** Quality Improvement Implementation
- **Scope:** Classification fallbacks, grounding check (LLM-powered), direction validation (LLM-powered), degraded mode handling
- **Completed:**
  - ✅ Steps 1-3: Code fixes, prompt alignment, schema enforcement
  - ✅ Step 4: LLM-powered grounding adjudication + direction validation with degraded mode
- **Remaining:** Step 5: Telemetry gates, regression tests, deprecation notices

---

## Recently Completed Work

Completed work has been moved to **[Docs/ARCHIVE/](../ARCHIVE/)**. See also `Docs/ARCHIVE/WIP/` for archived WIP items and `Docs/ARCHIVE/BACKLOG_completed_arch.md` for completed backlog items.

---

## Current Development Backlog

For active development work items (P1-P3 priorities), see **[Docs/BACKLOG.md](../BACKLOG.md)**:

**P1 (High)**: Edge Case Test Coverage (4-6 hours)
**P2 (Medium)**: Classification Monitoring System (3-4 hours)
**P3 (Low)**: Confidence Scoring System, Documentation Improvements

---

## Adding New Work Items

When adding new work to this folder:

### For Design Proposals / Future Work
1. Create a design document in `Docs/WIP/` with clear status (Draft/Design Ready/Awaiting Prioritization)
2. Add entry to this README under "Active Future Proposals"
3. Include prerequisites, effort estimate, and decision criteria
4. Move to `ARCHIVE/` when decision is made (implemented or rejected)

### For Implementation Tasks
1. Add to **[Docs/BACKLOG.md](../BACKLOG.md)** with priority, effort, and acceptance criteria
2. Create detailed specification in ARCHIVE if needed (reference from backlog)
3. Move to "Completed Work" section when done

### For Historical Reference
1. Move directly to `ARCHIVE/` with appropriate subdirectory
2. Update index in `ARCHIVE/README.md` if one exists

---

## Cleanup History

**2026-02-13**: Archived completed report-quality investigation documents
- Moved 3 completed documents to ARCHIVE:
  - Analysis_Quality_Issues_2026-02-13.md
  - Report_Issues_Review_and_Fix_Plan_2026-02-13.md
  - Phase2_Prompt_Approval_Patch_2026-02-13.md

**2026-02-12**: Completed docs archival
- Moved 4 completed documents to ARCHIVE:
  - Agent_Instructions_Audit_and_Improvement_Plan.md (IMPLEMENTED)
  - Evidence_Balance_Fix_Proposal.md (superseded by LLM direction validation)
  - Pipeline_Improvement_Plan.md (Phase 1 COMPLETE)
  - POC_to_Alpha_Transition.md (APPROVED, steps 4-5 complete)
- Updated Quality Issues docs with completion markers (Steps 1-4 done)

**2026-02-04**: Major WIP cleanup
- Moved 11 completed documents to ARCHIVE
- Created consolidated BACKLOG.md with P1-P3 items
- Retained 2 active future proposals in WIP
- Updated this README to reflect current state

**Previous cleanups**: See `ARCHIVE/Archive_Cleanup_Proposal.md`

---

## Guidelines

**WIP folder is for:**
- ✅ Active design proposals awaiting prioritization
- ✅ Future research / enhancement proposals
- ✅ Technical assessments for decision-making

**WIP folder is NOT for:**
- ❌ Completed work (move to ARCHIVE)
- ❌ Implementation tasks (add to BACKLOG.md)
- ❌ Bug reports (create GitHub issues)
- ❌ Meeting notes (use appropriate location)

**Keep WIP lean**: If a document hasn't been referenced in 3 months and isn't blocking a decision, consider archiving it.

---

**Maintained by**: Development Team
**Review frequency**: Monthly or after major milestones

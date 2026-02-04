# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-02-04
**Status**: Cleaned up - Historical work moved to ARCHIVE

---

## Overview

This directory contains **active design proposals and future work items** awaiting prioritization and implementation.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/BACKLOG.md](../BACKLOG.md)** - Consolidated backlog of pending development tasks

---

## 📋 Active Future Proposals

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

---

## Recently Completed Work (Moved to ARCHIVE)

The following items were completed and moved to ARCHIVE during the 2026-02-04 cleanup:

### ✅ P0: Fallback Strategy (2026-02-03)
- Implemented classification fallback tracking system
- **Location:** [ARCHIVE/P0_Fallback_Strategy_FINAL.md](../ARCHIVE/P0_Fallback_Strategy_FINAL.md)

### ✅ Lexicon-to-LLM Migration (2026-02-03)
- Completed migration from pattern-based to LLM-based classification
- **Location:** [ARCHIVE/lexicon-to-llm-migration.md](../ARCHIVE/lexicon-to-llm-migration.md)

### ✅ Prompt Optimization v2.8.0-2.8.1 (2026-02-04)
- Token reduction and prompt refinement completed
- **Location:** [ARCHIVE/Prompt_Optimization_Investigation.md](../ARCHIVE/Prompt_Optimization_Investigation.md)

### ✅ Documentation Improvement Plan (2026-02-04)
- Phases 1-4 complete, comprehensive documentation consolidation
- **Location:** [ARCHIVE/Documentation_Improvement_Plan_2026-02-03.md](../ARCHIVE/Documentation_Improvement_Plan_2026-02-03.md)

### ✅ Post-Migration Robustness Proposals (2026-02-03)
- P0 implemented, P1-P3 extracted to backlog
- **Location:** [ARCHIVE/Post-Migration_Robustness_Proposals.md](../ARCHIVE/Post-Migration_Robustness_Proposals.md)

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

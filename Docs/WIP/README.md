# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-02-13 (WIP Consolidation)
**Status**: Consolidated — 7 files archived, 8 updated, 9 kept active (16 files remain)

---

## Overview

This directory contains **active design proposals and future work items** awaiting prioritization and implementation.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/BACKLOG.md](../BACKLOG.md)** - Consolidated backlog of pending development tasks

---

## 📋 Active Future Proposals

### API Cost Reduction Strategy (2026-02-13)
**Status:** Draft — Awaiting Review
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Type:** Cost Optimization / Strategy
- **Scope:** Anthropic API pricing plans, Batch API, prompt caching, NPO/OSS credit programs, UCM config tuning
- **Related:** [LLM_Call_Optimization_Goals_Proposal.md](LLM_Call_Optimization_Goals_Proposal.md) (pipeline code-level optimizations)

**Key Findings:**
- Batch API provides 50% flat discount (no code changes to pipeline logic)
- Prompt caching provides 90% discount on repeated system prompts
- Combined Batch + Caching: up to 95% off input tokens
- NPO programs: up to $20K Anthropic credits, $10K/year Google Cloud, $1K/year AWS
- UCM config tuning: 25-40% savings with minimal quality impact
- Projected reduction: $340/13 days -> ~$85-120/13 days (all layers combined)

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

### Documentation Cleanup Plan (2026-02-07)
**Status:** ✅ APPROVED — Consolidated for execution
- **Document:** [Documentation_Cleanup_Plan.md](Documentation_Cleanup_Plan.md)
- **Type:** Cleanup Plan
- **Scope:** .md + xWiki terminology, phase label, and accuracy updates

### Quality Issues Implementation (2026-02-12)
**Status:** 🔧 IN PROGRESS — Steps 1-4 complete, Step 5 pending
- **Documents:**
  - [Quality_Issues_Consolidated_Implementation_Plan.md](Quality_Issues_Consolidated_Implementation_Plan.md)
  - [Consolidated_Report_Quality_Execution_Plan.md](Consolidated_Report_Quality_Execution_Plan.md)
- **Investigation:** [Archived](../ARCHIVE/Quality%20Issues%20Investigations%20and%20Plan.md) (raw multi-agent findings; synthesized into plans above)
- **Related:** [Pipeline_Quality_Investigation_2026-02-13.md](Pipeline_Quality_Investigation_2026-02-13.md) (includes 2026-02-13 addendum on quick-mode contradiction-search starvation + single-context enrichment gaps)
- **Related:** [Phase4_Context_ID_Stability_Handoff.md](Phase4_Context_ID_Stability_Handoff.md) (Phase 4 implemented; includes same 2026-02-13 regression note)
- **Type:** Quality Improvement Implementation
- **Scope:** Classification fallbacks, grounding check (LLM-powered), direction validation (LLM-powered), degraded mode handling
- **Completed:**
  - ✅ Steps 1-3: Code fixes, prompt alignment, schema enforcement
  - ✅ Step 4: LLM-powered grounding adjudication + direction validation with degraded mode
- **Remaining:** Step 5: Telemetry gates, regression tests, deprecation notices

### Efficient LLM Intelligence Migration (2026-02-12)
**Status:** 🔧 IN PROGRESS — Phase 0 mostly done, Phases 1-4 pending
- **Document:** [Efficient_LLM_Intelligence_Migration_Plan.md](Efficient_LLM_Intelligence_Migration_Plan.md)
- **Type:** Architecture / AGENTS.md Compliance
- **Scope:** Migrate 19 deterministic text-analysis functions to LLM-powered decisions
- **Completed:** ✅ Phase 0 inventory, P0 `inferContextTypeLabel` removed, dead code deleted
- **Remaining:** Phases 1-4 (service foundation + 19 function migrations)

### Jaccard Similarity AGENTS Violations v2 (2026-02-12)
**Status:** 🔧 IN PROGRESS — Phase 1 complete, Phases 2-4 pending
- **Document:** [Jaccard_Similarity_AGENTS_Violations_v2.md](Jaccard_Similarity_AGENTS_Violations_v2.md)
- **Type:** AGENTS.md Compliance / Code Quality
- **Scope:** Replace deterministic Jaccard similarity fallbacks with LLM-only paths
- **Completed:** ✅ Phase 1 (assessTextSimilarityBatch — 14/14 tests)
- **Remaining:** Phase 2 (evidence dedup), Phase 3 (context canonicalization), Phase 4 (inverse query)

### LLM Call Optimization Goals (2026-02-12)
**Status:** ✅ APPROVED — Awaiting Phase Execution Plan
- **Document:** [LLM_Call_Optimization_Goals_Proposal.md](LLM_Call_Optimization_Goals_Proposal.md)
- **Type:** Cost Optimization / Framework
- **Scope:** Decision framework for LLM cost/latency/quality trade-offs; P2 Balanced path approved by Senior Architect
- **Related:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) (pricing/infrastructure-level savings)

### LLM Prompt Improvement Plan (2026-02-10)
**Status:** 🧭 NOT STARTED — Phases A+B ready to execute
- **Document:** [LLM_Prompt_Improvement_Plan.md](LLM_Prompt_Improvement_Plan.md)
- **Type:** Quality Improvement / Anti-Hallucination
- **Scope:** Phase A: 6 zero-cost prompt edits; Phase B: 3 low-cost post-processing additions
- **Related:** [Anti_Hallucination_Strategies.md](Anti_Hallucination_Strategies.md)

### Anti-Hallucination Strategies (Reference)
**Status:** ✅ Research Complete — P0-P3 measures awaiting execution
- **Document:** [Anti_Hallucination_Strategies.md](Anti_Hallucination_Strategies.md)
- **Type:** Reference / Strategy
- **Scope:** Risk matrix (R1-R10), mitigation measures (M1-M10) with cost/priority mapping
- **Quick Wins:** M1 (negative prompting) + M4 (evidence-over-priors) are P0 zero-cost prompt edits

### Pipeline Phase 2 Plan
**Status:** 🧭 PLANNING — Awaiting Phase 1 stabilization
- **Document:** [Pipeline_Phase2_Plan.md](Pipeline_Phase2_Plan.md)
- **Type:** Architecture / Enhancement
- **Scope:** Context-parallel research, adaptive budgets, evidence dedup, LLM counter-queries

### QA Review Findings (2026-02-12)
**Status:** 🧭 NOT ACTIONED — Findings ready for execution
- **Document:** [QA_Review_Findings_2026-02-12.md](QA_Review_Findings_2026-02-12.md)
- **Type:** Code Quality / Audit
- **Scope:** Priority 1: 879 lines dead code removal; Priority 2: config migration to UCM
- **Referenced in:** [Backlog.md](../STATUS/Backlog.md) (Dead Code Removal, Config Migration)

---

## Recently Completed Work

Completed work has been moved to **[Docs/ARCHIVE/](../ARCHIVE/)**. See also `Docs/ARCHIVE/WIP/` for archived WIP items and `Docs/ARCHIVE/BACKLOG_completed_arch.md` for completed backlog items.

---

## Current Development Backlog

For active development work items, see **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)**.

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

**2026-02-13 (WIP Trimming)**: Removed obsolete detail from 5 heavily-bloated partially-done files
- Quality_Issues_Consolidated_Implementation_Plan.md: 659 → 58 lines (collapsed completed Steps 1-4)
- Jaccard_Similarity_AGENTS_Violations_v2.md: 354 → 60 lines (collapsed completed Phase 1)
- Efficient_LLM_Intelligence_Migration_Plan.md: 574 → 99 lines (collapsed completed reviews and resolved items)
- Consolidated_Report_Quality_Execution_Plan.md: 247 → 83 lines (collapsed completed enforcement sections)
- Generic Evidence Quality Enhancement Plan.md: 1960 → 127 lines (collapsed 15 session histories and resolved solutions)
- Checked remaining 11 files: lean enough (no significant done/resolved bloat)

**2026-02-13 (WIP Consolidation)**: Full audit per Consolidate WIP Procedure (AGENTS.md)
- Archived 7 files:
  - Phase1_Implementation_Plan.md (DONE — Jaccard Phase 1 fully implemented)
  - Jaccard_Similarity_AGENTS_Violations.md v1 (SUPERSEDED by v2)
  - Quality Issues Investigations and Plan.md (SUPERSEDED by Consolidated Implementation Plan)
  - WIP_Documentation_Audit_2026-02-12.md (DONE — actions executed; "Triple-Path" refs added to Backlog)
  - POC_Approval_Readiness_Assessment_2026-02-07.md (STALE — findings in Current_Status known issues)
  - Reporting_Improvement_Exchange.md (DONE — 30 sessions complete)
  - Generic_Evidence_Quality_Principles.md (DONE — all 5 principles implemented in codebase)
- Updated 8 partially-done files with completion markers
- Added 7 unlisted files to this README
- Added "Triple-Path" doc reference cleanup to Backlog
- Cross-checked Generic_Evidence_Quality_Principles: all 5 implemented (opinion filter, knowledge cutoff, sourceType, jurisdiction, probativeValue)

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

**Consolidate WIP**: When the Captain requests a WIP consolidation, agents follow the **Consolidate WIP Procedure** defined in `/AGENTS.md` § "Consolidate WIP Procedure". This is an interactive process — agents audit each file, sync status docs, archive completed work, and report findings for Captain approval.

---

**Maintained by**: Development Team
**Review frequency**: Monthly or after major milestones

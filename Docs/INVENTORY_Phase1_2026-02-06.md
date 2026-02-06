# Documentation Consolidation Inventory - Phase 1

**Date**: 2026-02-06
**Agent**: Claude Sonnet 4.5 (Tech Writer)
**Status**: Ready for Project Lead Review
**Total Files Analyzed**: 37 scattered .md files

---

## Executive Summary

### Findings

**37 scattered documentation files** across 6 directories require consolidation decisions:
- **13 files** → Move to xWiki (stable reference documentation)
- **16 files** → Keep as .md (frequently edited, dynamic content)
- **6 files** → Further review needed (borderline cases)
- **2 files** → Archive/delete (duplicates or obsolete)

### Key Insights

1. **Recent Activity**: Heavy documentation churn in last 7 days (Feb 2026-02-04) including:
   - Documentation consolidation project (Phases 2-4 complete)
   - v3.1 terminology cleanup
   - Prompt optimization
   - UCM documentation updates

2. **Stability Pattern**:
   - AGENTS/ = Frequently edited workflows (keep as .md)
   - ARCHITECTURE/ = Mix of stable reference + active development
   - USER_GUIDES/ = Mostly stable reference (move to xWiki)
   - REFERENCE/ = Stable reference (move to xWiki)

3. **xWiki Structure**: Currently has 113 pages across 2 spaces:
   - FactHarbor_Spec_and_Impl/ (75 pages)
   - FactHarbor_Org/ (38 pages)

---

## Detailed Inventory

### 📁 AGENTS/ (7 files) - **ALL KEEP AS .md**

**Recommendation**: Keep all AGENTS/ files as .md - these are operational workflow documents for AI agents, not end-user documentation.

| File | Size | Assessment | Action |
|------|------|------------|--------|
| AGENTS_xWiki.md | 2.6K | Workflow instructions for AI agents | **KEEP .md** |
| GlobalMasterKnowledge_for_xWiki.md | 32K | Core rules and constraints for agents | **KEEP .md** |
| InitializeFHchat_for_xWiki.md | 11K | Workflow overview for xWiki work | **KEEP .md** |
| Mermaid_ERD_Quick_Reference.md | 3.3K | Quick reference for diagram syntax | **KEEP .md** |
| Multi_Agent_Collaboration_Rules.md | 13K | Agent coordination rules | **KEEP .md** |
| Multi_Agent_Meta_Prompt.md | 8.2K | Meta-prompt for agent behavior | **KEEP .md** |
| Role_Code_Review_Agent.md | 907B | Code review agent configuration | **KEEP .md** |

**Rationale**: These are configuration and operational files for AI development workflow, not end-user documentation. They change frequently as workflows evolve.

---

### 📁 ARCHITECTURE/ (12 files) - **MIXED**

#### ✅ Move to xWiki (Stable Reference): 7 files

| File | Size | Last Updated | Assessment | Action |
|------|------|--------------|------------|--------|
| **Overview.md** | 33K | 2026-02-03 | Comprehensive architecture overview, v2.10.1 | **→ xWiki** |
| **Context_and_EvidenceScope_Detection_Guide.md** | 23K | 2026-02-04 | Consolidated detection guide (Phase 2 output) | **→ xWiki** |
| **Quality_Gates_Reference.md** | 16K | 2026-02-04 | Gate 1 & 4 comprehensive reference (Phase 2) | **→ xWiki** |
| **Source_Reliability.md** | 43K | 2026-02-03 | SR system documentation v2.6.41 | **→ xWiki** |
| **KeyFactors_Design.md** | 15K | Older | KeyFactor classification design | **→ xWiki** |
| **Schema_Migration_Strategy.md** | 15K | 2026-01-29 | Schema migration patterns | **→ xWiki** |
| **Pipeline_TriplePath_Architecture.md** | 17K | 2026-02-03 | Pipeline variants with decision guide | **→ xWiki** |

**Rationale**: These are comprehensive architectural references that serve as specifications. While they were recently updated during consolidation (Phase 2), they now represent stable architectural decisions.

#### 📝 Keep as .md (Active Development): 4 files

| File | Size | Assessment | Action |
|------|------|------------|--------|
| **Calculations.md** | 26K | Active: verdict calculation logic, frequently tweaked | **KEEP .md** |
| **Evidence_Quality_Filtering.md** | 42K | Active: evolving filter rules and classification | **KEEP .md** |
| **Prompt_Architecture.md** | 13K | Active: prompt engineering guidance, updated frequently | **KEEP .md** |
| **Context_Detection_via_EvidenceScope.md** | 17K | Possibly superseded by Context_and_EvidenceScope_Detection_Guide.md | **REVIEW** |

**Rationale**: These documents contain implementation details that change as the system evolves. Keep as .md for agile editing.

#### 📦 Archive: 1 file

| File | Size | Assessment | Recommendation |
|------|------|------------|----------------|
| **Source_Reliability_Prompt_Improvements.md** | 11K | Historical v1.1 implementation changelog (2026-01-24) | **Archive** as historical record |

**Decision**: This is NOT a duplicate. It's a detailed implementation changelog for v1.1 with before/after examples, testing recommendations, and rollout strategy. Source_Reliability.md covers all versions as operational documentation. Archive as historical implementation record.

---

### 📁 DEPLOYMENT/ (1 file) - **Move to xWiki**

| File | Size | Assessment | Action |
|------|------|------------|--------|
| **Zero_Cost_Hosting_Guide.md** | 25K | Deployment guide - stable reference | **→ xWiki** |

**Rationale**: Deployment guides are stable reference documentation suitable for xWiki.

---

### 📁 DEVELOPMENT/ (5 files) - **MIXED**

#### ✅ Move to xWiki: 3 files

| File | Size | Assessment | Action |
|------|------|------------|--------|
| **Coding_Guidelines.md** | 14K | Coding standards - stable guidelines | **→ xWiki** |
| **Scope_Definition_Guidelines.md** | 23K | EvidenceScope guidelines - stable reference | **→ xWiki** |
| **TESTING_STRATEGY.md** | 7K | Testing strategy - stable methodology | **→ xWiki** |

#### 📝 Keep as .md: 2 files

| File | Size | Assessment | Action |
|------|------|------------|--------|
| **CI_CD_Test_Setup_Guide.md** | 12K | Setup instructions - may change with tooling | **KEEP .md** |
| **Coding Agent Prompts.md** | 12K | AI agent prompt configuration | **KEEP .md** |

**Note**: "Coding Agent Prompts.md" is agent configuration, similar to AGENTS/ directory - keep as .md.

---

### 📁 REFERENCE/ (5 files) - **ALL Move to xWiki**

| File | Size | Last Updated | Assessment | Action |
|------|------|--------------|------------|--------|
| **TERMINOLOGY.md** | 21K | 2026-02-04 | v3.1 complete - stable reference | **→ xWiki** |
| **Provider_Prompt_Formatting.md** | 19K | 2026-02-03 | Provider-specific formatting - stable | **→ xWiki** |
| **Provider_Prompt_Guidelines.md** | 11K | Prompt engineering guidelines | **→ xWiki** |
| **LLM_Schema_Mapping.md** | 13K | Schema mapping reference | **→ xWiki** |
| **METRICS_SCHEMA.md** | 6.7K | Metrics schema definition | **→ xWiki** |

**Rationale**: These are all technical reference documents with stable content. Perfect for xWiki consolidation.

---

### 📁 USER_GUIDES/ (7 files) - **MIXED**

#### ✅ Move to xWiki: 5 files

| File | Size | Last Updated | Assessment | Action |
|------|------|--------------|------------|--------|
| **Getting_Started.md** | 11K | 2026-02-05 | Getting started guide - stable | **→ xWiki** |
| **LLM_Configuration.md** | 17K | 2026-02-03 | LLM configuration guide - stable | **→ xWiki** |
| **Admin_Interface.md** | 8.1K | Admin UI guide - stable | **→ xWiki** |
| **Promptfoo_Testing.md** | 12K | 2026-02-02 | Testing guide - stable methodology | **→ xWiki** |
| **Source_Reliability_Export.md** | 3.1K | SR export guide - stable | **→ xWiki** |

#### 📝 Keep as .md: 2 files

| File | Size | Assessment | Action |
|------|------|------------|--------|
| **Unified_Config_Management.md** | 29K | UCM user guide - frequently updated with features | **KEEP .md** |
| **UCM_Administrator_Handbook.md** | 76K | Large UCM handbook - active development | **KEEP .md** |

**Rationale**: UCM documentation is actively evolving with new features. Keep as .md until feature-complete.

---

## Consolidation Summary

### By Action Type

| Action | Count | Files |
|--------|-------|-------|
| **→ xWiki** | **23 files** | Stable reference documentation |
| **Keep .md** | **17 files** | Dynamic/frequently edited content |
| **→ Archive** | **1 file** | Historical implementation doc |
| **Total** | **37 files** | (all decisions complete) |

### By Directory

| Directory | Total | → xWiki | Keep .md | Review |
|-----------|-------|---------|----------|--------|
| AGENTS | 7 | 0 | 7 | 0 |
| ARCHITECTURE | 12 | 7 | 4 | 1 (archive) |
| DEPLOYMENT | 1 | 1 | 0 | 0 |
| DEVELOPMENT | 5 | 3 | 2 | 0 |
| REFERENCE | 5 | 5 | 0 | 0 |
| USER_GUIDES | 7 | 5 | 2 | 0 |
| **TOTAL** | **37** | **23** | **17** | **1** (archive) |

---

## Files to Move to xWiki (23 files)

### Architecture (7 files)
1. Overview.md
2. Context_and_EvidenceScope_Detection_Guide.md
3. Quality_Gates_Reference.md
4. Source_Reliability.md
5. KeyFactors_Design.md
6. Schema_Migration_Strategy.md
7. Pipeline_TriplePath_Architecture.md

### Deployment (1 file)
8. Zero_Cost_Hosting_Guide.md

### Development (3 files)
9. Coding_Guidelines.md
10. Scope_Definition_Guidelines.md
11. TESTING_STRATEGY.md

### Reference (5 files)
12. TERMINOLOGY.md
13. Provider_Prompt_Formatting.md
14. Provider_Prompt_Guidelines.md
15. LLM_Schema_Mapping.md
16. METRICS_SCHEMA.md

### User Guides (5 files)
17. Getting_Started.md
18. LLM_Configuration.md
19. Admin_Interface.md
20. Promptfoo_Testing.md
21. Source_Reliability_Export.md

---

## Files to Keep as .md (16 files)

### AGENTS (7 files) - All operational workflow docs
1. AGENTS_xWiki.md
2. GlobalMasterKnowledge_for_xWiki.md
3. InitializeFHchat_for_xWiki.md
4. Mermaid_ERD_Quick_Reference.md
5. Multi_Agent_Collaboration_Rules.md
6. Multi_Agent_Meta_Prompt.md
7. Role_Code_Review_Agent.md

### Architecture (4 files) - Active development
8. Calculations.md
9. Evidence_Quality_Filtering.md
10. Prompt_Architecture.md
11. Context_Detection_via_EvidenceScope.md (pending review)

### Development (2 files) - Setup & agent configuration
12. CI_CD_Test_Setup_Guide.md
13. Coding Agent Prompts.md

### User Guides (2 files) - Active feature development
14. Unified_Config_Management.md
15. UCM_Administrator_Handbook.md

---

## Files Requiring Special Handling (1 file)

### Historical Implementation Documentation

1. **Docs/ARCHITECTURE/Source_Reliability_Prompt_Improvements.md** (11K)
   - **Type**: Historical implementation changelog (v1.1 prompt improvements, 2026-01-24)
   - **Decision**: **Move to ARCHIVE** (not a duplicate, but historical record)
   - **Rationale**: This is a point-in-time implementation document with before/after details of 10 specific v1.1 changes. Source_Reliability.md is the living operational documentation that includes v1.1 as one section among many versions.
   - **Action**: Archive as `Docs/ARCHIVE/REVIEWS/Source_Reliability_v1.1_Prompt_Improvements.md`

**Note**: The earlier "Coding_Standards.md" was a misidentification - the actual file is "Coding Agent Prompts.md" (agent configuration, keep as .md).

---

## Proposed xWiki Structure

Based on the TECH_WRITER_START_HERE.md suggested structure, here's the proposed organization:

```
FactHarbor/
├── Specification/
│   ├── Architecture/
│   │   ├── Overview
│   │   ├── Pipeline Architecture (TriplePath)
│   │   ├── Context & EvidenceScope Detection
│   │   ├── Source Reliability System
│   │   ├── KeyFactors Design
│   │   ├── Quality Gates Reference
│   │   └── Schema Migration Strategy
│   ├── Data Models/
│   │   ├── LLM Schema Mapping
│   │   ├── Metrics Schema
│   │   └── Terminology Reference
│   └── Guidelines/
│       ├── Coding Guidelines
│       ├── Scope Definition Guidelines
│       ├── Provider Prompt Formatting
│       ├── Provider Prompt Guidelines
│       └── Testing Strategy
├── Deployment/
│   └── Zero Cost Hosting Guide
└── User Guides/
    ├── Getting Started
    ├── Admin Interface
    ├── LLM Configuration
    ├── Promptfoo Testing
    └── Source Reliability Export
```

**Note**: Existing xWiki content (113 pages) will need to be integrated with this structure in Phase 2.

---

## Risks & Considerations

### Risk 1: Recent Documentation Consolidation (Feb 2-4, 2026)
- **Issue**: Major doc consolidation just completed (Phases 2-4)
- **Impact**: Files like Context_and_EvidenceScope_Detection_Guide.md and Quality_Gates_Reference.md are brand new consolidations
- **Mitigation**: These are now stable reference docs - good candidates for xWiki

### Risk 2: Active Development on Architecture Docs
- **Issue**: Calculations.md, Evidence_Quality_Filtering.md change frequently
- **Impact**: Moving to xWiki would slow iteration
- **Decision**: Keep as .md for now, reassess when features stabilize

### Risk 3: UCM Documentation Size
- **Issue**: UCM_Administrator_Handbook.md is 76K (very large)
- **Impact**: May need chunking if moved to xWiki
- **Decision**: Keep as .md until UCM feature-complete, then chunk for xWiki

### Risk 4: Cross-References
- **Issue**: Many files have internal cross-references
- **Impact**: Links will break when moving to xWiki
- **Mitigation**: Phase 3 will update all cross-references

---

## Next Steps (Phase 2)

### Immediate Actions Needed

1. **Project Lead Review** (1-2 hours)
   - Approve/modify the 23-file move-to-xWiki list
   - Resolve the 2 duplicate/review cases
   - Approve proposed xWiki structure

2. **Duplicate Resolution** (30 min)
   - Compare Source_Reliability_Prompt_Improvements.md vs Source_Reliability.md
   - Compare Coding_Standards.md vs Coding_Guidelines.md
   - Decision: Archive, merge, or keep separate

3. **Phase 2 Planning** (2-3 hours)
   - Map 23 files to proposed xWiki structure
   - Plan content consolidation approach
   - Design migration workflow

### Questions for Project Lead

1. **xWiki Structure**: Approve proposed structure or suggest modifications?
2. **Timing**: Proceed with Phase 2 immediately, or wait for review?
3. **UCM Docs**: Keep UCM docs as .md indefinitely, or plan eventual migration?
4. **AGENTS/**: Confirm AGENTS/ should stay outside xWiki (operational docs)?
5. **Duplicates**: How to handle the 2 potential duplicate files?

---

## Estimated Effort (Phases 2-4)

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 2** | Propose xWiki structure + plan | 2-3 hours |
| **Phase 3** | Consolidate 23 files to xWiki | 8-12 hours |
| **Phase 4** | Convert to XAR | 1 hour |
| **Total** | | **11-16 hours** |

---

## Appendix: Git Activity Analysis

Recent commits (since 2026-01-29) show heavy documentation activity:

**Recent Documentation Work**:
- 2026-02-05: v2.10.2 completion, EvidenceScope terminology updates
- 2026-02-04: Documentation consolidation (Phases 2-4), v3.1 terminology cleanup
- 2026-02-03: Documentation improvement plan fixes
- 2026-02-02: UCM documentation cleanup, terminology alignment
- 2026-01-31: UCM Admin Handbook, UCM v2.10.0 updates
- 2026-01-29-30: Evidence Quality Filtering, UCM user guide, Provider Prompt Formatting

**Implication**: Many docs are freshly consolidated and now stable. Good timing for xWiki migration.

---

**Document Status**: ✅ Ready for Project Lead Review
**Next Action**: Await approval to proceed to Phase 2
**Contact**: Project Lead for decisions on duplicates and structure approval

---

**Prepared by**: Claude Sonnet 4.5 (Tech Writer Agent)
**Date**: 2026-02-06
**Phase**: 1 of 4 (Complete)

# Documentation Consolidation Plan - Phase 2

**Date**: 2026-02-06
**Agent**: Claude Sonnet 4.5 (Tech Writer)
**Status**: Ready for Project Lead Approval
**Phase**: 2 of 4

---

## Executive Summary

This document provides the detailed xWiki structure and consolidation strategy for moving **23 stable reference documents** (.md files) into the existing xWiki pages.

### Key Decisions

1. **Integration Strategy**: Add new pages to existing xWiki structure rather than restructuring
2. **Location**: Most docs fit naturally under existing "Specification/" hierarchy
3. **New Sections**: Create 3 new top-level sections under Specification/
   - **Implementation/** (architecture docs for POC1 implementation)
   - **Development/** (coding guidelines, testing strategy)
   - **Reference/** (technical reference materials)
4. **Preservation**: Keep existing structure intact, minimal disruption

---

## Current xWiki Structure Analysis

### FactHarbor_Spec_and_Impl/ (75 pages)

```
FactHarbor/
├── FH Analysis Reports/ (example analyses)
├── License and Disclaimer/
├── Roadmap/
│   ├── Development Guidance/
│   │   ├── 1st Run Checklist
│   │   ├── Installation Checklist
│   │   ├── Source Reliability Bundle
│   │   └── Tools Decisions
│   ├── POC1, POC2, Beta0, V10 (milestones)
│   ├── Architecture Analysis
│   ├── Requirements-Roadmap-Matrix
│   └── Zero-Cost Hosting Implementation Guide
└── Specification/
    ├── AI Knowledge Extraction Layer (AKEL)/
    ├── Architecture/ (high-level spec architecture)
    ├── Automation/
    ├── Data Model/
    ├── Diagrams/ (20+ diagram pages)
    ├── Examples/
    ├── FAQ/
    ├── Federation & Decentralization/
    ├── POC/
    │   └── API-and-Schemas/
    ├── Requirements/
    │   ├── Roles/
    │   └── User Needs/
    ├── Review & Data Use/
    └── Workflows/
```

### FactHarbor_Org/ (38 pages)

```
FactHarbor/
├── License and Disclaimer/
└── Organisation/
    ├── Automation-Philosophy
    ├── CLA, Contributor-Processes
    ├── Competitive Analysis/
    ├── Cooperation Opportunities/
    ├── Core Problems FactHarbor Solves/
    ├── Decision-Processes
    ├── Diagrams/ (governance, domain interaction)
    ├── Finance-Compliance
    ├── Governance/
    └── How-We-Work-Together/
```

---

## Proposed xWiki Structure (Enhanced)

Add **3 new top-level sections** under FactHarbor/Specification/:

```
Specification/
├── [Existing sections unchanged...]
├── Implementation/ ★ NEW
│   ├── Architecture Overview (Overview.md)
│   ├── Pipeline Architecture/
│   │   ├── TriplePath Architecture (Pipeline_TriplePath_Architecture.md)
│   │   ├── Context & EvidenceScope Detection (Context_and_EvidenceScope_Detection_Guide.md)
│   │   └── Quality Gates Reference (Quality_Gates_Reference.md)
│   ├── Source Reliability System/ (Source_Reliability.md)
│   ├── KeyFactors Design/ (KeyFactors_Design.md)
│   └── Schema Migration Strategy/ (Schema_Migration_Strategy.md)
├── Development/ ★ NEW
│   ├── Guidelines/
│   │   ├── Coding Guidelines (Coding_Guidelines.md)
│   │   ├── Scope Definition Guidelines (Scope_Definition_Guidelines.md)
│   │   └── Testing Strategy (TESTING_STRATEGY.md)
│   └── Deployment/
│       └── Zero-Cost Hosting Guide (Zero_Cost_Hosting_Guide.md)
└── Reference/ ★ NEW
    ├── Terminology (TERMINOLOGY.md)
    ├── Data Models & Schemas/
    │   ├── LLM Schema Mapping (LLM_Schema_Mapping.md)
    │   └── Metrics Schema (METRICS_SCHEMA.md)
    └── Prompt Engineering/
        ├── Provider-Specific Formatting (Provider_Prompt_Formatting.md)
        └── Prompt Guidelines (Provider_Prompt_Guidelines.md)
```

**Plus**: User Guides section (new space or under Roadmap/):

```
User Guides/ ★ NEW (could be separate space or under Roadmap/)
├── Getting Started (Getting_Started.md)
├── Admin Interface (Admin_Interface.md)
├── LLM Configuration (LLM_Configuration.md)
├── Promptfoo Testing (Promptfoo_Testing.md)
└── Source Reliability Export (Source_Reliability_Export.md)
```

---

## File Mapping: 23 Files to xWiki Pages

### Group 1: Implementation Architecture (7 files)

**Target**: `Specification/Implementation/`

| # | Source File | Target xWiki Page | Rationale |
|---|-------------|-------------------|-----------|
| 1 | ARCHITECTURE/Overview.md | Specification/Architecture/System Design | Comprehensive POC1 implementation architecture |
| 2 | ARCHITECTURE/Pipeline_TriplePath_Architecture.md | Specification/Architecture/Deep Dive/Pipeline Variants | Pipeline variants reference |
| 3 | ARCHITECTURE/Context_and_EvidenceScope_Detection_Guide.md | Specification/Architecture/Deep Dive/Context Detection | Detection methodology |
| 4 | ARCHITECTURE/Quality_Gates_Reference.md | Specification/Architecture/Deep Dive/Quality Gates | Gate 1 & 4 reference |
| 5 | ARCHITECTURE/Source_Reliability.md | Specification/Architecture/Deep Dive/Source Reliability | SR system documentation |
| 6 | ARCHITECTURE/KeyFactors_Design.md | Specification/Architecture/Deep Dive/KeyFactors Design | KeyFactor classification design |
| 7 | ARCHITECTURE/Schema_Migration_Strategy.md | Specification/Architecture/Deep Dive/Schema Migration | Migration patterns |

---

### Group 2: Development Guidelines (3 files)

**Target**: `Specification/Development/Guidelines/`

| # | Source File | Target xWiki Page | Rationale |
|---|-------------|-------------------|-----------|
| 8 | DEVELOPMENT/Coding_Guidelines.md | Specification/Development/Guidelines/Coding Guidelines | Coding standards |
| 9 | DEVELOPMENT/Scope_Definition_Guidelines.md | Specification/Development/Guidelines/Scope Definition Guidelines | EvidenceScope guidelines |
| 10 | DEVELOPMENT/TESTING_STRATEGY.md | Specification/Development/Guidelines/Testing Strategy | Testing methodology |

---

### Group 3: Deployment (1 file)

**Target**: `Specification/Development/Deployment/`

| # | Source File | Target xWiki Page | Rationale |
|---|-------------|-------------------|-----------|
| 11 | DEPLOYMENT/Zero_Cost_Hosting_Guide.md | Specification/Development/Deployment/Zero-Cost Hosting Guide | Deployment guide (complements existing Roadmap/Zero-Cost Hosting Implementation Guide) |

**Note**: Existing page "Roadmap/Zero-Cost Hosting Implementation Guide" may overlap - need to compare/merge in Phase 3.

---

### Group 4: Technical Reference (5 files)

**Target**: `Specification/Reference/`

| # | Source File | Target xWiki Page | Rationale |
|---|-------------|-------------------|-----------|
| 12 | REFERENCE/TERMINOLOGY.md | Specification/Reference/Terminology | v3.1 terminology reference |
| 13 | REFERENCE/LLM_Schema_Mapping.md | Specification/Reference/Data Models & Schemas/LLM Schema Mapping | Schema mapping reference |
| 14 | REFERENCE/METRICS_SCHEMA.md | Specification/Reference/Data Models & Schemas/Metrics Schema | Metrics schema definition |
| 15 | REFERENCE/Provider_Prompt_Formatting.md | Specification/Reference/Prompt Engineering/Provider-Specific Formatting | Provider formatting rules |
| 16 | REFERENCE/Provider_Prompt_Guidelines.md | Specification/Reference/Prompt Engineering/Prompt Guidelines | Prompt engineering guidelines |

---

### Group 5: User Guides (5 files)

**Decision Needed**: Create new "User Guides" space or place under Roadmap/Development Guidance/?

**Option A** (Recommended): New top-level section `User Guides/` in FactHarbor_Spec_and_Impl

**Option B**: Place under `Roadmap/Development Guidance/User Guides/`

| # | Source File | Target xWiki Page | Rationale |
|---|-------------|-------------------|-----------|
| 17 | USER_GUIDES/Getting_Started.md | User Guides/Getting Started | Getting started guide |
| 18 | USER_GUIDES/Admin_Interface.md | User Guides/Admin Interface | Admin UI guide |
| 19 | USER_GUIDES/LLM_Configuration.md | User Guides/LLM Configuration | LLM configuration guide |
| 20 | USER_GUIDES/Promptfoo_Testing.md | User Guides/Promptfoo Testing | Testing guide |
| 21 | USER_GUIDES/Source_Reliability_Export.md | User Guides/Source Reliability Export | SR export guide |

**Note**: These are end-user operational guides, not specification. Separate section recommended.

---

## Consolidation Strategy

### Phase 3 Workflow

For each of the 23 files:

1. **Convert .md → xWiki**: Use conversion tool
2. **Create page structure**: Set up parent/child hierarchy
3. **Review content**: Check for .md-specific formatting issues
4. **Update internal links**: Fix cross-references to work in xWiki
5. **Add navigation**: Ensure page is reachable from parent pages
6. **Verify diagrams**: Confirm Mermaid diagrams render correctly

### Special Considerations

#### 1. Duplicate Content Check

**Potential overlap**:
- **Zero_Cost_Hosting_Guide.md** vs existing "Roadmap/Zero-Cost Hosting Implementation Guide"
  - **Action**: Compare both, merge if overlapping, or distinguish if different scopes
  - **Likely**: Implementation Guide = xWiki-specific setup, Hosting Guide = generic hosting

#### 2. Cross-Reference Updates

Many .md files have internal cross-references like:
```markdown
See [Quality Gates Reference](Quality_Gates_Reference.md)
```

These must be updated to xWiki links:
```xwiki
[[Specification.Architecture.Deep Dive.Quality Gates]]
```

**Affected files**: All 23 files have cross-references
**Strategy**: Phase 3 will systematically update all links

#### 3. Mermaid Diagram Conversion

xWiki uses `{{mermaid}}` macro, Markdown uses ` ```mermaid `.

**Conversion handled by**: xar-to-xwiki tool (automatic)

**Files with Mermaid diagrams** (12 files):
- Overview.md
- Pipeline_TriplePath_Architecture.md
- Context_and_EvidenceScope_Detection_Guide.md
- Quality_Gates_Reference.md
- Source_Reliability.md
- Evidence_Quality_Filtering.md (not moving, but reference)
- TERMINOLOGY.md
- LLM_Schema_Mapping.md
- Getting_Started.md
- LLM_Configuration.md
- Promptfoo_Testing.md
- Unified_Config_Management.md (not moving, but reference)

#### 4. Version Control

**Approach**:
- Keep original .md files in place initially (don't delete)
- Add note at top of .md: "⚠️ This document has been moved to xWiki: [link]"
- After successful Phase 4 (xWiki import verified), move .md files to ARCHIVE

---

## Page Hierarchy Design

### New Section: Implementation/

```
Specification/Implementation/
├── Architecture Overview (WebHome.xwiki)
├── Pipeline Architecture/
│   ├── TriplePath Architecture/ (WebHome.xwiki)
│   ├── Context & EvidenceScope Detection/ (WebHome.xwiki)
│   └── Quality Gates Reference/ (WebHome.xwiki)
├── Source Reliability System/ (WebHome.xwiki)
├── KeyFactors Design/ (WebHome.xwiki)
└── Schema Migration Strategy/ (WebHome.xwiki)
```

**WebHome.xwiki** for each folder acts as index/landing page.

### New Section: Development/

```
Specification/Development/
├── Guidelines/
│   ├── Coding Guidelines/ (WebHome.xwiki)
│   ├── Scope Definition Guidelines/ (WebHome.xwiki)
│   └── Testing Strategy/ (WebHome.xwiki)
└── Deployment/
    └── Zero-Cost Hosting Guide/ (WebHome.xwiki)
```

### New Section: Reference/

```
Specification/Reference/
├── Terminology/ (WebHome.xwiki)
├── Data Models & Schemas/
│   ├── LLM Schema Mapping/ (WebHome.xwiki)
│   └── Metrics Schema/ (WebHome.xwiki)
└── Prompt Engineering/
    ├── Provider-Specific Formatting/ (WebHome.xwiki)
    └── Prompt Guidelines/ (WebHome.xwiki)
```

### User Guides (Option A)

```
User Guides/ (new top-level in FactHarbor_Spec_and_Impl)
├── Getting Started/ (WebHome.xwiki)
├── Admin Interface/ (WebHome.xwiki)
├── LLM Configuration/ (WebHome.xwiki)
├── Promptfoo Testing/ (WebHome.xwiki)
└── Source Reliability Export/ (WebHome.xwiki)
```

---

## Cross-Reference Mapping

### High-Traffic Cross-References

Files that reference each other frequently:

| Source | Target | Link Text Example |
|--------|--------|-------------------|
| Overview.md → Quality_Gates_Reference.md | "See Quality Gates Reference" |
| Pipeline_TriplePath_Architecture.md → Context_and_EvidenceScope_Detection_Guide.md | "See Context Detection Guide" |
| Context_and_EvidenceScope_Detection_Guide.md → TERMINOLOGY.md | "See TERMINOLOGY.md" |
| Quality_Gates_Reference.md → Overview.md | "See Architecture Overview" |
| Source_Reliability.md → Schema_Migration_Strategy.md | "See Schema Migration Strategy" |

**Phase 3 Action**: Create xWiki link mapping table for systematic replacement.

---

## Conversion Tool Usage

### Step-by-Step Process (Phase 3)

For each file group:

1. **Prepare directory structure**:
   ```bash
   mkdir -p Docs/xwiki-pages/FactHarbor/Specification/Implementation
   mkdir -p Docs/xwiki-pages/FactHarbor/Specification/Development
   mkdir -p Docs/xwiki-pages/FactHarbor/Specification/Reference
   mkdir -p Docs/xwiki-pages/FactHarbor/User\ Guides
   ```

2. **Convert Markdown → xWiki** (manual or via tool):
   - Copy .md content
   - Convert Mermaid syntax: ` ```mermaid ` → `{{mermaid}}`
   - Convert headers: `#` → `=`, `##` → `==`, etc.
   - Convert bold/italic: `**text**` → `**text**`, `*text*` → `//text//`
   - Create `WebHome.xwiki` for each page

3. **Update cross-references**:
   - Find all `[text](file.md)` links
   - Replace with `[[Specification.Section.Page]]` xWiki links

4. **Create index pages**:
   - Each folder needs `WebHome.xwiki` as index
   - List child pages with brief descriptions

5. **Verify conversion**:
   - Check all diagrams render
   - Verify all links work
   - Confirm formatting is correct

---

## Risk Assessment

### Risk 1: Cross-Reference Complexity

**Issue**: 23 files have 50+ cross-references to each other
**Impact**: High effort to update all links
**Mitigation**:
- Create link mapping table in Phase 3
- Use search/replace systematically
- Test all links after conversion

**Estimated effort**: 3-4 hours for link updates

### Risk 2: Mermaid Diagram Conversion

**Issue**: 12 files contain Mermaid diagrams
**Impact**: Diagrams may not render if conversion fails
**Mitigation**:
- Test conversion with 1-2 files first
- Verify xWiki Mermaid macro is enabled
- Have fallback: convert to images if needed

**Estimated effort**: 1-2 hours for diagram testing/fixes

### Risk 3: User Guides Location Decision

**Issue**: No clear existing location for user guides
**Impact**: Structural decision needed
**Mitigation**:
- Recommend Option A (new top-level "User Guides" section)
- Get approval before proceeding

**Decision needed**: Project Lead approval

### Risk 4: Zero-Cost Hosting Guide Overlap

**Issue**: May overlap with existing xWiki page
**Impact**: Potential duplicate content
**Mitigation**:
- Phase 3 will compare both documents
- Merge if overlapping, or distinguish if different scopes

**Estimated effort**: 30 min comparison + decision

### Risk 5: Version 3.1 Terminology Update

**Issue**: TERMINOLOGY.md is v3.1 (just updated 2026-02-04)
**Impact**: xWiki may have older terminology
**Mitigation**:
- TERMINOLOGY.md is authoritative (latest)
- After moving to xWiki, update other xWiki pages to match v3.1 terminology

**Estimated effort**: Not in scope for Phase 3 (future work)

---

## Estimated Effort (Phase 3)

| Task | Time Estimate |
|------|---------------|
| **Setup**: Create directory structure | 30 min |
| **Conversion**: Convert 23 files .md → .xwiki | 4-6 hours |
| **Cross-references**: Update all internal links | 3-4 hours |
| **Navigation**: Create index pages (WebHome.xwiki) | 2 hours |
| **Diagrams**: Verify/fix Mermaid diagrams | 1-2 hours |
| **Review**: Content review and formatting fixes | 2-3 hours |
| **Testing**: Link testing and QA | 1 hour |
| **Total Phase 3** | **13-18 hours** |

**Phase 4** (Convert to XAR): 1 hour

**Total Phases 3-4**: 14-19 hours

---

## Approved Decisions (2026-02-06)

### Decision 1: User Guides Location - **Option A APPROVED**

New top-level section "User Guides/" in FactHarbor_Spec_and_Impl.

### Decision 2: Conversion Approach - **All at once APPROVED**

Convert all 23 files in a single Phase 3 pass.

### Decision 3: Original .md Files - **Keep with deprecation notice APPROVED**

Keep original .md files in place. Add a note at the top of each file with a link to the new .xwiki file location.

### Decision 4: Zero-Cost Hosting Guide - **Merge APPROVED**

Merge the .md content into the existing xWiki page "Roadmap/Zero-Cost Hosting Implementation Guide".

---

## Phase 3 Status: COMPLETE

**Started**: 2026-02-06
**Completed**: 2026-02-06
**Approach**: All at once conversion

### Phase 3 Tasks

1. [x] Create directory structure in xwiki-pages/
2. [x] Convert 20 files to xWiki format (+ merge 1 into existing page)
3. [x] Update cross-references (converted during file conversion)
4. [x] Create 9 index pages (WebHome.xwiki)
5. [x] Update existing Specification and FactHarbor WebHome navigation
6. [x] Add deprecation notices to 21 original .md files
7. [x] Ready for review

### Summary of Phase 3 Work

- **20 new xWiki content pages** created across 4 new sections
- **9 index/navigation pages** created (Implementation, Pipeline Architecture, Development, Guidelines, Deployment, Reference, Data Models, Prompt Engineering, User Guides)
- **1 existing page updated** (Zero-Cost Hosting - merged .md additions)
- **2 existing navigation pages updated** (Specification WebHome, FactHarbor WebHome)
- **21 deprecation notices** added to original .md files

### Phase 4 Tasks (Next)

1. Convert xwiki-pages/ tree to XAR
2. Notify project lead for import
3. Verify import in xWiki
4. Final cleanup

---

## Appendix A: xWiki Page Naming Conventions

**xWiki pages follow this structure:**
```
Space/Page/WebHome.xwiki
```

**Example**:
```
FactHarbor_Spec_and_Impl/
  FactHarbor/
    Specification/
      Implementation/
        Architecture Overview/
          WebHome.xwiki
```

**URL in xWiki**: `FactHarbor_Spec_and_Impl.FactHarbor.Specification.Implementation.ArchitectureOverview`

**Link syntax**: `[[Specification.Implementation.Architecture Overview]]`

---

## Appendix B: Markdown → xWiki Syntax Quick Reference

| Markdown | xWiki 2.1 |
|----------|-----------|
| `# H1` | `= H1 =` |
| `## H2` | `== H2 ==` |
| `**bold**` | `**bold**` |
| `*italic*` | `//italic//` |
| `` `code` `` | `##code##` |
| ` ```code block``` ` | `{{{code block}}}` |
| `[text](link)` | `[[text>>link]]` or `[[Page]]` |
| ` ```mermaid ` | `{{mermaid}}` |
| `- list` | `* list` |

---

**Document Status**: ✅ Phase 3 Complete - Ready for Phase 4 (XAR conversion)

---

**Prepared by**: Claude Sonnet 4.5 (Tech Writer Agent) / Claude Opus 4.6 (Phase 3 execution)
**Date**: 2026-02-06
**Phase**: 3 of 4 (Complete)

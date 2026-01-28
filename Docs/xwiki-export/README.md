# XWiki Export - FactHarbor POC1 Architecture Analysis

## XAR Packages

| File | Size | Type | Use Case |
|------|------|------|----------|
| `FactHarbor-POC1-Architecture-Analysis-Full.xar` | 9.1 KB | Full backup | Fresh install, archival, migration |
| `FactHarbor-POC1-Architecture-Terminology-Fix.xar` | 9.1 KB | Delta update | Updating existing wiki page |

Both packages contain **identical corrected content** from Phase 0 terminology fixes.

## Import Instructions

### For Existing Wiki:
1. Administration → Import
2. Upload: `FactHarbor-POC1-Architecture-Terminology-Fix.xar`
3. Select: "Add new version to existing page"
4. Import

### For New Wiki:
1. Administration → Import
2. Upload: `FactHarbor-POC1-Architecture-Analysis-Full.xar`
3. Select: "Import all"
4. Import

## Changes Applied (Phase 0)

### 1. Entity Name Standardization
- **Before:** Data Usage ERD used `EXTRACTED_FACT`
- **After:** Both ERDs now use `EVIDENCE` consistently

### 2. Field Rename
- **Before:** `fact` (field containing extracted statement text)
- **After:** `statement` (clearer, avoids confusion with entity name)

### 3. Category Value Fix
- **Before:** Category enum included `"evidence"` (circular naming)
- **After:** Changed to `"direct_evidence"`

### 4. Supporting IDs Rename
- **Before:** `supportingFactIds`
- **After:** `supportingEvidenceIds`

### 5. Documentation Added
- Added terminology info box at document top
- Links to `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md` for migration plans
- Updated "Last Modified" to 2026-01-28

## Package Contents

**Page:** `Docs.FactHarbor POC1 Architecture Analysis`
**Version:** 2.6.17
**Export Date:** 2026-01-28

**8 Mermaid Diagrams:**
1. AKEL Flow Diagram (with LLM interactions)
2. Data Objects ERD ✅ (corrected)
3. Data Usage ERD ✅ (corrected)
4. Overall Architecture with Interactions
5. Cost Distribution Pie Chart
6. Timeline Gantt Chart
7. Current Architecture Flowchart
8. Proposed Separated Architecture Flowchart

**7 Document Sections:**
1. AKEL Flow Diagram (with LLM and WebSearch Interactions)
2. ERD Data Model (Current POC1 Implementation)
3. Overall Architecture with Interactions
4. Specification vs Implementation Gap Analysis
5. Optimization Recommendations
6. Separated Verdict Architecture Proposal
7. Summary

## Related Files

- **Source xWiki:** `../FactHarbor POC1 Architecture Analysis.xwiki`
- **Markdown version:** `../FactHarbor POC1 Architecture Analysis.md`
- **Audit document:** `../REVIEWS/Terminology_Audit_Fact_Entity.md`

## Phase Status

- ✅ **Phase 0** (Documentation) - Complete
- ⏸️ **Phase 1** (Code comments) - Waiting for other changes
- ⏸️ **Phase 2** (Alias + gradual migration) - Future
- ⏸️ **Phase 3** (Full rename at v3.0) - Future

## Verification

After import, verify corrections:
```bash
# Entity name check
grep "EVIDENCE" page_content  # Should find multiple instances
grep "EXTRACTED_FACT" page_content  # Should find 0 in ERD definitions

# Field name check
grep 'string statement "The extracted statement text"' page_content  # Should find 2
```

---

**Export Metadata:**
- Package Version: 2.6.17-terminology-fix
- Schema Version: 2.6.17
- Created: 2026-01-28
- Status: Ready for import

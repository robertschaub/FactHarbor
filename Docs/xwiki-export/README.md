# XWiki Export - Terminology Fix for FactHarbor POC1 Architecture

## Contents

This delta export contains the corrected version of the **FactHarbor POC1 Architecture Analysis** document with terminology standardization applied.

**File:** `FactHarbor-POC1-Architecture-Terminology-Fix.xar` (9.1 KB)

## Changes Applied

### 1. Entity Name Standardization
- **Before:** ERDs used both `EVIDENCE` and `EXTRACTED_FACT` for the same entity
- **After:** Both ERDs now consistently use `EVIDENCE`

### 2. Field Name Correction
- **Before:** Field named `fact` (string containing the extracted text)
- **After:** Field renamed to `statement` to avoid confusion with "fact" terminology

### 3. Category Value Update
- **Before:** Category enum included `"evidence"` (circular naming)
- **After:** Changed to `"direct_evidence"` to avoid self-reference

### 4. Documentation Enhancement
- Added terminology note explaining the `EVIDENCE` vs `ExtractedFact` naming
- Links to [Terminology_Audit_Fact_Entity.md](../REVIEWS/Terminology_Audit_Fact_Entity.md) for migration plans
- Updated "Last Updated" date to 2026-01-28

## How to Import

### In XWiki:
1. Go to Administration → Import
2. Upload `FactHarbor-POC1-Architecture-Terminology-Fix.xar`
3. Select the page to import: `Docs.FactHarbor POC1 Architecture Analysis`
4. Choose "Add new version" or "Replace" depending on your needs
5. Click "Import"

## Affected Sections

The following sections contain corrected terminology:

- **Section 2: ERD Data Model (Current POC1 Implementation)**
  - Data Objects ERD
  - Data Usage ERD
- **Section 4.1: Data Model Gaps**
  - Evidence entity row updated
- **Terminology Note** (new)
  - Added info box at document top

## Related Files

- **Source xWiki:** `Docs/FactHarbor POC1 Architecture Analysis.xwiki`
- **Markdown version:** `Docs/FactHarbor POC1 Architecture Analysis.md`
- **Audit document:** `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md`

## Version

- **Package Version:** 2.6.17-terminology-fix
- **Schema Version:** 2.6.17
- **Export Date:** 2026-01-28

## Technical Details

### XAR Structure
```
FactHarbor-POC1-Architecture-Terminology-Fix.xar (ZIP archive)
├── package.xml                                     # XAR manifest
└── Docs.FactHarbor_POC1_Architecture_Analysis.xml  # Page content
```

### Mermaid Diagrams Included
All 8 Mermaid diagrams are included with corrections:
1. AKEL Flow Diagram
2. Data Objects ERD ✓ (corrected)
3. Data Usage ERD ✓ (corrected)
4. Overall Architecture
5. Cost Distribution Pie Chart
6. Timeline Gantt Chart
7. Current Architecture Flowchart
8. Proposed Separated Architecture Flowchart

## Notes

- This is a **delta export** containing only the changed page
- No code changes are included (this is documentation-only)
- The actual TypeScript code still uses `ExtractedFact` (see audit doc for migration plan)
- XAR files are standard ZIP archives and can be inspected with any ZIP tool

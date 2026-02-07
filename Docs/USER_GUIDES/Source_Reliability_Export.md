> **MOVED TO xWiki** (2026-02-06)
> 
> This document has been consolidated into the xWiki documentation system.
> The xWiki version is now the authoritative source.
> 
> **xWiki file**: `Docs/xwiki-pages/FactHarbor_Spec_and_Impl/FactHarbor/User Guides/Source Reliability Export/WebHome.xwiki`
> 
> This .md file is kept for reference only. Do not edit - edit the .xwiki file instead.

---


# Source Reliability Export Guide

**Version**: 2.6.38  
**Last Updated**: January 26, 2026

---

## Overview

The Source Reliability admin page includes export functionality for source evaluation data. You can export individual source evaluations in multiple formats for documentation, review, or archival purposes.

---

## Accessing Export Features

1. Navigate to `/admin/source-reliability`
2. Click the "View" button (eye icon) on any cached source entry
3. The Source Evaluation Details modal opens with export buttons in the footer

---

## Export Formats

### Print / PDF
- Opens browser's native print dialog
- Can save as PDF from the print dialog
- Optimized print layout hides navigation elements
- Score badges preserve colors

**Use case**: Quick printouts for meetings or filing

### HTML Export
- Downloads a standalone HTML file
- Embedded CSS for consistent appearance
- All evaluation data included:
  - Domain and score with color-coded badge
  - Confidence level
  - Category and bias indicator
  - LLM reasoning
  - Evidence cited (parsed and formatted)
  - Evidence pack with source links
  - Model information and consensus status
  - Cache metadata

**Filename format**: `{domain}_source_eval_{YYYYMMDD_HHMMSS}.html`

**Use case**: Sharing evaluations via email, archival

### Markdown Export
- Downloads a formatted .md file
- Tables for structured data (summary, models, cache info)
- Blockquotes for LLM reasoning
- Lists for evidence

**Filename format**: `{domain}_source_eval_{YYYYMMDD_HHMMSS}.md`

**Use case**: Documentation, version control, wikis

### JSON Export
- Downloads structured JSON data
- Complete `CachedScore` object
- Parsed JSON fields (evidenceCited, evidencePack)
- Export metadata included
- Pretty-printed with 2-space indentation

**Filename format**: `{domain}_source_eval_{YYYYMMDD_HHMMSS}.json`

**Use case**: Data analysis, API integration, backups

---

## Exported Data Fields

All export formats include:

| Field | Description |
|-------|-------------|
| Domain | The evaluated source domain |
| Score | Reliability score (0-100) |
| Confidence | LLM confidence in the evaluation |
| Category | Source category (news, academic, etc.) |
| Bias | Detected bias indicator |
| Reasoning | LLM's reasoning for the score |
| Evidence Cited | Specific facts the LLM used |
| Evidence Pack | Source URLs consulted |
| Primary Model | Main LLM used for evaluation |
| Secondary Model | Verification LLM (if multi-model enabled) |
| Consensus | Whether models agreed |
| Evaluated At | When the evaluation was performed |
| Expires At | When the cached evaluation expires |

---

## Known Limitations

1. Print functionality depends on browser's print dialog capabilities
2. Score badge colors in print may vary based on browser's color handling
3. Very long URLs in evidence pack may wrap in print view
4. Export is limited to the currently selected entry (no bulk export)

---

## Related Documentation

- [Admin Interface Guide](Admin_Interface.md) - Overview of admin features
- [LLM Configuration Guide](LLM_Configuration.md) - Source reliability settings

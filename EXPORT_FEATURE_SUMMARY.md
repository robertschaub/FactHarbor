# Source Evaluation Export Feature - Implementation Summary

## Overview
Added print and export functionality to the Source Evaluation Details modal in the admin source reliability page. Users can now export source evaluation data in multiple formats.

## Implementation Date
January 26, 2026

## Features Added

### 1. Export Buttons
Added four export buttons to the modal footer:
- 🖨️ **Print** - Opens browser print dialog for printing or saving as PDF
- 📄 **HTML** - Downloads a standalone HTML report
- 📝 **Markdown** - Downloads a formatted Markdown document
- 💾 **JSON** - Downloads structured JSON data

### 2. Export Formats

#### Print/PDF Export
- Triggers browser's native print dialog
- Optimized print styles hide navigation and UI elements
- Shows only the modal content in a clean layout
- Score badges preserve colors using `print-color-adjust: exact`
- Page breaks are avoided within sections for better readability

#### HTML Export
- Complete standalone HTML document
- Embedded CSS styles for consistent appearance
- Includes all evaluation data:
  - Domain and score with color-coded badge
  - Confidence level
  - Category and bias indicator
  - LLM reasoning
  - Evidence cited (parsed and formatted)
  - Evidence pack with source links
  - Model information and consensus status
  - Cache metadata (evaluation/expiration dates)
- Filename format: `{domain}_source_eval_{timestamp}.html`

#### Markdown Export
- Clean, readable Markdown format
- Tables for structured data (summary, models, cache info)
- Blockquotes for LLM reasoning
- Numbered lists for evidence cited
- Bulleted lists with links for evidence pack
- Filename format: `{domain}_source_eval_{timestamp}.md`

#### JSON Export
- Complete `CachedScore` object data
- Parsed JSON fields (evidenceCited, evidencePack)
- Additional metadata: export timestamp and source system
- Pretty-printed with 2-space indentation
- Filename format: `{domain}_source_eval_{timestamp}.json`

## Technical Implementation

### Files Modified

1. **apps/web/src/app/admin/source-reliability/page.tsx**
   - Added utility functions:
     - `sanitizeDomain()` - Cleans domain names for filenames
     - `getDateTimeString()` - Generates timestamp for filenames
     - `downloadFile()` - Generic file download handler
   - Added export handlers:
     - `handlePrintModal()` - Print functionality
     - `handleExportModalHTML()` - HTML generation and download
     - `handleExportModalMarkdown()` - Markdown generation and download
     - `handleExportModalJSON()` - JSON export with parsed fields
   - Updated modal footer with export button row

2. **apps/web/src/app/admin/source-reliability/source-reliability.module.css**
   - Added `.exportButtons` styles for button layout
   - Added `@media print` rules for optimized print layout
   - Print styles hide UI elements and preserve only modal content

### Code Quality
- No linter errors
- Follows existing patterns from job export functionality
- Safe JSON parsing with try/catch blocks
- Consistent filename sanitization
- TypeScript type safety maintained

## Usage Instructions

### For Users
1. Navigate to `/admin/source-reliability`
2. Click the "View" button (👁️) on any cached source entry
3. The Source Evaluation Details modal opens
4. Click any of the four export buttons in the modal footer:
   - **Print**: Opens print dialog (can save as PDF from browser)
   - **HTML**: Downloads a self-contained HTML file
   - **Markdown**: Downloads a .md file
   - **JSON**: Downloads a .json file
5. Files are downloaded with descriptive names including the domain and timestamp

### For Developers
The export functionality is self-contained within the admin page component. The implementation follows these patterns:

```typescript
// Filename pattern
{sanitized_domain}_source_eval_{YYYYMMDD_HHMMSS}.{ext}

// Example
nytimes.com_source_eval_20260126_161423.html
```

## Testing Checklist

To verify the implementation works correctly:

- [ ] Navigate to `/admin/source-reliability` page
- [ ] Click "View" on a cached source entry to open the modal
- [ ] Verify export buttons are visible in the modal footer
- [ ] Test Print button - opens print dialog
- [ ] Test HTML export - downloads file, open in browser to verify formatting
- [ ] Test Markdown export - downloads file, verify content is readable
- [ ] Test JSON export - downloads file, verify valid JSON structure
- [ ] Test with sources that have:
  - [ ] Evidence cited data
  - [ ] Evidence pack data
  - [ ] Secondary models and consensus
  - [ ] Fallback scenarios
  - [ ] Long reasoning text
- [ ] Verify print layout hides unnecessary UI elements
- [ ] Verify exported filenames are properly sanitized

## Known Limitations

1. Print functionality depends on browser's print dialog capabilities
2. Score badge colors in print may vary based on browser's color handling
3. Very long URLs in evidence pack may wrap in print view
4. Export is limited to the currently selected entry (no bulk export)

## Future Enhancements (Optional)

- Bulk export functionality for multiple sources
- PDF generation using a library (jsPDF) for more control
- CSV export for tabular data
- Custom export templates
- Email/share functionality
- Print preview before actual print

## Compliance with Project Guidelines

✅ **Generic by Design**: No domain-specific hardcoding  
✅ **Input Neutrality**: Works with any source evaluation data  
✅ **Pipeline Integrity**: No changes to analysis pipeline  
✅ **Architecture**: UI-only changes, no backend modifications  
✅ **Safety**: Read-only operations, no data modification  
✅ **Code Style**: Follows existing patterns and conventions  
✅ **Documentation**: This summary provides complete documentation

## Related Files

- Implementation: `apps/web/src/app/admin/source-reliability/page.tsx`
- Styles: `apps/web/src/app/admin/source-reliability/source-reliability.module.css`
- Reference: `apps/web/src/app/jobs/[id]/page.tsx` (existing export patterns)

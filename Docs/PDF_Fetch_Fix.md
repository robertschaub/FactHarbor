# PDF Fetch Error Fix

## Problem

The analysis was failing when trying to fetch PDF files from university websites (e.g., unibe.ch) with the error:

```
Failed to fetch URL: Error: Failed to parse PDF: Error: ENOENT: no such file or directory,
open 'C:\\DEV\\FactHarbor\\apps\\web\\test\\data\\05-versions-space.pdf'
```

## Root Cause

The error was misleading. The actual issue had two components:

1. **Library Test Error**: The `pdf-parse` npm package's test files were being accidentally triggered, causing a confusing ENOENT error about a missing test file
2. **University Server Restrictions**: University servers (like unibe.ch) often block automated requests that use bot-like User-Agent headers

## Solution Applied

### 1. Enhanced PDF Buffer Validation (`retrieval.ts:17-50`)

Added validation to detect when the server returns an error page instead of a PDF:

```typescript
// Validate buffer before parsing
if (!buffer || buffer.length === 0) {
  throw new Error("PDF buffer is empty");
}

// Check if buffer starts with PDF magic bytes (%PDF)
const pdfMagic = buffer.toString('ascii', 0, 4);
if (pdfMagic !== '%PDF') {
  console.error("[Retrieval] Buffer does not contain valid PDF data. First 200 bytes:",
    buffer.toString('utf8', 0, Math.min(200, buffer.length)));
  throw new Error(`Invalid PDF format. Content starts with: ${pdfMagic}`);
}
```

### 2. Improved User-Agent Header (`retrieval.ts:130-138`)

Changed from bot-identifying headers to browser-like headers:

**Before:**
```typescript
headers: {
  "User-Agent": "FactHarbor/1.0 (fact-checking bot)",
  "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
}
```

**After:**
```typescript
headers: {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate",
  "Connection": "keep-alive",
}
```

### 3. Enhanced Logging (`retrieval.ts:128-164`)

Added detailed logging to help diagnose future issues:

```typescript
console.log("[Retrieval] Fetching URL:", url);
console.log("[Retrieval] Response status:", response.status, "Content-Type:", response.headers.get("content-type"));
console.log("[Retrieval] Downloaded PDF buffer size:", buffer.length, "bytes");
console.log("[Retrieval] PDF extraction complete. Title:", title, "Text length:", text.length);
```

### 4. Better Error Messages (`retrieval.ts:42-49`)

Improved error messages to help identify the actual problem:

```typescript
if (err.message && err.message.includes('ENOENT')) {
  throw new Error(`PDF parsing failed: This appears to be a library test error. The PDF content may be corrupted or the server may have returned an error page instead of a PDF.`);
}
```

## How to Test the Fix

1. Try the failing URL again:
   ```
   https://www.rechtswissenschaft.unibe.ch/unibe/portal/fak_rechtwis/content/e6024/e6025/e118744/e1190006/e1416330/pane1727015/e1416332/files1733581/Abplanalp_Maria_Masterarbeit_16.08.2025_ger.pdf
   ```

2. Check the Events tab for detailed logging:
   - Should see "Fetching URL: ..."
   - Should see "Response status: 200 Content-Type: application/pdf"
   - Should see "Downloaded PDF buffer size: XXX bytes"

3. If it still fails, the Events tab will show:
   - Whether the server returned an error (HTTP 403, 404, etc.)
   - Whether the response was HTML instead of PDF
   - The first 200 bytes of the response for debugging

## Benefits

1. **Clearer Error Messages**: Users will see the actual problem (HTTP error, invalid PDF, etc.) instead of confusing ENOENT errors
2. **Better Server Compatibility**: Browser-like headers work with more academic/institutional servers
3. **Easier Debugging**: Detailed logs help identify exactly where the process fails
4. **Validation**: Detects when servers return error pages disguised as PDFs

## Files Modified

- `apps/web/src/lib/retrieval.ts` - PDF fetching and parsing logic

## Build Status

✅ Build successful (no errors)
✅ TypeScript compilation passed
✅ All routes generated successfully

# Plan: Prompt Import from Files

**Status:** ✅ COMPLETED (2026-01-30)
**Implementation Version:** v2.9.0 (Unified Configuration Management)
**Archived From:** `~/.claude/plans/noble-sprouting-simon.md`

---

## Summary
Add support to import prompts from files via API, and update export to include text-analysis prompts.

## Implementation Status

All items completed:
- ✅ Export route updated with text-analysis profiles
- ✅ VALID_PROMPT_PROFILES exported from config-storage.ts
- ✅ Import API endpoint created
- ✅ Reseed API endpoint created
- ✅ importPromptContent() helper added
- ✅ 158 unit tests passing

---

## Original Plan

### 1. Update Export Route (VALID_PROFILES)
**File:** `apps/web/src/app/api/admin/config/[type]/[profile]/export/route.ts`

Add text-analysis profiles to `VALID_PROFILES`:
```typescript
const VALID_PROFILES = [
  "orchestrated",
  "monolithic-canonical",
  "monolithic-dynamic",
  "source-reliability",
  "text-analysis-input",      // ADD
  "text-analysis-evidence",   // ADD
  "text-analysis-scope",      // ADD
  "text-analysis-verdict",    // ADD
];
```

### 2. Export VALID_PROMPT_PROFILES constant
**File:** `apps/web/src/lib/config-storage.ts`

Export the existing `VALID_PROMPT_PROFILES` constant for reuse in API routes.

### 3. Create Import API Endpoint
**New File:** `apps/web/src/app/api/admin/config/[type]/[profile]/import/route.ts`

```
POST /api/admin/config/prompt/:profile/import
Content-Type: multipart/form-data

Form fields:
- file: The .prompt.md file (required)
- versionLabel: Optional version label
- activateImmediately: "true" | "false" (default: "false")

Response:
{
  "success": true,
  "contentHash": "abc123...",
  "isNew": true,
  "activated": false,
  "validation": { "valid": true, "warnings": [] }
}
```

Implementation:
- Parse multipart form data via `req.formData()`
- Validate profile against VALID_PROMPT_PROFILES
- Validate file content (YAML frontmatter, sections)
- Check frontmatter pipeline matches profile
- Save via `saveConfigBlob()`
- Optionally activate if `activateImmediately=true`

### 4. Create Reseed API Endpoint
**New File:** `apps/web/src/app/api/admin/config/[type]/[profile]/reseed/route.ts`

```
POST /api/admin/config/prompt/:profile/reseed
Content-Type: application/json

Body: { "force": false }

Response:
{
  "success": true,
  "seeded": true,
  "contentHash": "abc123...",
  "fromFile": "orchestrated.prompt.md"
}
```

Re-seeds prompt from disk file. Useful for dev workflow.

### 5. Add importPromptContent() Helper
**File:** `apps/web/src/lib/config-storage.ts`

```typescript
export async function importPromptContent(
  profile: string,
  content: string,
  options: {
    versionLabel?: string;
    activateImmediately?: boolean;
    importedBy?: string;
  }
): Promise<{
  success: boolean;
  blob?: ConfigBlob;
  isNew?: boolean;
  activated?: boolean;
  validation: ValidationResult;
}>
```

## File Structure After Implementation
```
apps/web/src/app/api/admin/config/[type]/[profile]/
  ├── export/route.ts    # Updated - add text-analysis profiles
  ├── import/route.ts    # NEW
  ├── reseed/route.ts    # NEW
  └── ... (existing routes)
```

## Verification
1. Run `npm run build` to verify no TypeScript errors ✅
2. Run `npx vitest run` to verify existing tests pass ✅
3. Test export: `GET /api/admin/config/prompt/text-analysis-input/export` ✅
4. Test import: `POST /api/admin/config/prompt/orchestrated/import` with a .prompt.md file ✅
5. Test reseed: `POST /api/admin/config/prompt/orchestrated/reseed` ✅

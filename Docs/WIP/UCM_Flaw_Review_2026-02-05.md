# UCM Flaw Review (2026-02-05)

**Status:** ✅ All Issues Resolved
**Owner:** Engineering
**Scope:** Unified Config Management (UCM) pipeline/config loader/storage/admin API
**Related Areas:** Admin UI, Config Loader, Config Storage, Config Snapshots

---

## Summary

This document captures issues identified in UCM-related files. All issues have been addressed.

---

## Findings & Resolutions

### 1) Warnings API ignores requested hashes

- **Location:** `apps/web/src/app/api/admin/config/warnings/route.ts`
- **Issue:** The route advertises query params `?pipeline=[hash]&search=[hash]` but always loads the active default configs.
- **Status:** ✅ **FIXED**
- **Resolution:** Updated API to parse query params and load specific config blobs when hashes provided. Returns 404 if hash not found.

### 2) Default config usage recorded with non-existent hash

- **Location:** `apps/web/src/lib/config-loader.ts`
- **Issue:** When no DB config exists, usage is recorded with `contentHash = "default"`, which does not correspond to a blob in `config_blobs`.
- **Status:** ✅ **FIXED**
- **Resolution:** Changed sentinel hash to `__DEFAULT__` to clearly indicate code defaults. Added `fromDefault: boolean` flag to `ResolvedConfig` interface for explicit tracking.

### 3) `fromDefault` loses accuracy after caching

- **Location:** `apps/web/src/lib/config-loader.ts`
- **Issue:** When a config is cached, the `fromDefault` provenance was lost on subsequent cache hits.
- **Status:** ✅ **FIXED**
- **Resolution:** Added `fromDefault: boolean` to `CacheEntry` interface. Cache now preserves and returns `fromDefault` flag accurately.

### 4) Content hash uniqueness blocks identical content across profiles

- **Location:** `apps/web/src/lib/config-storage.ts` (`saveConfigBlob` + schema)
- **Issue:** `content_hash` is a primary key, so identical config content cannot be saved under a different profile/type.
- **Status:** ✅ **Design Decision (Not a Bug)**
- **Rationale:** This is intentional content-addressable storage. Same content = same hash is a feature, not a limitation. Multiple profiles can reference the same content hash via `active_configs`. The pointer table (`active_configs`) already supports this - it maps (config_type, profile_key) → content_hash, allowing multiple profiles to point to the same blob.
- **No action required.**

### 5) Snapshot metadata hard-coded analyzer version

- **Location:** `apps/web/src/lib/config-snapshots.ts`
- **Issue:** `analyzer_version` is stored as a constant ("2.9.0").
- **Status:** ✅ **FIXED**
- **Resolution:** Created `apps/web/src/lib/version.ts` that imports version from `package.json`. `config-snapshots.ts` now uses the centralized `ANALYZER_VERSION` constant.

### 6) Possible incomplete warnings API implementation

- **Location:** `apps/web/src/app/api/admin/config/warnings/route.ts`
- **Issue:** Imports defaults but never uses them; no handling for query params.
- **Status:** ✅ **FIXED**
- **Resolution:** Removed unused imports. Full implementation now parses query params and validates specified configs.

---

## Files Modified

- `apps/web/src/app/api/admin/config/warnings/route.ts` - Hash-based config loading
- `apps/web/src/lib/config-loader.ts` - Added `fromDefault` tracking, changed sentinel hash
- `apps/web/src/lib/config-snapshots.ts` - Use centralized version
- `apps/web/src/lib/version.ts` - **NEW** - Centralized version constants

---

## Verification

Run TypeScript compilation to verify changes:
```bash
npx tsc --noEmit --skipLibCheck -p apps/web/tsconfig.json
```

---

## Completed: 2026-02-05

All issues have been resolved. This document can be moved to ARCHIVE.

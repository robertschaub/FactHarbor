# Changelog: v2.6.41 - Unified Configuration Management

**Date**: January 27-28, 2026  
**Status**: Implemented and Tested

---

## Overview

Major infrastructure change: consolidated all configuration management (search, calculation, and prompts) into a single unified system with database-backed versioning, validation, and per-job usage tracking.

**Note (2026-02-02)**: Later releases expanded UCM to include `pipeline`, `sr`, and lexicon config types, and moved analysis-impacting settings into UCM. See `Docs/STATUS/Current_Status.md` for current coverage.

---

## Unified Configuration Management System (v2.6.41)

### Features

1. **Three-Table Database Design** (`config.db`)
   - `config_blobs` - Immutable, content-addressable configuration versions
   - `config_active` - Mutable activation pointer per type/profile
   - `config_usage` - Per-job tracking of which configs were used

2. **Configuration Types**
   | Type | Profile Keys | Description |
   |------|-------------|-------------|
   | `search` | `default` | Web search provider settings |
   | `calculation` | `default` | Verdict aggregation and weighting |
   | `prompt` | `orchestrated`, `monolithic-canonical`, `monolithic-dynamic`, `source-reliability` | LLM prompts |

3. **Admin UI** (`/admin/config`)
   - **Active Tab**: View current config with version info
   - **Edit Tab**: Form-based editors (JSON) or text editor (prompts)
   - **History Tab**: Browse all versions with activation status
   - **Effective Tab**: See config after env var overrides (search/calc only)

4. **Version Control**
   - SHA-256 content-addressable hashing
   - Full version history with timestamps
   - One-click rollback to any previous version
   - Cross-profile collision detection

5. **Validation**
   - Zod schema validation for JSON configs
   - Prompt frontmatter and section validation
   - Pre-save validation prevents invalid configurations

6. **Export/Import**
   - Export any config as JSON or `.prompt.md`
   - Import with schema validation
   - Deep link from job reports to specific config versions

### Files Added
- `apps/web/src/lib/config-storage.ts` - SQLite storage layer
- `apps/web/src/lib/config-loader.ts` - Caching and effective config resolution
- `apps/web/src/lib/config-schemas.ts` - Zod schemas and validation
- `apps/web/src/app/api/admin/config/` - All config API routes
- `apps/web/src/app/api/fh/jobs/[id]/configs/route.ts` - Job config retrieval
- `apps/web/src/app/jobs/[id]/components/ConfigViewer.tsx` - Job report component
- `apps/web/test/unit/lib/config-storage.test.ts` - 20 unit tests

### Files Modified
- `apps/web/src/app/admin/config/page.tsx` - Enhanced with prompt editing
- `apps/web/src/app/admin/page.tsx` - Updated navigation
- `apps/web/src/app/jobs/[id]/page.tsx` - Added ConfigViewer

---

## Prompt Unification (Phase 4 Complete)

### Problem
Two separate systems existed for configuration management:
1. Old prompt system: file-based with `prompt-versions.db`
2. New config system: `config.db` for search/calculation

### Solution
Unified all prompt management into the new config system.

### Changes

1. **Storage Consolidation**
   - Prompts now stored in `config_blobs` table with `type='prompt'`
   - Prompt usage tracked in `config_usage` table
   - `.prompt.md` files remain as seed/export only

2. **Admin UI Consolidation**
   - `/admin/prompts` replaced with `/admin/config?type=prompt`
   - Rich prompt editor with section navigation, validation, token counting
   - Full version history and rollback for prompts

3. **Pipeline Updates**
   - `orchestrated.ts`, `monolithic-canonical.ts`, `monolithic-dynamic.ts`
   - Now use `recordConfigUsage()` instead of legacy `savePromptVersion()`

### Files Deleted (Legacy System)
- `apps/web/src/lib/prompt-storage.ts`
- `apps/web/src/app/admin/prompts/page.tsx`
- `apps/web/src/app/admin/prompts/prompts.module.css`
- `apps/web/src/app/api/admin/prompts/[pipeline]/` (entire directory, 10 routes)

---

## Bug Fixes

### Race Condition in Config Page (ef73bbf)
- **Issue**: When switching config types on edit tab, stale `activeConfig` could be parsed as wrong type
- **Fix**: Added `activeConfig.configType === selectedType` check before initializing `editConfig`
- **Fix**: Only fall back to defaults when `!loading` and `activeConfig === null`

### Import Validation (4c4fb85)
- **Issue**: Importing arbitrary JSON could cause TypeError when form accessed missing properties
- **Fix**: Added structure validation in `handleImport()` checking required fields before setting

### Config Type Switch Bug (4c4fb85)
- **Issue**: Effect at lines 856-867 only called `fetchActiveConfig()` for prompts, not JSON configs
- **Fix**: Added case for JSON configs: `activeTab === "edit" && selectedType !== "prompt" && !editConfig`

---

## Environment Variables

**Note (2026-02-02)**: Analysis-related env overrides have been retired; UCM is the source of truth. This section reflects v2.6.41 behavior only.

| Variable | Default | Description |
|----------|---------|-------------|
| `FH_CONFIG_DB_PATH` | `./config.db` | Config database location |
| `FH_CONFIG_ENV_OVERRIDES` | `on` | Enable env var overrides |
| `FH_SEARCH_ENABLED` | - | Overrides `search.enabled` |
| `FH_SEARCH_PROVIDER` | - | Overrides `search.provider` |

---

## API Endpoints

### Config Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/config/:type/:profile` | Get active config |
| PUT | `/api/admin/config/:type/:profile` | Save new version |
| POST | `/api/admin/config/:type/:profile/activate` | Activate a version |
| POST | `/api/admin/config/:type/:profile/rollback` | Rollback to previous |
| GET | `/api/admin/config/:type/:profile/history` | Get version history |
| GET | `/api/admin/config/:type/:profile/version/:hash` | Get specific version |
| GET | `/api/admin/config/:type/:profile/effective` | Get with overrides |
| POST | `/api/admin/config/:type/:profile/validate` | Validate without saving |
| GET | `/api/admin/config/:type/:profile/export` | Download config |
| GET | `/api/admin/config/:type/profiles` | List profile keys |
| GET | `/api/admin/config/cache` | Get cache status |
| POST | `/api/admin/config/cache` | Invalidate cache |

### Job Config Retrieval
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fh/jobs/:id/configs` | Get configs used by job |

---

## Documentation Updated

- `Docs/USER_GUIDES/Admin_Interface.md` - Added Unified Config Management section
- `Docs/ARCHIVE/REVIEWS/Full_Prompt_Unification_Plan.md` - Marked complete
- `Docs/ARCHIVE/REVIEWS/Unified_Config_Management_Proposal.md` - Reference architecture

---

## Testing

- **Unit Tests**: 20 tests in `config-storage.test.ts`
- **Build**: `npm run build --workspace @factharbor/web` passes
- **Static Pages**: 20 (down from 21, `/admin/prompts` removed)


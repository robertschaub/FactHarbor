# GPT Implementation Prompt: Config Observability Features

**Date:** 2026-02-02
**Context:** FactHarbor UCM (Unified Config Management) - Post Phase 2
**Goal:** Add drift detection and health check config validation

---

## Background

You are working on FactHarbor, a Next.js TypeScript application with SQLite database. The Unified Config Management (UCM) system is complete with:
- File-backed defaults in `apps/web/configs/*.default.json`
- Schema versioning with validation
- Save-to-file bidirectional sync (development only)
- Concurrency tracking with `updatedBy` and `updatedAt`

Two optional observability features need implementation to help operators detect config issues early.

---

## Task 1: Drift Detection Endpoint

### Overview
Create an API endpoint that detects when DB config has diverged from file defaults. This helps operators know when manual intervention is needed after file updates.

### Implementation

**File:** `apps/web/src/app/api/admin/config/[type]/drift/route.ts` (NEW FILE)

```typescript
/**
 * Admin API - Config Drift Detection
 *
 * GET /api/admin/config/:type/drift
 * Returns: Whether DB config differs from file default
 */

import { NextResponse } from "next/server";
import { getActiveConfig, type ConfigType } from "@/lib/config-storage";
import { loadDefaultConfigFromFile } from "@/lib/config-storage";
import { isValidConfigType, VALID_CONFIG_TYPES } from "@/lib/config-schemas";

export const runtime = "nodejs";

function getAdminKey(): string | null {
  const v = process.env.FH_ADMIN_KEY;
  return v && v.trim() ? v : null;
}

function isAuthorized(req: Request): boolean {
  const adminKey = getAdminKey();
  // In development without a key configured, allow access
  if (!adminKey && process.env.NODE_ENV !== "production") return true;
  const providedKey = req.headers.get("x-admin-key");
  return !!providedKey && providedKey === adminKey;
}

interface RouteParams {
  params: Promise<{ type: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}. Valid: ${VALID_CONFIG_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Skip prompt type - not file-backed
  if (type === "prompt") {
    return NextResponse.json({
      hasDrift: false,
      reason: "Prompt configs are not file-backed"
    });
  }

  try {
    // Get current DB config
    const dbConfig = await getActiveConfig(type as ConfigType);

    // Load file default
    const fileConfig = loadDefaultConfigFromFile(type as ConfigType);

    if (!fileConfig) {
      return NextResponse.json({
        hasDrift: false,
        reason: "No file config found (using code constants)",
        dbConfigUpdated: dbConfig.updatedAt
      });
    }

    // Compare configs (simple deep equality)
    // Remove metadata fields before comparison
    const { updatedAt: dbUpdated, updatedBy: dbBy, ...dbData } = dbConfig;
    const { schemaVersion: fileVersion, ...fileData } = fileConfig;

    const dbJson = JSON.stringify(dbData);
    const fileJson = JSON.stringify(fileData);
    const hasDrift = dbJson !== fileJson;

    return NextResponse.json({
      hasDrift,
      dbConfigUpdated: dbConfig.updatedAt,
      dbConfigUpdatedBy: dbConfig.updatedBy,
      fileSchemaVersion: fileConfig.schemaVersion,
      message: hasDrift
        ? "DB config differs from file default. Consider Reset to Default if file was updated."
        : "DB config matches file default"
    });
  } catch (err) {
    console.error(`[Config] Drift check failed for ${type}:`, err);
    return NextResponse.json(
      { error: "Failed to check drift", details: (err as Error).message },
      { status: 500 }
    );
  }
}
```

**Required Update:** Export `loadDefaultConfigFromFile` from config-storage.ts

In `apps/web/src/lib/config-storage.ts`, find the `loadDefaultConfigFromFile` function and change it from:
```typescript
function loadDefaultConfigFromFile(type: ConfigType): Config | null {
```

To:
```typescript
export function loadDefaultConfigFromFile(type: ConfigType): Config | null {
```

---

## Task 2: Config Validation in Health Check

### Overview
Enhance the existing `/api/health` endpoint to include config validation status. This helps CI/CD pipelines and monitoring systems catch config issues early.

### Implementation

**File:** `apps/web/src/app/api/health/route.ts` (MODIFY EXISTING)

Find the existing GET handler and enhance it with config validation.

**Add imports at top of file:**
```typescript
import {
  getActiveConfig,
  type ConfigType
} from "@/lib/config-storage";
import {
  validatePipelineConfig,
  validateSearchConfig,
  validateCalculationConfig,
  validateSourceReliabilityConfig,
  validateEvidenceLexiconConfig,
  validateAggregationLexiconConfig,
  type ConfigType as SchemaConfigType
} from "@/lib/config-schemas";
```

**Add helper function before the GET handler:**
```typescript
async function validateAllConfigs() {
  const configTypes: Array<Exclude<ConfigType, "prompt">> = [
    "pipeline",
    "search",
    "calculation",
    "sr",
    "evidenceLexicon",
    "aggregationLexicon"
  ];

  const validationResults: Record<string, { valid: boolean; warnings: string[] }> = {};

  for (const type of configTypes) {
    try {
      const config = await getActiveConfig(type);

      let result;
      switch (type) {
        case "pipeline":
          result = validatePipelineConfig(config);
          break;
        case "search":
          result = validateSearchConfig(config);
          break;
        case "calculation":
          result = validateCalculationConfig(config);
          break;
        case "sr":
          result = validateSourceReliabilityConfig(config);
          break;
        case "evidenceLexicon":
          result = validateEvidenceLexiconConfig(config);
          break;
        case "aggregationLexicon":
          result = validateAggregationLexiconConfig(config);
          break;
      }

      if (result.success) {
        validationResults[type] = {
          valid: true,
          warnings: []
        };
      } else {
        validationResults[type] = {
          valid: false,
          warnings: result.errors || ["Validation failed"]
        };
      }
    } catch (err) {
      validationResults[type] = {
        valid: false,
        warnings: [`Failed to load or validate: ${(err as Error).message}`]
      };
    }
  }

  return validationResults;
}
```

**Modify the GET handler to include config validation:**

Find the existing response object and add `configValidation` field. The response should look like:

```typescript
export async function GET() {
  try {
    // Existing health checks...
    const pipelineConfig = await getActiveConfig("pipeline");
    const llmProvider = pipelineConfig.llmProvider || "anthropic";

    // NEW: Add config validation
    const configValidation = await validateAllConfigs();

    // Check if any configs are invalid
    const hasInvalidConfigs = Object.values(configValidation).some(v => !v.valid);

    return NextResponse.json({
      status: hasInvalidConfigs ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      llmProvider,
      configValidation, // NEW FIELD
      // ... rest of existing health check fields
    });
  } catch (err) {
    console.error("[Health] Health check failed:", err);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: (err as Error).message
      },
      { status: 503 }
    );
  }
}
```

**Important:** If any config validation fails, set `status: "degraded"` instead of `"healthy"`.

---

## Testing Checklist

### Drift Detection Endpoint
- [ ] GET `/api/admin/config/pipeline/drift` returns `hasDrift: false` when DB matches file
- [ ] Modify a config in admin UI, then call drift endpoint - returns `hasDrift: true`
- [ ] Returns proper error for invalid config type
- [ ] Returns `reason: "Prompt configs are not file-backed"` for prompt type
- [ ] Requires admin auth (401 without x-admin-key header)
- [ ] Message field provides clear guidance

### Health Check Enhancement
- [ ] GET `/api/health` includes `configValidation` object
- [ ] `configValidation` has entries for all 6 config types
- [ ] Valid configs show `{ valid: true, warnings: [] }`
- [ ] Invalid configs show `{ valid: false, warnings: [...] }`
- [ ] Status is `"degraded"` if any config is invalid
- [ ] Status is `"healthy"` if all configs are valid
- [ ] Existing health check fields remain unchanged

---

## Acceptance Criteria

### Must Have
1. ✅ Drift detection endpoint works for all 6 non-prompt config types
2. ✅ Health endpoint includes config validation status
3. ✅ Both endpoints require proper authentication
4. ✅ Clear error messages and status codes
5. ✅ Build passes: `npm -w apps/web run build`
6. ✅ TypeScript compiles with no errors

### Should Have
1. ✅ Drift endpoint provides actionable guidance in message field
2. ✅ Health check properly distinguishes "healthy" vs "degraded" status
3. ✅ Config validation catches actual schema violations
4. ✅ Response format matches documentation examples

---

## Example API Responses

### Drift Detection - No Drift
```json
GET /api/admin/config/pipeline/drift

{
  "hasDrift": false,
  "dbConfigUpdated": "2026-02-02T10:30:00.000Z",
  "dbConfigUpdatedBy": "admin@example.com",
  "fileSchemaVersion": "2.1.0",
  "message": "DB config matches file default"
}
```

### Drift Detection - Has Drift
```json
{
  "hasDrift": true,
  "dbConfigUpdated": "2026-02-02T10:30:00.000Z",
  "dbConfigUpdatedBy": "admin@example.com",
  "fileSchemaVersion": "2.1.0",
  "message": "DB config differs from file default. Consider Reset to Default if file was updated."
}
```

### Health Check - All Valid
```json
GET /api/health

{
  "status": "healthy",
  "timestamp": "2026-02-02T10:30:00.000Z",
  "llmProvider": "anthropic",
  "configValidation": {
    "pipeline": { "valid": true, "warnings": [] },
    "search": { "valid": true, "warnings": [] },
    "calculation": { "valid": true, "warnings": [] },
    "sr": { "valid": true, "warnings": [] },
    "evidenceLexicon": { "valid": true, "warnings": [] },
    "aggregationLexicon": { "valid": true, "warnings": [] }
  }
}
```

### Health Check - Invalid Config
```json
{
  "status": "degraded",
  "timestamp": "2026-02-02T10:30:00.000Z",
  "llmProvider": "anthropic",
  "configValidation": {
    "pipeline": { "valid": true, "warnings": [] },
    "search": { "valid": false, "warnings": ["maxResultsPerQuery must be > 0"] },
    "calculation": { "valid": true, "warnings": [] },
    "sr": { "valid": true, "warnings": [] },
    "evidenceLexicon": { "valid": true, "warnings": [] },
    "aggregationLexicon": { "valid": true, "warnings": [] }
  }
}
```

---

## Key Files to Modify

1. **NEW:** `apps/web/src/app/api/admin/config/[type]/drift/route.ts`
2. **MODIFY:** `apps/web/src/lib/config-storage.ts` (export loadDefaultConfigFromFile)
3. **MODIFY:** `apps/web/src/app/api/health/route.ts` (add config validation)

---

## Notes

- Both endpoints follow existing auth patterns (x-admin-key header)
- Drift detection uses simple JSON equality (sufficient for alpha)
- Config validation reuses existing schema validators
- Health check sets `status: "degraded"` if any config is invalid (not "unhealthy")
- These features are optional enhancements - no breaking changes to existing code

---

## Estimated Implementation Time

- Drift detection endpoint: ~1.5 hours
- Health check enhancement: ~1.5 hours
- Testing and validation: ~1 hour
- **Total: ~4 hours**

---

## Success Criteria

When complete:
1. Can call drift endpoint for any config type and get meaningful results
2. Health endpoint provides config validation at a glance
3. CI/CD pipelines can monitor `/api/health` for config issues
4. Operators can check drift before/after file updates
5. All builds and type checks pass

---

**Ready to implement!** Please follow the implementation steps above, test thoroughly, and report back with results.

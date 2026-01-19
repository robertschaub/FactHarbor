# Database Schema Migration v2.7.0 - Terminology Refactoring

**Date**: 2026-01-18  
**Type**: Breaking Change - JSON Schema Update  
**Status**: Executed (v2.7.0) — legacy fields accepted for backward compatibility  
**Target**: SQLite database (`apps/api/factharbor.db`)  
**Estimated Downtime**: < 5 minutes  

---

## Executive Summary

This migration updates JSON field names within the `ResultJson` column of the `Jobs` table to align terminology across TypeScript, prompts, and database storage. **No table structure changes** are required; only JSON content transformation.

---

## Current Schema

```sql
CREATE TABLE Jobs (
    JobId TEXT PRIMARY KEY,
    Status TEXT NOT NULL DEFAULT 'QUEUED',
    Progress INTEGER NOT NULL DEFAULT 0,
    CreatedUtc TEXT NOT NULL,
    UpdatedUtc TEXT NOT NULL,
    InputType TEXT NOT NULL DEFAULT 'text',
    InputValue TEXT NOT NULL,
    InputPreview TEXT,
    PipelineVariant TEXT NOT NULL DEFAULT 'orchestrated',
    ResultJson TEXT,                 -- ⬅️ Migration target
    ReportMarkdown TEXT
);
```

**Note**: `ResultJson` stores a JSON string with nested objects.

---

## JSON Structure Changes

### Change 1: `distinctProceedings` → `analysisContexts`

**Before**:
```json
{
  "understanding": { ... },
  "distinctProceedings": [
    {
      "id": "CTX_TSE",
      "name": "TSE Electoral Proceeding",
      "shortName": "TSE",
      ...
    }
  ],
  "verdicts": [ ... ]
}
```

**After**:
```json
{
  "understanding": { ... },
  "analysisContexts": [
    {
      "id": "CTX_TSE",
      "name": "TSE Electoral Proceeding",
      "shortName": "TSE",
      ...
    }
  ],
  "verdicts": [ ... ]
}
```

### Change 2: `proceedingId` → `contextId` in verdicts

**Before**:
```json
{
  "verdicts": [
    {
      "proceedingId": "CTX_TSE",
      "proceedingName": "TSE Electoral Proceeding",
      "claimId": "C1",
      ...
    }
  ]
}
```

**After**:
```json
{
  "verdicts": [
    {
      "contextId": "CTX_TSE",
      "contextName": "TSE Electoral Proceeding",
      "claimId": "C1",
      ...
    }
  ]
}
```

### Change 3: `relatedProceedingId` → `contextId` in facts

**Before**:
```json
{
  "facts": [
    {
      "id": "F1",
      "fact": "...",
      "relatedProceedingId": "CTX_TSE",
      ...
    }
  ]
}
```

**After**:
```json
{
  "facts": [
    {
      "id": "F1",
      "fact": "...",
      "contextId": "CTX_TSE",
      ...
    }
  ]
}
```

---

## Migration Strategy

Since SQLite doesn't support JSON path updates natively (without JSON1 extension), we'll use a **TypeScript migration script** for safety and testability.

### Option A: TypeScript Migration Script (Recommended)

**File**: `apps/api/scripts/migrate-terminology-v2.7.ts`

```typescript
import { readFileSync, writeFileSync } from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

interface JobRow {
  JobId: string;
  ResultJson: string | null;
}

async function migrateDatabase(dbPath: string) {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Starting migration v2.7.0...');
  
  // Step 1: Get all jobs with ResultJson
  const jobs: JobRow[] = await db.all(
    'SELECT JobId, ResultJson FROM Jobs WHERE ResultJson IS NOT NULL'
  );
  
  console.log(`Found ${jobs.length} jobs to migrate`);
  
  let migratedCount = 0;
  let errorCount = 0;
  
  // Step 2: Transform each job's JSON
  for (const job of jobs) {
    try {
      if (!job.ResultJson) continue;
      
      const result = JSON.parse(job.ResultJson);
      
      // Transform 1: distinctProceedings → analysisContexts
      if (result.distinctProceedings) {
        result.analysisContexts = result.distinctProceedings;
        delete result.distinctProceedings;
      }
      
      // Transform 2: proceedingId → contextId in verdicts
      if (result.verdicts && Array.isArray(result.verdicts)) {
        result.verdicts = result.verdicts.map((v: any) => {
          const newVerdict = { ...v };
          if (v.proceedingId) {
            newVerdict.contextId = v.proceedingId;
            delete newVerdict.proceedingId;
          }
          if (v.proceedingName) {
            newVerdict.contextName = v.proceedingName;
            delete newVerdict.proceedingName;
          }
          return newVerdict;
        });
      }
      
      // Transform 3: relatedProceedingId → contextId in facts
      if (result.facts && Array.isArray(result.facts)) {
        result.facts = result.facts.map((f: any) => {
          const newFact = { ...f };
          if (f.relatedProceedingId !== undefined) {
            newFact.contextId = f.relatedProceedingId;
            delete newFact.relatedProceedingId;
          }
          return newFact;
        });
      }
      
      // Transform 4: proceedingContext → analysisContext in understanding object (if present)
      if (result.understanding?.proceedingContext) {
        result.understanding.analysisContext = result.understanding.proceedingContext;
        delete result.understanding.proceedingContext;
      }
      
      // Step 3: Update database
      const newJson = JSON.stringify(result);
      await db.run(
        'UPDATE Jobs SET ResultJson = ?, UpdatedUtc = ? WHERE JobId = ?',
        [newJson, new Date().toISOString(), job.JobId]
      );
      
      migratedCount++;
      
      if (migratedCount % 10 === 0) {
        console.log(`Migrated ${migratedCount}/${jobs.length} jobs...`);
      }
    } catch (error) {
      console.error(`Error migrating job ${job.JobId}:`, error);
      errorCount++;
    }
  }
  
  await db.close();
  
  console.log(`\nMigration complete!`);
  console.log(`  ✅ Migrated: ${migratedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    throw new Error(`Migration had ${errorCount} errors`);
  }
  
  return { migratedCount, errorCount };
}

// Run migration
const DB_PATH = process.env.DB_PATH || './apps/api/factharbor.db';

migrateDatabase(DB_PATH)
  .then((result) => {
    console.log('Migration successful:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

**Run Command**:
```bash
npm install sqlite sqlite3
ts-node apps/api/scripts/migrate-terminology-v2.7.ts
```

### Option B: SQL-Based Migration (Manual Backup Required)

**Not Recommended**: SQLite JSON functions are limited. Use TypeScript script for safety.

---

## Pre-Migration Checklist

Before running migration:

- [ ] **Backup database**
  ```bash
  cp apps/api/factharbor.db apps/api/factharbor-backup-$(date +%Y%m%d-%H%M%S).db
  ```

- [ ] **Test migration on copy**
  ```bash
  cp apps/api/factharbor.db apps/api/factharbor-test.db
  DB_PATH=apps/api/factharbor-test.db ts-node apps/api/scripts/migrate-terminology-v2.7.ts
  ```

- [ ] **Verify test database**
  - Sample 5-10 jobs manually
  - Check `analysisContexts` exists
  - Check `distinctProceedings` removed
  - Check verdicts have `contextId`

- [ ] **Stop running services**
  ```bash
  .\scripts\stop-services.ps1
  ```

---

## Migration Execution

### Step 1: Backup (CRITICAL)
```bash
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item apps\api\factharbor.db "apps\api\factharbor-pre-v2.7-$timestamp.db"
Write-Host "Backup created: factharbor-pre-v2.7-$timestamp.db"
```

### Step 2: Run Migration
```bash
cd apps\api
ts-node scripts\migrate-terminology-v2.7.ts
```

**Expected Output**:
```
Starting migration v2.7.0...
Found 47 jobs to migrate
Migrated 10/47 jobs...
Migrated 20/47 jobs...
Migrated 30/47 jobs...
Migrated 40/47 jobs...

Migration complete!
  ✅ Migrated: 47
  ❌ Errors: 0
```

### Step 3: Validate Results

**Query 1**: Check for old field names (should return 0)
```sql
SELECT COUNT(*) FROM Jobs 
WHERE ResultJson LIKE '%distinctProceedings%' 
   OR ResultJson LIKE '%proceedingId%' 
   OR ResultJson LIKE '%proceedingName%';
```

**Query 2**: Check for new field names (should match job count)
```sql
SELECT COUNT(*) FROM Jobs 
WHERE ResultJson LIKE '%analysisContexts%';
```

**Query 3**: Sample a job manually
```sql
SELECT JobId, SUBSTR(ResultJson, 1, 500) 
FROM Jobs 
WHERE ResultJson IS NOT NULL 
LIMIT 1;
```

Manually verify JSON contains `analysisContexts`, `contextId`, etc.

---

## Rollback Plan

If migration fails or introduces bugs:

### Option 1: Restore from Backup
```bash
# Stop services
.\scripts\stop-services.ps1

# Restore backup
$backupFile = "apps\api\factharbor-pre-v2.7-YYYYMMDD-HHMMSS.db"
Copy-Item $backupFile apps\api\factharbor.db -Force

# Restart services
.\scripts\restart-clean.ps1
```

### Option 2: Reverse Migration Script

```typescript
// Reverse the transformations
if (result.analysisContexts) {
  result.distinctProceedings = result.analysisContexts;
  delete result.analysisContexts;
}
// ... (reverse all other changes)
```

---

## Post-Migration Checklist

After successful migration:

- [ ] All services restart without errors
- [ ] Existing jobs display correctly in UI
- [ ] New jobs use new field names
- [ ] API responses validated
- [ ] Run regression test suite
- [ ] Document migration completion in [CHANGELOG.md](../../Docs/STATUS/CHANGELOG.md)
- [ ] Archive pre-migration backup

---

## Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Data corruption | CRITICAL | LOW | Full backup + test run on copy first |
| Migration script bug | HIGH | MEDIUM | Extensive testing on sample data + rollback plan |
| Downtime > 5min | MEDIUM | LOW | Pre-stop services + fast script execution |
| Incomplete migration | MEDIUM | LOW | Validation queries detect incomplete records |
| Backup restore failure | CRITICAL | VERY LOW | Test restore procedure before migration |

---

## Testing Validation

### Test Case 1: Multi-Context Job
**Input**: Job with 2 distinct contexts (e.g., TSE + SCOTUS)
**Validation**:
- `analysisContexts` array has 2 elements
- Each verdict has `contextId` matching context IDs
- Facts have `contextId` assignments

### Test Case 2: Single-Context Job
**Input**: Job with 1 context (CTX_MAIN)
**Validation**:
- `analysisContexts` array has 1 element
- All verdicts reference same `contextId`

### Test Case 3: Dynamic Pipeline Job
**Input**: Job with `pipelineVariant: "monolithic_dynamic"`
**Validation**:
- Dynamic schema preserved
- No `analysisContexts` field (dynamic doesn't use it)
- Migration script handles gracefully

---

## Timeline

**Total Estimated Time**: 30-60 minutes

| Phase | Duration | Notes |
|-------|----------|-------|
| Backup creation | 2 min | Single file copy |
| Test run on copy | 5 min | Validate script works |
| Stop services | 1 min | Clean shutdown |
| Run migration | 2-5 min | Depends on job count |
| Validation queries | 3 min | Manual spot-checks |
| Restart services | 2 min | Warm-up time |
| Smoke testing | 5 min | Load jobs in UI |
| **TOTAL** | **20-23 min** | Plus contingency buffer |

---

## References

- [ADR_001](./ADR_001_Scope_Context_Terminology_Refactoring.md) - Migration decision
- [Entities.cs](../../apps/api/Data/Entities.cs) - Database schema definition
- [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md) - Field mappings

---

**Prepared By**: Lead Developer  
**Reviewed By**: (Pending Lead Architect sign-off)  
**Approved By**: (Pending)  
**Execution Date**: (TBD - After architecture review)

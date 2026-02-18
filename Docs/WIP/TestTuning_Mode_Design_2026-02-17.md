# Design: Test/Tuning Mode for Analysis Pipeline

**Status:** 🧭 Proposal — pending approval
**Created:** 2026-02-17
**Updated:** 2026-02-18 — `MaxStage: int?` renamed to `StopAfterStage: string?` throughout (aligns with UI doc)
**Author:** Claude Code (Senior Developer role)

---

## Context

FactHarbor's analysis pipeline needs a test/tuning workflow so admins and AI agents can:
- Experiment with config changes without affecting production
- Run the pipeline partially (stop after any stage 1-5) to inspect intermediate results
- Manage test data separately from production jobs
- Clean up old test artifacts efficiently

Currently there is no concept of test vs production jobs, no partial execution, and no test-scoped configs. This plan adds all of these with minimal changes to existing code paths.

### Requirements

1. **Test-only UCM configs** — Admin/agents can create configs only visible/usable for testing
2. **Partial pipeline execution** — Run up to a selectable stage (1-5), return partial JSON
3. **Programmatic API** — Agents can do everything without the UI
4. **Admin UI** — Admin users can do everything from the UI
5. **Job distinguishability** — Test jobs are clearly marked and separate from production
6. **Non-admin isolation** — Non-admin users cannot see test jobs or test configurations
7. **Cleanup** — Efficient deletion of old test configs and test jobs

---

## Design Overview

**Core additions:**
1. `IsTestRun` (bool) + `StopAfterStage` (string?) + `ConfigOverrides` (JSON string?) fields on `JobEntity`
2. Test configs use `test/` prefixed profile keys (e.g., `test/high-iteration`) — leveraging existing UCM profile system
3. Pipeline gains early-exit after any stage + config profile override support
4. Public job listings filter out test jobs; admin can toggle visibility
5. Cleanup endpoints for bulk-deleting old test jobs + test config profiles

**Key design decision — profile-key-based config overrides (not content-hash):**

The config-loader functions (`loadPipelineConfig`, `loadSearchConfig`, `loadCalcConfig` in `apps/web/src/lib/config-loader.ts`) already accept a `profileKey` parameter. Test configs are saved and activated under `test/*` profile keys using the existing UCM API. The job stores a `configOverrides` JSON map of `{ configType: profileKey }` that tells the pipeline which profile to use per config type. Unspecified types fall back to `"default"`. This reuses all existing config infrastructure with **zero schema changes** to `config.db`.

---

## Phase 1: Data Model (.NET API)

### 1.1 JobEntity — Add 3 fields

**File:** `apps/api/Data/Entities.cs`

```csharp
public bool IsTestRun { get; set; } = false;
public string? StopAfterStage { get; set; }  // PipelineStageId or null = run all stages
public string? ConfigOverrides { get; set; } // JSON: {"pipeline":"test/exp-1","search":"test/exp-1"}
```

> **Note (2026-02-18):** `Entities.cs` already has retry tracking fields added separately (`ParentJobId`, `RetryCount`, `RetriedFromUtc`, `RetryReason`). These three test fields are additive to that existing state.

### 1.2 Startup migration

**File:** `apps/api/Program.cs`

Add `ALTER TABLE` statements at startup (matching existing pattern for AnalysisMetrics migration), wrapped in try/catch for idempotency:

```sql
ALTER TABLE Jobs ADD COLUMN IsTestRun INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Jobs ADD COLUMN StopAfterStage TEXT;
ALTER TABLE Jobs ADD COLUMN ConfigOverrides TEXT;
```

### 1.3 JobService extensions

**File:** `apps/api/Services/JobService.cs`

- Extend `CreateJobAsync` signature: add `isTestRun`, `stopAfterStage`, `configOverrides` params
- Extend `ListJobsAsync`: add `includeTestJobs` filter (`.Where(j => includeTestJobs || !j.IsTestRun)`)
- Add `DeleteTestJobsAsync(int olderThanDays)`: deletes JobEvents + Jobs where `IsTestRun=true` and `CreatedUtc < cutoff`
- Add `CountTestJobsAsync()`: for admin dashboard stats

> **Note (2026-02-18):** `JobService.cs` already has `CancelJobAsync`, `DeleteJobAsync`, and `CreateRetryJobAsync` added separately. The test extensions are additive.

### 1.4 CreateJobRequest extensions

**File:** `apps/api/Controllers/AnalyzeController.cs`

Extend the record:

```csharp
public sealed record CreateJobRequest(
    string inputType,
    string inputValue,
    string? pipelineVariant = "orchestrated",
    bool isTestRun = false,
    string? stopAfterStage = null,
    Dictionary<string, string>? configOverrides = null
);
```

Validation: if `isTestRun=true`, require `X-Admin-Key` header. Validate `stopAfterStage` is one of the five canonical stage IDs if present (`"extract-claims"`, `"research"`, `"cluster-boundaries"`, `"verdict"`, `"aggregate"`).

### 1.5 JobsController extensions

**File:** `apps/api/Controllers/JobsController.cs`

- `List`: add `?includeTestJobs=true` query param (requires `X-Admin-Key`)
- `Get`: include `isTestRun`, `stopAfterStage`, `configOverrides` in response JSON
- Both `totalCount` and items respect the test filter

> **Note (2026-02-18):** `JobsController.cs` already has `Cancel` and `Retry` endpoints added separately. The test filter extensions are additive.

### 1.6 Cleanup endpoint

**File:** `apps/api/Controllers/InternalJobsController.cs`

Add `DELETE /internal/v1/test-jobs?olderThanDays=7` — admin-key protected, calls `JobService.DeleteTestJobsAsync`, returns `{ deletedJobs, deletedEvents }`.

### 1.7 RunnerClient extension

**File:** `apps/api/Services/RunnerClient.cs`

Include `configOverrides` in the trigger payload alongside `jobId` (the runner reads it from the trigger body or from the job record).

---

## Phase 2: Pipeline Changes (Next.js)

### 2.1 Extend AnalysisInput type

**File:** `apps/web/src/lib/analyzer/types.ts`

```typescript
export type AnalysisInput = {
  jobId?: string;
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
  // Test/tuning mode
  stopAfterStage?: PipelineStageId; // null / absent = run all stages
  configOverrides?: Partial<Record<ConfigType, string>>; // configType → profileKey
};
```

`PipelineStageId` is also defined in `types.ts`:
```typescript
export type PipelineStageId =
  | "extract-claims"
  | "research"
  | "cluster-boundaries"
  | "verdict"
  | "aggregate";

export const PIPELINE_STAGE_IDS: PipelineStageId[] = [
  "extract-claims", "research", "cluster-boundaries", "verdict", "aggregate"
];
```

### 2.2 Pipeline partial execution + config overrides

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

**a) Config profile resolution** — At the top of `runClaimBoundaryAnalysis`:

```typescript
const configProfileFor = (type: string) => input.configOverrides?.[type] ?? "default";
```

**b) Replace hardcoded `"default"` in ~7 config loading sites** (lines 311-312, 883-884, 1586, 2076-2077, 2214-2215):

```typescript
// Before:
loadPipelineConfig("default")
// After:
loadPipelineConfig(configProfileFor("pipeline"))
```

Same pattern for `loadSearchConfig` and `loadCalcConfig`.

**c) Stage gate** — After each stage, check `stopAfterStage` using ordinal position:

```typescript
const stopIdx = input.stopAfterStage
  ? PIPELINE_STAGE_IDS.indexOf(input.stopAfterStage)
  : 4; // 0-indexed; 4 = "aggregate" = run all stages

// After Stage 1 (extract-claims, idx 0):
if (stopIdx <= 0) return buildPartialResult(state, "extract-claims", input);
// After Stage 2 (research, idx 1):
if (stopIdx <= 1) return buildPartialResult(state, "research", input);
// After Stage 3 (cluster-boundaries, idx 2):
if (stopIdx <= 2) return buildPartialResult(state, "cluster-boundaries", input);
// After Stage 4 (verdict, idx 3):
if (stopIdx <= 3) return buildPartialResult(state, "verdict", input);
```

**d) `buildPartialResult` helper** — New function that constructs result JSON from available state:

```typescript
function buildPartialResult(
  state: CBResearchState,
  completedThrough: PipelineStageId,
  input: AnalysisInput
) {
  const stageIdx = PIPELINE_STAGE_IDS.indexOf(completedThrough);
  return {
    resultJson: {
      _schemaVersion: "3.0.0-cb",
      meta: {
        pipeline: "claimboundary",
        partialExecution: true,
        completedThrough,            // e.g. "research"
        stopAfterStage: completedThrough,
        isTestRun: true,
        configOverrides: input.configOverrides ?? {},
        // ... other standard meta fields (inputType, llmCalls, etc.)
      },
      // Include data from completed stages only
      ...(stageIdx >= 0 && { understanding: state.understanding }),
      ...(stageIdx >= 1 && {
        evidenceItems: state.evidenceItems,
        sources: state.sources,
        searchQueries: state.searchQueries
      }),
      ...(stageIdx >= 2 && {
        claimBoundaries: state.claimBoundaries,
        coverageMatrix: state.coverageMatrix
      }),
      ...(stageIdx >= 3 && { claimVerdicts: state.claimVerdicts }),
      // stageIdx 4 = aggregate = full result (no partial needed)
    },
    reportMarkdown: `# Partial Result (stopped after: ${completedThrough})\n\nThis is a test run that stopped after the ${completedThrough} stage.`,
  };
}
```

### 2.3 Runner queue — thread test params

**File:** `apps/web/src/lib/internal-runner-queue.ts`

In `runJobBackground` (line 154+):
- Read `stopAfterStage` and `configOverrides` from the job record (already fetched via `apiGet`)
- Parse `configOverrides` from JSON string to object
- Pass both to `runClaimBoundaryAnalysis` via the `AnalysisInput`

```typescript
const stopAfterStage = job.stopAfterStage as PipelineStageId | undefined ?? undefined;
const configOverrides = job.configOverrides
  ? JSON.parse(job.configOverrides)
  : undefined;

result = await runClaimBoundaryAnalysis({
  jobId, inputType, inputValue, stopAfterStage, configOverrides,
  onEvent: async (m, p) => emit("info", m, p),
});
```

### 2.4 Run-job route — no changes needed

**File:** `apps/web/src/app/api/internal/run-job/route.ts`

The route only passes `jobId`. The runner reads test params from the job record via the existing `apiGet(/v1/jobs/{jobId})` call. No changes needed.

---

## Phase 3: Test Config Management (Next.js)

### 3.1 Config storage helpers

**File:** `apps/web/src/lib/config-storage.ts`

Add helper functions (no schema changes to config.db):

- `listTestProfiles()`: query `config_active` where `profile_key LIKE 'test/%'`, grouped by config type
- `deleteTestProfiles(olderThanDays: number)`: delete from `config_blobs` and `config_active` where `profile_key LIKE 'test/%'` and `created_utc < cutoff`. Clean orphaned `config_usage` rows.
- `countTestProfiles()`: count of active test profiles across all types

### 3.2 New API route: test profile management

**File:** `apps/web/src/app/api/admin/config/test-profiles/route.ts` (NEW)

- `GET` — List all test profiles across all config types (calls `listTestProfiles`)
- `DELETE ?olderThanDays=7` — Bulk cleanup (calls `deleteTestProfiles`)
- Auth: `X-Admin-Key` required

### 3.3 Existing config routes — already work

The existing `PUT /api/admin/config/[type]/[profile]` and `POST /api/admin/config/[type]/[profile]/activate` already accept arbitrary profile keys. Creating a test config is just:

```
PUT /api/admin/config/pipeline/test%2Fexp-1     (URL-encoded test/exp-1)
POST /api/admin/config/pipeline/test%2Fexp-1/activate
```

No changes to these existing routes needed.

---

## Phase 4: Proxy Routes (Next.js → .NET API)

### 4.1 Analyze proxy

**File:** `apps/web/src/app/api/fh/analyze/route.ts`

Pass through `isTestRun`, `stopAfterStage`, `configOverrides` fields to upstream .NET API.

### 4.2 Jobs list proxy

**File:** `apps/web/src/app/api/fh/jobs/route.ts`

Pass through `includeTestJobs` query param to upstream .NET API.

### 4.3 Test cleanup proxy (NEW)

**File:** `apps/web/src/app/api/admin/test-cleanup/route.ts` (NEW)

`DELETE ?olderThanDays=7` — calls both:
1. .NET `DELETE /internal/v1/test-jobs` (clean test jobs from factharbor.db)
2. Local `deleteTestProfiles()` (clean test configs from config.db)

Returns combined counts. Auth: `X-Admin-Key`.

---

## Phase 5: Admin UI

### 5.1 Admin dashboard — test section

**File:** `apps/web/src/app/admin/page.tsx`

Add a "Test/Tuning" card with:
- Count of test jobs + test config profiles
- "Run Test Analysis" button → navigates to test runner page
- "Cleanup Test Data" button with age selector (7/14/30 days)

### 5.2 Test runner page (NEW)

**File:** `apps/web/src/app/admin/test-runner/page.tsx` (NEW)

Layout:
1. **Input**: Text/URL input (reuse pattern from `/analyze`)
2. **Stage selector**: Dropdown — "All stages" or "Stop after Stage N" (1-5), with stage names:
   - Stage 1: Extract Claims
   - Stage 2: Research
   - Stage 3: Cluster Boundaries
   - Stage 4: Verdict
   - Stage 5: Aggregate
3. **Config overrides**: For each config type (pipeline, search, calculation):
   - Dropdown: "Production (default)" or list of `test/*` profiles
   - "Create test profile" button → opens inline editor
4. **Submit**: POST to `/api/fh/analyze` with `isTestRun: true` + selected options
5. **Result**: Redirect to `/jobs/{id}` for live tracking

### 5.3 Jobs page — test toggle

**File:** `apps/web/src/app/jobs/page.tsx`

- Add admin-only toggle: "Show test jobs"
- When enabled, fetches with `?includeTestJobs=true`
- Test jobs show a "TEST" badge and stage info (e.g., "Stages 1-3 of 5")

### 5.4 Job detail — test indicators

**File:** `apps/web/src/app/jobs/[id]/page.tsx`

When viewing a test job:
- Yellow banner: "Test/Tuning Run — Completed stages 1-N of 5"
- Show which config profiles were overridden vs production
- Partial result renders whatever data is available (stages not completed are simply absent)

### 5.5 Config admin — test profile section

**File:** `apps/web/src/app/admin/config/page.tsx`

Add a "Test Profiles" tab that:
- Lists all `test/*` profiles by config type
- Allows viewing, comparing with production, editing, deleting
- "Clone from Production" button — copies active default config to a new test profile

---

## File Change Summary

### .NET API (`apps/api/`)

| File | Change |
|------|--------|
| `Data/Entities.cs` | Add `IsTestRun`, `StopAfterStage`, `ConfigOverrides` to JobEntity (additive to existing retry fields) |
| `Program.cs` | Add ALTER TABLE migration at startup |
| `Services/JobService.cs` | Extend CreateJobAsync, ListJobsAsync; add DeleteTestJobsAsync, CountTestJobsAsync (additive to existing cancel/delete/retry) |
| `Services/RunnerClient.cs` | Minor: include configOverrides in trigger payload |
| `Controllers/AnalyzeController.cs` | Extend CreateJobRequest; add admin auth gate for test jobs |
| `Controllers/JobsController.cs` | Add includeTestJobs filter; expose new fields in responses (additive to existing cancel/retry endpoints) |
| `Controllers/InternalJobsController.cs` | Add DELETE test-jobs cleanup endpoint |

### Next.js (`apps/web/`)

| File | Change |
|------|--------|
| `src/lib/analyzer/types.ts` | Add `PipelineStageId` type + `PIPELINE_STAGE_IDS` constant; extend `AnalysisInput` with `stopAfterStage` + `configOverrides` |
| `src/lib/analyzer/claimboundary-pipeline.ts` | Stage gates (string-based), config profile resolution, `buildPartialResult` helper; modify ~7 config loading sites |
| `src/lib/internal-runner-queue.ts` | Read `stopAfterStage` + `configOverrides` from job record, pass to pipeline |
| `src/lib/config-storage.ts` | Add listTestProfiles, deleteTestProfiles, countTestProfiles helpers |
| `src/app/api/fh/analyze/route.ts` | Pass through test fields to upstream |
| `src/app/api/fh/jobs/route.ts` | Pass through includeTestJobs param |
| `src/app/api/admin/config/test-profiles/route.ts` | **NEW** — list/delete test profiles |
| `src/app/api/admin/test-cleanup/route.ts` | **NEW** — combined test data cleanup |
| `src/app/admin/page.tsx` | Add test/tuning section |
| `src/app/admin/test-runner/page.tsx` | **NEW** — test runner UI |
| `src/app/jobs/page.tsx` | Add test job toggle for admins |
| `src/app/jobs/[id]/page.tsx` | Add test job indicators + partial result display |
| `src/app/admin/config/page.tsx` | Add test profiles tab |

---

## Agent Programmatic Workflow

An AI agent can run a complete test cycle with these API calls:

```bash
# 1. Create test config (optional — only if overriding defaults)
curl -X PUT -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  "http://localhost:3000/api/admin/config/pipeline/test%2Fexp-1" \
  -d '{"content": {...modified pipeline config...}, "versionLabel": "test: higher iterations"}'

# 2. Activate the test config
curl -X POST -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  "http://localhost:3000/api/admin/config/pipeline/test%2Fexp-1/activate" \
  -d '{"contentHash": "<hash from step 1>"}'

# 3. Submit test job (partial: stop after research stage)
curl -X POST -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  "http://localhost:3000/api/fh/analyze" \
  -d '{
    "inputType": "text",
    "inputValue": "Test claim here",
    "isTestRun": true,
    "stopAfterStage": "research",
    "configOverrides": { "pipeline": "test/exp-1" }
  }'
# → Returns { jobId: "abc123", status: "QUEUED" }

# 4. Poll for result
curl "http://localhost:5000/v1/jobs/abc123"
# → Returns partial result JSON with extract-claims + research data
# → meta.completedThrough = "research", meta.partialExecution = true

# 5. Cleanup (when done with experiments)
curl -X DELETE -H "X-Admin-Key: $KEY" \
  "http://localhost:3000/api/admin/test-cleanup?olderThanDays=1"
```

---

## Implementation Order

1. **Data model** (Entities.cs, Program.cs migration, JobService.cs) — foundation
2. **.NET controllers** (AnalyzeController, JobsController, InternalJobsController) — API surface
3. **Pipeline types + partial execution** (types.ts, claimboundary-pipeline.ts) — core feature
4. **Runner integration** (internal-runner-queue.ts) — threading test params
5. **Config helpers** (config-storage.ts, test-profiles route) — test config management
6. **Proxy routes** (analyze, jobs, test-cleanup) — Next.js → .NET forwarding
7. **Admin UI** (admin page, test runner, jobs pages, config page) — user interface

---

## Verification

1. **Unit tests**: Add tests for `buildPartialResult`, config profile resolution, test job filtering
2. **Manual test**: Create test config via API → submit test job with `stopAfterStage="research"` → verify partial JSON with `meta.completedThrough="research"`
3. **Isolation test**: Submit test job → verify it doesn't appear in public job list (`GET /v1/jobs`)
4. **Cleanup test**: Create test jobs → run cleanup → verify deletion and correct counts
5. **Build**: `npm -w apps/web run build` — verify no type errors
6. **Safe tests**: `npm test` — verify existing tests still pass

---

## Design Notes & Trade-offs

### Why profile-key-based (not content-hash overrides)?
The config-loader already accepts `profileKey` as a parameter. Using `test/` prefixed keys means:
- Zero changes to config.db schema
- All existing UCM API endpoints (save, activate, export, diff, history) work for test profiles
- Config audit trail is preserved
- Agents can use familiar UCM endpoints

### Why store configOverrides on JobEntity (not just in trigger payload)?
- **Auditability**: The job record shows exactly which configs were used
- **Persistence**: Survives process restarts (important for POC reliability)
- **Runner reads from job**: The runner already fetches the job record; adding fields costs nothing

### SQLite migration approach
Uses `ALTER TABLE` at startup with try/catch (same pattern as existing AnalysisMetrics migration). No EF migrations needed for this POC.

### What about concurrent test jobs with different configs?
Each test job stores its own `configOverrides` map. Two concurrent test jobs can use different test profiles safely because each job's pipeline reads its own overrides.

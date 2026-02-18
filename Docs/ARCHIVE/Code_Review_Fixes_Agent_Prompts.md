# Agent Prompts for Code Review Fixes (2026-02-18)

**Reference:** `Docs/WIP/Code_Review_Fixes_2026-02-18.md`
**Usage:** Copy-paste the prompt for each phase into the appropriate agent.

**Worktree strategy:**
- **Phases 1, 2, 3, 5:** Work on main (overlapping files, must be sequential)
- **Phase 4:** Can run on a worktree `fix/search-hardening` (isolated files, no overlap)

---

## Phase 1 — Security Fixes

**Agent:** Claude Code (Sonnet) or Cline
**Commit after:** Yes — `fix(security): add auth checks and extract shared auth utility`

```
As Senior Developer, execute Phase 1 from Docs/WIP/Code_Review_Fixes_2026-02-18.md.

## Task: Security fixes (7 items: SEC-1, SEC-2, SEC-3, SEC-4, H9, H10, L10)

Read the full Phase 1 section in Docs/WIP/Code_Review_Fixes_2026-02-18.md for details.

### Step 1: Create shared auth utility

Create `apps/web/src/lib/auth.ts` exporting:
- `getEnv(name: string): string` — reads process.env, returns "" if missing
- `secureCompare(expected: string, provided: string | null): boolean` — timing-safe comparison using `timingSafeEqual` from `node:crypto`. Extract the existing implementation from `apps/web/src/app/api/fh/system-health/route.ts` lines 15-26.
- `checkAdminKey(req: Request): boolean` — checks `x-admin-key` header against `FH_ADMIN_KEY` using `secureCompare`. In dev mode (no key set + NODE_ENV !== production), return true.
- `checkRunnerKey(req: Request): boolean` — checks `x-runner-key` header against `FH_INTERNAL_RUNNER_KEY` using `secureCompare`. In dev mode (no key set + NODE_ENV !== production), return true. In production with no key, return false.

### Step 2: Apply auth to unauthenticated endpoints

**SEC-1:** `apps/web/src/app/api/fh/jobs/[id]/cancel/route.ts`
- Add `checkAdminKey(req)` at top of POST handler. Return 401 if false.
- Pattern: copy from the sibling `delete/route.ts` which already checks admin key.

**SEC-2:** `apps/web/src/app/api/admin/test-config/route.ts`
- Add `checkAdminKey(req)` at top of GET handler. Return 401 if false.
- Pattern: see `apps/web/src/app/api/admin/search-stats/route.ts` for the existing admin auth check.

**H9:** `apps/web/src/app/api/internal/abort-job/[id]/route.ts`
- Replace the inline `isAuthorizedRunner` function with `checkRunnerKey` from the new auth utility. This ensures production guard is included.

### Step 3: Refactor existing routes to use shared auth

Replace duplicated auth logic in these files with imports from `apps/web/src/lib/auth.ts`:
- `apps/web/src/app/api/fh/jobs/[id]/delete/route.ts` — replace inline auth check with `checkAdminKey`
- `apps/web/src/app/api/admin/search-stats/route.ts` — replace inline `isAdmin` with `checkAdminKey`, replace `getEnv` with shared version
- `apps/web/src/app/api/fh/system-health/route.ts` — replace inline `secureCompare` and `getEnv` with shared versions
- `apps/web/src/lib/internal-runner-queue.ts` — replace inline `getEnv` with shared version

### Step 4: Fix XSS vulnerabilities

**SEC-3:** In `apps/web/src/app/jobs/[id]/page.tsx`, fix `handleExportHTML` (around line 545-567):
- Add a helper function `escapeHtml(str: string): string` that escapes `&`, `<`, `>`, `"`, `'`
- Apply it to all interpolated values in the HTML template: `analysisId`, `getShortName()`, `generatedAt`
- For the `content` variable (innerHTML), it is already HTML — do NOT double-escape it, but ensure it came from the sanitized ReactMarkdown output

**SEC-4:** In the same file, fix `decodeHtmlEntities` (around line 977-988):
- Replace `textarea.innerHTML = text; return textarea.value` with:
  ```typescript
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent || text;
  ```

### Verification
1. Run: `npm -w apps/web run build`
2. Run: `npm test`
3. Manual smoke test if services are running:
   - `curl -X POST http://localhost:3000/api/fh/jobs/test123/cancel` → expect 401
   - `curl http://localhost:3000/api/admin/test-config` → expect 401

### Commit
When all verifications pass, commit with:
fix(security): add auth checks to cancel/test-config endpoints, extract shared auth utility, fix XSS
```

---

## Phase 2 — Correctness Bugs

**Agent:** Claude Code (Opus)
**Commit after:** Yes — `fix(core): correctness fixes for circuit breaker, cache, delete, and abort`

```
As Senior Developer, execute Phase 2 from Docs/WIP/Code_Review_Fixes_2026-02-18.md.

## Task: Correctness bug fixes (11 items: BUG-1, BUG-2, H1-H8, M1)

Read the full Phase 2 section in Docs/WIP/Code_Review_Fixes_2026-02-18.md for details.

IMPORTANT: Phase 1 (security fixes) was already applied. The shared auth utility now exists at `apps/web/src/lib/auth.ts`. Do not duplicate or revert that work.

### Fix 1: BUG-1 — Source matching bug
File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` around line 1708
The `.find()` callback ignores the `s` parameter — it checks `ei.relevantClaimIds?.length > 0` which is the same for every iteration. Every evidence item gets attributed to `sources[0]`.
Fix: Simplify to `const matchedSource = sources[0];` and add a TODO comment: `// TODO: Match source by URL when LLM response includes source attribution`
This is the honest fix — the current code pretends to match but doesn't.

### Fix 2: BUG-2 — Circuit breaker double-counting
File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
Search for all calls to `recordSearchFailure` or `recordFailure` imported from `search-circuit-breaker`. These exist around lines 590-592, 648-649, and 1380.
Remove ALL circuit breaker `recordFailure`/`recordSearchFailure` calls from the pipeline file. The `web-search.ts` module already records failures at the correct abstraction boundary. The pipeline should only log warnings (which it already does via the `warnings` array).
Keep the warning-push logic, remove only the `recordSearchFailure(...)` calls.
Also remove the import of `recordFailure` / `recordSearchFailure` from `search-circuit-breaker` if it becomes unused.

### Fix 3: H1 — CASCADE delete orphans
File: `apps/api/Services/JobService.cs` in `DeleteJobAsync` (around lines 87-97)
Before `_db.Jobs.Remove(job)`, add explicit event deletion:
```csharp
var events = await _db.JobEvents.Where(e => e.JobId == jobId).ToListAsync();
_db.JobEvents.RemoveRange(events);
```
This ensures no orphaned event rows regardless of FK constraints.

### Fix 4: H2 — Delete running job unguarded
File: `apps/api/Controllers/InternalJobsController.cs` in the DELETE endpoint (around lines 49-58)
Before calling `_jobs.DeleteJobAsync(jobId)`, fetch the job and check state:
```csharp
var job = await _jobs.GetJobAsync(jobId);
if (job is null) return NotFound();
if (job.Status == "RUNNING" || job.Status == "QUEUED")
    return BadRequest(new { error = $"Cannot delete job in {job.Status} state. Cancel it first." });
```

### Fix 5: H3 — Missing using on HttpResponseMessage
File: `apps/api/Services/RunnerClient.cs` around line 63
Change `var res = await _http.SendAsync(req);` to `using var res = await _http.SendAsync(req);`

### Fix 6: H4 — Cache DB race condition
File: `apps/web/src/lib/search-cache.ts` around lines 72-73
Replace the singleton pattern with a promise-based lock:
```typescript
let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = (async () => {
      // ... existing initialization code ...
      const instance = await open({ ... });
      // ... existing table creation ...
      db = instance;
      return instance;
    })();
  }
  return dbPromise;
}
```

### Fix 7: H5 — Silent failures recorded as success
File: `apps/web/src/lib/web-search.ts`
In the auto-mode loop (around lines 252-266), change `recordSuccess(providerName)` to only be called when `providerResults.length > 0`. When results are empty, do NOT call `recordSuccess` — but also don't call `recordFailure` (empty results may be legitimate for some queries).
Apply the same change to the explicit provider blocks (around lines 119, 148, 177).

### Fix 8: H6 — Double caching in auto mode
File: `apps/web/src/lib/web-search.ts` around lines 274-276
Remove the `await cacheSearchResults(...)` call inside the loop. Keep only the post-filter cache write at lines 305-307. The loop `break` should remain.

### Fix 9: H7 — Abort signals module-scoped Map
File: `apps/web/src/app/api/internal/abort-job/[id]/route.ts` around line 15-16
Replace `const abortSignals = new Map<string, boolean>();` with a globalThis-based singleton:
```typescript
function getAbortSignals(): Map<string, boolean> {
  const g = globalThis as any;
  if (!g.__fhAbortSignals) {
    g.__fhAbortSignals = new Map<string, boolean>();
  }
  return g.__fhAbortSignals;
}
```
Update all usages of `abortSignals` in the file to call `getAbortSignals()` instead.
Check if the exported functions (`isJobAborted`, `clearAbortSignal`) are imported elsewhere — they likely are in `claimboundary-pipeline.ts`. Ensure the imports still work.

### Fix 10: H8 — No job ID validation
Add a `validateJobId` function to the shared auth utility (`apps/web/src/lib/auth.ts`):
```typescript
export function validateJobId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 128;
}
```
Add validation at the top of these route handlers (return 400 if invalid):
- `apps/web/src/app/api/fh/jobs/[id]/cancel/route.ts`
- `apps/web/src/app/api/fh/jobs/[id]/delete/route.ts`
- `apps/web/src/app/api/internal/abort-job/[id]/route.ts`

### Fix 11: M1 — Cancel race condition
File: `apps/api/Services/JobService.cs` in `CancelJobAsync` (around lines 73-85)
Instead of using `UpdateStatusAsync` (which re-fetches and unconditionally overwrites), do an inline update with a terminal-state guard:
```csharp
var job = await _db.Jobs.FindAsync(jobId);
if (job is null) return null;
if (job.Status == "SUCCEEDED" || job.Status == "FAILED" || job.Status == "CANCELLED")
    return job;
job.Status = "CANCELLED";
job.UpdatedAt = DateTime.UtcNow;
_db.JobEvents.Add(new JobEventEntity {
    JobId = jobId, Type = "info", Message = "Job cancelled by user",
    Timestamp = DateTime.UtcNow
});
await _db.SaveChangesAsync();
return job;
```
This keeps the read-check-write within a single EF context, reducing the race window.

### Verification
1. Run: `cd apps/api && dotnet build`
2. Run: `npm -w apps/web run build`
3. Run: `npm test`

### Commit
When all verifications pass, commit with:
fix(core): correctness fixes for circuit breaker, cache, delete, abort signals, and source matching
```

---

## Phase 3 — Type Safety & Rename

**Agent:** Claude Code (Sonnet) or Cline
**Commit after:** Yes — `refactor(types): remove as-any casts, complete ClaimAssessmentBoundary rename, fix Tavily gap`

```
As Senior Developer, execute Phase 3 from Docs/WIP/Code_Review_Fixes_2026-02-18.md.

## Task: Type safety and rename completion (4 items: M2, M3, H11, L9)

Read the full Phase 3 section in Docs/WIP/Code_Review_Fixes_2026-02-18.md for details.

IMPORTANT: Phases 1 and 2 were already applied. Do not duplicate or revert that work.

### Fix 1: M2 — Remove `as any` CalcConfig casts (5 locations)
File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

First, read `apps/web/src/lib/config-schemas.ts` to understand the `CalcConfigSchema` type. The fields `harmPotentialMultipliers`, `triangulation`, and `centralityWeights` ARE defined in the schema.

Then fix each cast:

1. Line ~2422: `getModelForTask(taskKey as any, ...)` — Read the `getModelForTask` function signature and either widen the parameter type to accept the value being passed, or cast to the correct type instead of `any`.

2. Line ~2517: `(calcConfig as any).harmPotentialMultipliers` — Replace with proper typed access. Since `CalcConfig` is inferred from `CalcConfigSchema`, the field should be accessible directly. If the runtime config object doesn't include it, use optional chaining: `calcConfig.harmPotentialMultipliers ?? { ... }`.

3. Line ~2531: `(aggregation.centralityWeights as any)?.[centrality]` — Type the lookup properly. If `centralityWeights` is `Record<string, number>`, use that type. If the interface needs updating, update it in `types.ts`.

4. Line ~2535: `(harmMultipliers as any)[harmLevel]` — If `harmMultipliers` is from `calcConfig.harmPotentialMultipliers`, type it with a proper Record type.

5. Line ~2656: `(calcConfig as any).triangulation` — Same approach as #2.

### Fix 2: M3 — Complete ClaimBoundary → ClaimAssessmentBoundary rename

**Priority fix — test file phantom import:**
File: `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
Line ~51: `import type { ... ClaimBoundary ... }` imports a type that does NOT exist in types.ts.
- Read `apps/web/src/lib/analyzer/types.ts` and find the actual type name (it should be `ClaimAssessmentBoundary`)
- Update the import and all usages of `ClaimBoundary` in the test file

**Comment cleanup in pipeline:**
File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
Search for all occurrences of "ClaimBoundary" (without "Assessment") in comments and strings. Replace with "ClaimAssessmentBoundary". Expected locations:
- Line ~2: file header comment
- Line ~108: JSDoc
- Line ~239: inline comment
- Line ~269: output string (this one affects user-visible output — update it)
- Line ~2036: JSDoc
- Line ~2113: comment

### Fix 3: H11 — Tavily provider gap
File: `apps/web/src/lib/config-schemas.ts` line ~54
Remove `"tavily"` from the `provider` enum: change to `z.enum(["auto", "google-cse", "serpapi", "brave"])`.
Search the codebase for any other references to "tavily" and remove/update them.
Do NOT add a Tavily handler — it was never implemented.

### Fix 4: L9 — Type `resolveJobId` parameter
Files: `apps/web/src/app/api/fh/jobs/[id]/cancel/route.ts`, `delete/route.ts`, `apps/web/src/app/api/internal/abort-job/[id]/route.ts`
In each file, change `async function resolveJobId(context: any)` to:
```typescript
async function resolveJobId(context: { params: Promise<{ id: string }> }): Promise<string>
```

### Verification
1. Run: `npm -w apps/web run build` — this is the KEY verification (type checking)
2. Run: `npm test`

### Commit
When all verifications pass, commit with:
refactor(types): remove as-any casts, complete ClaimAssessmentBoundary rename, fix Tavily gap
```

---

## Phase 4 — Search Hardening (WORKTREE CANDIDATE)

**Agent:** Cline or Claude Code (Sonnet)
**Branch:** `fix/search-hardening` (can be a worktree — no file overlap with other phases)
**Commit after:** Yes — `fix(search): harden cache, circuit breaker, and brave provider + add tests`

```
As Senior Developer, execute Phase 4 from Docs/WIP/Code_Review_Fixes_2026-02-18.md.

## Task: Search infrastructure hardening (6 items: M6, M7, L3, L4, L5, L6)

Read the full Phase 4 section in Docs/WIP/Code_Review_Fixes_2026-02-18.md for details.

### Fix 1: M6 — Global config mutation race
Files: `apps/web/src/lib/web-search.ts`, `search-cache.ts`, `search-circuit-breaker.ts`

Currently, `searchWebWithProvider` mutates global module state on every call (lines 85-92 of web-search.ts). Refactor:

**search-cache.ts:**
- Change `getCachedSearchResults(options)` to accept an optional `ttlDays` parameter: `getCachedSearchResults(options, ttlDays?: number)`
- Change `cacheSearchResults(options, results, provider)` to use the `ttlDays` from parameter instead of module-level config
- Keep `setSearchCacheEnabled` for the enable/disable toggle (this is less racey since it's boolean)

**search-circuit-breaker.ts:**
- Change `isProviderAvailable(name)` and `recordSuccess/recordFailure` to accept optional config: `isProviderAvailable(name, config?: CircuitBreakerConfig)`
- Use passed config if available, fall back to module-level config

**web-search.ts:**
- Pass config values as parameters instead of calling `setSearchCacheTtlDays`, `setCircuitBreakerConfig`
- Keep the `setSearchCacheEnabled` call (boolean, less race-prone)

### Fix 2: M7 — `dailyQuotaLimit` unused
File: `apps/web/src/lib/config-schemas.ts` around lines 83, 88, 93
Add a comment to each `dailyQuotaLimit` field: `// Declared for future enforcement — not currently tracked at runtime`

### Fix 3: L3 — Missing dateRestrict guard
File: `apps/web/src/lib/search-brave.ts` around line 53
Change:
```typescript
params.set("freshness", dateRestrictMap[options.dateRestrict]);
```
To:
```typescript
const mapped = dateRestrictMap[options.dateRestrict];
if (mapped) {
  params.set("freshness", mapped);
}
```

### Fix 4: L4 — HALF_OPEN unlimited probes
File: `apps/web/src/lib/search-circuit-breaker.ts` around line 97
Add a `halfOpenProbeInFlight` flag to `ProviderCircuitState`. In HALF_OPEN state, only allow one probe:
```typescript
if (state.state === "half_open") {
  if (state.halfOpenProbeInFlight) return false;
  state.halfOpenProbeInFlight = true;
  return true;
}
```
In `recordSuccess`: reset `halfOpenProbeInFlight = false` and transition to CLOSED.
In `recordFailure`: reset `halfOpenProbeInFlight = false` and transition back to OPEN.

### Fix 5: L5 — Add unit tests for new search modules
Create three test files following the pattern in `apps/web/test/unit/lib/search-provider-error.test.ts`:

**`apps/web/test/unit/lib/search-brave.test.ts`:**
- Test: missing API key returns empty array
- Test: placeholder key ("PASTE") returns empty array
- Test: successful response parsing
- Test: HTTP 429 throws SearchProviderError with fatal=true
- Test: HTTP 403 throws SearchProviderError with fatal=true
- Test: HTTP 500 returns empty array (non-fatal)
- Test: timeout returns empty array
- Mock `fetch` using vitest's `vi.fn()`

**`apps/web/test/unit/lib/search-cache.test.ts`:**
- Test: cache miss returns null
- Test: cache hit returns stored results
- Test: expired cache returns null
- Test: same options generate same cache key (determinism)
- Test: different options generate different keys
- Test: cleanup removes expired entries
- Mock `better-sqlite3` or use in-memory SQLite

**`apps/web/test/unit/lib/search-circuit-breaker.test.ts`:**
- Test: initial state is CLOSED, provider is available
- Test: failures below threshold keep CLOSED
- Test: failures at threshold transition to OPEN
- Test: OPEN state returns unavailable
- Test: after resetTimeout, transitions to HALF_OPEN
- Test: success in HALF_OPEN transitions to CLOSED
- Test: failure in HALF_OPEN transitions back to OPEN
- Test: resetCircuit clears state
- Test: HALF_OPEN allows only one concurrent probe

### Fix 6: L6 — statSync unresolved path
File: `apps/web/src/lib/search-cache.ts` around line 345
Change `fs.statSync(SEARCH_CACHE_CONFIG.dbPath)` to `fs.statSync(path.resolve(SEARCH_CACHE_CONFIG.dbPath))`

### Verification
1. Run: `npm test` — new tests should appear in the output
2. Run: `npm -w apps/web run build`

### Commit
When all verifications pass, commit with:
fix(search): harden cache init, circuit breaker half-open, brave provider + add unit tests
```

---

## Phase 5 — Pipeline & UI Polish

**Agent:** Claude Code (Opus for M4; Sonnet or Cline for the rest)
**Split into two commits if desired**

```
As Senior Developer, execute Phase 5 from Docs/WIP/Code_Review_Fixes_2026-02-18.md.

## Task: Pipeline and UI polish (15 items: M4, M5, M8-M13, L7, L8, L11, L13-L15)

Read the full Phase 5 section in Docs/WIP/Code_Review_Fixes_2026-02-18.md for details.

IMPORTANT: Phases 1-3 were already applied. Phase 4 may or may not have been applied (it's on a separate branch). Do not duplicate or revert previous work.

### Pipeline fixes (can be a separate commit)

**M4 — Abort signal in research loop:**
File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
Find the `researchEvidence` function and its main iteration loop (around lines 1100-1152). The function receives `state` but not `jobId`. Either:
- Add `jobId` as a parameter to `researchEvidence()`, or
- Read it from `state` if available (check if `state` carries `input.jobId`)
Then add `checkAbortSignal(jobId)` at the top of each loop iteration, inside the main `for`/`while` loop.

**M5 — Fragile LLM error detection:**
File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` around line 1464-1466
Change:
- `errMsg.includes("rate")` → `errMsg.includes("rate limit") || errMsg.includes("rate_limit")`
- `errMsg.includes("503")` → `errMsg.includes("status 503") || errMsg.includes("503 Service")`
Or better: check the error object for a `.status` property from the AI SDK.

**M8 — Monolithic DYNAMIC_BUDGET hardcoded:**
File: `apps/web/src/lib/analyzer/monolithic-dynamic.ts` lines 107-112
File: `apps/web/src/lib/config-schemas.ts` (PipelineConfigSchema section)
Add three new fields to PipelineConfigSchema:
```typescript
monolithicMaxIterations: z.number().int().min(1).max(10).optional().describe("Max research iterations for monolithic pipeline"),
monolithicMaxSearches: z.number().int().min(1).max(20).optional().describe("Max searches per monolithic analysis"),
monolithicMaxFetches: z.number().int().min(1).max(30).optional().describe("Max page fetches per monolithic analysis"),
```
Add defaults to `DEFAULT_PIPELINE_CONFIG`. Then in `monolithic-dynamic.ts`, load from config:
```typescript
const DYNAMIC_BUDGET: DynamicBudget = {
    maxIterations: pipelineConfig.monolithicMaxIterations ?? 4,
    maxSearches: pipelineConfig.monolithicMaxSearches ?? 6,
    maxFetches: pipelineConfig.monolithicMaxFetches ?? 8,
    timeoutMs: pipelineConfig.monolithicDynamicTimeoutMs ?? 150_000,
};
```

**M9 — Stale Orchestrated references:**
File: `apps/web/src/lib/analyzer/monolithic-dynamic.ts`
Line ~708: Replace "Orchestrated pipeline" with "ClaimAssessmentBoundary pipeline"
Line ~768: Same replacement

### UI fixes

**M10 — handleDelete missing finally:**
File: `apps/web/src/app/jobs/[id]/page.tsx` around lines 299-331
Add `finally { setIsDeleting(false); }` to the try/catch block (same pattern as `handleCancel`).

**M11 — Unused error states in AboutBox:**
File: `apps/web/src/components/AboutBox.tsx` lines 82-83
Remove `errHealth` and `errPipeline` state declarations and their `set` calls, since they are never displayed. Keep the try/catch but remove the error state setting (just `console.error` is enough).

**M12 — .replace only first hyphen:**
File: `apps/web/src/app/api/fh/system-health/route.ts` line 41
Change `.replace("-", "_")` to `.replaceAll("-", "_")`

**M13 — Version leaks config:**
File: `apps/web/src/app/api/version/route.ts`
Read the `x-admin-key` header. Only include `llm_provider` and `search_providers` fields in the response when admin key is valid. For unauthenticated requests, return only: `service`, `node_env`, `git_sha`, `now_utc`.

**L7 — No automatic cache cleanup:**
File: `apps/web/src/lib/search-cache.ts`
In the `cacheSearchResults` function, after the INSERT, add probabilistic cleanup:
```typescript
if (Math.random() < 0.01) {
  cleanupExpiredCache().catch(() => {});
}
```

**L8 — SerpAPI logs key prefix:**
File: `apps/web/src/lib/search-serpapi.ts` around line 29
Change `console.log(...starts with: ${apiKey.substring(0, 8)}...)` to just log the key length (same pattern as search-brave.ts).

**L11 — Dead CSS:**
File: `apps/web/src/components/SystemHealthBanner.module.css` around lines 58-62
Remove the `.providerError` class (no longer referenced in the component).

**L13 — Unnecessary reload:**
File: `apps/web/src/app/jobs/[id]/page.tsx` around line 290
Remove `setTimeout(() => window.location.reload(), 1000);` — the existing 2-second polling interval will update the UI.

**L14 — All providers enabled by default:**
File: `apps/web/src/lib/config-schemas.ts` around lines 127-143
Change `serpapi` and `brave` defaults to `enabled: false`. Keep `googleCse` as `enabled: true` (primary provider).

**L15 — Typo:**
File: `apps/web/.env.example` line 6
Change "allways" to "always"

### Verification
1. Run: `npm -w apps/web run build`
2. Run: `npm test`
3. Run: `cd apps/api && dotnet build` (if M8 touched .NET, otherwise skip)

### Commit
When all verifications pass, commit with message (or split into two):
fix(polish): pipeline abort check, monolithic UCM config, UI state fixes, stale references
```

---

## Post-Fix: Update Role Learnings

**Agent:** Any (Haiku is fine)

```
Append these 4 entries to Docs/AGENTS/Role_Learnings.md under the Code Reviewer section:

### Auth utility extraction (2026-02-18)
- **Category:** tip
- **Agent:** Code Reviewer (Claude Opus 4.6)
- **Learning:** All route files duplicated auth checks with varying quality — some used timingSafeEqual, some used ===. Extracting into a shared `lib/auth.ts` utility ensures consistent timing-safe comparison and reduces copy-paste drift.
- **Files:** `apps/web/src/lib/auth.ts` (new), all route files under `apps/web/src/app/api/`

### Circuit breaker ownership (2026-02-18)
- **Category:** gotcha
- **Agent:** Code Reviewer (Claude Opus 4.6)
- **Learning:** Circuit breaker `recordFailure()` was called in BOTH `web-search.ts` AND `claimboundary-pipeline.ts` for the same provider error, causing double-counting. With failureThreshold=3, circuits tripped after only 2 real failures. Record failures in exactly one place — the search abstraction layer.
- **Files:** `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

### Module-scoped state vs globalThis (2026-02-18)
- **Category:** gotcha
- **Agent:** Code Reviewer (Claude Opus 4.6)
- **Learning:** In Next.js dev mode, module-scoped Map/Set instances reset on HMR (hot module reload). The abort signals Map in the abort-job route was module-scoped, so cancelled jobs kept running after code changes. Use `globalThis` pattern for any in-memory state that must survive hot reloads. Pattern reference: `getRunnerQueueState()` in `internal-runner-queue.ts`.
- **Files:** `apps/web/src/app/api/internal/abort-job/[id]/route.ts`

### New file test coverage (2026-02-18)
- **Category:** tip
- **Agent:** Code Reviewer (Claude Opus 4.6)
- **Learning:** Three new modules (search-brave.ts, search-cache.ts, search-circuit-breaker.ts) shipped with zero test coverage. When adding new modules, create corresponding test files in the same session to avoid coverage gaps accumulating.
- **Files:** `apps/web/src/lib/search-brave.ts`, `apps/web/src/lib/search-cache.ts`, `apps/web/src/lib/search-circuit-breaker.ts`
```

---

## Execution Order Summary

| Order | Phase | Agent | Branch | Depends On |
|-------|-------|-------|--------|------------|
| 1st | Phase 1 (Security) | Sonnet/Cline | main | — |
| 2nd | Phase 2 (Correctness) | Opus | main | Phase 1 |
| 3rd | Phase 3 (Types) | Sonnet/Cline | main | Phase 2 |
| parallel | Phase 4 (Search) | Cline | worktree `fix/search-hardening` | Independent |
| 4th | Phase 5 (Polish) | Mixed | main | Phase 3 |
| last | Role Learnings | Haiku | main | All phases |

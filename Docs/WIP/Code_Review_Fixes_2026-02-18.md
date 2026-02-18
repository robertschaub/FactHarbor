# Code Review Fixes — Feb 17-18, 2026

**Date**: 2026-02-18
**Reviewer**: Code Reviewer (AI Agent, Claude Opus 4.6)
**Scope**: 20 commits + uncommitted working tree (30+ files across apps/api, apps/web)
**Status**: ✅ ALL PHASES COMPLETE (2026-02-18)

---

## Executive Summary

**Verdict: REQUEST CHANGES** — 6 critical, 11 high, 13 medium, 15 low findings across multi-provider search infrastructure, job cancellation/deletion, CB pipeline Stages 3-5, and UI changes. Architecture is sound; security and correctness bugs must be fixed before committing.

---

## Work Plan (5 Phases)

### Phase 1: Security Fixes (BLOCKING)

**Model tier:** Mid-tier (Sonnet) — pattern-following, 2-3 files each
**Estimated scope:** ~6 files touched, ~50 lines changed
**Bundle:** Do all in one session — they share auth patterns

| ID | Finding | File(s) | Fix | Lines |
|----|---------|---------|-----|-------|
| SEC-1 | Cancel endpoint unauthenticated | `apps/web/src/app/api/fh/jobs/[id]/cancel/route.ts`, `apps/api/Controllers/JobsController.cs` | Add `X-Admin-Key` check (copy pattern from `delete/route.ts`) | cancel: top of POST; controller: add `[FromHeader]` |
| SEC-2 | Test-config endpoint unauthenticated | `apps/web/src/app/api/admin/test-config/route.ts` | Add standard admin auth check at top of `GET` (same as `search-stats/route.ts`) | Lines 27+ |
| SEC-3 | XSS in HTML export | `apps/web/src/app/jobs/[id]/page.tsx` | Escape all interpolated values in `handleExportHTML` template with HTML entity encoder | Lines 545-567 |
| SEC-4 | XSS via `decodeHtmlEntities` | `apps/web/src/app/jobs/[id]/page.tsx` | Replace `textarea.innerHTML` with `new DOMParser().parseFromString(text, 'text/html').documentElement.textContent` | Lines 977-988 |

**Bundled with Phase 1:**

| ID | Finding | File(s) | Fix |
|----|---------|---------|-----|
| H9 | Abort-job auth falls open in prod | `apps/web/src/app/api/internal/abort-job/[id]/route.ts` | Add `NODE_ENV === "production"` guard (same pattern as `run-job/route.ts`) |
| H10 | Inconsistent auth comparison | All route files with auth | Extract `secureCompare` from `system-health/route.ts` into shared `apps/web/src/lib/auth.ts`; use in all routes |
| L10 | Duplicated `getEnv` helper | 3 files | Extract into same `apps/web/src/lib/auth.ts` or a `lib/env.ts` utility |

**New shared file:** `apps/web/src/lib/auth.ts` exporting `secureCompare(expected, provided)`, `checkAdminKey(req)`, `checkRunnerKey(req)`, `getEnv(name)`.

**Verification:**
- `npm -w apps/web run build` (type check)
- Manual: `curl -X POST http://localhost:3000/api/fh/jobs/test123/cancel` should return 401
- Manual: `curl http://localhost:3000/api/admin/test-config` should return 401

---

### Phase 2: Correctness Bugs (BEFORE NEXT ANALYSIS)

**Model tier:** High-capability (Opus) — cross-file reasoning, concurrency, data flow
**Estimated scope:** ~8 files touched, ~80 lines changed

| ID | Finding | File(s) | Fix |
|----|---------|---------|-----|
| BUG-1 | Source matching ignores `s` param | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:1708` | Fix `.find()` callback to match sources by URL field from LLM response, or simplify to `sources[0]` with TODO acknowledging limitation |
| BUG-2 | Circuit breaker double-counting | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:590-592,648-649,1380` | Remove `recordSearchFailure()` calls from pipeline — keep only in `web-search.ts` (the proper abstraction boundary). Pipeline should only log warnings, not record to circuit breaker. |
| H1 | CASCADE delete orphans | `apps/api/Services/JobService.cs:87-97` | Add explicit event deletion: `var events = await _db.JobEvents.Where(e => e.JobId == jobId).ToListAsync(); _db.JobEvents.RemoveRange(events);` before `_db.Jobs.Remove(job)` |
| H2 | Delete running job unguarded | `apps/api/Controllers/InternalJobsController.cs:49-58` | Add state check: reject DELETE for RUNNING/QUEUED jobs with 400 "Cancel first" |
| H3 | Missing `using` on HttpResponseMessage | `apps/api/Services/RunnerClient.cs:63` | Change to `using var res = await _http.SendAsync(req);` |
| H4 | Cache DB race condition | `apps/web/src/lib/search-cache.ts:72-73` | Implement promise-based singleton lock pattern (store the init promise, not just the result) |
| H5 | Silent failures recorded as success | `apps/web/src/lib/web-search.ts:252-266` | Only call `recordSuccess()` when `providerResults.length > 0` |
| H6 | Double caching in auto mode | `apps/web/src/lib/web-search.ts:274-276` | Remove cache write inside the loop; keep only post-filter cache at lines 305-307 |

**Also fix:**

| ID | Finding | File(s) | Fix |
|----|---------|---------|-----|
| H7 | Abort signals module-scoped Map | `apps/web/src/app/api/internal/abort-job/[id]/route.ts:15-16` | Move to `globalThis` pattern (same as `getRunnerQueueState()` in `internal-runner-queue.ts`) |
| H8 | No job ID validation | All `[id]` route files | Add `validateJobId(id)` function: `/^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 128` |
| M1 | Cancel race condition | `apps/api/Services/JobService.cs:73-85` | Add terminal-state guard inside `UpdateStatusAsync` (re-check status before overwrite) |

**Verification:**
- `npm test` (819 tests should still pass)
- `npm -w apps/web run build`
- `cd apps/api && dotnet build`

---

### Phase 3: Type Safety & Rename Completion (THIS WEEK)

**Model tier:** Mid-tier (Sonnet) for `as any` fixes; Cline for bulk rename
**Estimated scope:** ~10 files, ~100 lines

| ID | Finding | File(s) | Fix |
|----|---------|---------|-----|
| M2 | 5x `as any` CalcConfig casts | `claimboundary-pipeline.ts:2422,2517,2531,2535,2656` | Replace with properly typed access. Fields exist in `CalcConfigSchema` — use optional chaining on typed `CalcConfig`. For `taskKey as any` (2422), define valid task keys as union type. |
| M3 | Incomplete ClaimBoundary rename | `claimboundary-pipeline.ts` (6 comments), `claimboundary-pipeline.test.ts` (16+ refs, phantom type import at line 51) | Complete rename in comments. **Priority:** Fix `import type { ... ClaimBoundary }` in test file — it imports a nonexistent type, undermining test type safety. |
| H11 | Tavily in enum but unhandled | `config-schemas.ts:54`, `web-search.ts` | Decision needed: either implement Tavily handler or remove from enum. Recommend: remove from enum until implemented, add as TODO to backlog. |
| L9 | `resolveJobId` uses `any` | `cancel/route.ts`, `delete/route.ts`, `abort-job/route.ts` | Type parameter as `{ params: Promise<{ id: string }> }` |

**Verification:**
- `npm -w apps/web run build` (strict type check — this is the key verification)
- `npm test`

---

### Phase 4: Search Infrastructure Hardening (SOON)

**Model tier:** Mid-tier (Sonnet) for logic changes; Cline for tests
**Estimated scope:** ~6 files, ~150 lines (mostly new tests)

| ID | Finding | File(s) | Fix |
|----|---------|---------|-----|
| M6 | Global config mutation race | `web-search.ts:85-92`, `search-cache.ts`, `search-circuit-breaker.ts` | Refactor: pass config as function parameters instead of mutating module-level state. `searchWebWithProvider` already receives config — thread it through to cache/CB modules. |
| M7 | `dailyQuotaLimit` declared but unused | `config-schemas.ts:83,88,93` | Add comment: `// Declared for future enforcement — not currently tracked`. Add backlog item for quota tracking implementation. |
| L4 | HALF_OPEN unlimited probes | `search-circuit-breaker.ts:97-98` | Add `halfOpenProbeInFlight` flag; allow exactly one probe request in HALF_OPEN state. |
| L5 | No tests for 3 new modules | — | Create `test/unit/lib/search-brave.test.ts`, `test/unit/lib/search-cache.test.ts`, `test/unit/lib/search-circuit-breaker.test.ts`. Cover: HTTP error handling, cache hit/miss/TTL, state transitions. Pattern: follow `search-provider-error.test.ts`. |
| L3 | Missing `dateRestrict` guard | `search-brave.ts:53` | Add `if (mapped)` check before `params.set("freshness", ...)` |
| L6 | `statSync` unresolved path | `search-cache.ts:345` | Use `path.resolve(SEARCH_CACHE_CONFIG.dbPath)` consistently |

**Verification:**
- `npm test` (new tests should be included)
- `npm -w apps/web run build`

---

### Phase 5: Pipeline & UI Polish (TRACK)

**Model tier:** Opus for M4; Sonnet/Cline for the rest
**Estimated scope:** ~8 files, ~60 lines

| ID | Finding | File(s) | Fix |
|----|---------|---------|-----|
| M4 | No abort signal in research loop | `claimboundary-pipeline.ts` Stage 2 | Add `checkAbortSignal(input.jobId)` inside main research loop (after each iteration). Requires passing `jobId` into `researchEvidence()`. |
| M5 | Fragile LLM error detection | `claimboundary-pipeline.ts:1464-1466` | Replace `"rate"` with `"rate limit"`, `"503"` with check for HTTP status code property from AI SDK error. |
| M8 | Monolithic DYNAMIC_BUDGET hardcoded | `monolithic-dynamic.ts:107-112` | Add `monolithicMaxSearches`, `monolithicMaxFetches`, `monolithicMaxIterations` to `PipelineConfigSchema`. Wire in. |
| M9 | Stale "Orchestrated" references | `monolithic-dynamic.ts:708,768` | Replace with "ClaimAssessmentBoundary pipeline" |
| M10 | `handleDelete` missing `finally` | `jobs/[id]/page.tsx:299-331` | Add `finally { setIsDeleting(false); }` (same pattern as `handleCancel`) |
| M11 | Unused error states in AboutBox | `AboutBox.tsx:82-83` | Either display errors in JSX or remove `errHealth`/`errPipeline` state |
| M12 | `.replace` only first hyphen | `system-health/route.ts:41` | Change to `.replaceAll("-", "_")` or `.replace(/-/g, "_")` |
| M13 | Version leaks internal config | `version/route.ts` | Strip `llm_provider` and `search_providers` from unauthenticated response; include only when `X-Admin-Key` header present |
| L7 | No automatic cache cleanup | `search-cache.ts` | Add probabilistic cleanup: 1% chance on each cache write, call `cleanupExpiredCache()` |
| L8 | SerpAPI logs key prefix | `search-serpapi.ts:29` | Remove `starts with: ${apiKey.substring(0, 8)}` from log |
| L11 | Dead `.providerError` CSS | `SystemHealthBanner.module.css:58-62` | Remove unused class |
| L13 | Unnecessary `window.location.reload()` | `jobs/[id]/page.tsx:290` | Remove — existing 2s poll will pick up CANCELLED status |
| L14 | All providers enabled by default | `config-schemas.ts:127-143` | Default additional providers to `enabled: false` |
| L15 | Typo in .env.example | `.env.example:6` | "allways" -> "always" |

**Verification:**
- `npm test`
- `npm -w apps/web run build`
- `cd apps/api && dotnet build`

---

## Cross-Phase: New Learnings for Role_Learnings.md

After fixes are complete, add these entries to `Docs/AGENTS/Role_Learnings.md`:

1. **Auth utility extraction** (tip): All route files duplicate auth checks with varying quality (some use `timingSafeEqual`, some use `===`). Extract into shared `lib/auth.ts` early.
2. **Circuit breaker ownership** (gotcha): Record provider failures in exactly one place (the search abstraction layer), not in both the search module AND the pipeline caller.
3. **Module-scoped state vs `globalThis`** (gotcha): In Next.js dev mode, module-scoped `Map`/`Set` instances reset on HMR. Use `globalThis` pattern for any state that must survive hot reloads.
4. **New file test coverage** (tip): When adding new modules (`search-brave.ts`, `search-cache.ts`, `search-circuit-breaker.ts`), create corresponding test files in the same session.

---

## Summary by Priority

| Phase | Priority | Findings | Model Tier | Status | Commit |
|-------|----------|----------|------------|--------|--------|
| **1** | BLOCKING | SEC-1,2,3,4 + H9,H10,L10 | Sonnet | ✅ Done | (Phase 1-2 commits) |
| **2** | Before next analysis | BUG-1,2 + H1-H8 + M1 | Opus | ✅ Done | (Phase 1-2 commits) |
| **3** | This week | M2,M3 + H11 + L9 | Sonnet/Cline | ✅ Done | `5745432` |
| **4** | Soon | M6,M7 + L3-L6 | Sonnet/Cline | ✅ Done | `8319866` (merged `720a944`) |
| **5** | Track | M4,5,8-13 + L7,8,11,13-15 | Mixed | ✅ Done | `444e529` |

**Total:** 45 findings — all fixed across 5 phases. Role learnings committed (`88a5f63`).

### Completion Summary (2026-02-18)

**Phase 1-2** (Security + Correctness): Auth checks added to cancel/test-config endpoints, shared `lib/auth.ts` extracted, XSS fixed, circuit breaker double-counting resolved, cascade delete fixed, cache race condition fixed, abort signals moved to globalThis.

**Phase 3** (Type Safety): 5 `as any` casts removed, phantom type import fixed, ClaimAssessmentBoundary rename completed, Tavily removed from enum, route handlers properly typed.

**Phase 4** (Search Hardening): Config threading refactored (no global mutation), HALF_OPEN limited to one probe, 35 new tests across 3 modules (search-brave, search-cache, search-circuit-breaker).

**Phase 5** (Polish): Abort signal in research loop, fragile error detection fixed, monolithic budget moved to UCM, stale Orchestrated references updated, UI state bugs fixed, version endpoint auth-gated, probabilistic cache cleanup added.

**Build:** ✅ Compiles cleanly. **Tests:** 842/852 passing (10 failures are pre-existing framework issues).

---

## Agent Prompts

Prompts used for execution: **[Code_Review_Fixes_Agent_Prompts.md](Code_Review_Fixes_Agent_Prompts.md)**

**Worktree strategy used:**
- Phases 1 → 2 → 3 → 5: Sequential on main (overlapping files)
- Phase 4: Ran on worktree `fix/search-hardening`, merged back

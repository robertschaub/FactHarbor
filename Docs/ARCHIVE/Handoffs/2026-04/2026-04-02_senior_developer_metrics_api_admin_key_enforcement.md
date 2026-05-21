### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Metrics API Admin-Key Enforcement
**Task:** Add `X-Admin-Key` auth guard to all `MetricsController` endpoints, closing the access-control gap identified in code review. The metrics API now stores raw LLM output slices via `parseFailureArtifact`, making admin-only enforcement mandatory.
**Files touched:** `apps/api/Controllers/MetricsController.cs` (added `AuthHelper` import + `IsAdminKeyValid` guard to all 5 endpoints: `POST`, `GET {jobId}`, `GET summary`, `GET quality-health`, `DELETE cleanup`).
**Key decisions:** Applied the same `AuthHelper.IsAdminKeyValid(Request)` pattern used by `SystemHealthController` (resume/pause). Returns 401 with `{ error: "Admin key required" }` on missing/invalid key. The runner's `persistMetrics()` already sends `X-Admin-Key` in its `POST` call, so no web-side changes needed.
**Open items:** None — all 5 endpoints are now protected.
**Warnings:** The running API process locks `FactHarbor.Api.exe`, so full `dotnet build` cannot copy the output binary. Compilation was verified via `dotnet msbuild -t:Compile` (clean, no errors). The API will pick up the auth guards on next restart.
**For next agent:** The metrics API is now admin-only. If you add new metrics endpoints, follow the same pattern: `if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized(...)`.
**Learnings:** no
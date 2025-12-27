# Copilot / AI agent instructions — FactHarbor

Purpose: short, actionable notes to help an AI coding agent be immediately productive in this repo.

- **Big picture**: This is a small POC with two apps:
  - `apps/api` — ASP.NET Core API (SQLite by default). Key files: `Program.cs`, `Services/JobService.cs`, `Services/RunnerClient.cs`, `Controllers/*`.
  - `apps/web` — Next.js app (UI + runner/orchestrator). Key files: `src/app/api/internal/run-job/route.ts`, `src/lib/analyzer.ts`.

- **Primary data flow** (follow these files for behavior):
  1. Client/UI -> API creates a job via the `JobService` (`apps/api/Services/JobService.cs`).
  2. API triggers the runner via `RunnerClient` (`apps/api/Services/RunnerClient.cs`) which POSTs to the Next internal route `/api/internal/run-job`.
  3. Runner (Next route at `apps/web/src/app/api/internal/run-job/route.ts`) fetches the job (`/v1/jobs/{id}`), calls `runFactHarborAnalysis` from `apps/web/src/lib/analyzer.ts`, and writes progress/results back to API internal endpoints (`/internal/v1/jobs/{jobId}/status` and `/internal/v1/jobs/{jobId}/result`).

- **Auth & headers**: internal endpoints are protected by shared secrets in headers:
  - Runner calls Next: header `X-Runner-Key` (Runner:RunnerKey in API config / `FH_INTERNAL_RUNNER_KEY` in web env).
  - Runner -> API internal updates: header `X-Admin-Key` (API `Admin:Key` / env `FH_ADMIN_KEY`).
  - See `apps/api/appsettings.Development.example.json` for config keys.

- **Environment & run commands** (how developers run things):
  - Create env copies: `apps/web/.env.local` (from `.env.example`) and `apps/api/appsettings.Development.json` (from `appsettings.Development.example.json`).
  - Bootstrap (Windows):
    ```powershell
    powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
    ```
  - Web dev: `cd apps/web && npm run dev` (Next on port 3000).
  - API: open `apps.api.sln` or `cd apps/api && dotnet run` (API on port 5000 by default).

- **Important env names / config keys** (use exact names):
  - Web/runner: `FH_INTERNAL_RUNNER_KEY`, `FH_API_BASE_URL`, `FH_ADMIN_KEY`, `FH_RUNNER_KEY` (check `.env.example`).
  - API config (appsettings): `Runner:BaseUrl`, `Runner:RunnerKey`, `Admin:Key`, `ConnectionStrings:FhDbSqlite`.

- **Status values & job schema**: `JobEntity` (apps/api/Data/Entities.cs) uses `Status` values like `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`; `Progress` is 0–100. Results stored in `ResultJson` and `ReportMarkdown`.

- **Patterns & conventions to follow when editing**:
  - Keep internal endpoints idempotent and guarded by header checks (`X-Admin-Key` or `X-Runner-Key`). See `InternalJobsController.cs` and `run-job/route.ts` for examples.
  - Use `JobService` for any DB changes to keep events consistent (it appends `JobEventEntity` rows for history).
  - Runner code runs in the Next server runtime (`export const runtime = "nodejs"`); prefer fetch-based calls with `{ cache: "no-store" }` for fresh reads.
  - DB is auto-created in `Program.cs` via `db.Database.EnsureCreated()` — migrations are not used in this POC.

- **Integration and testing tips for agents**:
  - To locally test the end-to-end flow: start API and web, then create a job via the API UI or `POST /v1/jobs` (follow `JobsController.cs`). Verify runner receives job by checking logs and API job status changes.
  - When changing internal headers or keys, update both API `appsettings` and web env variables consistently.

- **Where to look for behavior examples**:
  - Runner trigger: `apps/api/Services/RunnerClient.cs` (constructs URL and header `X-Runner-Key`).
  - Runner implementation: `apps/web/src/app/api/internal/run-job/route.ts` (shows how job is fetched, how status/result PUTs happen, and error handling).
  - Job lifecycle: `apps/api/Services/JobService.cs` and `apps/api/Controllers/InternalJobsController.cs` (status/result endpoints).

If anything here is unclear or you'd like me to expand examples (curl snippets, env samples, or step-by-step run-through), tell me which part to elaborate.

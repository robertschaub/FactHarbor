# Copilot / AI agent instructions — FactHarbor

> **For domain-heavy tasks** (pipeline changes, prompt engineering, terminology, architecture):
> read `/AGENTS.md` first — it contains all project rules, terminology, and architecture reference.

Purpose: short, actionable notes to help an AI coding agent be immediately productive in this repo.

- **Big picture**: This is a small POC with two apps:
  - `apps/api` — ASP.NET Core API (SQLite by default). Key files: `Program.cs`, `Services/JobService.cs`, `Services/RunnerClient.cs`, `Controllers/*`.
  - `apps/web` — Next.js app (UI + runner/orchestrator). Key files: `src/app/api/internal/run-job/route.ts`, `src/lib/analyzer/orchestrated.ts`.

- **Primary data flow** (follow these files for behavior):
  1. Client/UI -> API creates a job via the `JobService` (`apps/api/Services/JobService.cs`).
  2. API triggers the runner via `RunnerClient` (`apps/api/Services/RunnerClient.cs`) which POSTs to the Next internal route `/api/internal/run-job`.
  3. Runner (Next route at `apps/web/src/app/api/internal/run-job/route.ts`) fetches the job (`/v1/jobs/{id}`), calls `runFactHarborAnalysis` from `apps/web/src/lib/analyzer.ts`, and writes progress/results back to API internal endpoints (`/internal/v1/jobs/{jobId}/status` and `/internal/v1/jobs/{jobId}/result`).

- **Critical terminology** (always follow — see AGENTS.md for details):
  - **AnalysisContext** = Top-level analytical frame. NEVER call this "scope".
  - **EvidenceScope** = Per-evidence source metadata. NEVER call this "context".
  - **EvidenceItem** = Extracted evidence. NEVER call these "facts" in new code.
  - **No hardcoded keywords**: Code and prompts must be generic for ANY topic.
  - **Input neutrality**: "Was X fair?" must yield same analysis as "X was fair".

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

- **Safety**:
  - Do not access production systems or real customer data.
  - Do not change secrets/credentials or commit them.
  - Avoid destructive git commands unless explicitly asked.

- **Roles**: When the user starts with "As \<Role\>" (e.g., "As Senior Developer, fix…"), follow the **Role Activation Protocol** in `/AGENTS.md`. It tells you which role to load from `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §2 and which documents to read. If loading all Required Reading exceeds your context window, load only the role entry and defer reads until needed.

- **Agent handoff**: You are primarily used for inline completions and chat. For large multi-file refactors, suggest Cursor Composer or Claude Code. See `/AGENTS.md` Agent Handoff Protocol for full reference.

- **Where to look for behavior examples**:
  - Runner trigger: `apps/api/Services/RunnerClient.cs` (constructs URL and header `X-Runner-Key`).
  - Runner implementation: `apps/web/src/app/api/internal/run-job/route.ts` (shows how job is fetched, how status/result PUTs happen, and error handling).
  - Job lifecycle: `apps/api/Services/JobService.cs` and `apps/api/Controllers/InternalJobsController.cs` (status/result endpoints).

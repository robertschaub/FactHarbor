# AGENTS.md — FactHarbor API (.NET)

Applies to all files under `apps/api/`. For project-wide rules, see `/AGENTS.md`.

## Technology

- .NET 8 (ASP.NET Core with controllers)
- Entity Framework Core 8 with SQLite
- Swashbuckle for Swagger/OpenAPI

## Project Structure

| Path | Purpose |
|------|---------|
| `Program.cs` | App startup, DI registration, DB auto-create |
| `Controllers/JobsController.cs` | Public job CRUD (GET/list) |
| `Controllers/AnalyzeController.cs` | POST /v1/analyze — creates job + triggers runner |
| `Controllers/InternalJobsController.cs` | PUT status/result (X-Admin-Key protected) |
| `Controllers/HealthController.cs` | Health check endpoint |
| `Controllers/VersionController.cs` | Version info endpoint |
| `Controllers/MetricsController.cs` | Metrics endpoint |
| `Controllers/SystemHealthController.cs` | System health endpoint |
| `Services/JobService.cs` | All DB writes (creates JobEventEntity rows for audit history) |
| `Services/RunnerClient.cs` | HTTP client to Next.js runner with retry + exponential backoff |
| `Data/Entities.cs` | JobEntity, JobEventEntity |
| `Data/FhDbContext.cs` | EF Core DbContext |

## Key Patterns

- **DB bootstrap + manual schema updates.** `db.Database.EnsureCreated()` in `Program.cs` creates new DBs, but does not alter existing tables.
- **Manual SQL migration scripts live in `apps/api/migrations/`.** Only an authorized main-session database task may apply relevant scripts for existing databases after entity/schema changes (e.g., `004_add_verdict_summary_columns.sql` adds `VerdictLabel` and `TruthPercentage`).
- **All DB writes go through `JobService`.** It appends `JobEventEntity` rows for history/audit. Never write to DbContext directly from controllers.
- **Internal endpoints use header auth.** `InternalJobsController` checks `X-Admin-Key` via `IsAuthorized()`. This is a shared-secret mechanism, not full AuthN/AuthZ.
- **RunnerClient has built-in retry.** Exponential backoff with jitter.

## Configuration (appsettings)

| Key | Purpose |
|-----|---------|
| `Db:Provider` | Database provider (default: sqlite) |
| `ConnectionStrings:FhDbSqlite` | SQLite path (default: ./factharbor.db) |
| `Admin:Key` | Shared secret for internal endpoints |
| `Runner:BaseUrl` | Next.js runner URL (default: http://localhost:3000) |
| `Runner:RunnerKey` | Shared secret for runner trigger |
| `Runner:TimeoutMinutes` | HTTP timeout for runner call |

## Commands

| Action | Command |
|--------|---------|
| Run (hot reload) | `dotnet watch run` (from `apps/api`) |
| Build | `dotnet build` (from `apps/api`) |
| Test | `dotnet test ../api.Tests` (from `apps/api`; offline, in-memory SQLite) |
| Swagger | http://localhost:5000/swagger |
| Reset DB | Destructive main-session operation only when explicitly authorized; preserve the assigned backup/recovery plan |

## Status Values

`JobEntity.Status`: `QUEUED` -> `RUNNING` -> `SUCCEEDED` | `FAILED` | `CANCELLED`; `INTERRUPTED` (RUNNING at API startup) is re-queued by the runner.
`SUCCEEDED`, `FAILED` and `CANCELLED` are terminal: `JobService` refuses later status changes and result writes for them and records each as a job event.
`Progress`: 0-100 integer.

## Safety

- Do not overwrite `factharbor.db` unless explicitly asked.
- Do not commit `appsettings.Development.json` (contains secrets).
- Internal endpoints must always check `X-Admin-Key` or `X-Runner-Key` headers.

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

- **No EF migrations.** DB is auto-created via `db.Database.EnsureCreated()` in `Program.cs`.
- **All DB writes go through `JobService`.** It appends `JobEventEntity` rows for history/audit. Never write to DbContext directly from controllers.
- **Internal endpoints use header auth.** `InternalJobsController` checks `X-Admin-Key` via `IsAuthorized()`. This is a shared-secret POC mechanism, not full AuthN/AuthZ.
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
| Run (hot reload) | `cd apps/api && dotnet watch run` |
| Build | `cd apps/api && dotnet build` |
| Swagger | http://localhost:5000/swagger |
| Reset DB | Delete `factharbor.db`, restart (auto-recreated) |

## Status Values

`JobEntity.Status`: `QUEUED` -> `RUNNING` -> `SUCCEEDED` | `FAILED`
`Progress`: 0-100 integer.

## Safety

- Do not overwrite `factharbor.db` unless explicitly asked.
- Do not commit `appsettings.Development.json` (contains secrets).
- Internal endpoints must always check `X-Admin-Key` or `X-Runner-Key` headers.

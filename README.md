# FactHarbor — POC1 (Next.js + .NET + SQLite)

This repository is a minimal, runnable POC1 scaffold:
- **apps/api**: ASP.NET Core API (system of record: jobs, status, results, events)
- **apps/web**: Next.js app (UI + AI orchestrator)

## Quick start (Windows)
1) Create local env files:
- `apps/web/.env.local` (copy from `.env.example`)
- `apps/api/appsettings.Development.json` (copy from `appsettings.Development.example.json`)

2) Run:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

3) Verify:
- API health: http://localhost:5000/health
- Web health: http://localhost:3000/api/health
- UI: http://localhost:3000

## Notes
- POC uses **SQLite** by default (file `apps/api/factharbor.db`).
- The API creates jobs and triggers the Next runner (`/api/internal/run-job`).
- Runner writes progress + results back to the API via internal endpoints.

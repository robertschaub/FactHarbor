# FactHarbor Setup & Deployment Checklist

> ⚠️ _Updated 2026-09-23: rewritten for the current local stack. Removed the manual database migration options, the 2026-03-10 release notes, the Orchestrated-era metrics and performance instructions, and the baseline and A/B test runners. The previous version is archived in [Docs/ARCHIVE/DEPLOYMENT_CHECKLIST_arch.md](Docs/ARCHIVE/DEPLOYMENT_CHECKLIST_arch.md)._

---

## ✅ Pre-Deployment Checklist

### 1. Database Setup

- [ ] **No `dotnet ef` step**: when the API starts (step 3) it applies any pending registered EF Core migrations and adds three known Jobs columns if they are missing; this creates `apps/api/factharbor.db` (including the `AnalysisMetrics` table). A brand-new database currently needs one manual fix; see the `IsHidden` entry under Troubleshooting.

### 2. Build Verification

- [ ] **Web build successful**
  ```bash
  cd apps/web
  npm run build
  ```
  Expected: the build completes without errors

- [ ] **API build successful**
  ```bash
  cd apps/api
  dotnet build
  ```
  Expected: Build succeeded. 0 Error(s)

### 3. Service Startup

- [ ] **Start both services** (recommended)
  ```powershell
  ./scripts/restart-clean.ps1
  ```
  Stops leftover API and web processes, starts the API, reseeds the system-default prompts and configs, then starts the web app.

Or start them manually:

- [ ] **Start API server**
  ```bash
  cd apps/api
  dotnet run
  # or: dotnet watch run (for hot reload)
  ```
  Expected: `Now listening on: http://localhost:5000`

- [ ] **Start Web server**
  ```bash
  cd apps/web
  npm run dev
  ```
  Expected: the web app is reachable at `http://localhost:3000`

### 4. Endpoint Verification

- [ ] **API Health Check**
  ```
  http://localhost:5000/health
  ```
  Expected: `{"ok":true,"db":{"can_connect":true,"error":null},"now_utc":"..."}` (HTTP 503 with `"ok":false` if the database is unreachable)

- [ ] **Web Health Check**
  ```
  http://localhost:3000/api/health
  ```
  Expected: `"status":"healthy"` (`degraded` if a stored UCM config is invalid; `unhealthy` if a required key such as `FH_ADMIN_KEY` or the LLM provider's API key is missing, or the API is unreachable)

- [ ] **Swagger UI** (Development environment only)
  ```
  http://localhost:5000/swagger
  ```
  Expected: Swagger UI with `/api/fh/metrics` endpoints visible

- [ ] **Analysis Monitoring dashboard** (asks for the admin key)
  ```
  http://localhost:3000/admin/quality-health
  ```
  Expected: the dashboard loads; it has data only after an analysis has finished

---

## 🧪 Functional Testing

Each analysis makes real LLM and search calls, so it costs money.

### Test 1: Manual Analysis

- [ ] Submit an analysis via the UI
  ```
  http://localhost:3000/analyze
  Input: Using hydrogen for cars is more efficient than using electricity
  ```
  Use only a Captain-defined input (`AGENTS.md` → Captain-Defined Analysis Inputs). Unless you are logged in to the admin area in this browser tab, the form also needs an invite code; create or look one up at `/admin/invites`.

- [ ] Wait for completion (a run can take many minutes)
- [ ] View results at `/jobs/[id]`
- [ ] Compare the verdict, truth percentage and confidence with the input's band in `Docs/AGENTS/benchmark-expectations.json`. That file also lists known open issues for this input, including a run shape in about 1 in 5 runs that is structurally incomplete and low in confidence, so one such run is not by itself a deployment failure.

### Test 2: Metrics API

The metrics endpoints require the `X-Admin-Key` header.

- [ ] Get metrics for a job (replace `{jobId}`)
  ```
  http://localhost:5000/api/fh/metrics/{jobId}
  ```
  Expected: JSON metrics for the job

- [ ] Get summary statistics
  ```
  http://localhost:5000/api/fh/metrics/summary?limit=10
  ```
  Expected: summary statistics over the stored metrics

### Test 3: Dashboard

- [ ] View the Analysis Monitoring dashboard
  ```
  http://localhost:3000/admin/quality-health
  ```

- [ ] Verify it now shows data from the finished analysis

---

## 🔧 Configuration

Metrics collection is built into the pipeline; no code changes are needed. Model selection, thresholds, limits and prompts are UCM settings under Admin → Config (`/admin/config`). Environment variables cover infrastructure, secrets and startup concurrency, for example `FH_RUNNER_MAX_CONCURRENCY`; see `apps/web/.env.example`.

---

## ✅ Deployment Complete When...

- [ ] Web and API builds succeed
- [ ] Both services running
- [ ] Health checks passing
- [ ] Swagger UI accessible (Development environment)
- [ ] Analysis Monitoring dashboard accessible
- [ ] Manual analysis works end-to-end

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| **QUICKSTART.md** | Start the services and view metrics |
| **Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Getting Started/WebHome.xwiki** | Full setup, configuration and health checks |
| **Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki** | Metrics API documentation |
| **Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Testing Strategy/WebHome.xwiki** | Testing approach & cost management |

---

## 🆘 Troubleshooting

### Issue: API fails at startup with a `no such column` error for `IsHidden`
**Solution**: Known issue on a brand-new database: the `AddIsHidden` EF Core migration is not registered, so startup never adds the `Jobs.IsHidden` column. Add it with the SQLite command-line shell (`sqlite3`, or any SQLite tool that can run SQL), then start the API again:
```bash
sqlite3 apps/api/factharbor.db "ALTER TABLE Jobs ADD COLUMN IsHidden INTEGER NOT NULL DEFAULT 0;"
```

### Issue: Analysis Monitoring dashboard shows no data
**Solution**: This is expected until the first analysis job has finished. If a finished job still shows nothing, check that `FH_ADMIN_KEY` in `apps/web/.env.local` matches the API's `Admin:Key` (`scripts/validate-config.ps1` reports a mismatch), and look for `[Metrics] Failed to persist` or `[Metrics] Error persisting metrics` in the web server output.

### Issue: API won't start - port conflict
**Solution**: 
```bash
# Kill process on port 5000
npx kill-port 5000
# Then restart API
```
`./scripts/restart-clean.ps1` also stops leftover processes before restarting both services.

### Issue: Web won't start - port conflict
**Solution**:
```bash
# Kill process on port 3000
npx kill-port 3000
# Then restart Web
```

### Issue: TypeScript errors in new files
**Solution**: Restart TypeScript server in VS Code:
- Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Quick Start Guide - Metrics

> ⚠️ _Updated 2026-09-23: removed the Orchestrated-era metrics hooks, the `dotnet ef` migration step, the baseline and A/B test runners and the unused environment variables. The previous version is archived in [Docs/ARCHIVE/QUICKSTART_arch.md](Docs/ARCHIVE/QUICKSTART_arch.md)._

## 🚀 Start the Services

```powershell
# First run: checks the config files, starts the API (port 5000), then installs web dependencies and starts the web app (port 3000)
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1

# Later restarts: stops leftover API and web processes, starts the API, reseeds the system-default prompts and configs, then starts the web app
./scripts/restart-clean.ps1
```

On startup the API runs its EF Core migrations plus a small column patch. This creates `apps/api/factharbor.db`, including the `AnalysisMetrics` table, so no `dotnet ef` step is needed.

For prerequisites, API keys and health checks, see **Getting Started** under Documentation below.

---

## 📈 View Metrics

Analysis jobs record their metrics automatically: duration, token counts, estimated cost (when every LLM call can be priced), quality-gate statistics and per-call schema-compliance flags.

### Dashboard
`http://localhost:3000/admin/quality-health` (Analysis Monitoring, in the admin area, which asks for the admin key). The old `/admin/metrics` path redirects there.

### API (Programmatic)
The metrics endpoints require the `X-Admin-Key` header.

```bash
# Get metrics for a job
curl -H "X-Admin-Key: <admin key>" http://localhost:5000/api/fh/metrics/{jobId}

# Get summary statistics (optional: startDate, endDate)
curl -H "X-Admin-Key: <admin key>" "http://localhost:5000/api/fh/metrics/summary?limit=100"
```

---

## 🔧 Configuration

Analysis settings such as models, thresholds, limits and prompts are UCM settings, edited under Admin → Config (`/admin/config`). Environment variables cover infrastructure, secrets and startup concurrency, for example `FH_ADMIN_KEY` and `FH_RUNNER_MAX_CONCURRENCY`; see `apps/web/.env.example`.

---

## 📚 Documentation

- **Getting Started**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Getting Started/WebHome.xwiki`
- **Metrics Schema**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki`
- **Testing Strategy**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Testing Strategy/WebHome.xwiki`
- **Current Status**: `Docs/STATUS/Current_Status.md`

---

## 🆘 Troubleshooting

### Dashboard shows no metrics
- Metrics appear once an analysis job has finished. Submit an analysis first.
- If a finished job still shows nothing, check that `FH_ADMIN_KEY` in `apps/web/.env.local` matches the API's `Admin:Key` (`scripts/validate-config.ps1` reports a mismatch), and look for `[Metrics] Failed to persist` or `[Metrics] Error persisting metrics` in the web server output.

### API fails to start or cannot open the database
- Run `./scripts/restart-clean.ps1`, which stops leftover API and web processes before starting new ones.
- Check that `apps/api/factharbor.db` is writable.

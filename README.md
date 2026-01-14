# FactHarbor — POC1 (Next.js + .NET + SQLite)

> **[What is FactHarbor?](ONEPAGER.md)** — Vision, mission, and how it works.

This repository is a runnable POC scaffold:
- **apps/api**: ASP.NET Core API (system of record: jobs, status, results, events)
- **apps/web**: Next.js app (UI + AI orchestrator)

## Quick start (Windows)

### 1. Prerequisites
- Node.js LTS, .NET SDK 8.x, Git
- Visual Studio 2022 (for API), Cursor or VS Code (for Web)
- See [Getting Started Guide](Docs/USER_GUIDES/Getting_Started.md) for detailed setup

### 2. Create local env files
- `apps/web/.env.local` (copy from `.env.example`)
- `apps/api/appsettings.Development.json` (copy from `appsettings.Development.example.json`)

### 3. Run
```powershell
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

### 4. Verify
- API health: http://localhost:5000/health
- Web health: http://localhost:3000/api/health
- UI: http://localhost:3000

## Documentation

### User Guides
- **[Getting Started](Docs/USER_GUIDES/Getting_Started.md)** - Complete setup and first run guide
- **[Admin Interface](Docs/USER_GUIDES/Admin_Interface.md)** - Admin dashboard and configuration testing
- **[LLM Configuration](Docs/USER_GUIDES/LLM_Configuration.md)** - Configure AI providers and search

### Architecture
- **[Overview](Docs/ARCHITECTURE/Overview.md)** - System architecture, data models, component interactions
- **[Calculations](Docs/ARCHITECTURE/Calculations.md)** - Verdict calculation methodology
- **[KeyFactors Design](Docs/ARCHITECTURE/KeyFactors_Design.md)** - KeyFactors implementation details
- **[Source Reliability](Docs/ARCHITECTURE/Source_Reliability.md)** - Source scoring system
- **[Claim Caching Overview (Planned)](Docs/ARCHITECTURE/Claim_Caching_Overview.md)** - Proposed claim-level caching (not implemented)
- **[Separated Architecture Guide (Planned)](Docs/ARCHITECTURE/Separated_Architecture_Guide.md)** - Detailed planned claim-caching implementation (not implemented)

### Development
- **[Coding Guidelines](Docs/DEVELOPMENT/Coding_Guidelines.md)** - Code quality standards and principles
- **[Compliance Audit](Docs/DEVELOPMENT/Compliance_Audit.md)** - Rules compliance review

### Deployment
- **[Zero Cost Hosting Guide](Docs/DEPLOYMENT/Zero_Cost_Hosting_Guide.md)** - Deploy on free tier infrastructure

### Status
- **[Current Status](Docs/STATUS/Current_Status.md)** - What works, known issues, priorities
- **[CHANGELOG](Docs/STATUS/CHANGELOG.md)** - Version history and bug fixes
- **[Backlog](Docs/STATUS/Backlog.md)** - Prioritized task list
- **[Improvement Recommendations](Docs/STATUS/Improvement_Recommendations.md)** - Comprehensive analysis of potential enhancements

### Project Documentation
- **[AGENTS.md](AGENTS.md)** - Rules for AI coding assistants (at project root)
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[SECURITY.md](SECURITY.md)** - Security policy and reporting
- **[LICENSE.md](LICENSE.md)** - Open source license

## Key Features

- **Multi-LLM Support**: Anthropic, OpenAI, Google, Mistral
- **Multi-Search Support**: Google CSE, SerpAPI, Gemini Grounded
- **7-Point Verdict Scale**: TRUE to FALSE with confidence
- **Scope Detection**: Analyze multiple contexts independently
- **Quality Gates**: Claim validation and verdict confidence assessment
- **Dependency Tracking**: Claims can depend on other claims
- **Pseudoscience Detection**: Escalates problematic claims
- **Real-Time Progress**: Server-Sent Events for live updates
- **PDF/HTML Support**: Extract and analyze content from URLs

## Architecture Notes

- POC uses **SQLite** by default (file `apps/api/factharbor.db`)
- PostgreSQL for production deployments
- The API creates jobs and triggers the Next runner (`/api/internal/run-job`)
- Runner writes progress + results back to API via internal endpoints
- Separated architecture: API for persistence, Web for analysis

## Environment Variables

### Required
```bash
# LLM Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-...  # Recommended
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# MISTRAL_API_KEY=...

# Search Provider
SERPAPI_API_KEY=...
# Or: GOOGLE_CSE_API_KEY=... and GOOGLE_CSE_ID=...

# Internal Keys (must match between web and API)
FH_ADMIN_KEY=your-secure-admin-key
FH_INTERNAL_RUNNER_KEY=your-secure-runner-key
```

See [LLM Configuration Guide](Docs/USER_GUIDES/LLM_Configuration.md) for complete configuration options.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/first-run.ps1` | Initial setup and start |
| `scripts/restart-clean.ps1` | Restart all services |
| `scripts/stop-services.ps1` | Stop all services |
| `scripts/health.ps1` | Check service health |
| `scripts/version.ps1` | Show version info |

## Getting Help

- **Documentation**: See `Docs/` folder structure above
- **Issues**: Report bugs via GitHub Issues
- **Logs**: Check `apps/web/debug-analyzer.log` for analysis details
- **Admin UI**: http://localhost:3000/admin/test-config for configuration testing
- **API Docs**: http://localhost:5000/swagger for API exploration

## License

See [LICENSE.md](LICENSE.md) for details.

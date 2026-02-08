# FactHarbor — POC1 (Next.js + .NET + SQLite)

**Version**: 2.6.33 | **Schema**: 2.7.0 | **Status**: Operational POC

> **[What is FactHarbor?](ONEPAGER.md)** — Vision, mission, and how it works.

This repository is a runnable POC scaffold:
- **apps/api**: ASP.NET Core API (system of record: jobs, status, results, events)
- **apps/web**: Next.js app (UI + AI orchestrator)

## Quick start (Windows)

### 1. Prerequisites
- Node.js LTS, .NET SDK 8.x, Git
- Visual Studio 2022 (for API), Cursor or VS Code (for Web)
- See [Getting Started Guide](Docs/xwiki-pages/FactHarbor/User%20Guides/Getting%20Started/WebHome.xwiki) for detailed setup

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

> Stable reference documentation lives in **xWiki format** under `Docs/xwiki-pages/FactHarbor/`.
> Active development docs and operational files remain as `.md`. See [AGENTS.md](AGENTS.md) for format rules.

### xWiki Documentation (Master Source)
- **[xWiki Pages](Docs/xwiki-pages/FactHarbor/)** - Master documentation: specification, architecture, user guides, organisation
- **[xWiki Viewer](Docs/xwiki-pages/README.md#xwiki-viewer-local-wysiwyg-preview)** - Local WYSIWYG preview: `Docs\xwiki-pages\View.cmd`

### User Guides (xWiki)
- **[Getting Started](Docs/xwiki-pages/FactHarbor/User%20Guides/Getting%20Started/WebHome.xwiki)** - Complete setup and first run guide
- **[Admin Interface](Docs/xwiki-pages/FactHarbor/User%20Guides/Admin%20Interface/WebHome.xwiki)** - Admin dashboard and configuration testing
- **[LLM Configuration](Docs/xwiki-pages/FactHarbor/User%20Guides/LLM%20Configuration/WebHome.xwiki)** - Configure AI providers and search

### Architecture
- **[Overview](Docs/xwiki-pages/FactHarbor/Specification/Implementation/Architecture%20Overview/WebHome.xwiki)** - System architecture, data models, component interactions (xWiki)
- **[Calculations](Docs/ARCHITECTURE/Calculations.md)** - Verdict calculation methodology (.md — active development)
- **[Evidence Quality Filtering](Docs/ARCHITECTURE/Evidence_Quality_Filtering.md)** - Multi-layer filtering defense (.md — active development)
- **[Source Reliability](Docs/xwiki-pages/FactHarbor/Specification/Implementation/Source%20Reliability%20System/WebHome.xwiki)** - Source scoring system (xWiki)
- **[Pipeline Architecture](Docs/xwiki-pages/FactHarbor/Specification/Implementation/Pipeline%20Architecture/TriplePath%20Architecture/WebHome.xwiki)** - Triple-path pipeline design (xWiki)

### Development
- **[Coding Guidelines](Docs/xwiki-pages/FactHarbor/Specification/Development/Guidelines/Coding%20Guidelines/WebHome.xwiki)** - Code quality standards and principles (xWiki)

### Status
- **[Current Status](Docs/STATUS/Current_Status.md)** - What works, known issues, priorities
- **[Known Issues](Docs/STATUS/KNOWN_ISSUES.md)** - Complete list of bugs and limitations
- **[Development History](Docs/STATUS/HISTORY.md)** - Version history, architectural decisions, and investigations
- **[Backlog](Docs/STATUS/Backlog.md)** - Prioritized task list
- **[Improvement Recommendations](Docs/STATUS/Improvement_Recommendations.md)** - Comprehensive analysis of potential enhancements

### Project Documentation
- **[AGENTS.md](AGENTS.md)** - Rules for AI coding assistants
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide for metrics & testing
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Deployment verification checklist
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[SECURITY.md](SECURITY.md)** - Security policy and reporting
- **[LICENSE.md](LICENSE.md)** - Open source license

## Key Features

### Implemented & Operational
- **Multi-LLM Support**: Anthropic, OpenAI, Google, Mistral
- **Multi-Search Support**: Google CSE, SerpAPI, Gemini Grounded
- **7-Point Verdict Scale**: TRUE to FALSE with confidence
- **MIXED vs UNVERIFIED**: Distinguishes contested evidence from insufficient evidence
- **Multi-Scope Detection**: Analyzes multiple contexts independently (legal, methodological, temporal)
- **Quality Gates**: Claim validation (Gate 1) and verdict confidence (Gate 4)
- **Dependency Tracking**: Claims can depend on other claims with automatic propagation
- **Pseudoscience Detection**: Escalates debunked claims automatically
- **KeyFactors**: Emergent decomposition questions for complex analyses
- **Input Neutrality**: Question and statement forms yield equivalent results
- **Real-Time Progress**: Server-Sent Events for live updates
- **PDF/HTML Support**: Extract and analyze content from URLs
- **Triple-Path Pipeline**: Orchestrated, Monolithic Canonical, Monolithic Dynamic modes

### Built But Not Integrated
- **Metrics Collection**: Complete observability infrastructure (database + dashboard)
- **Testing Framework**: Baseline test suite (30 cases) + A/B testing
- **Performance Optimizations**: Parallel verdicts (50-80% faster), Tiered LLM routing (50-70% cost savings)

### Known Limitations
- Metrics infrastructure not connected to analyzer
- v2.8 prompt optimizations never validated with real API calls
- Quality gate decisions not displayed in UI (data exists in JSON)
- No claim caching (recomputes every analysis)
- Security hardening needed before public deployment (SSRF, rate limiting, auth)

## Architecture Notes

- **Version**: 2.6.33 (code) | 2.7.0 (schema output)
- **Database**: SQLite by default (`apps/api/factharbor.db`), PostgreSQL for production
- **Job Flow**: API creates jobs → triggers Next runner (`/api/internal/run-job`) → runner writes progress/results back
- **Separated Architecture**: API for persistence, Web for analysis
- **Main Engine**: `apps/web/src/lib/analyzer.ts` (~6700 lines)
- **Analysis Modes**: Quick (4 iterations, 12 sources) vs Deep (5 iterations, 20 sources)

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

See [LLM Configuration Guide](Docs/xwiki-pages/FactHarbor/User%20Guides/LLM%20Configuration/WebHome.xwiki) for complete configuration options.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/first-run.ps1` | Initial setup and start |
| `scripts/restart-clean.ps1` | Restart all services |
| `scripts/stop-services.ps1` | Stop all services |
| `scripts/health.ps1` | Check service health |
| `scripts/version.ps1` | Show version info |

## Getting Help

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for rapid setup
- **Current Issues**: See [Known Issues](Docs/STATUS/KNOWN_ISSUES.md) for complete bug list
- **Development History**: See [HISTORY.md](Docs/STATUS/HISTORY.md) for architectural decisions and investigations
- **Documentation**: See `Docs/` folder structure above
- **Logs**: Check `apps/web/debug-analyzer.log` for analysis details
- **Admin UI**: http://localhost:3000/admin/test-config for configuration testing
- **Metrics Dashboard**: http://localhost:3000/admin/metrics (built but needs metrics integration)
- **API Docs**: http://localhost:5000/swagger for API exploration

## License

See [LICENSE.md](LICENSE.md) for details.

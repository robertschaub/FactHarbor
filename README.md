# FactHarbor (Next.js + .NET + SQLite)

**Version**: 2.6.33 | **Schema**: 2.7.0 | **Status**: Alpha

> **[What is FactHarbor?](ONEPAGER.md)** — Vision, mission, and how it works.

This repository contains:
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

### Browse Documentation Online

The full specification and guides are available as a rendered documentation site — no download required:

**[FactHarbor Documentation](https://robertschaub.github.io/FactHarbor/)** — full page tree, search, wiki links, include transclusion, Mermaid diagrams, deep linking via URL hash.

### Browse Documentation Locally

The full FactHarbor specification, architecture, and user guides are stored as `.xwiki` files and can be browsed locally without a running xWiki server. Two options:

**Option A: Browser viewer** (recommended for reading)
```
Docs\xwiki-pages\View.cmd
```
This launches a local HTTP server and opens a WYSIWYG viewer in your browser. It renders headings, tables, Mermaid diagrams, `{{info}}`/`{{warning}}` boxes, wiki links (clickable to navigate between pages), and `{{include}}` transclusions. The sidebar shows the full page tree with search. Start at the root `FactHarbor` page and follow the navigation links.

**Option B: VS Code extension** (recommended while editing)
```powershell
code --install-extension tools/vscode-xwiki-preview/xwiki-preview-1.0.0.vsix
```
After installing, open any `.xwiki` file and press `Ctrl+Shift+V` to toggle a live preview panel. The extension also adds an **XWiki Pages** tree view in the Explorer sidebar.

**Suggested reading order to get familiar with FactHarbor:**
1. [Specification root](Docs/xwiki-pages/FactHarbor/Specification/WebHome.xwiki) — mission, purpose, core concepts, functional lifecycle
2. [Architecture](Docs/xwiki-pages/FactHarbor/Specification/Architecture/WebHome.xwiki) — system architecture with embedded diagrams
3. [Implementation Overview](Docs/xwiki-pages/FactHarbor/Specification/Implementation/Architecture%20Overview/WebHome.xwiki) — current codebase architecture, data models, component interactions
4. [POC Specification](Docs/xwiki-pages/FactHarbor/Specification/POC/WebHome.xwiki) — what POC1 proves, success criteria, scope

### xWiki Documentation (Master Source)
- **[xWiki Pages](Docs/xwiki-pages/FactHarbor/)** — Master documentation tree (specification, architecture, user guides, organisation)
- **[xWiki Pages README](Docs/xwiki-pages/README.md)** — File format, sync workflow, syntax reference

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

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/first-run.ps1` | Initial setup and start |
| `scripts/restart-clean.ps1` | Restart all services |
| `scripts/stop-services.ps1` | Stop all services |
| `scripts/health.ps1` | Check service health |
| `scripts/version.ps1` | Show version info |

## Getting Help

- **Logs**: `apps/web/debug-analyzer.log` for analysis details
- **Admin UI**: http://localhost:3000/admin/test-config for configuration testing
- **API Docs**: http://localhost:5000/swagger for API exploration

## License

See [LICENSE.md](LICENSE.md) for details.

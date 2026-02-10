# FactHarbor

**AI-powered evidence analysis for claims and narratives.**

**Version**: 2.6.33 | **Schema**: 2.7.0 | **Status**: Alpha

> **[What is FactHarbor?](ONEPAGER.md)** — Vision, mission, and how it works.

## Quick Start (Windows)

1. Install prerequisites: Node.js LTS, .NET SDK 8.x, Git
2. Copy env files:
   - `apps/web/.env.example` → `apps/web/.env.local`
   - `apps/api/appsettings.Development.example.json` → `apps/api/appsettings.Development.json`
3. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
   ```
4. Open http://localhost:3000

See the [Getting Started Guide](https://robertschaub.github.io/FactHarbor/?page=Product+Development.DevOps.Guidelines.Getting+Started.WebHome) for detailed setup instructions.

## Documentation

**[Browse online](https://robertschaub.github.io/FactHarbor/)** — full rendered documentation with search, navigation, and diagrams.

**Browse locally** — run `Docs\xwiki-pages\View.cmd` to launch the local viewer, or install the [VS Code extension](tools/vscode-xwiki-preview/) for in-editor preview.

All reference documentation lives as `.xwiki` files under [`Docs/xwiki-pages/FactHarbor/`](Docs/xwiki-pages/). See the [xWiki Pages README](Docs/xwiki-pages/README.md) for format details and sync workflow.

## Repository Structure

```
apps/api/       ASP.NET Core API (jobs, status, results)
apps/web/       Next.js app (UI + AI orchestrator)
Docs/           Documentation (xWiki pages, status, architecture)
scripts/        Setup and management scripts
tools/          VS Code xWiki preview extension
```

## Contributing

- **[AGENTS.md](AGENTS.md)** — Rules for AI coding assistants
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to contribute
- **[Current Status](Docs/STATUS/Current_Status.md)** — What works, known issues, priorities

## License

See [LICENSE.md](LICENSE.md).

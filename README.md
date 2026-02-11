# FactHarbor

## What is FactHarbor?

FactHarbor is an AI-powered platform that turns complex, contested information into structured breakdowns that make reasoning visible and verifiable.

An Evidence Model contains:

- **Claims** — Key assertions extracted from the source material
- **Analysis Contexts** — The frames and conditions under which claims may hold or fail
- **Evidence** — Supporting and opposing sources with quality ratings and reliability scores
- **Verdicts** — Conclusions with explicit confidence levels and cited evidence
- **Full Transparency** — Every assumption, algorithm, and data source is exposed

The result is not a single verdict, but an **evidence landscape** — showing where a claim holds up, where it fails, and where reasonable disagreement exists.

**Who benefits?** Journalists, researchers, educators, policy analysts, and anyone navigating contested claims who wants to *understand*, not just believe.

## Documentation

**[Browse full documentation online](https://robertschaub.github.io/FactHarbor/)** — vision, architecture, methodology, and the complete project roadmap.

## Contributing

Contributions are welcome — FactHarbor is in alpha, and your input shapes the platform.

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Setup, testing, coding standards
- **[AGENTS.md](AGENTS.md)** — Rules and terminology for AI coding assistants

## Quick Start (Windows)

**Prerequisites:** Node.js 18+, .NET SDK 8.0, Git

1. Clone the repo
2. Copy environment files:
   - `apps/web/.env.example` → `apps/web/.env.local`
   - `apps/api/appsettings.Development.example.json` → `apps/api/appsettings.Development.json`
3. Bootstrap:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
   ```
4. Open http://localhost:3000

See the [Getting Started Guide](https://robertschaub.github.io/FactHarbor/?page=Product+Development.DevOps.Guidelines.Getting+Started.WebHome) for detailed setup, configuration, and troubleshooting.

**Tech stack:** Next.js + ASP.NET Core + LLM orchestration (Anthropic, OpenAI, Google, Mistral)

**Repository structure:**

```
apps/api/       ASP.NET Core API (jobs, persistence, status)
apps/web/       Next.js app (UI + AI orchestration pipeline)
Docs/           xWiki documentation (specs, guides, architecture)
scripts/        Setup and management scripts
```
## License

FactHarbor uses a multi-license model to maximize openness while protecting transparency:

| Content | License |
|---------|---------|
| Documentation | CC BY-SA 4.0 |
| Code (default) | MIT |
| Code (core engine) | AGPL-3.0 |
| Structured data | ODbL |

See [LICENSE.md](LICENSE.md) for full details.

---

*FactHarbor — Making complex claims transparent through evidence, context, and open reasoning.*

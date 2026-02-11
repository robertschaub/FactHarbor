# Contributing to FactHarbor

## Prerequisites

- Node.js 18+ (LTS)
- .NET SDK 8.0
- Python 3.10+ (for xWiki conversion scripts, optional)
- Git
## API Keys Required

FactHarbor uses external AI and search services. You need API keys before running analyses.

### LLM Providers

| Provider | Key | Required? | Sign Up |
|----------|-----|-----------|---------|
| **Anthropic** (Claude) | `ANTHROPIC_API_KEY` | **Yes** | [console.anthropic.com](https://console.anthropic.com/) |
| **OpenAI** | `OPENAI_API_KEY` | **Yes** | [platform.openai.com](https://platform.openai.com/) |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | [aistudio.google.com](https://aistudio.google.com/) |
| Mistral | `MISTRAL_API_KEY` | Optional | [console.mistral.ai](https://console.mistral.ai/) |

### Web Search Provider

| Provider | Keys | Recommended? | Sign Up |
|----------|------|-------------|---------|
| **Google Custom Search** | `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` | **Yes** (faster, cheaper) | [programmablesearchengine.google.com](https://programmablesearchengine.google.com/) |
| SerpAPI | `SERPAPI_API_KEY` | Fallback | [serpapi.com](https://serpapi.com/) |

> **Cost note:** These are commercial services with pay-per-use pricing. Both Anthropic and OpenAI offer free trial credits for new accounts. Google CSE provides 100 free queries/day. Typical development usage costs single-digit $/month. See each provider's website for current pricing and free tier details.

> **Licensing:** By using these API keys you agree to each provider's terms of service. FactHarbor itself is open source, but the external AI and search services it depends on are commercial products with their own licensing terms.

## Setup

1. Clone the repo
2. Copy environment files:
   - `apps/web/.env.example` → `apps/web/.env.local`
   - `apps/api/appsettings.Development.example.json` → `apps/api/appsettings.Development.json`
3. Add your API keys to `apps/web/.env.local` (see [API Keys Required](#api-keys-required) above)
4. Bootstrap everything:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
   ```
5. Start both services (both must run simultaneously):
   - **Web**: `cd apps/web && npm run dev` (Next.js on port 3000)
   - **API**: `cd apps/api && dotnet watch run` (ASP.NET on port 5000, Swagger at `/swagger`)
6. Open http://localhost:3000

See the [Getting Started Guide](https://robertschaub.github.io/FactHarbor/?page=Product+Development.DevOps.Guidelines.Getting+Started.WebHome) for detailed configuration and troubleshooting.

**Repository structure:**

```
apps/api/       ASP.NET Core API (jobs, persistence, status)
apps/web/       Next.js app (UI + AI orchestration pipeline)
Docs/           xWiki documentation (specs, guides, architecture)
scripts/        Setup and management scripts
```

## Testing

- `npm test` — runs vitest for `apps/web`
- `npm run lint` — not yet configured
- API: `cd apps/api && dotnet build` (no automated test suite yet)

## Architecture Rules

- Orchestration logic lives in **TypeScript** (`apps/web`)
- Persistence and job lifecycle live in **.NET** (`apps/api`)
- Keep changes small and spec-driven
- Follow [AGENTS.md](AGENTS.md) for all coding conventions and terminology

## Coding Standards

- Commit messages: conventional commits (`type(scope): description`)
- No hardcoded domain-specific terms in code or prompts (see AGENTS.md "Generic by Design")
- **AnalysisContext** != **EvidenceScope** (see AGENTS.md terminology section)
- Platform: Windows (use PowerShell-compatible commands)

## AI Agent Workflow

This project uses AI coding agents extensively. If you are an AI agent, read:
- [AGENTS.md](AGENTS.md) — fundamental rules, terminology, architecture
- [Docs/AGENTS/](Docs/AGENTS/) — role-specific instructions
- Tool-specific configs: `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.clinerules/`, `.windsurfrules`

## Questions?

Open a GitHub issue or discuss with the project lead.

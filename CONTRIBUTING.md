# Contributing to FactHarbor

## Prerequisites

- Node.js 18+ (LTS)
- .NET SDK 8.0
- Python 3.10+ (for xWiki conversion scripts, optional)
- Git

## Setup

1. Clone the repo
2. Copy environment files:
   - `apps/web/.env.example` -> `apps/web/.env.local`
   - `apps/api/appsettings.Development.example.json` -> `apps/api/appsettings.Development.json`
3. Bootstrap everything:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
   ```

## Running Locally

- **Web**: `cd apps/web && npm run dev` (Next.js on port 3000)
- **API**: `cd apps/api && dotnet watch run` (ASP.NET on port 5000, Swagger at `/swagger`)
- Both must run simultaneously for the end-to-end analysis flow.

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

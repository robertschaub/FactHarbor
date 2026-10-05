# Contributing to FactHarbor

## Project state and change authority

FactHarbor remains an invite-gated Alpha. Broader engineering is paused; a bounded approved task does not reopen the full development plan. Use current source and effective UCM versions for implementation claims. A commit, successful build or service version alone does not establish deployed behavior or active prompt/configuration versions.

Read the task's assigned status and backlog before status-dependent work, following [agent routing](AGENTS.md#current-implementation). Public contributors can use this checkout's source, quality contracts and setup instructions independently. Missing task context is a gap to report; it is not evidence that an issue is closed or a held action is allowed.

Existing constraints remain in force:

- Model comparisons remain stopped. Decomposition/aggregation, narrative/adjudication input changes, the proposed clustering-schema change, source-reliability eligibility and cap changes require their separate decisions. Preserve the current validator count-floor and MT-5 eligibility; the proposed validator-unavailability skip was not selected.
- Evidence-applicability capture and experimental supplementary/source-native retrieval stay default-off. Offline implementation or a credit balance does not authorize activation, retention, observation or paid runs. Do not prune the main analysis prompt before measurement and stage isolation exist.
- Paid evaluation requires current action, exact-input and budget authority, verified active prompt/configuration provenance, isolated comparator jobs and explicit stop criteria. Keep stopped experiments stopped. See the [quality contract](Docs/AGENTS/Captain_Quality_Expectations.md) and [calibration contract](apps/web/test/README.md#calibration-contract).
- Deployment, configuration activation, service changes and evidence cleanup are separate actions. Preserve existing evidence and worktrees; recovery requires an authorized, verified backup. Do not delete a database as a startup remedy.

### Known limits

Input phrasing/language, evidence attribution, decomposition and grounding have unresolved quality or validation gaps. There is no general cross-provider failover; test coverage and observability remain incomplete. Source-reliability identity/cache limitations and a visible configuration toggle do not establish a working quality control. Verify behavior against current code and task evidence. The dated [security and operating limitations](Docs/site/product-development/specification/architecture/security-and-operations/index.md#operational-limits) must be checked before wider access.

## Prerequisites

- Node.js >=22.23.3
- .NET SDK 8.0.x
- Python 3.12+ (for the optional documentation preview)
- Git

## API Keys Required

FactHarbor uses external AI and search services. You need API keys before running analyses.
For checks without credentials or running services, use [Credential-free worker checks](#credential-free-worker-checks).

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

This setup runs live services and analyses. Worker checks use the [separate procedure](Docs/DEVELOPMENT/Credential_Free_Worker_Checks.md).

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

See the [Getting Started Guide](Docs/site/product-development/devops/guidelines/getting-started/index.md) for detailed configuration and troubleshooting.

**Repository structure:**

```
apps/api/       ASP.NET Core API (jobs, persistence, status)
apps/web/       Next.js app (UI + AI orchestration pipeline)
Docs/           Markdown documentation (specifications, guides, architecture)
scripts/        Setup and management scripts
```

## Testing

- `npm test` — runs Vitest for `apps/web` with configured expensive-suite exclusions
- `npm run lint` — not yet configured
- API: `cd apps/api && dotnet build`; `dotnet test apps/api.Tests` runs the offline `JobService` tests (also run in CI)

### Credential-free worker checks

For an assigned worker verification task, use the [complete credential-free worker procedure](Docs/DEVELOPMENT/Credential_Free_Worker_Checks.md). It defines disposable state, credential and service checks, test selection, build side effects and evidence requirements. Read it before invoking preparation or runtime tools.

## Architecture Rules

- Orchestration logic lives in **TypeScript** (`apps/web`)
- Persistence and job lifecycle live in **.NET** (`apps/api`)
- Keep changes small and spec-driven
- Follow [AGENTS.md](AGENTS.md) for all coding conventions and terminology

## Coding Standards

- Commit messages: conventional commits (`type(scope): description`)
- No hardcoded domain-specific terms in code or prompts (see AGENTS.md "Generic by Design")
- **ClaimAssessmentBoundary** != **EvidenceScope** (see AGENTS.md terminology section)
- Platform: Windows (use PowerShell-compatible commands)

## AI Agent Workflow

This project uses AI coding agents extensively. If you are an AI agent, read:
- [AGENTS.md](AGENTS.md) — fundamental rules, terminology, architecture
- [Docs/AGENTS/](Docs/AGENTS/) — role-specific instructions
- Tool-specific configs: `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.clinerules/`, `.windsurfrules`

## Questions?

Open a GitHub issue or discuss with the project lead.

## Licensing contributions

Contributors other than Robert Schaub retain ownership. Before inclusion, they must explicitly accept the [contributor copyright agreement](CONTRIBUTOR-AGREEMENT.md) for the identified contribution. It grants Robert Schaub nonexclusive permission for public and alternative licensing. Identify third-party material and any required employer or other rights-holder approval. Submission alone is not acceptance.

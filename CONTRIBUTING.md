# Contributing to FactHarbor

## Prerequisites

- Node.js >=20.19.0
- .NET SDK 8.0.x
- Python 3.10+ (for xWiki conversion scripts, optional)
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

This setup runs live services and analyses. Worker checks use the separate recipe below.

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

- `npm test` — runs Vitest for `apps/web` with configured expensive-suite exclusions; it still discovers the service-dependent job lifecycle test
- `npm run lint` — not yet configured
- API: `cd apps/api && dotnet build` (no automated test suite yet)

### Credential-free worker checks

Use a fresh, disposable worktree at a recorded commit, with Node.js >=20.19.0 and .NET SDK 8.0.x. Record exact `node --version`, `npm --version`, `dotnet --version`, and `dotnet --list-sdks` output; verify the selected SDK is 8.0.x. Run from the worktree root in a credential-free PowerShell process. Do not copy `.env.local`, development settings, credentials, or development databases into it, and do not inherit provider keys, npm/NuGet authentication, or live API endpoint overrides. Check presence without printing secret values.

Keep services off throughout. Before installation and again after checks, record `git status --short` and inspect listeners:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000, 5000 } |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

An empty result is required; a failed inspection is not evidence that ports are clear. If a listener exists, stop and report it to the parent session. Do not stop an existing service. These checks, absent credentials, and test exclusions are **operational safeguards, not network confinement**: other ports, remote endpoints, outbound requests, and a service starting after inspection remain possible. Record the actual sandbox/network restrictions separately.

Prepare a unique `test-output/preparation/<task-id>/` directory inside this worktree. The following example uses `worker-checks-01`; choose a fresh task ID and verify the resolved path before creating state. Set paths before loading application modules, discovering tests, or building:

```powershell
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) 'test-output/preparation/worker-checks-01'))
if (Test-Path -LiteralPath $taskRoot) { throw 'Choose a fresh task ID' }
foreach ($dir in @('app', 'cache/npm', 'cache/node-gyp', 'cache/nuget/packages',
    'cache/nuget/http', 'cache/nuget/plugins', 'dotnet-home', 'tmp', 'logs', 'evidence')) {
  New-Item -ItemType Directory -Path (Join-Path $taskRoot $dir) -Force | Out-Null
}
$env:FH_CONFIG_DB_PATH = Join-Path $taskRoot 'app/config.db'
$env:FH_SR_CACHE_PATH = Join-Path $taskRoot 'cache/source-reliability.db'
$env:FH_SEARCH_CACHE_PATH = Join-Path $taskRoot 'cache/search-cache.db'
$env:FH_DEBUG_LOG_PATH = Join-Path $taskRoot 'logs/debug-analyzer.log'
$env:ConnectionStrings__FhDbSqlite = 'Data Source=' + (Join-Path $taskRoot 'app/factharbor.db')
$env:TEMP = $env:TMP = $env:TMPDIR = Join-Path $taskRoot 'tmp'
$env:npm_config_cache = Join-Path $taskRoot 'cache/npm'
$env:npm_config_devdir = Join-Path $taskRoot 'cache/node-gyp'
$env:NUGET_PACKAGES = Join-Path $taskRoot 'cache/nuget/packages'
$env:NUGET_HTTP_CACHE_PATH = Join-Path $taskRoot 'cache/nuget/http'
$env:NUGET_PLUGINS_CACHE_PATH = Join-Path $taskRoot 'cache/nuget/plugins'
$env:DOTNET_CLI_HOME = Join-Path $taskRoot 'dotnet-home'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:FH_ALLOW_CONFIG_FILE_WRITE = 'false'
```

Use repository prompt/default sources and no inherited `FH_PROMPT_DIR` or `FH_CONFIG_DEFAULTS_DIR` overrides. Do not set `NODE_ENV=development`. Application databases (including SQLite sidecars), application caches, temporary files, logs, and evidence belong under `$taskRoot`. The config-file-loading test creates and removes fixtures using `os.tmpdir()`, so temporary-directory settings matter even for unit tests.

Name exceptions before running: dependency/build outputs remain in worktree `node_modules`, `apps/web/.next` (including `.next/cache`), and `apps/api/bin` and `apps/api/obj`; Vitest/Vite may also cache under workspace `node_modules`. These are disposable tool outputs, not development application state. npm, node-gyp, NuGet package/HTTP/plugin caches and .NET CLI home are redirected above. Any required shared installation cache is a separate exception: record its exact path, purpose and read/write access in advance; stop on an undeclared outside-state write requirement.

**Installation is a separate phase.** Under the installation permissions provided by the parent session, use the checked-in npm lock and record each command's output and exit code:

```powershell
npm ci
dotnet restore apps/api --use-lock-file --lock-file-path "$taskRoot/cache/nuget/packages.lock.json"
dotnet restore apps/api --locked-mode --lock-file-path "$taskRoot/cache/nuget/packages.lock.json"
```

Run commands individually and stop on any nonzero exit code (`$LASTEXITCODE`). `npm ci` installs from `package-lock.json`, including dependency lifecycle scripts. NuGet has no checked-in `packages.lock.json`: the first restore records its initial resolution; the second enforces that task-local lock. Retain the lock and `apps/api/obj/project.assets.json` as evidence. This does not establish a repository-pinned transitive NuGet baseline across fresh runs. Installation may contact registries, download native binaries/SDK assets, and use the named caches; do not count it as a network-free check. Do not replace locked installation with `npm install` or silently acquire missing tools during checks.

**Verify test discovery before execution.** The approved worker selection is the default Web test include set minus the union of every exclusion in [vitest.config.ts](apps/web/vitest.config.ts) and `apps/web/test/unit/lib/job-lifecycle.test.ts`. That lifecycle test can POST analyses when an API is available; relying on its availability skip is insufficient. Preserve all configured exclusions, including expensive suites. Paths below are relative to `apps/web`:

```powershell
$workerExcludes = @(
  'node_modules', '.next',
  'test/unit/lib/llm-integration.test.ts',
  'test/unit/lib/input-neutrality.test.ts',
  'test/unit/lib/analyzer/context-preservation.test.ts',
  'test/unit/lib/analyzer/adversarial-context-leak.test.ts',
  'test/integration/claimboundary-integration.test.ts',
  'test/integration/hydrogen-smoke.test.ts',
  'test/calibration/framing-symmetry.test.ts',
  'test/unit/lib/job-lifecycle.test.ts'
)
$excludeArgs = @()
foreach ($pattern in $workerExcludes) { $excludeArgs += @('--exclude', $pattern) }
npm exec -w apps/web -- vitest list --filesOnly --config vitest.config.ts @excludeArgs
```

Re-read the configuration at the recorded revision and update this union if it has changed. **Do not assume CLI exclusions append to configured exclusions.** Save effective discovery output under `$taskRoot/evidence`, normalize paths relative to `apps/web`, and compare it against the include set minus the full exclusion union (expanding any globs). Require no excluded file in discovery, no unexpected selected file, and no unexplained missing eligible file. Record both selected and excluded files/patterns and the comparison result. If discovery fails or differs, stop before executing tests. Use the same config, working directory and exclusion arguments for discovery and execution; resolve Vitest and postbuild `tsx` from the locked local installation.

Only after credentials, state paths, installation, clear ports and effective discovery are verified, run the approved checks individually, capturing output and exit codes under `$taskRoot`:

```powershell
npm exec -w apps/web -- vitest run --config vitest.config.ts @excludeArgs
npm -w apps/web run build
dotnet build apps/api -c Release --no-restore
```

The Web build is a **writing command**: `next build` produces `.next` output, then npm automatically runs `postbuild` (`npx tsx scripts/reseed-all-prompts.ts --quiet`). Reseeding writes/activates UCM configs and prompts in the disposable `FH_CONFIG_DB_PATH`; it must never target an existing development UCM database. Preserve its summary and require zero reseed errors. API compilation writes build artifacts; `--no-restore` keeps dependency resolution in the installation phase and does not start the API.

Exclude `first-run.ps1`, restart/stop/build-and-restart scripts, hook installers, dev/start/watch servers, `test:jobs`, all paid/live suites (including calibration, smoke and promptfoo), validation batches and live analyses from this recipe. Do not enable services or add credentials to make a check pass. The generic `npm test`/`test:ci` commands alone do not supply this worker's lifecycle exclusion.

Finish with another listener inspection and tracked status comparison, including after failure. Evidence must contain the commit and exact tool versions; starting/final tracked status; selected and excluded tests plus discovery comparison; every command, working directory, output and exit code; before/after listeners; resolved state paths and named cache/output exceptions; and remaining network limits. Report failures, unexpected writes, listeners and checks not executed without widening the selection or invoking live setup.

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

# Claude Code instructions — FactHarbor

> **For domain-heavy tasks** (pipeline changes, prompt engineering, terminology, architecture):
> read `/AGENTS.md` first — it contains all project rules, terminology, and architecture reference.

## Project overview

Two apps + one tool:
- `apps/api` — ASP.NET Core API (SQLite). Key files: `Program.cs`, `Services/JobService.cs`, `Services/RunnerClient.cs`, `Controllers/*`.
- `apps/web` — Next.js (UI + runner/orchestrator). Key files: `src/app/api/internal/run-job/route.ts`, `src/lib/analyzer/orchestrated.ts`.
- `tools/vscode-xwiki-preview` — VS Code extension for XWiki page previews.

## Primary data flow

1. Client/UI -> API creates a job via `JobService` (`apps/api/Services/JobService.cs`).
2. API triggers the runner via `RunnerClient` which POSTs to `/api/internal/run-job`.
3. Runner fetches the job, calls `runFactHarborAnalysis`, writes progress/results back to API.

## Critical terminology (always follow — see AGENTS.md for full details)

- **AnalysisContext** = Top-level analytical frame. NEVER call this "scope".
- **EvidenceScope** = Per-evidence source metadata. NEVER call this "context".
- **EvidenceItem** = Extracted evidence. NEVER call these "facts" in new code.
- **No hardcoded keywords**: Code, prompts, and logic must be generic for ANY topic.
- **Input neutrality**: "Was X fair?" must yield same analysis as "X was fair" (tolerance ≤4%).

## Auth & headers

- Runner -> Next: header `X-Runner-Key` (`FH_INTERNAL_RUNNER_KEY`)
- Runner -> API: header `X-Admin-Key` (`FH_ADMIN_KEY`)
- Config: `apps/api/appsettings.Development.json` (from `.example`), `apps/web/.env.local` (from `.env.example`).

## Run commands

- Bootstrap: `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1`
- Web: `cd apps/web && npm run dev` (port 3000)
- API: `cd apps/api && dotnet run` (port 5000)
- Tests: `npm test` (vitest). Build: `npm -w apps/web run build`.

## Patterns & conventions

- Internal endpoints: idempotent, guarded by `X-Admin-Key` / `X-Runner-Key` headers.
- Use `JobService` for all DB changes (appends `JobEventEntity` for audit history).
- DB auto-created via `EnsureCreated()` — no migrations in this POC.
- Platform: Windows. Use PowerShell-compatible commands.

## Safety

- No production data access. No secrets in commits.
- No destructive git commands unless explicitly asked.
- Do not overwrite `apps/api/factharbor.db` unless asked.

## Agent handoff

If another tool would be better, say so and explain what context it needs:
- **Cursor Composer**: multi-file refactors with visual diff.
- **GitHub Copilot**: inline completions.
- **Cline**: autonomous multi-step workflows.
Full reference: `/AGENTS.md` Agent Handoff Protocol.

## Workflow

- Solo developer + AI agents. Direct push to main is normal.
- Commits: conventional commits `type(scope): description`.

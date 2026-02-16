# Claude Code instructions — FactHarbor

Project rules, terminology, and architecture: @AGENTS.md

## Project overview

Two apps + one tool:
- `apps/api` — ASP.NET Core API (SQLite). Key files: `Program.cs`, `Services/JobService.cs`, `Services/RunnerClient.cs`, `Controllers/*`.
- `apps/web` — Next.js (UI + runner/orchestrator). Key files: `src/app/api/internal/run-job/route.ts`, `src/lib/analyzer/claimboundary-pipeline.ts` [NEW], `src/lib/analyzer/verdict-stage.ts` [NEW], `src/lib/analyzer/orchestrated.ts` [BEING REPLACED].
- `tools/vscode-xwiki-preview` — VS Code extension for XWiki page previews.

## Primary data flow

1. Client/UI -> API creates a job via `JobService` (`apps/api/Services/JobService.cs`).
2. API triggers the runner via `RunnerClient` which POSTs to `/api/internal/run-job`.
3. Runner fetches the job, calls `runClaimBoundaryAnalysis` (ClaimBoundary pipeline), writes progress/results back to API.

> **Migration in progress:** The ClaimBoundary pipeline (`claimboundary-pipeline.ts`) replaces the Orchestrated pipeline (`orchestrated.ts`). New code should target ClaimBoundary. See `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`.

## Critical terminology (always follow — see AGENTS.md for full details)

- **AnalysisContext** = Top-level analytical frame. NEVER call this "scope". **Being replaced by ClaimBoundary — do not use in new code.**
- **ClaimBoundary** = Evidence-emergent grouping of compatible EvidenceScopes. Replaces AnalysisContext.
- **AtomicClaim** = Single verifiable assertion extracted from user input. The new analytical unit.
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
- Tests: `npm test` (vitest, safe — excludes expensive LLM tests). Build: `npm -w apps/web run build`.
- **Do NOT run** `test:llm`, `test:neutrality`, `test:contexts`, `test:adversarial`, or `test:expensive` unless explicitly asked — these make real LLM API calls and cost $1-5+ per run.

## Patterns & conventions

- Internal endpoints: idempotent, guarded by `X-Admin-Key` / `X-Runner-Key` headers.
- Use `JobService` for all DB changes (appends `JobEventEntity` for audit history).
- DB auto-created via `EnsureCreated()` — no migrations in this POC.
- Platform: Windows. Use PowerShell-compatible commands.

## Safety

- No production data access. No secrets in commits.
- No destructive git commands unless explicitly asked.
- Do not overwrite `apps/api/factharbor.db` unless asked.

## Roles & Multi-Agent Workflow

When user assigns a role with "As \<Role\>", follow the Role Activation Protocol in `AGENTS.md`.
Role definitions and required reading: `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §2.

## Agent handoff

If another tool would be better, say so and explain what context it needs:
- **Cursor Composer**: multi-file refactors with visual diff.
- **GitHub Copilot**: inline completions.
- **Cline**: autonomous multi-step workflows.
Full reference: `/AGENTS.md` Agent Handoff Protocol.

## Workflow

- Solo developer + AI agents. Direct push to main is normal.
- Commits: conventional commits `type(scope): description`.

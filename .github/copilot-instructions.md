# Copilot / AI agent instructions — FactHarbor

> **Canonical source:** `/AGENTS.md`. This file is a summary for inline completions. If rules diverge, follow AGENTS.md.

## Project

Two apps + one tool:
- `apps/api` — ASP.NET Core API (SQLite). Key files: `Program.cs`, `Services/JobService.cs`, `Controllers/*`.
- `apps/web` — Next.js (UI + analysis pipeline). Key files: `src/app/api/internal/run-job/route.ts`, `src/lib/analyzer/claimboundary-pipeline.ts`.
- `tools/vscode-xwiki-preview` — VS Code extension for XWiki previews.

Data flow: UI -> API (creates job) -> Runner (POST `/api/internal/run-job`) -> `runClaimBoundaryAnalysis` -> Results back to API.

## Critical Terminology

- **ClaimAssessmentBoundary** = Evidence-emergent grouping of compatible EvidenceScopes. NEVER call "context"/"scope".
- **AtomicClaim** = Single verifiable assertion from user input. NEVER call "context"/"fact".
- **EvidenceScope** = Per-evidence source metadata. NEVER call "context".
- **EvidenceItem** = Extracted evidence. NEVER call "fact" in new code.
- **No hardcoded keywords** in code/prompts. Generic for ANY topic.

## Commands

- Test: `npm test` (vitest, safe). Build: `npm -w apps/web run build`.
- Web: `cd apps/web && npm run dev` (port 3000). API: `cd apps/api && dotnet run` (port 5000).

## Auth

- `X-Runner-Key`: Runner -> Next.js. `X-Admin-Key`: Runner -> API.
- Config: `apps/api/appsettings.Development.json` (from `.example`), `apps/web/.env.local` (from `.env.example`).

## Roles

When user starts with "As \<Role\>", follow Role Activation Protocol in `/AGENTS.md`. Role definitions: `Docs/AGENTS/Roles/`.

## Behavior Examples

- Runner trigger: `apps/api/Services/RunnerClient.cs`
- Runner implementation: `apps/web/src/app/api/internal/run-job/route.ts`
- Job lifecycle: `apps/api/Services/JobService.cs` and `apps/api/Controllers/InternalJobsController.cs`

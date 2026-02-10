# FactHarbor — Cline Rules

**Read `/AGENTS.md` first** — it contains all project rules, terminology, architecture, and safety rules. This file adds Cline-specific notes.

## Project Overview

POC with two apps:
- `apps/api` — ASP.NET Core API (.NET 8, SQLite). Run: `cd apps/api && dotnet watch run` (port 5000).
- `apps/web` — Next.js app (UI + analysis pipeline). Run: `cd apps/web && npm run dev` (port 3000).

Data flow: UI -> API (creates job) -> Runner (POST /api/internal/run-job) -> Pipeline -> Results back to API.

## Critical Terminology (ALWAYS follow)

- **AnalysisContext** = Top-level analytical frame. NEVER call this "scope".
- **EvidenceScope** = Per-evidence source metadata. NEVER call this "context".
- **EvidenceItem** = Extracted evidence from a source. NEVER call these "facts" in new code.
- **No hardcoded keywords**: Code, prompts, and logic must be generic for ANY topic.
- **Input neutrality**: "Was X fair?" must yield same analysis as "X was fair" (tolerance ≤4%).

## Safety (Critical for Autonomous Operation)

- **Always confirm destructive actions with the user** before executing.
- Do not access production systems or real customer data.
- Do not change secrets/credentials or commit them.
- Do not modify `node_modules/` or generated files unless asked.
- Do not overwrite `apps/api/factharbor.db` unless asked.
- Avoid destructive git commands unless explicitly asked.
- Platform: Windows. Use PowerShell-compatible commands.

## Cline-Specific Notes

- Prefer reading files before editing — do not guess at code structure.
- `apps/web/src/lib/analyzer/orchestrated.ts` is ~13,600 lines — navigate carefully.
- All DB writes must go through `JobService` (not direct DbContext access).
- Internal endpoints use header auth: `X-Admin-Key`, `X-Runner-Key`.

## Commands

- Test: `npm test` (runs vitest)
- Build: `npm -w apps/web run build`
- Bootstrap: `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1`

## When Using Kimi K2 as the Model

Kimi K2 may not know FactHarbor conventions. Follow the terminology section above strictly. When in doubt, read `/AGENTS.md` for the authoritative glossary.

## Agent Handoff

If a task would be better handled by another tool, say so:
- **Claude Code (Opus)**: complex architecture, deep reasoning, plan mode.
- **Cursor Composer**: multi-file refactors with visual diff.
- **GitHub Copilot**: inline code completions.
See `/AGENTS.md` Agent Handoff Protocol for full reference.

## Conventions

- Commit messages: conventional commits `type(scope): description`.
- Solo developer + AI agents. Direct push to main is normal.

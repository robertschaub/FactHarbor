# AGENTS.md

## Purpose
This file defines how coding agents should operate in this repository.

## Scope
- Applies to all paths under this repo unless a closer AGENTS.md overrides it.

## Priorities
- Prefer small, focused changes that are easy to review.
- Preserve existing style and conventions.
- Avoid refactors unless explicitly requested.

## Workflow
- Read relevant files before editing.
- Use existing scripts and tooling; avoid inventing new workflows.
- If a required command is unknown, ask or leave a TODO note.

## Commands
- Quick start: `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1`
- Web dev server: `cd apps/web; npm run dev`
- API dev server: `cd apps/api; dotnet watch run`
- Tests: `npm test` (currently prints placeholder)
- Lint: `npm run lint` (currently prints placeholder)

## Safety
- Do not access production systems or real customer data.
- Do not change secrets/credentials or commit them.
- Do not modify generated files or dependencies (e.g., `node_modules`) unless requested.
- Avoid destructive git commands unless explicitly asked.
- Do not overwrite `apps/api/factharbor.db` unless asked.

## Output
- Summarize changes and list files touched.
- Note any assumptions or follow-up steps.
- If tests were not run, say why.

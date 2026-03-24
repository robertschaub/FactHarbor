# AGENTS.md — FactHarbor Web (Next.js)

Applies to all files under `apps/web/`. For project-wide rules, see `/AGENTS.md`.

## Technology

- Next.js 15 (App Router)
- AI SDK (Vercel AI SDK) for LLM orchestration
- Vitest for unit and integration testing
- Tailwind CSS for styling
- Zod for schema validation

## Project Structure

| Path | Purpose |
|------|---------|
| `src/lib/analyzer/` | **ClaimAssessmentBoundary Pipeline Stages**: Modular components for Extraction, Research (Orch/Queries/Acquisition/Extraction), Clustering, Verdict, and Aggregation. |
| `src/app/api/` | API routes (public and internal runner triggers) |
| `src/components/` | Shared UI components |
| `prompts/` | Authoritative LLM prompt files (.prompt.md) |
| `configs/` | UCM default configuration files (.default.json) |
| `test/` | Vitest test suites (unit, integration, calibration) |

## Key Patterns

- **Stage-based Pipelines.** The `ClaimAssessmentBoundary` pipeline follows a linear Stage 1-5 flow in `claimboundary-pipeline.ts`.
- **LLM Orchestration.** All LLM calls must use the AI SDK via `src/lib/analyzer/llm.ts` to ensure consistent tiering, caching, and error handling.
- **UCM Propagation.** Configuration is loaded from UCM at the start of each stage and passed down. Do not read `process.env` inside analysis logic.
- **Warning Registration.** All pipeline warnings must be typed in `types.ts` and registered in `warning-display.ts` for consistent UI rendering.
- **Prompt Isolation.** Prompts live in `.prompt.md` files and are loaded/rendered via `prompt-loader.ts`. Never hardcode complex prompts in TypeScript.

## Configuration (.env.local)

| Key | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Primary reasoning model provider |
| `OPENAI_API_KEY` | Secondary/fallback provider |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Flash/Pro models |
| `FH_ADMIN_KEY` | Shared secret for internal API endpoints |
| `FH_INTERNAL_RUNNER_KEY` | Shared secret for runner triggers |

## Commands

| Action | Command |
|--------|---------|
| Dev (hot reload) | `npm run dev` |
| Test (safe) | `npm test` |
| Build | `npm run build` |
| Calibration | `npm run calibration:smoke` |

## Safety

- **Test Costs.** Never run `npm run test:expensive` without explicit user permission.
- **Config Integrity.** Do not modify `config.db` directly; use UCM APIs or Admin UI.
- **Prompt Seeds.** Changes to `prompts/` require running `npm run reseed:prompts` to update UCM storage.

---
### 2026-05-24 | Senior Developer | Codex (GPT-5) | Agent Wrapper Local Env Loading
**Task:** Automate Gemini/OpenAI wrapper API key discovery so reviewer calls do not fail only because the launching shell lacks provider env vars.
**Files touched:** `scripts/agents/load-local-env.cjs`; `scripts/agents/invoke-gemini.cjs`; `scripts/agents/invoke-gpt.cjs`; `Docs/AGENTS/Handoffs/2026-05-24_Senior_Developer_Agent_Wrapper_Local_Env_Loading.md`; `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** Added a dependency-free local env loader that reads only requested keys from `apps/web/.env.local`, then root `.env.local`, then root `.env`. Existing shell environment values keep precedence. Wired Gemini to load `GOOGLE_GENERATIVE_AI_API_KEY` and GPT to load `OPENAI_API_KEY` only after dry-run handling, so dry runs remain secret-free.
**Open items:** None for wrapper key discovery. If future wrappers need more keys, call `loadLocalEnv(repoRoot, ['KEY_NAME'])` instead of duplicating parsing logic.
**Warnings:** The helper intentionally does not override shell-provided keys and does not print loaded values or source paths. It is not a general dotenv replacement; it supports the simple `.env` syntax used for local API keys.
**For next agent:** Verification passed with `node --check` on all four agent scripts, dry runs for GPT/Gemini, a temp-fixture loader test confirming search order and env precedence, and `git diff --check`.
**Learnings:** No new role learning appended.

---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, schema, validation, parity, configuration]
files_touched:
  - packages/fh-agent-knowledge/src/utils/paths.mjs
  - packages/fh-agent-knowledge/src/adapters/mcp.mjs
  - packages/fh-agent-knowledge/src/cache/build-cache.mjs
  - packages/fh-agent-knowledge/test/mcp-parity.test.mjs
  - Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md
  - C:/Users/rober/.claude.json
  - Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Schema_Validation_And_Parity_Hardening.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge MCP Schema Validation And Parity Hardening

## Task

Address the latest MCP implementation/configuration review by tightening adapter-side schema validation, narrowing parity-test volatility handling, and simplifying the Claude Code local MCP launcher config.

## Key decisions

- Required-input MCP tools now use non-optional Zod object schemas, so missing `task` / `query` / `role` / `file` / `section` inputs fail at the MCP schema boundary instead of falling through to downstream CLI-style `requireOption(...)` errors.
- Zero-arg tools and the all-optional `refresh_knowledge` path still allow omitted `arguments`, preserving the earlier interoperability fix.
- The stdio parity suite now treats only `cacheRefreshed` as volatile for query parity. `cacheSource` and `warnings` remain part of the exact envelope comparison; bootstrap-only comparisons still strip `builtAt`.
- The stdio parity suite now uses a dedicated cache directory via `FH_AGENT_KNOWLEDGE_CACHE_DIR`, so it no longer races the cache/FS tests on the shared repo `.cache/` path.
- `build-cache.mjs` now documents why the post-rebuild freshness check compares the rebuilt manifest to itself.
- The repo setup guide and the local Claude Code project config now launch the server with direct `node .../fh-knowledge-mcp.mjs`, removing the unnecessary `cmd /c` wrapper.

## Open items

- Gemini CLI still uses a workspace-relative path in `.gemini/settings.json`. That remains intentional for the committed workspace config, but it is still somewhat cwd-sensitive if Gemini is launched from outside the repo root.
- The working tree still contains unrelated non-MCP changes in `apps/web/src/lib/analyzer/research-acquisition-stage.ts`; this slice did not touch or verify them.

## Warnings

- The new schema-boundary regression uses the MCP SDK’s actual behavior: invalid required-input calls return `isError: true` tool responses rather than rejecting the client promise.
- `C:/Users/rober/.claude.json` is machine-local. The repo docs were updated to match the simplified direct-`node` form, but the config itself is not versioned with the repository.

## For next agent

- If another MCP parity drift appears, first determine whether it is substantive payload drift or only process-local cache side effects. Treat `cacheRefreshed` as the known process-local field; do not broaden the volatile-field list casually.
- If the team wants stronger Gemini portability, solve it as a client-setup question, not by weakening the repo’s committed workspace config conventions for Cursor/VS Code.

## Learnings

- For MCP adapters, “optional arguments object” is not the same design problem as “optional fields inside the object.” Required-input tools need schema enforcement at the boundary; zero-arg tools need omission tolerance.
- Real stdio parity tests should keep envelope comparisons strict and carve out only fields that are truly process-local side effects.

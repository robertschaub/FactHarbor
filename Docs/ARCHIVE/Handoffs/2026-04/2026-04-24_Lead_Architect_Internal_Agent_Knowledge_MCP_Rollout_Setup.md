---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, rollout, setup, documentation]
files_touched:
  - Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md
  - .cursor/mcp.json
  - .vscode/mcp.json
  - CLAUDE.md
  - GEMINI.md
  - .github/copilot-instructions.md
  - .cursor/rules/factharbor-core.mdc
  - .clinerules/00-factharbor-rules.md
  - .windsurfrules
  - CONTRIBUTING.md
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge MCP Rollout Setup

## Task

Roll out the implemented `fh-agent-knowledge` MCP server so the repo no longer has ambiguous guidance about how agents should discover and use it.

## What changed

- Added a central rollout/setup guide at `Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md`.
- Committed project-scoped MCP configs for the clients with stable workspace-root interpolation:
  - `.cursor/mcp.json`
  - `.vscode/mcp.json`
- Updated the tool-wrapper guidance files to point agents to `preflight_task` first and the CLI fallback second:
  - `CLAUDE.md`
  - `GEMINI.md`
  - `.github/copilot-instructions.md`
  - `.cursor/rules/factharbor-core.mdc`
  - `.clinerules/00-factharbor-rules.md`
  - `.windsurfrules`
  - `CONTRIBUTING.md`
- Realigned the governing MCP docs so they reflect current state instead of treating rollout as merely pending:
  - `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`
  - `Docs/WIP/README.md`
- Tightened the setup guide to use repo-portable relative links rather than machine-specific absolute links.

## Verification

- `ConvertFrom-Json` on `.cursor/mcp.json`
- `ConvertFrom-Json` on `.vscode/mcp.json`
- `npm run test:knowledge`
- `npm run fh-knowledge -- health`
- `npm run index`
- `npm run fh-knowledge -- refresh --force`

## Warnings

- Claude Code, Cline, and Copilot CLI still need machine-local absolute paths for the most reliable Windows setup. That is documented, not solved in shared repo config.
- The first `npm run test:knowledge` run after the WIP/spec edits failed because those doc changes made the local knowledge cache stale, which changed `cacheRefreshed` parity state between sequential CLI and MCP calls. After `npm run fh-knowledge -- refresh --force`, the suite passed cleanly. Treat that as a cache-state artifact, not a rollout regression.

## For next agent

Use the new setup guide as the single rollout reference point. The next practical step is local client validation and adoption, not more server-side MCP work:

- validate actual startup/discovery behavior in Cursor and VS Code / Copilot Chat
- validate the documented local-path setup flow in Claude Code, Cline, and Copilot CLI
- tighten any client note that proves inaccurate during real-client testing

## Learnings

- Rollout docs inside the repo should use repo-portable links, not workstation-specific absolute paths.
- Doc-only changes to WIP/agent knowledge inputs are enough to make the local cache stale and can affect parity checks until the cache is refreshed.

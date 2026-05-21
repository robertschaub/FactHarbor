---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, implementation, parity, stdio]
files_touched:
  - packages/fh-agent-knowledge/package.json
  - package.json
  - packages/fh-agent-knowledge/src/adapters/operations.mjs
  - packages/fh-agent-knowledge/src/adapters/cli.mjs
  - packages/fh-agent-knowledge/src/adapters/mcp.mjs
  - packages/fh-agent-knowledge/bin/fh-knowledge-mcp.mjs
  - scripts/fh-knowledge-mcp.mjs
  - packages/fh-agent-knowledge/test/mcp-parity.test.mjs
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge MCP Adapter Implementation

## Task

Implement the thin MCP adapter slice for `@factharbor/fh-agent-knowledge` without reopening architecture, while preserving CLI and shared-core parity.

## What was implemented

- Added direct MCP runtime ownership to `packages/fh-agent-knowledge/package.json` and a root launcher script in `package.json`.
- Added `packages/fh-agent-knowledge/src/adapters/mcp.mjs` using `@modelcontextprotocol/sdk` over stdio.
- Added `scripts/fh-knowledge-mcp.mjs` and package bin wrapper `packages/fh-agent-knowledge/bin/fh-knowledge-mcp.mjs`.
- Added `packages/fh-agent-knowledge/src/adapters/operations.mjs` as the shared operation registry so CLI and MCP dispatch the same underlying operations and return the same command-result payloads.
- Refactored `packages/fh-agent-knowledge/src/adapters/cli.mjs` to use that shared operation registry instead of keeping a second command-dispatch implementation.

## Frozen MCP surface now implemented

The adapter exposes the exact nine read-only tools frozen in the spec:

1. `preflight_task`
2. `search_handoffs`
3. `lookup_stage`
4. `lookup_model_task`
5. `get_role_context`
6. `get_doc_section`
7. `bootstrap_knowledge`
8. `refresh_knowledge`
9. `check_knowledge_health`

All tool outputs mirror the existing CLI JSON payloads through `structuredContent`, with a text block carrying the same JSON for clients that only inspect text content.

## Verification

- `npm run test:knowledge`
- `npm run fh-knowledge -- health`
- `npm -w apps/web run build`

The MCP tests now cover:

- exact frozen tool-name exposure
- stdio launcher startup
- CLI/MCP parity for `preflight-task` / `preflight_task`
- CLI/MCP parity for `health` / `check_knowledge_health`

## Current status

- Shared query core: implemented
- CLI adapter: implemented
- MCP adapter: implemented
- Parity tests: implemented
- Client wiring docs/config examples: not yet done

## Open items

- Add concrete client configuration examples for Claude Code, Codex/Cursor/Cline/Copilot where relevant.
- Decide where startup guidance should prefer CLI versus MCP per client.
- Broaden parity coverage later if new tools or output-shape complexity are added.

## Warnings

- This does not introduce any product-facing MCP surface. The server remains local-only and read-only except for local cache bootstrap/refresh.
- The MCP adapter is intentionally thin. Do not move query or cache logic into the adapter layer during follow-up work.
- Older handoffs that still say “MCP next” are now historical. The updated spec and this handoff supersede that execution state.

## For next agent

Do not spend the next cycle on more server-side retrieval work unless a parity bug is found. The next useful slice is rollout: client wiring, local config examples, and startup-guidance adoption.

## Learnings

- A shared operation registry is the simplest way to keep CLI and MCP behavior aligned without duplicating dispatch logic.
- Real stdio parity tests are worth the extra setup because they catch drift that pure in-process unit tests would miss.

---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, interop, regression, testing]
files_touched:
  - packages/fh-agent-knowledge/src/adapters/mcp.mjs
  - packages/fh-agent-knowledge/test/mcp-parity.test.mjs
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge MCP Omitted Arguments Fix

## Task

Address the MCP review finding that zero-argument tools rejected calls where the client omitted `arguments`.

## What changed

- Updated `packages/fh-agent-knowledge/src/adapters/mcp.mjs` so MCP input schemas are optional object schemas instead of mandatory raw object shapes.
- This makes the zero-argument tools and the all-optional `refresh_knowledge` path accept omitted `arguments` as valid MCP calls.
- Expanded `packages/fh-agent-knowledge/test/mcp-parity.test.mjs` with an omitted-arguments regression that covers:
  - `bootstrap_knowledge`
  - `check_knowledge_health`
  - `refresh_knowledge`

## Verification

- `npm run test:knowledge`

## Warnings

- The parity test strips volatile `builtAt` fields for cache-mutating calls because those timestamps legitimately differ between separate CLI and MCP invocations.
- This fix is narrowly about MCP client interoperability. It does not change the shared query/core behavior.

## For next agent

If more MCP interoperability issues surface, test them through real client behavior first. The earlier gap here was not in the core logic but in adapter-level input-schema semantics.

## Learnings

- For MCP tools, “empty object” and “omitted arguments” are not equivalent unless the schema explicitly allows `undefined`.
- Real client-style regression cases matter even when parity tests already exist; the missing case here was omission, not content.

---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, checklist, implementation, next_steps]
files_touched:
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Execution_Checklist.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge MCP Execution Checklist

## Task

Decide whether the plan needed another planning pass before MCP implementation starts, and only sharpen it further if that reduces real execution ambiguity.

## Decision

Yes, but only narrowly.

The architecture was already settled. What still added value was freezing the implementation contract for the first MCP coding slice so there is no further drift about transport, tool names, adapter responsibilities, or what counts as done.

## What changed

- Added a short Phase C execution checklist directly to the active MCP spec.
- Kept the checklist explicitly narrow: it does not reopen scope, product-facing MCP, or the earlier CLI-vs-MCP decision.
- Left the implementation order unchanged.

## Frozen checklist

1. `v1` transport is `stdio` only.
2. `@modelcontextprotocol/sdk` is owned directly by `packages/fh-agent-knowledge/package.json`, and the repo root exposes one concrete MCP launcher script.
3. MCP tool names stay exactly as frozen in the spec.
4. MCP request/response behavior mirrors the shared core and CLI as closely as possible, including refresh semantics and structured failures.
5. The MCP adapter owns only registration, validation, and dispatch.
6. Parity tests are required for completion; startup alone is not enough.
7. Client wiring follows parity, not the other way around.

## Why this was worth doing

- The previous docs were clear about direction but still left room for low-level implementation drift.
- This checklist closes the last practical ambiguities without spending another cycle on architecture debate.
- The next agent can now move straight into code with a tighter acceptance contract.

## Open items

- MCP code still does not exist yet.
- The next concrete changes remain: direct MCP dependency ownership, MCP launcher, MCP adapter, parity tests, then client wiring docs.

## Warnings

- Do not interpret this checklist as a new design phase. It is a freeze of execution details only.
- Do not expand the first MCP slice beyond the local, read-only, shared-core-backed surface already frozen in the spec.

## For next agent

Use the updated spec as the primary implementation contract. The next action is coding the thin MCP adapter slice, not more architectural realignment.

## Learnings

- A short execution checklist can add value even after architecture is settled, but only when it freezes concrete implementation contracts rather than reopening scope.

---
roles: [Unassigned]
topics: [mcp, agent, knowledge, indexing, cli, architecture, spec]
files_touched:
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Spec.md
---

# Internal Agent Knowledge MCP v1 Spec

## Task

Draft a repo-ready WIP spec for the internal FactHarbor knowledge MCP and repo layout, based on the earlier indexing/MCP docs plus a fresh architecture debate over MCP-versus-CLI rollout.

## Files touched

- `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`
- `Docs/WIP/README.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Spec.md`

## Key decisions

- V1 is scoped to internal developer workflow only and remains separate from any product-facing MCP surface.
- The spec chooses one shared query core with two adapters: MCP where supported cleanly, plus a first-class CLI so cross-tool usage is not blocked by MCP ergonomics.
- The spec keeps a gitignored local cache as the primary serving layer but does not remove the current committed generated indexes in v1; they remain compatibility/bootstrap inputs during rollout.
- V1 scope is tightly limited to knowledge retrieval and safe local wrappers (`bootstrap`, `refresh`, `health`, `scaffold-handoff`), with job/report/config/database mutation surfaces explicitly deferred.

## Open items

- No implementation has started.
- Captain approval and Lead Developer implementation review are still required before scaffolding the package and adapters.
- Exact client configuration examples for Cursor, Claude Code, Copilot, and Cline are intentionally left out of this spec and should be documented after the adapter exists.

## Warnings

- Cross-client MCP ergonomics are still uneven, which is why the spec keeps the CLI as a required peer rather than an afterthought.
- The local cache contract is intentionally simple in v1; if freshness warnings prove too weak, cache invalidation will need a follow-up design.
- The MCP boundary must stay thin. If later work starts adding job, report, or config mutation tools, that should be treated as a separate design track.

## For next agent

The implementation anchor is the new WIP spec at `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`. The main architectural choices are: `packages/fh-agent-knowledge/` as the shared core, `scripts/fh-knowledge.mjs` plus `scripts/fh-knowledge-mcp.mjs` as thin entry points, local gitignored cache as the primary serving layer, and the current `Docs/AGENTS/index/*.json` artifacts as rollout-time compatibility inputs only.

## Learnings

- No

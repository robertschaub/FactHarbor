---
roles: [Unassigned]
topics: [mcp, agent, knowledge, cli, debate, realignment, architecture]
files_touched:
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md
---

# Internal Agent Knowledge Query Layer CLI-First Realignment

## Task

Patch the internal knowledge-layer spec so it matches the multi-model debate result: keep the shared query core and local cache direction, but narrow v1 to a CLI-first rollout and defer MCP plus protocol-complete handoff publication.

## Files touched

- `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`
- `Docs/WIP/README.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md`

## Key decisions

- The spec now defines v1 as shared query core plus CLI only; the MCP adapter is moved to deferred follow-up.
- The spec now removes `publish_handoff` from the v1 tool surface and acceptance criteria, leaving v1 with no repo-write path.
- The implementation sequence now ends the first delivery slice after CLI plus rollout review, and pushes MCP plus any repo-doc write surface into a later phase.
- The WIP index entry was updated so it no longer describes the spec as shipping `MCP + CLI` in v1.

## Open items

- No implementation has started.
- If Captain later wants MCP in the first code phase anyway, that should be treated as an explicit override of the debate result rather than the default v1 reading.
- The earlier `publish_handoff` atomicity work remains available as deferred reference material if a write surface is later reintroduced.

## Warnings

- This change narrows scope but also delays the ergonomic benefits MCP may bring for some clients.
- The file path still includes `MCP` for continuity, even though the v1 content is now CLI-first; that is a naming mismatch, not a semantic mismatch.

## For next agent

The active spec at `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md` now follows the debate result: shared query core survives, committed indexes stay as v1 substrate, local cache stays, but v1 delivery is CLI-first and both MCP and `publish_handoff` are deferred.

## Learnings

- No

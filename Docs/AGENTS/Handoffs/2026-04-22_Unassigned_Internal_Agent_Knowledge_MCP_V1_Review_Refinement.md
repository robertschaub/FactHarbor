---
roles: [Unassigned]
topics: [mcp, agent, knowledge, indexing, review, refinement, publish_handoff]
files_touched:
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - .gitignore
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Review_Refinement.md
---

# Internal Agent Knowledge MCP v1 Review Refinement

## Task

Refine the new internal knowledge MCP spec after review, with Captain guidance that the handoff-writing capability must be useful immediately rather than a blank scaffold.

## Files touched

- `.gitignore`
- `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Review_Refinement.md`

## Key decisions

- Replaced `scaffold_handoff` with `publish_handoff` so the v1 write surface is protocol-complete and immediately useful.
- Tightened the spec so `publish_handoff` must write both the handoff file and the required `Agent_Outputs.md` row as one publication unit.
- Expanded the authoritative-source and cache-freshness sections so the health model covers the markdown/doc sources plus the analyzer/model-tier source files, not just the committed JSON indexes.
- Added a root `/.cache/` ignore rule so the proposed local knowledge cache matches the repo’s actual ignore behavior.

## Open items

- No implementation has started.
- The exact atomic-write/rollback behavior for `publish_handoff` still needs implementation design detail.
- The v1 spec still leaves client-specific MCP configuration examples for a later documentation pass.

## Warnings

- `publish_handoff` is now a stronger write surface than the earlier scaffold idea; it must fail hard on missing required fields rather than creating partial protocol artifacts silently.
- The spec now treats the committed generated indexes as the default v1 lookup substrate in addition to compatibility inputs; if later work wants to demote them further, that should happen only after direct-source derivation is proven.

## For next agent

The active spec in `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md` now assumes `publish_handoff`, not `scaffold_handoff`. The main review-driven fixes are in Sections 2, 5, 6, 7, 8, 9, 11, and 12, plus the new `/.cache/` rule in `.gitignore`.

## Learnings

- No

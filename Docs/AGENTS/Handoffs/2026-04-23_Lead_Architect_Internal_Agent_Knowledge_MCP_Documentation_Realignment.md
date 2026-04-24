---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, documentation, review, next_steps]
files_touched:
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_MCP_Documentation_Realignment.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge MCP Documentation Realignment

## Task

Remove the outdated CLI-first-only deferral from the current governing docs, then run a reviewer pass to consolidate the actual next MCP steps from the current repo state.

## Files touched

- `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`
- `Docs/WIP/README.md`
- `Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_MCP_Documentation_Realignment.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Key decisions

- The WIP spec is now the canonical current-state document again. It no longer says MCP is deferred behind CLI adoption proof.
- The current state is now documented as:
  - shared query core implemented
  - CLI implemented
  - thin MCP adapter is the active next implementation slice
- The current spec now freezes the intended MCP tool surface and names so the adapter slice has a concrete contract rather than “MCP later” ambiguity.
- The earlier 2026-04-22 and 2026-04-23 CLI-first handoffs remain historical record, but they should no longer be used as the planning source of truth for next-step decisions.

## Reviewer consolidation

Reviewer conclusion:

- The WIP docs are now directionally correct.
- The remaining confusion was in the handoff trail, not the updated spec.
- The package/code state still matches `shared core + CLI only`; MCP has not started in code yet.

Consolidated next MCP steps:

1. Declare MCP runtime ownership in `packages/fh-agent-knowledge/package.json` and add a root launcher script in `package.json`.
2. Add `scripts/fh-knowledge-mcp.mjs` as the thin executable wrapper.
3. Add `packages/fh-agent-knowledge/src/adapters/mcp.mjs` as a pure wrapper over the shared query core.
4. Keep the same nine read-only operations already defined in the spec: `preflight_task`, `search_handoffs`, `lookup_stage`, `lookup_model_task`, `get_role_context`, `get_doc_section`, `bootstrap_knowledge`, `refresh_knowledge`, `check_knowledge_health`.
5. Add MCP-focused tests and parity checks before claiming MCP completion.

## Open items

- The MCP adapter is still not present in code.
- The package manifest still presents the package as CLI-only; MCP ownership is still implicit/transitive rather than explicit.
- Older handoffs still contain the outdated “MCP deferred / adoption next” message, but this handoff supersedes them for current planning.

## Warnings

- Do not misread the updated spec as meaning the MCP adapter already exists. The docs now describe the current decision and next slice, not completed MCP code.
- Do not re-open the broader product-facing MCP scope. The next slice is still thin, local-only, and read-only over the existing shared core.

## For next agent

Use the WIP spec plus this handoff together as the current source of truth. The next implementation target is the thin MCP adapter, not more debate about whether MCP should happen. The order is: package dependency ownership, MCP launcher, MCP adapter, parity tests, then client wiring docs.

## Learnings

- Fixing only the canonical spec is not enough when a recent handoff trail still tells the opposite story; the active “what next” index needs a current superseding entry too.

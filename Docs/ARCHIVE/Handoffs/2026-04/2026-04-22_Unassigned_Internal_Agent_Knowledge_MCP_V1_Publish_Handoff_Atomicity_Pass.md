---
roles: [Unassigned]
topics: [mcp, agent, knowledge, publish_handoff, atomicity, idempotency, architecture]
files_touched:
  - Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Publish_Handoff_Atomicity_Pass.md
---

# Internal Agent Knowledge MCP v1 Publish Handoff Atomicity Pass

## Task

Do one more architecture pass on the `publish_handoff` write behavior before implementation and tighten the WIP spec around atomicity, idempotency, and recovery.

## Files touched

- `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Publish_Handoff_Atomicity_Pass.md`

## Key decisions

- `publish_handoff` now explicitly requires `topics` and YAML frontmatter because the current handoff index builder prefers frontmatter for reliable extraction.
- The spec now defines a bounded transactional sequence instead of vague "atomic" wording: in-memory render, publish lock, locked re-read, idempotency check, handoff temp-write plus rename, `Agent_Outputs.md` temp-rewrite plus rename, then cache/index refresh.
- The spec now forbids publishing the `Agent_Outputs.md` row first and requires best-effort rollback or explicit partial-state reporting if the second write fails.
- The spec now requires immediate post-publish discoverability via cache refresh/invalidation and Tier 2 handoff-index rebuild or equivalent in-process update.

## Open items

- The exact lock implementation is still left open; the spec only requires single-writer behavior during publication.
- The eventual implementation still needs to define the exact duplicate-row detection logic against `Agent_Outputs.md` content.

## Warnings

- This is still not true multi-file atomicity; it is bounded transactional behavior over two files. The implementation must report partial-state recovery failures clearly.
- If later work wants to make `publish_handoff` cross-process or multi-user, the current local lock assumption will not be sufficient.

## For next agent

The active spec now has a new Section 9.4 in `Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md` that defines the write order, rollback behavior, frontmatter requirement, and immediate post-publish refresh expectations for `publish_handoff`.

## Learnings

- No

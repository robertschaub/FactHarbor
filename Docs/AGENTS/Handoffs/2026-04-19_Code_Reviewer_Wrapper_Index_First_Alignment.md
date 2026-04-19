---
roles: [Code Reviewer]
topics: [indexing, wrappers, adoption, documentation, alignment]
files_touched:
  - GEMINI.md
  - .github/copilot-instructions.md
  - .clinerules/00-factharbor-rules.md
  - .cursor/rules/factharbor-core.mdc
  - Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Wrapper_Index_First_Alignment.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Wrapper Index-First Alignment

## Task

Implement the approved wrapper-only fix for index adoption by updating the tool-specific
summary files to point agents at the generated indexes before they scan handoffs
directly.

## Files touched

- `GEMINI.md`
- `.github/copilot-instructions.md`
- `.clinerules/00-factharbor-rules.md`
- `.cursor/rules/factharbor-core.mdc`
- `Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Wrapper_Index_First_Alignment.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Key decisions

- Kept the change strictly at the wrapper layer; no CLI, MCP, or indexing-script work.
- Added the same policy to all four wrappers: use `Docs/AGENTS/index/` before scanning
  `Docs/AGENTS/Handoffs/` by filename.
- Preserved the boundary from `AGENTS.md`: `handoff-index.json` is for task history,
  not source code lookup; use grep/code search for code locations.

## Open items

- If adoption still looks weak after this wrapper alignment, the next approved step is
  the existing MCP Phase 2 from the design doc.

## Warnings

- The Cline/Cursor summaries already pointed agents to `Agent_Outputs.md`; this patch
  adds the missing generated-index guidance but does not otherwise change their flow.
- No telemetry was added, so future claims about adoption should still avoid presenting
  measured bypass rates unless instrumentation is introduced.

## For next agent

Wrapper guidance is now aligned across Gemini, Copilot/Codex, Cline, and Cursor. If you
review future agent-entry docs, keep the wrapper rule short and concrete: recent context
from `Agent_Outputs.md`, then generated-index lookup, then direct handoff scanning only
as fallback.

## Learnings

- No

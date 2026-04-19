---
roles: [Code Reviewer]
topics: [indexing, debate, recommendation, mcp, cli, wrappers, adoption]
files_touched:
  - Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Improvement_Options_Debate.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Indexing Improvement Options Debate

## Task

Evaluate improvement options for the agent indexing system for a tool mix of
Claude + GPT/Codex first, Gemini second; rate the options; pressure-test the
decision with a structured debate; and recommend a rollout order.

## Files touched

- `Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Improvement_Options_Debate.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Key decisions

- The best **target architecture** is a shared query core with two front doors:
  a cross-tool CLI first and an optional Claude MCP adapter second.
- The best **immediate next step** is smaller: align the high-priority wrappers
  and skills around one concrete index-first path before adding new plumbing.
- MCP-only is not the right recommendation for this repo because the project is
  already intentionally cross-tool through shared markdown workflows and shell
  procedures.

## Open items

- If implementation is requested, do it in this order:
  1. wrapper alignment for Claude/Copilot/Gemini/Cline/Cursor summaries
  2. shared query module + CLI
  3. optional Claude MCP adapter over the same shared query module
- No telemetry currently proves actual bypass rate, so future work should avoid
  claiming measured adoption improvements unless usage is instrumented.

## Warnings

- MCP-first improves enforcement, but mainly on the Claude side unless Codex/GPT
  gets an equivalent integration path.
- CLI-first is better for cross-tool parity, but still optional unless wrappers
  and skills point to one exact command.
- Minimum-change-first is cheap and sensible, but may plateau if instruction-only
  adoption remains weak outside `report-review`.

## For next agent

Use this decision frame:
- If the goal is **lowest effort / fastest improvement**, tighten wrappers first.
- If the goal is **best cross-tool architecture**, build a shared query core with
  CLI first.
- If the goal is **strongest Claude ergonomics after that**, add MCP as an
  adapter, not as the only query path.

## Learnings

- No

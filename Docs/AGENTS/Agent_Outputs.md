# Agent Outputs Log

Rolling log of agent task completions. Most recent entries at top.
Agents: append your output below this header using the unified template from AGENTS.md § Agent Exchange Protocol.

Archived entries are moved to `Docs/ARCHIVE/` during Consolidate WIP.

---

### 2026-02-18 | Captain (advisory) | Claude Code (Opus) | Agent Output Convention

**Task:** Establish a default convention for agents to write completion outputs to shared files, enabling cross-agent collaboration without explicit per-task instructions.

**Files touched:**
- `AGENTS.md` — added "Agent Output Convention (MANDATORY)" section after Working Principles
- `Docs/AGENTS/Agent_Outputs.md` — created (this file)
- `Docs/AGENTS/Handoffs/README.md` — created (directory + readme for significant outputs)
- `Docs/AGENTS/README.md` — updated with new entries under "Agent Collaboration" section

**Key decisions:**
- Hybrid approach: rolling log (`Agent_Outputs.md`) for standard tasks, dedicated files (`Handoffs/`) for significant tasks, nothing for trivial tasks.
- Separated from `Docs/WIP/` to avoid polluting the design-document lifecycle.
- Convention is MANDATORY — agents default to writing output unless the task is clearly trivial.

**Open items:** None. Convention is ready for use by all agents.

**For next agent:** This convention is now active. After completing any non-trivial task, append your output here (Standard tier) or create a file in `Docs/AGENTS/Handoffs/` (Significant tier). See AGENTS.md § Agent Output Convention for the template.

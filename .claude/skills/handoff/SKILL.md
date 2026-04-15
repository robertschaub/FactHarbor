---
name: handoff
description: Generate a properly-formatted FactHarbor handoff document at end of a task. Captures completed work, decisions, warnings, and next steps for the next agent or session.
allowed-tools: Bash Read Write
---

Generate a handoff document for task: $ARGUMENTS

**Step 1 — Gather context:**
Run:
- `git log --oneline -8` — recent commits
- `git diff HEAD~3 --stat` — files changed in scope
- `date +%Y-%m-%d` — today's date for the filename

**Step 2 — Read the protocol:**
Read `Docs/AGENTS/Policies/Handoff_Protocol.md` for the required format, role alias table, and output tier rules.

**Step 3 — Write the handoff file:**
Create `Docs/AGENTS/Handoffs/<DATE>_<active-role>_<task-slug>.md` with these sections:

- **Task** — what was asked and the goal
- **Done** — what was implemented, with `file:line` references for each significant change
- **Decisions** — key choices made and rationale
- **Warnings** — risks, known regressions, incomplete items, things that could break
- **Learnings** — what the next agent must know to continue correctly without rediscovering context
- **Next** — recommended next steps in priority order

**Step 4 — Append to Agent_Outputs.md:**
Append a one-line summary entry to `Docs/AGENTS/Agent_Outputs.md` following the existing entry format (date, role, one-sentence summary).

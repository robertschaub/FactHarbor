---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review Cross-Tool Publication
**Task:** Publish the restored `/report-review` workflow so Sonnet, Gemini, Cline, and other AGENTS-aware tools discover and use it consistently.
**Files touched:** `GEMINI.md`; `.gemini/skills/factharbor-agent/SKILL.md`; `Docs/DEVELOPMENT/Claude_Code_Skills.md`
**Key decisions:** Left the canonical workflow in `.claude/skills/report-review/SKILL.md` as the single source of truth and published discovery through the non-Claude entry points instead of duplicating workflow logic. Added `/report-review` to Gemini's named workflows, added it to Gemini's shared workflow list, updated the shared workflow guide from nine to ten skills, added a dedicated Report Review section with invocation/examples/guardrails, and clarified that Cline/other AGENTS-aware tools discover the workflow through `AGENTS.md`.
**Open items:** If this needs to be available outside the current worktree, create a commit (and push if desired). The current change is published in-repo but not yet committed.
**Warnings:** `Docs/AGENTS/Agent_Outputs.md` was already dirty before this task, and `Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md` remains an unrelated untracked file.
**For next agent:** `/report-review` is now discoverable from the Claude skill file, `AGENTS.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, and the shared workflow reference doc. Do not fork the workflow into tool-specific variants; keep `.claude/skills/report-review/SKILL.md` canonical and update the discovery surfaces if the workflow changes again.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

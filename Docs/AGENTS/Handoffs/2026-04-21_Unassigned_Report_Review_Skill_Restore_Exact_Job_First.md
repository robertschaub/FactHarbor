---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review Skill Restore Exact-Job-First
**Task:** Restore the `/report-review` skill improvement after the broader revert so the workflow again requires exact-job inspection and prompt-change justification.
**Files touched:** `.claude/skills/report-review/SKILL.md`
**Key decisions:** Restored the skill-only rules that accept full job URLs, preserve explicit requested jobs as `REQUESTED-JOBS[]`, require Phase 1 to classify each requested job as `INSPECTED` or `NOT-INSPECTABLE` before comparators, and require `Inspected-job evidence` for fix proposals. The analyzer/prompt/test fix attempt remains reverted.
**Open items:** Re-run `/report-review` on the original supplied job URLs to confirm the restored skill behavior on this repo state.
**Warnings:** This restores workflow discipline only. It does not restore any analyzer, prompt, or test changes, and it does not make inaccessible deployed jobs inspectable.
**For next agent:** Treat `.claude/skills/report-review/SKILL.md` as intentionally ahead of `HEAD` again: exact-job-first diagnosis and provisional-only prompt edits on non-inspectable jobs are back in force.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

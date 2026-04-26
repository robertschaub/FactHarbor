---
roles: [Agents Supervisor]
topics: [debt_guard, workflow_skill, post_review_amendment, handoff_index]
files_touched:
  - .claude/skills/debt-guard/SKILL.md
  - GEMINI.md
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .cursor/rules/factharbor-core.mdc
  - .clinerules/00-factharbor-rules.md
  - .windsurfrules
  - .gemini/skills/factharbor-agent/SKILL.md
  - Docs/DEVELOPMENT/Claude_Code_Skills.md
  - factharbor-agent.skill
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Debt Guard Post-Review Amendments
**Task:** Apply the accepted post-commit review/debate amendments for `8ab00f01` without changing the core Debt Guard workflow direction.
**Files touched:** `.claude/skills/debt-guard/SKILL.md`, `GEMINI.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/factharbor-core.mdc`, `.clinerules/00-factharbor-rules.md`, `.windsurfrules`, `.gemini/skills/factharbor-agent/SKILL.md`, `Docs/DEVELOPMENT/Claude_Code_Skills.md`, `factharbor-agent.skill`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** Kept the Debt Guard concept and `8ab00f01` implementation direction. Amended only confirmed review findings: Full Path now explicitly includes Phases 0 and 5, verifier tiers no longer conflict with `quality-affecting`, wrapper bugfix triggers include review findings and runtime defects consistently, and the development docs state that `factharbor-agent.skill` is a repo-coupled helper rather than a bundled copy of `.claude/skills/`.
**Open items:** None for this amendment. Existing unrelated untracked WIP/handoff files and app/test changes remain outside this task.
**Warnings:** `handoff-index.json` was regenerated from a clean tracked-file view to avoid indexing unrelated untracked handoffs present in the working tree. `stage-map.json` and `stage-manifest.json` still have unrelated timestamp-only generated diffs outside this task.
**For next agent:** Treat `/debt-guard` as accepted after the post-review amendment. If you regenerate all agent indexes in a dirty worktree, inspect the handoff index before committing because untracked handoff files are included by the index script.
**Learnings:** Appended to `Role_Learnings.md`? no.

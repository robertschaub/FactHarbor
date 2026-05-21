---
roles: [Agents Supervisor]
topics: [debt_guard, workflow_skill, additive_repair_drift, bugfix_complexity]
files_touched:
  - .claude/skills/debt-guard/SKILL.md
  - AGENTS.md
  - GEMINI.md
  - CLAUDE.md
  - .gemini/skills/factharbor-agent/SKILL.md
  - Docs/DEVELOPMENT/Claude_Code_Skills.md
  - Docs/AGENTS/README.md
  - Docs/AGENTS/Multi_Agent_Collaboration_Rules.md
  - .github/copilot-instructions.md
  - .cursor/rules/factharbor-core.mdc
  - .clinerules/00-factharbor-rules.md
  - .windsurfrules
  - factharbor-agent.skill
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-25 | Agents Supervisor | Codex (GPT-5) | Debt Guard Workflow Skill
**Task:** Create a FactHarbor-wide skill that stops agents from automatically stacking additive workaround code and instead balances undoing/amending previous changes against adding new code.
**Files touched:** `.claude/skills/debt-guard/SKILL.md`, `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `.gemini/skills/factharbor-agent/SKILL.md`, `Docs/DEVELOPMENT/Claude_Code_Skills.md`, `Docs/AGENTS/README.md`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `.github/copilot-instructions.md`, `.cursor/rules/factharbor-core.mdc`, `.clinerules/00-factharbor-rules.md`, `.windsurfrules`, `factharbor-agent.skill`, `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** Created `/debt-guard` as a shared `.claude/skills/` workflow, not a local Codex-only skill, so non-Claude agents can read it as plain markdown. After three review rounds and three debates, reframed it from subtraction-first to balanced complexity control: every bugfix must compare undo/amend/quarantine/delete against adding code, then choose the evidence-backed lowest-net-complexity path. Added mandatory bugfix trigger language, cross-tool guidance, explicit Compact vs Full path selection, compact mini-template, hunk-level non-destructive revert wording, bounded quarantine with owner/removal trigger, high-risk-only debate gating, self-review fallback, verifier tier/cost/provenance fields, expensive command names, live-job provenance rules, canonical failed-validation classification, and post-edit budget reconciliation. Synced discovery through root, Gemini, Claude, Copilot, Cursor, Cline/RooCode, Windsurf, and development documentation. External recommendations were incorporated: keep changes small, understand existing code before replacing it, review AI-generated patches carefully, update tests with behavior, classify deliberate temporary debt separately from unplanned mess, and track recurring debt signals.
**Open items:** None for the skill creation. Existing unrelated untracked handoffs/WIP files remain outside this task.
**Warnings:** `npm run index` was executed earlier, then unrelated generated changes caused by existing untracked WIP/handoff files were narrowed back out. The durable docs now say to run `npm run index` after final handoff writes; in this dirty workspace, keeping generated index output would also index unrelated untracked handoffs/WIP files. The `fhAgentKnowledge` cache was refreshed; long-running MCP clients may need restart to observe refreshed cache depending on client behavior.
**For next agent:** `/debt-guard` is mandatory for every bugfix and for failed validation recovery. Do not treat it as rollback-first: it explicitly requires balancing undoing/amending prior code against adding new code, with a Complexity Budget before edits and a diff reconciliation before final response. If a bugfix expands into unrelated cleanup or refactor, split the extra work into a follow-up unless the verifier-backed root cause requires it.
**Learnings:** Appended to `Role_Learnings.md`? no.

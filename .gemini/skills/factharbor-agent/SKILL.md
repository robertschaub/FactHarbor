---
name: factharbor-agent
description: Specialized agent for handling role activation, task completion logging, shared workflow-skill discovery, and following project-specific protocols (Role Activation Protocol, Agent Exchange Protocol). Use when switching roles, finishing non-trivial tasks, needing to follow FactHarbor's Senior Engineer engineering standards, or doing any FactHarbor bugfix, regression fix, failing test/build fix, review finding, runtime defect repair, or failed-validation recovery so `.claude/skills/debt-guard/SKILL.md` is applied before editing.
---

# FactHarbor Agent

## Overview

This skill ensures that Gemini CLI follows the FactHarbor development lifecycle and its mandatory agent protocols. It provides specific workflows for role activation, cross-agent handoffs, and logging task completions to ensure continuity across sessions.

## Workflow Decision Tree

### 1. Starting a New Session or Role
- **Action**: Locate and read `/AGENTS.md` and `/GEMINI.md`.
- **Action**: Check if a specific role is assigned.
  - If "As <Role>", follow the **Role Activation Protocol** in `/AGENTS.md`.
  - Read the role file in `Docs/AGENTS/Roles/<RoleName>.md`.
  - Check learnings in `Docs/AGENTS/Role_Learnings.md`.

### 2. Executing a Task
- **Engineering Standard**: All analysis-affecting logic MUST use LLM intelligence (no regex/heuristics).
- **Bugfixing Standard**: For every bugfix, regression fix, failing test/build fix, review finding, runtime defect repair, or failed-validation recovery, read and apply `.claude/skills/debt-guard/SKILL.md` before editing. In Captain Deputy workstreams, the deputy actively controls debt-guard posture and Steer-Co decides contested complexity direction by consent.
- **Mechanical Debt Sensors**: Run `npm run debt:sensors` automatically for Captain Deputy V2/debt-sensitive workstreams, debt-sensitive Steer-Co packets, V2 Consolidation Gate packages, and Lead Developer closeout. Record status and salient warnings; `advisory_warn` is not a hard blocker unless Captain explicitly requires `--fail-on-warn`.
- **V2 Convergence Controls**: Substantial V2 packages must state `V2 SCORECARD IMPACT` and `V2 RETIREMENT LEDGER IMPACT` against `Docs/AGENTS/V2_Excellence_Scorecard.md` and `Docs/AGENTS/V2_Retirement_Ledger.md`.
- **Report Quality Standard**: When judging report quality, compare the target report with Captain expectations, benchmark/Q-code JSONs, and the best usable comparator reports listed in `Docs/AGENTS/Captain_Quality_Expectations.md`; label comparators as exact/variant, local/deployed, and current/historical.
- **Architecture Reference**: Follow patterns in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
- **Multilingual Support**: Ensure analysis handles non-English inputs correctly.

### Shared Workflow Skills

Gemini can use the shared FactHarbor workflow library stored under `.claude/skills/`. These
files are the canonical workflow definitions shared across Claude, Codex/GPT, and Gemini.

Skill selection order:
1. Apply mandatory gates first, especially `debt-guard` before any bugfixing task.
2. Honor explicit user or prompt assignments such as `Skill: pipeline` or `/audit`.
3. Use `fhAgentKnowledge.preflight_task` recommendations when MCP is available, required by role activation, or workflow choice is ambiguous.
4. Otherwise select from the workflow list below by task fit and then read only the needed `SKILL.md`.

When workflows overlap, use each workflow's own scope guards to decide ownership. Do not create or invoke a generic meta-routing skill. `captain-deputy` is a Captain-delegated workstream coordinator for the fixed Steer-Co + Lead Developer operating model; it does not replace mandatory workflow selection or approval gates.

Available workflows:
- `debt-guard` → `.claude/skills/debt-guard/SKILL.md`
- `debate` → `.claude/skills/debate/SKILL.md` (read and execute the role procedure manually or with available agents when slash commands are unavailable)
- `captain-deputy` → `.claude/skills/captain-deputy/SKILL.md` (Captain-facing front-door workflow coordinating Steer-Co, Lead Developer delivery, reasoning budgets, active debt-guard control, advisory debt-sensor checkpoints for V2/debt-sensitive work, progress monitoring, and escalation only for high risk, approval gates, or no-consent essential decisions)
- `steer-co` → `.claude/skills/steer-co/SKILL.md` (Captain-facing model-diverse steering committee; GPT-5.5 xhigh Leader holds bounded consent-based steering authority for low-risk or bounded medium-risk decisions, including contested complexity direction and debt-sensor interpretation for V2/debt-sensitive decisions, and returns concise state, directions, decision/proposal, and a Lead Developer handoff prompt)
- `reasoning-budget` → `.claude/skills/reasoning-budget/SKILL.md` (choose and adjust reasoning effort after the task/workflow is known; does not select skills or approve work)
- `context-extension` → `.claude/skills/context-extension/SKILL.md` (preserve, exchange, and reload high-value in-progress context throughout long sessions when context-window loss, compaction, interruption, delegation, or handoff would lose important state)
- `pipeline` → `.claude/skills/pipeline/SKILL.md`
- `audit` → `.claude/skills/audit/SKILL.md`
- `prompt-audit` → `.claude/skills/prompt-audit/SKILL.md`
- `validate` → `.claude/skills/validate/SKILL.md`
- `handoff` → `.claude/skills/handoff/SKILL.md`
- `debug` → `.claude/skills/debug/SKILL.md`
- `explain-code` → `.claude/skills/explain-code/SKILL.md`
- `prompt-diagnosis` → `.claude/skills/prompt-diagnosis/SKILL.md`
- `report-review` → `.claude/skills/report-review/SKILL.md`
- `docs-update` → `.claude/skills/docs-update/SKILL.md`
- `wip-update` → `.claude/skills/wip-update/SKILL.md`

Usage:
1. Read the corresponding `.claude/skills/<name>/SKILL.md`.
2. Ignore the YAML frontmatter at the top.
3. Follow the numbered workflow steps as plain markdown instructions.
4. Prefer PowerShell-compatible commands in this Windows repository.

### 3. Completing a Task
- **Trivial (<3 mins)**: No logging required.
- **Standard**: Append an entry to `Docs/AGENTS/Agent_Outputs.md` using the script `scripts/log_task.cjs`.
- **Significant**: Create a dedicated file in `Docs/AGENTS/Handoffs/` and link it in `Agent_Outputs.md`.

## Logging Task Completions

When finishing a non-trivial task, you MUST use the `scripts/log_task.cjs` script to ensure consistent logging.

### Example usage:
```bash
node .gemini/skills/factharbor-agent/scripts/log_task.cjs "Lead Developer" "Fix bug in aggregation" "Corrected the weight for disputed evidence" "apps/web/src/lib/analyzer/aggregation.ts" "Increased the weight for disputed evidence items from 0.7 to 0.8" "None" "Check if this affects existing tests" "Verify against neutrality-tests" "Added note to Role_Learnings.md regarding weighting logic"
```

## Resources

### scripts/
- **log_task.cjs**: Automates appending entries to `Docs/AGENTS/Agent_Outputs.md` using the mandatory template.

### references/
- **completion-template.md**: The mandatory template for task completion entries (used internally by the logging script).

## Engineering Mandates

- **No Domain-Specific Hardcoding**: All code must remain generic.
- **Input Neutrality**: Phrasing should not affect analysis depth.
- **UCM (Unified Config Management)**: Tunable parameters belong in `config-storage.ts` (SQLite), not hardcoded.

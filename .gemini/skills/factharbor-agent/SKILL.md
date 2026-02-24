---
name: factharbor-agent
description: Specialized agent for handling role activation, task completion logging, and following project-specific protocols (Role Activation Protocol, Agent Exchange Protocol). Use when switching roles, finishing non-trivial tasks, or needing to follow FactHarbor's Senior Engineer engineering standards.
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
- **Architecture Reference**: Follow patterns in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
- **Multilingual Support**: Ensure analysis handles non-English inputs correctly.

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

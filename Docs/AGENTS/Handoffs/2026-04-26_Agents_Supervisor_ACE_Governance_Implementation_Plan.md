---
roles: [Agents Supervisor]
topics: [ace, governance, implementation_plan, telemetry, commit_scope]
files_touched:
  - Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md
  - Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md
  - Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md
  - Docs/AGENTS/Multi_Agent_Collaboration_Rules.md
  - Docs/AGENTS/Policies/Handoff_Protocol.md
  - .claude/skills/debt-guard/SKILL.md
  - scripts/build-index.mjs
  - apps/web/test/unit/lib/build-index.test.ts
  - Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Implementation_Plan.md
  - Docs/AGENTS/Agent_Outputs.md
---

# ACE Governance Implementation Plan

## Task

Commit the ACE governance stabilization work and create a concrete implementation plan for the accepted re-audit corrections.

## Done

- Created `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md`.
- The plan sequences work as Phase 0 commit baseline, Phase 1 clean passive telemetry index, Phase 2 reproducible collaboration-rules audit, Phase 3 restructure proposal, Phase 4 approved rules edit, and Phase 5 telemetry review / optional evaluator.
- Kept the plan aligned with the accepted correction that first telemetry should parse existing `/debt-guard` result blocks rather than introduce new YAML immediately.
- Preserved the constraint that generated index files should be regenerated only from a clean or intentionally staged handoff/WIP state.

## Decisions

- Commit scope should include the ACE governance WIP docs, ACE handoffs, debt-guard/handoff protocol updates, `build-index.mjs`, and focused parser tests.
- Exclude unrelated untracked WIP/handoff files and pre-existing dirty generated index files from this commit.

## Warnings

- `Docs/AGENTS/index/handoff-index.json`, `stage-manifest.json`, and `stage-map.json` remain dirty outside this scoped commit. They should be handled separately from a clean/intentional generated-index pass.
- The implementation plan intentionally does not approve broad restructuring; it requires a reproducible audit first.

## Learnings

- When committing governance changes with dirty generated indexes present, stage the intended source docs/scripts/tests explicitly and leave generated artifacts out unless they were rebuilt under controlled inputs.

## For next agent

Start from `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md`. The next actionable slice is Phase 1: clean or intentionally stage the handoff/WIP set, then run `npm run index:tier2` and inspect generated `governance.debt_guard` data before committing `handoff-index.json`.

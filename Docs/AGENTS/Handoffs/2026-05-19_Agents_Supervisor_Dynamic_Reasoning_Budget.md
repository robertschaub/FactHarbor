# Agents Supervisor Handoff: Dynamic Reasoning Budget

**Date:** 2026-05-19
**Role:** Agents Supervisor
**Agent/Tool:** Codex (GPT-5.5)
**Status:** Complete; dynamic reasoning-effort router implemented in agent process docs

## Summary

Implemented automatic dynamic reasoning selection as agent-process infrastructure. The new `/reasoning-budget` workflow selects the lowest safe reasoning effort at task start, then escalates or de-escalates from concrete signals such as verifier failure, reviewer disagreement, scope change, failed-attempt recovery, or final synthesis.

This is intentionally not a skill-selection router and does not approve work. It only routes reasoning effort after the task, role, and workflow are known.

## Files Changed

- `.claude/skills/reasoning-budget/SKILL.md`
- `.claude/skills/reasoning-budget/agents/openai.yaml`
- `AGENTS.md`
- `CLAUDE.md`
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
- `Docs/AGENTS/Policies/Handoff_Protocol.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Role_Learnings.md`

## Behavior Added

- Reasoning levels:
  - `R0 mechanical` = low
  - `R1 bounded` = medium
  - `R2 complex` = high
  - `R3 critical` = extra high
  - `R4 external challenge` = Opus/Gemini reviewer with written unique question
- Implementation Lead / Delivery Lane defaults to `R2`, raises to `R3` for failed verifiers, unclear root cause, cross-stage changes, or final integration synthesis.
- Steer-Co / Challenge Lane defaults to `R2`, raises to `R3` for reviewer disagreement, contested sequencing, suspected scope drift, or process-cost tradeoffs.
- Subagent sidecars default to `R1`; they should not use extra-high reasoning unless a concrete trigger or unique challenge question exists.
- Launch notes for delegated, multi-agent, or high-risk work now have a reasoning-budget field.
- Effort changes should be logged tersely, e.g. `Reasoning change: R2 -> R3`.

## Warnings

- `/reasoning-budget` must not be used to choose other skills. `AGENTS.md` still owns skill selection order.
- `R4` is not "more thinking by default"; it requires a written unique review question before invoking Opus/Gemini or another independent model family.
- Do not run all sidecars at extra-high. That recreates the cost problem this workflow is meant to prevent.
- This change affects agent process only; it does not change FactHarbor runtime model routing, UCM, prompts, or product behavior.

## Validation

- `python C:/Users/rober/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/reasoning-budget`
- `rg` cross-reference check for `reasoning-budget`, `Dynamic Reasoning`, and `Reasoning budget`

## Next Agent

Use `/reasoning-budget` whenever launching delegated, multi-agent, Steer-Co/Challenge Lane, implementation-lead, review/debate, failed-validation, or expensive-to-reverse work. For normal implementation, start at `R2`; for routine mechanical tasks, drop to `R0`/`R1`; for failures or contested synthesis, raise to `R3`.

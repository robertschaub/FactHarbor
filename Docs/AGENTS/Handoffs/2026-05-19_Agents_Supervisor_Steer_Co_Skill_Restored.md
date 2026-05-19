# Agents Supervisor Handoff: Steer-Co Skill Restored

**Date:** 2026-05-19
**Role:** Agents Supervisor
**Agent/Tool:** Codex (GPT-5.5)
**Status:** Complete; Steer-Co steering committee skill restored

## Summary

Investigated the missing Steer-Co skill. Current repo, likely `.claude/skills/*steer*` paths, local git history, and Codex skill folders did not contain a recoverable Steer-Co skill. Restored it as a Captain-facing steering committee workflow and wired it into the named workflow table.

## Files Changed

- `.claude/skills/steer-co/SKILL.md`
- `.claude/skills/steer-co/agents/openai.yaml`
- `AGENTS.md`
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Role_Learnings.md`

## Behavior Added

- `/steer-co` now convenes a model-diverse steering committee for high-impact direction-setting, committee review, or clarification.
- The GPT leader owns intake, member briefing, synthesis, consent checks, and Captain-facing output.
- Default members include Claude Opus 4.6 and Gemini newest approved pro model when available.
- It returns current state, decision/proposal, consent check, dissent/uncertainty, directions, a Lead Developer prompt, reconvene trigger, and Captain escalation.
- It does not bypass Captain approval gates, prompt-edit approvals, live-job discipline, mandatory workflows, or the Exchange Protocol.

## Validation

- `python C:/Users/rober/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/steer-co`

## Next Agent

Use `/steer-co` when the Captain needs a steering committee decision/proposal or clarification. Keep it lean: convene only for real steering questions, brief members from the same evidence packet, preserve material dissent, and escalate any authority-gated decision to Captain.

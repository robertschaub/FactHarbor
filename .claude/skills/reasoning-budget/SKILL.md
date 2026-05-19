---
name: reasoning-budget
description: Dynamically choose and adjust reasoning effort for FactHarbor agent work. Use at task start for delegated, multi-agent, Steer-Co/Challenge Lane, implementation-lead, review/debate, failed-validation, or expensive-to-reverse work; use again after verifier failures, reviewer disagreement, scope changes, or final synthesis. This skill routes reasoning effort only; it does not choose other skills, approve work, or change product/runtime behavior.
---

# Reasoning Budget

## Overview

Select the lowest safe reasoning effort for the current task, then escalate or de-escalate from observed signals. This is a cost-control workflow for agents and subagents; it does not replace role assignment, skill selection, or Captain approval.

## Effort Levels

| Level | Use for | Typical effort |
|---|---|---|
| `R0 mechanical` | file search, formatting, index rebuilds, status checks, narrow docs edits | low |
| `R1 bounded` | clear single-scope implementation/review from an accepted packet | medium |
| `R2 complex` | cross-file or cross-doc work, unclear contracts, non-trivial synthesis | high |
| `R3 critical` | failed validation, contested causality, keep/quarantine/revert, final multi-agent synthesis | extra high |
| `R4 external challenge` | high-risk ambiguity needing independent model-family review | Opus/Gemini reviewer with written unique question |

## Startup Router

At task start, choose:

1. `R0` if the task is mechanical and reversible.
2. `R1` if the task has a precise scope, known files, and verifier path.
3. `R2` if the task crosses files, docs, roles, or ownership boundaries.
4. `R3` if the task is failed-validation recovery, contested, expensive to reverse, or final synthesis.
5. `R4` only when a distinct independent reviewer is needed and the unique review question is written before the call.

Default role mapping:

| Role/lane | Default | Raise to `R3` when |
|---|---|---|
| Captain Deputy / Orchestration Lane | `R3` only for active autonomous coordination or final synthesis; `R1` for status-only monitoring | final synthesis spans lanes, authority is unclear, or Steer-Co/Lead Developer outputs conflict |
| Implementation Lead / Delivery Lane | `R2` | verifier fails, root cause is unclear, cross-stage behavior changes, or final integration synthesis is needed |
| Steer-Co / Challenge Lane | `R2` | reviewers disagree, sequencing is contested, scope drift is suspected, or process-cost tradeoffs are being decided |
| Subagent sidecar | `R1` | the sidecar owns a complex causal review or high-risk independent challenge |
| Routine docs/status agent | `R0` or `R1` | the edit changes standing process rules or resolves conflicting docs |

## Escalation Triggers

Escalate one level when any trigger appears:

- verifier, test, build, or manual validation fails;
- task crosses ownership areas or public/prompt/model/config/runtime boundaries;
- instructions conflict or authority is unclear;
- two reviewers materially disagree;
- root cause cannot be stated with concrete evidence;
- failed attempt requires keep/quarantine/revert;
- final synthesis spans multiple agents or model outputs;
- work is expensive to reverse.

Escalate to `R4` only if the expected independent question is written first, for example: "Opus: identify authority ambiguity and hidden assumptions in this plan" or "Gemini: find an alternative framing Codex/Opus may miss."

## De-Escalation Triggers

De-escalate one level when:

- scope is single-file or purely mechanical;
- accepted plan and verifier path are precise;
- validation passes and only mechanical cleanup remains;
- subagent question is narrow and independently checkable;
- no decision authority or contested synthesis is needed.

## Launch Note Field

For delegated, multi-agent, or high-risk work, include:

```markdown
- Reasoning budget: R0 | R1 | R2 | R3 | R4
- Starting rationale:
- Escalation triggers:
- De-escalation triggers:
- Max premium calls:
```

When spawning subagents, set the subagent reasoning effort from this field. Do not give sidecars `R3`/extra-high by default; require a specific trigger or unique challenge question.

## Runtime Adjustment Log

When changing effort during a task, record one terse line in the working notes or completion output:

```markdown
Reasoning change: R2 -> R3
Reason: focused verifier failed and root cause is not isolated.
```

## Cost Rules

- Prefer scripts, grep, indexes, and deterministic checks before premium reasoning.
- Batch reviewer questions into one prompt when possible.
- Prefer one `R3` final synthesis over many `R3` sidecars.
- Do not use `R4` for duplicate review; the second model must answer a different question.
- If a premium call produces no decision-changing finding in repeated use, downgrade that route for future similar work.

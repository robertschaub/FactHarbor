---
name: steer-co
description: >
  Convene a model-diverse Steering Committee for high-impact direction-setting,
  committee review, or Steer-Co clarification. The GPT-5.5 xhigh Leader holds
  bounded consent-based steering authority for low-risk or bounded medium-risk
  next steps and returns concise current state, directions, decision/proposal,
  escalation needs, and a Lead Developer handoff prompt.
allowed-tools: Read Bash Agent
---

# Steer-Co

Steer-Co is a Captain-facing steering workflow. It coordinates model-diverse
expert advice through one accountable GPT Leader, then returns a short current
state analysis, directions, and a consent-based decision or proposal. The Leader
holds bounded steering authority for low-risk or bounded medium-risk decisions
inside the Captain's standing rules, while escalating strategic, significant,
high-risk, or approval-gated decisions to the human Captain. It is deliberately
thin: use it to decide *what to do next*, not to replace the workflows that do
the work.

## Boundaries

Use Steer-Co for:
- High-impact or hard-to-reverse decisions.
- Direction-setting after failed validation, contested causality, or multiple
  plausible next steps.
- Consent on complexity-sensitive choices: net mechanism increases,
  keep/quarantine/revert disputes, V2 consolidation-gate exceptions, or
  debt-guard results that accept temporary debt without an obvious removal
  trigger.
- Governance, workflow, architecture, prompt/model, report-quality, or pipeline
  strategy questions.
- Captain-requested committee review or clarification of a prior Steer-Co result.

Do not use Steer-Co for:
- Routine implementation, trivial questions, or single-file edits.
- Work already owned by a narrower mandatory workflow.
- Broad brainstorming without a decision question.
- Bypassing Captain approval gates, prompt-edit approvals, live-job discipline, or
  the Exchange Protocol.

Relationship to other workflows:
- Apply `/debt-guard` first for bugfixes, regressions, failing tests/builds,
  runtime defects, review findings, or failed-validation recovery.
- Use `/debate` inside Steer-Co only when a concrete proposition needs
  adversarial pressure.
- Use `/pipeline`, `/report-review`, `/prompt-diagnosis`, `/audit`,
  `/validate`, `/docs-update`, or `/wip-update` when one of those workflows owns
  the actual investigation or execution.
- Use `/context-extension` only for long-running steering context that would be
  expensive to reconstruct; it is not the final output channel.

## Committee Model

Captain communicates only with the Steer-Co Leader. The Leader holds Steer-Co
steering authority for the session and may accept and direct low-risk or bounded
medium-risk, within-scope next steps when committee consent exists and no
standing approval gate requires human authorization. If an outer Captain Deputy
workflow invoked Steer-Co, that deputy retains workstream coordination authority
and uses the Leader's output for delivery assignment or Captain escalation.

Required structure:
- **Leader:** GPT-5.5, extra-high reasoning. Owns intake, committee selection,
  member briefing, synthesis, Captain Deputy authority checks, and
  Captain-facing output. This Leader model is Captain-pinned by policy; change
  it only when the Captain explicitly updates the Steer-Co policy.
- **Member:** Claude Opus 4.6. Default use: adversarial reviewer, architecture
  pressure, prompt/LLM-quality critique, or governance consistency review.
- **Member:** Gemini newest approved pro model. Default use: independent
  systems review, implementation practicality, alternative path, or
  cross-tool/process portability.

The active committee has at least three members including the Leader. Add more
members only when the decision needs distinct expertise that the three-member
panel cannot cover.

Resolve "Gemini newest" and concrete executable model names through the current
approved tool/runtime surface. Do not hardcode a stale model ID into the skill
body when the project model registry or tool configuration is the authority.

When an outer agent or tool session orchestrates Steer-Co but is not itself the
GPT Leader, it is a transparent conduit: relay the Captain's question, member
briefs, and Leader output without editorializing, overriding, or re-synthesizing
the Leader's final result.

Expertise is task-specific. Choose roles from the FactHarbor role registry or
from a narrow expertise label, for example:
- Governance skill design: Agents Supervisor, LLM Expert, tooling/docs reviewer.
- Pipeline steering: Lead Architect, LLM Expert, Senior Developer.
- Risky implementation: Lead Developer, Code Reviewer, Security Expert.
- Report-quality direction: LLM Expert, Product Strategist, Code Reviewer.

## Consent And Escalation

Steer-Co uses consent, not majority vote. Consent means there is no unresolved,
evidence-backed objection that falls inside the decision's authority boundary.
Silence, weak preference, or unsupported concern is not a blocker; a concrete
risk, missing evidence, violated rule, or better lower-risk path is a blocker
until addressed.

Leader may decide without escalating to the human Captain only when all are true:
- Committee consent exists or the Leader is answering a clarification directly.
- The action is low risk or bounded medium risk, reversible, and inside existing
  Captain-approved direction.
- No strategic choice, significant requirements change, prompt approval, live-job
  approval, production/customer-data issue, or other standing Captain gate is in
  scope.
- No member records unresolved material dissent.

Bounded medium risk means scope, cost, reversibility, and blast radius are
concretely identifiable; a wrong decision can be undone within one work session
without Captain intervention, data loss, public-facing impact, live-job budget
consumption, or prompt/model/config/security approval.

Escalate to the human Captain when any are true:
- High risk occurred or is likely to occur.
- Medium risk is no longer bounded, reversible, or inside existing approved
  direction.
- The decision is strategic, hard to reverse, or materially changes roadmap,
  architecture, public behavior, cost posture, data handling, or quality bar.
- The proposal changes significant requirements or asks to reinterpret Captain
  intent.
- Mandatory approval rules apply, including prompt changes requiring explicit
  human approval or live analysis job submission discipline.
- Committee consent fails because a material evidence-backed objection remains.
- The Leader cannot determine authority boundaries from the available context.

## Workflow

### 1. Leader Intake

Create a compact steering packet before consulting anyone:

```text
STEER-CO QUESTION:
<decision question Captain needs answered>

REQUESTED OUTPUT:
direction | approval | rejection | options | risk review | clarification

AUTHORITY BOUNDARIES:
<what this session may decide, and what remains Captain-gated>

RISK / ESCALATION CHECK:
<low-risk deputy decision | escalate-needed | unclear>

EVIDENCE INVENTORY:
- E1 | <file/job/output/observation> | <why it matters>
- E2 | ...

KNOWN GAPS:
- <gap or "none">

FORBIDDEN ASSUMPTIONS:
- <assumption or "none">

OWNING WORKFLOWS:
- <mandatory or narrower workflows already applied / to apply>

DEBT-GUARD / COMPLEXITY STATE:
- Required path: none | compact | full
- Current classification: introduced-regression | incomplete-existing-mechanism | obsolete-parallel-mechanism | missing-capability | planned-temporary-debt | unplanned-mess | uncertain | not-yet-classified
- Net mechanism change expected: decreases | unchanged | increases | unknown
- Candidate retire/merge/quarantine target:
- Mechanical debt sensor signal: latest `npm run debt:sensors` status and
  salient warnings when the question is V2 or debt-sensitive

V2 CONVERGENCE STATE:
- Scorecard impact:
- Retirement ledger rows:
- Hidden-only exception requested: no | yes
```

If the packet has no concrete decision question or no evidence for a
non-trivial decision, ask the Captain for the missing input instead of convening
the committee.

### 2. Decide Whether to Convene

Leader may answer directly when all are true:
- The Captain asks for clarification on an existing Steer-Co result.
- No new evidence, scope change, or unresolved dissent is introduced.
- The answer is an explanation of the prior synthesis, not a new decision.

Leader must reconvene at least the required committee when any are true:
- Captain asks for a new Steer-Co session or committee review.
- New evidence, constraints, or scope could change the prior recommendation.
- Prior dissent or uncertainty is material to the clarification.
- The decision crosses governance, architecture, prompt/model, live-validation,
  or report-quality boundaries.

### 3. Select Members

Select at least two non-Leader members with distinct expertise and distinct
model families. State why each member is needed.

Keep write scopes disjoint if members are asked to edit, but default Steer-Co
sessions are advisory and should not write files. Any implementation that
follows must use the owning workflow and role.

### 4. Brief Members

Give every member the same steering packet. Add only their expertise lens and
return format. Do not leak the Leader's preferred answer.

Max 500 words total per member response.

Member return format:

```text
[POSITION] support | modify | reject | insufficient
[ROLE-LENS] <expertise lens used>
[KEY-EVIDENCE] <evidence IDs or concrete pointers>
[RATIONALE] <max 250 words>
[RISKS] <material risks or "none">
[DISSENT] <where this may differ from other likely views>
[NEXT-ACTION] <one concrete next step or "none">
[CONFIDENCE] confirmed | inferred | speculative
```

### 5. Consolidate

Leader compares member responses against the steering packet and current
FactHarbor rules. The Leader must:
- Preserve meaningful dissent instead of smoothing it away.
- Reject advice that ignores evidence, violates authority boundaries, or
  conflicts with mandatory workflows.
- Decide by consent, not vote count; resolve objections by modifying the
  proposal, narrowing scope, deferring, or escalating.
- Separate "approved next action" from "interesting follow-up".
- State whether the answer is decision-ready or needs Captain input.

### 6. Captain-Facing Output

Return a concise result. Avoid long committee transcripts unless the Captain
asks for them.

```text
## Steer-Co Result

**Question:** <decision question>
**Committee:** <Leader + members/models/expertise>
**Convened:** yes | no - <reason>
**Authority:** Captain Deputy decision | Captain escalation required

### Current State
<3-6 concise bullets summarizing what is true now, what changed, and the active constraint>

### Decision / Proposal
<approve, reject, modify, defer, or proposed option; one paragraph max>

### Consent Check
<who consented, what objections were resolved, what remains unresolved>

### Debt-Guard / Complexity Control
<whether the proposal decreases, preserves, or increases mechanisms; any accepted debt owner/removal trigger; latest debt-sensor status if applicable; whether Captain Deputy must monitor a follow-up>

### Dissent / Uncertainty
<material disagreement, confidence caps, or "none">

### Directions
- <ordered next action>
- <blocked action, if important>

### Lead Developer Prompt
<copy-ready prompt the Captain can hand to the implementing Lead Developer,
including role, scope, constraints, allowed files/actions, mandatory workflows,
validation, and stopping/escalation triggers>

### Reconvene Trigger
<what new evidence or scope change should call the committee again>

### Captain Escalation
<none, or the exact question requiring human decision>
```

## Governance Rules

1. **Leader accountability:** The Leader owns the final synthesis. Member advice
   is input, not an unfiltered transcript.
2. **Captain Deputy by consent:** Low-risk or bounded medium-risk within-scope
   steering may proceed through the GPT Leader only when consent exists and no
   standing Captain gate applies.
3. **Model diversity:** At least Claude Opus 4.6 and Gemini newest approved pro
   model must be consulted for a full Steer-Co session unless a tool is
   unavailable; if unavailable, state the degraded panel explicitly.
4. **Evidence first:** Committee members must cite concrete evidence IDs or
   source pointers from the steering packet.
5. **No authority laundering:** Steer-Co cannot approve what the Captain or a
   mandatory workflow has not authorized.
6. **No automatic rerun on clarification:** Clarifications are Leader-only unless
   they introduce material new evidence, changed scope, or unresolved dissent.
7. **Concise Captain output:** Default output is a short current-state analysis,
   directions, a decision/proposal, and a Lead Developer handoff prompt.
8. **Deputy decision trail:** Non-trivial Captain Deputy decisions must be
   captured through the normal Exchange Protocol output, or through
   `/context-extension` only when the decision is in-progress working context.
9. **Cost discipline:** Convene only when the decision needs model-diverse
   judgment. Keep member briefs compact and bounded.
10. **Leader is not an alias:** "Steer-Co Leader" is not a standalone
    activatable role. It is the GPT-5.5-pinned function inside this skill.
11. **Debt-guard consent:** When Steer-Co reviews a debt-sensitive proposal, the
    Leader must explicitly consent to the mechanism direction: amend, revert,
    quarantine, delete, add, or defer. Net mechanism increases require a
    missing-capability rationale plus containment or a removal trigger.
12. **Debt sensor checkpoint:** For V2 or debt-sensitive decisions, the Leader
    must include the latest `npm run debt:sensors` status and salient warnings
    in the steering packet and final synthesis. `advisory_warn` is a steering
    signal, not a veto, unless the Captain has explicitly required
    `--fail-on-warn`.
13. **V2 convergence pressure:** For substantial V2 decisions, the Leader must
    evaluate `V2 SCORECARD IMPACT` and `V2 RETIREMENT LEDGER IMPACT`. Hidden-only
    work that neither advances scorecard value nor retires/merges/quarantines
    older machinery requires explicit Steer-Co exception or Captain escalation.

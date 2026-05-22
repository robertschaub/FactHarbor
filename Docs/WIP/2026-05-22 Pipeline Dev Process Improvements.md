# Pipeline Dev Process Improvements

**Date:** 2026-05-22
**Status:** Process/working-conditions tracking note
**Scope:** Pipeline V2 coordination process, not technical implementation steering

## Source Question

Captain asked Captain-Deputy:

> Is there anything that makes your work difficult? How could we improve the
> Process? How could we improve the Working conditions?

Captain-Deputy answer, consolidated:

- The main difficulty is coordination weight, not code access or tooling.
- Too many small gated slices create overhead before visible report-quality
  progress.
- Decisions are spread across WIP packages, handoffs, `Agent_Outputs`, Backlog,
  ledger, and chat.
- Hidden-only safety work became too easy to add, while report-value work stayed
  too heavily gated.
- Every live canary needs commit, runtime refresh, provenance checks, route
  checks, result docs, and ledger updates. This is correct but expensive.
- Some agents interpreted safety as "avoid the next risky capability" instead
  of "make the next capability safe enough."
- Pass/fail criteria were sometimes over-specific for infrastructure and
  under-specific for report quality.

## Done

- HighJump principle clarified for the process layer: lower premature blocking
  bars enough to get a first working internal V2 report, then raise quality,
  safety, and completeness from observed report evidence.
- Captain-Deputy role and skill now explicitly say process tooling must not
  artificially block report creation.
- Agents Supervisor process-improvement boundary clarified: improve process and
  working conditions only; do not steer the active V2 technical implementation.
- Captain-Deputy remains the front door for coordinating Steer-Co and Lead
  Developer, while Steer-Co owns steering and Lead Developer owns delivery
  inside approved packages.
- `context-extension` guidance was added for Captain-Deputy: use it selectively
  for phase-boundary checkpoints, complex delegation packets, material
  subagent/debate findings, and compaction/resume; do not use it as a second
  approval system or routine closeout artifact.
- Advisory `npm run debt:sensors` checkpoints are already part of the V2
  autonomous process for debt-sensitive workstreams and closeouts.

## Open For Captain Deputy

- Maintain one practical "current V2 lane" truth for the active phase:
  current goal, active package, allowed changes, live budget, latest canary
  result, next stop condition, and next action.
- Keep implementation moving in value slices rather than micro-slices where
  possible. Prefer outcome-shaped packages such as "produce one internal full
  report", "improve report quality", or "prepare public projection" over
  repeated hidden-only readiness layers.
- Use Steer-Co for direction, consent, and contested tradeoffs, not routine
  implementation mechanics.
- Let the Lead Developer handle implementation detail inside approved direction
  without re-asking Captain for every low-risk repair.
- Enforce the rule that each new hidden mechanism must retire, merge,
  quarantine, or clearly unlock something valuable; otherwise seek a Steer-Co
  exception.
- Keep HighJump operational: safety should make the next capability safe enough,
  not avoid the next capability indefinitely.
- Keep the tree and handoff state understandable for the team while active V2
  implementation continues.
- Use `/context-extension` when delegating complex V2 state to subagents or at
  phase boundaries where reconstructing state would be expensive.

## Open For Agents Supervisor

- Design process aids that reduce friction without adding new approval barriers.
  Default mode should be advisory unless an existing transition gate is being
  crossed.
- Help define a compact current-state projection or template for the active V2
  lane, if Captain-Deputy confirms this would reduce reconstruction cost.
- Help design automation for canary/provenance closeout:
  commit hash, runtime hash, job id, artifact route checks, public leak checks,
  budget decrement, and result-block generation.
- Review whether process changes are helping implementation momentum or
  accidentally recreating barrier overhead.
- Keep deferred process debt visible without forcing it into the active
  implementation lane, especially broad handoff cleanup and boundary-guard test
  splitting.
- Periodically review working conditions with Captain-Deputy and monitoring
  agents, then consolidate only the changes that reduce coordination weight.

## Agents Supervisor Action Plan

### 1. Friction-Reduction Test

Before proposing or accepting any process aid, apply this test:

> Does this reduce reconstruction, manual canary/provenance work, or repeated
> coordination cost without adding a new approval gate?

If the answer is no, defer it. Do not create a new checklist, validator,
template, or handoff obligation just because the process feels incomplete.

### 2. Current V2 Lane Projection

Offer Captain-Deputy a compact current-lane template only if it reduces
reconstruction cost. The projection must mirror existing authority and must not
become a second source of truth.

Suggested fields:

- current goal;
- active package;
- allowed scope;
- latest canary or report result;
- live budget;
- next action;
- stop conditions;
- authority sources.

Agents Supervisor responsibility:

- draft the template;
- mark which fields are copied from authoritative files;
- keep it advisory until Captain-Deputy confirms it helps active coordination.

Captain-Deputy responsibility:

- decide whether to use it in the active V2 lane;
- keep it aligned with the real package, ledger, gate register, and handoff
  state if adopted.

### 3. Canary And Provenance Closeout Automation

Draft requirements for a helper script, then let Captain-Deputy and Lead
Developer decide timing and implementation ownership.

Target helper:

```text
npm run v2:canary-closeout -- <jobId>
```

It should collect or verify:

- commit hash;
- runtime hash;
- job id;
- artifact route auth and `no-store` behavior;
- public leak checks;
- budget ledger status;
- standard result block text.

Default behavior must be advisory/reporting. It may block only at live/model
execution or runtime artifact capture transition gates when an existing hard
stop is detected.

### 4. Barrier-Risk Review

After each meaningful V2 phase or internal-report milestone, review whether
process changes are helping or slowing implementation.

Review questions:

- Did this reduce repeated context reconstruction?
- Did this reduce manual canary/provenance work?
- Did this create a new permission ritual?
- Did this help the team get closer to report quality?
- Should any process aid be removed, simplified, or kept advisory-only?

The output should be a short process note, not a new steering packet, unless a
real hard-stop condition appears.

### 5. Deferred Process Debt Tracking

Keep deferred process debt visible without injecting it into the active V2 lane.
This includes:

- broad handoff cleanup;
- boundary-guard test splitting;
- WIP pruning;
- debt-sensor baseline tuning.

Escalate a deferred item into active work only if it becomes a concrete blocker
to implementation, live inspection, report review, or safe canary execution.

### 6. Periodic Working-Conditions Review

At phase boundaries, ask Captain-Deputy and monitoring agents for a short
working-conditions signal:

- what slowed the team;
- what helped;
- what should be removed or simplified;
- what one process aid, if any, is worth implementing next.

Consolidate only changes that reduce coordination weight. Do not use the review
to steer the active V2 technical direction.

## Not A Process Improvement Goal

- Do not use this note to decide the active V2 technical slice.
- Do not add blockers for ordinary planning, local implementation inside an
  approved envelope, local tests, or evidence review.
- Do not turn advisory process checks into a second approval workflow.
- Do not require Captain input unless there is unmanageable risk, a standing
  Captain approval/budget gate, public/raw-text leak risk, stale runtime/source
  at execution, conflicting authority, unresolved material dissent, or a
  critical question the agent team cannot settle.

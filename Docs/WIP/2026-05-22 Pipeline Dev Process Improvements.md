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

## Captain Deputy Disposition

**Status:** addressed for the active HJ19 lane without adding a new approval
gate.

Applied now:

- Created `Docs/STATUS/V2_Current_Lane.md` as the single compact projection for
  the active V2 lane.
- Kept the projection advisory: it mirrors package, ledger, gate, and Captain
  authority; it is not a second source of truth.
- Used the current-lane projection to make the next action explicit:
  committed HJ19 repair, refresh runtime, preflight routes, then run exactly one
  HJ19 canary.
- Preserved HighJump momentum: no new proof layer, no added review loop, and no
  extra Captain question before the HJ19 canary path.
- Kept Lead Developer mechanics inside the approved package: runtime refresh,
  route preflight, artifact capture, and result documentation do not need a
  separate Captain decision unless a hard stop appears.
- Kept the hidden-mechanism rule active: HJ19 adds no new hidden mechanism; it
  amends the existing report-writer mechanism.
- Did not use `context-extension` for this step because the needed state is now
  captured in committed WIP, handoff, status, ledger, and the current-lane
  projection. It remains available for phase-boundary checkpoints or complex
  delegation.

Deferred intentionally:

- Canary closeout automation remains useful but should not be built before the
  HJ19 canary. The next manual closeout will provide concrete data for a small
  helper script later.
- Broad WIP/handoff cleanup remains out of the active lane unless it blocks
  report generation, live inspection, or safe canary execution.
- Boundary-guard splitting remains process debt, not an HJ19 blocker.

### HJ20 Update

**Status:** current-lane projection is in active use and remains advisory.

What changed after HJ19:

- The projection was advanced from the HJ19 canary stop to the HJ20 W5
  output-shaping repair.
- The projection records that HJ20 is a prompt-only repair inside the existing
  W5 contract, not a new hidden mechanism.
- It also records the failed-verifier recovery: a W7C broad-suite symptom passed
  in isolation and on full rerun, so the team did not add a W7C patch or broaden
  scope.

Process effect:

- The current-lane projection reduced reconstruction cost during HJ20 without
  becoming an approval source.
- It helped keep the repair focused on report-progress value: clear the W5 stop
  so the existing W8/HJ19 report-writer path can be exercised.
- No canary-closeout automation, WIP pruning, or boundary-guard split was pulled
  into the HJ20 hot path.

Next process posture:

- Keep updating `Docs/STATUS/V2_Current_Lane.md` only at stable lane changes or
  before expensive execution steps.
- Do not add another process artifact unless it removes concrete manual work
  from canary provenance, route checks, or result documentation.

HJ20 canary-provenance update:

- The current-lane projection was synced again after HJ20 canary
  `8fe16cdeef7842058a8a36337a41b82e` became unevaluable due hidden-route
  readiness / artifact-capture failure.
- Canary information yield was recorded as `new failure`, specifically an
  operational provenance failure, not HJ20 W5 pass/fail evidence.
- The next process aid remains advisory and concrete: require handler-level JSON
  hidden-route preflight before spending the single authorized HJ20
  evaluability rerun. This is not a new approval gate; it is stale-runtime and
  artifact-capture hygiene before live execution.

## Agents Supervisor Monitoring Review - HJ18 To HJ20

**Source:** monitoring-agent state summary from 2026-05-22.

Process read:

- The HighJump direction is working better than the earlier stop-heavy mode:
  internal Alpha drafts have been produced, containment has held, and the active
  tranche has improved budget discipline.
- The active bottleneck is no longer missing governance. It is manual execution
  friction: current-lane freshness, canary closeout bookkeeping, reduced
  reviewer availability, and repeated fix/canary loops.
- The current-lane projection is useful, but it can drift because it is manual.
  Treat freshness as a small live-execution hygiene step, not a new review gate.
- Reduced-quorum Steer-Co is acceptable for narrow, reversible, verifier-clean
  HighJump repairs, but repeated degraded review should be visible.
- After the next successful report draft, the process should pivot from
  "reach the report path" to "inspect the actual report and raise the one bar
  whose looseness caused a concrete report defect."

Immediate Agents Supervisor process stance:

- Do not block the HJ20 canary for process cleanup.
- Ask Captain-Deputy to sync `Docs/STATUS/V2_Current_Lane.md` before live
  execution if it does not name the committed implementation anchor, latest
  canary result, remaining budget, and next action.
- Ask Captain-Deputy to record canary information yield after each canary:
  `report produced`, `new stage reached`, `new failure`, `same stop repeated
  with new evidence`, or `same stop repeated without useful new information`.
- If two consecutive packages proceed with degraded external review, ask
  Captain-Deputy to record the pattern and use an internal challenge/Steer-Co
  consent check before the next broader or harder-to-reverse change.
- Defer canary-closeout automation until after the next manual HJ20/HJ21
  closeout supplies a stable example, unless manual capture itself becomes a
  blocker.

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
- What was the last canary's information yield: report produced, new stage
  reached, new failure, same stop repeated with new evidence, or same stop
  repeated without useful new information?
- If external reviewer coverage was degraded, is this an isolated timeout or a
  repeated reduced-quorum pattern?

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

# V2 Orchestration Process And Working Conditions Improvement Plan

**Date:** 2026-05-22
**Status:** Reviewed plan, not implementation authorization
**Owner:** Agents Supervisor
**Audience:** Captain, Captain-Deputy, Lead Developer team, Steer-Co, monitor agents

## Purpose

Improve the operating conditions for the active Pipeline V2 workstream by
removing avoidable manual reconstruction, not by adding another approval layer.
The plan responds to Captain-Deputy's
reported pain points:

- high context volume across WIP docs, handoffs, status files, ledgers, chat
  decisions, and package docs;
- oversized centralized boundary-guard testing;
- human-readable approvals that need manual conversion into durable repo state;
- fragile live artifact capture from process-local hidden artifacts;
- too many intermediate hidden-chain mechanisms.

This plan defines process/tooling improvements for later bounded implementation
packages. It does not create new standing gates. Tooling introduced under this
plan must default to advice unless it is checking one of the explicit transition
gates in the severity policy below.

## Review Result

Reviewed by:

- Claude Opus 4.6 through the FactHarbor Claude wrapper:
  `MODIFY`.
- GPT reviewer subagent:
  `MODIFY`.
- Friction-focused GPT reviewer after Captain concern:
  `MODIFY`.
- Friction-focused Claude Opus 4.6 retry:
  `MODIFY`.

Consolidated decision:

Proceed, but only with the following corrections:

1. The durable package approval block is the authority. `V2_Active_Slice.json`
   is only a validated projection of that authority.
2. The active-slice projection must not duplicate or silently conflict with
   `V2_Gate_Register.json` and `V2_Live_Job_Tranche_Ledger.json`; it must
   define which fields are mirrored and which file remains authoritative.
3. The active-slice schema must handle concurrent or adjacent V2 slices, budget
   exceptions, and overrun records.
4. Canary preflight and capture scripts must reduce manual mistakes without
   creating a second quality-review or approval mechanism.
5. Boundary-guard splitting and broad WIP archival remain deferred until report
   value stabilizes or verifier friction becomes a concrete blocker.
6. Active-slice validation and canary tooling default to advisory. They block
   only at the explicit transition gates defined below.

## Operating Principle

Use hard gates only where a mistake would invalidate a run, leak private state,
spend unauthorized budget, or bypass Captain approval. Everything else should
help agents see current state and keep moving inside the approved envelope.

Reduce context reconstruction by converting current authority into a small,
validated, machine-readable projection. Do not create a second source of truth
or a second approval workflow.

Every process addition must either:

- replace manual reconstruction;
- prevent a known live-job/provenance mistake;
- reduce repeated guard maintenance;
- or retire/merge/quarantine an older process burden.

## Severity Policy

Validators and checklist scripts introduced by this plan default to advisory
mode. They may block only at these four transition gates:

1. live or model execution;
2. public API/UI/report/export exposure;
3. gated package execution;
4. runtime artifact capture.

They must not block ordinary planning, local implementation inside an approved
envelope, documentation updates, local tests, or evidence review.

### Blocker

Block only when one of the four transition gates is being crossed and the tool
detects one of these conditions:

- missing Captain or package approval for gated V2 execution;
- wrong, paraphrased, or non-Captain-defined input for live/canary/validation;
- no approved live-job budget or no recorded exception authority;
- stale runtime or source mismatch before live/model execution;
- public leak risk, missing route auth, or missing no-store behavior for
  runtime/capture routes;
- conflicting approval authority for the same package or gate;
- attempted execution outside the approved package envelope.

Projection freshness rule:

- Block when the canonical authority source conflicts with the persisted
  projection at a transition gate.
- Warn when the projection is stale but the canonical authority source is
  identified, trusted, and mechanically recomputable.

Override path:

- Captain explicit override for live/model execution and public exposure.
- Steer-Co exception for gated-package execution when authority is ambiguous but
  contained.
- Lead Developer may proceed with evidence capture only after Captain-Deputy
  confirms the canonical authority source and no leak/auth/no-store blocker is
  present.

### Warning

Warn but do not stop for:

- missing scorecard or retirement metadata on non-executing docs/planning work;
- uncommitted relevant files before local-only checks;
- stale active-slice projection when the authoritative source is clear;
- missing capture target when no capture is being run;
- budget near limit;
- advisory debt-sensor findings;
- non-material package metadata drift.

Warnings must still be recorded in packets, handoffs, or closeouts when the
work is non-trivial. Advisory does not mean silent.

### Info

Informational only:

- derived package/hash/authority values;
- evidence-only capture completed;
- deferred boundary-guard split;
- deferred WIP archival;
- reminders that a plan does not authorize implementation when no
  implementation is being attempted.

## Phase P1: Durable Approval Block First

Priority: P0

Add a compact positive work-envelope block to new V2 packages that touch any
approval-gated surface. This is not meant to expand package size; it replaces
long "do not" lists with a short statement of what the team may do and where it
must stop.

```text
WORK ENVELOPE / APPROVAL AUTHORITY
Approval pointer:
Lead Developer may:
Files / surfaces:
Live/model execution:
Captain-defined input:
Must stop on:
Budget / exception:
Scorecard / retirement rows:
```

Rules:

- New packages use this block immediately.
- Existing packages are not retroactively reformatted unless reopened.
- The block is the durable authority anchor.
- Chat approvals must be converted into this block before implementation or
  canary execution when they affect gated work.
- Keep the block short. Detailed prohibitions belong only where they prevent a
  plausible mistake in the current package.

Owner: Captain-Deputy.

Consumers: Lead Developer, Steer-Co, monitor agents.

## Phase P2: Active Slice Projection

Priority: P0 after the approval-block template exists

Create:

```text
Docs/AGENTS/V2_Active_Slice.json
```

Purpose:

Machine-readable projection of current V2 authority and live-job readiness. It
does not authorize work by itself and is advisory by default.

Minimum shape:

```json
{
  "schemaVersion": "v2-active-slice.v1",
  "updatedAt": "2026-05-22T00:00:00.000Z",
  "owner": "Captain-Deputy",
  "sourcePackage": "Docs/WIP/...",
  "sourcePackageHash": "sha256:...",
  "status": "review_only|implementation|canary_ready|blocked|closed",
  "activeSlices": [
    {
      "sliceId": "X7-HJ-...",
      "authorityBlockAnchor": "Docs/WIP/...#approval-authority",
      "approvalPointers": [],
      "approvedFileEnvelope": [],
      "approvedActions": [],
      "blockedSurfaces": [],
      "verifierCommands": [],
      "canary": {
        "authorized": false,
        "exactInput": null,
        "maxJobs": 0,
        "pipelineVariant": "claimboundary-v2"
      },
      "liveBudget": {
        "authoritativeLedger": "Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json",
        "remainingAtProjectionTime": 0,
        "exceptionRequired": true,
        "exceptionAuthority": null
      },
      "runtimePreflight": [],
      "captureTargets": [],
      "hardStops": [],
      "scorecardRows": [],
      "retirementLedgerRows": []
    }
  ]
}
```

Authoritative-file split:

| Topic | Authority | Active-slice role |
|---|---|---|
| Gate status and blocked surfaces | `Docs/AGENTS/V2_Gate_Register.json` | Mirror only the current slice-relevant gate state |
| Live-job budget and consumption | `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` | Mirror remaining budget and exception requirement |
| Package approval | Current package approval block | Mirror approval pointer and allowed envelope |
| Scorecard and retirement rows | `V2_Excellence_Scorecard.md`, `V2_Retirement_Ledger.md` | Mirror touched row IDs |

Validator:

Add a future command such as:

```text
npm run v2:active-slice:check
```

Default mode is advisory. It should support a future gate mode:

```text
npm run v2:active-slice:check -- --gate
```

The gate mode may block only at the four transition gates in the severity
policy. It should use blocker/warning/info output, not a single undifferentiated
failure channel.

It should report:

- the source package is missing;
- the source package hash no longer matches;
- approval pointers are missing;
- the exact canary input is not Captain-defined;
- a live job is marked authorized without budget or exception authority;
- required scorecard or retirement rows are absent;
- mirrored gate or ledger state conflicts with the authoritative file.

Where values can be safely derived from the source package, git, gate register,
or live-job ledger, the tool should derive and report them rather than forcing
manual duplication.

## Phase P3: Canary Preflight

Priority: P1

Add a future command:

```text
npm run v2:preflight-canary
```

Scope:

Preflight only. It must not submit jobs.

Checks:

- active slice exists and validates, or the canonical authority source is
  identified and mechanically usable;
- intended slice is `canary_ready`;
- relevant source/prompt/config/approval files are committed;
- runtime commit matches intended implementation commit;
- public V2 remains blocked/precutover;
- internal routes require auth and return no-store headers;
- selected input exactly matches a Captain-defined input;
- live-job budget or exception authority exists;
- capture targets are listed.

Output levels:

- `blocker`: must stop canary execution;
- `warning`: must be recorded but does not automatically block;
- `info`: context only.

Important nuance:

"Clean tree" should mean no uncommitted runtime-relevant source, prompt,
configuration, package, approval, or ledger files. Unrelated docs noise should
not block unless it affects provenance or active authority.

Default mode should be useful before a canary without being punitive. It may
block only when the canary is actually being submitted or runtime artifacts are
being captured.

## Phase P4: Canary Capture

Priority: P1 after preflight

Add a future command:

```text
npm run v2:capture-canary -- <jobId>
```

Scope:

Evidence capture only. It must not classify report quality by itself.

Capture:

- job id;
- runtime commit;
- public status and public blocked/precutover check;
- hidden chain stage statuses;
- route auth/no-store checks;
- default projection leak checks;
- hashes, lengths, provenance, and redaction flags;
- live-job budget consumption line;
- links to artifact routes or saved sanitized snapshots;
- empty classification placeholder for Captain-Deputy or `/report-review`.

Do not create a second quality-review mechanism. Report quality remains owned by
`/report-review` and Captain comparator expectations.

This is the most friction-reducing tool in the plan because it replaces manual
route probing and copy/paste capture. It should use existing routes and avoid
adding new hidden runtime surfaces for convenience.

## Phase P5: Boundary Guard Split Plan

Priority: P2, deferred

Do not split `boundary-guard.test.ts` during the active report-value hot path
unless guard runtime or edit friction becomes a verifier-backed blocker.

When activated, start with an inventory package:

1. Map current guard sections.
2. Identify safe extraction groups:
   - gateway policy;
   - route auth/no-store;
   - public leak guards;
   - artifact sinks/provenance;
   - V1 boundary/no-reuse;
   - stage-specific W guards.
3. Extract one low-risk cluster.
4. Keep an aggregate command that runs all guard suites.

Success target:

Adding one approved route or owner should usually require one focused guard
file, not editing the whole monolith.

## Phase P6: Current Truth And Archival Cadence

Priority: P2, deferred until active-slice projection proves reliable

Keep `Docs/WIP/2026-05-21_V2_Active_Workstream_Index.md` as the human-readable
pointer map, but have new agents and monitor agents read
`V2_Active_Slice.json` first once it exists.

Archive or supersede older WIP/handoff detail only after:

- a live tranche closes;
- an internal report-review cycle completes;
- or Captain explicitly pauses the workstream for cleanup.

Do not archive an active authority package or the only document explaining a
current approval.

## Ownership

| Area | Owner | Notes |
|---|---|---|
| Approval block template | Captain-Deputy | Used in new packages at creation time |
| `V2_Active_Slice.json` | Captain-Deputy | Projection only; not independent authority |
| Active-slice validator | Lead Developer / Agents Supervisor | Must compare against authority files |
| Canary preflight | Lead Developer | No job submission |
| Canary capture | Lead Developer | Evidence-only capture |
| Budget ledger updates | Captain-Deputy / Lead Developer | Ledger remains authoritative |
| Budget exceptions | Steer-Co or Captain | Must be explicit and recorded |
| Boundary-guard split | Lead Developer | Deferred until safe trigger |
| Monitor usage | Monitor agent | Reads active slice first, reports drift |

Steer-Co re-entry is limited to material changes: authority ambiguity, blocker
failure, scope expansion, public leak risk, budget/approval mismatch, net-new
mechanism increase, or unresolved reviewer dissent. Clean passes, local
implementation inside an approved envelope, and evidence-only capture do not
require Steer-Co.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q8 Public cutover safety: preflight/capture reduce stale-runtime,
  wrong-variant, and public-leak mistakes.
- V2-Q9 Cost/latency discipline: budget checks and exception records reduce
  accidental live-job waste.
- V2-Q10 Complexity convergence: active-slice projection and approval blocks
  reduce repeated context reconstruction and create explicit retirement pressure.

Direct user/report value:

- Indirect. This improves working conditions and live-job reliability so the
  team can focus on report-quality value instead of reconstructing authority.

Hidden-only value:

- The plan is process/tooling-only. It should not add hidden runtime proof
  layers.

Cost/latency impact:

- Expected to reduce wasted canaries and reviewer time. Tooling cost is local.

Retirement or simplification unlocked:

- Enables later reduction of duplicated handoff/status/package scanning.
- Enables a future boundary-guard split only when coverage-preserving.
- May reduce manual route-probe snippets in handoffs after capture tooling
  exists.

Scorecard risk:

- If `V2_Active_Slice.json` becomes a second authority source, it will worsen
  governance drift. The validator and authority-file split are mandatory to
  avoid that.
- If validators drift from advisory helpers into broad blockers, they will
  recreate the current barrier problem. The four transition gates are therefore
  exhaustive.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-004 hidden observability/admin routes: capture script should consume
  existing routes, not create more.
- V2-RL-013 boundary guard monolith: split remains deferred with activation
  triggers.
- V2-RL-014 V2 WIP/handoff volume: active-slice projection and later archival
  cadence support future consolidation.
- V2-RL-015 Captain Deputy / Steer-Co / reasoning-budget governance package:
  this plan tightens the operating model.
- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings: active
  projection should make temporary authority and stop conditions visible.

Status changes:

- None in this plan.

New mechanism owner:

- `V2_Active_Slice.json`: Captain-Deputy.
- Active-slice validator and canary tooling: Lead Developer / Agents Supervisor.

Removal / merge trigger:

- If active-slice projection proves reliable across two tranche/report-review
  cycles, consolidate or reduce redundant "current truth" prose in WIP/handoff
  intake docs.
- If active-slice projection drifts twice from authoritative files, stop and
  either simplify the schema or abandon the projection.

Debt accepted:

- One new projection file and up to three local tooling commands are accepted as
  temporary process/tooling debt because they replace repeated manual
  reconstruction and live-job mistakes. They must remain validators/projections,
  not approval authorities.
- If the projection causes more manual work than it removes after two cycles,
  simplify it or drop it.

## Recommended Implementation Sequence

1. Add the compact work-envelope / approval block to Captain-Deputy and package
   guidance for new gated packages only.
2. Add `Docs/AGENTS/V2_Active_Slice.schema.json` and one minimal advisory
   `Docs/AGENTS/V2_Active_Slice.json` projection for the current slice.
3. Add `npm run v2:active-slice:check` in advisory mode first.
4. Add `npm run v2:capture-canary -- <jobId>` as evidence-only automation over
   existing routes.
5. Add `npm run v2:preflight-canary` with blocker/warning/info output and gate
   mode limited to the four transition gates.
6. After one or two report-review/tranche cycles, revisit WIP/handoff pruning.
7. Split boundary guard only through a focused coverage-preserving package.

## Non-Goals

- No new approval authority.
- No retroactive rewrite of historical WIP packages.
- No blocker for unrelated docs dirt.
- No second report-quality classifier.
- No new hidden runtime route only for process convenience.
- No boundary-guard split during the active value path without a safe
  coverage-preserving package.

## Captain Decision Needed Before Implementation

Before source/tooling work starts, Captain-Deputy should confirm:

1. The durable approval block becomes the package authority format for new V2
   packages.
2. `V2_Active_Slice.json` is allowed as a validated projection, not authority.
3. The first tooling package may add schema/check/preflight/capture scripts
   without live-job authorization.

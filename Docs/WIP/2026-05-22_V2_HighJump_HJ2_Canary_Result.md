# V2 HighJump HJ-2 Canary Result

**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Status:** Stop, traceable repair target identified
**Job:** `0069f28abad14644abd3584652be933a`
**Runtime commit:** `00693155a189147d4b2a4846fb53f6ba8f596fd6`
**Input:** `Using hydrogen for cars is more efficient than using electricity`
**Pipeline variant:** `claimboundary-v2`

## Classification

`STOP_X7_HJ2_BOUNDARY_VERDICT_EXECUTION_SCHEMA_DAMAGED_REPORT_TRACEABLE`

The canary did not produce a usable internal Alpha report. It did prove that the
HJ-1 repair keeps the W8-B report-result artifact traceable when the downstream
boundary/verdict stage fails.

## Public Result

- API job status: `SUCCEEDED`.
- Public V2 result remained `_schemaVersion = 4.0.0-cb-precutover`.
- Public cutover status remained `blocked_precutover`.
- Public analysis issue remained `report_damaged`.
- Runtime commit fields matched `00693155a189147d4b2a4846fb53f6ba8f596fd6`.
- Public job payload check did not expose source/provider material.

## Hidden Chain Evidence

- W2 candidate-provider network completed.
- W2 observed `12` retained candidates, `15` total candidates, `5` provider attempts.
- W3-B Source Material completed with `6` bounded records.
- W5 bounded evidence extraction completed with `4` EvidenceItems.
- W6-C sufficiency assessment completed and returned `accepted`.
- W6-C report-stop recommendation was `caveat_report`.
- W7-A boundary verdict candidate was `boundary_verdict_candidate_ready`.
- W7-B boundary verdict execution was `boundary_verdict_execution_damaged`.
- W8-B internal Alpha report-result artifact was recorded.

## W7-B Stop

- First incomplete stage: `boundary_verdict_execution`.
- First incomplete reason: `boundary_verdict_execution_not_accepted`.
- Boundary candidate count: `0`.
- Verdict candidate count: `0`.
- W7-B attempt count: `2`.
- W7-B schema retry count: `2`.
- W7-B total tokens: `15593`.
- W7-B duration: `35424ms`.

The provider call ran, but the W7-B output did not pass the approved schema.
The current default artifact records the failure class but not the exact schema
issue list.

## Containment Check

- W8-B default route authenticated status: `200`.
- W8-B default route cache header: `no-store`.
- W8-B unauthenticated status: `401`.
- W8-B unauthenticated cache header: `no-store`.
- W8-B default projection did not return the ledger id.
- W8-B default projection did not return the run id.
- W8-B default projection did not return evidence/source text.
- Public/default compatibility result remained damaged and pre-cutover.

## Budget

The HJ-2 canary consumed `1` job from the HighJump tranche.

Remaining HighJump live-job budget: `11`.

## Next Action

Use `/debt-guard` and repair W7-B as the next narrow HighJump step. Preferred
direction: improve the existing W7-B prompt/schema contract and, if local
evidence remains insufficient, add bounded W7-B schema diagnostics to the
existing W8-B/default hidden evidence path with a removal or merge trigger.

Do not widen providers, weaken public containment, expose public report output,
or start V1 cleanup.

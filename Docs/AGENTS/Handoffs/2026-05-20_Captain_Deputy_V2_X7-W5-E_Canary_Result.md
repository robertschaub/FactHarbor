# 2026-05-20 Captain Deputy V2 X7-W5-E Canary Result

## Summary

The one authorized X7-W5-E product-route canary was run and did not pass.

Authoritative result file:
`Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_Canary_Result.md`

Classification:
`STOP_X7_W5_E_MISSING_ADMISSION_SNAPSHOT`

## Job Evidence

- Job id: `68f7dba28c9441b7ab702e5a7b2c1a17`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Submitted variant: `claimboundary-v2`
- Job status: `SUCCEEDED`
- Runtime result metadata commit:
  `51b2264d7360a1b4176cfa9faef80c0d8fb3ad0d`
- Public result: `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`
- Public shell state: `shellOnly: true`, `analyticalStagesExecuted: []`

Public containment held. No public EvidenceItems or hidden markers were observed
in the public result.

## Hidden Evidence

The first hidden-route loop used a PowerShell interpolation bug (`$r?ledgerId`),
so its `text/html` 404 observations are not authoritative. Corrected route
checks with `${r}` and an encoded ledger id showed Claim Understanding, intake,
W2 candidate-provider network, and W3 source material routes returning
`200 application/json`.

The W5 bounded-evidence-extraction route initially returned `500`. The Next
development log recorded `TypeError: Cannot read properties of undefined
(reading 'sideEffects')`, consistent with the W5 route projection assuming that
every stored W5 artifact already contains the W5-E
`boundedEvidenceItemAdmission` snapshot.

After the local fail-closed projection repair, the same canary ledger returned
`200 application/json`: W5 was accepted with `evidenceItemCount = 2`, but W5-E
admission was damaged with `missing_runtime_admission_snapshot` and
`admittedEvidenceItemCount = 0`.

Therefore W5-E admission and W4-H/W4-I/W5 parent inspection were not proven.

## Budget

The canary consumed one live job. Remaining live-job budget is `3`.

No second W5-E canary is authorized.

## V2 Scorecard Impact

Quality dimension advanced: none.

Direct user/report value: none.

Hidden-only value: W5 accepted EvidenceItems were present, public containment
held, and the route now fails closed, but W5-E EvidenceItem admission was not
recorded for this live artifact.

Cost/latency impact: one live job consumed.

Retirement or simplification unlocked: none. The W4-I route removal trigger
remains unsatisfied.

Scorecard risk: W5-E still needs a fresh committed/refreshed canary to prove
admission is recorded at runtime.

## V2 Retirement Ledger Impact

Rows touched: `V2-RL-009`, `V2-RL-012`.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: not satisfied.

Debt accepted: none.

## V2 Consolidation Gate

`npm run debt:sensors` returned `advisory_warn` on
`2026-05-20T08:19:41.666Z` for existing V2 source/test footprint, boundary guard
size, docs/handoff volume, net mechanism telemetry, and consolidation-marker
advisories.

No source mechanism was added by this result package.

## Warnings

- Do not treat job `68f7dba28c9441b7ab702e5a7b2c1a17` as W5-E value evidence.
- Do not retire or merge W4-I based on this job.
- Do not run a second W5-E canary under the same package.
- Do not proceed to report/verdict/warning/confidence behavior from this job.

## Next Action

Commit the narrow local W5 route fail-closed repair and verifiers. The repair
returns a damaged internal admission projection when an existing W5 artifact
lacks a W5-E admission snapshot, instead of throwing.

This repair should not add public behavior, parser execution,
report/verdict/warning/confidence behavior, cache/SR/storage, provider
expansion, ACS/direct URL, V1 work, or another live job.

## Learnings

A `SUCCEEDED` job with explicit `claimboundary-v2` is still insufficient
evidence for W5-E. Same-ledger hidden artifact proof remains the authority, and
shell command interpolation must be treated as part of live-evidence quality.

## Local Repair Verification

The W5 route projection was repaired locally to fail closed on missing W5-E
admission snapshots.

Verifier results:

- focused W5 route/admission/sink tests: `3` files / `13` tests passed
- boundary guard: `1` file / `87` tests passed
- `npm run validate:v2-gates` passed
- `npm -w apps/web run build` passed
- `git diff --check` passed

Debt-guard result: amend the existing W5 route/sink projection in place.
Rejected paths: new route, new hidden mechanism, synthetic W5-E pass admission,
or a second live canary. Net mechanism count unchanged.

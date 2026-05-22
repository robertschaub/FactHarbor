# V2 Current Lane Projection

**Last updated:** 2026-05-22
**Status:** advisory projection for active coordination, not a second approval source

This file mirrors the active V2 lane so agents do not need to reconstruct the
same state from chat, WIP packages, handoffs, status, backlog, and the live-job
ledger before every step. If this projection conflicts with an implementation
package, gate register, live-job ledger, or Captain instruction, the
authoritative source wins.

## Active Goal

Produce one usable hidden/internal V2 report-writer draft from the product route,
then use report-review evidence to raise quality, safety, and completeness step
by step.

## Active Package

`Docs/WIP/2026-05-22_V2_HighJump_HJ20_W5_EvidenceItem_Output_Shaping_Repair.md`

Latest committed implementation anchor:

`561f65d8 fix(v2): shape highjump w5 evidence output`

Latest provenance/status commit after the unevaluable canary:

`9b61453c docs(v2): record hj20 canary provenance miss`

## Latest Canary Result

HJ20 first canary job `8fe16cdeef7842058a8a36337a41b82e` ran on runtime
`561f65d865f037f1a81b75dd9a2514a5cd988561+082c771c` with explicit
`claimboundary-v2`. It is classified:

`UNEVALUATED_X7_HJ20_HIDDEN_ARTIFACT_CAPTURE_ROUTE_READINESS_MISS`

The job succeeded at the public runner level and produced the expected public
precutover/damaged envelope, but hidden artifact capture failed: immediate
hidden-route probes returned app-level HTML `404` responses, then the local
services stopped and the in-memory ledgers were erased. The run therefore
consumes one live job but is not analytical evidence that HJ20 passed or failed.

Canary information yield:

`new failure`

Specifically: the failure is operational provenance / route-readiness, not W5
schema evidence.

## Current Repair

HJ19 remains locally implemented, but its canary did not reach the report
writer because W5 blocked first. HJ20 is the active repair and is now
committed:

- W5 output-shaping under the richer nine-record mixed OpenAlex/Wikimedia source
  packet;
- implemented locally as an existing `V2_EVIDENCE_EXTRACTION` prompt-contract
  amendment only;
- focused prompt-contract/runtime/gate/build verifiers passed;
- a first broad `analyzer-v2` run exposed a W7C timeout/order symptom that
  passed in isolation and on full rerun, so no W7C patch was made;
- avoid retries, schema relaxation, new report path, source/provider expansion,
  public behavior, parser/cache/SR/storage, ACS/direct URL, and V1 work.

Steer-Co plus Claude Opus review consented to exactly one HJ20 evaluability
rerun only if runtime provenance is clean and hidden routes preflight to
handler-level JSON before submission. The runtime may report the latest clean
docs/status HEAD after `561f65d8`; no app source may change after the HJ20
source commit unless separately reviewed. If route readiness remains unstable,
do not spend the rerun; prepare a runtime/provenance repair package instead.

HJ19 changes already present:

- HJ19 approval provenance;
- model policy `v2.model.aggregation_narrative.hj19`;
- cache policy `v2.semantic.aggregation-narrative.hj19`;
- `maxOutputTokens = 8000`;
- topic-neutral compactness guidance in `V2_AGGREGATION_NARRATIVE`.

No new mechanism, retry path, schema relaxation, public projection, provider
expansion, parser, cache/SR/storage, ACS/direct URL, V1 work, or V1 cleanup was
added.

## Live Budget

Active HighJump continuation tranche:

- remaining after HJ19 canary: `6`;
- remaining after HJ20 unevaluable canary `8fe16cdeef7842058a8a36337a41b82e`:
  `5`;
- no second HJ19 canary is authorized;
- exactly one HJ20 evaluability rerun is authorized only after clean status,
  runtime refresh, API/Web runtime hash verification, service stability, and
  hidden-route handler-level JSON preflight.

Ledger:

`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`

## Next Action

1. Commit this provenance/current-lane sync so live execution starts clean.
2. Refresh runtime from the latest clean HEAD that contains `561f65d8`.
3. Verify API/Web runtime hash matches that clean HEAD; record that the app
   source behavior anchor remains `561f65d8`.
4. Preflight hidden routes with sentinel ledger IDs and require handler-level
   JSON plus `no-store`, not app-level HTML `404`.
5. Run exactly one HJ20 evaluability rerun only if provenance is clean and the
   same web process remains alive through artifact capture.

## Stop Conditions

Stop and reconvene Steer-Co if:

- HJ20 canary or local evidence shows the W5 stop requires schema relaxation, source
  expansion, retries, or a new mechanism rather than prompt/contract alignment;
- route/default-admin/public/log/error surfaces leak report text, source text,
  prompt text, provider payload, hidden ids, or public verdict/truth/confidence;
- runtime commit does not match the committed source under test;
- hidden artifact routes return app-level HTML `404`, services are not stable,
  or the web/API listeners disappear before submission;
- the HJ20 evaluability rerun is also unevaluable or repeats the same route
  readiness stop without useful new information;
- the next repair would require retries, schema relaxation, a parallel report
  path, source/provider expansion, public behavior, or another hidden mechanism;
- a standing Captain approval gate is reached.

Do not stop for routine implementation mechanics inside the current approved
repair/canary path.

## Coordination Rules For This Lane

- Keep HighJump operational: make the next report capability safe enough; do not
  avoid it by adding another readiness layer.
- Use Steer-Co for direction changes, material dissent, or unclear failed
  validation, not routine runtime refresh or canary mechanics.
- Use `context-extension` only if delegating complex state, crossing a phase
  boundary, or preserving expensive-to-reconstruct findings.
- Keep process improvements separate from technical steering unless they remove
  concrete friction in this active lane.

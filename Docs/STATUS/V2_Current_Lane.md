# V2 Current Lane Projection

**Last updated:** 2026-05-22
**Status:** advisory projection for active coordination, not a second approval source

This file mirrors the active V2 lane so agents do not need to reconstruct the
same state from chat, WIP packages, handoffs, status, backlog, and the live-job
ledger before every step. If this projection conflicts with an implementation
package, gate register, live-job ledger, or Captain instruction, the
authoritative source wins.

## Active Goal

Use the first HJ20 hidden/internal report-writer draft as report-quality
evidence, then raise the single most important report-quality bar shown by that
evidence before adding more plumbing.

## Active Package

`Docs/WIP/2026-05-22_V2_HighJump_HJ20_W5_EvidenceItem_Output_Shaping_Repair.md`

Latest committed implementation anchor:

`561f65d8 fix(v2): shape highjump w5 evidence output`

Latest provenance/status commit used for the successful HJ20 rerun:

`a7a73479 docs(v2): record hj20 canary provenance miss`

## Latest Canary Result

HJ20 evaluability rerun job `53f22512b9aa41b5ab23b774e2ddf10f` ran on runtime
`a7a73479d62779ad7b22868898fb50d0d09634c6` with explicit `claimboundary-v2`.
It is classified:

`PASS_X7_HJ20_W5_OUTPUT_SHAPING_INTERNAL_REPORT_WRITER_DRAFT_CREATED`

This rerun followed clean runtime/provenance preflight after the first
unevaluable HJ20 canary. It produced a hidden/internal report-writer draft while
public V2 remained precutover/damaged.

Canary information yield:

`report produced`

Important hidden evidence:

- W5 accepted `4` EvidenceItems under the HJ20 item-budget prompt repair.
- W8-B created an internal Alpha result candidate with `3` boundary candidates,
  `2` verdict candidates, and `4` cited EvidenceItem refs.
- W8-G created a `7843` byte internal Alpha draft.
- HJ19 internal report writer created an `8759` byte hidden report draft with
  `2` verdict sections and `3` boundary sections.
- Public result stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`, with public `reportMarkdown` length `0`.

Previous HJ20 canary `8fe16cdeef7842058a8a36337a41b82e` is recorded as
`UNEVALUATED_X7_HJ20_HIDDEN_ARTIFACT_CAPTURE_ROUTE_READINESS_MISS` and consumed
one budget slot, but is not W5 pass/fail evidence.

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

HJ20 is closed. No second HJ20 rerun is authorized.

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
- remaining after HJ20 evaluability rerun
  `53f22512b9aa41b5ab23b774e2ddf10f`: `4`;
- no second HJ19 or HJ20 canary is authorized.

Ledger:

`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`

## Next Action

1. Commit HJ20 rerun result documentation.
2. Start internal report-quality review over the HJ20 hidden report-writer draft.
3. Identify the concrete report defect or loosened bar to raise next.
4. Use Steer-Co only if the next fix crosses prompt/model/config/schema,
   public behavior, source/provider, or architecture boundaries, or if the
   quality defect has contested causality.

## Stop Conditions

Stop and reconvene Steer-Co if:

- report-quality review shows the next correction requires a standing Captain
  approval gate not already covered by the current HighJump authority;
- route/default-admin/public/log/error surfaces leak report text, source text,
  prompt text, provider payload, hidden ids, or public verdict/truth/confidence;
- runtime commit does not match the committed source under test;
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

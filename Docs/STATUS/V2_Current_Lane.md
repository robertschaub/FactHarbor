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

`Docs/WIP/2026-05-22_V2_HighJump_HJ19_Canary_Result.md`

Latest implementation commit:

`2cdc9ce5 fix(v2): repair highjump report writer output budget`

## Latest Canary Result

HJ19 canary job `7522df8a2f1647adb80d230efcfafe40` ran on runtime
`4e2ed0982d0eecfb8cd5e0098bca0c8342611e77` with explicit `claimboundary-v2`.
It is classified:

`STOP_X7_HJ19_PRE_REPORT_WRITER_W5_EVIDENCE_ITEMS_TOO_BIG`

The canary did not reach the report writer. It reached hidden CU, Query
Planning, W2, and W5; W5 stopped as `damaged_execution` /
`schema_validation_failed` with schema diagnostics including path
`evidenceItems`, code `too_big`.

## Current Repair

HJ19 remains locally implemented and verifier-clean, but its behavior is not
canary-validated because W5 blocked first. It amends the existing
`aggregation_narrative` report-writer path in place.

Current active repair target is now HJ20:

- W5 output-shaping under the richer nine-record mixed OpenAlex/Wikimedia source
  packet;
- keep the repair inside the existing W5 prompt/contract/output-shaping path if
  local diagnosis supports it;
- avoid retries, schema relaxation, new report path, source/provider expansion,
  public behavior, parser/cache/SR/storage, ACS/direct URL, and V1 work.

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
- no second HJ19 canary is authorized;
- any next canary must follow an HJ20 repair commit, runtime refresh, clean
  status, and route/runtime preflight.

Ledger:

`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`

## Next Action

1. Document and commit the HJ19 canary result.
2. Use Steer-Co/debt-guard to select the smallest HJ20 W5 output-shaping repair.
3. Prefer topic-neutral W5 prompt/contract alignment if local diagnosis confirms
   the model exceeded the intended bounded EvidenceItem set.
4. Run local verifiers before any next canary.

## Stop Conditions

Stop and reconvene Steer-Co if:

- HJ20 local diagnosis shows the W5 stop requires schema relaxation, source
  expansion, retries, or a new mechanism rather than prompt/contract alignment;
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

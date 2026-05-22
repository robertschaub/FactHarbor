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

`Docs/WIP/2026-05-22_V2_HighJump_HJ19_Report_Writer_Output_Budget_Repair.md`

Current implementation commit:

`2cdc9ce5 fix(v2): repair highjump report writer output budget`

## Latest Canary Result

HJ18 canary job `c75322fad1e74218b8ee51a54f2307cd` reached the hidden/internal
`aggregation_narrative` report writer and held containment, but stopped as
`STOP_X7_HJ18_INTERNAL_REPORT_WRITER_PARSE_FAILURE_CONTAINED` after exactly
`4000` output tokens and produced no report markdown.

## Current Repair

HJ19 is implemented and verifier-clean. It amends the existing
`aggregation_narrative` report-writer path in place:

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

- remaining before HJ19 canary: `7`;
- HJ19 may spend exactly one canary after clean provenance and runtime refresh;
- no second HJ19 canary is authorized without a new Steer-Co/Captain decision.

Ledger:

`Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`

## Next Action

1. Confirm clean git status.
2. Refresh runtime from the latest committed source.
3. Verify API/Web runtime commit match.
4. Preflight the internal report-writer artifact route for authentication,
   no-store, and default hash/length/provenance-only projection.
5. Submit exactly one `claimboundary-v2` canary using the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

## Stop Conditions

Stop and reconvene Steer-Co if:

- HJ19 still fails parse/schema with unclear cause;
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

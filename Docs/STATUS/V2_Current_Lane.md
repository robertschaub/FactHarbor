# V2 Current Lane Projection

**Last updated:** 2026-05-22
**Status:** advisory projection for active coordination, not a second approval source

This file mirrors the active V2 lane so agents do not need to reconstruct the
same state from chat, WIP packages, handoffs, status, backlog, and the live-job
ledger before every step. If this projection conflicts with an implementation
package, gate register, live-job ledger, or Captain instruction, the
authoritative source wins.

## Active Goal

Use the HighJump approach to get complete internal Pipeline V2 reports through
the normal manual submission path, now that V2 is the default pipeline and the
admin job UI can display V2 report markdown. Lower only report-blocking bars
that are shown by live evidence, then raise quality, safety, and completeness
from observed report defects.

## Current Implementation Anchor

Latest committed implementation anchor:

`311b4b7a docs(v2): record hj26 serper lineage stop`

This docs anchor includes implementation commit `dbdd2acc`, which keeps the
bounded Serper search-preview Source Material repair from `30d8d011` and
amends the existing W4-H extraction-input provider-lineage allowlist so mixed
OpenAlex + Serper + Wikimedia W4-G sidecars can proceed to W4-H without a false
provider mismatch. It does not add new routes, prompts, schemas,
parser/cache/SR/storage, public behavior, report/verdict/confidence behavior,
or V1 reuse.

Runtime has not yet been refreshed to this commit for the next validation job.

## Latest Result

Latest validation:

`PASS_X7_HJ27_BOLSONARO_MIXED_SOURCE_INTERNAL_REPORT_CREATED`

Result document:

`Docs/WIP/2026-05-22_V2_HighJump_HJ27_Bolsonaro_Mixed_Source_Report_Result.md`

Important evidence:

- `f84d914e9ae74259a9c58505d2da190d` ran the default manual V2 path for the
  Bolsonaro/fair-trial input on runtime/docs commit `311b4b7a`.
- W3-B Source Material completed with `9` records, `5623` aggregate bytes, and
  providers `openalex`, `serper_web_search`, and `wikimedia_core`.
- W4-H created one mixed-provider extraction input packet of `5639` bytes.
- W5 accepted `2` EvidenceItems.
- W8-B/W8-G/internal report writer completed; authenticated admin job response
  returned report markdown length `7381`.
- Public/default containment held: public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, public and
  default job/page surfaces did not expose hidden report text or hidden statuses.

## Open Generalization Gap

The Bolsonaro input now reaches complete hidden/internal report generation
through the default manual V2 route:

- `315886278aa34b4a9ba8fd91d9ac3cc0`: W3-B later fetch failure;
- `d2aaaee251cd40bb9d6dd2291d235a76`: W4-A fetch diagnostic overstrictness;
- `34e0057f557a4e3f859702dbb1a45874`: W5 no extractable evidence;
- `4d9ff1dd1292405e8796937472774e51`: W5 no extractable evidence persisted
  after topic-neutral prompt lowering.
- `d2e18575dcbe453c9cbae2281438405e`: W5 no extractable evidence persisted
  after bounded search-preview material.
- `4a5ecd46675041eb9cdc347fc8bc2c94`: W3-B had Serper/OpenAlex/Wikimedia
  material, but W4-H blocked on `provider_id_mismatch`.
- `f84d914e9ae74259a9c58505d2da190d`: W4-H passed, W5 extracted `2`
  EvidenceItems, and the internal report writer produced `7381` report bytes.

The remaining question is no longer reachability for this input; it is report
quality and cross-input generalization.

## Live Budget

The machine ledger is `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current active tranche:

- reset total: `18`;
- consumed after reset: `2`;
- remaining: `16`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Commit this current-lane, result, and live-budget sync.
2. Run a compact report-quality review over the HJ27 hidden/admin report.
3. Then spend at most a small number of jobs from the remaining budget on a
   stronger multi-input gauntlet over Captain-defined inputs, unless report
   review exposes a clear local defect that should be repaired first.
4. Prefer improvements that directly raise observed report quality or reduce
   old hidden machinery. Do not add source-acquisition machinery unless a new
   report or gauntlet result proves the source pool is the blocker again.

## Stop Conditions

Stop and reconvene Steer-Co, or escalate to Captain only if needed, when:

- runtime commit does not match the committed source under test;
- the default manual submission path unexpectedly runs V1;
- route/default-admin/public/log/error surfaces leak report text, source text,
  prompt text, provider payload, hidden ids, or public verdict/truth/confidence;
- the next repair would require retries, schema relaxation, a parallel report
  path, source/provider expansion, public behavior, V1 cleanup, parser/cache/SR
  storage, ACS/direct URL, or another hidden mechanism;
- a standing Captain approval gate is reached or team consent fails on a
  material decision.

Do not stop for routine implementation mechanics inside the current
HighJump/report-quality path.

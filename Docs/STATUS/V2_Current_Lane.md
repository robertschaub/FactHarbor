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

`2736cdd2 fix(v2): admit bounded search-preview source material`

The current committed repair is HJ36: remove the W3-B strong-anchor coverage
cliff for already-bounded Serper search-preview Source Material records.
Serper preview text was already capped, redacted from public/default surfaces,
and accepted downstream by lineage; HJ36 lets it become Source Material even
when OpenAlex/Wikimedia did not also produce a strong anchor. This is a bounded
amendment of an existing Source Material owner, not a new provider, schema,
route, retry, parser, cache/SR/storage, public behavior, or V1 work.

Runtime has not yet been refreshed to HJ36 for the next validation job.

## Latest Result

Latest validation:

`X7-HJ-35-ASYLUM-235000-DE-QUANTITATIVE-EXTRACTION-PATH-RERUN`

Result document:

Current lane and ledger entries in this repository; no separate WIP result
document was created for HJ33.

Important evidence:

- `83734c0d433849eba1a493307e25de76` (German asylum aggregate) reran on HJ32
  and produced a durable admin stop summary: Stage `Evidence Extraction`,
  Source Material records `4`, W4-G sidecars `4`, W4-H packets `1`, W4-I
  readiness `extraction_input_structurally_eligible_execution_denied`, W5
  execution `hidden_no_extractable_evidence`, EvidenceItems `0`,
  source-content packets `4`, input packet bytes `2304`.
- The durable summary narrowed the asylum-family stop: W3-B/W4-G/W4-H/W4-I
  are no longer the blocking handoff for this run. W5 receives bounded source
  content but returns no extractable evidence.
- `dca39ebca3174fd58a93160f105dfac0` (German asylum aggregate) reran on HJ33
  after the first quantitative query-intent prompt repair. It stayed on
  `claimboundary-v2` and containment held, but it regressed earlier: Source
  Material records `0`, W4-G `w3b_not_completed`, W4-H `w4g_not_positive`, W5
  `blocked_pre_execution`, source-content packets `0`.
- `7f5b3c3e45e14a3488b7d8df99cabf0a` (German asylum aggregate) reran on HJ34
  after the balanced query-discovery repair. It repeated the HJ33 regression:
  Source Material records `0`, W4-G `w3b_not_completed`, W4-H
  `w4g_not_positive`, W5 `blocked_pre_execution`, source-content packets `0`.
- `c42b423674624bb39743498174ca1bac` (German asylum aggregate) reran on HJ35
  after the query-planning revert and W5 extraction-path repair. It still had
  Source Material records `0`, W4-G `w3b_not_completed`, W4-H
  `w4g_not_positive`, W5 `blocked_pre_execution`, source-content packets `0`.
- HJ36 therefore amends the existing W3-B Source Material owner: bounded
  Serper search-preview records no longer require an OpenAlex/Wikimedia anchor
  before they can feed the hidden internal Alpha report path.
- Public/default containment held: public/default reportMarkdown stayed `null`,
  schema stayed `4.0.0-cb-precutover`, cutover stayed `blocked_precutover`, and
  issue stayed `report_damaged`.
- `95d5e671ecd64e4a8edbd9aef3f45b36` (asylum/WW2 variant) produced the same
  durable stop summary: W5 `blocked_pre_execution`, source-content packets `0`.
- `53ef9d309f7147a3b47f7f64802ee59d` (plastic recycling) stopped earlier:
  Claim Understanding blocked with `no_valid_claim`, selected AtomicClaims `0`,
  so Query Planning never ran.
- `6ce3a5827b464549b2c524d4f659ae7b` (Bolsonaro/fair-trial) ran default manual
  V2 on runtime `3f1a1b4c` and produced a hidden internal admin report
  (`5825` characters), but direct procedural-compliance/fair-trial evidence was
  still weak.
- `06e637107869409c9611b7c7984f1ff1` (hydrogen) produced a hidden internal
  admin report (`7000` characters) with FALSE / truth `15` / confidence `72`,
  inside the expected hydrogen-family band.
- `a0b131e0965e4a56afd485dc37344595` (German asylum aggregate),
  `0645495cce3d4c99bbb268bca7b1e3a2` (asylum/WW2 variant), and
  `2979fed360504100b689cbab8b265b7c` (plastic recycling) returned only the
  242-byte damaged shell. Hidden process-local artifact routes were unavailable
  after runtime refresh, so the exact stop stage was not durable.
- Public/default containment held for all HJ30 jobs: public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, public and
  default job/page surfaces did not expose hidden report text or hidden statuses.
- HJ36 now addresses the HJ33-HJ35 failed-attempt recovery: the query-planning
  hypothesis is exhausted for this claim family, and the next lowest-complexity
  path is to lower the existing W3-B strong-anchor bar for bounded search
  previews while keeping W5 quality controls responsible for semantic
  EvidenceItem selection.

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
- `327edd966a904108b8bc51f05ec64b42`: Serper distribution improved breadth and
  the internal report writer produced `10172` report bytes, but W5 admitted
  adjacent/generic material and the report remained `UNVERIFIED`.
- `323c5fd3540e43aab9c7c6e686ec4de4`: HJ29 material-alignment prompt repair
  removed adjacent/generic extraction, but W5 returned `no_extractable_evidence`
  despite 9 bounded source-content packets.
- `6ce3a5827b464549b2c524d4f659ae7b`: HJ30 material-alignment rebalance restored
  report creation, but report quality remains weak because direct
  procedural-compliance/fair-trial evidence is still thin.
- `8e198dcd90ea4eceb590af62b2ccff14` and
  `95d5e671ecd64e4a8edbd9aef3f45b36`: HJ31 shows the asylum-family inputs are
  not blocked by report writing. They reach the W5 call site but have no source
  content packets, so the next repair belongs upstream in Source Material /
  extraction-input packet construction for these inputs.
- `53ef9d309f7147a3b47f7f64802ee59d`: HJ31 shows the plastic input is blocked by
  Claim Understanding rejecting a short but verifiable broad assertion. That is
  a separate CU bar-calibration issue.

The remaining question is no longer reachability for this input; it is report
quality and cross-input generalization. A compact report-quality review found
HJ27/HJ28/HJ30 materially below the Bolsonaro expectation (`LEANING-TRUE` /
`MOSTLY-TRUE`, truth `58..85`, confidence `45..75`, minimum `3` boundaries).
The active root cause is now mixed: W5 selectivity improved enough to create a
report again, but source-material usefulness and downstream extraction still do
not consistently surface direct fair-trial/procedural-compliance evidence.

## Live Budget

The machine ledger is `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current active tranche:

- reset total: `18`;
- consumed after latest reset: `4`;
- remaining: `14`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Commit the HJ36 lane/ledger sync.
2. Refresh runtime to the committed HJ36 state and verify Web/API/proxy runtime
   commit match.
3. Run one default/manual V2 validation job for the Captain-defined German
   asylum aggregate input.
4. If HJ36 produces a hidden internal report, review report quality before
   adding more plumbing.
5. If HJ36 restores Source Material/W5 input but still reaches
   `no_extractable_evidence`, stop iterating this prompt path and use Steer-Co
   to choose a source-material/usefulness strategy from the observed packets.
6. If HJ36 still has Source Material records `0`, inspect Serper availability,
   candidate/provider telemetry, and W3-B record materialization before further
   query-planning or W5 prompt edits.
7. Treat the plastic CU stop as a separate follow-up unless the same repair
   naturally covers short broad assertions without lowering Gate 1 quality too
   far.

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

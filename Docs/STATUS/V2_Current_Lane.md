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

`0b5a5e73 fix(v2): tighten evidence extraction material alignment`

The current working repair rebalances the existing W5 evidence-extraction
prompt after HJ29: HJ29 removed the HJ28 adjacent/generic extraction defect,
but overshot into `no_extractable_evidence` despite 9 bounded source-content
packets. The repair keeps the material-alignment guard while allowing weak but
materially tied preview/abstract points to become limited/contextual/unclear
EvidenceItems instead of prematurely stopping the report path.

Runtime has not yet been refreshed to the working HJ30 repair for the next
validation job. Commit before any live job.

## Latest Result

Latest validation:

`STOP_X7_HJ29_BOLSONARO_W5_NO_EXTRACTABLE_EVIDENCE_AFTER_MATERIAL_ALIGNMENT`

Result document:

`Docs/WIP/2026-05-22_V2_HighJump_HJ29_W5_Material_Alignment_Prompt_Repair.md`

Important evidence:

- `323c5fd3540e43aab9c7c6e686ec4de4` ran the default manual V2 path for the
  Bolsonaro/fair-trial input on runtime commit `0b5a5e73`.
- Claim Understanding, Query Planning, Source Acquisition, Source Material, and
  W5 all executed under the hidden path; W5 saw 9 source content packets and
  4971 parent-packet bytes.
- W5 returned accepted `no_extractable_evidence`, so no internal report writer
  artifact was created. This confirms the HJ29 material-alignment repair
  stopped the adjacent/generic extraction defect but made W5 too strict for
  bounded preview/abstract material.
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
- `327edd966a904108b8bc51f05ec64b42`: Serper distribution improved breadth and
  the internal report writer produced `10172` report bytes, but W5 admitted
  adjacent/generic material and the report remained `UNVERIFIED`.
- `323c5fd3540e43aab9c7c6e686ec4de4`: HJ29 material-alignment prompt repair
  removed adjacent/generic extraction, but W5 returned `no_extractable_evidence`
  despite 9 bounded source-content packets.

The remaining question is no longer reachability for this input; it is report
quality and cross-input generalization. A compact report-quality review found
HJ27/HJ28 materially below the Bolsonaro expectation (`LEANING-TRUE` /
`MOSTLY-TRUE`, truth `58..85`, confidence `45..75`, minimum `3` boundaries).
The active root cause remains W5 extraction selectivity, but the bar is now
known on both sides: HJ28 was too permissive and HJ29 was too strict. HJ30 must
keep adjacent/background material out while extracting weak but materially tied
source-attributed preview/abstract points as limited/contextual/unclear
EvidenceItems when they help downstream sufficiency and report generation.

## Live Budget

The machine ledger is `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current active tranche:

- reset total: `18`;
- consumed after latest reset: `0`;
- remaining: `18`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Commit the W5 material-alignment rebalance repair plus ledger/lane sync.
2. Refresh runtime to the repair commit and verify API/Web commit match.
3. Run a stronger HighJump validation sequence from the 18-job tranche rather
   than a single weak canary: Bolsonaro first, then the German asylum and
   hydrogen controls if the first run produces a hidden internal report without
   containment issues.
4. Record information yield per job: report produced, new stage reached, new
   failure, repeated stop with new evidence, or repeated stop without useful
   information.

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

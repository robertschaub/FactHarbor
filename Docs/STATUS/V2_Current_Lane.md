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

`beb23bca fix(v2): preserve report writer boundary ids`

This commit amends only `V2_AGGREGATION_NARRATIVE` plus its focused prompt
contract test. It requires exact verdict/boundary section cardinality and exact
supplied ID preservation so the internal report writer does not damage otherwise
valid W8 drafts with `boundary_reference_mismatch`.

Runtime was verified through Web/API version endpoints at
`beb23bcafc44e156b10406833c47cd09a142686e` before the latest canary.

## Latest Result

Latest gauntlet:

`PASS_WITH_OPEN_GENERALIZATION_GAP_X7_HJ24_STRONGER_REPORT_GAUNTLET`

Result document:

`Docs/WIP/2026-05-22_V2_HighJump_HJ24_Stronger_Report_Gauntlet_Result.md`

Important evidence:

- HJ24 consumed `7` jobs from the Captain-reset `18` job tranche; remaining
  budget is `11`.
- `b943c31f416941c9b46887e5b996c901` produced a complete hidden/internal
  German asylum report draft on runtime `366dce54`: W5 extracted `1`
  EvidenceItem; report writer produced `2891` bytes with `Evidence References`
  and `2` citations.
- `0a769c00825e48e5933cb1b1286b85c1` produced a complete hidden/internal
  hydrogen report draft on runtime `beb23bca`: W5 extracted `4` EvidenceItems;
  W8 result/draft were created; report writer produced `5906` bytes with
  `Evidence References`; `boundary_reference_mismatch` was absent.
- Public/default containment held: public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, public and
  default job/page surfaces did not expose hidden report text or hidden statuses,
  and unauthenticated internal report-writer access returned `401`.

## Open Generalization Gap

The Bolsonaro input now reaches W5 after W3-B and W4-A repairs, but W5 still
returns `hidden_no_extractable_evidence`:

- `315886278aa34b4a9ba8fd91d9ac3cc0`: W3-B later fetch failure;
- `d2aaaee251cd40bb9d6dd2291d235a76`: W4-A fetch diagnostic overstrictness;
- `34e0057f557a4e3f859702dbb1a45874`: W5 no extractable evidence;
- `4d9ff1dd1292405e8796937472774e51`: W5 no extractable evidence persisted
  after topic-neutral prompt lowering.

Treat this as a source-content/usefulness and evidence-extraction
generalization problem, not as another report-writer problem.

## Live Budget

The machine ledger is `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current active tranche:

- reset total: `18`;
- consumed after reset: `7`;
- remaining: `11`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Commit the HJ24 result documentation and ledger/status updates.
2. Continue HighJump on the open non-hydrogen generalization gap.
3. Before spending another job, make a focused repair or improvement to the
   existing source-material/evidence-extraction path that plausibly improves
   source usefulness for the Bolsonaro-family stop without topic-specific
   hardcoding.
4. Then run one Captain-defined non-hydrogen validation job and classify its
   information yield.

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

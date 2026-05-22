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

`dbdd2acc fix(v2): admit serper extraction input lineage`

This commit keeps the bounded Serper search-preview Source Material repair from
`30d8d011` and amends the existing W4-H extraction-input provider-lineage
allowlist so the already-created mixed OpenAlex + Serper + Wikimedia W4-G
sidecars can proceed to W4-H without a false provider mismatch. It does not add
new routes, prompts, schemas, parser/cache/SR/storage, public behavior,
report/verdict/confidence behavior, or V1 reuse.

Runtime has not yet been refreshed to this commit for the next validation job.

## Latest Result

Latest validation:

`STOP_X7_HJ26_BOLSONARO_W4H_PROVIDER_LINEAGE_BLOCKED`

Result document:

`Docs/WIP/2026-05-22_V2_HighJump_HJ26_Bolsonaro_Serper_Source_Material_Result.md`

Important evidence:

- `4a5ecd46675041eb9cdc347fc8bc2c94` ran the default manual V2 path for the
  Bolsonaro/fair-trial input on runtime/docs commit `7f4ebcd5`.
- W3-B Source Material improved: `9` records, `5610` aggregate bytes, providers
  `openalex`, `serper_web_search`, and `wikimedia_core`.
- W4-G created `9` bounded text sidecars. W4-H then failed closed with
  `blocked_pre_extraction_input_provider_id_mismatch`, so W5 recorded
  `blocked_pre_execution` / `w4h_packet_invalid`.
- The committed repair `dbdd2acc` amends the existing W4-H provider-lineage
  allowlist and test coverage to admit `serper_web_search`.
- Public/default containment held: public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, public and
  default job/page surfaces did not expose hidden report text or hidden statuses.

## Open Generalization Gap

The Bolsonaro input now reaches W3-B and W4-G with richer source material. HJ26
showed that the next roadblock was a downstream W4-H single-provider assumption:

- `315886278aa34b4a9ba8fd91d9ac3cc0`: W3-B later fetch failure;
- `d2aaaee251cd40bb9d6dd2291d235a76`: W4-A fetch diagnostic overstrictness;
- `34e0057f557a4e3f859702dbb1a45874`: W5 no extractable evidence;
- `4d9ff1dd1292405e8796937472774e51`: W5 no extractable evidence persisted
  after topic-neutral prompt lowering.
- `d2e18575dcbe453c9cbae2281438405e`: W5 no extractable evidence persisted
  after bounded search-preview material.
- `4a5ecd46675041eb9cdc347fc8bc2c94`: W3-B had Serper/OpenAlex/Wikimedia
  material, but W4-H blocked on `provider_id_mismatch`.

The next committed repair is `dbdd2acc`; validate whether mixed-provider W4-H
unblocks W5 and the internal report writer.

## Live Budget

The machine ledger is `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current active tranche:

- reset total: `18`;
- consumed after reset: `1`;
- remaining: `17`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Commit this current-lane and live-budget sync.
2. Refresh runtime to `dbdd2acc` plus this docs sync.
3. Run one Captain-defined Bolsonaro-family validation job through the default
   manual V2 path and classify its information yield.
4. If W4-H still blocks on provider lineage, inspect the remaining provider
   contract. If W4-H passes but W5 no longer extracts evidence, pivot the next
   repair toward W5 extraction/report quality using the observed hidden evidence
   rather than adding more source-acquisition machinery.

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

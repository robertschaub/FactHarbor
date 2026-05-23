# V2 Current Lane Projection

**Last updated:** 2026-05-23
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

## Current Lane Override

This projection is synced after HJ52 live validation. Older HJ history below is
kept as context, but the active anchor and budget are:

- committed implementation anchor:
  `5f608219 fix(v2): admit short broad claim understanding inputs`;
- latest canary result:
  HJ53 focused rerun, classified
  `STOP_X7_HJ53_CLAIM_UNDERSTANDING_STILL_NO_VALID_CLAIM`;
- current live-job tranche:
  Captain reset to `18` on 2026-05-23 after HJ52/HJ53 source commit;
  HJ53 consumed one job, and `17` remain;
- next action:
  apply failed-attempt recovery for the HJ53 prompt-only Claim Understanding
  repair before spending another job: the active prompt was used, the model call
  completed, and the semantic admission decision still returned
  `no_valid_claim`; choose the next lowest-complexity Claim Understanding repair
  path before touching the separate W4-G oversized-text defect;
- stop conditions:
  stop on stale runtime/source, unexpected V1 submission, public/default leak
  of report/source/prompt/provider/hidden data or verdict/truth/confidence,
  prompt/model/config/schema work beyond the approved state, provider/parser/
  cache/SR/storage/ACS/direct-URL/V1 scope, or unclear verifier/runtime failure.

## Current Implementation Anchor

Latest committed source/docs anchor:

`7319ada8 fix(v2): preserve literal values in query planning`

Latest implementation repair:

`7319ada8 fix(v2): preserve literal values in query planning`

HJ49 amends only the existing `V2_EVIDENCE_QUERY_PLANNING` prompt section so
material claim-supplied literal values, units, dates, thresholds, or comparison
values are preserved in at least one direct-record query when needed to find
decisive evidence. It adds no source/provider/parser route, schema, public
surface, cache/SR/storage behavior, direct URL/ACS support, V1 work, or
deterministic code-side query rewriting.

## Latest Result

Latest validation:

`X7-HJ-49-ASYLUM-235000-DE-QUERY-LITERAL-VALUE-PRESERVATION-RERUN`

Result document:

`Docs/WIP/canary-evidence-910b9892ae3345a2a72ca1ca14b14990.json`

Important evidence:

- `910b9892ae3345a2a72ca1ca14b14990` (German asylum aggregate) ran on HJ49
  after importing and activating the literal-value query-planning prompt profile
  (`1bf6f9bb7d2216bcf6a72a531244e4cb5790f671ae4c197021f6bb57bbd44318`) on
  runtime `7319ada8e8beaf7bea27693611214465319ab745`. It stayed on
  `claimboundary-v2`; public/default containment held
  (`4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`,
  public/default reportMarkdown `null`) and unauthenticated hidden artifact
  access returned `401`.
- HJ49 repaired the immediate HJ48 regression. Query Planning produced `3`
  queries and preserved the material threshold in the first direct query
  (`235000 Personen Asylbereich Schweiz aktuell Bestand`). Source Material
  completed with `6` records (`3` linked-page, `3` search-preview, `0` XLSX),
  W5 extracted `1` EvidenceItem, and internal Alpha result/draft/report-writer
  artifacts were created. Authenticated admin reportMarkdown was `3504` bytes.
- HJ49's information yield is `report_produced`, but report quality remains
  below Captain expectation: the report returned `UNVERIFIED`, truth `0`,
  confidence `15`, because the extracted EvidenceItem supports annual
  application-flow material rather than current asylum-domain population stock
  or the `235000+` threshold. The next defect is source usefulness/direct-stock
  retrieval, not report reachability or verdict calibration.
- `7938b16ecfe34056869559509dc93ed6` (German asylum aggregate) ran on HJ48
  after importing and activating the calibrated V2 prompt profile
  (`df910d01a155db500ee4356d4ebe421dbf5405480fe1ee3582fdf15b9d419d7e`) on
  runtime `595c40c4d30256b54d837b8917dbaed884af6980`. It stayed on
  `claimboundary-v2`; public/default containment held
  (`4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`,
  public/default reportMarkdown `null`) and unauthenticated hidden artifact
  access returned `401`.
- HJ48 did not evaluate the calibration repair. Query Planning completed,
  Source Material completed with `5` records (`2` linked-page, `3`
  search-preview, `0` XLSX), but W5 returned
  `hidden_no_extractable_evidence` with `0` EvidenceItems. Internal Alpha
  result, draft, and report-writer artifacts were not created; authenticated
  admin reportMarkdown was only a `1210` character internal Alpha stop summary.
- HJ48's information yield is `new_failure`. The live evidence points to a
  W5/source-selection regression relative to HJ47, not to a verdict-calibration
  pass/fail. Failed-attempt recovery applies before another live job: keep the
  generic calibration wording only if still justified, and repair the loss of
  extractable direct current-stock evidence without adding broad crawler,
  provider, public, or parallel report machinery.
- `b6498cbb050641ff91f5bdcd5886590c` (German asylum aggregate) ran on HJ47
  after bounded one-hop same-host Source Material locator expansion. It stayed
  on `claimboundary-v2`; public/default containment held
  (`4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`,
  public/default reportMarkdown `null`) and unauthenticated hidden artifact
  access returned `401`. Authenticated admin reportMarkdown was `6163`
  characters. Hidden artifacts showed Source Material completed with `5`
  records (`2` linked-page, `3` search-preview), W5 extracted `2`
  EvidenceItems, the internal report writer created `2` verdict sections and
  `2` boundary sections, and the alpha result's first incomplete stage was
  `none`.
- HJ47's information yield is `report_produced`. It is a meaningful progress
  step: unlike HJ44-HJ46, the internal report now has direct current-stock
  evidence plus SEM authority context. However, the specific XLSX locator path
  was not exercised: Source Material still had `0`
  `provider_search_result_xlsx_text_bounded` records and `0`
  `ep_serper_linked_xlsx_fetch` records. The next useful move is therefore
  report-quality review against Captain expectations and comparator evidence
  before adding more locator/crawler machinery.
- `4208458670644489a07db2536d7c7332` (German asylum aggregate) ran on HJ46
  after the source-native downloadable-record query prompt repair. It stayed on
  `claimboundary-v2`, public/default containment held, and authenticated admin
  reportMarkdown was a `1210` character internal Alpha stop summary. Query
  Planning returned two queries and neither had clear downloadable/file-format
  intent. Source Material had `6` records: four Serper previews and two bounded
  linked pages, with `0` `provider_search_result_xlsx_text_bounded` records.
  W5 received six source-content packets and returned
  `hidden_no_extractable_evidence`.
- HJ46's information yield is `new_failure`. It disproves another prompt-only
  nudge as the next best move for this claim family. The next step should be
  Steer-Co-guided and stronger: likely bounded source-material locator
  expansion from already fetched official/statistics landing pages to same-host
  downloadable/archive/detail pages, unless Steer-Co finds a lower-complexity
  route.
- `5f739284a34646b18664cef0f28a65a2` (German asylum aggregate) ran on HJ45
  after bounded XLSX attachment Source Material support. It stayed on
  `claimboundary-v2`, public/default containment held, and authenticated admin
  reportMarkdown was `7848` characters. W5 completed and extracted `4`
  EvidenceItems, but Source Material had `0`
  `provider_search_result_xlsx_text_bounded` records and `0`
  `ep_serper_linked_xlsx_fetch` records. The report still says direct
  population figures were not disclosed in supplied evidence items.
- HJ45's information yield is
  `report_produced_same_defect_with_new_evidence`: the XLSX materializer is
  implemented and verifier-clean, but the live query/source-material path did
  not reach a spreadsheet attachment. The next useful bar is query/source
  selection or locator materialization for source-native official downloadable
  records, not another downstream report layer.
- `cb3b78c16fef4a43bc88e330695c906a` (German asylum aggregate) ran on HJ44
  after the source-native preview/context repair. It stayed on
  `claimboundary-v2`, public/default containment held, and authenticated admin
  reportMarkdown was `4256` characters. The report was complete but still
  `UNVERIFIED` because it cited contextual Swiss population, annual asylum
  applications, and EU/EFTA resident material only. It still did not surface
  direct current-stock/population evidence for the claimed `235,000+`
  asylum-domain population.
- HJ44's information yield is therefore `report_produced`, with the same
  direct-stock source-quality defect repeated. Another search-preview/cap tweak
  is now low-yield; the next repair should target a bounded official
  record/document/spreadsheet source-material strategy.
- `e0907032ccaf4dab8b5001d6fb3db502` (German asylum aggregate) ran on HJ36
  and restored the hidden chain beyond W3-B: Source Material records `2`,
  W4-G sidecars `2`, W4-H packets `1`, W4-I readiness
  `extraction_input_structurally_eligible_execution_denied`, and W5 execution
  `hidden_no_extractable_evidence`.
- HJ36's Source Material was too thin: hidden artifacts showed two Serper
  search-preview records and only `390` input-packet bytes. W5 received source
  content and made a successful model call, but no EvidenceItems were extracted.
- HJ37 therefore repairs source depth at the existing Serper Source Material
  seam by adding bounded linked-page text materialization under the existing
  hidden/admin-only chain. It does not loosen W5, add another provider, run a
  parser, expose public text, or create report/verdict/confidence behavior.
- `ecaab696d18b4f5b8de78f664147543d` (German asylum aggregate) ran on HJ37 and
  stayed on `claimboundary-v2`; public/default containment held. It produced
  Source Material records `2`, then blocked before W4-G sidecars because W4-C
  still rejected `accepted_text` material. Durable admin summary: W4-G
  `blocked_pre_bounded_corpus_text_w4c_not_positive`, W4-G stop
  `w4c_not_completed`, W4-H/W4-I/W5 blocked, source-content packets `0`.
- HJ37B is therefore an in-place downstream compatibility repair for the new
  Source Material content type, not another source/provider or W5 prompt
  lowering.
- `d06d475e9e6e455dac8de6d3066924d7` (German asylum aggregate) ran on HJ37B
  and stayed on `claimboundary-v2`; public/default containment held. It
  produced Source Material records `1`, then W4-G blocked with
  `source_material_text_oversized` because the bounded linked-page Source
  Material carried `truncationApplied=true` at the 4096-byte cap. W4-H/W4-I/W5
  remained blocked and source-content packets stayed `0`.
- HJ37C is therefore an in-place cap/provenance repair: allow already-bounded
  truncated source text through downstream handoff while preserving the same
  byte limits and hash checks.
- `75a8aaf414d94d3ea8f32555ed9712a6` (German asylum aggregate) ran on HJ37C
  and stayed on `claimboundary-v2`; public/default containment held. It reached
  W5 with Source Material records `1`, W4-G sidecars `1`, W4-H packets `1`,
  W4-I readiness `extraction_input_structurally_eligible_execution_denied`,
  source-content packets `1`, and input packet bytes `4096`, then W5 returned
  `hidden_no_extractable_evidence`. HJ38 therefore amends the existing Serper
  linked-page collector aggregate cap so the next run can provide up to three
  bounded linked-page records to W5 before changing W5 prompt/selectivity.
- `1d07cbaa4b9247e1b5e054e48dece2dc` (German asylum aggregate) ran on HJ38
  and stayed on `claimboundary-v2`; public/default containment held. The
  authenticated admin reportMarkdown was `3561` characters and produced a
  complete internal alpha review with verdict `UNVERIFIED`, truth `0`, and
  confidence `0`. The concrete observed quality defect is source usefulness:
  the report relied on a 2024 asylum-application flow item (`27,740` new
  applications) and explicitly could not verify the claimed current stock of
  `235,000+` persons. The next lane is report-quality review and targeted
  retrieval/source-material improvement toward direct stock evidence, not more
  reachability plumbing.
- `387c164a9e804d9882d3edcdeee4ebcd` (German asylum aggregate) ran on HJ39
  after bounded Serper per-query fan-in. It stayed on `claimboundary-v2` and
  public/default containment held, but regressed before Source Material:
  Source Material records `0`, W4-G `w3b_not_completed`, W4-H
  `w4g_not_positive`, W5 `blocked_pre_execution`, source-content packets `0`.
  HJ40 therefore amends query-planning measurement-frame intent generically,
  rather than adding another source-depth mechanism.
- `d611f81371c74a25b2c415a124336594` (German asylum aggregate) ran on HJ40
  after the measurement-frame query-intent repair. It stayed on
  `claimboundary-v2`, public/default containment held, and authenticated admin
  reportMarkdown was `3591` characters. The report still remained poor for the
  claim: it cited one OpenAlex gender-composition item (`40% female`) and did
  not surface direct current-stock/population evidence. HJ41 therefore amends
  W3-B Source Material ordering so OpenAlex abstracts cannot structurally
  dominate the first source records when Serper/Wikimedia material exists.
- `347dc6acb71841f0b43a1fc1653d61e4` (German asylum aggregate) ran on HJ41
  after structural Source Material provider-order balancing. It stayed on
  `claimboundary-v2`, public/default containment held, and authenticated admin
  reportMarkdown was `3838` characters. The report quality improved only
  partially: it now cited June 2025 asylum inflow evidence (`2,213` new
  applications) and correctly identified the measurement-frame mismatch, but it
  still did not find direct current-stock/population evidence for the
  `235,000+` asylum-domain population claim. The next lane is therefore a
  focused acquisition/source-selection quality repair, not another report-path
  reachability repair.
- `abeb207970b2415fbbe0a385bf47e58e` (German asylum aggregate) ran on HJ42
  after stronger bounded Serper recall. It stayed on `claimboundary-v2` and
  public/default containment held, but regressed to a stop summary instead of a
  report. The candidate provider network returned zero candidates for two
  attempted queries and timed out on the third, so it was marked
  `candidate_provider_network_damaged_structural` with
  `candidate_runtime_query_coverage_invalid`. W3-B then blocked before Source
  Material (`candidate_provider_network_not_completed`), leaving Source
  Material records `0` and W5 `blocked_pre_execution`. The next repair should
  address the existing W3-B dependency on Wikimedia candidate-network
  completion when bounded Serper-provided Source Material is available.
- `0ef18bfa476048cfa63aa2a147a7341e` (German asylum aggregate) ran on HJ43
  after the Serper carry repair. It stayed on `claimboundary-v2`,
  public/default containment held, and authenticated admin reportMarkdown was
  `4748` characters. Hidden artifacts showed Source Material records `8`,
  W5 `hidden_evidence_item_extraction_completed`, and EvidenceItems `2`. The
  report remains `UNVERIFIED` because the extracted material is still indirect:
  historical cumulative asylum-domain inflow over 2011-2024 and total Swiss
  population context, not direct current-stock/population evidence for the
  `235,000+` asylum-domain claim.

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
- consumed after latest reset: `3`;
- remaining: `15`;
- latest reset starts after HJ46 job `4208458670644489a07db2536d7c7332`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Target the observed HJ49 report-quality defect: Source Material and W5 are
   live again, but the selected/extracted evidence is annual application-flow
   material rather than current stock/threshold evidence. The next repair should
   improve direct-stock source material selection/materialization before another
   verdict-calibration job.
2. Prefer amending the existing source-selection/source-material mechanism over
   adding a new provider, crawler, parser, or public/report path. Use live
   evidence from HJ47/HJ49 to preserve the direct current-stock route while
   filtering or deprioritizing flow-only material only through LLM/prompt-owned
   intent, not deterministic semantic code.
3. Keep the next HighJump step scoped to this one defect. Do not add provider
   expansion, recursive crawling, public exposure, cache/SR/storage, direct
   URL/ACS, V1 work, or another hidden mechanism unless the source-usefulness
   evidence proves that specific gap is blocking quality.

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

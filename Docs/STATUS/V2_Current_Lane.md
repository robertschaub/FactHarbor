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

This projection is synced while HJ77 is the active repair after HJ76 Wave 1
produced a cross-family report-quality stop under the fresh
Captain-approved 12-job tranche. Older HJ history below is kept as context, but
the active anchor and budget are:

- committed implementation anchor:
  HJ76 result closeout at `3f5c5fb1`; HJ77 prompt repair commit pending;
- active repair package:
  `Docs/WIP/2026-05-23_V2_HighJump_HJ77_Target_Frame_Directness_Prompt_Repair.md`;
- latest canary result:
  HJ76 Wave 1 jobs `8bcbb1f4ffdf4924b4d75e87c3543916`,
  `f6c391bb682345d4afba808f99e58958`,
  `999e99260839451c9274b9f3194bd58b`, and
  `629e9b2c5df542c1be7a3a4cb45760bc`, classified
  `STOP_X7_HJ76_WAVE1_REPORT_QUALITY_GAUNTLET_TWO_WRONG_DIRECTION_TWO_UNVERIFIED`;
- current live-job tranche:
  Captain reset to `12` on 2026-05-23 after HJ75;
  HJ76 Wave 1 consumed `4`; `8` remain;
- next action:
  finish HJ77 prompt-only W5/W7 target-frame/directness repair, run local
  verifiers, commit, refresh runtime to the HJ77 commit, then submit exactly one
  four-job HJ77 wave using the HJ76 Wave 1 inputs if provenance is clean.
  Priority is the confident wrong-direction reports for hydrogen and plastic;
  Bolsonaro/asylum-WWII remain a likely follow-up source-yield owner if HJ77
  improves direction but still lacks direct source material;
- stop conditions:
  stop on stale runtime/source, missing provenance, unexpected V1 submission,
  public/default leak
  of report/source/prompt/provider/hidden data or verdict/truth/confidence,
  prompt/model/config/schema work beyond the approved state, provider/parser/
  cache/SR/storage/ACS/direct-URL/V1 scope, or unclear verifier/runtime failure.

## Current Implementation Anchor

Latest source/docs anchor:

`522beebb feat(v2): prioritize source-native source material`

Latest implementation repair:

HJ75 is the current implementation repair after HJ74. It amends the existing
Source Material selector so bounded Serper XLSX records are eligible and
already-materialized source-native Serper records are selected before
preview-only fallback records while preserving provider-attempt balancing,
dedupe, byte caps, record caps, no public surface, no provider/cap/retry
expansion, and no prompt/model/config/schema change.

First HJ75 submission `bdde6d4ad58544bcbf07576c7cf89968` is not HJ75 source
evidence. It failed before analyzer execution when the API-to-Web
`/api/internal/run-job` trigger returned `401` due local Web runtime auth setup.
The persisted job has `gitCommitHash` / `createdGitCommitHash` at `522beebb`,
but no `executedWebGitCommitHash`, prompt hash, result JSON, report markdown,
or source-chain attribution. Runtime auth was corrected by restart hygiene:
the internal runner route now accepts the configured key and returns
`400 Missing jobId`, while admin auth returns `200`. Steer-Co consented to one
replacement HJ75 canary after the invalid-attempt documentation commit and
fresh health/auth/provenance preflight.

Replacement HJ75 canary `ad76c64ca5eb46c7904043975e0c483c` ran after docs
commit/runtime refresh and passed. It stayed on `claimboundary-v2`, finished
`SUCCEEDED`, and stamped `gitCommitHash`, `createdGitCommitHash`, and
`executedWebGitCommitHash` as `395d0cb3`. Public/default containment held. HJ73
admin source-chain attribution showed Source Material completed with `7`
records / `14332` bounded text bytes (`3` linked-page text, `1` OpenAlex
abstract, `3` preview-only), W5 extracted `2` EvidenceItems, and the internal
report writer created a `4268` byte draft. The observed internal report top
line is `MOSTLY-TRUE`, truth `78`, confidence `72`, improving the current
asylum input from HJ74 `UNVERIFIED`. No second HJ75 canary is authorized.

HJ76 Wave 1 is complete and stopped by package criteria. It ran hydrogen,
plastic, Bolsonaro EN, and asylum-WWII on runtime
`f49866b403a1a3e06400bdfe9e5a53b739e143b2`. All four jobs stayed on
`claimboundary-v2`, reached `SUCCEEDED`, and public/default containment held.
The information yield is `new_failure_with_cross_family_quality_signal`:
hydrogen and plastic produced confident wrong-side internal drafts versus
accepted expectations, while Bolsonaro EN and asylum-WWII produced
UNVERIFIED/MIXED or UNVERIFIED drafts where expectations require usable
true-side/false-side reports. HJ76 Wave 2 is held. Next owner is HJ77 no-live
target-frame/directness owner classification and repair planning, not another
blind source-material or report-writer tweak.

HJ73 is complete and committed as a no-live coordination package. It follows HJ72's repeated
`same_stop_repeated_without_useful_new_information` result and the repeated
process-local hidden artifact route `404`. Steer-Co consensus is to amend the
existing V2 admin result-envelope diagnostics with a redacted source-chain
attribution snapshot before another source strategy or live canary. HJ73 added
durable `adminDiagnostics.sourceChainAttribution` to the existing raw/admin
result envelope and the blocked public projection omits the attribution. It did
not add a hidden route family, new storage infrastructure, provider/cap/retry
change, parser/cache/SR/storage work, prompt/model/config/schema edit, public
projection, ACS/direct URL, or V1 work.

HJ71 amended the existing `V2_EVIDENCE_QUERY_PLANNING` prompt contract and
produced a complete internal Alpha report with one new partial direct
protection-status stock snapshot, but it still lacked the decisive current
aggregate asylum-domain stock metric. HJ72 no-live attribution found a concrete
existing-mechanism gap in the Source Material owner: Serper-provided records
kept HJ50 provider-attempt balancing only when their `candidatePreviewId` was
present in the capped preview map. HJ72 now preserves that balancing by using
the structural `SOURCE_CANDIDATE_PREVIEW_<attempt>_<rank>` id as a fallback
only when the preview map lacks the record. This changes no prompt/model/config,
provider, cap, retry, parser, cache/SR/storage, public surface, W5/W6/W7/W8, or
V1 behavior.

Focused owner tests, Serper preview tests, boundary guard, build, debt sensors,
index, and diff checks passed before the HJ72 implementation commit. The final
live job has now been spent on the HJ72 canary and the active tranche is
exhausted.

## Latest Result

Latest validation:

`X7-HJ-76-STAGED-REPORT-QUALITY-GAUNTLET-WAVE1`

Result document:

`Docs/WIP/canary-evidence-hj76-staged-report-quality-gauntlet.json`

Important evidence:

- HJ76 Wave 1 ran four Captain-defined inputs on runtime/docs commit
  `f49866b403a1a3e06400bdfe9e5a53b739e143b2`: hydrogen job
  `8bcbb1f4ffdf4924b4d75e87c3543916`, plastic job
  `f6c391bb682345d4afba808f99e58958`, Bolsonaro EN job
  `999e99260839451c9274b9f3194bd58b`, and asylum-WWII job
  `629e9b2c5df542c1be7a3a4cb45760bc`. All stayed on `claimboundary-v2`,
  reached `SUCCEEDED`, and public/default containment held: public result keys
  stayed limited to `_schemaVersion`, `input`, `meta`, and `warnings`, with no
  public report markdown, verdict label, truth percentage, confidence, or
  `adminDiagnostics`.

- Result classification:
  `STOP_X7_HJ76_WAVE1_REPORT_QUALITY_GAUNTLET_TWO_WRONG_DIRECTION_TWO_UNVERIFIED`.
  Hydrogen and plastic produced confident wrong-side internal report drafts
  relative to accepted expectations. Bolsonaro EN produced `UNVERIFIED` /
  `MIXED` drafts despite true-side comparator expectations. Asylum-WWII
  produced two `UNVERIFIED` drafts despite needing a false-side assessment for
  the WWII endpoint-stock comparison. Process-local hidden artifact routes
  returned `404`, so classification uses persisted admin result JSON,
  source-chain attribution, and report markdown.

- Steer-Co/reviewer consensus after Wave 1: do not spend Wave 2 yet. The next
  move should classify owner with no more live jobs, then prepare HJ77 around
  target-frame/directness. Priority mode A is wrong-direction confidence
  (hydrogen/plastic); mode B is evidence-yield collapse
  (Bolsonaro/asylum-WWII). Do not add family-specific terms, deterministic
  semantic filters, new hidden routes, citation quotas, broad Source
  Acquisition rewrites, public behavior, provider expansion, parser/cache/SR
  storage, ACS/direct URL, or V1 work as part of HJ77.

- HJ75 first submission job `bdde6d4ad58544bcbf07576c7cf89968` used the
  Captain-defined `asylum-235000-de` input and explicit `claimboundary-v2` on
  implementation commit `522beebb`. The API accepted the job and stamped
  `gitCommitHash` / `createdGitCommitHash`, then failed the trigger before
  Web analyzer execution because `/api/internal/run-job` returned `401`. The
  job has no `executedWebGitCommitHash`, prompt hash, result JSON, report
  markdown, or source-chain attribution. It is budget-consuming but
  analytically invalid. Runtime auth is now repaired by restart hygiene and
  preflighted; the replacement canary has now passed and no second HJ75 canary
  is authorized.

- HJ75 replacement canary job `ad76c64ca5eb46c7904043975e0c483c` ran on
  runtime/docs commit `395d0cb3e5b2e7efe5088f41ab0a863476230a5b`, stayed on
  `claimboundary-v2`, finished `SUCCEEDED`, and preserved public/default
  containment: no public report markdown, verdict label, truth percentage,
  confidence, or `adminDiagnostics`; public schema stayed
  `4.0.0-cb-precutover` and cutover stayed `blocked_precutover`. Admin
  source-chain attribution showed Source Material completed with `7` records,
  `14332` bounded text bytes, `3` linked-page text records, `1` OpenAlex
  abstract, and `3` preview-only records. W5 extracted `2` EvidenceItems and
  the internal report writer created a `4268` byte draft. The internal report
  top line is `MOSTLY-TRUE`, truth `78`, confidence `72`; information yield is
  `report_quality_improved`. No second HJ75 canary is authorized.

- HJ74 ran one focused `asylum-235000-de` rerun on runtime/source commit
  `7f24b11905bf9e945934ee634fd5aa7d0c6f7520`, a docs-only successor containing
  HJ73 source commit `9267685f`. Job `b5dc2c0d4f3e47a6aa2bd82ff3c617e5` stayed
  on `claimboundary-v2`, finished `SUCCEEDED`, and preserved public/default
  containment: public report markdown, public verdict label, public truth
  percentage, public confidence, and public `adminDiagnostics` remained absent.
  Admin raw output included HJ73 `sourceChainAttribution`: Query Planning
  accepted `4` entries, candidate provider network completed, Source Material
  produced `7` records with `5753` bounded text bytes, W5 extracted `4`
  EvidenceItems, and the internal report writer created a draft. The report
  stayed `UNVERIFIED` because the evidence still lacked a comprehensive current
  asylum-domain stock count for the `235000` threshold. Information yield is
  `new_stage_attribution_captured_with_quality_gap`. The next owner is upstream
  source acquisition/materialization strategy, not W5 execution or report
  writing.

- HJ72 ran one focused `asylum-235000-de` rerun on runtime/source commit
  `30e70b6d721b53d513e24a52322c7be59db39186` after clean provenance and Web/API
  runtime commit verification. Job `e2730cb5795e441cbf10831edd18047c` stayed on
  `claimboundary-v2`, finished `SUCCEEDED`, and preserved public/default
  containment: public report markdown, public verdict label, public truth
  percentage, and public confidence remained absent; public schema stayed
  `4.0.0-cb-precutover`; public cutover stayed `blocked_precutover`; an
  unauthenticated hidden-route probe returned `401`. The admin-only internal
  report was produced (`6129` characters) but stayed `UNVERIFIED`, citing SEM
  current-statistics authority context and 2024 application-flow context without
  the decisive comprehensive current asylum-domain aggregate for the `235000`
  threshold. Authenticated process-local hidden artifact routes again returned
  `404`, so closeout uses persisted admin job metadata/report markdown, event
  history, and public containment checks. Information yield is
  `same_stop_repeated_without_useful_new_information`. The active live-job
  tranche is now exhausted.

- HJ71 ran one focused `asylum-235000-de` rerun on runtime/source commit
  `8fe4c3c9092fcc058b69bc060998f1563b45cea2` after importing and activating
  `claimboundary-v2` prompt label/hash
  `hj71-query-current-stock-direct-record` /
  `c45621b27f3fb09a4716cc1e09ca7ddcdf1a9b6c1fd6748984a0010766e1903a`.
  Job `8e33c2e4dbd748648b947b71dd45503e` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. The internal
  report remained complete at approximately `7889` markdown bytes and now
  included one partial direct protection-status stock snapshot. It still lacked
  the decisive comprehensive current asylum-domain stock aggregate needed for
  the `235000` threshold, so the report remained `UNVERIFIED` with truth
  candidates `50` / `45` and confidence `35` / `25`. Authenticated
  process-local hidden artifact routes returned `404`, so persisted admin job
  metadata/report markdown and public containment checks are the closeout
  evidence. Information yield is
  `report_produced_with_new_partial_direct_stock_evidence`.

- HJ70 ran one focused `asylum-235000-de` rerun on runtime/source commit
  `b800c8bc1609f6e7075ef497cfba342fa1444b31` with active
  `claimboundary-v2` prompt label/hash `hj70-w5-output-contract` /
  `8285ad6101d7c57dc162b0e043a3ed7db4a59571fcc4ff6e43f2c6abe336ea9f`.
  Job `5bce26affa5146d8bce4f65e13a2e9c9` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. W4-H produced
  a `12680` byte extraction-input packet; W4-I was structurally eligible. W5
  completed as `hidden_evidence_item_extraction_completed` with accepted
  `evidence_extracted`, `3` EvidenceItems, and `schemaDiagnostics = null`.
  W8 internal Alpha `firstIncompleteStage` was `none`; the internal report
  writer created a `4731` byte draft. The report remains `UNVERIFIED` because
  supplied source material did not include the actual current stock count needed
  for the `235000` threshold. Information yield is
  `report_produced_with_quality_gap`.

- HJ69 ran one focused `asylum-235000-de` rerun on runtime/source commit
  `f4f6e1034a1d1618bc1ba29ba38947f4ffb8305b` with active
  `claimboundary-v2` prompt hash
  `7765cd746fd5db645748f51f31b211f995eeedfbd4347b3ccd3ae8546f9c9610`.
  Job `9b37bbdf944d478b8bfc20193725c969` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. W3 Source
  Material completed with `6` Serper records. W4-H produced one `8898` byte
  extraction-input packet with `8762` code points and provider
  `serper_web_search`. W4-I no longer reported the HJ68 oversized readiness
  stop; parent W4-I status was
  `extraction_input_structurally_eligible_execution_denied`. W5 executed and
  failed closed as `damaged_execution` / `schema_validation_failed` with
  `0` EvidenceItems, schema issue count `8`, including `evidenceItems`
  `too_big`, invalid provenance rationale type, unrecognized provenance keys,
  and invalid `status` / `extractionStatus` literals. Information yield is
  `new_failure`.
- HJ68 ran three focused Captain-defined inputs sequentially on execution
  anchor `bc88d64aea6f872cd90a33604c2ed970ad7932e8` with active
  `claimboundary-v2` prompt hash
  `7765cd746fd5db645748f51f31b211f995eeedfbd4347b3ccd3ae8546f9c9610`.
  `asylum-wwii-de` job `250092b5d6c74a4ca4c80c0c6a2f6979` produced `2`
  EvidenceItems and a `6489` byte internal report writer draft. `bolsonaro-pt`
  job `b97f69f1e3f944878c22d96618d1936b` produced `4` EvidenceItems and a
  `7888` byte internal report writer draft. `asylum-235000-de` job
  `7dc49f6bfbde4a58a8445edfa8a0849f` produced `6` source-material records and
  reached W5 with `6` source-content packets / `13915` parent-packet bytes, but
  W5 blocked pre-execution because W4-I returned
  `blocked_pre_execution_readiness_packet_text_oversized`. All three jobs
  stayed on `claimboundary-v2`, finished `SUCCEEDED`, and preserved public/
  default containment.
- HJ67 ran eight Captain-defined inputs sequentially on execution anchor
  `a64db2942167ca4abb7bf1f1e6c0e79ca3b2fcdd` with active `claimboundary-v2`
  prompt hash `18182d27945de17dd62b3c89d0e816d09b1b25cb7ee6c3ffb065aef937574786`.
  All eight stayed on `claimboundary-v2`, finished `SUCCEEDED`, and preserved
  public/default containment. Six hidden/admin internal reports were produced:
  `bundesrat-rechtskraftig` (`52178147ec5f4f7389406483f9b257ab`),
  `bundesrat-simple` (`0aaa6c9820f6407993d5a24781a5eba8`),
  `asylum-235000-de` (`b78e1cd21e9644dea270f892ef0ec0b5`),
  `bolsonaro-en` (`a042983968e34371b568e065c70e1efa`), `hydrogen-en`
  (`df118e4b8fd64635bd3ed185c9c976c8`), and `plastic-en`
  (`e92c8ac6215049e687887edc6003700d`). `asylum-wwii-de`
  (`e4858e2fb9c343ab9fbaae5dd156d23d`) and `bolsonaro-pt`
  (`e9aacccdcc5947edaa2d7f08685b7952`) reached W5 but returned
  `hidden_no_extractable_evidence`.
- HJ66 ran one focused plastic canary on runtime/source commit
  `4dbafbba96c889f844d5b03ef1f5ca5863c4d63d` after importing and activating
  `claimboundary-v2` prompt hash
  `18182d27945de17dd62b3c89d0e816d09b1b25cb7ee6c3ffb065aef937574786`.
  Job `152538f779274a8db48b43bfbf963898` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. W7-B
  accepted without caveats/material-uncertainty schema damage; W8-B recorded
  `firstIncompleteStage = none`; W8 internal report writer returned
  `internal_report_writer_draft_created`, accepted aggregation narrative
  output, `6705` report bytes, `1` verdict section, `3` boundary sections, and
  `4` cited EvidenceItem refs. The top-line report verdict was `MIXED`, truth
  `50`, confidence `72`, answering the selected claim and clearing the HJ64/HJ65
  plastic orientation/schema repair path.
- HJ65 ran one focused plastic canary on runtime/source commit
  `4891d73f8ebf2ba8084975970dac9e58b8294739` after importing and activating
  `claimboundary-v2` prompt hash
  `1d590cb6b328678c180b3b7a1f68d79ee3b140002ff14cf4b048e3efd46ca840`.
  Job `c5b93bf07d084a95b5d1bce6ddb03979` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. The hidden
  chain reached W5 with `4` EvidenceItems and W6-C accepted sufficiency, then
  W7-B returned `boundary_verdict_execution_damaged` with schema diagnostics:
  `verdictSetCandidate.verdictCandidates.0.caveats` and
  `verdictSetCandidate.verdictCandidates.1.caveats` had `invalid_type`.
  Information yield is `new_failure_with_actionable_schema_diagnostics`.
  Failed-attempt recovery keeps the HJ65 selected-claim polarity wording and
  treats HJ66 as an in-place W7-B output-contract repair for array fields.
- HJ64 ran one focused plastic canary on runtime/source commit
  `95312f5e0970f8879e296bbae8bf98aab9ec9489` after importing and activating
  `claimboundary-v2` prompt hash
  `98c3e5c6673ea35f47cf0cd136e7c5638ac34b8f3c0becee435e334f3a1b3a65`.
  Job `8b5e82cea1bd4e70b32ee06e9937900c` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. The hidden
  W8 internal report writer returned `internal_report_writer_draft_created`,
  accepted aggregation narrative output, `6483` report bytes, `2` verdict
  sections, `2` boundary sections, and `4` cited EvidenceItem refs. W7-B
  numeric label/truth coupling is repaired for this canary (`MOSTLY-TRUE`
  truth `78`, `UNVERIFIED` truth `50`), but the report remains
  quality-unacceptable because it orients the top-line verdict around the
  counterclaim that recycling has measurable purpose instead of the selected
  claim that recycling is pointless. Next owner: W7-B selected-claim
  polarity/orientation.
- HJ63 ran one focused plastic canary on runtime/source commit
  `f2e4e55a52e0c299fe85eea3f5a34f858b1856eb` after importing and activating
  `claimboundary-v2` prompt hash
  `33edfa61f2f8f904242f3c2be6b0674023d880c863192dd5afdf0a172ae1f0f8`.
  Job `d866675bcabf468aa4450b83ee7d87af` stayed on `claimboundary-v2`,
  finished `SUCCEEDED`, and preserved public/default containment. The hidden
  W8 internal report writer returned `internal_report_writer_draft_created`,
  accepted `v2.aggregation_narrative.0`, created `7907` report bytes, `2`
  verdict sections, `2` boundary sections, and `4` cited EvidenceItem refs.
  This repairs the HJ62 W8 damaged stop. The report is not quality-acceptable:
  W8 copied W7-B values with label/truth mismatch (`MOSTLY-TRUE` truth `28`;
  `LEANING-TRUE` truth `38`). The next owner is W7-B label/truth contract
  enforcement and candidate calibration.
- HJ62 ran three targeted canaries on runtime/source commit
  `053eae51522b8dd5ba9abe1da3c92aca35df1a19` after importing and activating
  `claimboundary-v2` prompt hash
  `c92c84935af7e789850574157aca8eadb6aebbfad65f5c5356cad8ddfaf78194`.
  All three jobs stayed on `claimboundary-v2`, finished `SUCCEEDED`, and
  preserved public/default containment (`4.0.0-cb-precutover`,
  `blocked_precutover`, no public/default report markdown, no public/default
  verdict/truth/confidence, unauthenticated hidden report-writer route `401`).
  `hydrogen-en` (`fe125887384b47838104bad693dfd329`) produced one internal
  Alpha verdict, `MOSTLY-FALSE` truth `18` confidence `78`, so the HJ61
  false-label/high-truth polarity blocker is repaired. `plastic-en`
  (`19ca87dab27a4446b5dd366eb89361db`) reached W5 with `4` EvidenceItems and
  W8G draft state, but the W8 internal report writer produced a damaged stop
  instead of a complete report. `bundesrat-simple`
  (`8a48ed2378ca4963bd10231b3da6e8c6`) produced an internal report but
  repeated the split-shape quality gap: `MOSTLY-TRUE` 76/72 plus `UNVERIFIED`
  48/55. HJ62 is therefore a partial pass: keep the W7-B truth-scale invariant,
  repair the W8 report-writer roadblock next, then return to W7-B candidate
  coherence and source-quality gaps from report evidence.
- HJ61 ran four targeted report-quality canaries on runtime/source commit
  `cd7f2e214b762a456b9e3623f427f3f1c0f3015d` after importing and activating
  `claimboundary-v2` prompt hash
  `0d2aa1e11c26b89fe61023822e8ded1a989c7c7c27e5515272bacb5841ac9753`.
  All four jobs stayed on `claimboundary-v2`, finished `SUCCEEDED`, produced
  authenticated admin-only internal reports, and preserved public/default
  containment (`4.0.0-cb-precutover`, `blocked_precutover`, no public/default
  report markdown, no public/default verdict/truth/confidence, unauthenticated
  hidden route `401`). `bundesrat-simple`
  (`040fac63c75b43908ea1043dec9241a8`) improved to one coherent `MOSTLY-TRUE`
  78/82 temporal-sequence section. `plastic-en`
  (`212aee1b8b6340949449539e8caaca85`) still failed expectation with
  `MOSTLY-TRUE` 72/68 plus `MIXED` 50/62. `bundesrat-rechtskraftig`
  (`72b40abeb38f4ecca1a03a51902b72c5`) still split into `MOSTLY-TRUE` 72/78
  plus `UNVERIFIED` 45/35. `hydrogen-en`
  (`09e3fccef3b54f76bf7ae7d153b0eb77`) exposed the active hard blocker:
  `FALSE` 92/88 and `MOSTLY-FALSE` 78/72, meaning W7-B treated truth
  percentage like confidence in falsehood. The next repair is the existing W7-B
  truth-scale polarity contract.
- HJ57 ran two focused reruns on runtime commit
  `44154ac093a323a6c8e83dffca6a6e2493d856f1` after activating
  `claimboundary-v2` prompt hash
  `5a00717b8deb9a7c38f679cac4ee99414cc07b842f0837719bb86b904f810413`.
  `837c65bedaf94fb8bd0e91a65e607963` (hydrogen) cleared the HJ56 W5
  `schema_validation_failed` / `evidenceItems` too-big stop: W5 completed with
  `4` admitted EvidenceItems, sufficiency completed, internal Alpha first
  incomplete stage was `none`, and the internal report writer produced a
  `6130` byte admin-only report. `b1356da1f72f4f27a6fafb3bc5418746`
  (Bundesrat-simple) did not reproduce the HJ56 W5
  `approved_packet_mismatch`, but also did not reach W5 execution: it stopped
  upstream at W4-G `source_material_text_oversized` with `9` Source Material
  records and `19216` aggregate source-material bytes. Public/default
  containment held for both jobs.
- HJ58 reran the Bundesrat-simple input on runtime commit
  `b4c9de14a557d280254ff940626ef3987b448236` after amending W4-G to admit a
  deterministic bounded sidecar prefix inside the existing aggregate cap. Job
  `b6ac7b2a8ad646c0897cce8cddd8e37c` stayed on `claimboundary-v2`, did not
  repeat the W4-G `source_material_text_oversized` stop, gave W5 `8`
  source-content packets through a W4-H parent packet of `14176` bytes,
  extracted `4` EvidenceItems, and produced an authenticated admin-only internal
  report (`5721` job markdown characters). Public/default containment held:
  schema `4.0.0-cb-precutover`, cutover `blocked_precutover`, no public/default
  report markdown, verdict, truth percentage, or confidence, and unauthenticated
  hidden artifact route access returned `401`.
- HJ59 was prepared from HJ58 report-quality evidence. Two GPT sidecar reviewers
  agreed W5 EvidenceItem extraction is the lowest-complexity next owner because
  Query Planning produced `5` queries, W4-G/W4-H delivered `8` source-content
  packets, W5 executed, and the internal report writer carried a weak
  `UNVERIFIED` candidate. An Opus 4.6 challenge call timed out; reduced quorum
  is accepted for this bounded, reversible prompt-only repair. HJ59 adds
  generic W5 guidance for temporal/procedural relation claims so pending,
  not-yet-completed, later, or procedurally unresolved comparator milestones can
  become EvidenceItems when source-attributed content supports them, rather than
  being treated as absence of evidence. Job
  `769142306fab4af0ae46130bd5dcdda2` ran on runtime commit
  `e5654ea78f683e675d28b481ed1dfbd3d85bd48a` with active prompt hash
  `8e50a65fe61c1961d3d0e6e5eb7dc0b9075e870a5ffe64e688c08ba6aff1bf20`.
  It stayed on `claimboundary-v2`, finished `SUCCEEDED`, preserved
  public/default containment, and produced an authenticated admin-only internal
  Alpha report with verdict `TRUE`, truth `88`, and confidence `85`, inside the
  current `bundesrat-simple` benchmark band. The result is a real report-quality
  improvement over HJ58, but it still needs cross-input validation and report
  review before release confidence.
- HJ60 ran all eight Captain-defined benchmark inputs sequentially on runtime
  commit `58fa06a2db7182c4d879e5d96af0e654bf48bb46` with the HJ59 active
  prompt hash. Seven jobs produced internal Alpha reports:
  `bundesrat-rechtskraftig` (`cb969b2d844242e2b3b48194abe6e88c`),
  `bundesrat-simple` (`3d23e8347df444ec81e5fc637e3cf8d7`),
  `asylum-235000-de` (`451732eef8004b5a8f85853e992f4592`),
  `asylum-wwii-de` (`5e5a188a00dc4d7d8f5212268e95bb3c`),
  `bolsonaro-en` (`615be4c9226b4900b82553286a6e4ccf`), `hydrogen-en`
  (`39c3505cea344c39b4278b76d2e25e9f`), and `plastic-en`
  (`71ab493bd64640f5957acd4e59e1c362`). `bolsonaro-pt`
  (`5f026f1c4915455a88ba96f712790015`) stopped with W5
  `hidden_no_extractable_evidence` and `0` EvidenceItems. Public/default
  containment held for all jobs. The quality picture is mixed: hydrogen is in
  the expected false-side band; plastic is a real false-side/MIXED expectation
  miss because it promoted a `MOSTLY-TRUE` primary verdict; Bolsonaro EN is
  caveated but useful; asylum-family reports still lack decisive
  stock/comparison evidence; and Bundesrat-simple did not reproduce the HJ59
  high result, exposing W7-B candidate coherence/stability as a real next
  owner.
- HJ56 ran all eight Captain-defined benchmark inputs sequentially on runtime
  commit `88b41c5a214e54a96aec730aca4d087708083760` with the active HJ55
  query-planning prompt hash
  `3ab12da1646b9b4bb5bef83c5ef827e643bc9343b9cc9fa8eb0b3b95bc917be1`.
  All jobs stayed on `claimboundary-v2`; public/default containment held for
  every job (`4.0.0-cb-precutover`, `blocked_precutover`,
  `report_damaged`, no public/default reportMarkdown, no public verdict/truth/
  confidence, unauthenticated hidden routes `401`). Five jobs produced internal
  report-writer drafts: `bundesrat-rechtskraftig`
  (`0e102e087d224affac9cd95e34887516`), `asylum-235000-de`
  (`7a46b7f8d7a24e5aaf82c395043e5a11`), `asylum-wwii-de`
  (`d859c11d18a84542a0e188725aba44ee`), `bolsonaro-en`
  (`421f2028ece1460f8782fa721dab3fb7`), and `plastic-en`
  (`328b65a37a2b431a802f8aea5df7d988`). Three jobs produced admin stop
  summaries before report writer: `bundesrat-simple`
  (`57fedbd7f4bd44d88290f43ffe4a6e5c`) with W5
  `task_contract_validation_failed` / `approved_packet_mismatch`,
  `bolsonaro-pt` (`dbcf916966de4d15a7798547b0d05003`) with W4-G
  `source_material_text_oversized`, and `hydrogen-en`
  (`6435be9eda01462da01c0f6d344d25ec`) with W5
  `schema_validation_failed` and `evidenceItems` too big. HJ56 proves broad
  internal-report reachability while showing the next repeated bar is W5
  contract/schema robustness plus EvidenceItem breadth.
- `8e7375f8d29e4d5b8fe453ebcfe6c295` (plastic recycling) ran on HJ55 after
  importing and activating the query-planning angle-breadth prompt profile
  (`3ab12da1646b9b4bb5bef83c5ef827e643bc9343b9cc9fa8eb0b3b95bc917be1`) on
  runtime/job commit `16c09339fc37f6e82aa094d70fff3ab8feaf253e`. It stayed on
  `claimboundary-v2`; public/default containment held
  (`4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`,
  public/default reportMarkdown `null`) and unauthenticated hidden artifact
  access returned `401`. Claim Understanding accepted one selected
  AtomicClaim, Query Planning produced `5` distinct queries, Candidate Provider
  Network completed with `15` retained candidates (`21` total), W5 extracted
  `3` EvidenceItems, sufficiency assessment completed, the Alpha result first
  incomplete stage was `none`, and the internal report writer produced a
  `6545` byte internal Alpha report. HJ55's information yield is
  `report_produced`; query-planning underuse is repaired, but EvidenceItem
  breadth remains thin.
- `c3718a3e383442c29361e058ef4f16ad` (plastic recycling) ran on HJ54 after the
  no_valid_claim definition repair. It stayed on `claimboundary-v2`; public/
  default containment held (`4.0.0-cb-precutover`, `blocked_precutover`,
  `report_damaged`, public/default reportMarkdown `null`) and unauthenticated
  hidden artifact access returned `401`. Claim Understanding accepted one
  selected AtomicClaim, Query Planning produced `3` queries, Candidate Provider
  Network completed with `9` retained candidates, W5 extracted `3`
  EvidenceItems, sufficiency assessment completed, the Alpha result first
  incomplete stage was `none`, and the internal report writer produced a
  `5757` byte internal Alpha report. HJ54's information yield is
  `report_produced`; the next useful step is report-quality review, not another
  Claim Understanding admission repair for this input.
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

- reset total: `12`;
- consumed after latest reset: `4`;
- remaining: `8`;
- latest reset starts after HJ75 replacement canary
  `ad76c64ca5eb46c7904043975e0c483c`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Treat HJ68 as the current W5 recall baseline and keep the prompt repair.
2. Treat HJ69 as the W4-I readiness repair: the current-asylum packet now
   reaches W5 execution.
3. Treat HJ70 as the W5 output-contract repair: W5 can now produce accepted
   EvidenceItems and an internal report can be written.
4. Treat HJ71 as a partial query-planning/source-coverage improvement: direct
   stock-like evidence appeared, but the decisive aggregate current stock
   record is still missing.
5. Treat HJ72 as stopped: the structural Serper ordinal fallback repair did not
   surface the decisive aggregate, and the final tranche job is consumed.
6. Treat HJ73 as complete: durable redacted admin-only source-chain attribution
   is now available in the existing V2 raw/admin result envelope for future
   canaries, while the public/default projection remains blocked and omits it.
7. Treat HJ74 as partial pass: durable attribution worked, public containment
   held, and the chain reached W5/report writer, but direct current-stock source
   material was still absent. Do not run a second HJ74 job.
8. Treat HJ75 as passed for the current-asylum source-native selection repair:
   implementation is committed at `522beebb`; invalid trigger miss
   `bdde6d4...` is documented; replacement canary `ad76c64...` produced a
   true-side internal Alpha report with stronger Source Material. Do not run a
   second HJ75 canary. Next, review report quality and raise one targeted bar
   from observed report defects.
9. Treat HJ76 as stopped after Wave 1:
   `STOP_X7_HJ76_WAVE1_REPORT_QUALITY_GAUNTLET_TWO_WRONG_DIRECTION_TWO_UNVERIFIED`.
   Do not run Wave 2 until HJ77 classifies the owner and proposes the smallest
   repair.
10. Prepare HJ77 as the next no-live target-frame/directness owner
    classification and repair package. It may inspect existing persisted HJ76
    reports, source-chain attribution, prompt/config provenance, and code paths.
    Spend more jobs only after a committed repair package and runtime refresh.

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

# V2 Slice W8-F W8-E Attribution Product-Route Canary Result

Date: 2026-05-20
Owner: Captain Deputy / Lead Developer
Package: `Docs/WIP/2026-05-20_V2_Slice_W8-F_W8E_Attribution_Product_Route_Canary_Package.md`
Package commit: `75c7a786`
Job id: `5a9f11c1b3e34be18b6bf49ed6fc4d65`
Captain-defined input: `Using hydrogen for cars is more efficient than using electricity`

## Classification

`PASS_X7_W8_F_UPSTREAM_STOP_ATTRIBUTION_CANARY`

W8-F passed its diagnostic objective. The live product route reached the
same-ledger W8-B hidden/admin-only artifact route, and W8-E
`upstreamStopAttribution` decisively identified the first incomplete owner as
`sufficiency_assessment`.

This is not report-quality success. It is a routing/attribution success that
turns the W8-D symptom into a concrete next repair direction.

## Runtime And Preflight

- API/Web runtime commit: `75c7a786e073db2f099864837ce537d3a859697c`
- API version endpoint: `75c7a786e073db2f099864837ce537d3a859697c`
- Web version endpoint: `75c7a786e073db2f099864837ce537d3a859697c`
- API health: `200`
- Web health: healthy after warmup
- W8-B route unauthenticated preflight: `401`
- W8-B route authenticated missing-ledger preflight: `404`
- W8-B route cache-control on missing-ledger preflight: `no-store`
- Focused W8-B/W8-E route/report-result tests: passed
- Boundary guard: passed
- `npm run validate:v2-gates`: passed
- Gate-register self-test: passed
- `npm run debt:sensors`: `advisory_warn` with known V2 footprint/docs/boundary warnings
- `git diff --check`: passed before submission
- Worktree before submission: clean; unrelated governance WIP edits isolated in
  `stash@{0}`.

## Public Result

- job status: `SUCCEEDED`
- pipeline variant: `claimboundary-v2`
- public schema: `4.0.0-cb-precutover`
- public cutover: `blocked_precutover`
- primary public issue: `report_damaged`
- runtime commit recorded on job: `75c7a786e073db2f099864837ce537d3a859697c`

Public/default output stayed the existing damaged pre-cutover shell. The public
response contains the submitted user input as existing job/result input
metadata, but the refined leak check found no W8-E/W8-B internal terms:

- `upstreamStopAttribution`
- `sufficiency_assessment_damaged`
- `schema_validation_failed`
- `internal_alpha_report_result`
- `evidence-lifecycle-internal-alpha-report-result-artifacts`
- `precutover-observability`

No source text, EvidenceItem text, snippets, summaries, raw provider payload,
prompt text, hidden ledger id, route name, W8-B decision id, or hidden artifact
projection was exposed publicly.

## Hidden W8-B Evidence

Same-ledger route:

`/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts?ledgerId=5a9f11c1b3e34be18b6bf49ed6fc4d65:precutover-observability`

Authenticated route result:

- route status: `200`
- cache-control: `no-store`
- visibility: `internal_admin_only`
- public pointer exposure: `forbidden`
- default projection: `admin_structured_candidate_no_source_text`
- artifact count: `1`
- artifact status: `internal_alpha_report_result_blocked`
- artifact blocked reason: `sufficiency_assessment_not_completed`
- report quality status: `internal_alpha_review_candidate_not_public_report`
- W8-A merge trigger status: `parity_covered`
- input EvidenceItem count: `1`
- cited EvidenceItem ref count: `0`
- redaction flags: evidence/source/input/summary/report/provider/prompt/internal
  text all returned `false`

## W8-E Attribution

`upstreamStopAttribution`:

- attribution version:
  `v2.evidence-lifecycle.internal-alpha-report-result.upstream-stop-attribution.w8e`
- first incomplete stage: `sufficiency_assessment`
- first incomplete reason: `sufficiency_assessment_not_completed`

Parent status summary:

- W5 bounded extraction: `hidden_evidence_item_extraction_completed`
- W5 extraction result: `accepted`
- W5 extraction status: `evidence_extracted`
- W5 EvidenceItem count: `1`
- W5-F handoff: `evidence_items_ready_for_downstream_internal_handoff`
- W5-F admitted EvidenceItem count: `1`
- W6-B sufficiency intake:
  `sufficiency_intake_ready_for_contract_only_assessment`
- W6-C sufficiency assessment: `sufficiency_assessment_damaged`
- W6-C damaged reason: `schema_validation_failed`
- W6-C admitted EvidenceItem count in attribution projection: `0`
- W7-A boundary/verdict candidate: `boundary_verdict_candidate_blocked`
- W7-A candidate population: `closed_until_llm_task_approved`
- W8-A internal report stop: `alpha_report_stop_blocked`
- W7-B2 boundary/verdict execution: `boundary_verdict_execution_blocked`
- W7-B2 runtime ownership: `owned`
- W7-B2 boundary candidate count: `0`
- W7-B2 verdict candidate count: `0`
- W7-B2 cited EvidenceItem ref count: `0`

Attribution redaction:

- source text returned: `false`
- EvidenceItem text returned: `false`
- input text returned: `false`
- prompt text returned: `false`
- provider payload returned: `false`
- hidden ledger reference returned: `false`
- raw internal state returned: `false`

## Pass Criteria Result

W8-F package pass criteria were met:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit included W8-E;
- public output stayed damaged/precutover;
- public leak scan found no W8-E/W8-B internals;
- same-ledger W8-B route was authenticated/no-store;
- default W8-B projection was text-free;
- exactly one W8-B artifact existed;
- `upstreamStopAttribution` was present and decisive;
- attribution used enum-only parent status/reason/count/hash/length data.

## Budget

The canary consumed one job from the reset tranche of `8`.

Remaining live-job budget: `7`.

No second W8-F canary is authorized.

## Next Step

Prepare a narrow W6-C/W6-C2 sufficiency-assessment schema/contract repair
package. The observed live owner is W6-C:

- `firstIncompleteStage = sufficiency_assessment`
- `sufficiencyAssessment.assessmentStatus = sufficiency_assessment_damaged`
- `sufficiencyAssessment.damagedReason = schema_validation_failed`

Do not repair inside W8-F. The next package should inspect existing W6-C local
tests/provider-output contract and decide the smallest repair path. Prompt/model/
config/schema/UCM/gateway changes remain Captain-gated unless the next reviewed
package explicitly requests and receives that approval.

W8-F does not authorize public behavior, parser/cache/SR/storage/provider
expansion, W2/W3 widening, ACS/direct URL, V1 work, V1 cleanup, or a second
canary.

# V2 Slice W8-D W8-B/W8-C Product Route Canary Result

Date: 2026-05-20
Owner: Captain Deputy / Lead Developer
Package: `Docs/WIP/2026-05-20_V2_Slice_W8-D_W8B_W8C_Product_Route_Canary_Package.md`
Package commit: `bb3bb4da`
Verifier-maintenance commit used for runtime: `86eabdf2`
Job id: `828aacb298ed43a885b8d2f41379f25e`
Captain-defined input: `Using hydrogen for cars is more efficient than using electricity`

## Classification

`STOP_X7_W8_D_INTERNAL_ALPHA_RESULT_BLOCKED_BY_SUFFICIENCY_ASSESSMENT`

W8-D did not pass. The live product route reached the W8-B hidden/admin-only
artifact route on the same ledger, but the W8-B artifact did not meet the
package pass criteria.

## Runtime And Preflight

- API/Web runtime commit: `86eabdf27aa1ba7b67b181cd92d86da04af9603b`
- API health: `200`
- W8-B route unauthenticated preflight: `401`
- W8-B route authenticated missing-ledger preflight: `404`
- W8-B route cache-control: `no-store`
- Focused route/report-result tests: passed
- Boundary guard: passed after a test-only timeout stabilization commit
- `npm run validate:v2-gates`: passed
- Gate-register self-test: passed

## Public Result

- job status: `SUCCEEDED`
- pipeline variant: `claimboundary-v2`
- public schema: `4.0.0-cb-precutover`
- public cutover: `blocked_precutover`
- primary public issue: `report_damaged`
- runtime commit recorded on job: `86eabdf27aa1ba7b67b181cd92d86da04af9603b`

Public/default output remained the existing damaged pre-cutover shell. The
public response contains the submitted user input as existing job/result input
metadata, but no W8-B internal route name, hidden ledger id, W8-B internal
status, source text, EvidenceItem text, snippets, summaries, raw provider
payload, prompt text, W8-B decision id, or hidden artifact projection was
exposed.

## Hidden W8-B Evidence

Same-ledger route:

`/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts?ledgerId=<jobId>:precutover-observability`

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
- text/redaction flags: evidence/source/input/summary/report/cited refs all returned `false`

## Failed Pass Criteria

The W8-D package required:

- W8-B artifact status `internal_alpha_report_result_candidate_created`;
- cited EvidenceItem refs present and matching W5 bounded extraction refs.

Observed:

- W8-B artifact status was `internal_alpha_report_result_blocked`;
- blocked reason was `sufficiency_assessment_not_completed`;
- cited EvidenceItem ref count was `0`.

## Budget

The canary consumed one job from the reset tranche of `8`.

Remaining live-job budget: `7`.

No second W8-D canary is authorized.

## Next Step

Do not retry W8-D. The next step should be Steer-Co review of the product-route
chain evidence and the W6-C/W7-B2/W8-B readiness mismatch before any repair or
new live job package.

W8-D does not authorize prompt/model/config/schema/UCM/gateway edits, public
behavior, parser/cache/SR/storage/provider expansion, ACS/direct URL, V1 work,
V1 cleanup, or a second canary.

# 2026-05-20 Captain Deputy V2 W8-D Product Route Canary Result

## Summary

W8-D ran exactly one authorized `claimboundary-v2` product-route canary:

- job id: `828aacb298ed43a885b8d2f41379f25e`
- input: `Using hydrogen for cars is more efficient than using electricity`
- package: `Docs/WIP/2026-05-20_V2_Slice_W8-D_W8B_W8C_Product_Route_Canary_Package.md`
- result doc: `Docs/WIP/2026-05-20_V2_Slice_W8-D_W8B_W8C_Product_Route_Canary_Result.md`
- runtime commit: `86eabdf27aa1ba7b67b181cd92d86da04af9603b`

Classification:

`STOP_X7_W8_D_INTERNAL_ALPHA_RESULT_BLOCKED_BY_SUFFICIENCY_ASSESSMENT`

The canary reached the same-ledger hidden W8-B route, but W8-B did not create
the expected internal Alpha report-result candidate. It recorded
`internal_alpha_report_result_blocked` with
`blockedReason = sufficiency_assessment_not_completed`.

## Evidence

Public result:

- `SUCCEEDED`
- `_schemaVersion = 4.0.0-cb-precutover`
- `publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- no W8-B route name, hidden ledger id, W8-B internal status, source text,
  EvidenceItem text, snippets, summaries, raw provider payload, prompt text, or
  hidden artifact projection exposed publicly.

Hidden W8-B route:

- authenticated route returned `200`
- `Cache-Control: no-store`
- `artifactCount = 1`
- artifact status: `internal_alpha_report_result_blocked`
- blocked reason: `sufficiency_assessment_not_completed`
- report quality status: `internal_alpha_review_candidate_not_public_report`
- W8-A merge trigger status: `parity_covered`
- input EvidenceItem count: `1`
- cited EvidenceItem ref count: `0`
- default projection text flags remained false.

## Verification

Before canary:

- route/report-result focused tests: passed
- boundary guard: passed after test-only timeout stabilization commit
  `86eabdf2`
- `npm run validate:v2-gates`: passed
- `node scripts/validate-v2-gate-register.mjs --self-test`: passed
- API/Web runtime refresh from `86eabdf2`: done
- route preflight: unauth `401`, authenticated missing-ledger `404`, `no-store`

## Budget

Captain reset live-job budget to `8` before W8-D. This canary consumed `1`.

Remaining live-job budget: `7`.

No second W8-D canary is authorized.

## Warnings

Do not retry W8-D. Do not repair inside this result package. Next work should be
Steer-Co review of the W6-C/W7-B2/W8-B readiness mismatch and a separate
reviewed package if a repair or follow-up live job is needed.

No prompt/model/config/schema/UCM/gateway edits, public/API/UI/report/export or
compatibility behavior, parser/cache/SR/storage/provider expansion, ACS/direct
URL, V1 work, V1 cleanup, or cutover is authorized by W8-D.

# V2 Slice X7-W5-G EvidenceItem Handoff Projection Canary Result

Date: 2026-05-20
Status: passed
Classification: `PASS_X7_W5_G_EVIDENCE_ITEM_HANDOFF_PROJECTION_CANARY`

## 1. Canary

- Job id: `19f831aa36084ab6a2cee9e89698f87c`
- Runtime commit: `8d36e68ab81e09c0a59ebd60aa1f37cced610a33`
- Package:
  `Docs/WIP/2026-05-20_V2_Slice_X7-W5-G_EvidenceItem_Handoff_Projection_Canary_Package.md`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Requested pipeline variant: `claimboundary-v2`
- Live-job budget before run: `1`
- Live-job budget after run: `0`

## 2. Preflight

Before submission:

- `git status --short --untracked-files=all`: clean
- Web runtime `/api/version` reported git sha
  `8d36e68ab81e09c0a59ebd60aa1f37cced610a33`.
- API `/health` returned healthy database connectivity.
- Focused W5/W4-I/boundary verifier passed: `3` files / `94` tests.
- `npm run validate:v2-gates` passed.
- W5 and W4-I route preflight passed:
  - unauthenticated request returned `401`;
  - authenticated missing-ledger request returned JSON `404`;
  - authenticated missing-ledger response was `Cache-Control: no-store`.

## 3. Public Result

The job reached `SUCCEEDED`.

Public result stayed within the pre-cutover shell:

- `_schemaVersion = 4.0.0-cb-precutover`
- `publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- public runtime commit:
  `8d36e68ab81e09c0a59ebd60aa1f37cced610a33`

## 4. Hidden Chain Evidence

Authenticated same-ledger no-store artifact routes on ledger
`19f831aa36084ab6a2cee9e89698f87c:precutover-observability` showed:

- Claim Understanding runtime artifacts: `1`
- W2 candidate-provider network artifacts:
  `candidate_provider_network_completed`
- W3-B source-material page-summary artifacts: `1`
- W4-I execution-readiness artifacts: `1`
- W5 bounded evidence extraction artifacts: `1`

## 5. Containment Evidence

W3-B default route:

- `sourceMaterialText` key absent;
- `sourceMaterialTextReturned` absent from the returned top-level projection;
- hash/length/provenance metadata retained.

W5 default route refined leak scan found no forbidden leak terms:

- no `"statement":`;
- no `"sourceMaterialText":`;
- no `"inputText":`;
- no `"snippet":`;
- no `"summary":`;
- no exact Captain input text.

W4-I and W5 internal routes were authenticated and no-store.

## 6. W5 / W5-E / W5-F Evidence

W5 hidden extraction:

- `status = hidden_evidence_item_extraction_completed`
- `extractionResultStatus = accepted`
- `extractionStatus = evidence_extracted`
- `evidenceItemCount = 1`
- `executionTelemetry.retryCount = 0`

W5-E admission:

- `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`
- `admittedEvidenceItemCount = 1`
- `blockedReason = null`
- `damagedReason = null`

W5-F handoff:

- `evidenceItemHandoff` present on W5 default route projection;
- `handoffStatus = evidence_items_ready_for_downstream_internal_handoff`;
- `admittedEvidenceItemCount = 1`;
- `w4iDisposition = historical_same_ledger_evidence_merged`;
- `retiredW4iTrigger =
  remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`;
- `replacementW4iTrigger = after_w5f_handoff_route_projection_verified`;
- `evidenceItemTextReturned = false`.

Lineage checks:

- statement hashes matched W5-E admission;
- statement byte lengths matched W5-E admission;
- source-material lineage hash matched W5-E admission;
- W4-H packet hash matched W5-E admission;
- provider id matched W5-E admission;
- model id matched W5-E admission;
- parent W5 artifact id matched W5 decision id.

W4-I route:

- `inspectionRole = historical_same_ledger_eligibility_evidence`
- `mergedBy = x7-w5-f_evidence_item_handoff_projection`
- `retiredRemovalTrigger =
  remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`
- `removalTrigger = after_w5f_handoff_route_projection_verified`

## 7. Result Meaning

X7-W5-G proves that the W5-F EvidenceItem handoff projection is live-reachable
on the product route, same-ledger, and default-redacted.

The replacement trigger `after_w5f_handoff_route_projection_verified` is now
satisfied for this canary. A separate reviewed package may now decide whether to
remove or merge the standalone W4-I route/sink if no downstream inspection still
needs it.

No report-quality output is claimed yet. Public V2 remains pre-cutover and
damaged.

## 8. Still Closed

No public cutover, report/verdict/warning/confidence behavior, parser execution,
cache/SR/storage behavior, provider expansion, W2/W3 widening, prompt/model/
config/schema edits, ACS/direct URL, or V1 work was performed or authorized.

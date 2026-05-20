# V2 Slice X7-W5-E2 EvidenceItem Admission Fresh Canary Result

Date: 2026-05-20
Status: stopped
Classification: `STOP_X7_W5_E2_W3B_DEFAULT_ADMIN_SOURCE_TEXT_EXPOSURE`

## 1. Canary

- Job id: `9584597389504d74af6dcfd684755bff`
- Runtime commit: `c0c8f9cc8f40ac87c5d0fa05ccb0973d620f890c`
- Package: `Docs/WIP/2026-05-20_V2_Slice_X7-W5-E2_EvidenceItem_Admission_Fresh_Canary_Package.md`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Requested pipeline variant: `claimboundary-v2`
- Live-job budget before run: `3`
- Live-job budget after run: `2`

## 2. Preflight

Before the canary:

- `git status --short --untracked-files=all`: clean
- Runtime was restarted from committed package state.
- `/api/fh/version` reported git sha
  `c0c8f9cc8f40ac87c5d0fa05ccb0973d620f890c`.
- Focused W5 route/admission/sink verifier passed: `3` files / `13` tests.
- `npm run validate:v2-gates` passed.
- W5 internal route preflight passed:
  - route file present;
  - unauthenticated request returned `401`;
  - authenticated missing-ledger request returned JSON `404`;
  - authenticated missing-ledger response was `Cache-Control: no-store`.

## 3. Public Result

The job reached `SUCCEEDED`.

Public result stayed within the pre-cutover shell:

- `_schemaVersion = 4.0.0-cb-precutover`
- `publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- public hidden-marker scan found no W5/W5-E markers.

## 4. Hidden Chain Evidence

Authenticated same-ledger no-store artifact routes were present for:

- Claim Understanding runtime artifacts: `1`
- Evidence Lifecycle intake artifacts: `1`
- W2 candidate-provider network artifacts: `1`
- W3-B source-material page-summary artifacts: `1`
- W4-G bounded corpus text artifacts: `1`
- W4-H extraction input artifacts: `1`
- W4-I execution-readiness artifacts: `1`
- W5 bounded evidence-extraction artifacts: `1`

## 5. W5 And W5-E Evidence

The W5 hidden route showed the W5-E admission contract itself worked for the
fresh run:

- `status = hidden_evidence_item_extraction_completed`
- `extractionResultStatus = accepted`
- `extractionStatus = evidence_extracted`
- `schemaDiagnostics = null`
- `executionTelemetry.retryCount = 0`
- `evidenceItemCount = 1`
- `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`
- `admittedEvidenceItemCount = 1`
- `evidenceItemStatementHashes.length = 1`
- `evidenceItemStatementByteLengths.length = 1`
- `parentW5ArtifactId = BOUNDED_EVIDENCE_EXTRACTION_AF5AF0D99761817A7F445CD2`
- `providerId = wikimedia_core`
- `modelId = claude-haiku-4-5-20251001`
- `damagedReason = null`
- `blockedReason = null`
- `defaultProjection = hash_length_provenance_only`
- redaction side effects keep EvidenceItem/source/input text unavailable.

This resolves the narrow missing-admission-snapshot question from W5-E1.

## 6. Stop Reason

W5-E2 does not pass because the broader containment criterion in the W5-E2
package failed.

The W3-B source-material page-summary admin route returned
`sourceMaterialRecords[].sourceMaterialText` by default on the same ledger. That
route is authenticated, internal-admin-only, and no-store, but the W5-E2 package
explicitly forbids source text in default admin route responses and requires
same-ledger leak inspection across default internal/admin route projections.

Claude Opus 4.6 reviewed the classification question and recommended `STOP`,
with rationale that W5-E2 cannot inherit a pass while a same-ledger admin route
violates a criterion explicitly named by the package.

## 7. Result

Classification:

`STOP_X7_W5_E2_W3B_DEFAULT_ADMIN_SOURCE_TEXT_EXPOSURE`

Meaning:

- W5-E fresh admission snapshot recording is proven for this job.
- W5-E2 package-level containment is not proven.
- No second W5-E2 canary is authorized from this package.
- The next step is a narrow W3-B default-admin redaction repair package before
  any further canary.

## 8. Still Closed

No public cutover, report/verdict/warning/confidence behavior, parser execution,
cache/SR/storage behavior, provider expansion, W2/W3 widening, ACS/direct URL,
or V1 work was performed or authorized.

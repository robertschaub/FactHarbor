# V2 Slice W6-C3 Sufficiency Schema Diagnostics Canary Result

**Status:** `PASS_X7_W6_C3_SUFFICIENCY_SCHEMA_DIAGNOSTICS_CAPTURED`
**Date:** 2026-05-20
**Job ID:** `0456086280104979b74da724d9d58308`
**Captain input:** `Using hydrogen for cars is more efficient than using electricity`
**Pipeline variant:** `claimboundary-v2`
**Source implementation commit:** `cb070a7d`
**Runtime commit:** `132d90ae141a72f2a492e8acf936d587229b0a03`
**Package:** `Docs/WIP/2026-05-20_V2_Slice_W6-C3_Sufficiency_Schema_Diagnostics_Package.md`

## Result

The single authorized W6-C3 canary passed its diagnostic objective.

The product route still stops at W6-C, as expected, but now the W8-B internal
artifact carries bounded sanitized W6-C schema diagnostics:

- public result: `_schemaVersion = 4.0.0-cb-precutover`
- public cutover: `blocked_precutover`
- public issue: `report_damaged`
- hidden W8-B status: `internal_alpha_report_result_blocked`
- hidden W8-B blocked reason: `sufficiency_assessment_not_completed`
- W6-C status: `sufficiency_assessment_damaged`
- W6-C damaged reason: `schema_validation_failed`
- W6-C diagnostics: populated

No second W6-C3 canary is authorized.

## Captured W6-C Diagnostics

W6-C returned:

- `diagnosticVersion`: `v2.evidence-lifecycle.sufficiency-assessment.schema-diagnostics.w6c3`
- `contractName`: `EvidenceSufficiencyResultSchema`
- `contractVersion`: `v2.evidence_sufficiency_assessment.0`
- `outputParseStatus`: `parsed`
- `failureCategory`: `schema_validation`
- `issueCount`: `8`

Captured bounded issue paths/codes:

| Path | Code |
|---|---|
| `sufficiencyAssessment.missingEvidenceDimensions.0.dimension` | `invalid_enum_value` |
| `sufficiencyAssessment.missingEvidenceDimensions.1.dimension` | `invalid_enum_value` |
| `sufficiencyAssessment.missingEvidenceDimensions.2.dimension` | `invalid_enum_value` |
| `sufficiencyAssessment.missingEvidenceDimensions.2.materiality` | `invalid_enum_value` |
| `sufficiencyAssessment.missingEvidenceDimensions.3.dimension` | `invalid_enum_value` |
| `integrityEvents.0.type` | `invalid_type` |
| `integrityEvents.0.references` | `invalid_type` |
| `integrityEvents.0` | `unrecognized_keys` |

## Leak And Containment Checks

Public job result remained the damaged pre-cutover shell and did not expose
W6-C3 diagnostics or W8-B/W8-E internals.

Authenticated W8-B default route returned one no-store internal/admin-only
artifact on ledger `0456086280104979b74da724d9d58308:precutover-observability`.
The route projection did not include source text, EvidenceItem text, input text,
prompt text, provider payload, hidden ledger id, raw run id, raw decision id,
raw schema messages, stack traces, public verdict, public truth percentage,
public confidence, or public warnings.

The serialized hidden route response was checked for the Captain input and the
fixture EvidenceItem statement text; both were absent. The response contains
redaction field names such as `providerPayloadReturned`, with values `false`.

## Runtime Discipline

Before submission:

- git status was clean after unrelated governance/WIP docs were isolated in a
  non-destructive stash;
- API and Web were restarted with `scripts/restart-clean.ps1`;
- API and Web both reported runtime commit
  `132d90ae141a72f2a492e8acf936d587229b0a03`;
- W8-B internal route preflight returned `401` unauthenticated and `404`
  authenticated missing-ledger with `Cache-Control: no-store`;
- no source changed after the W6-C3 verifier-clean implementation commit
  `cb070a7d`.

One live-job slot was consumed from the Captain-reset tranche.

## Interpretation

W6-C3 successfully converted the W6-C stop from a symptom into actionable
contract evidence. The next work should be a narrow W6-C4 prompt/contract repair
review package based on the captured issue paths. That package must decide
whether the repair belongs in prompt instructions, output contract/schema
alignment, or both.

Do not edit the W6-C prompt/schema/config/model/UCM/gateway directly from this
result. Prompt/model/config/schema work remains approval-gated.

## Remaining Closed Surfaces

W6-C3 does not authorize:

- a second W6-C3 canary;
- prompt/model/config/schema/UCM/gateway edits or approval flips;
- schema relaxation without a reviewed repair package;
- public/API/UI/report/export/compatibility behavior;
- parser/cache/SR/storage behavior;
- provider expansion, retries, W2/W3 widening, ACS/direct URL, V1 work, or V1
  cleanup;
- report/verdict/warning/confidence behavior.

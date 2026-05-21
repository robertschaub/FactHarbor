# V2 HighJump HJ-3 W7-B Diagnostic Canary Result

**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Status:** Stop, exact W7-B schema repair identified
**Job:** `ed3a7a7c2e8d405bba30b3ac475f265a`
**Runtime commit:** `90d83d6bdf5142b1bc8cfa69ed330b5b038f56da`
**Input:** `Using hydrogen for cars is more efficient than using electricity`
**Pipeline variant:** `claimboundary-v2`

## Classification

`STOP_X7_HJ3_W7B_SCHEMA_DIAGNOSTICS_CAPTURED`

The canary did not produce an internal Alpha report candidate. It did complete
the purpose of the HJ-3 diagnostic repair: W8-B now exposes bounded W7-B schema
diagnostics without raw provider output, source text, EvidenceItem text, prompt
text, stack traces, ledger ids, or run ids in the default projection.

## Public Result

- API job status: `SUCCEEDED`.
- Public V2 result remained `_schemaVersion = 4.0.0-cb-precutover`.
- Public cutover status remained `blocked_precutover`.
- Public analysis issue remained `report_damaged`.
- Runtime commit fields matched `90d83d6bdf5142b1bc8cfa69ed330b5b038f56da`.
- Public result did not expose hidden source, evidence, prompt, or provider
  material.

## Hidden Chain Evidence

- W2 candidate/provider chain completed.
- W3-B Source Material completed.
- W5 bounded evidence extraction completed with `5` EvidenceItems.
- W6-C sufficiency assessment completed and returned `accepted`.
- W6-C LLM-owned `sufficiencyAssessment.sufficiencyStatus` was `caveated`.
- W6-C `reportStopRecommendation` was `caveat_report`.
- W7-A boundary verdict candidate was `boundary_verdict_candidate_ready`.
- W7-B boundary verdict execution was `boundary_verdict_execution_damaged`.
- W8-B internal Alpha report-result artifact was recorded.

## W7-B Diagnostic Evidence

W8-B upstream stop attribution:

- first incomplete stage: `boundary_verdict_execution`;
- first incomplete reason: `boundary_verdict_execution_not_accepted`;
- W7-B status: `boundary_verdict_execution_damaged`;
- W7-B attempt count: `2`;
- W7-B schema retry count: `2`.

Bounded W7-B schema diagnostics:

```json
{
  "diagnosticVersion": "v2.evidence-lifecycle.boundary-verdict-execution.schema-diagnostics.hj2",
  "contractName": "BoundaryVerdictExecutionResultSchema",
  "contractVersion": "v2.boundary_verdict_execution.0",
  "outputParseStatus": "parsed",
  "failureCategory": "schema_validation",
  "issueCount": 1,
  "issues": [
    {
      "path": [
        "warningMaterialityInputs",
        "upstreamSufficiencyStatus"
      ],
      "code": "invalid_enum_value"
    }
  ],
  "rawProviderOutputReturned": false,
  "rawSchemaMessagesReturned": false,
  "providerCompletionTextReturned": false,
  "sourceTextReturned": false,
  "inputTextReturned": false,
  "evidenceItemTextReturned": false,
  "promptTextReturned": false,
  "stackTraceReturned": false
}
```

## Root Cause

The diagnostic shows a structural status-domain mismatch.

W6-C received the LLM-owned sufficiency judgment `caveated`, but the
`SufficiencyAssessmentDecision` contract preserved only the task result status
`accepted`. W7-B then seeded
`warningMaterialityInputs.upstreamSufficiencyStatus` from that task-level
status. The W7-B schema correctly expects the LLM-owned sufficiency judgment:
`sufficient`, `insufficient`, `needs_refinement`, or `caveated`.

This is not evidence that the W7-B schema should be loosened.

## Containment Check

- W8-B default route authenticated status: `200`.
- W8-B default route cache header: `no-store`.
- W8-B unauthenticated status: `401`.
- W8-B unauthenticated cache header: `no-store`.
- Default projection did not return ledger id or run id.
- Default projection did not return source text, EvidenceItem text, provider
  payload, prompt text, or raw schema messages.

## Budget

The HJ-3 diagnostic canary consumed `1` job from the HighJump tranche.

Remaining HighJump live-job budget after HJ-3: `10`.

## Next Action

Apply the narrow status-projection repair:

- preserve W6-C `sufficiencyAssessment.sufficiencyStatus` as a structural field
  on `SufficiencyAssessmentDecision`;
- require W7-B to fail closed if the field is absent;
- use the preserved field for W7-B `warningMaterialitySeed.upstreamSufficiencyStatus`;
- add topic-neutral prompt guidance to use the warning seed, not task-level
  result discriminants.

Do not loosen the W7-B schema and do not add deterministic semantic mapping.

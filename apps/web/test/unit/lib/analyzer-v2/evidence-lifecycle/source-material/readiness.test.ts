import { describe, expect, it } from "vitest";
import {
  buildCandidateSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/readiness";
import {
  CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
  type CandidateSourceMaterialReadinessTrace,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/types";

function validTrace(
  overrides: Partial<CandidateSourceMaterialReadinessTrace> = {},
): CandidateSourceMaterialReadinessTrace {
  return {
    traceVersion: CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
    visibility: "internal_only",
    candidateAcquisitionStatus: "completed",
    candidateRuntimeStructuralStatus: "completed_structural",
    candidateRecordCount: 2,
    queryOutcomeCount: 1,
    publicCutoverStatus: "blocked_precutover",
    candidateRecordsAreSourceMaterial: false,
    hiddenLocatorsAreDereferenceable: false,
    candidateCountsAreEvidence: false,
    ...overrides,
  };
}

describe("Analyzer V2 source-material readiness contract", () => {
  it("marks completed candidate acquisition as not source material and blocks extraction", () => {
    const decision = buildCandidateSourceMaterialReadinessDecision(validTrace());

    expect(decision).toEqual({
      decisionVersion: "v2.evidence-lifecycle.source-material-readiness.0",
      visibility: "internal_only",
      status: "not_ready_pre_execution",
      blockedReason: null,
      sourceMaterialStatus: "candidate_only_not_source_material",
      extractionInputStatus: "blocked_source_material_unavailable",
      evidenceCorpusStatus: "not_buildable_no_source_material",
      candidateTrace: validTrace(),
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
    });
  });

  it("fails closed when candidate acquisition or runtime completion is missing", () => {
    const cases: Array<[CandidateSourceMaterialReadinessTrace, string]> = [
      [
        validTrace({
          candidateAcquisitionStatus: "blocked",
          candidateRuntimeStructuralStatus: "not_available",
          candidateRecordCount: 0,
          queryOutcomeCount: 0,
        }),
        "candidate_acquisition_not_completed",
      ],
      [
        validTrace({
          candidateRuntimeStructuralStatus: "blocked",
          candidateRecordCount: 0,
        }),
        "candidate_runtime_not_completed",
      ],
      [
        validTrace({
          candidateRuntimeStructuralStatus: "damaged_structural",
        }),
        "candidate_runtime_not_completed",
      ],
      [
        validTrace({
          publicCutoverStatus: "not_blocked_precutover",
        }),
        "public_cutover_not_blocked_precutover",
      ],
    ];

    for (const [trace, blockedReason] of cases) {
      expect(buildCandidateSourceMaterialReadinessDecision(trace)).toMatchObject({
        status: "blocked_pre_execution",
        blockedReason,
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
        candidateTrace: null,
      });
    }
  });

  it("blocks malformed traces and raw source-like fields without echoing their values", () => {
    const invalidTraces: unknown[] = [
      null,
      [],
      { ...validTrace(), providerId: "RAW_PROVIDER_X7A" },
      { ...validTrace(), queryText: "RAW_QUERY_TEXT_X7A" },
      { ...validTrace(), candidateId: "RAW_CANDIDATE_X7A" },
      { ...validTrace(), hiddenLocatorId: "RAW_LOCATOR_X7A" },
      { ...validTrace(), url: "https://example.invalid/x7a" },
      { ...validTrace(), title: "RAW_TITLE_X7A" },
      { ...validTrace(), snippet: "RAW_SNIPPET_X7A" },
      { ...validTrace(), domain: "RAW_DOMAIN_X7A" },
      { ...validTrace(), rawPayload: "RAW_PAYLOAD_X7A" },
      { ...validTrace(), candidateRecordCount: -1 },
      { ...validTrace(), queryOutcomeCount: 0.5 },
      { ...validTrace(), traceVersion: "stale-trace-version" },
    ];

    for (const invalidTrace of invalidTraces) {
      const decision = buildCandidateSourceMaterialReadinessDecision(invalidTrace);
      const serializedDecision = JSON.stringify(decision);

      expect(decision).toMatchObject({
        status: "blocked_pre_execution",
        blockedReason: "candidate_trace_invalid",
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
        candidateTrace: null,
      });
      for (const forbidden of [
        "RAW_PROVIDER_X7A",
        "RAW_QUERY_TEXT_X7A",
        "RAW_CANDIDATE_X7A",
        "RAW_LOCATOR_X7A",
        "example.invalid",
        "RAW_TITLE_X7A",
        "RAW_SNIPPET_X7A",
        "RAW_DOMAIN_X7A",
        "RAW_PAYLOAD_X7A",
      ]) {
        expect(serializedDecision).not.toContain(forbidden);
      }
    }
  });

  it("blocks traces that treat candidates as source material, locators, or evidence", () => {
    const cases: Array<[unknown, string]> = [
      [
        {
          ...validTrace(),
          candidateRecordsAreSourceMaterial: true,
        },
        "candidate_trace_contains_source_material",
      ],
      [
        {
          ...validTrace(),
          hiddenLocatorsAreDereferenceable: true,
        },
        "candidate_trace_contains_dereferenceable_locator",
      ],
      [
        {
          ...validTrace(),
          candidateCountsAreEvidence: true,
        },
        "candidate_trace_treats_candidate_count_as_evidence",
      ],
      [
        {
          ...validTrace(),
          candidateRecordsAreSourceMaterial: "false",
        },
        "candidate_trace_invalid",
      ],
    ];

    for (const [trace, blockedReason] of cases) {
      expect(buildCandidateSourceMaterialReadinessDecision(trace)).toMatchObject({
        status: "blocked_pre_execution",
        blockedReason,
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      });
    }
  });
});

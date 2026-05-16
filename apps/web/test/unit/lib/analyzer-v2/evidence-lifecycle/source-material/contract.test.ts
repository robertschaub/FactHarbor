import { describe, expect, it } from "vitest";
import {
  buildSourceMaterialAbsenceContract,
  isSourceMaterialAbsenceContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/contract";
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

describe("Analyzer V2 source-material absence contract", () => {
  it("turns X7-A readiness into a negative source-material absence contract", () => {
    const readiness = buildCandidateSourceMaterialReadinessDecision(validTrace());
    const contract = buildSourceMaterialAbsenceContract(readiness);

    expect(contract).toEqual({
      contractVersion: "v2.evidence-lifecycle.source-material-absence-contract.x7b",
      visibility: "internal_only",
      status: "not_available_pre_execution",
      notAvailableReason: "source_material_not_available_pre_execution",
      sourceMaterialReadiness: {
        decisionVersion: "v2.evidence-lifecycle.source-material-readiness.0",
        status: "not_ready_pre_execution",
        blockedReason: null,
        sourceMaterialStatus: "candidate_only_not_source_material",
        extractionInputStatus: "blocked_source_material_unavailable",
        evidenceCorpusStatus: "not_buildable_no_source_material",
      },
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpusInput: null,
    });
    expect(isSourceMaterialAbsenceContract(contract)).toBe(true);
    expect(JSON.stringify(contract)).not.toContain("candidateRecordCount");
    expect(JSON.stringify(contract)).not.toContain("queryOutcomeCount");
  });

  it("preserves blocked X7-A readiness only as absence metadata", () => {
    const readiness = buildCandidateSourceMaterialReadinessDecision(validTrace({
      candidateRuntimeStructuralStatus: "blocked",
      candidateRecordCount: 0,
    }));
    const contract = buildSourceMaterialAbsenceContract(readiness);

    expect(contract).toMatchObject({
      status: "not_available_pre_execution",
      notAvailableReason: "source_material_readiness_blocked",
      sourceMaterialReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "candidate_runtime_not_completed",
      },
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpusInput: null,
    });
  });

  it("fails closed for malformed or source-like source-material inputs without echoing values", () => {
    const validReadiness = buildCandidateSourceMaterialReadinessDecision(validTrace());
    const invalidInputs: unknown[] = [
      null,
      [],
      { ...validReadiness, extra: "RAW_EXTRA_X7B" },
      { ...validReadiness, sourceMaterial: { text: "RAW_SOURCE_MATERIAL_X7B" } },
      { ...validReadiness, extractionInput: { text: "RAW_EXTRACTION_INPUT_X7B" } },
      { ...validReadiness, evidenceCorpus: [{ statement: "RAW_EVIDENCE_X7B" }] },
      { ...validReadiness, candidateTrace: { ...validTrace(), url: "https://example.invalid/x7b" } },
      {
        contractVersion: "v2.evidence-lifecycle.source-material-absence-contract.x7b",
        visibility: "internal_only",
        status: "accepted_future_source_material",
        sourceMaterial: { text: "RAW_ACCEPTED_SOURCE_X7B" },
      },
    ];

    for (const input of invalidInputs) {
      const contract = buildSourceMaterialAbsenceContract(input);
      const serialized = JSON.stringify(contract);

      expect(contract).toMatchObject({
        status: "not_available_pre_execution",
        notAvailableReason: "source_material_contract_invalid",
        sourceMaterialReadiness: null,
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpusInput: null,
      });
      for (const forbidden of [
        "RAW_EXTRA_X7B",
        "RAW_SOURCE_MATERIAL_X7B",
        "RAW_EXTRACTION_INPUT_X7B",
        "RAW_EVIDENCE_X7B",
        "RAW_ACCEPTED_SOURCE_X7B",
        "example.invalid",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it("does not recognize copied or JSON-round-tripped contracts as authority-bearing contracts", () => {
    const contract = buildSourceMaterialAbsenceContract(
      buildCandidateSourceMaterialReadinessDecision(validTrace()),
    );

    expect(isSourceMaterialAbsenceContract(contract)).toBe(true);
    expect(isSourceMaterialAbsenceContract({ ...contract })).toBe(false);
    expect(isSourceMaterialAbsenceContract(JSON.parse(JSON.stringify(contract)))).toBe(false);
  });

  it("does not define positive source-material or corpus-buildable states", () => {
    const contract = buildSourceMaterialAbsenceContract(
      buildCandidateSourceMaterialReadinessDecision(validTrace()),
    );
    const serialized = JSON.stringify(contract);

    expect(serialized).not.toContain("accepted_future_source_material");
    expect(serialized).not.toContain("buildable_future_source_material");
    expect(serialized).not.toContain("evidenceItems");
    expect(serialized).not.toContain("warnings");
    expect(serialized).not.toContain("verdict");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("reportMarkdown");
  });
});

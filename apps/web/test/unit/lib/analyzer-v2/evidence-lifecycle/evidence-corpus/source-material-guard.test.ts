import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusSourceMaterialGuard,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";
import {
  buildSourceMaterialAbsenceContract,
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

function objectKeys(value: unknown): string[] {
  return value && typeof value === "object" ? Object.keys(value) : [];
}

describe("Analyzer V2 evidence-corpus source-material guard", () => {
  it("keeps X7-A not-ready readiness as not buildable without source material", () => {
    const guard = buildEvidenceCorpusSourceMaterialGuard(
      buildCandidateSourceMaterialReadinessDecision(validTrace()),
    );

    expect(guard).toEqual({
      decisionVersion: "v2.evidence-lifecycle.evidence-corpus.source-material-guard.x7b",
      visibility: "internal_only",
      status: "not_buildable_no_source_material",
      blockedReason: "source_material_not_available_pre_execution",
      sourceMaterialContract: {
        contractVersion: "v2.evidence-lifecycle.source-material-absence-contract.x7b",
        status: "not_available_pre_execution",
        notAvailableReason: "source_material_not_available_pre_execution",
        readinessStatus: "not_ready_pre_execution",
      },
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
    });
  });

  it("keeps X7-A blocked readiness as blocked source-material-not-accepted", () => {
    const guard = buildEvidenceCorpusSourceMaterialGuard(
      buildCandidateSourceMaterialReadinessDecision(validTrace({
        candidateAcquisitionStatus: "blocked",
        candidateRuntimeStructuralStatus: "not_available",
        candidateRecordCount: 0,
        queryOutcomeCount: 0,
      })),
    );

    expect(guard).toMatchObject({
      status: "blocked_source_material_not_accepted",
      blockedReason: "source_material_readiness_blocked",
      sourceMaterialContract: {
        notAvailableReason: "source_material_readiness_blocked",
        readinessStatus: "blocked_pre_execution",
      },
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
    });
  });

  it("rejects malformed source-material inputs without leaking raw source-like values", () => {
    const invalidInputs: unknown[] = [
      null,
      [],
      { sourceMaterial: { url: "https://example.invalid/x7b" } },
      { sourceRecords: [{ title: "RAW_TITLE_X7B" }] },
      { parsedText: "RAW_PARSED_TEXT_X7B" },
      { evidenceItems: [{ statement: "RAW_EVIDENCE_ITEM_X7B" }] },
      { warnings: ["RAW_WARNING_X7B"] },
      { verdict: "RAW_VERDICT_X7B" },
      { confidence: "RAW_CONFIDENCE_X7B" },
      { reportMarkdown: "RAW_REPORT_X7B" },
    ];

    for (const input of invalidInputs) {
      const guard = buildEvidenceCorpusSourceMaterialGuard(input);
      const serialized = JSON.stringify(guard);

      expect(guard).toMatchObject({
        status: "blocked_source_material_invalid",
        blockedReason: "source_material_contract_invalid",
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      });
      for (const forbidden of [
        "example.invalid",
        "RAW_TITLE_X7B",
        "RAW_PARSED_TEXT_X7B",
        "RAW_EVIDENCE_ITEM_X7B",
        "RAW_WARNING_X7B",
        "RAW_VERDICT_X7B",
        "RAW_CONFIDENCE_X7B",
        "RAW_REPORT_X7B",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it("rejects copied or JSON-round-tripped source-material contracts", () => {
    const contract = buildSourceMaterialAbsenceContract(
      buildCandidateSourceMaterialReadinessDecision(validTrace()),
    );
    const copiedContract = { ...contract };
    const jsonContract = JSON.parse(JSON.stringify(contract));

    for (const input of [copiedContract, jsonContract]) {
      expect(buildEvidenceCorpusSourceMaterialGuard(input)).toMatchObject({
        status: "blocked_source_material_invalid",
        blockedReason: "source_material_contract_invalid",
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      });
    }
  });

  it("never creates source material, evidence corpus, warnings, verdicts, confidence, or report fields", () => {
    const cases = [
      buildCandidateSourceMaterialReadinessDecision(validTrace()),
      buildCandidateSourceMaterialReadinessDecision(validTrace({ publicCutoverStatus: "not_blocked_precutover" })),
      { status: "accepted_future_source_material", sourceMaterial: { text: "RAW_ACCEPTED_X7B" } },
    ];

    for (const input of cases) {
      const guard = buildEvidenceCorpusSourceMaterialGuard(input);
      const serialized = JSON.stringify(guard);

      expect(guard.sourceMaterial).toBeNull();
      expect(guard.extractionInput).toBeNull();
      expect(guard.evidenceCorpus).toBeNull();
      expect(["not_buildable_no_source_material", "blocked_source_material_invalid", "blocked_source_material_not_accepted"])
        .toContain(guard.status);
      expect(serialized).not.toContain("accepted_future_source_material");
      expect(serialized).not.toContain("buildable_future_source_material");
      expect(objectKeys(guard)).not.toEqual(expect.arrayContaining([
        "sourceRecords",
        "sourceCounts",
        "parsedText",
        "evidenceItems",
        "warnings",
        "verdict",
        "truthPercentage",
        "confidence",
        "reportMarkdown",
      ]));
    }
  });
});

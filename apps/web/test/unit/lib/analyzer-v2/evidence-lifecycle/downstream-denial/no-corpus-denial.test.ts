import { describe, expect, it } from "vitest";
import { buildDownstreamNoCorpusDenial } from "@/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial";
import {
  DOWNSTREAM_NO_CORPUS_DENIAL_VERSION,
  DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION,
  type DownstreamNoCorpusDenialDecision,
  type DownstreamNoCorpusStructuralInput,
} from "@/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types";
import {
  buildEvidenceCorpusSourceMaterialGuard,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";
import {
  buildCandidateSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/readiness";
import {
  CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
  type CandidateSourceMaterialReadinessTrace,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/types";

const FORBIDDEN_STATUS_OR_REASON_FRAGMENTS = [
  "ready",
  "eligible",
  "available",
  "executable",
  "approved",
  "source_acquired",
  "evidence_available",
  "corpus_buildable",
  "live_eligible",
];

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

function sourceMaterialGuard(overrides: Partial<CandidateSourceMaterialReadinessTrace> = {}) {
  return buildEvidenceCorpusSourceMaterialGuard(
    buildCandidateSourceMaterialReadinessDecision(validTrace(overrides)),
  );
}

function structuralInput(
  overrides: Partial<DownstreamNoCorpusStructuralInput> = {},
): DownstreamNoCorpusStructuralInput {
  return {
    inputVersion: DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION,
    visibility: "internal_only",
    structuralSource: "x7f_source_acquisition_gate",
    status: "structural_source_acquisition_closed",
    blockedReason: "runtime_source_acquisition_gate_closed",
    sourceMaterial: null,
    parsedMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    ...overrides,
  };
}

function expectDownstreamOutputsDenied(decision: DownstreamNoCorpusDenialDecision): void {
  expect(decision).toMatchObject({
    denialVersion: DOWNSTREAM_NO_CORPUS_DENIAL_VERSION,
    visibility: "internal_only",
    applicabilityInput: null,
    extractionInput: null,
    sufficiencyInput: null,
    boundaryInput: null,
    verdictInput: null,
    evidenceCorpus: null,
    evidenceItems: null,
    warnings: null,
    report: null,
    publicOutput: null,
    liveEligibility: false,
    semanticLlmTasksApproved: false,
    productPublicLiveApproved: false,
    cacheTouched: false,
    sourceReliabilityTouched: false,
  });
}

describe("Analyzer V2 downstream no-corpus denial", () => {
  it("maps X7-B no-source-material guard output to downstream blocked no corpus", () => {
    const decision = buildDownstreamNoCorpusDenial(sourceMaterialGuard());

    expect(decision).toMatchObject({
      status: "downstream_blocked_no_evidence_corpus",
      blockedReason: "source_material_guard_no_corpus",
      sourceMaterialGuardVersion: "v2.evidence-lifecycle.evidence-corpus.source-material-guard.x7b",
      sourceMaterialGuardStatus: "not_buildable_no_source_material",
      sourceMaterialGuardReason: "source_material_not_available_pre_execution",
    });
    expectDownstreamOutputsDenied(decision);
  });

  it("maps X7-B invalid source-material guard output to downstream blocked invalid", () => {
    const decision = buildDownstreamNoCorpusDenial(
      buildEvidenceCorpusSourceMaterialGuard({ sourceMaterial: { text: "RAW_SOURCE_X7G1" } }),
    );

    expect(decision).toMatchObject({
      status: "downstream_blocked_source_material_invalid",
      blockedReason: "source_material_guard_invalid",
      sourceMaterialGuardStatus: "blocked_source_material_invalid",
      sourceMaterialGuardReason: "source_material_contract_invalid",
    });
    expect(JSON.stringify(decision)).not.toContain("RAW_SOURCE_X7G1");
    expectDownstreamOutputsDenied(decision);
  });

  it("maps X7-B source-material-not-accepted output to downstream blocked not accepted", () => {
    const decision = buildDownstreamNoCorpusDenial(sourceMaterialGuard({
      candidateAcquisitionStatus: "blocked",
      candidateRuntimeStructuralStatus: "not_available",
      candidateRecordCount: 0,
      queryOutcomeCount: 0,
    }));

    expect(decision).toMatchObject({
      status: "downstream_blocked_source_material_not_accepted",
      blockedReason: "source_material_guard_not_accepted",
      sourceMaterialGuardStatus: "blocked_source_material_not_accepted",
      sourceMaterialGuardReason: "source_material_readiness_blocked",
    });
    expectDownstreamOutputsDenied(decision);
  });

  it("fails closed for malformed, wrong-version, missing-field, and extra-field input", () => {
    const validGuard = sourceMaterialGuard();
    const cases: unknown[] = [
      null,
      [],
      { status: "not_buildable_no_source_material" },
      { ...validGuard, decisionVersion: "wrong-version" },
      Object.fromEntries(Object.entries(validGuard).filter(([key]) => key !== "sourceMaterial")),
      { ...validGuard, extraField: "not approved" },
      { ...validGuard, blockedReason: "source_material_contract_invalid" },
      { ...validGuard, sourceMaterialContract: null },
      {
        ...validGuard,
        sourceMaterialContract: {
          ...validGuard.sourceMaterialContract!,
          readinessStatus: null,
        },
      },
      {
        ...validGuard,
        sourceMaterialContract: {
          ...validGuard.sourceMaterialContract!,
          extraField: "not approved",
        },
      },
    ];

    for (const input of cases) {
      const decision = buildDownstreamNoCorpusDenial(input);

      expect(decision).toMatchObject({
        status: "downstream_blocked_input_invalid",
        blockedReason: "source_material_guard_input_invalid",
        sourceMaterialGuardVersion: null,
        sourceMaterialGuardStatus: null,
        sourceMaterialGuardReason: null,
      });
      expectDownstreamOutputsDenied(decision);
    }
  });

  it("maps strict structural no-corpus input to downstream blocked no corpus", () => {
    const decision = buildDownstreamNoCorpusDenial(structuralInput());

    expect(decision).toMatchObject({
      status: "downstream_blocked_no_evidence_corpus",
      blockedReason: "runtime_source_acquisition_gate_closed",
      sourceMaterialGuardVersion: null,
      sourceMaterialGuardStatus: null,
      sourceMaterialGuardReason: null,
    });
    expectDownstreamOutputsDenied(decision);
  });

  it("fails closed for malformed structural no-corpus input", () => {
    const cases: unknown[] = [
      { ...structuralInput(), inputVersion: "wrong-version" },
      { ...structuralInput(), extraField: "not approved" },
      { ...structuralInput(), status: "structural_no_parsed_material" },
      { ...structuralInput(), parsedMaterial: { text: "RAW_PARSED_X7G2" } },
      {
        ...structuralInput({
          structuralSource: "c0s3_parsed_material_denial",
          status: "structural_input_rejected",
          blockedReason: "runtime_input_not_owned",
        }),
        evidenceCorpus: { evidenceItems: [] },
      },
    ];

    for (const input of cases) {
      const decision = buildDownstreamNoCorpusDenial(input);

      expect(decision).toMatchObject({
        status: "downstream_blocked_input_invalid",
        blockedReason: "source_material_guard_input_invalid",
        sourceMaterialGuardVersion: null,
        sourceMaterialGuardStatus: null,
        sourceMaterialGuardReason: null,
      });
      expect(JSON.stringify(decision)).not.toContain("RAW_PARSED_X7G2");
      expectDownstreamOutputsDenied(decision);
    }
  });

  it("keeps status and reason labels denial-only", () => {
    const decisions = [
      buildDownstreamNoCorpusDenial(sourceMaterialGuard()),
      buildDownstreamNoCorpusDenial(buildEvidenceCorpusSourceMaterialGuard({ sourceMaterial: {} })),
      buildDownstreamNoCorpusDenial(sourceMaterialGuard({
        candidateAcquisitionStatus: "blocked",
        candidateRuntimeStructuralStatus: "not_available",
        candidateRecordCount: 0,
        queryOutcomeCount: 0,
      })),
      buildDownstreamNoCorpusDenial({}),
      buildDownstreamNoCorpusDenial(structuralInput()),
    ];

    for (const decision of decisions) {
      for (const value of [decision.status, decision.blockedReason]) {
        for (const forbidden of FORBIDDEN_STATUS_OR_REASON_FRAGMENTS) {
          expect(value).not.toContain(forbidden);
        }
      }
    }
  });

  it("depends only on structural source-material guard status, not source text or language", () => {
    const first = buildDownstreamNoCorpusDenial(sourceMaterialGuard({
      candidateRecordCount: 1,
      queryOutcomeCount: 1,
    }));
    const second = buildDownstreamNoCorpusDenial(sourceMaterialGuard({
      candidateRecordCount: 9,
      queryOutcomeCount: 4,
    }));

    expect(second).toEqual(first);
  });
});

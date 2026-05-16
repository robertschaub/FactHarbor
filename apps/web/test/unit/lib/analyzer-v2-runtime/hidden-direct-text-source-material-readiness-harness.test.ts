import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import type {
  HiddenDirectTextCandidateAcquisitionHarnessResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";
import {
  runHiddenDirectTextSourceMaterialReadinessHarness,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness";

function publicEnvelope(
  publicCutoverStatus: "blocked_precutover" | "approved" = "blocked_precutover",
): ClaimBoundaryV2Envelope {
  return {
    resultJson: {
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        publicCutoverStatus,
      },
      compatibility: {
        v1: {
          fallbackFields: {
            verdict: null,
            truthPercentage: null,
            confidence: null,
          },
        },
      },
    },
    reportMarkdown: "V2 pre-cutover shell.",
  };
}

function completedX6(
  envelope: ClaimBoundaryV2Envelope = publicEnvelope(),
): HiddenDirectTextCandidateAcquisitionHarnessResult {
  return {
    harnessVersion: "v2.hidden-direct-text-candidate-acquisition-harness.x6",
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    publicEnvelope: envelope,
    x5Integration: null,
    candidateAcquisitionRuntime: {
      version: "v2.source-acquisition.candidate-runtime.7n3b1",
      visibility: "internal_only",
      status: "completed_structural",
      stopReason: "not_stopped",
      queryOutcomes: [
        {
          queryId: "RAW_QUERY_X7A",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptId: "RAW_ATTEMPT_X7A",
          candidateCount: 1,
        },
      ],
      candidates: [
        {
          candidateId: "RAW_CANDIDATE_X7A",
          queryId: "RAW_QUERY_X7A",
          retrievalPolicyKey: "RAW_POLICY_X7A",
          providerId: "RAW_PROVIDER_X7A",
          providerAttemptId: "RAW_ATTEMPT_X7A",
          providerRank: 1,
          hiddenLocatorId: "RAW_LOCATOR_X7A",
          hiddenMetadata: {
            semanticUse: "not_semantic_evidence",
            titleState: "not_collected",
            snippetState: "not_collected",
            domainState: "not_collected",
            languageState: "not_collected",
          },
          candidateStructuralStatus: "candidate_acquired",
        },
      ],
    },
  } as unknown as HiddenDirectTextCandidateAcquisitionHarnessResult;
}

function blockedX6(): HiddenDirectTextCandidateAcquisitionHarnessResult {
  return {
    ...completedX6(),
    status: "blocked",
    blockedReason: "x5_not_completed",
    candidateAcquisitionRuntime: null,
  } as unknown as HiddenDirectTextCandidateAcquisitionHarnessResult;
}

describe("Analyzer V2 hidden source-material readiness harness", () => {
  it("adapts completed X6 to source-material readiness without exposing candidate internals", () => {
    const result = runHiddenDirectTextSourceMaterialReadinessHarness({
      x6CandidateAcquisition: completedX6(),
    });

    expect(result).toMatchObject({
      harnessVersion: "v2.hidden-direct-text-source-material-readiness-harness.x7a",
      visibility: "internal_only",
      status: "completed_contract",
      sourceMaterialReadiness: {
        status: "not_ready_pre_execution",
        blockedReason: null,
        sourceMaterialStatus: "candidate_only_not_source_material",
        extractionInputStatus: "blocked_source_material_unavailable",
        evidenceCorpusStatus: "not_buildable_no_source_material",
        candidateTrace: {
          candidateAcquisitionStatus: "completed",
          candidateRuntimeStructuralStatus: "completed_structural",
          candidateRecordCount: 1,
          queryOutcomeCount: 1,
          publicCutoverStatus: "blocked_precutover",
          candidateRecordsAreSourceMaterial: false,
          hiddenLocatorsAreDereferenceable: false,
          candidateCountsAreEvidence: false,
        },
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      },
      publicEnvelope: {
        resultJson: {
          compatibility: {
            v1: {
              fallbackFields: {
                verdict: null,
                truthPercentage: null,
                confidence: null,
              },
            },
          },
        },
      },
    });

    const serializedReadiness = JSON.stringify(result.sourceMaterialReadiness);
    const serializedPublic = JSON.stringify(result.publicEnvelope.resultJson);
    for (const forbidden of [
      "RAW_QUERY_X7A",
      "RAW_ATTEMPT_X7A",
      "RAW_CANDIDATE_X7A",
      "RAW_POLICY_X7A",
      "RAW_PROVIDER_X7A",
      "RAW_LOCATOR_X7A",
      "candidateId",
      "hiddenLocatorId",
      "providerAttemptId",
      "queryText",
      "https://",
      "sourceReliability",
      "rawPayload",
    ]) {
      expect(serializedReadiness).not.toContain(forbidden);
      expect(serializedPublic).not.toContain(forbidden);
    }
  });

  it("blocks source-material readiness when X6 is blocked or public cutover is not blocked", () => {
    const blocked = runHiddenDirectTextSourceMaterialReadinessHarness({
      x6CandidateAcquisition: blockedX6(),
    });
    const publicNotBlocked = runHiddenDirectTextSourceMaterialReadinessHarness({
      x6CandidateAcquisition: completedX6(publicEnvelope("approved")),
    });

    expect(blocked).toMatchObject({
      status: "blocked_contract",
      sourceMaterialReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "candidate_acquisition_not_completed",
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      },
    });
    expect(publicNotBlocked).toMatchObject({
      status: "blocked_contract",
      sourceMaterialReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "public_cutover_not_blocked_precutover",
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      },
    });
  });

  it("has no execution path to X5, candidate acquisition, provider network, parser, or product code", () => {
    const sourcePath = path.resolve(
      process.cwd(),
      "src/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.ts",
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("runHiddenV2IntegrationHarness");
    expect(source).not.toContain("runHiddenDirectTextCandidateAcquisitionHarness");
    expect(source).not.toContain("executeSourceAcquisitionCandidateRuntime");
    expect(source).not.toContain("source-acquisition-network");
    expect(source).not.toContain("source-acquisition-content");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("@/app");
    expect(source).not.toContain("@/components");
    expect(source).not.toContain("@/lib/analyzer/");
  });
});

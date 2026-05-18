import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  buildEvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import {
  runEvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";
import {
  buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner";

function networkDecision(): SourceAcquisitionCandidateProviderNetworkLoopDecision {
  return {
    networkLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-provider-network-loop.x7w2",
    visibility: "internal_only",
    status: "candidate_provider_network_completed",
    blockedReason: null,
    damagedReason: null,
    closedLoopStatus: "closed_loop_completed_no_source_candidates",
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 1,
    retrievalPolicyCount: 1,
    sourceLanguageSignal: "present",
    productNetworkAuthorityHash: "a".repeat(64),
    runtimeContractAuthorityHash: "r".repeat(64),
    endpointSnapshotHash: "e".repeat(64),
    networkBudgetSnapshotHash: "n".repeat(64),
    providerAllowlistSnapshotHash: "p".repeat(64),
    candidateBudgetSnapshotHash: "b".repeat(64),
    runtimeStatus: "completed_structural",
    queryOutcomeSummaries: [],
    telemetry: {
      candidateRuntimeExercised: true,
      candidateProviderBoundaryInvoked: true,
      providerNetworkBoundaryInvoked: true,
      providerAttemptCount: 1,
      networkAttemptCount: 1,
      candidateCount: 1,
      totalCandidateCount: 1,
      structurallyDroppedCandidateCount: 0,
      totalDurationMs: 20,
      totalCompressedBytes: 200,
      totalDecompressedBytes: 200,
      totalBytes: 400,
      fixedDollarCost: 0,
      costReason: "no_paid_api_no_credentials",
      providerNetworkExecuted: true,
      searchFetchCalled: true,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
      networkAttempts: [],
    },
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

async function sourceMaterialDecision() {
  const candidate = {
    key: "Hydrogen_vehicle",
    title: "Hydrogen vehicle",
    excerpt: "Fuel cell vehicles use hydrogen.",
    description: "Public encyclopedia page",
  };
  const projection = buildSourceCandidatePreviewProjection({
    providerId: "wikimedia_core",
    endpointId: "ep_wikimedia_core_page_search",
    providerAttemptOrdinal: 1,
    providerRank: 1,
    candidateOrdinal: 1,
    sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
    candidate,
  });

  return runEvidenceLifecycleSourceMaterialPageSummaryDecision({
    networkDecision: networkDecision(),
    previewDecision: buildEvidenceLifecycleSourceCandidatePreviewDecision({
      networkDecision: networkDecision(),
      previewProjections: [projection],
    }),
    fetchLocators: [buildSourceMaterialPageSummaryFetchLocator({ projection, candidate })],
    lowLevelTransport: {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async () => ({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        remoteAddress: "93.184.216.34",
        body: Buffer.from("{\"extract\":\"Hydrogen vehicles store hydrogen and power an electric motor.\"}", "utf8"),
      }),
    },
  });
}

describe("Analyzer V2 W4-A runtime Source Material to EvidenceCorpus readiness owner", () => {
  it("accepts producer-owned W3-B decisions and emits text-free readiness", async () => {
    const sourceMaterial = await sourceMaterialDecision();
    const readiness = buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision({
      sourceMaterialPageSummary: sourceMaterial,
    });
    const serialized = JSON.stringify(readiness);

    expect(readiness).toMatchObject({
      status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      stopReason: "not_stopped",
      sourceMaterialRecordCount: 1,
      admittedSourceMaterialRecordCount: 1,
      extractionInput: null,
      evidenceCorpus: null,
      evidenceCorpusBuildAuthorized: false,
      evidenceItems: [],
      downstreamGate: "evidence_corpus_build_gate_closed",
    });
    expect(serialized).not.toContain("Hydrogen vehicles store hydrogen");
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("rejects copied or post-mark mutated W3-B decisions", async () => {
    const sourceMaterial = await sourceMaterialDecision();
    const jsonCopy = JSON.parse(JSON.stringify(sourceMaterial));
    const spreadCopy = { ...sourceMaterial };
    const mutated = await sourceMaterialDecision();
    (mutated as { stopReason: string }).stopReason = "source_material_structural_exception";

    for (const input of [jsonCopy, structuredClone(sourceMaterial), spreadCopy, mutated]) {
      expect(buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision({
        sourceMaterialPageSummary: input,
      })).toMatchObject({
        status: "blocked_pre_evidence_corpus_source_material_not_runtime_owned",
        stopReason: "runtime_ownership_missing",
        evidenceCorpus: null,
        evidenceCorpusBuildAuthorized: false,
        evidenceItems: [],
      });
    }
  });
});

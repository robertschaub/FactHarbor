import { describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildEvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";

function networkDecision(
  overrides: Partial<SourceAcquisitionCandidateProviderNetworkLoopDecision> = {},
): SourceAcquisitionCandidateProviderNetworkLoopDecision {
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
    ...overrides,
  };
}

const preview = buildSourceCandidatePreviewProjection({
  providerId: "wikimedia_core",
  endpointId: "ep_wikimedia_core_page_search",
  providerAttemptOrdinal: 1,
  providerRank: 1,
  candidateOrdinal: 1,
  sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
  candidate: {
    key: "Switzerland_asylum_statistics",
    title: "Asylum statistics in Switzerland",
    excerpt: "Mehr als 235 000 Personen",
    description: "Public encyclopedia page",
  },
});

describe("Analyzer V2 W3-A source-candidate preview owner", () => {
  it("builds a hidden preview decision without creating Source Material", () => {
    const decision = buildEvidenceLifecycleSourceCandidatePreviewDecision({
      networkDecision: networkDecision(),
      previewProjections: [preview],
    });

    expect(decision).toMatchObject({
      visibility: "internal_admin_only",
      status: "source_candidate_preview_materialized",
      stopReason: "not_stopped",
      candidateProviderNetworkStatus: "candidate_provider_network_completed",
      previewRecordCount: 1,
      materializedPreviewRecordCount: 1,
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
      downstreamGate: "source_candidate_preview_to_source_material_gate_closed",
      publicCutoverStatus: "blocked_precutover",
    });
    expect(JSON.stringify(decision)).not.toContain("Switzerland_asylum_statistics");
  });

  it("fails closed before completed candidate-provider network or when previews are absent", () => {
    const blocked = buildEvidenceLifecycleSourceCandidatePreviewDecision({
      networkDecision: networkDecision({
        status: "blocked_pre_candidate_provider_network",
        blockedReason: "candidate_runtime_blocked",
      }),
      previewProjections: [preview],
    });
    const absent = buildEvidenceLifecycleSourceCandidatePreviewDecision({
      networkDecision: networkDecision(),
      previewProjections: [],
    });

    expect(blocked).toMatchObject({
      status: "blocked_pre_source_candidate_preview",
      previewRecordCount: 0,
    });
    expect(absent).toMatchObject({
      status: "source_candidate_preview_damaged_structural",
      previewRecordCount: 0,
    });
  });
});

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
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-provenance";

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

async function decision() {
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

describe("Analyzer V2 W3-B Source Material runtime provenance", () => {
  it("accepts only producer-owned decisions and rejects copied variants", async () => {
    const produced = await decision();

    expect(readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(produced)).toBe(produced);
    for (const copied of [
      { ...produced },
      JSON.parse(JSON.stringify(produced)),
      structuredClone(produced),
      {
        sourceMaterialVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        status: "source_material_page_summary_completed",
      },
    ]) {
      expect(readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(copied)).toBeNull();
    }
  });

  it("rejects post-mark mutation even when the object identity is still runtime-owned", async () => {
    const produced = await decision();
    expect(readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(produced)).toBe(produced);

    (produced as { status: string }).status = "blocked_pre_source_material_page_summary";

    expect(readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(produced)).toBeNull();
  });
});

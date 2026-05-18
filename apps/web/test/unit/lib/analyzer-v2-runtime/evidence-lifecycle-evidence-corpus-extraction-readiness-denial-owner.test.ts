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
  buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner";
import {
  buildEvidenceLifecycleEvidenceCorpusShellDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner";
import {
  buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner";
import {
  buildEvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import {
  buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner";
import {
  runEvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";

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

async function shellDecision() {
  const candidate = {
    key: "Neutral_page_key",
    title: "Neutral page title",
    excerpt: "Neutral candidate excerpt.",
    description: "Public reference page",
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
  const sourceMaterial = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
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
        body: Buffer.from("{\"extract\":\"Neutral source material text for W4-E owner testing.\"}", "utf8"),
      }),
    },
  });
  const readiness = buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision({
    sourceMaterialPageSummary: sourceMaterial,
  });
  const admission = buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision({
    sourceMaterialReadiness: readiness,
  });
  return buildEvidenceLifecycleEvidenceCorpusShellDecision({
    sourceMaterialAdmission: admission,
  });
}

describe("Analyzer V2 W4-E runtime extraction-readiness denial owner", () => {
  it("accepts only producer-owned W4-D shell and emits denial-only readiness", async () => {
    const shell = await shellDecision();
    const denial = buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision({
      evidenceCorpusShell: shell,
    });
    const serialized = JSON.stringify(denial);

    expect(denial).toMatchObject({
      status: "extraction_denied_shell_only",
      stopReason: "shell_only_corpus",
      evidenceCorpusKind: "shell_only",
      corpusTextAccess: "closed",
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      extractionInput: null,
      evidenceItems: [],
      downstreamGate: "evidence_item_extraction_denied_shell_only",
      publicCutoverStatus: "blocked_precutover",
      productExecution: {
        extractionReadinessDenied: true,
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityCalled: false,
        evidenceItemGenerated: false,
        warningGenerated: false,
        reportGenerated: false,
        verdictGenerated: false,
        confidenceGenerated: false,
        publicSurfaceWritten: false,
      },
    });
    expect(serialized).not.toContain("Neutral source material text");
    expect(serialized).not.toContain("truthPercentage");
    expect(serialized).not.toContain("reportMarkdown");
  });

  it("rejects copied and post-mark mutated W4-D shell decisions", async () => {
    const shell = await shellDecision();
    expect(buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision({
      evidenceCorpusShell: JSON.parse(JSON.stringify(shell)),
    })).toMatchObject({
      status: "extraction_denied_corpus_not_runtime_owned",
      stopReason: "runtime_ownership_missing",
      extractionInput: null,
      evidenceItems: [],
    });

    (shell as { stopReason: string }).stopReason = "structural_exception";
    expect(buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision({
      evidenceCorpusShell: shell,
    })).toMatchObject({
      status: "extraction_denied_corpus_post_mark_mutated",
      stopReason: "corpus_post_mark_mutated",
      extractionInput: null,
      evidenceItems: [],
    });
  });
});

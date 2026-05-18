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

async function sourceMaterialDecision() {
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
        body: Buffer.from("{\"extract\":\"Neutral source material text for shell owner testing.\"}", "utf8"),
      }),
    },
  });
}

async function admissionDecision() {
  const sourceMaterial = await sourceMaterialDecision();
  const readiness = buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision({
    sourceMaterialPageSummary: sourceMaterial,
  });
  return {
    sourceMaterial,
    readiness,
    admission: buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision({
      sourceMaterialReadiness: readiness,
    }),
  };
}

describe("Analyzer V2 W4-D runtime EvidenceCorpus shell owner", () => {
  it("accepts only producer-owned W4-C admission and emits a text-free shell", async () => {
    const { admission } = await admissionDecision();
    const shell = buildEvidenceLifecycleEvidenceCorpusShellDecision({
      sourceMaterialAdmission: admission,
    });
    const serialized = JSON.stringify(shell);

    expect(shell).toMatchObject({
      status: "evidence_corpus_shell_created_extraction_gate_closed",
      stopReason: "not_stopped",
      sourceMaterialRecordCount: 1,
      evidenceItems: [],
      extractionInput: null,
      evidenceItemExtractionAuthorized: false,
      downstreamGate: "evidence_item_extraction_gate_closed",
      publicCutoverStatus: "blocked_precutover",
      productExecution: {
        evidenceCorpusShellCreated: true,
        semanticExtractionAuthorized: false,
        evidenceItemExtractionAuthorized: false,
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
    expect(shell.evidenceCorpus).toMatchObject({
      kind: "shell_only",
      corpusTextAccess: "closed",
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      providerIds: ["wikimedia_core"],
      languageCodes: ["en"],
    });
    expect(serialized).not.toContain("Neutral source material text");
    expect(serialized).not.toContain("Neutral_page_key");
    expect(serialized).not.toContain("truthPercentage");
    expect(serialized).not.toContain("reportMarkdown");
  });

  it("rejects direct W3-B Source Material, W4-A readiness, and copied W4-C admission", async () => {
    const { sourceMaterial, readiness, admission } = await admissionDecision();
    const cases = [
      [sourceMaterial, "blocked_pre_evidence_corpus_admission_absent", "w4c_not_completed"],
      [readiness, "blocked_pre_evidence_corpus_admission_absent", "w4c_not_completed"],
      [
        JSON.parse(JSON.stringify(admission)),
        "blocked_pre_evidence_corpus_admission_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        structuredClone(admission),
        "blocked_pre_evidence_corpus_admission_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        { ...admission },
        "blocked_pre_evidence_corpus_admission_not_runtime_owned",
        "runtime_ownership_missing",
      ],
    ];

    for (const [sourceMaterialAdmission, status, stopReason] of cases) {
      expect(buildEvidenceLifecycleEvidenceCorpusShellDecision({
        sourceMaterialAdmission,
      })).toMatchObject({
        status,
        stopReason,
        evidenceCorpus: null,
        evidenceItems: [],
        extractionInput: null,
        evidenceItemExtractionAuthorized: false,
      });
    }
  });

  it("rejects post-mark mutated W4-C admission distinctly", async () => {
    const { admission } = await admissionDecision();
    (admission as { stopReason: string }).stopReason = "structural_exception";

    expect(buildEvidenceLifecycleEvidenceCorpusShellDecision({
      sourceMaterialAdmission: admission,
    })).toMatchObject({
      status: "blocked_pre_evidence_corpus_admission_mutated_after_provenance",
      stopReason: "admission_post_mark_mutated",
      evidenceCorpus: null,
      evidenceItems: [],
      extractionInput: null,
      evidenceItemExtractionAuthorized: false,
    });
  });
});

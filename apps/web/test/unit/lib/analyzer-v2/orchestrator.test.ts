import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimUnderstandingRuntimeState } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import type { EvidenceQueryPlanningResult } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  clearEvidenceQueryPlanningRuntimeArtifacts,
  readEvidenceQueryPlanningRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink";
import {
  clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink";
import {
  clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink";
import {
  clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts,
  readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink";
import {
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts,
  readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink";
import {
  clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts,
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink";
import {
  clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts,
  readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink";
import {
  clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts,
  readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink";

function claimContract(): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      currentDate: "2026-05-17",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz.",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "One selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedClaimUnderstandingState(): ClaimUnderstandingRuntimeState {
  return {
    stageVersion: "v2.claim-understanding.runtime-stage.0",
    visibility: "internal_only",
    inputSource: "direct_input",
    status: "runtime_dispatch_completed",
    result: {
      schemaVersion: "v2.claim_understanding_result.0",
      status: "accepted",
      claimContract: claimContract(),
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    blockedReason: null,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    runtimeDispatchStatus: "completed",
    runtimeDispatchBlockedReason: null,
    cacheEligibility: "runtime_no_store",
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
    },
  };
}

function acceptedQueryPlanningResult(): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_001",
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "needed",
        rationale: "Use German first; supplementary language may improve coverage.",
      },
      queries: [
        {
          queryId: "EQ_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "Asylbereich Schweiz 235000 Personen Statistik",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Baseline query for the selected AtomicClaim.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function candidateProviderNetworkDecision(): SourceAcquisitionCandidateProviderNetworkLoopDecision {
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
    queryOutcomeSummaries: [
      {
        ordinal: 1,
        candidateProviderNetworkQueryRef: "W2Q_001",
        status: "attempted",
        structuralReason: "not_stopped",
        providerAttemptObserved: true,
        candidateCount: 3,
      },
    ],
    telemetry: {
      candidateRuntimeExercised: true,
      candidateProviderBoundaryInvoked: true,
      providerNetworkBoundaryInvoked: true,
      providerAttemptCount: 1,
      networkAttemptCount: 1,
      candidateCount: 3,
      totalCandidateCount: 5,
      structurallyDroppedCandidateCount: 2,
      totalDurationMs: 42,
      totalCompressedBytes: 2048,
      totalDecompressedBytes: 4096,
      totalBytes: 6144,
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
      networkAttempts: [
        {
          telemetryVersion: "v2.source-acquisition.provider-network-attempt-telemetry.7n3b2-t1",
          visibility: "internal_only",
          providerId: "wikimedia_core",
          endpointId: "ep_wikimedia_core_page_search",
          attemptOrdinal: 1,
          structuralStatus: "success",
          stopReason: "not_stopped",
          durationMs: 42,
          timeoutMs: 1500,
          dnsAddressCount: 1,
          selectedAddressFamily: "ipv4",
          finalAddressValidation: "matched_validated_public_address",
          responseStatusCodeCategory: "success_2xx",
          contentTypeState: "accepted_json",
          transportFailureClass: "not_applicable",
          transportFailurePhase: "not_applicable",
          transportErrorShape: "not_applicable",
          nodeErrorCodeCategory: "none",
          candidateCount: 5,
          compressedBytes: 2048,
          decompressedBytes: 4096,
          byteCountState: "observed",
          rawPayloadIncluded: false,
          secretIncluded: false,
          publicPayloadIncluded: false,
          errorTraceIncluded: false,
        },
      ],
    },
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function sourceCandidatePreviewProjection() {
  return buildSourceCandidatePreviewProjection({
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
}

function sourceMaterialPageSummaryDecision() {
  return {
    sourceMaterialVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_page_summary_completed",
    stopReason: "not_stopped",
    candidateProviderNetworkStatus: "candidate_provider_network_completed",
    sourceCandidatePreviewStatus: "source_candidate_preview_materialized",
    sourceCandidatePreviewRecordCount: 1,
    materializedPreviewRecordCount: 1,
    attemptedFetchCount: 1,
    sourceMaterialRecordCount: 1,
    fetchDiagnosticCount: 0,
    sourceMaterialRecords: [],
    fetchDiagnostics: [],
    sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
    locatorVersion: "v2.evidence-lifecycle.source-material.page-summary-fetch-locator.x7w3b",
    extractionInput: null,
    evidenceCorpus: null,
    evidenceItems: [],
    productExecution: {
      candidateProviderNetworkObserved: true,
      sourceCandidatePreviewObserved: true,
      extraHttpCallMade: true,
      contentDereferenceCalled: true,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: true,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    downstreamGate: "source_material_to_evidence_corpus_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  } as const;
}

function sourceMaterialEvidenceCorpusReadinessDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
    stopReason: "not_stopped",
    parent: {
      w2Status: "candidate_provider_network_completed",
      w3aStatus: "source_candidate_preview_materialized",
      w3bStatus: "source_material_page_summary_completed",
      w3bVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
      w3bStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    admittedSourceMaterialRecordCount: 1,
    rejectedSourceMaterialRecordCount: 0,
    sourceMaterialRecord: {
      sourceMaterialId: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 90,
      sourceMaterialTextCharLength: 90,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
    },
    extractionInput: null,
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
    productExecution: {
      sourceMaterialReadinessObserved: true,
      sourceMaterialCreated: true,
      evidenceCorpusBuildAuthorized: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    downstreamGate: "evidence_corpus_build_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  } as const;
}

function evidenceCorpusSourceMaterialAdmissionDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_admitted_to_corpus_input_gate_closed",
    stopReason: "not_stopped",
    parent: {
      readinessDecisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
      readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      readinessStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    admittedCorpusAdmissionInputCount: 1,
    rejectedCorpusAdmissionInputCount: 0,
    corpusAdmissionInput: {
      inputVersion: "v2.evidence-lifecycle.evidence-corpus-admission-input.x7w4c",
      corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 90,
      sourceMaterialTextCharLength: 90,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
      truncationApplied: false,
      sourceMaterialRecordCount: 1,
      readinessDecisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
      readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      readinessStopReason: "not_stopped",
      downstreamExecution: {
        evidenceCorpusBuildAuthorized: false,
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityCalled: false,
        evidenceCorpusCreated: false,
        evidenceItemGenerated: false,
        warningGenerated: false,
        reportGenerated: false,
        verdictGenerated: false,
        confidenceGenerated: false,
        publicSurfaceWritten: false,
      },
    },
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
    extractionInput: null,
    downstreamGate: "evidence_corpus_construction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      sourceMaterialReadinessObserved: true,
      corpusAdmissionInputCreated: true,
      evidenceCorpusBuildAuthorized: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  } as const;
}

function evidenceCorpusShellDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "evidence_corpus_shell_created_extraction_gate_closed",
    stopReason: "not_stopped",
    parent: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      admissionStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    evidenceCorpus: {
      shellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
      evidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      kind: "shell_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      sourceMaterialRefs: ["SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF"],
      locatorRefs: ["OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456"],
      candidatePreviewIds: ["SOURCE_CANDIDATE_PREVIEW_1_1"],
      providerIds: ["wikimedia_core"],
      sourceMaterialEndpointIds: ["ep_wikimedia_project_page_summary"],
      languageCodes: ["en"],
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
      sourceMaterialTextHashes: ["0".repeat(64)],
      aggregateSourceMaterialTextByteLength: 90,
      aggregateSourceMaterialTextCharLength: 90,
      admissionLineage: {
        admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
        admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
        admissionStopReason: "not_stopped",
        corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
      },
      readinessLineage: {
        readinessDecisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
        readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
        readinessStopReason: "not_stopped",
      },
      corpusTextAccess: "closed",
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      downstreamExecution: {
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
    },
    evidenceItems: [],
    extractionInput: null,
    semanticExtractionAuthorized: false,
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
  } as const;
}

function evidenceCorpusExtractionReadinessDenialDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "extraction_denied_shell_only",
    stopReason: "shell_only_corpus",
    parent: {
      shellDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
      shellStatus: "evidence_corpus_shell_created_extraction_gate_closed",
      shellStopReason: "not_stopped",
      shellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
      evidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
    },
    parentAdmissionLineage: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
    },
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
  } as const;
}

describe("Analyzer V2 orchestrator X7-S Query Planning product-internal execution", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/analyzer-v2/claim-understanding/runtime-stage");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory");
    vi.doUnmock("@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner");
    vi.resetModules();
  });

  it("executes hidden Query Planning only when CU is accepted, X7-O is observed, and X7-S activation is open", async () => {
    let providerCalls = 0;
    const ledgerId = "job-v2-x7s-orchestrator:precutover-observability";
    clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(ledgerId);
    vi.resetModules();
    vi.doMock("@/lib/analyzer-v2/claim-understanding/runtime-stage", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/analyzer-v2/claim-understanding/runtime-stage")>()),
      runClaimUnderstandingRuntimeStage: vi.fn(async () => acceptedClaimUnderstandingState()),
    }));
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory", () => ({
      buildEvidenceQueryPlanningProviderFactory: vi.fn((snapshot) => ({
        factoryVersion: "v2.evidence-query-planning.provider-factory.x7s",
        factorySourcePath: "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts",
        configSnapshotHash: snapshot.configSnapshotHash,
        providerId: "anthropic",
        modelId: snapshot.modelId,
        providerCall: vi.fn(async () => {
          providerCalls += 1;
          return {
            output: acceptedQueryPlanningResult(),
            telemetry: {
              providerId: "anthropic",
              modelId: snapshot.modelId,
              inputTokens: 100,
              outputTokens: 50,
              totalTokens: 150,
              durationMs: 80,
            },
          };
        }),
      })),
    }));
    vi.doMock("@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop", () => ({
      runSourceAcquisitionCandidateProviderNetworkLoop: vi.fn(async (
        params: {
          candidatePreviewProjectionSink?: (projection: ReturnType<typeof sourceCandidatePreviewProjection>) => void;
          sourceMaterialPageSummaryFetchLocatorSink?: (locator: unknown) => void;
        },
      ) => {
        params.candidatePreviewProjectionSink?.(sourceCandidatePreviewProjection());
        params.sourceMaterialPageSummaryFetchLocatorSink?.({
          eligibility: "eligible_for_w3b_fetch",
          locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_TEST",
          candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
          encodedTitlePathSegment: "Hydrogen_vehicle",
        });
        return candidateProviderNetworkDecision();
      }),
    }));
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner", () => ({
      runEvidenceLifecycleSourceMaterialPageSummaryDecision: vi.fn(async () => sourceMaterialPageSummaryDecision()),
    }));
    vi.doMock(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner",
      () => ({
        buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision:
          vi.fn(() => sourceMaterialEvidenceCorpusReadinessDecision()),
      }),
    );
    vi.doMock(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner",
      () => ({
        buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision:
          vi.fn(() => evidenceCorpusSourceMaterialAdmissionDecision()),
      }),
    );
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner", () => ({
      buildEvidenceLifecycleEvidenceCorpusShellDecision: vi.fn(() => evidenceCorpusShellDecision()),
    }));
    vi.doMock(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner",
      () => ({
        buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision:
          vi.fn(() => evidenceCorpusExtractionReadinessDenialDecision()),
      }),
    );

    const { runClaimBoundaryPipelineV2 } = await import("@/lib/analyzer-v2/orchestrator");
    const result = await runClaimBoundaryPipelineV2(
      {
        runIdHint: "job-v2-x7s-orchestrator",
        submitted: {
          kind: "text",
          value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: ["AC_001"],
      },
      {
        now: () => new Date("2026-05-17T12:45:00.000Z"),
        runtimeActivationStatus: "enabled_hidden_direct_text",
        queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
      },
    );
    const artifacts = readEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    const sourceAcquisitionIntakeArtifacts = readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId);
    const candidateAdmissionArtifacts =
      readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId);
    const candidateClosedLoopArtifacts =
      readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId);
    const candidateProviderNetworkArtifacts =
      readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId);
    const sourceCandidatePreviewArtifacts =
      readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId);
    const sourceMaterialPageSummaryArtifacts =
      readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(ledgerId);
    const sourceMaterialEvidenceCorpusReadinessArtifacts =
      readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(ledgerId);
    const evidenceCorpusObservabilityArtifacts =
      readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(ledgerId);
    const serializedPublic = JSON.stringify(result.resultJson);

    expect(providerCalls).toBe(1);
    expect(artifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        activation: expect.objectContaining({
          status: "enabled_hidden_direct_text",
        }),
        runtime: expect.objectContaining({
          status: "completed",
          resultStatus: "accepted",
        }),
        selectedAtomicClaimIds: ["AC_001"],
        sourceLanguagePolicy: expect.objectContaining({
          primaryLanguage: "de",
        }),
        sourceAcquisitionHandoff: expect.objectContaining({
          status: "ready_not_executable",
          executionScope: "not_executable",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          modelCalled: true,
          providerSearchFetchCalled: false,
          sourceAcquisitionExecuted: false,
          parserExecuted: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(sourceAcquisitionIntakeArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        sourceAcquisitionIntake: expect.objectContaining({
          status: "intake_ready_not_executable",
          blockedReason: null,
          handoffStatus: "ready_not_executable",
          requestStatus: "source_acquisition_ready_not_executable",
          queryEntryCount: 1,
          sourceLanguageSignal: "present",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          sourceAcquisitionIntakeObserved: true,
          sourceAcquisitionExecuted: false,
          providerNetworkExecuted: false,
          searchFetchCalled: false,
          contentDereferenceCalled: false,
          parserExecuted: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(candidateAdmissionArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        candidateRuntimeAdmission: expect.objectContaining({
          status: "admission_ready_no_runtime_execution",
          blockedReason: null,
          handoffStatus: "ready_not_executable",
          requestStatus: "source_acquisition_ready_not_executable",
          intakeStatus: "intake_ready_not_executable",
          queryEntryCount: 1,
          sourceLanguageSignal: "present",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          sourceAcquisitionIntakeObserved: true,
          candidateRuntimeAdmissionObserved: true,
          candidateRuntimeExecuted: false,
          candidateProviderInvoked: false,
          providerNetworkExecuted: false,
          searchFetchCalled: false,
          contentDereferenceCalled: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 0,
          candidateCount: 0,
          bytesRead: 0,
        }),
      }),
    ]);
    expect(candidateClosedLoopArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        candidateRuntimeClosedLoop: expect.objectContaining({
          status: "closed_loop_completed_no_source_candidates",
          blockedReason: null,
          damagedReason: null,
          admissionStatus: "admission_ready_no_runtime_execution",
          handoffStatus: "ready_not_executable",
          requestStatus: "source_acquisition_ready_not_executable",
          intakeStatus: "intake_ready_not_executable",
          queryEntryCount: 1,
          sourceLanguageSignal: "present",
          runtimeStatus: "completed_structural",
          queryOutcomeSummaries: [
            expect.objectContaining({
              closedLoopQueryRef: "CLQ_001",
              status: "failed",
              structuralReason: "provider_failure",
              providerAttemptObserved: true,
              candidateCount: 0,
            }),
          ],
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: true,
          sourceAcquisitionIntakeObserved: true,
          candidateRuntimeAdmissionObserved: true,
          candidateRuntimeClosedLoopObserved: true,
          candidateRuntimeExecuted: true,
          closedProviderBoundaryInvoked: true,
          providerNetworkExecuted: false,
          searchFetchCalled: false,
          contentDereferenceCalled: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 1,
          candidateCount: 0,
          bytesRead: 0,
        }),
      }),
    ]);
    expect(JSON.stringify(candidateClosedLoopArtifacts)).not.toContain("Asylbereich Schweiz 235000");
    expect(JSON.stringify(candidateClosedLoopArtifacts)).not.toContain("queryText");
    expect(JSON.stringify(candidateClosedLoopArtifacts)).not.toContain("queryId");
    expect(JSON.stringify(candidateClosedLoopArtifacts)).not.toContain("providerAttemptId");
    expect(candidateProviderNetworkArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        candidateProviderNetwork: expect.objectContaining({
          status: "candidate_provider_network_completed",
          blockedReason: null,
          damagedReason: null,
          queryEntryCount: 1,
          downstreamGate: "candidate_to_source_material_gate_closed",
        }),
        productExecution: expect.objectContaining({
          candidateProviderNetworkObserved: true,
          candidateRuntimeExecuted: true,
          providerNetworkExecuted: true,
          searchFetchCalled: true,
          contentDereferenceCalled: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          fixedDollarCost: 0,
        }),
      }),
    ]);
    expect(JSON.stringify(candidateProviderNetworkArtifacts)).not.toContain("Asylbereich Schweiz 235000");
    expect(JSON.stringify(candidateProviderNetworkArtifacts)).not.toContain("queryText");
    expect(JSON.stringify(candidateProviderNetworkArtifacts)).not.toContain("queryId");
    expect(JSON.stringify(candidateProviderNetworkArtifacts)).not.toContain("providerAttemptId");
    expect(JSON.stringify(candidateProviderNetworkArtifacts)).not.toContain("confidence");
    expect(JSON.stringify(candidateProviderNetworkArtifacts)).not.toContain("cacheKey");
    expect(sourceCandidatePreviewArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        sourceCandidatePreview: expect.objectContaining({
          status: "source_candidate_preview_materialized",
          previewRecordCount: 1,
          sourceMaterial: null,
          evidenceCorpus: null,
          downstreamGate: "source_candidate_preview_to_source_material_gate_closed",
        }),
        productExecution: expect.objectContaining({
          sourceCandidatePreviewObserved: true,
          extraHttpCallMade: false,
          contentDereferenceCalled: false,
          parserExecuted: false,
          sourceMaterialCreated: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(JSON.stringify(sourceCandidatePreviewArtifacts)).not.toContain("Switzerland_asylum_statistics");
    expect(JSON.stringify(sourceCandidatePreviewArtifacts)).not.toContain("https://example.invalid");
    expect(JSON.stringify(sourceCandidatePreviewArtifacts)).not.toContain("sk_test");
    expect(sourceMaterialPageSummaryArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        sourceMaterialPageSummary: expect.objectContaining({
          status: "source_material_page_summary_completed",
          sourceMaterialRecordCount: 1,
          extractionInput: null,
          evidenceCorpus: null,
          downstreamGate: "source_material_to_evidence_corpus_gate_closed",
        }),
        productExecution: expect.objectContaining({
          pageSummaryFetchObserved: true,
          extraHttpCallMade: true,
          contentDereferenceCalled: true,
          parserExecuted: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(sourceMaterialEvidenceCorpusReadinessArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        sourceMaterialEvidenceCorpusReadiness: expect.objectContaining({
          status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
          sourceMaterialRecordCount: 1,
          extractionInput: null,
          evidenceCorpus: null,
          evidenceCorpusBuildAuthorized: false,
          evidenceItems: [],
          downstreamGate: "evidence_corpus_build_gate_closed",
        }),
        productExecution: expect.objectContaining({
          sourceMaterialReadinessObserved: true,
          sourceMaterialCreated: true,
          evidenceCorpusBuildAuthorized: false,
          parserExecuted: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(evidenceCorpusObservabilityArtifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        evidenceCorpusSourceMaterialAdmission: expect.objectContaining({
          status: "source_material_admitted_to_corpus_input_gate_closed",
          evidenceCorpus: null,
          extractionInput: null,
          evidenceItems: [],
        }),
        evidenceCorpusShell: expect.objectContaining({
          status: "evidence_corpus_shell_created_extraction_gate_closed",
          evidenceCorpus: expect.objectContaining({
            kind: "shell_only",
            corpusTextAccess: "closed",
          }),
          extractionInput: null,
          evidenceItems: [],
        }),
        evidenceCorpusExtractionReadinessDenial: expect.objectContaining({
          status: "extraction_denied_shell_only",
          stopReason: "shell_only_corpus",
          extractionInput: null,
          evidenceItems: [],
        }),
        productExecution: expect.objectContaining({
          corpusAdmissionObserved: true,
          evidenceCorpusShellObserved: true,
          extractionReadinessDenialObserved: true,
          sourceTextAuthorized: false,
          extractionInputCreated: false,
          evidenceItemGenerated: false,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    expect(JSON.stringify(evidenceCorpusObservabilityArtifacts)).not.toContain("Hydrogen_vehicle");
    expect(JSON.stringify(evidenceCorpusObservabilityArtifacts)).not.toContain("Neutral source material text");
    expect(JSON.stringify(evidenceCorpusObservabilityArtifacts)).not.toContain("reportMarkdown");
    expect(JSON.stringify(evidenceCorpusObservabilityArtifacts)).not.toContain("truthPercentage");
    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        publicCutoverStatus: "blocked_precutover",
      },
      qualityGates: {
        damagedReport: true,
      },
    });
    expect(serializedPublic).not.toContain("evidence_query_planning");
    expect(serializedPublic).not.toContain("source_acquisition_intake");
    expect(serializedPublic).not.toContain("Asylbereich Schweiz 235000");
    expect(serializedPublic).not.toContain("job-v2-x7s-orchestrator:precutover-observability");
  });

  it("records ClaimContract-selected ids in hidden Query Planning artifacts for direct ingress without selected ids", async () => {
    const ledgerId = "job-v2-x7s-direct-no-selected:precutover-observability";
    clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId);
    vi.resetModules();
    vi.doMock("@/lib/analyzer-v2/claim-understanding/runtime-stage", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/analyzer-v2/claim-understanding/runtime-stage")>()),
      runClaimUnderstandingRuntimeStage: vi.fn(async () => acceptedClaimUnderstandingState()),
    }));
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory", () => ({
      buildEvidenceQueryPlanningProviderFactory: vi.fn((snapshot) => ({
        factoryVersion: "v2.evidence-query-planning.provider-factory.x7s",
        factorySourcePath: "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts",
        configSnapshotHash: snapshot.configSnapshotHash,
        providerId: "anthropic",
        modelId: snapshot.modelId,
        providerCall: vi.fn(async () => ({
          output: acceptedQueryPlanningResult(),
          telemetry: {
            providerId: "anthropic",
            modelId: snapshot.modelId,
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
            durationMs: 80,
          },
        })),
      })),
    }));
    vi.doMock("@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop", () => ({
      runSourceAcquisitionCandidateProviderNetworkLoop: vi.fn(async (
        params: { candidatePreviewProjectionSink?: (projection: ReturnType<typeof sourceCandidatePreviewProjection>) => void },
      ) => {
        params.candidatePreviewProjectionSink?.(sourceCandidatePreviewProjection());
        return candidateProviderNetworkDecision();
      }),
    }));

    const { runClaimBoundaryPipelineV2 } = await import("@/lib/analyzer-v2/orchestrator");
    await runClaimBoundaryPipelineV2(
      {
        runIdHint: "job-v2-x7s-direct-no-selected",
        submitted: {
          kind: "text",
          value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: [],
      },
      {
        now: () => new Date("2026-05-17T13:05:00.000Z"),
        runtimeActivationStatus: "enabled_hidden_direct_text",
        queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
      },
    );

    const artifacts = readEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    const sourceAcquisitionIntakeArtifacts = readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId);
    const candidateAdmissionArtifacts =
      readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId);
    const candidateClosedLoopArtifacts =
      readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId);
    const candidateProviderNetworkArtifacts =
      readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId);
    const sourceCandidatePreviewArtifacts =
      readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId);
    expect(artifacts[0]).toMatchObject({
      selectedAtomicClaimIds: ["AC_001"],
      sourceAcquisitionHandoff: {
        status: "ready_not_executable",
        blockedReason: null,
        executionScope: "not_executable",
      },
      productExecution: expect.objectContaining({
        sourceAcquisitionExecuted: false,
        parserExecuted: false,
        publicSurfaceWritten: false,
      }),
    });
    expect(artifacts[0]?.queryEntries).toEqual([
      expect.objectContaining({
        targetAtomicClaimIds: ["AC_001"],
      }),
    ]);
    expect(sourceAcquisitionIntakeArtifacts[0]).toMatchObject({
      sourceAcquisitionIntake: {
        status: "intake_ready_not_executable",
        blockedReason: null,
        selectedAtomicClaimCount: 1,
        queryEntryCount: 1,
        sourceLanguageSignal: "present",
      },
      productExecution: expect.objectContaining({
        sourceAcquisitionExecuted: false,
        providerNetworkExecuted: false,
        parserExecuted: false,
        publicSurfaceWritten: false,
      }),
    });
    expect(candidateAdmissionArtifacts[0]).toMatchObject({
      candidateRuntimeAdmission: {
        status: "admission_ready_no_runtime_execution",
        blockedReason: null,
        selectedAtomicClaimCount: 1,
        queryEntryCount: 1,
        sourceLanguageSignal: "present",
      },
      productExecution: expect.objectContaining({
        candidateRuntimeExecuted: false,
        candidateProviderInvoked: false,
        providerNetworkExecuted: false,
        parserExecuted: false,
        publicSurfaceWritten: false,
        providerAttemptCount: 0,
        candidateCount: 0,
        bytesRead: 0,
      }),
    });
    expect(candidateClosedLoopArtifacts[0]).toMatchObject({
      candidateRuntimeClosedLoop: {
        status: "closed_loop_completed_no_source_candidates",
        blockedReason: null,
        selectedAtomicClaimCount: 1,
        queryEntryCount: 1,
        sourceLanguageSignal: "present",
      },
      productExecution: expect.objectContaining({
        candidateRuntimeExecuted: true,
        closedProviderBoundaryInvoked: true,
        providerNetworkExecuted: false,
        parserExecuted: false,
        publicSurfaceWritten: false,
        providerAttemptCount: 1,
        candidateCount: 0,
        bytesRead: 0,
      }),
    });
    expect(candidateProviderNetworkArtifacts[0]).toMatchObject({
      candidateProviderNetwork: {
        status: "candidate_provider_network_completed",
        blockedReason: null,
        selectedAtomicClaimCount: 1,
        queryEntryCount: 1,
        sourceLanguageSignal: "present",
      },
      productExecution: expect.objectContaining({
        candidateRuntimeExecuted: true,
        providerNetworkExecuted: true,
        searchFetchCalled: true,
        contentDereferenceCalled: false,
        parserExecuted: false,
        publicSurfaceWritten: false,
        providerAttemptCount: 1,
        candidateCount: 3,
        fixedDollarCost: 0,
      }),
    });
    expect(sourceCandidatePreviewArtifacts[0]).toMatchObject({
      sourceCandidatePreview: {
        status: "source_candidate_preview_materialized",
        previewRecordCount: 1,
        sourceMaterial: null,
        evidenceCorpus: null,
      },
      productExecution: expect.objectContaining({
        extraHttpCallMade: false,
        contentDereferenceCalled: false,
        parserExecuted: false,
        publicSurfaceWritten: false,
      }),
    });
  });

  it("does not invoke Query Planning when X7-S activation is closed", async () => {
    let factoryCalls = 0;
    const ledgerId = "job-v2-x7s-closed:precutover-observability";
    clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId);
    vi.resetModules();
    vi.doMock("@/lib/analyzer-v2/claim-understanding/runtime-stage", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/analyzer-v2/claim-understanding/runtime-stage")>()),
      runClaimUnderstandingRuntimeStage: vi.fn(async () => acceptedClaimUnderstandingState()),
    }));
    vi.doMock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory", () => ({
      buildEvidenceQueryPlanningProviderFactory: vi.fn(() => {
        factoryCalls += 1;
        throw new Error("closed activation must not create provider factory");
      }),
    }));

    const { runClaimBoundaryPipelineV2 } = await import("@/lib/analyzer-v2/orchestrator");
    await runClaimBoundaryPipelineV2(
      {
        runIdHint: "job-v2-x7s-closed",
        submitted: {
          kind: "text",
          value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: ["AC_001"],
      },
      {
        now: () => new Date("2026-05-17T12:50:00.000Z"),
        runtimeActivationStatus: "enabled_hidden_direct_text",
      },
    );

    expect(factoryCalls).toBe(0);
    expect(readEvidenceQueryPlanningRuntimeArtifacts(ledgerId)).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId)).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId)).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId)).toEqual([]);
    expect(readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId)).toEqual([]);
    expect(readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId)).toEqual([]);
  });
});

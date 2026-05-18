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

describe("Analyzer V2 orchestrator X7-S Query Planning product-internal execution", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/analyzer-v2/claim-understanding/runtime-stage");
    vi.doUnmock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory");
    vi.doUnmock("@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop");
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
    clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId);
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
      runSourceAcquisitionCandidateProviderNetworkLoop: vi.fn(async () => candidateProviderNetworkDecision()),
    }));

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
      runSourceAcquisitionCandidateProviderNetworkLoop: vi.fn(async () => candidateProviderNetworkDecision()),
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
  });

  it("does not invoke Query Planning when X7-S activation is closed", async () => {
    let factoryCalls = 0;
    const ledgerId = "job-v2-x7s-closed:precutover-observability";
    clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId);
    clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId);
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
  });
});

import { describe, expect, it } from "vitest";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import type {
  HiddenDirectTextCandidateAcquisitionHarnessResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";
import {
  markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance";
import {
  ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION,
  buildHiddenDirectTextSourceAcquisitionExecutionGate,
  type HiddenDirectTextSourceAcquisitionExecutionGateRequest,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate";
import {
  buildHiddenDirectTextSourceAcquisitionReadinessComposition,
  type HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import {
  createSourceAcquisitionNetworkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  sourceAcquisitionNetworkApproval,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";
import {
  createSourceAcquisitionRuntimeAuthority,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";

function publicEnvelope(): ClaimBoundaryV2Envelope {
  return {
    resultJson: {
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        publicCutoverStatus: "blocked_precutover",
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
    reportMarkdown: "RAW_REPORT_X7F",
  };
}

function completedX6(): HiddenDirectTextCandidateAcquisitionHarnessResult {
  return markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({
    harnessVersion: "v2.hidden-direct-text-candidate-acquisition-harness.x6",
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    publicEnvelope: publicEnvelope(),
    x5Integration: { raw: "RAW_X5_X7F" },
    candidateAcquisitionRuntime: {
      version: "v2.source-acquisition.candidate-runtime.7n3b1",
      visibility: "internal_only",
      status: "completed_structural",
      stopReason: "not_stopped",
      queryOutcomes: [
        {
          queryId: "RAW_QUERY_X7F",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptId: "RAW_ATTEMPT_X7F",
          candidateCount: 1,
        },
      ],
      candidates: [
        {
          candidateId: "RAW_CANDIDATE_X7F",
          queryId: "RAW_QUERY_X7F",
          retrievalPolicyKey: "RAW_POLICY_X7F",
          providerId: "RAW_PROVIDER_X7F",
          providerAttemptId: "RAW_ATTEMPT_X7F",
          providerRank: 1,
          hiddenLocatorId: "RAW_LOCATOR_X7F",
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
  } as unknown as HiddenDirectTextCandidateAcquisitionHarnessResult);
}

function blockedX6(): HiddenDirectTextCandidateAcquisitionHarnessResult {
  return markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({
    ...completedX6(),
    status: "blocked",
    blockedReason: "x5_not_completed",
    candidateAcquisitionRuntime: null,
  } as unknown as HiddenDirectTextCandidateAcquisitionHarnessResult);
}

function parentAuthoritySnapshot(): SourceAcquisitionRuntimeAuthoritySnapshot {
  return {
    kind: "source_acquisition_runtime_authority_7n3a",
    source: "v2_7n3a_source_io_authority_boundary_package",
    authorityVersion: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
    packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
    approval: {
      status: "approved_7n3a_authority_contract_only",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
      packageCommit: "8b4035cc",
      approvedScope: "authority_boundary_contracts_only",
    },
    visibility: "internal_only",
    configSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "runtime_owner_contract",
      configSnapshotHash: "config-hash-x7f",
      providerAllowlistSnapshotHash: "allowlist-hash-x7f",
      budgetSnapshotHash: "budget-hash-x7f",
      executionState: "not_executable_authority_contract_only",
    },
    capabilityScope: {
      concreteProviderIo: false,
      providerSdk: false,
      searchFetch: false,
      network: false,
      parser: false,
      urlDereference: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      evidenceCorpusPopulation: false,
      semanticInterpretation: false,
    },
    futureGate: "requires_7n3b_concrete_io_gate",
  };
}

function endpoint(
  overrides: Partial<SourceAcquisitionNetworkEndpointSnapshot> = {},
): SourceAcquisitionNetworkEndpointSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    endpointSnapshotHash: "endpoint-hash-x7f",
    providerId: "test_provider",
    endpointId: "ep_candidate_search",
    canonicalAsciiHostname: "search.example.com",
    protocol: "https",
    port: 443,
    path: "/candidate-search",
    method: "GET",
    allowedRequestParameters: [{ key: "q", valueSource: "query_text" }],
    allowedRequestHeaders: [{ key: "accept", valueSource: "application_json" }],
    credentialsState: "not_required",
    redirectPolicy: "deny",
    proxyPolicy: "none",
    responseContentTypePolicy: { allowedContentTypes: ["application/json"] },
    responseSniffPolicy: "json_object_or_array",
    responseCandidatePointer: { kind: "object_array_field", fieldName: "items" },
    decompressionPolicy: "identity_only",
    compressedByteCap: 4096,
    decompressedByteCap: 4096,
    totalByteCap: 4096,
    timeoutMs: 250,
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
    ...overrides,
  };
}

function budget(
  overrides: Partial<SourceAcquisitionNetworkBudgetSnapshot> = {},
): SourceAcquisitionNetworkBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    networkBudgetSnapshotHash: "network-budget-hash-x7f",
    endpointSnapshotHash: "endpoint-hash-x7f",
    candidateRuntimeConfigSnapshotHash: "config-hash-x7f",
    candidateRuntimeProviderAllowlistSnapshotHash: "allowlist-hash-x7f",
    candidateRuntimeBudgetSnapshotHash: "budget-hash-x7f",
    maxProvidersPerRun: 1,
    maxQueriesPerProvider: 2,
    maxAttemptsPerQuery: 1,
    maxCandidatesPerQuery: 3,
    perQueryTimeoutMs: 250,
    totalNetworkTimeoutMs: 500,
    retryPolicy: "none",
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
    ...overrides,
  };
}

function providerNetwork() {
  const endpointSnapshot = endpoint();
  const budgetSnapshot = budget();
  const parentAuthority = createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot());
  const candidateAuthority = createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority,
    configSnapshotHash: "config-hash-x7f",
    providerAllowlistSnapshotHash: "allowlist-hash-x7f",
    budgetSnapshotHash: "budget-hash-x7f",
  });

  return {
    authority: createSourceAcquisitionNetworkAuthority({
      candidateAuthority,
      endpointSnapshot,
      budgetSnapshot,
    }),
    endpoint: endpointSnapshot,
    budget: budgetSnapshot,
  };
}

function readinessComposition(
  x6CandidateAcquisition: HiddenDirectTextCandidateAcquisitionHarnessResult = completedX6(),
): HiddenDirectTextSourceAcquisitionReadinessCompositionResult {
  return buildHiddenDirectTextSourceAcquisitionReadinessComposition({
    x6CandidateAcquisition,
    providerNetwork: providerNetwork(),
  });
}

describe("Analyzer V2 hidden direct-text source-acquisition execution gate", () => {
  it("keeps a valid X7-E readiness composition closed as no-IO gateway-not-implemented", () => {
    const result = buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: readinessComposition(),
    });

    expect(result).toMatchObject({
      gateVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION,
      visibility: "internal_only",
      status: "gate_closed_no_io",
      executionStatus: "blocked_no_io",
      closedReason: "research_acquisition_gateway_not_implemented",
      blockedReason: null,
      readinessCompositionStatus: "composition_not_executable_pre_live_gate",
      readinessCompositionBlockedReason: null,
      parserAdmissionStatus: "blocked_pending_b2_b3_c0_2d_c",
      networkExecution: false,
      providerCalls: 0,
      networkCalls: 0,
      bytesRead: 0,
      candidateRecords: 0,
      retries: 0,
      parserRuns: 0,
      cacheTouched: false,
      sourceReliabilityTouched: false,
      publicExposure: false,
      liveJobs: false,
      providerNetworkExecution: null,
      candidateAcquisition: null,
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
      contentPackets: null,
      parserInput: null,
      parserOutput: null,
    });
  });

  it("blocks runtime-owned X7-E readiness compositions that were already blocked", () => {
    const result = buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: readinessComposition(blockedX6()),
    });

    expect(result).toMatchObject({
      status: "blocked_pre_execution",
      executionStatus: "blocked_no_io",
      closedReason: null,
      blockedReason: "readiness_composition_blocked",
      readinessCompositionStatus: "blocked_pre_execution",
      readinessCompositionBlockedReason: "x6_not_completed",
      providerCalls: 0,
      networkCalls: 0,
      bytesRead: 0,
      parserRuns: 0,
    });
  });

  it("rejects malformed, copied, or non-no-IO readiness compositions before admission", () => {
    const runtimeOwned = readinessComposition();
    const copiedInputs: HiddenDirectTextSourceAcquisitionReadinessCompositionResult[] = [
      { ...runtimeOwned },
      JSON.parse(JSON.stringify(runtimeOwned)) as HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
      structuredClone(runtimeOwned),
    ];

    expect(buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: {} as HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
    })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "readiness_composition_malformed",
    });

    for (const copied of copiedInputs) {
      expect(buildHiddenDirectTextSourceAcquisitionExecutionGate({
        readinessComposition: copied,
      })).toMatchObject({
        status: "blocked_pre_execution",
        blockedReason: "readiness_composition_not_runtime_owned",
      });
    }

    const mutatedOwned = readinessComposition() as unknown as Record<string, unknown>;
    mutatedOwned.networkCalls = 1;
    expect(buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: mutatedOwned as unknown as HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
    })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "readiness_composition_not_no_io",
      networkCalls: 0,
      providerCalls: 0,
      bytesRead: 0,
    });
  });

  it("rejects extra callback or transport request fields without invoking them", () => {
    let callbackCalls = 0;
    const result = buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: readinessComposition(),
      transport: () => {
        callbackCalls += 1;
      },
    } as unknown as HiddenDirectTextSourceAcquisitionExecutionGateRequest);

    expect(result).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "request_malformed",
      providerCalls: 0,
      networkCalls: 0,
      bytesRead: 0,
      parserRuns: 0,
    });
    expect(callbackCalls).toBe(0);
  });

  it("serializes no upstream candidate, endpoint, report, evidence, verdict, cache, or parser payload", () => {
    const serialized = JSON.stringify(buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: readinessComposition(),
    }));

    for (const forbidden of [
      "RAW_QUERY_X7F",
      "RAW_ATTEMPT_X7F",
      "RAW_CANDIDATE_X7F",
      "RAW_POLICY_X7F",
      "RAW_PROVIDER_X7F",
      "RAW_LOCATOR_X7F",
      "RAW_X5_X7F",
      "RAW_REPORT_X7F",
      "search.example.com",
      "/candidate-search",
      "https://",
      "candidateId",
      "hiddenLocatorId",
      "providerAttemptId",
      "queryText",
      "cacheKey",
      "sourceReliabilityScore",
      "EvidenceItem",
      "warnings",
      "verdict",
      "truthPercentage",
      "confidence",
      "reportMarkdown",
      "rawContent",
      "contentPacketPointerId",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("does not define executable, source-acquired, source-material, evidence, or public states", () => {
    const serialized = JSON.stringify(buildHiddenDirectTextSourceAcquisitionExecutionGate({
      readinessComposition: readinessComposition(),
    }));

    for (const forbidden of [
      "ready_to_execute",
      "\"status\":\"executable\"",
      "\"executionStatus\":\"executable\"",
      "source_acquired",
      "ready_not_executable",
      "accepted_source_material",
      "buildable_evidence_corpus",
      "source_material_ready",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

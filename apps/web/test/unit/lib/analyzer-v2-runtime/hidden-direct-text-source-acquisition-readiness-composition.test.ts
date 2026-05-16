import { describe, expect, it } from "vitest";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import type {
  HiddenDirectTextCandidateAcquisitionHarnessResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";
import {
  markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import {
  createSourceAcquisitionRuntimeAuthority,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
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
  ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
  buildHiddenDirectTextSourceAcquisitionReadinessComposition,
  type HiddenDirectTextSourceAcquisitionReadinessCompositionRequest,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition";

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
    reportMarkdown: "RAW_REPORT_X7D",
  };
}

function completedX6(
  envelope: ClaimBoundaryV2Envelope = publicEnvelope(),
  runtimeStatus: "completed_structural" | "blocked" | "damaged_structural" = "completed_structural",
): HiddenDirectTextCandidateAcquisitionHarnessResult {
  return markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({
    harnessVersion: "v2.hidden-direct-text-candidate-acquisition-harness.x6",
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    publicEnvelope: envelope,
    x5Integration: { raw: "RAW_X5_X7D" },
    candidateAcquisitionRuntime: {
      version: "v2.source-acquisition.candidate-runtime.7n3b1",
      visibility: "internal_only",
      status: runtimeStatus,
      stopReason: "not_stopped",
      queryOutcomes: [
        {
          queryId: "RAW_QUERY_X7D",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptId: "RAW_ATTEMPT_X7D",
          candidateCount: 1,
        },
      ],
      candidates: [
        {
          candidateId: "RAW_CANDIDATE_X7D",
          queryId: "RAW_QUERY_X7D",
          retrievalPolicyKey: "RAW_POLICY_X7D",
          providerId: "RAW_PROVIDER_X7D",
          providerAttemptId: "RAW_ATTEMPT_X7D",
          providerRank: 1,
          hiddenLocatorId: "RAW_LOCATOR_X7D",
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
      configSnapshotHash: "config-hash-x7d",
      providerAllowlistSnapshotHash: "allowlist-hash-x7d",
      budgetSnapshotHash: "budget-hash-x7d",
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

function candidateAuthority() {
  return createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority: createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot()),
    configSnapshotHash: "config-hash-x7d",
    providerAllowlistSnapshotHash: "allowlist-hash-x7d",
    budgetSnapshotHash: "budget-hash-x7d",
  });
}

function endpoint(
  overrides: Partial<SourceAcquisitionNetworkEndpointSnapshot> = {},
): SourceAcquisitionNetworkEndpointSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    endpointSnapshotHash: "endpoint-hash-x7d",
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
    networkBudgetSnapshotHash: "network-budget-hash-x7d",
    endpointSnapshotHash: "endpoint-hash-x7d",
    candidateRuntimeConfigSnapshotHash: "config-hash-x7d",
    candidateRuntimeProviderAllowlistSnapshotHash: "allowlist-hash-x7d",
    candidateRuntimeBudgetSnapshotHash: "budget-hash-x7d",
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
  return {
    authority: createSourceAcquisitionNetworkAuthority({
      candidateAuthority: candidateAuthority(),
      endpointSnapshot,
      budgetSnapshot,
    }),
    endpoint: endpointSnapshot,
    budget: budgetSnapshot,
  };
}

function request(
  overrides: Partial<HiddenDirectTextSourceAcquisitionReadinessCompositionRequest> = {},
): HiddenDirectTextSourceAcquisitionReadinessCompositionRequest {
  return {
    x6CandidateAcquisition: completedX6(),
    providerNetwork: providerNetwork(),
    ...overrides,
  };
}

describe("Analyzer V2 hidden direct-text source-acquisition readiness composition", () => {
  it("composes X6, X7-A, X7-B, and X7-C as a non-executable zero-cost proof", () => {
    const result = buildHiddenDirectTextSourceAcquisitionReadinessComposition(request());

    expect(result).toMatchObject({
      compositionVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
      visibility: "internal_only",
      status: "composition_not_executable_pre_live_gate",
      executionStatus: "blocked_no_io",
      blockedReason: null,
      sourceMaterialReadiness: {
        status: "not_ready_pre_execution",
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
      providerNetworkReadiness: {
        status: "not_executable_pre_live_gate",
        executionStatus: "blocked_no_io",
        sourceMaterialGuardStatus: "not_buildable_no_source_material",
        providerCalls: 0,
        networkCalls: 0,
        bytesRead: 0,
      },
      networkExecution: false,
      providerCalls: 0,
      networkCalls: 0,
      bytesRead: 0,
      candidateRecords: 0,
      retries: 0,
      cacheTouched: false,
      sourceReliabilityTouched: false,
      publicExposure: false,
      liveJobs: false,
      providerNetworkExecution: null,
      candidateAcquisition: null,
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
    });
  });

  it("returns a summary-only result without leaking upstream candidate, endpoint, report, or verdict data", () => {
    const serialized = JSON.stringify(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request()));

    for (const forbidden of [
      "RAW_QUERY_X7D",
      "RAW_ATTEMPT_X7D",
      "RAW_CANDIDATE_X7D",
      "RAW_POLICY_X7D",
      "RAW_PROVIDER_X7D",
      "RAW_LOCATOR_X7D",
      "RAW_X5_X7D",
      "RAW_REPORT_X7D",
      "search.example.com",
      "/candidate-search",
      "https://",
      "requestParameters",
      "accept",
      "not_required",
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
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("fails closed when an otherwise valid X6 result is copied outside runtime ownership", () => {
    const runtimeOwnedX6 = completedX6();
    const copiedInputs: HiddenDirectTextCandidateAcquisitionHarnessResult[] = [
      { ...runtimeOwnedX6 } as HiddenDirectTextCandidateAcquisitionHarnessResult,
      JSON.parse(JSON.stringify(runtimeOwnedX6)) as HiddenDirectTextCandidateAcquisitionHarnessResult,
      structuredClone(runtimeOwnedX6),
    ];

    for (const copiedX6 of copiedInputs) {
      expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
        x6CandidateAcquisition: copiedX6,
      }))).toMatchObject({
        status: "blocked_pre_execution",
        blockedReason: "x6_not_runtime_owned",
        sourceMaterialReadiness: null,
        providerNetworkReadiness: null,
      });
    }
  });

  it("fails closed for malformed, blocked, public-cutover-open, or unsafe X6 input", () => {
    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
      x6CandidateAcquisition: {
        ...completedX6(),
        rawUrl: "https://source.example/raw",
      } as unknown as HiddenDirectTextCandidateAcquisitionHarnessResult,
    }))).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "x6_malformed",
    });

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
      x6CandidateAcquisition: blockedX6(),
    }))).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "x6_not_completed",
    });

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
      x6CandidateAcquisition: completedX6(publicEnvelope("approved")),
    }))).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "public_cutover_not_blocked_precutover",
    });

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
      x6CandidateAcquisition: completedX6(publicEnvelope(), "damaged_structural"),
    }))).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "source_material_readiness_blocked",
      sourceMaterialReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "candidate_runtime_not_completed",
      },
      providerNetworkReadiness: null,
    });
  });

  it("fails closed for invalid provider-network authority, endpoint, budget, or extra callback inputs", () => {
    const validProviderNetwork = providerNetwork();
    let callbackCalls = 0;

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition({
      ...request(),
      providerNetwork: {
        ...validProviderNetwork,
        authority: { ...validProviderNetwork.authority },
      },
    } as unknown as HiddenDirectTextSourceAcquisitionReadinessCompositionRequest)).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "provider_network_readiness_blocked",
      providerNetworkReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "authority_invalid",
      },
    });

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
      providerNetwork: {
        ...providerNetwork(),
        endpoint: endpoint({ noCache: false }),
      },
    }))).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "provider_network_readiness_blocked",
      providerNetworkReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "endpoint_invalid",
      },
    });

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request({
      providerNetwork: {
        ...providerNetwork(),
        budget: budget({ endpointSnapshotHash: "stale-endpoint-hash" }),
      },
    }))).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "provider_network_readiness_blocked",
      providerNetworkReadiness: {
        status: "blocked_pre_execution",
        blockedReason: "authority_endpoint_budget_mismatch",
      },
    });

    expect(buildHiddenDirectTextSourceAcquisitionReadinessComposition({
      ...request(),
      providerNetwork: {
        ...providerNetwork(),
        transport: () => {
          callbackCalls += 1;
        },
      },
    } as unknown as HiddenDirectTextSourceAcquisitionReadinessCompositionRequest)).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "request_malformed",
      networkCalls: 0,
      providerCalls: 0,
    });
    expect(callbackCalls).toBe(0);
  });

  it("does not define executable, source-acquired, source-material, or evidence states", () => {
    const serialized = JSON.stringify(buildHiddenDirectTextSourceAcquisitionReadinessComposition(request()));

    for (const forbidden of [
      "ready_to_execute",
      "\"status\":\"executable\"",
      "\"executionStatus\":\"executable\"",
      "source_acquired",
      "ready_not_executable",
      "accepted_source_material",
      "buildable_evidence_corpus",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

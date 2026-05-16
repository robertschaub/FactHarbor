import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusSourceMaterialGuard,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";
import {
  buildSourceMaterialAbsenceContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/contract";
import {
  buildCandidateSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/readiness";
import {
  CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
  type CandidateSourceMaterialReadinessTrace,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/types";
import {
  SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract";
import {
  createSourceAcquisitionRuntimeAuthority,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
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
  SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION,
  buildSourceAcquisitionProviderNetworkReadiness,
} from "@/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness";

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
      configSnapshotHash: "config-hash-x7c",
      providerAllowlistSnapshotHash: "allowlist-hash-x7c",
      budgetSnapshotHash: "budget-hash-x7c",
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
    configSnapshotHash: "config-hash-x7c",
    providerAllowlistSnapshotHash: "allowlist-hash-x7c",
    budgetSnapshotHash: "budget-hash-x7c",
  });
}

function endpoint(
  overrides: Partial<SourceAcquisitionNetworkEndpointSnapshot> = {},
): SourceAcquisitionNetworkEndpointSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    endpointSnapshotHash: "endpoint-hash-x7c",
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
    networkBudgetSnapshotHash: "network-budget-hash-x7c",
    endpointSnapshotHash: "endpoint-hash-x7c",
    candidateRuntimeConfigSnapshotHash: "config-hash-x7c",
    candidateRuntimeProviderAllowlistSnapshotHash: "allowlist-hash-x7c",
    candidateRuntimeBudgetSnapshotHash: "budget-hash-x7c",
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

function validTrace(
  overrides: Partial<CandidateSourceMaterialReadinessTrace> = {},
): CandidateSourceMaterialReadinessTrace {
  return {
    traceVersion: CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
    visibility: "internal_only",
    candidateAcquisitionStatus: "completed",
    candidateRuntimeStructuralStatus: "completed_structural",
    candidateRecordCount: 2,
    queryOutcomeCount: 1,
    publicCutoverStatus: "blocked_precutover",
    candidateRecordsAreSourceMaterial: false,
    hiddenLocatorsAreDereferenceable: false,
    candidateCountsAreEvidence: false,
    ...overrides,
  };
}

function sourceMaterialInput() {
  return buildCandidateSourceMaterialReadinessDecision(validTrace());
}

function authority() {
  return createSourceAcquisitionNetworkAuthority({
    candidateAuthority: candidateAuthority(),
    endpointSnapshot: endpoint(),
    budgetSnapshot: budget(),
  });
}

function decision(overrides: {
  readonly authority?: unknown;
  readonly endpoint?: SourceAcquisitionNetworkEndpointSnapshot;
  readonly budget?: SourceAcquisitionNetworkBudgetSnapshot;
  readonly sourceMaterialInput?: unknown;
} = {}) {
  return buildSourceAcquisitionProviderNetworkReadiness({
    authority: (overrides.authority ?? authority()) as ReturnType<typeof authority>,
    endpoint: overrides.endpoint ?? endpoint(),
    budget: overrides.budget ?? budget(),
    sourceMaterialInput: overrides.sourceMaterialInput ?? sourceMaterialInput(),
  });
}

describe("Analyzer V2 source-acquisition provider-network readiness", () => {
  it("validates provider-network prerequisites as non-executable and zero-cost", () => {
    expect(decision()).toEqual({
      decisionVersion: SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION,
      visibility: "internal_only",
      status: "not_executable_pre_live_gate",
      executionStatus: "blocked_no_io",
      blockedReason: null,
      authorityVersion: "v2.source-acquisition.provider-network-authority.7n3b2",
      endpointSnapshotHash: "endpoint-hash-x7c",
      networkBudgetSnapshotHash: "network-budget-hash-x7c",
      sourceMaterialGuardStatus: "not_buildable_no_source_material",
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

  it("does not leak endpoint, source, provider payload, warning, verdict, confidence, or report values", () => {
    const serialized = JSON.stringify(decision());

    for (const forbidden of [
      "search.example.com",
      "/candidate-search",
      "https://",
      "requestParameters",
      "accept",
      "not_required",
      "RAW",
      "title",
      "snippet",
      "domain",
      "hiddenLocator",
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

  it("fails closed for copied authorities, stale hashes, invalid endpoint, and invalid budget", () => {
    const validAuthority = authority();

    expect(decision({ authority: { ...validAuthority } })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "authority_invalid",
    });
    expect(decision({ authority: JSON.parse(JSON.stringify(validAuthority)) })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "authority_invalid",
    });
    expect(decision({ authority: SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "authority_invalid",
    });
    expect(decision({ endpoint: endpoint({ noCache: false }) })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "endpoint_invalid",
    });
    expect(decision({ budget: budget({ noSourceReliability: false }) })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "budget_invalid",
    });
    expect(decision({ budget: budget({ endpointSnapshotHash: "stale-endpoint-hash" }) })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "authority_endpoint_budget_mismatch",
    });
  });

  it("fails closed for authority, endpoint, and budget mismatch without calling a transport or factory", () => {
    let transportCalls = 0;
    const validAuthority = authority();

    const result = buildSourceAcquisitionProviderNetworkReadiness({
      authority: validAuthority,
      endpoint: endpoint({ endpointSnapshotHash: "different-endpoint-hash" }),
      budget: budget({ endpointSnapshotHash: "different-endpoint-hash" }),
      sourceMaterialInput: sourceMaterialInput(),
      transport: () => {
        transportCalls += 1;
      },
    } as unknown as Parameters<typeof buildSourceAcquisitionProviderNetworkReadiness>[0]);

    expect(result).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "authority_endpoint_budget_mismatch",
      networkCalls: 0,
      providerCalls: 0,
    });
    expect(transportCalls).toBe(0);
  });

  it("reuses the X7-B source-material guard and blocks invalid or non-normal source-material states", () => {
    expect(decision({ sourceMaterialInput: { sourceMaterial: { text: "RAW_SOURCE_X7C" } } })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "source_material_guard_invalid",
      sourceMaterialGuardStatus: "blocked_source_material_invalid",
    });
    expect(decision({
      sourceMaterialInput: buildCandidateSourceMaterialReadinessDecision(validTrace({
        candidateRuntimeStructuralStatus: "blocked",
      })),
    })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "source_material_guard_not_negative",
      sourceMaterialGuardStatus: "blocked_source_material_not_accepted",
    });

    const absenceContract = buildSourceMaterialAbsenceContract(sourceMaterialInput());
    expect(buildEvidenceCorpusSourceMaterialGuard(absenceContract)).toMatchObject({
      status: "not_buildable_no_source_material",
    });
    expect(decision({ sourceMaterialInput: { ...absenceContract } })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "source_material_guard_invalid",
    });
    expect(decision({ sourceMaterialInput: JSON.parse(JSON.stringify(absenceContract)) })).toMatchObject({
      status: "blocked_pre_execution",
      blockedReason: "source_material_guard_invalid",
    });
  });

  it("does not define execution or positive source/evidence states", () => {
    const serialized = JSON.stringify(decision());

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

import { describe, expect, it } from "vitest";
import {
  createSourceAcquisitionRuntimeAuthority,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import { SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract";
import {
  createSourceAcquisitionNetworkAuthority,
  isSourceAcquisitionNetworkAuthority,
  readSourceAcquisitionNetworkAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  sourceAcquisitionNetworkApproval,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";

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
      configSnapshotHash: "config-hash-7n3b2",
      providerAllowlistSnapshotHash: "allowlist-hash-7n3b2",
      budgetSnapshotHash: "budget-hash-7n3b2",
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
    configSnapshotHash: "config-hash-7n3b2",
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b2",
    budgetSnapshotHash: "budget-hash-7n3b2",
  });
}

function endpoint(
  overrides: Partial<SourceAcquisitionNetworkEndpointSnapshot> = {},
): SourceAcquisitionNetworkEndpointSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    endpointSnapshotHash: "endpoint-hash-7n3b2",
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
    networkBudgetSnapshotHash: "network-budget-hash-7n3b2",
    endpointSnapshotHash: "endpoint-hash-7n3b2",
    candidateRuntimeConfigSnapshotHash: "config-hash-7n3b2",
    candidateRuntimeProviderAllowlistSnapshotHash: "allowlist-hash-7n3b2",
    candidateRuntimeBudgetSnapshotHash: "budget-hash-7n3b2",
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

describe("Analyzer V2 source-acquisition provider-network authority", () => {
  it("creates a private 7N-3B2 authority bound to endpoint, budget, and parent 7N-3B1 hashes", () => {
    const authority = createSourceAcquisitionNetworkAuthority({
      candidateAuthority: candidateAuthority(),
      endpointSnapshot: endpoint(),
      budgetSnapshot: budget(),
    });
    const snapshot = readSourceAcquisitionNetworkAuthoritySnapshot(authority);

    expect(isSourceAcquisitionNetworkAuthority(authority)).toBe(true);
    expect(snapshot).toMatchObject({
      kind: "source_acquisition_provider_network_authority_7n3b2",
      visibility: "internal_only",
      endpointSnapshotHash: "endpoint-hash-7n3b2",
      networkBudgetSnapshotHash: "network-budget-hash-7n3b2",
      executionState: "provider_network_default_closed",
      capabilityScope: {
        providerNetwork: "sdk_free_node_core_https_only",
        providerSdk: false,
        fetchApi: false,
        cacheRead: false,
        cacheWrite: false,
        sourceReliability: false,
        productRuntime: false,
        publicExposure: false,
        liveJobs: false,
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain("https://");
    expect(JSON.stringify(snapshot)).not.toContain("secret");
  });

  it("rejects copied, JSON-round-tripped, stale, controlled-harness, and 7N-3B1-only authorities", () => {
    const valid = createSourceAcquisitionNetworkAuthority({
      candidateAuthority: candidateAuthority(),
      endpointSnapshot: endpoint(),
      budgetSnapshot: budget(),
    });

    expect(isSourceAcquisitionNetworkAuthority({ ...valid })).toBe(false);
    expect(isSourceAcquisitionNetworkAuthority(JSON.parse(JSON.stringify(valid)))).toBe(false);
    expect(isSourceAcquisitionNetworkAuthority(candidateAuthority())).toBe(false);
    expect(isSourceAcquisitionNetworkAuthority(SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY)).toBe(false);

    expect(() => createSourceAcquisitionNetworkAuthority({
      candidateAuthority: candidateAuthority(),
      endpointSnapshot: endpoint({ endpointSnapshotHash: "different-endpoint-hash" }),
      budgetSnapshot: budget(),
    })).toThrow(/hashes do not match parent provenance|endpoint snapshot/);

    expect(() => createSourceAcquisitionNetworkAuthority({
      candidateAuthority: candidateAuthority(),
      endpointSnapshot: endpoint(),
      budgetSnapshot: budget({ candidateRuntimeBudgetSnapshotHash: "stale-budget-hash" }),
    })).toThrow(/parent provenance/);
  });
});

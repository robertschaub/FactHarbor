import { createHash } from "node:crypto";
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
import {
  createSourceAcquisitionNetworkAuthority,
  readSourceAcquisitionNetworkAuthoritySnapshot,
  type SourceAcquisitionNetworkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  sourceAcquisitionNetworkApproval,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";
import { SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract";
import {
  createSourceAcquisitionContentDereferenceAuthority,
  isSourceAcquisitionContentDereferenceAuthority,
  readSourceAcquisitionContentAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-authority";
import {
  SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
  sourceAcquisitionContentApproval,
  type SourceAcquisitionContentBudgetSnapshot,
  type SourceAcquisitionContentTargetEnvelope,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-envelope";

const CONTENT_AUTHORITY_HASH = "2222222222222222222222222222222222222222222222222222222222222222";
const CONTENT_TARGET_HASH = "3333333333333333333333333333333333333333333333333333333333333333";
const CONTENT_BUDGET_HASH = "4444444444444444444444444444444444444444444444444444444444444444";
const DIFFERENT_CONTENT_TARGET_HASH = "5555555555555555555555555555555555555555555555555555555555555555";
const MISMATCHED_PARENT_NETWORK_HASH = "6666666666666666666666666666666666666666666666666666666666666666";

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
      configSnapshotHash: "config-hash-7n3b3-1",
      providerAllowlistSnapshotHash: "allowlist-hash-7n3b3-1",
      budgetSnapshotHash: "budget-hash-7n3b3-1",
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

function networkEndpoint(
  overrides: Partial<SourceAcquisitionNetworkEndpointSnapshot> = {},
): SourceAcquisitionNetworkEndpointSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    endpointSnapshotHash: "endpoint-hash-7n3b3-1",
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

function networkBudget(
  overrides: Partial<SourceAcquisitionNetworkBudgetSnapshot> = {},
): SourceAcquisitionNetworkBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    networkBudgetSnapshotHash: "network-budget-hash-7n3b3-1",
    endpointSnapshotHash: "endpoint-hash-7n3b3-1",
    candidateRuntimeConfigSnapshotHash: "config-hash-7n3b3-1",
    candidateRuntimeProviderAllowlistSnapshotHash: "allowlist-hash-7n3b3-1",
    candidateRuntimeBudgetSnapshotHash: "budget-hash-7n3b3-1",
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

function networkAuthority() {
  const candidateAuthority = createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority: createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot()),
    configSnapshotHash: "config-hash-7n3b3-1",
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b3-1",
    budgetSnapshotHash: "budget-hash-7n3b3-1",
  });
  return createSourceAcquisitionNetworkAuthority({
    candidateAuthority,
    endpointSnapshot: networkEndpoint(),
    budgetSnapshot: networkBudget(),
  });
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function networkAuthoritySnapshotHash(authority: SourceAcquisitionNetworkAuthority): string {
  return sha256Json(readSourceAcquisitionNetworkAuthoritySnapshot(authority));
}

function contentTarget(
  overrides: Partial<SourceAcquisitionContentTargetEnvelope> = {},
): SourceAcquisitionContentTargetEnvelope {
  return {
    version: SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
    approval: sourceAcquisitionContentApproval(),
    visibility: "internal_only",
    contentTargetId: "OPAQUE_CONTENT_TARGET_001",
    parentCandidateId: "OPAQUE_SOURCE_CANDIDATE_001",
    parentProviderAttemptId: "ATT_1",
    providerId: "test_provider",
    endpointContentPolicyId: "POLICY_CONTENT_ENDPOINT_001",
    opaqueRuntimeLocatorId: "OPAQUE_RUNTIME_LOCATOR_001",
    providerNetworkAuthoritySnapshotHash: networkAuthoritySnapshotHash(networkAuthority()),
    contentAuthoritySnapshotHash: CONTENT_AUTHORITY_HASH,
    contentTargetSnapshotHash: CONTENT_TARGET_HASH,
    canonicalSchemePolicyId: "POLICY_SCHEME_HTTPS",
    canonicalHostnameReference: {
      kind: "keyed_hmac",
      algorithm: "hmac_sha256",
      keyId: "POLICY_HOST_HMAC_KEY_001",
      value: "HMAC_SHA256_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    },
    fixedPathReference: { kind: "policy_id", value: "POLICY_FIXED_PATH_001" },
    queryReference: { kind: "policy_id", value: "POLICY_QUERY_NONE_001" },
    redirectPolicy: "deny",
    proxyPolicy: "none",
    contentTypePolicy: {
      allowedContentTypes: ["text/html", "text/plain", "application/json", "application/pdf"],
      sniffPolicy: "declared_type_must_match_allowed_type",
    },
    bytePolicyId: "POLICY_BYTES_001",
    timeoutPolicyId: "POLICY_TIMEOUT_001",
    decompressionPolicy: "identity_only",
    noParser: true,
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
    ...overrides,
  };
}

function contentBudget(
  overrides: Partial<SourceAcquisitionContentBudgetSnapshot> = {},
): SourceAcquisitionContentBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
    approval: sourceAcquisitionContentApproval(),
    contentBudgetSnapshotHash: CONTENT_BUDGET_HASH,
    contentTargetSnapshotHash: CONTENT_TARGET_HASH,
    providerNetworkAuthoritySnapshotHash: networkAuthoritySnapshotHash(networkAuthority()),
    contentAuthoritySnapshotHash: CONTENT_AUTHORITY_HASH,
    maxContentTargetsPerRun: 3,
    maxContentTargetsPerCandidate: 1,
    maxFetchAttemptsPerTarget: 1,
    maxConcurrentContentFetches: 1,
    declaredByteCap: 1024,
    streamingByteCap: 1024,
    compressedByteCap: 1024,
    decompressedByteCap: 2048,
    totalByteCapPerRun: 3072,
    perFetchTimeoutMs: 250,
    totalContentDereferenceTimeoutMs: 1000,
    cancellationState: "not_requested",
    retryPolicy: "none",
    noParser: true,
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition content-dereference authority", () => {
  it("creates a private 7N-3B3-1 authority bound to parent network, target, and budget hashes", () => {
    const parentNetworkAuthority = networkAuthority();
    const parentNetworkAuthorityHash = networkAuthoritySnapshotHash(parentNetworkAuthority);
    const authority = createSourceAcquisitionContentDereferenceAuthority({
      networkAuthority: parentNetworkAuthority,
      targetEnvelope: contentTarget({ providerNetworkAuthoritySnapshotHash: parentNetworkAuthorityHash }),
      budgetSnapshot: contentBudget({ providerNetworkAuthoritySnapshotHash: parentNetworkAuthorityHash }),
    });
    const snapshot = readSourceAcquisitionContentAuthoritySnapshot(authority);

    expect(isSourceAcquisitionContentDereferenceAuthority(authority)).toBe(true);
    expect(snapshot).toMatchObject({
      kind: "source_acquisition_content_dereference_authority_7n3b3_1",
      visibility: "internal_only",
      executionState: "content_dereference_default_closed",
      providerNetworkAuthoritySnapshotHash: parentNetworkAuthorityHash,
      contentAuthoritySnapshotHash: CONTENT_AUTHORITY_HASH,
      contentTargetSnapshotHash: CONTENT_TARGET_HASH,
      contentBudgetSnapshotHash: CONTENT_BUDGET_HASH,
      parentNetworkEndpointSnapshotHash: "endpoint-hash-7n3b3-1",
      parentNetworkBudgetSnapshotHash: "network-budget-hash-7n3b3-1",
      capabilityScope: {
        contentDereference: "hidden_structural_fetch_only",
        providerNetwork: "requires_valid_7n3b2_parent",
        providerSdk: false,
        fetchApi: false,
        parser: false,
        contentPacketSink: false,
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

  it("rejects copied, JSON-round-tripped, stale, controlled-harness, 7N-3B1-only, and 7N-3B2-only authorities", () => {
    const parentNetworkAuthority = networkAuthority();
    const parentNetworkAuthorityHash = networkAuthoritySnapshotHash(parentNetworkAuthority);
    const valid = createSourceAcquisitionContentDereferenceAuthority({
      networkAuthority: parentNetworkAuthority,
      targetEnvelope: contentTarget({ providerNetworkAuthoritySnapshotHash: parentNetworkAuthorityHash }),
      budgetSnapshot: contentBudget({ providerNetworkAuthoritySnapshotHash: parentNetworkAuthorityHash }),
    });
    const secondParentNetworkAuthority = networkAuthority();

    expect(isSourceAcquisitionContentDereferenceAuthority({ ...valid })).toBe(false);
    expect(isSourceAcquisitionContentDereferenceAuthority(JSON.parse(JSON.stringify(valid)))).toBe(false);
    expect(isSourceAcquisitionContentDereferenceAuthority(secondParentNetworkAuthority)).toBe(false);
    expect(isSourceAcquisitionContentDereferenceAuthority(SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY)).toBe(false);

    const candidateOnlyAuthority = createSourceAcquisitionCandidateRuntimeAuthority({
      parentAuthority: createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot()),
      configSnapshotHash: "config-hash-7n3b3-1",
      providerAllowlistSnapshotHash: "allowlist-hash-7n3b3-1",
      budgetSnapshotHash: "budget-hash-7n3b3-1",
    });
    expect(isSourceAcquisitionContentDereferenceAuthority(candidateOnlyAuthority)).toBe(false);

    expect(() => createSourceAcquisitionContentDereferenceAuthority({
      networkAuthority: secondParentNetworkAuthority,
      targetEnvelope: contentTarget({ contentTargetSnapshotHash: DIFFERENT_CONTENT_TARGET_HASH }),
      budgetSnapshot: contentBudget(),
    })).toThrow(/content target and budget hashes|target envelope/);

    expect(() => createSourceAcquisitionContentDereferenceAuthority({
      networkAuthority: secondParentNetworkAuthority,
      targetEnvelope: contentTarget({
        providerNetworkAuthoritySnapshotHash: MISMATCHED_PARENT_NETWORK_HASH,
      }),
      budgetSnapshot: contentBudget({
        providerNetworkAuthoritySnapshotHash: MISMATCHED_PARENT_NETWORK_HASH,
      }),
    })).toThrow(/parent provider-network authority/);
  });
});

import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  buildSourceAcquisitionNetworkHiddenDiagnostic,
  readSourceAcquisitionNetworkCandidateArray,
  sourceAcquisitionNetworkApproval,
  validateSourceAcquisitionNetworkBudgetSnapshot,
  validateSourceAcquisitionNetworkEndpointSnapshot,
  validateSourceAcquisitionNetworkRequestEnvelope,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
  type SourceAcquisitionNetworkRequestEnvelope,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";

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
    allowedRequestParameters: [
      { key: "q", valueSource: "query_text" },
      { key: "policy", valueSource: "retrieval_policy_key" },
    ],
    allowedRequestHeaders: [
      { key: "accept", valueSource: "application_json" },
      { key: "user-agent", valueSource: "factharbor_internal_agent" },
    ],
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

function request(
  overrides: Partial<SourceAcquisitionNetworkRequestEnvelope> = {},
): SourceAcquisitionNetworkRequestEnvelope {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    visibility: "internal_only",
    providerId: "test_provider",
    endpointId: "ep_candidate_search",
    queryId: "eq_001",
    retrievalPolicyKey: "baseline_research",
    providerAttemptId: "ATT_1",
    requestParameters: [
      { key: "q", value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz" },
      { key: "policy", value: "baseline_research" },
    ],
    requestHeaders: [
      { key: "accept", valueSource: "application_json" },
      { key: "user-agent", valueSource: "factharbor_internal_agent" },
    ],
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition provider-network envelope", () => {
  it("pins approval provenance to the landed 7N-3B2 provider-network implementation commit", () => {
    expect(SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT).toBe("54b8af1a");
    expect(sourceAcquisitionNetworkApproval().packageCommit).toBe("54b8af1a");
  });

  it("validates endpoint, budget, and request snapshots without raw URLs or secrets", () => {
    expect(validateSourceAcquisitionNetworkEndpointSnapshot(endpoint())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
    expect(validateSourceAcquisitionNetworkBudgetSnapshot(budget())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
    expect(validateSourceAcquisitionNetworkRequestEnvelope(request(), endpoint())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
  });

  it("rejects raw URLs, endpoint URL fields, proxy/redirect looseness, metadata hosts, and unsafe host spelling", () => {
    const invalidEndpoints = [
      { ...endpoint(), rawUrl: "https://search.example.com/candidate-search" } as SourceAcquisitionNetworkEndpointSnapshot,
      { ...endpoint(), endpointUrl: "https://search.example.com/candidate-search" } as SourceAcquisitionNetworkEndpointSnapshot,
      endpoint({ canonicalAsciiHostname: "search.example.com." }),
      endpoint({ canonicalAsciiHostname: "localhost" }),
      endpoint({ canonicalAsciiHostname: "metadata.google.internal" }),
      endpoint({ path: "/candidate-search?q={query}" }),
      endpoint({ redirectPolicy: "follow" as SourceAcquisitionNetworkEndpointSnapshot["redirectPolicy"] }),
      endpoint({ proxyPolicy: "env" as SourceAcquisitionNetworkEndpointSnapshot["proxyPolicy"] }),
      endpoint({ allowedRequestHeaders: [{ key: "authorization" as "accept", valueSource: "application_json" }] }),
      endpoint({ responseContentTypePolicy: { allowedContentTypes: ["text/html" as "application/json"] } }),
    ];

    for (const invalidEndpoint of invalidEndpoints) {
      expect(validateSourceAcquisitionNetworkEndpointSnapshot(invalidEndpoint).status).toBe("blocked");
    }
  });

  it("rejects stale budgets and request parameters outside the endpoint allowlist", () => {
    expect(validateSourceAcquisitionNetworkBudgetSnapshot(budget({
      endpointSnapshotHash: "placeholder",
    })).status).toBe("blocked");
    expect(validateSourceAcquisitionNetworkBudgetSnapshot(budget({
      retryPolicy: "retry" as SourceAcquisitionNetworkBudgetSnapshot["retryPolicy"],
    })).status).toBe("blocked");
    expect(validateSourceAcquisitionNetworkBudgetSnapshot(budget({
      totalNetworkTimeoutMs: 100,
    })).status).toBe("blocked");

    expect(validateSourceAcquisitionNetworkRequestEnvelope(request({
      requestParameters: [{ key: "url", value: "https://example.com" }],
    }), endpoint()).status).toBe("blocked");
    expect(validateSourceAcquisitionNetworkRequestEnvelope(request({
      providerAttemptId: "https://example.com/secret",
    }), endpoint()).status).toBe("blocked");
  });

  it("reads only structural candidate array shape and keeps diagnostics sanitized", () => {
    expect(readSourceAcquisitionNetworkCandidateArray({ items: [{ title: "hidden" }] }, endpoint().responseCandidatePointer)).toHaveLength(1);
    expect(readSourceAcquisitionNetworkCandidateArray([], { kind: "top_level_array" })).toHaveLength(0);
    expect(readSourceAcquisitionNetworkCandidateArray({ other: [] }, endpoint().responseCandidatePointer)).toBeNull();

    const diagnostic = buildSourceAcquisitionNetworkHiddenDiagnostic({
      providerId: "test_provider",
      endpointId: "ep_candidate_search",
      queryId: "eq_001",
      providerAttemptId: "ATT_1",
      status: "blocked",
      stopReason: "redirect_denied",
      durationMs: 12,
      timeoutMs: 250,
      redirectDenied: true,
    });
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.rawPayloadIncluded).toBe(false);
    expect(diagnostic.secretIncluded).toBe(false);
    expect(diagnostic.cacheKeyConstructed).toBe(false);
    expect(diagnostic.dnsAddressCount).toBe(0);
    expect(diagnostic.selectedAddressFamily).toBe("not_reached");
    expect(diagnostic.finalAddressValidation).toBe("not_reached");
    expect(diagnostic.responseStatusCodeCategory).toBe("not_reached");
    expect(diagnostic.contentTypeState).toBe("not_reached");
    expect(diagnostic.transportFailureClass).toBe("not_applicable");
    expect(diagnostic.transportFailurePhase).toBe("not_applicable");
    expect(diagnostic.transportErrorShape).toBe("not_applicable");
    expect(diagnostic.nodeErrorCodeCategory).toBe("none");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("raw body");
    expect(serialized).not.toContain("stack");
  });
});

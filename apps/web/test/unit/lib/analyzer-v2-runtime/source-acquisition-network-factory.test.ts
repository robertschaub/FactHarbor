import { afterEach, describe, expect, it, vi } from "vitest";
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
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  sourceAcquisitionNetworkApproval,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";
import {
  createSourceAcquisitionNetworkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  SOURCE_ACQUISITION_NETWORK_ATTEMPT_TELEMETRY_VERSION,
  buildSourceAcquisitionCandidateNetworkProviderBoundary,
  type SourceAcquisitionNetworkAttemptTelemetryRecord,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-factory";
import type { SourceAcquisitionNetworkLowLevelTransport } from "@/lib/analyzer-v2-runtime/source-acquisition-network-transport";
import type { SourceAcquisitionCandidateProviderAttemptRequest } from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";

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

function networkAuthority(currentEndpoint = endpoint(), currentBudget = budget()) {
  return createSourceAcquisitionNetworkAuthority({
    candidateAuthority: candidateAuthority(),
    endpointSnapshot: currentEndpoint,
    budgetSnapshot: currentBudget,
  });
}

function attempt(
  overrides: Partial<SourceAcquisitionCandidateProviderAttemptRequest> = {},
): SourceAcquisitionCandidateProviderAttemptRequest {
  return {
    candidateRunId: "CANDIDATE_RUN_7N3B2",
    queryId: "EQ_001",
    retrievalPolicyKey: "baseline_research",
    queryText: "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law?",
    targetAtomicClaimIds: ["AC_001"],
    sourceLanguagePolicy: { primaryLanguage: "en" },
    allowedProviderIds: ["test_provider"],
    timeoutMs: 250,
    maxCandidateRecords: 2,
    ...overrides,
  };
}

function lowLevelTransport(
  overrides: Partial<SourceAcquisitionNetworkLowLevelTransport> = {},
): SourceAcquisitionNetworkLowLevelTransport {
  return {
    resolve: overrides.resolve ?? (async () => [{ address: "93.184.216.34", family: 4 }]),
    request: overrides.request ?? (async () => ({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      remoteAddress: "93.184.216.34",
      body: Buffer.from("{\"items\":[{\"title\":\"raw title\",\"url\":\"https://example.test\"},{\"snippet\":\"raw\"}]}", "utf8"),
    })),
    now: overrides.now,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Analyzer V2 source-acquisition provider-network factory", () => {
  it("adapts sanitized network JSON into hidden candidate records without exposing provider content", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const telemetry: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
    const provider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(),
      endpoints: [endpoint()],
      budget: budget(),
      lowLevelTransport: lowLevelTransport(),
      attemptTelemetrySink: (record) => telemetry.push(record),
    });

    const result = await provider.acquireCandidates(attempt());
    const serialized = JSON.stringify(result);
    const serializedTelemetry = JSON.stringify(telemetry);

    expect(result).toMatchObject({
      queryId: "EQ_001",
      providerId: "test_provider",
      providerAttemptId: "ATT_1",
      structuralStatus: "success",
      sanitizedProviderTelemetry: {
        rawPayloadIncluded: false,
        secretIncluded: false,
        publicPayloadIncluded: false,
      },
    });
    expect(result.candidates).toHaveLength(2);
    expect(telemetry).toEqual([
      expect.objectContaining({
        telemetryVersion: SOURCE_ACQUISITION_NETWORK_ATTEMPT_TELEMETRY_VERSION,
        visibility: "internal_only",
        providerId: "test_provider",
        endpointId: "ep_candidate_search",
        attemptOrdinal: 1,
        structuralStatus: "success",
        stopReason: "not_stopped",
        timeoutMs: 250,
        candidateCount: 2,
        byteCountState: "observed",
        rawPayloadIncluded: false,
        secretIncluded: false,
        publicPayloadIncluded: false,
        errorTraceIncluded: false,
        cacheKeyConstructed: false,
        sourceReliabilityTouched: false,
      }),
    ]);
    expect(Number.isInteger(telemetry[0]?.durationMs)).toBe(true);
    expect(Number.isInteger(telemetry[0]?.compressedBytes)).toBe(true);
    expect(Number.isInteger(telemetry[0]?.decompressedBytes)).toBe(true);
    expect(telemetry[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(telemetry[0]?.compressedBytes).toBeGreaterThan(0);
    expect(telemetry[0]?.decompressedBytes).toBeGreaterThan(0);
    expect(result.candidates[0]).toMatchObject({
      candidateId: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      hiddenLocatorId: "HIDDEN_SOURCE_LOCATOR_ATT_1_1",
    });
    expect(result.candidates[0]).not.toHaveProperty("title");
    expect(result.candidates[0]).not.toHaveProperty("url");
    expect(serialized).not.toContain("raw title");
    expect(serialized).not.toContain("https://example.test");
    expect(serialized).not.toContain("\"snippet\":\"raw\"");
    expect(serializedTelemetry).not.toContain("raw title");
    expect(serializedTelemetry).not.toContain("https://example.test");
    expect(serializedTelemetry).not.toContain("\"snippet\":\"raw\"");
    expect(serializedTelemetry).not.toContain("queryText");
    expect(serializedTelemetry).not.toContain("queryId");
    expect(serializedTelemetry).not.toContain("retrievalPolicyKey");
    expect(serializedTelemetry).not.toContain("requestParameters");
    expect(serializedTelemetry).not.toContain("headers");
    expect(serializedTelemetry).not.toContain("cacheKey\":\"");
    expect(serializedTelemetry).not.toContain("cacheValue");
    expect(serializedTelemetry).not.toContain("sourceReliabilityScore");
    expect(serializedTelemetry).not.toContain("sourceReliabilityField");
    expect(serialized).not.toContain("cache");
    expect(serialized).not.toContain("sourceReliability");
    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps telemetry observer failures isolated from provider results", async () => {
    const provider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(),
      endpoints: [endpoint()],
      budget: budget(),
      lowLevelTransport: lowLevelTransport(),
      attemptTelemetrySink: () => {
        throw new Error("telemetry sink should be isolated");
      },
    });

    await expect(provider.acquireCandidates(attempt())).resolves.toMatchObject({
      structuralStatus: "success",
      candidates: expect.arrayContaining([
        expect.objectContaining({
          candidateStructuralStatus: "candidate_acquired",
        }),
      ]),
    });
  });

  it("passes abort signals to transport and enforces provider query and total network budgets", async () => {
    const limitedBudget = budget({
      maxQueriesPerProvider: 1,
      perQueryTimeoutMs: 25,
      totalNetworkTimeoutMs: 25,
    });
    const currentEndpoint = endpoint({ timeoutMs: 25 });
    let signalSeen = false;
    const provider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(currentEndpoint, limitedBudget),
      endpoints: [currentEndpoint],
      budget: limitedBudget,
      lowLevelTransport: lowLevelTransport({
        request: async (request) => {
          signalSeen = request.signal instanceof AbortSignal;
          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: Buffer.from("{\"items\":[{}]}", "utf8"),
          };
        },
      }),
    });

    const first = await provider.acquireCandidates(attempt());
    const second = await provider.acquireCandidates(attempt({ queryId: "EQ_002" }));

    expect(signalSeen).toBe(true);
    expect(first.structuralStatus).toBe("success");
    expect(second).toMatchObject({
      structuralStatus: "timed_out",
      candidates: [],
    });

    const timedEndpoint = endpoint({ timeoutMs: 5 });
    const timedBudget = budget({
      perQueryTimeoutMs: 5,
      totalNetworkTimeoutMs: 10,
    });
    const timedProvider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(timedEndpoint, timedBudget),
      endpoints: [timedEndpoint],
      budget: timedBudget,
      lowLevelTransport: lowLevelTransport({
        request: async (request) => new Promise((resolve, reject) => {
          request.signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
          setTimeout(() => resolve({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: Buffer.from("{\"items\":[{}]}", "utf8"),
          }), 50);
        }),
      }),
    });

    const timed = await timedProvider.acquireCandidates(attempt());
    expect(timed).toMatchObject({
      structuralStatus: "cancelled",
      candidates: [],
    });
  });

  it("keeps 7N-3B2 default closed for stale, copied, or 7N-3B1-only authority inputs", async () => {
    for (const authority of [
      candidateAuthority(),
      { ...networkAuthority() },
      JSON.parse(JSON.stringify(networkAuthority())),
    ]) {
      const telemetry: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
      const provider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
        authority: authority as never,
        endpoints: [endpoint()],
        budget: budget(),
        attemptTelemetrySink: (record) => telemetry.push(record),
        lowLevelTransport: lowLevelTransport({
          request: async () => {
            throw new Error("network should not run");
          },
        }),
      });

      const result = await provider.acquireCandidates(attempt());

      expect(result).toMatchObject({
        structuralStatus: "provider_failure",
        candidates: [],
      });
      expect(telemetry).toEqual([]);
    }
  });

  it("maps transport blocks and non-candidate JSON to non-success results with zero candidates", async () => {
    const redirectTelemetry: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
    const provider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(),
      endpoints: [endpoint()],
      budget: budget(),
      attemptTelemetrySink: (record) => redirectTelemetry.push(record),
      lowLevelTransport: lowLevelTransport({
        request: async () => ({
          statusCode: 302,
          headers: { "content-type": "application/json", location: "https://redirect.example" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from("{\"items\":[{}]}", "utf8"),
        }),
      }),
    });
    const redirect = await provider.acquireCandidates(attempt());

    expect(redirect).toMatchObject({
      structuralStatus: "search_failure",
      candidates: [],
    });
    expect(redirectTelemetry).toEqual([
      expect.objectContaining({
        structuralStatus: "search_failure",
        stopReason: "redirect_denied",
        byteCountState: "not_reached",
        compressedBytes: 0,
        decompressedBytes: 0,
      }),
    ]);
    expect(JSON.stringify(redirect)).not.toContain("redirect.example");
    expect(JSON.stringify(redirectTelemetry)).not.toContain("redirect.example");

    const missingTelemetry: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
    const noItems = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(),
      endpoints: [endpoint()],
      budget: budget(),
      attemptTelemetrySink: (record) => missingTelemetry.push(record),
      lowLevelTransport: lowLevelTransport({
        request: async () => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from("{\"other\":[{}]}", "utf8"),
        }),
      }),
    });
    const missing = await noItems.acquireCandidates(attempt());

    expect(missing).toMatchObject({
      structuralStatus: "search_failure",
      candidates: [],
    });
    expect(missingTelemetry).toEqual([
      expect.objectContaining({
        structuralStatus: "search_failure",
        stopReason: "content_sniff_rejected",
        byteCountState: "observed",
      }),
    ]);
    expect(missingTelemetry[0]?.compressedBytes).toBeGreaterThan(0);
    expect(missingTelemetry[0]?.decompressedBytes).toBeGreaterThan(0);

    const dnsTelemetry: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
    const dnsFailure = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(),
      endpoints: [endpoint()],
      budget: budget(),
      attemptTelemetrySink: (record) => dnsTelemetry.push(record),
      lowLevelTransport: lowLevelTransport({
        resolve: async () => {
          throw new Error("dns poison https://example.invalid/sk_test");
        },
      }),
    });
    const dns = await dnsFailure.acquireCandidates(attempt());

    expect(dns).toMatchObject({
      structuralStatus: "provider_failure",
      candidates: [],
    });
    expect(dnsTelemetry).toEqual([
      expect.objectContaining({
        structuralStatus: "provider_failure",
        stopReason: "dns_resolution_failed",
        byteCountState: "not_reached",
        compressedBytes: 0,
        decompressedBytes: 0,
      }),
    ]);
    expect(JSON.stringify(dnsTelemetry)).not.toContain("example.invalid");
    expect(JSON.stringify(dnsTelemetry)).not.toContain("sk_test");

    const byteTelemetry: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
    const byteCappedEndpoint = endpoint({
      compressedByteCap: 8,
      decompressedByteCap: 8,
      totalByteCap: 8,
    });
    const byteCappedBudget = budget({
      endpointSnapshotHash: byteCappedEndpoint.endpointSnapshotHash,
    });
    const byteCapProvider = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority(byteCappedEndpoint, byteCappedBudget),
      endpoints: [byteCappedEndpoint],
      budget: byteCappedBudget,
      attemptTelemetrySink: (record) => byteTelemetry.push(record),
      lowLevelTransport: lowLevelTransport({
        request: async () => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from("{\"items\":[{\"secret\":\"sk_test_raw\"}]}", "utf8"),
        }),
      }),
    });
    const byteCap = await byteCapProvider.acquireCandidates(attempt());

    expect(byteCap).toMatchObject({
      structuralStatus: "search_failure",
      candidates: [],
    });
    expect(byteTelemetry).toEqual([
      expect.objectContaining({
        structuralStatus: "search_failure",
        stopReason: "compressed_byte_cap_exceeded",
        byteCountState: "observed",
        decompressedBytes: 0,
      }),
    ]);
    expect(byteTelemetry[0]?.compressedBytes).toBeGreaterThan(0);
    expect(JSON.stringify(byteTelemetry)).not.toContain("sk_test_raw");
  });
});

import { gzipSync } from "node:zlib";
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
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  sourceAcquisitionNetworkApproval,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
  type SourceAcquisitionNetworkRequestEnvelope,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";
import {
  createSourceAcquisitionNetworkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  classifySourceAcquisitionNetworkIpAddress,
  executeSourceAcquisitionNetworkTransport,
  normalizeSourceAcquisitionNetworkHostname,
  type SourceAcquisitionNetworkLowLevelTransport,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-transport";

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
    compressedByteCap: 256,
    decompressedByteCap: 256,
    totalByteCap: 256,
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

function authority(currentEndpoint = endpoint(), currentBudget = budget()) {
  const candidateAuthority = createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority: createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot()),
    configSnapshotHash: "config-hash-7n3b2",
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b2",
    budgetSnapshotHash: "budget-hash-7n3b2",
  });
  return createSourceAcquisitionNetworkAuthority({
    candidateAuthority,
    endpointSnapshot: currentEndpoint,
    budgetSnapshot: currentBudget,
  });
}

function networkRequest(
  overrides: Partial<SourceAcquisitionNetworkRequestEnvelope> = {},
): SourceAcquisitionNetworkRequestEnvelope {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    visibility: "internal_only",
    providerId: "test_provider",
    endpointId: "ep_candidate_search",
    queryId: "EQ_001",
    retrievalPolicyKey: "baseline_research",
    providerAttemptId: "ATT_1",
    requestParameters: [{ key: "q", value: "Plastic recycling is pointless" }],
    requestHeaders: [{ key: "accept", valueSource: "application_json" }],
    ...overrides,
  };
}

function fakeTransport(
  overrides: Partial<SourceAcquisitionNetworkLowLevelTransport> & {
    readonly remoteAddress?: string;
    readonly body?: Uint8Array;
    readonly statusCode?: number;
    readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
    readonly resolvedAddress?: string;
  } = {},
): SourceAcquisitionNetworkLowLevelTransport {
  return {
    resolve: overrides.resolve ?? (async () => [{
      address: overrides.resolvedAddress ?? "93.184.216.34",
      family: 4,
    }]),
    request: overrides.request ?? (async () => ({
      statusCode: overrides.statusCode ?? 200,
      headers: overrides.headers ?? { "content-type": "application/json" },
      remoteAddress: overrides.remoteAddress ?? "93.184.216.34",
      body: overrides.body ?? Buffer.from("{\"items\":[{}]}", "utf8"),
    })),
    now: overrides.now,
  };
}

describe("Analyzer V2 source-acquisition provider-network transport", () => {
  it("executes an SDK-free HTTPS transport through explicit DNS and final-address validation", async () => {
    const seenPaths: string[] = [];
    const transport = fakeTransport({
      request: async (request) => {
        seenPaths.push(request.pathWithQuery);
        expect(request.headers.accept).toBe("application/json");
        expect(request.lookupAddress.address).toBe("93.184.216.34");
        expect(request.signal).toBeUndefined();
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from("{\"items\":[{\"title\":\"raw title\",\"url\":\"https://example.test\"}]}", "utf8"),
        };
      },
    });

    const outcome = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint(),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: transport,
    });

    expect(outcome.status).toBe("success");
    expect(outcome).toMatchObject({ candidateCount: 1 });
    expect(seenPaths).toEqual(["/candidate-search?q=Plastic+recycling+is+pointless"]);
    expect(outcome.diagnostic).toMatchObject({
      dnsAddressCount: 1,
      selectedAddressFamily: "ipv4",
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCodeCategory: "success_2xx",
      contentTypeState: "accepted_json",
      transportFailureClass: "not_applicable",
      transportFailurePhase: "not_applicable",
      transportErrorShape: "not_applicable",
      nodeErrorCodeCategory: "none",
      rawPayloadIncluded: false,
      secretIncluded: false,
      cacheKeyConstructed: false,
      sourceReliabilityTouched: false,
    });
    expect(JSON.stringify(outcome)).not.toContain("Plastic recycling");
    expect(JSON.stringify(outcome)).not.toContain("https://");
    expect(JSON.stringify(outcome)).not.toContain("raw title");
  });

  it("blocks private, loopback, link-local, IPv4-mapped IPv6, metadata, multicast, and reserved addresses", async () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "::1",
      "fe80::1",
      "fc00::1",
      "ff00::1",
      "::ffff:127.0.0.1",
      "2001:db8::1",
    ]) {
      expect(classifySourceAcquisitionNetworkIpAddress(address)).toBe("blocked");
      const outcome = await executeSourceAcquisitionNetworkTransport({
        authority: authority(),
        endpoint: endpoint(),
        budget: budget(),
        request: networkRequest(),
        lowLevelTransport: fakeTransport({ resolvedAddress: address }),
      });
      expect(outcome).toMatchObject({
        status: "blocked",
        diagnostic: {
          stopReason: "dns_address_blocked",
          selectedAddressFamily: "not_reached",
          finalAddressValidation: "blocked_or_mismatched",
        },
      });
    }
  });

  it("normalizes IDNA hostnames and rejects trailing-dot endpoint snapshots before request", async () => {
    expect(normalizeSourceAcquisitionNetworkHostname("BÜCHER.example")).toBe("xn--bcher-kva.example");
    const blocked = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint({ canonicalAsciiHostname: "search.example.com." }),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: fakeTransport(),
    });
    expect(blocked).toMatchObject({
      status: "blocked",
      diagnostic: { stopReason: "endpoint_invalid" },
    });
  });

  it("rejects final socket address mismatch and redirects without following them", async () => {
    const mismatch = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint(),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: fakeTransport({ remoteAddress: "93.184.216.35" }),
    });
    expect(mismatch).toMatchObject({
      status: "blocked",
      diagnostic: {
        stopReason: "final_address_mismatch",
        selectedAddressFamily: "ipv4",
        finalAddressValidation: "blocked_or_mismatched",
      },
    });

    const redirect = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint(),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: fakeTransport({
        statusCode: 302,
        headers: { "content-type": "application/json", location: "https://evil.example" },
      }),
    });
    expect(redirect).toMatchObject({
      status: "blocked",
      diagnostic: {
        stopReason: "redirect_denied",
        selectedAddressFamily: "ipv4",
        responseStatusCodeCategory: "redirect_3xx",
        transportFailureClass: "not_applicable",
        transportFailurePhase: "not_applicable",
        transportErrorShape: "not_applicable",
        nodeErrorCodeCategory: "none",
        redirectDenied: true,
      },
    });
    expect(JSON.stringify(redirect)).not.toContain("evil.example");
  });

  it("ignores proxy env vars and rejects content-type, sniff, byte, and decompression violations", async () => {
    process.env.HTTP_PROXY = "http://127.0.0.1:8888";
    process.env.http_proxy = "http://127.0.0.1:8888";
    process.env.HTTPS_PROXY = "http://127.0.0.1:8888";
    process.env.https_proxy = "http://127.0.0.1:8888";

    const html = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint(),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: fakeTransport({ headers: { "content-type": "text/html" } }),
    });
    expect(html.diagnostic.stopReason).toBe("content_type_rejected");

    const executable = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint(),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: fakeTransport({ body: Buffer.from("<script>alert(1)</script>", "utf8") }),
    });
    expect(executable.diagnostic.stopReason).toBe("content_sniff_rejected");

    const overrun = await executeSourceAcquisitionNetworkTransport({
      authority: authority(),
      endpoint: endpoint({ compressedByteCap: 8 }),
      budget: budget(),
      request: networkRequest(),
      lowLevelTransport: fakeTransport({ body: Buffer.from("{\"items\":[{},{}]}", "utf8") }),
    });
    expect(overrun.diagnostic.stopReason).toBe("compressed_byte_cap_exceeded");

    const gzipEndpoint = endpoint({
      decompressionPolicy: "gzip_allowed",
      decompressedByteCap: 8,
      totalByteCap: 64,
      compressedByteCap: 64,
    });
    const gzipBudget = budget();
    const compressed = await executeSourceAcquisitionNetworkTransport({
      authority: authority(gzipEndpoint, gzipBudget),
      endpoint: gzipEndpoint,
      budget: gzipBudget,
      request: networkRequest(),
      lowLevelTransport: fakeTransport({
        headers: { "content-type": "application/json", "content-encoding": "gzip" },
        body: gzipSync(Buffer.from("{\"items\":[{},{}]}", "utf8")),
      }),
    });
    expect(compressed.diagnostic.stopReason).toBe("decompressed_byte_cap_exceeded");
  });

  it("bounds DNS resolution and maps timeout, abort, and thrown errors to sanitized non-leaking outcomes", async () => {
    const timeoutEndpoint = endpoint({ timeoutMs: 5 });
    const timeoutBudget = budget({
      perQueryTimeoutMs: 5,
      totalNetworkTimeoutMs: 10,
    });
    const dnsTimeout = await executeSourceAcquisitionNetworkTransport({
      authority: authority(timeoutEndpoint, timeoutBudget),
      endpoint: timeoutEndpoint,
      budget: timeoutBudget,
      request: networkRequest(),
      lowLevelTransport: fakeTransport({
        resolve: async () => new Promise(() => undefined),
      }),
    });
    expect(dnsTimeout).toMatchObject({
      status: "timed_out",
      diagnostic: {
        stopReason: "timed_out",
        selectedAddressFamily: "not_reached",
        transportFailureClass: "not_applicable",
        transportFailurePhase: "dns_resolution",
        transportErrorShape: "synthetic_timeout_marker",
        nodeErrorCodeCategory: "none",
      },
    });

    const resetError = Object.assign(new Error("raw https://example.test sk_secret stack"), {
      code: "ECONNRESET",
    });
    const tlsError = Object.assign(new Error("tls raw https://example.test sk_secret stack"), {
      code: "ERR_TLS_CERT_ALTNAME_INVALID",
    });
    const networkUnreachableError = Object.assign(new Error("network raw https://example.test sk_secret stack"), {
      code: "ENETUNREACH",
    });
    const hostUnreachableError = Object.assign(new Error("host raw https://example.test sk_secret stack"), {
      code: "EHOSTUNREACH",
    });
    const addressFamilyError = Object.assign(new Error("address raw https://example.test sk_secret stack"), {
      code: "EAFNOSUPPORT",
    });
    const addressUnavailableError = Object.assign(new Error("address raw https://example.test sk_secret stack"), {
      code: "EADDRNOTAVAIL",
    });
    const addressValidationError = Object.assign(new Error("address raw https://example.test sk_secret stack"), {
      code: "ERR_INVALID_IP_ADDRESS",
    });
    const httpsProtocolError = Object.assign(new Error("protocol raw https://example.test sk_secret stack"), {
      code: "EPROTO",
    });
    const sslProtocolError = Object.assign(new Error("ssl raw https://example.test sk_secret stack"), {
      code: "ERR_SSL_WRONG_VERSION_NUMBER",
    });
    const thrownCases = [
      {
        thrown: "timed_out",
        stopReason: "timed_out",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "not_applicable",
        transportFailurePhase: "response_wait",
        transportErrorShape: "synthetic_timeout_marker",
        nodeErrorCodeCategory: "none",
      },
      {
        thrown: "cancelled",
        stopReason: "cancelled",
        selectedAddressFamily: "not_reached",
        transportFailureClass: "not_applicable",
        transportFailurePhase: "dns_resolution",
        transportErrorShape: "synthetic_cancel_marker",
        nodeErrorCodeCategory: "none",
      },
      {
        thrown: new Error("raw https://example.test sk_secret stack"),
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "unknown_transport_failure",
        transportFailurePhase: "unknown_phase",
        transportErrorShape: "node_error_code_absent",
        nodeErrorCodeCategory: "unknown_absent",
      },
      {
        thrown: resetError,
        rawCode: "ECONNRESET",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "connection_reset",
        transportFailurePhase: "response_wait",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "connection_reset",
      },
      {
        thrown: tlsError,
        rawCode: "ERR_TLS_CERT_ALTNAME_INVALID",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "tls_failure",
        transportFailurePhase: "tls_handshake",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "tls_protocol",
      },
      {
        thrown: networkUnreachableError,
        rawCode: "ENETUNREACH",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "network_unreachable",
        transportFailurePhase: "socket_connect",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "network_unreachable",
      },
      {
        thrown: hostUnreachableError,
        rawCode: "EHOSTUNREACH",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "host_unreachable",
        transportFailurePhase: "socket_connect",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "host_unreachable",
      },
      {
        thrown: addressFamilyError,
        rawCode: "EAFNOSUPPORT",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "address_family_failure",
        transportFailurePhase: "address_selection",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "address_family_failure",
      },
      {
        thrown: addressUnavailableError,
        rawCode: "EADDRNOTAVAIL",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "address_family_failure",
        transportFailurePhase: "address_selection",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "address_family_failure",
      },
      {
        thrown: addressValidationError,
        rawCode: "ERR_INVALID_IP_ADDRESS",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "address_validation_failure",
        transportFailurePhase: "address_selection",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "address_validation_failure",
      },
      {
        thrown: httpsProtocolError,
        rawCode: "EPROTO",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "tls_failure",
        transportFailurePhase: "tls_handshake",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "tls_protocol",
      },
      {
        thrown: sslProtocolError,
        rawCode: "ERR_SSL_WRONG_VERSION_NUMBER",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "tls_failure",
        transportFailurePhase: "tls_handshake",
        transportErrorShape: "node_error_code_present",
        nodeErrorCodeCategory: "tls_protocol",
      },
      {
        thrown: "non_error_throwable",
        stopReason: "transport_failure",
        selectedAddressFamily: "ipv4",
        transportFailureClass: "unknown_transport_failure",
        transportFailurePhase: "unknown_phase",
        transportErrorShape: "non_error_throwable",
        nodeErrorCodeCategory: "unknown_absent",
      },
    ] as const;

    for (const testCase of thrownCases) {
      const controller = new AbortController();
      if (testCase.thrown === "cancelled") {
        controller.abort();
      }
      const outcome = await executeSourceAcquisitionNetworkTransport({
        authority: authority(),
        endpoint: endpoint(),
        budget: budget(),
        request: networkRequest(),
        signal: controller.signal,
        lowLevelTransport: fakeTransport({
          request: async () => {
            throw testCase.thrown === "non_error_throwable"
              ? testCase.thrown
              : typeof testCase.thrown === "string"
                ? new Error(testCase.thrown)
                : testCase.thrown;
          },
        }),
      });
      const serialized = JSON.stringify(outcome);

      expect(serialized).not.toContain("example.test");
      expect(serialized).not.toContain("sk_secret");
      expect(serialized).not.toContain("stack");
      if ("rawCode" in testCase) {
        expect(serialized).not.toContain(testCase.rawCode);
      }
      expect(outcome.diagnostic).toMatchObject({
        stopReason: testCase.stopReason,
        selectedAddressFamily: testCase.selectedAddressFamily,
        transportFailureClass: testCase.transportFailureClass,
        transportFailurePhase: testCase.transportFailurePhase,
        transportErrorShape: testCase.transportErrorShape,
        nodeErrorCodeCategory: testCase.nodeErrorCodeCategory,
      });
    }
  });
});

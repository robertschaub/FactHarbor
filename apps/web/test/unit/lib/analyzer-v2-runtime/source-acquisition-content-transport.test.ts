import { createHash, createHmac } from "node:crypto";
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
import {
  createSourceAcquisitionContentDereferenceAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-authority";
import {
  SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
  sourceAcquisitionContentApproval,
  type SourceAcquisitionContentBudgetSnapshot,
  type SourceAcquisitionContentTargetEnvelope,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-envelope";
import {
  classifySourceAcquisitionContentIpAddress,
  createSourceAcquisitionContentEphemeralTarget,
  executeSourceAcquisitionContentTransport,
  executeSourceAcquisitionContentTransportPacketHandoff,
  normalizeSourceAcquisitionContentHostname,
  type SourceAcquisitionContentEphemeralTarget,
  type SourceAcquisitionContentLowLevelTransport,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-transport";
import {
  createSourceAcquisitionContentPacketSinkAuthority,
  createSourceAcquisitionContentTransportPacketSinkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink";

const CONTENT_POLICY_BINDING_KEY = {
  keyId: "POLICY_CONTENT_HMAC_KEY_001",
  keyMaterial: "test-only-content-policy-binding-key",
};
const CONTENT_AUTHORITY_HASH = "2222222222222222222222222222222222222222222222222222222222222222";
const CONTENT_TARGET_HASH = "3333333333333333333333333333333333333333333333333333333333333333";
const CONTENT_BUDGET_HASH = "4444444444444444444444444444444444444444444444444444444444444444";

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

function networkEndpoint(): SourceAcquisitionNetworkEndpointSnapshot {
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
  };
}

function networkBudget(): SourceAcquisitionNetworkBudgetSnapshot {
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
  };
}

function networkAuthority(): SourceAcquisitionNetworkAuthority {
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

function hmacReference(value: string) {
  return {
    kind: "keyed_hmac" as const,
    algorithm: "hmac_sha256" as const,
    keyId: CONTENT_POLICY_BINDING_KEY.keyId,
    value: `HMAC_SHA256_${createHmac("sha256", CONTENT_POLICY_BINDING_KEY.keyMaterial)
      .update(value, "utf8")
      .digest("hex")
      .toUpperCase()}`,
  };
}

function target(
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
    canonicalHostnameReference: hmacReference("content.example.com"),
    fixedPathReference: hmacReference("/approved-content"),
    queryReference: hmacReference(""),
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

function budget(
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
    declaredByteCap: 128,
    streamingByteCap: 128,
    compressedByteCap: 128,
    decompressedByteCap: 256,
    totalByteCapPerRun: 384,
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

function contentAuthority(
  currentTarget = target(),
  currentBudget = budget(),
) {
  const candidateAuthority = createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority: createSourceAcquisitionRuntimeAuthority(parentAuthoritySnapshot()),
    configSnapshotHash: "config-hash-7n3b3-1",
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b3-1",
    budgetSnapshotHash: "budget-hash-7n3b3-1",
  });
  const providerNetworkAuthority = createSourceAcquisitionNetworkAuthority({
    candidateAuthority,
    endpointSnapshot: networkEndpoint(),
    budgetSnapshot: networkBudget(),
  });
  return createSourceAcquisitionContentDereferenceAuthority({
    networkAuthority: providerNetworkAuthority,
    targetEnvelope: currentTarget,
    budgetSnapshot: currentBudget,
  });
}

function executionTarget(
  overrides: Partial<SourceAcquisitionContentEphemeralTarget> = {},
  currentTarget = target(),
): SourceAcquisitionContentEphemeralTarget {
  return createSourceAcquisitionContentEphemeralTarget({
    target: currentTarget,
    policyBindingKey: CONTENT_POLICY_BINDING_KEY,
    canonicalHostname: "content.example.com",
    port: 443,
    method: "GET",
    pathWithQuery: "/approved-content",
    requestHeaders: {
      accept: "text/html, text/plain, application/json, application/pdf",
      "user-agent": "FactHarbor-V2-Internal",
    },
    fetchAttemptId: "ATT_1",
    ...overrides,
  });
}

function fakeTransport(
  overrides: Partial<SourceAcquisitionContentLowLevelTransport> & {
    readonly remoteAddress?: string;
    readonly body?: Uint8Array;
    readonly statusCode?: number;
    readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
    readonly resolvedAddress?: string;
  } = {},
): SourceAcquisitionContentLowLevelTransport {
  return {
    resolve: overrides.resolve ?? (async () => [{
      address: overrides.resolvedAddress ?? "93.184.216.34",
      family: 4,
    }]),
    request: overrides.request ?? (async (request) => {
      expect(request.finalAddressValidationRequiredBeforeRequestEmission).toBe(true);
      expect(request.lookupAddress.address).toBe(overrides.resolvedAddress ?? "93.184.216.34");
      return {
        statusCode: overrides.statusCode ?? 200,
        headers: overrides.headers ?? { "content-type": "text/html", "content-length": "31" },
        remoteAddress: overrides.remoteAddress ?? "93.184.216.34",
        body: overrides.body ?? Buffer.from("<html><body>hidden</body></html>", "utf8"),
      };
    }),
    now: overrides.now,
  };
}

describe("Analyzer V2 source-acquisition content-dereference transport", () => {
  it("executes a hidden SDK-free content fetch with pinned DNS and sanitized structural outcome", async () => {
    const seenPaths: string[] = [];
    const transport = fakeTransport({
      request: async (request) => {
        seenPaths.push(request.pathWithQuery);
        expect(request.headers.accept).toContain("text/html");
        expect(request.finalAddressValidationRequiredBeforeRequestEmission).toBe(true);
        expect(request.lookupAddress.address).toBe("93.184.216.34");
        return {
          statusCode: 200,
          headers: { "content-type": "text/html", "content-length": "43" },
          remoteAddress: "93.184.216.34",
          body: Buffer.from("<html><title>Hidden Title</title></html>", "utf8"),
        };
      },
    });

    const outcome = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      lowLevelTransport: transport,
    });

    expect(outcome.status).toBe("success");
    expect(seenPaths).toEqual(["/approved-content"]);
    expect(outcome.diagnostic).toMatchObject({
      contentTargetId: "OPAQUE_CONTENT_TARGET_001",
      finalAddressValidation: "matched_validated_public_address",
      rawPayloadIncluded: false,
      extractedTextIncluded: false,
      parserPayloadIncluded: false,
      cacheKeyConstructed: false,
      sourceReliabilityTouched: false,
      warningIncluded: false,
      verdictIncluded: false,
      reportProseIncluded: false,
    });
    expect(JSON.stringify(outcome)).not.toContain("content.example.com");
    expect(JSON.stringify(outcome)).not.toContain("/approved-content");
    expect(JSON.stringify(outcome)).not.toContain("Hidden Title");
    expect(JSON.stringify(outcome)).not.toContain("https://");
  });

  it("blocks unsafe DNS answers, mixed unsafe answer sets, and metadata/private/reserved addresses before request", async () => {
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
      "::ffff:93.184.216.34",
      "2001:db8::1",
    ]) {
      expect(classifySourceAcquisitionContentIpAddress(address)).toBe("blocked");
      let requestCalled = false;
      const outcome = await executeSourceAcquisitionContentTransport({
        authority: contentAuthority(),
        target: target(),
        budget: budget(),
        executionTarget: executionTarget(),
        lowLevelTransport: fakeTransport({
          resolvedAddress: address,
          request: async () => {
            requestCalled = true;
            throw new Error("must_not_request");
          },
        }),
      });
      expect(requestCalled).toBe(false);
      expect(outcome).toMatchObject({
        status: "blocked",
        diagnostic: {
          stopReason: "dns_address_blocked",
          finalAddressValidation: "blocked_or_mismatched",
        },
      });
    }

    let mixedRequestCalled = false;
    const mixed = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        resolve: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
        request: async () => {
          mixedRequestCalled = true;
          throw new Error("must_not_request");
        },
      }),
    });
    expect(mixedRequestCalled).toBe(false);
    expect(mixed.diagnostic.stopReason).toBe("dns_address_blocked");
  });

  it("normalizes IDNA hostnames and rejects malformed ephemeral target data before DNS", async () => {
    expect(normalizeSourceAcquisitionContentHostname("BÜCHER.example")).toBe("xn--bcher-kva.example");
    expect(() => createSourceAcquisitionContentEphemeralTarget({
      target: target(),
      policyBindingKey: CONTENT_POLICY_BINDING_KEY,
      canonicalHostname: "other.example.com",
      port: 443,
      method: "GET",
      pathWithQuery: "/approved-content",
      requestHeaders: {
        accept: "text/html, text/plain, application/json, application/pdf",
        "user-agent": "FactHarbor-V2-Internal",
      },
      fetchAttemptId: "ATT_1",
    })).toThrow(/opaque references/);

    let dnsCalled = false;
    const malformedExecutionTarget = {
      ...executionTarget(),
      canonicalHostname: "content.example.com.",
    } as SourceAcquisitionContentEphemeralTarget;
    const blocked = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: malformedExecutionTarget,
      lowLevelTransport: fakeTransport({
        resolve: async () => {
          dnsCalled = true;
          return [{ address: "93.184.216.34", family: 4 }];
        },
      }),
    });

    expect(dnsCalled).toBe(false);
    expect(blocked.diagnostic.stopReason).toBe("request_invalid");

    const unbrandedExecutionTarget = {
      canonicalHostname: "content.example.com",
      port: 443,
      method: "GET",
      pathWithQuery: "/approved-content",
      requestHeaders: {
        accept: "text/html",
        "user-agent": "FactHarbor-V2-Internal",
      },
      fetchAttemptId: "ATT_1",
    } as SourceAcquisitionContentEphemeralTarget;
    const unbranded = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: unbrandedExecutionTarget,
      lowLevelTransport: fakeTransport({
        resolve: async () => {
          dnsCalled = true;
          return [{ address: "93.184.216.34", family: 4 }];
        },
      }),
    });
    expect(unbranded.diagnostic.stopReason).toBe("request_invalid");
  });

  it("rejects final-address mismatch and redirects without leaking redirect targets", async () => {
    const mismatch = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({ remoteAddress: "93.184.216.35" }),
    });
    expect(mismatch).toMatchObject({
      status: "blocked",
      diagnostic: {
        stopReason: "final_address_mismatch",
        finalAddressValidation: "blocked_or_mismatched",
      },
    });

    const redirect = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        statusCode: 302,
        headers: { "content-type": "text/html", location: "https://redirect.example/path" },
      }),
    });
    expect(redirect).toMatchObject({
      status: "blocked",
      diagnostic: {
        stopReason: "redirect_denied",
        redirectDenied: true,
      },
    });
    expect(JSON.stringify(redirect)).not.toContain("redirect.example");
  });

  it("rejects content-type, declared, streaming, compressed, and decompression cap violations", async () => {
    const wrongType = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({ headers: { "content-type": "image/png" } }),
    });
    expect(wrongType.diagnostic.stopReason).toBe("content_type_rejected");

    const sniffMismatch = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        headers: { "content-type": "text/html" },
        body: Buffer.from("{\"not\":\"html\"}", "utf8"),
      }),
    });
    expect(sniffMismatch).toMatchObject({
      status: "blocked",
      diagnostic: {
        stopReason: "content_type_rejected",
        contentTypeState: "rejected",
      },
    });

    const declared = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget({ declaredByteCap: 64, streamingByteCap: 64, compressedByteCap: 64 }),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({ headers: { "content-type": "text/html", "content-length": "65" } }),
    });
    expect(declared.diagnostic.stopReason).toBe("declared_byte_cap_exceeded");

    const streaming = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target(),
      budget: budget({ streamingByteCap: 64, compressedByteCap: 64, declaredByteCap: 64 }),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        headers: { "content-type": "text/html" },
        body: Buffer.alloc(65, "a"),
      }),
    });
    expect(streaming.diagnostic.stopReason).toBe("streaming_byte_cap_exceeded");

    const compressed = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(),
      target: target({ decompressionPolicy: "gzip_allowed" }),
      budget: budget({ compressedByteCap: 64, streamingByteCap: 128, declaredByteCap: 128 }),
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        headers: { "content-type": "text/html", "content-encoding": "identity" },
        body: Buffer.alloc(65, "a"),
      }),
    });
    expect(compressed.diagnostic.stopReason).toBe("compressed_byte_cap_exceeded");

    const gzipTarget = target({ decompressionPolicy: "gzip_allowed" });
    const gzipBudget = budget({
      compressedByteCap: 128,
      streamingByteCap: 128,
      declaredByteCap: 128,
      decompressedByteCap: 128,
    });
    const bomb = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(gzipTarget, gzipBudget),
      target: gzipTarget,
      budget: gzipBudget,
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        headers: { "content-type": "text/html", "content-encoding": "gzip" },
        body: gzipSync(Buffer.alloc(129, "a")),
      }),
    });
    expect(bomb.diagnostic.stopReason).toBe("decompressed_byte_cap_exceeded");
  });

  it("bounds DNS and request stalls, maps cancellation and transport errors to sanitized outcomes", async () => {
    const timeoutBudget = budget({
      perFetchTimeoutMs: 5,
      totalContentDereferenceTimeoutMs: 10,
    });
    const dnsTimeout = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(target(), timeoutBudget),
      target: target(),
      budget: timeoutBudget,
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        resolve: async () => new Promise(() => undefined),
      }),
    });
    expect(dnsTimeout).toMatchObject({
      status: "timed_out",
      diagnostic: { stopReason: "timed_out" },
    });

    const requestTimeout = await executeSourceAcquisitionContentTransport({
      authority: contentAuthority(target(), timeoutBudget),
      target: target(),
      budget: timeoutBudget,
      executionTarget: executionTarget(),
      lowLevelTransport: fakeTransport({
        request: async () => new Promise(() => undefined),
      }),
    });
    expect(requestTimeout).toMatchObject({
      status: "timed_out",
      diagnostic: { stopReason: "timed_out" },
    });

    for (const thrown of ["cancelled", "raw https://example.test sk_secret stack"] as const) {
      const controller = new AbortController();
      if (thrown === "cancelled") {
        controller.abort();
      }
      const outcome = await executeSourceAcquisitionContentTransport({
        authority: contentAuthority(),
        target: target(),
        budget: budget(),
        executionTarget: executionTarget(),
        signal: controller.signal,
        lowLevelTransport: fakeTransport({
          request: async () => {
            throw new Error(thrown);
          },
        }),
      });
      const serialized = JSON.stringify(outcome);

      expect(serialized).not.toContain("example.test");
      expect(serialized).not.toContain("sk_secret");
      expect(serialized).not.toContain("stack");
      expect(["cancelled", "transport_failure"]).toContain(outcome.diagnostic.stopReason);
    }
  });

  it("keeps transport-packet handoff disabled by default without executing DNS or requests", async () => {
    let dnsCalled = false;
    let requestCalled = false;
    const outcome = await executeSourceAcquisitionContentTransportPacketHandoff({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      packetSinkAuthority: createSourceAcquisitionContentTransportPacketSinkAuthority(),
      lowLevelTransport: fakeTransport({
        resolve: async () => {
          dnsCalled = true;
          return [{ address: "93.184.216.34", family: 4 }];
        },
        request: async () => {
          requestCalled = true;
          throw new Error("must_not_request");
        },
      }),
    });

    expect(outcome).toMatchObject({
      status: "disabled",
      transportOutcome: null,
      sealingOutcome: null,
      materializationOutcome: null,
      blockedReasons: ["transport_packet_handoff_disabled"],
      rawPayloadIncluded: false,
      extractedTextIncluded: false,
      parserPayloadIncluded: false,
      evidenceItemIncluded: false,
      warningIncluded: false,
      verdictIncluded: false,
      reportProseIncluded: false,
    });
    expect(dnsCalled).toBe(false);
    expect(requestCalled).toBe(false);
  });

  it("materializes a hidden transport packet only after validated successful transport", async () => {
    const packetSinkAuthority = createSourceAcquisitionContentTransportPacketSinkAuthority();
    const outcome = await executeSourceAcquisitionContentTransportPacketHandoff({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      packetSinkAuthority,
      transportPacketHandoffMode: "enabled_hidden_transport_to_sink_7n3b3_2c_a",
      lowLevelTransport: fakeTransport({
        headers: { "content-type": "text/html", "content-length": "43" },
        body: Buffer.from("<html><title>Hidden Title</title></html>", "utf8"),
      }),
    });
    const serialized = JSON.stringify(outcome);

    expect(outcome.status).toBe("accepted");
    expect(outcome.transportOutcome).toMatchObject({
      status: "success",
      diagnostic: {
        stopReason: "not_stopped",
        rawPayloadIncluded: false,
        extractedTextIncluded: false,
        parserPayloadIncluded: false,
        evidenceItemIncluded: false,
        warningIncluded: false,
        verdictIncluded: false,
        reportProseIncluded: false,
      },
    });
    expect(outcome.sealingOutcome?.status).toBe("accepted");
    expect(outcome.materializationOutcome?.status).toBe("accepted");
    expect(outcome.disposalOutcome?.status).toBe("disposed");
    expect(outcome.frame).toBeNull();
    expect(outcome.materializationOutcome?.packet?.parserAuthorizationStatus).toBe("not_authorized");
    expect(outcome.materializationOutcome?.packet?.lifecycleStatus).toBe("disposed");
    expect(outcome.materializationOutcome?.packet?.byteCount).toBe(0);
    expect(serialized).not.toContain("Hidden Title");
    expect(serialized).not.toContain("content.example.com");
    expect(serialized).not.toContain("/approved-content");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("hmacKeyMaterial");
  });

  it("creates no transport packet for blocked transport controls or wrong sink authority", async () => {
    let requestCalled = false;
    const blocked = await executeSourceAcquisitionContentTransportPacketHandoff({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      packetSinkAuthority: createSourceAcquisitionContentTransportPacketSinkAuthority(),
      transportPacketHandoffMode: "enabled_hidden_transport_to_sink_7n3b3_2c_a",
      lowLevelTransport: fakeTransport({
        resolvedAddress: "127.0.0.1",
        request: async () => {
          requestCalled = true;
          throw new Error("must_not_request");
        },
      }),
    });

    expect(blocked).toMatchObject({
      status: "blocked",
      sealingOutcome: null,
      materializationOutcome: null,
      blockedReasons: ["dns_address_blocked"],
    });
    expect(requestCalled).toBe(false);

    let wrongAuthorityDnsCalled = false;
    let wrongAuthorityRequestCalled = false;
    const wrongAuthority = await executeSourceAcquisitionContentTransportPacketHandoff({
      authority: contentAuthority(),
      target: target(),
      budget: budget(),
      executionTarget: executionTarget(),
      packetSinkAuthority: createSourceAcquisitionContentPacketSinkAuthority() as unknown as ReturnType<
        typeof createSourceAcquisitionContentTransportPacketSinkAuthority
      >,
      transportPacketHandoffMode: "enabled_hidden_transport_to_sink_7n3b3_2c_a",
      lowLevelTransport: fakeTransport({
        resolve: async () => {
          wrongAuthorityDnsCalled = true;
          return [{ address: "93.184.216.34", family: 4 }];
        },
        request: async () => {
          wrongAuthorityRequestCalled = true;
          throw new Error("must_not_request");
        },
      }),
    });

    expect(wrongAuthority).toMatchObject({
      status: "rejected",
      sealingOutcome: {
        status: "rejected",
        blockedReasons: ["authority_invalid"],
      },
      materializationOutcome: null,
      blockedReasons: ["authority_invalid"],
    });
    expect(wrongAuthority.transportOutcome).toBeNull();
    expect(wrongAuthorityDnsCalled).toBe(false);
    expect(wrongAuthorityRequestCalled).toBe(false);
    expect(JSON.stringify(wrongAuthority)).not.toContain("hidden");
  });

  it("releases hidden transport-packet capacity on accepted terminal handoff", async () => {
    const packetSinkAuthority = createSourceAcquisitionContentTransportPacketSinkAuthority({
      maxRetainedPackets: 1,
      maxRetainedBytes: 16,
    });

    for (const [fetchAttemptId, body] of [["ATT_1", "first"], ["ATT_2", "second"]] as const) {
      const outcome = await executeSourceAcquisitionContentTransportPacketHandoff({
        authority: contentAuthority(),
        target: target(),
        budget: budget(),
        executionTarget: executionTarget({ fetchAttemptId }),
        packetSinkAuthority,
        transportPacketHandoffMode: "enabled_hidden_transport_to_sink_7n3b3_2c_a",
        lowLevelTransport: fakeTransport({
          headers: { "content-type": "text/plain", "content-length": String(body.length) },
          body: Buffer.from(body, "utf8"),
        }),
      });

      expect(outcome.status).toBe("accepted");
      expect(outcome.disposalOutcome?.status).toBe("disposed");
      expect(outcome.materializationOutcome?.packet?.lifecycleStatus).toBe("disposed");
      expect(JSON.stringify(outcome)).not.toContain(body);
    }
  });
});

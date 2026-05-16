import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
  buildSourceAcquisitionContentHiddenDiagnostic,
  sourceAcquisitionContentApproval,
  validateSourceAcquisitionContentBudgetSnapshot,
  validateSourceAcquisitionContentRequestBinding,
  validateSourceAcquisitionContentTargetEnvelope,
  type SourceAcquisitionContentBudgetSnapshot,
  type SourceAcquisitionContentTargetEnvelope,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-envelope";

const PROVIDER_NETWORK_AUTHORITY_HASH = "1111111111111111111111111111111111111111111111111111111111111111";
const CONTENT_AUTHORITY_HASH = "2222222222222222222222222222222222222222222222222222222222222222";
const CONTENT_TARGET_HASH = "3333333333333333333333333333333333333333333333333333333333333333";
const CONTENT_BUDGET_HASH = "4444444444444444444444444444444444444444444444444444444444444444";

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
    providerNetworkAuthoritySnapshotHash: PROVIDER_NETWORK_AUTHORITY_HASH,
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

function budget(
  overrides: Partial<SourceAcquisitionContentBudgetSnapshot> = {},
): SourceAcquisitionContentBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
    approval: sourceAcquisitionContentApproval(),
    contentBudgetSnapshotHash: CONTENT_BUDGET_HASH,
    contentTargetSnapshotHash: CONTENT_TARGET_HASH,
    providerNetworkAuthoritySnapshotHash: PROVIDER_NETWORK_AUTHORITY_HASH,
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

describe("Analyzer V2 source-acquisition content-dereference envelope", () => {
  it("validates raw-URL-free content target and budget snapshots", () => {
    expect(validateSourceAcquisitionContentTargetEnvelope(target())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
    expect(validateSourceAcquisitionContentBudgetSnapshot(budget())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
    expect(validateSourceAcquisitionContentRequestBinding({
      target: target(),
      budget: budget(),
    })).toEqual({
      status: "valid",
      blockedReasons: [],
    });
  });

  it("rejects raw URL, provider URL, user URL, source/title/snippet, secret, and header fields", () => {
    const invalidTargets = [
      { ...target(), rawUrl: "https://source.example/item" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), providerUrl: "https://source.example/item" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), url: "https://source.example/item" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), sourceName: "public source name" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), title: "public title" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), snippet: "public snippet" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), secret: "sk_test" } as SourceAcquisitionContentTargetEnvelope,
      { ...target(), headers: { authorization: "bearer value" } } as SourceAcquisitionContentTargetEnvelope,
      target({ endpointContentPolicyId: "https://source.example/item" }),
      target({ opaqueRuntimeLocatorId: "https://source.example/item" }),
    ];

    for (const invalidTarget of invalidTargets) {
      expect(validateSourceAcquisitionContentTargetEnvelope(invalidTarget).status).toBe("blocked");
    }
  });

  it("requires opaque policy ids or keyed HMAC references and rejects bare deterministic hashes", () => {
    expect(validateSourceAcquisitionContentTargetEnvelope(target({
      canonicalHostnameReference: {
        kind: "policy_id",
        value: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    })).status).toBe("blocked");

    expect(validateSourceAcquisitionContentTargetEnvelope(target({
      fixedPathReference: {
        kind: "keyed_hmac",
        algorithm: "hmac_sha256",
        keyId: "POLICY_PATH_HMAC_KEY_001",
        value: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    })).status).toBe("blocked");

    expect(validateSourceAcquisitionContentTargetEnvelope(target({
      queryReference: { kind: "policy_id", value: "POLICY_QUERY_APPROVED_001" },
    })).status).toBe("valid");
  });

  it("rejects URL-like and secret-bearing hash fields before diagnostics can copy them", () => {
    expect(validateSourceAcquisitionContentTargetEnvelope(target({
      contentTargetSnapshotHash: "https://source.example/sk_secret",
    })).status).toBe("blocked");
    expect(validateSourceAcquisitionContentBudgetSnapshot(budget({
      contentBudgetSnapshotHash: "content-budget-sk_secret",
    })).status).toBe("blocked");
    expect(validateSourceAcquisitionContentTargetEnvelope(target({
      contentAuthoritySnapshotHash: "AKIAIOSFODNN7EXAMPLE",
    })).status).toBe("blocked");
  });

  it("enforces package ceilings for target count, attempts, concurrency, bytes, timeouts, cancellation, and no-store flags", () => {
    const invalidBudgets = [
      budget({ maxContentTargetsPerRun: 4 }),
      budget({ maxContentTargetsPerCandidate: 2 }),
      budget({ maxFetchAttemptsPerTarget: 2 as 1 }),
      budget({ maxConcurrentContentFetches: 2 as 1 }),
      budget({ declaredByteCap: 1024 * 1024 + 1 }),
      budget({ streamingByteCap: 1024 * 1024 + 1 }),
      budget({ compressedByteCap: 1024 * 1024 + 1 }),
      budget({ decompressedByteCap: 2 * 1024 * 1024 + 1 }),
      budget({ totalByteCapPerRun: 3 * 1024 * 1024 + 1 }),
      budget({ perFetchTimeoutMs: 5001 }),
      budget({ totalContentDereferenceTimeoutMs: 15001 }),
      budget({ retryPolicy: "retry" as SourceAcquisitionContentBudgetSnapshot["retryPolicy"] }),
      budget({ cancellationState: "requested" }),
      budget({ noCache: false as true }),
      budget({ noSourceReliability: false as true }),
    ];

    for (const invalidBudget of invalidBudgets) {
      expect(validateSourceAcquisitionContentBudgetSnapshot(invalidBudget).status).toBe("blocked");
    }
  });

  it("keeps hidden diagnostics structural and sanitized without content, warning, verdict, cache, or Source Reliability leakage", () => {
    const diagnostic = buildSourceAcquisitionContentHiddenDiagnostic({
      target: target(),
      budget: budget(),
      fetchAttemptId: "ATT_1",
      status: "blocked",
      stopReason: "redirect_denied",
      durationMs: 12,
      timeoutMs: 250,
      redirectDenied: true,
      declaredByteCount: 120,
      observedByteCount: 80,
    });
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.rawPayloadIncluded).toBe(false);
    expect(diagnostic.extractedTextIncluded).toBe(false);
    expect(diagnostic.parserPayloadIncluded).toBe(false);
    expect(diagnostic.cacheKeyConstructed).toBe(false);
    expect(diagnostic.sourceReliabilityTouched).toBe(false);
    expect(diagnostic.warningIncluded).toBe(false);
    expect(diagnostic.verdictIncluded).toBe(false);
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("source.example");
    expect(serialized).not.toContain("raw content");
    expect(serialized).not.toContain("sk_");
    expect(serialized).not.toContain("bearer value");
    expect(serialized).not.toContain("stack");
  });

  it("redacts invalid caller-supplied diagnostic identifiers before returning hidden diagnostics", () => {
    const diagnostic = buildSourceAcquisitionContentHiddenDiagnostic({
      target: {
        ...target(),
        rawUrl: "https://source.example/item",
        secret: "sk_secret",
      } as SourceAcquisitionContentTargetEnvelope,
      budget: budget(),
      fetchAttemptId: "https://source.example/sk_secret",
      status: "blocked",
      stopReason: "target_invalid",
      durationMs: 12,
      timeoutMs: 250,
    });
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.contentTargetId).toBe("OPAQUE_CONTENT_TARGET_REDACTED");
    expect(diagnostic.fetchAttemptId).toBe("ATT_REDACTED");
    expect(serialized).not.toContain("source.example");
    expect(serialized).not.toContain("sk_secret");
    expect(serialized).not.toContain("https://");
  });
});

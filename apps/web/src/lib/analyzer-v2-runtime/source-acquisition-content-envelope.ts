export const SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION =
  "v2.source-acquisition.content-dereference.7n3b3-1";
export const SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-1_Content_Dereference_Source_Package.md";
export const SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT = "fc2b4c6c";

export type SourceAcquisitionContentApproval = {
  readonly status: "approved_7n3b3_1_content_dereference";
  readonly approvedBy: "deputy_review_team";
  readonly packagePath: typeof SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT;
  readonly approvedScope: "content_dereference_authority_envelope_transport_only";
};

export type SourceAcquisitionContentOpaqueReference =
  | {
      readonly kind: "policy_id";
      readonly value: string;
    }
  | {
      readonly kind: "keyed_hmac";
      readonly algorithm: "hmac_sha256";
      readonly keyId: string;
      readonly value: string;
    };

export type SourceAcquisitionContentTargetEnvelope = {
  readonly version: typeof SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION;
  readonly approval: SourceAcquisitionContentApproval;
  readonly visibility: "internal_only";
  readonly contentTargetId: string;
  readonly parentCandidateId: string;
  readonly parentProviderAttemptId: string;
  readonly providerId: string;
  readonly endpointContentPolicyId: string;
  readonly opaqueRuntimeLocatorId: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly canonicalSchemePolicyId: string;
  readonly canonicalHostnameReference: SourceAcquisitionContentOpaqueReference;
  readonly fixedPathReference: SourceAcquisitionContentOpaqueReference;
  readonly queryReference: SourceAcquisitionContentOpaqueReference;
  readonly redirectPolicy: "deny";
  readonly proxyPolicy: "none";
  readonly contentTypePolicy: {
    readonly allowedContentTypes: readonly [
      "text/html",
      "text/plain",
      "application/json",
      "application/pdf",
    ];
    readonly sniffPolicy: "declared_type_must_match_allowed_type";
  };
  readonly bytePolicyId: string;
  readonly timeoutPolicyId: string;
  readonly decompressionPolicy: "identity_only" | "gzip_allowed";
  readonly noParser: true;
  readonly noCache: true;
  readonly noStorage: true;
  readonly noSourceReliability: true;
  readonly noProduct: true;
  readonly noPublic: true;
};

export type SourceAcquisitionContentBudgetSnapshot = {
  readonly version: typeof SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION;
  readonly approval: SourceAcquisitionContentApproval;
  readonly contentBudgetSnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentAuthoritySnapshotHash: string;
  readonly maxContentTargetsPerRun: number;
  readonly maxContentTargetsPerCandidate: number;
  readonly maxFetchAttemptsPerTarget: 1;
  readonly maxConcurrentContentFetches: 1;
  readonly declaredByteCap: number;
  readonly streamingByteCap: number;
  readonly compressedByteCap: number;
  readonly decompressedByteCap: number;
  readonly totalByteCapPerRun: number;
  readonly perFetchTimeoutMs: number;
  readonly totalContentDereferenceTimeoutMs: number;
  readonly cancellationState: "not_requested" | "requested";
  readonly retryPolicy: "none";
  readonly noParser: true;
  readonly noCache: true;
  readonly noStorage: true;
  readonly noSourceReliability: true;
  readonly noProduct: true;
  readonly noPublic: true;
};

export type SourceAcquisitionContentStopReason =
  | "not_stopped"
  | "authority_invalid"
  | "target_invalid"
  | "budget_invalid"
  | "request_invalid"
  | "dns_resolution_failed"
  | "dns_address_blocked"
  | "final_address_mismatch"
  | "redirect_denied"
  | "http_status_rejected"
  | "content_type_rejected"
  | "declared_byte_cap_exceeded"
  | "streaming_byte_cap_exceeded"
  | "compressed_byte_cap_exceeded"
  | "decompressed_byte_cap_exceeded"
  | "timed_out"
  | "cancelled"
  | "transport_failure";

export type SourceAcquisitionContentHiddenDiagnostic = {
  readonly version: typeof SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION;
  readonly visibility: "internal_only";
  readonly contentTargetId: string;
  readonly parentCandidateId: string;
  readonly providerId: string;
  readonly fetchAttemptId: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly contentBudgetSnapshotHash: string;
  readonly status: "success" | "blocked" | "failed" | "timed_out" | "cancelled";
  readonly stopReason: SourceAcquisitionContentStopReason;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly contentTypeState: "not_reached" | "accepted" | "rejected";
  readonly declaredByteCount: number | null;
  readonly observedByteCount: number;
  readonly decompressedByteCount: number;
  readonly dnsAddressCount: number;
  readonly finalAddressValidation:
    | "not_reached"
    | "matched_validated_public_address"
    | "blocked_or_mismatched";
  readonly responseStatusCodeCategory: "not_reached" | "success_2xx" | "redirect_3xx" | "rejected";
  readonly redirectDenied: boolean;
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly parserPayloadIncluded: false;
  readonly secretIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly errorTraceIncluded: false;
  readonly cacheKeyConstructed: false;
  readonly sourceReliabilityTouched: false;
  readonly evidenceItemIncluded: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
};

export type SourceAcquisitionContentTransportOutcome =
  | {
      readonly status: "success";
      readonly diagnostic: SourceAcquisitionContentHiddenDiagnostic;
    }
  | {
      readonly status: "blocked" | "failed" | "timed_out" | "cancelled";
      readonly diagnostic: SourceAcquisitionContentHiddenDiagnostic;
    };

export type SourceAcquisitionContentValidationResult =
  | {
      readonly status: "valid";
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "blocked";
      readonly blockedReasons: readonly string[];
    };

const forbiddenPlaceholderValues = new Set(["", "placeholder", "todo", "unknown"]);
const forbiddenFieldNames = new Set([
  "apiKey",
  "bearerToken",
  "cacheKey",
  "confidence",
  "domain",
  "endpointUrl",
  "evidenceItem",
  "extractedText",
  "headers",
  "pageTitle",
  "providerJson",
  "providerUrl",
  "queryString",
  "queryStringTemplate",
  "rawContent",
  "rawProviderJson",
  "rawRequestHeaders",
  "rawUrl",
  "secret",
  "snippet",
  "sourceName",
  "sourceReliabilityScore",
  "title",
  "url",
  "verdict",
  "warning",
]);
const forbiddenValueFragments = [
  "://",
  "\\",
  "?",
  "#",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
  "rawurl",
  "providerurl",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function stringHasForbiddenFragment(value: string): boolean {
  const normalized = value.toLowerCase();
  return forbiddenValueFragments.some((fragment) => normalized.includes(fragment));
}

function hashValueIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && !forbiddenPlaceholderValues.has(value.toLowerCase())
    && !stringHasForbiddenFragment(value)
    && /^[a-f0-9]{64}$/.test(value);
}

function structuralIdIsValid(value: unknown, prefix: string): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value.startsWith(prefix)
    && /^[A-Z0-9_]+$/.test(value)
    && !stringHasForbiddenFragment(value);
}

function providerIdIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value === value.toLowerCase()
    && /^[a-z][a-z0-9_]{0,63}$/.test(value)
    && !stringHasForbiddenFragment(value)
    && !forbiddenPlaceholderValues.has(value);
}

function fetchAttemptIdIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value.startsWith("ATT_")
    && /^[A-Z0-9_]+$/.test(value)
    && !stringHasForbiddenFragment(value);
}

function policyIdIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value.startsWith("POLICY_")
    && /^[A-Z0-9_]{8,96}$/.test(value)
    && !stringHasForbiddenFragment(value);
}

function bareHashLike(value: string): boolean {
  const normalized = value.toLowerCase();
  return /^[a-f0-9]{32,128}$/.test(normalized)
    || normalized.startsWith("sha")
    || normalized.includes("_hash_")
    || normalized.includes("-hash-");
}

function hmacReferenceIsValid(value: SourceAcquisitionContentOpaqueReference): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["algorithm", "keyId", "kind", "value"])
    && value.kind === "keyed_hmac"
    && value.algorithm === "hmac_sha256"
    && policyIdIsValid(value.keyId)
    && isNonBlankString(value.value)
    && value.value === value.value.trim()
    && /^HMAC_SHA256_[A-Z0-9]{32,96}$/.test(value.value)
    && !bareHashLike(value.value)
    && !stringHasForbiddenFragment(value.value);
}

function opaqueReferenceIsValid(value: SourceAcquisitionContentOpaqueReference): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "policy_id") {
    return hasExactKeys(value, ["kind", "value"])
      && policyIdIsValid(value.value)
      && !bareHashLike(value.value);
  }
  return hmacReferenceIsValid(value);
}

function approval(): SourceAcquisitionContentApproval {
  return {
    status: "approved_7n3b3_1_content_dereference",
    approvedBy: "deputy_review_team",
    packagePath: SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT,
    approvedScope: "content_dereference_authority_envelope_transport_only",
  };
}

function approvalIsValid(value: SourceAcquisitionContentApproval): boolean {
  return isRecord(value)
    && hasExactKeys(value, [
      "approvedBy",
      "approvedScope",
      "packageCommit",
      "packagePath",
      "status",
    ])
    && value.status === "approved_7n3b3_1_content_dereference"
    && value.approvedBy === "deputy_review_team"
    && value.packagePath === SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH
    && value.packageCommit === SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT
    && value.approvedScope === "content_dereference_authority_envelope_transport_only";
}

function containsForbiddenFields(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => forbiddenFieldNames.has(key));
}

function boundaryFlagsAreClosed(value: {
  readonly noParser: boolean;
  readonly noCache: boolean;
  readonly noStorage: boolean;
  readonly noSourceReliability: boolean;
  readonly noProduct: boolean;
  readonly noPublic: boolean;
}): boolean {
  return value.noParser === true
    && value.noCache === true
    && value.noStorage === true
    && value.noSourceReliability === true
    && value.noProduct === true
    && value.noPublic === true;
}

function contentTypePolicyIsValid(
  policy: SourceAcquisitionContentTargetEnvelope["contentTypePolicy"],
): boolean {
  return isRecord(policy)
    && hasExactKeys(policy, ["allowedContentTypes", "sniffPolicy"])
    && Array.isArray(policy.allowedContentTypes)
    && policy.allowedContentTypes.length === 4
    && policy.allowedContentTypes[0] === "text/html"
    && policy.allowedContentTypes[1] === "text/plain"
    && policy.allowedContentTypes[2] === "application/json"
    && policy.allowedContentTypes[3] === "application/pdf"
    && policy.sniffPolicy === "declared_type_must_match_allowed_type";
}

export function sourceAcquisitionContentApproval(): SourceAcquisitionContentApproval {
  return approval();
}

export function validateSourceAcquisitionContentTargetEnvelope(
  target: SourceAcquisitionContentTargetEnvelope,
): SourceAcquisitionContentValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(target)) {
    return { status: "blocked", blockedReasons: ["target_not_record"] };
  }

  if (
    !hasExactKeys(target, [
      "approval",
      "bytePolicyId",
      "canonicalHostnameReference",
      "canonicalSchemePolicyId",
      "contentAuthoritySnapshotHash",
      "contentTargetId",
      "contentTargetSnapshotHash",
      "contentTypePolicy",
      "decompressionPolicy",
      "endpointContentPolicyId",
      "fixedPathReference",
      "noCache",
      "noParser",
      "noProduct",
      "noPublic",
      "noSourceReliability",
      "noStorage",
      "opaqueRuntimeLocatorId",
      "parentCandidateId",
      "parentProviderAttemptId",
      "providerId",
      "providerNetworkAuthoritySnapshotHash",
      "proxyPolicy",
      "queryReference",
      "redirectPolicy",
      "timeoutPolicyId",
      "version",
      "visibility",
    ])
    || containsForbiddenFields(target)
  ) {
    blockedReasons.push("target_shape_invalid");
  }

  if (
    target.version !== SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION
    || target.visibility !== "internal_only"
    || !approvalIsValid(target.approval)
  ) {
    blockedReasons.push("approval_invalid");
  }

  if (
    !structuralIdIsValid(target.contentTargetId, "OPAQUE_CONTENT_TARGET_")
    || !structuralIdIsValid(target.parentCandidateId, "OPAQUE_SOURCE_CANDIDATE_")
    || !structuralIdIsValid(target.parentProviderAttemptId, "ATT_")
    || !providerIdIsValid(target.providerId)
    || !policyIdIsValid(target.endpointContentPolicyId)
    || !structuralIdIsValid(target.opaqueRuntimeLocatorId, "OPAQUE_RUNTIME_LOCATOR_")
  ) {
    blockedReasons.push("target_identity_invalid");
  }

  for (const hash of [
    target.providerNetworkAuthoritySnapshotHash,
    target.contentAuthoritySnapshotHash,
    target.contentTargetSnapshotHash,
  ]) {
    if (!hashValueIsValid(hash)) {
      blockedReasons.push("target_hash_invalid");
      break;
    }
  }

  if (
    !policyIdIsValid(target.canonicalSchemePolicyId)
    || !opaqueReferenceIsValid(target.canonicalHostnameReference)
    || !opaqueReferenceIsValid(target.fixedPathReference)
    || !opaqueReferenceIsValid(target.queryReference)
    || !policyIdIsValid(target.bytePolicyId)
    || !policyIdIsValid(target.timeoutPolicyId)
  ) {
    blockedReasons.push("target_policy_reference_invalid");
  }

  if (
    target.redirectPolicy !== "deny"
    || target.proxyPolicy !== "none"
    || !contentTypePolicyIsValid(target.contentTypePolicy)
    || !["identity_only", "gzip_allowed"].includes(target.decompressionPolicy)
  ) {
    blockedReasons.push("transport_policy_invalid");
  }

  if (!boundaryFlagsAreClosed(target)) {
    blockedReasons.push("boundary_flags_invalid");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function validateSourceAcquisitionContentBudgetSnapshot(
  budget: SourceAcquisitionContentBudgetSnapshot,
): SourceAcquisitionContentValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(budget)) {
    return { status: "blocked", blockedReasons: ["budget_not_record"] };
  }

  if (!hasExactKeys(budget, [
    "approval",
    "cancellationState",
    "compressedByteCap",
    "contentAuthoritySnapshotHash",
    "contentBudgetSnapshotHash",
    "contentTargetSnapshotHash",
    "declaredByteCap",
    "decompressedByteCap",
    "maxConcurrentContentFetches",
    "maxContentTargetsPerCandidate",
    "maxContentTargetsPerRun",
    "maxFetchAttemptsPerTarget",
    "noCache",
    "noParser",
    "noProduct",
    "noPublic",
    "noSourceReliability",
    "noStorage",
    "perFetchTimeoutMs",
    "providerNetworkAuthoritySnapshotHash",
    "retryPolicy",
    "streamingByteCap",
    "totalByteCapPerRun",
    "totalContentDereferenceTimeoutMs",
    "version",
  ])) {
    blockedReasons.push("budget_shape_invalid");
  }

  if (budget.version !== SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION || !approvalIsValid(budget.approval)) {
    blockedReasons.push("approval_invalid");
  }

  for (const hash of [
    budget.contentBudgetSnapshotHash,
    budget.contentTargetSnapshotHash,
    budget.providerNetworkAuthoritySnapshotHash,
    budget.contentAuthoritySnapshotHash,
  ]) {
    if (!hashValueIsValid(hash)) {
      blockedReasons.push("budget_hash_invalid");
      break;
    }
  }

  if (
    !positiveInteger(budget.maxContentTargetsPerRun)
    || budget.maxContentTargetsPerRun > 3
    || !positiveInteger(budget.maxContentTargetsPerCandidate)
    || budget.maxContentTargetsPerCandidate > 1
    || budget.maxFetchAttemptsPerTarget !== 1
    || budget.maxConcurrentContentFetches !== 1
    || !positiveInteger(budget.declaredByteCap)
    || budget.declaredByteCap > 1024 * 1024
    || !positiveInteger(budget.streamingByteCap)
    || budget.streamingByteCap > 1024 * 1024
    || !positiveInteger(budget.compressedByteCap)
    || budget.compressedByteCap > 1024 * 1024
    || !positiveInteger(budget.decompressedByteCap)
    || budget.decompressedByteCap > 2 * 1024 * 1024
    || !positiveInteger(budget.totalByteCapPerRun)
    || budget.totalByteCapPerRun > 3 * 1024 * 1024
    || !positiveInteger(budget.perFetchTimeoutMs)
    || budget.perFetchTimeoutMs > 5000
    || !positiveInteger(budget.totalContentDereferenceTimeoutMs)
    || budget.totalContentDereferenceTimeoutMs > 15000
    || budget.retryPolicy !== "none"
    || !["not_requested", "requested"].includes(budget.cancellationState)
  ) {
    blockedReasons.push("budget_limits_invalid");
  }

  if (
    budget.streamingByteCap > budget.declaredByteCap
    || budget.compressedByteCap > budget.streamingByteCap
    || budget.decompressedByteCap < budget.compressedByteCap
    || budget.totalByteCapPerRun < budget.streamingByteCap
    || budget.perFetchTimeoutMs > budget.totalContentDereferenceTimeoutMs
  ) {
    blockedReasons.push("budget_cap_relationship_invalid");
  }

  if (budget.cancellationState === "requested") {
    blockedReasons.push("cancellation_requested");
  }

  if (!boundaryFlagsAreClosed(budget)) {
    blockedReasons.push("boundary_flags_invalid");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function validateSourceAcquisitionContentRequestBinding(params: {
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly budget: SourceAcquisitionContentBudgetSnapshot;
}): SourceAcquisitionContentValidationResult {
  const targetValidation = validateSourceAcquisitionContentTargetEnvelope(params.target);
  const budgetValidation = validateSourceAcquisitionContentBudgetSnapshot(params.budget);
  const blockedReasons = [
    ...targetValidation.blockedReasons,
    ...budgetValidation.blockedReasons,
  ];

  if (
    params.target.contentTargetSnapshotHash !== params.budget.contentTargetSnapshotHash
    || params.target.providerNetworkAuthoritySnapshotHash !== params.budget.providerNetworkAuthoritySnapshotHash
    || params.target.contentAuthoritySnapshotHash !== params.budget.contentAuthoritySnapshotHash
  ) {
    blockedReasons.push("target_budget_hash_mismatch");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function buildSourceAcquisitionContentHiddenDiagnostic(params: {
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly budget: SourceAcquisitionContentBudgetSnapshot;
  readonly fetchAttemptId: string;
  readonly status: SourceAcquisitionContentHiddenDiagnostic["status"];
  readonly stopReason: SourceAcquisitionContentStopReason;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly contentTypeState?: SourceAcquisitionContentHiddenDiagnostic["contentTypeState"];
  readonly declaredByteCount?: number | null;
  readonly observedByteCount?: number;
  readonly decompressedByteCount?: number;
  readonly dnsAddressCount?: number;
  readonly finalAddressValidation?: SourceAcquisitionContentHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory?: SourceAcquisitionContentHiddenDiagnostic["responseStatusCodeCategory"];
  readonly redirectDenied?: boolean;
}): SourceAcquisitionContentHiddenDiagnostic {
  const targetIsValid = validateSourceAcquisitionContentTargetEnvelope(params.target).status === "valid";
  const budgetIsValid = validateSourceAcquisitionContentBudgetSnapshot(params.budget).status === "valid";
  const bindingIsValid = targetIsValid
    && budgetIsValid
    && validateSourceAcquisitionContentRequestBinding({
      target: params.target,
      budget: params.budget,
    }).status === "valid";

  return {
    version: SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
    visibility: "internal_only",
    contentTargetId: targetIsValid ? params.target.contentTargetId : "OPAQUE_CONTENT_TARGET_REDACTED",
    parentCandidateId: targetIsValid ? params.target.parentCandidateId : "OPAQUE_SOURCE_CANDIDATE_REDACTED",
    providerId: targetIsValid ? params.target.providerId : "redacted_provider",
    fetchAttemptId: fetchAttemptIdIsValid(params.fetchAttemptId) ? params.fetchAttemptId : "ATT_REDACTED",
    providerNetworkAuthoritySnapshotHash: targetIsValid
      ? params.target.providerNetworkAuthoritySnapshotHash
      : "redacted-hash",
    contentAuthoritySnapshotHash: targetIsValid ? params.target.contentAuthoritySnapshotHash : "redacted-hash",
    contentTargetSnapshotHash: targetIsValid ? params.target.contentTargetSnapshotHash : "redacted-hash",
    contentBudgetSnapshotHash: bindingIsValid ? params.budget.contentBudgetSnapshotHash : "redacted-hash",
    status: params.status,
    stopReason: params.stopReason,
    durationMs: Math.max(0, Math.trunc(params.durationMs)),
    timeoutMs: params.timeoutMs,
    contentTypeState: params.contentTypeState ?? "not_reached",
    declaredByteCount: params.declaredByteCount ?? null,
    observedByteCount: params.observedByteCount ?? 0,
    decompressedByteCount: params.decompressedByteCount ?? 0,
    dnsAddressCount: params.dnsAddressCount ?? 0,
    finalAddressValidation: params.finalAddressValidation ?? "not_reached",
    responseStatusCodeCategory: params.responseStatusCodeCategory ?? "not_reached",
    redirectDenied: params.redirectDenied ?? false,
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    parserPayloadIncluded: false,
    secretIncluded: false,
    publicPayloadIncluded: false,
    errorTraceIncluded: false,
    cacheKeyConstructed: false,
    sourceReliabilityTouched: false,
    evidenceItemIncluded: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  };
}

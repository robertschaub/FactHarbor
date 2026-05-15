import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2CacheDimension,
  AnalyzerV2CachePolicy,
} from "@/lib/analyzer-v2/gateway/types";
export {
  ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
  ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
  ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
  ANALYZER_V2_CONTEXTUAL_CACHE_DIMENSIONS,
  ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY,
  ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
} from "@/lib/analyzer-v2/gateway/cache-policy-registry";
import { ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY } from "@/lib/analyzer-v2/gateway/cache-policy-registry";

export type AnalyzerV2CacheKeyInput = Partial<Record<AnalyzerV2CacheDimension, string | number>>;

export type AnalyzerV2CacheKeyValidation = {
  valid: boolean;
  missingDimensions: AnalyzerV2CacheDimension[];
};

export type AnalyzerV2ClaimUnderstandingCacheSource = "acs_prepared_snapshot" | "direct_input";

export type AnalyzerV2ClaimUnderstandingCacheDecisionOptions = {
  executionApproved?: boolean;
  expectedAcsSnapshotHash?: string | null;
};

export type AnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecisionOptions = {
  expectedAcsSnapshotHash?: string | null;
};

export const ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE = [
  "analyzer-v2",
  ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY.policyId,
  "claim_understanding_gate1",
].join(":");

function hasCacheDimensionValue(input: AnalyzerV2CacheKeyInput, dimension: AnalyzerV2CacheDimension): boolean {
  const value = input[dimension];
  return (typeof value === "string" && value.trim().length > 0)
    || (typeof value === "number" && Number.isFinite(value));
}

function readClaimUnderstandingInputSource(
  input: AnalyzerV2CacheKeyInput,
): AnalyzerV2ClaimUnderstandingCacheSource | null {
  const source = input.claimUnderstandingInputSource;
  return source === "acs_prepared_snapshot" || source === "direct_input" ? source : null;
}

function hasAcsSnapshotHashMismatch(
  input: AnalyzerV2CacheKeyInput,
  inputSource: AnalyzerV2ClaimUnderstandingCacheSource | null,
  expectedAcsSnapshotHash: string | null | undefined,
): boolean {
  const suppliedAcsHash = typeof input.acsSnapshotHash === "string" ? input.acsSnapshotHash : null;
  return inputSource === "acs_prepared_snapshot"
    && !!expectedAcsSnapshotHash
    && !!suppliedAcsHash
    && suppliedAcsHash !== expectedAcsSnapshotHash;
}

export function validateAnalyzerV2CacheKeyInput(
  policy: AnalyzerV2CachePolicy,
  input: AnalyzerV2CacheKeyInput,
): AnalyzerV2CacheKeyValidation {
  const missingDimensions = policy.requiredDimensions.filter(
    (dimension) => !hasCacheDimensionValue(input, dimension),
  );

  return {
    valid: missingDimensions.length === 0,
    missingDimensions,
  };
}

export function validateAnalyzerV2ClaimUnderstandingCacheKeyInput(
  input: AnalyzerV2CacheKeyInput,
): AnalyzerV2CacheKeyValidation {
  const baseValidation = validateAnalyzerV2CacheKeyInput(
    ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
    input,
  );
  const missingDimensions = [...baseValidation.missingDimensions];
  const inputSource = readClaimUnderstandingInputSource(input);

  if (
    hasCacheDimensionValue(input, "claimUnderstandingInputSource")
    && !inputSource
    && !missingDimensions.includes("claimUnderstandingInputSource")
  ) {
    missingDimensions.push("claimUnderstandingInputSource");
  }

  if (
    inputSource === "acs_prepared_snapshot"
    && !hasCacheDimensionValue(input, "acsSnapshotHash")
  ) {
    missingDimensions.push("acsSnapshotHash");
  }

  return {
    valid: missingDimensions.length === 0,
    missingDimensions,
  };
}

export function buildAnalyzerV2ClaimUnderstandingCacheKeyParts(
  input: AnalyzerV2CacheKeyInput,
): Array<{ dimension: AnalyzerV2CacheDimension; value: string }> {
  const validation = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(input);
  if (!validation.valid) {
    throw new Error(
      `Analyzer V2 claim-understanding cache key is missing dimensions: ${validation.missingDimensions.join(", ")}`,
    );
  }

  return [
    ...ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY.requiredDimensions,
    ...ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY.optionalDimensions,
  ]
    .filter((dimension) => hasCacheDimensionValue(input, dimension))
    .map((dimension) => ({
      dimension,
      value: String(input[dimension]),
    }));
}

export function buildAnalyzerV2ClaimUnderstandingCacheDecision(
  input: AnalyzerV2CacheKeyInput,
  options: AnalyzerV2ClaimUnderstandingCacheDecisionOptions = {},
): AnalyzerV2CacheDecision {
  const validation = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(input);
  const inputSource = readClaimUnderstandingInputSource(input);

  if (hasAcsSnapshotHashMismatch(input, inputSource, options.expectedAcsSnapshotHash)) {
    return {
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_acs_snapshot_hash_mismatch",
      missingDimensions: [],
      keyParts: [],
    };
  }

  if (!validation.valid) {
    return {
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_incomplete_dimensions",
      missingDimensions: validation.missingDimensions,
      keyParts: [],
    };
  }

  const keyParts = buildAnalyzerV2ClaimUnderstandingCacheKeyParts(input);
  if (options.executionApproved !== true) {
    return {
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_until_execution_approved",
      missingDimensions: [],
      keyParts,
    };
  }

  return {
    namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
    canRead: true,
    canWrite: true,
    reason: "dimensions_complete_and_execution_approved",
    missingDimensions: [],
    keyParts,
  };
}

export function buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(
  input: AnalyzerV2CacheKeyInput,
  options: AnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecisionOptions = {},
): AnalyzerV2CacheDecision {
  const validation = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(input);
  const inputSource = readClaimUnderstandingInputSource(input);

  if (hasAcsSnapshotHashMismatch(input, inputSource, options.expectedAcsSnapshotHash)) {
    return {
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_acs_snapshot_hash_mismatch",
      missingDimensions: [],
      keyParts: [],
    };
  }

  if (!validation.valid) {
    return {
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_incomplete_dimensions",
      missingDimensions: validation.missingDimensions,
      keyParts: [],
    };
  }

  return {
    namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
    canRead: false,
    canWrite: false,
    reason: "no_store_runtime_dispatch_safety",
    missingDimensions: [],
    keyParts: buildAnalyzerV2ClaimUnderstandingCacheKeyParts(input),
  };
}

export function buildAnalyzerV2CacheKeyParts(
  policy: AnalyzerV2CachePolicy,
  input: AnalyzerV2CacheKeyInput,
): Array<{ dimension: AnalyzerV2CacheDimension; value: string }> {
  const validation = policy.policyId === ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY.policyId
    ? validateAnalyzerV2ClaimUnderstandingCacheKeyInput(input)
    : validateAnalyzerV2CacheKeyInput(policy, input);
  if (!validation.valid) {
    throw new Error(`Analyzer V2 cache key is missing dimensions: ${validation.missingDimensions.join(", ")}`);
  }

  return [...policy.requiredDimensions, ...policy.optionalDimensions]
    .filter((dimension) => hasCacheDimensionValue(input, dimension))
    .map((dimension) => ({
      dimension,
      value: String(input[dimension]),
    }));
}

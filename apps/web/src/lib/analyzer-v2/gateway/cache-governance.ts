import type {
  AnalyzerV2CacheDimension,
  AnalyzerV2CachePolicy,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";

export type AnalyzerV2CacheKeyInput = Partial<Record<AnalyzerV2CacheDimension, string | number>>;

export type AnalyzerV2CacheKeyValidation = {
  valid: boolean;
  missingDimensions: AnalyzerV2CacheDimension[];
};

export type AnalyzerV2ClaimUnderstandingCacheSource = "acs_prepared_snapshot" | "direct_input";

const PENDING_APPROVAL: AnalyzerV2PolicyApproval = {
  status: "pending",
  reviewer: null,
  approvedAt: null,
};

export const ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS = [
  "promptProfile",
  "promptSectionId",
  "promptContentHash",
  "modelTask",
  "provider",
  "modelName",
  "temperature",
  "outputSchemaVersion",
  "configSnapshotHash",
  "resultSchemaVersion",
  "inputIdentityHash",
  "currentDateBucket",
] as const satisfies readonly AnalyzerV2CacheDimension[];

export const ANALYZER_V2_CONTEXTUAL_CACHE_DIMENSIONS = [
  "sourceIdentityHash",
  "languageContextHash",
  "searchContextHash",
  "adapterVersion",
] as const satisfies readonly AnalyzerV2CacheDimension[];

export const ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.base",
  requiredDimensions: ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
  optionalDimensions: ANALYZER_V2_CONTEXTUAL_CACHE_DIMENSIONS,
  approval: PENDING_APPROVAL,
};

export const ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.source-aware",
  requiredDimensions: [
    ...ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
    "sourceIdentityHash",
  ],
  optionalDimensions: [
    "languageContextHash",
    "searchContextHash",
    "adapterVersion",
  ],
  approval: PENDING_APPROVAL,
};

export const ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.claim-understanding",
  requiredDimensions: [
    ...ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
    "claimUnderstandingInputSource",
    "inputGroundingSeedHash",
  ],
  optionalDimensions: [
    "acsSnapshotHash",
    "languageContextHash",
    "searchContextHash",
    "adapterVersion",
  ],
  approval: PENDING_APPROVAL,
};

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

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

function hasCacheDimensionValue(input: AnalyzerV2CacheKeyInput, dimension: AnalyzerV2CacheDimension): boolean {
  const value = input[dimension];
  return (typeof value === "string" && value.trim().length > 0)
    || (typeof value === "number" && Number.isFinite(value));
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

export function buildAnalyzerV2CacheKeyParts(
  policy: AnalyzerV2CachePolicy,
  input: AnalyzerV2CacheKeyInput,
): Array<{ dimension: AnalyzerV2CacheDimension; value: string }> {
  const validation = validateAnalyzerV2CacheKeyInput(policy, input);
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

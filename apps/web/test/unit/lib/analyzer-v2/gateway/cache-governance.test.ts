import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
  ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
  ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
  buildAnalyzerV2ClaimUnderstandingCacheKeyParts,
  buildAnalyzerV2CacheKeyParts,
  validateAnalyzerV2ClaimUnderstandingCacheKeyInput,
  validateAnalyzerV2CacheKeyInput,
} from "@/lib/analyzer-v2/gateway/cache-governance";
import { CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/claim-understanding/types";

const completeBaseInput = {
  promptProfile: "claimboundary-v2",
  promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
  promptContentHash: "prompt-hash",
  modelTask: "understand",
  provider: "anthropic",
  modelName: "claude-haiku",
  temperature: 0.2,
  outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  configSnapshotHash: "config-hash",
  resultSchemaVersion: "4.0.0-cb-precutover",
  inputIdentityHash: "input-hash",
  currentDateBucket: "2026-05-13",
};

describe("analyzer-v2 cache governance", () => {
  it("requires prompt, model, config, schema, input, and current-date dimensions", () => {
    const validation = validateAnalyzerV2CacheKeyInput(ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY, {});

    expect(validation.valid).toBe(false);
    expect(validation.missingDimensions).toEqual(expect.arrayContaining([
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
    ]));
  });

  it("builds deterministic ordered cache key parts from complete base dimensions", () => {
    const parts = buildAnalyzerV2CacheKeyParts(ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY, completeBaseInput);

    expect(parts.map((part) => part.dimension)).toEqual([
      ...ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY.requiredDimensions,
    ]);
    expect(parts).toContainEqual({ dimension: "temperature", value: "0.2" });
  });

  it("requires source identity for source-aware semantic cache policies", () => {
    const missingSource = validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
      completeBaseInput,
    );

    expect(missingSource.valid).toBe(false);
    expect(missingSource.missingDimensions).toEqual(["sourceIdentityHash"]);

    const completeSourceAware = validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
      {
        ...completeBaseInput,
        sourceIdentityHash: "source-pack-hash",
      },
    );
    expect(completeSourceAware.valid).toBe(true);
  });

  it("validates ACS-backed claim-understanding cache keys with ACS and input-grounding dimensions", () => {
    const missingClaimUnderstandingDimensions = validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
      completeBaseInput,
    );

    expect(missingClaimUnderstandingDimensions.valid).toBe(false);
    expect(missingClaimUnderstandingDimensions.missingDimensions).toEqual([
      "claimUnderstandingInputSource",
      "inputGroundingSeedHash",
    ]);

    const missingAcsSnapshot = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        inputGroundingSeedHash: "seed-hash",
      },
    );
    expect(missingAcsSnapshot.valid).toBe(false);
    expect(missingAcsSnapshot.missingDimensions).toEqual(["acsSnapshotHash"]);
    expect(() => buildAnalyzerV2ClaimUnderstandingCacheKeyParts({
      ...completeBaseInput,
      claimUnderstandingInputSource: "acs_prepared_snapshot",
      inputGroundingSeedHash: "seed-hash",
    })).toThrow("acsSnapshotHash");
    expect(() => buildAnalyzerV2CacheKeyParts(
      ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        inputGroundingSeedHash: "seed-hash",
      },
    )).toThrow("acsSnapshotHash");

    const completeClaimUnderstanding = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        acsSnapshotHash: "acs-hash",
        inputGroundingSeedHash: "seed-hash",
      },
    );
    expect(completeClaimUnderstanding.valid).toBe(true);
  });

  it("validates direct-input claim-understanding cache keys without requiring an ACS snapshot hash", () => {
    const directInput = validateAnalyzerV2ClaimUnderstandingCacheKeyInput({
      ...completeBaseInput,
      claimUnderstandingInputSource: "direct_input",
      inputGroundingSeedHash: "seed-hash",
    });

    expect(directInput.valid).toBe(true);

    const parts = buildAnalyzerV2ClaimUnderstandingCacheKeyParts({
      ...completeBaseInput,
      claimUnderstandingInputSource: "direct_input",
      inputGroundingSeedHash: "seed-hash",
    });
    expect(parts).toContainEqual({ dimension: "claimUnderstandingInputSource", value: "direct_input" });
    expect(parts.map((part) => part.dimension)).not.toContain("acsSnapshotHash");
  });
});

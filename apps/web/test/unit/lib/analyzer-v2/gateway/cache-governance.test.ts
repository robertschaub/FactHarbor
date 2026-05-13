import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
  ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
  buildAnalyzerV2CacheKeyParts,
  validateAnalyzerV2CacheKeyInput,
} from "@/lib/analyzer-v2/gateway/cache-governance";

const completeBaseInput = {
  promptProfile: "claimboundary-v2",
  promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
  promptContentHash: "prompt-hash",
  modelTask: "understand",
  provider: "anthropic",
  modelName: "claude-haiku",
  temperature: 0.2,
  outputSchemaVersion: "v2.claim_understanding_gate1.0",
  configSnapshotHash: "config-hash",
  resultSchemaVersion: "4.0.0-cb-shadow",
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
});

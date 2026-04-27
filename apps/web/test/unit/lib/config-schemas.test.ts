/**
 * Config Schemas Tests
 *
 * Tests for Zod schemas validating configuration content.
 * Covers schema version 3.0.0 (search/calc/pipeline/sr) and prompt.v1.
 *
 * @module config-schemas.test
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ConfigType,
  VALID_CONFIG_TYPES,
  isValidConfigType,
  validateConfig,
  getSchemaVersion,
  getDefaultConfig,
  parseTypedConfig,
  SearchConfigSchema,
  PipelineConfigSchema,
  SourceReliabilityConfigSchema,
  CalcConfigSchema,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_SR_CONFIG,
  DEFAULT_CALC_CONFIG,
  canonicalizeContent,
  computeContentHash,
} from "../../../src/lib/config-schemas";

// ============================================================================
// CONFIG TYPE VALIDATION
// ============================================================================

describe("Config Type Validation", () => {
  it("VALID_CONFIG_TYPES includes all 5 types", () => {
    expect(VALID_CONFIG_TYPES).toContain("prompt");
    expect(VALID_CONFIG_TYPES).toContain("search");
    expect(VALID_CONFIG_TYPES).toContain("calculation");
    expect(VALID_CONFIG_TYPES).toContain("pipeline");
    expect(VALID_CONFIG_TYPES).toContain("sr");
    expect(VALID_CONFIG_TYPES.length).toBe(5);
  });

  it("isValidConfigType returns true for valid types", () => {
    expect(isValidConfigType("prompt")).toBe(true);
    expect(isValidConfigType("search")).toBe(true);
    expect(isValidConfigType("calculation")).toBe(true);
    expect(isValidConfigType("pipeline")).toBe(true);
    expect(isValidConfigType("sr")).toBe(true);
  });

  it("isValidConfigType returns false for invalid types", () => {
    expect(isValidConfigType("invalid")).toBe(false);
    expect(isValidConfigType("")).toBe(false);
    expect(isValidConfigType("SEARCH")).toBe(false); // case sensitive
    expect(isValidConfigType("pipeline_config")).toBe(false);
  });
});

// ============================================================================
// SCHEMA VERSION MAPPING
// ============================================================================

describe("Schema Version Mapping", () => {
  it("returns correct schema version for each type", () => {
    expect(getSchemaVersion("prompt")).toBe("prompt.v1");
    expect(getSchemaVersion("search")).toBe("3.0.0");
    expect(getSchemaVersion("calculation")).toBe("3.0.0");
    expect(getSchemaVersion("pipeline")).toBe("3.0.0");
    expect(getSchemaVersion("sr")).toBe("3.0.0");
  });
});

// ============================================================================
// SEARCH CONFIG SCHEMA
// ============================================================================

describe("SearchConfigSchema", () => {
  it("validates correct search config", () => {
    const result = SearchConfigSchema.safeParse(DEFAULT_SEARCH_CONFIG);
    expect(result.success).toBe(true);
  });

  it("validates search config with all fields", () => {
    const config = {
      enabled: true,
      provider: "google-cse",
      mode: "grounded",
      maxResults: 10,
      maxSourcesPerIteration: 5,
      timeoutMs: 30000,
      dateRestrict: "m",
      domainWhitelist: ["example.com", "test.org"],
      domainBlacklist: ["spam.com"],
    };
    const result = SearchConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects invalid provider", () => {
    const config = { ...DEFAULT_SEARCH_CONFIG, provider: "invalid" };
    const result = SearchConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects maxResults outside range", () => {
    const configLow = { ...DEFAULT_SEARCH_CONFIG, maxResults: 0 };
    const configHigh = { ...DEFAULT_SEARCH_CONFIG, maxResults: 25 };
    expect(SearchConfigSchema.safeParse(configLow).success).toBe(false);
    expect(SearchConfigSchema.safeParse(configHigh).success).toBe(false);
  });

  it("allows null dateRestrict", () => {
    const config = { ...DEFAULT_SEARCH_CONFIG, dateRestrict: null };
    const result = SearchConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// PIPELINE CONFIG SCHEMA
// ============================================================================

describe("PipelineConfigSchema", () => {
  it("validates correct pipeline config", () => {
    const result = PipelineConfigSchema.safeParse(DEFAULT_PIPELINE_CONFIG);
    expect(result.success).toBe(true);
  });

  it("validates all LLM text analysis flags", () => {
    const config = {
      ...DEFAULT_PIPELINE_CONFIG,
      llmInputClassification: false,
      llmEvidenceQuality: false,
      llmContextSimilarity: false,
      llmVerdictValidation: false,
    };
    const result = PipelineConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates analysis mode enum", () => {
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, analysisMode: "quick" }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, analysisMode: "deep" }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, analysisMode: "invalid" }).success).toBe(false);
  });

  it("validates budget controls range", () => {
    // Valid ranges
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, maxIterationsPerContext: 1 }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, maxIterationsPerContext: 20 }).success).toBe(true);

    // Invalid ranges
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, maxIterationsPerContext: 0 }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, maxIterationsPerContext: 21 }).success).toBe(false);
  });

  it("validates query strategy mode and per-claim query budget", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      queryStrategyMode: "legacy",
      perClaimQueryBudget: 1,
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      queryStrategyMode: "pro_con",
      perClaimQueryBudget: 20,
    }).success).toBe(true);

    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      queryStrategyMode: "invalid",
    }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      perClaimQueryBudget: 0,
    }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      perClaimQueryBudget: 21,
    }).success).toBe(false);
  });

  it("applies Stage 2 query strategy defaults when fields are omitted", () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG };
    delete (config as any).queryStrategyMode;
    delete (config as any).perClaimQueryBudget;

    const result = PipelineConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.queryStrategyMode).toBe("pro_con");
      expect(result.data.perClaimQueryBudget).toBe(8);
    }
  });

  it("validates claimAnnotationMode enum", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      claimAnnotationMode: "off",
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      claimAnnotationMode: "verifiability",
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      claimAnnotationMode: "verifiability_and_misleadingness",
    }).success).toBe(true);

    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      claimAnnotationMode: "invalid",
    }).success).toBe(false);
  });

  it("applies claimAnnotationMode default when omitted", () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG };
    delete (config as any).claimAnnotationMode;

    const result = PipelineConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.claimAnnotationMode).toBe("verifiability_and_misleadingness");
    }
  });

  it("validates explanationQualityMode enum", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      explanationQualityMode: "off",
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      explanationQualityMode: "structural",
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      explanationQualityMode: "rubric",
    }).success).toBe(true);

    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      explanationQualityMode: "invalid",
    }).success).toBe(false);
  });

  it("applies explanationQualityMode default when omitted", () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG };
    delete (config as any).explanationQualityMode;

    const result = PipelineConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanationQualityMode).toBe("rubric");
    }
  });

  it("validates debateRoles with premium strength", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      debateRoles: { reconciler: { provider: "anthropic", strength: "premium" } },
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      debateRoles: {
        advocate: { provider: "anthropic", strength: "standard" },
        reconciler: { provider: "anthropic", strength: "premium" },
        challenger: { provider: "openai", strength: "budget" },
      },
    }).success).toBe(true);
    // Invalid strength value
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      debateRoles: { reconciler: { strength: "invalid" } },
    }).success).toBe(false);
  });

  it("validates legacy debateModelTiers still parse (backward compatibility)", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      debateModelTiers: { reconciler: "opus" },
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      debateModelTiers: { reconciler: "invalid" },
    }).success).toBe(false);
  });

  it("accepts modelOpus config field (B-5b)", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      modelOpus: "claude-opus-4-6",
    }).success).toBe(true);
    // Optional — config without modelOpus is valid
    const config = { ...DEFAULT_PIPELINE_CONFIG };
    delete (config as any).modelOpus;
    expect(PipelineConfigSchema.safeParse(config).success).toBe(true);
  });

  it("accepts configs that still contain defaultPipelineVariant (legacy field stripped by Zod)", () => {
    // Field was removed from schema — Zod strips unknown keys, so these should still parse
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "claimboundary" }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "anything" }).success).toBe(true);
  });

  it("rejects empty model names", () => {
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, modelUnderstand: "" }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, modelExtractEvidence: "" }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, modelVerdict: "" }).success).toBe(false);
  });

  it("validates recencyGraduatedPenalty boolean field", () => {
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, recencyGraduatedPenalty: true }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, recencyGraduatedPenalty: false }).success).toBe(true);
    // Optional: should work without it (defaults to true via transform)
    const withoutField = { ...DEFAULT_PIPELINE_CONFIG };
    delete (withoutField as any).recencyGraduatedPenalty;
    const result = PipelineConfigSchema.safeParse(withoutField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recencyGraduatedPenalty).toBe(true);
    }
  });

  it("validates verdict integrity policy enums and defaults", () => {
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      verdictGroundingPolicy: "disabled",
      verdictDirectionPolicy: "disabled",
    }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      verdictGroundingPolicy: "safe_downgrade",
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    }).success).toBe(true);

    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      verdictGroundingPolicy: "invalid",
    }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      verdictDirectionPolicy: "invalid",
    }).success).toBe(false);

    const withoutFields = { ...DEFAULT_PIPELINE_CONFIG };
    delete (withoutFields as any).verdictGroundingPolicy;
    delete (withoutFields as any).verdictDirectionPolicy;
    const result = PipelineConfigSchema.safeParse(withoutFields);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verdictGroundingPolicy).toBe("disabled");
      expect(result.data.verdictDirectionPolicy).toBe("retry_once_then_safe_downgrade");
    }
  });

  it("validates confidenceCalibration nested object", () => {
    // Full object should pass
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      confidenceCalibration: {
        enabled: true,
        densityAnchor: { enabled: true, minConfidenceBase: 15, minConfidenceMax: 60, sourceCountThreshold: 5 },
        bandSnapping: { enabled: true, strength: 0.7 },
        verdictCoupling: { enabled: true, strongVerdictThreshold: 70, minConfidenceStrong: 50, minConfidenceNeutral: 25 },
        contextConsistency: { enabled: true, maxConfidenceSpread: 25, reductionFactor: 0.5 },
      },
    }).success).toBe(true);

    // Disabled should pass
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      confidenceCalibration: { enabled: false },
    }).success).toBe(true);

    // Optional: should work without it (defaults via transform)
    const withoutField = { ...DEFAULT_PIPELINE_CONFIG };
    delete (withoutField as any).confidenceCalibration;
    const result = PipelineConfigSchema.safeParse(withoutField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidenceCalibration).toBeDefined();
      expect(result.data.confidenceCalibration!.enabled).toBe(true);
    }
  });

  it("validates confidenceCalibration sub-field ranges", () => {
    // strength out of range
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      confidenceCalibration: {
        enabled: true,
        bandSnapping: { enabled: true, strength: 1.5 },
      },
    }).success).toBe(false);

    // reductionFactor out of range
    expect(PipelineConfigSchema.safeParse({
      ...DEFAULT_PIPELINE_CONFIG,
      confidenceCalibration: {
        enabled: true,
        contextConsistency: { enabled: true, maxConfidenceSpread: 25, reductionFactor: -0.1 },
      },
    }).success).toBe(false);
  });
});

// ============================================================================
// SOURCE RELIABILITY CONFIG SCHEMA
// ============================================================================

describe("SourceReliabilityConfigSchema", () => {
  it("validates correct SR config", () => {
    const result = SourceReliabilityConfigSchema.safeParse(DEFAULT_SR_CONFIG);
    expect(result.success).toBe(true);
  });

  it("validates threshold ranges (0-1)", () => {
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, confidenceThreshold: 0 }).success).toBe(true);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, confidenceThreshold: 1 }).success).toBe(true);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, confidenceThreshold: -0.1 }).success).toBe(false);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, confidenceThreshold: 1.1 }).success).toBe(false);
  });

  it("validates cacheTtlDays range (1-365)", () => {
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, cacheTtlDays: 1 }).success).toBe(true);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, cacheTtlDays: 365 }).success).toBe(true);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, cacheTtlDays: 0 }).success).toBe(false);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, cacheTtlDays: 366 }).success).toBe(false);
  });

  it("validates skipPlatforms and skipTlds as arrays", () => {
    const config = {
      ...DEFAULT_SR_CONFIG,
      skipPlatforms: ["blogspot.com", "wordpress.com"],
      skipTlds: ["xyz", "top"],
    };
    const result = SourceReliabilityConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("allows empty skip arrays", () => {
    const config = {
      ...DEFAULT_SR_CONFIG,
      skipPlatforms: [],
      skipTlds: [],
    };
    const result = SourceReliabilityConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("allows optional rate limiting fields", () => {
    const config = { ...DEFAULT_SR_CONFIG };
    delete (config as any).rateLimitPerIp;
    delete (config as any).domainCooldownSec;
    const result = SourceReliabilityConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates rateLimitPerIp range (1-100)", () => {
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, rateLimitPerIp: 1 }).success).toBe(true);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, rateLimitPerIp: 100 }).success).toBe(true);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, rateLimitPerIp: 0 }).success).toBe(false);
    expect(SourceReliabilityConfigSchema.safeParse({ ...DEFAULT_SR_CONFIG, rateLimitPerIp: 101 }).success).toBe(false);
  });
});

// ============================================================================
// CALCULATION CONFIG SCHEMA
// ============================================================================

describe("CalcConfigSchema", () => {
  it("validates correct calc config", () => {
    const result = CalcConfigSchema.safeParse(DEFAULT_CALC_CONFIG);
    expect(result.success).toBe(true);
  });

  it("validates calc config structure", () => {
    // verdictBands are system constants in truth-scale.ts, no longer in CalcConfig
    expect(DEFAULT_CALC_CONFIG).not.toHaveProperty("verdictBands");
    expect(DEFAULT_CALC_CONFIG).toHaveProperty("aggregation");
    expect(DEFAULT_CALC_CONFIG).toHaveProperty("sourceReliability");
    expect(DEFAULT_CALC_CONFIG).toHaveProperty("qualityGates");
  });
});

// ============================================================================
// VALIDATE CONFIG FUNCTION
// ============================================================================

describe("validateConfig function", () => {
  it("validates search config", () => {
    const content = JSON.stringify(DEFAULT_SEARCH_CONFIG);
    const result = validateConfig("search", content, "3.0.0");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates pipeline config", () => {
    const content = JSON.stringify(DEFAULT_PIPELINE_CONFIG);
    const result = validateConfig("pipeline", content, "3.0.0");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates SR config", () => {
    const content = JSON.stringify(DEFAULT_SR_CONFIG);
    const result = validateConfig("sr", content, "3.0.0");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for invalid config", () => {
    const content = JSON.stringify({ enabled: "not-a-boolean" });
    const result = validateConfig("search", content, "3.0.0");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates prompt content (non-JSON)", () => {
    // Prompts require: YAML frontmatter with version field and ## SECTION header
    const content = `---
pipeline: claimboundary
version: 1.0
---
## SYSTEM
You are a helpful assistant.

## USER
Analyze this claim.`;
    const result = validateConfig("prompt", content, "prompt.v1");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid JSON for non-prompt types", () => {
    const content = "not valid json {";
    const result = validateConfig("search", content, "3.0.0");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("parse");
  });
});

// ============================================================================
// GET DEFAULT CONFIG
// ============================================================================

describe("getDefaultConfig function", () => {
  it("returns stringified search config", () => {
    const result = getDefaultConfig("search");
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result);
    expect(parsed.enabled).toBe(true);
    expect(parsed.provider).toBe("auto");
  });

  it("returns stringified pipeline config", () => {
    const result = getDefaultConfig("pipeline");
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result);
    expect(parsed.llmTiering).toBe(true);
    expect(parsed.analysisMode).toBe("quick"); // v2.9.0: Default to quick mode for backwards compatibility
  });

  it("returns stringified SR config", () => {
    const result = getDefaultConfig("sr");
    expect(result).toBeTruthy();
    const parsed = JSON.parse(result);
    expect(parsed.enabled).toBe(true);
    expect(parsed.multiModel).toBe(true);
  });

  it("returns empty string for prompt type", () => {
    const result = getDefaultConfig("prompt");
    expect(result).toBe("");
  });
});

// ============================================================================
// PARSE TYPED CONFIG
// ============================================================================

describe("parseTypedConfig function", () => {
  it("parses and returns typed search config", () => {
    const content = JSON.stringify(DEFAULT_SEARCH_CONFIG);
    const result = parseTypedConfig("search", content);
    expect(result.enabled).toBe(true);
    expect(result.provider).toBe("auto");
  });

  it("parses and returns typed pipeline config", () => {
    const content = JSON.stringify(DEFAULT_PIPELINE_CONFIG);
    const result = parseTypedConfig("pipeline", content);
    expect(result.llmTiering).toBe(true);
    expect(result.modelVerdict).toBe("standard");
  });

  it("parses and returns typed SR config", () => {
    const content = JSON.stringify(DEFAULT_SR_CONFIG);
    const result = parseTypedConfig("sr", content);
    expect(result.enabled).toBe(true);
    expect(result.cacheTtlDays).toBe(90);
  });

  it("returns string content for prompt type", () => {
    const content = "This is prompt content";
    const result = parseTypedConfig("prompt", content);
    expect(result).toBe(content);
  });

  it("throws on invalid config", () => {
    const content = JSON.stringify({ enabled: "invalid" });
    expect(() => parseTypedConfig("search", content)).toThrow();
  });
});

// ============================================================================
// CANONICALIZATION AND HASHING
// ============================================================================

describe("canonicalizeContent and computeContentHash", () => {
  it("canonicalizes JSON consistently", () => {
    const obj = { b: 2, a: 1 };
    const content1 = JSON.stringify(obj);
    const content2 = JSON.stringify({ a: 1, b: 2 });

    const canonical1 = canonicalizeContent("search", content1);
    const canonical2 = canonicalizeContent("search", content2);

    // Both should produce same canonical form (sorted keys)
    expect(canonical1).toBe(canonical2);
  });

  it("produces consistent hashes for same content", () => {
    const content = JSON.stringify(DEFAULT_SEARCH_CONFIG);
    const canonical = canonicalizeContent("search", content);

    const hash1 = computeContentHash(canonical);
    const hash2 = computeContentHash(canonical);

    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different content", () => {
    const content1 = canonicalizeContent("search", JSON.stringify({ ...DEFAULT_SEARCH_CONFIG, enabled: true }));
    const content2 = canonicalizeContent("search", JSON.stringify({ ...DEFAULT_SEARCH_CONFIG, enabled: false }));

    const hash1 = computeContentHash(content1);
    const hash2 = computeContentHash(content2);

    expect(hash1).not.toBe(hash2);
  });

  it("normalizes prompt content (adds trailing newline)", () => {
    // Canonicalization ensures consistent trailing newline
    const content = "# Prompt\nThis is preserved exactly.";
    const canonical = canonicalizeContent("prompt", content);
    // Canonical form should end with exactly one newline
    expect(canonical).toBe(content + "\n");
    expect(canonical.endsWith("\n")).toBe(true);
  });
});

// ============================================================================
// DEFAULT CONFIG VALUES VERIFICATION
// ============================================================================

describe("Default Config Values", () => {
  describe("DEFAULT_PIPELINE_CONFIG", () => {
    it("has correct model strength defaults", () => {
      expect(DEFAULT_PIPELINE_CONFIG.modelUnderstand).toBe("budget");
      expect(DEFAULT_PIPELINE_CONFIG.modelExtractEvidence).toBe("standard");
      expect(DEFAULT_PIPELINE_CONFIG.modelVerdict).toBe("standard");
    });

    it("has LLM text analysis enabled by default (v2.8.3)", () => {
      expect(DEFAULT_PIPELINE_CONFIG.llmInputClassification).toBe(true);
      expect(DEFAULT_PIPELINE_CONFIG.llmEvidenceQuality).toBe(true);
      expect(DEFAULT_PIPELINE_CONFIG.llmContextSimilarity).toBe(true); // Renamed from llmScopeSimilarity
      expect(DEFAULT_PIPELINE_CONFIG.llmVerdictValidation).toBe(true);
    });

    it("has correct budget defaults", () => {
      expect(DEFAULT_PIPELINE_CONFIG.maxIterationsPerContext).toBe(3); // v2.11.1: reduced from 5
      expect(DEFAULT_PIPELINE_CONFIG.maxTotalIterations).toBe(10); // v2.11.1: reduced from 20
      expect(DEFAULT_PIPELINE_CONFIG.maxTotalTokens).toBe(1000000); // Alpha optimization: increased from 750k for deep runs
      expect(DEFAULT_PIPELINE_CONFIG.selfConsistencyTemperature).toBe(0.4);
      const effectiveDefaults = PipelineConfigSchema.parse({ ...DEFAULT_PIPELINE_CONFIG });
      expect(effectiveDefaults.challengerTemperature).toBe(0.3);
      expect(effectiveDefaults.verdictGroundingPolicy).toBe("disabled");
      expect(effectiveDefaults.verdictDirectionPolicy).toBe("retry_once_then_safe_downgrade");
      expect(DEFAULT_PIPELINE_CONFIG.enforceBudgets).toBe(false);
      expect(DEFAULT_PIPELINE_CONFIG.claimAnnotationMode).toBe("verifiability_and_misleadingness");
      expect(DEFAULT_PIPELINE_CONFIG.tigerScoreMode).toBe("off");
      expect(DEFAULT_PIPELINE_CONFIG.tigerScoreStrength).toBe("standard");
      expect(DEFAULT_PIPELINE_CONFIG.tigerScoreTemperature).toBe(0.1);
      expect(DEFAULT_PIPELINE_CONFIG.explanationQualityMode).toBe("rubric");
      expect(DEFAULT_PIPELINE_CONFIG.queryStrategyMode).toBe("pro_con");
      expect(DEFAULT_PIPELINE_CONFIG.perClaimQueryBudget).toBe(8);
      expect(DEFAULT_PIPELINE_CONFIG.researchMaxQueriesPerIteration).toBe(4);
    });

    it("surfaces canonical debateRoles defaults", () => {
      expect(DEFAULT_PIPELINE_CONFIG.debateRoles).toEqual({
        advocate: { provider: "anthropic", strength: "standard" },
        selfConsistency: { provider: "anthropic", strength: "standard" },
        challenger: { provider: "openai", strength: "standard" },
        reconciler: { provider: "anthropic", strength: "standard" },
        validation: { provider: "anthropic", strength: "budget" },
      });
    });

    it("normalizes legacy debateModelTiers/Providers into debateRoles during parsing", () => {
      const parsed = PipelineConfigSchema.parse({
        ...DEFAULT_PIPELINE_CONFIG,
        debateRoles: undefined,
        debateModelTiers: {
          advocate: "sonnet",
          selfConsistency: "sonnet",
          challenger: "haiku",
          reconciler: "opus",
          validation: "haiku",
        },
        debateModelProviders: {
          advocate: "anthropic",
          selfConsistency: "anthropic",
          challenger: "openai",
          reconciler: "anthropic",
          validation: "anthropic",
        },
      });

      expect(parsed.debateRoles).toEqual({
        advocate: { provider: "anthropic", strength: "standard" },
        selfConsistency: { provider: "anthropic", strength: "standard" },
        challenger: { provider: "openai", strength: "budget" },
        reconciler: { provider: "anthropic", strength: "premium" },
        validation: { provider: "anthropic", strength: "budget" },
      });
    });

    it("canonical debateRoles wins when both legacy and new fields are present", () => {
      const parsed = PipelineConfigSchema.parse({
        ...DEFAULT_PIPELINE_CONFIG,
        debateRoles: {
          challenger: { provider: "google", strength: "premium" },
        },
        debateModelTiers: { challenger: "haiku" },
        debateModelProviders: { challenger: "openai" },
      });

      // Canonical wins for challenger
      expect(parsed.debateRoles!.challenger).toEqual({
        provider: "google",
        strength: "premium",
      });
    });

    it("expands debateRoles defaults when all debate fields are omitted", () => {
      const parsed = PipelineConfigSchema.parse({
        ...DEFAULT_PIPELINE_CONFIG,
        debateRoles: undefined,
        debateModelTiers: undefined,
        debateModelProviders: undefined,
      });

      expect(parsed.debateRoles).toEqual({
        advocate: { provider: "anthropic", strength: "standard" },
        selfConsistency: { provider: "anthropic", strength: "standard" },
        challenger: { provider: "openai", strength: "standard" },
        reconciler: { provider: "anthropic", strength: "standard" },
        validation: { provider: "anthropic", strength: "budget" },
      });
    });

    it("normalizes legacy tigerScoreTier into tigerScoreStrength", () => {
      const parsed = PipelineConfigSchema.parse({
        ...DEFAULT_PIPELINE_CONFIG,
        tigerScoreStrength: undefined,
        tigerScoreTier: "opus",
      });
      expect(parsed.tigerScoreStrength).toBe("premium");
    });

    it("surfaces schema-backed pipeline defaults in the authoritative default object", () => {
      expect(DEFAULT_PIPELINE_CONFIG.centralityThreshold).toBe("medium");
      expect(DEFAULT_PIPELINE_CONFIG.claimSpecificityMinimum).toBe(0.6);
      expect(DEFAULT_PIPELINE_CONFIG.claimSelectionBudgetAwarenessEnabled).toBe(false);
      expect(DEFAULT_PIPELINE_CONFIG.claimSelectionBudgetFitMode).toBe("off");
      expect(DEFAULT_PIPELINE_CONFIG.claimSelectionMinRecommendedClaims).toBe(1);
      expect(DEFAULT_PIPELINE_CONFIG.maxAtomicClaims).toBe(5);
      expect(DEFAULT_PIPELINE_CONFIG.maxAtomicClaimsBase).toBe(3);
      expect(DEFAULT_PIPELINE_CONFIG.atomicClaimsInputCharsPerClaim).toBe(500);
      expect(DEFAULT_PIPELINE_CONFIG.claimAtomicityLevel).toBe(3);
      expect(DEFAULT_PIPELINE_CONFIG.preliminarySearchQueriesPerClaim).toBe(2);
      expect(DEFAULT_PIPELINE_CONFIG.preliminaryMaxSources).toBe(5);
      expect(DEFAULT_PIPELINE_CONFIG.gate1GroundingRetryThreshold).toBe(0.5);
      expect(DEFAULT_PIPELINE_CONFIG.claimSufficiencyThreshold).toBe(3);
      expect(DEFAULT_PIPELINE_CONFIG.sufficiencyMinMainIterations).toBe(1);
      expect(DEFAULT_PIPELINE_CONFIG.contradictionReservedIterations).toBe(1);
      expect(DEFAULT_PIPELINE_CONFIG.contradictionAdmissionEnabled).toBe(true);
      expect(DEFAULT_PIPELINE_CONFIG.contradictionProtectedTimeMs).toBe(120000);
      expect(DEFAULT_PIPELINE_CONFIG.researchTimeBudgetMs).toBe(600000);
      expect(DEFAULT_PIPELINE_CONFIG.researchZeroYieldBreakThreshold).toBe(2);
      expect(DEFAULT_PIPELINE_CONFIG.maxClaimBoundaries).toBe(6);
      expect(DEFAULT_PIPELINE_CONFIG.boundaryCoherenceMinimum).toBe(0.3);
      expect(DEFAULT_PIPELINE_CONFIG.scopeNormalizationEnabled).toBe(true);
      expect(DEFAULT_PIPELINE_CONFIG.scopeNormalizationMinScopes).toBe(5);
      expect(DEFAULT_PIPELINE_CONFIG.selfConsistencyMode).toBe("full");
    });
  });

  describe("DEFAULT_SR_CONFIG", () => {
    it("has correct threshold defaults", () => {
      expect(DEFAULT_SR_CONFIG.confidenceThreshold).toBe(0.8);
      expect(DEFAULT_SR_CONFIG.consensusThreshold).toBe(0.20);
    });

    it("has correct filtering defaults", () => {
      expect(DEFAULT_SR_CONFIG.filterEnabled).toBe(true);
      expect(DEFAULT_SR_CONFIG.skipPlatforms).toContain("blogspot.");
      expect(DEFAULT_SR_CONFIG.skipTlds).toContain("xyz");
    });
  });

  describe("seed file drift detection", () => {
    const seedPath = path.resolve(__dirname, "../../../configs/pipeline.default.json");
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

    const criticalFields = [
      "llmProvider",
      "llmTiering",
      "modelUnderstand",
      "modelExtractEvidence",
      "modelVerdict",
      "tigerScoreMode",
      "tigerScoreStrength",
      "tigerScoreTemperature",
    ] as const;

    for (const field of criticalFields) {
      it(`DEFAULT_PIPELINE_CONFIG.${field} matches seed file`, () => {
        expect((DEFAULT_PIPELINE_CONFIG as Record<string, unknown>)[field]).toBe(
          seed[field],
        );
      });
    }

    it("effective selfConsistencyTemperature default matches seed file", () => {
      const effectiveDefaults = PipelineConfigSchema.parse({ ...DEFAULT_PIPELINE_CONFIG });
      expect(effectiveDefaults.selfConsistencyTemperature).toBe(seed.selfConsistencyTemperature);
    });

    it("effective challengerTemperature default matches seed file", () => {
      const effectiveDefaults = PipelineConfigSchema.parse({ ...DEFAULT_PIPELINE_CONFIG });
      expect(effectiveDefaults.challengerTemperature).toBe(seed.challengerTemperature);
    });

    it("debateRoles matches seed file", () => {
      expect(DEFAULT_PIPELINE_CONFIG.debateRoles).toEqual(seed.debateRoles);
      expect(seed.debateRoles).toEqual({
        advocate: { provider: "anthropic", strength: "standard" },
        selfConsistency: { provider: "anthropic", strength: "standard" },
        challenger: { provider: "openai", strength: "standard" },
        reconciler: { provider: "anthropic", strength: "standard" },
        validation: { provider: "anthropic", strength: "budget" },
      });
    });

    it("restored runtime defaults are present in the seed file", () => {
      expect(seed.centralityThreshold).toBe(DEFAULT_PIPELINE_CONFIG.centralityThreshold);
      expect(seed.claimSpecificityMinimum).toBe(DEFAULT_PIPELINE_CONFIG.claimSpecificityMinimum);
      expect(seed.claimSelectionBudgetAwarenessEnabled).toBe(DEFAULT_PIPELINE_CONFIG.claimSelectionBudgetAwarenessEnabled);
      expect(seed.claimSelectionBudgetFitMode).toBe(DEFAULT_PIPELINE_CONFIG.claimSelectionBudgetFitMode);
      expect(seed.claimSelectionMinRecommendedClaims).toBe(DEFAULT_PIPELINE_CONFIG.claimSelectionMinRecommendedClaims);
      expect(seed.maxAtomicClaims).toBe(DEFAULT_PIPELINE_CONFIG.maxAtomicClaims);
      expect(seed.preliminarySearchQueriesPerClaim).toBe(DEFAULT_PIPELINE_CONFIG.preliminarySearchQueriesPerClaim);
      expect(seed.claimSufficiencyThreshold).toBe(DEFAULT_PIPELINE_CONFIG.claimSufficiencyThreshold);
      expect(seed.contradictionAdmissionEnabled).toBe(DEFAULT_PIPELINE_CONFIG.contradictionAdmissionEnabled);
      expect(seed.contradictionProtectedTimeMs).toBe(DEFAULT_PIPELINE_CONFIG.contradictionProtectedTimeMs);
      expect(seed.researchTimeBudgetMs).toBe(DEFAULT_PIPELINE_CONFIG.researchTimeBudgetMs);
      expect(seed.maxClaimBoundaries).toBe(DEFAULT_PIPELINE_CONFIG.maxClaimBoundaries);
      expect(seed.boundaryCoherenceMinimum).toBe(DEFAULT_PIPELINE_CONFIG.boundaryCoherenceMinimum);
      expect(seed.scopeNormalizationEnabled).toBe(DEFAULT_PIPELINE_CONFIG.scopeNormalizationEnabled);
      expect(seed.selfConsistencyMode).toBe(DEFAULT_PIPELINE_CONFIG.selfConsistencyMode);
    });
  });
});

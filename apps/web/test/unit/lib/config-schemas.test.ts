/**
 * Config Schemas Tests
 *
 * Tests for Zod schemas validating configuration content.
 * Covers schema version 3.0.0 (search/calc/pipeline/sr) and prompt.v1.
 *
 * @module config-schemas.test
 */

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

  it("validates contextDedupThreshold range (0-1)", () => {
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, contextDedupThreshold: 0 }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, contextDedupThreshold: 1 }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, contextDedupThreshold: 0.7 }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, contextDedupThreshold: -0.1 }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, contextDedupThreshold: 1.1 }).success).toBe(false);
  });

  it("validates defaultPipelineVariant enum", () => {
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "orchestrated" }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "monolithic_dynamic" }).success).toBe(true);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "monolithic_canonical" }).success).toBe(false);
    expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "invalid" }).success).toBe(false);
  });

  it("allows optional defaultPipelineVariant", () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG };
    delete (config as any).defaultPipelineVariant;
    const result = PipelineConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
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
pipeline: orchestrated
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
    expect(parsed.llmTiering).toBe(false); // v2.9.0: Default to off for backwards compatibility
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
    expect(result.llmTiering).toBe(false); // v2.9.0: Default to off for backwards compatibility
    expect(result.modelVerdict).toBe("claude-opus-4-6");
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
    it("has correct model defaults from .env.example", () => {
      expect(DEFAULT_PIPELINE_CONFIG.modelUnderstand).toBe("claude-haiku-4-5-20251001");
      expect(DEFAULT_PIPELINE_CONFIG.modelExtractEvidence).toBe("claude-haiku-4-5-20251001");
      expect(DEFAULT_PIPELINE_CONFIG.modelVerdict).toBe("claude-opus-4-6");
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
      expect(DEFAULT_PIPELINE_CONFIG.maxTotalTokens).toBe(500000); // v2.11.1: reduced from 750000
      expect(DEFAULT_PIPELINE_CONFIG.enforceBudgets).toBe(false);
    });
  });

  describe("DEFAULT_SR_CONFIG", () => {
    it("has correct threshold defaults", () => {
      expect(DEFAULT_SR_CONFIG.confidenceThreshold).toBe(0.8);
      expect(DEFAULT_SR_CONFIG.consensusThreshold).toBe(0.20);
      expect(DEFAULT_SR_CONFIG.defaultScore).toBe(0.5);
    });

    it("has correct filtering defaults", () => {
      expect(DEFAULT_SR_CONFIG.filterEnabled).toBe(true);
      expect(DEFAULT_SR_CONFIG.skipPlatforms).toContain("blogspot.");
      expect(DEFAULT_SR_CONFIG.skipTlds).toContain("xyz");
    });
  });
});

/**
 * Configuration Loader
 *
 * Loads configs with caching, TTL polling, and environment variable override resolution.
 * Two-tier cache: pointer TTL (30s) + content TTL (5min).
 *
 * @module config-loader
 * @version 1.0.0
 */

import {
  getActiveConfig,
  getActiveConfigHash,
  getConfigBlob,
  recordConfigUsage,
  seedPromptFromFile,
  type ConfigType,
  type OverrideRecord,
} from "./config-storage";
import {
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_CALC_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  SearchConfigSchema,
  CalcConfigSchema,
  PipelineConfigSchema,
  type SearchConfig,
  type CalcConfig,
  type PipelineConfig,
} from "./config-schemas";

// Re-export types for convenience
export type { SearchConfig, CalcConfig, PipelineConfig } from "./config-schemas";
export { DEFAULT_SEARCH_CONFIG, DEFAULT_CALC_CONFIG, DEFAULT_PIPELINE_CONFIG } from "./config-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  pointerTTL: 30_000, // 30 seconds - check for new active version
  contentTTL: 300_000, // 5 minutes - content rarely changes
};

// Override policy
type OverridePolicy = "on" | "off" | string; // string for "allowlist:VAR1,VAR2"

function getOverridePolicy(): OverridePolicy {
  return process.env.FH_CONFIG_ENV_OVERRIDES || "on";
}

// ============================================================================
// CACHE TYPES
// ============================================================================

interface CacheEntry {
  hash: string;
  content: string;
  parsed: SearchConfig | CalcConfig | PipelineConfig;
  loadedAt: number;
  pointerCheckedAt: number;
}

interface ResolvedConfig<T> {
  config: T;
  contentHash: string;
  overrides: OverrideRecord[];
  fromCache: boolean;
}

// ============================================================================
// CACHE STORAGE
// ============================================================================

const cache = new Map<string, CacheEntry>();

function getCacheKey(configType: ConfigType, profileKey: string): string {
  return `${configType}:${profileKey}`;
}

// ============================================================================
// ENVIRONMENT VARIABLE OVERRIDE MAPPING
// ============================================================================

// Search config env var mappings
const SEARCH_ENV_MAP: Record<string, { envVar: string; fieldPath: string; parser: (v: string) => unknown }> = {
  FH_SEARCH_ENABLED: { envVar: "FH_SEARCH_ENABLED", fieldPath: "enabled", parser: (v) => v === "true" },
  FH_SEARCH_PROVIDER: { envVar: "FH_SEARCH_PROVIDER", fieldPath: "provider", parser: (v) => v },
  FH_SEARCH_MODE: { envVar: "FH_SEARCH_MODE", fieldPath: "mode", parser: (v) => v },
  FH_SEARCH_MAX_RESULTS: { envVar: "FH_SEARCH_MAX_RESULTS", fieldPath: "maxResults", parser: (v) => parseInt(v, 10) },
  FH_SEARCH_TIMEOUT_MS: { envVar: "FH_SEARCH_TIMEOUT_MS", fieldPath: "timeoutMs", parser: (v) => parseInt(v, 10) },
  FH_SEARCH_DATE_RESTRICT: { envVar: "FH_SEARCH_DATE_RESTRICT", fieldPath: "dateRestrict", parser: (v) => v || null },
  FH_SEARCH_DOMAIN_WHITELIST: { envVar: "FH_SEARCH_DOMAIN_WHITELIST", fieldPath: "domainWhitelist", parser: (v) => v.split(",").map(s => s.trim()).filter(Boolean) },
  FH_SEARCH_DOMAIN_BLACKLIST: { envVar: "FH_SEARCH_DOMAIN_BLACKLIST", fieldPath: "domainBlacklist", parser: (v) => v.split(",").map(s => s.trim()).filter(Boolean) },
};

// Calculation config env var mappings
const CALC_ENV_MAP: Record<string, { envVar: string; fieldPath: string; parser: (v: string) => unknown }> = {
  FH_CALC_MIXED_CONFIDENCE_THRESHOLD: { envVar: "FH_CALC_MIXED_CONFIDENCE_THRESHOLD", fieldPath: "mixedConfidenceThreshold", parser: (v) => parseInt(v, 10) },
  FH_SR_CONFIDENCE_THRESHOLD: { envVar: "FH_SR_CONFIDENCE_THRESHOLD", fieldPath: "sourceReliability.confidenceThreshold", parser: (v) => parseFloat(v) },
  FH_SR_CONSENSUS_THRESHOLD: { envVar: "FH_SR_CONSENSUS_THRESHOLD", fieldPath: "sourceReliability.consensusThreshold", parser: (v) => parseFloat(v) },
  FH_SR_DEFAULT_SCORE: { envVar: "FH_SR_DEFAULT_SCORE", fieldPath: "sourceReliability.defaultScore", parser: (v) => parseFloat(v) },
};

// Pipeline config env var mappings
const PIPELINE_ENV_MAP: Record<string, { envVar: string; fieldPath: string; parser: (v: string) => unknown }> = {
  // Model Selection
  FH_LLM_TIERING: { envVar: "FH_LLM_TIERING", fieldPath: "llmTiering", parser: (v) => v !== "false" },
  FH_MODEL_UNDERSTAND: { envVar: "FH_MODEL_UNDERSTAND", fieldPath: "modelUnderstand", parser: (v) => v },
  FH_MODEL_EXTRACT_FACTS: { envVar: "FH_MODEL_EXTRACT_FACTS", fieldPath: "modelExtractFacts", parser: (v) => v },
  FH_MODEL_VERDICT: { envVar: "FH_MODEL_VERDICT", fieldPath: "modelVerdict", parser: (v) => v },

  // LLM Text Analysis Feature Flags
  FH_LLM_INPUT_CLASSIFICATION: { envVar: "FH_LLM_INPUT_CLASSIFICATION", fieldPath: "llmInputClassification", parser: (v) => v !== "false" },
  FH_LLM_EVIDENCE_QUALITY: { envVar: "FH_LLM_EVIDENCE_QUALITY", fieldPath: "llmEvidenceQuality", parser: (v) => v !== "false" },
  FH_LLM_SCOPE_SIMILARITY: { envVar: "FH_LLM_SCOPE_SIMILARITY", fieldPath: "llmScopeSimilarity", parser: (v) => v !== "false" },
  FH_LLM_VERDICT_VALIDATION: { envVar: "FH_LLM_VERDICT_VALIDATION", fieldPath: "llmVerdictValidation", parser: (v) => v !== "false" },

  // Analysis Behavior
  FH_ANALYSIS_MODE: { envVar: "FH_ANALYSIS_MODE", fieldPath: "analysisMode", parser: (v) => v as "quick" | "deep" },
  FH_ALLOW_MODEL_KNOWLEDGE: { envVar: "FH_ALLOW_MODEL_KNOWLEDGE", fieldPath: "allowModelKnowledge", parser: (v) => v !== "false" },
  FH_DETERMINISTIC: { envVar: "FH_DETERMINISTIC", fieldPath: "deterministic", parser: (v) => v === "true" },
  FH_SCOPE_DEDUP_THRESHOLD: { envVar: "FH_SCOPE_DEDUP_THRESHOLD", fieldPath: "scopeDedupThreshold", parser: (v) => parseFloat(v) },

  // Budget Controls
  FH_MAX_ITERATIONS_PER_SCOPE: { envVar: "FH_MAX_ITERATIONS_PER_SCOPE", fieldPath: "maxIterationsPerScope", parser: (v) => parseInt(v, 10) },
  FH_MAX_TOTAL_ITERATIONS: { envVar: "FH_MAX_TOTAL_ITERATIONS", fieldPath: "maxTotalIterations", parser: (v) => parseInt(v, 10) },
  FH_MAX_TOTAL_TOKENS: { envVar: "FH_MAX_TOTAL_TOKENS", fieldPath: "maxTotalTokens", parser: (v) => parseInt(v, 10) },
  FH_ENFORCE_BUDGETS: { envVar: "FH_ENFORCE_BUDGETS", fieldPath: "enforceBudgets", parser: (v) => v !== "false" },

  // Pipeline Selection
  FH_DEFAULT_PIPELINE_VARIANT: { envVar: "FH_DEFAULT_PIPELINE_VARIANT", fieldPath: "defaultPipelineVariant", parser: (v) => v as "orchestrated" | "monolithic_canonical" | "monolithic_dynamic" },
};

// ============================================================================
// OVERRIDE RESOLUTION
// ============================================================================

function applyOverrides<T extends object>(
  base: T,
  configType: ConfigType,
): { result: T; overrides: OverrideRecord[]; skippedOverrides: string[] } {
  const policy = getOverridePolicy();
  const skippedOverrides: string[] = [];

  // If overrides are off, return base unchanged
  if (policy === "off") {
    return { result: base, overrides: [], skippedOverrides };
  }

  const envMap =
    configType === "search" ? SEARCH_ENV_MAP :
    configType === "calculation" ? CALC_ENV_MAP :
    configType === "pipeline" ? PIPELINE_ENV_MAP :
    {};
  const schema =
    configType === "search" ? SearchConfigSchema :
    configType === "calculation" ? CalcConfigSchema :
    configType === "pipeline" ? PipelineConfigSchema :
    null;

  // Early return if no schema (e.g., prompt type)
  if (!schema) {
    return { result: base, overrides: [], skippedOverrides };
  }
  const overrides: OverrideRecord[] = [];

  // Parse allowlist if specified
  let allowlist: Set<string> | null = null;
  if (policy.startsWith("allowlist:")) {
    const vars = policy.slice("allowlist:".length).split(",").map(s => s.trim());
    allowlist = new Set(vars);
  }

  // Deep clone base
  const result = JSON.parse(JSON.stringify(base)) as T;

  // Apply each env var if set, validating after each override
  for (const [envVar, mapping] of Object.entries(envMap)) {
    // Skip if not in allowlist (when allowlist is active)
    if (allowlist && !allowlist.has(envVar)) continue;

    const envValue = process.env[envVar];
    if (envValue === undefined || envValue === "") continue;

    try {
      const parsed = mapping.parser(envValue);

      // Apply the override tentatively
      const tentative = JSON.parse(JSON.stringify(result)) as T;
      setNestedValue(tentative, mapping.fieldPath, parsed);

      // Validate the result - only accept if still valid
      const validation = schema.safeParse(tentative);
      if (!validation.success) {
        console.warn(
          `[Config-Loader] Skipping invalid override ${envVar}=${envValue}: ` +
          validation.error.issues.map(i => i.message).join(", ")
        );
        skippedOverrides.push(`${envVar} (invalid: ${validation.error.issues[0]?.message})`);
        continue;
      }

      // Override is valid, apply it
      setNestedValue(result, mapping.fieldPath, parsed);

      overrides.push({
        envVar,
        fieldPath: mapping.fieldPath,
        wasSet: true,
        appliedValue: typeof parsed === "object" ? undefined : parsed as string | number | boolean,
      });
    } catch {
      console.warn(`[Config-Loader] Failed to parse ${envVar}=${envValue}`);
    }
  }

  return { result, overrides, skippedOverrides };
}

function setNestedValue(obj: object, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

async function refreshPointer(configType: ConfigType, profileKey: string): Promise<string | null> {
  const key = getCacheKey(configType, profileKey);
  const cached = cache.get(key);
  const now = Date.now();

  // Check if we need to refresh pointer
  if (cached && now - cached.pointerCheckedAt < CACHE_CONFIG.pointerTTL) {
    return cached.hash;
  }

  // Fetch current active hash
  const hash = await getActiveConfigHash(configType, profileKey);

  if (cached && hash === cached.hash) {
    // Same hash, just update pointer check time
    cached.pointerCheckedAt = now;
    return hash;
  }

  // Hash changed or new entry - invalidate content cache
  if (cached) {
    cache.delete(key);
  }

  return hash;
}

async function getOrLoadContent<T extends SearchConfig | CalcConfig>(
  configType: ConfigType,
  profileKey: string,
  hash: string,
  defaultConfig: T,
): Promise<{ content: T; fromCache: boolean }> {
  const key = getCacheKey(configType, profileKey);
  const cached = cache.get(key);
  const now = Date.now();

  // Check content cache
  if (cached && cached.hash === hash && now - cached.loadedAt < CACHE_CONFIG.contentTTL) {
    return { content: cached.parsed as T, fromCache: true };
  }

  // Load from DB
  const blob = await getConfigBlob(hash);
  if (!blob) {
    console.warn(`[Config-Loader] Blob not found for hash ${hash}, using default`);
    return { content: defaultConfig, fromCache: false };
  }

  try {
    const parsed = JSON.parse(blob.content) as T;

    // Update cache
    cache.set(key, {
      hash,
      content: blob.content,
      parsed,
      loadedAt: now,
      pointerCheckedAt: now,
    });

    return { content: parsed, fromCache: false };
  } catch (err) {
    console.error(`[Config-Loader] Failed to parse config for ${configType}/${profileKey}:`, err);
    return { content: defaultConfig, fromCache: false };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load search config with caching and env var overrides
 */
export async function loadSearchConfig(
  profileKey = "default",
  jobId?: string,
): Promise<ResolvedConfig<SearchConfig>> {
  const configType: ConfigType = "search";

  try {
    // Refresh pointer (check if active hash changed)
    const hash = await refreshPointer(configType, profileKey);

    if (!hash) {
      // No config in DB, use default
      console.log(`[Config-Loader] No search config found, using defaults`);
      const { result, overrides } = applyOverrides(DEFAULT_SEARCH_CONFIG, configType);
      return { config: result, contentHash: "default", overrides, fromCache: false };
    }

    // Get content (from cache or DB)
    const { content, fromCache } = await getOrLoadContent(
      configType,
      profileKey,
      hash,
      DEFAULT_SEARCH_CONFIG,
    );

    // Apply env overrides
    const { result, overrides } = applyOverrides(content, configType);

    // Record usage if job ID provided
    if (jobId) {
      await recordConfigUsage(jobId, configType, profileKey, hash, overrides.length > 0 ? overrides : undefined);
    }

    return { config: result, contentHash: hash, overrides, fromCache };
  } catch (err) {
    console.error(`[Config-Loader] Error loading search config:`, err);
    const { result, overrides } = applyOverrides(DEFAULT_SEARCH_CONFIG, configType);
    return { config: result, contentHash: "error-fallback", overrides, fromCache: false };
  }
}

/**
 * Load calculation config with caching and env var overrides
 */
export async function loadCalcConfig(
  profileKey = "default",
  jobId?: string,
): Promise<ResolvedConfig<CalcConfig>> {
  const configType: ConfigType = "calculation";

  try {
    // Refresh pointer
    const hash = await refreshPointer(configType, profileKey);

    if (!hash) {
      // No config in DB, use default
      console.log(`[Config-Loader] No calc config found, using defaults`);
      const { result, overrides } = applyOverrides(DEFAULT_CALC_CONFIG, configType);
      return { config: result, contentHash: "default", overrides, fromCache: false };
    }

    // Get content
    const { content, fromCache } = await getOrLoadContent(
      configType,
      profileKey,
      hash,
      DEFAULT_CALC_CONFIG,
    );

    // Apply env overrides
    const { result, overrides } = applyOverrides(content, configType);

    // Record usage
    if (jobId) {
      await recordConfigUsage(jobId, configType, profileKey, hash, overrides.length > 0 ? overrides : undefined);
    }

    return { config: result, contentHash: hash, overrides, fromCache };
  } catch (err) {
    console.error(`[Config-Loader] Error loading calc config:`, err);
    const { result, overrides } = applyOverrides(DEFAULT_CALC_CONFIG, configType);
    return { config: result, contentHash: "error-fallback", overrides, fromCache: false };
  }
}

/**
 * Load pipeline config with caching and env var overrides
 */
export async function loadPipelineConfig(
  profileKey = "default",
  jobId?: string,
): Promise<ResolvedConfig<PipelineConfig>> {
  const configType: ConfigType = "pipeline";

  try {
    // Refresh pointer
    const hash = await refreshPointer(configType, profileKey);

    if (!hash) {
      // No config in DB, use default
      console.log(`[Config-Loader] No pipeline config found, using defaults`);
      const { result, overrides } = applyOverrides(DEFAULT_PIPELINE_CONFIG, configType);
      return { config: result, contentHash: "default", overrides, fromCache: false };
    }

    // Get content
    const { content, fromCache } = await getOrLoadContent(
      configType,
      profileKey,
      hash,
      DEFAULT_PIPELINE_CONFIG,
    );

    // Apply env overrides
    const { result, overrides } = applyOverrides(content, configType);

    // Record usage
    if (jobId) {
      await recordConfigUsage(jobId, configType, profileKey, hash, overrides.length > 0 ? overrides : undefined);
    }

    return { config: result, contentHash: hash, overrides, fromCache };
  } catch (err) {
    console.error(`[Config-Loader] Error loading pipeline config:`, err);
    const { result, overrides } = applyOverrides(DEFAULT_PIPELINE_CONFIG, configType);
    return { config: result, contentHash: "error-fallback", overrides, fromCache: false };
  }
}

/**
 * Invalidate cache for a specific config type/profile
 */
export function invalidateConfigCache(configType?: ConfigType, profileKey?: string): number {
  let count = 0;

  if (configType && profileKey) {
    const key = getCacheKey(configType, profileKey);
    if (cache.delete(key)) count++;
  } else if (configType) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${configType}:`)) {
        cache.delete(key);
        count++;
      }
    }
  } else {
    count = cache.size;
    cache.clear();
  }

  console.log(`[Config-Loader] Invalidated ${count} cache entries`);
  return count;
}

/**
 * Get cache status (for debugging)
 */
export function getConfigCacheStatus(): {
  entries: Array<{ key: string; hash: string; loadedAt: number; pointerCheckedAt: number }>;
  size: number;
} {
  const entries = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    hash: entry.hash,
    loadedAt: entry.loadedAt,
    pointerCheckedAt: entry.pointerCheckedAt,
  }));

  return { entries, size: cache.size };
}

/**
 * Get effective config (base + overrides) for preview
 */
export async function getEffectiveConfig<T extends SearchConfig | CalcConfig>(
  configType: ConfigType,
  profileKey: string,
): Promise<{ base: T; overrides: OverrideRecord[]; effective: T } | null> {
  try {
    const activeConfig = await getActiveConfig(configType, profileKey);

    if (!activeConfig) {
      const defaultConfig = (configType === "search" ? DEFAULT_SEARCH_CONFIG : DEFAULT_CALC_CONFIG) as T;
      const { result, overrides } = applyOverrides(defaultConfig, configType);
      return { base: defaultConfig, overrides, effective: result as T };
    }

    const base = JSON.parse(activeConfig.content) as T;
    const { result, overrides } = applyOverrides(base, configType);

    return { base, overrides, effective: result as T };
  } catch (err) {
    console.error(`[Config-Loader] Error getting effective config:`, err);
    return null;
  }
}

// ============================================================================
// PROMPT CONFIG LOADING
// ============================================================================

/**
 * Resolved prompt config result
 */
export interface ResolvedPromptConfig {
  content: string;
  contentHash: string;
  fromCache: boolean;
  seededFromFile: boolean;
}

/**
 * Load prompt config with caching and lazy fallback seeding.
 * If no DB config exists, seeds from file automatically.
 *
 * @param profile - Pipeline name (orchestrated, monolithic-canonical, etc.)
 * @param jobId - Optional job ID for usage tracking
 */
export async function loadPromptConfig(
  profile: string,
  jobId?: string,
): Promise<ResolvedPromptConfig | null> {
  const configType: ConfigType = "prompt";
  const key = getCacheKey(configType, profile);
  const now = Date.now();

  try {
    // Check pointer (is active hash still valid?)
    let hash = await refreshPointer(configType, profile);
    let seededFromFile = false;

    // Lazy fallback: seed from file if no DB config
    if (!hash) {
      console.log(`[Config-Loader] No prompt config for ${profile}, attempting to seed from file...`);
      const seedResult = await seedPromptFromFile(profile);

      if (seedResult.seeded && seedResult.contentHash) {
        hash = seedResult.contentHash;
        seededFromFile = true;
        console.log(`[Config-Loader] Seeded prompt ${profile} (hash: ${hash.substring(0, 12)}...)`);
      } else if (seedResult.error) {
        console.error(`[Config-Loader] Failed to seed prompt ${profile}: ${seedResult.error}`);
        return null;
      } else {
        // Already existed (race condition - another process seeded it)
        hash = await getActiveConfigHash(configType, profile);
        if (!hash) {
          console.error(`[Config-Loader] No prompt config and seeding failed for ${profile}`);
          return null;
        }
      }
    }

    // Check content cache
    const cached = cache.get(key);
    if (cached && cached.hash === hash && now - cached.loadedAt < CACHE_CONFIG.contentTTL) {
      // Record usage even for cached hits
      if (jobId) {
        await recordConfigUsage(jobId, configType, profile, hash).catch((err) => {
          console.warn(`[Config-Loader] Failed to record prompt usage: ${err?.message}`);
        });
      }
      return { content: cached.content, contentHash: hash, fromCache: true, seededFromFile: false };
    }

    // Load from DB
    const blob = await getConfigBlob(hash);
    if (!blob) {
      console.error(`[Config-Loader] Blob not found for prompt hash ${hash}`);
      return null;
    }

    // Update cache
    cache.set(key, {
      hash,
      content: blob.content,
      parsed: {} as SearchConfig, // Not used for prompts, but cache type requires it
      loadedAt: now,
      pointerCheckedAt: now,
    });

    // Record usage
    if (jobId) {
      await recordConfigUsage(jobId, configType, profile, hash).catch((err) => {
        console.warn(`[Config-Loader] Failed to record prompt usage: ${err?.message}`);
      });
    }

    return { content: blob.content, contentHash: hash, fromCache: false, seededFromFile };
  } catch (err) {
    console.error(`[Config-Loader] Error loading prompt config for ${profile}:`, err);
    return null;
  }
}

// ============================================================================
// UNIFIED ANALYZER CONFIG (Phase 1: Hot-Reload Support)
// ============================================================================

/**
 * Complete analyzer configuration (all types needed for analysis).
 * This is the main entry point for the analyzer to get all settings.
 */
export interface AnalyzerConfig {
  pipeline: PipelineConfig;
  search: SearchConfig;
  calc: CalcConfig;

  // Metadata
  source: "database" | "environment" | "mixed" | "default";
  loadedAt: Date;

  // Content hashes for auditability
  hashes: {
    pipeline: string;
    search: string;
    calc: string;
  };

  // Override tracking
  overrides: {
    pipeline: OverrideRecord[];
    search: OverrideRecord[];
    calc: OverrideRecord[];
  };
}

/**
 * Get complete analyzer configuration with all settings.
 *
 * This is the main entry point for Phase 1 (Analyzer Integration).
 * Replaces direct `process.env.FH_*` reads with unified config loading.
 *
 * Resolution order:
 * 1. Database (if exists and valid)
 * 2. Environment variables (if set)
 * 3. Defaults from schemas
 *
 * @param options - Load options
 * @returns Complete analyzer config with all settings
 */
export async function getAnalyzerConfig(options: {
  skipCache?: boolean;
  jobId?: string;
} = {}): Promise<AnalyzerConfig> {
  // Load all configs in parallel
  const [pipelineResult, searchResult, calcResult] = await Promise.all([
    loadPipelineConfig("default", options.jobId),
    loadSearchConfig("default", options.jobId),
    loadCalcConfig("default", options.jobId),
  ]);

  // Determine overall source
  let source: AnalyzerConfig["source"] = "default";
  const sources = [
    pipelineResult.contentHash === "default" ? "default" : "database",
    searchResult.contentHash === "default" ? "default" : "database",
    calcResult.contentHash === "default" ? "default" : "database",
  ];

  if (sources.every(s => s === "database")) {
    source = "database";
  } else if (sources.every(s => s === "default")) {
    source = "default";
  } else if (
    pipelineResult.overrides.length > 0 ||
    searchResult.overrides.length > 0 ||
    calcResult.overrides.length > 0
  ) {
    source = "environment";
  } else {
    source = "mixed";
  }

  return {
    pipeline: pipelineResult.config,
    search: searchResult.config,
    calc: calcResult.config,
    source,
    loadedAt: new Date(),
    hashes: {
      pipeline: pipelineResult.contentHash,
      search: searchResult.contentHash,
      calc: calcResult.contentHash,
    },
    overrides: {
      pipeline: pipelineResult.overrides,
      search: searchResult.overrides,
      calc: calcResult.overrides,
    },
  };
}

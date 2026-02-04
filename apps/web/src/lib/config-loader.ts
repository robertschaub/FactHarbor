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
  refreshPromptFromFileIfSystemSeed,
  seedPromptFromFile,
  type ConfigType,
  // NOTE: Override types preserved for backward compatibility but always return empty arrays
  // in LLM-only mode. May be removed in future cleanup or repurposed for production features.
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


// ============================================================================
// CACHE TYPES
// ============================================================================

interface CacheEntry {
  hash: string;
  content: string;
  parsed: SearchConfig | CalcConfig | PipelineConfig;
  loadedAt: number;
  pointerCheckedAt: number;
  fromDefault: boolean;  // Track if this came from code defaults (not DB)
}

interface ResolvedConfig<T> {
  config: T;
  contentHash: string;
  overrides: OverrideRecord[];
  fromCache: boolean;
  fromDefault: boolean;  // True if using code defaults (no DB config)
}

// ============================================================================
// CACHE STORAGE
// ============================================================================

const cache = new Map<string, CacheEntry>();

function getCacheKey(configType: ConfigType, profileKey: string): string {
  return `${configType}:${profileKey}`;
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

async function getOrLoadContent<T extends SearchConfig | CalcConfig | PipelineConfig>(
  configType: ConfigType,
  profileKey: string,
  hash: string,
  defaultConfig: T,
): Promise<{ content: T; fromCache: boolean; fromDefault: boolean }> {
  const key = getCacheKey(configType, profileKey);
  const cached = cache.get(key);
  const now = Date.now();

  // Check content cache - preserve fromDefault flag from cached entry
  if (cached && cached.hash === hash && now - cached.loadedAt < CACHE_CONFIG.contentTTL) {
    return { content: cached.parsed as T, fromCache: true, fromDefault: cached.fromDefault };
  }

  // Load from DB
  const blob = await getConfigBlob(hash);
  if (!blob) {
    console.warn(`[Config-Loader] Blob not found for hash ${hash}, using default`);
    // Cache the default so we preserve fromDefault=true on subsequent reads
    cache.set(key, {
      hash,
      content: JSON.stringify(defaultConfig),
      parsed: defaultConfig,
      loadedAt: now,
      pointerCheckedAt: now,
      fromDefault: true,
    });
    return { content: defaultConfig, fromCache: false, fromDefault: true };
  }

  try {
    const parsed = JSON.parse(blob.content) as T;

    // Update cache - this is from DB, so fromDefault=false
    cache.set(key, {
      hash,
      content: blob.content,
      parsed,
      loadedAt: now,
      pointerCheckedAt: now,
      fromDefault: false,
    });

    return { content: parsed, fromCache: false, fromDefault: false };
  } catch (err) {
    console.error(`[Config-Loader] Failed to parse config for ${configType}/${profileKey}:`, err);
    return { content: defaultConfig, fromCache: false, fromDefault: true };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load search config with caching.
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
      // Record usage with sentinel to indicate defaults were used
      if (jobId) {
        await recordConfigUsage(jobId, configType, profileKey, "__DEFAULT__").catch((err) => {
          console.warn(`[Config-Loader] Failed to record default config usage: ${err?.message}`);
        });
      }
      return { config: DEFAULT_SEARCH_CONFIG, contentHash: "__DEFAULT__", overrides: [], fromCache: false, fromDefault: true };
    }

    // Get content (from cache or DB)
    const { content, fromCache, fromDefault } = await getOrLoadContent(
      configType,
      profileKey,
      hash,
      DEFAULT_SEARCH_CONFIG,
    );

    // Record usage if job ID provided
    if (jobId) {
      await recordConfigUsage(jobId, configType, profileKey, hash);
    }

    return { config: content, contentHash: hash, overrides: [], fromCache, fromDefault };
  } catch (err) {
    console.error(`[Config-Loader] Error loading search config:`, err);
    return { config: DEFAULT_SEARCH_CONFIG, contentHash: "__ERROR_FALLBACK__", overrides: [], fromCache: false, fromDefault: true };
  }
}

/**
 * Load calculation config with caching.
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
      // Record usage with sentinel to indicate defaults were used
      if (jobId) {
        await recordConfigUsage(jobId, configType, profileKey, "__DEFAULT__").catch((err) => {
          console.warn(`[Config-Loader] Failed to record default config usage: ${err?.message}`);
        });
      }
      return { config: DEFAULT_CALC_CONFIG, contentHash: "__DEFAULT__", overrides: [], fromCache: false, fromDefault: true };
    }

    // Get content
    const { content, fromCache, fromDefault } = await getOrLoadContent(
      configType,
      profileKey,
      hash,
      DEFAULT_CALC_CONFIG,
    );

    // Record usage
    if (jobId) {
      await recordConfigUsage(jobId, configType, profileKey, hash);
    }

    return { config: content, contentHash: hash, overrides: [], fromCache, fromDefault };
  } catch (err) {
    console.error(`[Config-Loader] Error loading calc config:`, err);
    return { config: DEFAULT_CALC_CONFIG, contentHash: "__ERROR_FALLBACK__", overrides: [], fromCache: false, fromDefault: true };
  }
}

/**
 * Load pipeline config with caching.
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
      // Record usage with sentinel to indicate defaults were used
      if (jobId) {
        await recordConfigUsage(jobId, configType, profileKey, "__DEFAULT__").catch((err) => {
          console.warn(`[Config-Loader] Failed to record default config usage: ${err?.message}`);
        });
      }
      return { config: DEFAULT_PIPELINE_CONFIG, contentHash: "__DEFAULT__", overrides: [], fromCache: false, fromDefault: true };
    }

    // Get content
    const { content, fromCache, fromDefault } = await getOrLoadContent(
      configType,
      profileKey,
      hash,
      DEFAULT_PIPELINE_CONFIG,
    );

    // Record usage
    if (jobId) {
      await recordConfigUsage(jobId, configType, profileKey, hash);
    }

    return { config: content, contentHash: hash, overrides: [], fromCache, fromDefault };
  } catch (err) {
    console.error(`[Config-Loader] Error loading pipeline config:`, err);
    return { config: DEFAULT_PIPELINE_CONFIG, contentHash: "__ERROR_FALLBACK__", overrides: [], fromCache: false, fromDefault: true };
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
      return { base: defaultConfig, overrides: [], effective: defaultConfig as T };
    }

    const base = JSON.parse(activeConfig.content) as T;

    return { base, overrides: [], effective: base as T };
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
    // Refresh system-seeded prompts from files if they changed (safe no-op for user edits)
    await refreshPromptFromFileIfSystemSeed(profile).catch((err) => {
      console.warn(`[Config-Loader] Prompt refresh skipped for ${profile}: ${err?.message || err}`);
    });

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
      fromDefault: false, // Prompts loaded from DB are not defaults
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
 * 2. Defaults from schemas
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

  // Determine overall source using fromDefault flag
  let source: AnalyzerConfig["source"] = "default";
  const sources = [
    pipelineResult.fromDefault ? "default" : "database",
    searchResult.fromDefault ? "default" : "database",
    calcResult.fromDefault ? "default" : "database",
  ];

  if (sources.every((s) => s === "database")) {
    source = "database";
  } else if (sources.every((s) => s === "default")) {
    source = "default";
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

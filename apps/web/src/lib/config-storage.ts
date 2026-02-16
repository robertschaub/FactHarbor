/**
 * Configuration Storage
 *
 * SQLite-based storage for unified configuration management.
 * Three-table design: config_blobs (immutable), config_active (pointer), config_usage (tracking)
 *
 * @module config-storage
 * @version 1.0.0
 */

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import fs from "fs";
import {
  ConfigType,
  SchemaVersion,
  ValidationResult,
  validateConfig,
  canonicalizeContent,
  canonicalizeJson,
  computeContentHash,
  getSchemaVersion,
  getDefaultConfig,
  SCHEMA_VERSIONS,
  ConfigSchemaTypes,
  parseTypedConfig,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_CALC_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_SR_CONFIG,
} from "./config-schemas";

// Re-export types for API routes
export type { ConfigType, SchemaVersion, ValidationResult, ConfigSchemaTypes };

// ============================================================================
// CONFIGURATION
// ============================================================================

// Resolve database path: prefer env var, then check multiple locations
function resolveDbPath(): string {
  if (process.env.FH_CONFIG_DB_PATH) {
    return process.env.FH_CONFIG_DB_PATH;
  }

  // Check multiple possible locations based on where server is started from
  const possiblePaths = [
    path.resolve(process.cwd(), "config.db"),           // If started from apps/web
    path.resolve(process.cwd(), "apps/web/config.db"),  // If started from repo root
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default to ./config.db (will be created if it doesn't exist)
  return path.resolve(process.cwd(), "config.db");
}

const CONFIG_DB_PATH = resolveDbPath();

const DEFAULT_CONFIG_FILENAMES: Record<Exclude<ConfigType, "prompt">, string> = {
  search: "search.default.json",
  calculation: "calculation.default.json",
  pipeline: "pipeline.default.json",
  sr: "sr.default.json",
};

/**
 * Check if config file writes are allowed.
 * Only permitted in development or with explicit env flag.
 */
export function isFileWriteAllowed(): boolean {
  return process.env.NODE_ENV === "development" ||
    process.env.FH_ALLOW_CONFIG_FILE_WRITE === "true";
}

function resolveDefaultConfigPath(configType: Exclude<ConfigType, "prompt">): string {
  const filename = DEFAULT_CONFIG_FILENAMES[configType];
  const envDir = process.env.FH_CONFIG_DEFAULTS_DIR;
  if (envDir && envDir.trim()) {
    return path.join(envDir, filename);
  }

  const candidates = [
    path.resolve(process.cwd(), "configs", filename),
    path.resolve(process.cwd(), "apps/web/configs", filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

// Cache TTL in milliseconds (60 seconds default, per architecture plan)
const CONFIG_CACHE_TTL_MS = parseInt(process.env.FH_CONFIG_CACHE_TTL_MS || "60000", 10);

// ============================================================================
// CONFIG CACHE (Recommendation #14 - TTL-based with explicit invalidation)
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  contentHash: string;
  fromDefault?: boolean;
}

// Separate caches for different config types to support independent invalidation
const configCache = new Map<string, CacheEntry<unknown>>();

/**
 * Generate cache key for a config type + profile combination
 */
function getCacheKey(configType: ConfigType, profileKey: string): string {
  return `${configType}:${profileKey}`;
}

/**
 * Get cached config if valid (not expired)
 */
function getCached<T>(cacheKey: string): CacheEntry<T> | null {
  const entry = configCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    configCache.delete(cacheKey);
    return null;
  }
  return entry;
}

/**
 * Set cached config with TTL
 */
function setCache<T>(
  cacheKey: string,
  value: T,
  contentHash: string,
  options: { fromDefault?: boolean } = {},
): void {
  configCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    contentHash,
    fromDefault: options.fromDefault,
  });
}

/**
 * Invalidate cache for a specific config type + profile
 * Called automatically on save/activate
 */
export function invalidateConfigCache(configType: ConfigType, profileKey: string): void {
  const cacheKey = getCacheKey(configType, profileKey);
  configCache.delete(cacheKey);
  console.log(`[Config-Cache] Invalidated cache for ${cacheKey}`);
}

/**
 * Invalidate all caches for a config type (useful for bulk operations)
 */
export function invalidateConfigCacheByType(configType: ConfigType): void {
  const prefix = `${configType}:`;
  let count = 0;
  for (const key of configCache.keys()) {
    if (key.startsWith(prefix)) {
      configCache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    console.log(`[Config-Cache] Invalidated ${count} cache entries for type ${configType}`);
  }
}

/**
 * Clear entire config cache (for testing or emergency)
 */
export function clearConfigCache(): void {
  const size = configCache.size;
  configCache.clear();
  console.log(`[Config-Cache] Cleared all ${size} cache entries`);
}

/**
 * Get cache statistics (for monitoring/debugging)
 */
export function getConfigCacheStats(): {
  entries: number;
  keys: string[];
  ttlMs: number;
} {
  return {
    entries: configCache.size,
    keys: Array.from(configCache.keys()),
    ttlMs: CONFIG_CACHE_TTL_MS,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface ConfigBlobRow {
  content_hash: string;
  config_type: string;
  profile_key: string;
  schema_version: string;
  version_label: string;
  content: string;
  created_utc: string;
  created_by: string | null;
  updated_utc?: string | null;
  updated_by?: string | null;
}

export interface ConfigActiveRow {
  config_type: string;
  profile_key: string;
  active_hash: string;
  activated_utc: string;
  activated_by: string | null;
  activation_reason: string | null;
}

export interface ConfigUsageRow {
  id: number;
  job_id: string;
  config_type: string;
  profile_key: string;
  content_hash: string;
  effective_overrides: string | null;
  loaded_utc: string;
}

// Public types
export interface ConfigBlob {
  contentHash: string;
  configType: ConfigType;
  profileKey: string;
  schemaVersion: SchemaVersion;
  versionLabel: string;
  content: string;
  createdUtc: string;
  createdBy: string | null;
  updatedUtc: string | null;
  updatedBy: string | null;
}

export interface ConfigActive {
  configType: ConfigType;
  profileKey: string;
  activeHash: string;
  activatedUtc: string;
  activatedBy: string | null;
  activationReason: string | null;
}

export interface ConfigUsage {
  id: number;
  jobId: string;
  configType: ConfigType;
  profileKey: string;
  contentHash: string;
  effectiveOverrides: OverrideRecord[] | null;
  loadedUtc: string;
}

export interface OverrideRecord {
  envVar: string;
  fieldPath: string;
  wasSet: true;
  appliedValue?: string | number | boolean;
  valueHash?: string;
}

export interface ConfigWithActivation extends ConfigBlob {
  isActive: boolean;
  activatedUtc: string | null;
  activatedBy: string | null;
}

export interface SaveToFileResult {
  success: boolean;
  filePath: string;
  backupPath?: string;
  checksum: string;
  schemaVersion: string;
  dryRun?: boolean;
  warnings?: string[];
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const dbPath = path.resolve(CONFIG_DB_PATH);
  const usingEnvPath = !!process.env.FH_CONFIG_DB_PATH;
  console.log(`[Config-Storage] Opening database at ${dbPath} (${usingEnvPath ? "from FH_CONFIG_DB_PATH" : "default path"}, cwd: ${process.cwd()})`);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable WAL mode for better concurrent access
  await db.exec("PRAGMA journal_mode=WAL");

  // Create tables if not exist
  await db.exec(`
    -- Table 1: config_blobs (Immutable Content)
    CREATE TABLE IF NOT EXISTS config_blobs (
      content_hash TEXT PRIMARY KEY,
      config_type TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      version_label TEXT NOT NULL,
      content TEXT NOT NULL,
      created_utc TEXT NOT NULL,
      created_by TEXT,
      updated_utc TEXT,
      updated_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_config_blobs_type_profile
      ON config_blobs(config_type, profile_key);
    CREATE INDEX IF NOT EXISTS idx_config_blobs_created
      ON config_blobs(created_utc);

    -- Table 2: config_active (Mutable Activation Pointer)
    CREATE TABLE IF NOT EXISTS config_active (
      config_type TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      active_hash TEXT NOT NULL,
      activated_utc TEXT NOT NULL,
      activated_by TEXT,
      activation_reason TEXT,
      PRIMARY KEY (config_type, profile_key),
      FOREIGN KEY (active_hash) REFERENCES config_blobs(content_hash)
    );

    -- Table 3: config_usage (Per-Job Tracking)
    CREATE TABLE IF NOT EXISTS config_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      config_type TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      effective_overrides TEXT,
      loaded_utc TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_config_usage_job
      ON config_usage(job_id);
    CREATE INDEX IF NOT EXISTS idx_config_usage_hash
      ON config_usage(content_hash);

    -- Table 4: job_config_snapshots (Resolved per-job configs for auditability)
    CREATE TABLE IF NOT EXISTS job_config_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      pipeline_config TEXT NOT NULL,
      search_config TEXT NOT NULL,
      sr_enabled INTEGER NOT NULL,
      sr_default_score REAL NOT NULL,
      sr_confidence_threshold REAL NOT NULL,
      captured_utc TEXT NOT NULL,
      analyzer_version TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_job_config_snapshots_job
      ON job_config_snapshots(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_config_snapshots_captured
      ON job_config_snapshots(captured_utc);
  `);

  await ensureConfigBlobColumns(db);

  await initializeDefaultConfigsWithDb(db);

  return db;
}

async function ensureConfigBlobColumns(database: Database): Promise<void> {
  const columns = await database.all<{ name: string }[]>(`PRAGMA table_info(config_blobs)`);
  const columnNames = new Set(columns.map((col) => col.name));

  const addColumn = async (name: string, type: string) => {
    if (columnNames.has(name)) return;
    try {
      await database.exec(`ALTER TABLE config_blobs ADD COLUMN ${name} ${type}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("duplicate column name")) {
        throw err;
      }
    }
  };

  await addColumn("created_by", "TEXT");
  await addColumn("updated_utc", "TEXT");
  await addColumn("updated_by", "TEXT");

  await database.exec(`
    UPDATE config_blobs
    SET updated_utc = COALESCE(updated_utc, created_utc),
        updated_by = COALESCE(updated_by, created_by)
  `);
}

// ============================================================================
// ROW MAPPING
// ============================================================================

function rowToConfigBlob(row: ConfigBlobRow): ConfigBlob {
  return {
    contentHash: row.content_hash,
    configType: row.config_type as ConfigType,
    profileKey: row.profile_key,
    schemaVersion: row.schema_version as SchemaVersion,
    versionLabel: row.version_label,
    content: row.content,
    createdUtc: row.created_utc,
    createdBy: row.created_by,
    updatedUtc: row.updated_utc ?? row.created_utc,
    updatedBy: row.updated_by ?? row.created_by,
  };
}

function rowToConfigActive(row: ConfigActiveRow): ConfigActive {
  return {
    configType: row.config_type as ConfigType,
    profileKey: row.profile_key,
    activeHash: row.active_hash,
    activatedUtc: row.activated_utc,
    activatedBy: row.activated_by,
    activationReason: row.activation_reason,
  };
}

function rowToConfigUsage(row: ConfigUsageRow): ConfigUsage {
  return {
    id: row.id,
    jobId: row.job_id,
    configType: row.config_type as ConfigType,
    profileKey: row.profile_key,
    contentHash: row.content_hash,
    effectiveOverrides: row.effective_overrides
      ? JSON.parse(row.effective_overrides)
      : null,
    loadedUtc: row.loaded_utc,
  };
}

// ============================================================================
// CONFIG BLOB OPERATIONS
// ============================================================================

/**
 * Save a new config version (does not activate)
 * Returns existing blob if content already exists (content-addressable)
 */
export async function saveConfigBlob(
  configType: ConfigType,
  profileKey: string,
  content: string,
  versionLabel: string,
  createdBy?: string,
  updatedBy?: string,
): Promise<{ blob: ConfigBlob; isNew: boolean; validation: ValidationResult }> {
  const database = await getDb();
  const schemaVersion = getSchemaVersion(configType);

  // Validate content
  const validation = validateConfig(configType, content, schemaVersion);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Canonicalize and hash
  const canonicalized = canonicalizeContent(configType, content);
  const contentHash = computeContentHash(canonicalized);
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);

  const recent = await database.get<{
    created_utc: string;
    created_by: string | null;
    updated_utc: string | null;
    updated_by: string | null;
  }>(
    `SELECT created_utc, created_by, updated_utc, updated_by
     FROM config_blobs
     WHERE config_type = ? AND profile_key = ?
     ORDER BY COALESCE(updated_utc, created_utc) DESC
     LIMIT 1`,
    [configType, profileKey],
  );

  if (recent) {
    const lastTimestamp = recent.updated_utc || recent.created_utc;
    const lastUpdatedBy = recent.updated_by || recent.created_by || "unknown";
    const lastMs = Date.parse(lastTimestamp);
    const deltaMs = Number.isNaN(lastMs) ? null : nowMs - lastMs;
    if (deltaMs !== null && deltaMs < 60_000) {
      console.warn(
        `[Config] Recent update detected for ${configType}/${profileKey}: ` +
        `${deltaMs}ms ago by ${lastUpdatedBy}`,
      );
    }
  }

  // Check if hash already exists
  const existing = await database.get<ConfigBlobRow>(
    "SELECT * FROM config_blobs WHERE content_hash = ?",
    [contentHash],
  );

  if (existing) {
    // If same type AND profile, return existing (idempotent save)
    if (existing.config_type === configType && existing.profile_key === profileKey) {
      return {
        blob: rowToConfigBlob(existing),
        isNew: false,
        validation,
      };
    }

    // Content hash already exists for DIFFERENT type/profile - can't create duplicate hash
    // This is an edge case where identical config content is used across profiles
    throw new Error(
      `Identical content already saved for ${existing.config_type}/${existing.profile_key}. ` +
        `Content-addressable storage does not allow duplicate content across profiles. ` +
        `Consider copying the active config from "${existing.profile_key}" to "${profileKey}" instead.`,
    );
  }

  // Insert new blob
  const createdByValue = createdBy ?? updatedBy ?? "system";
  const updatedByValue = updatedBy ?? createdBy ?? "system";

  await database.run(
    `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by, updated_utc, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contentHash,
      configType,
      profileKey,
      schemaVersion,
      versionLabel,
      canonicalized,
      now,
      createdByValue,
      now,
      updatedByValue,
    ],
  );

  // Invalidate cache for this config (new version available)
  invalidateConfigCache(configType, profileKey);

  return {
    blob: {
      contentHash,
      configType,
      profileKey,
      schemaVersion,
      versionLabel,
      content: canonicalized,
      createdUtc: now,
      createdBy: createdByValue,
      updatedUtc: now,
      updatedBy: updatedByValue,
    },
    isNew: true,
    validation,
  };
}

/**
 * Get a config blob by content hash
 */
export async function getConfigBlob(
  contentHash: string,
): Promise<ConfigBlob | null> {
  const database = await getDb();
  const row = await database.get<ConfigBlobRow>(
    "SELECT * FROM config_blobs WHERE content_hash = ?",
    [contentHash],
  );
  return row ? rowToConfigBlob(row) : null;
}

/**
 * Get version history for a config type + profile
 */
export async function getConfigHistory(
  configType: ConfigType,
  profileKey: string,
  limit = 20,
  offset = 0,
): Promise<{ versions: ConfigWithActivation[]; total: number }> {
  const database = await getDb();

  const total = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM config_blobs WHERE config_type = ? AND profile_key = ?",
    [configType, profileKey],
  );

  const rows = await database.all<ConfigBlobRow[]>(
    `SELECT b.*, a.activated_utc as act_utc, a.activated_by as act_by
     FROM config_blobs b
     LEFT JOIN config_active a ON b.content_hash = a.active_hash
       AND b.config_type = a.config_type AND b.profile_key = a.profile_key
     WHERE b.config_type = ? AND b.profile_key = ?
     ORDER BY b.created_utc DESC
     LIMIT ? OFFSET ?`,
    [configType, profileKey, limit, offset],
  );

  // Get current active hash
  const active = await database.get<{ active_hash: string }>(
    "SELECT active_hash FROM config_active WHERE config_type = ? AND profile_key = ?",
    [configType, profileKey],
  );

  const versions: ConfigWithActivation[] = rows.map((row) => ({
    ...rowToConfigBlob(row),
    isActive: active?.active_hash === row.content_hash,
    activatedUtc: (row as unknown as Record<string, unknown>).act_utc as string | null,
    activatedBy: (row as unknown as Record<string, unknown>).act_by as string | null,
  }));

  return {
    versions,
    total: total?.count ?? 0,
  };
}

// ============================================================================
// CONFIG ACTIVATION OPERATIONS
// ============================================================================

/**
 * Activate a config version (set as current active)
 */
export async function activateConfig(
  configType: ConfigType,
  profileKey: string,
  contentHash: string,
  activatedBy?: string,
  reason?: string,
): Promise<ConfigActive> {
  const database = await getDb();
  const now = new Date().toISOString();

  // Verify blob exists
  const blob = await getConfigBlob(contentHash);
  if (!blob) {
    throw new Error(`Config blob not found: ${contentHash}`);
  }

  if (blob.configType !== configType || blob.profileKey !== profileKey) {
    throw new Error(
      `Config blob does not match type/profile: expected ${configType}/${profileKey}, got ${blob.configType}/${blob.profileKey}`,
    );
  }

  // Upsert activation (SQLite ON CONFLICT)
  await database.run(
    `INSERT INTO config_active (config_type, profile_key, active_hash, activated_utc, activated_by, activation_reason)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(config_type, profile_key) DO UPDATE SET
       active_hash = excluded.active_hash,
       activated_utc = excluded.activated_utc,
       activated_by = excluded.activated_by,
       activation_reason = excluded.activation_reason`,
    [configType, profileKey, contentHash, now, activatedBy || null, reason || null],
  );

  // Invalidate cache (active config changed)
  invalidateConfigCache(configType, profileKey);

  return {
    configType,
    profileKey,
    activeHash: contentHash,
    activatedUtc: now,
    activatedBy: activatedBy || null,
    activationReason: reason || null,
  };
}

/**
 * Get the currently active config for a type + profile
 */
export async function getActiveConfig(
  configType: ConfigType,
  profileKey: string,
): Promise<ConfigWithActivation | null> {
  const database = await getDb();

  const active = await database.get<ConfigActiveRow>(
    "SELECT * FROM config_active WHERE config_type = ? AND profile_key = ?",
    [configType, profileKey],
  );

  if (!active) return null;

  const blob = await getConfigBlob(active.active_hash);
  if (!blob) return null;

  return {
    ...blob,
    isActive: true,
    activatedUtc: active.activated_utc,
    activatedBy: active.activated_by,
  };
}

/**
 * Get active config hash only (for cache polling)
 */
export async function getActiveConfigHash(
  configType: ConfigType,
  profileKey: string,
): Promise<string | null> {
  const database = await getDb();
  const row = await database.get<{ active_hash: string }>(
    "SELECT active_hash FROM config_active WHERE config_type = ? AND profile_key = ?",
    [configType, profileKey],
  );
  return row?.active_hash || null;
}

/**
 * Rollback to a previous version (convenience wrapper around activate)
 */
export async function rollbackConfig(
  configType: ConfigType,
  profileKey: string,
  contentHash: string,
  activatedBy?: string,
): Promise<ConfigActive> {
  return activateConfig(
    configType,
    profileKey,
    contentHash,
    activatedBy,
    "rollback",
  );
}

// ============================================================================
// CONFIG USAGE TRACKING
// ============================================================================

/**
 * Record that a config was used for a job
 */
export async function recordConfigUsage(
  jobId: string,
  configType: ConfigType,
  profileKey: string,
  contentHash: string,
  effectiveOverrides?: OverrideRecord[],
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();

  await database.run(
    `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, effective_overrides, loaded_utc)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      configType,
      profileKey,
      contentHash,
      effectiveOverrides ? JSON.stringify(effectiveOverrides) : null,
      now,
    ],
  );
}

/**
 * Get config usage for a job
 */
export async function getConfigUsageForJob(
  jobId: string,
): Promise<ConfigUsage[]> {
  const database = await getDb();
  const rows = await database.all<ConfigUsageRow[]>(
    "SELECT * FROM config_usage WHERE job_id = ? ORDER BY loaded_utc",
    [jobId],
  );
  return rows.map(rowToConfigUsage);
}

/**
 * Get config content that was used for a specific job
 */
export async function getConfigForJob(
  jobId: string,
  configType: ConfigType,
  profileKey: string,
): Promise<{ content: string; contentHash: string; overrides: OverrideRecord[] | null } | null> {
  const database = await getDb();

  const usage = await database.get<ConfigUsageRow>(
    `SELECT * FROM config_usage
     WHERE job_id = ? AND config_type = ? AND profile_key = ?
     ORDER BY loaded_utc DESC LIMIT 1`,
    [jobId, configType, profileKey],
  );

  if (!usage) return null;

  const blob = await getConfigBlob(usage.content_hash);
  if (!blob) return null;

  return {
    content: blob.content,
    contentHash: usage.content_hash,
    overrides: usage.effective_overrides
      ? JSON.parse(usage.effective_overrides)
      : null,
  };
}

// ============================================================================
// TYPED CONFIG GETTER (Recommendation #24 - Type-safe config access)
// ============================================================================

/**
 * Default configs by type
 */
const DEFAULT_CONFIGS: Record<Exclude<ConfigType, "prompt">, unknown> = {
  search: DEFAULT_SEARCH_CONFIG,
  calculation: DEFAULT_CALC_CONFIG,
  pipeline: DEFAULT_PIPELINE_CONFIG,
  sr: DEFAULT_SR_CONFIG,
};

/**
 * Get typed configuration with caching.
 *
 * Resolution order:
 * 1. Check cache (TTL-based)
 * 2. Load from database (active config)
 * 3. Fall back to default config if no DB config exists
 *
 * @param configType - The type of config to retrieve
 * @param profileKey - The profile key (default: "default")
 * @param options - Optional: skipCache to bypass cache, jobId to record usage
 * @returns Typed config with metadata
 */
export async function getConfig<T extends keyof ConfigSchemaTypes>(
  configType: T,
  profileKey = "default",
  options: {
    skipCache?: boolean;
    jobId?: string;
  } = {},
): Promise<{
  config: ConfigSchemaTypes[T];
  contentHash: string | null;
  fromCache: boolean;
  fromDefault: boolean;
  overrides: OverrideRecord[];
}> {
  const cacheKey = getCacheKey(configType, profileKey);

  // 1. Check cache (unless skipCache)
  if (!options.skipCache) {
    const cached = getCached<{
      config: ConfigSchemaTypes[T];
      contentHash: string | null;
      overrides: OverrideRecord[];
    }>(cacheKey);
    if (cached) {
      return {
        config: cached.value.config,
        contentHash: cached.value.contentHash,
        fromCache: true,
        fromDefault: cached.fromDefault ?? false,
        overrides: cached.value.overrides,
      };
    }
  }

  // 2. Try to load from database
  let baseConfig: ConfigSchemaTypes[T] | null = null;
  let contentHash: string | null = null;
  let fromDefault = false;

  if (configType === "prompt") {
    // Prompts are strings, no env override
    const activeConfig = await getActiveConfig(configType, profileKey);
    if (activeConfig) {
      const result = {
        config: activeConfig.content as ConfigSchemaTypes[T],
        contentHash: activeConfig.contentHash,
        fromCache: false,
        fromDefault: false,
        overrides: [] as OverrideRecord[],
      };
      // Cache the result
      setCache(cacheKey, result, activeConfig.contentHash, { fromDefault: false });
      // Record usage if jobId provided
      if (options.jobId) {
        await recordConfigUsage(options.jobId, configType, profileKey, activeConfig.contentHash, []);
      }
      return result;
    }
    // No DB config for prompt - this is an error state, prompts should always be seeded
    throw new Error(`No active prompt config for profile: ${profileKey}. Run seedPromptFromFile() first.`);
  }

  // For non-prompt types
  const activeConfig = await getActiveConfig(configType, profileKey);
  if (activeConfig) {
    baseConfig = parseTypedConfig(configType, activeConfig.content);
    contentHash = activeConfig.contentHash;
  } else {
    // Fall back to default config
    const defaultConfig = DEFAULT_CONFIGS[configType as Exclude<ConfigType, "prompt">];
    if (defaultConfig) {
      baseConfig = defaultConfig as ConfigSchemaTypes[T];
      fromDefault = true;
    } else {
      throw new Error(`No config found for ${configType}/${profileKey} and no default available`);
    }
  }

  const result = {
    config: baseConfig as ConfigSchemaTypes[T],
    contentHash,
    fromCache: false,
    fromDefault,
    overrides: [] as OverrideRecord[],
  };

  // 4. Cache the result
  setCache(cacheKey, result, contentHash || "default", { fromDefault });

  // 5. Record usage if jobId provided (for non-default configs)
  if (options.jobId && contentHash) {
    await recordConfigUsage(options.jobId, configType, profileKey, contentHash);
  }

  return result;
}

/**
 * Get multiple config types at once (for job startup).
 * More efficient than calling getConfig multiple times.
 */
export async function getConfigBundle(
  jobId: string,
  pipelineVariant: string,
): Promise<{
  search: ConfigSchemaTypes["search"];
  calculation: ConfigSchemaTypes["calculation"];
  pipeline: ConfigSchemaTypes["pipeline"];
  prompt: string;
  hashes: Record<string, string | null>;
  overrides: Record<string, OverrideRecord[]>;
}> {
  const [searchResult, calcResult, pipelineResult, promptResult] = await Promise.all([
    getConfig("search", "default", { jobId }),
    getConfig("calculation", "default", { jobId }),
    getConfig("pipeline", "default", { jobId }),
    getConfig("prompt", pipelineVariant, { jobId }),
  ]);

  return {
    search: searchResult.config,
    calculation: calcResult.config,
    pipeline: pipelineResult.config,
    prompt: promptResult.config,
    hashes: {
      search: searchResult.contentHash,
      calculation: calcResult.contentHash,
      pipeline: pipelineResult.contentHash,
      prompt: promptResult.contentHash,
    },
    overrides: {
      search: searchResult.overrides,
      calculation: calcResult.overrides,
      pipeline: pipelineResult.overrides,
      prompt: promptResult.overrides,
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * List all profile keys for a config type
 */
export async function listProfileKeys(
  configType: ConfigType,
): Promise<string[]> {
  const database = await getDb();
  const rows = await database.all<Array<{ profile_key: string }>>(
    "SELECT DISTINCT profile_key FROM config_blobs WHERE config_type = ? ORDER BY profile_key",
    [configType],
  );
  return rows.map((r) => r.profile_key);
}

/**
 * Validate config content without saving
 */
export async function validateConfigContent(
  configType: ConfigType,
  content: string,
): Promise<ValidationResult & { canonicalizedHash?: string }> {
  const schemaVersion = getSchemaVersion(configType);
  const validation = validateConfig(configType, content, schemaVersion);

  if (validation.valid) {
    try {
      const canonicalized = canonicalizeContent(configType, content);
      const hash = computeContentHash(canonicalized);
      return { ...validation, canonicalizedHash: hash };
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to canonicalize: ${err}`],
        warnings: validation.warnings,
      };
    }
  }

  return validation;
}

/**
 * Load default config from file with schema version validation.
 * Alpha behavior: warn on version mismatch and fall back to code constants.
 */
export function loadDefaultConfigFromFile(
  configType: Exclude<ConfigType, "prompt">,
): string | null {
  const filePath = resolveDefaultConfigPath(configType);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const filename = path.basename(filePath);

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent) as Record<string, unknown>;

    const expectedVersion = SCHEMA_VERSIONS[configType];
    const fileVersion = typeof parsed.schemaVersion === "string" ? parsed.schemaVersion : null;
    if (fileVersion !== expectedVersion) {
      console.warn(
        `[Config] ${filename} version mismatch: expected ${expectedVersion}, got ${fileVersion ?? "missing"}`,
      );
      return null;
    }

    const { schemaVersion: _schemaVersion, ...config } = parsed;
    const validated = parseTypedConfig(configType, JSON.stringify(config));

    return canonicalizeJson(validated as Record<string, unknown>);
  } catch (err) {
    console.error(`[Config] Failed to load ${filename}:`, err);
    return null;
  }
}

/**
 * Save config to default JSON file with atomic write and backup.
 *
 * Safety features:
 * - Environment gating (dev only or explicit flag)
 * - Atomic write (.tmp then rename)
 * - Backup creation (.bak)
 * - Schema validation
 * - dryRun mode for preview
 */
export async function saveConfigToFile(
  configType: Exclude<ConfigType, "prompt">,
  config: unknown,
  dryRun: boolean = false,
): Promise<SaveToFileResult> {
  if (!isFileWriteAllowed()) {
    throw new Error(
      "Config file writes not allowed. Set NODE_ENV=development or FH_ALLOW_CONFIG_FILE_WRITE=true",
    );
  }

  const filePath = resolveDefaultConfigPath(configType);
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;

  const schemaVersion = SCHEMA_VERSIONS[configType];
  const configObject = (config ?? {}) as Record<string, unknown>;
  const { schemaVersion: _ignored, ...configBody } = configObject;
  const configWithVersion = {
    schemaVersion,
    ...configBody,
  };

  const validation = await validateConfigContent(
    configType,
    JSON.stringify(configBody),
  );
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  const content = JSON.stringify(configWithVersion, null, 2) + "\n";
  const checksum = computeContentHash(content);

  if (dryRun) {
    return {
      success: true,
      filePath,
      checksum,
      schemaVersion,
      dryRun: true,
      warnings: validation.warnings,
    };
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  let backupCreated = false;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, bakPath);
    backupCreated = true;
  }

  try {
    fs.writeFileSync(tmpPath, content, "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to write config file: ${message}`);
  }

  return {
    success: true,
    filePath,
    backupPath: backupCreated ? bakPath : undefined,
    checksum,
    schemaVersion,
    warnings: validation.warnings,
  };
}

/**
 * Initialize default configs if none exist
 */
export async function initializeDefaultConfigs(): Promise<void> {
  const database = await getDb();
  await initializeDefaultConfigsWithDb(database);
}

async function initializeDefaultConfigsWithDb(database: Database): Promise<void> {
  console.log("[Config-Storage] Ensuring default configs exist...");

  await ensureDefaultConfig(database, "search");
  await ensureDefaultConfig(database, "calculation");
  await ensureDefaultConfig(database, "pipeline");
  await ensureDefaultConfig(database, "sr");

  console.log("[Config-Storage] Default configs ensured");
}

type DefaultConfigType = Exclude<ConfigType, "prompt">;

async function ensureDefaultConfig(
  database: Database,
  configType: DefaultConfigType,
): Promise<void> {
  const active = await database.get<{
    active_hash: string;
    content: string;
    created_by: string | null;
    version_label: string | null;
  }>(
    `SELECT a.active_hash, b.content, b.created_by, b.version_label
     FROM config_active a
     JOIN config_blobs b ON a.active_hash = b.content_hash
     WHERE a.config_type = ? AND a.profile_key = ?
     LIMIT 1`,
    [configType, "default"],
  );

  const defaultContent = loadDefaultConfigFromFile(configType) ?? getDefaultConfig(configType);

  if (!active) {
    const { blob } = await saveConfigBlob(
      configType,
      "default",
      defaultContent,
      "Initial default config",
      "system",
    );
    await activateConfig(configType, "default", blob.contentHash, "system", "initial");
    return;
  }

  const isSystemDefault =
    active.created_by === "system" && active.version_label === "Initial default config";

  if (isSystemDefault && active.content !== defaultContent) {
    const { blob } = await saveConfigBlob(
      configType,
      "default",
      defaultContent,
      "Initial default config",
      "system",
    );
    await activateConfig(configType, "default", blob.contentHash, "system", "refresh-default");
    console.log(`[Config-Storage] Refreshed default ${configType} config`);
  }
}

/**
 * Close database connection (for cleanup)
 */
export async function closeConfigDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// ============================================================================
// PROMPT SEEDING
// ============================================================================

import { readFile } from "fs/promises";
import { existsSync } from "fs";

export const VALID_PROMPT_PROFILES = [
  "orchestrated",
  "monolithic-dynamic",
  "source-reliability",
  // LLM text analysis prompts (4 analysis points)
  "text-analysis-input",
  "text-analysis-evidence",
  "text-analysis-context",
  "text-analysis-verdict",
  // ClaimBoundary pipeline prompts (all stages)
  "claimboundary",
] as const;

export type PromptProfile = (typeof VALID_PROMPT_PROFILES)[number];

export function isValidPromptProfile(profile: string): profile is PromptProfile {
  return VALID_PROMPT_PROFILES.includes(profile as PromptProfile);
}

/**
 * Get the prompts directory path
 */
function getPromptDir(): string {
  return process.env.FH_PROMPT_DIR || path.join(process.cwd(), "prompts");
}

/**
 * Get the file path for a prompt profile.
 * Text-analysis prompts are in the text-analysis/ subfolder.
 */
function getPromptFilePath(profile: string): string {
  const promptDir = getPromptDir();
  if (profile.startsWith("text-analysis-")) {
    return path.join(promptDir, "text-analysis", `${profile}.prompt.md`);
  }
  return path.join(promptDir, `${profile}.prompt.md`);
}

/**
 * Refresh a prompt from file if the active config is a system seed.
 * Safe: does not overwrite user-edited prompts.
 */
export async function refreshPromptFromFileIfSystemSeed(
  profile: string,
): Promise<{ refreshed: boolean; contentHash: string | null; error?: string }> {
  if (!isValidPromptProfile(profile)) {
    return { refreshed: false, contentHash: null, error: `Invalid profile: ${profile}` };
  }

  const active = await getActiveConfig("prompt", profile);
  if (!active) {
    // No active config - seed as normal
    const seeded = await seedPromptFromFile(profile);
    return { refreshed: seeded.seeded, contentHash: seeded.contentHash, error: seeded.error };
  }

  const isSystemSeed =
    active.createdBy === "system-seed" &&
    typeof active.versionLabel === "string" &&
    active.versionLabel.startsWith("seed-v");

  if (!isSystemSeed) {
    return { refreshed: false, contentHash: active.contentHash };
  }

  const filePath = getPromptFilePath(profile);
  if (!existsSync(filePath)) {
    return { refreshed: false, contentHash: active.contentHash, error: `Prompt file not found: ${filePath}` };
  }

  try {
    const content = await readFile(filePath, "utf-8");
    const canonical = canonicalizeContent("prompt", content);

    if (canonical === active.content) {
      return { refreshed: false, contentHash: active.contentHash };
    }

    const versionMatch = content.match(/^version:\s*["']?([^"'\n]+)["']?/m);
    const version = versionMatch?.[1] || "seed";
    const versionLabel = `seed-v${version}`;

    const { blob } = await saveConfigBlob(
      "prompt",
      profile,
      content,
      versionLabel,
      "system-seed",
    );
    await activateConfig("prompt", profile, blob.contentHash, "system-seed", "refresh-seed");

    console.log(
      `[Config-Storage] Refreshed prompt ${profile} from file (hash: ${blob.contentHash.substring(0, 12)}...)`,
    );

    return { refreshed: true, contentHash: blob.contentHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Config-Storage] Failed to refresh prompt ${profile}:`, message);
    return { refreshed: false, contentHash: active.contentHash, error: message };
  }
}

/**
 * Seed a single prompt from file if no active config exists.
 * Idempotent: no-op if active config already present.
 * Concurrency-safe: uses DB transaction with conflict handling.
 *
 * @param profile - Pipeline/profile name (e.g., "orchestrated")
 * @param force - If true, re-seed even if config exists
 * @returns Result indicating if seeding occurred
 */
export async function seedPromptFromFile(
  profile: string,
  force = false,
  seededBy?: string,
): Promise<{ seeded: boolean; contentHash: string | null; error?: string }> {
  if (!isValidPromptProfile(profile)) {
    return { seeded: false, contentHash: null, error: `Invalid profile: ${profile}` };
  }

  // Check if already has active config (unless forcing)
  if (!force) {
    const existingHash = await getActiveConfigHash("prompt", profile);
    if (existingHash) {
      console.log(`[Config-Storage] Prompt config for ${profile} already exists, skipping seed`);
      return { seeded: false, contentHash: existingHash };
    }
  }

  // Find and read prompt file
  const filePath = getPromptFilePath(profile);

  if (!existsSync(filePath)) {
    return { seeded: false, contentHash: null, error: `Prompt file not found: ${filePath}` };
  }

  try {
    const content = await readFile(filePath, "utf-8");

    // Extract version from frontmatter for label
    const versionMatch = content.match(/^version:\s*["']?([^"'\n]+)["']?/m);
    const version = versionMatch?.[1] || "seed";
    const versionLabel = `seed-v${version}`;

    // Save to config_blobs
    const { blob, isNew } = await saveConfigBlob(
      "prompt",
      profile,
      content,
      versionLabel,
      seededBy ?? "system-seed",
      seededBy ?? "system-seed",
    );

    // Activate it
    await activateConfig("prompt", profile, blob.contentHash, seededBy ?? "system-seed", "initial-seed");

    console.log(
      `[Config-Storage] Seeded prompt ${profile} from file (hash: ${blob.contentHash.substring(0, 12)}..., isNew: ${isNew})`,
    );

    return { seeded: true, contentHash: blob.contentHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Config-Storage] Failed to seed prompt ${profile}:`, message);
    return { seeded: false, contentHash: null, error: message };
  }
}

/**
 * Seed all prompts from files (optional optimization).
 * Can be called on app startup, but lazy fallback in loader is the primary mechanism.
 */
export async function seedAllPromptsFromFiles(): Promise<{
  results: Array<{ profile: string; seeded: boolean; error?: string }>;
}> {
  const results: Array<{ profile: string; seeded: boolean; error?: string }> = [];

  for (const profile of VALID_PROMPT_PROFILES) {
    const result = await seedPromptFromFile(profile);
    results.push({ profile, seeded: result.seeded, error: result.error });
  }

  const seededCount = results.filter((r) => r.seeded).length;
  console.log(`[Config-Storage] Seeded ${seededCount}/${VALID_PROMPT_PROFILES.length} prompts from files`);

  return { results };
}

/**
 * Export a prompt to file (download or dev-only file write)
 * Returns the content for download; file write is handled by caller
 */
export async function getPromptForExport(
  profile: string,
): Promise<{ content: string; filename: string; contentHash: string } | null> {
  if (!isValidPromptProfile(profile)) {
    return null;
  }

  const config = await getActiveConfig("prompt", profile);
  if (!config) {
    return null;
  }

  return {
    content: config.content,
    filename: `${profile}.prompt.md`,
    contentHash: config.contentHash,
  };
}

/**
 * Import prompt content from uploaded file
 * Validates, saves, and optionally activates the prompt.
 */
export async function importPromptContent(
  profile: string,
  content: string,
  options: {
    versionLabel?: string;
    activateImmediately?: boolean;
    importedBy?: string;
  } = {},
): Promise<{
  success: boolean;
  blob?: ConfigBlob;
  isNew?: boolean;
  activated?: boolean;
  validation: ValidationResult;
  error?: string;
}> {
  // 1. Validate profile against allowlist
  if (!isValidPromptProfile(profile)) {
    return {
      success: false,
      validation: {
        valid: false,
        errors: [`Invalid profile: ${profile}. Valid profiles: ${VALID_PROMPT_PROFILES.join(", ")}`],
        warnings: [],
      },
      error: `Invalid profile: ${profile}`,
    };
  }

  // 2. Pre-validate content format
  const validation = await validateConfigContent("prompt", content);
  if (!validation.valid) {
    return { success: false, validation, error: validation.errors.join("; ") };
  }

  // 3. Validate frontmatter pipeline matches profile
  const pipelineMatch = content.match(/^pipeline:\s*["']?([^"'\n]+)/m);
  if (pipelineMatch) {
    const contentPipeline = pipelineMatch[1].trim();
    // Map text-analysis-* profiles to "text-analysis" pipeline
    const expectedPipeline = profile.startsWith("text-analysis") ? "text-analysis" : profile;
    if (contentPipeline !== expectedPipeline) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [`Frontmatter pipeline "${contentPipeline}" does not match expected "${expectedPipeline}" for profile "${profile}"`],
          warnings: validation.warnings,
        },
        error: `Pipeline mismatch: file has "${contentPipeline}", expected "${expectedPipeline}"`,
      };
    }
  }

  // 4. Save blob
  const versionLabel = options.versionLabel || `import-${new Date().toISOString().split("T")[0]}`;
  try {
    const { blob, isNew } = await saveConfigBlob(
      "prompt",
      profile,
      content,
      versionLabel,
      options.importedBy || "admin",
      options.importedBy || "admin",
    );

    // 5. Optionally activate
    let activated = false;
    if (options.activateImmediately) {
      await activateConfig("prompt", profile, blob.contentHash, options.importedBy || "admin", "import");
      activated = true;
    }

    return {
      success: true,
      blob,
      isNew,
      activated,
      validation,
    };
  } catch (err) {
    return {
      success: false,
      validation,
      error: `Failed to save: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

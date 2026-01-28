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
import {
  ConfigType,
  SchemaVersion,
  ValidationResult,
  validateConfig,
  canonicalizeContent,
  computeContentHash,
  getSchemaVersion,
  getDefaultConfig,
} from "./config-schemas";

// Re-export types for API routes
export type { ConfigType, SchemaVersion, ValidationResult };

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG_DB_PATH = process.env.FH_CONFIG_DB_PATH || "./config.db";

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

// ============================================================================
// DATABASE SETUP
// ============================================================================

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;

  const dbPath = path.resolve(CONFIG_DB_PATH);
  console.log(`[Config-Storage] Opening database at ${dbPath}`);

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
      created_by TEXT
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
  `);

  return db;
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
  await database.run(
    `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contentHash,
      configType,
      profileKey,
      schemaVersion,
      versionLabel,
      canonicalized,
      now,
      createdBy || null,
    ],
  );

  return {
    blob: {
      contentHash,
      configType,
      profileKey,
      schemaVersion,
      versionLabel,
      content: canonicalized,
      createdUtc: now,
      createdBy: createdBy || null,
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
 * Initialize default configs if none exist
 */
export async function initializeDefaultConfigs(): Promise<void> {
  const database = await getDb();

  // Check if any configs exist
  const count = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM config_blobs",
  );

  if (count && count.count > 0) {
    console.log("[Config-Storage] Configs already exist, skipping initialization");
    return;
  }

  console.log("[Config-Storage] Initializing default configs...");

  // Create default search config
  const searchContent = getDefaultConfig("search");
  if (searchContent) {
    const { blob } = await saveConfigBlob(
      "search",
      "default",
      searchContent,
      "Initial default config",
      "system",
    );
    await activateConfig("search", "default", blob.contentHash, "system", "initial");
  }

  // Create default calculation config
  const calcContent = getDefaultConfig("calculation");
  if (calcContent) {
    const { blob } = await saveConfigBlob(
      "calculation",
      "default",
      calcContent,
      "Initial default config",
      "system",
    );
    await activateConfig("calculation", "default", blob.contentHash, "system", "initial");
  }

  console.log("[Config-Storage] Default configs initialized");
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

const VALID_PROMPT_PROFILES = [
  "orchestrated",
  "monolithic-canonical",
  "monolithic-dynamic",
  "source-reliability",
] as const;

type PromptProfile = (typeof VALID_PROMPT_PROFILES)[number];

function isValidPromptProfile(profile: string): profile is PromptProfile {
  return VALID_PROMPT_PROFILES.includes(profile as PromptProfile);
}

/**
 * Get the prompts directory path
 */
function getPromptDir(): string {
  return process.env.FH_PROMPT_DIR || path.join(process.cwd(), "prompts");
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
  const promptDir = getPromptDir();
  const filePath = path.join(promptDir, `${profile}.prompt.md`);

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
      "system-seed",
    );

    // Activate it
    await activateConfig("prompt", profile, blob.contentHash, "system-seed", "initial-seed");

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

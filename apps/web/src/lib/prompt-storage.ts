/**
 * Prompt Version Storage
 *
 * SQLite-based storage for prompt versions with content-addressable hashing.
 * Tracks which prompt was used for each analysis job.
 *
 * @module prompt-storage
 * @version 2.6.41
 */

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROMPT_DB_CONFIG = {
  dbPath: process.env.FH_PROMPT_DB_PATH || "./prompt-versions.db",
};

// ============================================================================
// TYPES
// ============================================================================

export interface PromptVersionRow {
  content_hash: string;
  pipeline: string;
  version_label: string;
  content: string;
  is_active: number;
  usage_count: number;
  previous_hash: string | null;
  created_utc: string;
  activated_utc: string | null;
}

export interface PromptVersion {
  contentHash: string;
  pipeline: string;
  versionLabel: string;
  content: string;
  isActive: boolean;
  usageCount: number;
  previousHash: string | null;
  createdUtc: string;
  activatedUtc: string | null;
}

export interface PromptUsageRecord {
  jobId: string;
  pipeline: string;
  contentHash: string;
  loadedUtc: string;
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;

  const dbPath = path.resolve(PROMPT_DB_CONFIG.dbPath);
  console.log(`[Prompt-Storage] Opening database at ${dbPath}`);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable WAL mode for better concurrent access
  await db.exec("PRAGMA journal_mode=WAL");

  // Create tables if not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      content_hash TEXT PRIMARY KEY,
      pipeline TEXT NOT NULL,
      version_label TEXT NOT NULL,
      content TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      usage_count INTEGER NOT NULL DEFAULT 0,
      previous_hash TEXT,
      created_utc TEXT NOT NULL,
      activated_utc TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_prompt_versions_pipeline
      ON prompt_versions(pipeline);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_active
      ON prompt_versions(pipeline, is_active);

    CREATE TABLE IF NOT EXISTS prompt_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      pipeline TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      loaded_utc TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_prompt_usage_job
      ON prompt_usage(job_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_usage_hash
      ON prompt_usage(content_hash);
  `);

  return db;
}

// ============================================================================
// ROW MAPPING
// ============================================================================

function rowToPromptVersion(row: PromptVersionRow): PromptVersion {
  return {
    contentHash: row.content_hash,
    pipeline: row.pipeline,
    versionLabel: row.version_label,
    content: row.content,
    isActive: row.is_active === 1,
    usageCount: row.usage_count,
    previousHash: row.previous_hash,
    createdUtc: row.created_utc,
    activatedUtc: row.activated_utc,
  };
}

// ============================================================================
// PROMPT VERSION OPERATIONS
// ============================================================================

/**
 * Save a new prompt version and activate it.
 * Uses a transaction for atomicity.
 * Content-addressable: if hash already exists, just activates it.
 */
export async function savePromptVersion(
  pipeline: string,
  content: string,
  contentHash: string,
  versionLabel: string,
): Promise<PromptVersion> {
  const database = await getDb();
  const now = new Date().toISOString();

  // Run in transaction for atomicity
  await database.exec("BEGIN TRANSACTION");

  try {
    // Get current active version's hash
    const currentActive = await database.get<{ content_hash: string }>(
      "SELECT content_hash FROM prompt_versions WHERE pipeline = ? AND is_active = 1",
      [pipeline],
    );

    const previousHash = currentActive?.content_hash || null;

    // Check if this hash already exists
    const existing = await database.get<PromptVersionRow>(
      "SELECT * FROM prompt_versions WHERE content_hash = ?",
      [contentHash],
    );

    if (existing) {
      // Content already exists - just activate it
      await database.run(
        "UPDATE prompt_versions SET is_active = 0 WHERE pipeline = ? AND is_active = 1",
        [pipeline],
      );
      await database.run(
        "UPDATE prompt_versions SET is_active = 1, activated_utc = ? WHERE content_hash = ?",
        [now, contentHash],
      );
      await database.exec("COMMIT");
      return rowToPromptVersion({ ...existing, is_active: 1, activated_utc: now });
    }

    // Deactivate current version
    await database.run(
      "UPDATE prompt_versions SET is_active = 0 WHERE pipeline = ? AND is_active = 1",
      [pipeline],
    );

    // Insert new version
    await database.run(
      `INSERT INTO prompt_versions (content_hash, pipeline, version_label, content, is_active, usage_count, previous_hash, created_utc, activated_utc)
       VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)`,
      [contentHash, pipeline, versionLabel, content, previousHash, now, now],
    );

    await database.exec("COMMIT");

    return {
      contentHash,
      pipeline,
      versionLabel,
      content,
      isActive: true,
      usageCount: 0,
      previousHash,
      createdUtc: now,
      activatedUtc: now,
    };
  } catch (err) {
    await database.exec("ROLLBACK");
    throw err;
  }
}

/**
 * Get the currently active prompt version for a pipeline
 */
export async function getActivePromptVersion(
  pipeline: string,
): Promise<PromptVersion | null> {
  const database = await getDb();
  const row = await database.get<PromptVersionRow>(
    "SELECT * FROM prompt_versions WHERE pipeline = ? AND is_active = 1",
    [pipeline],
  );
  return row ? rowToPromptVersion(row) : null;
}

/**
 * Get a specific prompt version by content hash
 */
export async function getPromptVersionByHash(
  contentHash: string,
): Promise<PromptVersion | null> {
  const database = await getDb();
  const row = await database.get<PromptVersionRow>(
    "SELECT * FROM prompt_versions WHERE content_hash = ?",
    [contentHash],
  );
  return row ? rowToPromptVersion(row) : null;
}

/**
 * Get version history for a pipeline (most recent first)
 */
export async function getPromptVersionHistory(
  pipeline: string,
  limit = 20,
  offset = 0,
): Promise<{ versions: PromptVersion[]; total: number }> {
  const database = await getDb();

  const total = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM prompt_versions WHERE pipeline = ?",
    [pipeline],
  );

  const rows = await database.all<PromptVersionRow[]>(
    "SELECT * FROM prompt_versions WHERE pipeline = ? ORDER BY created_utc DESC LIMIT ? OFFSET ?",
    [pipeline, limit, offset],
  );

  return {
    versions: rows.map(rowToPromptVersion),
    total: total?.count ?? 0,
  };
}

/**
 * Rollback to a previous version (activate it)
 */
export async function rollbackToVersion(
  pipeline: string,
  contentHash: string,
): Promise<PromptVersion | null> {
  const database = await getDb();
  const now = new Date().toISOString();

  const target = await database.get<PromptVersionRow>(
    "SELECT * FROM prompt_versions WHERE content_hash = ? AND pipeline = ?",
    [contentHash, pipeline],
  );

  if (!target) return null;

  await database.exec("BEGIN TRANSACTION");
  try {
    await database.run(
      "UPDATE prompt_versions SET is_active = 0 WHERE pipeline = ? AND is_active = 1",
      [pipeline],
    );
    await database.run(
      "UPDATE prompt_versions SET is_active = 1, activated_utc = ? WHERE content_hash = ?",
      [now, contentHash],
    );
    await database.exec("COMMIT");

    return rowToPromptVersion({ ...target, is_active: 1, activated_utc: now });
  } catch (err) {
    await database.exec("ROLLBACK");
    throw err;
  }
}

/**
 * Increment usage count for a prompt version (called when prompt is used in analysis)
 */
export async function incrementUsageCount(contentHash: string): Promise<void> {
  const database = await getDb();
  await database.run(
    "UPDATE prompt_versions SET usage_count = usage_count + 1 WHERE content_hash = ?",
    [contentHash],
  );
}

// ============================================================================
// PROMPT USAGE TRACKING (per-job)
// ============================================================================

/**
 * Record that a specific prompt version was used for a job
 */
export async function recordPromptUsage(
  jobId: string,
  pipeline: string,
  contentHash: string,
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();

  await database.run(
    "INSERT INTO prompt_usage (job_id, pipeline, content_hash, loaded_utc) VALUES (?, ?, ?, ?)",
    [jobId, pipeline, contentHash, now],
  );

  // Also increment usage count
  await incrementUsageCount(contentHash);
}

/**
 * Get prompt usage info for a specific job
 */
export async function getPromptUsageForJob(
  jobId: string,
): Promise<PromptUsageRecord[]> {
  const database = await getDb();
  const rows = await database.all<Array<{
    job_id: string;
    pipeline: string;
    content_hash: string;
    loaded_utc: string;
  }>>(
    "SELECT job_id, pipeline, content_hash, loaded_utc FROM prompt_usage WHERE job_id = ? ORDER BY loaded_utc",
    [jobId],
  );

  return rows.map((row) => ({
    jobId: row.job_id,
    pipeline: row.pipeline,
    contentHash: row.content_hash,
    loadedUtc: row.loaded_utc,
  }));
}

/**
 * Get prompt content that was used for a specific job
 */
export async function getPromptContentForJob(
  jobId: string,
  pipeline: string,
): Promise<{ content: string; contentHash: string; loadedUtc: string } | null> {
  const database = await getDb();
  const usage = await database.get<{
    content_hash: string;
    loaded_utc: string;
  }>(
    "SELECT content_hash, loaded_utc FROM prompt_usage WHERE job_id = ? AND pipeline = ? ORDER BY loaded_utc DESC LIMIT 1",
    [jobId, pipeline],
  );

  if (!usage) return null;

  const version = await database.get<{ content: string }>(
    "SELECT content FROM prompt_versions WHERE content_hash = ?",
    [usage.content_hash],
  );

  if (!version) return null;

  return {
    content: version.content,
    contentHash: usage.content_hash,
    loadedUtc: usage.loaded_utc,
  };
}

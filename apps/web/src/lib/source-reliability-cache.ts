/**
 * FactHarbor Source Reliability Cache
 *
 * SQLite-based cache for source reliability scores.
 * Stores LLM-evaluated scores with TTL-based expiration.
 *
 * @module source-reliability-cache
 */

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import { DEFAULT_SR_CONFIG } from "./config-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SR_CACHE_CONFIG = {
  dbPath: process.env.FH_SR_CACHE_PATH || "./source-reliability.db",
  cacheTtlDays: DEFAULT_SR_CONFIG.cacheTtlDays,
};

export function setCacheTtlDays(days: number): void {
  if (Number.isFinite(days) && days > 0) {
    SR_CACHE_CONFIG.cacheTtlDays = Math.floor(days);
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface CachedScore {
  domain: string;
  score: number | null;
  confidence: number;
  evaluatedAt: string;
  expiresAt: string;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning?: string | null;
  category?: string | null;
  biasIndicator?: string | null;
  evidenceCited?: string | null; // JSON array stored as string
  evidencePack?: string | null; // JSON object stored as string (evidence-pack items+queries/providers)
  fallbackUsed?: boolean; // When consensus failed but primary (Claude) was used anyway
  fallbackReason?: string | null;
  identifiedEntity?: string | null; // The organization evaluated
}

interface ScoreRow {
  domain: string;
  score: number | null;
  confidence: number;
  evaluated_at: string;
  expires_at: string;
  model_primary: string;
  model_secondary: string | null;
  consensus_achieved: number;
  reasoning: string | null;
  category: string | null;
  bias_indicator: string | null;
  evidence_cited: string | null; // JSON array stored as string
  evidence_pack: string | null; // JSON object stored as string
  fallback_used: number;
  fallback_reason: string | null;
  identified_entity: string | null;
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;

  const dbPath = path.resolve(SR_CACHE_CONFIG.dbPath);
  console.log(`[SR-Cache] Opening database at ${dbPath}`);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create table if not exists
  // Note: score can be NULL for "insufficient_data" evaluations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS source_reliability (
      domain TEXT PRIMARY KEY,
      score REAL,
      confidence REAL NOT NULL,
      evaluated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      model_primary TEXT NOT NULL,
      model_secondary TEXT,
      consensus_achieved INTEGER NOT NULL DEFAULT 0,
      reasoning TEXT,
      category TEXT,
      bias_indicator TEXT,
      evidence_cited TEXT,
      evidence_pack TEXT,
      fallback_used INTEGER NOT NULL DEFAULT 0,
      fallback_reason TEXT,
      identified_entity TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_expires_at ON source_reliability(expires_at);
  `);

  // Migration: Add new columns and fix constraints for existing databases
  try {
    let tableInfo = await db.all<Array<{ name: string; notnull: number }>>(
      "PRAGMA table_info(source_reliability)"
    );

    // STEP 1: First add any missing columns (must happen BEFORE table recreation)
    const hasReasoning = tableInfo.some((col) => col.name === "reasoning");
    const hasCategory = tableInfo.some((col) => col.name === "category");
    const hasBiasIndicator = tableInfo.some((col) => col.name === "bias_indicator");
    const hasEvidenceCited = tableInfo.some((col) => col.name === "evidence_cited");
    const hasEvidencePack = tableInfo.some((col) => col.name === "evidence_pack");

    if (!hasReasoning) {
      console.log("[SR-Cache] Adding reasoning column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN reasoning TEXT");
    }
    if (!hasCategory) {
      console.log("[SR-Cache] Adding category column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN category TEXT");
    }
    if (!hasBiasIndicator) {
      console.log("[SR-Cache] Adding bias_indicator column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN bias_indicator TEXT");
    }
    if (!hasEvidenceCited) {
      console.log("[SR-Cache] Adding evidence_cited column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN evidence_cited TEXT");
    }
    if (!hasEvidencePack) {
      console.log("[SR-Cache] Adding evidence_pack column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN evidence_pack TEXT");
    }
    
    // Check for fallback columns (v2.6.36+)
    const hasFallbackUsed = tableInfo.some((col) => col.name === "fallback_used");
    const hasFallbackReason = tableInfo.some((col) => col.name === "fallback_reason");
    if (!hasFallbackUsed) {
      console.log("[SR-Cache] Adding fallback_used column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN fallback_used INTEGER NOT NULL DEFAULT 0");
    }
    if (!hasFallbackReason) {
      console.log("[SR-Cache] Adding fallback_reason column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN fallback_reason TEXT");
    }
    
    // Check for identified_entity column (v2.6.37+)
    const hasIdentifiedEntity = tableInfo.some((col) => col.name === "identified_entity");
    if (!hasIdentifiedEntity) {
      console.log("[SR-Cache] Adding identified_entity column");
      await db.exec("ALTER TABLE source_reliability ADD COLUMN identified_entity TEXT");
    }

    // STEP 2: Now check if score column has NOT NULL constraint (notnull=1)
    // Re-fetch tableInfo in case columns were added
    tableInfo = await db.all<Array<{ name: string; notnull: number }>>(
      "PRAGMA table_info(source_reliability)"
    );
    const scoreCol = tableInfo.find((col) => col.name === "score");
    if (scoreCol && scoreCol.notnull === 1) {
      // SQLite doesn't support ALTER TABLE to remove NOT NULL, so we need to recreate
      console.log("[SR-Cache] Migrating: score column has NOT NULL, recreating table to allow NULL scores");
      await db.exec(`
        -- Create new table with correct schema (score allows NULL)
        CREATE TABLE source_reliability_new (
          domain TEXT PRIMARY KEY,
          score REAL,
          confidence REAL NOT NULL,
          evaluated_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          model_primary TEXT NOT NULL,
          model_secondary TEXT,
          consensus_achieved INTEGER NOT NULL DEFAULT 0,
          reasoning TEXT,
          category TEXT,
          bias_indicator TEXT,
          evidence_cited TEXT,
          evidence_pack TEXT
        );

        -- Copy existing data (all columns now exist)
        INSERT INTO source_reliability_new
        SELECT domain, score, confidence, evaluated_at, expires_at, model_primary,
               model_secondary, consensus_achieved, reasoning, category, bias_indicator, evidence_cited, evidence_pack
        FROM source_reliability;

        -- Drop old table and rename
        DROP TABLE source_reliability;
        ALTER TABLE source_reliability_new RENAME TO source_reliability;

        -- Recreate index
        CREATE INDEX IF NOT EXISTS idx_expires_at ON source_reliability(expires_at);
      `);
      console.log("[SR-Cache] Migration complete: score column now allows NULL");
    }

    // STEP 3: Normalize category naming (idempotent)
    // We renamed the mid bands from "generally_*" to "leaning_*" for UI/prompt clarity.
    // Convert any existing cached rows so the admin UI and downstream consumers stay consistent.
    await db.exec(`
      UPDATE source_reliability
      SET category = 'leaning_reliable'
      WHERE category IN ('generally_reliable', 'Generally Reliable');

      UPDATE source_reliability
      SET category = 'leaning_unreliable'
      WHERE category IN ('generally_unreliable', 'Generally Unreliable');
    `);
  } catch (err) {
    console.error("[SR-Cache] Migration error:", err);
  }

  console.log(`[SR-Cache] Database initialized`);
  return db;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get a single cached score by domain
 */
export async function getCachedScore(domain: string): Promise<CachedScore | null> {
  const database = await getDb();
  const now = new Date().toISOString();

  const row = await database.get<ScoreRow>(
    `SELECT * FROM source_reliability WHERE domain = ? AND expires_at > ?`,
    [domain, now]
  );

  if (!row) return null;

  return {
    domain: row.domain,
    score: row.score,
    confidence: row.confidence,
    evaluatedAt: row.evaluated_at,
    expiresAt: row.expires_at,
    modelPrimary: row.model_primary,
    modelSecondary: row.model_secondary,
    consensusAchieved: row.consensus_achieved === 1,
    reasoning: row.reasoning,
    category: row.category,
    biasIndicator: row.bias_indicator,
    evidenceCited: row.evidence_cited,
    evidencePack: row.evidence_pack,
  };
}

/**
 * Full cached reliability data for a domain.
 */
export interface CachedReliabilityDataFromCache {
  score: number | null;
  confidence: number;
  consensusAchieved: boolean;
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
  identifiedEntity?: string | null;
}

/**
 * Batch get cached scores for multiple domains
 * Returns a Map of domain -> score (only for valid, non-expired entries)
 * @deprecated Use batchGetCachedData for full reliability data
 */
export async function batchGetCachedScores(
  domains: string[]
): Promise<Map<string, number | null>> {
  if (domains.length === 0) return new Map();

  const database = await getDb();
  const now = new Date().toISOString();
  const placeholders = domains.map(() => "?").join(",");

  const rows = await database.all<ScoreRow[]>(
    `SELECT domain, score FROM source_reliability
     WHERE domain IN (${placeholders}) AND expires_at > ?`,
    [...domains, now]
  );

  const result = new Map<string, number | null>();
  for (const row of rows) {
    result.set(row.domain, row.score);
  }

  return result;
}

/**
 * Batch lookup for multiple domains - returns full reliability data.
 * Returns a Map of domain -> CachedReliabilityDataFromCache (only for valid, non-expired entries)
 */
export async function batchGetCachedData(
  domains: string[]
): Promise<Map<string, CachedReliabilityDataFromCache>> {
  if (domains.length === 0) return new Map();

  const database = await getDb();
  const now = new Date().toISOString();
  const placeholders = domains.map(() => "?").join(",");

  const rows = await database.all<ScoreRow[]>(
    `SELECT domain, score, confidence, consensus_achieved, fallback_used, fallback_reason, identified_entity FROM source_reliability
     WHERE domain IN (${placeholders}) AND expires_at > ?`,
    [...domains, now]
  );

  const result = new Map<string, CachedReliabilityDataFromCache>();
  for (const row of rows) {
      result.set(row.domain, {
        score: row.score,
        confidence: row.confidence,
        consensusAchieved: row.consensus_achieved === 1,
        fallbackUsed: row.fallback_used === 1,
        fallbackReason: row.fallback_reason,
        identifiedEntity: row.identified_entity,
      });
  }

  return result;
}

/**
 * Save a score to the cache
 */
export async function setCachedScore(
  domain: string,
  score: number | null,
  confidence: number,
  modelPrimary: string,
  modelSecondary: string | null,
  consensusAchieved: boolean,
  reasoning?: string | null,
  category?: string | null,
  biasIndicator?: string | null,
  evidenceCited?: Array<{ claim: string; basis: string; recency?: string; evidenceId?: string; url?: string }> | null,
  evidencePack?: unknown | null,
  fallbackUsed?: boolean,
  fallbackReason?: string | null,
  identifiedEntity?: string | null
): Promise<void> {
  const database = await getDb();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SR_CACHE_CONFIG.cacheTtlDays * 24 * 60 * 60 * 1000
  );

  // Convert evidenceCited array to JSON string for storage
  const evidenceJson = evidenceCited && evidenceCited.length > 0
    ? JSON.stringify(evidenceCited)
    : null;

  const evidencePackJson = evidencePack ? JSON.stringify(evidencePack) : null;

  await database.run(
    `INSERT OR REPLACE INTO source_reliability
     (domain, score, confidence, evaluated_at, expires_at, model_primary, model_secondary, consensus_achieved, reasoning, category, bias_indicator, evidence_cited, evidence_pack, fallback_used, fallback_reason, identified_entity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      domain,
      score,
      confidence,
      now.toISOString(),
      expiresAt.toISOString(),
      modelPrimary,
      modelSecondary,
      consensusAchieved ? 1 : 0,
      reasoning ?? null,
      category ?? null,
      biasIndicator ?? null,
      evidenceJson,
      evidencePackJson,
      fallbackUsed ? 1 : 0,
      fallbackReason ?? null,
      identifiedEntity ?? null,
    ]
  );
}

/**
 * Clean up expired entries
 */
export async function cleanupExpired(): Promise<number> {
  const database = await getDb();
  const now = new Date().toISOString();

  const result = await database.run(
    `DELETE FROM source_reliability WHERE expires_at <= ?`,
    [now]
  );

  return result.changes ?? 0;
}

/**
 * Delete a specific domain from the cache
 */
export async function deleteCachedScore(domain: string): Promise<boolean> {
  const database = await getDb();

  const result = await database.run(
    `DELETE FROM source_reliability WHERE domain = ?`,
    [domain]
  );

  return (result.changes ?? 0) > 0;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  avgScore: number;
  avgConfidence: number;
}> {
  const database = await getDb();
  const now = new Date().toISOString();

  const stats = await database.get<{
    total: number;
    expired: number;
    avg_score: number;
    avg_confidence: number;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired,
      AVG(score) as avg_score,
      AVG(confidence) as avg_confidence
    FROM source_reliability
  `, [now]);

  return {
    totalEntries: stats?.total ?? 0,
    expiredEntries: stats?.expired ?? 0,
    avgScore: stats?.avg_score ?? 0,
    avgConfidence: stats?.avg_confidence ?? 0,
  };
}

/**
 * Get all cached scores with pagination (for admin view)
 */
export async function getAllCachedScores(options: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: string;
  search?: string;
}): Promise<{
  entries: CachedScore[];
  total: number;
  limit: number;
  offset: number;
}> {
  const database = await getDb();
  const now = new Date().toISOString();

  // Validate sort column to prevent SQL injection
  const validSortColumns = ["domain", "score", "confidence", "evaluated_at", "expires_at"];
  const sortColumn = validSortColumns.includes(options.sortBy) ? options.sortBy : "evaluated_at";
  const sortDir = options.sortOrder === "asc" ? "ASC" : "DESC";

  // Build search condition if provided
  const searchTerm = options.search?.trim().toLowerCase();
  const hasSearch = searchTerm && searchTerm.length > 0;
  const searchPattern = hasSearch ? `%${searchTerm}%` : null;

  // Get total count (with optional search filter)
  const countQuery = hasSearch
    ? `SELECT COUNT(*) as count FROM source_reliability WHERE expires_at > ? AND (LOWER(domain) LIKE ? OR LOWER(identified_entity) LIKE ?)`
    : `SELECT COUNT(*) as count FROM source_reliability WHERE expires_at > ?`;
  const countParams = hasSearch ? [now, searchPattern, searchPattern] : [now];
  const countResult = await database.get<{ count: number }>(countQuery, countParams);
  const total = countResult?.count ?? 0;

  // Get paginated results (with optional search filter)
  const dataQuery = hasSearch
    ? `SELECT * FROM source_reliability
       WHERE expires_at > ? AND (LOWER(domain) LIKE ? OR LOWER(identified_entity) LIKE ?)
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT ? OFFSET ?`
    : `SELECT * FROM source_reliability
       WHERE expires_at > ?
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT ? OFFSET ?`;
  const dataParams = hasSearch
    ? [now, searchPattern, searchPattern, options.limit, options.offset]
    : [now, options.limit, options.offset];
  const rows = await database.all<ScoreRow[]>(dataQuery, dataParams);

  const entries: CachedScore[] = rows.map((row) => ({
    domain: row.domain,
    score: row.score,
    confidence: row.confidence,
    evaluatedAt: row.evaluated_at,
    expiresAt: row.expires_at,
    modelPrimary: row.model_primary,
    modelSecondary: row.model_secondary,
    consensusAchieved: row.consensus_achieved === 1,
    reasoning: row.reasoning,
    category: row.category,
    biasIndicator: row.bias_indicator,
    evidenceCited: row.evidence_cited,
    evidencePack: row.evidence_pack,
    fallbackUsed: row.fallback_used === 1,
    fallbackReason: row.fallback_reason,
    identifiedEntity: row.identified_entity,
  }));

  return {
    entries,
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

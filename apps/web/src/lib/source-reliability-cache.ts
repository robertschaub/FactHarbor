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

// ============================================================================
// CONFIGURATION
// ============================================================================

const SR_CACHE_CONFIG = {
  dbPath: process.env.FH_SR_CACHE_PATH || "./source-reliability.db",
  cacheTtlDays: parseInt(process.env.FH_SR_CACHE_TTL_DAYS || "90", 10),
};

// ============================================================================
// TYPES
// ============================================================================

export interface CachedScore {
  domain: string;
  score: number;
  confidence: number;
  evaluatedAt: string;
  expiresAt: string;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning?: string | null;
  category?: string | null;
  biasIndicator?: string | null;
}

interface ScoreRow {
  domain: string;
  score: number;
  confidence: number;
  evaluated_at: string;
  expires_at: string;
  model_primary: string;
  model_secondary: string | null;
  consensus_achieved: number;
  reasoning: string | null;
  category: string | null;
  bias_indicator: string | null;
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
  await db.exec(`
    CREATE TABLE IF NOT EXISTS source_reliability (
      domain TEXT PRIMARY KEY,
      score REAL NOT NULL,
      confidence REAL NOT NULL,
      evaluated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      model_primary TEXT NOT NULL,
      model_secondary TEXT,
      consensus_achieved INTEGER NOT NULL DEFAULT 0,
      reasoning TEXT,
      category TEXT,
      bias_indicator TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_expires_at ON source_reliability(expires_at);
  `);

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
  };
}

/**
 * Full cached reliability data for a domain.
 */
export interface CachedReliabilityDataFromCache {
  score: number;
  confidence: number;
  consensusAchieved: boolean;
}

/**
 * Batch get cached scores for multiple domains
 * Returns a Map of domain -> score (only for valid, non-expired entries)
 * @deprecated Use batchGetCachedData for full reliability data
 */
export async function batchGetCachedScores(
  domains: string[]
): Promise<Map<string, number>> {
  if (domains.length === 0) return new Map();

  const database = await getDb();
  const now = new Date().toISOString();
  const placeholders = domains.map(() => "?").join(",");

  const rows = await database.all<ScoreRow[]>(
    `SELECT domain, score FROM source_reliability 
     WHERE domain IN (${placeholders}) AND expires_at > ?`,
    [...domains, now]
  );

  const result = new Map<string, number>();
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
    `SELECT domain, score, confidence, consensus_achieved FROM source_reliability 
     WHERE domain IN (${placeholders}) AND expires_at > ?`,
    [...domains, now]
  );

  const result = new Map<string, CachedReliabilityDataFromCache>();
  for (const row of rows) {
    result.set(row.domain, {
      score: row.score,
      confidence: row.confidence,
      consensusAchieved: row.consensus_achieved === 1,
    });
  }

  return result;
}

/**
 * Save a score to the cache
 */
export async function setCachedScore(
  domain: string,
  score: number,
  confidence: number,
  modelPrimary: string,
  modelSecondary: string | null,
  consensusAchieved: boolean,
  reasoning?: string | null,
  category?: string | null,
  biasIndicator?: string | null
): Promise<void> {
  const database = await getDb();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SR_CACHE_CONFIG.cacheTtlDays * 24 * 60 * 60 * 1000
  );

  await database.run(
    `INSERT OR REPLACE INTO source_reliability 
     (domain, score, confidence, evaluated_at, expires_at, model_primary, model_secondary, consensus_achieved, reasoning, category, bias_indicator)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  // Get total count
  const countResult = await database.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM source_reliability WHERE expires_at > ?`,
    [now]
  );
  const total = countResult?.count ?? 0;

  // Get paginated results
  const rows = await database.all<ScoreRow[]>(
    `SELECT * FROM source_reliability 
     WHERE expires_at > ?
     ORDER BY ${sortColumn} ${sortDir}
     LIMIT ? OFFSET ?`,
    [now, options.limit, options.offset]
  );

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

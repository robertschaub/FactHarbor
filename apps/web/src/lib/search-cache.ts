/**
 * FactHarbor Search Cache
 *
 * SQLite-based cache for web search results.
 * Stores search results with TTL-based expiration to reduce API quota usage.
 *
 * Cache Key: hash(query + maxResults + dateRestrict + domainFilters)
 *
 * @module search-cache
 */

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import crypto from "crypto";
import type { WebSearchOptions, WebSearchResult } from "./web-search";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEARCH_CACHE_CONFIG = {
  dbPath: process.env.FH_SEARCH_CACHE_PATH || "./search-cache.db",
  cacheTtlDays: parseInt(process.env.FH_SEARCH_CACHE_TTL_DAYS || "7", 10),
  enabled: process.env.FH_SEARCH_CACHE_ENABLED !== "false", // Enabled by default
};

export function setSearchCacheTtlDays(days: number): void {
  if (Number.isFinite(days) && days > 0) {
    SEARCH_CACHE_CONFIG.cacheTtlDays = Math.floor(days);
  }
}

export function setSearchCacheEnabled(enabled: boolean): void {
  SEARCH_CACHE_CONFIG.enabled = enabled;
}

// ============================================================================
// TYPES
// ============================================================================

export interface CachedSearchResult {
  cacheKey: string;
  queryText: string;
  maxResults: number;
  dateRestrict: string | null;
  domainWhitelist: string[] | null;
  domainBlacklist: string[] | null;
  results: WebSearchResult[];
  provider: string;
  cachedAt: string;
  expiresAt: string;
}

interface SearchCacheRow {
  cache_key: string;
  query_text: string;
  max_results: number;
  date_restrict: string | null;
  domain_whitelist: string | null; // JSON
  domain_blacklist: string | null; // JSON
  results_json: string; // JSON
  provider: string;
  cached_at: string;
  expires_at: string;
}

// ============================================================================
// DATABASE SETUP
// ============================================================================

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = (async () => {
      const dbPath = path.resolve(SEARCH_CACHE_CONFIG.dbPath);
      console.log(`[Search-Cache] Opening database at ${dbPath}`);

      const instance = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Enable WAL mode for better concurrent access
      await instance.exec("PRAGMA journal_mode=WAL");

      // Create table if not exists
      await instance.exec(`
        CREATE TABLE IF NOT EXISTS search_cache (
          cache_key TEXT PRIMARY KEY,
          query_text TEXT NOT NULL,
          max_results INTEGER NOT NULL,
          date_restrict TEXT,
          domain_whitelist TEXT,
          domain_blacklist TEXT,
          results_json TEXT NOT NULL,
          provider TEXT NOT NULL,
          cached_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_search_cache_query ON search_cache(query_text);
        CREATE INDEX IF NOT EXISTS idx_search_cache_cached_at ON search_cache(cached_at);
      `);

      console.log("[Search-Cache] Database initialized");
      db = instance;
      return instance;
    })();
  }
  return dbPromise;
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * Generate deterministic cache key from search options.
 * Key includes query, maxResults, dateRestrict, and domain filters.
 */
export function generateCacheKey(options: WebSearchOptions): string {
  const parts = [
    options.query.trim().toLowerCase(),
    options.maxResults.toString(),
    options.dateRestrict || "",
    JSON.stringify((options.domainWhitelist || []).sort()),
    JSON.stringify((options.domainBlacklist || []).sort()),
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get cached search results if valid (not expired).
 * Returns null if cache miss or expired.
 */
export async function getCachedSearchResults(
  options: WebSearchOptions,
): Promise<CachedSearchResult | null> {
  if (!SEARCH_CACHE_CONFIG.enabled) {
    return null;
  }

  try {
    const database = await getDb();
    const cacheKey = generateCacheKey(options);
    const now = new Date().toISOString();

    const row = await database.get<SearchCacheRow>(
      `SELECT * FROM search_cache
       WHERE cache_key = ? AND expires_at > ?`,
      [cacheKey, now],
    );

    if (!row) {
      return null;
    }

    // Parse JSON fields
    const results = JSON.parse(row.results_json) as WebSearchResult[];
    const domainWhitelist = row.domain_whitelist ? JSON.parse(row.domain_whitelist) : null;
    const domainBlacklist = row.domain_blacklist ? JSON.parse(row.domain_blacklist) : null;

    console.log(
      `[Search-Cache] ✅ Cache HIT for query "${options.query.substring(0, 50)}..." (${results.length} results, provider: ${row.provider}, age: ${Math.round((Date.now() - new Date(row.cached_at).getTime()) / 3600000)}h)`,
    );

    return {
      cacheKey,
      queryText: row.query_text,
      maxResults: row.max_results,
      dateRestrict: row.date_restrict,
      domainWhitelist,
      domainBlacklist,
      results,
      provider: row.provider,
      cachedAt: row.cached_at,
      expiresAt: row.expires_at,
    };
  } catch (err) {
    console.error("[Search-Cache] Error reading cache:", err);
    return null;
  }
}

/**
 * Cache search results with TTL expiration.
 */
export async function cacheSearchResults(
  options: WebSearchOptions,
  results: WebSearchResult[],
  provider: string,
): Promise<void> {
  if (!SEARCH_CACHE_CONFIG.enabled) {
    return;
  }

  try {
    const database = await getDb();
    const cacheKey = generateCacheKey(options);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SEARCH_CACHE_CONFIG.cacheTtlDays * 24 * 60 * 60 * 1000);

    await database.run(
      `INSERT OR REPLACE INTO search_cache
       (cache_key, query_text, max_results, date_restrict, domain_whitelist, domain_blacklist, results_json, provider, cached_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cacheKey,
        options.query,
        options.maxResults,
        options.dateRestrict || null,
        options.domainWhitelist ? JSON.stringify(options.domainWhitelist) : null,
        options.domainBlacklist ? JSON.stringify(options.domainBlacklist) : null,
        JSON.stringify(results),
        provider,
        now.toISOString(),
        expiresAt.toISOString(),
      ],
    );

    console.log(
      `[Search-Cache] ✅ Cached ${results.length} results for query "${options.query.substring(0, 50)}..." (provider: ${provider}, TTL: ${SEARCH_CACHE_CONFIG.cacheTtlDays}d)`,
    );
  } catch (err) {
    console.error("[Search-Cache] Error writing cache:", err);
  }
}

// ============================================================================
// CACHE MAINTENANCE
// ============================================================================

/**
 * Clean up expired cache entries.
 * Returns number of entries deleted.
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const database = await getDb();
    const now = new Date().toISOString();

    const result = await database.run(
      "DELETE FROM search_cache WHERE expires_at <= ?",
      [now],
    );

    const deleted = result.changes ?? 0;
    if (deleted > 0) {
      console.log(`[Search-Cache] Cleaned up ${deleted} expired entries`);
    }
    return deleted;
  } catch (err) {
    console.error("[Search-Cache] Error cleaning up cache:", err);
    return 0;
  }
}

/**
 * Clear all cache entries (for testing or reset).
 */
export async function clearAllCache(): Promise<number> {
  try {
    const database = await getDb();
    const result = await database.run("DELETE FROM search_cache");
    const deleted = result.changes ?? 0;
    console.log(`[Search-Cache] Cleared ${deleted} cache entries`);
    return deleted;
  } catch (err) {
    console.error("[Search-Cache] Error clearing cache:", err);
    return 0;
  }
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

export interface SearchCacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalQueries: number;
  providerBreakdown: Record<string, number>;
  oldestEntry: string | null;
  newestEntry: string | null;
  dbSizeBytes: number | null;
}

/**
 * Get cache statistics for monitoring/debugging.
 */
export async function getCacheStats(): Promise<SearchCacheStats> {
  try {
    const database = await getDb();
    const now = new Date().toISOString();

    // Total entries
    const totalRow = await database.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM search_cache",
    );
    const totalEntries = totalRow?.count ?? 0;

    // Valid (non-expired) entries
    const validRow = await database.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM search_cache WHERE expires_at > ?",
      [now],
    );
    const validEntries = validRow?.count ?? 0;

    const expiredEntries = totalEntries - validEntries;

    // Unique queries
    const uniqueQueriesRow = await database.get<{ count: number }>(
      "SELECT COUNT(DISTINCT query_text) as count FROM search_cache WHERE expires_at > ?",
      [now],
    );
    const totalQueries = uniqueQueriesRow?.count ?? 0;

    // Provider breakdown
    const providerRows = await database.all<Array<{ provider: string; count: number }>>(
      "SELECT provider, COUNT(*) as count FROM search_cache WHERE expires_at > ? GROUP BY provider",
      [now],
    );
    const providerBreakdown: Record<string, number> = {};
    for (const row of providerRows) {
      providerBreakdown[row.provider] = row.count;
    }

    // Oldest and newest entries
    const oldestRow = await database.get<{ cached_at: string }>(
      "SELECT cached_at FROM search_cache WHERE expires_at > ? ORDER BY cached_at ASC LIMIT 1",
      [now],
    );
    const newestRow = await database.get<{ cached_at: string }>(
      "SELECT cached_at FROM search_cache ORDER BY cached_at DESC LIMIT 1",
    );

    // Database size (approximate)
    let dbSizeBytes: number | null = null;
    try {
      const fs = await import("fs");
      const stats = fs.statSync(SEARCH_CACHE_CONFIG.dbPath);
      dbSizeBytes = stats.size;
    } catch {
      // Ignore if file doesn't exist yet
    }

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      totalQueries,
      providerBreakdown,
      oldestEntry: oldestRow?.cached_at ?? null,
      newestEntry: newestRow?.cached_at ?? null,
      dbSizeBytes,
    };
  } catch (err) {
    console.error("[Search-Cache] Error getting stats:", err);
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalQueries: 0,
      providerBreakdown: {},
      oldestEntry: null,
      newestEntry: null,
      dbSizeBytes: null,
    };
  }
}

/**
 * Close database connection (for cleanup).
 */
export async function closeSearchCacheDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log("[Search-Cache] Database closed");
  }
}

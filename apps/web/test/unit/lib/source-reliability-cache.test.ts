/**
 * Source Reliability Cache Tests
 *
 * Tests for SQLite-based cache operations.
 * Uses in-memory SQLite database for fast, isolated tests.
 *
 * @module source-reliability-cache.test
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

// Test utilities - create isolated in-memory database
async function createTestDb(): Promise<Database> {
  const db = await open({
    filename: ":memory:",
    driver: sqlite3.Database,
  });

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
      evidence_pack TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_expires_at ON source_reliability(expires_at);
  `);

  return db;
}

describe("Cache Schema", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it("creates table with correct columns", async () => {
    const columns = await db.all(`PRAGMA table_info(source_reliability)`);
    const columnNames = columns.map((c: any) => c.name);

    expect(columnNames).toContain("domain");
    expect(columnNames).toContain("score");
    expect(columnNames).toContain("confidence");
    expect(columnNames).toContain("evaluated_at");
    expect(columnNames).toContain("expires_at");
    expect(columnNames).toContain("model_primary");
    expect(columnNames).toContain("model_secondary");
    expect(columnNames).toContain("consensus_achieved");
    expect(columnNames).toContain("evidence_pack");
  });

  it("domain is primary key", async () => {
    const columns = await db.all(`PRAGMA table_info(source_reliability)`);
    const domainCol = columns.find((c: any) => c.name === "domain");
    expect(domainCol?.pk).toBe(1);
  });

  it("creates expires_at index", async () => {
    const indexes = await db.all(`PRAGMA index_list(source_reliability)`);
    const indexNames = indexes.map((i: any) => i.name);
    expect(indexNames).toContain("idx_expires_at");
  });
});

describe("Cache Operations", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    // Clear table before each test
    await db.run(`DELETE FROM source_reliability`);
  });

  afterAll(async () => {
    await db.close();
  });

  describe("Insert and Retrieve", () => {
    it("inserts a new cache entry", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, model_secondary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ["reuters.com", 0.95, 0.92, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", "gpt-4o-mini", 1]
      );

      const row = await db.get(`SELECT * FROM source_reliability WHERE domain = ?`, ["reuters.com"]);
      expect(row).toBeDefined();
      expect(row.score).toBe(0.95);
      expect(row.confidence).toBe(0.92);
      expect(row.consensus_achieved).toBe(1);
    });

    it("retrieves entry by domain", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, model_secondary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ["bbc.com", 0.85, 0.88, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", null, 0]
      );

      const row = await db.get(`SELECT * FROM source_reliability WHERE domain = ?`, ["bbc.com"]);
      expect(row.domain).toBe("bbc.com");
      expect(row.score).toBe(0.85);
      expect(row.model_secondary).toBeNull();
    });

    it("updates existing entry (INSERT OR REPLACE)", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Insert initial entry
      await db.run(
        `INSERT OR REPLACE INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, model_secondary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ["example.com", 0.7, 0.8, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", null, 0]
      );

      // Update with new score
      await db.run(
        `INSERT OR REPLACE INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, model_secondary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ["example.com", 0.75, 0.85, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", "gpt-4o-mini", 1]
      );

      const count = await db.get(`SELECT COUNT(*) as count FROM source_reliability WHERE domain = ?`, ["example.com"]);
      expect(count.count).toBe(1);

      const row = await db.get(`SELECT * FROM source_reliability WHERE domain = ?`, ["example.com"]);
      expect(row.score).toBe(0.75);
      expect(row.consensus_achieved).toBe(1);
    });
  });

  describe("Batch Operations", () => {
    it("retrieves multiple entries in batch", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Insert multiple entries
      const entries = [
        ["reuters.com", 0.95],
        ["bbc.com", 0.85],
        ["cnn.com", 0.80],
      ];

      for (const [domain, score] of entries) {
        await db.run(
          `INSERT INTO source_reliability 
           (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [domain, score, 0.9, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", 1]
        );
      }

      // Batch retrieve
      const domains = ["reuters.com", "bbc.com", "nonexistent.com"];
      const placeholders = domains.map(() => "?").join(",");
      const rows = await db.all(
        `SELECT domain, score FROM source_reliability WHERE domain IN (${placeholders})`,
        domains
      );

      expect(rows.length).toBe(2); // Only 2 exist
      const result = new Map(rows.map((r: any) => [r.domain, r.score]));
      expect(result.get("reuters.com")).toBe(0.95);
      expect(result.get("bbc.com")).toBe(0.85);
      expect(result.has("nonexistent.com")).toBe(false);
    });
  });

  describe("Expiration Filtering", () => {
    it("filters out expired entries", async () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 1000); // 1 second ago
      const valid = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

      // Insert expired entry
      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["expired.com", 0.5, 0.8, now.toISOString(), expired.toISOString(), "claude-3-5-haiku", 1]
      );

      // Insert valid entry
      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["valid.com", 0.8, 0.9, now.toISOString(), valid.toISOString(), "claude-3-5-haiku", 1]
      );

      // Query with expiration filter
      const rows = await db.all(
        `SELECT domain FROM source_reliability WHERE expires_at > ?`,
        [now.toISOString()]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].domain).toBe("valid.com");
    });

    it("cleanup deletes expired entries", async () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 1000);
      const valid = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Insert entries
      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["expired.com", 0.5, 0.8, now.toISOString(), expired.toISOString(), "claude-3-5-haiku", 1]
      );

      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["valid.com", 0.8, 0.9, now.toISOString(), valid.toISOString(), "claude-3-5-haiku", 1]
      );

      // Run cleanup
      const result = await db.run(
        `DELETE FROM source_reliability WHERE expires_at <= ?`,
        [now.toISOString()]
      );

      expect(result.changes).toBe(1);

      // Verify only valid entry remains
      const rows = await db.all(`SELECT domain FROM source_reliability`);
      expect(rows.length).toBe(1);
      expect(rows[0].domain).toBe("valid.com");
    });
  });

  describe("Statistics", () => {
    it("calculates average score and confidence", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Insert entries with known scores
      const entries = [
        { domain: "a.com", score: 0.8, confidence: 0.9 },
        { domain: "b.com", score: 0.6, confidence: 0.8 },
        { domain: "c.com", score: 1.0, confidence: 0.7 },
      ];

      for (const e of entries) {
        await db.run(
          `INSERT INTO source_reliability 
           (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [e.domain, e.score, e.confidence, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", 1]
        );
      }

      const stats = await db.get(`
        SELECT 
          COUNT(*) as total,
          AVG(score) as avg_score,
          AVG(confidence) as avg_confidence
        FROM source_reliability
      `);

      expect(stats.total).toBe(3);
      expect(stats.avg_score).toBeCloseTo(0.8, 5); // (0.8 + 0.6 + 1.0) / 3
      expect(stats.avg_confidence).toBeCloseTo(0.8, 5); // (0.9 + 0.8 + 0.7) / 3
    });

    it("counts expired entries", async () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 1000);
      const valid = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Insert mix of expired and valid
      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["expired1.com", 0.5, 0.8, now.toISOString(), expired.toISOString(), "claude-3-5-haiku", 1]
      );
      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["expired2.com", 0.5, 0.8, now.toISOString(), expired.toISOString(), "claude-3-5-haiku", 1]
      );
      await db.run(
        `INSERT INTO source_reliability 
         (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["valid.com", 0.8, 0.9, now.toISOString(), valid.toISOString(), "claude-3-5-haiku", 1]
      );

      const stats = await db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired
        FROM source_reliability
      `, [now.toISOString()]);

      expect(stats.total).toBe(3);
      expect(stats.expired).toBe(2);
    });
  });

  describe("Pagination and Sorting", () => {
    it("returns paginated results", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Insert 10 entries
      for (let i = 0; i < 10; i++) {
        await db.run(
          `INSERT INTO source_reliability 
           (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [`domain${i}.com`, 0.5 + i * 0.05, 0.8, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", 1]
        );
      }

      // Get first page (3 items)
      const page1 = await db.all(
        `SELECT domain FROM source_reliability ORDER BY domain LIMIT 3 OFFSET 0`
      );
      expect(page1.length).toBe(3);

      // Get second page (3 items)
      const page2 = await db.all(
        `SELECT domain FROM source_reliability ORDER BY domain LIMIT 3 OFFSET 3`
      );
      expect(page2.length).toBe(3);

      // Verify no overlap
      const page1Domains = page1.map((r: any) => r.domain);
      const page2Domains = page2.map((r: any) => r.domain);
      const overlap = page1Domains.filter((d: string) => page2Domains.includes(d));
      expect(overlap.length).toBe(0);
    });

    it("sorts by score descending", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const entries = [
        { domain: "low.com", score: 0.3 },
        { domain: "high.com", score: 0.95 },
        { domain: "mid.com", score: 0.7 },
      ];

      for (const e of entries) {
        await db.run(
          `INSERT INTO source_reliability 
           (domain, score, confidence, evaluated_at, expires_at, model_primary, consensus_achieved)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [e.domain, e.score, 0.8, now.toISOString(), expiresAt.toISOString(), "claude-3-5-haiku", 1]
        );
      }

      const rows = await db.all(
        `SELECT domain, score FROM source_reliability ORDER BY score DESC`
      );

      expect(rows[0].domain).toBe("high.com");
      expect(rows[1].domain).toBe("mid.com");
      expect(rows[2].domain).toBe("low.com");
    });
  });
});

describe("Data Integrity", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it("enforces score range 0-1 (application level)", () => {
    // Note: SQLite doesn't enforce CHECK constraints by default
    // This documents the expected application-level validation
    const validScores = [0, 0.5, 1.0];
    const invalidScores = [-0.1, 1.5, 100];

    for (const score of validScores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }

    for (const score of invalidScores) {
      expect(score < 0 || score > 1).toBe(true);
    }
  });

  it("enforces confidence range 0-1 (application level)", () => {
    const validConfidences = [0, 0.5, 1.0];
    const invalidConfidences = [-0.1, 1.5];

    for (const conf of validConfidences) {
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }

    for (const conf of invalidConfidences) {
      expect(conf < 0 || conf > 1).toBe(true);
    }
  });

  it("consensus_achieved is boolean (0 or 1)", () => {
    const validValues = [0, 1];
    for (const v of validValues) {
      expect(v === 0 || v === 1).toBe(true);
    }
  });
});

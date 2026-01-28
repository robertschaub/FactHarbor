/**
 * Config Storage Tests
 *
 * Tests for SQLite-based unified configuration management.
 * Uses in-memory SQLite database for fast, isolated tests.
 *
 * @module config-storage.test
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

describe("Config Storage Schema", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it("creates config_blobs table with correct columns", async () => {
    const columns = await db.all(`PRAGMA table_info(config_blobs)`);
    const columnNames = columns.map((c: any) => c.name);

    expect(columnNames).toContain("content_hash");
    expect(columnNames).toContain("config_type");
    expect(columnNames).toContain("profile_key");
    expect(columnNames).toContain("schema_version");
    expect(columnNames).toContain("version_label");
    expect(columnNames).toContain("content");
    expect(columnNames).toContain("created_utc");
    expect(columnNames).toContain("created_by");
  });

  it("config_blobs has content_hash as primary key", async () => {
    const columns = await db.all(`PRAGMA table_info(config_blobs)`);
    const hashCol = columns.find((c: any) => c.name === "content_hash");
    expect(hashCol?.pk).toBe(1);
  });

  it("creates config_active table with correct columns", async () => {
    const columns = await db.all(`PRAGMA table_info(config_active)`);
    const columnNames = columns.map((c: any) => c.name);

    expect(columnNames).toContain("config_type");
    expect(columnNames).toContain("profile_key");
    expect(columnNames).toContain("active_hash");
    expect(columnNames).toContain("activated_utc");
    expect(columnNames).toContain("activated_by");
    expect(columnNames).toContain("activation_reason");
  });

  it("config_active has composite primary key", async () => {
    const columns = await db.all(`PRAGMA table_info(config_active)`);
    const pkCols = columns.filter((c: any) => c.pk > 0);
    expect(pkCols.length).toBe(2);
    expect(pkCols.map((c: any) => c.name)).toContain("config_type");
    expect(pkCols.map((c: any) => c.name)).toContain("profile_key");
  });

  it("creates config_usage table with correct columns", async () => {
    const columns = await db.all(`PRAGMA table_info(config_usage)`);
    const columnNames = columns.map((c: any) => c.name);

    expect(columnNames).toContain("id");
    expect(columnNames).toContain("job_id");
    expect(columnNames).toContain("config_type");
    expect(columnNames).toContain("profile_key");
    expect(columnNames).toContain("content_hash");
    expect(columnNames).toContain("effective_overrides");
    expect(columnNames).toContain("loaded_utc");
  });

  it("creates required indexes", async () => {
    const blobIndexes = await db.all(`PRAGMA index_list(config_blobs)`);
    const usageIndexes = await db.all(`PRAGMA index_list(config_usage)`);

    const blobIndexNames = blobIndexes.map((i: any) => i.name);
    const usageIndexNames = usageIndexes.map((i: any) => i.name);

    expect(blobIndexNames).toContain("idx_config_blobs_type_profile");
    expect(blobIndexNames).toContain("idx_config_blobs_created");
    expect(usageIndexNames).toContain("idx_config_usage_job");
    expect(usageIndexNames).toContain("idx_config_usage_hash");
  });
});

describe("Config Blob Operations", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.run(`DELETE FROM config_usage`);
    await db.run(`DELETE FROM config_active`);
    await db.run(`DELETE FROM config_blobs`);
  });

  afterAll(async () => {
    await db.close();
  });

  describe("Insert and Retrieve", () => {
    it("inserts a new config blob", async () => {
      const now = new Date().toISOString();
      const contentHash = "abc123hash";
      const content = JSON.stringify({ enabled: true, provider: "serpapi" });

      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [contentHash, "search", "default", "1.0.0", "v1.0", content, now, "admin"],
      );

      const row = await db.get(`SELECT * FROM config_blobs WHERE content_hash = ?`, [contentHash]);
      expect(row).toBeDefined();
      expect(row.config_type).toBe("search");
      expect(row.profile_key).toBe("default");
      expect(row.content).toBe(content);
    });

    it("retrieves config by type and profile", async () => {
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ["hash1", "search", "default", "1.0.0", "v1.0", '{"enabled":true}', now, null],
      );

      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ["hash2", "calculation", "default", "1.0.0", "v1.0", '{"aggregation":{}}', now, null],
      );

      const rows = await db.all(
        `SELECT * FROM config_blobs WHERE config_type = ? AND profile_key = ?`,
        ["search", "default"],
      );

      expect(rows.length).toBe(1);
      expect(rows[0].content_hash).toBe("hash1");
    });

    it("prevents duplicate content hashes", async () => {
      const now = new Date().toISOString();
      const contentHash = "duplicate-hash";

      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [contentHash, "search", "default", "1.0.0", "v1.0", '{"enabled":true}', now, null],
      );

      // Attempt to insert same hash should fail
      await expect(
        db.run(
          `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [contentHash, "search", "default", "1.0.0", "v2.0", '{"enabled":false}', now, null],
        ),
      ).rejects.toThrow();
    });
  });
});

describe("Config Active Operations", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.run(`DELETE FROM config_usage`);
    await db.run(`DELETE FROM config_active`);
    await db.run(`DELETE FROM config_blobs`);
  });

  afterAll(async () => {
    await db.close();
  });

  it("activates a config version", async () => {
    const now = new Date().toISOString();
    const contentHash = "active-hash";

    // Insert blob first
    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [contentHash, "search", "default", "1.0.0", "v1.0", '{"enabled":true}', now, null],
    );

    // Activate
    await db.run(
      `INSERT OR REPLACE INTO config_active (config_type, profile_key, active_hash, activated_utc, activated_by, activation_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["search", "default", contentHash, now, "admin", "Initial activation"],
    );

    const active = await db.get(
      `SELECT * FROM config_active WHERE config_type = ? AND profile_key = ?`,
      ["search", "default"],
    );

    expect(active).toBeDefined();
    expect(active.active_hash).toBe(contentHash);
    expect(active.activation_reason).toBe("Initial activation");
  });

  it("switches active version", async () => {
    const now = new Date().toISOString();

    // Insert two versions
    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ["hash-v1", "search", "default", "1.0.0", "v1.0", '{"enabled":true}', now, null],
    );
    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ["hash-v2", "search", "default", "1.0.0", "v2.0", '{"enabled":false}', now, null],
    );

    // Activate v1
    await db.run(
      `INSERT INTO config_active (config_type, profile_key, active_hash, activated_utc, activated_by, activation_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["search", "default", "hash-v1", now, null, null],
    );

    // Switch to v2
    await db.run(
      `UPDATE config_active SET active_hash = ?, activated_utc = ?, activation_reason = ?
       WHERE config_type = ? AND profile_key = ?`,
      ["hash-v2", now, "Rollback to v2", "search", "default"],
    );

    const active = await db.get(
      `SELECT * FROM config_active WHERE config_type = ? AND profile_key = ?`,
      ["search", "default"],
    );

    expect(active.active_hash).toBe("hash-v2");
  });

  it("retrieves active config with content", async () => {
    const now = new Date().toISOString();
    const content = '{"enabled":true,"provider":"google-cse"}';

    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ["content-hash", "search", "default", "1.0.0", "v1.0", content, now, null],
    );

    await db.run(
      `INSERT INTO config_active (config_type, profile_key, active_hash, activated_utc, activated_by, activation_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["search", "default", "content-hash", now, null, null],
    );

    const result = await db.get(
      `SELECT b.*, a.activated_utc, a.activated_by
       FROM config_active a
       JOIN config_blobs b ON a.active_hash = b.content_hash
       WHERE a.config_type = ? AND a.profile_key = ?`,
      ["search", "default"],
    );

    expect(result).toBeDefined();
    expect(result.content).toBe(content);
    expect(result.activated_utc).toBeDefined();
  });
});

describe("Config Usage Tracking", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.run(`DELETE FROM config_usage`);
    await db.run(`DELETE FROM config_active`);
    await db.run(`DELETE FROM config_blobs`);
  });

  afterAll(async () => {
    await db.close();
  });

  it("records config usage for a job", async () => {
    const now = new Date().toISOString();
    const jobId = "job-123";
    const contentHash = "usage-hash";

    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, effective_overrides, loaded_utc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [jobId, "prompt", "orchestrated", contentHash, null, now],
    );

    const usage = await db.get(`SELECT * FROM config_usage WHERE job_id = ?`, [jobId]);
    expect(usage).toBeDefined();
    expect(usage.config_type).toBe("prompt");
    expect(usage.profile_key).toBe("orchestrated");
    expect(usage.content_hash).toBe(contentHash);
  });

  it("records multiple config types for same job", async () => {
    const now = new Date().toISOString();
    const jobId = "job-456";

    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, effective_overrides, loaded_utc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [jobId, "prompt", "orchestrated", "prompt-hash", null, now],
    );
    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, effective_overrides, loaded_utc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [jobId, "search", "default", "search-hash", null, now],
    );
    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, effective_overrides, loaded_utc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [jobId, "calculation", "default", "calc-hash", null, now],
    );

    const usages = await db.all(`SELECT * FROM config_usage WHERE job_id = ?`, [jobId]);
    expect(usages.length).toBe(3);

    const types = usages.map((u: any) => u.config_type);
    expect(types).toContain("prompt");
    expect(types).toContain("search");
    expect(types).toContain("calculation");
  });

  it("stores effective overrides as JSON", async () => {
    const now = new Date().toISOString();
    const overrides = JSON.stringify([
      { envVar: "FH_SEARCH_ENABLED", fieldPath: "enabled", wasSet: true, appliedValue: true },
    ]);

    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, effective_overrides, loaded_utc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["job-789", "search", "default", "hash", overrides, now],
    );

    const usage = await db.get(`SELECT * FROM config_usage WHERE job_id = ?`, ["job-789"]);
    expect(usage.effective_overrides).toBe(overrides);

    const parsed = JSON.parse(usage.effective_overrides);
    expect(parsed[0].envVar).toBe("FH_SEARCH_ENABLED");
    expect(parsed[0].appliedValue).toBe(true);
  });

  it("retrieves usage history by content hash", async () => {
    const now = new Date().toISOString();
    const contentHash = "shared-hash";

    // Multiple jobs using same hash
    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, loaded_utc)
       VALUES (?, ?, ?, ?, ?)`,
      ["job-a", "prompt", "orchestrated", contentHash, now],
    );
    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, loaded_utc)
       VALUES (?, ?, ?, ?, ?)`,
      ["job-b", "prompt", "orchestrated", contentHash, now],
    );
    await db.run(
      `INSERT INTO config_usage (job_id, config_type, profile_key, content_hash, loaded_utc)
       VALUES (?, ?, ?, ?, ?)`,
      ["job-c", "prompt", "orchestrated", "different-hash", now],
    );

    const usages = await db.all(`SELECT * FROM config_usage WHERE content_hash = ?`, [contentHash]);
    expect(usages.length).toBe(2);
  });
});

describe("Config History", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.run(`DELETE FROM config_usage`);
    await db.run(`DELETE FROM config_active`);
    await db.run(`DELETE FROM config_blobs`);
  });

  afterAll(async () => {
    await db.close();
  });

  it("retrieves version history for type/profile", async () => {
    const now = new Date();

    // Insert multiple versions
    for (let i = 0; i < 5; i++) {
      const ts = new Date(now.getTime() - i * 1000).toISOString();
      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`hash-${i}`, "prompt", "orchestrated", "1.0.0", `v${i}`, `{"version":${i}}`, ts, null],
      );
    }

    // Activate latest
    await db.run(
      `INSERT INTO config_active (config_type, profile_key, active_hash, activated_utc)
       VALUES (?, ?, ?, ?)`,
      ["prompt", "orchestrated", "hash-0", now.toISOString()],
    );

    const history = await db.all(
      `SELECT b.*, 
              CASE WHEN a.active_hash = b.content_hash THEN 1 ELSE 0 END as is_active
       FROM config_blobs b
       LEFT JOIN config_active a ON a.config_type = b.config_type AND a.profile_key = b.profile_key
       WHERE b.config_type = ? AND b.profile_key = ?
       ORDER BY b.created_utc DESC`,
      ["prompt", "orchestrated"],
    );

    expect(history.length).toBe(5);
    expect(history[0].content_hash).toBe("hash-0");
    expect(history[0].is_active).toBe(1);
    expect(history[1].is_active).toBe(0);
  });

  it("paginates history results", async () => {
    const now = new Date();

    // Insert 10 versions
    for (let i = 0; i < 10; i++) {
      const ts = new Date(now.getTime() - i * 1000).toISOString();
      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`hash-${i}`, "search", "default", "1.0.0", `v${i}`, `{"v":${i}}`, ts, null],
      );
    }

    const page1 = await db.all(
      `SELECT * FROM config_blobs WHERE config_type = ? AND profile_key = ?
       ORDER BY created_utc DESC LIMIT 5 OFFSET 0`,
      ["search", "default"],
    );

    const page2 = await db.all(
      `SELECT * FROM config_blobs WHERE config_type = ? AND profile_key = ?
       ORDER BY created_utc DESC LIMIT 5 OFFSET 5`,
      ["search", "default"],
    );

    expect(page1.length).toBe(5);
    expect(page2.length).toBe(5);

    // No overlap
    const page1Hashes = page1.map((r: any) => r.content_hash);
    const page2Hashes = page2.map((r: any) => r.content_hash);
    const overlap = page1Hashes.filter((h: string) => page2Hashes.includes(h));
    expect(overlap.length).toBe(0);
  });
});

describe("Profile Management", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.run(`DELETE FROM config_usage`);
    await db.run(`DELETE FROM config_active`);
    await db.run(`DELETE FROM config_blobs`);
  });

  afterAll(async () => {
    await db.close();
  });

  it("lists distinct profile keys for a type", async () => {
    const now = new Date().toISOString();

    // Insert configs for multiple profiles
    const profiles = ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability"];

    for (let i = 0; i < profiles.length; i++) {
      await db.run(
        `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`hash-${i}`, "prompt", profiles[i], "1.0.0", "v1", `{"profile":"${profiles[i]}"}`, now, null],
      );
    }

    const result = await db.all(
      `SELECT DISTINCT profile_key FROM config_blobs WHERE config_type = ?`,
      ["prompt"],
    );

    expect(result.length).toBe(4);
    const foundProfiles = result.map((r: any) => r.profile_key);
    for (const p of profiles) {
      expect(foundProfiles).toContain(p);
    }
  });

  it("isolates configs by type", async () => {
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ["search-hash", "search", "default", "1.0.0", "v1", '{"type":"search"}', now, null],
    );
    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ["calc-hash", "calculation", "default", "1.0.0", "v1", '{"type":"calc"}', now, null],
    );
    await db.run(
      `INSERT INTO config_blobs (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ["prompt-hash", "prompt", "orchestrated", "1.0.0", "v1", '{"type":"prompt"}', now, null],
    );

    const searchConfigs = await db.all(`SELECT * FROM config_blobs WHERE config_type = ?`, ["search"]);
    const calcConfigs = await db.all(`SELECT * FROM config_blobs WHERE config_type = ?`, ["calculation"]);
    const promptConfigs = await db.all(`SELECT * FROM config_blobs WHERE config_type = ?`, ["prompt"]);

    expect(searchConfigs.length).toBe(1);
    expect(calcConfigs.length).toBe(1);
    expect(promptConfigs.length).toBe(1);
  });
});

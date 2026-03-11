import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

async function flushSRCache() {
  const dbPath = path.resolve(process.env.FH_SR_CACHE_PATH || 'apps/web/source-reliability.db');
  console.log(`[SR-Cache] Opening database at ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.error(`[SR-Cache] Database not found at ${dbPath}`);
    process.exit(1);
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Decision D3: Bulk-invalidate all SR cached scores after 2026-03-05.
  // These scores were computed with broken single-provider evidence packs.
  const targetDate = '2026-03-05';
  
  const result = await db.run(
    "DELETE FROM source_reliability WHERE evaluated_at > ?",
    [targetDate]
  );

  console.log(`[SR-Cache] Deleted ${result.changes} entries evaluated after ${targetDate}`);
  await db.close();
}

flushSRCache().catch(err => {
  console.error('[SR-Cache] Flush failed:', err);
  process.exit(1);
});

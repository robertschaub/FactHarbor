const sqlite3 = require('better-sqlite3');
const db = sqlite3('./apps/web/source-reliability.db', { readonly: true });
const rows = db
  .prepare(
    `SELECT domain, score, confidence, evaluated_at
     FROM source_reliability_cache
     WHERE evaluated_at < '2026-04-19T00:00:00Z'
     ORDER BY evaluated_at DESC LIMIT 50`
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
db.close();

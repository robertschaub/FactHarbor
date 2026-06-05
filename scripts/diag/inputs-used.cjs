#!/usr/bin/env node
'use strict';
// Read-only: distinct claimboundary inputs ever submitted (deduped by JobId across report DBs), with run counts.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const ROOT = 'C:/DEV/FactHarbor';
const sql = (db, q) => { try { const o = execFileSync('sqlite3', ['-readonly','-json',db,q], {encoding:'utf8',maxBuffer:1<<30}); return o.trim()?JSON.parse(o):[]; } catch(e){ return []; } };
const DBS = [
  ROOT+'/apps/api/factharbor.db',
  ROOT+'/test-output/prod/factharbor-prod.db',
  ROOT+'/test-output/candidate-ranking-corrected/fh-analysis-copy.db',
  'C:/DEV/FH-quality_before_decline/apps/api/factharbor.db',
];
const Q = "SELECT JobId AS id, InputType AS t, InputValue AS v FROM Jobs WHERE Status='SUCCEEDED' AND PipelineVariant LIKE 'claimboundary%' AND InputValue IS NOT NULL";
const seen = new Set(); const cnt = {}; const typ = {};
for (const db of DBS) {
  for (const r of sql(db, Q)) {
    if (seen.has(r.id)) continue; seen.add(r.id);
    const k = (r.v||'').trim(); if (!k) continue;
    cnt[k] = (cnt[k]||0)+1; typ[k] = r.t;
  }
}
const arr = Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
const recurring = arr.filter(([k,n])=>n>=3);
console.log(`# distinct inputs total: ${arr.length} | run >=3x: ${recurring.length} | one-offs (1x): ${arr.filter(([k,n])=>n===1).length}`);
console.log('\n# RECURRING inputs (run >=3 times) — the deliberate test set:');
for (const [k,n] of recurring) console.log(`  ${String(n).padStart(4)}x [${typ[k]}]  ${k.slice(0,100)}${k.length>100?' …':''}`);
fs.writeFileSync(ROOT+'/test-output/inputs-used.txt', arr.map(([k,n])=>`${n}\t${typ[k]}\t${k.replace(/\s+/g,' ')}`).join('\n'));
console.log(`\n(full list of all ${arr.length} distinct inputs -> test-output/inputs-used.txt)`);

#!/usr/bin/env node
'use strict';
/* Read-only: which DOMAINS are failing to fetch and with what error type, for
 * recent jobs. Characterizes whether 403s are broad bot-blocking or a few sites.
 * No writes, no LLM. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT = repoRoot(process.cwd());
const DB = process.env.FH_DB_PATH || path.join(ROOT, 'apps', 'api', 'factharbor.db');
const SINCE = process.argv[2] || '2026-05-24';
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
function dom(u){try{return new URL(u).hostname.replace(/^www\./,'').toLowerCase();}catch{return '(bad-url)';}}

const rows = sql(`SELECT JobId, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL AND CreatedUtc >= '${SINCE}' ORDER BY CreatedUtc ASC`);
const domByType = new Map(); // domain -> {type->count}
const typeTotals = {};
const sampleMsgs = {}; // type -> [msgs]
let jobs=0, warns=0;
for(const row of rows){
  let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ continue; }
  jobs++;
  for(const w of (r.analysisWarnings||[])){
    if(!w || w.type!=='source_fetch_failure') continue;
    warns++;
    const d = w.details||{};
    const ebt = d.errorByType||{};
    for(const [t,c] of Object.entries(ebt)) typeTotals[t]=(typeTotals[t]||0)+(Number(c)||0);
    for(const u of (d.failedUrls||[])){
      const h = dom(u);
      if(!domByType.has(h)) domByType.set(h,{});
      // we don't know per-url type from failedUrls alone; use errorSamples for typed url->type
    }
    for(const s of (d.errorSamples||[])){
      const h = dom(s.url||'');
      if(!domByType.has(h)) domByType.set(h,{});
      const m = domByType.get(h);
      m[s.type] = (m[s.type]||0)+1;
      if(!sampleMsgs[s.type]) sampleMsgs[s.type]=[];
      if(sampleMsgs[s.type].length<4) sampleMsgs[s.type].push(`${h}: ${String(s.message||'').slice(0,90)}`);
    }
  }
}
console.log(`# FETCH-FAILURE DOMAIN BREAKDOWN since ${SINCE} — ${jobs} jobs, ${warns} fetch warnings\n`);
console.log(`## error-type totals (per attempt, from errorByType)`);
for(const [t,c] of Object.entries(typeTotals).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(c).padStart(6)}  ${t}`);

// rank domains by total typed-sample failures
const ranked = [...domByType.entries()].map(([h,m])=>{
  const tot = Object.values(m).reduce((a,b)=>a+b,0);
  return {h,m,tot};
}).sort((a,b)=>b.tot-a.tot).slice(0,30);
console.log(`\n## top 30 failing domains (from errorSamples; typed)`);
for(const {h,m,tot} of ranked){
  const parts = Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`${c}×${t}`).join(' ');
  console.log(`  ${String(tot).padStart(4)}  ${h.padEnd(34)} ${parts}`);
}
console.log(`\n## sample messages by type`);
for(const [t,arr] of Object.entries(sampleMsgs)){ console.log(`  [${t}]`); for(const s of arr) console.log(`     ${s}`); }

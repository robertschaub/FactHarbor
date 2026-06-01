#!/usr/bin/env node
'use strict';
/* Read-only: weekly + per-commit trend of source-fetch failure SEVERITY.
 * Distinguishes the chronic per-JOB incidence (>=1 warning) from the per-ATTEMPT
 * severity (failed/attempted, 403/attempted) so "recently degraded" can be tested.
 * No writes, no LLM. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT = repoRoot(process.cwd());
const DB = process.env.FH_DB_PATH || path.join(ROOT, 'apps', 'api', 'factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}

// ISO-week-ish bucket: year + week number derived from CreatedUtc date (UTC).
function weekKey(createdUtc){
  // CreatedUtc like "2026-06-01 15:17:58.789" — take date part.
  const d = String(createdUtc).slice(0,10); // YYYY-MM-DD
  const [y,m,day] = d.split('-').map(Number);
  // days since epoch (UTC), Monday-based week index
  const t = Date.UTC(y, m-1, day);
  const dayIdx = Math.floor(t / 86400000);
  // 1970-01-01 was a Thursday (idx 0). Shift so Monday=0.
  const weekIdx = Math.floor((dayIdx + 3) / 7); // +3 aligns Mondays
  return { key: weekIdx, label: d }; // label = first-seen date for the week
}

const total = sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;

const weeks = new Map();   // weekIdx -> agg
const commits = new Map(); // commit -> agg
function newAgg(){ return { firstDate:null, lastDate:null, jobs:0, jobsWithWarn:0, attempted:0, failed:0, by:{}, degenerate:0, unverified:0 }; }

const BATCH = 200;
for(let off=0; off<total; off+=BATCH){
  const rows = sql(`SELECT JobId, CreatedUtc, VerdictLabel, ExecutedWebGitCommitHash, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ continue; }
    const W = r.analysisWarnings || [];
    const fw = W.filter(w=>w && w.type==='source_fetch_failure');
    let attempted=0, failed=0; const by={};
    for(const w of fw){ const d=w.details||{}; attempted += Number(d.attempted)||0; failed += Number(d.failed)||0;
      const ebt = d.errorByType||{}; for(const [k,v] of Object.entries(ebt)) by[k]=(by[k]||0)+(Number(v)||0); }
    const evN = (r.evidenceItems||[]).length;
    const unv = ((row.VerdictLabel||r.verdict)==='UNVERIFIED') ? 1 : 0;
    const degenerate = evN < 5 ? 1 : 0; // proxy: a near-empty evidence pool => degenerate report risk

    const wk = weekKey(row.CreatedUtc);
    if(!weeks.has(wk.key)) weeks.set(wk.key, newAgg());
    const wa = weeks.get(wk.key);
    if(!wa.firstDate) wa.firstDate = wk.label; wa.lastDate = String(row.CreatedUtc).slice(0,10);
    wa.jobs++; if(fw.length) wa.jobsWithWarn++; wa.attempted+=attempted; wa.failed+=failed; wa.unverified+=unv; wa.degenerate+=degenerate;
    for(const [k,v] of Object.entries(by)) wa.by[k]=(wa.by[k]||0)+v;

    const commit = (row.ExecutedWebGitCommitHash||'(none)').slice(0,12);
    if(!commits.has(commit)) commits.set(commit, newAgg());
    const ca = commits.get(commit);
    if(!ca.firstDate) ca.firstDate = String(row.CreatedUtc).slice(0,10); ca.lastDate=String(row.CreatedUtc).slice(0,10);
    ca.jobs++; if(fw.length) ca.jobsWithWarn++; ca.attempted+=attempted; ca.failed+=failed; ca.unverified+=unv; ca.degenerate+=degenerate;
    for(const [k,v] of Object.entries(by)) ca.by[k]=(ca.by[k]||0)+v;
  }
}
const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'   -  ';

console.log(`# FETCH-FAILURE WEEKLY TREND (read-only) — ${total} SUCCEEDED jobs\n`);
console.log(`Columns: week | jobs | jobs-with-warn% (per-JOB incidence) | per-ATTEMPT fail% | per-ATTEMPT 403% | mean-evidence proxy(degenerate<5ev)% | UNVERIFIED%`);
console.log(`week(start)  jobs   warn%   failAtt%  403Att%   degen%   UNV%`);
for(const k of [...weeks.keys()].sort((a,b)=>a-b)){
  const a = weeks.get(k);
  const f403 = a.by['http_403']||0;
  console.log(`${a.firstDate}  ${String(a.jobs).padStart(4)}  ${pct(a.jobsWithWarn,a.jobs).padStart(6)}  ${pct(a.failed,a.attempted).padStart(7)}  ${pct(f403,a.attempted).padStart(7)}  ${pct(a.degenerate,a.jobs).padStart(6)}  ${pct(a.unverified,a.jobs).padStart(6)}`);
}

console.log(`\n# BY EXECUTED COMMIT (>=5 jobs), recent first`);
console.log(`commit        first       last        jobs  warn%   failAtt%  403Att%   degen%   UNV%`);
const commitRows = [...commits.entries()].filter(([,a])=>a.jobs>=5).sort((a,b)=> (a[1].lastDate<b[1].lastDate?1:-1));
for(const [c,a] of commitRows){
  const f403 = a.by['http_403']||0;
  console.log(`${c.padEnd(12)}  ${a.firstDate}  ${a.lastDate}  ${String(a.jobs).padStart(4)}  ${pct(a.jobsWithWarn,a.jobs).padStart(6)}  ${pct(a.failed,a.attempted).padStart(7)}  ${pct(f403,a.attempted).padStart(7)}  ${pct(a.degenerate,a.jobs).padStart(6)}  ${pct(a.unverified,a.jobs).padStart(6)}`);
}

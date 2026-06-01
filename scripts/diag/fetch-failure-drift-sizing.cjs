#!/usr/bin/env node
'use strict';
/* Read-only: size the source-fetch-failure component of evidence-pool drift.
 * Cause split, sources-lost-per-job, and correlation of fetch-fail rate with
 * evidence count / UNVERIFIED. No writes, no LLM. */
const { execFileSync } = require('node:child_process');
const fs=require('node:fs'); const path=require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const total=sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;

function cause(s){
  if(/429|rate.?limit|too many requests|quota|per.?minute/i.test(s)) return 'rate_limit_429';
  if(/timeout|timed out|ETIMEDOUT|deadline|AbortError/i.test(s)) return 'timeout';
  if(/403|forbidden|robots|captcha|paywall|access denied|blocked/i.test(s)) return 'blocked_403_robots';
  if(/404|not found|410|gone/i.test(s)) return 'notfound_404';
  if(/ENOTFOUND|ECONNRESET|ECONNREFUSED|net::|socket|DNS|ECONN/i.test(s)) return 'network_dns';
  if(/empty|no content|no text|too short|extraction/i.test(s)) return 'empty_content';
  return 'other';
}
let scanned=0, jobsWithFetchWarn=0, searchProviderErr=0, perSourceCap=0;
const causeTally={};
const rateBuckets={ "0%":{n:0,ev:0,unv:0}, "1-25%":{n:0,ev:0,unv:0}, "25-50%":{n:0,ev:0,unv:0}, "50-75%":{n:0,ev:0,unv:0}, "75-100%":{n:0,ev:0,unv:0} };
let sumFailRate=0, jobsWithSources=0; const samples=[];
const BATCH=200;
for(let off=0;off<total;off+=BATCH){
  const rows=sql(`SELECT VerdictLabel, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
    scanned++;
    const W=r.analysisWarnings||[];
    const fetchWarns=W.filter(w=>w&&w.type==='source_fetch_failure');
    if(fetchWarns.length) jobsWithFetchWarn++;
    if(W.some(w=>w&&w.type==='search_provider_error')) searchProviderErr++;
    if(W.some(w=>w&&w.type==='per_source_evidence_cap')) perSourceCap++;
    for(const w of fetchWarns){ const s=(w.message||'')+' '+JSON.stringify(w.details||{}); const c=cause(s); causeTally[c]=(causeTally[c]||0)+1; if(samples.length<6 && c!=='other') samples.push(c+': '+String(w.message||JSON.stringify(w.details)).slice(0,110)); }
    const evN=(r.evidenceItems||[]).length;
    const unv=((row.VerdictLabel||r.verdict)==='UNVERIFIED')?1:0;
    // sources[] retains ONLY fetchSuccess=true; failed sources are dropped. The true
    // fetch-fail rate lives in the warning details (attempted/failed per query).
    let attempted=0, failed=0;
    for(const w of fetchWarns){ const d=w.details||{}; attempted+=Number(d.attempted)||0; failed+=Number(d.failed)||0; }
    jobsWithSources++;
    const rate = attempted>0 ? failed/attempted : 0; sumFailRate+=rate;
    const b = rate===0?"0%": rate<0.25?"1-25%": rate<0.5?"25-50%": rate<0.75?"50-75%":"75-100%";
    rateBuckets[b].n++; rateBuckets[b].ev+=evN; rateBuckets[b].unv+=unv;
  }
}
const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'-';
console.log(`# FETCH-FAILURE / DRIFT SIZING (read-only) — ${scanned} SUCCEEDED jobs\n`);
console.log(`jobs with >=1 source_fetch_failure warning: ${jobsWithFetchWarn} (${pct(jobsWithFetchWarn,scanned)})`);
console.log(`jobs with search_provider_error: ${searchProviderErr} (${pct(searchProviderErr,scanned)}) | per_source_evidence_cap: ${perSourceCap} (${pct(perSourceCap,scanned)})`);
console.log(`mean per-job fetch-fail rate (failed/attempted, from warning details): ${pct(sumFailRate,jobsWithSources)} (over ${jobsWithSources} jobs)\n`);
console.log(`## fetch-failure CAUSE split (per warning)`);
const totW=Object.values(causeTally).reduce((a,b)=>a+b,0);
for(const [k,v] of Object.entries(causeTally).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(v).padStart(6)}  ${k.padEnd(20)} ${pct(v,totW)}`);
console.log(`\n## outcome by fetch-fail-rate bucket (mean evidence items | UNVERIFIED rate)`);
for(const [b,o] of Object.entries(rateBuckets)) console.log(`  ${b.padEnd(8)} jobs=${String(o.n).padStart(5)}  meanEvidence=${o.n?(o.ev/o.n).toFixed(0):'-'}  UNVERIFIED=${pct(o.unv,o.n)}`);
console.log(`\n## sample fetch-fail messages:`); for(const s of samples) console.log('  '+s);

#!/usr/bin/env node
'use strict';
/*
 * Checkworthy-UNVERIFIED + report_damaged POPULATION census. Read-only, no LLM calls.
 * Measures the two Captain generic floors:
 *   (1) Q-HF1 no-hard-failure: report_damaged / analysis_generation_failed / llm_provider_error
 *   (2) per-claim: a CHECK-WORTHY AtomicClaim landing UNVERIFIED is a bad smell (even on SUCCEEDED jobs)
 * Scans ALL SUCCEEDED jobs in apps/api/factharbor.db (batched to bound memory).
 * Reuses the DB-load/Q-HF1 pattern from best-commit-phase1.cjs (read-only).
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT = repoRoot(process.cwd());
const DB = process.env.FH_DB_PATH || path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}

const HARD = ['report_damaged','analysis_generation_failed','llm_provider_error'];
const total = sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;

let succeeded=0, parseSkipped=0, hardFailJobs=0, topUnverJobs=0;
let claimsTotal=0, cwClaims=0;
let unverTotal=0, unverCheckworthy=0, unverLow=0, unverUnknownCW=0;
let jobsWithCwUnver=0, cleanJobsWithCwUnver=0;
const reason = {}; const hardTypes = {};

const BATCH=200;
for(let off=0; off<total; off+=BATCH){
  const rows = sql(`SELECT VerdictLabel, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ parseSkipped++; continue; }
    succeeded++;
    const W=r.analysisWarnings||[];
    const hf=W.filter(w=>w&&HARD.includes(w.type));
    const hardFail=hf.length>0; if(hardFail){ hardFailJobs++; for(const w of hf) hardTypes[w.type]=(hardTypes[w.type]||0)+1; }
    const topUnver=((row.VerdictLabel||r.verdict)==='UNVERIFIED'); if(topUnver) topUnverJobs++;
    const acs=(r.understanding&&r.understanding.atomicClaims)||[];
    const cw={}; for(const a of acs){ if(a&&a.id!=null) cw[a.id]=a.checkWorthiness; }
    let jobHas=false;
    for(const v of (r.claimVerdicts||[])){
      claimsTotal++;
      const c = cw[v.claimId]; // 'low' | 'medium' | 'high' | undefined
      const checkworthy = (c==='medium'||c==='high');
      if(checkworthy) cwClaims++;
      if(v.verdict==='UNVERIFIED'){
        unverTotal++;
        if(c==='low') unverLow++; else if(checkworthy){ unverCheckworthy++; jobHas=true; } else { unverUnknownCW++; jobHas=true; }
        reason[v.verdictReason||'(none)']=(reason[v.verdictReason||'(none)']||0)+1;
      }
    }
    if(jobHas){ jobsWithCwUnver++; if(!hardFail&&!topUnver) cleanJobsWithCwUnver++; }
  }
}
const pct=(a,b)=> b? (100*a/b).toFixed(1)+'%' : 'n/a';
console.log(`# CHECKWORTHY-UNVERIFIED + REPORT_DAMAGED POPULATION CENSUS (read-only)`);
console.log(`DB: ${DB}`);
console.log(`SUCCEEDED jobs scanned: ${succeeded} (parse-skipped ${parseSkipped})\n`);
console.log(`## Q-HF1 hard-failure floor`);
console.log(`  hard-failure jobs: ${hardFailJobs}  (${pct(hardFailJobs,succeeded)} of SUCCEEDED)`);
console.log(`  by type: ${JSON.stringify(hardTypes)}`);
console.log(`  top-level UNVERIFIED jobs: ${topUnverJobs}  (${pct(topUnverJobs,succeeded)})\n`);
console.log(`## Per-claim checkworthy-UNVERIFIED (the new expectation)`);
console.log(`  total claim verdicts: ${claimsTotal}`);
console.log(`  check-worthy claims (medium|high): ${cwClaims}`);
console.log(`  UNVERIFIED claim verdicts: ${unverTotal}  — of which checkworthy ${unverCheckworthy}, low ${unverLow}, unknown-CW ${unverUnknownCW}`);
console.log(`  >>> checkworthy-UNVERIFIED rate: ${unverCheckworthy}/${cwClaims} = ${pct(unverCheckworthy,cwClaims)} of check-worthy claims`);
console.log(`  jobs with >=1 checkworthy-UNVERIFIED claim: ${jobsWithCwUnver}  (${pct(jobsWithCwUnver,succeeded)})`);
console.log(`  ...of those, on CLEAN jobs (SUCCEEDED, not hard-fail, not top-UNVERIFIED): ${cleanJobsWithCwUnver}  (${pct(cleanJobsWithCwUnver,succeeded)})`);
console.log(`     ^ this last cohort is the pure per-claim smell the new expectation targets\n`);
console.log(`## verdictReason for UNVERIFIED claims (top)`);
for(const [k,v] of Object.entries(reason).sort((a,b)=>b[1]-a[1]).slice(0,12)) console.log(`  ${String(v).padStart(5)}  ${k}`);

// --- fold-in: bolsonaro-pt boundary-count check (R3) ---
try{
  const bp = sql(`SELECT ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND InputValue LIKE '%senten%just%' AND ResultJson IS NOT NULL ORDER BY CreatedUtc DESC LIMIT 5`);
  if(bp.length){ console.log(`\n## bolsonaro-pt boundary check (latest ${bp.length})`);
    for(const row of bp){ try{ const r=JSON.parse(row.ResultJson); const b=(r.claimBoundaries||[]).length||(r.meta&&r.meta.boundaryCount)||0; console.log(`  boundaries=${b} (min 3 expected)`);}catch(e){} } }
}catch(e){}

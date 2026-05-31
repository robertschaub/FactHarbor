#!/usr/bin/env node
'use strict';
/*
 * Root-cause DRILL for checkworthy-UNVERIFIED claims. Read-only, no LLM calls.
 * For each UNVERIFIED claim verdict, profile by verdictReason:
 *   - cited evidence (supporting+contradicting) per claim; % with ZERO cited
 *   - job-level evidenceItems count
 *   - correlation with source_fetch_failure / per_source_evidence_cap warnings
 *   - on hard-failed job? on top-level-UNVERIFIED job?
 * Tests the "evidence-fetch starvation" hypothesis and characterizes the unlabeled ("none") bucket.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const HARD=['report_damaged','analysis_generation_failed','llm_provider_error'];
const total=sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;

const fam={}; // reason -> aggregate
function f(reason){return fam[reason]||(fam[reason]={n:0,zeroEv:0,sumEv:0,sumJobEv:0,fetchFail:0,evCap:0,onHardFail:0,onTopUnver:0});}
let jobsScanned=0, jobsFetchFail=0, fetchSev=null;            // base-rate of source_fetch_failure
let noneConfSum=0, noneConfLt40=0, noneN=0;                   // confidence profile of unlabeled UNVERIFIED
const BATCH=200;
for(let off=0;off<total;off+=BATCH){
  const rows=sql(`SELECT VerdictLabel,ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
    const W=r.analysisWarnings||[];
    const hardFail=W.some(w=>w&&HARD.includes(w.type));
    const fetchFail=W.some(w=>w&&w.type==='source_fetch_failure');
    jobsScanned++; if(fetchFail){ jobsFetchFail++; if(!fetchSev){ const fw=W.find(w=>w&&w.type==='source_fetch_failure'); fetchSev=fw&&fw.severity; } }
    const evCap=W.some(w=>w&&w.type==='per_source_evidence_cap');
    const topUnver=((row.VerdictLabel||r.verdict)==='UNVERIFIED');
    const jobEv=(r.evidenceItems||[]).length;
    const acs=(r.understanding&&r.understanding.atomicClaims)||[];
    const cw={}; for(const a of acs){ if(a&&a.id!=null) cw[a.id]=a.checkWorthiness; }
    for(const v of (r.claimVerdicts||[])){
      if(v.verdict!=='UNVERIFIED') continue;
      const c=cw[v.claimId]; if(c==='low') continue; // checkworthy only
      const reason=v.verdictReason||'(none)';
      const ev=((v.supportingEvidenceIds||[]).length+(v.contradictingEvidenceIds||[]).length);
      const a=f(reason);
      a.n++; if(ev===0)a.zeroEv++; a.sumEv+=ev; a.sumJobEv+=jobEv;
      if(fetchFail)a.fetchFail++; if(evCap)a.evCap++; if(hardFail)a.onHardFail++; if(topUnver)a.onTopUnver++;
      if(reason==='(none)'){ const cf=Number(v.confidence); if(Number.isFinite(cf)){ noneConfSum+=cf; noneN++; if(cf<40)noneConfLt40++; } }
    }
  }
}
const pct=(a,b)=>b?(100*a/b).toFixed(0)+'%':'-';
console.log(`# CHECKWORTHY-UNVERIFIED ROOT-CAUSE DRILL (read-only, n SUCCEEDED=${total})\n`);
console.log(`reason                      | claims | 0-cited | meanCited | meanJobEv | fetchFail | evCap | onHardFail | onTopUnver`);
console.log(`----------------------------|--------|---------|-----------|-----------|-----------|-------|------------|----------`);
for(const [k,a] of Object.entries(fam).sort((x,y)=>y[1].n-x[1].n)){
  console.log(`${k.padEnd(27)} | ${String(a.n).padStart(6)} | ${pct(a.zeroEv,a.n).padStart(7)} | ${(a.sumEv/a.n).toFixed(1).padStart(9)} | ${(a.sumJobEv/a.n).toFixed(0).padStart(9)} | ${pct(a.fetchFail,a.n).padStart(9)} | ${pct(a.evCap,a.n).padStart(5)} | ${pct(a.onHardFail,a.n).padStart(10)} | ${pct(a.onTopUnver,a.n).padStart(8)}`);
}
console.log(`\n## BASE RATES (to interpret the fetchFail column above)`);
console.log(`  source_fetch_failure present in ${jobsFetchFail}/${jobsScanned} ALL SUCCEEDED jobs = ${pct(jobsFetchFail,jobsScanned)} (severity sample: ${fetchSev||'?'})`);
console.log(`     → if this base rate ≈ the per-family fetchFail %, the correlation is SPURIOUS (ubiquitous warning), not causal.`);
console.log(`  unlabeled "(none)" UNVERIFIED claims: mean confidence ${(noneConfSum/noneN).toFixed(0)} | conf<40: ${pct(noneConfLt40,noneN)} (n=${noneN})`);
console.log(`     → high conf<40 share = threshold/low-confidence UNVERIFIED (evidence present but below sufficiency gate).`);

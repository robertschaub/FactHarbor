#!/usr/bin/env node
'use strict';
/*
 * Step 1 of the HEAD-vs-deployed quality investigation: reason-coded failure census.
 * Read-only, no LLM/search. Splits UNVERIFIED / report_damaged by EXACT reason, at
 * BOTH report-level (per job) and claim-level (per atomic-claim verdict), segmented by
 * ERA (provenance), so we can see WHICH failure bucket is elevated on the gated/HEAD era
 * vs the deployed era — before deciding any fix. (Per GPT + 2 Claude reviewers: aggregate
 * UNVERIFIED is too coarse; reason-code first; era comparison is input-mix-CONFOUNDED — it
 * shows direction, not a controlled delta; the controlled delta is the Step-2 replay.)
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT = repoRoot(process.cwd());
const DB = process.env.FH_DB_PATH || path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}

// Era by CreatedUtc (gates — direct-sufficiency / ca143468 — landed ~May 28-29).
function era(created){
  const s = String(created||'');
  if (s < '2026-05-01') return '1_apr_deployed';     // deployed-era (around 2f7a2805, Apr 22)
  if (s < '2026-05-28') return '2_may_rehome_pregate'; // rehome + pre-gate (note: May 3-23 local DB gap)
  return '3_may28+_gated_HEAD';                        // gated / current HEAD era
}
const ERAS = ['1_apr_deployed','2_may_rehome_pregate','3_may28+_gated_HEAD'];
const HARD = ['report_damaged','analysis_generation_failed','llm_provider_error'];
const GATEWARN = ['report_damaged','insufficient_direct_evidence','verdict_integrity_failure'];

const blank = () => ({
  jobs:0, commits:new Set(),
  topUnver:0, jobReportDamaged:0, jobInsuffDirect:0, jobIntegrity:0, jobInsuffEvidence:0,
  claims:0, cw:0, claimUnver:0, cwUnver:0,
  reason:{},
});
const E = {}; for(const k of ERAS) E[k]=blank();

const total = sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;
const BATCH=200;
let parseSkipped=0;
for(let off=0; off<total; off+=BATCH){
  const rows = sql(`SELECT VerdictLabel, CreatedUtc, substr(ExecutedWebGitCommitHash,1,8) AS cmt, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ parseSkipped++; continue; }
    const e = E[era(row.CreatedUtc)];
    e.jobs++; if(row.cmt) e.commits.add(row.cmt);
    const W = r.analysisWarnings||[];
    const wtypes = new Set(W.map(w=>w&&w.type));
    if(wtypes.has('report_damaged')) e.jobReportDamaged++;
    if(wtypes.has('insufficient_direct_evidence')) e.jobInsuffDirect++;
    if(wtypes.has('verdict_integrity_failure')) e.jobIntegrity++;
    if(wtypes.has('insufficient_evidence')) e.jobInsuffEvidence++;
    if((row.VerdictLabel||r.verdict)==='UNVERIFIED') e.topUnver++;
    const acs=(r.understanding&&r.understanding.atomicClaims)||[];
    const cw={}; for(const a of acs){ if(a&&a.id!=null) cw[a.id]=a.checkWorthiness; }
    for(const v of (r.claimVerdicts||[])){
      e.claims++;
      const c = cw[v.claimId];
      const checkworthy = (c==='medium'||c==='high');
      if(checkworthy) e.cw++;
      if(v.verdict==='UNVERIFIED'){
        e.claimUnver++;
        if(checkworthy) e.cwUnver++;
        const rs = v.verdictReason||'(none)';
        e.reason[rs]=(e.reason[rs]||0)+1;
      }
    }
  }
}

const pct=(a,b)=> b? (100*a/b).toFixed(1)+'%' : 'n/a';
console.log('# REASON-CODED FAILURE CENSUS — by era (read-only)  DB:',DB);
console.log('# NOTE: era comparison is INPUT-MIX CONFOUNDED (+ May 3-23 local gap) — shows direction, not a controlled delta.\n');
for(const k of ERAS){
  const e=E[k];
  if(!e.jobs){ console.log(`## ${k}: (no jobs)\n`); continue; }
  console.log(`## ${k}  — ${e.jobs} jobs, ${e.commits.size} distinct commits`);
  console.log(`  REPORT-LEVEL (per job):`);
  console.log(`    top-UNVERIFIED:        ${pct(e.topUnver,e.jobs)}`);
  console.log(`    report_damaged:        ${pct(e.jobReportDamaged,e.jobs)}   <- upstream Stage-1 contract`);
  console.log(`    insufficient_direct:   ${pct(e.jobInsuffDirect,e.jobs)}   <- direct-sufficiency gate (T1/2395f494)`);
  console.log(`    verdict_integrity_fail:${pct(e.jobIntegrity,e.jobs)}   <- integrity gate (ca143468)`);
  console.log(`    insufficient_evidence: ${pct(e.jobInsuffEvidence,e.jobs)}`);
  console.log(`  CLAIM-LEVEL (per atomic-claim verdict): ${e.claims} verdicts`);
  console.log(`    UNVERIFIED claims:     ${pct(e.claimUnver,e.claims)}  (checkworthy-UNVERIFIED: ${e.cwUnver}/${e.cw} = ${pct(e.cwUnver,e.cw)})`);
  console.log(`    UNVERIFIED by reason:`);
  for(const [rs,n] of Object.entries(e.reason).sort((a,b)=>b[1]-a[1]).slice(0,8)) console.log(`        ${String(n).padStart(5)}  ${rs}  (${pct(n,e.claimUnver)} of claim-UNVERIFIED)`);
  console.log('');
}
console.log(`(parse-skipped ${parseSkipped})`);

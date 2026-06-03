#!/usr/bin/env node
'use strict';
/*
 * Longitudinal claimboundary report-quality time series (read-only).
 * Unions local + the candidate-ranking copy (which holds the May 3-23 gap jobs), deduped by JobId,
 * claimboundary reports only (meta.pipeline ~ claimboundary / _schemaVersion ~ -cb).
 * Scores each report 0-100 by Captain criteria (Captain_Quality_Expectations.md):
 *   - Q-HF1 hard-failure floor (report_damaged/analysis_generation_failed/llm_provider_error) -> 5/8 (PHASE-BLOCKER)
 *   - top-level UNVERIFIED -> 20 (bench) / 30 (generic)
 *   - benchmark families (ground truth): in-band(verdict+truth+conf,+/-noise)=95, label-only=65, off-band=30
 *   - generic (no ground truth): base 85, minus 45*(checkworthy-UNVERIFIED rate), minus 15 if verdict_integrity_failure
 * Time axis = CreatedUtc (the build live when the report ran). Output CSV: iso,score,kind,commit.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
const ROOT = 'C:/DEV/FactHarbor';
const DBS = [['local', ROOT+'/apps/api/factharbor.db'], ['candrank', ROOT+'/test-output/candidate-ranking-corrected/fh-analysis-copy.db']];
const sql=(db,q)=>{const o=execFileSync('sqlite3',['-readonly','-json',db,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];};
const esc=s=>String(s).replace(/'/g,"''");

const spec=JSON.parse(fs.readFileSync(ROOT+'/Docs/AGENTS/benchmark-expectations.json','utf8'));
const noise=spec.noiseTolerancePct??8;
const fams=spec.families.map(f=>({inp:f.inputValue, exp:new Set(f.expectedVerdictLabels.map(x=>x.toUpperCase())), tb:f.truthPercentageBand, cb:f.confidenceBand, slug:f.slug}));
const HARD=['report_damaged','analysis_generation_failed','llm_provider_error'];

function isCB(r){ const p=(r.meta&&r.meta.pipeline)||''; const v=r._schemaVersion||(r.meta&&r.meta.schemaVersion)||''; return /claimboundary/i.test(p) || /-cb/i.test(v); }
function scoreReport(r,input,label){
  const wt=new Set((r.analysisWarnings||[]).map(w=>w&&w.type));
  const hard=HARD.some(h=>wt.has(h));
  const top=String(label||r.verdict||'').toUpperCase();
  const fam=fams.find(f=>f.inp===input);
  // diagnostic: checkworthy-claim coverage (does this report even carry checkWorthiness?)
  const acs=(r.understanding&&r.understanding.atomicClaims)||[];
  const cw={}; for(const a of acs) if(a&&a.id!=null) cw[a.id]=a.checkWorthiness;
  let cwC=0,cwU=0; for(const v of (r.claimVerdicts||[])){const c=cw[v.claimId]; if(c==='medium'||c==='high'){cwC++; if(v.verdict==='UNVERIFIED')cwU++;}}
  if(fam){
    if(hard) return {s:5,kind:'bench',branch:'bench_hard',cwC};
    if(top==='UNVERIFIED') return {s:20,kind:'bench',branch:'bench_unver',cwC};
    const labelOK=fam.exp.has(top);
    const t=r.truthPercentage, c=r.confidence;
    const truthOK=typeof t==='number'&&t>=fam.tb.min-noise&&t<=fam.tb.max+noise;
    const confOK=typeof c==='number'&&c>=fam.cb.min&&c<=fam.cb.max;
    if(labelOK&&truthOK&&confOK) return {s:95,kind:'bench',branch:'bench_inband',cwC};
    if(labelOK) return {s:65,kind:'bench',branch:'bench_labelonly',cwC};
    return {s:30,kind:'bench',branch:'bench_offband',cwC};
  }
  if(hard) return {s:8,kind:'generic',branch:'gen_hard',cwC};
  if(top==='UNVERIFIED') return {s:30,kind:'generic',branch:'gen_topunver',cwC};
  let s=85;
  if(cwC>0) s-=45*(cwU/cwC);
  if(wt.has('verdict_integrity_failure')) s-=15;
  return {s:Math.max(15,Math.min(100,s)),kind:'generic',branch:(cwC>0?'gen_scored':'gen_nocw'),cwC};
}

const seen=new Set(); const out=[]; let scanned=0, cbCount=0;
for(const [name,db] of DBS){
  const total=sql(db,"SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;
  const BATCH=250;
  for(let off=0; off<total; off+=BATCH){
    const rows=sql(db,`SELECT JobId AS id, CreatedUtc AS ts, substr(ExecutedWebGitCommitHash,1,8) AS cmt, InputValue AS inp, VerdictLabel AS vl, ResultJson AS rj FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
    for(const row of rows){
      if(seen.has(row.id)) continue; seen.add(row.id); scanned++;
      let r; try{r=JSON.parse(row.rj);}catch(e){continue;}
      if(!isCB(r)) continue; cbCount++;
      const sc=scoreReport(r,row.inp,row.vl);
      out.push({iso:row.ts, score:sc.s, kind:sc.kind, branch:sc.branch, cwC:sc.cwC, cmt:row.cmt||''});
    }
  }
}
out.sort((a,b)=>a.iso<b.iso?-1:1);
const csv='iso,score,kind,branch,cwC,commit\n'+out.map(d=>`${d.iso},${d.score},${d.kind},${d.branch},${d.cwC},${d.cmt}`).join('\n');
fs.mkdirSync(ROOT+'/test-output',{recursive:true});
fs.writeFileSync(ROOT+'/test-output/quality-ts.csv',csv);
console.log(`scanned unique jobs=${scanned}  claimboundary reports scored=${cbCount}`);
console.log(`date range: ${out.length?out[0].iso.slice(0,10):'-'} .. ${out.length?out[out.length-1].iso.slice(0,10):'-'}`);
const bench=out.filter(d=>d.kind==='bench').length;
console.log(`bench=${bench} generic=${out.length-bench}`);
console.log(`wrote ${out.length} datapoints -> test-output/quality-ts.csv`);

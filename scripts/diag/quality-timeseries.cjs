#!/usr/bin/env node
'use strict';
/*
 * Longitudinal claimboundary report-quality time series (read-only).
 * COVERAGE: unions EVERY .db on disk that has a Jobs table (5 of them), deduped by JobId
 *   (first-wins, local main prioritised). Per-DB unique contribution is printed = coverage proof.
 * BRANCH: each report's ExecutedWebGitCommitHash is attributed to a branch via git ancestry
 *   (main / codex-pre-rehome / rehome / Pipeline_V2 / monolithic / other; untracked = no hash).
 * SCORE 0-100 by Captain criteria (Captain_Quality_Expectations.md):
 *   - Q-HF1 hard-failure floor (report_damaged/analysis_generation_failed/llm_provider_error) -> 5/8
 *   - top-level UNVERIFIED -> 20 (bench) / 30 (generic)
 *   - benchmark families (ground truth): in-band(verdict+truth+conf,+/-noise)=95, label-only=65, off-band=30
 *   - generic (no ground truth): base 85, minus 45*(checkworthy-UNVERIFIED rate), minus 15 if verdict_integrity_failure
 * Output CSV: iso,score,kind,branch,src,cwC,commit
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const ROOT = 'C:/DEV/FactHarbor';
// All report-bearing DBs (verified: have a Jobs table). Priority order = dedup preference.
const DBS = [
  ['local-main',  ROOT+'/apps/api/factharbor.db'],
  ['rehome-val',  'C:/DEV/FH-rehome-validation/apps/api/factharbor-rehome-validation.db'],
  ['2f7-isolation','C:/DEV/FH-unverified-2f7-isolation/apps/api/factharbor.db'],
  ['cand-corrected', ROOT+'/test-output/candidate-ranking-corrected/fh-analysis-copy.db'],
  ['cand-extended',  ROOT+'/test-output/candidate-ranking-extended-2026-05-23/factharbor-copy.db'],
];
const sql=(db,q)=>{const o=execFileSync('sqlite3',['-readonly','-json',db,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];};

// ---- branch attribution via git ancestry (cached) ----
const gitOK=(args)=>{try{execFileSync('git',args,{cwd:ROOT,stdio:'ignore'});return true;}catch(e){return false;}};
const exists=c=>gitOK(['rev-parse','--verify','--quiet',c+'^{commit}']);
const isAnc=(c,ref)=>gitOK(['merge-base','--is-ancestor',c,ref]);
const bcache={};
function branchOf(commit){
  if(!commit) return 'untracked';
  if(commit in bcache) return bcache[commit];
  let v;
  if(!exists(commit)) v='unknown-commit';
  else if(isAnc(commit,'main')) v='main';
  else if(isAnc(commit,'codex/current-main-2026-05-27-before-rehome')) v='codex-pre-rehome';
  else if(isAnc(commit,'codex/main-before-v2-rehome')||isAnc(commit,'codex/stabilized-main-rehome-2026-05-27')) v='rehome';
  else if(isAnc(commit,'Pipeline_V2')) v='Pipeline_V2';
  else if(isAnc(commit,'best_monolithic_canonical')) v='monolithic';
  else v='other-branch';
  bcache[commit]=v; return v;
}

const spec=JSON.parse(fs.readFileSync(ROOT+'/Docs/AGENTS/benchmark-expectations.json','utf8'));
const noise=spec.noiseTolerancePct??8;
const fams=spec.families.map(f=>({inp:f.inputValue, exp:new Set(f.expectedVerdictLabels.map(x=>x.toUpperCase())), tb:f.truthPercentageBand, cb:f.confidenceBand, slug:f.slug}));
const HARD=['report_damaged','analysis_generation_failed','llm_provider_error'];

// V1 ONLY: meta.pipeline must be exactly 'claimboundary' (excludes 'claimboundary-v2' and monolithic).
function isV1(r){ return (r.meta&&r.meta.pipeline)==='claimboundary'; }
function scoreReport(r,input,label){
  const wt=new Set((r.analysisWarnings||[]).map(w=>w&&w.type));
  const hard=HARD.some(h=>wt.has(h));
  const top=String(label||r.verdict||'').toUpperCase();
  const fam=fams.find(f=>f.inp===input);
  const acs=(r.understanding&&r.understanding.atomicClaims)||[];
  const cw={}; for(const a of acs) if(a&&a.id!=null) cw[a.id]=a.checkWorthiness;
  let cwC=0,cwU=0; for(const v of (r.claimVerdicts||[])){const c=cw[v.claimId]; if(c==='medium'||c==='high'){cwC++; if(v.verdict==='UNVERIFIED')cwU++;}}
  if(fam){
    if(hard) return {s:5,kind:'bench',cwC};
    if(top==='UNVERIFIED') return {s:20,kind:'bench',cwC};
    const labelOK=fam.exp.has(top);
    const t=r.truthPercentage, c=r.confidence;
    const truthOK=typeof t==='number'&&t>=fam.tb.min-noise&&t<=fam.tb.max+noise;
    const confOK=typeof c==='number'&&c>=fam.cb.min&&c<=fam.cb.max;
    if(labelOK&&truthOK&&confOK) return {s:95,kind:'bench',cwC};
    if(labelOK) return {s:65,kind:'bench',cwC};
    return {s:30,kind:'bench',cwC};
  }
  if(hard) return {s:8,kind:'generic',cwC};
  if(top==='UNVERIFIED') return {s:30,kind:'generic',cwC};
  let s=85;
  if(cwC>0) s-=45*(cwU/cwC);
  if(wt.has('verdict_integrity_failure')) s-=15;
  return {s:Math.max(15,Math.min(100,s)),kind:'generic',cwC};
}

const seen=new Set(); const out=[]; const perDb={}; const perBranch={};
for(const [name,db] of DBS){
  if(!fs.existsSync(db)){ perDb[name]={scanned:0,added:0,missing:true}; continue; }
  let total; try{ total=sql(db,"SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n; }catch(e){ perDb[name]={scanned:0,added:0,noJobs:true}; continue; }
  perDb[name]={scanned:0,added:0,total};
  const BATCH=250;
  for(let off=0; off<total; off+=BATCH){
    const rows=sql(db,`SELECT JobId AS id, CreatedUtc AS ts, ExecutedWebGitCommitHash AS cmt, InputValue AS inp, VerdictLabel AS vl, ResultJson AS rj FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
    for(const row of rows){
      perDb[name].scanned++;
      if(seen.has(row.id)) continue; seen.add(row.id);
      let r; try{r=JSON.parse(row.rj);}catch(e){continue;}
      if(!isV1(r)) continue;
      perDb[name].added++;
      const sc=scoreReport(r,row.inp,row.vl);
      const raw=row.cmt||'';
      const base=(raw.match(/^[0-9a-f]{7,40}/i)||[''])[0]; // drop +dirty / +<overlay> suffix
      const dirty=/\+/.test(raw)?1:0;
      const br=branchOf(base);
      perBranch[br]=(perBranch[br]||0)+1;
      out.push({iso:row.ts, score:sc.s, kind:sc.kind, branch:br, src:name, dirty, cwC:sc.cwC, cmt:base.slice(0,12)});
    }
  }
}
out.sort((a,b)=>a.iso<b.iso?-1:1);
const csv='iso,score,kind,branch,src,dirty,cwC,commit\n'+out.map(d=>`${d.iso},${d.score},${d.kind},${d.branch},${d.src},${d.dirty},${d.cwC},${d.cmt}`).join('\n');
fs.mkdirSync(ROOT+'/test-output',{recursive:true});
fs.writeFileSync(ROOT+'/test-output/quality-ts.csv',csv);

console.log('# COVERAGE — per-DB unique claimboundary reports added (dedup by JobId, first-wins):');
for(const [name] of DBS){const d=perDb[name]; console.log(`  ${name.padEnd(15)} ${d.missing?'(missing)':d.noJobs?'(no Jobs table)':`scanned=${d.scanned} unique-CB-added=${d.added}  (db total succeeded=${d.total})`}`);}
console.log(`\n# TOTAL unique claimboundary reports scored = ${out.length}`);
console.log(`  date range: ${out.length?out[0].iso.slice(0,10):'-'} .. ${out.length?out[out.length-1].iso.slice(0,10):'-'}`);
const bench=out.filter(d=>d.kind==='bench').length; console.log(`  bench=${bench} generic=${out.length-bench}`);
console.log('\n# BRANCH attribution (by base-commit ancestry; +dirty/+overlay suffix stripped):');
for(const [b,n] of Object.entries(perBranch).sort((a,b)=>b[1]-a[1])) console.log(`  ${b.padEnd(16)} ${n}`);
const dirtyN=out.filter(d=>d.dirty).length;
console.log(`\n# DIRTY working-tree reports (ran on a modified tree — experiments): ${dirtyN}/${out.length} (${(100*dirtyN/out.length).toFixed(0)}%)`);
console.log(`\nwrote ${out.length} datapoints -> test-output/quality-ts.csv`);

#!/usr/bin/env node
'use strict';
/* Why does the Stage-1 contract validator abort (preservesContract=false → report_damaged)? Read-only.
 * Dumps contractValidationSummary shape + reason fields + which INPUTS trip it. */
const { execFileSync } = require('node:child_process');
const fs=require('node:fs'); const path=require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const bench=JSON.parse(fs.readFileSync(path.join(ROOT,'Docs','AGENTS','benchmark-expectations.json'),'utf8'));
const benchInputs=new Set(bench.families.filter(f=>f.inputValue).map(f=>f.inputValue));

// report_damaged jobs only (the LIKE keeps it cheap; we re-confirm on parse)
const rows=sql(`SELECT InputValue, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL AND ResultJson LIKE '%report_damaged%' ORDER BY CreatedUtc ASC`);
let n=0; const keyU={}; const reasonTally={}; const inputTally={}; let benchN=0, nonBenchN=0; const samples=[];
const inc=(o,k)=>{o[k]=(o[k]||0)+1;};
for(const row of rows){
  let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
  const W=r.analysisWarnings||[]; const rd=W.find(w=>w&&w.type==='report_damaged');
  if(!rd || !/faithfully extract/.test(rd.message||'')) continue; // the contract-preservation variant only
  n++;
  const cvs=(r.understanding&&r.understanding.contractValidationSummary)||{};
  for(const k of Object.keys(cvs)) inc(keyU,k);
  // try common reason-bearing fields
  const reason = cvs.failureReason || cvs.reason || cvs.explanation || cvs.summary ||
    (Array.isArray(cvs.violations)&&cvs.violations.join('; ')) ||
    (Array.isArray(cvs.failedRules)&&cvs.failedRules.join(',')) ||
    (cvs.preservesContract===false?'(preservesContract=false, no text reason field)':'(?)');
  inc(reasonTally, String(reason).slice(0,90));
  inc(inputTally, (row.InputValue||'?').slice(0,60));
  if(benchInputs.has(row.InputValue)) benchN++; else nonBenchN++;
  if(samples.length<2) samples.push({input:(row.InputValue||'').slice(0,60), cvs:JSON.stringify(cvs).slice(0,700)});
}
const topN=(o,k=12)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,k);
console.log(`# CONTRACT-PRESERVATION ABORT DRILL — ${n} contract-variant report_damaged jobs (read-only)\n`);
console.log(`benchmark-input jobs: ${benchN} | non-benchmark inputs: ${nonBenchN}\n`);
console.log(`## contractValidationSummary keys (jobs/${n})`); for(const [k,v] of topN(keyU,20)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n## reason field (top)`); for(const [k,v] of topN(reasonTally,12)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n## inputs tripping it (top)`); for(const [k,v] of topN(inputTally,15)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n## sample contractValidationSummary objects:`); for(const s of samples) console.log(`  [${s.input}]\n   ${s.cvs}`);

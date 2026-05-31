#!/usr/bin/env node
'use strict';
/* report_damaged abort drill. Read-only. For every SUCCEEDED job carrying a report_damaged
 * warning: co-occurring warning types, the report_damaged message/details, and meta shape
 * (claimCount/boundaryCount/llmCalls/evidence). Finds the common abort pattern. */
const { execFileSync } = require('node:child_process');
const fs=require('node:fs'); const path=require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const total=sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;

let rdJobs=0; const coWarn={}; const msg={}; const cc={}, bc={}; let sumLlm=0, sumEv=0, withVerdicts=0, withContractSummary=0;
const inc=(o,k)=>{o[k]=(o[k]||0)+1;};
const BATCH=200;
for(let off=0;off<total;off+=BATCH){
  const rows=sql(`SELECT ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
    const W=r.analysisWarnings||[];
    const rd=W.find(w=>w&&w.type==='report_damaged'); if(!rd) continue;
    rdJobs++;
    const seen=new Set();
    for(const w of W){ if(w&&w.type&&w.type!=='report_damaged'&&!seen.has(w.type)){ seen.add(w.type); inc(coWarn,w.type); } }
    const m=(rd.message||(rd.details&&JSON.stringify(rd.details))||'(empty)').slice(0,70); inc(msg,m);
    const meta=r.meta||{};
    inc(cc,String(meta.claimCount!=null?meta.claimCount:'?'));
    inc(bc,String(meta.boundaryCount!=null?meta.boundaryCount:'?'));
    sumLlm+=Number(meta.llmCalls)||0; sumEv+=(r.evidenceItems||[]).length;
    if((r.claimVerdicts||[]).length) withVerdicts++;
    if(r.understanding&&r.understanding.contractValidationSummary) withContractSummary++;
  }
}
const topN=(o,n=10)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);
console.log(`# REPORT_DAMAGED DRILL (read-only) — ${rdJobs} jobs carry report_damaged (of ${total} SUCCEEDED)\n`);
console.log(`meanLlmCalls=${(sumLlm/rdJobs).toFixed(1)}  meanEvidenceItems=${(sumEv/rdJobs).toFixed(1)}  withClaimVerdicts=${withVerdicts}/${rdJobs}  withContractValidationSummary=${withContractSummary}/${rdJobs}\n`);
console.log(`## Co-occurring warning types (jobs out of ${rdJobs})`);
for(const [k,v] of topN(coWarn,15)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n## report_damaged message/detail (top, first 70c)`);
for(const [k,v] of topN(msg,12)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n## claimCount distribution`); for(const [k,v] of topN(cc,8)) console.log(`  claimCount=${k}: ${v}`);
console.log(`## boundaryCount distribution`); for(const [k,v] of topN(bc,8)) console.log(`  boundaryCount=${k}: ${v}`);

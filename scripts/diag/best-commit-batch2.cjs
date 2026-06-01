#!/usr/bin/env node
'use strict';
/* Best-commit Phase-2 — submit the 8 remaining family jobs, paced under the 5/min AnalyzePerIp
 * limit (18s spacing + 429 backoff), poll to completion, write .bestcommit_results2.jsonl. */
const fs = require('node:fs');
const BASE = 'http://localhost:3000';
const INVITE = 'SELF-TEST';
const OUT = '.bestcommit_results2.jsonl';
const FAM = {
  bundesrat_rk: 'Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben',
  bolsonaro_en: 'Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?',
  asylum_235k: 'Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz',
  hydrogen_en: 'Using hydrogen for cars is more efficient than using electricity',
  asylum_wwii: '235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.',
};
const PLAN = [['bundesrat_rk',1],['bolsonaro_en',3],['asylum_235k',2],['hydrogen_en',1],['asylum_wwii',1]];
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function submitOnce(input){
  const r = await fetch(`${BASE}/api/fh/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({inputType:'text',inputValue:input,inviteCode:INVITE})});
  if(r.status===429) return {retry:true};
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return {jid:(await r.json()).jobId};
}
async function submit(input){
  for(let a=0;a<6;a++){ const r=await submitOnce(input); if(r.jid) return r.jid; if(r.retry){console.log('  429 — backoff 60s'); await sleep(60000);} }
  throw new Error('429 exhausted');
}
async function status(jid){ const r=await fetch(`${BASE}/api/fh/jobs/${jid}`); if(!r.ok) return {status:'ERR'}; return r.json(); }
(async()=>{
  const jobs=[];
  for(const [fam,c] of PLAN){ for(let i=0;i<c;i++){
    try{ const jid=await submit(FAM[fam]); jobs.push({jid,family:fam}); console.log(`submitted ${fam} ${jid.slice(0,8)}`);}catch(e){console.log(`FAIL ${fam}: ${e.message}`);}
    await sleep(18000);
  }}
  fs.writeFileSync('.bestcommit_jobs2.json',JSON.stringify(jobs,null,2));
  console.log(`\n${jobs.length} submitted. Polling…`);
  const done={}; const deadline=Date.now()+75*60*1000; fs.writeFileSync(OUT,'');
  while(Object.keys(done).length<jobs.length && Date.now()<deadline){
    for(const {jid,family} of jobs){ if(done[jid])continue; let j; try{j=await status(jid);}catch{continue;}
      if(['SUCCEEDED','FAILED','CANCELLED','ERR'].includes(j.status)){
        let r=null; try{r=typeof j.resultJson==='string'?JSON.parse(j.resultJson):j.resultJson;}catch{}
        const rec={jid,family,status:j.status,commit:(j.executedWebGitCommitHash||'').slice(0,8),
          verdict:r&&r.verdict,truth:r&&r.truthPercentage,conf:r&&r.confidence,
          boundaries:r&&(r.claimBoundaries||[]).length,evidence:r&&(r.evidenceItems||[]).length,
          warnings:r&&(r.analysisWarnings||[]).map(w=>w.type).join(','),issue:j.analysisIssueCode||null};
        done[jid]=rec; fs.appendFileSync(OUT,JSON.stringify(rec)+'\n');
        console.log(`DONE ${family} ${jid.slice(0,8)} ${j.status} ${rec.verdict||''} ${rec.truth??''}/${rec.conf??''}`);
      }}
    if(Object.keys(done).length<jobs.length) await sleep(20000);
  }
  console.log(`\nFINISHED ${Object.keys(done).length}/${jobs.length}. -> ${OUT}`);
})();

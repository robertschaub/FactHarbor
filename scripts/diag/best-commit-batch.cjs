#!/usr/bin/env node
'use strict';
/* Best-commit Phase-2 (current HEAD), ≤14 runs. Submits the benchmark-family jobs to the
 * LOCAL stack (localhost:3000 -> main API -> main DB, visible on :3000), polls to completion,
 * records results. Read-only w.r.t. code; only submits analysis jobs. */
const fs = require('node:fs');
const path = require('node:path');
const BASE = process.env.FH_WEB_URL || 'http://localhost:3000';
const INVITE = process.env.FH_INVITE || 'SELF-TEST';
const OUT = path.join(process.cwd(), '.bestcommit_results.jsonl');
const JOBS = path.join(process.cwd(), '.bestcommit_jobs.json');

const FAM = {
  plastic_en: 'Plastic recycling is pointless',
  bundesrat_rk: 'Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben',
  bolsonaro_en: 'Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?',
  asylum_235k: 'Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz',
  hydrogen_en: 'Using hydrogen for cars is more efficient than using electricity',
  asylum_wwii: '235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.',
};
// remaining 13 (plastic #1 already submitted as f361fa68)
const PLAN = [
  ['plastic_en',3], ['bundesrat_rk',3], ['bolsonaro_en',3], ['asylum_235k',2], ['hydrogen_en',1], ['asylum_wwii',1],
];

const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function submit(input){
  const r = await fetch(`${BASE}/api/fh/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({inputType:'text',inputValue:input,inviteCode:INVITE})});
  if(!r.ok) throw new Error(`submit HTTP ${r.status}`);
  return (await r.json()).jobId;
}
async function status(jid){
  const r = await fetch(`${BASE}/api/fh/jobs/${jid}`); if(!r.ok) return {status:'ERR'};
  return r.json();
}

(async () => {
  const jobs = [];
  // include the pre-submitted validation plastic job if present
  try { const v = fs.readFileSync('.bestcommit_validation_jid.txt','utf8').trim(); if(v) jobs.push({jid:v, family:'plastic_en'}); } catch {}
  for (const [fam,count] of PLAN){
    for (let i=0;i<count;i++){
      try { const jid = await submit(FAM[fam]); jobs.push({jid,family:fam}); console.log(`submitted ${fam} ${jid.slice(0,8)}`); }
      catch(e){ console.log(`submit FAIL ${fam}: ${e.message}`); }
      await sleep(1500);
    }
  }
  fs.writeFileSync(JOBS, JSON.stringify(jobs,null,2));
  console.log(`\n${jobs.length} jobs submitted. Polling…`);
  // poll
  const done = {}; const deadline = Date.now() + 75*60*1000;
  fs.writeFileSync(OUT,'');
  while (Object.keys(done).length < jobs.length && Date.now() < deadline){
    for (const {jid,family} of jobs){
      if (done[jid]) continue;
      let j; try { j = await status(jid); } catch { continue; }
      if (['SUCCEEDED','FAILED','CANCELLED','ERR'].includes(j.status)){
        let r=null; try{ r = typeof j.resultJson==='string'?JSON.parse(j.resultJson):j.resultJson; }catch{}
        const rec = {jid, family, status:j.status,
          commit: (j.executedWebGitCommitHash||'').slice(0,8),
          verdict: r&&r.verdict, truth: r&&r.truthPercentage, conf: r&&r.confidence,
          boundaries: r&&(r.claimBoundaries||[]).length, evidence: r&&(r.evidenceItems||[]).length,
          warnings: r&&(r.analysisWarnings||[]).map(w=>w.type).join(','),
          issue: j.analysisIssueCode||null };
        done[jid]=rec; fs.appendFileSync(OUT, JSON.stringify(rec)+'\n');
        console.log(`DONE ${family} ${jid.slice(0,8)} ${j.status} ${rec.verdict||''} ${rec.truth??''}/${rec.conf??''}`);
      }
    }
    if (Object.keys(done).length < jobs.length) await sleep(20000);
  }
  console.log(`\nFINISHED: ${Object.keys(done).length}/${jobs.length} terminal. Results -> ${OUT}`);
})();

#!/usr/bin/env node
'use strict';
/*
 * Correctness check (read-only): per benchmark family, the IN-BAND rate (verdict label ∈ expected
 * AND truth ∈ band AND confidence ∈ band) for deployed-era vs gated-HEAD-era jobs. This is the
 * reviewers' correct pass-criterion (NOT "fewer UNVERIFIED"). Answers: are HEAD's verdicts on the
 * SAME ground-truthed families wronger/less-in-band than deployed's?  Bands from
 * Docs/AGENTS/benchmark-expectations.json; noiseTolerancePct widens the truth band.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1<<30});const t=o.trim();return t?JSON.parse(t):[];}
const esc=s=>String(s).replace(/'/g,"''");

const spec=JSON.parse(fs.readFileSync(path.join(ROOT,'Docs','AGENTS','benchmark-expectations.json'),'utf8'));
const fams=spec.families; const noise=spec.noiseTolerancePct??8;

function era(c){const s=String(c||'');if(s<'2026-05-01')return 'apr_deployed';if(s<'2026-05-28')return 'may_pregate';return 'may28+_HEAD';}
const ERAS=['apr_deployed','may_pregate','may28+_HEAD'];
const pct=(a,b)=>b?(100*a/b).toFixed(0)+'%':'-';

console.log('# BENCHMARK-BAND CORRECTNESS CHECK — in-band rate by era (read-only)');
console.log(`# in-band = verdict∈expected AND truth∈[band±${noise}] AND confidence∈band ; UNVERIFIED counted separately (not in-band)\n`);

for(const f of fams){
  const exp=new Set((f.expectedVerdictLabels||[]).map(x=>x.toUpperCase()));
  const tb=f.truthPercentageBand||{min:0,max:100}; const cb=f.confidenceBand||{min:0,max:100};
  // exact-input match (avoids the bundesrat prefix collision); fall back handled by reporting N.
  const rows=sql(`SELECT VerdictLabel,CreatedUtc,ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL AND InputValue='${esc(f.inputValue)}'`);
  const E={}; for(const k of ERAS) E[k]={n:0,inband:0,labelOnly:0,unver:0,truths:[]};
  for(const row of rows){
    let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
    const e=E[era(row.CreatedUtc)]; e.n++;
    const label=(row.VerdictLabel||r.verdict||'').toUpperCase();
    const truth=r.truthPercentage, conf=r.confidence;
    if(label==='UNVERIFIED'){ e.unver++; continue; }
    const labelOK=exp.has(label);
    const truthOK=(typeof truth==='number')&&truth>=tb.min-noise&&truth<=tb.max+noise;
    const confOK=(typeof conf==='number')&&conf>=cb.min&&conf<=cb.max;
    if(labelOK) e.labelOnly++;
    if(labelOK&&truthOK&&confOK) e.inband++;
    if(typeof truth==='number') e.truths.push(truth);
  }
  const line=k=>{const e=E[k];return e.n? `${k}: n=${e.n} in-band=${pct(e.inband,e.n)} label-ok=${pct(e.labelOnly,e.n)} UNVER=${pct(e.unver,e.n)}` : `${k}: n=0`;};
  console.log(`## ${f.slug}  exp{${[...exp].join('|')}} truth[${tb.min}-${tb.max}] conf[${cb.min}-${cb.max}]`);
  for(const k of ERAS) console.log(`   ${line(k)}`);
  const A=E.apr_deployed, H=E['may28+_HEAD'];
  if(A.n>=3&&H.n>=3){
    const dA=100*A.inband/A.n, dH=100*H.inband/H.n;
    console.log(`   >>> in-band Δ (HEAD−deployed): ${(dH-dA).toFixed(0)}pp  ${dH<dA-1?'(HEAD WORSE)':dH>dA+1?'(HEAD better)':'(~flat)'}`);
  } else console.log(`   >>> (insufficient same-era N for a controlled Δ)`);
  console.log('');
}

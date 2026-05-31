#!/usr/bin/env node
'use strict';
/* Dev-only diagnostic: extract AtomicClaim decompositions + per-claim ratings
 * for the plastic-en family across all stored reports. Read-only. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function findRepoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT = findRepoRoot(process.cwd());
const DB = process.env.FH_DB_PATH || path.join(ROOT,'apps','api','factharbor.db');
const INPUT = process.argv[2] || 'Plastic recycling is pointless';

function sql(q){const o=execFileSync('sqlite3',['-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const qv = s => `'${String(s).replace(/'/g,"''")}'`;

const rows = sql(`SELECT JobId,ExecutedWebGitCommitHash AS gitcommit,CreatedUtc,VerdictLabel,TruthPercentage,Confidence,ResultJson
  FROM Jobs WHERE Status='SUCCEEDED' AND InputValue=${qv(INPUT)} AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC;`);

console.log(`# INPUT: "${INPUT}"  |  ${rows.length} succeeded reports\n`);

// structure discovery on first row
if (rows.length){
  const r0 = JSON.parse(rows[0].ResultJson);
  console.error('TOP KEYS:', Object.keys(r0).join(', '));
  const cv0 = (r0.claimVerdicts||[])[0];
  if (cv0) console.error('claimVerdict KEYS:', Object.keys(cv0).join(', '));
}

function pick(o, ...keys){ for(const k of keys) if(o && o[k]!=null) return o[k]; return undefined; }

// theme bucketing for evaluative-dimension clustering
function theme(s){
  const t=(s||'').toLowerCase();
  if(/environment|emission|carbon|co2|greenhouse|climate|pollution|landfill|incinerat/.test(t)) return 'ENVIRONMENTAL';
  if(/econom|profit|cost|viable|financ|market|money/.test(t)) return 'ECONOMIC';
  if(/rate|percent|%|actually recycl|share of|proportion|how much|amount of plastic that/.test(t)) return 'RATE/EFFECTIVENESS';
  if(/downcycl|quality|degrad|loop|times|reprocess/.test(t)) return 'QUALITY/DOWNCYCLING';
  if(/energy/.test(t)) return 'ENERGY';
  if(/pointless|useless|worth|futile|no benefit|achieve|effective at reducing|meaningful/.test(t)) return 'OVERALL-EVALUATIVE';
  return 'OTHER';
}
const allClaims = []; // flat list across reports
const out = [];
for (const row of rows){
  let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ continue; }
  const u = r.understanding || {};
  const stmtById = {};
  for (const ac of (u.atomicClaims||u.preFilterAtomicClaims||[])) stmtById[ac.id]=ac.statement;
  const dimById = {};
  for (const ac of (u.atomicClaims||[])) dimById[ac.id]=ac.isDimensionDecomposition;
  const cvs = r.claimVerdicts || [];
  const claims = cvs.map(cv => {
    const text = stmtById[cv.claimId] || pick(cv,'claimText','statement','text') || '(no text)';
    const label = pick(cv,'verdict','verdictLabel','label');
    const truth = pick(cv,'truthPercentage','truthPct','truth');
    const conf = pick(cv,'confidence','conf');
    const sup = (pick(cv,'supportingEvidenceIds')||[]).length;
    const con = (pick(cv,'contradictingEvidenceIds')||[]).length;
    const th = theme(text);
    if(text!=='(no text)') allClaims.push({th,text,label,truth,conf});
    return {text, label, truth, conf, sup, con, th};
  });
  out.push({
    jobId: row.JobId, commit:(row.gitcommit||'').slice(0,8), date:(row.CreatedUtc||'').slice(0,10),
    artVerdict: row.VerdictLabel, artTruth: row.TruthPercentage, artConf: row.Confidence,
    nClaims: claims.length, claims
  });
}

// 1) distribution of claim counts
const byN = {};
out.forEach(o=>{byN[o.nClaims]=(byN[o.nClaims]||0)+1;});
console.log('## Claim-count distribution (nClaims: #reports)');
Object.keys(byN).sort((a,b)=>a-b).forEach(n=>console.log(`  ${n} claims: ${byN[n]} reports`));

// 2) article verdict distribution
const byV = {};
out.forEach(o=>{const k=o.artVerdict||'?';byV[k]=(byV[k]||0)+1;});
console.log('\n## Article verdict distribution');
Object.entries(byV).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k}: ${v}`));

// 3) theme distribution across all atomic claims + per-theme rating stats
function stats(arr){ if(!arr.length) return '-'; const n=arr.length; const m=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length); const truths=arr.map(c=>c.truth).filter(x=>typeof x==='number'); const confs=arr.map(c=>c.conf).filter(x=>typeof x==='number'); const lab={}; arr.forEach(c=>{lab[c.label]=(lab[c.label]||0)+1;}); const labStr=Object.entries(lab).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(' '); return `n=${n} truth≈${m(truths)} (min ${Math.min(...truths)}/max ${Math.max(...truths)}) conf≈${m(confs)} | ${labStr}`; }
const themes={};
allClaims.forEach(c=>{(themes[c.th]=themes[c.th]||[]).push(c);});
console.log('\n## Per-DIMENSION (theme) rating distribution across all reports');
Object.entries(themes).sort((a,b)=>b[1].length-a[1].length).forEach(([th,arr])=>{
  console.log(`\n### ${th}: ${stats(arr)}`);
  // a few example statements
  const ex=[...new Set(arr.map(c=>c.text.replace(/\s+/g,' ')))].slice(0,4);
  ex.forEach(e=>console.log(`   • ${e.slice(0,140)}`));
});

// 4) most common 3-theme decomposition signatures
console.log('\n## Decomposition signatures (sorted themes) for 3-claim reports');
const sig={};
out.filter(o=>o.nClaims===3).forEach(o=>{ const s=o.claims.map(c=>c.th).sort().join(' + '); sig[s]=(sig[s]||0)+1; });
Object.entries(sig).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${v}×  ${k}`));

// 5) dump a representative sample of full decompositions (newest 8)
console.log('\n## Sample full decompositions (newest 8 three-claim reports)');
for (const o of out.filter(o=>o.nClaims===3).slice(-8)){
  console.log(`\n[${o.date} ${o.commit}] ${o.jobId.slice(0,8)}  ART=${o.artVerdict} ${o.artTruth}/${o.artConf}`);
  o.claims.forEach((c,i)=>{
    const t=(c.text||'').replace(/\s+/g,' ').slice(0,150);
    console.log(`   AC${i+1} <${c.th}> [${c.label||'?'} ${c.truth??'?'}/${c.conf??'?'} +${c.sup}/-${c.con}] ${t}`);
  });
}

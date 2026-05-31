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

const out = [];
for (const row of rows){
  let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ continue; }
  const cvs = r.claimVerdicts || [];
  const claims = cvs.map(cv => {
    const text = pick(cv,'claimText','claim','statement','atomicClaimText','text');
    const label = pick(cv,'verdictLabel','verdict','label');
    const truth = pick(cv,'truthPercentage','truthPct','truth');
    const conf = pick(cv,'confidence','conf');
    const sup = (pick(cv,'supportingEvidenceIds')||[]).length;
    const con = (pick(cv,'contradictingEvidenceIds')||[]).length;
    return {text, label, truth, conf, sup, con};
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

// 3) dump every report's claim set (compact)
console.log('\n## Per-report AtomicClaim sets + per-claim ratings');
for (const o of out){
  console.log(`\n[${o.date} ${o.commit}] ${o.jobId.slice(0,8)}  ART=${o.artVerdict} ${o.artTruth}/${o.artConf}  (${o.nClaims} claims)`);
  o.claims.forEach((c,i)=>{
    const t = (c.text||'(no text)').replace(/\s+/g,' ').slice(0,150);
    console.log(`   AC${i+1} [${c.label||'?'} ${c.truth??'?'}/${c.conf??'?'} +${c.sup}/-${c.con}] ${t}`);
  });
}

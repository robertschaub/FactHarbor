#!/usr/bin/env node
'use strict';
/*
 * Best-Commit study — PHASE 1 (free historical screen). Read-only, no LLM calls.
 * Scores every stored report for the 8 scoreable benchmark families against the
 * CURRENT Captain Q-code bands, maps each to the report-affecting code-epoch active
 * at its CreatedUtc, aggregates per (epoch x family) with n>=3, ranks, shortlists.
 * Strategy: Docs/WIP/2026-05-31_Best_Commit_Identification_Strategy_Proposal.md
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT = repoRoot(process.cwd());
const DB = process.env.FH_DB_PATH || path.join(ROOT,'apps','api','factharbor.db');
const norm = ts => String(ts||'').slice(0,19).replace('T',' ');

// ---- 1. report-affecting commits => epoch boundaries (newest first) ----
const REPORT_PATHS = ['apps/web/src/lib/analyzer','apps/web/prompts','apps/web/configs'];
const rawlog = execFileSync('git',['log','--first-parent','--format=%H|%cI','--',...REPORT_PATHS],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
const boundaries = rawlog.trim().split('\n').map(l=>{const [h,d]=l.split('|');return {hash:h.slice(0,8),date:norm(d)};}); // desc by date
function epochFor(createdUtc){
  const d = norm(createdUtc);
  // newest boundary whose date <= d
  for(const b of boundaries){ if(b.date <= d) return b; }
  return boundaries[boundaries.length-1] || {hash:'pre-history',date:'0000'};
}

// ---- 2. families + bands (CURRENT) ----
const bench = JSON.parse(fs.readFileSync(path.join(ROOT,'Docs','AGENTS','benchmark-expectations.json'),'utf8'));
const NOISE = bench.noiseTolerancePct || 8;
const fams = {};
for(const f of bench.families){ if(f.inputValue) fams[f.inputValue] = f; }

// ---- 3. query reports for the 8 families ----
function sql(q){const o=execFileSync('sqlite3',['-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const qv = s => `'${String(s).replace(/'/g,"''")}'`;
const inList = Object.keys(fams).map(qv).join(',');
const rows = sql(`SELECT JobId,InputValue,ExecutedWebGitCommitHash AS gh,CreatedUtc,VerdictLabel,TruthPercentage,Confidence,ResultJson
  FROM Jobs WHERE Status='SUCCEEDED' AND InputValue IN (${inList}) AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC;`);

// ---- 4. Q-code scorecard (severity-tiered penalties from report-quality-expectations.json) ----
function score(r, fam){
  const W = r.analysisWarnings||[];
  const hardFail = W.some(w=>['report_damaged','analysis_generation_failed','llm_provider_error'].includes(w&&w.type));
  const ev = (r.evidenceItems||[]).length;
  const b = (r.claimBoundaries||[]).length || (r.meta&&r.meta.boundaryCount) || 0;
  const cvs = r.claimVerdicts||[];
  const verdict = r.verdict, truth = r.truthPercentage, conf = r.confidence;
  if(hardFail || ev===0 || b===0 || cvs.length===0) return {score:0,broken:true,fails:['Q-HF1']};
  let pen=0; const fails=[];
  if(!cvs.every(cv=>((cv.supportingEvidenceIds||[]).length+(cv.contradictingEvidenceIds||[]).length)>0)){pen+=25;fails.push('Q-HF4');} // HIGH
  if(conf<40){pen+=10;fails.push('Q-HF6');} // MEDIUM
  if(fam.expectedVerdictLabels && !fam.expectedVerdictLabels.includes(verdict)){pen+=25;fails.push('Q-BE1');} // HIGH
  if(fam.truthPercentageBand){const {min,max}=fam.truthPercentageBand; if(truth<min-NOISE||truth>max+NOISE){pen+=25;fails.push('Q-BE2');}} // HIGH
  if(fam.confidenceBand){const {min,max}=fam.confidenceBand; if(conf<min-NOISE||conf>max+NOISE){pen+=10;fails.push('Q-BE3');}} // MEDIUM
  if(fam.minBoundaryCount!=null && b<fam.minBoundaryCount){pen+=10;fails.push('Q-BE4');} // MEDIUM
  if(fam.slug==='plastic-en' && conf>75){pen+=5;fails.push('PLASTIC-CONF-CEILING');} // interpretation-laden ceiling
  return {score:Math.max(0,100-pen),broken:false,fails};
}

// ---- 5. aggregate per (epoch x family) ----
const cells = {}; // key epoch|slug
let parsed=0, skipped=0;
for(const row of rows){
  const fam = fams[row.InputValue]; if(!fam) continue;
  let r; try{ r=JSON.parse(row.ResultJson); }catch(e){ skipped++; continue; } parsed++;
  const ep = epochFor(row.CreatedUtc);
  const s = score(r, fam);
  const key = ep.hash+'|'+fam.slug;
  (cells[key] = cells[key] || {epoch:ep, slug:fam.slug, scores:[], broken:0, n:0, verdicts:{}, firstDate:row.CreatedUtc, lastDate:row.CreatedUtc, commits:new Set()})
  const c = cells[key];
  c.scores.push(s.score); c.n++; if(s.broken)c.broken++;
  const v=row.VerdictLabel||r.verdict||'?'; c.verdicts[v]=(c.verdicts[v]||0)+1;
  if(row.gh) c.commits.add(String(row.gh).slice(0,8));
  if(row.CreatedUtc<c.firstDate)c.firstDate=row.CreatedUtc; if(row.CreatedUtc>c.lastDate)c.lastDate=row.CreatedUtc;
}
const mean = a => a.length? a.reduce((x,y)=>x+y,0)/a.length : 0;
const sd = a => {if(a.length<2)return 0;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};

// ---- 6. report ----
const FAM_SLUGS = bench.families.map(f=>f.slug);
console.log(`# BEST-COMMIT PHASE 1 — historical screen (FREE)`);
console.log(`Reports scored: ${parsed} (parse-skipped ${skipped}) across ${FAM_SLUGS.length} families`);
console.log(`Report-affecting epochs (boundaries): ${boundaries.length}  | newest ${boundaries[0]&&boundaries[0].date} … oldest ${boundaries.at(-1)&&boundaries.at(-1).date}`);
console.log(`Scoring: severity-tiered Q-code penalties (HIGH -25, MEDIUM -10; Q-HF1 broken = 0). Bands: CURRENT benchmark-expectations.json (noise ±${NOISE}).\n`);

const N_MIN = 3;
const epochComposite = {}; // epoch -> {slug:meanScore}
console.log(`## Per-family ranking (epochs with n>=${N_MIN}, by mean Q-code score)`);
for(const slug of FAM_SLUGS){
  const list = Object.values(cells).filter(c=>c.slug===slug && c.n>=N_MIN)
    .map(c=>({...c, mean:mean(c.scores), sd:sd(c.scores)}))
    .sort((a,b)=>b.mean-a.mean);
  const anyN = Object.values(cells).filter(c=>c.slug===slug);
  const totalN = anyN.reduce((s,c)=>s+c.n,0);
  console.log(`\n### ${slug}  (total reports ${totalN}; rankable epochs n>=${N_MIN}: ${list.length})`);
  if(!list.length){ console.log('   — no epoch reaches n>=3; anecdote-only'); continue; }
  for(const c of list.slice(0,6)){
    const vmix=Object.entries(c.verdicts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(' ');
    console.log(`   ${c.epoch.hash} [${c.epoch.date.slice(0,10)}] n=${c.n} mean=${c.mean.toFixed(0)} sd=${c.sd.toFixed(0)} broken=${c.broken} | ${vmix}`);
    epochComposite[c.epoch.hash]=epochComposite[c.epoch.hash]||{};
    epochComposite[c.epoch.hash][slug]=c.mean;
  }
}

console.log(`\n## Composite ranking (equal family weights; epochs covering >=2 families at n>=${N_MIN})`);
const comp = Object.entries(epochComposite).map(([h,fm])=>{
  const slugs=Object.keys(fm); const cmean=mean(Object.values(fm));
  return {hash:h, nFam:slugs.length, cmean, slugs};
}).filter(x=>x.nFam>=2).sort((a,b)=>b.cmean-a.cmean);
for(const x of comp.slice(0,10)){
  console.log(`   ${x.hash}  composite=${x.cmean.toFixed(0)}  families=${x.nFam} [${x.slugs.join(',')}]`);
}
console.log(`\n## SHORTLIST (top composite states covering the most families)`);
for(const x of comp.slice(0,4)){
  console.log(`   → ${x.hash}  composite ${x.cmean.toFixed(0)} over ${x.nFam} families`);
}

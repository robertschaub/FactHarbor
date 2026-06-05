#!/usr/bin/env node
'use strict';
/*
 * Correctness check, grouped by ANALYSIS-EQUIVALENCE to HEAD (read-only) — per Captain:
 * treat a job whose commit has NO analysis-affecting diff vs HEAD as a HEAD sample.
 * "analysis-affecting" = apps/web/prompts + apps/web/configs + apps/web/src/lib/analyzer,
 * EXCLUDING telemetry (metrics.ts, metrics-integration.ts). A job-commit C is HEAD-equiv iff
 * `git diff --quiet C HEAD -- <analysis paths>` (exit 0). Then per benchmark family: in-band
 * rate (verdict+truth+confidence bands) for HEAD-equiv jobs vs older (analysis-differs) jobs.
 */
const { execFileSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1<<30});const t=o.trim();return t?JSON.parse(t):[];}
const esc=s=>String(s).replace(/'/g,"''");

const PATHS=['apps/web/prompts','apps/web/configs','apps/web/src/lib/analyzer',
  ':(exclude)apps/web/src/lib/analyzer/metrics.ts',':(exclude)apps/web/src/lib/analyzer/metrics-integration.ts'];
const equivCache={};
function headEquiv(commit){
  if(!commit) return 'unknown';
  if(commit in equivCache) return equivCache[commit];
  let v;
  try{ execSync(['git','diff','--quiet',commit,'HEAD','--',...PATHS.map(p=>`"${p}"`)].join(' '),{cwd:ROOT,stdio:'ignore'}); v='HEAD'; } // exit 0 = no analysis diff
  catch(e){ v = (e.status===1)?'older':'unknown'; } // 1 = diff present; else (128) bad/missing commit
  equivCache[commit]=v; return v;
}

const spec=JSON.parse(fs.readFileSync(path.join(ROOT,'Docs','AGENTS','benchmark-expectations.json'),'utf8'));
const noise=spec.noiseTolerancePct??8;
const pct=(a,b)=>b?(100*a/b).toFixed(0)+'%':'-';

console.log('# BENCHMARK-BAND CORRECTNESS — grouped by ANALYSIS-EQUIVALENCE to HEAD (read-only)');
console.log(`# HEAD-equiv = job commit has empty analysis-diff vs HEAD (prompts+configs+analyzer, excl telemetry)\n`);

const tot={HEAD:0,older:0,unknown:0};
for(const f of spec.families){
  const exp=new Set((f.expectedVerdictLabels||[]).map(x=>x.toUpperCase()));
  const tb=f.truthPercentageBand||{min:0,max:100}; const cb=f.confidenceBand||{min:0,max:100};
  const rows=sql(`SELECT VerdictLabel, substr(COALESCE(NULLIF(ExecutedWebGitCommitHash,''), GitCommitHash),1,12) AS cmt, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL AND InputValue='${esc(f.inputValue)}'`);
  const B={HEAD:{n:0,inband:0,unver:0},older:{n:0,inband:0,unver:0},unknown:{n:0,inband:0,unver:0}};
  for(const row of rows){
    let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
    const b=B[headEquiv(row.cmt)]; b.n++; tot[headEquiv(row.cmt)]++;
    const label=(row.VerdictLabel||r.verdict||'').toUpperCase();
    if(label==='UNVERIFIED'){ b.unver++; continue; }
    const ok = exp.has(label) && typeof r.truthPercentage==='number' && r.truthPercentage>=tb.min-noise && r.truthPercentage<=tb.max+noise
      && typeof r.confidence==='number' && r.confidence>=cb.min && r.confidence<=cb.max;
    if(ok) b.inband++;
  }
  console.log(`## ${f.slug}`);
  for(const k of ['HEAD','older']){ const b=B[k]; console.log(`   ${k==='HEAD'?'HEAD-equiv':'older    '}: n=${b.n}  in-band=${pct(b.inband,b.n)}  UNVER=${pct(b.unver,b.n)}`); }
  if(B.HEAD.n>=3&&B.older.n>=3){ const d=100*B.HEAD.inband/B.HEAD.n-100*B.older.inband/B.older.n; console.log(`   >>> Δ HEAD-equiv − older: ${d.toFixed(0)}pp`); }
  else console.log(`   >>> (HEAD-equiv n=${B.HEAD.n} too small for a reliable rate)`);
  console.log('');
}
console.log(`# TOTALS across families: HEAD-equiv ${tot.HEAD} jobs, older ${tot.older}, unknown/missing ${tot.unknown}`);

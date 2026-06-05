#!/usr/bin/env node
'use strict';
/*
 * Multi-branch membership for V1 claimboundary reports (read-only).
 * Per Captain: a report's rating appears under EVERY branch whose history contains its commit
 * (git for-each-ref --contains). Branch filters:
 *   - keep `main` always;
 *   - keep a non-main branch only if it has >=10 DIVERGENT-FROM-MAIN report-commits
 *     (== "fully redundant" branches, which add no report-commit beyond main, are dropped;
 *      "<10 commits" is measured on divergent-from-main report-commits);
 *   - collapse exact mirrors (identical contained-commit set -> keep one, prefer non-origin/shortest).
 * Reads test-output/quality-ts.csv (V1 only). Emits test-output/quality-branch-membership.csv
 * (branch,iso,score,kind,dirty) with one row per (survivor-branch, contained-report) pair,
 * plus an `untracked (no commit)` series and an `orphan (no branch)` series. Prints a survivor gate.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const ROOT = 'C:/DEV/FactHarbor';

const L = fs.readFileSync(ROOT+'/test-output/quality-ts.csv','utf8').trim().split('\n').slice(1);
const reports = L.map(l=>{const p=l.split(','); return {iso:p[0],score:+p[1],kind:p[2],src:p[4]||'',dirty:+p[5],commit:p[7]||'',builddate:p[8]||''};});

const commits = [...new Set(reports.filter(r=>r.commit).map(r=>r.commit))];
const contain = {};
for(const c of commits){
  let out=''; try{ out=execFileSync('git',['for-each-ref','--contains',c,'--format=%(refname:short)','refs/heads','refs/remotes'],{cwd:ROOT,encoding:'utf8',maxBuffer:1<<24}); }catch(e){ out=''; }
  contain[c]=out.split('\n').map(s=>s.trim()).filter(Boolean);
}

const B={};
for(const r of reports){
  if(!r.commit) continue;
  for(const br of (contain[r.commit]||[])){ (B[br]=B[br]||{commits:new Set(),reps:[]}); B[br].commits.add(r.commit); B[br].reps.push(r); }
}
const mainCommits = B['main'] ? B['main'].commits : new Set();
const info={};
for(const [br,d] of Object.entries(B)){
  const div=[...d.commits].filter(c=>!mainCommits.has(c)).length;
  info[br]={n:d.reps.length, commits:d.commits.size, div, reps:d.reps, dirty:d.reps.filter(x=>x.dirty).length, key:[...d.commits].sort().join(',')};
}
let survivors=Object.keys(info).filter(br=> br==='main' || info[br].div>=10);
// collapse exact mirrors
const byKey={}; for(const br of survivors){ (byKey[info[br].key]=byKey[info[br].key]||[]).push(br); }
let kept=[]; for(const grp of Object.values(byKey)){ grp.sort((a,b)=> (a.startsWith('origin/')?1:0)-(b.startsWith('origin/')?1:0) || a.length-b.length || a.localeCompare(b)); kept.push(grp[0]); }
if(info['main'] && !kept.includes('main')) kept.push('main');

const untracked = reports.filter(r=>!r.commit);
const orphans = reports.filter(r=>r.commit && (contain[r.commit]||[]).length===0);

const rows=[];
for(const br of kept) for(const r of info[br].reps) rows.push(`${br},${r.builddate},${r.iso},${r.score},${r.kind},${r.dirty}`);
for(const r of untracked) rows.push(`untracked (no commit),${r.builddate},${r.iso},${r.score},${r.kind},${r.dirty}`);
for(const r of orphans) rows.push(`orphan (no branch),${r.builddate},${r.iso},${r.score},${r.kind},${r.dirty}`);
// PROD (deployed instance) — provenance series, NOT a branch; also counted under its commit's branch above.
const prod = reports.filter(r=>r.src==='prod');
for(const r of prod) rows.push(`PROD (deployed),${r.builddate},${r.iso},${r.score},${r.kind},${r.dirty}`);
// qbd d3ad26ca — deliberately-run reports at the quality_before_decline build (Mar 8), distinct marker.
const qbd = reports.filter(r=>r.src==='qbd-d3ad26ca');
for(const r of qbd) rows.push(`qbd d3ad26ca (Mar 8),${r.builddate},${r.iso},${r.score},${r.kind},${r.dirty}`);
fs.writeFileSync(ROOT+'/test-output/quality-branch-membership.csv','branch,builddate,iso,score,kind,dirty\n'+rows.join('\n'));

console.log('# SURVIVOR-BRANCH GATE (main-anchored; multi-membership; V1 claimboundary only)');
console.log('# keep main; else >=10 divergent-from-main report-commits; collapse exact mirrors\n');
for(const br of kept.slice().sort((a,b)=>info[b].n-info[a].n))
  console.log(`  KEEP  ${br.padEnd(46)} reports=${String(info[br].n).padStart(4)}  contained-commits=${String(info[br].commits).padStart(3)}  divergent-from-main=${String(info[br].div).padStart(3)}  dirty=${info[br].dirty}`);
console.log(`\n  untracked (no commit recorded, pre ~Mar 28): ${untracked.length}`);
console.log(`  orphan (commit on no branch tip): ${orphans.length}`);
const dropped=Object.keys(info).filter(br=>!kept.includes(br)).sort();
console.log(`\n# DROPPED branches (${dropped.length}) — redundant (<10 divergent) or mirrors:`);
console.log('  '+dropped.join(', '));
console.log(`\nwrote ${rows.length} membership rows -> test-output/quality-branch-membership.csv`);

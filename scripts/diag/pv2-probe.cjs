#!/usr/bin/env node
'use strict';
// Probe the Pipeline_V2 branch line (read-only): which commits/build-weeks back it, are they
// DIVERGENT from main (genuinely V2-branch code) or shared ancestry, V1-only, bench/generic, dirty?
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const ROOT = 'C:/DEV/FactHarbor';
const gitOK=(a)=>{try{execFileSync('git',a,{cwd:ROOT,stdio:'ignore'});return true;}catch(e){return false;}};
const isAnc=(c,ref)=>gitOK(['merge-base','--is-ancestor',c,ref]);

const L=fs.readFileSync(ROOT+'/test-output/quality-ts.csv','utf8').trim().split('\n').slice(1);
const reps=L.map(l=>{const p=l.split(','); return {iso:p[0],score:+p[1],kind:p[2],src:p[4],dirty:+p[5],commit:p[7],bd:p[8]};})
  .filter(r=>r.commit && r.bd); // need commit + build date

const commits=[...new Set(reps.map(r=>r.commit))];
const inPV2={}, inMain={};
for(const c of commits){ inPV2[c]=isAnc(c,'Pipeline_V2'); inMain[c]=isAnc(c,'main'); }

const pv2 = reps.filter(r=>inPV2[r.commit]);
const wk = c=>{const d=new Date(c.bd.slice(0,10)+'T00:00:00Z'); const day=d.getUTCDay(); const mon=new Date(d); mon.setUTCDate(d.getUTCDate()-((day+6)%7)); return mon.toISOString().slice(0,10);};
const byWk={};
for(const r of pv2){ (byWk[wk(r)]=byWk[wk(r)]||[]).push(r); }
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log('# Pipeline_V2 branch members (V1 only, by BUILD week):');
for(const w of Object.keys(byWk).sort()){
  const a=byWk[w]; const div=a.filter(r=>!inMain[r.commit]);
  console.log(`  build-wk ${w}: n=${String(a.length).padStart(4)} mean=${mean(a.map(r=>r.score)).toFixed(0)}  divergent-from-main=${div.length}  bench=${a.filter(r=>r.kind==='bench').length} generic=${a.filter(r=>r.kind==='generic').length} dirty=${a.filter(r=>r.dirty).length}`);
}
// The latest build-week = the rightmost yellow point. Drill into its distinct commits.
const latest=Object.keys(byWk).sort().pop();
console.log(`\n# LATEST Pipeline_V2 build-week = ${latest} (the rightmost yellow point) — distinct commits:`);
const byC={};
for(const r of byWk[latest]) (byC[r.commit]=byC[r.commit]||[]).push(r);
for(const [c,a] of Object.entries(byC).sort((x,y)=>y[1].length-x[1].length)){
  console.log(`  commit ${c}  build=${a[0].bd.slice(0,10)}  divergent-from-main=${!inMain[c]}  n=${a.length} mean=${mean(a.map(r=>r.score)).toFixed(0)}  bench=${a.filter(r=>r.kind==='bench').length} generic=${a.filter(r=>r.kind==='generic').length} dirty=${a.filter(r=>r.dirty).length}  src=${[...new Set(a.map(r=>r.src))].join(',')}`);
}
// Pipeline_V2-UNIQUE (divergent-from-main) reports overall — the genuinely-V2-branch part
const uniq=pv2.filter(r=>!inMain[r.commit]);
console.log(`\n# Pipeline_V2 DIVERGENT-from-main (genuinely V2-branch code) reports total: ${uniq.length}`);
console.log(`  build-date range: ${uniq.map(r=>r.bd.slice(0,10)).sort()[0]} .. ${uniq.map(r=>r.bd.slice(0,10)).sort().pop()}  mean=${mean(uniq.map(r=>r.score)).toFixed(0)}  bench=${uniq.filter(r=>r.kind==='bench').length} generic=${uniq.filter(r=>r.kind==='generic').length}`);
const uc=[...new Set(uniq.map(r=>r.commit))];
console.log(`  distinct divergent commits with reports: ${uc.length}`);

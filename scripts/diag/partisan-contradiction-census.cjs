#!/usr/bin/env node
'use strict';
/* Read-only census: how often is an INTERESTED-PARTY's own argument/allegation cited as
 * DIRECT CONTRADICTION, and does it co-occur with a false-side/UNVERIFIED verdict?
 * Sizes the §99 partisan-contestation issue before deciding generic-lever vs documented-limitation.
 * Heuristic text match (diagnostic tooling only — NOT report-generation logic). */
const { execFileSync } = require('node:child_process');
const fs=require('node:fs'); const path=require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const bench=JSON.parse(fs.readFileSync(path.join(ROOT,'Docs','AGENTS','benchmark-expectations.json'),'utf8'));
// true-side families = band min >= 50 (LEANING-TRUE+)
const trueSideInputs=new Set(bench.families.filter(f=>f.inputValue && f.truthPercentageBand && f.truthPercentageBand.min>=50).map(f=>f.inputValue));

const PARTY=/\b(defen[cs]e|defendant|lawyer|attorney|counsel|appellant|the accused|his team|her team|their team)\b/i;
const ARGUE=/\b(argu|alleg|claim|contend|assert|maintain|insist|stat(e|ed|es|ing)|deny|denies|denied|dispute)\b/i;
const isPartyAllegation=(s)=> typeof s==='string' && PARTY.test(s) && ARGUE.test(s);
const total=sql("SELECT COUNT(*) AS n FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL")[0].n;

let scanned=0;
let claimsWithContra=0, claimsWithPartyContra=0, claimsPartyMajority=0;
let falseSideClaims=0, falseSideDrivenByParty=0;       // claim truth<50 OR UNVERIFIED, party-allegation is majority of contra
let trueSideClaimsPartyDriven=0, trueSideJobsAffected=0;
let totalContraDirect=0, partyContraDirect=0;
const verdictDistOfPartyMajority={};
const BATCH=200;
for(let off=0;off<total;off+=BATCH){
  const rows=sql(`SELECT InputValue, ResultJson FROM Jobs WHERE Status='SUCCEEDED' AND ResultJson IS NOT NULL ORDER BY CreatedUtc ASC LIMIT ${BATCH} OFFSET ${off}`);
  for(const row of rows){
    let r; try{r=JSON.parse(row.ResultJson);}catch(e){continue;}
    scanned++;
    const ev=new Map((r.evidenceItems||[]).map(e=>[e.id,e]));
    const isTrueSide=trueSideInputs.has(row.InputValue);
    let jobHadTrueSideParty=false;
    for(const v of (r.claimVerdicts||[])){
      const contraIds=(v.contradictingEvidenceIds||[]);
      const contraDirect=contraIds.map(id=>ev.get(id)).filter(e=>e && e.applicability!=='foreign_reaction' && (e.applicability==='direct'||e.applicability===undefined));
      if(contraDirect.length===0) continue;
      claimsWithContra++;
      totalContraDirect+=contraDirect.length;
      const party=contraDirect.filter(e=>isPartyAllegation(e.statement));
      partyContraDirect+=party.length;
      if(party.length>0) claimsWithPartyContra++;
      const partyMajority = party.length>0 && party.length >= Math.ceil(contraDirect.length/2);
      if(partyMajority){
        claimsPartyMajority++;
        verdictDistOfPartyMajority[v.verdict]=(verdictDistOfPartyMajority[v.verdict]||0)+1;
        const falseSide = (typeof v.truthPercentage==='number' && v.truthPercentage<50) || v.verdict==='UNVERIFIED';
        if(falseSide){ falseSideClaims++; falseSideDrivenByParty++; }
        if(isTrueSide){ trueSideClaimsPartyDriven++; jobHadTrueSideParty=true; }
      }
    }
    if(jobHadTrueSideParty) trueSideJobsAffected++;
  }
}
const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'-';
console.log(`# PARTISAN-CONTRADICTION CENSUS (read-only, heuristic) — ${scanned} SUCCEEDED jobs`);
console.log(`true-side benchmark inputs: ${[...trueSideInputs].length} families\n`);
console.log(`contradicting-direct evidence items: ${totalContraDirect}`);
console.log(`  ...matching party-allegation pattern: ${partyContraDirect} (${pct(partyContraDirect,totalContraDirect)})`);
console.log(`\nclaims with >=1 contradicting-direct item: ${claimsWithContra}`);
console.log(`  ...with >=1 party-allegation contradiction: ${claimsWithPartyContra} (${pct(claimsWithPartyContra,claimsWithContra)})`);
console.log(`  ...where party-allegation is MAJORITY of contradiction: ${claimsPartyMajority} (${pct(claimsPartyMajority,claimsWithContra)})`);
console.log(`     of those, landed false-side/UNVERIFIED (party plausibly drove it): ${falseSideDrivenByParty} (${pct(falseSideDrivenByParty,claimsPartyMajority)} of party-majority)`);
console.log(`\nverdict distribution of party-majority-contradiction claims: ${JSON.stringify(verdictDistOfPartyMajority)}`);
console.log(`\n=== TRUE-SIDE families specifically ===`);
console.log(`true-side claims with party-allegation as majority contradiction: ${trueSideClaimsPartyDriven}`);
console.log(`true-side jobs affected: ${trueSideJobsAffected}`);

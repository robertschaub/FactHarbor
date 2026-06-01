#!/usr/bin/env node
'use strict';
/* Read-only: inspect AC_03 contradicting evidence attributes in bolsonaro job 40aa29ed,
 * to locate where §99 (partisan/opinion contestation) should bite. No writes, no LLM. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path');
function repoRoot(d){d=path.resolve(d);for(;;){if(fs.existsSync(path.join(d,'FactHarbor.sln')))return d;const p=path.dirname(d);if(p===d)return process.cwd();d=p;}}
const ROOT=repoRoot(process.cwd());
const DB=process.env.FH_DB_PATH||path.join(ROOT,'apps','api','factharbor.db');
function sql(q){const o=execFileSync('sqlite3',['-readonly','-json',DB,q],{encoding:'utf8',maxBuffer:1024*1024*1024});const t=o.trim();return t?JSON.parse(t):[];}
const rows=sql("SELECT ResultJson FROM Jobs WHERE JobId='40aa29ed7edd4b6b8fb8ecf7411d28d9' AND ResultJson IS NOT NULL");
if(!rows.length){ console.log("job 40aa29ed not found in DB"); process.exit(0); }
const r=JSON.parse(rows[0].ResultJson);
const ev=new Map((r.evidenceItems||[]).map(e=>[e.id,e]));
const ac03=(r.claimVerdicts||[]).find(v=>v.claimId==='AC_03'||v.id==='AC_03');
if(!ac03){ console.log("AC_03 verdict not found; claimVerdicts:", (r.claimVerdicts||[]).map(v=>v.claimId)); process.exit(0); }
console.log("AC_03 verdict:", ac03.verdict, ac03.truthPercentage+"/"+ac03.confidence, "reason:", ac03.verdictReason);
console.log("AC_03 reasoning:", String(ac03.reasoning||'').slice(0,500));
console.log("\ncontradictingEvidenceIds:", (ac03.contradictingEvidenceIds||[]).join(','));
console.log("supportingEvidenceIds:", (ac03.supportingEvidenceIds||[]).join(','));
console.log("\n=== contradicting evidence attributes ===");
for(const id of (ac03.contradictingEvidenceIds||[])){
  const e=ev.get(id); if(!e){ console.log(id,"(not found)"); continue; }
  console.log(`\n${id}: dir=${e.claimDirection} prob=${e.probativeValue} appl=${e.applicability} factualBasis=${e.factualBasis} isContested=${e.isContestedClaim ?? e.isContested} srcType=${e.sourceType}`);
  console.log(`  src: ${String(e.sourceTitle||'').slice(0,70)}`);
  console.log(`  stmt: ${String(e.statement||'').slice(0,180)}`);
}

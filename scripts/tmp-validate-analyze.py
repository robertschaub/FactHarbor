"""Analyze the just-completed /validate job against Phase 3 dimensions."""
import json, os, sys, urllib.request
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

JID = "c20f59e7bf4142968541a51e95e4b9c4"
LKG = "b92201bb47454f7498a1919c4a82c567"  # last-known-good for bundesrat-rechtskraftig
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with urllib.request.urlopen(f"http://localhost:5000/v1/jobs/{JID}", timeout=8) as r:
    d = json.loads(r.read())

rj = d.get("resultJson")
if isinstance(rj, str):
    rj = json.loads(rj)
meta = rj.get("meta", {})

print("=== Job " + JID[:12] + " ===")
print(f"Status={d.get('status')}  Verdict={d.get('verdictLabel')}  Truth={d.get('truthPercentage')}  Conf={d.get('confidence')}")
print(f"meta.executedWebGitCommitHash: {meta.get('executedWebGitCommitHash')}")
print(f"meta.promptContentHash: {(meta.get('promptContentHash') or 'NONE')[:16]}...")
print(f"meta.boundaryCount: {meta.get('boundaryCount')}  claimCount: {meta.get('claimCount')}  llmCalls: {meta.get('llmCalls')}")
print(f"meta.evidenceBalance: {meta.get('evidenceBalance')}")
print(f"meta.mainIterationsUsed: {meta.get('mainIterationsUsed')}  contradictionIterations: {meta.get('contradictionIterationsUsed')}  contradictionSources: {meta.get('contradictionSourcesFound')}")
print(f"meta.modelsUsedAll: {meta.get('modelsUsedAll')}")
print(f"meta.runtimeRoleModels fallbacks: {[(k,v.get('fallbackUsed',False)) for k,v in meta.get('runtimeRoleModels',{}).items() if isinstance(v,dict)]}")
print(f"meta.searchProvider: {meta.get('searchProvider')}   searchProviders: {meta.get('searchProviders')}")
print()
print(f"languageIntent: {rj.get('languageIntent')}")
print()
print(f"sources: {len(rj.get('sources',[]))}   evidenceItems: {len(rj.get('evidenceItems',[]))}   searchQueries: {len(rj.get('searchQueries',[]))}")
warnings = rj.get("analysisWarnings", [])
print(f"warnings ({len(warnings)}):")
for w in warnings[:10]:
    det = w.get("details", {})
    print(f"  [{w.get('severity')}] {w.get('type')} stage={det.get('stage','?')} msg={str(det.get('errorMessage',''))[:80]}")
print()
cvs = rj.get("claimVerdicts", [])
print(f"claimVerdicts ({len(cvs)}):")
for c in cvs:
    print(f"  {c.get('id')}: verdict={c.get('verdict')} truth={c.get('truthPercentage')} conf={c.get('confidence')} contested={c.get('isContested')}")
    reason = c.get("reasoning", "") or ""
    print(f"    reasoning[:200]: {reason[:200]}")
    print(f"    supporting={len(c.get('supportingEvidenceIds',[]))} contradicting={len(c.get('contradictingEvidenceIds',[]))}")
print()
boundaries = rj.get("claimBoundaries", [])
print(f"claimBoundaries ({len(boundaries)}):")
for b in boundaries:
    print(f"  {b.get('id')}: {b.get('shortName') or b.get('name')}  evidence={b.get('evidenceCount')} coherence={b.get('internalCoherence')}")
print()

# Compare to LKG b92201bb
print("=== Regression check vs b92201bb (MIXED 48/72) ===")
from sqlite3 import connect
api_db = os.path.join(REPO, "apps", "api", "factharbor.db")
con = connect(f"file:{api_db}?mode=ro", uri=True)
row = con.execute("SELECT VerdictLabel, TruthPercentage, Confidence, ResultJson FROM Jobs WHERE JobId=?", (LKG,)).fetchone()
if row:
    lkg_rj = json.loads(row[3])
    lkg_meta = lkg_rj.get("meta", {})
    print(f"LKG:     {row[0]}  {row[1]}/{row[2]}   evT={lkg_meta.get('evidenceBalance',{}).get('total')}  calls={lkg_meta.get('llmCalls')}  bc={lkg_meta.get('boundaryCount')}")
    print(f"Current: {d.get('verdictLabel')}  {d.get('truthPercentage')}/{d.get('confidence')}   evT={meta.get('evidenceBalance',{}).get('total')}  calls={meta.get('llmCalls')}  bc={meta.get('boundaryCount')}")
    print(f"Delta: verdict {row[0]} → {d.get('verdictLabel')}   truth {row[1]} → {d.get('truthPercentage')} ({d.get('truthPercentage')-row[1]:+d})   conf {row[2]} → {d.get('confidence')}")

# Expected band
print()
print("=== vs benchmark-expectations.json ===")
with open(os.path.join(REPO, "Docs/AGENTS/benchmark-expectations.json"), "r", encoding="utf-8") as f:
    be = json.load(f)
fam = next(f for f in be["families"] if f["slug"] == "bundesrat-rechtskraftig")
print(f"expectedVerdictLabels: {fam['expectedVerdictLabels']}")
print(f"truthPercentageBand: {fam['truthPercentageBand']}  (noiseTol: {be['noiseTolerancePct']})")
print(f"confidenceBand: {fam['confidenceBand']}")
print(f"minBoundaryCount: {fam['minBoundaryCount']}")
print()
cur_verdict = d.get("verdictLabel")
cur_truth = d.get("truthPercentage")
cur_conf = d.get("confidence")
cur_bc = meta.get("boundaryCount")
noise = be["noiseTolerancePct"]
print(f"Q-BE1 verdict in expected set: {'PASS' if cur_verdict in fam['expectedVerdictLabels'] else 'FAIL (verdict outside expected)'}")
tmin, tmax = fam['truthPercentageBand']['min'], fam['truthPercentageBand']['max']
print(f"Q-BE2 truth {cur_truth} in [{tmin-noise},{tmax+noise}]: {'PASS' if (tmin-noise) <= cur_truth <= (tmax+noise) else 'FAIL (outside band)'}")
cmin, cmax = fam['confidenceBand']['min'], fam['confidenceBand']['max']
print(f"Q-BE3 conf {cur_conf} in [{cmin-noise},{cmax+noise}]: {'PASS' if (cmin-noise) <= cur_conf <= (cmax+noise) else 'FAIL (outside band)'}")
print(f"Q-BE4 boundaryCount {cur_bc} >= {fam['minBoundaryCount']}: {'PASS' if cur_bc >= fam['minBoundaryCount'] else 'FAIL'}")
con.close()

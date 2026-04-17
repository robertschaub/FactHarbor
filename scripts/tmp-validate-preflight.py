"""Temp pre-flight script for /validate bundesrat-rechtskraftig. Read-only.

TEMP SCRIPT. Delete or promote by 2026-05-01 once /validate workflow checks are folded into a maintained tool.
"""
import json, hashlib, os, sys
from sqlite3 import connect
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Canonical input
with open(os.path.join(REPO, "Docs/AGENTS/benchmark-expectations.json"), "r", encoding="utf-8") as f:
    data = json.load(f)
fam = next(f for f in data["families"] if f["slug"] == "bundesrat-rechtskraftig")
iv = fam["inputValue"]
print("=== 1. Canonical inputValue ===")
print(f"  Slug:        {fam['slug']}")
print(f"  InputValue:  {iv}")
print(f"  Length:      {len(iv)} chars")
print(f"  SHA256[:12]: {hashlib.sha256(iv.encode()).hexdigest()[:12]}")
print()

# 2. In-flight jobs
print("=== 2. In-flight jobs (PROCESSING/QUEUED/SUBMITTED) ===")
api_db = os.path.join(REPO, "apps", "api", "factharbor.db")
con = connect(f"file:{api_db}?mode=ro", uri=True)
rows = con.execute(
    "SELECT JobId, Status, CreatedUtc, substr(InputValue,1,60) FROM Jobs WHERE Status IN ('PROCESSING','QUEUED','SUBMITTED') ORDER BY CreatedUtc DESC"
).fetchall()
if rows:
    print(f"  In-flight jobs ({len(rows)}):")
    for r in rows:
        print(f"    {r[0][:8]} status={r[1]} created={r[2]}  input={r[3]}")
else:
    print("  No in-flight jobs. Safe to submit without concurrency pressure.")
print()

# 3. Invite codes
print("=== 3. Invite codes ===")
try:
    tables = con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND lower(name) LIKE '%invite%'"
    ).fetchall()
    if not tables:
        print("  No invite-table found — looking at CLAUDE.md reference for valid codes.")
    else:
        for (t,) in tables:
            cols = con.execute(f"PRAGMA table_info({t})").fetchall()
            print(f"  {t} columns: {[c[1] for c in cols]}")
            sample = con.execute(f"SELECT * FROM {t} LIMIT 5").fetchall()
            for s in sample:
                print(f"    {s}")
except Exception as e:
    print(f"  Error: {e}")
con.close()

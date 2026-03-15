"""
Phase A: Search-Stack Drift Investigation
==========================================
Tests whether search-stack drift is the primary remaining cause of report-quality
degradation relative to quality_window_start (9cdc8889).

Conditions:
  C0 CONTROL   : AUTO mode, stop-on-first-success (current production on main:3000)
  C1 SERPER    : provider="serper" explicit (UCM change on main:3000)
  C2 SERPAPI   : provider="serpapi" explicit (UCM change on main:3000) — historical P2
  C3 ACCUM     : AUTO accumulate until maxResults (worktree on port 3001)

Benchmarks (Phase A standard set):
  B1 EN: Were the various Bolsonaro trials conducted in accordance with Brazilian law
         and international standards of due process?
  B2 PT: Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira
         e os padrões internacionais de due process?
  B3 DE: Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschnitt
         stärker psychisch belastet als vor zehn Jahren.

Guardrails:
  - Cache disabled during all runs (provider must actually be called)
  - Contamination / geography fixes kept enabled
  - No prompt text changes
  - No selfConsistencyTemperature changes
  - Code changes only in worktree (condition C3)
"""

import json
import time
import sys
import urllib.request
import urllib.error
from datetime import datetime

# ============================================================================
# CONFIG
# ============================================================================

API_BASE = "http://localhost:5000"
MAIN_WEB_BASE = "http://localhost:3000"   # main, stop-on-first-success
WORKTREE_WEB_BASE = "http://localhost:3001"  # worktree, accumulation

ADMIN_KEY = "Tabea_Race"
RUNNER_KEY = "Green_Bean22"

BENCHMARKS = [
    ("B1_EN", "Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?"),
    ("B2_PT", "Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process?"),
    ("B3_DE", "Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschnitt stärker psychisch belastet als vor zehn Jahren."),
]

RUNS_PER_CONDITION = 2
JOB_TIMEOUT_SEC = 5400  # 90 minutes max per job (handles queue congestion)

LOG_FILE = "c:/DEV/FactHarbor/scripts/phaseA_live_tracking.md"
RESULTS_FILE = "c:/DEV/FactHarbor/scripts/phaseA_results.json"

# ============================================================================
# API HELPERS
# ============================================================================

def api_request(method, url, data=None, headers=None, timeout=120):
    hdrs = headers or {}
    hdrs["X-Admin-Key"] = ADMIN_KEY
    if data is not None:
        hdrs["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    else:
        body = None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  HTTP {e.code}: {err_body[:300]}")
        raise


def runner_trigger(web_base, job_id):
    hdrs = {"X-Runner-Key": RUNNER_KEY, "Content-Type": "application/json"}
    body = json.dumps({"jobId": job_id}).encode()
    req = urllib.request.Request(f"{web_base}/api/internal/run-job", data=body, headers=hdrs, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read().decode())
        if result.get("accepted"):
            print(f"    Runner accepted")
        else:
            print(f"    Runner response: {result}")
    except Exception as e:
        print(f"    WARNING: runner trigger failed: {e}")


def get_search_config(web_base):
    r = api_request("GET", f"{web_base}/api/admin/config/search/default")
    return json.loads(r["content"]), r["contentHash"]


def put_search_config(web_base, content, label):
    content_str = json.dumps(content, indent=2)
    r = api_request("PUT", f"{web_base}/api/admin/config/search/default", {
        "content": content_str,
        "versionLabel": label,
    })
    content_hash = r["contentHash"]
    api_request("POST", f"{web_base}/api/admin/config/search/default/activate", {
        "contentHash": content_hash,
    })
    print(f"    UCM search config updated: '{label}'")
    return content_hash


def submit_job(input_text, web_base):
    data = {
        "inputType": "text",
        "inputValue": input_text,
        "pipelineVariant": "claimboundary",
    }
    result = api_request("POST", f"{API_BASE}/v1/analyze", data)
    job_id = result["jobId"]
    time.sleep(2)
    runner_trigger(web_base, job_id)
    return job_id


def wait_for_job(job_id, web_base, timeout=JOB_TIMEOUT_SEC):
    start = time.time()
    last_retrigger = start
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(
                f"{API_BASE}/v1/jobs/{job_id}",
                headers={"X-Admin-Key": ADMIN_KEY},
            )
            resp = urllib.request.urlopen(req, timeout=30)
            job = json.loads(resp.read().decode())
            status = job.get("status", "UNKNOWN")
            progress = job.get("progress", 0)
            if status in ("SUCCEEDED", "FAILED", "ERROR"):
                print()
                return job
            elapsed = int(time.time() - start)
            sys.stdout.write(f"\r    [{job_id[:8]}] {status} {progress}% ({elapsed}s)   ")
            sys.stdout.flush()
            # Re-trigger every 5 minutes if still QUEUED (handles queue drift)
            if status == "QUEUED" and (time.time() - last_retrigger) > 300:
                runner_trigger(web_base, job_id)
                last_retrigger = time.time()
        except Exception as e:
            sys.stdout.write(f"\r    [{job_id[:8]}] polling... ({e})   ")
            sys.stdout.flush()
        time.sleep(15)
    print(f"\n    TIMEOUT after {timeout}s")
    return None


def score_job(job):
    rj = job.get("resultJson")
    if not rj:
        return {"score": 0, "truth": None, "conf": None, "ev": 0, "pvh": 0, "pvm": 0, "src": 0, "providers": "none"}

    data = json.loads(rj) if isinstance(rj, str) else rj
    truth = data.get("truthPercentage")
    conf = data.get("confidence")
    ei = data.get("evidenceItems", [])
    sources = data.get("sources", [])
    pv_high = sum(1 for e in ei if e.get("probativeValue") == "high")
    pv_med = sum(1 for e in ei if e.get("probativeValue") == "medium")
    has_dirs = any(e.get("claimDirection") not in (None, "?", "") for e in ei)

    # Same scoring formula as phase1
    score = min(len(ei), 100) + len(sources) * 2
    if conf and conf > 0:
        score += conf / 5
    if truth is not None and truth > 0:
        score += 10
    if has_dirs:
        score += 15
    if pv_high + pv_med > 0:
        score += 15

    # Provider tracking from meta
    meta = data.get("meta", {})
    providers_str = meta.get("searchProviders", meta.get("searchProvider", "?"))

    # Per-query provider breakdown
    sq = data.get("searchQueries", [])
    provider_counts = {}
    for q in sq:
        p = q.get("searchProvider", "?")
        results_count = q.get("resultsCount", 0)
        provider_counts[p] = provider_counts.get(p, {"queries": 0, "results": 0})
        provider_counts[p]["queries"] += 1
        provider_counts[p]["results"] += results_count

    return {
        "score": round(score, 1),
        "truth": round(truth, 1) if truth is not None else None,
        "conf": round(conf, 1) if conf is not None else None,
        "ev": len(ei),
        "pvh": pv_high,
        "pvm": pv_med,
        "src": len(sources),
        "verdict": data.get("verdict", data.get("verdictLabel", "?")),
        "providers": providers_str,
        "provider_counts": provider_counts,
        "queries_total": len(sq),
    }


# ============================================================================
# LOGGING
# ============================================================================

def log(msg, also_print=True):
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    line = f"[{ts}] {msg}"
    if also_print:
        print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def log_result_row(condition, benchmark, run, job_id, metrics):
    providers_short = str(metrics.get("providers", "?"))[:60]
    log(f"  {condition:12} | {benchmark:6} r{run} | job={job_id[:8]} | "
        f"score={metrics['score']:5.1f} truth={metrics.get('truth','?'):5} conf={metrics.get('conf','?'):5} "
        f"ev={metrics['ev']:3} pvh={metrics['pvh']:3} src={metrics['src']:3} | providers: {providers_short}")


# ============================================================================
# WORKTREE DETECTION
# ============================================================================

def check_worktree_available():
    try:
        req = urllib.request.Request(
            f"{WORKTREE_WEB_BASE}/api/admin/config/search/default",
            headers={"X-Admin-Key": ADMIN_KEY},
        )
        urllib.request.urlopen(req, timeout=10)
        print(f"  Worktree server at {WORKTREE_WEB_BASE}: AVAILABLE")
        return True
    except Exception as e:
        print(f"  Worktree server at {WORKTREE_WEB_BASE}: NOT available ({e})")
        return False


# ============================================================================
# CONDITION RUNNERS
# ============================================================================

def run_condition(label, web_base, config_override, original_search, all_results):
    """Run all benchmarks for one condition. Returns list of result dicts."""
    results = []
    log(f"\n{'='*70}")
    log(f"CONDITION: {label}")
    log(f"{'='*70}")

    for bname, btext in BENCHMARKS:
        for run_num in range(1, RUNS_PER_CONDITION + 1):
            log(f"\n  [{bname} r{run_num}] {btext[:70]}...")
            job_id = submit_job(btext, web_base)
            log(f"    Submitted: {job_id[:8]}")
            job = wait_for_job(job_id, web_base)

            if job is None:
                log(f"    TIMEOUT")
                r = {"condition": label, "benchmark": bname, "run": run_num,
                     "job_id": job_id[:8], "status": "TIMEOUT", "score": 0}
            elif job.get("status") != "SUCCEEDED":
                log(f"    FAILED: {job.get('status')}")
                r = {"condition": label, "benchmark": bname, "run": run_num,
                     "job_id": job_id[:8], "status": job.get("status"), "score": 0}
            else:
                metrics = score_job(job)
                log_result_row(label, bname, run_num, job_id, metrics)
                r = {"condition": label, "benchmark": bname, "run": run_num,
                     "job_id": job_id[:8], "status": "OK", **metrics}

            results.append(r)
            all_results.append(r)
    return results


def print_condition_summary(label, results):
    scores = [r["score"] for r in results if r.get("status") == "OK"]
    if not scores:
        print(f"  {label}: NO VALID RESULTS")
        return None
    avg = sum(scores) / len(scores)
    print(f"\n  {label}: avg={avg:.1f} min={min(scores):.1f} max={max(scores):.1f} n={len(scores)}")
    return avg


# ============================================================================
# MAIN
# ============================================================================

LOCK_FILE = "c:/DEV/FactHarbor/scripts/phaseA.lock"


def main():
    # Single-instance guard
    import os
    if os.path.exists(LOCK_FILE):
        print(f"ERROR: Lock file {LOCK_FILE} exists — another instance may be running.")
        print("Delete the lock file manually if it's stale, then retry.")
        sys.exit(1)
    with open(LOCK_FILE, "w") as f:
        import os as _os
        f.write(str(_os.getpid()))

    try:
        _main()
    finally:
        import os
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
        print("\nLock file removed.")


def _main():
    # Init log file
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"# Phase A: Search-Stack Drift Investigation — Live Tracking\n\n")
        f.write(f"**Started:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n")
        f.write(f"**Conditions:** C0=Control(auto-stop), C1=Serper-only, C2=SerpAPI-only, C3=Accumulation(worktree)\n\n")
        f.write(f"**Benchmarks:** B1_EN (Bolsonaro EN), B2_PT (Bolsonaro PT), B3_DE (Zürich school)\n\n")
        f.write(f"**Runs per condition:** {RUNS_PER_CONDITION}\n\n---\n\n")

    log("Phase A: Search-Stack Drift Investigation")
    log(f"Benchmarks: {len(BENCHMARKS)} inputs x {RUNS_PER_CONDITION} runs per condition")

    # Load original search config from main
    log("\n[1] Loading original search config from main...")
    original_search, original_search_hash = get_search_config(MAIN_WEB_BASE)
    log(f"    Original provider: {original_search.get('provider')} | hash: {original_search_hash[:12]}...")

    # Disable cache globally for clean provider testing
    log("\n[2] Disabling search cache for clean provider measurement...")
    search_no_cache = {**original_search, "cache": {**original_search.get("cache", {}), "enabled": False}}
    put_search_config(MAIN_WEB_BASE, search_no_cache, "phaseA-cache-disabled")

    all_results = []
    condition_avgs = {}

    # ------------------------------------------------------------------
    # C0: CONTROL — auto, stop-on-first-success (main)
    # ------------------------------------------------------------------
    control_search = {**search_no_cache, "provider": "auto"}
    put_search_config(MAIN_WEB_BASE, control_search, "phaseA-C0-control-auto")
    c0_results = run_condition("C0_CONTROL", MAIN_WEB_BASE, None, original_search, all_results)
    condition_avgs["C0_CONTROL"] = print_condition_summary("C0_CONTROL", c0_results)

    # ------------------------------------------------------------------
    # C1: SERPER-ONLY (UCM change on main)
    # ------------------------------------------------------------------
    serper_search = {**search_no_cache, "provider": "serper"}
    put_search_config(MAIN_WEB_BASE, serper_search, "phaseA-C1-serper-only")
    c1_results = run_condition("C1_SERPER", MAIN_WEB_BASE, None, original_search, all_results)
    condition_avgs["C1_SERPER"] = print_condition_summary("C1_SERPER", c1_results)

    # ------------------------------------------------------------------
    # C2: SERPAPI-ONLY (UCM change on main — historical P2 provider)
    # ------------------------------------------------------------------
    serpapi_search = {**search_no_cache, "provider": "serpapi"}
    put_search_config(MAIN_WEB_BASE, serpapi_search, "phaseA-C2-serpapi-only")
    c2_results = run_condition("C2_SERPAPI", MAIN_WEB_BASE, None, original_search, all_results)
    condition_avgs["C2_SERPAPI"] = print_condition_summary("C2_SERPAPI", c2_results)

    # ------------------------------------------------------------------
    # C3: ACCUMULATION WORKTREE (only if available on port 3001)
    # ------------------------------------------------------------------
    log("\n[3] Checking worktree availability (port 3001)...")
    worktree_available = check_worktree_available()

    if worktree_available:
        # Set worktree's search config: auto + cache off + both CSE and Serper enabled
        wt_search, _ = get_search_config(WORKTREE_WEB_BASE)
        wt_search_no_cache = {**wt_search, "cache": {**wt_search.get("cache", {}), "enabled": False}, "provider": "auto"}
        put_search_config(WORKTREE_WEB_BASE, wt_search_no_cache, "phaseA-C3-accumulation")
        c3_results = run_condition("C3_ACCUM", WORKTREE_WEB_BASE, None, original_search, all_results)
        condition_avgs["C3_ACCUM"] = print_condition_summary("C3_ACCUM", c3_results)
    else:
        log("  Worktree not available — skipping C3. Start port 3001 server and re-run for full results.")

    # ------------------------------------------------------------------
    # RESTORE original search config on main
    # ------------------------------------------------------------------
    log("\n[4] Restoring original search config on main...")
    put_search_config(MAIN_WEB_BASE, original_search, "phaseA-restored-original")
    log(f"    Restored: provider={original_search.get('provider')} cache={original_search.get('cache',{}).get('enabled')}")

    # ------------------------------------------------------------------
    # COMPARISON SUMMARY
    # ------------------------------------------------------------------
    log(f"\n\n{'='*70}")
    log("PHASE A — COMPARISON SUMMARY")
    log(f"{'='*70}")
    log(f"{'Condition':15} | {'Avg Score':10} | {'N':3} | {'vs Control':12}")
    log("-" * 50)
    ctrl_avg = condition_avgs.get("C0_CONTROL")
    for cond, avg in condition_avgs.items():
        n = len([r for r in all_results if r.get("condition") == cond and r.get("status") == "OK"])
        if avg is None:
            log(f"  {cond:15} | {'NO DATA':10} | {n:3} |")
        else:
            delta = f"{avg - ctrl_avg:+.1f}" if ctrl_avg is not None and cond != "C0_CONTROL" else "baseline"
            log(f"  {cond:15} | {avg:10.1f} | {n:3} | {delta}")

    # Provider breakdown summary
    log(f"\n--- Provider behavior per run ---")
    for r in all_results:
        if r.get("status") == "OK":
            p = str(r.get("providers", "?"))[:80]
            log(f"  {r['condition']:12} | {r['benchmark']:6} r{r['run']} | {p}")

    # Save results
    output = {
        "phase": "A",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "baseline_commit": "9cdc8889",
        "conditions": {
            "C0_CONTROL": "AUTO stop-on-first-success (main)",
            "C1_SERPER": "Serper-only (UCM, main)",
            "C2_SERPAPI": "SerpAPI-only (UCM, main) — historical P2",
            "C3_ACCUM": "AUTO accumulate (worktree, no stop-on-first-success)",
        },
        "condition_averages": condition_avgs,
        "results": all_results,
    }
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    log(f"\n  Results saved to {RESULTS_FILE}")

    # Verdict
    log(f"\n--- VERDICT ---")
    if ctrl_avg is None:
        log("  INSUFFICIENT DATA: control condition failed.")
        return

    best_cond = max((c for c in condition_avgs if condition_avgs[c] is not None), key=lambda c: condition_avgs[c])
    best_avg = condition_avgs[best_cond]

    if best_cond == "C0_CONTROL":
        log("  No improvement from provider changes. Search-stack drift is NOT the primary cause.")
        log("  Recommendation: Proceed to Phase B (prompt quality).")
    elif best_avg - ctrl_avg >= 20:
        log(f"  IMPROVEMENT CONFIRMED: {best_cond} beats control by {best_avg - ctrl_avg:+.1f} points.")
        if best_cond == "C3_ACCUM":
            log("  Search accumulation (code change) explains the quality gap — requires worktree promotion.")
        else:
            log(f"  UCM-level provider fix ({best_cond}) may recover quality without code changes.")
        log("  Recommendation: Proceed to Phase B in parallel; promote search winner to defaults.")
    elif best_avg - ctrl_avg >= 10:
        log(f"  MARGINAL IMPROVEMENT: {best_cond} beats control by {best_avg - ctrl_avg:+.1f} points.")
        log("  Within variance range. Provider quality may contribute but is not the primary cause.")
        log("  Recommendation: Proceed to Phase B; revisit search after prompt quality check.")
    else:
        log(f"  NO MEANINGFUL DIFFERENCE (best delta: {best_avg - ctrl_avg:+.1f}).")
        log("  Search-stack drift is likely not the primary cause.")
        log("  Recommendation: Proceed directly to Phase B (prompt quality).")

    log(f"\nPhase A complete. {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")


if __name__ == "__main__":
    main()

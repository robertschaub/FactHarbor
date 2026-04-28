"""
Phase 1: Binary Gate Experiment
QUARANTINED VALIDATION TOOLING:
This direct /v1/analyze benchmark/forensic script is not supported
release/regression validation automation until migrated through
apps/web/scripts/automatic-claim-selection.js.

Disables all 4 suspects, runs benchmarks, then runs control with defaults.
"""
import json, time, sys, urllib.request, urllib.error

API_BASE = "http://localhost:5000"
WEB_BASE = "http://localhost:3000"
ADMIN_KEY = "Tabea_Race"
RUNNER_KEY = "Green_Bean22"

BENCHMARKS = [
    ("B1", "Plastik recycling bringt nichts"),
    ("B2", "Was Iran actually making nukes?"),
    ("B3", "O julgamento de Bolsonaro foi justo e baseado na legislação vigente"),
]

PIPELINE_OVERRIDES = {
    "evidenceWeightingEnabled": False,
    "applicabilityFilterEnabled": False,
    "foreignJurisdictionRelevanceCap": 1.0,
    "contradictionReservedIterations": 2,
}

CALC_OVERRIDES = {
    "mixedConfidenceThreshold": 40,
}


def api_request(method, url, data=None, headers=None):
    hdrs = headers or {}
    hdrs["X-Admin-Key"] = ADMIN_KEY
    if data is not None:
        hdrs["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    else:
        body = None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=120)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  HTTP {e.code}: {err_body[:200]}")
        raise


def get_current_config():
    result = api_request("GET", f"{WEB_BASE}/api/admin/config/pipeline/default")
    return json.loads(result["content"]), result["contentHash"]


def save_and_activate_config(content, label):
    content_str = json.dumps(content, indent=2)
    result = api_request("PUT", f"{WEB_BASE}/api/admin/config/pipeline/default", {
        "content": content_str,
        "versionLabel": label,
    })
    content_hash = result["contentHash"]
    print(f"  Saved config '{label}' (hash: {content_hash[:12]}...)")

    # Activate
    api_request("POST", f"{WEB_BASE}/api/admin/config/pipeline/default/activate", {
        "contentHash": content_hash,
    })
    print(f"  Activated config '{label}'")
    return content_hash


def trigger_runner(job_id):
    """Manually trigger the runner for a job (bypasses API→Web trigger)."""
    hdrs = {
        "X-Runner-Key": RUNNER_KEY,
        "Content-Type": "application/json",
    }
    body = json.dumps({"jobId": job_id}).encode()
    req = urllib.request.Request(f"{WEB_BASE}/api/internal/run-job", data=body, headers=hdrs, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read().decode())
        if result.get("accepted"):
            print(f"    Runner triggered OK")
        else:
            print(f"    Runner trigger response: {result}")
    except Exception as e:
        print(f"    WARNING: Runner trigger failed: {e}")


def submit_job(input_text):
    data = {
        "inputType": "text",
        "inputValue": input_text,
        "pipelineVariant": "claimboundary",
    }
    result = api_request("POST", f"{API_BASE}/v1/analyze", data)
    job_id = result["jobId"]
    # Manually trigger the runner (API→Web trigger may not be working)
    time.sleep(2)
    trigger_runner(job_id)
    return job_id


def wait_for_job(job_id, timeout=1200):
    start = time.time()
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
                return job
            sys.stdout.write(f"\r    [{job_id[:8]}] {status} {progress}%   ")
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(f"\r    [{job_id[:8]}] polling... ({e})   ")
            sys.stdout.flush()
        time.sleep(10)
    print(f"\n    TIMEOUT after {timeout}s")
    return None


def score_job(job):
    rj = job.get("resultJson")
    if not rj:
        return {"score": 0, "truth": None, "conf": None, "ev": 0, "pvh": 0, "src": 0}

    data = json.loads(rj) if isinstance(rj, str) else rj
    truth = data.get("truthPercentage")
    conf = data.get("confidence")
    ei = data.get("evidenceItems", [])
    sources = data.get("sources", [])
    pv_high = sum(1 for e in ei if e.get("probativeValue") == "high")
    pv_med = sum(1 for e in ei if e.get("probativeValue") == "medium")
    has_dirs = any(e.get("claimDirection") not in (None, "?", "") for e in ei)

    score = min(len(ei), 100) + len(sources) * 2
    if conf and conf > 0:
        score += conf / 5
    if truth is not None and truth > 0:
        score += 10
    if has_dirs:
        score += 15
    if pv_high + pv_med > 0:
        score += 15

    return {
        "score": round(score, 1),
        "truth": round(truth, 1) if truth is not None else None,
        "conf": round(conf, 1) if conf is not None else None,
        "ev": len(ei),
        "pvh": pv_high,
        "src": len(sources),
        "verdict": data.get("verdictLabel", "?"),
    }


def run_benchmark_set(label, runs_per_input=2):
    print(f"\n{'='*60}")
    print(f"  RUNNING: {label} ({runs_per_input} runs per input)")
    print(f"{'='*60}")
    results = []
    for bname, btext in BENCHMARKS:
        for run_num in range(1, runs_per_input + 1):
            print(f"\n  [{bname} run {run_num}/{runs_per_input}] Submitting: {btext[:50]}...")
            job_id = submit_job(btext)
            print(f"    Job: {job_id[:8]}")
            job = wait_for_job(job_id)
            if job is None:
                print(f"\n    FAILED: timeout")
                results.append({"benchmark": bname, "run": run_num, "job_id": job_id[:8], "status": "TIMEOUT", "score": 0})
                continue
            status = job.get("status", "UNKNOWN")
            if status != "SUCCEEDED":
                print(f"\n    FAILED: {status}")
                results.append({"benchmark": bname, "run": run_num, "job_id": job_id[:8], "status": status, "score": 0})
                continue
            metrics = score_job(job)
            print(f"\n    DONE: score={metrics['score']} truth={metrics['truth']}% conf={metrics['conf']}% ev={metrics['ev']} pvh={metrics['pvh']} src={metrics['src']} verdict={metrics['verdict']}")
            results.append({"benchmark": bname, "run": run_num, "job_id": job_id[:8], "status": "OK", **metrics})
    return results


def print_results_table(label, results):
    print(f"\n{'='*80}")
    print(f"  RESULTS: {label}")
    print(f"{'='*80}")
    print(f"{'BM':>4} {'Run':>3} {'JobId':>8} {'Score':>6} {'Truth':>6} {'Conf':>6} {'Ev':>4} {'PvH':>4} {'Src':>4} {'Verdict':<16}")
    print("-" * 80)
    for r in results:
        t = f"{r.get('truth', '?')}" if r.get('truth') is not None else "?"
        c = f"{r.get('conf', '?')}" if r.get('conf') is not None else "?"
        v = r.get("verdict", "?")
        print(f"{r['benchmark']:>4} {r['run']:>3} {r['job_id']:>8} {r.get('score',0):>6.1f} {t:>6} {c:>6} {r.get('ev',0):>4} {r.get('pvh',0):>4} {r.get('src',0):>4} {v:<16}")

    scores = [r["score"] for r in results if r.get("status") == "OK"]
    if scores:
        print(f"\n  AVG SCORE: {sum(scores)/len(scores):.1f}  |  MIN: {min(scores):.1f}  |  MAX: {max(scores):.1f}  |  N={len(scores)}")


def main():
    print("Phase 1: Binary Gate Experiment")
    print("=" * 60)

    # Step 1: Get and save original configs
    print("\n[1] Loading current configs...")
    original_pipeline, original_pipeline_hash = get_current_config()
    print(f"  Pipeline hash: {original_pipeline_hash[:12]}...")

    calc_result = api_request("GET", f"{WEB_BASE}/api/admin/config/calculation/default")
    original_calc = json.loads(calc_result["content"])
    original_calc_hash = calc_result["contentHash"]
    print(f"  Calculation hash: {original_calc_hash[:12]}...")

    # Step 2: Apply disabled config (both pipeline and calculation)
    print("\n[2] Applying disabled-suspects config...")
    disabled_pipeline = {**original_pipeline, **PIPELINE_OVERRIDES}
    save_and_activate_config(disabled_pipeline, "phase1-suspects-disabled")

    disabled_calc = {**original_calc, **CALC_OVERRIDES}
    disabled_calc_str = json.dumps(disabled_calc, indent=2)
    calc_save = api_request("PUT", f"{WEB_BASE}/api/admin/config/calculation/default", {
        "content": disabled_calc_str,
        "versionLabel": "phase1-calc-disabled",
    })
    api_request("POST", f"{WEB_BASE}/api/admin/config/calculation/default/activate", {
        "contentHash": calc_save["contentHash"],
    })
    print(f"  Activated calculation config (mixedConfidenceThreshold=40)")

    # Step 3: Run disabled benchmarks
    disabled_results = run_benchmark_set("DISABLED PROFILE (all suspects off)", runs_per_input=2)
    print_results_table("DISABLED PROFILE", disabled_results)

    # Step 4: Restore original configs
    print("\n\n[4] Restoring original configs...")
    save_and_activate_config(original_pipeline, "phase1-control-restored")

    calc_restore_str = json.dumps(original_calc, indent=2)
    calc_restore = api_request("PUT", f"{WEB_BASE}/api/admin/config/calculation/default", {
        "content": calc_restore_str,
        "versionLabel": "phase1-calc-control-restored",
    })
    api_request("POST", f"{WEB_BASE}/api/admin/config/calculation/default/activate", {
        "contentHash": calc_restore["contentHash"],
    })
    print(f"  Restored calculation config")

    # Step 5: Run control benchmarks
    control_results = run_benchmark_set("CONTROL (production defaults)", runs_per_input=2)
    print_results_table("CONTROL", control_results)

    # Step 6: Compare
    disabled_scores = [r["score"] for r in disabled_results if r.get("status") == "OK"]
    control_scores = [r["score"] for r in control_results if r.get("status") == "OK"]

    print(f"\n\n{'='*60}")
    print("  PHASE 1 COMPARISON")
    print(f"{'='*60}")
    if disabled_scores and control_scores:
        d_avg = sum(disabled_scores) / len(disabled_scores)
        c_avg = sum(control_scores) / len(control_scores)
        print(f"  Disabled avg: {d_avg:.1f}  (n={len(disabled_scores)})")
        print(f"  Control avg:  {c_avg:.1f}  (n={len(control_scores)})")
        print(f"  Delta:        {d_avg - c_avg:+.1f}")
        print()
        if d_avg >= 170 and c_avg <= 140:
            print("  VERDICT: REGRESSION CONFIRMED in suspects. Proceed to Phase 2.")
        elif d_avg >= 170 and c_avg > 140:
            print("  VERDICT: Disabled profile improved, but control is not as bad as expected.")
            print("           Suspects are contributing, but may not be sole cause.")
        elif abs(d_avg - c_avg) < 20:
            print("  VERDICT: NO SIGNIFICANT DIFFERENCE. Regression may be elsewhere.")
            print("           Consider Phase 3 (search-stack drift).")
        else:
            print(f"  VERDICT: Mixed results. Disabled={'better' if d_avg > c_avg else 'worse'}.")
            print("           Further investigation needed.")
    else:
        print("  INSUFFICIENT DATA for comparison.")

    # Check for tiebreakers needed
    for bname, _ in BENCHMARKS:
        b_scores = [r["score"] for r in disabled_results if r["benchmark"] == bname and r.get("status") == "OK"]
        if len(b_scores) == 2 and abs(b_scores[0] - b_scores[1]) > 25:
            print(f"\n  WARNING: {bname} runs diverged by {abs(b_scores[0]-b_scores[1]):.0f} points. Tiebreaker recommended.")

    # Save results
    output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "disabled_results": disabled_results,
        "control_results": control_results,
    }
    with open("c:/DEV/FactHarbor/scripts/phase1_results.json", "w") as f:
        json.dump(output, f, indent=2)
    print("\n  Results saved to scripts/phase1_results.json")


if __name__ == "__main__":
    main()

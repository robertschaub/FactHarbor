# Grander Runtime Follow-up Options

**Date:** 2026-04-23  
**Status:** Deferred follow-up note from live Grander monitoring.  
**Scope:** Capture the concrete runtime and quality follow-up options discussed after the successful Grander rerun so they can be revisited later without re-deriving the same conclusions.

## 1. Context

The April 23, 2026 Grander rerun recovered from the earlier ACS draft failure and completed successfully, but it still exposed three meaningful seams:

- Stage 1 remained the dominant latency source.
- Source-reliability work on sparse/weak domains still spent time on cases that often end in `null` / `insufficient_data`.
- The final saved report still carried `verdict_grounding_issue` warnings, which indicates late-stage citation-registry inconsistency even after the run succeeds.

This note records the four follow-up ideas discussed in response, with current recommendation status.

## 2. Current Recommendation Order

Based on the live run evidence, the current order is:

1. `verdict citation sanitation`
2. `SR sparse-domain early exit and caching`
3. keep `Stage 2 exact-URL/content reuse` deferred behind the optimization gate
4. revisit further `Stage 1 exact-set revalidation` work only if measurement shows a real missed optimization gap

The first item is primarily a quality/trust fix. The second is a bounded speed optimization. The third remains a production-oriented optimization worth keeping documented but postponed during Alpha verification. The fourth is currently low priority because the core fast path already exists.

## 3. Stage 2 Exact-URL/Content Reuse

**Current status:** Deferred during Alpha verification.  
**Canonical tracking:** `RES-OPT-1` in `Docs/STATUS/Backlog.md`.

### What it is

Reuse fetched raw content and parsed artifacts when the exact same canonical URL is encountered again within the same job.

### Why it still makes sense later

- It reduces duplicate network fetches and duplicate HTML/PDF parsing work.
- It does not require changing any semantic analysis decisions.
- It is the safest production-facing speed win if scoped narrowly.

### Why it stays deferred for now

- It adds another execution mode while Alpha verification still depends on clean, comparable baselines.
- It is an optimization, not a correctness fix.
- The live Grander run also exposed more urgent issues that affect output integrity directly.

### Allowed first slice when reopened

- UCM-gated and default-off
- exact canonical-URL matches only
- same job only
- reuse only raw fetched content plus parsed artifacts
- required observability: hit/miss counts, reused URL list, avoided fetch count, avoided parse count
- explicitly exclude cross-job persistence and heuristic/semantic dedupe from v1

## 4. SR Sparse-Domain Early Exit and Caching

**Current status:** Viable bounded optimization candidate.

### Code seam

- `apps/web/src/lib/source-reliability/sr-eval-engine.ts:575`
- `apps/web/src/lib/source-reliability/sr-eval-engine.ts:611`

### What it is

The current SR path skips refinement only when the evidence pack is fully empty. If there is any evidence at all, sequential refinement can still run even when the primary result is already `insufficient_data` or `score = null`.

The proposed change is:

- add a narrow early-exit path for sparse, weak evidence cases that are already landing in `null` / `insufficient_data`
- cache that "unknown due sparse evidence" outcome for a bounded TTL so repeated weak domains do not keep paying the same SR evaluation cost

### Why it is attractive

- It directly targets a real cost sink seen on weak domains in the Grander run.
- It keeps the optimization inside SR structural flow rather than changing verdict logic.
- It is easier to A/B than broader retrieval caching.

### Guardrails

- do not early-exit unless the primary result is already `null` or `insufficient_data`
- require clearly weak evidence, not just low confidence
- keep the cache class narrow to "unknown due sparse evidence"
- treat this as a speed optimization, not a change in source-reliability semantics

### Main risk

False early exits on domains where sparse evidence is still enough for a useful SR judgment.

## 5. Stage 1 Exact-Set Revalidation Fast Path

**Current status:** Mostly already implemented; not a major current priority.

### Code seam

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:1027`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:3120`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:3134`

### What is already true

The current code already:

- skips final contract revalidation when the final accepted claim set is equivalent to the last validated set
- defines that equivalence structurally by claim `id + statement`
- carries forward prior contract approval in a bounded fallback case when final revalidation is unavailable but the final set retains only previously validated claims and all validated anchor carriers survive

### What remains possible

Only a narrower extension if later measurement shows safe cases that the current equivalence test misses.

### Current conclusion

This should not be treated as a major open optimization anymore. The core exact-set fast path is already in place, so any further work here should be measurement-driven and explicitly justified.

## 6. Verdict Citation Sanitation

**Current status:** Highest-value immediate follow-up from the Grander rerun.

### Code seam

- `apps/web/src/lib/analyzer/verdict-stage.ts:2907`
- `apps/web/src/lib/analyzer/verdict-stage.ts:2965`

### What it is

The code already validates challenge evidence IDs structurally and already reverts baseless challenge-driven adjustments. But the Grander run still persisted `verdict_grounding_issue` warnings, which means invalid or unregistered evidence IDs can still survive into the final saved verdict payload.

The proposed change is a final structural sanitation step before persistence:

- prune impossible evidence IDs from verdict citation arrays
- if pruning empties the support for a challenge-driven adjustment, revert that adjustment instead of persisting a partially grounded state
- keep this structural only; do not introduce new semantic decision heuristics

### Why it ranks first

- It addresses the most visible remaining quality problem from the live run.
- It improves report integrity without weakening the reasoning pipeline.
- It should reduce late-stage grounding warnings that currently survive even on successful jobs.

### Main risk

Over-pruning if the sanitation step is allowed to infer too much. The implementation must stay structural and registry-based only.

## 7. Resume Guidance

If this thread is resumed later, use this order:

1. Decide whether the next goal is `quality/trust` or `runtime`.
2. If `quality/trust`, start with verdict citation sanitation.
3. If `runtime`, consider SR sparse-domain early exit before reopening retrieval reuse.
4. Keep Stage 2 exact-URL/content reuse behind the existing optimization gate unless Alpha verification priorities change.
5. Do not reopen Stage 1 fast-path work without proof that the current equivalence/carry-forward logic misses a worthwhile safe case.

# 2026-04-24 — Unassigned — Stage 1 Preliminary Fetch Reuse For Selection Readiness

## Summary

Phase 1 of the selection-readiness plan now has a concrete same-semantics latency improvement in code.

The targeted waste seam was inside Stage 1 preliminary search: duplicate search results from multiple rough-claim queries could fetch and parse the exact same URL repeatedly before AC selection became available. This was pure pre-selection critical-path work and did not improve claim semantics.

The landed change in [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) now reuses exact in-flight and successful fetches during `runPreliminarySearch(...)` so identical URLs are not downloaded/parsed multiple times within one Stage 1 run.

Important guard from review:
- failed or underlength fetches are **not** sticky-cached
- later duplicate URLs are still allowed to retry after a failed/underlength result

That keeps the optimization aligned with the same-semantics requirement.

## Files Changed

- [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts)
- [claim-extraction-preliminary-search-dedupe.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claim-extraction-preliminary-search-dedupe.test.ts)

## What Changed

### Runtime behavior

Inside `runPreliminarySearch(...)`:

- added a per-run `sharedFetchPromises` map keyed by exact URL
- duplicate URLs now share:
  - the same in-flight fetch promise
  - the same successful fetched payload
- duplicate URLs **do not** permanently share:
  - fetch failures
  - underlength-body results

The cache entry is evicted when a fetch result is unsuccessful, so a later duplicate result can retry.

### Test coverage

Added focused regression coverage for:

- successful duplicate reuse within the same claim across multiple queries
- successful duplicate reuse across claims while still extracting evidence separately per claim
- retry after an earlier shared fetch fails
- retry after an earlier shared fetch returns underlength content

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-preliminary-search-dedupe.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts -t "Stage 1: runPreliminarySearch"`
- `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts`
- `npm -w apps/web run build`

## Review

A reviewer initially found one real regression risk:

- failed/underlength fetches were being memoized across duplicate URLs, which could suppress evidence recovery

That finding is now addressed:

- only in-flight and successful fetches are reused
- failed/underlength outcomes are evicted from the cache
- failure-path tests were added

Final rereview outcome: no remaining findings in scope.

## Root Cause / Fix Framing

This change addresses the primary measured selection-readiness problem in the lowest-risk way currently available:

- it reduces Stage 1 time-to-selection
- it does **not** redesign Stage 1 semantics
- it does **not** alter ACS recommendation logic
- it does **not** alter interactive vs automatic selection behavior

## Remaining Next Steps

The larger selection-readiness plan remains:

1. continue reducing Stage 1 time-to-selection under current semantics
2. investigate broad-input Stage 1 quality failures only on concrete failing packets
3. improve draft/job log attribution for concurrent monitoring

This slice only covers one concrete Stage 1 waste seam.

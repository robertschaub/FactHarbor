# 2026-04-17 | Lead Developer | Codex (GPT-5) | Freshness Contract And Lane-Aware Retrieval Slice

## Summary

Implemented the agreed freshness slice for current-evidence-sensitive inputs without expanding into fetch-layer date metadata or a verdict hard gate.

## What Changed

- Added `freshnessRequirement?: "none" | "recent" | "current_snapshot"` to `AtomicClaim` in `apps/web/src/lib/analyzer/types.ts`.
- Mirrored that field onto `ClaimAcquisitionIterationEntry` so per-claim acquisition telemetry now records the claim-level freshness contract in job JSON.
- Extended Stage 1 parsing in `apps/web/src/lib/analyzer/claim-extraction-stage.ts` with a strict-optional `freshnessRequirement` enum on `Pass2AtomicClaimSchema`.
- Updated `claimboundary.prompt.md` so:
  - `CLAIM_EXTRACTION_PASS2` emits the freshness contract generically.
  - `GENERATE_QUERIES` treats it as authoritative.
  - `RELEVANCE_CLASSIFICATION` considers freshness fit.
  - `VERDICT_ADVOCATE` reasons about time-appropriateness without introducing a hard gate.
- Threaded `freshnessRequirement` into Stage 2 query generation and relevance classification.
- Added structural post-processing in `research-query-stage.ts` so `current_snapshot` claims always retain at least one fresh `primary_direct` or `navigational` query, even when the LLM omits the metadata.
- Added `claimFreshnessRequirement` to `searchWebWithProvider(...)` and introduced UCM mode `supplementaryProviders.mode = "demote_on_freshness"` in `config-schemas.ts`.
- In `demote_on_freshness`, supplementary providers still run after primary search but are bounded to `1` result for `current_snapshot` claims.
- Updated the admin config UI to expose the new supplementary-provider mode.

## Verification

- `npm -w apps/web run reseed:prompts`
- `npm -w apps/web run build`
- `npm test`

All passed.

## Acceptance Coverage

- Stage 1 schema:
  - absence of `freshnessRequirement` remains backward-compatible
  - invalid enum values now fail schema validation
- Query generation:
  - `current_snapshot` claims are guaranteed to keep at least one fresh primary/navigational query
- Search execution:
  - `demote_on_freshness` bounds supplementary providers to `1` result and keeps them after primary search
- Verdict/report artifact:
  - `freshnessRequirement` survives into `VERDICT_ADVOCATE` payloads
  - `buildClaimBoundaryResultJson(...)` preserves it in serialized `understanding.atomicClaims`

## Scope Guard Kept

- No `FetchedSource.publishedAt` / `lastModified`
- No reactivation of `evidence-recency.ts`
- No verdict hard gate
- No changes to existing granularity-based penalty math

## Warnings

- This slice improves provenance, query routing, and bounded supplementary behavior, but it still relies on prompt-level temporal judgment for source relevance because fetch-layer publication metadata is still absent.
- Live validation on jobs `83747b8b` and `866e2c83` was intentionally not run in this slice; that remains the next manual step.

## Learnings

- The right place to make freshness auditable was the claim contract, not `laneReason`; `laneReason` is already a free-form iteration explanation channel.
- A small deterministic metadata repair is justified once freshness becomes explicit claim state: it enforces the declared contract without introducing new semantic heuristics.

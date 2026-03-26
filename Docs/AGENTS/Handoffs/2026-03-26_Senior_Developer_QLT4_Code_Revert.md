# QLT-4 Code Revert — Per-Claim Contrarian Retrieval Removed

**Date:** 2026-03-26
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)

---

## Summary

Cleanly removed the QLT-4 per-claim contrarian retrieval experiment from the codebase. The feature was closed as inconclusive — it targeted per-claim evidence direction skew, but real Plastik EN evidence is already balanced at the per-claim level (ratio ~0.62, 21 minority items). The mechanism could never trigger on real data.

## Removed surface

| File | What was removed |
|------|-----------------|
| `claimboundary-pipeline.ts` | 62-line QLT-4 block (lines 476-537) + `assessPerClaimEvidenceBalance` import |
| `research-extraction-stage.ts` | `PerClaimBalanceMetrics` interface + `assessPerClaimEvidenceBalance()` function (68 lines) |
| `types.ts` | `per_claim_contrarian_triggered` warning type |
| `warning-display.ts` | Warning classification entry |
| `config-schemas.ts` | 5 UCM schema fields + 5 default values |
| `calculation.default.json` | 5 JSON config entries |
| `research-extraction-stage.test.ts` | 5 test cases (73 lines) + import |

## What was NOT removed

- `contrarianMaxQueriesPerClaim` — pre-existed QLT-4 (part of D5 article-level contrarian)
- `contrarianRuntimeCeilingPct` — pre-existed QLT-4
- Article-level contrarian retrieval (D5 C13) — unrelated, still active
- Historical docs in `Docs/AGENTS/Handoffs/` — preserved for design record

## Verification

- 1345 tests pass (69 files)
- Build clean
- Config drift test auto-synced

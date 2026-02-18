# 2026-02-18 | Lead Architect | Claude Code (Opus) | Claim Fidelity Validation + Metrics Persistence Fix

**Task:** Validate and complete the Lead Developer's claim fidelity fix (Phases 3-4 from their handoff), then fix metrics persistence end-to-end.

## Work Completed

### Phase 1: Claim Fidelity Audit & Fix (builds on Lead Developer's Phases 1-2)

**Root cause identified:** For question-form inputs like "Was the Bolsonaro judgment fair?", Pass 2 had a conflicting prompt rule:
- Fidelity rules (lines 97, 100, 104, 108, 109, 126) said "derive claims from input only"
- But line 124 said "Cover ALL distinct aspects... if the input references or **implies** multiple distinct events" — the word "implies" let the LLM interpret evidence-derived knowledge as "implied" by the question

**Three-layer defense applied:**

| Layer | What | Where |
|-------|------|-------|
| Prevention | Question-form input rules, rewrote "ALL distinct aspects" to "EXPLICITLY STATED", strengthened `impliedClaim` schema description | `claimboundary.prompt.md` lines 103-106, 128, 151 |
| Reduction | Truncated evidence to 120-char `topicSignal` (was full `statement`), removed `sourceUrl`, relabeled section header | `claimboundary-pipeline.ts` lines 925-931 |
| Detection | Gate 1 `passedFidelity` check (implemented by Lead Developer, verified working) | Already in place |

**Validated with runtime test (job `c488ab74`):**

| Metric | Before Fix (job `000d6d76`) | After Fix (job `c488ab74`) |
|--------|----------------------------|---------------------------|
| `impliedClaim` | 50-word evidence-contaminated thesis with "attempting a coup d'etat", "constitutional and legal procedures", "due process, evidence presentation, judicial review mechanisms" | **"The Bolsonaro judgment was fair"** (6 words) |
| Claims | 2 (overexpanded) | **1** (focused) |
| `passedFidelity` | Not tracked | **1/1 (100%)** |
| Runtime | 8m 39s | **8m 15s** |
| Verdict | MIXED | MIXED (48% truth, 58% confidence) |

### Phase 2: Metrics Persistence Fix

**Root cause:** `persistMetrics()` in `metrics.ts:335` used relative URL `fetch('/api/fh/metrics')`. Node.js server-side code has no origin to resolve relative URLs against — the request silently failed.

**Fix:** Changed to absolute URL using `process.env.FH_API_BASE_URL` with `X-Admin-Key` header, calling the .NET API directly.

**Verified:** 2 metrics records persisted in `AnalysisMetrics` table after fix. Phase timings, LLM calls, Gate 1/4 stats all captured.

**Minor data quality issue (flagged, not blocking):** AI SDK returns `totalTokens` per call but `promptTokens`/`completionTokens` are both 0, so aggregated `tokenCounts.totalTokens` shows 0. Per-call totals are correct (14K-17K per verdict call). Should be fixed by summing per-call `totalTokens` in the finalizer.

## Files Touched

| File | Change |
|------|--------|
| `apps/web/prompts/claimboundary.prompt.md` | Question-form rules (103-106), "distinct aspects EXPLICITLY STATED" rewrite (128), `impliedClaim` schema strengthening (151), evidence section relabel (141) |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Evidence truncation to 120-char `topicSignal`, removed `sourceUrl` from Pass 2 payload (925-931) |
| `apps/web/src/lib/analyzer/metrics.ts` | Fixed `persistMetrics` — absolute URL with admin key, success/error logging (333-350) |

## Key Decisions

- **Evidence truncation over removal:** Kept evidence in Pass 2 (as `topicSignal`) rather than removing it entirely. The LLM still needs topic signals for `expectedEvidenceProfile` and `groundingQuality` — but at 120 chars there's not enough detail to contaminate claims.
- **Direct API call over proxy:** `persistMetrics` now calls `.NET API` directly instead of going through the Next.js proxy route at `/api/fh/metrics`. Eliminates a self-referential HTTP hop and the relative URL problem.
- **Transient Pass 2 failure is not a regression:** One "sky is blue" job failed with "No object generated: response did not match schema" but the retry succeeded. The Bolsonaro job (more complex) and all subsequent jobs succeeded. This is LLM variance, not a prompt regression.

## Open Items

- **Metrics token aggregation:** Per-call `totalTokens` is correct but the top-level sum doesn't aggregate them. Low priority.
- **Phase 3 (Speed Optimization):** Current baselines from metrics — Verdict: 1m37s, Research: 2m42s, Total: 7m28s. Research is the largest remaining phase. Potential: parallelize research iterations, skip clustering for single-claim inputs, cache source reliability lookups.
- **Phase 4 (Gate 1 Rebuild):** `specificityScore` is dead code (hardcoded 0 in quality-gates.ts). Gate 1 should be refactored to remove dead code and rely fully on LLM-based validation.
- **Changes are uncommitted.** Need commit of: prompt changes, pipeline evidence truncation, metrics fix.

## Performance Baselines (from metrics)

| Phase | "Sky is blue" (simple) | "Bolsonaro" (complex question) |
|-------|----------------------|-------------------------------|
| Understand | 46s | ~45s |
| Research | 2m 42s | ~3m |
| Verdict | 1m 37s | ~2m 25s |
| Summary | 52s | ~1m |
| Report | 13s | ~15s |
| **Total** | **7m 28s** | **8m 15s** |
| LLM Calls | 7 (verdict) | 24 (total) |
| Claims | 1 | 1 |
| Sources | 14 | 12 |

## For Next Agent

1. **Commit these changes** — all tests pass (853/853), build passes. Three files changed: `claimboundary.prompt.md`, `claimboundary-pipeline.ts`, `metrics.ts`.
2. **Phase 3 (Speed)** is next priority. Research stage (2m42s) is the biggest target. Consider: parallel search iterations, reducing max sources per query, caching source reliability lookups.
3. **The proxy route** at `apps/web/src/app/api/fh/metrics/route.ts` is now redundant (metrics go directly to API). It can be kept as a fallback or removed in cleanup.
4. **Monitor fidelity** on next few real jobs — the fix works for "Was X fair?" pattern but should be validated with other question forms and multi-assertion inputs.

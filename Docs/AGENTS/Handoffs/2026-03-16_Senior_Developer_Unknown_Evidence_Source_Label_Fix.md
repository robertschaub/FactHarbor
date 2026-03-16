---
### 2026-03-16 | Senior Developer | Codex (GPT-5) | Unknown Evidence Source Label Fix
**Task:** Investigate why many evidence items on the job details page render as `Unknown`, implement a fix, and document the change for review.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/evidence-source-label.ts`, `apps/web/src/app/jobs/[id]/page.tsx`, `apps/web/src/app/api/internal/evaluate-source/route.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `apps/web/test/unit/lib/evidence-source-label.test.ts`
**Key decisions:**
- Confirmed the bug is mostly provenance metadata loss, not missing URLs or SR data. On local job `01674f5d0aaa43de9a250c7cb8b48a98`, `40/83` evidence items had a real `sourceUrl` but blank `sourceTitle`; all `40` were seeded evidence.
- Preserved `sourceTitle` through the Stage 1 -> Stage 2 handoff by keeping it in `CBClaimUnderstanding.preliminaryEvidence` and carrying it into `seedEvidenceFromPreliminarySearch(...)`.
- Extended `reconcileEvidenceSourceIds(...)` to also backfill missing `sourceTitle` from matched fetched sources, not just `sourceId`.
- Added `resolveEvidenceSourceLabel(...)` for the jobs UI. Display order is now: explicit evidence title -> matched fetched-source title -> hostname derived from `sourceUrl` -> `Unknown`.
- Changed the jobs page so unmatched evidence with a URL still renders a usable external link instead of an unlabeled `Unknown` placeholder.
- Fixed an unrelated build blocker in `apps/web/src/app/api/internal/evaluate-source/route.ts`: the SR evaluation adapter now sets `autoMode` from `DEFAULT_SEARCH_CONFIG.autoMode` because `SearchConfig` requires it while `sr.evaluationSearch` does not define it.
**Open items:**
- Existing persisted jobs will not gain newly stored `sourceTitle` metadata retroactively; they rely on the UI fallback until rerun.
- The HTML export already used `sourceTitle || sourceUrl`; it was left unchanged because the primary user-facing defect was on the jobs page.
**Warnings:**
- The real-job sample showed only `8/40` missing-title evidence items could be backfilled from fetched `sources[]`. The remaining cases depend on the hostname fallback because there is no later fetched-source record to reconcile against.
- `apps/web/src/app/api/internal/evaluate-source/route.ts` was touched only to restore a passing build after verification exposed the adapter mismatch. That line is not part of the evidence-label defect itself.
**For next agent:** Review the implementation against the real sample job `01674f5d0aaa43de9a250c7cb8b48a98`. Before the fix, it had `40` evidence items with `sourceUrl` + blank `sourceTitle`; after the UI fallback, `RemainingUnknownAfterUIFallback = 0`. Verification run: `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts test/unit/lib/evidence-source-label.test.ts` and `npm -w apps/web run build`, both passed.
**Learnings:** no

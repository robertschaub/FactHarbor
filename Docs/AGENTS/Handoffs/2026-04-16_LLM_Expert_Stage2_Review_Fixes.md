### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Review Fixes

**Task:** Address the handed-over code review for commits `9a993b8..982ce89`, focusing on real Stage 2 / Stage 5 defects still present on the current tree.

**Files touched:**
- apps/web/src/lib/analyzer/research-orchestrator.ts
- apps/web/src/lib/analyzer/research-query-stage.ts
- apps/web/src/lib/analyzer/aggregation-stage.ts
- apps/web/src/lib/analyzer/types.ts
- apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts

**Key decisions:**
- Fixed the confirmed Stage 2 correctness bugs instead of treating the review as purely advisory: refinement raw-evidence telemetry now credits the active telemetry entry, and refinement ledger entries now use `iterationType: "refinement"` rather than masquerading as `"main"`.
- Relaxed `claimNeedsPrimarySourceRefinement(...)` so expected primary source types can trigger refinement even when `expectedMetrics` is empty, while keeping the stronger quantitative coverage check for numeric claims that do declare expected metrics.
- Lowered the Stage 5 narrative methodology-label floor from 8 characters to 3 so short but meaningful methodology tags like WTT / WTW / LCA are no longer discarded.
- Accepted the low-risk style cleanup in `research-query-stage.ts`: removed the trivial query-builder wrapper and fixed the indentation slip while leaving behavior unchanged.

**Open items:**
- The search-cache log comment from the review was not changed because the current read-path freshness MISS log already uses the override value correctly.
- No commit was created in this pass.

**Warnings:**
- `ClaimAcquisitionIterationEntry.iterationType` now includes `"refinement"`; any downstream consumer that assumed the older 3-value union should treat the new value explicitly rather than relying on fallback behavior.
- The review’s Stage 5 methodology-label concern is fixed behaviorally, but there is still no dedicated small unit-test seam for `normalizeNarrativeHighlightLabel`; validation relied on the existing focused narrative tests.

**For next agent:**
- If this work is to be published, the next step is just staging these five files and creating a follow-up commit; targeted safe tests already passed.
- If more review feedback arrives on Stage 2 telemetry, start from `primary-source-refinement.test.ts`, which now asserts both the refinement iteration type and the per-iteration raw-evidence counts.

**Learnings:**
- No. This was a localized review-fix pass rather than a reusable workflow lesson.

**Next:**
1. Stage and commit these review fixes if you want them recorded in history.
2. If desired, add a dedicated small Stage 5 unit-test seam later for methodology-highlight normalization.
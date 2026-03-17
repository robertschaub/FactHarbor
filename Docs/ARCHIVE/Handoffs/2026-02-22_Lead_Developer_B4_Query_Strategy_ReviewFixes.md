---
### 2026-02-22 | Lead Developer | Codex (GPT-5) | B-4 Query Strategy + Shared Budget (with Review Fixes)
**Task:** Implement B-4 (pro/con query separation + shared per-claim budget framework), then apply post-review medium fixes from `Code_Review_B4_Query_Strategy_2026-02-22.md` (M1, M2).
**Files touched:** `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/calibration/metrics.ts`, `apps/web/test/unit/lib/config-schemas.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Kept B-4 backward compatibility strict: `queryStrategyMode` default is `legacy`; no behavior changes unless enabled.
- Added shared per-claim budget primitives (`queryBudgetUsageByClaim`, `getClaimQueryBudgetRemaining`, `consumeClaimQueryBudget`) so future query sources (including D5#3 contrarian retrieval) consume the same budget.
- Fixed review issue M1: partially labeled `pro_con` outputs no longer drop unlabeled queries; unlabeled queries are appended after supporting/refuting interleave.
- Fixed review issue M2: when Stage 2 exits because all claims exhausted per-claim query budget, pipeline now emits `query_budget_exhausted` warning with diagnostic details (`stage`, budget value, usage snapshot, iteration counters).
- Wired `query_budget_exhausted` into calibration failure-mode aggregation (`DEGRADATION_WARNING_TYPES`) and stage mapping (`research_budget`) for visibility in metrics/significance flows.
- Prompt reseed completed and hash verified changed for `claimboundary` (`626cd0d9 -> 37e0a0cf`).
**Open items:**
- D5#3 contrarian retrieval is not yet implemented; it should consume budget via existing shared helpers, not introduce a new counter.
- Optional UI/report enhancement: add explicit display row for `query_budget_exhausted` counts (currently visible via warnings + aggregated metrics).
**Warnings:**
- Workspace includes untracked reviewer artifact `Docs/WIP/Code_Review_B4_Query_Strategy_2026-02-22.md` (read-only input; not modified by implementation).
- Existing low-severity note remains: `variantType` is normalized away before downstream usage in Stage 2 return shape (acceptable for B-4 scope, as reviewed).
**For next agent:** Lead Architect can approve merge readiness for B-4 with review deltas closed (0C/0H unresolved). If desired, run one calibration sample to confirm `query_budget_exhausted` appears in warning-derived failure-mode buckets under `research_budget`.
**Learnings:** No new role learnings appended.

**Verification run:**
- `npm test` passed.
- `npm -w apps/web run build` passed.


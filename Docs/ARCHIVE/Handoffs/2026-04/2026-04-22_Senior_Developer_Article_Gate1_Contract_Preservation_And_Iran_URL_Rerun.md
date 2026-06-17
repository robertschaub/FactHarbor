---
roles: [Senior Developer]
topics: [stage1, gate1, article, contract_validation, unverified, rerun]
files_touched:
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts
---

### 2026-04-22 | Senior Developer | GitHub Copilot (GPT-5.4) | Article Gate1 Contract Preservation And Iran URL Rerun
**Task:** Commit the narrowed article-path Stage 1 follow-up fix, restart the local runtime, rerun the exact Iran URL input, and inspect the new job instead of the stale `f82f68af360f48c19357f16b4196a4c8` run.

**Done:** Added `selectClaimsForGate1(...)` so a clean contract-approved article claim set can reach Gate 1 intact instead of being centrality-truncated first at `apps/web/src/lib/analyzer/claim-extraction-stage.ts:713` and `apps/web/src/lib/analyzer/claim-extraction-stage.ts:2530`. Re-exported the helper from `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:193` and added focused article-vs-claim-mode coverage at `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts:792`. Committed the code as `424b9652` with message `fix(stage1): preserve article contract-approved claim sets`, restarted the local stack, and submitted one authenticated rerun for `https://en.wikipedia.org/wiki/Iran_and_weapons_of_mass_destruction` as job `9164bcf79cb04df2a0f308d933aed8ac`.

**Decisions:** Kept the Stage 1 bypass article-only because the broader contract-approved Gate 1 bypass already failed focused validation by breaking claim-mode anchor-carrier behavior. Preserved the operational discipline from AGENTS: commit first, then restart, then rerun the exact same input on the new code.

**Warnings:** The rerun has started on commit `424b96526d29d003e8fccddeae1a83dcfdccc38e+a1825b3e`, but it was still in progress at handoff time, so no final report judgment is recorded here yet. The worktree still has unrelated docs/index churn from separate work; do not fold that into any follow-up commit for this investigation.

**Learnings:** For `inputClassification === "article"`, centrality truncation before Gate 1 can itself create a contract failure even when the current Pass 2 set is already contract-approved. Also, a top-level job can remain `QUEUED` briefly even after dispatch; `v1/jobs/{jobId}/events/history` is the faster discriminator for whether the local runner is actually alive.

**For next agent:** Monitor job `9164bcf79cb04df2a0f308d933aed8ac` to terminal status, then compare its Stage 1 contract outcome and final report state against stale job `f82f68af360f48c19357f16b4196a4c8`. If it still lands `UNVERIFIED`, inspect the new event trail around Gate 1 and the post-Gate-1 contract summary before broadening beyond the article-only selector.

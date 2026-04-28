---
### 2026-04-28 | Unassigned | Codex (GPT-5) | Daily Bug Scan Runner Bootstrap Leak Fix
**Task:** Scan commits since the last automation run for likely bugs and propose only concrete, minimal fixes.
**Files touched:** `apps/web/src/lib/internal-runner-queue.ts`; `Docs/AGENTS/Handoffs/2026-04-28_Unassigned_Daily_Bug_Scan_Runner_Bootstrap_Leak_Fix.md`; `Docs/AGENTS/Agent_Outputs.md`; `C:/Users/rober/.codex/automations/daily-bug-scan/memory.md`
**Key decisions:** Reviewed committed history from `2a713bcc` through `e1787899` in the post-`2026-04-27T06:00:50.991Z` window, with highest-risk code in `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, and related tests. Focused verifiers for the ACS budget/provenance, research-waste, and UNVERIFIED paths passed, and `npm -w apps/web run build` passed. Full `npm test` then produced one concrete failure: `test/unit/lib/drain-runner-pause.integration.test.ts > drainRunnerQueue returns early when system is paused (network) and probe fails` timed out after 5000 ms. The same test passed in isolation, which narrowed the issue to suite interaction rather than queue semantics. Recent runner commits in scope (`3c1e88ff`, `e0f70130`, `e51f08c9`, `71cc8786`) all touched `internal-runner-queue.ts`; the smallest evidence-backed cause was background queue work scheduled outside explicit test control. The final fix amends only that existing scheduling mechanism: import-time timers, watchdog starts, and chained background drains are skipped under Vitest/test env, explicit queue/drain calls remain available to tests, and runtime behavior remains unchanged. The LLM connectivity probe now passes `fetchImpl: globalThis.fetch` explicitly so full-suite fetch spies are consistently honored instead of occasionally waiting on an unmocked five-second probe.
**Open items:** none
**Warnings:** Verification still emits expected mocked-network console errors from existing runner integration tests; those are noise from the test harness, not failing assertions. This patch intentionally does not alter queue, probe, pause, or heartbeat logic.
**For next agent:** Baseline after this run is: recent committed changes are green on `npm test` and `npm -w apps/web run build`, and the previous "known full-suite runner heartbeat timeout" warning is resolved. If another runner flake appears, start with `apps/web/src/lib/internal-runner-queue.ts` background scheduling before changing queue semantics.
**Learnings:** When a module owns background recovery timers, test-only import/bootstrap scheduling is a distinct mechanism from the production queue logic and should be isolated centrally rather than patched per test.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend
Rejected path and why: adding a new test helper or widening per-test cleanup would stack another mechanism on top of existing background scheduling; reverting the other agent's guard would reintroduce the full-suite leak.
What was removed/simplified: no production code removed; background test suppression is centralized in one scheduling guard.
What was added: explicit `fetchImpl: globalThis.fetch` for the connectivity probe and shared `shouldScheduleBackgroundQueueWork()` checks around background-only scheduling.
Net mechanism count: unchanged
Budget reconciliation: touched only `apps/web/src/lib/internal-runner-queue.ts` plus handoff/output records; no analysis behavior, prompt/config, runtime flags, retries, or compatibility paths were added.
Verification: `npm -w apps/web exec vitest run test/unit/lib/drain-runner-pause.integration.test.ts`; `npm -w apps/web exec vitest run test/unit/lib/runner-concurrency-split.integration.test.ts`; `npm -w apps/web exec vitest run test/unit/lib/search-wikipedia.test.ts test/unit/app/api/admin/test-config/route.test.ts`; `npm test`; `npm -w apps/web run build`; `git diff --check`
Debt accepted and removal trigger: none.
Residual debt: none identified in the touched area after the scheduling guard.

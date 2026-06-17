### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Regression Check

**Task:** Run a measured post-implementation regression on the Captain-approved asylum input and determine whether the Stage 2 primary-source refinement slice improves direct official-source discovery.

**Files touched:**
- apps/web/src/lib/analyzer/research-orchestrator.ts
- apps/web/src/lib/analyzer/research-query-stage.ts
- Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Regression_Check.md
- Docs/AGENTS/Agent_Outputs.md

**Done:**
- Fixed a robustness regression in `apps/web/src/lib/analyzer/research-orchestrator.ts` by defensively initializing `researchedIterationsByClaim` inside both `researchEvidence(...)` and direct `runResearchIteration(...)` entrypoints.
- Restored backward-compatible query output shape in `apps/web/src/lib/analyzer/research-query-stage.ts` by making retrieval metadata optional and only emitting `retrievalLane` / `freshnessWindow` when the LLM actually returns them.
- Narrowed the refinement trigger in `apps/web/src/lib/analyzer/research-orchestrator.ts` so it only fires when the main-query output uses the new metadata contract. This kept legacy Stage 2 tests stable while preserving the live path when metadata is present.
- Revalidated the affected Stage 2 surface with `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts test/unit/lib/analyzer/primary-source-refinement.test.ts` (`347 passed | 1 skipped`).
- Ran a live regression batch for the approved input `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` against the local stack. Two jobs completed before shutdown: `9e7fc6066a7343c1a0b2d56fb3d39982` and `141cfe945d8540caaddb970d271317f2`. A third queued job `986e875fae354bb490978003c8e68337` was intentionally prevented from starting by stopping the local services after two completed runs produced a stable pattern.
- Queried six baseline jobs from local SQLite (`7333cb1f1ee6472b9c782e94e4aa7b0e`, `eb7de9adfef6476ca66b68a50faa8178`, `9e8033b9b1ed4990b355f34437d97abc`, `95d5c3ee235845228f04777e42ecd158`, `9dc205aa6b5142b380bcd27ad51ca4f4`, `5ff87649fa1d4424a886093355c0845f`) and compared them with the two completed current-code runs.

**Key decisions:**
- Stopped after two completed live runs instead of waiting for the third queued job. The two finished runs plus the six-job baseline were enough to establish the current pattern, and additional queued runtime would have increased cost without obviously changing the conclusion.
- Treated the Stage 2 test breakage as a production robustness / compatibility issue, not as a reason to rewrite the live behavior. The fix keeps the new path available while avoiding synthetic metadata in legacy callers.
- Used local DB evidence (`Jobs`, `JobEvents`) and the analyzer debug log together. The DB establishes persisted outcome; the log shows transient retrieval behavior that may not survive into `resultJson.sources`.

**Open items:**
- The exact 2025 commentary PDF (`stat-jahr-2025-kommentar...`) still did not appear in either completed current-code result.
- Neither completed current-code run emitted any `refinement`-focused search queries (`refinementQueries = 0` in both stored results), so the new refinement branch did not activate in these measured runs.
- One completed current-code run did persist an official 2025 SEM archive page (`.../asylstatistik/archiv/2025/10.html`) in the final source pool, but the other did not.

**Warnings:**
- Broad safe-test command `npm test` on this repo state still reports an unrelated failure in `test/unit/lib/analyzer/llm-routing.test.ts` expecting an older Anthropic verdict model ID. That failure is outside this change slice.
- The debug log showed an official 2025 SEM archive page entering the fetched top-N during a live run, but persisted results still did not include the exact commentary PDF. This means the current improvement is only partial: better official-navigation retrieval, not yet reliable direct-document capture.
- Because the refinement trigger now depends on explicit query metadata, weak prompt adherence from the live LLM can silently suppress the refinement branch.

**For next agent:**
- The strongest measured conclusion is: partial improvement, not full fix. Baseline was `0/6` exact PDF hits and `0/6` 2025 archive-page hits. Current measured runs are `0/2` exact PDF hits, `1/2` persisted 2025 archive-page hits, and `0/2` refinement-query hits.
- Inspect why live query generation is not returning the new retrieval metadata strongly enough to trigger refinement. The stored query sets for both current runs only had `preliminary`, `main`, and `contradiction` focuses.
- Relevant current-code anchors are `apps/web/src/lib/analyzer/research-query-stage.ts` and `apps/web/src/lib/analyzer/research-orchestrator.ts`. Relevant empirical job IDs are the two completed runs above plus the six baseline IDs.

**Learnings:**
- Yes. The live regression suggests prompt-contract additions alone are not enough to guarantee activation of new Stage 2 behavior; when downstream control flow depends on new LLM fields, measure whether those fields are actually emitted in real runs, not just mocked tests.

**Next:**
1. Inspect the actual live query-generation outputs for this claim family and strengthen prompt adherence or validation so `retrievalLane` / `freshnessWindow` are reliably emitted.
2. Add lightweight telemetry or warnings for “expected refinement path did not activate” so silent non-emission of query metadata is visible.
3. Re-run the same approved-input measurement after that prompt/validation tightening before expanding the architecture further.

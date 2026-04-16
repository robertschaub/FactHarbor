### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Hydrogen Boundary And Asylum Refinement Followup

**Task:** Fix two approved-input quality issues without domain hardcoding: surface TTW/WTW structurally for the hydrogen claim and improve official-number retrieval for the Swiss asylum-count claim.

**Files touched:**
- apps/web/prompts/claimboundary.prompt.md
- apps/web/src/lib/analyzer/claim-extraction-stage.ts
- apps/web/src/lib/analyzer/pipeline-utils.ts
- apps/web/src/lib/analyzer/research-orchestrator.ts
- apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts

**Done:**
- Tightened the prompt contract so comparative efficiency claims can decompose by measurement window, current official-count queries prefer source-native current artifacts, quantified evidence preserves literal numbers, and boundary clustering keeps framework labels such as TTW/WTW visible in apps/web/prompts/claimboundary.prompt.md:212, apps/web/prompts/claimboundary.prompt.md:638, apps/web/prompts/claimboundary.prompt.md:851, and apps/web/prompts/claimboundary.prompt.md:1068.
- Normalized Stage 1 `expectedSourceTypes` into canonical `SourceType` values both at schema-parse time and during normalization, preventing descriptive labels from silently disabling downstream refinement in apps/web/src/lib/analyzer/claim-extraction-stage.ts:88 and apps/web/src/lib/analyzer/claim-extraction-stage.ts:1738.
- Added fuzzy source-type mapping for descriptive official / legal / study / organization labels so Stage 2 can interpret Stage 1 expectations generically rather than requiring exact enum strings in apps/web/src/lib/analyzer/pipeline-utils.ts:141.
- Strengthened Stage 2 primary-source refinement so it canonicalizes expected source types, tolerates missing metadata on main/refinement queries, and requires broader numeric metric coverage before considering current official quantitative claims sufficiently covered in apps/web/src/lib/analyzer/research-orchestrator.ts:209, apps/web/src/lib/analyzer/research-orchestrator.ts:236, apps/web/src/lib/analyzer/research-orchestrator.ts:1327, and apps/web/src/lib/analyzer/research-orchestrator.ts:1350.
- Added regression coverage for descriptive source-label normalization and incomplete multi-metric official coverage in apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts:308 and apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts:456.
- Verified with focused safe tests: `npm run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/primary-source-refinement.test.ts` from `apps/web` (72 tests passed).
- Live verification outcome: the current hydrogen submitted job `a2e57bbb5d9d44e28884407ab2b91c32` now shows distinct full-pathway and tank-to-wheel atomic claims and report text; the latest direct asylum verification reaches current SEM/admin sources and extracts more current official component figures, though a single official aggregate total is still not consistently surfaced as one direct primary-source number.

**Key decisions:**
- Kept the fix generic and LLM-driven. No claim-specific keyword lists or hydrogen/asylum hardcoding were introduced.
- Split responsibilities deliberately: prompt changes handle structural surfacing and source-native retrieval guidance; code changes handle canonicalization and the refinement stop condition.
- Chose to make Stage 2 refinement harder to satisfy for multi-metric quantitative claims rather than adding special-case search logic for asylum totals.

**Open items:**
- The submitted asylum rerun `bc82574223574bb087f47276e0496907` was still `QUEUED` at completion time, so the live UI confirmation for the newest asylum queue item is pending even though direct analyzer verification already improved.
- The asylum path still benefits from a future generic improvement that can extract a single official aggregate total directly from SEM tables or table-like artifacts when the source provides components more clearly than a headline total.

**Warnings:**
- The latest completed asylum reports are better but still methodologically softer than the hydrogen result because they often combine official component figures with a secondary aggregate rather than one official primary-source total.
- There is an unrelated pre-existing newline-only modification in `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Fresh_Live_Verification.md`; it was intentionally left unstaged and uncommitted.

**For next agent:**
- If the queued asylum job finishes, inspect whether it now uses the improved refinement path to pull the better official-source mix already seen in direct analyzer runs.
- If asylum still falls short, the next generic seam is table-cell / structured-stat extraction from official artifacts, not another search-heuristic expansion.
- The hydrogen requirement is effectively closed on the live submitted run; any further work there should be cleanup only.

**Learnings:**
- No. This work extended an existing refinement pattern but did not add a reusable role-learning beyond what is already in the code and tests.

**Next:**
1. Watch the queued asylum job `bc82574223574bb087f47276e0496907` to confirm the live UI reflects the improved official-source retrieval.
2. If needed, add a generic structured-stat/table extraction improvement for official stock-total pages and PDFs.
3. Keep future commits split between prompt-contract changes and refinement/control-flow changes.

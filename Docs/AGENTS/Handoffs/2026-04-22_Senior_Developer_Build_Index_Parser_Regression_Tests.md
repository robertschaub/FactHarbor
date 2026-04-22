---
roles: [Senior Developer]
topics: [build_index, handoff_index, parser, regression_tests]
files_touched:
  - scripts/build-index.mjs
  - apps/web/test/unit/lib/build-index.test.ts
---

### 2026-04-22 | Senior Developer | GitHub Copilot (GPT-5.4) | Build Index Parser Regression Tests

**Task:** Add narrow regression coverage for the `build-index.mjs` handoff parser fix so later changes do not silently break role/topic extraction again.

**Done:** Exported `parseHandoff(...)` from [scripts/build-index.mjs](scripts/build-index.mjs) and wrapped the script entrypoint in `main()` guarded by `IS_MAIN` so the module can be imported in tests without rebuilding indexes on load. Added [apps/web/test/unit/lib/build-index.test.ts](apps/web/test/unit/lib/build-index.test.ts) with focused cases for topic preservation when a slug token looks like a role, multi-role prefix stripping, and YAML-driven fallback over aliased filename variants.

**Decisions:** Kept the test surface narrow by exposing only the pure parser instead of building a separate test harness or shelling out to the script. Chose real handoff shapes from the repo as fixtures so the regression coverage matches the bug that actually occurred.

**Open items:** No functional blocker remains. If parser behavior changes further, consider adding one full `buildHandoffIndex()` fixture test that asserts on a small synthetic handoff directory.

**Warnings:** [Docs/WIP/2026-04-22_AI_Cost_Review_Reduce_Keep_Add.md](Docs/WIP/2026-04-22_AI_Cost_Review_Reduce_Keep_Add.md) was already dirty and was intentionally left out of this task.

**Learnings:** no

**For next agent:** `parseHandoff(...)` in [scripts/build-index.mjs](scripts/build-index.mjs) is now directly testable, and [apps/web/test/unit/lib/build-index.test.ts](apps/web/test/unit/lib/build-index.test.ts) covers the exact role/topic fallback bug that caused `captain` slug tokens to disappear from the generated handoff index.
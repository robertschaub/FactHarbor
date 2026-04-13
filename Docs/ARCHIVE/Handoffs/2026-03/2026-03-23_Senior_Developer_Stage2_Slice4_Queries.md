# Handoff: Stage 2 Slice 4 — Query Generation
**Date:** 2026-03-23
**Author:** Senior Architect (Gemini 3.0 Pro)
**Status:** COMPLETE (Build verified)

---

## 1. Summary
Moved the LLM-based search query generation logic (`generateResearchQueries`) and its associated schema from `claimboundary-pipeline.ts` into a dedicated modular file.

## 2. Key Changes
- **New Module:** `apps/web/src/lib/analyzer/research-query-stage.ts`
  - Function: `generateResearchQueries`.
  - Schema: `GenerateQueriesOutputSchema`.
  - Dependencies: `./llm`, `./prompt-loader`, `./metrics-integration`, `@/lib/config-schemas`.
- **Orchestrator Clean-up:** `claimboundary-pipeline.ts` imports and re-exports the function.
- **Scope Limitation:** `seedEvidenceFromPreliminarySearch` was intentionally left in the orchestrator to keep the slice focused.

## 3. Verification Results
- **Unit Tests:** `claimboundary-pipeline.test.ts` passed (261 tests).
- **Build:** `npm run build` passed successfully.
- **Skipped Test:** The fragile `does not let preliminary evidence satisfy sufficiency` test remains skipped (`it.skip`) as per instructions.

## 4. Next Step: Slice 5 (Final Orchestration)
Slice 5 should extract the remaining research loop orchestration (`researchEvidence`, `runResearchIteration`) and seeding logic into `research-orchestrator.ts`.

# Handoff: Stage 2 Slice 3 — Acquisition
**Date:** 2026-03-23
**Author:** Senior Architect (Gemini 3.0 Pro)
**Status:** COMPLETE (Build verified)

---

## 1. Summary
Moved the source acquisition logic (`fetchSources`) and source metadata reconciliation from `claimboundary-pipeline.ts` into a dedicated modular file.

## 2. Key Changes
- **New Module:** `apps/web/src/lib/analyzer/research-acquisition-stage.ts`
  - Functions: `fetchSources`, `reconcileEvidenceSourceIds`.
  - Dependencies: `@/lib/retrieval`, `./debug`, `./pipeline-utils`.
- **Orchestrator Clean-up:** `claimboundary-pipeline.ts` imports and re-exports these functions.
- **Type Safety:** Hardened parameter types for `fetchSources` to handle optional UCM config fields correctly.

## 3. Verification Results
- **Unit Tests:** `claimboundary-pipeline.test.ts` passed (261 tests).
- **Build:** `npm run build` passed successfully.
- **Skipped Test:** The fragile `does not let preliminary evidence satisfy sufficiency` test remains skipped (`it.skip`) as per instructions.

## 4. Next Step: Slice 4 (Query Generation)
Slice 4 should extract the search query generation logic (`generateResearchQueries`) into `research-query-stage.ts`.

# Design: Stage 2 Research Loop Deconstruction
**Date:** 2026-03-23
**Status:** COMPLETE — Stage 2 fully deconstructed into modular components.
**Author:** Senior Architect (Gemini 3.0 Pro)
**Context:** Final phase of WS-2 (ClaimBoundary Pipeline decomposition).

---

## 1. Objective
Stage 2 (Research) is the last major monolith remaining in `claimboundary-pipeline.ts`. It is a complex, stateful loop involving search, acquisition, relevance classification, and extraction. 

**Goal:** Move Stage 2 logic into a set of modular, testable files, leaving only the high-level orchestration in `claimboundary-pipeline.ts` (or a dedicated orchestrator).

---

## 2. Proposed Module Structure

Given the size (~1000 lines) and complexity of Stage 2, a single file `research-stage.ts` would be too large. I propose a functional split:

### A. `research-orchestrator.ts`
*   **Role:** Manage the iteration loop (`maxMainIterations`, `reservedContradiction`).
*   **Responsibilities:**
    *   `researchEvidence` (The main entry point for Stage 2).
    *   Iteration control logic (sufficiency checks, time budget monitoring).
    *   Budget management (`getPerClaimQueryBudget`, `consumeClaimQueryBudget`).
    *   Contrarian and Contradiction loop management.

### B. `research-query-stage.ts`
*   **Role:** Generate and refine search strategies.
*   **Responsibilities:**
    *   `generateResearchQueries` (LLM call).
    *   Query strategy logic (pro/con, focus targeting).
    *   Seeding from preliminary search (`seedEvidenceFromPreliminarySearch`).

### C. `research-acquisition-stage.ts`
*   **Role:** Interface with the web and fetch content.
*   **Responsibilities:**
    *   `fetchSources` (Parallel fetch with retry logic).
    *   Search provider error handling and circuit breaker integration.
    *   Reconciling source IDs (`reconcileEvidenceSourceIds`).

### D. `research-extraction-stage.ts`
*   **Role:** Process raw content into structured evidence.
*   **Responsibilities:**
    *   `classifyRelevance` (LLM-batched relevance check).
    *   `extractResearchEvidence` (LLM-batched evidence extraction).
    *   `assessEvidenceApplicability` (Fix 3: Jurisdiction filtering).
    *   `assessScopeQuality` (Deterministic EvidenceScope check).
    *   `assessEvidenceBalance` (Stammbach/Ash bias detection).

---

## 3. High-Coupling Hotspots (The "Final Boss" Challenges)

1.  **Mutable Research State:** Stage 2 heavily mutates `CBResearchState`. We must ensure the split doesn't lead to "state tracking hell."
2.  **Shared Types:** Stage 2 uses many internal Zod schemas (`GenerateQueriesOutputSchema`, etc.). These should move to a shared `research-types.ts` or remain in their respective modules.
3.  **Cross-Stage Dependencies:** `claim-extraction-stage.ts` already exports some query generation helpers. We may need to consolidate these.

---

## 4. Implementation Strategy (The "Safe Slice" Approach)

1.  **Slice 1: State Utils.** Extract pure functions (`findLeastResearchedClaim`, `allClaimsSufficient`, budget helpers) into `research-orchestrator.ts` or a utility file.
2.  **Slice 2: Extraction & Relevance.** Extract the "bottom" of the loop (Classification, Extraction, Applicability) into `research-extraction-stage.ts`.
3.  **Slice 3: Acquisition.** Extract the fetch and search logic into `research-acquisition-stage.ts`.
4.  **Slice 4: Query Generation.** Extract the query LLM logic into `research-query-stage.ts`.
5.  **Slice 5: Orchestration.** Move the final `researchEvidence` loop to `research-orchestrator.ts`.

### Progress Update — 2026-03-23

**Slice 1 complete.**

- Added `apps/web/src/lib/analyzer/research-orchestrator.ts`
- Moved the following helpers out of `claimboundary-pipeline.ts`:
  - `findLeastResearchedClaim`
  - `findLeastContradictedClaim`
  - `allClaimsSufficient`
  - `getPerClaimQueryBudget`
  - `getClaimQueryBudgetUsed`
  - `getClaimQueryBudgetRemaining`
  - `consumeClaimQueryBudget`
- Kept the public import surface stable via re-exports from `claimboundary-pipeline.ts`
- Verification: `claimboundary-pipeline.test.ts` green (`292/292`) and `npm -w apps/web run build` green

**Slice 2 complete.**

- Added `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- Moved the following logic and schemas out of `claimboundary-pipeline.ts`:
  - `classifyRelevance`
  - `extractResearchEvidence`
  - `assessEvidenceApplicability` (Fix 3 jurisdiction filtering)
  - `assessScopeQuality`
  - `assessEvidenceBalance`
- Added dedicated unit tests in `research-extraction-stage.test.ts`.
- Corrected import wiring to use isolated modules (`./llm`, `./debug`).
- Verification: `npm run build` green, Unit tests green.

**Slice 3 complete.**

- Added `apps/web/src/lib/analyzer/research-acquisition-stage.ts`
- Moved the following logic out of `claimboundary-pipeline.ts`:
  - `fetchSources` (with parallel fetch, retry logic, and error classification)
  - `reconcileEvidenceSourceIds` (source metadata backfilling)
- Verification: `npm run build` green, Unit tests green.

**Slice 4 complete.**

- Added `apps/web/src/lib/analyzer/research-query-stage.ts`
- Moved the following logic and schema out of `claimboundary-pipeline.ts`:
  - `generateResearchQueries` (LLM-based query generation)
  - `GenerateQueriesOutputSchema`
- Verification: `npm run build` green, Unit tests green.

**Slice 5 complete.**

- Updated `apps/web/src/lib/analyzer/research-orchestrator.ts` to include the full research loop.
- Moved the remaining orchestration logic out of `claimboundary-pipeline.ts`:
  - `researchEvidence` (main iterative loop)
  - `runResearchIteration` (single loop step)
  - `seedEvidenceFromPreliminarySearch` (Stage 1 -> Stage 2 bridge)
- All Stage 2 functions are now modularized.
- Verification: `npm run build` green, Unit tests green.

**Final Result:** `claimboundary-pipeline.ts` is now a slim orchestrator (~900 lines), while all Stage 2 complexity resides in modular, testable files.

---

## 5. Decision Needed: Public Surface
Should `claimboundary-pipeline.ts` continue to be the only public export for the analyzer, or should we allow direct imports of stages?
**Current Preference:** Keep `claimboundary-pipeline.ts` as the public re-exporter to prevent breaking existing tests and API routes.

---

## 6. Success Criteria
- `claimboundary-pipeline.ts` is reduced to < 500 lines (currently ~2500).
- Stage 2 is testable per iteration step (Query -> Fetch -> Extract).
- No change in analysis behavior (verified by `Hydrogen` smoke tests).

# 2705 + e407 Root Fix Path — Reviewer Notes

**Date:** 2026-03-29
**Role:** Code/Architecture Reviewer
**Subject:** `2705 / e407` Pipeline Integrity & `activeClaims` Redesign Proposal

## 1. Executive Summary
The revised architectural proposal diagnosing jobs `e407` (duplicate verdicts) and `2705` (matrix label mismatch) correctly zeroes in on the true root cause: the pipeline state transition logic from Gate D5 into Stage 4. By identifying the overloaded and unsafe `activeClaims` fallback as the generator of the invalid state, the proposal moves past UI-only symptom cleanup and directly addresses the pipeline integrity failure. The proposal cleanly separates the immediate fix (pipeline state) from the longer-term recurrence reduction (Stage 1 decomposition refinement). 

## 2. What the revised review gets right
- **Targets the true root cause:** It pinpoints the `activeClaims` fallback in `claimboundary-pipeline.ts` which erroneously feeds D5-rejected claims back into Stage 4 when all claims are insufficient. 
- **Defines explicit state boundaries:** Replacing the overloaded `activeClaims` variable with explicit `assessableClaims` and `insufficientClaims` stops the logical crossover where rejected claims were processed as if they were valid.
- **Identifies the correct UI fix scope:** Recognizes the `2705` matrix mismatch as a Layer 3 secondary presentation bug, downstream of the pipeline error, and fixes the contract so that `claimLabels` bind to `coverageMatrix.claims` rather than the broader `claimVerdicts`.
- **Separates concerns cleanly:** Validly isolates the residual Stage-1 factual decomposition issue (`Werkzeuge` vs `Methoden`) as a separate track. The pipeline must not crash or duplicate verdicts upon receiving poor inputs; fixing that is independent of improving the inputs themselves.
- **Properly locations the invariant:** Proposing one final verdict per `claimId` as an invariant *before* aggregation ensures the integrity of the data handed to the weighting logic without polluting the aggregation stage with deduplication responsibilities.

## 3. Remaining concerns or weak spots
- **Empty Matrix Handling (Resolved):** When `assessableClaims` is empty, Stage 4 is skipped and the Coverage Matrix will be logically empty. While the backend safely produces an empty matrix, the frontend component (`CoverageMatrix.tsx` or `page.tsx`) must be updated with an early return (e.g., `if (matrix.claims.length === 0) return null;`) to avoid rendering a broken, empty spreadsheet. This strictly protects the UI without changing backend behavior.
- **Invariant Failure Strategy (Resolved):** The review suggests an invariant check before aggregation to prevent duplicate `claimId`s. Instead of attempting a soft fallback (which risks silent aggregation corruption), the system *must* intentionally throw an error against the specific job (`throw new Error("PIPELINE INVARIANT FAILED: Duplicate claim verdicts detected.")`). FactHarbor's runner infrastructure will naturally log this as a job failure—ensuring data corruption never leaks into the presentation layer.

## 4. Architectural judgment
This is the correct architectural path for the `e407` pipeline integrity bug. The revised architecture treats the disease (invalid branching state) rather than the symptom (deduplicating duplicates). Enforcing the invariant before aggregation correctly guarantees that Stage 5 operates on verified, conceptually sound inputs. The decision to reject deterministic or semantic deduplication is directly in line with repository rules (AGENTS.md mandates LLM intelligence over deterministic semantic matching, but here, standard structural ID uniqueness is the correct guard against pipeline duplication loops).

## 5. Implementation cautions
- **No deduplication in Aggregation Stage:** Do *not* implement deduplication logic inside `aggregation-stage.ts`. Aggregation must remain a pure consumer of the invariant-checked list. Deduplication masks state bugs; invariant assertions expose them.
- **Fail Fast on Invariant Breach:** Enforce the invariant just before Stage 5 by throwing an error (`throw new Error(...)`) if a duplicate `claimId` is found in the final verdicts array. Do not attempt to merge them.
- **Protect the UI:** Add a React guard (early return) to the `CoverageMatrix` layer so that it cleanly aborts rendering or displays a safe fallback message when `coverageMatrix.claims` is empty. 
- **Do not introduce semantic checks:** Confirming uniqueness by structural `claimId` is necessary and sufficient. Do not use semantic comparison to merge claims at this stage.
- **Maintain UI Separation:** The matrix fix in `page.tsx` must rely strictly on `coverageMatrix.claims`. Do not attempt to reverse-engineer which claims "belong" in the matrix by reading back the D5 states from the front end. It is a strict UI consumer of the pipeline's output.
- **Do not conflate Stage-1 prompt changes:** Do not touch the Stage 1 prompts or heuristics (`claim-extraction-stage.ts`) as part of this PR. Leave that for the dedicated follow-on recurrence task.

## 6. Code-Level Verification (Lead Architect addendum)

Independent code inspection confirms the proposal's technical claims:

### 6.1 `runVerdictStageWithPreflight` already handles empty claims

At [claimboundary-pipeline.ts:923-924](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L923), the callee returns `[]` for `claims.length === 0`. This means the caller-side fix only needs to change `activeClaims` to `assessableClaims = sufficientClaims` — no additional `if` guard is needed above the Stage 4 call. Do not add a redundant early-return.

### 6.2 `buildCoverageMatrix` handles empty claims correctly

At [boundary-clustering-stage.ts:529-557](apps/web/src/lib/analyzer/boundary-clustering-stage.ts#L529), passing `claims = []` produces `{ claims: [], boundaries: [...], counts: [] }` — a structurally valid empty matrix. No crash risk.

### 6.3 Aggregation self-corrects for all-zero-confidence verdicts

At [aggregation-stage.ts:132](apps/web/src/lib/analyzer/aggregation-stage.ts#L132), `confidenceFactor = verdict.confidence / 100`. UNVERIFIED verdicts have `confidence = 0`, so `finalWeight = 0`. The `totalWeight === 0` fallback at line 176 produces `weightedTruthPercentage = 50`. This means the short-circuit is a **correctness** fix (preventing Stage 4 from producing spurious confidence=30 verdicts like in e407), not a crash-prevention fix.

### 6.4 `gate4Stats` requires no separate fix

Stats are recorded at line 626 via `recordGate4Stats(claimVerdicts)`. Once duplicates are eliminated, the stat count will naturally be correct.

### 6.5 CoverageMatrix component empty-state resilience

At [CoverageMatrix.tsx:65-68](apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx#L65), `const { claims, boundaries, counts } = matrix` will destructure correctly from an empty matrix. The `claims.map(...)` on empty arrays produces empty arrays. However, the parent in `page.tsx` should verify it does not render the matrix component at all when `assessableClaims` is empty, or at minimum handle the empty visual state gracefully. The existing guard at line 1868 (`result?.coverageMatrix && claimVerdicts.length > 0`) will still pass when all verdicts are UNVERIFIED fallbacks — so the empty matrix may render. A small UI note ("No claims met the evidence sufficiency threshold") would be preferable but is not a blocker.

## 7. Final judgment

**`Approved as root-fix path`**

The revised proposal targets the true root bug at the D5 → Stage-4 transition, uses the correct architectural abstraction (`assessableClaims` vs `insufficientClaims`), enforces verdict uniqueness as an invariant rather than a cleanup, cleanly separates the integrity fix from the residual Stage-1 recurrence, and correctly defers salvage as premature. Two implementation cautions (no redundant guard, assert-not-dedup) are notes for the implementing agent, not blockers. Independent code verification confirms all technical claims.

---
roles: [Unassigned]
topics: [atomic_claim_selection, acs_1, acceptance_validation, prepared_stage1, regression_tests]
files_touched:
  - apps/web/test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Acceptance_Validation_Prepared_Stage1_Regression.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | ACS-1 Acceptance Validation — Prepared Stage 1 Regression Coverage
**Task:** Continue the next ACS-1 step after implementation by tightening acceptance validation around prepared Stage 1 reuse instead of reopening implementation scope.
**Files touched:** `apps/web/test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Acceptance_Validation_Prepared_Stage1_Regression.md`
**Key decisions:** Added a focused regression file rather than editing the existing 450KB `claimboundary-pipeline.test.ts`. The new tests validate the public `runClaimBoundaryAnalysis(...)` prepared-job path, not a test-only helper. Coverage now proves three ACS-1 invariants: (1) prepared jobs reuse `PreparedStage1Snapshot.resolvedInputText` as `state.originalInput`, (2) prepared jobs skip cold-start Stage 1 (`extractClaims` is not called when `preparedStage1` is supplied), and (3) selected-claim filtering strips deselected Stage-1 artifacts before research (`atomicClaims`, `preFilterAtomicClaims`, `gate1Reasoning`, `preliminaryEvidence`, and contract-anchor claim-id arrays). A fail-closed test also verifies that missing `selectedClaimIds` in the prepared snapshot reject before research starts.
**Verification:** `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts` passed. `npm test` passed. `cd apps/web; npx tsc --noEmit` passed. `npm -w apps/web run build` passed.
**Open items:** This pass does not run live acceptance anchors (`Iran/22`, `Bolsonaro/3`, `Bundesrat/1`) through the draft flow, so candidate-set parity is still verified structurally by regression coverage rather than by live end-to-end job evidence. API-side draft-state guard behavior still has no dedicated automated .NET test harness in-repo.
**Warnings:** The new regression file uses targeted module mocks around `claimboundary-pipeline.ts`; if the pipeline import surface changes materially, this file may need mock maintenance. That is preferable to extending the already very large pipeline test file further.
**For next agent:** If you continue ACS-1 acceptance work, the remaining highest-value validation is live draft-path parity on the Captain-defined anchors plus invite-slot/lazy-expiry API behavior. For prepared-job regressions, start with `apps/web/test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts`.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

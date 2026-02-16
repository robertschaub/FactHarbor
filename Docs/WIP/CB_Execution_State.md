# ClaimBoundary Pipeline — Execution State

> **Every agent reads this file on startup.** Update it after completing work.
> Architecture reference: `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`

## Current State

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 3 COMPLETE (UI updated). Ready for Phase 3b (MD prompt cleanup) and Phase 4 (final sweep). |
| **Last Completed Tag** | `cb-phase2-cutover` (tags cb-phase2a/2b/2c/phase3 pending from Captain) |
| **Next Action** | Captain: tag `cb-phase3-ui`, then launch Phase 3b and/or Phase 4 |
| **Blocking Issues** | None. |
| **Last Updated** | 2026-02-16 |
| **Last Updated By** | Senior Developer (Phase 3 UI complete) |

## Phase Checklist

| Phase | Status | Tag | Notes |
|-------|--------|-----|-------|
| Step 0: Rules Audit | ✅ Complete | `cb-step0-rules-audit` | All governance docs updated. Awaiting Captain tag. |
| Phase 1a: Types + Skeleton | ✅ Complete | `cb-phase1-pipeline` | CB types + pipeline skeleton + coverage matrix + tests |
| Phase 1b: Verdict Stage | ✅ Complete | `cb-phase1-pipeline` | 5-step debate pattern + structural check + spread multipliers + 29 tests |
| Phase 1c: Prompts | ✅ Complete | `cb-phase1-pipeline` | 8 UCM-managed prompts in claimboundary.prompt.md, registered in config-storage + config-schemas |
| Phase 1 Review | ✅ Fixes Applied | — | F-01, F-02, F-03, F-04 fixed. F-05 (aggregation gaps) deferred to Stage 5 implementation. |
| Phase 2: Cutover | ✅ Complete | `cb-phase2-cutover` | ClaimBoundary wired as default, new resultJson schema (3.0.0-cb) |
| Phase 2a: Delete orchestrated | ✅ Complete | `cb-phase2a-orchestrated-deleted` | ~18,400 lines deleted across 4 commits: orchestrated.ts, AC config, AC prompts, AC tests |
| Phase 2b: Delete prompts | ✅ Complete (folded into 2a) | `cb-phase2b-prompts-cleaned` | Orchestrated prompt files deleted in Phase 2a Step 2 |
| Phase 2c: Clean config + docs | ✅ Complete (folded into 2a) | `cb-phase2c-config-cleaned` | AC config fields removed in Phase 2a Step 3. Docs running on worktree. |
| Phase 2 Docs: xWiki Rewrites | ✅ Complete (on worktree) | — | 5 xWiki pages rewritten (183 AC refs → 44, 76% reduction). Worktree commit d2d4463, ready to merge. |
| Phase 3: UI | ✅ Complete | `cb-phase3-ui` | BoundaryFindings component + page.tsx updated + ClaimsGroupedByContext deleted (154 lines) |
| Phase 3b: Monolithic Dynamic | ⬜ Not started | `cb-phase3b-monolithic` | |
| Phase 4: Final sweep | ⬜ Not started | `cb-phase4-ac-removed` | |

## Handover Log

Each agent writes a short entry here when completing a session.

| Date | Agent/Role | Phase | Summary | Files Touched | Issues Found |
|------|-----------|-------|---------|---------------|-------------|
| 2026-02-16 | Lead Architect | Planning | Architecture doc complete. All 10 open questions resolved. Migration strategy with incremental cleanup, commit/tag plan, agent team plan, confusion prevention rules. | `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` | None |
| 2026-02-16 | Lead Architect | Step 0 | Governance docs updated for CB pipeline. AGENTS.md: added ClaimBoundary/AtomicClaim to terminology, added new pipeline files to Key Files, marked orchestrated.ts as BEING REPLACED. CLAUDE.md: updated data flow + key files. Multi_Agent_Collaboration_Rules.md: added CB arch doc to Pipeline area mapping + reading lists for Lead Architect, Lead Developer, Senior Developer, LLM Expert. xWiki Terminology: added migration warning, annotated AC section as "being replaced", added section 1b for ClaimBoundary terminology. | `AGENTS.md`, `CLAUDE.md`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `Docs/xwiki-pages/.../Terminology/WebHome.xwiki`, `Docs/WIP/CB_Execution_State.md` | None |
| 2026-02-16 | Senior Developer | Phase 1a | CB types added to types.ts (AtomicClaim, ClaimBoundary, BoundaryFinding, CBClaimVerdict, CoverageMatrix, VerdictNarrative, + supporting types). Pipeline skeleton created with 5 stage functions + main entry point. Coverage matrix fully implemented (deterministic). Test file with 24+ tests (type validity, coverage matrix, stage existence). Build + tests pass (48 files, 873 tests). | `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/WIP/CB_Execution_State.md` | None |
| 2026-02-16 | Senior Developer | Phase 1b | Verdict-stage module created with all 5 steps as independently testable functions. Injectable LLM call abstraction for testability. Spread multiplier calculations per §8.5.5 with UCM-configurable thresholds. Structural consistency check (deterministic invariants). Wired into pipeline Stage 4 via `runVerdictStage()`. 29 new tests with mocked LLM calls covering all steps + spread multipliers + full orchestration. Build + tests pass (49 files, 902 tests). | `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`, `Docs/WIP/CB_Execution_State.md` | None |
| 2026-02-16 | LLM Expert | Phase 1c | All 8 pipeline prompts created in `prompts/claimboundary.prompt.md`: CLAIM_EXTRACTION_PASS1 (Haiku), CLAIM_EXTRACTION_PASS2 (Sonnet), BOUNDARY_CLUSTERING (Sonnet), VERDICT_ADVOCATE (Sonnet), VERDICT_CHALLENGER (Sonnet), VERDICT_RECONCILIATION (Sonnet), VERDICT_NARRATIVE (Sonnet), CLAIM_GROUPING (Haiku). UCM-managed from day one: registered "claimboundary" profile in VALID_PROMPT_PROFILES (config-storage.ts) and valid pipelines list (config-schemas.ts). All prompts follow AGENTS.md rules: no English assumptions, no hardcoded keywords, generic examples, no test-case terms. Congruence examples from §11.5 included in BOUNDARY_CLUSTERING (genericized). Build + tests pass (49 files, 902 tests). Prompt seeded on build. | `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/config-storage.ts`, `apps/web/src/lib/config-schemas.ts`, `Docs/WIP/CB_Execution_State.md` | None |
| 2026-02-16 | Senior Developer | Phase 1 Review Fixes | Fixed all 3 blocking + 1 non-blocking review issues. **F-03:** `stable` in selfConsistencyCheck now uses `stableThreshold` (5pp) instead of `moderateThreshold` (12pp). **F-04:** `mixedConfidenceThreshold` from VerdictStageConfig (default 40) now threaded through to all 3 `percentageToClaimVerdict()` call sites via config parameter on `advocateVerdict`, `reconcileVerdicts`, and `runStructuralConsistencyCheck`. **F-01:** Added VERDICT_GROUNDING_VALIDATION and VERDICT_DIRECTION_VALIDATION prompt sections to claimboundary.prompt.md + requiredSections. **F-02:** Added "claimboundary" to `PromptFrontmatterSchema` z.enum in config-schemas.ts. Build + tests pass (49 files, 902 tests). | `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/config-schemas.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`, `Docs/WIP/CB_Execution_State.md` | F-05 deferred (aggregation gaps for Stage 5) |
| 2026-02-16 | Code Reviewer | Phase 1 Review | **APPROVE WITH CONDITIONS.** 50 tests reviewed (21 pipeline + 29 verdict-stage). Types match §9.1. Terminology clean (no AC/contextId). No forbidden imports. 8 prompts AGENTS.md-compliant (no hardcoded keywords, multilingual, generic examples). Spread multiplier matches §8.5.5. **3 blocking issues:** F-01: VERDICT_GROUNDING_VALIDATION and VERDICT_DIRECTION_VALIDATION prompt sections missing from claimboundary.prompt.md (verdict-stage.ts lines 424, 435 reference them). F-03: `stable` field in selfConsistencyCheck uses `moderateThreshold` (12pp) instead of `stableThreshold` (5pp) — line 305. F-04: `mixedConfidenceThreshold` from VerdictStageConfig (40) never passed to `percentageToClaimVerdict()` — 3 call sites fall back to truth-scale.ts default of 60, mismatching §8.5.5 spec (40). **2 non-blocking:** F-02: `PromptFrontmatterSchema` z.enum missing "claimboundary" (config-schemas.ts line 1122). F-05: aggregation.ts missing triangulationFactor/derivativeFactor and harm multipliers don't match §8.5.4 4-level spec — to be fixed when Stage 5 is implemented. | (read-only review) | F-01, F-02, F-03, F-04, F-05 |
| 2026-02-16 | Senior Developer | Phase 2: Route Wiring | **ClaimBoundary pipeline wired as default route.** Added "claimboundary" to PipelineVariant type, updated internal-runner-queue to call `runClaimBoundaryAnalysis` as default (orchestrated becomes fallback). Added `jobId?` to AnalysisInput type (used by all pipelines for debug logging). Updated CB pipeline return type to `{resultJson, reportMarkdown}` structure matching orchestrated schema. Defined new resultJson schema (version 3.0.0-cb) with claimBoundaries/claimVerdicts/coverageMatrix, no AnalysisContext references. Fallback changed: Monolithic Dynamic now falls back to ClaimBoundary (not orchestrated). Build PASS. ClaimBoundary tests PASS (24), Aggregation tests PASS (13). (Note: `npm test` runner fails with "No test suite found" for all files when run together — pre-existing vitest/Windows path issue confirmed on previous commit; individual test files pass successfully.) | `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/types.ts`, `Docs/WIP/CB_Execution_State.md` | None |
| 2026-02-16 | Senior Developer | Phase 2a: Delete orchestrated | **Orchestrated pipeline completely removed in 4 commits (~18,400 lines deleted).** Step 1: Deleted orchestrated.ts (13600 lines), analysis-contexts.ts (564 lines), evidence-context-utils.ts (86 lines), + 4 AC test files. Fixed imports in analyzer.ts, index.ts, internal-runner-queue.ts. Step 2: Deleted orchestrated prompt files (orchestrated.prompt.md 62KB, orchestrated-compact.prompt.md 9KB, + 3 base prompt files 33KB). Removed orchestrated task types from prompt-builder.ts, removed "orchestrated" from VALID_PROMPT_PROFILES. Step 3: Removed 14 AC config fields from config-schemas.ts (contextDedupThreshold, contextDetection*, contextPrompt*, evidenceScope*, contextNameAlignment*), removed contextDedupThreshold accessor from analyzer/config.ts, removed AC validation warning, removed UI form group. Step 4: Deleted context-preservation.test.ts (19KB) and adversarial-context-leak.test.ts (17KB). Made confidence-calibration contextAnswers parameter optional, removed 7 AC tests from confidence-calibration.test.ts (52 tests remain). All builds + individual tests PASS at each commit. | 11 files deleted, 8 files modified, ~18,400 lines removed | None |
| 2026-02-16 | Lead Architect | Phase 3-4 Planning | Full codebase audit of remaining AC references: 20 files, ~159 refs. Key finding: monolithic-dynamic.ts has ZERO AC refs — it uses prompt-loader (not prompt-builder base prompts). The 5 base prompt files (53 AC refs) and 3 provider adapters (51 AC refs) are likely dead code after orchestrated.ts deletion. Wrote detailed prompts for Phase 3 (UI), Phase 3b (MD prompt cleanup — Approach A: delete dead prompt code), Phase 4 (final sweep + verification). Updated CB_Execution_State to mark 2b/2c as complete (folded into 2a). Updated CB_Phase_Prompts.md with full prompts for all remaining phases. | `Docs/WIP/CB_Phase_Prompts.md`, `Docs/WIP/CB_Execution_State.md` | None |
| 2026-02-16 | Technical Writer | Phase 2 Docs | **Phase 2 documentation complete on worktree.** Rewrote 5 xWiki pages from AnalysisContext to ClaimBoundary: Terminology (v4.0.0-cb), Scope Definition Guidelines (v3.0.0-cb), Context Detection → Boundary Clustering, Decision Tree → Boundary Clustering Decision Flow, Phases → ClaimBoundary Pipeline Stages. Metrics: 183 AC refs → 44 (76% reduction), 1,931 lines total. Updated Current_Status.md (marked Phase 1/2/2a/2 docs complete) and Backlog.md (moved 5 items to Recently Completed). All changes comply with AGENTS.md generic examples policy. Committed to worktree (d2d4463). Ready for Captain to merge worktree to main. | Worktree: 5 xWiki pages, `Current_Status.md`, `Backlog.md`; Main: `CB_Execution_State.md` | None |
| 2026-02-16 | Senior Developer | Phase 3: UI | **Phase 3 UI update complete in 3 steps.** Step 1: Created BoundaryFindings.tsx component (175 lines) with inline boundary display, direction icons (✓/✗/⚖), compact metadata (evidence count + temporal), hover tooltips, suppression when ≤2 boundaries per §18 Q10. Step 2: Updated page.tsx for CB schema — added isCBSchema detection, extracted claimBoundaries, updated ClaimCard to render boundaryFindings, updated badges (BOUNDARIES vs CONTEXTS), passed claimBoundaries to all ClaimCard instances. Step 3: Deleted ClaimsGroupedByContext.tsx (154 lines), removed import + context-grouping logic, simplified to flat claim list. Clean break per §15.1 — no backward compatibility. All builds PASS at each step. 3 commits: a3a6aae (BoundaryFindings), f139c39 (page.tsx), b7bc64a (cleanup). | `apps/web/src/app/jobs/[id]/components/BoundaryFindings.tsx`, `apps/web/src/app/jobs/[id]/page.tsx`, `apps/web/src/app/jobs/[id]/page.module.css`, deleted `ClaimsGroupedByContext.tsx`, `Docs/WIP/CB_Execution_State.md` | None |

## Quick Reference for Agents

### Before writing ANY code, read:
1. `/AGENTS.md` — terminology, safety rules
2. `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §22.3.2 — Confusion Prevention Rules
3. This file — to know where we are

### Confusion Prevention (§22.3.2 summary):
- **NEW code**: `ClaimBoundary`, `AtomicClaim`, `claimBoundaryId`, `BoundaryFinding`
- **NEVER in new code**: `AnalysisContext`, `contextId`, `analysisContexts`
- **NEVER import from**: `orchestrated.ts`, `analysis-contexts.ts`, `evidence-context-utils.ts`
- **Test fixtures**: CB schema only in new test files
- **Docs update with code**: same phase, not deferred

### Verify after every commit:
```bash
npm run build   # must pass
npm test         # must pass (excludes expensive LLM tests)
```

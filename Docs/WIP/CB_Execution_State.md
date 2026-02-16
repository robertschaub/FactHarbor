# ClaimBoundary Pipeline — Execution State

> **Every agent reads this file on startup.** Update it after completing work.
> Architecture reference: `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`

## Current State

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 1c COMPLETE — all pipeline prompts (UCM-managed) |
| **Last Completed Tag** | `cb-step0-rules-audit` |
| **Next Action** | Captain: review Phase 1c, then launch Phase 2 (cutover) |
| **Blocking Issues** | None |
| **Last Updated** | 2026-02-16 |
| **Last Updated By** | LLM Expert (Phase 1c execution) |

## Phase Checklist

| Phase | Status | Tag | Notes |
|-------|--------|-----|-------|
| Step 0: Rules Audit | ✅ Complete | `cb-step0-rules-audit` | All governance docs updated. Awaiting Captain tag. |
| Phase 1a: Types + Skeleton | ✅ Complete | `cb-phase1-pipeline` | CB types + pipeline skeleton + coverage matrix + tests |
| Phase 1b: Verdict Stage | ✅ Complete | `cb-phase1-pipeline` | 5-step debate pattern + structural check + spread multipliers + 29 tests |
| Phase 1c: Prompts | ✅ Complete | `cb-phase1-pipeline` | 8 UCM-managed prompts in claimboundary.prompt.md, registered in config-storage + config-schemas |
| Phase 2: Cutover | ⬜ Not started | `cb-phase2-cutover` | |
| Phase 2a: Delete orchestrated | ⬜ Not started | `cb-phase2a-orchestrated-deleted` | |
| Phase 2b: Delete prompts | ⬜ Not started | `cb-phase2b-prompts-cleaned` | |
| Phase 2c: Clean config + docs | ⬜ Not started | `cb-phase2c-config-cleaned` | |
| Phase 3: UI | ⬜ Not started | `cb-phase3-ui` | |
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

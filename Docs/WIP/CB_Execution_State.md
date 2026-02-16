# ClaimBoundary Pipeline — Execution State

> **Every agent reads this file on startup.** Update it after completing work.
> Architecture reference: `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`

## Current State

| Field | Value |
|-------|-------|
| **Current Phase** | Step 0 COMPLETE — ready for Captain to tag and start Phase 1 |
| **Last Completed Tag** | `pre-claimboundary-redesign` (awaiting `cb-step0-rules-audit` tag from Captain) |
| **Next Action** | Captain: review changes, tag `cb-step0-rules-audit`, then launch Phase 1a |
| **Blocking Issues** | None |
| **Last Updated** | 2026-02-16 |
| **Last Updated By** | Lead Architect (Step 0 execution) |

## Phase Checklist

| Phase | Status | Tag | Notes |
|-------|--------|-----|-------|
| Step 0: Rules Audit | ✅ Complete | `cb-step0-rules-audit` | All governance docs updated. Awaiting Captain tag. |
| Phase 1: Pipeline + Types | ⬜ Not started | `cb-phase1-pipeline` | |
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

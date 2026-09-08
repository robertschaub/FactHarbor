---
name: pipeline
description: Deep analysis of the FactHarbor CB pipeline. Use for debugging, architecture decisions, evidence quality issues, or reviewing changes that span multiple pipeline stages.
allowed-tools: Read Glob Grep Bash
---

Bind this workflow to the documents, diff or question in the current authorized task and any explicit invocation arguments (`TASK_ARGUMENTS`). This name is a description, not a client-expanded variable or shell expression; do not guess the active editor file. Skill loading does not expand action, path or writable-state authority. Follow root AGENTS.md and the assigned session profile; return proposals/findings in chat when read-only.



Analyze the FactHarbor ClaimAssessmentBoundary pipeline for: TASK_ARGUMENTS

For pipeline fix decisions, isolate root cause before patches, prioritize quality over speed over cost, and use review/debate when the issue crosses stage boundaries or affects prompt/config behavior.

**Before forming any conclusion**, read every file relevant to the concern. Key files by area:

| Area | Files |
|------|-------|
| Orchestration / data flow | `claimboundary-pipeline.ts`, `research-orchestrator.ts` |
| Claim extraction | `claim-extraction-stage.ts` |
| Query generation | `research-query-stage.ts` |
| Source acquisition | `research-acquisition-stage.ts` |
| Evidence extraction | `research-extraction-stage.ts` |
| Evidence filtering | `evidence-filter.ts` |
| Boundary clustering | `boundary-clustering-stage.ts` |
| Verdict generation | `verdict-generation-stage.ts` |
| Aggregation | `aggregation-stage.ts` |
| Types / contracts | `types.ts`, `pipeline-utils.ts` |

All files are under `apps/web/src/lib/analyzer/`.

Apply AGENTS.md rules throughout:
- No deterministic text-analysis logic — LLM intelligence for any meaning decision
- No hardcoded keywords or domain-specific logic
- Read enough source and surrounding context to establish the mechanism; apply root large-prompt section rules
- After a focused validation failure (for example `npm test`, `npm -w apps/web run build`, or the explicitly described manual check), classify the current attempt as `keep`, `amend`, `revert`, `quarantine`, or `add` before proposing a broader multi-stage change
- Treat that as bounded backtracking, not blanket rollback-first behavior

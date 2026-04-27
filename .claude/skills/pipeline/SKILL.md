---
name: pipeline
description: Deep analysis of the FactHarbor CB pipeline. Use for debugging, architecture decisions, evidence quality issues, or reviewing changes that span multiple pipeline stages.
allowed-tools: Read Glob Grep Bash
---

ultrathink

Analyze the FactHarbor ClaimAssessmentBoundary pipeline for: $ARGUMENTS

For pipeline fix decisions, apply `AGENTS.md` §Analysis Pipeline Fix Protocol: root cause before patches, quality first, and review/debate when the issue crosses stage boundaries or affects prompt/config behavior.

When the concern is an `UNVERIFIED` job, apply `AGENTS.md` §Analysis Pipeline Fix Protocol's UNVERIFIED ambiguity discipline before drawing a root-cause conclusion: treat `UNVERIFIED` as an unresolved suspicious outcome, not as automatic evidence scarcity and not as automatic FactHarbor failure. Inspect the exact job first, then use `/report-review`'s UNVERIFIED Ambiguity Escalation for report review, quality/regression review, suspicious-job debugging, or any conclusion that the result reflects genuine evidence scarcity. Same-input comparisons must compare prepared and selected `AtomicClaims`, not only final verdict labels. Do not classify the result as genuine evidence scarcity unless a bounded external evidence check and local acquisition-health review show accessible material evidence is insufficient.

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
- Read fully before editing — do not propose changes based on partial reads
- After a focused validation failure (for example `npm test`, `npm -w apps/web run build`, or the explicitly described manual check), classify the current attempt as `keep`, `quarantine`, or `revert` before proposing a broader multi-stage change
- Treat that as bounded backtracking, not blanket rollback-first behavior

---
name: debug
description: Diagnose a scoped pipeline failure using captured logs and test results; reproduce only within an authorized writable assignment.
allowed-tools: Bash Read Glob
---

Bind this workflow to the documents, diff or question in the current authorized task and any explicit invocation arguments (`TASK_ARGUMENTS`). This name is a description, not a client-expanded variable or shell expression; do not guess the active editor file. Skill loading does not expand action, path or writable-state authority. Follow root AGENTS.md and the assigned session profile; return proposals/findings in chat when read-only.



Analyze recent pipeline runs for issues.
Focus: TASK_ARGUMENTS (leave blank for general post-change check)

For analysis-pipeline issue investigations, identify root cause before recommending fixes, prioritize quality over speed over cost, and escalate to `/pipeline`, `/prompt-diagnosis`, `/report-review`, or `/debate` only when this quick check is too narrow.

**Step 1 — Read the debug log:**
Read `apps/web/debug-analyzer.log`. If large, read the last 300 lines.
Identify: errors, warnings, stage failures, contract violations, unexpected LLM outputs, timing anomalies.

**Step 2 — Inspect verification evidence:**
Use existing failure output in a read-only assignment. If reproduction is needed and authorized, select focused offline checks and declare their output/cache/temp destinations; do not make a broad suite the default. A combined diagnosis/reproduction assignment can cover this in one session. Report unavailable evidence without claiming a run occurred.

**Step 3 — Pattern analysis:**
Look for:
- Stage failures or aborts (which stage, which input)
- Evidence quality issues — unusually low probativeValue rates, claimDirection inversions
- Boundary clustering anomalies — single boundary when multiple expected, or vice versa
- Verdict direction errors — counter-evidence treated as supporting evidence
- Contract validation failures — prompt output rejected by schema validator

**Step 4 — Correlate with recent changes:**
Run `git log --oneline -5` to see what changed.
Identify whether issues correlate with specific commits.

**Step 5 — Failed-attempt recovery discipline:**
If the first focused validation for the slice failed (for example `npm test`, `npm -w apps/web run build`, or the manual verification explicitly described for the change), do not jump straight to a broader fix package.
First classify the earlier attempt as `keep`, `amend`, `revert`, `quarantine`, or `add`.
Keep only the parts still justified by the evidence from Steps 1-4.
Broaden scope only if the failure evidence shows why a wider change is required.

**Step 6 — Report findings:**
Summarize in priority order. For each issue: stage where it occurs, likely cause, recommended fix.

Compare report-quality findings against the root Captain comparator/expectation sources. Use only Captain's exact approved inputs for any separately authorized live run. Recommend `/validate` only when new measurement is needed; that recommendation grants no execution authority.

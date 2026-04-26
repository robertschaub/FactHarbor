---
name: debug
description: Analyze debug-analyzer.log and run tests to identify pipeline issues after a change. Standard post-change check per Captain's protocol.
allowed-tools: Bash Read Glob
---

ultrathink

Analyze recent pipeline runs for issues.
Focus: $ARGUMENTS (leave blank for general post-change check)

For analysis-pipeline issue investigations, apply `AGENTS.md` §Analysis Pipeline Fix Protocol: identify root cause before recommending fixes, prioritize quality over speed over cost, and escalate to `/pipeline`, `/prompt-diagnosis`, `/report-review`, or `/debate` when this quick check is too narrow.

**Step 1 — Read the debug log:**
Read `apps/web/debug-analyzer.log`. If large, read the last 300 lines.
Identify: errors, warnings, stage failures, contract violations, unexpected LLM outputs, timing anomalies.

**Step 2 — Run tests:**
Run `npm test 2>&1 | tail -40` and check pass/fail summary.
(Note: `npm test` is safe — it excludes expensive LLM tests.)

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
First classify the earlier attempt as `keep`, `quarantine`, or `revert`.
Keep only the parts still justified by the evidence from Steps 1-4.
Broaden scope only if the failure evidence shows why a wider change is required.

**Step 6 — Report findings:**
Summarize in priority order. For each issue: stage where it occurs, likely cause, recommended fix.

Flag any regressions in the Captain's priority benchmark families:
- Bolsonaro judgment (question and statement variants)
- Hydrogen vs. Electric Cars
- Venezuela article

If regressions are found, recommend running `/validate` for a full measurement.

---
name: validate
description: Run FactHarbor post-change validation on benchmark families and analyze results. CAUTION — submits real analysis jobs. Use after pipeline or prompt changes to verify no regressions.
allowed-tools: Bash Read
disable-model-invocation: true
---

ultrathink

Run validation for change: $ARGUMENTS

**Step 1 — Understand what changed:**
Run `git log --oneline -5` and `git diff HEAD~1 --stat` to identify the scope of recent changes.

Before submitting jobs, `AGENTS.md` §Live Job Submission Discipline applies: commit relevant source/prompt/config changes, refresh/reseed/restart affected runtime state as needed, and monitor live jobs per §Analysis Pipeline Fix Protocol.

**Step 2 — Run validation batch:**
From the project root run:
`npm run validate:run -- post-$ARGUMENTS`
This submits 16 benchmark families and writes JSON summaries to `test-output/validation/`.

**Step 3 — Compare to baseline (if a prior run exists):**
List available runs: `ls test-output/validation/`
If a baseline exists, run: `npm run validate:compare -- <baselineDir> <newDir>`

**Step 4 — Analyze results:**
Apply the Captain's principle: **"improve the system not the data"** — all fixes must be generic, never input-specific.

Pay particular attention to these priority families (Captain's benchmark protocol):
- Bolsonaro judgment — both question and statement variants
- Hydrogen vs. Electric Cars
- Venezuela article

For each **regression**: identify which pipeline stage and which recent change caused it. For each **improvement**: confirm it is generic and not overfitted to these inputs. Recommend next steps.

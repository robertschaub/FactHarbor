## Task
Investigate the newly submitted reports and determine whether the recent prompt fixes and narrow Stage 1 pruning patch were effective in real runs.

## Scope
- Investigated only existing reports in the local job store.
- Focused on the five tracked inputs:
  - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
  - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
  - `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
  - `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
  - `Plastic recycling is pointless`

## New reports found
- `161879319cd445d784021d443e919f06`
  - input: `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
  - created: `2026-04-15T09:36:52Z`
  - verdict: `LEANING-TRUE 68`
  - git: `c7a5ed7839e4e380fcb74812935fe94ca09dd2f4+b95e6294`
- `8f73cf66aed9421b9f197a8675f1e8e7`
  - input: `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
  - created: `2026-04-15T09:35:52Z`
  - verdict: `TRUE 87`
  - git: `c7a5ed7839e4e380fcb74812935fe94ca09dd2f4+b95e6294`
- `7333cb1f1ee6472b9c782e94e4aa7b0e`
  - input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
  - created: `2026-04-15T09:37:08Z`
  - verdict: `LEANING-FALSE 35`
  - git: `c7a5ed7839e4e380fcb74812935fe94ca09dd2f4+b95e6294`

## Key comparison
The decisive comparison is against the earlier runs on the same prompt hash:

### Treaty input with `rechtskräftig`
- Earlier run:
  - `85843ef4f98144f2afa7a088b9371dd9`
  - git: `c7a5ed...+6cedbc8a`
  - prompt hash: `f17e326e48536f4acc71de296ee5e22d3aa883cb3d07d5829f2bfa2486883bc9`
  - Stage 1 accepted claims: `3`
  - final claim verdicts: `AC_01=55`, `AC_02=95`, `AC_03=97`
  - top-level verdict: `MOSTLY-TRUE 75`
- New run:
  - `161879319cd445d784021d443e919f06`
  - git: `c7a5ed...+b95e6294`
  - prompt hash: same `f17e326e...`
  - Stage 1 accepted claims: `1`
  - final claim verdicts: only `AC_01=68`
  - top-level verdict: `LEANING-TRUE 68`

### Treaty input without `rechtskräftig`
- Earlier run:
  - `0a533220d8a24bc2ae6335c96a013352`
  - git: `c7a5ed...+6cedbc8a`
  - prompt hash: `f17e326e...`
  - Stage 1 accepted claims: `3`
  - final claim verdicts: `AC_01=92`, `AC_02=93`, `AC_03=72`
  - top-level verdict: `TRUE 92`
- New run:
  - `8f73cf66aed9421b9f197a8675f1e8e7`
  - git: `c7a5ed...+b95e6294`
  - prompt hash: same `f17e326e...`
  - Stage 1 accepted claims: `1`
  - final claim verdicts: only `AC_01=87`
  - top-level verdict: `TRUE 87`

## Conclusions
### 1. The prompt fixes remain correct
- The new reports still use prompt hash `f17e326e...`
- The anchor is preserved correctly in both treaty jobs:
  - `rechtskräftig bevor Volk und Parlament darüber entschieden haben`
  - `bevor Volk und Parlament darüber entschieden haben`
- This confirms the earlier prompt repair remains effective

### 2. The new Stage 1 pruning patch is effective in live runs
- The prompt hash did not change between the earlier and newer treaty runs
- The git worktree hash did change from `+6cedbc8a` to `+b95e6294`
- The accepted Stage 1 claim set dropped from `3` claims to `1` claim on both treaty inputs
- The final claimVerdicts also dropped to the single anchor-carrying claim
- That isolates the improvement to the code change in `claim-extraction-stage.ts`, not the prompt

### 3. The outcome is better calibrated
- Earlier treaty runs were inflated by extra claims that were not the intended thesis carriers
- New runs keep only the direct anchor-carrying claim
- The resulting top-level scores are lower but more defensible:
  - `75 -> 68` on the `rechtskräftig` input
  - `92 -> 87` on the plain chronology input
- This is the expected direction after removing high-scoring fidelity-drift extras

### 4. The asylum report remains a control
- `7333cb1f1ee6472b9c782e94e4aa7b0e` on the current build still has exactly one accepted Stage 1 claim and one final claim verdict
- No extraction regression is visible there
- The verdict remains volatile across runs, but that is still downstream variance, not a Stage 1 regression

### 5. No new Bolsonaro or plastic reports were found
- The latest reports for those inputs in the local store are still the April 14 runs
- They still use the old prompt hash `5f77ae08...`
- They do not provide evidence against the current prompt or pruning changes

## Caveat
- The final stored `gate1Stats.filteredCount` is still `0` in the new treaty jobs even though the accepted set is now pruned to one claim.
- So runtime behavior improved, but serialized observability is incomplete.
- If we want auditability of what was removed, we should persist pre-prune fidelity telemetry separately instead of only the final accepted set.

## Verdict
- Keep the prompt fixes
- Keep the narrow Stage 1 pruning patch
- Do not modify them based on the new reports
- Optional follow-up: improve persisted telemetry so the report payload makes the pruning event explicit

## Warnings
- Several unrelated files in the worktree were already dirty/untracked during this investigation. I did not revert or normalize unrelated changes.

## Learnings
- Same prompt hash plus different worktree hash is the cleanest way to attribute the treaty-job improvement to the code patch rather than to prompt drift.
- The remaining issue after the live fix is observability, not claim-set quality.

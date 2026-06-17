---
### 2026-05-28 | Lead Architect | Codex (GPT-5) | Main Stabilization Analysis Regression Takeover

**Task:** Handover for the investigation: determine whether commits added after the stabilized `406393c9` checkpoint worsen analysis quality, compare reports submitted so far, and use at most 8 new jobs.

**Current repo state:** `main` and `origin/main` point to `fdb47ebc` (`docs(agent): record main stabilization extra picks`). The analysis-code layer under that docs commit is `3e94e53e`. Current runtime `/version` reported `fdb47ebc922caab0e2d621c05be315275636b64f+c5e3b8bb`.

**Do not overwrite current dirty work:** At handoff, the worktree has unrelated in-progress changes from another agent:
- `Docs/AGENTS/Agent_Outputs.md`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/drain-runner-pause.integration.test.ts`
- `Docs/AGENTS/Handoffs/2026-05-28_Senior_Developer_Zero_Directional_Citation_Guard_Review.md` (untracked)

**Old/new main branch map:**
- Old main before rehome is preserved at `codex/current-main-2026-05-27-before-rehome` = `284dde1f`.
- Safety branch before extra picks is `codex/stabilized-main-before-extra-picks-2026-05-27` = `406393c9`.
- New `main` was rebuilt from the pre-problem history through `d528b62c`, then safe commits were cherry-picked on top. `origin/main` was first force-with-lease pushed to `406393c9`, then normal-pushed to `3e94e53e`, then docs-pushed to `fdb47ebc`.
- The deployed no-UNVERIFIED reference noted by Captain was `2f7a2805c44c3a72f9102c94f54aee30bd114ba9`; Captain explicitly said not to hunt earlier than that.

**Safe commits on new main after `d528b62c` and before `406393c9`:**
`b692ae17`, `c8e8cdd1`, `0a2c9d40`, `a7f091a0`, `25c32015`, `cf4cc466`, `453a2b5d`, `8106015f`, `91806080`, `1680a4db`, `8f88d18c`, `cbfb9bf2`, `d894f0a7`, `b8b8d44e`, `b2d86928`, `1f1b5e6d`, `43ecd9bd`, `122cbac3`, `82f90779`, `45606613`, `a446b7cc`, `d29a1621`, `582911fb`, `d8252255`, `b9edb48f`, `09c1e153`, `4e9c3caf`, `0fee6ef8`, `b67a50c1`, `406393c9`.

**Extra cherry-picks after `406393c9`:**
- Original `93302844` -> new `8800bd54`: retain longer claim selection reasons.
- Original `48b34617` -> new `82a1aa17`: exclude zero-citation INSUFFICIENT claims from article aggregation.
- Original `2d07162e` -> new `551e714b`: bound narrative confidence downgrade to configurable max delta.
- Original `a131bb41` -> new `2d1c3253`: telemetry split for `safeDowngradeVerdict`; conflict resolution deliberately kept stabilized direction-repair behavior and did not pull in skipped cascade behavior.
- Original `53423586` -> new `73b612a4`: close grounding-policy leak in direction-repair fallback.
- New `977ce6f6`: quarantined tests accidentally imported from skipped integrity-cascade commits; no runtime behavior.
- Original `aa1e2c31` -> new `3e94e53e`: expose `narrativeConfidenceMaxDownwardDelta` in admin calculation editor.
- New `fdb47ebc`: documentation-only handoff commit.

**Still skipped / suspicious commits not on new main:**
- `d04587ba` fix(analyzer): tighten Bolsonaro verdict integrity.
- `ca510f4c` fix(analyzer): remove article-wide integrity cascade, soften directness rule.
- `9b2c6039` fix(analyzer): mechanical surface-pattern recognition for bundled evaluative claims.
These are the remaining candidates if a later cherry-pick loop resumes. They should be investigated separately; do not batch them into main without focused evidence.

**Validation already completed before this handoff:**
- Focused selector/verdict/config tests: 263 passed.
- Focused aggregation/narrative-cap tests: 5 passed.
- `npm -w apps/web run build` passed.
- `origin/main` pushed successfully to `3e94e53e`, then docs commit `fdb47ebc`.

**Existing report comparison before new jobs:**
- Plastic, approved input `Plastic recycling is pointless`:
  - `406393c9` job `9fcef05057944517ad889ca29f151ef6`: `MOSTLY-FALSE` 16/66, 73 evidence, 45 sources, no report damage.
  - `3e94e53e` job `ebc9c696ff6d48488f215abee445c52f`: `MOSTLY-FALSE` 26/48, 84 evidence, 39 sources, one claim-level insufficiency, no report damage.
  - Both are outside the current corrected true-side `plastic-en` expectation. This is not evidence that post-`406393c9` extra picks worsened plastic; it was already false-side at `406393c9`.
- Hydrogen, approved input `Using hydrogen for cars is more efficient than using electricity`:
  - `406393c9` job `1a65c002d42646b888f837bbeb78bc5c`: `FALSE` 9/75, healthy.
  - `3e94e53e` job `a8fc5d9eb91e479eac20070450470eb0`: `UNVERIFIED` 50/0, report_damaged, zero evidence. Root class was F1 Stage 1 contract-retry non-convergence.
  - Immediate `3e94e53e` reruns `e6bb6cf61c0b464e926a959cb95a38d0` and `82028fee20104e02a51cba35c5d6afae`: both `FALSE` 8/82 and 8/74, healthy.
  - Current `fdb47ebc` job `69969689a0184fa39e9f1c4f2739cc5a`: `FALSE` 8/78, healthy. Existing inverse `b23820b61ab54a72b76355d1c92050aa`: `MOSTLY-TRUE` 80/72.
  - Interpretation: no clear hydrogen worsening from extra picks; F1 remains stochastic/open.
- Bolsonaro EN question, approved input:
  - `406393c9` job `dbbfd0260aeb4bcc97eb596b0b0b9bcd`: `MIXED` 48/50, one claim-level UNVERIFIED, no report damage.
  - `3e94e53e` job `076f8a43107b48c1919a9af69e239027`: `MIXED` 52/50, one claim-level UNVERIFIED, no report damage.
  - Interpretation: no clear worsening; both are below the current 55-75 truth band but within/near normal variance and structurally similar.
- Bolsonaro statement variant (not in AGENTS current approved input list, but Captain had used it in this thread):
  - `406393c9` job `3927d4e800e2492db0d84c654fe14e64`: `UNVERIFIED` 49/31, 22 evidence, 21 sources, not report_damaged.
  - `3e94e53e` job `cb2b4b09394045e785dce0be565933b7`: `UNVERIFIED` 50/0, report_damaged, zero evidence.
  - Interpretation: concerning, but do not submit more of this exact statement unless Captain explicitly re-approves it as an allowed validation input; it is not in the current AGENTS-approved list.

**New jobs submitted in this takeover investigation:** 4 of max 8 job budget used. Remaining budget: 4.
- `ffd9a744030f4d46b28046f8daf63efc`: plastic repeat A, current `fdb47ebc`, RUNNING at last poll, 55%.
- `044f0c966d1d494da2754c7381592e46`: plastic repeat B, current `fdb47ebc`, RUNNING at last poll, 58%.
- `cd8303513c084ab5a095f1a69f64950e`: Bolsonaro EN question, current `fdb47ebc`, QUEUED at last poll.
- `d3cc4155049c43bc9d205d4fc58564c7`: Bolsonaro PT approved variant, current `fdb47ebc`, QUEUED at last poll.
- Pre-existing unrelated URL job `447ff5fb14ff4e76afedb8a8b43882ba` was already running before these submissions and was still RUNNING at 60%.

**Recommended next steps for takeover agent:**
1. Monitor the five active jobs above to completion before submitting more.
2. Extract the same metrics used above: verdict, truth/confidence, evidence/source counts, claim count, claim-level UNVERIFIED count, `report_damaged`, and integrity warnings.
3. If both fresh plastic repeats remain false-side, treat plastic as an existing calibration/expectation/evidence issue, not caused specifically by post-`406393c9` extra picks.
4. If Bolsonaro EN/PT current jobs report-damage or materially degrade, inspect whether failures are F1 contract non-convergence, F3 direction/grounding downgrade, or evidence acquisition collapse before attributing to commits.
5. Spend remaining 4-job budget only after seeing these outcomes. Best candidates: one `bundesrat-rechtskraftig`, one `asylum-235000-de`, one `asylum-wwii-de`, and one targeted repeat of whichever family fails in the active wave.
6. Avoid restarting services while jobs are running unless they stall hard; if restarting, record that it invalidates incomplete job interpretation.

**Useful polling/extraction command pattern:**
```powershell
$ids = @(
  'ffd9a744030f4d46b28046f8daf63efc',
  '044f0c966d1d494da2754c7381592e46',
  'cd8303513c084ab5a095f1a69f64950e',
  'd3cc4155049c43bc9d205d4fc58564c7'
)
foreach ($id in $ids) {
  $r = Invoke-RestMethod -Uri "http://localhost:5000/v1/jobs/$id" -TimeoutSec 20
  $res = $r.resultJson
  $warnings = @($res.analysisWarnings)
  $claimVerdicts = @($res.claimVerdicts)
  $unverifiedClaims = @($claimVerdicts | Where-Object { $_.verdict -eq 'UNVERIFIED' -or $_.confidenceTier -eq 'INSUFFICIENT' })
  [pscustomobject]@{
    jobId=$id; status=$r.status; verdict=$r.verdictLabel; truth=$r.truthPercentage; confidence=$r.confidence;
    evidence=@($res.evidenceItems).Count; sources=@($res.sources).Count; claims=$claimVerdicts.Count;
    unverifiedClaims=$unverifiedClaims.Count;
    damaged=[bool](@($warnings | Where-Object { $_.type -eq 'report_damaged' }).Count)
  }
}
```

**Warnings:** The current local runtime is on docs commit `fdb47ebc`; analysis code is unchanged from `3e94e53e`, but job hashes will show `fdb47ebc`. Be explicit about that distinction in any comparison.

**Learnings:** No new role learning appended.

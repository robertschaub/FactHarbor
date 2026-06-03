# Claimboundary report quality over time — longitudinal diagram + reading

**Date:** 2026-06-03 · **Role:** Lead Architect · **Status:** delivered, read-only
**Artifacts (dual x-axis):**
`claimboundary-quality-by-build.png` / `…-by-submission.png` (by kind),
`claimboundary-quality-by-branch-build.png` / `…-branch-submission.png` (by branch),
`test-output/quality-ts.csv` (carries both `builddate` and `iso`).
**Tooling (read-only):** `quality-timeseries.cjs` (score+coverage+branch+builddate),
`quality-chart.py {build|submission}` (by kind), `quality-chart-branch.py {build|submission}` (by branch).

## Two x-axes (both kept)
- **PRIMARY — BUILD date** = committer date of `ExecutedWebGitCommitHash` (the commit/build that
  produced the report). Isolates *code-version* quality; excludes the 645 no-commit reports
  (build unknown) → covers builds 2026-03-28 .. 2026-06-02.
- **ALSO — JOB SUBMISSION date** = `CreatedUtc` (when the report ran). Includes ALL 2134 reports
  (submission time always exists) → covers 2026-03-01 .. 2026-06-03. Kept specifically to expose
  **LLM-provider drift**: if quality falls over *calendar run time* but the build-date view is flat
  for the same builds, that points to the model degrading, not the code. (Context: Claude Opus 4.6
  is known to have degraded ~mid-Feb–March.) **Caveat:** our earliest report is 2026-03-01, so this
  dataset cannot see mid-February; the early-March field-health baseline (~80) is the earliest we have,
  and the submission-axis decline (~80 early-Mar → ~55–69 April) is NOT yet decomposed into
  model-drift vs code vs input-mix — a *same-build-vs-run-time* controlled cut is the clean test.

## Coverage — every report DB incl. PRODUCTION (verified), V1 claimboundary only
Enumerated every `.db` under `C:\DEV` with a `Jobs` table + pulled the **production** DB from the
Infomaniak VPS (`/opt/factharbor/data/factharbor.db` → `test-output/prod/factharbor-prod.db`,
`PRAGMA integrity_check = ok`). Unioned all, deduped by JobId (first-wins). **V1 filter =
`meta.pipeline === 'claimboundary'` exactly** (excludes 196 `claimboundary-v2` + 4 monolithic).
**Total = 2134 unique V1 claimboundary reports.**

| DB | role | unique V1 added |
|---|---|---|
| `test-output/prod/factharbor-prod.db` | **PRODUCTION (deployed instance)** | **186** |
| `apps/api/factharbor.db` | local main (dev) | 1587 |
| `test-output/candidate-ranking-corrected/...` | ranking copy (May 3–23 gap) | 338 |
| `FH-unverified-2f7-isolation/apps/api/factharbor.db` | isolation experiment | 23 |
| `FH-rehome-validation/.../factharbor-rehome-validation.db` | rehome worktree | 0 (subset) |
| `test-output/candidate-ranking-extended-2026-05-23/...` | ranking copy | 0 (= corrected) |

**Production coverage note:** prod holds 186 V1 reports, **2026-03-03 .. 2026-05-28** (no production
jobs recorded after May 28; deployed commit is `2f7a2805`, Apr 22). All `meta.pipeline='claimboundary'`,
0% dirty (production never runs a modified tree). Test instance (`test.factharbor.ch`,
`/opt/factharbor/data-test/`) not pulled — say the word if its reports are also wanted.

### PROD vs dev — the deployed-quality reference
PROD overall mean **77** (n=186) vs dev `main` **64** — prod is consistently the **top line** on the
by-branch chart. This *leans toward* the Captain's prior (deployed ≳ HEAD), **but** with a confound:
prod is **0% dirty and field-input-heavy**, whereas dev `main` is **73% dirty experiments + benchmark
stress-batches** that drag the heuristic down. So the 77-vs-64 gap is partly mix, not purely "deployed
code is better." Prod is the realistic real-world signal and sits solidly healthy (~77).

## Branch separation — multi-membership (a report appears under EVERY branch containing its commit)
Tooling: `quality-branch-membership.cjs` (`git for-each-ref --contains`). Filters (Captain's rules):
keep `main` always; keep a non-main branch only if it has **≥10 divergent-from-main report-commits**
("fully redundant" = adds no report-commit beyond main → dropped; "<10 commits" measured on the
divergent-from-main set); collapse exact mirrors. Dropped 34 refs (all dependabot/backup/chore +
origin/* mirrors). **7 survivor branches:**

| branch | reports | divergent-from-main commits | % dirty |
|---|---|---|---|
| Pipeline_V2 | 1050 | 180 | 75% |
| codex/main-before-v2-rehome (rehome) | 1035 | 174 | 75% |
| codex/private-admin-repo-cutover | 985 | 127 | 80% |
| codex/integrate-admin-preparation-access | 916 | 92 | 79% |
| codex/private-admin-repo-cutover-clean | 913 | 91 | 79% |
| **main** (current HEAD) | 863 | 0 | 73% |
| codex/current-main-2026-05-27-before-rehome | 780 | 12 | 75% |
| *untracked (no commit, pre ~Mar 28)* | 564 | — | 0% |
| *orphan (commit on no branch tip)* | 44 | — | — |

**Key structural finding: `main` (current HEAD) is *lean*** — only 174 contained report-commits /
863 reports. Several codex/rehome branches contain *more* report-commits than main, because **most
experiments were never merged into main** — they live on side branches. So the per-branch lines are
*identical Mar→early-May* (shared history) and only **fan out in late May** where the rabbit-holes
diverged (rehome spikes up ~May 25; others dip).

**Caveats on reading the branch lines:** (1) **~75% of every branch's reports ran on a dirty/experiment
tree** — these are not pristine-branch behavior. (2) The late-May per-branch spread is still partly
benchmark-mix (the divergent reports differ in input/family composition). (3) Three survivors
(`*-admin-repo-cutover*`, `integrate-admin-preparation-access`) are downstream admin-plumbing snapshots
that share most of the same report lineage — distinct in report-set (so not "fully redundant") but not
analytically separate rabbit-holes. The 4 meaningful lineages are main / rehome / codex-pre-rehome /
Pipeline_V2.


## What was built
Every claimboundary report from claimboundary's first run (2026-03-01) to HEAD (2026-06-03),
**n=2121**, unioned from the local DB + the candidate-ranking copy (which carries the May 3–23
local gap), deduped by JobId. Each report scored 0–100 by **Captain criteria**
(`Docs/AGENTS/Captain_Quality_Expectations.md`):
- Q-HF1 hard-failure floor (report_damaged / analysis_generation_failed / llm_provider_error) → 5/8
- top-level UNVERIFIED → 20 (bench) / 30 (generic)
- benchmark families (ground truth): in-band(verdict+truth+conf, ±8) = 95, label-only = 65, off-band = 30
- generic (no ground truth): base 85 − 45×(checkworthy-UNVERIFIED rate) − 15 if verdict_integrity_failure

**Build timepoint (x-axis) = committer date of the analysis-build commit**, NOT job submission time
(`CreatedUtc`). Commit source: prefer `ExecutedWebGitCommitHash` (web/analysis build); **fall back to
`GitCommitHash` (co-deployed API build)** when the web hash wasn't recorded — this recovers +239 early
reports (build coverage 1489 → **1728/2134**, range now **2026-03-21 .. 2026-06-02**). `+dirty`/`+overlay`
experiments use their base commit's date. Reports with **no commit at all (406, Mar 1–21) are excluded**
from the build-date charts (build unknown; no fallback to submission date).
**Origin:** diagrams now extend back to the claimboundary origin commit **`9cdc8889` (2026-02-17**,
"switch verdict to Sonnet", just after CB was wired as default Feb 16) — green dashed marker. **No
claimboundary report data exists before Mar 1** in any DB (incl. production), so Feb 17–Mar 1 is an
empty origin gap and Mar 1–21 appears only on the submission axis. Markers: deployed (Apr 22), rehome
(May 24), gated/HEAD era (May 28).

## Headline: the naive "decline" is a measurement artifact, not a quality regression
The naive aggregate weekly mean falls 79 → 35 (mid-May) → recovers ~60. **That curve is a
report-MIX signal, not a quality signal:**
- The benchmark fraction climbs over time — Mar **12%** → late-Apr **71%** → mid-May **90%**.
- Benchmark scores are bimodal/harsh ({5,20,30,65,95}); generic clusters ~85.
- So as benchmarking cadence rose, the mixed mean was dragged down mechanically.
- The mid-May trough = a **benchmark-stress batch** (one week: n=196 bench, 64% off-band), not field collapse.

The chart is therefore drawn **split by kind** (generic/field line + benchmark line + a bench-fraction
panel) so the confound is visible rather than hidden. The single linear-trend line was dropped — it
implied a steady decline and hid the late-May recovery.

## Artifact audit (checked, not assumed)
- **Early-high baseline is NOT a coverage artifact.** `checkWorthiness` is populated in **100%** of
  generic reports in Mar / early-Apr / late-Apr — the checkworthy-UNVERIFIED penalty *can* fire in
  every era, so early reports are not artificially high.

## Authoritative controlled read (lead with this, not the scatter)
Per-family in-band rate, **same input**, deployed-era vs HEAD-era (`benchmark-band-era-check.cjs`).
This is the reviewers' correct pass-criterion (bands), and the authoritative HEAD-vs-deployed read:

| family | deployed in-band | HEAD in-band | Δ | note |
|---|---|---|---|---|
| hydrogen-en (FALSE) | 74% (n=54) | 81% (n=16) | **+7** | HEAD better |
| bolsonaro-en | 17% (n=52) | 25% (n=12) | **+8** | HEAD better |
| bolsonaro-pt | 75% (n=20) | 86% (n=7) | **+11** | HEAD better |
| bundesrat-rechtskräftig | 50% (n=62) | 50% (n=4) | **0** | flat |
| asylum-235000-de | 36% (n=47) | 14% (n=7) | **−22** | HEAD worse (small n) |
| plastic-en | 70% (n=88) | 29% (n=17) | **−41** | HEAD worse (ambiguous, deprioritized) |

**Net: no uniform "HEAD < deployed."** Clear-truth families (hydrogen, bolsonaro) are flat-or-better
at HEAD; the two worse families are the interpretively-ambiguous ones with small HEAD-era n. HEAD-era
samples are small (n=4–17/family), so treat the worse deltas as signals to watch, not proof.

## The one robust concern that survives (from earlier free analysis)
HEAD extracts ~30–45% **fewer evidence items per source** than deployed on the same inputs (same
source counts/boundaries) → thinner pools → more drift on ambiguous families — consistent with the two
HEAD-worse families being the ambiguous ones. May be **partly benign dedup** (May-26 evidence-ID
changes a446b7cc/54fe23c3). This is the open lever, not a verdict-gate regression (gates exonerated).

## Bottom line for the Captain
The diagram literally answers the ask. But read correctly it does **not** confirm "HEAD quality <
deployed" as a build regression — the dramatic dip is a benchmarking-cadence artifact, and the
controlled same-input read is mixed/flat with clear-truth families improving. The remaining real
question is the evidence-yield drop on ambiguous families, which needs controlled runs to pin (cost
the Captain has deemed too high so far).

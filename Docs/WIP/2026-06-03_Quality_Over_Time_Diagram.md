# Claimboundary report quality over time — longitudinal diagram + reading

**Date:** 2026-06-03 · **Role:** Lead Architect · **Status:** delivered, read-only
**Artifacts:** `test-output/claimboundary-quality-over-time.png` (by kind),
`test-output/claimboundary-quality-by-branch.png` (by branch), `test-output/quality-ts.csv`
**Tooling (read-only):** `scripts/diag/quality-timeseries.cjs` (score+coverage+branch),
`scripts/diag/quality-chart.py` (by kind), `scripts/diag/quality-chart-branch.py` (by branch)

## Coverage — every report DB on disk (verified)
Enumerated every `.db` under `C:\DEV` with a `Jobs` table (config/cache DBs excluded). Five hold
reports; unioned all, deduped by JobId (first-wins). **Total = 2144 unique claimboundary reports.**

| DB | role | unique CB added |
|---|---|---|
| `apps/api/factharbor.db` | local main | 1587 |
| `test-output/candidate-ranking-corrected/...` | ranking copy (May 3–23 gap) | 534 |
| `FH-unverified-2f7-isolation/apps/api/factharbor.db` | isolation experiment | 23 |
| `FH-rehome-validation/.../factharbor-rehome-validation.db` | rehome worktree | 0 (subset) |
| `test-output/candidate-ranking-extended-2026-05-23/...` | ranking copy | 0 (= corrected) |

**Caveat — production:** the deployed/production DB lives on the server, **not on this machine**, so
its reports are NOT in this dataset. Including them needs a server dump.

## Branch separation (by base-commit ancestry; `+dirty`/`+overlay` suffix stripped)
| branch | n | mean score | dirty (experiment) |
|---|---|---|---|
| main | 863 | 64 | 633 |
| untracked (pre commit-recording, ~early Mar) | 564 | 78 | 0 |
| rehome | 323 | 57 | 248 |
| Pipeline_V2 | 211 | **34** | 42 |
| other-branch | 142 | 59 | 67 |
| codex-pre-rehome | 41 | 56 | 39 |

**48% of all reports (1029/2144) ran on a *dirty* working tree** — the A/B / candidate-ranking /
bolso experiments — so their base "branch" is the commit they forked from, not pristine branch
behavior. `ExecutedWebGitCommitHash` stores `<40hash>`, `<40hash>+dirty`, or `<40hash>+<overlayhash>`.
Pipeline_V2 (mean 34) is the lowest-quality branch — consistent with it being dropped; these are
claimboundary reports that *ran on* Pipeline_V2 commits and can be filtered if out of scope.


## What was built
Every claimboundary report from claimboundary's first run (2026-03-01) to HEAD (2026-06-03),
**n=2121**, unioned from the local DB + the candidate-ranking copy (which carries the May 3–23
local gap), deduped by JobId. Each report scored 0–100 by **Captain criteria**
(`Docs/AGENTS/Captain_Quality_Expectations.md`):
- Q-HF1 hard-failure floor (report_damaged / analysis_generation_failed / llm_provider_error) → 5/8
- top-level UNVERIFIED → 20 (bench) / 30 (generic)
- benchmark families (ground truth): in-band(verdict+truth+conf, ±8) = 95, label-only = 65, off-band = 30
- generic (no ground truth): base 85 − 45×(checkworthy-UNVERIFIED rate) − 15 if verdict_integrity_failure

Build timepoint = CreatedUtc (the build live when the report ran). Markers: deployed (Apr 22),
rehome (May 24), gated/HEAD era (May 28).

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

# Best ClaimBoundary Reports — Best-Commit Range & Report-Regression Consolidated Findings

- **Date:** 2026-06-02
- **Author role:** Lead Architect (Claude Opus 4.8, 1M)
- **Question (user / Captain):** *Which commit — or commit range — produced the best ClaimBoundary reports so far? Rate report quality against Captain's documented + recently-discussed expectations. Investigate the whole local + deployed job history, build on earlier analysis, and document the changes we made along the way that caused report regressions.*
- **Status:** CONSOLIDATION (resumes the paused best-commit investigation). Read-only — no analysis jobs run, no code/config changed. Scored stored reports in `apps/api/factharbor.db` (n = 1,589 SUCCEEDED, 1,041 commit-tagged, 2026-03-01 → 06-02) + deployed public job list.
- **Supersedes/extends:** `Docs/WIP/2026-05-31_Best_Commit_Identification_Strategy_Proposal.md` (v2) and its companion `Docs/WIP/2026-06-01_V1_Quality_Decline_Attribution_and_RecA_Refutation.md`; resumes `Docs/AGENTS/Handoffs/2026-06-01_Senior_Architect_BestCommit_Investigation_Pause.md`.

---

## TL;DR (read this first)

1. **There is no single global "best commit." Report quality is family-specific** — every prior investigation (8 of them, Apr 6 → May 28) and this one reach the same conclusion. No code state is simultaneously best across all benchmark families.
2. **The best-reports *range* is the April 2026 quality-restoration window (~Apr 3 → Apr 22).** Within it:
   - **Screened composite peak: `424b9652` (Apr 22)** — `fix(stage1): preserve article contract-approved claim sets`. Composite **87** across 6 families on current Captain bands (re-reproduced today on the live DB). Its 4-commit epoch (`424b9652..2f7a2805`) is the deployed-prod bundle.
   - **Deployed-production reports confirmed clean on current bands** — the strongest cross-environment evidence: Bolsonaro `b7783872` (Apr 4) / `521040e9` (Apr 3) with **71–102 evidence items**; asylum-235000 `ace3c114` (Apr 20) / `f1a372bf` (Apr 6).
3. **`424b9652` is a *screened* leader, not a measured winner.** Three caveats travel with the headline (the third is the most important, surfaced by the adversarial pass — §6.1): (a) it leads partly as a **batch artifact** — a large April validation batch gave it n≥3 coverage in 6 families (e.g. bolsonaro-en n=37) others never got, and 3 of those 6 are *saturated* families; equalized to discriminating families only its composite is **75**, not 87 (still the leader — no challenger overtakes it). (b) It is **weak on bolsonaro-en locally** (mean 67; 21/37 UNVERIFIED) — but the deployed-clean Bolsonaro reports from the same era show that's **evidence-scarcity, not a code defect**. (c) **"424b9652" is a calendar-window label, not a reproducible bundle** — the screen attributes reports to epochs by date against a `--first-parent` log; the jobs in that "epoch" actually ran on **34 distinct off-main commits**, several with their own prompt edits. Read it as *"the April window is the best-sampled period,"* which is exactly why the answer is a **range** and why only a controlled A/B can pin a reproducible "best."
4. **The apparent calendar-time quality decline is real in raw numbers but largely *misattributed*.** Dominant drivers are **input-mix** (May load was 53% hard Bolsonaro legal-prediction inputs), an **Apr-10 instrumentation change** that started emitting/aborting on `report_damaged`, and a **late-May source-fetch severity bump**. It is **not** a Pass-2 model downgrade — **do not revert Rec-A.**
5. **Only one *confirmed code regression* exists in the recent window, and it was caught and fixed same-day:** the Codex `2395f494` (Jun 1) applicability-classifier *fail-closed* defect → fixed by `85f129a9`/`29bcb33b` (Jun 1, fail-open).
6. **Fresh signal (post-pause):** source-fetch fixes landed Jun 1–2 (`362a9312` search-provider swap, `af026923` PDF/response-cap, `d09d1973`). The newest commit shows per-attempt 403 back at April levels (26.8%, vs the late-May 38–40% bump) — **but n=11, and the search swap changes which domains are queried, so this is suggestive, not established.**
7. **No fresh paid runs were made and none are recommended without explicit budget approval.** A clean live A/B (April-peak-replay vs pinned-HEAD) remains the only way to settle "is HEAD better or worse than the April peak," and it is gated on the fetch layer being healthy enough to produce non-degenerate reports.
8. **MAJOR caveat — a Pipeline_V2 fork + main re-home distorts the local screen (§2.4, user-confirmed + git-verified).** A V2 rebuild was attempted (forked from `2f7a2805`/Apr 22), dropped, and `main` re-homed from the Apr-22 base (~May 24–27). **Result: 0 of 81 execution commits behind Apr 23–May 2 reports are on current main** — they ran on the now-dropped fork. So the screen's `424b9652` epoch is **fork-contaminated** for everything after Apr 22, the May 3–23 DB gap is the V2-attempt period, and the Captain's May 10–12 `latestVerifiedJobId` canaries are absent locally (deployed-only). **The deployed-production reports (all pre-fork) become the single most trustworthy current-main "best" evidence;** the local screen cannot rank current-main states across the fork.

---

## 1. The quality bar used (what "best" means)

"Best" is **not** an invented rubric — it is scored against the **Captain's documented triad**, which is also the most recent quality discussion:

| Source | Role | Last updated |
|---|---|---|
| `Docs/AGENTS/Captain_Quality_Expectations.md` | Intent, comparator reports, "what to do next" | 2026-05-31 (+ two generic expectations added 2026-06-01) |
| `Docs/AGENTS/benchmark-expectations.json` | Mechanical per-family verdict/truth/confidence bands, `latestVerifiedJobId`, `noiseTolerancePct: 8` | 2026-05-12 (plastic band recalibrated in narrative 2026-05-31) |
| `Docs/AGENTS/report-quality-expectations.json` | Q-code structural checks (Q-HF*, Q-BE*, Q-EV*, Q-ST*, Q-WS*) | — |

**"Recently discussed" items folded in:** (a) the **2026-05-31 plastic recalibration** to a *centered* band (LEANING-FALSE/MIXED/LEANING-TRUE, truth 42–65, conf ≤75, reading-declaration required); (b) the two **2026-06-01 generic expectations** — *no quality-gate hard-failure* (Q-HF1 PHASE-BLOCKER floor; measured 8.6% hard-failure population-wide) and *checkworthy-AC UNVERIFIED is a bad smell unless Captain confirms* (measured 24.2% of checkworthy claims).

> ⚠️ **Scope flag for the user:** I treated the documented triad as the bar. If "recently discussed" refers to a verbal/chat decision *not yet written into these files*, point me to it — I did not find a newer quality-bar artifact in WIP/Handoffs beyond the 2026-06-01 consolidation.

The scoring method (severity-tiered Q-code penalties — HIGH −25 / MEDIUM −10; a Q-HF1 hard-fail or zero-evidence/zero-boundary/zero-verdict report = 0 and is *excluded*, with the failure itself recorded) is implemented in `scripts/diag/best-commit-phase1.cjs` and ranks every stored report against **current** bands.

---

## 2. The answer: best-reports commit *range*

### 2.1 Why a range, not a point

The user asked for a range, and the data supports a range rather than a single commit. **April 2026 was a concentrated report-quality-restoration sprint** — roughly 50 report-affecting commits in Apr 18–22 alone (Stage-1 contract-preservation, atomicity decomposition, verdict-direction repair, acquisition prioritization, fair-trial scope narrowing). That sprint produced the cluster of best reports across environments:

| Anchor | Commit | Date | What it is | Evidence it's "best" |
|---|---|---|---|---|
| **Screened composite peak** | `424b9652` | Apr 22 | `fix(stage1): preserve article contract-approved claim sets` | Composite **87** / 6 families (current bands); on-band mean 100 on bundesrat-rk, asylum-wwii, hydrogen |
| Deployed-prod sibling | `2f7a2805` | Apr 22 | prod bundle (same 4-commit epoch as `424b9652`) | deployed jobs trace here |
| Deployed-clean Bolsonaro | `b7783872` / `521040e9` | Apr 4 / Apr 3 | grounding-scope / env-sync bundle | `eb02cd2e` MOSTLY-TRUE 73/70 (102 ev); `cfd508bc` LEANING-TRUE 71/66 (71 ev) — both on-band |
| Deployed-clean asylum-235000 | `ace3c114` / `f1a372bf` | Apr 20 / Apr 6 | rescue-gating / docs bundle | `6a60b3eb` MOSTLY-TRUE 72/70; `2e3cb0da` LEANING-TRUE 62/65 — both on-band |

**Headline statement:** *The best ClaimBoundary reports so far were produced during the April-2026 quality-restoration window (~Apr 3 – Apr 22), peaking at the `424b9652` epoch (Apr 22). Deployed-production reports from this window are the strongest, cleanest examples on current bands.*

> Note: `521040e9` and `f1a372bf` are chore/docs commits — the recorded hash is whatever HEAD was when the job ran; the *code* is the nearest preceding analyzer change. The commit-as-bundle model still holds (prompts/config moved via committed default files), so the bundle is reconstructable by checkout.

> The **Captain-file's *named-best* deployed bolsonaro-en comparator** is `85812d61` (LEANING-TRUE 68/62) — independently re-confirmed on-band by the verification agent (§6.2). The `b7783872`/`521040e9`-traced jobs (`eb02cd2e`/`cfd508bc`) above are the strategy-doc's commit-recovered deployed examples; both sets are real and on-band. Prefer `85812d61` when aligning to the bar's official comparator table.

### 2.2 Phase-1 historical screen — reproduced on the current DB (2026-06-02, FREE)

`node scripts/diag/best-commit-phase1.cjs` over **512 family-matched reports** (8 scoreable families), current bands, ±8 noise:

| # | State | Date | Composite | Families n≥3 |
|---|---|---|---|---|
| 1 | **`424b9652`** | 04-22 | **87** | 6 [bundesrat-rk, asylum-235000, asylum-wwii, bolsonaro-en, bolsonaro-pt, hydrogen] |
| 2 | `2395f494` | 06-01 | 79 | 2 [bundesrat-rk, bolsonaro-en] |
| 3 | `8d0098d7` | 04-15 | 78 | 3 [asylum-235000, bolsonaro-en, hydrogen] |
| 4 | `01aa3203` | 04-18 | 71 | 2 |
| 5 | `6164ef8e` | 05-25 | 69 | 3 |

`424b9652` per-family: bundesrat-rk **100** (n=6), asylum-wwii **100** (n=8), hydrogen **100** (n=7), asylum-235000 77 (n=9), bolsonaro-pt 80 (n=5), **bolsonaro-en 67** (n=37, 21 UNVERIFIED). The headline is unchanged from the May-31 screen — it is robust to a day's worth of new jobs.

> **Do not over-read the thin recent cells.** `2395f494`'s composite 79 is only 2 families at n=3; `af026923` (the Jun-2 fetch fix) scores hydrogen 100 but only on n=3 of a **saturated** family (~100 for everyone). Neither is evidence that the recent commits improved real quality — both are below the n≥3-per-discriminating-family threshold the strategy doc warns produces noise-ranking.

> ⚠️ **NEW — local DB coverage gap (May 3 – May 23, 2026).** First-hand daily counts show the local `factharbor.db` ran jobs through **May 2**, then **nothing until May 24** — a ~3-week hole (May first-half has only 21 jobs, all on May 1–2). Two consequences: (a) **the local historical screen is blind to most of May** — it has no report data for the code states live then, so their absence from the ranking is a *coverage gap, not evidence they were bad*; (b) **the Captain-named `latestVerifiedJobId` comparators in `benchmark-expectations.json` (the May 10–12 "current canary"/"isolated rerun" reports — `f8e72c84`, `bb2133a1`, `1de78d0a`, `aedb3a05`, `9e1f0f00`, `ce265797`) are NOT in the local main DB** (verified by direct 8-hex-prefix lookup — genuinely absent, not an ID-format miss). They were run on the deployed/isolated stack and are **not locally re-inspectable** — anyone using the bar to re-open those accepted reports locally will fail; use the deployed environment for them. **Root cause now known: this gap is the Pipeline_V2-attempt period — see §2.4.**

### 2.3 Current per-family status vs the bar (from `benchmark-expectations.json`)

| Family | Band (truth / conf) | Status | Best comparator (local) | Latest verified |
|---|---|---|---|---|
| bundesrat-rechtskraftig | MIXED/LT/LF · 35–60 / 55–85 | CONFIRMED current-stack | `f8e72c84` LF 32/80 | `f8e72c84` |
| bundesrat-simple | TRUE/MT · 85–100 / 75–95 | CONFIRMED-HEAD (timing watch) | `a6b0e0fc` TRUE 97/89 | `1de78d0a` TRUE 97/93 |
| asylum-235000-de | LT/MT · 58–75 / 40–70 | IMPROVED (stability watch) | `bb2133a1` MT 78/68 | `bb2133a1` |
| asylum-wwii-de | MF/LF · 18–42 / 50–75 | FIRST-BAND (watch) | `9e1f0f00` MF 25/73 | `ce265797` LF 30/63 |
| bolsonaro-en | LT/MT · 58–85 / 45–75 | CAPTAIN-ACCEPTED (watch) | `91bf6083` LT 63/52 | `aedb3a05` LT 64/43 |
| bolsonaro-pt | LT/MT · 58–85 / 45–75 | CONFIRMED-HEAD | `e182f37a` LT 67/60 | `da3580fe` LT 58/61 |
| hydrogen-en | FALSE/MF · 5–25 / 65–85 | SOLVED | `24654634` FALSE 14/77 | `1f838f8b` FALSE 8/78 |
| plastic-en | LF/MIXED/LT · 42–65 (target 50–60) / ≤75 | RECALIBRATED-centered | `32f00bb3` MF 21/68 (lower-edge) | `939563ec` LF 37/62 |

*(Independent DB resolution of these comparator job IDs is in §6 — Agent verification.)*

### 2.4 Provenance reality — the Pipeline_V2 fork + main re-home (user-confirmed, git-verified) ⚠️ MAJOR

**The local screen's headline is distorted by a branch event the screen cannot see.** Per the user (and confirmed against git): a **Pipeline_V2 rebuild was attempted, then dropped, and `main` was re-branched ("re-homed") from an earlier point.** Git timeline:

- **`Pipeline_V2` and the abandoned-main line both fork from `2f7a2805` (Apr 22)** — i.e. the `424b9652` epoch is exactly the fork point. (Matches the dropped-V2 record: merge-base 2026-04-22.)
- The abandoned line (`codex/main-before-v2-rehome`, tip May 14) and the V2 branch (tip `26861b9a`, May 24) carried **late-April → May development off the lineage that became current main.**
- `main` was **re-homed back to the Apr-22 base around May 24–27** (`codex/stabilized-main-rehome-2026-05-27`), then continued forward to today's HEAD.

**Measured consequence (git-verified, CR-clean):** of the **81 distinct execution commits** behind reports created **Apr 23 – May 2** (the post-fork window that still has local data), **0 are on current main** — all are on the now-dropped fork line (reachable on the `Pipeline_V2` / `codex/*-rehome` branches, not on HEAD's ancestry). *(A broader lineage pass over all 261 distinct hashes in the period found 173 HEAD-lineage / 88 dropped-fork / 0 locally GC'd — the dropped commits are still in-repo on those branches, so an earlier "≈38 GC'd" figure was a resolution artifact and is retracted; the load-bearing fact "0 on current main" is robust.)* The adversarial agent independently found the same for bolsonaro-en (all 35 epoch reports ran on 34 distinct hashes, none `424b9652`, none a HEAD ancestor).

**This reframes the screen's #1 result.** `best-commit-phase1.cjs` attributes reports to `424b9652` by *calendar*, so the "424b9652 epoch" (Apr 22 → May 24) **pools reports that executed on the dropped Pipeline_V2-era fork, not on current main.** The genuinely-current-main slices in the local DB are: **pre-fork (≤Apr 22, 259 jobs)**, the **post-rehome window (May 24+, 196 jobs — execution hashes confirmed on current main: `6164ef8e`/`68d8b61a`/`d09d1973`/`af026923`)**, and June. The **fork-window (Apr 23 – May 23, 119 jobs) is dropped-fork**, and the **May 3–23 sub-gap** is simply when the local stack wasn't writing this DB during the V2 attempt.

**What this does to the "best" answer:**
- **`424b9652`/`2f7a2805` (Apr 22) is still genuinely on current main** — it *is* the fork point, and the **pre-fork April restoration sprint (through `2f7a2805`) is real current-main lineage.** The headline "April window" stands for *that* (pre-fork) work.
- **But the screen's `424b9652` = 87 is NOT a clean current-main signal** — its post-Apr-22 reports are dropped-fork. So the load-bearing evidence for "best on current main" shifts to the **deployed-production reports** (Apr 3–20, all *pre-fork*, unambiguously current-main lineage, clean on current bands) — they are now the **single most trustworthy "best" reference.**
- **The dropped fork may itself have produced good-scoring reports**, but it is abandoned (off HEAD's lineage, on the `Pipeline_V2`/`codex/*-rehome` branches) — **not a sensible target.** Re-homing onto it = undoing the deliberate stabilization. "Go back to the late-April/May peak" is not actionable on current main.
- **The local screen cannot rank current-main states across the fork at all.** This is a stronger statement than §6.1's calendar-attribution caveat: it's not just imprecise, it's measuring a different (dead) codebase for the fork window.

---

## 3. Report-regression timeline — honest bucketing

> **Method guard (the trap that bit prior sessions four times):** a commit counts as a *confirmed regression* only when **same-input + commit-provenance** controls show the quality drop is attributable to it, net of evidence-pool drift. Correlating a commit with worse aggregate numbers across a window is **not** sufficient — windows differ in input-mix and instrumentation. The buckets below are split on that test.

### Bucket A — CONFIRMED code regressions

| Commit | Date | Regression | Status |
|---|---|---|---|
| **`2395f494`** | Jun 1 | "Align research sufficiency with direct citation publishability" marked evidence `applicabilityAssessed:true` *even when the classifier could not run* (LLM error / prompt-missing) → every item became non-direct **job-wide**, tripping the citation-integrity gate + D5 require-direct → **mass UNVERIFIED under classifier failure / load**. Pre-`2395f494` that path was fail-open. | **FIXED same-day** by `85f129a9` (fail-OPEN on infra failure) + `29bcb33b` (tests). Per-claim gate scoping followed in `4c140ca4`. |

This is the **only** clean, confirmed *code* regression in the recent window — and it was a fail-*closed* safety inversion in brand-new code (`2395f494` itself was one day old), caught and fixed within hours. It never reached a release.

### Bucket B — Reverted-as-ineffective (rolled back, never shipped as a regression)

| Commit | Date | What | Resolution |
|---|---|---|---|
| `ed7698a8` | May 31 | `fix(prompts): stabilize Stage-1 classification of broad comparative predicates` | **Reverted same day** by `1c790a05` — "ineffective in live validation." Correct application of the Failed-Attempt Recovery rule; not a shipped regression. |

### Bucket C — Investigated-but-REFUTED "regressions" (the misattribution bucket)

These are the changes most often *blamed* for the decline. Each was stress-tested with same-input / provenance controls and **does not hold up as a regression cause**:

| Suspected cause | Commit | Why it is REFUTED |
|---|---|---|
| **Pass-2 model downgrade (Rec-A)** | `1a0687c0` (Mar 15) | Rec-A moved Pass-2 (Stage-1 *claim extraction*) from a mislabeled `"verdict"` task key (which silently pinned Sonnet, bypassing UCM tiering) to the correct Haiku tier — **it was a bug-fix.** **No observable Rec-A effect** on a clean boundary-spanning control (§6.1: 17 non-benchmark inputs, Mar16–Apr9, before Apr-10/fetch confounds → claim-UNVERIFIED 10.4%→12.9%, top-level *improved* 9.3%→6.7%). 100% of the commit-rankable corpus is already Haiku-Pass-2 (hash recording began Mar 28, *after* Rec-A), and reverting reopens the Sonnet soft-refusal / language-drift regression. **DO NOT REVERT.** Residual Haiku non-compliance is already mitigated by the C6 contract-retry that escalates Pass-2 to Sonnet on demand. ⚠️ Verb correction: the prior docs said "REFUTED"; the defensible claim is **"no observable effect,"** not "ruled out" — the companion's marquee same-input control was *mis-scoped* (it compared two post-Rec-A eras; §4.2/§6.1). |
| **`report_damaged` explosion (0→75)** | `02d8c3b1` (Apr 10) | The jump is **instrumentation, not degradation** — `02d8c3b1` ("harden claim contract preservation") began *emitting/aborting* on `preservesContract===false`. The underlying contract-failure rate among *instrumented* jobs is **flat-to-declining (20.2%→16.6%→12.4%)**. **99%** of `report_damaged` carry a `contractValidationSummary` → the Stage-1 gate **working correctly** (refusing to publish modifier-dropped reports, esp. the "rechtskräftig" anchor). ⚠️ Denominator caveat (§6.1): on an *all-jobs* denominator the rate *rises* (0%→11%→17%→12%) because the instrument did not exist pre-Mar22; "flat-to-declining" is true only on the withCVS denominator. The instrumentation-not-degradation thesis still holds (silent failures became visible). |
| **Source-fetch "degradation"** | (infra, not a commit) | Chronic and environment-level: ≥64% of jobs every week since March; **72.5% of failures are inherent HTTP 403 site-blocking** (paywall/anti-bot), only **0.4% is fixable 429**. And fetch-failure **does not correlate with worse quality** — the 0%-fail bucket is the *worst* (20 ev / 39% UNVERIFIED = under-researched/aborted), the 25–50% bucket the *best* (74 ev / 11% UNVERIFIED). A late-May per-attempt severity bump is real (§4) but is not the dominant decline driver. |
| **§99 partisan-contradiction** | — | A convicted party's own appeal allegations occasionally counted as direct probative contradiction: **rare** — 0.5% of contradicting evidence, 9 true-side cases across all history; verdict usually resists. Documented, not built into a verdict-direction lever. |

### Bucket D — Real, non-code drivers of the apparent decline

- **Input-mix shift (the dominant driver).** Measured first-hand (§4): the share of hard Bolsonaro legal-prediction inputs went **27% (Mar) → 16% (Apr) → 53% (May)**, and aggregate UNVERIFIED tracked it (4.7% → 19.9% → 33.0%). June (13% Bolsonaro) fell back to 13.2% UNVERIFIED. The "decline" is substantially a *what-we-asked* change, not a *how-well-we-answer* change.
- **Late-May fetch-severity bump.** Per-attempt 403 rose from ~25–31% (Mar–Apr) to ~38–40% (late May), recovering toward 27% on the newest post-swap commit (§4).

### Landmark commit reference (verified to exist, dated)

`9cdc8889` (Feb 17 — verdict→Sonnet + claims cap 15→5; Captain's "Sonnet window") · `1a0687c0` (Mar 15 — Rec-A Pass-2→Haiku, a bug-fix) · `4f7d3850` (Mar 20 — broad-claim contract validation after Pass 2) · **`02d8c3b1` (Apr 10 — report_damaged emit/abort instrumentation)** · `424b9652` (Apr 22 — Stage-1 contract preservation; screened peak) · `2f7a2805` (Apr 22 — deployed-prod bundle) · `d2d06f83` (May 24 — automatic claim selection / ACS) · `6164ef8e` (May 25 — ACS contract hardening) · `2395f494` (Jun 1 — fail-closed regression) → `85f129a9` (Jun 1 — fail-open fix) · `362a9312` (Jun 1 — search swap Serper→P1) · `af026923` (Jun 2 — PDF/response-cap fetch fix).

---

## 4. First-hand measurements taken for this consolidation (read-only)

### 4.1 Input-mix shift + aggregate UNVERIFIED (all SUCCEEDED jobs, by month)

| Month | Jobs | Bolsonaro share | UNVERIFIED |
|---|---|---|---|
| 2026-03 | 665 | 27.1% | 4.7% |
| 2026-04 | 707 | 16.3% | 19.9% |
| 2026-05 | 179 | **53.1%** | 33.0% |
| 2026-06 | 38 | 13.2% | 13.2% |

Aggregate UNVERIFIED co-moves with Bolsonaro share → **confirms the input-mix confound first-hand.**

### 4.2 Same-input control — canonical bolsonaro-en, by era (⚠️ correction to prior figure)

| Era | n | UNVERIFIED |
|---|---|---|
| early Haiku (03-16…04-30) | 52 | 40.4% |
| recent Haiku (05-01+) | 39 | 48.7% |

> **Reconciliation (resolved by the adversarial pass — §6.1):** the companion's "58% → 55% flat" figure is a **claim-level** rate, and it **reproduces** (the adversarial agent got claim-level 58%→56%, genuinely flat). My **40.4% → 48.7%** above is the **top-level `VerdictLabel='UNVERIFIED'`** rate (a different denominator) — a small ~8pp rise, within this input's documented run-to-run variance and small n (52/39). **Both metrics agree on the substantive point: Rec-A is not the cause** — claim-level is flat, top-level rises only marginally, and neither is a step-change. The companion's figure is therefore **reproducible but *mis-scoped***: both eras it compares are **post-Rec-A** (there are essentially **zero canonical bolsonaro-en jobs before 2026-03-16**), so it never actually tests the Sonnet→Haiku boundary. The cleaner boundary-spanning control the adversarial agent ran (§6.1, Mar16–Apr9 non-benchmark inputs) is what genuinely supports "no observable Rec-A effect." Net: **bolsonaro-en is intrinsically hard (40–58% UNVERIFIED depending on denominator) and high-variance in both recent eras — not a clean recent code regression.** Cite the figure with its denominator and don't treat it as a Rec-A-boundary test.

### 4.3 Fetch severity trend (`fetch-failure-weekly-trend.cjs`, per-attempt)

- Mar–Apr: per-attempt fail ~38–44%, 403 ~25–31%.
- **Late May (05-24/05-25 weeks) and 06-01 week: 403-per-attempt jumps to ~38–40%** (real severity bump).
- **Newest commit `d09d1973` (Jun 2, post-search-swap): 403-per-attempt 26.8%** (n=11) — back at April levels.
- UNVERIFIED% swings 0%→60% across commits while 403-per-attempt stays comparatively flat → **fetch severity is not the UNVERIFIED driver; high-degeneracy batches/inputs are.**

### 4.4 Population census (whole-DB, current bands)

87.4% of jobs have ≥1 fetch failure; mean per-job fetch-fail 37.1%; 72.5% 403 / 0.4% 429. (Consistent with the 2026-06-01 consolidation: 8.6% hard-failure, 24.2% checkworthy-claim UNVERIFIED population-wide.)

---

## 5. The hard blocker (unchanged) and what it means for next steps

**A clean *live* ranking (April-peak-replay vs pinned-HEAD A/B) is still blocked on the fetch layer.** Because fetch failures hit all commits equally, a *same-window* A/B remains *valid for relative-code comparison* — **but only if current severity is low enough to yield non-degenerate reports.** The pause-point HEAD batch (14 runs, `68d8b61a`) was fetch-contaminated and produced degenerate/inverted reports, so it neither confirmed nor refuted HEAD's *code* quality. The Jun 1–2 fetch fixes are a genuinely new variable: **re-measure per-attempt severity on a small HEAD sample before spending any A/B budget.**

**Therefore:**
- The "best so far" answer rests on **existing reports** (local historical screen + deployed-production confirmations) — which is exactly what this consolidation is built on. It does not require new runs.
- A forward "is HEAD now better than the April peak?" answer **does** require runs, is **budget-gated**, and should not be launched without explicit approval.

---

## 6. Independent agent verification (read-only fan-out)

> Two read-only helper agents were dispatched per the user's request for agent help: an **adversarial** agent tasked to *refute* the four central conclusions, and a **verification** agent to resolve the comparator job IDs against the live DB + deployed API. Their findings are folded in below.

### 6.1 Adversarial review (agent tasked to *refute*; read-only DB, n=1,589)

The headline conclusions **survive** an adversarial attack, but three are **sharpened/corrected**:

| Claim | Verdict | What the attack found |
|---|---|---|
| **1. `424b9652`/April is the best range** | **WEAKENED (not refuted)** | (a) Composite 87 is inflated by **3 saturated families** (asylum-wwii, hydrogen, plastic, where many epochs hit 100). Equalized to *discriminating* families only (asylum-235000, bolsonaro-en, bolsonaro-pt) → **75**. (b) **Provenance is calendar-attributed, not execution-hash-attributed** — see the box below; this is the most important methodological caveat. (c) Still mediocre on bolsonaro-en (67; only 11/37 strict-on-band). **BUT** even equalized, `424b9652` (75) still beats `8d0098d7` (67.5) and `6164ef8e` (49); **no n≥3 challenger overtakes it.** Leader *identity* robust; lead *magnitude* and *reproducibility* weaker than the screen implies. |
| **2. No global best — family-specific** | **HOLDS (could not refute)** | Per-cell band-pass: **no epoch covering ≥2 families at n≥3 is on-band across all of them** — every multi-family epoch is broken by bolsonaro-en (`424b9652` bol-en 11/37; `8d0098d7` 0/3; `6164ef8e` 4/15). |
| **3. Decline misattributed, not Rec-A** | **Conclusion HOLDS; "REFUTED" overstated** | The companion's marquee same-input control (Bolsonaro 58→55% "flat") compares **two post-Rec-A eras** (early-Haiku vs recent-Haiku) — it never tests the Sonnet→Haiku boundary, and there is **~1 Sonnet-era benchmark job total**. The agent ran a *cleaner* control the doc never did: 17 non-benchmark inputs spanning the real Rec-A boundary, isolated to **Mar16–Apr9** (before the Apr-10/fetch confounds): claim-UNVERIFIED **10.4%→12.9%** (+2.5pt, noise), top-level **9.3%→6.7%** (improved). So Rec-A shows **no observable jump on identical inputs** → "not-the-cause" holds on a *stronger* test than the doc used — but the honest verb is "no observable effect," not "ruled out." |
| **4. report_damaged growth is instrumentation** | **HOLDS (denominator caveat)** | Apr-10 `02d8c3b1` onset confirmed (0% → W14 spike). **99%** of report_damaged carry a `contractValidationSummary` (doc said 94%). Underlying contract-failure *among instrumented jobs* reproduces **20.2→16.6→12.4%**. **Caveat:** on an *all-jobs* denominator it is **0%(Sonnet, no instrument)→11.1→16.6→12.4** — i.e. it *rises* into Apr10-30; "flat-to-declining" holds only on the withCVS denominator, and the Sonnet 0% is instrument-absence not zero failures. Thesis (silent failures became *visible*) stands; the "flat across eras" framing is denominator-sensitive. |

> **⚠️ The screen's epoch-attribution is calendar-based, not execution-hash-based — the single biggest caveat.** `best-commit-phase1.cjs` maps each report to an epoch by its `CreatedUtc` against a `git log --first-parent` of report-affecting paths. The analyzer/prompt/config paths had a **32-day first-parent gap (Apr 22 `424b9652` → May 24 `d2d06f83`)**, so the "424b9652 epoch" silently absorbs ~5 weeks of jobs that **actually executed on 34 distinct recorded `ExecutedWebGitCommitHash` values — none of them `424b9652`** — many **off the current first-parent main line** (not HEAD ancestors), several carrying **their own `claimboundary.prompt.md` edits**, under drifting search/fetch/UCM conditions the git filter cannot see (it excludes `apps/api`, `config.db`, and the search-provider swap). **Consequence:** "424b9652 is best" is most defensibly read as *"the April calendar window is the best-sampled period,"* not *"this commit bundle is reproducibly best."* This is **why the answer is a range**, and why only a controlled live A/B (which pins the actual bundle) can convert "best-sampled" into "best, reproducible." **Root cause of the 34 off-main hashes is now identified (§2.4): the Pipeline_V2 fork + main re-home — 0 of 81 post-fork execution commits are on current main, so the post-Apr-22 epoch reports measure the *dropped fork*, not main.**

**Data inconsistencies the attack surfaced (prior-art docs vs live DB):**
- report_damaged↔CVS linkage: doc **94%** → DB **99%** (same conclusion, looser number).
- "contract-failure flat 20→17→14%" holds only on the withCVS denominator (all-jobs: 11→17→12, rises mid-period).
- Companion's "Bolsonaro hard-input share rose 11%→22%→49% (monotonic)" is **non-monotonic** in the DB: Sonnet 34.5% → early-Haiku 19.6% → recent 46.1% (and my month-split: Mar 27% → Apr 16% → May 53%). The "recent ≈half Bolsonaro" part is correct; the monotonic framing is not. *(My §4.1 month table already shows the dip-then-rise correctly.)*
- All counts drifted consistently with DB growth (1,550→1,589 SUCCEEDED; commit-hash 982→1,021; promptHash 78→116) — no contradictions, just freshness.

**Could NOT refute:** Claim 2 entirely; Claim 1's *leader identity* (no challenger overtakes once equalized); Claim 4's core thesis; Claim 3's *direction* (on the cleaner control, no Rec-A jump).

### 6.2 Comparator resolution (verification agent, read-only DB + deployed API)

**Local comparators that resolved on-band** (7 of 16 named IDs):

| Family | JobId | Verdict truth/conf | Claims | Boundaries | Evidence | On-band |
|---|---|---|---|---|---|---|
| bundesrat-rechtskraftig | `b92201bb` | MIXED 48/72 | 3 | 6 | 56 | Y |
| bundesrat-simple | `a6b0e0fc` | TRUE 97/89 | 2 | 6 | 51 | Y |
| bundesrat-simple | `a5357304` | TRUE 96/88 | 2 | 5 | 51 | Y |
| bolsonaro-en | `91bf6083` | LEANING-TRUE 63/52 | 3 | 6 | **84** | Y |
| bolsonaro-pt | `e182f37a` | LEANING-TRUE 67/60 | 3 | 6 | **148** | Y |
| hydrogen-en | `24654634` | FALSE 14.8/77.8 | 3 | 6 | 89 | Y |
| plastic-en | `32f00bb3` | MOSTLY-FALSE 21.5/68 | 3 | 6 | 132 | N (lower-edge historical, as documented) |

**9 of 16 did NOT resolve locally** — all of them the recent (May 10–12) `latestVerifiedJobId` canaries — because they fall in the **May 3–23 DB coverage gap** (see §2.2 callout). This is a confirmed first-hand finding, not an agent artifact.

**Deployed API confirmed reachable** (`https://app.factharbor.ch/api/fh/jobs`, 110 jobs / 3 pages). Best deployed comparators visible and on-band: `85812d61` bolsonaro-en LEANING-TRUE 68/62 · `6a60b3eb` asylum-235000 MOSTLY-TRUE 72/70 · `3469b325` bolsonaro-pt LEANING-TRUE 62/55 · `a48a621` asylum-wwii MOSTLY-FALSE 22/77 · `eb02cd2e` bolsonaro MOSTLY-TRUE 73/70. *(Correction: the strategy-doc tokens `b7783872`/`521040e9`/`ace3c114`/`f1a372bf` are `executedWebGitCommitHash` **commits**, not job IDs — the deployed *jobs* they produced are `eb02cd2e`/`cfd508bc`/`6a60b3eb`/`2e3cb0da`, of which `eb02cd2e` and `6a60b3eb` are confirmed present and on-band.)*

**Structural profile of a "best" report** (from the on-band set): **2–3 atomic claims, 5–6 boundaries, 80–150 evidence items** (the strongest sit 80–150; bundesrat 51–56), **info-level warnings only** (`source_fetch_failure`, `evidence_pool_imbalance`, `evidence_applicability_filter` — never a blocking hard-failure), confidence 50–90, and **verdict within the family band with caveats expressed in confidence/reasoning, not in a verdict-direction downgrade.** This is the shape to match when judging a new report as "best-tier."

---

## 7. Warnings (for the next agent / Captain)

- **Do not manufacture a regression narrative.** The user's framing ("changes we made that caused a regression") is correct only for Bucket A (one fixed fail-closed defect) + Bucket B (one reverted prompt change). The large calendar-time decline is **mostly misattribution** (Buckets C+D). Report this plainly; do not force a longer regression list to match the premise.
- **`424b9652` is a *screen*, not a verdict — and it is fork-contaminated (§2.4).** Batch-coverage artifact + single-evidence-window confound + the screen pooled dropped-Pipeline_V2-fork reports under `424b9652` by calendar (0/81 post-fork execution commits are on current main). Treat it as "best-sampled *calendar window*," not "the commit to revert to." The trustworthy current-main "best" evidence is the **deployed-production reports** (all pre-fork).
- **bolsonaro-en is variance-driven**, not deterministically broken on any one commit (same input → UNVERIFIED 44 … LEANING-TRUE 71 on identical code). Never attribute a single bolsonaro-en job's verdict to a code change.
- **Do NOT revert Rec-A (`1a0687c0`)** or re-pin Pass-2 to Sonnet — refuted three times; it is a bug-fix and reverting is net-harmful.
- **The companion's "flat 58→55%" same-input figure is a *claim-level* rate (reproducible there) and is *mis-scoped*, not irreproducible** (§4.2/§6.1): both eras are post-Rec-A, so it doesn't test the Sonnet→Haiku boundary. Top-level is 40→49%. Always cite the denominator; don't use it as a Rec-A-boundary test.
- **No paid reruns without explicit budget approval.** The investigation was paused on budget.
- **Local DB coverage gap (May 3–23) + unresolvable comparators — cause known (§2.4).** The gap is the Pipeline_V2-attempt period; the 9 absent comparators (May 10–12 canaries) ran on the dropped fork / deployed stack. Do not assume a missing-from-local job was never run or was bad — check the deployed stack. Consider back-filling those canaries' ResultJson into the local DB (or pointing `benchmark-expectations.json` at deployed-inspectable IDs) so the bar stays locally verifiable.
- **Do not treat the dropped-fork (late-Apr→May) reports as a current-main target.** The fork is abandoned (off HEAD's lineage, on the `Pipeline_V2`/`codex/*-rehome` branches); "return to the May peak" = undoing the deliberate re-home — not actionable, even if those reports scored well.

## 8. Learnings

- **Re-grounding beats re-deriving.** The free Phase-1 screen reproduced the May-31 headline (`424b9652`, composite 87) on a day-newer DB in seconds — confirming robustness without spend.
- **Fetch is environment, not code.** 72% inherent 403; fetch-failure anti-correlates with bad quality (the under-researched 0%-fail jobs are worst). Stop treating fetch failures as a quality regression; the lever is open-access *resolution*, not defeating 403s.
- **Most "quality bugs" here are inherent, intentional (alpha variance), or correct-fail-safe.** Quick-lever hunting has diminishing returns (per the 2026-06-01 consolidation). The highest-value structural investment is **verdict robustness to evidence-pool drift** (the documented Jaccard 0.10–0.29 same-input variance) — a project, not a meanwhile-fill.
- **The Phase-1 screen attributes by calendar, not by execution hash — and a branch fork makes that catastrophic, not just imprecise.** `best-commit-phase1.cjs` maps reports to epochs via `CreatedUtc` against a `--first-parent` log. When a fork+re-home happened (Pipeline_V2, §2.4), the screen pooled **dropped-fork reports** under the current-main commit `424b9652` purely by date — **0/81 post-fork execution commits are actually on current main.** The screen wasn't ranking a current-main bundle at all for that window; it was scoring a dead branch. **Fix:** group by `ExecutedWebGitCommitHash` and filter to `git merge-base --is-ancestor <hash> HEAD` (drop off-main/GC'd hashes), not by date-vs-first-parent. Until then, every "best commit X" output must be read as "best-sampled calendar window" and cross-checked against branch topology.
- **Provenance > calendar, especially around rewrites.** The CR-corrupted first pass nearly produced a false "post-rehome data is all gone too" claim; the manual ancestry spot-check (`6164ef8e`/`68d8b61a`/`d09d1973` = HEAD ancestors) caught it. Always strip CRLF from Windows `sqlite3` output before shelling hashes into git, and verify loop results against a known-good manual check.
- **Adversarial review pays for itself.** The refutation pass corrected three figures (94→99% CVS, denominator-sensitivity of "flat-to-declining," non-monotonic input-mix) and one verb ("REFUTED"→"no observable effect"), and exposed the calendar-attribution flaw — none of which a confirmatory review would have surfaced. Worth the spend on any "best/regression" claim.

## 9. Recommended next actions (none auto-executed)

1. **Confirm the fetch recovery.** Re-run `fetch-failure-weekly-trend.cjs` after ~20–30 more post-swap (`362a9312`+) jobs accrue; if per-attempt 403 holds ≤~30%, the live-A/B blocker has cleared.
2. **Then — if (and only if) budget is approved — run the clean A/B** per the strategy doc §6/§11: `424b9652`-epoch-replay vs pinned-HEAD, same contiguous window, deterministic, interleaved, discriminating families only (bolsonaro-en, plastic-en, bundesrat-rechtskraftig), N≥4, variance-band decision rule. This is the only thing that converts "best so far (screened)" into "best, measured."
3. **Otherwise, invest structurally** in verdict robustness to evidence-pool drift (lever (b)) — the one investment that targets the central documented finding.
4. **(Free) Fix the screen's epoch attribution to be fork-aware** — re-group `best-commit-phase1.cjs` by `ExecutedWebGitCommitHash` **and drop hashes that fail `git merge-base --is-ancestor <hash> HEAD`** (off-main/dropped-fork/GC'd), instead of `CreatedUtc`-vs-`--first-parent`. Re-running this would exclude the entire dropped-fork window and give the *first* clean current-main-only historical ranking. Until then, label outputs "best-sampled calendar window," not "best commit."
5. **(Free, hygiene) Restore local verifiability of the bar** — back-fill the May 10–12 `latestVerifiedJobId` canaries into the local DB (or repoint `benchmark-expectations.json` at deployed-inspectable IDs). The May 3–23 gap cause is now known (Pipeline_V2-attempt period, §2.4) — no further investigation needed.

---

## 10. DECISION — which path to take (branch-from-best vs revert-on-HEAD)

**The question:** (Path 1) branch from the narrow best-reports range and rebuild forward cherry-picking the good things; or (Path 2) identify regression-causing changes and revert them on current HEAD.

**Honest acknowledgment first:** raw report health *did* decline over calendar time — that premise is real. But the cause is **input-mix + a late-May fetch bump + the Pipeline_V2 fork chaos**, not a code regression sitting on HEAD waiting to be reverted. **The fact that dissolves both paths as framed:** the April "best reports" were produced by code that **is already in HEAD's ancestry** (`2f7a2805`/`424b9652` are HEAD ancestors), and HEAD adds ~140 forward commits on top — many genuinely good. So "get back to the good reports" is **not a reversion/rebranch problem; the good code is already here.**

Both paths were stress-tested by independent adversarial agents (steelman + recovery-hunt). Results:

### Path 1 (branch-from-April + rebuild): **REJECTED — dominated**
- It is **literally redoing the re-home that already happened** (main was re-homed from the Apr-22 base in May 24–27).
- "April was better on equivalent inputs" is **unfalsifiable** — the Apr-22 ancestors ran a *different* input set (near-zero overlap with the 8 benchmarks). The one clean same-day natural experiment (April code `2f7a2805` vs post-rehome on the Bolsonaro input) shows **no April edge** (April's UNVERIFIEDs were concurrent-load Stage-2 aborts, not a code property).
- It would **discard ~140 HEAD commits** of recent quality work (citation-publishability subsystem, sufficiency gating, the `85f129a9` fail-open fix, Stage-1 stabilization, prompt-audit F01–F09, Serper→P1 swap, PDF/fetch fixes) **to recover one small aggregation hunk.** The recovery-hunt confirmed HEAD already re-applied 13/16 of the dropped tail's good commits under new SHAs. Net: a large, irrational loss.

### Path 2 (revert regressing commits on HEAD): **RECAST — no wholesale revert; two targeted softenings instead**
- **No wholesale revert is defensible.** Reverting `2395f494` re-introduces the citation-integrity defect it fixed and undoes the later per-claim hardening `4c140ca4`; reverting Rec-A (`1a0687c0`) is refuted and harmful; reverting the Apr-10 instrumentation `02d8c3b1` hides a real signal. And PRE-change state was **not better, just differently-wrong** (Bolsonaro-EN: PRE in-band 2/7 with the rest out-of-band MIXED; POST 1/4 — statistically indistinguishable; the verdict *shape* shifted out-of-band-MIXED → UNVERIFIED, on-band quality didn't move).
- **But two narrow, code-level, evidence-backed targets survived scrutiny** — these are Path-2-flavored (surgical changes on HEAD), and they are the actionable core:

| # | Target | Mechanism (verified live on HEAD) | Action (NOT a revert) | Risk | Evidence |
|---|---|---|---|---|---|
| **T1** | `2395f494` *assessed-but-not-direct* exclusion (`verdict-stage.ts:1937` `isDirectForCitation`; `research-orchestrator` sufficiency) — the fix `85f129a9` only patched the classifier-*crashed* path; the classifier-*ran-and-marked-non-direct* path is **live and unreverted** | Evidence the classifier examined but didn't mark `direct` is hard-excluded from directional sufficiency → claim → `insufficient_direct_evidence` → UNVERIFIED | **Soften** the assessed-but-not-direct exclusion to a **confidence-limiter**, not a hard UNVERIFIED-forcing gate | Med (touches citation-integrity gate — needs LLM-Expert review) | Confirmed load-bearing on a **fully-completed** HEAD run (job `766ea6d0`, AC_01: `totalDirectionalCount=2 ≥ min=1` but `directDirectionalCount=0` → 2 directional items thrown away → forced UNVERIFIED). Directly hits the Bolsonaro UNVERIFIED problem. |
| **T2** | `ca510f4c` article-wide integrity-cascade cap (`aggregation-stage.ts:279-281, 369-372, 385-387`) — **verified live on HEAD** | A *single* claim's `verdict_integrity_failure` caps the **whole article's** confidence to `INSUFFICIENT_CONFIDENCE_MAX`, even when other claims are healthy → multi-claim reports pushed toward UNVERIFIED (the per-claim `safeDowngradeVerdict` cap already flows into the weighted avg → double penalty) | Cap article-wide **only when the integrity-failed claim is dominant/thesis-direct** (not a blanket removal, which would weaken the safety gate) | Low-Med (orthogonal to `82a1aa17`; take the `.ts` hunk only, leave the bundled prompt change) | Cross-family evidence (plastic-en job, pre-Bolsonaro); mechanism verified live by me. |

- **One design question, not a recovery (your call):** the dropped chain's prompt rules try to **split** "[proceedings and verdicts] met fair-trial standards" into separate evaluands; HEAD's `8e87c3e9` (May 30) deliberately added the **opposite** (shared-standard *cohesion*, MANDATORY rule 22). These are head-on opposed and **Bolsonaro-relevant** (whether the sentence-fairness clause becomes its own AtomicClaim). Decide over-split vs cohesive deliberately — it is not an accidental drop.

### RECOMMENDED PATH — stay on HEAD; surgical targeted fixes; cause-split confirm (NOT either wholesale path)

1. **(Free, now) Resolve the design question** (over-split vs shared-standard cohesion, `8e87c3e9`) with the LLM Expert — it gates how Bolsonaro decomposes.
2. **(Free, review-gated) Prepare T2** (aggregation double-penalty → dominant-claim-only cap) and **T1** (assessed-but-not-direct → confidence-limiter) as small reviewed changes. Both need LLM-Expert review (T1 touches a citation-integrity gate; per AGENTS.md prompt/quality changes need explicit approval). **Do not ship blind** — gate on the A/B below.
3. **(Free) Confirm fetch recovery** post `362a9312`/`af026923`, and **re-run a fork-aware screen** (group by `ExecutedWebGitCommitHash` filtered to HEAD ancestors) for the first clean current-main-only ranking.
4. **(Budget-gated) Run the confirm A/B — and it MUST split UNVERIFIED by cause** (`insufficient_direct_evidence` vs `source_fetch_failure`/load), using the existing telemetry (`746c4c66`, `0fee6ef8`). Arms: pinned-HEAD vs HEAD+T1+T2, discriminating families (bolsonaro-en, plastic-en, bundesrat-rk), deterministic, interleaved, N≥4. **A confirm that lumps all UNVERIFIED into one bucket will measure fetch noise, not the code fix.**

### Do NOT
- Branch-from-April and rebuild (Path 1) — discards ~140 good commits to recover one hunk; April-was-better is unfalsifiable.
- Wholesale-revert `2395f494`, Rec-A (`1a0687c0`), or the `02d8c3b1` instrumentation — each is refuted/harmful.
- Ship T1/T2 without LLM-Expert review + the cause-split A/B — they touch safety gates and the apparent decline is fetch/input-mix-dominated.

**One-line answer:** *Neither wholesale path. Stay on HEAD (the April-best code is already here), and do Path 2 **properly** — two surgical, review-gated softenings (`T1` non-direct exclusion → confidence-limiter; `T2` article-wide integrity cap → dominant-claim-only), validated by a cause-split A/B, not a blind revert or a rebuild.*

---

*Read-only investigation. Diag tools used (all `scripts/diag/`): `best-commit-phase1.cjs`, `fetch-failure-drift-sizing.cjs`, `fetch-failure-weekly-trend.cjs`, plus direct read-only `sqlite3` on `apps/api/factharbor.db` and read-only `git`. Two read-only helper agents (recovery-candidate hunt + Path-1/Path-2 steelman). No jobs submitted, no code/config/DB changed.*

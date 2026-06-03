### 2026-06-02 | Lead Architect | Claude Opus 4.8 (1M) | Best-Commit & Report-Regression — Consolidation (resumes the paused investigation)

**Tier:** Significant. **Task:** Resume `2026-06-01_Senior_Architect_BestCommit_Investigation_Pause.md` and consolidate: which commit/range produced the best ClaimBoundary reports; rate quality vs Captain's documented bar; investigate local+deployed job history; document regression-causing changes; get agent help; write a new findings doc.

**Primary artifact:** `Docs/WIP/2026-06-02_BestCommit_and_Report_Regression_Consolidated_Findings.md` — full findings, tables, both agents' results. Read that; this is the resumption pointer.

## Bottom line
- **Best-reports range = the April-2026 quality-restoration window (~Apr 3 → Apr 22)**, screened composite peak `424b9652` (Apr 22, composite 87/6 families on current bands; **75** equalized to discriminating families — still the leader, no challenger overtakes). Strongest clean examples are the **deployed-production** reports (bolsonaro `eb02cd2e`/`cfd508bc`; asylum-235000 `6a60b3eb`/`2e3cb0da`). **No single global best commit — quality is family-specific** (adversarially confirmed: no n≥3 multi-family epoch is on-band across all its families; bolsonaro-en breaks every one).
- **Regression bucketing (honest):** ONE confirmed code regression — `2395f494` (Jun 1) fail-*closed* applicability → fixed same-day by `85f129a9`. ONE reverted-as-ineffective (`ed7698a8`→`1c790a05`). Everything else blamed for the "decline" is **refuted/misattributed**: Rec-A (`1a0687c0`, a bug-fix — **DO NOT REVERT**), report_damaged jump (`02d8c3b1` instrumentation), source-fetch (chronic/environment-level, anti-correlated with bad quality). Real driver = **input-mix** (May load 53% hard Bolsonaro).

## New this session (beyond prior art)
1. **Re-reproduced the screen on the current DB** (1,589 SUCCEEDED) — `424b9652`/87 headline robust to a day of new jobs.
2. **Pipeline_V2 fork + main re-home explains the DB gap AND distorts the screen (user-confirmed, git-verified — the biggest correction).** V2 forked from `2f7a2805` (Apr 22), was dropped, and `main` was re-homed from the Apr-22 base ~May 24–27. **0 of 81 execution commits behind Apr 23–May 2 reports are on current main** — the screen pooled *dropped-fork* reports under `424b9652` by calendar. So the screen's `424b9652`=87 is NOT a clean current-main signal; the **deployed-production reports (all pre-fork) are the trustworthy current-main "best" evidence.** Local DB is blind to May 3–23 (the V2-attempt period); the bar's May 10–12 canaries are absent locally (deployed-only). Current-main local data = pre-fork (≤Apr22, 259 jobs) + post-rehome (May24+, 196 jobs, execution hashes confirmed on-main).
3. **Fetch may be recovering** post-pause fixes (`362a9312`/`af026923`): newest commit per-attempt 403 ~27% vs late-May ~39% (n=11, provider-confounded — suggestive only).
4. **Adversarial pass corrected the prior art:** the Phase-1 screen attributes epochs by **calendar (`CreatedUtc` vs `--first-parent`), not execution hash** → "424b9652" pools 34 off-main commits = a *calendar-window label, not a reproducible bundle*. Also: CVS-linkage 94%→99%; "flat-to-declining" is withCVS-denominator-only; same-input "58→55 flat" control was mis-scoped (both eras post-Rec-A) — "REFUTED" softened to "no observable Rec-A effect" (confirmed on a cleaner Mar16–Apr9 boundary control).

## Warnings
- **Do not manufacture a regression narrative** to match the "changes we made caused a regression" premise — only Bucket A (1 fixed defect) + B (1 revert) qualify; the rest is misattribution.
- **Do NOT revert Rec-A / re-pin Pass-2 to Sonnet.**
- **`424b9652` is a calendar-window screen, not a commit to revert to.** bolsonaro-en is variance-driven; never attribute one job's verdict to a commit.
- **No paid reruns without explicit budget approval** (investigation paused on budget).

## Learnings (also appended to Role_Learnings via the WIP doc)
- Phase-1 screen flaw: group by `ExecutedWebGitCommitHash`/`PromptContentHash`, not date-vs-first-parent; until fixed, relabel "best commit" → "best calendar window."
- Adversarial review corrected 3 figures + 1 verb + exposed the attribution flaw — worth the spend on any best/regression claim.

## Path decision (the two-paths question — §10 of the WIP doc)
Stress-tested by two adversarial agents (recovery-hunt + Path-1/Path-2 steelman). **Path 1 (branch-from-April + rebuild) = REJECTED/dominated** (April code already in HEAD's ancestry; "April better" unfalsifiable — different input set; one same-day natural experiment shows no April edge; would discard ~140 good HEAD commits to recover 1 hunk; HEAD already re-applied 13/16 dropped-tail fixes). **Path 2 (revert) = RECAST** — no wholesale revert defensible, but **two surgical, review-gated softenings** survived scrutiny:
- **T1:** `2395f494`'s *assessed-but-not-direct* exclusion is **live & unreverted** (`85f129a9` only fixed the classifier-*crashed* path; `verdict-stage.ts:1937` `isDirectForCitation` + research-orchestrator sufficiency). Confirmed load-bearing on a **completed** HEAD run (job `766ea6d0`, AC_01: 2 directional items hard-excluded → forced UNVERIFIED). Action: soften to a **confidence-limiter**, not a hard UNVERIFIED gate.
- **T2:** `ca510f4c` article-wide integrity-cascade cap **live on HEAD** (`aggregation-stage.ts:279-281,369-372,385-387`): one claim's `verdict_integrity_failure` caps the whole article's confidence (double-penalty with `safeDowngradeVerdict`). Action: cap article-wide **only when the integrity-failed claim is dominant/thesis-direct**, not blanket.
- **Design call (not a recovery):** dropped chain wants to *split* process/outcome; HEAD's `8e87c3e9` deliberately keeps shared-standard claims *cohesive* (rule 22). Opposed; Bolsonaro-relevant; decide over-split vs cohesive.

## Next (none auto-run; PROPOSE-only — do not ship without LLM-Expert review + the A/B)
1. Resolve the over-split-vs-cohesion design question (`8e87c3e9`) with LLM Expert — gates Bolsonaro decomposition.
2. Prepare T1 + T2 as small reviewed changes (both touch safety gates → LLM-Expert review required). Gate on the A/B below.
3. Confirm fetch recovery after ~20–30 more post-`362a9312` jobs (`fetch-failure-weekly-trend.cjs`); re-run a **fork-aware** screen (group by `ExecutedWebGitCommitHash` filtered to HEAD ancestors).
4. Budget-approved only: confirm A/B (pinned-HEAD vs HEAD+T1+T2), discriminating families, deterministic, interleaved, N≥4 — and it **MUST split UNVERIFIED by cause** (`insufficient_direct_evidence` vs `source_fetch_failure`/load via telemetry `746c4c66`/`0fee6ef8`), else it measures fetch noise.
5. Free hygiene: back-fill the May canaries / repoint the bar to locally-inspectable IDs (May 3–23 gap cause known = V2 period).

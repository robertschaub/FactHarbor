### 2026-06-01 | Senior Architect | Claude Opus 4.8 (1M) | Best-Commit Investigation — PAUSE & resumption handoff

**Task:** Identify which commit (or commit-range) produced the best ClaimBoundary reports "so far," better than prior attempts. **Status: PAUSED at user request; likely to continue.** This handoff is the resumption point.

**Primary artifacts (read these to resume):**
- `Docs/WIP/2026-05-31_Best_Commit_Identification_Strategy_Proposal.md` (v2; §1–§14) — full strategy, Phase-1 results, deployed integration, harness, batch-1 result.
- `Docs/WIP/2026-06-01_V1_Quality_Decline_Attribution_and_RecA_Refutation.md` (companion; Lead Architect, 3-reviewer) — the decline is misattributed; do NOT revert Rec-A.

**Repo state at pause:** HEAD `f51d5bb4` (10 commits past `68d8b61a` where this session's runs were taken). The other agent has consolidated and moved on to **mechanism-specific** work: `2026-06-01_Pass2_Model_AB_Test_Design.md` (Rec-A output-level A/B), `2026-06-01_Verdict_Direction_Instability_Phase1_Findings.md` (lever-b), prompt-audit fixes (F01–F09, S5/S6, per-claim D5 gate). Coordinate with these on resume.

---

## Conclusions reached ("answer so far")

1. **No global "best" commit — quality is family-specific** (every prior investigation + this one).
2. **Screened historical leader: `424b9652`** (Apr-22 Stage-1 contract-preservation fix; composite 87 across 6 families). **Caveated as a screen** — batch artifact, ~1 sample/cell, evidence-drift Jaccard 0.10–0.29; weak on bolsonaro-en locally (evidence-scarcity, not code).
3. **Deployed-production reports clean on current bands:** bolsonaro `b7783872` / `521040e9` (71–102 evidence items); asylum-235000 `ace3c114` / `f1a372bf`. These are the strongest cross-environment confirmations.
4. **Current HEAD is excluded by Architect direction** (not by measurement). This session's 14 HEAD runs (asylum-wwii inverted to MOSTLY-TRUE 82; plastic false-side / 1 hard-fail / conf-24; bolsonaro 2/3 UNVERIFIED) are **fetch-contaminated and ran without a same-window comparator**, so they **neither confirm nor refute HEAD's *code* quality** — the failure modes are fetch-driven (asylum-wwii inverted via `insufficient_direct_evidence → gate1_thesis_direct_rescue`; plastic via the `source_fetch_failure` flood), which would hit any commit equally. **Do not cite these as "HEAD is bad code."**
5. **The apparent quality decline is misattributed** — input-mix (recent load ≈half hard Bolsonaro legal-prediction; same input flat across eras) + Apr-10 `report_damaged` emit/abort instrumentation (`02d8c3b1`; underlying contract-failure rate flat-to-declining) + degraded fetch. **NOT a Pass-2 model downgrade. No quick lever; do not revert Rec-A.**
6. **Side-effect shipped this session:** `plastic-en` recalibrated to a centered band (LEANING-FALSE/MIXED/LEANING-TRUE, 42–65, conf ≤75, reading-declared) + V2 criteria companions adopted (committed `6be9fbf5`).

**Definition of "best" (settled, Gate G1):** the Captain Q-code catalogue (`report-quality-expectations.json`) + current per-family bands (`benchmark-expectations.json`); equal family weights; per-family AND composite; variance-band decision rule.

---

## ⛔ Hard blocker (must clear before any live ranking)

**Source-fetch failures are chronic AND environment-level.** `source_fetch_failure` appears in **≥64% of jobs every week since March** (incl. the `424b9652` Apr-22 window) — so there is **no clean local window**; fetch is a *persistent* factor, not a recent-only regression. (The companion's "~72% HTTP 403, recently degraded" is a finer *per-attempt severity* metric not recomputed here — run `scripts/diag/fetch-failure-drift-sizing.cjs`.) Implications: (a) because fetch hits **all commits equally**, a **fresh same-window A/B** (424b9652-replay vs pinned-HEAD-replay) is still valid for *relative code* comparison — *provided* current severity is low enough to yield non-degenerate reports (this session's HEAD batch suggests it may not be); (b) what's invalid is comparing fresh-today runs against historical existing-reports when severity differs. **Resume live work only after measuring the per-attempt fetch rate and confirming it permits real (non-degenerate) reports.**

## Budget

≤14-run cap (user) — **14 spent**, all on HEAD `68d8b61a`, fetch-contaminated (see blocker; they do **not** establish HEAD code quality). Future budget TBD. (`AnalyzePerIp` = 5/min; pace submissions.) The 14 jobIds (in main DB, visible on :3000) — plastic `f361fa68` `057ed5a3` `94ae34a3` `281c2300`(FAILED); bundesrat-rk `416c9c41` `7f638899` `ad288216`; bolsonaro-en `0fd29fc8` `133a43b5` `929906e4`; asylum-235k `0f0f2419` `e2a09a73`; hydrogen `592312f5`; asylum-wwii `2152a1f7`. Raw fields are in the DB; session summary in strategy §13.

---

## Resumption checklist (in order)

1. **Measure the per-attempt fetch rate + severity gate.** `node scripts/diag/fetch-failure-drift-sizing.cjs` (date any severity onset), then submit ONE HEAD job and check the report is **non-degenerate**. Gate: if current severity still yields mostly UNVERIFIED/degenerate reports (as this session's batch did), **STOP and fix fetch first** — a fair A/B needs severity low enough for real reports. Submission tool: `scripts/diag/best-commit-batch.cjs` (paced ≤5/min; needs `inviteCode: SELF-TEST`).
2. **Refresh + bound the free screen** (zero-cost) — `node scripts/diag/best-commit-phase1.cjs` re-ranks all stored reports vs current bands; then re-run it **excluding the high-fetch-severity window** and confirm `424b9652`'s lead is robust (it was scored on reports that also carried chronic fetch noise — verify the ranking isn't a fetch artifact).
3. **If severity permits, run the clean comparison — LOCAL-only, same-window:** `424b9652`-replay vs **pinned-HEAD**-replay in ONE contiguous window (so fetch hits both equally), via the §11 harness (isolated 2nd API+runner → main DB, jobs visible on :3000; no reconfig of the shared stack). The deployed-clean reports (`b7783872`/`521040e9`; `ace3c114`/`f1a372bf`) are **fixed existing-data reference points, NOT a live arm.** Discriminating families only (bolsonaro-en, plastic-en, bundesrat-rechtskraftig — skip saturated hydrogen/asylum-wwii). Deterministic, interleaved, N≥4, variance-band decision rule. Spend the funnel per strategy §6 within the user's budget.
4. **Pin the candidate commit** — HEAD moves under the active agent; snapshot it for reproducibility.
5. **Do NOT** pursue a blanket Rec-A revert or model re-pin (refuted). Model-tier questions go through the other agent's `Pass2_Model_AB_Test_Design.md`.

## Tools (read-only diag, repo)
`scripts/diag/best-commit-phase1.cjs` (free Q-code screen), `best-commit-batch.cjs` / `best-commit-batch2.cjs` (paced submission+poll harness), `compare-evidence-pools.cjs` (evidence-drift vs sampling), `plastic-ac-extract.cjs <input>` (per-claim decomposition+ratings), plus the census tools (`checkworthy-unverified-census`, `report-damaged-drill`, `fetch-failure-drift-sizing`, `verdict-direction-instability`). DB read hook allows read-only `sqlite3`.

## Methodological lesson (kept biting — the confounded-window trap)
Attributions across time hold ONLY after controlling for **input mix** + **commit provenance**. The same trap fooled four hypotheses this session (report_damaged, §99, fetch-reliability, Rec-A). Always do same-input + provenance checks before concluding.

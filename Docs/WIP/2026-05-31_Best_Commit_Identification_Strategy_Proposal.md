# Best-Commit Identification — Strategy Proposal (v2)

- **Date:** 2026-05-31
- **Author role:** Senior Architect
- **Question:** *Which commit (or commit-range) produced the best ClaimBoundary reports so far, and how do we identify it better this time than in past attempts?*
- **Status:** PROPOSAL. Phase 1 is free and ready to run; Phase 2 is cost-gated. Gate G1 ("definition of best") is now **resolved** — see §5.

### Changelog v1 → v2 (this session)
- **Gate G1 resolved:** "best" is no longer an ad-hoc weight set I invented — it is scored against the **Captain's documented criteria** found and ratified this session: the Q-code catalogue (`report-quality-expectations.json`) + per-family bands (`benchmark-expectations.json`) + intent (`Captain_Quality_Expectations.md`).
- **Bands changed (now live on main @ 6be9fbf5):** `plastic-en` is now a **centered** band (42–65, conf ≤75, narrative must declare its reading); `bolsonaro-en/pt` + `asylum-235000-de` are **true-side only** (MIXED now fails); `bundesrat-simple` is **high-true** (85–100); `asylum-wwii-de` **gained a band** (false-side 18–42). → **8 scoreable families now, not 6.**
- **Tooling upgraded (this commit):** `scripts/validation/extract-validation-summary.js` now groups runs by `executedWebGitCommitHash` + `promptContentHash` — it directly implements Phase 0/1 grouping. `scripts/diag/plastic-ac-extract.cjs` generalizes (takes any input) for per-family decomposition+rating extraction. Static Comparator Packet added as gold references.

---

## 1. What was done before, and what it concluded

Eight prior investigations attacked this question between 2026-04-06 and 2026-05-28 (prior art we improve on):

| # | Doc | Date | Method | Result |
|---|-----|------|--------|--------|
| 1 | `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md` | 04-07 | 21 local + 9 deployed jobs, 3-4 builds; per-family verdict/conf/evidence/concentration; same-build instability | No single best commit; Phase B (`442a5450`) good for Bolsonaro; Bundesrat 70pp same-build spread |
| 2 | `…_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md` | 04-07 | Adversarial cross-review (GPT-5); DB rebuild; external fact-check | **Quality is family-specific** |
| 3 | `Docs/WIP/2026-04-16_Benchmark_Report_Quality_Status_Matrix.md` | 04-16 | Post-fix snapshot per family | Source of `benchmark-expectations.json` |
| 4 | `…/2026-05-28_..._2f7a_to_Current_Regression_Investigation.md` | 05-28 | Deployed `2f7a` (107 public, 21 exact-hash) vs current | No clean regression; direction flips ≠ regressions |
| 5 | `Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md` | 04-11 | **Playbook**: timestamp→commit map, worktree replay, per-family, Gate G1/G2 | The standard procedure; Canonical Criteria (40 criteria/6 layers) |
| 6 | `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md` | 04-06 | Per-family hard-family comparison | Reframed to upstream evidence/retrieval |
| 7 | `Docs/WIP/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md` | 04-07 | Single-run canary, claim-acquisition ledger | Phase B helps but amplifies Stage-3 concentration |
| 8 | `…/2026-05-28_..._Bolsonaro_Statement_Regression_Attribution.md` | 05-28 | Exact-input replay `406393c9` vs `2f7a`; promptContentHash | **`executedWebGitCommitHash` is whole-repo, not analyzer-exact — use `promptContentHash`** |

**The sentence every prior investigation ended on:** *no global "best commit"; quality is family-specific, and same-input comparisons across time are confounded.*

---

## 2. Why prior attempts bottomed out — empirically confirmed (live DB, 2026-05-31)

**Trap A — provenance is poorly *recorded*, but the commit IS the bundle (per the re-seed model).** Architect clarification (2026-05-31): the target is **historical / in-situ** — the code + prompt + config that were *live* with that commit. Per the Architect, prompts/config only ever changed via **committed default files** (`apps/web/prompts/**`, `apps/web/configs/**`) that were re-seeded — so the full `(code, prompt, config)` bundle **moves with the commit** and is reconstructable by checkout. Measured provenance recording in the local DB (`Status=SUCCEEDED`):

| Provenance | Recorded | Since |
|---|---|---|
| `ExecutedWebGitCommitHash` (code) | 982 / 1,550 | 2026-03-28 |
| `PromptContentHash` (prompt) | **78 / 1,550** | 2026-05-26 |
| config snapshot | **0 — no `job_config_snapshots` table locally** | — |

So per-job prompt/config is essentially **unrecorded** → we rely on the **commit-as-bundle** model rather than reading snapshots. **Two caveats:** (a) re-seed may have *lagged* (known failure mode: *"code defaults only seed new DBs; config.db retains old values"*; detectable via `Q-INF_PROMPT_ROLLOUT_DRIFT`) — **spot-check** against the 78 prompt-hash-tracked jobs before trusting it for replay; (b) the "8 prompt hashes / one spanning 12 commits" finding is from those 78 recent jobs only, and is *consistent* with the re-seed model (prompts change rarely, via commits). **Key simplification:** *ranking* existing reports by commit does NOT need the missing snapshots — the report output already embodies the live bundle; provenance only matters for faithful *replay* (Phase 2) and causal attribution.

**Trap B — ~1 sample per (commit × family); evidence drift dominates.** Coverage: bundesrat-rechtskraftig 67 jobs/59 commits; asylum-235000 53/47; hydrogen 73/39; plastic 108/52; bolsonaro-en 86/82; asylum-wwii ~43/41; bundesrat-simple TBD in Phase 0. Evidence-pool drift swings truth 16–47pp (Jaccard 0.10–0.29). **At n≈1 per cell, ranking commits = ranking evidence-pool luck** — exactly why every prior attempt collapsed.

**Improvement thesis:** (1) score against the unit that actually varies (code epoch + held prompt/config); (2) average out evidence noise (N reruns, same window); (3) keep per-family AND composite so a weighting artifact can't masquerade as a winner; (4) **score against the Captain's documented criteria, not an invented rubric.**

---

## 3. The reframed, well-posed question

> **Which code state — a commit or contiguous commit-range ("epoch") — produces the best reports across the scoreable benchmark families, scored against the Captain criteria, when prompt/config are held comparable and evidence-pool noise is averaged out?**

Answered as a **per-family ranking table** + a **transparent composite**, every winner gated by the input-class variance band.

---

## 4. Assets we build on

- **Definition of "best" (authoritative triad):** `Docs/AGENTS/report-quality-expectations.json` (Q-code checks), `Docs/AGENTS/benchmark-expectations.json` (per-family bands + `noiseTolerancePct: 8`), `Docs/AGENTS/Captain_Quality_Expectations.md` (intent). Origin: `Docs/ARCHIVE/2026-04-11_Canonical_Quality_Criteria.md`.
- **Provenance:** `Jobs.ExecutedWebGitCommitHash`, `Jobs.PromptContentHash`, `job_config_snapshots`; `meta.*` in ResultJson.
- **Commit-aware summary (upgraded this session):** `scripts/validation/extract-validation-summary.js` groups by `executedWebGitCommitHash` + `promptContentHash`; `compare-batches.js`. Dual-schema (handles current + legacy reports).
- **Replay harness:** worktree checkout + dev server + `scripts/run-validation-matrix.js` (N reruns, JSONL).
- **Decomposition/rating extractor:** `scripts/diag/plastic-ac-extract.cjs <input>` — per-claim statements + verdicts across all stored reports for any input (generalized from the plastic study).
- **Confound attribution:** `scripts/diag/compare-evidence-pools.cjs` (source-set Jaccard → evidence-drift vs sampling).
- **Gold comparators:** `Captain_Quality_Expectations.md` comparator tables + `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md`.
- **Variance policy:** `Docs/ARCHIVE/2026-03-25_EVD1_Acceptable_Variance_Policy.md`.
- **Determinism:** `config.deterministic = true` → temp 0.

**Scoreable families (8, current bands):** bundesrat-rechtskraftig, **bundesrat-simple** (high-true 85–100), asylum-235000-de (true-side 58–75), **asylum-wwii-de** (false-side 18–42), bolsonaro-en (true-side 58–85), bolsonaro-pt (true-side 58–85), hydrogen-en (5–25), plastic-en (**centered 42–65, conf ≤75, reading-declared**).

---

## 5. Gate G1 — definition of "best" (RESOLVED: the Captain criteria)

A report's family-fit score is its **Q-code scorecard** against the authoritative triad — not an invented weight set. Structure mirrors the Q-code severities:

1. **Hard-failure floors = gating** (`Q-HF1` runtime integrity, `Q-HF4` every verdict cites ≥1 evidence, `Q-HF6` conf ≥40). A report failing a floor is **broken → excluded** (not scored), and the failure is itself recorded (a state that produces broken reports is worse).
2. **Verdict direction = primary axis** (`Q-BE1` label ∈ `expectedVerdictLabels`; `Q-V_LABEL_DIRECTION`; `Q-V1` evidence-direction alignment). A direction inversion is the cardinal failure.
3. **Calibration** (`Q-BE2` truth band ± 8pp) and **confidence** (`Q-BE3` conf band; plus the new **confidence-ceiling** rule for interpretation-laden families, e.g. plastic ≤75).
4. **Structure** (`Q-BE4` `boundaryCount ≥ min`; no degenerate collapse).
5. **Evidence** (`Q-EV5/6`, probative balance, no contamination).
6. **Stability** (`Q-ST1–6`; requires the reruns → measured in Phase 2, not Phase 1).
7. **Warnings** (`Q-WS1/2` severity honesty).

Compose into 0–100 per (state × family) **mean + variance over reruns**; composite = weighted mean across families (default equal). **Always print per-family and composite.** Where a family is interpretation-laden (plastic), reward **calibrated/centered** outcomes — an extreme verdict that misses the centered band scores worse than a MIXED one, per the new generic rule.

> This makes G1 **closed by construction**: we score against what the Captain already documented. The only residual G1 choice is the **cross-family composite weighting** (default equal; alpha-relevant families could be up-weighted).

---

## 6. Strategy — two-phase funnel

### Phase 0 — Enumerate states (free)
1. `git log --first-parent` filtered to report-affecting paths: `apps/web/src/lib/analyzer/**`, `apps/web/prompts/**`, `apps/web/configs/**`. Exclude docs/test/admin.
2. Collapse contiguous report-affecting commits into **code epochs** (the "commit-range" unit); record boundaries + dates.
3. Join every SUCCEEDED job to its epoch via `ExecutedWebGitCommitHash`; attach `PromptContentHash`, config-snapshot id, `CreatedUtc`. (Use the upgraded `extract-validation-summary.js` grouping.)

### Phase 1 — Historical screen (FREE; scores existing ~1,550 reports; answers "best so far")
1. For each of the 8 scoreable families, score every existing report via the **Q-code scorecard (§5)** against **current bands**.
2. Aggregate at the **coarsest unit where n per (group × family) ≥ 3** (prefer code-epoch; fall back to promptHash-cohort or time-window); mark n<3 as **"anecdote — not rankable."**
3. Output: per-family ranked epochs + composite ranking + **discriminating-power note** (which families separate states vs are noise-dominated) + **confound flags** (epochs whose runs cluster in one date window = one evidence env). Note any reports scored against superseded bands and re-score to current.
4. Deliverable: a **2–4 state shortlist** with caveats. Cost **$0**.

### Phase 2 — Budget-bounded elimination funnel (PAID; **≤ 50 runs**; historical mode)

Three design rules from the Architect (2026-05-31):

- **R3 — the unit is the CODE-EPOCH, not the bare commit.** A commit and every neighbor with **no pipeline change** (no edit to `apps/web/src/lib/analyzer/**`, `prompts/**`, `configs/**`) between them are **the same state**. Replay any one representative (use the epoch's pipeline-start commit); pool their historical reports. *Confirmed examples:* current-HEAD's epoch = 15 commits back to the last pipeline change `1c790a05` (the recent Stage-1 + docs commits all collapse into it); `6164ef8e`'s epoch absorbs 5 commits; etc.
- **Failures are CODE-DETERMINISTIC; quality is EVIDENCE-DRIFT-DOMINATED — screen them separately.** Hard failures (report_damaged / Stage-1 contract abort, zero-evidence, UNVERIFIED-collapse, direction inversion) reproduce regardless of the web → **N=1 detects them.** Band-calibration quality needs **N≥4** to beat evidence drift. So eliminate failing epochs cheaply *before* spending the ranking budget — that is the "exclude high-failure commits early" mandate.
- **Spend only on DISCRIMINATING families.** From Phase 1, hydrogen & asylum-wwii saturate (~100 for everyone) → near-zero information; bolsonaro-en is the big separator. Confirm on families that actually separate candidates; sanity-touch the saturated ones at N=1 only.

**Step A — free pre-filter (0 runs).** From Phase 1 data, drop any candidate epoch with a high historical broken-rate / UNVERIFIED-rate or a direction inversion. (Free elimination before any spend.)

**Step B — candidates (≤4 epochs):** `424b9652` (April peak) · `6164ef8e` (late-May) · **current HEAD** (forward question) · optionally `8d0098d7`. Each replayed at its epoch representative with prompts+config re-seeded from that commit's bundle (after the §8 re-seed spot-check).

**Step C — Round 1: deterministic failure gate (N=1).** Each candidate × the 3 failure-exposing inputs {`bolsonaro-en`, `bundesrat-rechtskraftig`, `plastic-en`} × 1 run = **≤12 runs**. Eliminate any candidate that hard-fails or inverts direction. These runs **double as the first quality sample** for survivors (not wasted).

**Step D — Round 2: confirm survivors on discriminating families to N≥4.** Spend the remaining budget (≈38 runs) interleaved/round-robin, `deterministic:true`, one contiguous window, prioritizing families where survivors sit **within the variance band** (close calls — where extra samples change the ranking). Capture source-URL sets → cross-state Jaccard (`compare-evidence-pools.cjs`) to attribute deltas to **code vs evidence luck**.

**Decision rule:** a state wins a family only if its mean beats the runner-up by **more than that family's input-class variance band**; else "indistinguishable." Report per-family **and** composite.

**Budget arithmetic (hard cap 50):** Round 1 ≤12; if 2 survive → Round 2 ≈ 2×(4 discriminating families × ~4, minus Round-1 samples) ≈ 26 → total ≈ 38. If 3 survive → ≈ 45. If 4 survive → drop to 3 discriminating families or N=3 to stay ≤50. The early failure-gate is what keeps it under budget.

### Confound controls (the "do it better" core)
Unit = code-epoch (R3); failures gated at N=1 before ranking; quality ranked at N≥4 only on survivors × discriminating families; same contiguous evidence window; temp 0; evidence-overlap attribution; variance-band decision rule; per-family AND composite; current Captain bands only.

---

## 7. The execution prompt
See the chat response for the copy-paste prompt; kept in sync there. It drives Phase 0/1 free now (Q-code scoring over existing reports, grouped by the upgraded summary tool) and Phase 2 on approval.

---

## 8. Decisions
1. **Composite family weighting** — ✅ RESOLVED: **equal weights** (Architect, 2026-05-31).
2. **Phase-2 mode** — ✅ RESOLVED: **historical / in-situ** (Architect, 2026-05-31). "Best commit" = the bundled `(code + prompt + config)` state live at that commit. Each candidate is replayed as its committed bundle: checkout → re-seed prompts+config from that commit's default files → run.
3. **Phase-2 budget** — ✅ RESOLVED: **≤ 30 runs**, investigation **primarily on existing reports (local + deployed)** (Architect, 2026-05-31). Existing data settles the saturated families for free; the 30 runs target only what it cannot — see **§10** for the deployed integration + the targeted run plan.

**Pre-Phase-2 gate — re-seed-model spot-check:** for the 78 prompt-hash-tracked jobs (since 2026-05-26), compare each `PromptContentHash` to the prompt files at its commit and scan `Q-INF_PROMPT_ROLLOUT_DRIFT`. Confirms the commit-as-bundle assumption before any historical replay is trusted. If drift is found, historical replay for the affected range is unreliable and must fall back to scoring recorded outputs only.

Phase 1 is free and unblocked — it ranks the **982 commit-tagged reports (2026-03-28 → 05-31)** by their Q-code scores and shortlists for the only paid step. (568 older, untagged jobs cannot be attributed to a commit and are excluded.)

---

## 9. Phase 1 results — historical screen (2026-05-31, FREE; tool: `scripts/diag/best-commit-phase1.cjs`)

**Universe:** 480 reports across the 8 families, scored vs **current** bands (severity-tiered Q-code penalties; HIGH −25 / MEDIUM −10; Q-HF1-broken = 0), mapped to the report-affecting code-epoch active at each report's `CreatedUtc`. 769 report-affecting epochs since 2026-01.

**Top composite (equal family weights):**

| # | State | Date | What it is | Composite | Families n≥3 |
|---|-------|------|-----------|-----------|--------------|
| 1 | **424b9652** | 04-22 | `fix(stage1): preserve article contract-approved claim sets` | **87** | 6 |
| 2 | 8d0098d7 | 04-15 | phase7 docs/observability follow-ups | 78 | 3 |
| 3 | 01aa3203 | 04-18 | `fix(acquisition): prioritize discovered official artifacts` | 71 | 2 |
| 4 | 6164ef8e | 05-25 | `fix(web): harden claim auto-selection contract` | 69 | 3 |

**Per-family highlights for the leader (424b9652):** on-band on bundesrat-rechtskraftig / asylum-wwii / hydrogen (mean 100), asylum-235000 77, bolsonaro-pt 80 — but **weak on bolsonaro-en (67; 21/37 UNVERIFIED**, the known sufficiency issue). No state wins every family → confirms prior "quality is family-specific."

**Unrankable:** `bundesrat-simple` (17 reports, no epoch reaches n≥3) — anecdote-only; its band just changed to high-true so historical reports likely wouldn't match regardless.

**Caveats (why this is a screen, not a verdict):**
1. **Batch artifact** — 424b9652 leads partly because a large April validation batch ran against it (e.g. bolsonaro-en n=37), giving it n≥3 in 6 families; states that were never batch-tested can't qualify.
2. **Single evidence-window per epoch** → favorable-evidence-day confound; only Phase 2 (controlled, interleaved reruns) separates code from evidence luck.
3. **Stability (Q-ST) not scored** here (needs reruns).
4. **Current HEAD is under-represented** (no recent big batch) — its quality is historically under-measured.

**Recommended Phase-2 shortlist:** `424b9652` (April quality peak) · `6164ef8e` (late-May) · **current HEAD** (to answer "is today better or worse than the April peak?") · optionally `8d0098d7`.

---

## 10. Existing-reports-primary revision (2026-05-31) — local + deployed, ≤30 runs

**Architect directive:** base the investigation **primarily on existing reports (local + deployed)**; cap reruns at **30**.

**Deployed reports incorporated** — public API `app.factharbor.ch/api/fh/jobs` (110 jobs / 3 pages; 8 match the families). The list exposes `verdictLabel/truthPercentage/confidence/createdUtc/analysisIssueCode` but **not a usable commit hash** (`gitCommitHash` null at list level → no epoch attribution without per-job detail). Screen-scored on available Q-codes (Q-BE1/2/3) vs **current** bands:

| family | deployed reports (verdict truth/conf, date) | screen |
|---|---|---|
| asylum-235000-de | 6a60b3eb MOSTLY-TRUE 72/70 (04-21); 2e3cb0da LEANING-TRUE 62/65 (04-12) | 100 / 100 |
| bolsonaro-en | eb02cd2e MOSTLY-TRUE 73/70 (04-05); cfd508bc LEANING-TRUE 71/66 (04-03) | 100 / 100 |
| bolsonaro-pt | 1fc7776c LEANING-TRUE 62/52 (04-03) | 100 |
| hydrogen-en | 6bfd73ea FALSE 12/87 (03-25); c1fd6e69 MOSTLY-FALSE 16/82 (03-16) | 100 / 100 |
| plastic-en | 25018c76 MOSTLY-FALSE 24/78 (05-27) | 50 (old false-side — misses the new centered band) |

**Cross-environment synthesis (the free de-confounder):**
- **Solved in BOTH environments → non-discriminating, 0 runs:** hydrogen, asylum-235000-de, bolsonaro-pt (deployed and local both on-band).
- **bolsonaro-en discrepancy = the one ambiguity worth paying for:** deployed is clean true-side (100), but the local April peak `424b9652` was UNVERIFIED-heavy (67). Same era, *different environment* → the local UNVERIFIED is most likely **evidence-scarcity/throttle (a LOCAL artifact), not a code defect.** Confirm with targeted reruns.
- **plastic-en:** all existing reports (local-recent + deployed) predate the recalibration and sit false-side → need a small **current-band** check.
- **bundesrat-rechtskraftig:** local-only (no deployed match); local-rankable; historically Stage-1-fragile → cheap failure gate.

**Revised ≤30-run Phase 2 (spend only where existing local+deployed data cannot settle it):**
| Target | Why | Runs |
|---|---|---|
| bolsonaro-en × {424b9652, 6164ef8e, HEAD} @ N=5 | resolve the local-vs-deployed UNVERIFIED discrepancy | 15 |
| plastic-en × {3 candidates} @ N=3 | existing reports predate the centered band | 9 |
| bundesrat-rechtskraftig × {3 candidates} @ N=1 failure gate | Stage-1 fragility; deterministic → N=1 | 3 |
| buffer | | 3 |
| **total** | | **≤30** |

Everything else (hydrogen, asylum-235000, bolsonaro-pt, asylum-wwii) rides on existing local+deployed reports — no reruns. Decision rule + evidence-overlap attribution unchanged (§6). Optional free add-on: fetch per-job detail for the 8 deployed reports to recover `executedWebGitCommitHash` and place them in epochs (a handful of fetches; only needed if deployed commit-attribution becomes decision-relevant).

---

## 11. Step-1 results (free) + Phase-2 execution harness (2026-05-31)

**Re-seed-model spot-check → PASS (with caveat).** Among the 78 prompt-hash-tracked jobs, **every commit maps to exactly one promptHash** (no commit shows two live prompt states ⇒ no independent live UCM edits decoupled from commits) — consistent with the Architect's re-seed model. Cross-environment bonus: deployed plastic at `2f7a2805` carries promptHash `5a77affe3d`, identical to local jobs at `2f7a2805`; deployed asylum at `ace3c114` shares it (same epoch). Caveat: only directly verifiable in the 05-26→05-31 window (covers candidates `6164ef8e`, HEAD); `424b9652` (04-22) predates tracking → reconstructed by checkout on trust.

**Deployed reports → commits recovered (per-job detail):**

| family | report | commit | evidence | screen vs current band |
|---|---|---|---|---|
| bolsonaro-en | eb02cd2e MT 73/70 | `b7783872` | 102 | 100 |
| bolsonaro-en | cfd508bc LT 71/66 | `521040e9` | 71 | 100 |
| bolsonaro-pt | 1fc7776c LT 62/52 | `521040e9` | 88 | 100 |
| asylum-235000 | 6a60b3eb MT 72/70 | `ace3c114` | 20 | 100 |
| asylum-235000 | 2e3cb0da LT 62/65 | `f1a372bf` | 16 | 100 |
| plastic | 25018c76 MF 24.8/78 | `2f7a2805` | — | 50 (pre-recalibration false-side) |
| hydrogen | c1fd6e69 MF 16/82; 6bfd73ea FALSE 12.6/87 | (meta omitted by detail) | 91/72 | 100 |

**Refined read:** bolsonaro-en is solvable — deployed `b7783872`/`521040e9` produced clean true-side with 71–102 evidence items, while local UNVERIFIED runs were evidence-starved ⇒ the local UNVERIFIED is most likely **local evidence scarcity**, so local bolsonaro-en reruns chiefly measure the *local* environment. Weight plastic + HEAD-coverage higher in the 30 runs.

**Phase-2 harness (verified wiring):** API dispatches to runner via `Runner:BaseUrl` → `POST /api/internal/run-job`; runner reads/writes jobs via `FH_API_BASE_URL`. To replay an old epoch while keeping jobs in the **main DB + visible on the local web app**:
- Keep ONE main API (:5000, main `factharbor.db`) and the main web UI (:3000) for viewing.
- Run the candidate epoch's `apps/web` as a **runner** on :3001 with `FH_API_BASE_URL=http://localhost:5000`; set the main API's `Runner:BaseUrl=http://localhost:3001`; submit that candidate's jobs; restore afterward.
- HEAD candidate needs **no swap** (current runner = HEAD) → validate the path on HEAD first.

**Execution risks:** (1) repointing the shared API `Runner:BaseUrl` / restarting services affects anything else using the local stack (e.g. an active parallel pipeline agent); (2) old worktrees may not `npm install`/build cleanly (esp. `424b9652`, ~6 wks old); (3) ~30 real LLM jobs ⇒ multi-hour wall-clock + ~$30–150; (4) `deterministic:true`, temp 0, interleaved, ≤30 cap.

---

## 12. Phase-2 execution status (2026-05-31): STAGED — held for a free local stack

- **Free work complete:** Phase-1 local screen (§9), deployed integration + commits (§10–11), re-seed gate PASS (§11).
- **Current-HEAD harvest = empty:** the parallel pipeline agent (active on main HEAD) has not run the benchmark families on HEAD; no free HEAD data point exists → HEAD needs runs.
- **Decision:** do NOT run the ≤30 paid replays concurrently with the active agent — shared `factharbor.db` write-contention + moving HEAD + mutual measurement perturbation. **Hold until the local stack is free.**
- **Ready-to-run plan (collision-free, on a free window):** isolated 2nd API (:5001) + per-epoch old runner (:3001) → **same main `factharbor.db`** (jobs visible on :3000, no reconfig of the main stack). Pin HEAD to a fixed commit for its replay. Targets: `424b9652`, `6164ef8e`, pinned-HEAD; spend per §10 (plastic + HEAD-coverage weighted up; bolsonaro-en treated as local-env, not code). ≤30 runs, deterministic, interleaved.

---

## 13. Phase-2 batch-1 result (2026-06-01): HEAD ruled out + local fetch degraded → STOP local reruns

Ran 14 jobs on current HEAD (`68d8b61a`) via the live local stack (jobs in main DB, visible on :3000). **Architect ruled HEAD out a priori; the data confirms it:**
- plastic-en: MOSTLY-FALSE 21.8 · LEANING-TRUE 59/conf24 · FAILED · MOSTLY-FALSE 26 (misses centered band; 1 hard failure)
- asylum-wwii-de: **MOSTLY-TRUE 82** — direction inverted (expected false-side 18–42)
- bolsonaro-en: LEANING-TRUE 68 · UNVERIFIED 50 · UNVERIFIED 46 (2/3 collapse)
- bundesrat-rk: LT 68 · LF 33 · MOSTLY-TRUE 74.5 (wild spread); asylum-235k MT 78/80 (ok); hydrogen FALSE 8/85 (good)

**Decisive confounder:** every job is saturated with `source_fetch_failure` / `source_fetch_degradation` (+ `insufficient_direct_evidence`, `gate1_thesis_direct_rescue`, `verdict_direction_issue`). HEAD's own commit msg notes "fetch-reliability documented-not-built." → these runs measure **HEAD + a degraded local fetch layer**, not clean code.

**Consequence for the whole Phase-2 method:** fresh **local** replay is currently invalid for ranking code — replaying `424b9652` locally now would hit the same broken fetch layer. **Local reruns are halted.**

**Conclusion stands on existing reports:** the "best so far" signal rests on the local historical screen (`424b9652` April peak leads, §9) + deployed production reports (§10–11, all on-band; clean bolsonaro at `b7783872`/`521040e9`). Fresh confirmation of `424b9652` requires either fixing local source-fetch first, or comparing in the deployed environment. No further local runs without that.

---

## 14. Companion: V1 quality-decline attribution + Rec-A refutation (2026-06-01)

See `Docs/WIP/2026-06-01_V1_Quality_Decline_Attribution_and_RecA_Refutation.md` (Lead Architect, 3-reviewer). It resolves the "decline" this study's raw numbers might suggest:
- The calendar-time decline is **real in raw counts but misattributed** — dominated by **input mix** (recent load ≈half hard Bolsonaro legal-prediction; the *same* Bolsonaro input is flat ~58%→55% UNVERIFIED across eras), the **Apr-10 `report_damaged` emit/abort instrumentation** (`02d8c3b1`; underlying contract-failure rate flat-to-declining 20→17→14%), and the **degraded source-fetch layer**.
- **Rec-A (`1a0687c0`, Pass-2→Haiku-tier) is REFUTED as a cause and must NOT be reverted** — it was a bug-fix (old `"verdict"` key silently pinned Sonnet); reverting reopens soft-refusal/language-drift; Pass-2 ran Haiku across the whole *measurable* window anyway.
- **No quick quality lever exists.** Path: (1) fix source-fetch (≈72% 403) — prerequisite to any live ranking/replay; (2) `report_damaged` population work; (3) mechanism-specific model experiments only (never a blanket Rec-A revert).
- Captain's Feb "Sonnet window" (`9cdc8889`, the `quality_window_start` landmark) predates commit-hash recording (Mar 28) → unmeasurable from the local DB; cannot be attributed to Pass-2 tier.

This study's best-commit conclusion (`424b9652` screened leader, family-specific, deployed `b7783872`/`521040e9` clean, HEAD ruled out, local reruns halted on fetch) is unchanged and consistent with the companion.

---

## 15. PAUSED — consolidation & correction (2026-06-01)

**Investigation PAUSED at Architect request (likely to continue).** Resumption point + full checklist: `Docs/AGENTS/Handoffs/2026-06-01_Senior_Architect_BestCommit_Investigation_Pause.md`.

**Corrections to earlier sections (post-review):**
- **§13 fetch framing refined.** `source_fetch_failure` is **chronic, not recent-only** — present in ≥64% of jobs *every week since March*, incl. the `424b9652` Apr-22 window → **no clean local window**. The companion's "~72% 403 recently degraded" is a finer *per-attempt severity* metric (run `fetch-failure-drift-sizing.cjs`); job-level presence ≠ severity. Because fetch is **environment-level (hits all commits equally)**, a *fresh same-window A/B* stays valid for relative-code comparison **if** severity permits non-degenerate reports.
- **§13 "HEAD ruled out" softened.** HEAD is excluded **by Architect direction**, not by measurement; the 14 fetch-contaminated HEAD runs (no same-window comparator) **neither confirm nor refute HEAD code quality**. Don't cite them as "HEAD is bad code."
- **Repo state:** HEAD now `f51d5bb4` (other agent pursuing mechanism-specific work: Pass-2 A/B design, lever-(b), prompt-audit fixes — the correct non-blanket path). Best-commit conclusions unchanged.

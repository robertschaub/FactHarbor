# Best-Commit Identification — Strategy Proposal (v1)

- **Date:** 2026-05-31
- **Author role:** Senior Architect (proposal — not yet executed)
- **Question asked:** *Which commit (or commit-range) produced the best ClaimBoundary reports so far, and how do we identify it better this time than in past attempts?*
- **Status:** PROPOSAL. No reruns executed, no code changed. Awaiting Architect sign-off on Gate G1 (definition of "best") and the Phase-2 cost gate.

---

## 1. What was done before, and what it concluded

Eight prior investigations attacked this question between 2026-04-06 and 2026-05-28. They are the prior art we are improving on.

| # | Doc | Date | Method | Result / Conclusion |
|---|-----|------|--------|---------------------|
| 1 | `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md` | 04-07 | 21 local + 9 deployed jobs across 3-4 builds; per-family verdict/confidence/evidence-count/boundary-concentration; "same-build instability" metric | No single best commit. Phase B (`442a5450`) validated for Bolsonaro; Bundesrat = 70pp same-build spread = blocker |
| 2 | `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md` | 04-07 | Adversarial cross-review (GPT-5 + Lead Architect); rebuilt inventory from DB; external fact-check | Confirmed Phase B; sharpened Bundesrat into 3 sub-failures; **quality is family-specific** |
| 3 | `Docs/WIP/2026-04-16_Benchmark_Report_Quality_Status_Matrix.md` | 04-16 | Post-fix-wave snapshot per family vs known issues | Per-family status matrix; source of `benchmark-expectations.json` |
| 4 | `Docs/AGENTS/Handoffs/2026-05-28_..._2f7a_to_Current_Regression_Investigation.md` | 05-28 | Deployed `2f7a` (107 public reports, 21 exact-hash) vs current; group local runs by "report-equivalent" state | No clean regression; Iran flip judged an *improvement*; direction flips ≠ regressions |
| 5 | `Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md` | 04-11 | **Playbook**: timestamp→commit mapping (`git rev-list --before`), worktree replay, per-family (never averaged), Gate G1/G2 | The documented standard procedure. Canonical Quality Criteria (43 criteria / 6 layers) in `Docs/ARCHIVE/2026-04-11_Canonical_Quality_Criteria.md` |
| 6 | `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md` | 04-06 | Per-family hard-family comparison across commits | Reframed Stage-5 → upstream evidence/retrieval as the blocker |
| 7 | `Docs/WIP/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md` | 04-07 | Single-run canary, claim-acquisition ledger | Phase B "helps" but amplifies Stage-3 concentration |
| 8 | `Docs/AGENTS/Handoffs/2026-05-28_..._Bolsonaro_Statement_Regression_Attribution.md` | 05-28 | Exact-input replay at `406393c9` vs deployed `2f7a`; promptContentHash tracking; failed throttle control | **`executedWebGitCommitHash` is whole-repo, not analyzer-exact — use `promptContentHash` + config blob** |

**The one sentence every prior investigation ended on:** *there is no global "best commit"; quality is family-specific (Bolsonaro's best ≠ Plastik's best ≠ Swiss's best), and same-input comparisons across time are confounded.*

---

## 2. Why the prior attempts bottomed out — now empirically confirmed

The two structural traps were named in doc #8 and the variance work. I measured them against the live local DB (`apps/api/factharbor.db`, 1,578 jobs / 1,550 SUCCEEDED) on 2026-05-31:

**Trap A — the commit hash is not the real provenance unit.**
- 361 distinct `ExecutedWebGitCommitHash` values, but only **8 distinct `PromptContentHash`** values.
- No commit maps to >1 prompt hash, but a single prompt hash spans up to **12 commits** (others 5, 3). Prompts/config are DB/UCM-managed and **decoupled** from code.
- Consequence: a commit's historical reports reflect `code × whatever-prompt-was-live × config-snapshot × evidence-of-the-day`. Replaying that commit *today* would use *today's* prompt state, not the one that produced those reports. The real unit is the tuple **(code epoch, promptHash, config snapshot)**.

**Trap B — per-commit sample size ≈ 1, and evidence drift dominates variance.**
- Coverage of scoreable families in existing data:
  - `bundesrat-rechtskraftig`: 67 jobs / 59 commits (~1.1 per commit)
  - `asylum-235000-de`: 53 / 47 (~1.1)
  - `hydrogen-en`: 73 / 39 (~1.9)
  - `plastic-en`: 108 / 52 (~2.1)
  - `bolsonaro-en` (exact): 86 / 82 (~1.0)
- Evidence-pool drift is the dominant variance source (Jaccard 0.10–0.29; truth% spread 16–47pp by input class per `Docs/ARCHIVE/2026-03-25_EVD1_Acceptable_Variance_Policy.md`).
- Consequence: with ≈1 sample per (commit × family), **ranking commits = ranking evidence-pool luck.** The code signal is below the noise floor. This is *why* every prior attempt collapsed to "family-specific / no clear winner."

**Improvement thesis:** doing it "better" = (1) score against the unit that actually varies (code epoch + pinned prompt/config), (2) average out evidence-pool noise with N reruns and same-window controls, and (3) keep per-family AND composite views so a weighting artifact can never masquerade as a winner.

---

## 3. The reframed, well-posed question

> **Which code state — a commit or a contiguous commit-range ("epoch") — produces the best reports across the scoreable benchmark families, when prompt/config are held comparable and evidence-pool noise is averaged out?**

Answered as: a **per-family ranking table** + a **transparent, reweightable composite**, with every winner gated by the variance band (a state wins a family only if its mean beats the runner-up by more than the input-class noise band).

---

## 4. Existing assets we build on (no new infra needed)

- **Provenance:** `Jobs.ExecutedWebGitCommitHash`, `Jobs.PromptContentHash`, `Jobs.GitCommitHash`, `job_config_snapshots` table; `meta.*` in ResultJson (`apps/web/src/lib/build-info.ts:81`, `internal-runner-queue.ts:199`).
- **Scoreable expectations:** `Docs/AGENTS/benchmark-expectations.json` — 6 families with non-null bands + `noiseTolerancePct: 8`.
- **Variance policy:** `Docs/ARCHIVE/2026-03-25_EVD1_Acceptable_Variance_Policy.md` — per-input-class acceptable bands (A ≤5pp … D/legal ≤20-25pp).
- **Replay harness:** worktree checkout + local dev server + `scripts/run-validation-matrix.js` (N=5 per claim, JSONL out) using a claims file = the 6 scoreable inputs.
- **Batch compare/summary:** `npm run validate:run` (`scripts/validation/extract-validation-summary.js`), `npm run validate:compare` (`compare-batches.js`).
- **Confound attribution:** `scripts/diag/compare-evidence-pools.cjs` (source-set Jaccard → distinguishes evidence drift from sampling noise).
- **Determinism knob:** `config.deterministic = true` → temperature 0 (`apps/web/src/lib/analyzer/config.ts:138`).

---

## 5. Gate G1 — definition of "best" (proposed default, reweightable)

Each report is scored 0–100 against its family's `benchmark-expectations.json` entry. Default dimension weights:

| Dim | Weight | Signal |
|-----|--------|--------|
| Verdict-direction correctness | 40% | label ∈ `expectedVerdictLabels`; TRUE↔FALSE inversion = cardinal failure (zero) |
| Calibration | 20% | `truthPercentage` in band; distance-outside-band penalty, 8pp noise tolerance |
| Confidence appropriateness | 10% | `confidence` in band; penalize over-confidence on thin evidence & UNVERIFIED collapse |
| Structural integrity | 15% | `boundaryCount ≥ minBoundaryCount`; no report_damaged / zero-evidence / zero-boundary collapse |
| Evidence quality | 10% | probativeValue coverage, claimDirection balance, no contamination (e.g. state.gov on Bolsonaro), citations present |
| Warning cleanliness | 5% | no HIGH-severity `analysisWarnings` (PROMPT-ROLLOUT-DRIFT, contract failures…) |

Aggregate to per-(state × family) **mean + variance** over reruns; composite = weighted mean across families (default equal family weights). **Always print per-family and composite.** *Architect may reweight before execution — this is the only blocking input for Phase 1.*

Excluded as **unscoreable** (null bands): `asylum-wwii-de`, `bundesrat-simple`. Reported separately as qualitative-only.

---

## 6. Strategy — two-phase funnel

### Phase 0 — Enumerate states (free)
1. `git log --first-parent` filtered to **report-affecting paths** only: `apps/web/src/lib/analyzer/**`, `apps/web/prompts/**`, `apps/web/configs/**`. Exclude docs/test/admin-only commits.
2. Collapse contiguous report-affecting commits into **code epochs** (the "commit-range" unit). Record epoch boundaries + dates.
3. Join every SUCCEEDED job to its epoch via `ExecutedWebGitCommitHash`; attach `PromptContentHash`, config-snapshot id, `CreatedUtc`.

### Phase 1 — Historical screen (FREE — scores the existing 1,550 reports; answers "best so far")
1. Score every existing report for the 6 scoreable families per Gate G1.
2. Aggregate at the **coarsest unit where n per (group × family) ≥ 3** so variance is estimable: prefer code-epoch; fall back to promptHash-cohort or time-window; mark anything at n<3 as **"anecdote — not rankable."**
3. Output: per-family ranked epochs + composite ranking + a **discriminating-power note** (which families separate states vs which are noise-dominated) + **confound flags** (e.g. an epoch whose reports all ran in one narrow date window saw one evidence environment).
4. Deliverable: a **shortlist of 2–4 candidate states/epochs** with explicit caveats. Cost **$0**. This is the historical "so far" answer to the resolution the data allows.

### Phase 2 — Confirmatory controlled reruns (PAID — user-gated; answers "best to use now")
Only after Phase-1 shortlist + explicit cost approval.
1. For each shortlisted state: `git worktree add` in `.tmp/quality-worktree/`, checkout, start dev server from that worktree.
2. **Hold prompt/config comparable** — default **code-isolating**: pin prompts+config to one reference state (today's) across all candidates → answers "which *code* is best, forward-actionable." (Alternative **historical**: restore each state's own config snapshot — answers "which *state* was best in situ." Architect picks; see §8.)
3. `scripts/run-validation-matrix.js` with the 6 scoreable inputs, **N≥5 per family**, `deterministic:true` (temp 0), all candidates in **one contiguous time window**, **interleaved round-robin** across states (no state gets a privileged time-of-day evidence env).
4. Capture each run's source-URL set → cross-state Jaccard via `compare-evidence-pools.cjs` to attribute deltas to **code** vs **evidence luck**.
5. Score per Gate G1; apply the **variance-band decision rule**: a state wins a family only if mean beats runner-up by more than the input-class band; else "indistinguishable."
6. **Cost shown up front:** `states × 6 families × N × $1–5/run`. (e.g. 3 states × 6 × 5 = 90 runs ≈ $90–450.)

### Confound controls (the "do it better" core)
1. Provenance unit = (code epoch, promptHash, config snapshot), never bare commit.
2. Same evidence window for any head-to-head; for Phase 1, only compare time-overlapping epochs or flag the confound explicitly.
3. N≥5 + variance-band decision rule; never call a winner inside the noise band.
4. temp 0 to remove sampling noise → isolates code + evidence drift.
5. Evidence-overlap measurement to separate code effect from evidence luck.
6. Per-family AND composite, always.
7. Scoreable families only; null-band families qualitative-only.

---

## 7. The execution prompt

A standalone orchestration prompt (Phase 1 runnable now at $0; Phase 2 gated). `/report-review` is single-build-oriented and not built to rank many states, so this is a new orchestration. Phase 1 = DB + scoring (agent or a small `.cjs`); Phase 2 = worktree-replay orchestration (optionally a Workflow for parallel reruns). See the response/handoff for the copy-paste prompt text; it is reproduced here:

> **(prompt body — see §"Execution prompt" in the chat response; kept in sync there)**

---

## 8. Open decisions for the Architect (only G1 blocks Phase 1)

1. **Gate G1 weights** (§5) — accept the default 40/20/10/15/10/5, or reweight? *(blocks Phase 1)*
2. **Phase-2 mode** — code-isolating (pin prompts/config; forward-actionable) [recommended] vs historical (restore per-state snapshots; "best in situ"). *(blocks Phase 2 only)*
3. **Phase-2 budget** — number of shortlisted states × N reruns → $ ceiling. *(blocks Phase 2 only)*
4. **Family weights** — equal (default) or prioritize the alpha-relevant families?

Phase 1 costs nothing and can start as soon as G1 is fixed; it shortlists for the only paid step.

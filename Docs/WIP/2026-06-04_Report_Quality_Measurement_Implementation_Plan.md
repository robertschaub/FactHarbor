# Report Quality — Measurement, Rating & Build Comparison — **Complete Plan**

**Date:** 2026-06-04
**Role:** Lead Architect
**Status:** **Converged & implementation-ready, with gated execution.** Design affirmed across independent reviewers (two model families) + internal passes. **Phase 0 is complete; Phase 1 zero-spend scorer is built and signed off for CLI use after conformance sweep + stored-report dry-run.** 5 Captain decisions recorded. The Phase 0b structural dossier schema/validator, manual rubric, score artifact contract, and judge output contracts are defined; dossier-backed scorer wiring remains gated by the Phase 0b reliability checks.
**Companion (full rationale + review audit trail):** `Docs/WIP/2026-06-04_Report_Quality_Measurement_And_Build_Comparison_Concept.md` (v7). This file is the *clean, actionable consolidation* — it supersedes the need to read the concept's changelog.
**Feeds:** the Pipeline-Era Comparison study (`2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md`) — its Phase-3 "normalize + compare" measurement layer.

---

## 1. Goal

Measure, rate, and **systematically compare across builds** the quality of FactHarbor analysis reports, decomposed into **isolatable parts**: atomic-claim extraction, evidence, per-claim verdict, overall verdict, narrative. Reuse the existing quality vocabulary (Q-codes, gold bands, diagnostic scripts, telemetry); add what's missing — a **rating model**, a **build-comparison method**, an **honest reference model**, and the **plumbing** to compute it.

## 2. Design in brief (the load-bearing decisions)

1. **Vector-primary; the scalar only gates.** The authoritative object is a per-report **`ReportQualityVector`**, not a single number. A scalar (tier / optional NQS) gates release readiness; it **never ranks builds** (a flat score hides offsetting changes).
2. **The reference gradient.** "Right answer" availability is *not* uniform: aggregate gold exists by default at the overall verdict (C4) (`benchmark-expectations.json`) and a few coarse floors. Deeper AtomicClaim-level gold exists only for families with independently reviewed reference dossiers, scored through frame-scoped N:M semantic alignment with per-frame atomicity fidelity — never through strict claim-string matching, never by letting ambiguity hide clearly distinct truth conditions, and never by rescuing C1 with downstream verdict/evidence. Until such dossiers exist and pass Phase 0b gates, C1/C2/C3 remain structural checks + cross-run stability + judge. Current-snapshot dossiers are time-relative gold and require dossier-version + run-window pinning. See `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`.
3. **Integrity ≠ quality.** Recomputed-structural checks (label↔truth, citation-in-set, aggregation faithfulness, claim-count, anchor survival) detect *brokenness/regression*, **not analytical goodness** — they **gate/floor, never rank**. Quality ranks on **gold (C4, plus validated dossier-backed C1/C3 for dossier families that pass Phase 0b gates) + calibration + cost + independent judge**. Pipeline self-labels (probativeValue, sourceType, TIGERScore…) are **colour, never ranked**.
4. **Comparison is relative & cost-aware.** Where gold exists, score absolutely; where not, judge **pairwise A/B** (conditional, not isolation). Cost is **co-equal via tie-band** (below). Everything distributional over **N reps**.
5. **One role per signal.** Every signal is exactly one of **GATE/FLOOR · RANK · TIE-BREAK · COLOUR · CONTROL-FOR** — see the canonical routing table (§5). If it's not in the table, it isn't used.

## 3. The components (isolatable parts)

| # | Component | Pipeline stage | What it measures | Reference |
|---|---|---|---|---|
| **Gate** | Runtime integrity (`Q-HF1`) | — | Report completed without `report_damaged`/provider-failure/missing-verdict | structural gate |
| **C1** | Atomic-claim extraction | Stage 1 | Faithful, atomic, complete decomposition of input; for dossier-backed families, correct frame choice + independently assessable truth conditions | none by default (count+anchor floors only); dossier-backed frame/atomicity coverage only after Phase 0b gates |
| **C2** | Evidence & boundaries | Stage 2/3 | Relevant, sufficient, diverse, scoped evidence per claim | minBoundaryCount floor |
| **C3** | Per-claim verdict | Stage 4 | Grounded, cited, direction-coherent, self-consistent verdict | none per-claim |
| **C4** | Overall verdict | Stage 5 | Label / truth% / confidence / boundaries vs **gold band** | **GOLD** |
| **C5** | Narrative & communication | Stage 5 | Explanation reflects evidence, uncertainty, limits, verdict | none |
| x-cut | **Stability** | reps | Drift across identical reruns (truth-spread, claim/evidence Jaccard, classification) | distributional |
| x-cut | **Calibration** | build × reps | Confidence tracks in-band hit-rate (the overconfidence failure mode) | gold (C4) |
| x-cut | **Efficiency** (cost/latency) | telemetry | Quality-per-cost / -latency; per-stage cost & reliability | measured (telemetry-gated) |
| x-cut | **Bias / neutrality** | live/paired | Mirrored-claim symmetry, question/statement neutrality, evidence-pool skew | fixtures (live) |
| control | **Infrastructure** (`Q-INF_*`) | — | Concurrency/timeout/fallback/prompt-drift — **controlled-for, not scored** | — |

## 4. The rating model

**Per report** → the authoritative `ReportQualityVector`:
```
ReportQualityVector = {
  integrity,          // GATE — Q-HF1; fail ⇒ BLOCK, vector zeroed
  claims, evidence,   // C1, C2 — integrity gates/floors + colour; dossier-backed C1 can rank only after Phase 0b gates
  claimVerdicts,      // C3 — integrity gates + self-consistency + (Phase-2) judge; dossier-backed C3 can rank only after Phase 0b gates
  overallVerdict,     // C4 — the gold-anchored QUALITY rank (harm-adjusted)
  narrative,          // C5 — structural + (Phase-2) judge
  stability,          // build-level (≥2 reps)
  calibrationSignals, // per-report inputs → build-level calibration metric
  efficiency,         // cost/latency (telemetry-gated, forward-only)
  neutralitySignals   // Phase-3 live/paired
}
```
**Per-report tier (lossy, gates only — never ranks builds):** `Q-HF1` fail ⇒ **BLOCK**; any HIGH finding or C4 gold band missed beyond noise ⇒ **WATCH**; else **PASS**. An optional 0–100 **NQS** may exist as a labelled dashboard "gate summary" only.

**Build verdict (§5f) — pre-registered, gated, tie-band:**
1. **GATES / FLOORS:** integrity rate (`Q-HF1`) + integrity/contract violation rate (T2) + a **C4 gold-band floor**. Regress any ⇒ the build loses regardless of other gains. *(Correctness floor protected — "cheap but wrong" can never win. Cost is **not** a gate — it has a single role: tie-band RANK, §5; a hard budget gate would need an explicit Captain-defined threshold + its own routing-table row.)*
2. **QUALITY RANK (tie-band — Captain decision ①):** rank on {**C4 harm-adjusted**, **calibration**, **stability**} first; add **validated dossier-backed C1/C3 alignment** only for dossier families whose Phase 0b gates have passed. **Among builds statistically tied on quality (CIs overlap within the noise band), the cheaper/faster build wins.** Cost decides only on a quality tie (no exchange rate needed; works with coarse `llmCalls`). *(Pure Pareto can't decide cost-vs-quality — it deadlocks; tie-band resolves it while protecting correctness.)*
3. **TIE-BREAKERS:** T4 pairwise wins (C1, C5; conditional-C3 colour only) + bias/neutrality.
- **T2 gates but never ranks; T3 self-labels are colour, never ranked.** A surviving tie = **no-strict-order — report it.**

## 5. Canonical signal-routing table (the executable contract — one role per signal)

| Signal | Role | Source / availability | Score domain / rule |
|---|---|---|---|
| `Q-HF1` runtime integrity | **GATE** | **`Jobs.Status`** (== SUCCEEDED) + `ResultJson.analysisWarnings` | pass / BLOCK |
| label↔truth consistency | **GATE** | ResultJson (recompute) | pass / violation |
| citation-in-set (no hallucinated IDs) | **GATE** | ResultJson (recompute) | pass / violation |
| aggregation faithfulness | **GATE** | ResultJson recompute vs `aggregation-stage` baseline | pass / violation (see §9) |
| claim count ≥ `minDistinctEvents` | **FLOOR** | ResultJson + Phase-0 annotation | pass / violation |
| anchor-token survival | **FLOOR** | ResultJson + Phase-0 annotation | pass / violation |
| per-claim citation/evidence floor | **FLOOR** | ResultJson | pass / violation |
| **C4 harm-adjusted gold-band** | **RANK** | ResultJson + benchmark bands | **[−100,100]**, raw mean (no clip) |
| validated dossier-backed C1/C3 alignment | **RANK** (availability-gated, dossier families only) | Reference dossier + manual/LLM alignment after Phase 0b gates | C1 extraction-only frame/assertion/atomicity/disclosure alignment + C3 mapped verdict/evidence alignment; [0,1] per axis |
| calibration (ECE/Brier) | **RANK** (build) | C4 vs bands × reps | [0,1]; descriptive at pilot N |
| stability (`Q-ST1–6`) | **RANK** (build) | ≥2 reps | spreads / Jaccard |
| cost-efficiency | **RANK** (build, tie-band — only on a quality tie) | `meta.llmCalls` (coarse, always) / `AnalysisMetrics` (rich, forward-only) | quality-per-cost; **n/a** if absent (never a penalty) |
| unvalidated reference-dossier diagnostics | **COLOUR** | Draft/pilot dossiers before Phase 0b gates | manual notes only; no automated build rank |
| C1 claim-decomposition pairwise | **TIE-BREAK** (T4, Phase 2, live) | judge | win-rate |
| C5 narrative pairwise | **TIE-BREAK** (T4, Phase 2, live) | judge | win-rate |
| bias / neutrality | **TIE-BREAK** (Phase 3, live/paired) | calibration runner | symmetry delta vs `expectedSkew` |
| C3 verdict-reasoning pairwise | **COLOUR** (cross-build drift-confounded) | judge (Phase 2) | win-rate, explanatory only |
| probative-value index, `sourceType`, `evidenceBasis`, `applicability` | **COLOUR** (T3 self-labels) | ResultJson | reported only |
| `TIGERScore`, `explanationQualityCheck` rubric | **COLOUR** (T3, availability-gated) | ResultJson (if mode on) | reported; **n/a** if off |
| per-stage reliability (schema-compliance, retries) | **COLOUR** / diagnostic | `AnalysisMetrics` (forward-only) | reported |
| `Q-INF_*` (concurrency/timeout/fallback/prompt drift) | **CONTROL-FOR** (not scored) | log + `runtimeRoleModels` | excluded |

## 6. Build-comparison method

- **Input panel:** the 8 Captain-defined families in `benchmark-expectations.json`. Byte-exact wording (`Q-IN1`). No invented inputs. (plastic-en excluded from the headline aggregate — control lane.)
- **Reps:** pilot N≈5 (catches large/categorical breaks only); **decision N** sized to a stated minimum detectable effect (≈8–10pp family band-rate).
- **Stats:** every rate reported with **clustered/bootstrap CIs** (resample reps within input within build) + multiple-comparison correction; a difference is real only when its CI clears `noiseTolerancePct` (=8). Pairwise is also distributional (paired/concurrent blocks; report non-transitive cycles). *Implementation:* the scorer is a Node/TS script, so the bootstrap is a ~30-line hand-roll (no heavy dependency); normal-approx SE is the lightweight fallback for the matrix-diff display.
- **Front-end:** the **Shadow-Mode matrix-diff** (per family, A→B deltas grouped by role, tie-band verdict).
- **Attribution limit:** component scores localise *where* builds differ, but true per-stage **causal** attribution ("Stage 4 improved, Stage 1 held constant") needs **cross-version claim/evidence injection** (deferred; era-study conditions ③/④). Report **two vectors** — conditional component quality and end-to-end-capped quality — and never over-claim stage causality.
- **Cross-era:** schema-agnostic only via **versioned read adapters** + per-dimension availability flags (`n/a`, not zero). Efficiency is **telemetry-gated** (HEAD-era; n/a on old branches/eras). Branch-vs-HEAD and HEAD-vs-HEAD share a schema and need no adapter.

## 7. Decisions

**Recorded (Captain, 2026-06-04):**
| # | Decision | Choice |
|---|---|---|
| ① | Cost in the ranking | **Co-equal via 2a tie-band** (cost decides among quality-tied builds; correctness never tradeable). Exclude plastic-en from headline. |
| ② | Phase-0 annotations | **Full set, LLM Expert curates** (minDistinctEvents, anchorTokens, trueButMisleading, crossLanguageVariantOf). |
| ④ | First comparison target | **Branch-vs-HEAD**, preceded by a HEAD-vs-HEAD noise-floor run. |
| ⑤ | Confidence-band tolerance | **Strict** (drop the Q-BE3 ±noise expansion; one-line JSON edit = P0.2). |
| cost-rule | §5f step 2 | **2a tie-band** (2b explicit exchange rate retained as a future option). |

**Deferred outside the MVP/data-model contract:**
| # | Decision | Status |
|---|---|---|
| ③ | Cross-provider judge (GPT-5.5 vs in-house multi-vote panel) | Phase-2 implementation choice only; the v0.1 judge input/output contract is fixed in the reference-data model. |
| ⑥ | Contestation-weight drift | Aggregation-faithfulness investigation outside the reference-data contract; it does not change the dossier schema, C1/C3 rubric, or Phase 0b gates. |

## 8. Phased implementation plan

### Phase 0 — References & policy *(owner: LLM Expert; zero spend, no LLM calls)* — **DONE**
- **P0.1 done:** all 8 families in `Docs/AGENTS/benchmark-expectations.json` carry `minDistinctEvents`, `anchorTokens`, `trueButMisleading`, and `crossLanguageVariantOf`.
- **P0.2 done:** strict-confidence policy is in `Q-BE3` (`report-quality-expectations.json`): confidence is checked strictly inside `confidenceBand`; `noiseTolerancePct` does not expand confidence.
- **Gate passed:** annotations are present for all families; JSON↔script confidence policy is consistent.

### Phase 0b — Reference dossiers *(owner: LLM Expert + Lead Developer; zero spend until explicit judge cap)*
- **P0b.0** Use the structural dossier contract: `Docs/AGENTS/Reference_Dossiers/reference-dossier.schema.json` + `scripts/validate-reference-dossiers.cjs`. No root `atomicityPolicy`; use the real Stage 1 `expectedInputClassification` enum only.
- **P0b.1** Instantiate dossier files from `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`: `expectedInputClassification`, dossier-level `ambiguityPolicy`, frame-scoped `atomicityProfile` including `determinabilityStatus`, required reference assertions, truth/confidence bands, source snapshots, and `validityWindow` for current-snapshot assertions.
- **P0b.2** Use the manual-alignment rubric and score artifact contract in the reference-data model: active-frame selection, assertion coverage, Stage-1-only atomicity fidelity, disclosure fidelity, C3 verdict/evidence equivalence, tie handling, and `needs_human_review`.
- **P0b.3 draft produced:** `Docs/AGENTS/Reference_Dossiers/bundesrat-rechtskraftig.v0.1.json` is a validator-clean full draft (`rechtskräftig` = both axes: materially ambiguous legal/procedural term plus clearly distinct truth conditions). It remains `status: draft` until independent curator/adjudicator/reviewer passes upgrade it.
- **P0b.4** Produce partial dossiers for `plastic-en` (interpretation-frame heavy) and one Bolsonaro input (atomicity-heavy with legal/procedural adjudication risk).
- **P0b.5** Run manual alignment on stored reports first. Score per axis: input-classification fit, frame admissibility, assertion coverage, atomicity fidelity, and disclosure fidelity.
- **P0b.6** Instantiate strict-JSON C1 alignment and C3 evidence-equivalence judge prompts from the fixed v0.1 judge output contracts; do not add labels, fields, or scoring rules, and do not run them until Captain approves a cap.
- **P0b.7** Only after Captain approves a cap, run a small two-pass LLM alignment pilot: first active-frame selection, then assertion/atomicity mapping within the selected frame. Default initial cap for approval: USD 10; stop on first unstable per-axis mapping.
- **Gate:** no dossier-backed C1/C3 metric leaves diagnostic mode until manual-vs-judge agreement is at least 85% on each axis. Kappa becomes a scaling gate only once an axis has at least 30 adjudicable scored units and a non-degenerate label distribution; kappa >=0.70 is the target, below 0.60 is no-go. Determinability disagreement must be resolved or marked contested before automated scorer wiring. Current-snapshot comparisons must pin dossier version and run-window. New fields, labels, score conversions, routing roles, or acceptance gates require a reviewed design change.

**Phase 0b closed contract:** all data fields, labels, score domains, validation rules, manual-rubric labels, C1/C3 judge output shapes, routing roles, and reliability gates are defined in the reference-data model + schema. Phase 0b implementers fill dossiers, validate them, run manual alignment, instantiate prompts from the contract, and collect gate evidence; they do not define new model semantics.

### Phase 1 — `scripts/measure-report-quality.ts` *(owner: Senior Developer; zero spend — already-stored data only)* — **BUILT, SIGNED OFF FOR CLI USE**
- **P1.1 built:** `scripts/measure-report-quality.ts` emits the `ReportQualityVector` per stored `ResultJson`.
- **P1.2 Integrity gate/floor (T2 — gate, never rank):** Q-HF1; label↔truth; citation-in-set; aggregation-faithfulness recompute (§9); **+ C1/C2 structural minimums** — claim count vs `minDistinctEvents`, anchor-token survival, per-claim citation/evidence floor. *(NOT source-type diversity — that reads the `sourceType` self-label → colour, P1.4.)*
- **P1.3 C4 quality (RANK):** harm-adjusted tiered gold-band — exact 100 / adjacent 70 / same-side-out-of-band 0–70 by distance / **flip = baseTiered − confidencePct** / **UNVERIFIED = 25**; domain **[−100,100]**, aggregate **raw (no clipping)**; strict confidence band.
- **P1.4 T3 colour (reported, never ranked):** probative-value index, `sourceType` mix, etc. — surfaced in the matrix-diff, excluded from the verdict.
- **P1.5 Efficiency (tie-band cost):** **coarse cost = `meta.llmCalls` (primary)** from ResultJson (`runtimeRoleModels.callCount` is Stage-4 role-tracing → per-role colour only). **Rich cost** (tokens/$/latency) = join `AnalysisMetrics.MetricsJson` (by `jobId`) + Job timestamps — **forward-only**, n/a on old branches.
  - **Data contract:** `{ Jobs.ResultJson, AnalysisMetrics.MetricsJson (optional), Job timestamps (optional) }`, grouped by `(benchmark input, build = commit + dirty-state, rep)`.
- **P1.6 Stability** (≥2 reps) + **availability flags** for gated beta fields (TIGERScore, explanationQualityCheck — may be absent historically).
- **P1.7 Matrix-diff (zero-spend part):** build the §5 routing-table-grouped Shadow-Mode matrix-diff and **validate it on EXISTING stored reports**. CIs via hand-rolled bootstrap (no heavy dep) / normal-approx SE fallback.
- **Verification status:** signed off on 2026-06-06 for zero-spend CLI use. Checks covered C4 harm-adjusted rank, strict-confidence handling, aggregation recompute target, anchor logic, family/noise wiring, floors, T3 colour, efficiency join, bootstrap CIs, stability Jaccard, matrix-diff, focused `--family`/`--compare` paths, and a full stored-report dry-run (**514 scored, 0 parse failures, no batch/live spend**). This does not imply UI integration or dossier-backed scorer wiring.
- **Phase-1 caveat:** C1 floor checks depend on Phase-0 annotations; dossier-backed semantic C1/C3 remains diagnostic until Phase 0b gates pass; efficiency rich-cost is forward-only; current-snapshot gold cannot be mixed across dossier versions.

### Phase 1b — Live comparison *(Captain-gated spend; NOT zero-spend)*
- HEAD-vs-HEAD **noise-floor run** (validate "no difference" when there is none) → **branch-vs-HEAD** comparison (decision ④). Live jobs; must not be conflated with the Phase-1 rollup.

### Phase 2 — Pairwise judge *(gated LLM spend)*
- A/B preference judge for ungolded layers (**C1, C5**; **conditional-C3 = colour**). Blind, order-balanced, hierarchical over rep-pairs. **Anchor on gold-band families first** (judge's A/B must agree with band agreement) before trusting it on ungolded layers. Reuse/adapt the `/report-review` reviewer panels + Devil's-Advocate (extension, not drop-in). Cost-sized at the gate.

### Phase 3 — Calibration + full build comparison *(Captain-gated live spend)*
- Calibration dimension (ECE/Brier vs gold × reps); **bias/neutrality** via the paired calibration runner (live); **versioned era read-adapters** (§6); wire the whole vector into the era-harness "normalize + compare" slot.

## 9. Reference: data contract & formulas (consolidated)

**Stored data sources (verified against source):**
- `ResultJson.meta` (`claimboundary-pipeline.ts:305-341`): `llmCalls`, `runtimeRoleModels` (callCount + fallbackUsed), `claimCount`, `boundaryCount`, `evidenceBalance`, `promptContentHash` — **no tokens, no duration, no cost.** Plus `claimVerdicts`, `OverallAssessment` (incl. `adjudicationPath`), `coverageMatrix`, `sources`, `analysisWarnings`.
- `AnalysisMetrics.MetricsJson` (`metrics.ts`, persisted `persistMetrics`→API, keyed by `jobId`): per-`LLMTaskType` (understand / claim_selection / research / cluster / verdict / aggregate / supplemental / other) tokens, cache, `durationMs`, retries, `schemaCompliant`, errorType. **The scorer must bucket unmapped task types, not drop them.** **HEAD-era / forward-only.**
- Job record (Jobs table): input, timestamps (wall-clock), commit + dirty-state, ResultJson.

**Harmful-error-adjusted C4 (the quality rank):** base tiered = exact 100 / adjacent band 70 / same-side-out-of-band 0–70 by distance; **directional flip ⇒ `harmAdjustedC4 = baseTiered − confidencePct`** (90%-confident flip ≈ −90); **UNVERIFIED/abstention = 25** (safe non-answer, not a flip). Domain **[−100,100]**; aggregate raw across claims/reps/families before CIs — **no clipping**. Calibration is reported separately — **no double-count**.

**Aggregation faithfulness (an integrity GATE, not a quality measure):** recompute the weighted truth from `aggregation-stage.ts::aggregateAssessment` (the LIVE aggregator — **not** `aggregation.ts`): per-claim `finalWeight = centrality{3/2/1} × harm{crit1.5/high1.2/med1.0/low1.0} × (conf/100) × (1+triangulation) × derivative × anchor{2.5 if anchor-preserved} × probative{mean 1.0/0.9/0.5}`; invert truth for `contradicts_thesis`; weight 0 for `thesisRelevance≠direct` and INSUFFICIENT-with-zero-citations. Must equal `adjudicationPath.baselineAggregate.truthPercentage` (truth exact; **confidence** reconciled via the integrity cap `min(·, INSUFFICIENT_CONFIDENCE_MAX)` + adjudication guards + the **narrative downward delta** ≤`narrativeConfidenceMaxDownwardDelta`). Truth is never narrative-adjusted; checking vs `finalAggregate` directly false-positives adjudicated/narrative-lowered reports. **Contestation coupling:** this gate is valid only while the live `aggregateAssessment` path omits `contestationWeights`; if those weights are wired into the live aggregator, the scorer recompute must change in lockstep or the gate will false-positive.

## 10. Limitations (state in every comparison report)
1. No gold below the aggregate verdict by default — C1/C2/C3 are intrinsic + judge unless an independently reviewed AtomicClaim reference dossier exists for that family and its frame/atomicity alignment gates have passed.
2. Run-to-run drift (claim Jaccard ≥0.6 tolerated; evidence-pool 0.10–0.29) is the primary isolation confound.
3. External-world drift — measures "this build on today's world"; mitigate by running arms concurrently. Current-snapshot reference dossiers are time-relative gold and must be pinned by dossier version + run-window.
4. Judge bias — pairwise reduces, doesn't remove; anchor on gold.
5. Per-stage **causal** attribution needs the deferred injection harness.
6. Statistical power — pilot N catches only large/categorical differences; calibration & small deltas need larger N.
7. Efficiency is telemetry-gated & forward-only (old branches/eras → n/a).
8. Integrity ≠ quality — T2 checks detect brokenness, not goodness.

## 11. Reuse map (don't reinvent)
`report-quality-expectations.json` (Q-codes) · `benchmark-expectations.json` (gold bands) · `Captain_Quality_Expectations.md` (intent) · `Reference_Dossiers/reference-dossier.schema.json` + `scripts/validate-reference-dossiers.cjs` (Phase 0b structural contract) · `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md` §7/§8 (manual rubric + judge output contracts) · `best-commit-phase1.cjs` (per-report penalty weights ONLY, not its composite ranker) · `checkworthy-unverified-census.cjs` · `benchmark-band-analysis-equiv.cjs` / `benchmark-band-era-check.cjs` · `compare-evidence-pools.cjs` · `verdict-direction-instability.cjs` · `metrics.ts`/`AnalysisMetrics` (efficiency) · `/report-review` panels (adapted, Phase 2) · the paired calibration runner (Phase 3).

## 12. Immediate next action
**Review/adjudicate the `bundesrat-rechtskraftig` draft dossier, then author the `plastic-en` partial dossier and one Bolsonaro partial dossier.** The Phase 1 zero-spend CLI scorer is signed off; dossier-backed scorer wiring remains gated by the Phase 0b reliability checks. The deferred items (③, ⑥) are outside the executable MVP/data-model contract.

---
*Lead Architect — consolidated plan. Design converged across 3 independent reviewers (two model families) + internal passes; reference-dossier review fixes are folded into the executable contract. Full rationale and the v1→v7 review audit trail: the companion concept doc.*

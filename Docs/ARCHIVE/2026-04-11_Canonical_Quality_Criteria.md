---
title: Canonical Report Quality Criteria — Catalogue (Draft for user prioritization)
date: 2026-04-11
authors: Lead Architect + LLM Expert (Claude Opus 4.6 1M)
parent: Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md
status: Draft — awaiting Gate G1 (user priority ranking)
---

# Canonical Report Quality Criteria

**Purpose.** One merged, deduplicated catalogue of every quality signal already defined in prior FactHarbor investigations. This is **not a new framework**. It is a consolidation of 43 named criteria from 10 prior scorecards plus the product-level Quality-Standards.xwiki requirements, re-organized into a single hierarchy. Source citations are inline so the user can verify provenance.

**Sources consulted (verbatim extraction):**

- `Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md` (13-run Bolsonaro scorecard — G1–G6, B1–B7)
- `Docs/WIP/Report_Quality_Criteria_Scorecard_2026-03-12.md` (generic version of the above — G1–G6)
- `Docs/WIP/2026-03-24_Generic_Report_Quality_Signals_Scorecard.md` (**spine of this catalogue** — HF/S1/EV/V/ST/PT families)
- `Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md`
- `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`
- `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and_Plan.md` (six named issues)
- `Docs/xwiki-pages/FactHarbor/Product Development/Requirements/Quality-Standards.xwiki`
- `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation.md` (F1–F8)
- `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md` (RC1–RC5)
- `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md`

---

## Principles this catalogue applies

1. **Dedupe, don't re-invent.** If a criterion exists in multiple scorecards with the same intent, it appears once here with a cross-reference.
2. **Verbatim definitions where possible.** Paraphrases are marked `[paraphrased]`.
3. **Topic-neutral only.** Bolsonaro-specific criteria (B1–B7) are generalized or retired per the 2026-03-24 evolution.
4. **Each criterion has a measurement.** If a criterion cannot be measured, it cannot be a quality gate.
5. **Every criterion has a "violation example from real runs"** where one exists — so the user sees what the signal looks like broken.
6. **Deterministic-logic freedom** is a cross-cutting constraint, not a single criterion — but it is also raised as its own signal because the user identified it as a priority.

---

## Criteria by layer

The catalogue is organized into six layers, corresponding to where in the pipeline the signal is produced. Each criterion has:
- **ID** — stable short reference (new)
- **Prior IDs** — cross-reference to existing scorecard IDs
- **Definition** — verbatim from primary source
- **Measurement** — how to score it
- **Violation evidence** — real-run example with doc reference
- **Applies to stage** — where in the pipeline the signal is produced

Stage abbreviations: **S1** = Stage 1 extraction, **S2** = Stage 2 research, **S3** = Stage 3 boundary clustering, **S4** = Stage 4 verdict, **S5** = Stage 5 aggregation, **UI** = presentation.

---

### Layer 1 — Hard-failure floors (must not fail)

These are floors below which a report is not publishable. They map to the `HF-*` family in the 2026-03-24 Generic Scorecard.

| ID | Prior IDs | Definition | Measurement | Stage |
|---|---|---|---|---|
| **Q-HF1** | HF-1 | "Runtime integrity — no `analysis_generation_failed`, no `llm_provider_error`, no failed status" | Binary: any hard-failure warning → fail | All |
| **Q-HF2** | HF-2 | "No fallback masquerade — runtime failures surfaced as such, not disguised as ordinary low-evidence outcomes" | Binary: check `AnalysisWarning` severity matches actual cause | All, S4 |
| **Q-HF3** | HF-3 | "Directional correctness on controls — clear controls not inverted" | Binary per test input in a fixed control set | S4 |
| **Q-HF4** | HF-4, `xwiki:17-19` | "Evidence transparency — final verdict cites supporting/opposing evidence" | Binary: `citedEvidenceIds.length > 0` per verdict | S4 |
| **Q-HF5** | new, consolidates RC1 + F3 | "Stage 1 contract integrity — if Stage 1 detects the final claim set does not preserve the user's input contract, the pipeline must NOT silently ship the report" | Binary: `preservesContract === false` → report must carry `severe` warning or be retried/blocked | S1 |
| **Q-HF6** | `xwiki:21-30` | "Confidence threshold — reports below 40% confidence must not publish" | Binary: `publishedReport → confidence ≥ 40%` | S5/UI |

**Violations known:** Job `9dab` (`rechtskräftig` case, 2026-04-10-LA §3) shipped a `preservesContract: false` report as TRUE 86 — violates Q-HF5.

---

### Layer 2 — Stage 1: Claim extraction quality

| ID | Prior IDs | Definition | Measurement | Stage |
|---|---|---|---|---|
| **Q-S1.1** | G3, S1-1 | "Claim decomposition accuracy — multi-event inputs produce multiple claims; all distinct events detected as separate AtomicClaims" | For each known multi-event test input: count of distinct AtomicClaims ≥ count of distinct events | S1 |
| **Q-S1.2** | S1-2 | "Facet stability — repeated runs choose similar core facets/aspects" | Across N runs of same input: Jaccard overlap of facet set ≥ threshold | S1 |
| **Q-S1.3** | S1-3, 2026-04-08 Issue 2 | "Predicate-strength preservation — strong user predicates remain strong through extraction; truth-condition-bearing modifiers must not be dropped or isolated" | For each input in the truth-condition test set: verify the anchor word is preserved inside the primary claim, not split into a side-claim | S1 |
| **Q-S1.4** | S1-4 | "`claimDirection` correctness — direction is set relative to the user's thesis, not relative to reality/consensus" | Regression test set; binary per claim | S1 |
| **Q-S1.5** | S1-5 | "Specificity and non-duplication — claims are concrete, non-overlapping, useful; not vague or duplicative" | `specificityScore >= 0.6` AND pairwise similarity < threshold | S1 |
| **Q-S1.6** | G6, B2 | "Opinion/political contestation immunity — baseless political challenges must NOT produce claims or adjust verdicts" | Count `verdictAdjusted=true` events triggered by political opinion challenges → must be zero | S1/S4 |
| **Q-S1.7** | new, consolidates F1, F7, RC2 | "Prompt rule coherence — Stage 1 prompt rules must not structurally compete with each other on any single input class" | Audit artefact: no pair of rules in `CLAIM_EXTRACTION_PASS2` can both fire on the same input with opposite outcomes | S1 |

**Violations known:**
- Swiss `rechtskräftig` case: Pass 2 has two competing rules (preserve truth-condition modifier vs. never extract legality claims) → model externalizes the modifier to a side-claim, which Gate 1 strips, which breaks the contract. Source: 2026-04-10-LLM F1, F7.
- Bundesrat chronology: 79pp verdict spread traced to inconsistent modifier preservation (1/3 retention rate). Source: 2026-04-08 Issue 2.

---

### Layer 3 — Stage 2/3: Evidence and boundary quality

| ID | Prior IDs | Definition | Measurement | Stage |
|---|---|---|---|---|
| **Q-EV1** | EV-1 | "Claim coverage — important atomic claims have mapped evidence" | For each `isCentral=true` claim: `evidenceItems.length >= k` | S2 |
| **Q-EV2** | EV-2 | "Boundary coverage plausibility — boundaries with evidence show meaningful claim coverage in matrix" | Coverage matrix: no row with `≥1` evidence and zero cell count > 0 | S3 |
| **Q-EV3** | G2, B3, EV-3 | "Boundary coherence — boundary names/facets are meaningful and non-generic; match evidence content" | Human/LLM rubric: institution/methodology-specific names; count ≥2 non-generic | S3 |
| **Q-EV4** | G4, B7, EV-4 | "Relevance / contamination control — evidence is on-topic and jurisdictionally relevant" | Zero evidence items flagged as foreign/off-topic by the relevance stage | S2 |
| **Q-EV5** | EV-5, `xwiki:17-19` | "Source diversity — multiple plausible source types contribute when warranted; no narrow/implausible mix" | Source-type histogram shows ≥3 distinct types when corpus allows | S2 |
| **Q-EV6** | new, consolidates RC-A + RC-B + Issue 4 | "Per-claim evidence sufficiency independent of seeding — Stage 2 must meaningfully research each claim before sufficiency is declared, regardless of seeded evidence from Stage 1" | For each claim: `researchedEvidenceCount > 0` before sufficiency gate fires | S2 |
| **Q-EV7** | RC-C, Issue 4 | "Boundary concentration ceiling — no single boundary may absorb more than X% of total evidence unless justified by input" | `max(boundaryShare) ≤ threshold` (current observed ceiling 0.82, target TBD) | S3 |
| **Q-EV8** | Q-HF4, `xwiki:17-19` | "Source track record — sources evaluated by historical accuracy and correction policies; independent of conflicts of interest" | SR database lookup per source; SR weight applied to evidence influence | S2 |

**Violations known:**
- Plastik AC_01: `41 seeded / 0 researched` — sufficiency gate tripped before Stage 2 even ran. Source: 2026-04-06 §190-196.
- Plastik Phase B: 1 boundary holds 135 items, share = 1.00. Bolsonaro Phase B: 0.82 max share. Source: 2026-04-08 §145-149.

---

### Layer 4 — Stage 4/5: Verdict quality

| ID | Prior IDs | Definition | Measurement | Stage |
|---|---|---|---|---|
| **Q-V1** | V-1 | "Verdict direction plausibility — verdict direction matches evidence balance" | Per verdict: if >60% of cited evidence supports X, verdict direction must be X (or explicitly noted as contested) | S4 |
| **Q-V2** | G5, B6, V-2, `xwiki:21-30` | "Confidence plausibility — confidence matches evidence quality and stability; not inflated or deflated" | Confidence tier (HIGH/MEDIUM/LOW) correlates with evidence count, diversity, and agreement score | S4/S5 |
| **Q-V3** | V-3 | "Mixed-case restraint — mixed/uncertain cases do not become overconfident" | For inputs with evidence spread > threshold: confidence ≤ MEDIUM | S4 |
| **Q-V4** | V-4 | "Strong-case decisiveness — strongly evidenced cases allowed to land strongly (not artificially flattened)" | For inputs with high-agreement, high-diversity evidence: confidence = HIGH | S4 |
| **Q-V5** | V-5 | "Sanity-check behavior — sanity checks fire rarely and only on real inconsistencies" | Sanity-check firing rate ≤ 5% of runs; zero false-positive rescues on control set | S4/S5 |
| **Q-V6** | new, consolidates Issue 3 | "Truth-vs-misleadingness separation — factually true claims must not be scored FALSE because framing is misleading" | Regression set: known TRUE-but-misleading inputs; verdict must not be FALSE | S4 |
| **Q-V7** | new, consolidates RC: evidence-weighted contestation (AGENTS.md) | "Evidence-backed contestation only — only evidence-backed counter-arguments may reduce truth % or confidence. Unsubstantiated opinion challenges classified as `doubted`, must not move the verdict." | Count of verdict-moving challenges where `factualBasis=opinion` → must be zero | S4 |

**Violations known:**
- Bundesrat chronology: true claim scored FALSE 14 because framing is misleading. Source: 2026-04-08 Issue 3.

---

### Layer 5 — Stability (same-input variance)

| ID | Prior IDs | Definition | Measurement | Stage |
|---|---|---|---|---|
| **Q-ST1** | G1, ST-1 | "Truth spread — small spread across repeated identical runs" | ≤15pp = good, ≤20pp = acceptable across N≥4 runs | All |
| **Q-ST2** | ST-2 | "Confidence spread — confidence remains in plausible band across runs" | Confidence tier changes ≤ once across N runs | All |
| **Q-ST3** | ST-3 | "Claim-set similarity — repeated runs produce similar claims in wording, count, and direction" | Pairwise claim-set Jaccard ≥ threshold across N runs | S1 |
| **Q-ST4** | ST-4 | "Evidence-mix similarity — evidence mix differs modestly and remains directionally consistent" | Evidence-type and direction-ratio deltas ≤ threshold across N runs | S2/S3 |
| **Q-ST5** | NEUTRALITY-1, Issue 1 | "Cross-linguistic neutrality — same semantic input in different languages yields directionally equivalent verdicts" | Max cross-language spread on test set ≤ threshold (current observed 58pp) | All |
| **Q-ST6** | 2026-03-25 residual | "Stage 1 classification stability — same input must not oscillate between `single_atomic_claim` and `ambiguous_single_claim` classifications across runs" | Classification consistency ≥ 90% across N runs | S1 |

**Violations known:**
- Swiss `rechtskräftig`: 89pp spread (11 vs 100). Source: 2026-04-10-LLM F8.
- Plastik DE/EN/FR: 58pp spread. Source: 2026-04-08 Issue 1.
- Bolsonaro: 41pp Stage 4 debate variance. Source: 2026-04-10-LLM F8.
- SRG SSR family: 33pp within-input spread from S1 classification oscillation. Source: 2026-04-08 Issue 5.

---

### Layer 6 — Presentation, trust, and architecture hygiene

These are not stage outputs per se — they are qualities of the final artefact and the system that produced it.

| ID | Prior IDs | Definition | Measurement | Stage |
|---|---|---|---|---|
| **Q-PT1** | PT-1 | "Warning honesty — warnings reflect real impact, not misleading" | AGENTS.md severity test applied to every warning type | UI |
| **Q-PT2** | PT-2 | "UI consistency — jobs list and detail page tell coherent story" | Visual inspection per job: verdict / progress / status aligned | UI |
| **Q-PT3** | PT-3 | "Report substance — report substantial enough to inspect and audit" | Word count / evidence count / claim count thresholds | UI |
| **Q-PT4** | new, consolidates F5, RC4 | "Coverage matrix semantic fidelity — matrix cells, row totals, and column totals must use consistent verdict semantics; coloring must be reproducible from a single source of truth per cell" | Audit: cell, row-total, column-total, and corner-cell all derive from the same verdict-assignment function; no `dominantVerdict()` noisiest-cell fallback | UI/S5 |
| **Q-AH1** | new, consolidates F4, F6, AGENTS.md LLM Intelligence mandate | "Deterministic semantic adjudication freedom — the critical path (extraction, classification, direction, dominance, verdict adjustment) must not contain deterministic functions that decide what text means" | Grep audit: zero hits for hemisphere checks, substring anchor matching, plausibility overrides, or arithmetic verdict rescue functions in the listed modules | All |
| **Q-AH2** | RC5 | "Architecture hygiene — no dead config, no deprecated-but-still-emitting fields, no retired-concept references in current code paths" | Grep audit for known dead symbols (`dominanceAssessment`, `dominance_adjusted`, etc.) → zero hits in live code | All |

**Violations known:**
- Coverage matrix mixes `boundaryFindings` (Stage 4 local), `dominantVerdict()` (noisiest cell), and claim/article verdicts on the same rendering. Source: 2026-04-10-LLM F5.
- `isVerdictDirectionPlausible` at `verdict-stage.ts:1561` rescues direction-validation failures using arithmetic (hemisphere check, 15pp tolerance). Source: 2026-04-10-LLM F6.
- `evaluateClaimContractValidation` at `claim-extraction-stage.ts:1832` substring-matches LLM anchor preservation. Source: 2026-04-10-LLM F4.

---

## Cross-cutting constraints (not criteria per se — gate all criteria)

These apply to every criterion above:

- **Generic by design** — no hardcoded keywords, topic names, or domain-specific conditions (AGENTS.md §Fundamental Rules).
- **Multilingual robustness** — all criteria must be measurable across languages, not just English (AGENTS.md §Multilingual Robustness).
- **Input neutrality** — "Was X fair?" and "X was fair" must yield equivalent results within ≤4% (AGENTS.md §Input Neutrality).
- **LLM Intelligence mandate** — analytical decisions must be LLM-driven, not heuristic (AGENTS.md §LLM Intelligence).
- **No stage skipping** — Understand → Research → Verdict all required (AGENTS.md §Pipeline Integrity).

---

## Summary table — 33 canonical criteria

| Layer | IDs | Count |
|---|---|---|
| Hard failure floors | Q-HF1..6 | 6 |
| Stage 1 claim | Q-S1.1..7 | 7 |
| Stage 2/3 evidence | Q-EV1..8 | 8 |
| Stage 4/5 verdict | Q-V1..7 | 7 |
| Stability | Q-ST1..6 | 6 |
| Presentation + hygiene | Q-PT1..4, Q-AH1..2 | 6 |
| **Total** | | **40** |

(The 43-criterion total from prior scorecards collapses to 40 here because 3 Bolsonaro-specific criteria — B4, B5, B6 — were retired in the 2026-03-24 generic pass.)

---

## What's explicitly EXCLUDED from this catalogue (and why)

- **B1 (STF/TSE separation), B5 (27yr sentence), B6 (confidence ≥65% on Bolsonaro)** — these are Bolsonaro-specific factoid checks. They belong in a regression suite, not a quality criteria catalogue.
- **Raw truth-percentage targets (e.g., "~72%")** — these presuppose a ground truth the system is supposed to discover. Ground-truth targets go into the fixture set, not the criteria.
- **Explicit budget/speed criteria** — cost and latency are separate axes, not quality. Tracked in `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`.
- **Accepted limitations** — Plastik within-language 59pp variance accepted under EVD-1 amber band (2026-04-08 Issue 6). Still tracked as `Q-ST1` but with an acknowledged amber floor.

---

## Open for user prioritization (Gate G1)

The next step is Gate G1 — the user picks the top 5–8 criteria to optimize for first. The Master Plan's Phase 2 will then bisect history against those specific criteria.

See `Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md` §7 for the full list of prioritization questions that will go to the user with this catalogue.

---

## Phase 2 Gate G2 update (2026-04-11)

The user deferred full G1 and set a partial "mini-G1" priority for Phase 2 scope. The Phase 2 priority surface is **now structured as 2 global criteria + 21 per-input acceptance checks**, not a flat list of 7. See [`2026-04-11_Phase2_Gate_G2_Replay_Plan.md`](2026-04-11_Phase2_Gate_G2_Replay_Plan.md) §Priority criteria and [`2026-04-11_Phase2_Per_Input_Expectations.md`](2026-04-11_Phase2_Per_Input_Expectations.md) for the full per-input breakdown.

### Reclassifications from this catalogue

- **Q-ST5 (Cross-linguistic neutrality)** — **reclassified from priority to data-only** for Phase 2 per user directive 2026-04-11. Cross-language consistency will be addressed later via a dual-language analysis pattern (always run analysis in input-language + EN), which is an architectural change outside the scope of historical baseline bisection. Q-ST5 remains in the catalogue as a criterion; the R3 vs R3b delta is still captured in replay data as a reference measurement, but it is not a Phase 2 pass/fail signal.
- **Q-V1 (Verdict direction plausibility)** — **absorbed into per-input verdict-range criteria** (R2.1: 11–31, R3.1: 40–60, R3b.1: 30–50, R4.1: 68–80). A per-input verdict-range check IS a Q-V1 test, just made input-specific. The standalone Q-V1 criterion remains in the catalogue.
- **Q-S1.1 / Q-S1.2 / Q-S1.3 / Q-S1.5 (Stage-1 input-specific signals)** — **superseded in Phase 2 by concrete per-input criteria** (e.g., R2.2 "`rechtskräftig` must appear verbatim in the primary claim text", R4.2 "≥2 claims distinguishing STF from TSE"). The generic Stage-1 signals remain in the catalogue as top-level criteria; the per-input version is a narrower, directly measurable specialization.

### Phase 2 priority surface

- **Global (2)**: Q-HF5 (Stage 1 contract integrity), Q-ST1 (Truth spread across same-input runs)
- **Per-input (21 checks)**: R2.1–R2.4, R3.1–R3.4, R3b.1–R3b.4, R4.1–R4.7 (see Gate G2 Rev 4 plan §Priority criteria for full list)

Phase 3 will return here and write back any criterion-level findings from the replay data.

---

**End of catalogue. Draft v0.1 — updated 2026-04-11 for Phase 2 Gate G2 scope.**

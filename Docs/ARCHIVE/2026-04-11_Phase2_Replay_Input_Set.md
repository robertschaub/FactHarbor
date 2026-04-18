---
title: Phase 2 Replay Input Set — User Selected
date: 2026-04-11
parent: Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md
status: Locked — 10 inputs, awaiting candidate-commit identification and Gate G2
---

# Phase 2 Replay Input Set

Ten inputs locked by the user on 2026-04-11 for historical replay against candidate code states. Source material for the Historical Baseline Map (Master Plan §2.1.7) and the Change Impact Ledger (Master Plan §3).

## Source-of-truth policy (user directive 2026-04-11)

**Allowed historical baseline sources:**
- `Docs/TESTREPORTS/*.html` — curated historical report exports
- `test-output/validation/` — outputs of `npm run validate:run` summaries (where they exist for an input)
- The 4 job exports at repo root: `job_05be66cac8a3423993b2897424577563.json`, `job_11a8f75cb79449b69f152635eb42663a.json`, `job_9dab007670434245a3b76fa405066989.json`, `job_e392704377574efa9ced7f7a6d68a97f.json` — usable because the user explicitly chose the R2 phrasing they contain (`unterschreibt`)

**Excluded historical baseline sources (per user directive):**
- `tmp_jobs.json`, `tmp_jobs_all.json`, `tmp_job_9dab.json` (repo root)
- `.tmp/jobs/*.json` (diagnostic scratch dumps)
- Any other file named `tmp_*.json` or under `.tmp/`

Reason: the user does not want these treated as trustworthy baseline data. Any historical claim in prior drafts of this doc that was sourced from a `tmp_*` file has been removed from the tables below.

## The ten inputs (locked)

| # | Input text (canonical, locked) | Lang | Historical baseline (allowed sources only) | Primary dimensions tested |
|---|---|---|---|---|
| **R1** | *Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz* | DE | **None** — fresh, no data in allowed sources. Forward-only measurement across commits. | Q-EV4 (jurisdiction-specific retrieval), Q-V2 (confidence calibration on statistical claim), numeric-claim handling |
| **R2** | *Der Bundesrat **unterschreibt** den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben* | DE | **Yes (4 runs)** — the 4 repo-root job exports, dated 2026-04-08 → 2026-04-10. Observed verdicts: LEANING-FALSE 32 / LEANING-TRUE 65 / TRUE 86 / TRUE 93. **Spread 61pp across 4 runs**, with two of them 65 minutes apart on the same day landing opposite-side (32 vs 86). Strongest backward anchor in the set for Stage 1 instability. | Q-S1.3 (truth-condition modifier `rechtskräftig`), Q-S1.7 (competing-rules structural failure), Q-HF5 (contract integrity), Q-ST1 (same-input spread) |
| **R3** | *Plastic recycling is pointless* | EN | **Yes** — exact match to `validate:run` family `plastik_en` (see `scripts/validation/validation-families.json`). Extensive multi-commit history from past validation runs in `test-output/validation/` and cited throughout the 2026-03-30 evolution analysis, 2026-04-08 complete assessment, etc. | Q-ST5 (cross-lingual pair with R3b), Q-EV5 (source diversity), Stage 2 variance regime |
| **R3b** | *Plastik recycling bringt nichts* | DE | **Yes (partial)** — referenced in TESTREPORTS as `Plastik_Recycling_bringt_nichts_Report_20260227_141724.html`. Specific run data per validation summary files in allowed sources only. Widely cited in Plastik regression investigations (58pp cross-lingual spread claim). | Q-ST5 (cross-lingual pair with R3 — **the 58pp gap measurement**), Q-S1.3, Stage 2 variance regime |
| **R4** | *Were the various Bolsonaro trials and convictions fair and based on the rule of law?* | EN | **Yes** — exact match to `validate:run` family `bolsonaro_various`. Extensive history in validate:run summaries. | Q-S1.1 (multi-event STF/TSE decomposition), Q-EV4 (jurisdiction contamination), Q-V1 (direction), Stage 4 variance regime |
| **R5** | *Did the legal proceedings against Jair Bolsonaro regarding the attempted coup d'etat comply with Brazilian and international procedural law, and did the proceedings and the subsequent verdict meet international standards for a fair trial?* | EN | **None in allowed sources.** No validate:run family, no TESTREPORTS export. Forward-only measurement. | Q-S1.1 (bundled assertion decomposition, extreme form — ~3 embedded propositions), Q-S1.5 (specificity on nested clauses), Q-V1 (direction on complex multi-predicate input) |
| **R6** | *O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentenças proferidas foram justas* | PT | **None in allowed sources.** Forward-only measurement. Intended cross-lingual pair with R5. | Q-ST5 (cross-lingual pair with R5 on complex bundled input), Q-S1.1 (decomposition in PT), Q-HF3 (non-EN direction) |
| **R7** | *Using hydrogen for cars is more efficient than using electricity* | EN | **None in allowed sources.** (`validate:run` has `hydrogen_vs_electricity` with different phrasing — not directly comparable. A submit script [`scripts/submit-hydrogen-job.ps1`](scripts/submit-hydrogen-job.ps1) uses this exact phrasing but writes to the local DB only, not to allowed sources.) Forward-only. | Q-V1 (direction), Q-EV5 (source diversity), inverse-pair test with R8 |
| **R8** | *Using electricity for cars is more efficient than using hydrogen* | EN | **None in allowed sources.** Forward-only. Inverse of R7. | Q-V1 (complementarity — inverse pair with R7 directly tests `isVerdictDirectionPlausible`), direction rescue |
| **R9** | *Die SRG SSR und ihre Unternehmenseinheiten setzen moderne Fact-Checking-Methoden und -Werkzeuge ein und betreiben Fact-Checking effizient und wirksam* | DE | **Structurally investigated, no direct run data in allowed sources.** Cited in 3 March 29 decomposition-debate handoffs (`2026-03-29_b8e6_8640_*`, `2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md`) as a bundled-assertion stress case. `validate:run` has a shorter variant (`srg_compound`: *"Das SRG SSR Medienangebot ist effizient und wirksam"*) but the user's phrasing is more complex (4 embedded predicates: modern methods, modern tools, efficient, effective). Forward-only for exact phrasing; structural comparison possible against `srg_compound` family history. | Q-S1.1 (4-predicate decomposition, extreme case), Q-ST6 (classification stability), Q-S1.5 (specificity), Stage 1 variance regime |

## Coverage audit (final)

| Dimension | Covered by |
|---|---|
| Stage 1 variance regime | **R2** (modifier preservation), **R5** (bundled 3-predicate EN), **R6** (bundled PT), **R9** (bundled 4-predicate DE) |
| Stage 2 variance regime | **R3** (plastik_en), **R3b** (plastik_de), **R1** (Swiss asylum retrieval) |
| Stage 4 variance regime | **R4** (Bolsonaro short), **R5/R6** (Bolsonaro bundled EN/PT) |
| Cross-linguistic consistency | **R3 ↔ R3b** (Plastik EN/DE — the 58pp cross-lang gap), **R5 ↔ R6** (Bolsonaro bundled EN/PT) |
| Inverse-pair direction test | **R7 ↔ R8** (hydrogen inverse — the direct test of `isVerdictDirectionPlausible`) |
| Multi-event decomposition | **R4** (STF/TSE), **R5/R6** (procedural + constitutional + verdict), **R9** (4 predicates) |
| Truth-condition modifier preservation | **R2** (rechtskräftig) |
| Numeric / statistical claim verification | **R1** (235 000 asylum) |
| Contract integrity (Q-HF5) | **R2** |
| Cross-linguistic Plastik gap (58pp) | **R3 + R3b** — now directly measurable |
| Classification oscillation (`srg_compound` failure mode) | **R9** (bundled variant — structurally equivalent) |

**Coverage is complete across all major variance regimes and all criteria the April 10 handoffs diagnose.**

## Backward-comparable inputs (allowed sources only)

| Input | Backward source | Strength |
|---|---|---|
| **R2** | 4 repo-root job JSONs (`unterschreibt` present tense) | **Strong** — 4 runs over 3 days, 61pp spread, live variance demonstration |
| **R3** | `validate:run` family `plastik_en` historical summaries | **Strong** — canonical family, many runs |
| **R3b** | TESTREPORTS `Plastik_Recycling_bringt_nichts_Report_20260227_141724.html` + any `validate:run` coverage | **Medium** — 1 archival TESTREPORT; validate:run coverage uncertain (needs check) |
| **R4** | `validate:run` family `bolsonaro_various` historical summaries | **Strong** — canonical family |
| **R9** | Structural comparison against `srg_compound` validate:run family | **Medium** — different phrasing but same failure mode |
| R1, R5, R6, R7, R8 | **None** — forward-only from replay runs | — |

**5 of 10 inputs have backward anchors in allowed sources.** The other 5 will be measured forward-only — we generate their baseline data from the replay runs themselves.

## What comes next in Phase 2

1. **Validate baseline source depth**. Before Gate G2, confirm that `test-output/validation/` actually contains per-commit run data for the `plastik_en`, `plastik_de` (if it exists as a family), `bolsonaro_various` families — not just one snapshot. This determines whether backward comparison is viable for R3/R4.
2. **Identify candidate historical commits** per Master Plan §2.1.2. Strategy:
   - List all code-touching commits to `apps/web/src/lib/analyzer/`, `apps/web/prompts/`, `apps/web/configs/` since `a40b3a3f` (2026-02-16)
   - Bucket into waves (weekly or per diagnostic phase: pre-Phase2, post-QLT1, post-UPQ1 Phase B, current HEAD)
   - Exclude docs-only and deploy-only commits from candidate list
   - Propose 3–5 candidate code states covering the known quality inflection points
3. **Propose run count per input** with cost estimate:
   - Unstable inputs (R2, R3, R3b, R9) → 3 runs each per commit
   - Stable inputs (R1, R4, R5, R6, R7, R8) → 2 runs each per commit
4. **Gate G2**: present the full replay plan (candidate commits × inputs × run count × cost estimate) for user approval before any LLM-real runs are submitted.

---

**End of replay set document. Locked.**

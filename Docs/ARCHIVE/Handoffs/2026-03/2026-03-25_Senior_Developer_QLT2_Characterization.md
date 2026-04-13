# QLT-2 Residual Broad-Evaluative Instability Characterization

**Date:** 2026-03-25
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Stack:** Commit `49700231` (QLT-1 inclusive)
**Runner config:** `FH_RUNNER_MAX_CONCURRENCY=3`, Sonnet lane limit `2`

---

## 1. Executive Summary

QLT-2 ran 13 jobs (5 Plastik EN, 5 Muslims, 3 Flat Earth control) to determine whether the remaining broad-evaluative instability is still primarily Stage-1 driven or has shifted elsewhere.

**Key finding: The root-cause situation is now split across families.**

| Family | Article spread | Threshold (≤20pp) | Stage 1 stable? | Primary remaining driver |
|--------|---------------|-------------------|-----------------|--------------------------|
| **Plastik EN** | **30pp** (21–51) | EXCEEDS | **Yes** — facets, count, predicate, direction all stable | **Stage 2/4** (evidence mix + verdict variance) |
| **Muslims** | **27pp** (19–46) | EXCEEDS | **No** — count, direction, and facets all vary | **Stage 1** (decomposition instability) |
| **Flat Earth** | **2pp** (0–2) | PASS | Yes | None — clean control |

**The pre-QLT-2 assumption — that residual instability is still mainly Stage-1 facet/decomposition drift — is correct for Muslims but no longer correct for Plastik EN.** QLT-1 succeeded in stabilizing Stage 1 for Plastik EN. The remaining Plastik EN variance now comes from downstream stages operating on the same stable claims but producing different verdicts based on different evidence mixes.

This means a single "Stage-1 facet-stabilization" fix is not the right next step for both families. The two families need different interventions — or the system needs to accept that some residual variance is inherent to broad evaluative topics with genuinely mixed evidence.

---

## 2. Method and Exclusions

- 13 jobs submitted through the application UI on a clean restarted stack
- All on current committed code (commit `49700231`)
- `FH_RUNNER_MAX_CONCURRENCY=3`
- Infrastructure note: jobs stalled at 33-60% during earlier attempts; resolved by service restart without code changes. Likely transient resource contention.
- **Zero exclusions** — all 13 jobs completed as SUCCEEDED with no `analysis_generation_failed`, `llm_provider_error`, or fallback `UNVERIFIED` verdicts
- Zero non-info warnings across 12/13 jobs; 1 `structural_consistency` error warning on Muslims run 2 (196c227b)

---

## 3. Run Table

### Plastik EN — `Plastic recycling is pointless` × 5

| # | Job ID | Verdict | Truth% | Conf% | Claims | Boundaries | Evidence | Sources |
|---|--------|---------|--------|-------|--------|------------|----------|---------|
| 1 | `a5c5b0bb` | MOSTLY-FALSE | 21 | 70 | 3 | 4 | 113 | 47 |
| 2 | `0c93506c` | MIXED | 48 | 45 | 3 | 6 | 142 | 50 |
| 3 | `a63c3ba2` | MIXED | 51 | 69 | 3 | 5 | 159 | 56 |
| 4 | `bbc606cf` | MIXED | 47 | 71 | 3 | 6 | 137 | 46 |
| 5 | `ac628f40` | LEANING-FALSE | 36 | 63 | 3 | 6 | 144 | 54 |

**Spread: 30pp (21–51). Mean: 40.6%. Median: 47%.**

### Muslims — `Muslims are more violent than Christians.` × 5

| # | Job ID | Verdict | Truth% | Conf% | Claims | Boundaries | Evidence | Sources |
|---|--------|---------|--------|-------|--------|------------|----------|---------|
| 1 | `5e4063ad` | MOSTLY-FALSE | 21 | 61 | 2 | 6 | 61 | 31 |
| 2 | `196c227b` | LEANING-FALSE | 42 | 62 | 3 | 6 | 64 | 33 |
| 3 | `bd088087` | MOSTLY-FALSE | 28 | 59 | 3 | 6 | 61 | 41 |
| 4 | `8a17c3c6` | MIXED | 46 | 60 | 3 | 6 | 82 | 43 |
| 5 | `7cdbead4` | MOSTLY-FALSE | 19 | 60 | 3 | 6 | 118 | 42 |

**Spread: 27pp (19–46). Mean: 31.2%. Median: 28%.**

### Flat Earth control — `Ist die Erde flach?` × 3

| # | Job ID | Verdict | Truth% | Conf% | Claims | Boundaries | Evidence | Sources |
|---|--------|---------|--------|-------|--------|------------|----------|---------|
| 1 | `22ab5a18` | FALSE | 2 | 91 | 2 | 5 | 92 | 33 |
| 2 | `6059c1c3` | FALSE | 1 | 94 | 2 | 6 | 56 | 32 |
| 3 | `0f72a2c4` | FALSE | 0 | 96 | 2 | 6 | 33 | 23 |

**Spread: 2pp (0–2). Mean: 1%. All FALSE. Clean control.**

---

## 4. Plastik EN Analysis

### 4a. Stage 1 — Claim Decomposition (STABLE)

All 5 runs produced **exactly 3 claims**, all `supports_thesis`, all preserving the "pointless" predicate. The facet categories are consistent:

| Run | AC_01 (Environmental) | AC_02 (Economic) | AC_03 (Practical) |
|-----|----------------------|-------------------|-------------------|
| 1 | environmental impact and waste diversion | economic viability and profitability | practical feasibility and actual conversion |
| 2 | environmental effectiveness | economic viability | operational effectiveness |
| 3 | environmental effectiveness | economic viability | technical and systemic feasibility |
| 4 | environmental effectiveness | economic viability | practical feasibility at scale |
| 5 | environmental effectiveness | material recovery outcomes | economic viability |

**Stage 1 is now stable for Plastik EN:**
- Claim count: 3/3/3/3/3 ✅
- Facet categories: environmental/economic/practical in all 5 ✅
- Predicate strength: "pointless" preserved in all claims ✅
- claimDirection: `supports_thesis` in all 15 claims ✅
- Minor: Run 5 swapped economic ↔ practical ordering, but same semantic content

This is a material improvement from the pre-QLT-1 state (where "bringt nichts" → "unwirksam" softening drove a 32pp outlier) and confirms QLT-1 is working for English inputs.

### 4b. Stage 2 — Evidence Variation (NOW THE DOMINANT DRIVER)

Despite identical Stage 1 claims, the evidence mixes differ substantially:

| Run | Evidence | Sources | Max boundary concentration |
|-----|----------|---------|--------------------------|
| 1 | 113 | 47 | 92% (CB_32: LCA methodology) |
| 2 | 142 | 50 | 44% (CB_20: literature review) |
| 3 | 159 | 56 | 91% (CB_28: cost-efficiency analysis) |
| 4 | 137 | 46 | 85% (CB_06: employment analysis) |
| 5 | 144 | 54 | 76% (CB_18: legislative framework) |

Search queries are similar across runs (same preliminary topics), but the sources returned differ — different web search results lead to different evidence mixes, different boundary clustering, and different mega-clusters.

Boundary concentration is high in all runs (44–92%), but the **dominant boundary topic differs** in every run. This structural variation directly shapes which evidence informs each claim's verdict.

### 4c. Stage 4/5 — Per-Claim Verdict Comparison

| Facet | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Range | Mean |
|-------|-------|-------|-------|-------|-------|-------|------|
| Environmental | 15% | 62% | 62% | 42% | 15% | **47pp** | 39% |
| Economic | 35% | 48% | 54% | 62% | 55% | **27pp** | 51% |
| Practical | 18% | 38% | 35% | 38% | 38% | **20pp** | 33% |
| **Article** | **21** | **48** | **51** | **47** | **36** | **30pp** | **41%** |

**Confidence by claim:**

| Facet | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Range | Mean |
|-------|-------|-------|-------|-------|-------|-------|------|
| Environmental | 85% | 28% | 75% | 78% | 61% | **57pp** | 65% |
| Economic | 61% | 59% | 68% | 68% | 78% | **19pp** | 67% |
| Practical | 50% | 43% | 62% | 63% | 27% | **36pp** | 49% |
| **Article** | **70** | **45** | **69** | **71** | **63** | **26pp** | **64%** |

**The environmental claim is the dominant variance driver** — 47pp truth range, 57pp confidence range. The economic and practical claims are substantially more stable (20-27pp truth range).

Run 2 (`0c93506c`) has an anomalously low confidence on the environmental claim (28%, UNVERIFIED) while showing 62% truth — the evidence mix for this run may have been particularly thin or contradictory on environmental effectiveness.

### 4d. Comparison with QLT-1 EN Runs

| Metric | QLT-1 EN (3 runs) | QLT-2 EN (5 runs) | Change |
|--------|-------------------|-------------------|--------|
| Article truth range | 16pp (44–60) | 30pp (21–51) | Wider with more runs |
| Article truth mean | 50.2% | 40.6% | Lower mean |
| Environmental claim range | 37pp (28–65) | 47pp (15–62) | Similar, wider tails |
| Facet stability | Stable | Stable | QLT-1 holding |
| Predicate preservation | Preserved | Preserved | QLT-1 holding |

The environmental claim variance (37pp → 47pp) is structurally similar. More runs expose wider tails, but the pattern is the same: Stage 1 is stable, environmental verdict swings based on evidence mix.

### 4e. Plastik EN Decision Against Thresholds

- Article-level spread: **30pp > 20pp** → EXCEEDS
- Dominant per-claim spread (environmental): **47pp > 30pp** → EXCEEDS
- **Root cause is NOT Stage 1** — facets, count, predicate, direction all stable
- A Stage-1 facet-stabilization refinement would NOT reduce this spread

---

## 5. Muslims-Family Analysis

### 5a. Stage 1 — Claim Decomposition (UNSTABLE)

| Run | Count | Claims | Directions |
|-----|-------|--------|------------|
| 1 | **2** | criminal violence, persecution targeting | S, **C** |
| 2 | 3 | criminal violence, extremist attacks, armed conflict | S, S, S |
| 3 | 3 | criminal violence, terrorism, domestic violence | S, S, S |
| 4 | 3 | criminal violence, terrorism, national armed conflict | S, S, S |
| 5 | 3 | criminal violence, religious violence, media coverage | S, S, **X** |

**Stage 1 is unstable for Muslims:**
- Claim count: 2/3/3/3/3 — varies ❌
- claimDirection: 3 different patterns (all-supports / has-contradicts / has-contextual) ❌
- Facet categories: only "criminal violence" appears in all 5 runs. Second/third claims vary widely:
  - persecution targeting (Run 1)
  - extremist attacks + armed conflict (Run 2)
  - terrorism + domestic violence (Run 3)
  - terrorism + national armed conflict (Run 4)
  - religious violence + media coverage (Run 5)
- Predicate preservation: "more violent" preserved in criminal claims but not in derivative facets ⚠️

**Three distinct Stage-1 failure modes:**

1. **Claim count variation** (2 vs 3): Run 1 extracted only 2 claims, merging or dropping a facet
2. **Direction inversion**: Run 1's AC_02 (`contradicts_thesis`: "Muslims are targeted for persecution") introduces a counter-narrative claim that pulls the article truth down
3. **Facet category instability**: The second and third facets are different in every run — domestic violence, armed conflict, terrorism, media coverage, and persecution targeting are all valid facets but the selection is not deterministic

### 5b. Stage 2 — Evidence Variation

| Run | Evidence | Sources | Boundaries |
|-----|----------|---------|------------|
| 1 | 61 | 31 | 6 |
| 2 | 64 | 33 | 6 |
| 3 | 61 | 41 | 6 |
| 4 | 82 | 43 | 6 |
| 5 | 118 | 42 | 6 |

Evidence counts vary (61–118), partly driven by different claim decompositions generating different search queries. Boundary count is stable at 6. Run 5 has notably more evidence (118), likely because the "media coverage" facet attracted a different evidence pool.

### 5c. Stage 4/5 — Per-Claim Verdict Comparison

Direct cross-run comparison is difficult because the facets differ. Focusing on the one common facet:

**Criminal violence claim (present in all 5 runs):**

| Run | Truth% | Conf% | Verdict |
|-----|--------|-------|---------|
| 1 | 15 | 60 | MOSTLY-FALSE |
| 2 | 18 | 68 | MOSTLY-FALSE |
| 3 | 18 | 65 | MOSTLY-FALSE |
| 4 | 22 | 59 | MOSTLY-FALSE |
| 5 | 15 | 68 | MOSTLY-FALSE |

**Range: 7pp (15–22). This claim is stable.** When the same facet appears, the verdict converges.

The article-level variance (27pp) is therefore driven by the **differing second and third claims**, not by instability on the common criminal-violence facet.

| Run | Non-criminal claims | Effect on article |
|-----|--------------------|--------------------|
| 1 | persecution targeting (C, T=72%) | Pulls article down via contradicts_thesis weighting → T=21% |
| 2 | extremism (T=65%), conflict (T=45%) | Higher-truth supporting claims → T=42% |
| 3 | terrorism (T=58%), DV (T=8%) | DV claim pulls down → T=28% |
| 4 | terrorism (T=62%), conflict (T=58%) | Both high → T=46% |
| 5 | religious violence (T=25%), media (X, T=87%) | Contextual claim downweighted → T=19% |

### 5d. Muslims Decision Against Thresholds

- Article-level spread: **27pp > 20pp** → EXCEEDS
- Root cause: **Stage 1 decomposition instability** — claim count, direction, and facet categories all vary
- The criminal violence facet is stable when it appears (7pp range)
- A Stage-1 facet-stabilization refinement **is justified** for this family

---

## 6. Flat-Earth Control Analysis

### 6a. Stage 1

| Run | Claims | Directions |
|-----|--------|------------|
| 1 | Die Erde hat kugelförmige Gestalt / sphärische Krümmung | C, C |
| 2 | Die Erde hat flache Form / physikalisch flach | S, S |
| 3 | Die Erde hat flache Form / wahrgenommen als flach | S, X |

Claim count stable (2/2/2). Direction varies (C/S/X patterns differ) but this does not affect the outcome — all 3 converge to FALSE with T ≤ 2%.

### 6b. Stage 4/5

| Run | Truth% | Conf% | Verdict |
|-----|--------|-------|---------|
| 1 | 2 | 91 | FALSE |
| 2 | 1 | 94 | FALSE |
| 3 | 0 | 96 | FALSE |

**Spread: 2pp. Confidence: 91–96%. All FALSE.** Clean control, no regression.

### 6c. Comparison with QLT-1 Flat Earth Runs

| Metric | QLT-1 (2 runs) | QLT-2 (3 runs) |
|--------|----------------|-----------------|
| Spread | 31pp (0–31) | 2pp (0–2) |
| Verdict | FALSE + LEANING-FALSE | FALSE × 3 |

QLT-2 Flat Earth is substantially more stable than the QLT-1 runs. The previous 31pp spread (from a perceptual-dimension claim scoring 72%) did not recur. This may be natural run-to-run variation or a beneficial side effect of the QLT-1 prompt changes.

---

## 7. Cross-Family Comparison

| Dimension | Plastik EN | Muslims | Flat Earth |
|-----------|-----------|---------|------------|
| Article spread | 30pp ❌ | 27pp ❌ | 2pp ✅ |
| Dominant claim spread | 47pp ❌ | 7pp (common facet) ✅ | 2pp ✅ |
| Claim count stable | Yes ✅ | No ❌ | Yes ✅ |
| Facet categories stable | Yes ✅ | No ❌ | Yes ✅ |
| Predicate preserved | Yes ✅ | Partially ⚠️ | N/A |
| claimDirection stable | Yes ✅ | No ❌ | No (but doesn't matter) |
| Primary variance driver | Stage 2/4 | Stage 1 | None |
| Boundary concentration | High (44–92%) | Moderate | Moderate |

**The two broad-evaluative families have different dominant remaining drivers:**
- Plastik EN: Stage 1 is fixed; variance is evidence-driven
- Muslims: Stage 1 is still the primary driver

---

## 8. Root-Cause Judgment

### Updated Root-Cause Model

| Root Cause | Pre-QLT-2 Assessment | Post-QLT-2 Assessment |
|-----------|---------------------|----------------------|
| **A: Stage-1 decomposition** | Main driver for all broad-evaluative | **Split: fixed for Plastik EN, still main driver for Muslims** |
| **B: Evidence variation** | Secondary amplifier | **Now the primary driver for Plastik EN** (evidence mix differs despite stable claims) |
| **C: Topic contestability** | Possible factor | **Confirmed contributor** — Plastik EN environmental claim inherently has mixed evidence |
| **D: Boundary concentration** | Structural signal | **Confirmed** — 44-92% concentration in Plastik EN, different topics each run |
| **E: UI trust gap** | Separate | Unchanged — still separate |

### Key Insight

**The pre-QLT-2 working assumption was partially wrong.** The stabilization plan assumed residual instability was "still mainly Stage 1" with evidence variation "mostly acting as an amplifier." For Plastik EN, this is inverted: Stage 1 is stable, and evidence variation is now the primary driver. For Muslims, the assumption holds.

This means a blanket "Stage-1 facet-stabilization refinement" is the right tool for Muslims but the wrong tool for Plastik EN.

---

## 9. Recommendation

### For Muslims family: Small Stage-1 refinement IS justified

The evidence supports a narrow Stage-1 fix targeting:
1. **Claim count stability**: The LLM should consistently produce the same number of claims for the same input
2. **Direction consistency**: All claims should use `supports_thesis` for the user's thesis; counter-narrative claims should not be introduced as `contradicts_thesis` atomic claims (the evidence stage handles counter-evidence)
3. **Facet-category anchoring**: The decomposition should converge on a stable set of facets for a given input type

This would be a prompt-level change in Pass 2 extraction, similar in scope to the QLT-1 predicate-strength fix but targeting direction/count/facet consistency rather than predicate softening.

### For Plastik EN: No Stage-1 fix justified

Stage 1 is working correctly. The remaining 30pp spread is driven by:
- Different web search results returning different evidence mixes
- Different boundary clustering concentrating evidence differently
- Different verdict outcomes on the environmental claim based on which evidence was found

This is a harder problem that cannot be solved at Stage 1. Possible future approaches (not recommended immediately):
- Evidence-diversity requirements in Stage 2
- Boundary-balancing logic in Stage 3
- Verdict-calibration against evidence volume/diversity

But these are optimization-level changes, not stabilization fixes.

### For Flat Earth: No action needed

Clean control. Stable and correct.

### Overall recommendation

**One small Stage-1 refinement is justified — but only for the direction/count/facet instability pattern seen in Muslims, not for Plastik EN.**

The scope should be:
- Prompt-level change in Stage 1 Pass 2
- Target: consistent claim count, consistent `supports_thesis` direction, convergent facet selection
- Do NOT attempt to fix Plastik EN's evidence-driven variance at Stage 1 — that would be the wrong layer

---

## 10. Open Uncertainties

| Item | Uncertainty | How to Resolve |
|------|------------|----------------|
| **Plastik EN environmental swing** | Why does the environmental claim swing 47pp (15–62%) despite stable claim text? | Deeper Stage 2 forensics: compare actual sources and evidence items for this claim across runs |
| **Boundary concentration impact** | Does 80-92% evidence concentration in one boundary materially distort verdicts? | Compare runs with high vs low concentration — is truth% correlated? |
| **Muslims claim-direction fix scope** | Will fixing `contradicts_thesis` claims in Stage 1 also stabilize facet selection? | Implement the fix, re-measure |
| **Plastik EN confidence outlier** | Run 2 had 28% confidence on environmental claim (UNVERIFIED). Is this a verdict-stage issue? | Check if evidence count for this claim was anomalously low |
| **Cross-language consistency** | Plastik DE (QLT-1) showed 22pp spread vs EN's 30pp. Is this a language effect or sample size? | Run 5× DE on post-QLT-1 code for direct comparison |
| **Acceptable variance for mixed topics** | No formal policy exists. Is 27-30pp the new baseline for broad evaluative inputs? | Captain decision — define acceptable bands per input complexity tier |

---

*13 jobs, zero exclusions, full Stage 1/2/4/5 artifact comparison. All jobs on commit `49700231`.*

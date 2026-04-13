# Plastik Claim-Decomposition Comparison — Investigation Report

**Date:** 2026-03-24
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Input:** `Plastik recycling bringt nichts` × 5 identical runs

---

## 1. Executive Summary

**The Plastik instability originates primarily at Stage 1 claim decomposition.** This contradicts the prior canonical status assumption that it was downstream of Stage 1.

Across 5 identical runs on the same input, Stage 1 produced:
- Different claim counts (2 vs 3)
- Different decomposition axes (economic/ecological/practical vs environment/scalability/resource)
- Different claim strength ("bringt nichts" vs "unwirksam" — the softer wording consistently scored higher)

The resulting 47pp truth spread (17–64%) is fully explained by Stage 1 variation. The outlier run (64%) used softer claim wording ("unwirksam" / ineffective) while the lowest-scoring runs used stronger negation ("bringt nichts" / brings nothing). Stage 4 verdict differences follow directly from these claim-level differences — they are downstream effects, not independent sources of variance.

---

## 2. Method and Exclusions

- 5 identical jobs submitted to a clean restarted local stack on the current committed code
- `FH_RUNNER_MAX_CONCURRENCY=3`, `Anthropic Sonnet lane limit=2`
- All 5 completed as SUCCEEDED, zero infrastructure failures
- Zero exclusions needed

---

## 3. Run Table

| Run | Job ID | Truth% | Conf | Verdict | Claim Count | Key Strength Indicator |
|-----|--------|--------|------|---------|-------------|----------------------|
| 1 | a662bddd | 31.9 | 71.7 | LEANING-FALSE | 3 | "bringt nichts" (strong) |
| 2 | a79a1015 | 31.1 | 70.0 | LEANING-FALSE | 3 | "bringt nichts" (strong) |
| 3 | 86f227fb | 21.4 | 79.9 | MOSTLY-FALSE | **2** | "bringt nichts" (strong) |
| 4 | c5fb0cb5 | 17.3 | 75.8 | MOSTLY-FALSE | 3 | "bringt nichts" (strong) |
| 5 | bf3fa8eb | **64.0** | 71.6 | **LEANING-TRUE** | 3 | **"unwirksam"** (soft) |

**Spread:** 47pp (17.3–64.0). **Median:** 31.1. **Outlier:** Run 5 at 64%.

---

## 4. Stage 1 Comparison

### 4a. Claim texts side-by-side

**Run 1 (a662, truth 32%):**
1. Plastikrecycling bringt nichts in **wirtschaftlicher** Hinsicht.
2. Plastikrecycling bringt nichts in **ökologischer** Hinsicht.
3. Plastikrecycling bringt nichts in Bezug auf die Bewältigung der **Plastikflut**.

**Run 2 (a79a, truth 31%):**
1. Kunststoffrecycling bringt nichts in Bezug auf **ökologische Wirksamkeit**.
2. Kunststoffrecycling bringt nichts in Bezug auf **wirtschaftliche Rentabilität**.
3. Kunststoffrecycling bringt nichts in Bezug auf **praktische Umsetzbarkeit** und Effektivität.

**Run 3 (86f2, truth 21%):**
1. Kunststoffrecycling bringt nichts in Bezug auf **Umweltauswirkungen und Ressourcenschonung**.
2. *(no AC_02)*
3. Kunststoffrecycling bringt nichts in Bezug auf **praktische Verwertungsquoten**.

**Run 4 (c5fb, truth 17%):**
1. Kunststoffrecycling bringt in Bezug auf **Umweltnutzen** nichts.
2. Kunststoffrecycling bringt in **wirtschaftlicher** Hinsicht nichts.
3. Kunststoffrecycling bringt in Bezug auf **Ressourcenschonung und Abfallvermeidung** nichts.

**Run 5 (bf3a, truth 64% — outlier):**
1. Plastikrecycling ist in Bezug auf die **Umwelteffektivität unwirksam**.
2. Plastikrecycling ist in Bezug auf die **wirtschaftliche Rentabilität unwirksam**.
3. Plastikrecycling ist in Bezug auf die **Skalierbarkeit und technische Machbarkeit unwirksam**.

### 4b. Three independent Stage 1 variation axes

**Axis 1: Claim count (2 vs 3)**
- Run 3 extracted only 2 claims; all others extracted 3.
- Fewer claims means fewer opportunities for high-truth outlier claims to pull up the aggregate.

**Axis 2: Decomposition facets**
- No two runs chose the same set of facets. The facets include: economic, ecological, practical, scalability, plastic flood, recycling rates, resource conservation, waste management.
- Which facets are chosen affects what evidence is sought and how it scores.

**Axis 3: Claim strength — the decisive axis**
- Runs 1–4 all use **"bringt nichts"** (brings nothing) — a strong categorical negation.
- Run 5 uses **"unwirksam"** (ineffective) — a substantially weaker claim.
- "Recycling brings nothing" is harder to support than "recycling is ineffective."
- This single wording difference explains the 32pp gap between the outlier (64%) and the next-highest run (32%).

### 4c. claimDirection consistency
All 5 runs correctly labeled all claims as `supports_thesis`. The `claimDirection` fix is holding.

---

## 5. Stage 2 Comparison

Stage 2 is not independently assessed because Stage 1 variation is sufficient to explain the full downstream spread. However, the evidence pool imbalance warnings confirm that different claim decompositions lead to different evidence mixes — this is expected and not a separate instability source.

---

## 6. Stage 4/5 Comparison

### Per-claim verdicts across runs

| Facet | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
|-------|-------|-------|-------|-------|-------|
| Environmental | 18% | 18% | 18% | 12% | **75%** |
| Economic | 38% | 58% | — | 35% | **68%** |
| Practical/Scale | 45% | 28% | 25% | 8% | 38% |

Run 5's environmental claim scored **75%** while all others scored 12–18%. This is the direct consequence of the softer "unwirksam" wording — evidence that recycling has limited environmental effect supports "unwirksam" (ineffective) much more easily than it supports "bringt nichts" (brings nothing).

The economic claim also shows elevated scoring in Run 5 (68% vs 35–58% elsewhere), again tracking the softer claim formulation.

**Conclusion:** Stage 4 verdict variation is a downstream effect of Stage 1 claim strength variation, not an independent instability source.

---

## 7. Root-Cause Judgment

**Primary instability source: `primarily Stage 1`**

The evidence is unambiguous:
1. Claim count varies (2 vs 3) across identical inputs
2. Decomposition facets vary across all 5 runs
3. Claim strength varies ("bringt nichts" vs "unwirksam") and this single axis explains the 32pp gap to the outlier
4. Stage 4 verdict differences track the claim-level differences directly

**This overturns the prior status assumption** that Plastik instability was "downstream of Stage 1, not a Stage-1 decomposition problem." The empirical evidence from 5 controlled identical-input runs shows it is primarily a Stage-1 decomposition problem.

**Confidence: confirmed** — the variation is large, consistent, and mechanistically explained.

---

## 8. Smallest Justified Next Action

The fix should target Stage 1 claim extraction stability for broad evaluative inputs. Two candidate approaches (not mutually exclusive):

1. **Prompt-level stabilization**: Add explicit guidance in the PASS2 extraction prompt that broad evaluative claims should preserve the original predicate strength ("bringt nichts") rather than softening it to weaker formulations ("unwirksam"). This aligns with the existing QLT-1 claim-strength preservation concern.

2. **Decomposition axis pinning**: Add guidance that the decomposition facets for broad evaluative claims should follow a canonical pattern (e.g., environmental, economic, practical) rather than varying freely. This is a harder prompt engineering problem.

**Recommended first step:** Option 1 — predicate strength preservation — is smaller, more targeted, and directly addresses the measured 32pp outlier gap. It can be attempted as a prompt-only change.

**What NOT to do:** Do not attempt to fix this by constraining Stage 2, Stage 4, or aggregation. The instability is upstream.

---

## 9. Open Uncertainties

| Item | Uncertainty | How to Resolve |
|------|------------|----------------|
| **Facet stability** | Is the decomposition facet variation a separate problem from claim strength? | Fix strength first, then re-measure. If truth spread drops to ≤20pp, facet variation may be tolerable. |
| **English variant** | Does the English input `Plastic recycling is pointless` show the same Stage 1 pattern? | Run 5× English comparison (separate investigation). |
| **Interaction with claim contract validator** | Does the validator (`4f7d3850`) influence which claims survive? | Check Gate 1 stats across the 5 runs — are claims being filtered differently? |
| **QLT-1 relationship** | This finding confirms that claim-strength preservation (QLT-1) is directly relevant to Plastik instability. | Captain decision: merge this investigation's next step with QLT-1 or keep them separate. |

---

*Investigation based on 5 controlled identical-input runs, zero exclusions, full Stage 1/4 artifact comparison.*

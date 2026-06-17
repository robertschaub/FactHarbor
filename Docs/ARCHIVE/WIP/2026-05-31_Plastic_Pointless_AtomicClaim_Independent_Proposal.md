# "Plastic recycling is pointless" — Atomic-Claim Decomposition & Independent Rating Proposal

- **Date:** 2026-05-31
- **Status:** ✅ **APPLIED 2026-05-31** — Captain instruction "go with your recommendation." Centered band + confidence ceiling + reading-declaration rule written to `Docs/AGENTS/benchmark-expectations.json` and `Docs/AGENTS/Captain_Quality_Expectations.md`. Supersedes the Pipeline_V2 false-side band.
- **Author role:** Senior Architect
- **Input:** `Plastic recycling is pointless` (`plastic-en`)
- **Method:** Read-only extraction of all **108 succeeded reports** for this exact input from `apps/api/factharbor.db` (`scripts/diag/plastic-ac-extract.cjs`). No reports re-run; no LLM calls.
- **Why this exists:** "pointless" is interpretation-laden, so there is no single ground-truth verdict. This proposal fixes (1) the *best atomic-claim decomposition* and (2) *defensible per-dimension ratings grounded in evidence* — independent of both `main`'s true-side band and `Pipeline_V2`'s false-side band.

---

## 1. What atomic-claim sets the pipeline actually produced

| nClaims | #reports |
|---|---|
| 3 | **98** |
| 2 | 7 |
| 1 | 2 |
| 0 | 1 |

The pipeline overwhelmingly treats the evaluative input as a **3-dimension decomposition** (`isDimensionDecomposition: true`). Bucketing the 98 three-claim sets by theme:

| Decomposition signature | # |
|---|---|
| ECONOMIC + ENVIRONMENTAL + (practical-effectiveness) | **59** |
| ECONOMIC + ENVIRONMENTAL + QUALITY/DOWNCYCLING | 13 |
| ECONOMIC + ENVIRONMENTAL + RATE/EFFECTIVENESS | 10 |
| ECONOMIC + ENVIRONMENTAL + (env duplicate) | 8 |
| other minor | 8 |

Environmental and Economic appear in **~95%** of reports; the third slot is always a *"does it actually work?"* axis (practical feasibility / recycling rate / downcycling).

## 2. The best AC set (judgment, corroborated by frequency)

**Recommended decomposition — three dimensions, argued as a MECE partition of "pointless":**

1. **AC-ENV — Environmental:** *Recycling does not meaningfully reduce plastic pollution / emissions / virgin-resource use.*
2. **AC-ECON — Economic:** *Recycling is not economically viable (cost exceeds recovered value / unprofitable).*
3. **AC-EFF — Practical effectiveness at scale:** *Recycling does not actually work at scale — low real recycling rate, downcycling, material degradation.*

Why this set is best — not just most frequent: it is the **clean partition of the predicate "pointless"** into the three ways something can be pointless — *it doesn't help the goal* (env), *it isn't worth the cost* (econ), *it doesn't function* (effectiveness). The two stable dimensions (env, econ) plus a "does-it-work" axis cover the meaning without overlap. The 59× frequency corroborates; the partition is the reason. Reports that merged effectiveness into a vague "OVERALL-EVALUATIVE" claim or duplicated environmental are weaker and should be normalized to this triplet.

## 3. The core finding: the dispute is literal-vs-steelman, not true-vs-false

The entire `main` (true-side) vs `Pipeline_V2` (false-side) split — and the month-over-month shift in the corpus — is a single axis: **which reading of "pointless" the report assesses.**

- **Literal reading** ("recycling accomplishes *nothing*") → trivially **FALSE**, because recycling does *something* (e.g. `9fcef050`, 2026-05: AC-ENV FALSE 9/78, reasoning calls it "a strong evaluative assertion the evidence substantially contradicts"). This produces the false-side reports.
- **Steelman reading** ("recycling doesn't *meaningfully* work / isn't worth it") → **MIXED-to-TRUE**, given a stagnant ~9% global recycling rate and pervasive downcycling.

The month trend (March central truth ≈56 → April ≈51 → May ≈44) is **not noise to label "drift"** — the reasoning fields show a *deliberate hardening toward the literal reading*. That is precisely **evidence that the claim is interpretation-dependent**, which is the argument for a wide, centered band rather than either pinned extreme. (This proposal deliberately does **not** rule on whether the May literal hardening is "correct" — staying independent.)

Fact-checking norm is to assess the **reasonable** meaning of a claim, not its strawman. The reasonable reading of "recycling is pointless" is the steelman (does it meaningfully work / is it worth it), which lands **MIXED / LEANING-TRUE**.

## 4. Independent per-dimension ratings (grounded in evidence, not in the disputed prior verdicts)

Ratings below are derived from the **decisive evidence** surfaced in the pool, then checked against the 108-report means (to show they are grounded judgments that corroborate, not parroted averages — those verdicts *are* the disputed calibration).

| Dimension | Decisive evidence | Independent rating | Corpus mean (corroboration) |
|---|---|---|---|
| **AC-EFF (effectiveness/rate)** | Global recycling rate stagnant ~9% (EV_001: 37.96 Mt recycled of 400 Mt, 2022); much "recycled" plastic is downcycled or landfilled/incinerated | **LEANING-TRUE / MOSTLY-TRUE** — on pure "does it work at scale," pointless is largely true. truth ≈ **65–72** | n=11 truth≈70 (MT:7) ✓ |
| **AC-ENV (environmental)** | Recycling *does* avoid some virgin production & emissions, but the offset is small vs total production growth | **MIXED** — real but limited benefit; "pointless" is neither true nor false. truth ≈ **45–55** | n=112 truth≈49, labels split LT/LF/MF/MT ✓ |
| **AC-ECON (economic)** | Cost frequently exceeds recovered-material value for many polymers, but PET/HDPE streams are viable; market-dependent | **MIXED** — genuinely contested. truth ≈ **45–55** | n=106 truth≈50, MIXED most common ✓ |

## 5. Independent article-level verdict & proposed band

Aggregating one true-leaning dimension (effectiveness ~68) with two MIXED dimensions (~50) → article truth **≈ 52–60**, i.e. **MIXED to LEANING-TRUE**. This matches the corpus central tendency (LEANING-TRUE 40 + MIXED 28 = **63%** of 108 reports).

**Proposed `plastic-en` expectation (independent — replaces neither extreme):**

| Field | Proposed | vs main (true-side) | vs V2 (false-side, now applied) |
|---|---|---|---|
| `expectedVerdictLabels` | **`["MIXED","LEANING-TRUE"]`** (accept `LEANING-FALSE` at the edge given interpretation-dependence) | drops `MOSTLY-TRUE` | drops `FALSE`/`MOSTLY-FALSE` |
| `truthPercentageBand` | **42–65** (target 50–60) | narrower than 40–75 | replaces 10–42 |
| `confidenceBand` | **50–75 (ceiling 75)** | caps main's 85 | ~same as V2's 80 |
| Verdict-narrative rule | **must explicitly name which reading of "pointless" it assesses** | new | new |

**The real defect is calibration, not direction.** `FALSE 9/78` and `MOSTLY-TRUE 85/88` are both *overconfident* on an interpretation-dependent claim. Hence the **confidence ceiling** and the **narrative-must-name-the-reading** rule — both are generic, AGENTS.md-compatible principles (no plastic-specific hack), and would apply to any evaluative/interpretation-laden input.

## 6. Implication for the just-applied V2 band

The Captain ruled "V2 in all cases," which set `plastic-en` to the **false-side** band (10–42). This evidence-grounded analysis indicates that band is **calibrated to the literal-reading tail (May reports), not the reasonable-reading center.** Recommendation: **replace the V2 false-side plastic band with the centered band in §5.** This is the one place where "V2 in all cases" collides with the evidence; it is offered as a recommendation for the Captain to ratify (authority remains with the Captain).

## 7. Independence caveat

This proposal does not assert the May literal-reading reports are wrong, nor that the March true-leaning reports are right. It asserts that **both readings are defensible**, therefore the honest expectation is a **centered band with capped confidence and an explicit reading declaration** — not a one-sided band in either direction.

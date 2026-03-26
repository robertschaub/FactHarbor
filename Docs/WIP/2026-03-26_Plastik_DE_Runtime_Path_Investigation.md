# Plastik DE Runtime Path Investigation

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** REVIEW-READY
**Jobs:** `5c1b4633` (UNVERIFIED) vs `08a1c6d4` (MIXED)

---

## 1. Executive Summary

The existing Stage-1 safeguards **did not fail**. They worked correctly for what they check. The dimension drift that produced the UNVERIFIED outcome is **outside the scope of the current safeguards**, which focus on predicate-strength preservation and counter-narrative prohibition — not on dimension identity stability.

The claim-contract validator passed both runs without requesting a retry. Gate 1 passed all claims in both runs. The `isDimensionDecomposition` flag was correctly set. The QLT-3 facet-convergence rules were active. All of this worked.

The problem is that the facet-convergence rules guide the LLM toward "canonical, independently verifiable dimensions" but do not **specify which dimensions those are** for a given input. Two runs, both following the rules correctly, arrived at different but equally plausible third dimensions ("resource conservation" vs "practical feasibility"). The rules constrain the space but do not pin the answer.

**Final judgment: `Downstream characterization justified`**

---

## 2. What Is Proven from the Two Jobs

### Runtime artifact comparison

| Artifact | `08a1c6d4` (CONTROL) | `5c1b4633` (UNVERIFIED) |
|----------|---------------------|------------------------|
| detectedInputType | claim | claim |
| isDimensionDecomposition | True (all 3) | True (all 3) |
| inputClassification (stored) | **not stored** | **not stored** |
| Claim count | 3 | 3 |
| claimDirection | all supports_thesis | all supports_thesis |
| thesisRelevance | all direct | all direct |
| isCentral | all True | all True |
| category | all evaluative | all evaluative |
| gate1 filteredCount | 0 | 0 |
| gate1 passedOpinion | 3/3 | 3/3 |
| gate1 passedSpecificity | **3/3** | **0/3** |
| gate1 passedFidelity | 3/3 | 3/3 |
| claimContractValidation | **not stored** | **not stored** |
| Warnings (warn/error) | 0 | 1 (structural_consistency) |

### What's identical
- Claim count (3), directions (all supports_thesis), relevance (all direct), centrality (all True), isDimensionDecomposition (all True), category (all evaluative), evidence volume (~123-126), LLM calls (~49-50)

### What differs

**AC_03 dimension:**
- CONTROL: "Ressourcenschonung" (resource conservation) — groundingQuality **moderate**
- UNVERIFIED: "praktische Machbarkeit und Umsetzung" (practical feasibility) — groundingQuality **strong**

**AC_01/02 predicate preservation:**
- CONTROL: uses "unwirksam" (ineffective) — predicate softening from "bringt nichts"
- UNVERIFIED: uses "bringt nichts" — predicate preserved

**Gate 1 specificity:**
- CONTROL: all 3 passed specificity
- UNVERIFIED: **all 3 failed specificity** (but still survived because they passed opinion)

---

## 3. Stage-1 Runtime-Path Analysis

### 3a. Did the run behave as `ambiguous_single_claim`?

**Cannot be confirmed from stored data.** The `inputClassification` from Pass 2 is not stored in the result JSON — only `detectedInputType` is stored, which maps to `"claim"` for both `single_atomic_claim` and `ambiguous_single_claim`.

However, we can infer: `isDimensionDecomposition` was set to `True` for all claims in both runs. The code at line 343-346 sets this flag when:
- `inputClassification === "ambiguous_single_claim"`, OR
- `inputClassification === "single_atomic_claim"` AND claims > 1 AND all are high-centrality + supports_thesis (fallback heuristic)

Both conditions would result in `isDimensionDecomposition: true`. We cannot distinguish which path was taken.

**Diagnostic gap: `inputClassification` is not persisted.** This is the first recommended fix — store it in the understanding object for future forensics.

### 3b. Did claim-contract validation pass or retry?

**Cannot be confirmed from stored data.** The `claimContractValidation` result is not stored in the result JSON. The code at lines 254-312 runs the validator, logs the result to console, and potentially retries Pass 2 — but none of this is persisted in the job output.

From the indirect evidence:
- Both runs produced 3 claims with consistent structural properties
- The UNVERIFIED run's AC_01/AC_02 preserve the predicate "bringt nichts" (which the contract validator would consider correct)
- The CONTROL run's AC_01/AC_02 use "unwirksam" (proxy drift) — if the contract validator ran, it **should have flagged this but apparently did not**

**Diagnostic gap: Claim-contract validation result is not persisted.** This is the second recommended fix.

### 3c. Did Gate 1 preserve the intended decomposition?

**Yes.** Gate 1 filtered zero claims in both runs. In the UNVERIFIED run, all 3 claims failed specificity but passed opinion — the `failedBothIds` filter only removes claims that fail BOTH. This is working as designed (the thesis-direct rescue from the recent Gate 1 review).

### 3d. Were the facet-convergence rules followed?

**Yes — for what they specify.** Both runs decomposed along plausible dimensions:
- AC_01: environmental/pollution reduction (stable across both)
- AC_02: economic (stable across both)
- AC_03: differs — "Ressourcenschonung" vs "praktische Machbarkeit"

The facet-convergence rule (line 162) says: "prefer the most canonical and independently verifiable reading dimensions of the predicate." Both "resource conservation" and "practical feasibility" are plausible readings of "recycling bringt nichts." The rule does not specify which is more canonical — it's genuinely ambiguous.

The claim-count-stability rule (line 163) says: "if the predicate naturally has 3 independent dimensions (e.g., environmental / economic / practical), extract 3 in every run." Both runs extracted 3. The rule doesn't pin which 3.

### 3e. Were the rules not activated, not followed, or followed but insufficient?

**Followed but insufficient.** The rules constrain the space (no counter-narratives, no peripheral dimensions, stable count) but do not eliminate the ambiguity in the third dimension for inputs where >3 plausible dimensions exist.

"Plastik recycling bringt nichts" has at least 4 plausible dimensions:
1. Environmental impact / pollution reduction
2. Economic viability
3. Resource conservation / material recovery
4. Practical feasibility / implementation

The rules say "extract 3" and "prefer canonical dimensions." Both runs chose 1+2+{3 or 4}. The LLM picks between dimension 3 and 4 non-deterministically. This is **not a rule violation** — it's the boundary of what rules alone can control for inherently ambiguous multi-dimensional inputs.

---

## 4. What Remains Unknown

| Item | Why unknown | Impact |
|------|------------|--------|
| **inputClassification for both runs** | Not stored in result JSON | Cannot confirm `ambiguous_single_claim` path was taken |
| **Claim-contract validation result** | Not stored in result JSON | Cannot confirm whether validator ran, passed, or flagged drift |
| **Whether CONTROL's "unwirksam" was flagged by contract validator** | Not stored | The CONTROL run has predicate softening that should have been caught by the contract validator — but we can't verify |
| **Pass 2 retry behavior** | Console logs only, not persisted | Cannot confirm whether either run was a retry result |
| **Self-consistency raw samples** | Only spread is stored | Cannot reconstruct what the 3 SC samples produced |

---

## 5. Whether Stage-1 Safeguards Actually Failed

**No.** The safeguards worked for their designed scope:

| Safeguard | Designed to prevent | Did it work? |
|-----------|-------------------|-------------|
| QLT-1 predicate strength | "bringt nichts" → "unwirksam" softening | **Partially** — UNVERIFIED run preserved predicate; CONTROL run still softened |
| QLT-3 counter-narrative prohibition | `contradicts_thesis` claims | **Yes** — neither run has counter-narrative claims |
| QLT-3 facet convergence | Peripheral/opportunistic dimensions | **Yes** — both runs chose substantive dimensions |
| QLT-3 claim count stability | Inconsistent claim count | **Yes** — both runs extracted exactly 3 |
| Claim-contract validator | Proxy drift | **Unknown** — results not stored |
| Gate 1 opinion+specificity filter | Non-factual + non-specific claims | **Yes** — no claims filtered (thesis-direct rescue) |

The **gap** is not a failure of existing safeguards — it's that no safeguard targets **dimension identity stability** (ensuring the same third dimension is chosen across runs). This is a fundamentally harder problem than the others because:
- Multiple dimensions are genuinely plausible
- The LLM's choice between them depends on sampling, preliminary evidence availability, and prompt interpretation
- Pinning the choice (e.g., "always choose environmental/economic/resource-conservation") would violate the generic-by-design mandate

---

## 6. Recommended Next Step

### Primary: Observability fixes (2 small changes)

1. **Store `inputClassification` in the understanding output.** Add `bestPass2.inputClassification` to the return object at line 575. ~1 line. This eliminates the main diagnostic blind spot.

2. **Store claim-contract validation result summary in the understanding output.** Add `contractValidationSummary: { preservesContract: boolean, rePromptRequired: boolean, summary: string }` to the return object. ~5 lines. This eliminates the second diagnostic blind spot.

These are NOT analytical changes — they store data that's already computed but discarded. No risk to quality.

### Secondary: Determine whether this case is amber or red under EVD-1

Under the EVD-1 acceptable-variance policy (approved 2026-03-25):
- Plastik DE is Class C (broad evaluative)
- Article-level acceptable band: ≤ 25pp
- A single UNVERIFIED run among otherwise MIXED/LEANING runs is not automatically red — it depends on the 5-run spread

**Action:** Run Plastik DE × 5 on current code. Measure the spread. If ≤ 25pp with no UNVERIFIED runs, this was a single-tail outlier (amber). If UNVERIFIED recurs, escalate to red.

### Explicitly NOT recommended

| Action | Why not |
|--------|---------|
| **New Stage-1 prompt change** | The rules were followed. The dimension drift is within the rules' designed tolerance. A prompt change targeting this specific case would need to pin dimension 3 to "resource conservation" — which is domain-specific and violates generic-by-design. |
| **Spread multiplier tuning** | Global impact. The 0.4 multiplier is aggressive but justified for genuinely unstable verdicts. Softening it masks instability rather than fixing it. |
| **Self-consistency temperature reduction** | Already investigated (Controllable Variance doc). T=0.4 is intentional. Reducing it would narrow the spread but also reduce the signal quality of the consistency check. |
| **Stage-3 boundary rebalancing** | Not shown to be the driver. Boundary count differed (4 vs 6) but the UNVERIFIED outcome was driven by confidence collapse, not by boundary structure. |

---

## 7. Final Judgment

**`Downstream characterization justified`**

The Stage-1 safeguards did not fail. They worked for what they're designed to prevent (predicate softening, counter-narratives, peripheral dimensions, count instability). The remaining dimension-3 ambiguity is inherent to multi-dimensional evaluative inputs and cannot be resolved by prompt rules without violating generic-by-design.

The correct next step is:
1. **Fix the two observability gaps** (store `inputClassification` and `contractValidation` result) so future investigations don't hit the same blind spots
2. **Run the EVD-1 5-run measurement** to determine whether this UNVERIFIED is a single-tail outlier or a recurring pattern
3. **Fix the structural_consistency bug** (AC_03 labeled MIXED at 52%/28% should be UNVERIFIED) — this is independent of the Plastik investigation and should ship regardless

If the 5-run measurement shows UNVERIFIED recurring (red under EVD-1), then and only then consider:
- Whether the spread multiplier cliff (0.7 → 0.4 at 20pp) is too aggressive for mixed-evidence topics
- Whether a "dimension stability seed" mechanism (where the LLM is given the previous run's dimensions as a starting point) would be justified

But those are speculative responses to a problem that may not recur.

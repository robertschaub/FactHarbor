# 2026-03-21 LLM Expert — Stage 2 Retrieval Skew Root Cause Analysis
**Task:** Diagnose why Run2 (EN exact: 63% LEANING-TRUE) stayed high after B1+B2. Determine how preliminary search, expectedEvidenceProfile, query generation, contradiction iterations, and evidence-pool composition interact to create the post-B1+B2 48pp spread.

---

## 0. Current State Snapshot

**Pipeline state on current `main`:**
- Stage 1 contract preservation: ✅ Fixed (claim-contract validator, B1/B2 implemented)
- B1 (claimDirection for partial findings): ✅ In prompt at EXTRACT_EVIDENCE line ~611
- B2 (contradiction iterationType explicit direction): ✅ In prompt at GENERATE_QUERIES line ~484
- verdictDirectionPolicy: ✅ Permanently enabled (`retry_once_then_safe_downgrade` in config-schemas.ts:1025 + pipeline.default.json:115)

**Post-B1+B2 5-run picture:**

| Run | Input | Truth% | Verdict | Status |
|-----|-------|--------|---------|--------|
| Run1 | DE exact | 21% | MOSTLY-FALSE | ✅ Target range |
| Run2 | EN exact | 63% | LEANING-TRUE | ❌ High outlier |
| Run3 | DE para | 21% | MOSTLY-FALSE | ✅ Target range |
| Run4 | EN para | 55% | UNVERIFIED | ⚠️ Marginal |
| Run5 | FR exact | 15% | MOSTLY-FALSE | ✅ Target range |

Spread: 48pp (Run5 15% → Run2 63%). Expected range: 15–45%.

---

## 1. Root Cause Analysis — Why Run2 (EN exact) Stays High After B1+B2

Run2 is driven by a **compound retrieval-framing loop** that is structurally specific to EN inputs on this topic. The loop has four interlocking stages:

### Stage A — Preliminary search anchors in the EN "recycling failure" discourse

`generateSearchQueries()` is deterministic: it takes Pass 1's `searchHint` (3-5 words) and the `statement` as its two query slots. For "Plastic recycling is pointless", Pass 1 generates searchHints like: "plastic recycling effectiveness" / "plastic recycling environmental impact" / "plastic recycling viability".

These hit the dominant EN-language narrative: **global recycling failure** — the "9% of all plastic ever recycled" statistic, China's National Sword policy devastation, contamination crisis, market failure. This is the default position of English-language media on plastic recycling at the global scale.

German searchHints hit German domain space: UBA studies, NABU reports, German DSD packaging system data. These are government/NGO sources documenting *both* achievements and shortcomings of German recycling. Result: balanced preliminary evidence from the start.

French searchHints hit French/EU domain space: EU Packaging Directive reports, French ADEME studies. These are policy-framing sources that by nature document *what recycling achieves* (to justify regulation), producing a positive framing.

**Contribution to Run2 elevation: ~45% of the 48pp spread.** This is the origin point.

### Stage B — expectedEvidenceProfile inherits the failure anchor

Pass 2 receives the preliminary evidence and is instructed: "use preliminary evidence to populate `expectedEvidenceProfile` and `groundingQuality`."

The current instruction (CLAIM_EXTRACTION_PASS2 line ~181) reads: *"For `expectedEvidenceProfile`, describe what kinds of evidence would verify or refute the claim — methodologies, metrics, and source types."*

In practice, when the LLM sees failure-dominant preliminary evidence, `expectedEvidenceProfile.methodologies` fills with failure-mode methodologies: "global recycling rate statistics", "contamination rate studies", "market failure analysis", "lifecycle waste tracking". The "or refute" in the instruction is underweighted because the context contains no refuting evidence to draw from.

**The expectedEvidenceProfile does not mandate refuting-direction coverage.** It reflects what was found, not what needs to be found from both directions.

**Contribution: ~25% of spread.** This stage amplifies Stage A's bias and locks it into all subsequent query generation.

### Stage C — Pro_con query generation constrained by failure-biased profile

GENERATE_QUERIES receives the failure-biased expectedEvidenceProfile. Even in `pro_con` mode:
- **Supporting query**: straightforwardly targets the profile's failure methodologies. Produces strong failure evidence.
- **Refuting query**: must generate a refuting query, but the profile offers no refuting methodologies. The LLM improvises: "plastic recycling environmental benefits documented." In the EN search space, this query returns articles that begin "While global recycling rates remain low..." — documents that mention benefits but embed them in a failure-dominant narrative context.

The refuting query works well for DE/FR (German success stories, EU achievement reports) because the expectedEvidenceProfile includes balanced methodologies. For EN, even the refuting query lands in the failure-dominant landscape.

**Contribution: ~15% of spread.** This is the relay stage — it converts expectedEvidenceProfile bias into query-level asymmetry.

### Stage D — B2 contradiction iteration partially compensates but cannot overcome structural skew

B2 sends the contradiction iteration to explicitly seek counter-evidence ("sources that document measured benefits... if the claim is negative"). For EN, the contradiction query finds: German/EU recycling success cited in EN media, some life-cycle analysis papers. B1 then correctly classifies these as `contradicts`.

However, the contradiction iteration is **one** query run against a structural information asymmetry: for every "recycling achieves X%" article in EN, there are 5-10 "global recycling is failing" articles. The net improvement from B2: perhaps 8-12 additional `contradicts` items per run. This is not enough to rebalance a pool where the main iterations brought in 3-4x more failure evidence.

**Why B1 doesn't help much for Run2:** B1's guidance is "classify partial benefit findings as `contradicts`." But the EN failure evidence is not primarily "partial benefit" — it's genuine failure data (9% global rate, declining recycling markets, market failure). These correctly remain as `supports`. B1's value is for the edge case where "58% PET recovery in Germany" appears in an EN source — it correctly flips that to `contradicts`. But most EN evidence isn't in this category.

**Net evidence pool for Run2:** approximately 65% supporting / 35% contradicting. Advocate assigns 63% truth%. Direction policy doesn't fire because 63% is directionally consistent with the evidence (65% supporting → 63% truth is coherent).

**Combined: B1+B2 together moved the pool from ~75% supporting to ~65% supporting — a real improvement (~11pp reduction in truth%), but insufficient to cross the MIXED/LEANING-FALSE threshold.**

---

## 2. Stage-by-Stage Spread Matrix

| Stage | Mechanism | DE exact (21%) | EN exact (63%) | FR exact (15%) | Share of 48pp Spread |
|-------|-----------|---------------|----------------|----------------|----------------------|
| **Pass 1 → Prelim search** | searchHint language → source pool language/framing | German domain sources → balanced | EN global space → failure-crisis dominant | French/EU sources → policy-achievement framing | **~45%** |
| **Pass 2 → expectedEvidenceProfile** | Seeded from prelim direction; no refuting-methodology mandate | Balanced methodologies | Failure-biased methodologies only | Achievement-biased methodologies | **~25%** |
| **GENERATE_QUERIES (main)** | Profile-guided queries; pro_con refuting constrained by profile's methodologies | Refuting queries effective in DE space | Refuting queries land in EN failure space | Refuting queries find EU achievements | **~15%** |
| **Contradiction iteration (B2)** | Explicitly seeks counter-evidence; single run against structural asymmetry | Finds German success stories (high probativeValue) | Finds some EN partial-benefit articles | Finds EU regulatory achievements | **~5%** |
| **Evidence classification (B1)** | Partial benefits → `contradicts`; failure statistics correctly stay `supports` | Limited impact (pool balanced already) | Marginal gain (~8-12 items reclassified) | Limited impact | **~5%** |
| **Verdict engine** | Aggregates directional pool | Low truth% from balanced pool | 63% from 65S/35C pool | Low truth% from 70C/30S pool | Downstream reflection |
| **VerdictDirectionPolicy** | Backstop — fires on extreme mismatches | Not triggered | Not triggered (63% consistent with 65% supporting) | Not triggered | ~5% amplifier (inactive here) |

**Summary:** The spread is **primarily a retrieval-framing origin problem** (Stage A: 45%) amplified by **expectedEvidenceProfile propagation** (Stage B: 25%), not a classification or verdict engine problem. B1+B2 addressed the downstream classification and iteration stages (~10-15% improvement) but the origin (Stage A) and its amplifier (Stage B) remain untouched.

---

## 3. Recommendations — Next Best Intervention

### Priority 1 — C1: Bidirectional expectedEvidenceProfile in Pass 2 (requires Captain approval — prompt change)

**Target:** `CLAIM_EXTRACTION_PASS2`, `expectedEvidenceProfile` instruction (line ~181 area).

**Current instruction (paraphrased):** "For `expectedEvidenceProfile`, describe what kinds of evidence would verify or refute the claim."

**Problem:** The LLM populates this from what preliminary evidence shows. Failure-dominant prelim → failure-mode methodologies only. The "or refute" clause is structurally underweighted when context contains no refuting evidence.

**Proposed addition (for Captain to approve or rephrase — keep generic):**

> When populating `expectedEvidenceProfile`, explicitly enumerate:
> - **`supportingMethodologies`**: Methodologies that would produce evidence affirming the claim. Use preliminary evidence to populate this.
> - **`refutingMethodologies`**: Methodologies that would produce evidence refuting the claim. This field MUST be populated based on the claim's logical inverse — what evidence would demonstrate the claim is false — NOT based on whether preliminary evidence contains refuting items. Even if all preliminary evidence supports the claim, enumerate what refuting evidence would look like.
>
> GENERATE_QUERIES will use `refutingMethodologies` specifically for refuting query variants and contradiction iterations.

**Why this is surgical:** It breaks the cascade at Stage B. Even when preliminary search returns 90% failure evidence, the expectedEvidenceProfile is forced to include refuting methodologies (life-cycle analysis showing net diversion, regional recycling system statistics, material recovery documentation). GENERATE_QUERIES can then generate genuinely refuting queries guided by those methodologies, rather than improvising in the failure-dominant search space.

**Risk level:** Low. The change adds a structural requirement; it doesn't alter claim extraction logic. Pass 1 and Stage 2 evidence classification are unaffected.

### Priority 2 — C2: refutingSearchHint in Pass 1 (requires Captain approval — prompt + minor code change)

**Target:** `CLAIM_EXTRACTION_PASS1` output schema + `generateSearchQueries()` function.

**Current:** Pass 1 outputs one `searchHint` per rough claim. `generateSearchQueries()` uses it as the primary query.

**Proposed:** Add `refutingSearchHint` to the Pass 1 schema — a 3-5 word hint targeting counter-evidence for the claim. Update `generateSearchQueries()` to use both as separate queries (affirming + refuting).

**Effect:** Preliminary search covers both directions from the start. For EN exact ("Plastic recycling is pointless"), the refuting searchHint might be "recycling system material recovery rates" — which hits European/Asian recycling success data. The expectedEvidenceProfile in Pass 2 then sees balanced preliminary evidence and constructs balanced methodologies.

**This addresses the root (Stage A)** rather than the amplifier (Stage B). C1 and C2 can be implemented together for maximum effect.

**Risk level:** Low. Pass 1 is generating one extra field. `generateSearchQueries()` is a simple deterministic function. The LLM call is already happening — this just adds a field.

### Hold — Multilingual retrieval pooling

Running preliminary search in multiple languages (e.g., always include a German query for claims about recycling) is architecturally correct but requires topic inference to choose the right language — which would violate the LLM intelligence mandate if done deterministically, or would add an extra LLM call to choose languages. Not the next step.

---

## 4. Concrete Experiment Before Implementing C1/C2

**Before writing any prompt changes, validate the hypothesis with a diagnostic run.**

### C-exp: Balanced preliminary evidence injection

**What:** For Run2 (EN exact, "Plastic recycling is pointless"), manually inject a balanced preliminary evidence string into Pass 2 — bypassing the real preliminary search. The injected evidence should contain:
- 3-4 items from the real preliminary search output (failure-dominant: 9% global rate, contamination studies, market failure)
- 3-4 manually-curated refuting items (e.g., "German PET bottle collection achieved 78% in 2022 — Umweltbundesamt", "EU Packaging Directive recycled material targets report 2023 — measurable diversion", "Life-cycle analysis shows net CO2 reduction from mechanical recycling — peer-reviewed")

**How:** Temporarily modify the pipeline to accept a `debugPreliminaryEvidence` parameter that bypasses `runPreliminarySearch()` for a single run. Or: directly call the Pass 2 prompt with the injected evidence and compare the resulting expectedEvidenceProfile, then run the pipeline forward from there.

**What to observe:**
1. Does Pass 2 produce a balanced expectedEvidenceProfile (with refuting methodologies) when given balanced preliminary evidence?
2. Do GENERATE_QUERIES queries shift — do refuting variants now target "regional recycling systems achieving measurable rates" instead of staying in the EN failure space?
3. Does the final truth% correct downward from 63% toward <45%?

**Decision gate:**
- If truth% corrects to <50%: **C1 is confirmed.** Implement the bidirectional expectedEvidenceProfile mandate.
- If truth% stays near 63% even with balanced preliminary evidence: **Stage A is not the primary driver.** The problem is in Stage 2 query execution — EN search space returns failure-dominant results regardless of query framing. Escalate to multilingual retrieval design (larger architectural change).

**Cost:** 1 LLM run (same as any single test run). No code changes required to validate.

---

## 5. What This Analysis Does NOT Say

- **The 63% EN result is not definitively "wrong"** in a strict empirical sense. The global plastic recycling failure narrative has genuine empirical backing. A verdict of "recycling is somewhat pointless at the global scale" has real evidentiary support in English-language media. The problem is the **48pp gap** vs. DE/FR assessments of the same claim — which violates input neutrality requirements.
- **B1+B2 did not fail.** They moved EN exact from an expected ~74%+ (extrapolating from the validator-era baseline) to 63% — a ~11pp improvement. They also dramatically improved DE (43% → 21%) and FR (69% → 15%). B1+B2 were the right interventions for their target problem (classification error + missing contradiction guidance). The remaining EN skew is upstream of what they can address.
- **Do not reopen Stage 1.** The contract validator is working. DE/FR stability (21%, 15%) confirms that when retrieval is balanced, the entire pipeline including Stage 1 produces correct verdicts.

---

## Open Items

1. Captain approval required for C1 (Pass 2 prompt — bidirectional expectedEvidenceProfile mandate).
2. Captain approval required for C2 (Pass 1 prompt + `generateSearchQueries()` refutingSearchHint).
3. C-exp (balanced preliminary evidence injection) can be run without approval — recommended before implementing C1/C2 to validate the hypothesis.
4. Boundary concentration (CB_34: 92.3% of evidence in one boundary, flagged in A1 Run3) remains a secondary amplifier signal. Do not investigate until post-B1/C experiment spread is reassessed.
5. TPM guard fallback (gpt-4.1 → gpt-4.1-mini for challenger in Run3 during A1) — not fixed. Low priority; affects debate quality not retrieval.

---

## Files Touched

- None (investigation only — no code changes made)

## Key Decisions

- Identified **expectedEvidenceProfile self-reinforcement** (Stage B, ~25%) as the highest-leverage fixable point, upstream of query generation
- Identified **preliminary search language-stratified anchoring** (Stage A, ~45%) as the root cause — addressable via C2 (refutingSearchHint) or multilingual pooling
- B1+B2 correctly identified and implemented — they addressed their target problem; remaining skew is upstream of their reach
- VerdictDirectionPolicy doesn't fire for Run2 because 63% is directionally consistent with the ~65% supporting evidence pool (not a false positive scenario)

## Warnings

- The C-exp requires injecting "real-world" source names into the preliminary evidence string. These must be used as realistic examples only — they must not be imported as hardcoded entities in any prompt or code. Use them only as test input to validate the diagnostic hypothesis.
- C1 changes the structure of expectedEvidenceProfile. If implementing, verify that GENERATE_QUERIES correctly reads and uses the new `refutingMethodologies` field — requires a corresponding GENERATE_QUERIES update to reference this field explicitly.
- Do not activate both C1 and C2 simultaneously in a first experiment. Test C1 alone first (it's the amplifier fix) — if it resolves the spread, C2 (the root fix) may not need immediate implementation.

## For Next Agent

- Read this file + `Docs/AGENTS/Handoffs/2026-03-20_A1_Experiment_Results.md`
- If implementing C-exp: the goal is to run a single EN exact test with manually-balanced preliminary evidence injected into Pass 2. This requires NO prompt changes — just a controlled test input.
- If implementing C1: the change site is `CLAIM_EXTRACTION_PASS2`, `expectedEvidenceProfile` instruction block. Must also update `GENERATE_QUERIES` to reference `refutingMethodologies` for refuting/contradiction query variants.
- If implementing C2: add `refutingSearchHint` field to Pass 1 output schema + update `generateSearchQueries()` in `claimboundary-pipeline.ts` (line ~1674).
- Success criteria: EN exact < 50%, DE/FR unchanged, no new MIXED overcorrection on DE.

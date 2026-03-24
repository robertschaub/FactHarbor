# Gate 1 Investigation — Phase 2 Prerequisite

**Date:** 2026-03-09
**Job investigated:** `fd4a10f4` (Iran Run 2) + all 7 Iran "Was Iran actually making nukes?" runs + 5 Bolsonaro runs
**Code path:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` → `runGate1Validation()`

---

## 1. Gate 1 Acceptance Criteria (Current Code)

Gate 1 uses an LLM call (CLAIM_VALIDATION prompt, temp 0.1) to assess three boolean dimensions per claim:

| Check | What it tests |
|-------|---------------|
| `passedOpinion` | Is this a factual assertion (not opinion/prediction)? |
| `passedSpecificity` | Is the claim specific enough to verify? |
| `passedFidelity` | Is the claim traceable to the input (not imported from evidence)? |

**Filtering rules (code):**
1. **Fidelity failure → remove.** Any claim with `passedFidelity = false` is removed.
2. **Both opinion + specificity fail → remove.** Claims that fail BOTH checks are removed.
3. **Specificity threshold → remove.** Claims with `specificityScore < 0.6` (UCM-configurable) AND `groundingQuality != "none"` are removed.
4. **Safety net:** If ALL claims would be filtered, rescue the highest-centrality fidelity-passing claim.

Important: The numeric `specificityScore` (from Stage 1 extraction) is separate from the LLM's `passedSpecificity` boolean (from Gate 1). They frequently disagree.

---

## 2. Iran Run Data — Gate 1 Statistics Across 7 Runs

All runs used identical input: "Was Iran actually making nukes?"

| Job (prefix) | Verdict | Truth% | Claims kept | passedOpinion | passedSpecificity | passedFidelity | filtered | Reason |
|--------------|---------|--------|-------------|---------------|-------------------|----------------|----------|--------|
| 56283a0c | TRUE | 90% | 1 | 1/1 | 0/1 | 1/1 | 0 | Single extraction, kept by threshold |
| ce152ca3 | **MIXED** | **55%** | **3** | 3/3 | 1/3 | **3/3** | 0 | All 3 dimensions survive |
| fd4a10f4 | TRUE | 92% | 1 | 3/3 | 0/3 | **1/3** | **2** | **Fidelity kills 2 dimensions** |
| d466c351 | TRUE | 90% | 3 | 3/3 | 0/3 | **3/3** | 0 | All survive (specificityScore ≥ 0.6) |
| 26c4d9a4 | TRUE | 87% | 3 | 3/3 | 2/3 | **3/3** | 0 | All survive |
| 44121718 | MOSTLY-TRUE | 75% | 3 | 3/3 | 1/3 | **3/3** | 0 | All survive |
| 41f16ef3 | TRUE | 88% | 1 | 3/3 | 1/3 | **1/3** | **2** | **Fidelity kills 2 dimensions** |

### Pattern

- **passedFidelity is the decisive filter.** The only runs with filtered claims (fd4a10f4, 41f16ef3) had `passedFidelity = 1/3`. When fidelity passes all 3 claims, zero are filtered.
- **passedSpecificity is noisy but non-decisive.** Ranges from 0/3 to 2/3 across runs. But since the numeric `specificityScore` (0.75) always exceeds the threshold (0.6), the specificity LLM check never triggers filtering on its own — only via the "both opinion+specificity" combined rule, and opinion always passes (3/3).
- **1-claim runs → TRUE 88-92%.** When fidelity kills 2 dimension claims, only "historical weapons programs" survives — well-documented, yielding high truth%.
- **3-claim runs → wider range: 55-90%.** When all 3 dimensions survive (historical, current production, technical capability), the "current production" dimension introduces contradicting evidence, pulling truth% down.

**Conclusion:** Gate 1 fidelity assessment at temp 0.1 is non-deterministic for dimension claims. This creates a **binary 1-vs-3 claim outcome** that cascades into 37-point truth% differences (55% vs 92%).

---

## 3. Bolsonaro Comparison — Stable Gate 1

| Job (prefix) | Verdict | Truth% | Claims kept | passedOpinion | passedSpecificity | passedFidelity | filtered |
|--------------|---------|--------|-------------|---------------|-------------------|----------------|----------|
| a62db574 | MOSTLY-TRUE | 72% | 1 | 1/2 | 0/2 | 2/2 | 1 |
| b32cbcaf | LEANING-TRUE | 68% | 1 | 1/2 | 0/2 | 2/2 | 1 |
| 2acb6420 | MOSTLY-TRUE | 73% | 1 | 1/2 | 0/2 | 2/2 | 1 |
| 1a4f7f33 | MOSTLY-TRUE | 85% | 1 | 1/2 | 0/2 | 2/2 | 1 |
| 2c7e10c2 | MOSTLY-TRUE | 82% | 1 | 1/2 | 0/2 | 2/2 | 1 |

**100% stable:** Every run produces 2 claims, 1 fails the opinion check (likely the evaluative dimension), leaving exactly 1. Gate 1 is not the variance source here. The 68-85% truth% range comes from later stages (evidence search, verdict).

---

## 4. Prompt vs Reality — Fidelity Check for Dimension Claims

The CLAIM_VALIDATION prompt explicitly says:

> "When the input uses an ambiguous predicate (e.g., 'is useless', 'does not work'), claims that narrow the predicate to a specific interpretation dimension (e.g., technical, economic, environmental) are **not** fidelity failures — the dimensions are inherent in the wording, not imported from evidence."

**But the LLM doesn't consistently follow this instruction.** In 2 of 6 multi-claim Iran runs, it flagged 2 of 3 dimension claims as fidelity failures despite them being valid dimension decompositions ("in terms of current active weapons production", "in terms of technical capability and readiness").

The dimension claims ARE inherent interpretations of "Was Iran making nukes?" — they were generated by Pass 2 as `ambiguous_single_claim` dimensions. The fidelity check should pass them, but doesn't reliably.

---

## 5. Stage 1 Schema — PreliminaryEvidenceItem Fields

**Investigated per brief item 4.** The `PreliminaryEvidenceItem` interface now includes `claimDirection` and `sourceType` (added in Phase 1 commit `d9043338`), but the Pass 1 extraction prompt (CLAIM_EXTRACTION_PASS1) does NOT ask the LLM to return these fields. The output schema for Pass 1 only returns `roughClaims` with `statement` and `searchHint`.

Preliminary evidence items are created in `extractClaims()` from Pass 1 rough claims via web search results — they're structural wrappers around search snippets, not LLM-classified evidence. The `claimDirection` and `sourceType` fields will contain values only if the LLM returns them voluntarily in the preliminary extraction, which is unlikely without explicit schema instructions.

**Impact:** Phase 1's seeded evidence enrichment (B1 fix) added the fields to the interface and forwarding code, but the upstream LLM prompt doesn't produce them. Seeded evidence entering Stage 2 will have `claimDirection` and `sourceType` as `undefined`, falling back to stub defaults (`"contextual"` and `"other"`). This is a known limitation — the fields were added for forward compatibility, not immediate use.

---

## 6. Pre-Filter Claims Not Stored

When Gate 1 filters claims, only the surviving claims appear in `ResultJson.understanding.atomicClaims`. The filtered claims and the Gate 1 LLM reasoning (which claim failed which check and why) are lost. This makes post-hoc investigation impossible without re-running.

---

## 7. Recommendations

### R1: Exempt dimension claims from fidelity filtering (addresses root cause)
When `inputClassification` is `ambiguous_single_claim` and claims were generated as dimension decompositions, they should be exempt from fidelity filtering by design — they are inherent in the input's semantic range, not imported from evidence. The prompt already says this; the code should enforce it structurally.

**Implementation options:**
- **Option A (prompt-side):** Strengthen the CLAIM_VALIDATION prompt to reinforce that dimension-decomposed claims from `ambiguous_single_claim` inputs MUST pass fidelity. Risk: LLM may still not follow.
- **Option B (code-side):** Tag dimension claims with a flag (e.g., `isDimensionDecomposition: true`) during Pass 2, and skip fidelity filtering for flagged claims in Gate 1. More reliable.
- **Option C (hybrid):** Both A and B. Belt and suspenders.

**Recommendation: Option B** (code-side). Deterministic, no LLM variance.

### R2: Store pre-filter claims and Gate 1 reasoning in results
Add `understanding.preFilterAtomicClaims` and `understanding.gate1Reasoning` to the result schema so filtered claims and reasons are auditable.

### R3: The minCoreClaimsPerContext reprompt loop should check AFTER Gate 1
The brief says to enforce minimum claim count. With this investigation's findings, the reprompt trigger should fire when post-Gate-1 claim count drops below the minimum (not pre-Gate-1), since Gate 1 filtering is the dominant reducer.

### R4: passedSpecificity LLM check is unreliable
The LLM boolean `passedSpecificity` frequently contradicts the numeric `specificityScore`. Consider removing the LLM specificity check and relying solely on the numeric threshold, or reconciling the two signals more carefully.

---

## 8. Decision Needed from Captain

Before implementing Phase 2.1:

1. **D1:** Which option for R1 (exempt dimension claims)? Recommend Option B (code-side tagging).
2. **D2:** Should R2 (store pre-filter data) be implemented now or deferred?
3. **D3:** Confirm R3 — reprompt loop triggers post-Gate-1?
4. **D4:** Should R4 (remove LLM specificity check) be addressed in Phase 2 or deferred?

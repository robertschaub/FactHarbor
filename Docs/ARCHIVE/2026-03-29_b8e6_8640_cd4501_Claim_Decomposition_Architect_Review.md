# b8e6 + 8640 + cd4501 Claim Decomposition — Architect Review

**Date:** 2026-03-29
**Role:** Lead Architect
**Status:** REVIEW-READY
**Supersedes:** `2026-03-29_b8e6_8640_Claim_Decomposition_Architect_Review.md` (2-job version)
**Problem jobs:**
- `b8e616ef9a5e4678b074f2bb8614b2d1` — `single_atomic_claim` over-split into near-duplicate conjuncts
- `8640e06255c4455cb97c9c699700b5ed` — `ambiguous_single_claim` over-fragmented, contract validation missed
- `cd4501e124c64adf9e88a171f3cf0578` — `ambiguous_single_claim` over-fragmented, contract validation **caught** but retry **failed to fix**
**Input family:** SRG SSR fact-checking (German)

---

## 1. Executive Summary

Three SRG SSR jobs expose a **four-layer failure** in Stage 1 claim decomposition. Each job hits a different combination of layers, proving they are not isolated incidents but facets of the same structural gap.

| Job | Classification | Contract caught? | Retry fixed? | Gate 1 caught? | Result |
|-----|---------------|:---:|:---:|:---:|--------|
| b8e6 | `single_atomic_claim` | No (false positive) | N/A | No (dimension exempt) | 2 near-duplicate claims |
| 8640 | `ambiguous_single_claim` | No (missed) | N/A | No (dimension exempt) | AC_02+AC_03 UNVERIFIED |
| cd4501 | `ambiguous_single_claim` | **Yes** | **No** — same 3-claim split | No (thesis-direct rescue) | AC_02+AC_03 UNVERIFIED (0 evidence) |

The addition of cd4501 is decisive. It proves that **even when contract validation correctly identifies the problem, the retry mechanism cannot fix it**. The corrective guidance tells the LLM to "preserve evaluative meaning" and "avoid proxy predicates" — but does not tell it to merge evidence-inseparable sub-claims or reduce the claim count. The LLM complies with the guidance as stated and produces the same split.

This means:
- **Fixing only the fallback heuristic** (Option A) would leave 8640 and cd4501 unaddressed.
- **Fixing only contract validation** (Option B) would leave b8e6 unaddressed and cd4501 would still fail (contract already caught it, the retry is the problem).
- **Fixing both** (Option C) still leaves cd4501 broken unless the retry is also hardened.
- **The smallest complete fix is Option D: fallback removal + contract-validation evidence-separability check + retry-path hardening.**

7/200 recent succeeded jobs (3.5%) have `single_atomic_claim` with `isDimensionDecomposition`. The `ambiguous_single_claim` over-fragmentation rate is harder to measure but at least 2 additional confirmed cases exist.

---

## 2. What the Three Jobs Prove

### 2.1 Job b8e6 — single_atomic_claim over-split (Layer 1 + Layer 2)

**Input:** "Die SRG SSR und ihre Unternehmenseinheiten legen offen welche Fact-Checking-Werkzeuge und Methoden sie benutzen."
**Classification:** `single_atomic_claim`
**Outcome:** 2 near-duplicate claims: AC_01 (Werkzeuge), AC_02 (Methoden)

- **Layer 1 (fallback heuristic):** Both claims auto-tagged `isDimensionDecomposition=true` by the fallback at [claim-extraction-stage.ts:357-360](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L357), exempting them from Gate 1 fidelity filtering.
- **Layer 2 (contract validation):** Contract validator falsely accepted: "perfectly preserves the original claim contract."
- Pass 2 should not have emitted 2 claims for a `single_atomic_claim` input. "Werkzeuge und Methoden" is a conjunct pair from a single disclosure proposition.

### 2.2 Job 8640 — ambiguous_single_claim over-fragmentation (Layer 2 + Layer 3)

**Input:** "Die SRG SSR und ihre Unternehmenseinheiten setzen moderne Fact-Checking-Methoden und -Werkzeuge ein und betreiben Fact-Checking effizient und wirksam"
**Classification:** `ambiguous_single_claim`
**Outcome:** 3 claims: AC_01 (methods/tools), AC_02 (efficient), AC_03 (effective). AC_02: 1 evidence item → UNVERIFIED. AC_03: 1 evidence item → UNVERIFIED.

- **Layer 2 (contract validation):** Accepted all 3 claims without questioning whether "effizient" and "wirksam" are evidence-separable.
- **Layer 3 (Pass 2 permissiveness):** The extraction correctly identified three linguistically distinct predicates but did not assess whether they are independently researchable.
- The dimension tag is structurally correct for `ambiguous_single_claim`. The problem is decomposition granularity, not tagging.

### 2.3 Job cd4501 — the decisive case (Layer 2 catch + Layer 4 failure)

**Input:** Same as 8640
**Classification:** `ambiguous_single_claim`
**Outcome:** Same 3-claim split. AC_02: **0** evidence items → UNVERIFIED. AC_03: **0** evidence items → UNVERIFIED.

- **Layer 2 (contract validation):** **Correctly caught** the problem. Output: `preservesContract=false`, `rePromptRequired=true`, summary: "AC_02 and AC_03 are malformed: they circularly use 'wirksam' to qualify both efficiency and effectiveness dimensions, creating tautology."
- **Layer 4 (retry failure):** The retry at [claim-extraction-stage.ts:298-311](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L298) ran Pass 2 again with corrective guidance. But the guidance at lines 286-291 says:
  ```
  "Preserve the original evaluative meaning and use only neutral dimension qualifiers.
   Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate."
  ```
  This guidance addresses **proxy drift** but not **over-fragmentation** or **evidence inseparability**. It does not tell the LLM to merge sub-claims or reduce claim count. The LLM complied with the guidance and reproduced the same 3-claim split.
- **No re-validation:** After the retry, there is no second contract validation pass. The retry output is accepted unconditionally at line 311 (`activePass2 = retryPass2`).
- **Gate 1:** AC_02 and AC_03 both failed opinion and specificity but were rescued by `gate1_thesis_direct_rescue`. The thesis-direct rescue is correct in general (the user explicitly asked about these dimensions), but in this case it preserved claims that should have been merged.

**Why cd4501 is decisive:** It proves the system can detect the problem but cannot act on the detection. The contract-validation catch was wasted because the retry mechanism does not convey the right corrective signal.

### 2.4 Coverage matrix observation

In cd4501, the coverage matrix shows only AC_01 (the `activeClaims` logic at [claimboundary-pipeline.ts:550-552](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L550) excludes insufficient claims). The matrix looks healthy — 5 boundaries, evidence distributed — while 2/3 of the analysis collapsed. The article verdict (LEANING-TRUE 65/68) was derived from AC_01 alone.

This is not a bug in the matrix code (it correctly reflects what was assessable), but it is a **communication gap** for users who see a healthy-looking matrix without realizing 2/3 of their input was not evaluated.

---

## 3. Adjudication of Competing Explanations

### 3.1 Recent regression (REJECTED)

Same finding as before. The fallback heuristic was introduced 2026-03-23. No Stage 1 behavioral change in the last 3 days. The pattern spans 2026-03-26 to 2026-03-29 across multiple families.

### 3.2 Fallback heuristic only (INSUFFICIENT)

Removing the `single_atomic_claim` fallback fixes b8e6 but leaves 8640 and cd4501 completely unaddressed. Both of those are `ambiguous_single_claim` where the dimension tag is correct by design.

### 3.3 Contract validation only (INSUFFICIENT)

Strengthening contract validation would catch 8640 (where it missed the problem). But cd4501 proves that catching the problem is not enough — the retry must also fix it. Contract validation alone does not address the retry-path weakness.

### 3.4 Combined fallback + contract + retry (ACCEPTED)

The three jobs demonstrate three distinct failure points. Each needs its own fix:
- b8e6 → fallback removal (Layer 1)
- 8640 → contract validation evidence-separability check (Layer 2)
- cd4501 → retry corrective guidance that addresses over-fragmentation, not just proxy drift (Layer 4)

### 3.5 Broader Pass 2 prompt change (DEFERRED)

Pass 2 permissiveness (Layer 3) is a contributing factor — the extraction should not produce claims that cannot attract independent evidence. But Pass 2 prompt changes are invasive, affect all input types, and are stochastic. Downstream validation (contract + retry) is a more reliable defense. If Steps 1-3 are insufficient, Pass 2 tightening becomes Step 4.

---

## 4. Immediate Failure Layers

### Layer 1: Fallback dimension-tagging heuristic (b8e6)

**Location:** [claim-extraction-stage.ts:357-360](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L357)

The `single_atomic_claim` fallback auto-tags multi-claim outputs as dimension decompositions when all claims have `centrality=high` and `claimDirection=supports_thesis`. This backward-compat shim is no longer needed (all prompts now emit `inputClassification`).

### Layer 2: Contract validation blind spot (8640)

**Location:** [claimboundary.prompt.md:283-378](apps/web/prompts/claimboundary.prompt.md#L283)

The CLAIM_CONTRACT_VALIDATION prompt checks proxy drift and evaluative meaning preservation but does NOT check:
- Whether claims are independently evidence-separable
- Whether research would produce different sources for each claim
- Whether a `single_atomic_claim` should have produced >1 claim

### Layer 3: Pass 2 over-fragmentation (contributing factor)

**Location:** [claimboundary.prompt.md:59-77](apps/web/prompts/claimboundary.prompt.md#L59) (Pass 1 rules) and [claimboundary.prompt.md:241-273](apps/web/prompts/claimboundary.prompt.md#L241) (Pass 2 output)

For `ambiguous_single_claim`, the Pass 1 prompt permits 2-3 rough claims "one per distinct interpretation dimension." But "distinct" is measured linguistically, not by evidence separability. "Effizient" and "wirksam" are linguistically distinct but practically inseparable.

### Layer 4: Retry corrective guidance (cd4501)

**Location:** [claim-extraction-stage.ts:286-291](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L286)

The contract-retry guidance addresses proxy drift but not over-fragmentation:
```
"Preserve the original evaluative meaning and use only neutral dimension qualifiers.
 Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate."
```

**Missing from the guidance:**
- No instruction to merge evidence-inseparable sub-claims
- No instruction to reduce claim count when sub-claims are too fine-grained
- No mention of the specific contract-validation finding (the summary is included, but the generic instructions contradict the merge signal)

Additionally, there is **no re-validation** after the retry. The output is accepted unconditionally.

---

## 5. Recommended Fix Strategy

### Option A: Fallback removal only — INSUFFICIENT

Fixes b8e6. Does not address 8640 or cd4501.

### Option B: Contract validation only — INSUFFICIENT

Would catch 8640. Does not fix b8e6 (different mechanism). cd4501 proves that catching alone is not enough — the retry must also fix it.

### Option C: Fallback + contract validation — STILL INSUFFICIENT

Fixes b8e6 and catches 8640. But cd4501 shows that even a correct catch is wasted if the retry reproduces the same split.

### Option D: Fallback + contract validation + retry hardening — RECOMMENDED

Three changes, each addressing a distinct layer:

**Step 1 (code-only):** Remove the `single_atomic_claim` fallback from the dimension-tagging heuristic. Directly prevents b8e6-class failures.

**Step 2 (prompt change, requires approval):** Add evidence-separability check to CLAIM_CONTRACT_VALIDATION. Catches 8640-class failures where contract validation currently misses the problem.

**Step 3 (code change):** Harden the contract-retry guidance to include over-fragmentation correction. When `rePromptRequired=true`, the guidance should:
- Include the contract validator's specific finding (already done via `contractResult.inputAssessment.summary`)
- Explicitly instruct: "If the previous extraction produced claims that would be answered by the same evidence, merge them into fewer independently researchable claims."
- Add a concrete merge instruction derived from the failing claims

Additionally: after the retry, re-run contract validation on the retry output. If it still fails, fall back to a single-claim extraction (the input reworded as one claim matching the `impliedClaim`).

### Option E: Broader Pass 2 prompt change — DEFERRED

Most invasive. Risk of destabilizing extraction for all input types. If Steps 1-3 are insufficient, this becomes Step 4.

---

## 6. UI / Communication Implications

### Coverage matrix shows a healthy picture while 2/3 of analysis collapsed

In cd4501, the matrix displays 5 boundaries with evidence for AC_01, looking complete. But AC_02 and AC_03 (2/3 of the input's claims) have zero evidence and are UNVERIFIED. The user sees a healthy matrix and a LEANING-TRUE verdict without realizing the system could not evaluate most of what they asked.

### This is a communication gap, not a matrix code bug

The `activeClaims` logic at [claimboundary-pipeline.ts:550-552](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L550) correctly excludes insufficient claims to avoid ghost columns. The article verdict aggregation correctly bases its result on assessable claims only.

### Recommendation

This is **not** an immediate fix target for the decomposition workstream. But it should be noted as a follow-up UI task:
- When >0 claims are UNVERIFIED due to insufficient evidence, the report should surface this prominently — not buried in warnings.
- A simple indicator: "2 of 3 claims could not be assessed due to insufficient evidence" above the matrix.
- This is a display/template change, not an analytical change.

---

## 7. What NOT to Change

| Item | Why not |
|------|---------|
| Deterministic text-similarity heuristics | Violates AGENTS.md LLM Intelligence mandate |
| Regex/keyword duplicate detection | Same violation |
| D5 thresholds | D5 correctly enforced diversity — AC_02/AC_03 had 0-1 items, correctly UNVERIFIED |
| Stage 2 search-budget tuning | Evidence starvation is a consequence of over-splitting, not inadequate search |
| Verdict-stage logic | Verdicts are downstream victims of bad claims |
| Gate 1 thesis-direct rescue | The rescue is correct in general. AC_02/AC_03 genuinely restate the user's thesis dimensions. The fix belongs upstream (don't produce inseparable claims) not downstream (don't rescue them). |
| Pass 2 extraction prompt (for now) | Too invasive for first move. Consider only if Steps 1-3 prove insufficient. |
| `ambiguous_single_claim` dimension-tagging at line 357 | Correct by design. The problem is decomposition granularity, not that ambiguous inputs get dimension tags. |
| Coverage matrix code | Working correctly. The communication gap is a separate UI task. |

---

## 8. Implementation Order

### Step 1: Remove `single_atomic_claim` fallback from dimension-tagging (code-only)

**What:** In [claim-extraction-stage.ts:357-360](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L357), change:

```typescript
// Before:
const isDimensionInput = activePass2.inputClassification === "ambiguous_single_claim"
  || (activePass2.inputClassification === "single_atomic_claim"
      && filteredClaims.length > 1
      && filteredClaims.every(c => c.centrality === "high" && c.claimDirection === "supports_thesis"));

// After:
const isDimensionInput = activePass2.inputClassification === "ambiguous_single_claim";
```

Apply same change at lines 432-434 and 540-542 (retry paths).

**Classification:** Code-only bug fix. No prompt change.
**Scope:** 3 locations, ~3 lines each.
**Risk:** Low. The fallback was a pre-2.2 backward-compat shim. All current prompts emit `inputClassification`.

### Step 2: Add evidence-separability to CLAIM_CONTRACT_VALIDATION (prompt change)

**What:** Add a new rule to the contract validation prompt:

```
9. **Evidence separability (multi-claim outputs only).**
   When the extraction produces multiple claims, assess whether each claim would plausibly
   require different evidence sources, search queries, or methodologies to verify.
   If two or more claims would be answered by substantially the same body of evidence
   (e.g., "efficient" and "effective" for the same organization and activity),
   flag `rePromptRequired: true` with reasoning explaining which claims overlap.
```

Add a per-claim field: `"evidenceSeparable": true | false`

**Classification:** Prompt/schema contract change. Requires human approval.
**Scope:** ~15 lines in prompt, ~5 lines in parser.

### Step 3: Harden contract-retry guidance for over-fragmentation (code change)

**What:** In [claim-extraction-stage.ts:286-291](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L286), extend the corrective guidance:

```typescript
const contractGuidance =
  `CLAIM CONTRACT CORRECTION: The previous extraction drifted from the original claim contract. ` +
  `${contractResult.inputAssessment.summary}. ` +
  `Specific issues: ${failingReasons}. ` +
  `Preserve the original evaluative meaning and use only neutral dimension qualifiers. ` +
  `Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate. ` +
  `If the previous extraction produced claims that would be answered by the same evidence, ` +
  `merge them into fewer independently researchable claims. ` +
  `Fewer stronger claims are better than many fragile sub-claims.`;
```

Additionally, after the retry, re-run contract validation. If the retry still fails, emit a warning and proceed with the retry output (fail-open, but with observability).

**Classification:** Code change (guidance text is a runtime string, not a registered prompt section). The contract-validation re-run is code-only.
**Scope:** ~5 lines guidance change + ~20 lines for re-validation loop.
**Risk:** Low. The additional guidance is generic and does not constrain extraction for inputs that are correctly decomposed. Re-validation adds one Haiku call (~$0.001) only when contract validation originally failed.

### Step 4 (conditional): Remeasure and decide further

After Steps 1-3 ship, run validation jobs. If over-fragmentation persists, consider Pass 2 prompt tightening (Option E).

---

## 9. Validation Plan

### After Step 1 (fallback removal):

| # | Input | Family | Classification | Purpose |
|---|-------|--------|----------------|---------|
| 1 | "Die SRG SSR ... legen offen welche Fact-Checking-Werkzeuge und Methoden..." | SRG DE | single_atomic_claim | Direct b8e6 reproduction — expect 1 claim |
| 2 | Bolsonaro proceedings input | Bolsonaro | expected ambiguous_single_claim | Regression — legitimate dimensions must survive |
| 3 | "Plastik recycling bringt nichts" | Plastik DE | single_atomic_claim | Control — should remain 1 claim |

### After Steps 2+3 (contract validation + retry hardening):

| # | Input | Family | Classification | Purpose |
|---|-------|--------|----------------|---------|
| 4 | "Die SRG SSR ... setzen moderne ... ein und betreiben ... effizient und wirksam" | SRG DE | ambiguous_single_claim | Direct 8640/cd4501 reproduction — expect "effizient"/"wirksam" merged |
| 5 | Bolsonaro proceedings | Bolsonaro | ambiguous_single_claim | Regression — procedural compliance / fairness must remain separate |
| 6 | "Using hydrogen for cars is more efficient than using electricity" | Hydrogen | ambiguous_single_claim | Cross-family control |
| 7 | "Homeopathy does not work for animals" | Homeopathy | ambiguous_single_claim | Cross-family control with evaluative predicates |

### Success criteria:

- b8e6 input produces 1 claim (no Werkzeuge/Methoden split)
- 8640/cd4501 input produces ≤2 claims (efficiency+effectiveness merged)
- Bolsonaro "procedural compliance" and "fairness" remain separate (genuinely evidence-separable)
- No regression on Plastik, Hydrogen, or Homeopathy
- Contract-retry re-validation fires and detects any remaining over-fragmentation

### Anti-success criteria:

- Bolsonaro claims get merged (they are genuinely distinct)
- Contract validation becomes too aggressive and rejects legitimate decompositions
- Retry produces a single vague claim that loses the input's specificity

---

## 10. Final Judgment

**`Stage-1 decomposition fix justified`**

Three jobs expose four failure layers in Stage 1 claim decomposition. The cd4501 case is decisive: contract validation correctly caught the problem, but the retry mechanism could not fix it because the corrective guidance addresses proxy drift, not over-fragmentation. The smallest complete fix requires three changes: (1) remove the `single_atomic_claim` fallback heuristic (code-only), (2) add evidence-separability to contract validation (prompt, requires approval), (3) harden the retry guidance to address over-fragmentation and add re-validation (code). Each step addresses a distinct failure layer and is independently testable.

---

**Recommended next task:** Remove `single_atomic_claim` fallback from dimension-tagging heuristic + harden contract-retry guidance

**Why this first:** Step 1 (fallback removal) is a code-only change (~3 lines × 3 locations) that directly prevents the most egregious failure mode — a `single_atomic_claim` input auto-promoted to dimension decomposition. Step 3 (retry guidance hardening) is also code-only and can ship in the same commit — the guidance text is a runtime string, not a registered prompt section, so it does not require prompt approval. Together they address Layers 1 and 4 immediately. Step 2 (contract-validation evidence-separability) requires human approval for the prompt change and should follow as the next approved task. The validation plan then confirms whether all three layers are adequately addressed or whether Pass 2 prompt tightening (Step 4) is needed.

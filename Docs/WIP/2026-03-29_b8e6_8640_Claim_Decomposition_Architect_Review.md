# b8e6 + 8640 Claim Decomposition — Architect Review

**Date:** 2026-03-29
**Role:** Lead Architect
**Status:** REVIEW-READY
**Problem jobs:**
- `b8e616ef9a5e4678b074f2bb8614b2d1` — `single_atomic_claim` over-split into near-duplicate conjuncts
- `8640e06255c4455cb97c9c699700b5ed` — `ambiguous_single_claim` over-fragmented into evidence-inseparable evaluative sub-claims
**Input family:** SRG SSR fact-checking disclosure (German)

---

## 1. Executive Summary

Jobs `b8e6` and `8640` share a **family-level root cause** but not an identical immediate mechanism. Both demonstrate that Stage 1 is too willing to preserve multi-claim decompositions without validating that the resulting claims are **independently evidence-separable**.

- **b8e6**: Input classified `single_atomic_claim`, yet Pass 2 emitted 2 near-duplicate claims splitting "Werkzeuge" (tools) from "Methoden" (methods). The fallback dimension-tagging heuristic at [claim-extraction-stage.ts:357-360](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L357) auto-promoted these to `isDimensionDecomposition=true`, exempting them from Gate 1 fidelity filtering. Contract validation falsely accepted the extraction as "perfectly preserves the original claim contract."

- **8640**: Input classified `ambiguous_single_claim`, yielding 3 claims: modern methods/tools, efficient, effective. The dimension tag was by design (line 357). But AC_02 ("effizient") and AC_03 ("wirksam") are so close that each attracted only 1 evidence item and both became UNVERIFIED, dragging the article result.

The two failures layer as follows:

1. **Layer 1 (b8e6 only):** The `single_atomic_claim` fallback auto-tags any multi-claim output as dimension decomposition when all claims have `centrality=high` and `claimDirection=supports_thesis`. This is too permissive — it treats a conjunct split as a legitimate dimensional analysis.

2. **Layer 2 (both jobs):** Contract validation checks proxy drift and evaluative meaning preservation, but does NOT check whether multiple claims are independently falsifiable or evidence-separable. It accepted both extractions without questioning whether research would find different evidence for each claim.

3. **Layer 3 (8640 only):** The Pass 2 prompt for `ambiguous_single_claim` permits 2-3 dimension claims without requiring that those dimensions have distinct evidence profiles.

The fix sequence should address Layer 1 first (code-only, narrow), then Layer 2 (contract validation prompt, requires approval). Layer 3 is a prompt-level extraction change that is more invasive and should wait for measurement.

7/200 recent succeeded jobs (3.5%) exhibit `single_atomic_claim` with `isDimensionDecomposition` — this is not a one-off.

---

## 2. What the Two Jobs Prove

### 2.1 Job b8e6 — single_atomic_claim over-split

| Field | Value |
|-------|-------|
| Input | "Die SRG SSR und ihre Unternehmenseinheiten legen offen welche Fact-Checking-Werkzeuge und Methoden sie benutzen." |
| inputClassification | `single_atomic_claim` |
| Pass 2 output | 2 claims — AC_01 (Werkzeuge), AC_02 (Methoden) |
| Contract validation | `preservesContract=true`, `rePromptRequired=false`, summary: "perfectly preserves" |
| Dimension tag | Both auto-tagged `isDimensionDecomposition=true` by fallback heuristic |
| Gate 1 | Both exempted from fidelity filtering due to dimension tag |
| Evidence | AC_01: 1 item, AC_02: 1 item (out of 9 total) |
| Verdicts | Mixed article LEANING-TRUE 60/53. Two claims also got UNVERIFIED duplicate verdicts (likely from boundary-level processing). |

**What this proves:**
- The fallback heuristic at line 357-360 has no guard against a `single_atomic_claim` input producing synonymous conjunct splits.
- Contract validation did not catch that "Werkzeuge" and "Methoden" are a conjunct pair from a single disclosure proposition, not independent dimensions.
- The resulting split is analytically harmful: each claim attracted only 1 evidence item, where the unified claim would have attracted 9.

### 2.2 Job 8640 — ambiguous_single_claim over-fragmentation

| Field | Value |
|-------|-------|
| Input | "Die SRG SSR und ihre Unternehmenseinheiten setzen moderne Fact-Checking-Methoden und -Werkzeuge ein und betreiben Fact-Checking effizient und wirksam" |
| inputClassification | `ambiguous_single_claim` |
| Pass 2 output | 3 claims — AC_01 (methods/tools), AC_02 (efficient), AC_03 (effective) |
| Contract validation | Accepted all 3 |
| Dimension tag | All 3 tagged `isDimensionDecomposition=true` (by design for `ambiguous_single_claim`) |
| Evidence | AC_01: 6 items, AC_02: 1 item, AC_03: 1 item |
| Verdicts | AC_01 publishable; AC_02 + AC_03 both UNVERIFIED |

**What this proves:**
- AC_02 ("effizient") and AC_03 ("wirksam") are linguistically different but not evidence-separable. Web searches for "SRG fact-checking effizient" and "SRG fact-checking wirksam" return the same sources.
- The dimension tag is structurally correct (this IS an ambiguous input), but the decomposition went too fine-grained.
- Contract validation does not assess evidence separability — it only checks whether each claim preserves the evaluative meaning and avoids proxy drift.

### 2.3 Shared pattern

Both jobs show: **claims that are linguistically distinct but not independently researchable**. The pipeline treats linguistic distinctness as sufficient grounds for separate claims. It should also require evidence separability — would different sources, methodologies, or evidence types be needed to assess each claim?

---

## 3. Adjudication of Competing Explanations

### 3.1 Recent regression (REJECTED)

The executed base commit `f1e5cc96` is UI-only. The fallback heuristic was introduced on 2026-03-23 (`81150d38`). The same pattern appears in 7/200 recent jobs spanning 2026-03-26 to 2026-03-29, including Bolsonaro and Plastik families. No committed Stage 1 behavioral change in the last 3 days explains this.

### 3.2 Unified duplicate-claim bug (PARTIALLY RIGHT)

b8e6 IS a near-duplicate problem (Werkzeuge ≈ Methoden). But 8640 is NOT — "effizient" and "wirksam" are genuinely different concepts. A duplicate detector would catch b8e6 but miss 8640. The problem is broader than duplicates: it's about **evidence separability**.

### 3.3 Broader Stage 1 independence-validation failure (ACCEPTED)

Both jobs manifest the same missing control: after Pass 2 produces multiple claims, no step validates that those claims are independently evidence-separable. This is the correct framing.

The two sub-cases are:
- **Conjunct splits** (b8e6): Input contains "A und B" and Pass 2 splits into claim-about-A and claim-about-B, where A and B are near-synonyms in context.
- **Evaluative fragmentation** (8640): Input contains "effizient und wirksam" and Pass 2 produces separate claims that cannot attract different evidence.

### 3.4 Pass 2 prompt permissiveness (CONTRIBUTING)

The Pass 2 rules for `single_atomic_claim` say "Return exactly 1 rough claim unless the input explicitly contains a second independent assertion." But the actual extraction rule for Pass 2 at [claimboundary.prompt.md:241-273](apps/web/prompts/claimboundary.prompt.md#L241) produces atomicClaims, not roughClaims. The constraint on single-claim-for-single-input is stated in Pass 1 instructions but may not be consistently enforced in Pass 2's output.

This is a contributing factor for b8e6 (Pass 2 should not have emitted 2 claims for a `single_atomic_claim` input) but does not explain 8640 (where multi-claim output is expected for `ambiguous_single_claim`).

---

## 4. Immediate Failure Layers

### Layer 1: Fallback dimension-tagging heuristic (code, b8e6 only)

**Location:** [claim-extraction-stage.ts:357-360](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L357)

```typescript
const isDimensionInput = activePass2.inputClassification === "ambiguous_single_claim"
  || (activePass2.inputClassification === "single_atomic_claim"  // pre-2.2 fallback
      && filteredClaims.length > 1
      && filteredClaims.every(c => c.centrality === "high" && c.claimDirection === "supports_thesis"));
```

**Problem:** When Pass 2 returns >1 claim for a `single_atomic_claim` input, this heuristic assumes they must be dimension decompositions. But they may be conjunct splits (Werkzeuge/Methoden) or extraction errors. The heuristic was a backward-compat shim for pre-2.2 prompts that did not emit `inputClassification` — now that all prompts do, the fallback is over-broad.

**Impact:** Auto-tagging exempts claims from Gate 1 fidelity filtering, which is the main defense against Pass 2 over-extraction.

### Layer 2: Contract validation blind spot (prompt, both jobs)

**Location:** [claimboundary.prompt.md:283-378](apps/web/prompts/claimboundary.prompt.md#L283)

**Problem:** The CLAIM_CONTRACT_VALIDATION prompt checks:
- Evaluative meaning preservation
- Proxy drift severity
- Neutral dimension qualification

It does NOT check:
- Whether multiple claims are independently falsifiable
- Whether claims are evidence-separable (would research produce different results?)
- Whether a `single_atomic_claim` input should have produced multiple claims at all

For b8e6, it accepted "Werkzeuge" and "Methoden" as separate claims with summary "perfectly preserves the original claim contract." For 8640, it accepted "effizient" and "wirksam" without questioning whether separate research would be feasible.

### Layer 3: Pass 2 over-extraction (prompt, b8e6 primarily)

For `single_atomic_claim`, Pass 2 should emit exactly 1 claim. The input "legen offen welche Fact-Checking-Werkzeuge und Methoden sie benutzen" contains "und" (and) linking two near-synonymous terms — this is a conjunct, not two independent assertions. Pass 2 should not have split it.

This is a Pass 2 prompt quality issue but is less precisely fixable than Layers 1-2 because LLM extraction behavior is stochastic.

---

## 5. Recommended Fix Strategy

### Option A: Only narrow the `single_atomic_claim` fallback (code-only)

**What:** Remove or restrict the fallback condition at line 358-360. When `inputClassification === "single_atomic_claim"`, do NOT auto-tag multi-claim outputs as dimension decompositions. Let Gate 1 fidelity filtering assess them normally.

**Pros:** Directly fixes b8e6. Code-only, no prompt change. Removes a backward-compat shim that is no longer needed.
**Cons:** Does not fix 8640 (where `ambiguous_single_claim` dimension tagging is by design). Does not add evidence-separability validation.

### Option B: Only strengthen CLAIM_CONTRACT_VALIDATION (prompt change)

**What:** Add an evidence-separability check to the contract validation prompt: "For multi-claim extractions, verify that each claim would plausibly require different evidence sources, methodologies, or search queries. If two claims would be answered by the same body of evidence, flag `rePromptRequired=true`."

**Pros:** Addresses both b8e6 and 8640. Uses LLM intelligence per AGENTS.md. Catches the blind spot at the right level (validation, not extraction).
**Cons:** Prompt change requires human approval. Does not remove the over-broad fallback heuristic. Contract validation is a relatively late check — the over-split has already been produced.

### Option C: Both, in sequence (RECOMMENDED)

**Step 1 (code-only):** Remove the `single_atomic_claim` fallback from the dimension-tagging heuristic. This is the narrowest justified change and directly prevents b8e6-class failures without any prompt change.

**Step 2 (prompt change, requires approval):** Strengthen CLAIM_CONTRACT_VALIDATION to check evidence separability for multi-claim outputs. This catches 8640-class failures where the dimension tag is structurally correct but the decomposition is too fine-grained.

**Pros:** Step 1 ships immediately (code-only). Step 2 addresses the deeper issue with proper approval. Each step is independently valuable and testable.
**Cons:** Two-step rollout. Step 2 requires human approval.

### Option D: Broader Pass 2 prompt change first

**What:** Strengthen Pass 2 extraction rules to prevent over-splitting for `single_atomic_claim` and to require evidence-separability reasoning for `ambiguous_single_claim`.

**Pros:** Fixes the problem at the source.
**Cons:** Most invasive option. Prompt change requires approval. Risks destabilizing extraction for all input types, not just the failure cases. Pass 2 quality is inherently stochastic — downstream validation is more reliable than upstream constraint.

### Recommendation: Option C

Step 1 is the smallest justified intervention. Step 2 addresses the contract-validation blind spot that both jobs share. Together they cover both sub-cases without touching Pass 2 extraction or verdict-stage logic.

---

## 6. What NOT to Change

| Item | Why not |
|------|---------|
| Deterministic text-similarity heuristics | Violates AGENTS.md LLM Intelligence mandate — "independently falsifiable" is a semantic judgment |
| Regex/keyword duplicate detection | Same violation — linguistic similarity is not the right signal |
| D5 thresholds | D5 is correctly enforcing diversity — the problem is upstream claim quality |
| Stage 2 search-budget tuning | The evidence starvation is a consequence of over-splitting, not inadequate search |
| Verdict-stage logic | Verdicts are downstream victims of bad claims |
| Pass 2 extraction prompt | Too invasive for the first move. If Steps 1-2 are insufficient, this becomes Step 3. |
| Gate 1 validation prompt | Gate 1 is working correctly — it was bypassed by the dimension tag, not by its own logic |
| `ambiguous_single_claim` dimension-tagging (line 357) | This is correct by design. The problem is not that ambiguous inputs get dimension tags — it's that the decomposition is too fine-grained and contract validation doesn't catch it. |

---

## 7. Implementation Order

### Step 1: Remove `single_atomic_claim` fallback from dimension-tagging (code-only)

**What:** In [claim-extraction-stage.ts:357-360](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L357), remove the second condition of the `isDimensionInput` heuristic:

Before:
```typescript
const isDimensionInput = activePass2.inputClassification === "ambiguous_single_claim"
  || (activePass2.inputClassification === "single_atomic_claim"
      && filteredClaims.length > 1
      && filteredClaims.every(c => c.centrality === "high" && c.claimDirection === "supports_thesis"));
```

After:
```typescript
const isDimensionInput = activePass2.inputClassification === "ambiguous_single_claim";
```

Apply the same change at lines 432-434 and 540-542 (the retry paths).

**Impact:** For `single_atomic_claim` inputs that produce >1 claim (like b8e6), those claims will no longer be auto-tagged as dimension decompositions. They will go through Gate 1 fidelity filtering normally. If Gate 1 rejects one as unfaithful, the pipeline self-corrects. If Gate 1 keeps both, they remain — but without the fidelity exemption.

**Risk:** Low. The fallback was a backward-compat shim for pre-2.2 prompts. All current prompts emit `inputClassification`, so the fallback is no longer needed. The 7 affected jobs in 200 are all Bolsonaro or SRG inputs where the split was arguably harmful.

**Classification:** Code-only bug fix. No prompt change.
**Scope:** 3 locations, ~3 lines each.
**Approval:** Standard code review.

### Step 2: Add evidence-separability check to CLAIM_CONTRACT_VALIDATION (prompt change)

**What:** Add a new rule to the contract validation prompt:

```
9. **Evidence separability (multi-claim outputs only).**
   When the extraction produces multiple claims, assess whether each claim would plausibly
   require different evidence sources, search queries, or methodologies to verify.
   If two or more claims would be answered by substantially the same body of evidence,
   set `rePromptRequired: true` — the claims are not independently researchable and should
   be merged or restructured.
```

Also add a per-claim field to the output schema:
```json
"evidenceSeparable": true
```

**Impact:** For 8640-class failures, contract validation would catch that "effizient" and "wirksam" would be answered by the same evidence and trigger a re-extraction.

**Classification:** Prompt/schema contract change. Requires human approval.
**Scope:** ~10 lines in prompt, ~5 lines in parser.
**Risk:** Low-moderate. The check is conservative (only triggers re-extraction when evidence overlap is substantial). Fail-open: if the LLM says separable, current behavior is preserved.

### Step 3 (conditional): Remeasure and decide further

After Steps 1-2 ship, run 10 validation jobs across SRG, Bolsonaro, Plastik, and Hydrogen families. Measure:
- `single_atomic_claim` multi-claim rate (target: 0%)
- `ambiguous_single_claim` evidence starvation rate for sub-claims (target: <10%)
- No regression on existing controls

If the rates are acceptable, no further change is needed. If `ambiguous_single_claim` still over-fragments, consider a Pass 2 prompt tightening (Step 4).

---

## 8. Validation Plan

### After Step 1 (fallback removal):

| # | Input | Family | Classification | Purpose |
|---|-------|--------|----------------|---------|
| 1 | "Die SRG SSR ... legen offen welche Fact-Checking-Werkzeuge und Methoden..." | SRG DE | single_atomic_claim | Direct reproduction — expect 1 claim |
| 2 | Bolsonaro proceedings input | Bolsonaro | single_atomic_claim (expected) | Regression check — existing multi-claim behavior should still work via `ambiguous_single_claim` |
| 3 | "Plastik recycling bringt nichts" | Plastik DE | single_atomic_claim | Control — should remain 1 claim |

**Success criteria:**
- b8e6 input produces 1 claim (no split on "Werkzeuge und Methoden")
- Bolsonaro still produces 2-3 claims if classified as `ambiguous_single_claim`
- No regression on Plastik DE

### After Step 2 (contract validation):

| # | Input | Family | Classification | Purpose |
|---|-------|--------|----------------|---------|
| 4 | "Die SRG SSR ... setzen moderne ... ein und betreiben ... effizient und wirksam" | SRG DE | ambiguous_single_claim | Direct reproduction — expect "effizient"/"wirksam" to be merged or re-extracted |
| 5 | Bolsonaro proceedings | Bolsonaro | ambiguous_single_claim | Regression — legitimate dimensions should survive |
| 6 | "Using hydrogen for cars is more efficient than using electricity" | Hydrogen | ambiguous_single_claim | Cross-family control |

**Success criteria:**
- 8640 input produces ≤2 claims (efficiency+effectiveness merged into one)
- Bolsonaro dimensions (procedural compliance, fairness) survive as genuinely evidence-separable
- No regression on Hydrogen

---

## 9. Final Judgment

**`Stage-1 decomposition fix justified`**

The two jobs share a family-level root cause: Stage 1 decomposition control is too permissive, and contract validation does not check evidence separability. The fallback dimension-tagging heuristic for `single_atomic_claim` is a backward-compat shim that is no longer needed and directly causes b8e6-class failures. Contract validation's blind spot on evidence separability enables 8640-class failures. Both are fixable with narrow, independently valuable changes.

---

**Recommended next task:** Remove `single_atomic_claim` fallback from dimension-tagging heuristic

**Why this first:** It is a code-only change (~3 lines × 3 locations) that directly prevents the most egregious failure mode — a `single_atomic_claim` input being auto-promoted to dimension decomposition and exempted from Gate 1 fidelity filtering. It removes a backward-compat shim that predates the current prompt's `inputClassification` field and is no longer needed. It ships without prompt approval, can be validated immediately with the b8e6 input, and does not risk destabilizing any other pipeline behavior. The contract-validation evidence-separability check (Step 2) addresses the deeper issue for `ambiguous_single_claim` inputs but requires human approval for the prompt change and should follow once Step 1 is validated.

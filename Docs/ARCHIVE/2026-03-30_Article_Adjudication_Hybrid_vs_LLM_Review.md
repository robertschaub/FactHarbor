# Article Adjudication: Hybrid Clamp vs LLM-Led — Architect Review

**Date:** 2026-03-30
**Role:** Lead Architect / Code Reviewer
**Status:** IMPLEMENTED

---

## 1. Executive Summary

This review's recommended path is now implemented.

The reviewed hybrid model applied two deterministic constraints to the LLM's article-level adjudication output:

1. **Confidence ceiling:** `adjustedConfidence` is capped to the deterministic weighted confidence.
2. **Truth clamp:** `adjustedTruthPercentage` is clamped to `±10pp` of the deterministic weighted truth.

Both constraints are also echoed in the prompt text ("must not exceed," "within ±10pp").

After reviewing these against AGENTS.md's LLM Intelligence mandate and the product intent, my judgment is:

- The **confidence ceiling is a valid structural safeguard** — it enforces the principle that unresolved claims add uncertainty, never remove it. This is a structural invariant about the direction of adjustment, not a semantic judgment about text meaning.
- The **±10pp truth clamp is a semantic analytical constraint** that limits how the LLM may interpret the relationship between assessed and unassessed claims. It determines *how much* the overall truth should shift — an analytical judgment that AGENTS.md assigns to LLM intelligence.

The implemented path is **Option B: remove the truth clamp, keep the confidence ceiling**, with schema validation and deterministic fallback for malformed outputs.

---

## 2. What Was Reviewed vs. What Is Implemented

### Reviewed hybrid code path (superseded)

```typescript
// Confidence ceiling: adjusted must not exceed deterministic
finalConfidence = Math.min(adjConf, effectiveWeightedConfidence);

// Truth bounded: within ±10pp of deterministic baseline
const truthFloor = Math.max(0, weightedTruthPercentage - 10);
const truthCeiling = Math.min(100, weightedTruthPercentage + 10);
finalTruthPercentage = Math.max(truthFloor, Math.min(truthCeiling, adjTruth));
```

### Implemented code path

The live implementation now does this:

```typescript
// Confidence ceiling: adjusted must not exceed deterministic
finalConfidence = Math.min(adjConf, effectiveWeightedConfidence);

// Truth is LLM-led, bounded only by valid range
finalTruthPercentage = Math.max(0, Math.min(100, adjTruth));
```

### Implemented prompt instructions

> - If any direct claims are `UNVERIFIED`, adjust the overall confidence DOWNWARD to reflect the incomplete coverage. The adjusted confidence must NOT exceed the deterministic confidence.
> - `adjustedTruthPercentage` should reflect the assessed evidence basis and the unresolved-claim limitations you identify. Start from the deterministic value and adjust conservatively, but keep the final value grounded in the evidence and the limitations you describe.

### Fallback behavior

When `adjustedTruthPercentage` or `adjustedConfidence` are absent or malformed, the code falls back to the deterministic weighted values. This is correct fail-safe behavior.

### Implemented tests

Two tests in [claimboundary-pipeline.test.ts:5085-5193](apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts#L5085):

1. **Confidence ceiling test:** LLM returns `adjustedConfidence: 95` when deterministic is 68 → result is 68 (capped).
2. **Pure LLM truth test:** LLM returns `adjustedTruthPercentage: 5` when deterministic is 75 → result is 5 (accepted as-is within `0..100`).

Additional tests verify deterministic fallback when adjusted values are absent or malformed.

---

## 3. Policy Assessment

### The AGENTS.md mandate

> Deterministic text-analysis logic that makes analytical decisions MUST be replaced with LLM-powered intelligence.

> **KEEP** (deterministic structural plumbing): Input validation (null/empty, format, length), type coercion, schema guards. ID generation, hashing, normalization, formatting. Routing, retry, timeout, concurrency limits — anything that doesn't interpret meaning.

### Applying the mandate to each constraint

**Confidence ceiling (keep):**

The ceiling enforces: "unresolved claims add uncertainty, never remove it." This is a **structural invariant about the direction of adjustment**, not a judgment about what the evidence means. It is analogous to "D5 requires minimum evidence diversity" — a quality gate, not an analytical decision. The LLM may reduce confidence by any amount; it just cannot increase it beyond what the evidence already supports. This is structural plumbing.

**Truth ±10pp clamp (remove):**

The clamp enforces: "the article truth should not drift far from the weighted claim-level truth." This is an **analytical judgment about how much the overall truth assessment should shift** when some claims are unresolved. Consider:

- If 2 of 3 claims are UNVERIFIED and the one assessed claim is MOSTLY-TRUE at 75%, should the article truth be allowed to drop to 50% because the unresolved claims cover the most important dimension? The ±10pp clamp says no (floor 65%). But this is exactly the kind of interpretive judgment AGENTS.md assigns to LLM intelligence.
- The clamp makes a semantic decision: "the assessed claims are representative of the whole." The LLM may disagree — and should be allowed to.

The prompt already instructs the LLM to "adjust conservatively" and "not drift far from the assessed evidence basis." That is soft guidance, not a hard constraint. The LLM can choose to follow it or justify a larger shift. The deterministic code should not second-guess this.

---

## 4. Option Analysis

### Option A: Keep current hybrid clamp model

**What:** No change. Both constraints remain.
**Pros:** Maximum safety against LLM hallucination in article-level numbers.
**Cons:** The ±10pp clamp makes a semantic analytical decision deterministically. It can suppress legitimate LLM reasoning about unresolved claims. It violates AGENTS.md's LLM Intelligence mandate in spirit.
**Assessment:** Defensible as a safety measure during early development, but not consistent with the project's stated analytical philosophy.

### Option B: Remove truth clamp, keep confidence ceiling (IMPLEMENTED / RECOMMENDED)

**What:**
- Remove the ±10pp truth clamp (lines 233-236).
- Keep the confidence ceiling (lines 228-230).
- Keep schema validation (0-100 range, `Number.isFinite`).
- Keep the deterministic fallback for missing/malformed values.
- Update the prompt to remove the "±10pp" instruction, retaining the "adjust conservatively" guidance as soft guidance.

**Pros:**
- Consistent with AGENTS.md: the confidence ceiling is a structural invariant, the truth adjustment is an LLM analytical decision.
- The LLM already receives the deterministic baseline as input and is instructed to adjust conservatively. Removing the hard clamp lets it exercise judgment when justified.
- The confidence ceiling still prevents the LLM from claiming more certainty than the evidence supports.
- Deterministic fallback remains for malformed output — no risk of garbage numbers.

**Cons:**
- The LLM could in theory produce a wildly divergent truth%. But: (a) it receives the deterministic baseline, (b) it is instructed to adjust conservatively, (c) the prompt instructs it not to override a complete assessment. A wild divergence would indicate a genuine LLM failure, which is better caught by monitoring than by silent clamping.

**Assessment:** Best alignment of structural safeguards with LLM analytical authority.

### Option C: Remove both semantic clamps

**What:** Remove both the truth clamp and the confidence ceiling. Keep only schema validation and deterministic fallback.

**Pros:** Purest LLM-led model. Maximum analytical authority to the LLM.
**Cons:** Removes the structural invariant that "unresolved claims add uncertainty, never remove it." An LLM could return `adjustedConfidence: 95` when deterministic is 68 (as in the test case), claiming high confidence when claims remain unassessed. This violates a product principle, not just a code constraint.
**Assessment:** Goes too far. The confidence ceiling is a valid structural safeguard, not a semantic rule.

### Option D: UCM-configurable clamp range

**What:** Make the ±10pp a UCM parameter (e.g., `articleTruthAdjustmentMaxDelta: 10`) so it can be widened or removed via admin config.

**Pros:** Flexibility without code change.
**Cons:** Still a deterministic semantic constraint — just configurable. Does not resolve the AGENTS.md compliance question. Adds config surface for a constraint that should arguably not exist.
**Assessment:** Pragmatic compromise but philosophically unsatisfying. If the constraint is wrong, removing it is better than making it tunable.

---

## 5. Recommended Path

### Option B: Remove truth clamp, keep confidence ceiling

**Implemented code changes:**

In [aggregation-stage.ts](apps/web/src/lib/analyzer/aggregation-stage.ts), the truth-clamp block was replaced so article truth is now bounded only by valid `0..100` range.

```typescript
if (typeof adjTruth === "number" && Number.isFinite(adjTruth)) {
  finalTruthPercentage = Math.max(0, Math.min(100, adjTruth));
}
```

This keeps schema validation (0-100 range) and `Number.isFinite` guard, but removes the semantic ±10pp clamp.

**Implemented prompt changes:**

In [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md), the explicit `±10pp` instruction was softened to qualitative conservative guidance.

> `adjustedTruthPercentage` should reflect the assessed evidence basis and the unresolved-claim limitations you identify. Start from the deterministic value and adjust conservatively, but keep the final value grounded in the evidence and the limitations you describe.

This retains soft guidance ("adjust conservatively," "stay grounded") without imposing a hard numeric bound.

---

## 6. What Remains Deterministic

| Element | Status | Justification |
|---------|--------|---------------|
| Weighted truth/confidence aggregation from claim verdicts | Keep | Pure arithmetic — no semantic judgment |
| Confidence ceiling (adjusted ≤ deterministic) | Keep | Structural invariant: unresolved claims add uncertainty |
| Schema validation (0-100 range, `Number.isFinite`) | Keep | Input validation per AGENTS.md KEEP list |
| Fallback to deterministic when adjusted values missing | Keep | Fail-safe structural plumbing |
| `percentageToArticleVerdict` label assignment | Keep | Deterministic label mapping from numbers |
| Integrity-downgrade confidence cap (`INSUFFICIENT_CONFIDENCE_MAX`) | Keep | Separate mechanism, not part of this change |
| ±10pp truth clamp | **Remove** | Semantic analytical constraint |

---

## 7. Test Impact

### Tests rewritten

1. **Truth adjustment test** now accepts LLM-provided truth without a deterministic ±10pp clamp.
2. **Confidence ceiling test** still enforces `adjustedConfidence <= deterministicConfidence`.
3. **Malformed-output fallback test** now verifies deterministic fallback when adjusted values fail schema validation.

### Tests unaffected

- Fallback test (absent adjusted values) → unchanged
- All Stage 1-4 tests → unchanged
- D5, matrix, direction validation tests → unchanged

---

## 8. Final Judgment

**`Pure LLM article adjudication justified`**

The ±10pp truth clamp is a deterministic semantic constraint that limits how the LLM may interpret the impact of unresolved claims on the overall truth assessment. This is an analytical decision that AGENTS.md assigns to LLM intelligence. The confidence ceiling is a valid structural safeguard (unresolved claims add uncertainty) and should remain. Schema validation and deterministic fallback protect against malformed output. The recommended path (Option B) cleanly separates structural invariants from analytical decisions.

---

**Implementation outcome:** The deterministic ±10pp truth clamp has been removed. Article truth is now LLM-led within structural `0..100` bounds; confidence remains ceiling-capped to the deterministic baseline. Prompt wording and focused tests were updated accordingly.

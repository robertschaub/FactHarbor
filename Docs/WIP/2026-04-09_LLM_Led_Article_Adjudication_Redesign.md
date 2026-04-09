# Stage-5 Redesign: LLM-Led Article Adjudication

**Date:** 2026-04-09
**Authors:** Lead Architect + LLM Expert (Claude Opus 4.6)
**Status:** **Option G approved by Captain (2026-04-09)** — ready for implementation
**Supersedes:** `Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md` (deterministic dominance path)
**Decision:** Option G — LLM adjudication only on direction conflict; baseline weighted average for same-direction inputs.

---

## 1. Problem Statement

The Rev A dominant-claim implementation introduced a deterministic semantic weighting path in Stage 5:

1. LLM detects whether a dominant claim exists (`CLAIM_DOMINANCE_ASSESSMENT`)
2. Code applies configured multipliers (`strongMultiplier`, `decisiveMultiplier`)
3. Code recomputes article truth/confidence via weighted average math
4. For complete-assessment jobs, narrative truth override is blocked

Steps 2-3 violate the **LLM Intelligence mandate** (AGENTS.md):

> Deterministic text-analysis logic that makes analytical decisions MUST be replaced with LLM-powered intelligence. New deterministic text-analysis decision logic MUST NOT be created.

The multiplier math is not structural plumbing. It is a semantic decision: "how much should this claim's dominance change the article truth?" That is analytical adjudication. It must be LLM-led.

The Rev A plan correctly identified the danger of uncontrolled narrative drift (Swiss sibling drifted from baseline ~61.4 to stored 77). But it solved it with the wrong tool: replacing one semantic decision-maker (LLM narrative) with a worse one (arithmetic with hardcoded multipliers).

**This document presents two design options. Option G was approved.**
- **Option B** (sections 2-4): Full LLM-led adjudication for all inputs. *Not selected.*
- **Option G** (section 5): Narrow-scope — LLM adjudication only when claim directions conflict; baseline math retained for same-direction inputs. **Selected.**

Both options correct the LLM Intelligence violation. Option G was chosen for lower risk, lower cost (~$0.008/job savings vs. current), and structural protection of same-direction families from regression.

---

## 2. Option B — Full LLM-Led Adjudication (All Inputs)

## 2.1 Component Inventory

Each component of the redesign is listed below with:
- **What it is** — brief description
- **Why it exists** — the problem it solves
- **Problematic rating** — how architecturally risky or contentious this component is

### Rating Scale

| Rating | Meaning |
|--------|---------|
| **Low** | Straightforward, well-understood pattern, minimal risk |
| **Medium** | Reasonable but needs careful implementation or calibration |
| **High** | Architecturally contentious, novel, or carries regression risk |

---

## 2.2 Components

### 3.1 Fold `CLAIM_DOMINANCE_ASSESSMENT` into `ARTICLE_ADJUDICATION`

**What:** Replace the separate `CLAIM_DOMINANCE_ASSESSMENT` LLM step and the deterministic multiplier path with a single `ARTICLE_ADJUDICATION` LLM step that both assesses dominance and produces the final article truth.

**Why:** The two-step design (LLM detects dominance -> code applies multipliers) only existed because the plan needed a deterministic consumer of dominance output. With an LLM adjudicator there is no separate consumer — the LLM can assess dominance as part of its reasoning. This also eliminates one LLM call (the dominance step used a verdict-tier model).

**What changes:**
- `assessClaimDominance()` is removed
- `CLAIM_DOMINANCE_ASSESSMENT` prompt section is removed
- `DominanceAssessmentOutputSchema` is removed
- New `assessArticleVerdict()` function and `ARTICLE_ADJUDICATION` prompt section are added
- Dominance assessment output is preserved as a field in the adjudication response

**Problematic: Medium.** The fold itself is clean. The risk is prompt quality — one combined prompt must produce both a reliable dominance assessment and a well-calibrated article truth in a single call. If the prompt proves too complex for a single step, a two-step LLM approach (separate dominance, then adjudication receiving dominance output) remains viable without reintroducing deterministic multipliers.

---

### 3.2 `ARTICLE_ADJUDICATION` Prompt Contract

**What:** A new Stage-5 prompt section that receives per-claim verdicts, the baseline weighted average, original input, contract validation summary, and evidence statistics, and produces the final article truth, confidence, range, dominance assessment, per-claim influence rationale, and overall reasoning.

**Output schema:**
```json
{
  "articleTruthPercentage": 32,
  "articleConfidence": 68,
  "articleTruthRange": { "min": 25, "max": 40 },
  "dominanceAssessment": {
    "mode": "none | single",
    "dominantClaimId": "AC_03",
    "strength": "strong | decisive",
    "rationale": "string"
  },
  "claimWeightRationale": [
    {
      "claimId": "AC_01",
      "effectiveInfluence": "primary | significant | moderate | minor",
      "reasoning": "string"
    }
  ],
  "adjudicationReasoning": "string"
}
```

**Key prompt rules:**
1. Baseline weighted average is provided as a structural anchor — informative, not binding.
2. Assess whether any single claim is semantically decisive for the original input's truth.
3. For multi-dimensional inputs where claims evaluate independent criteria, weight claims according to semantic importance.
4. Article truth must be grounded in per-claim verdicts — the LLM synthesizes relative importance, it does not re-evaluate evidence.
5. Every claim must appear in `claimWeightRationale`.
6. `articleConfidence` must not exceed the highest individual claim confidence.
7. No hardcoded keywords, entity names, or domain-specific categories.

**Why:** This is the core semantic decision-maker. It replaces both the deterministic multiplier math and the uncontrolled narrative override with a structured, auditable LLM step that has explicit rules and a typed output.

**Problematic: High.** This is the highest-risk component. The prompt must:
- Reliably detect dominance across languages without false positives
- Produce calibrated truth percentages that don't regress control families
- Not simply echo the baseline (defeating the purpose)
- Not drift arbitrarily from the baseline (the old narrative problem)
- Produce structured rationale that is genuinely explanatory

Prompt engineering and iterative calibration against the approval set will be the primary work. The deviation cap (3.4) provides a safety net, but the prompt quality determines whether results are *correct*, not just *bounded*.

---

### 3.3 Baseline Weighted Average as Structural Anchor

**What:** The existing deterministic weighted average (centrality, harm, confidence, triangulation, derivative, anchor, probative) continues to be computed. It is passed to the LLM as context and used as the reference point for the deviation cap.

**Why:** The baseline provides a reproducible, explainable starting point. It anchors the LLM's reasoning (preventing unconstrained hallucination) and provides the deviation cap reference. It also serves as the complete fallback when the LLM call fails or the feature is disabled.

**What changes:** Nothing in the baseline computation itself. It simply stops being the final answer for complete-assessment jobs and becomes an input to the LLM.

**Problematic: Low.** This is existing, tested code. No changes to its logic. Its role shifts from "final answer" to "anchor input," which is purely a downstream consumption change.

---

### 3.4 Deviation Cap (Structural Guard)

**What:** A deterministic, UCM-configurable maximum deviation from the baseline weighted average:

```
maxDeviation = config.articleAdjudication.maxDeviationFromBaseline (default: 25)
finalTruth = clamp(llmTruth, baseline - maxDeviation, baseline + maxDeviation)
```

**Why:** This replaces the Rev A's "complete-assessment truth lockdown" with a less absolute but still structural constraint. It prevents the old narrative drift problem (baseline 61 -> stored 77 = 16 point drift, which would be allowed under a 25-point cap; baseline 61 -> stored 95 = 34 point drift, which would be blocked).

The cap is structural, not semantic: it constrains the output range without deciding what the answer should be within that range.

**Configuration:**
```json
{
  "articleAdjudication": {
    "enabled": false,
    "maxDeviationFromBaseline": 30
  }
}
```

No separate unresolved cap. If unresolved same-direction jobs prove problematic, the correct response is a second structural trigger, not cap proliferation (per GPT Lead Architect review).

**Problematic: Medium.** The mechanism itself is simple and clearly structural. The risk is calibration:
- Too tight (e.g., 10) and the LLM cannot correct genuinely wrong baselines — defeating the purpose.
- Too loose (e.g., 40) and drift is barely constrained.
- The 30pp default (revised from 25 per GPT Lead Architect review) allows the Swiss target's ~30 point correction (baseline ~65, correct ~35) without blocking the motivating fix. The 25pp cap risked blocking the exact correction this feature exists to enable.

Calibration against the approval set will confirm whether 30 is the right default.

---

### 3.5 Confidence Ceiling Enforcement

**What:** `articleConfidence` from the LLM is clamped to not exceed the maximum individual claim confidence. Additionally, if any claim has `verdict_integrity_failure`, confidence is capped at `INSUFFICIENT_CONFIDENCE_MAX`.

**Why:** An article cannot be more confident than its most confident component. This is a mathematical invariant, not a semantic judgment. The integrity downgrade is an existing structural safeguard that must be preserved.

**Problematic: Low.** This is an existing guard. No design change, just preserved in the new flow. The confidence ceiling is expressed in the prompt rules (rule 6) so the LLM is guided to comply, and the code enforces it as a backstop.

---

### 3.6 Unified Adjudication Path (No Complete-Assessment Branching)

**What:** Complete-assessment and unresolved-claim jobs follow the same adjudication path:

1. Compute baseline weighted average (deterministic)
2. `ARTICLE_ADJUDICATION` LLM produces article truth (LLM-led)
3. Structural guards applied (deviation cap, confidence ceiling, bounds)
4. `VERDICT_NARRATIVE` explains the result (always explanatory)

The only difference: unresolved-claim jobs use a wider deviation cap (`maxDeviationUnresolved`).

**Why:** The current implementation has two diverging code paths — complete-assessment (truth locked, narrative explanatory) vs. unresolved-claim (narrative can adjust truth). This creates maintenance burden, makes testing harder, and means the narrative's role varies by context. A single path with a configurable deviation cap achieves the same safety guarantee more simply.

**Problematic: Medium.** The simplification is architecturally clean, but it changes the guarantee model:
- **Rev A:** complete-assessment truth is *locked* to deterministic output. No LLM can change it.
- **This design:** complete-assessment truth is *bounded* within deviation cap of deterministic output. LLM can change it within bounds.

This is intentional — the locked model violates LLM Intelligence — but it means the safety argument shifts from "impossible to drift" to "bounded drift." The deviation cap value must be defensible.

---

### 3.7 `VERDICT_NARRATIVE` Becomes Explanatory-Only for All Paths

**What:** Remove `adjustedTruthPercentage` and `adjustedConfidence` from the `VERDICT_NARRATIVE` output schema. The narrative receives the final guarded article truth as input and explains it. It never modifies it.

**Why:** The narrative's dual role (sometimes explanatory, sometimes adjudicatory) was the source of the sibling drift bug. With `ARTICLE_ADJUDICATION` handling all truth decisions, the narrative becomes purely explanatory. This eliminates the entire class of "narrative overrode truth" bugs.

**Prompt changes:**
- Remove the "Article-Level Adjudication" rules section
- Remove `adjustedTruthPercentage` and `adjustedConfidence` from output schema
- Simplify the prompt to focus on headline, keyFinding, limitations, evidenceBaseSummary
- Remove the complete-assessment vs. unresolved-claim branching in the prompt

**Problematic: Low.** This is a pure simplification. The narrative gains clarity of purpose (explain, don't decide), the code loses a branching path, and the output schema shrinks. The only risk is that existing tests reference `adjustedTruthPercentage` — these must be updated.

---

### 3.8 Adjudication Path Audit Trail

**What:** Updated persistence structure recording the full decision chain:

```typescript
interface AdjudicationPath {
  baselineAggregate: { truthPercentage: number; confidence: number };
  llmAdjudication: {
    rawTruthPercentage: number;
    rawConfidence: number;
    dominanceAssessment: {
      mode: "none" | "single";
      dominantClaimId?: string;
      strength?: "strong" | "decisive";
      rationale: string;
    };
    claimWeightRationale: Array<{
      claimId: string;
      effectiveInfluence: "primary" | "significant" | "moderate" | "minor";
      reasoning: string;
    }>;
    adjudicationReasoning: string;
    articleTruthRange?: { min: number; max: number };
  };
  guardsApplied: {
    deviationCapped: boolean;
    confidenceCeiled: boolean;
    integrityDowngraded: boolean;
    boundsClamped: boolean;
  };
  finalAggregate: { truthPercentage: number; confidence: number };
  path: "llm_adjudicated" | "baseline_fallback";
}
```

**Why:** Full reconstructibility. For any stored result, a reviewer can see:
- What the baseline math produced
- What the LLM produced and why (including dominance reasoning)
- Which structural guards fired and changed the result
- What was finally stored

This is strictly more auditable than the Rev A design, which persisted `appliedMultiplier` but not the reasoning behind the LLM's dominance assessment.

**Problematic: Low.** This is additive persistence — no existing data is removed, only richer data is added. The type change is a clean replacement of `DominanceAssessment` with the broader `llmAdjudication` block. The `guardsApplied` block is new and trivially populated from the guard logic.

---

### 3.9 Feature Flag and Config Migration

**What:**
- `dominance.enabled` repurposed as `articleAdjudication.enabled` (boolean, default `false`)
- `dominance.strongMultiplier`, `dominance.decisiveMultiplier`, `dominance.minConfidence` deprecated and removed
- New: `articleAdjudication.maxDeviationFromBaseline` (number, default 30)

**Why:** The multiplier config is meaningless without deterministic multiplier math. The deviation cap config is the new structural knob. Shipping with `enabled: false` allows validation before activation.

**Problematic: Low.** The old config is currently disabled (`enabled: false`) in production. No live system is using the dominance multipliers. The migration is a schema rename with new fields. Config-drift tests will catch any sync issues.

---

### 3.10 LLM Failure Fallback

**What:** If the `ARTICLE_ADJUDICATION` LLM call fails (timeout, parse error, schema violation), fall back to the baseline weighted average. Log the failure. Persist `path: "baseline_fallback"` in the adjudication trail.

**Why:** Fail-open to current behavior. The system must produce a result even when the LLM is unavailable. The baseline is the pre-existing, tested fallback.

**Problematic: Low.** This mirrors the current dominance fallback pattern (if `assessClaimDominance()` returns `undefined`, no dominance is applied). The only change is the fallback context — it now applies to the entire adjudication step, not just dominance detection.

---

## 3. Option B — Deterministic vs. LLM-Led Boundary

| Component | Deterministic | LLM-Led |
|---|---|---|
| Per-claim weighted average (baseline) | Yes | |
| Centrality / harm / triangulation / derivative weights | Yes | |
| Anchor claim multiplier | Yes | |
| **Article-level truth adjudication** | | **Yes (NEW)** |
| **Dominance assessment** | | **Yes (folded into adjudication)** |
| **Claim influence weighting for article truth** | | **Yes (NEW)** |
| Deviation cap from baseline | Yes | |
| Confidence ceiling | Yes | |
| Bounds clamping [0,100] | Yes | |
| Schema validation (Zod) | Yes | |
| Feature flags / config loading | Yes | |
| Verdict label from percentage | Yes | |
| Complete-assessment predicate | Yes | |
| Narrative generation | | Yes (explanatory only) |

---

## 4. Option B — Problematic Summary

| Alternative | Why rejected |
|---|---|
| **Keep current deterministic dominance path (Rev A)** | Violates LLM Intelligence mandate. Multiplier math is a semantic decision. |
| **LLM dominance detection + code multipliers** | Same violation. "Who dominates" is LLM-led but "by how much" is deterministic heuristic. |
| **Unconstrained narrative truth override** | Observed drift: baseline 61 -> stored 77. No structural bound = no production safety. |
| **Separate dominance step + separate adjudication step** | Two LLM calls where one suffices. Dominance detection only existed to feed multiplier math. |
| **No deviation cap (full LLM trust)** | Insufficient production defensibility. Deviation cap provides bounded safety without semantic decision-making. |
| **Per-claim multiplier config alongside LLM** | Two competing semantic decision-makers. Either LLM decides influence or config does. |
| **Drop article verdict entirely (Option A)** | Users expect a single bottom-line answer. Per-claim-only output is a product regression for a fact-checking tool. |
| **Qualitative summary only, no percentage (Option C)** | Most inputs would still map to a 7-band label. Loses sort/rank/compare capability. And the label mapping itself becomes a semantic decision that needs an LLM anyway. |

---

## 5. Option G — Narrow-Scope: LLM Adjudication Only on Direction Conflict

### 5.1 Key Insight

The aggregation problem is not uniform. It depends on whether claim verdicts agree or disagree in direction:

| Claim directions | Current weighted average | Problem? |
|---|---|---|
| All same direction (all true-leaning or all false-leaning) | Produces a directionally correct result | **No** — the math works fine |
| Mixed, no dominant claim (genuinely multi-dimensional) | Produces a defensible middle-ground result | **Minor** — "Mixed" is arguably correct |
| Mixed, with one semantically dominant claim | Produces a directionally wrong result | **Yes — this is the Swiss target problem** |

The weighted average fails specifically when claims disagree in direction AND one claim carries the defining proposition. This is a narrow failure mode. Option G intervenes only in that case.

### 5.2 Architecture Overview

```
Per-claim verdicts (from Stage 4)
        │
        ▼
┌─────────────────────────────────┐
│  Direction conflict check       │  ◄── Deterministic (structural)
│  Are all direct claims          │
│  same direction?                │
└───────┬───────────────┬─────────┘
        │               │
     YES (same)      NO (conflict)
        │               │
        ▼               ▼
  Baseline weighted   ┌─────────────────────────┐
  average IS the      │ ARTICLE_ADJUDICATION     │  ◄── LLM-led
  final truth.        │ (same prompt as Option B │
  No LLM call.        │  but only fires here)    │
        │             └────────────┬──────────────┘
        │                          │
        │                   Structural guards
        │                   (deviation cap, ceiling,
        │                    bounds, fallback)
        │                          │
        ▼                          ▼
   VERDICT_NARRATIVE          VERDICT_NARRATIVE
   (explanatory)              (explanatory)
```

### 5.3 Direction Conflict Detection

This is a **structural** check, not a semantic one. It examines the `claimDirection`, `truthPercentage`, and `confidenceTier` fields that already exist on each verdict.

**Predicate (revised per GPT Lead Architect review — tightened from raw >50/<50):**

```
BORDERLINE_MARGIN = 10  (UCM-configurable)

A direct claim is EXCLUDED from the conflict check when:
  - confidenceTier === "INSUFFICIENT"  (unresolved — direction is unreliable)

A direct claim is "true-leaning" when:
  (claimDirection === "supports_thesis" AND truthPercentage > 50 + BORDERLINE_MARGIN) OR
  (claimDirection === "contradicts_thesis" AND truthPercentage < 50 - BORDERLINE_MARGIN)

A direct claim is "false-leaning" when:
  (claimDirection === "supports_thesis" AND truthPercentage < 50 - BORDERLINE_MARGIN) OR
  (claimDirection === "contradicts_thesis" AND truthPercentage > 50 + BORDERLINE_MARGIN)

A direct claim is "borderline" when:
  truthPercentage is within [50 - BORDERLINE_MARGIN, 50 + BORDERLINE_MARGIN]
  (i.e., between 40 and 60 with default margin of 10)

Direction conflict exists when at least one non-excluded claim is true-leaning
AND at least one non-excluded claim is false-leaning.

Borderline claims do NOT contribute to conflict detection — they are
directionally ambiguous and should not trigger the LLM path.

INSUFFICIENT claims are excluded entirely — their direction is unreliable
and should not influence the gate decision.
```

This is analogous to the `isCompleteAssessment` predicate already in the code — a structural classification based on existing typed fields, not a semantic judgment about text meaning.

**Why this is not a semantic heuristic:** The check reads `claimDirection` (assigned by Stage 1), `truthPercentage` (assigned by Stage 4), and `confidenceTier` (assigned by Stage 4). All are outputs of prior LLM steps. The conflict check itself is a boolean comparison of existing structured data with a configurable margin, not text interpretation.

**Review note (GPT Lead Architect, 2026-04-09):** The original formulation using raw `>50 / <=50` was too brittle — a 51 vs. 49 split would spuriously fire the LLM. The borderline margin prevents noisy triggering. INSUFFICIENT claims are excluded because their direction signal is unreliable and should not gate the adjudication path.

### 5.4 Components

#### G.1 Direction Conflict Predicate

**What:** A deterministic function that examines per-claim verdicts and returns `true` when direct claims disagree in direction.

**Why:** Gates whether the LLM adjudication step fires. When claims agree, the baseline weighted average is already directionally correct and no LLM intervention is needed.

**Problematic: Low.** This is a boolean comparison on typed fields. No text analysis, no semantic judgment. Comparable to the existing `isCompleteAssessment` predicate.

---

#### G.2 `ARTICLE_ADJUDICATION` Prompt (Conflict Path Only)

**What:** Same prompt contract as Option B (section 2.2, component 3.2), but it only fires when the direction conflict predicate is `true`. The prompt receives the same inputs (per-claim verdicts, baseline, original input, contract validation) and produces the same structured output (article truth, confidence, dominance assessment, claim rationale).

**Why:** The semantic adjudication is needed precisely when claims pull in opposite directions and the math cannot decide which matters more. This is the narrow case where LLM intelligence adds value over arithmetic.

**Problematic: Medium.** (Downgraded from High in Option B.) The prompt is identical, but the risk is lower because:
- It only fires for direction-conflict cases, not all inputs
- Same-direction families (many controls) never hit the prompt, so they cannot regress
- The calibration surface is smaller: only mixed-direction families in the approval set need validation

---

#### G.3 Baseline Weighted Average (Same-Direction Path)

**What:** When all direct claims agree in direction, the existing deterministic weighted average is the final article truth. No LLM adjudication. No deviation cap needed. The existing code path is unchanged.

**Why:** The weighted average already produces correct results for same-direction inputs. Adding an LLM step would introduce variance with no upside, and cost an LLM call for no reason.

**Problematic: Low.** This is the current production behavior, preserved exactly. Zero regression risk for same-direction inputs.

---

#### G.4 Deviation Cap (Conflict Path Only)

**What:** Same mechanism as Option B (section 2.2, component 3.4). Only applied on the conflict path after the LLM produces its adjudication. Same UCM config, default 30pp.

**Why:** Even on the conflict path, the LLM output must be structurally bounded. The deviation cap prevents the observed drift problem (baseline 61 -> stored 77).

**Problematic: Medium.** Same calibration risk as Option B, but mitigated by the narrower scope: the cap only needs to be correct for mixed-direction cases.

---

#### G.5 Narrative Simplification

**What:** Same as Option B: remove `adjustedTruthPercentage` from `VERDICT_NARRATIVE`. Narrative is always explanatory, regardless of which path produced the article truth.

**Why:** Whether the truth came from the baseline math (same-direction) or the LLM adjudication (conflict), the narrative should explain it, not override it. This eliminates the narrative drift bug class entirely.

**Problematic: Low.** Identical to Option B component 3.7.

---

#### G.6 Adjudication Path Audit Trail

**What:** Updated persistence that records which path was taken:

```typescript
interface AdjudicationPath {
  baselineAggregate: { truthPercentage: number; confidence: number };
  directionConflict: boolean;  // ◄── NEW: records the gate decision
  llmAdjudication?: {          // only present when directionConflict=true
    rawTruthPercentage: number;
    rawConfidence: number;
    dominanceAssessment: { ... };
    claimWeightRationale: Array<{ ... }>;
    adjudicationReasoning: string;
    articleTruthRange?: { min: number; max: number };
  };
  guardsApplied?: {            // only present when directionConflict=true
    deviationCapped: boolean;
    confidenceCeiled: boolean;
    integrityDowngraded: boolean;
    boundsClamped: boolean;
  };
  finalAggregate: { truthPercentage: number; confidence: number };
  path: "baseline_same_direction" | "llm_adjudicated" | "baseline_fallback";
}
```

**Why:** Adds `directionConflict` as a first-class audit field. A reviewer can see immediately whether the LLM path was even considered. For same-direction jobs, the audit trail is minimal (baseline = final, no LLM output). For conflict jobs, it has the full LLM reasoning chain.

**Problematic: Low.** Additive persistence. The `directionConflict` field is a trivially derived boolean.

---

#### G.7 Config Shape

**What:**
```json
{
  "articleAdjudication": {
    "enabled": false,
    "maxDeviationFromBaseline": 30,
    "borderlineMargin": 10
  }
}
```

No separate unresolved cap. The conflict predicate (with INSUFFICIENT exclusion) already handles unresolved claims: they are excluded from the direction check, so they don't spuriously trigger the conflict path. If unresolved same-direction jobs prove problematic, the correct response is a second structural trigger, not cap proliferation (per GPT Lead Architect review).

**Why:** Simpler config than Option B. One flag, one cap, one margin. The conflict predicate is the natural gate.

**Problematic: Low.** Fewer config fields than Option B. Less calibration surface.

---

#### G.8 Complete-Assessment Interaction

**What:** The `isCompleteAssessment` predicate remains but its role changes. Under Option G:

- Same-direction + complete-assessment: baseline math, no LLM, narrative explanatory. Identical to current behavior.
- Same-direction + unresolved: baseline math, no LLM, narrative explanatory. *(Change: narrative can no longer override truth.)*
- Conflict + complete-assessment: LLM adjudication, deviation cap, narrative explanatory.
- Conflict + unresolved: LLM adjudication, deviation cap, narrative explanatory.

The branching simplifies to one decision (direction conflict?) instead of the current two-axis matrix (complete-assessment? + dominance?).

**Why:** The complete-assessment predicate was the hinge for the Rev A truth lockdown. Under Option G, the direction conflict predicate is a better hinge because it targets the actual failure mode. Complete-assessment still matters for confidence gating but no longer drives the truth path.

**Problematic: Medium.** The change that same-direction unresolved-claim jobs lose their narrative truth override is a behavior change. Currently, `VERDICT_NARRATIVE` can adjust truth for these jobs. Under Option G, it cannot. This is intentional (narrative-as-adjudicator is the bug), and the GPT Lead Architect review confirmed there is no validated case where the old narrative override was demonstrably "correctly compensating" for a same-direction unresolved baseline. The old narrative path was too uncontrolled to treat as ground truth. **If validation later finds a real same-direction unresolved distortion pattern, the fix is a second structural trigger (e.g., based on unresolved-coverage severity), NOT restoring free-form narrative truth override.**

### 5.5 Deterministic vs. LLM-Led Boundary (Option G)

| Component | Deterministic | LLM-Led |
|---|---|---|
| Per-claim weighted average (baseline) | Yes | |
| Direction conflict detection | Yes | |
| **Article truth (same-direction)** | **Yes** | |
| **Article truth (conflict)** | | **Yes** |
| Deviation cap | Yes | |
| Confidence ceiling | Yes | |
| Bounds clamping | Yes | |
| Schema validation | Yes | |
| Feature flags / config | Yes | |
| Verdict label from percentage | Yes | |
| Narrative generation | | Yes (explanatory only) |

### 5.6 Option G — Problematic Summary

| Component | Rating | Explanation |
|---|---|---|
| G.1 Direction conflict predicate | Low | Boolean comparison on existing typed fields (`claimDirection`, `truthPercentage`, `confidenceTier`). Tightened per review: borderline margin (default 10pp) prevents spurious triggering on noisy 51-vs-49 splits; INSUFFICIENT claims excluded from the gate. Analogous to the existing `isCompleteAssessment` predicate. No text analysis. |
| G.2 ARTICLE_ADJUDICATION prompt | Medium | Same prompt as Option B but fires only for conflict cases. Narrower calibration surface — same-direction families cannot regress. Risk is concentrated on mixed-direction families (Swiss, hydrogen). |
| G.3 Baseline for same-direction | Low | Current production behavior, preserved exactly. Zero regression risk. Zero LLM cost. |
| G.4 Deviation cap | Medium | Same mechanism as Option B, but only fires on the conflict path. Default raised to 30pp per review (25pp risked blocking the motivating Swiss fix). Calibration is simpler because it only needs to be correct for mixed-direction cases. |
| G.5 Narrative simplification | Low | Same as Option B. Pure simplification. |
| G.6 Audit trail | Low | Additive persistence with `directionConflict` gate field. |
| G.7 Config shape | Low | Simpler than Option B — one flag, one cap, no unresolved-claim cap. |
| G.8 Complete-assessment interaction | Medium | Same-direction unresolved-claim jobs lose narrative truth override. No validated case of correct compensation exists (confirmed by review). If a real pattern emerges, add a second structural trigger — do not restore narrative override. |

**Overall design risk: Low-Medium.** Lower than Option B because the highest-risk component (the LLM prompt) fires for fewer cases and same-direction families are structurally protected from regression.

---

## 6. Option B vs. Option G — Comparison

| Dimension | Option B (Full LLM Adjudication) | Option G (Conflict-Only Adjudication) |
|---|---|---|
| **Scope of change** | All multi-claim inputs go through LLM adjudication | Only direction-conflict inputs go through LLM adjudication |
| **LLM cost** | +1 LLM call per job (verdict-tier model) | +1 LLM call only for conflict jobs (estimated ~30-40% of inputs) |
| **Regression surface** | All families — any input could regress | Only conflict families — same-direction families structurally protected |
| **Prompt calibration** | Must calibrate for all input types | Must calibrate only for conflict cases |
| **Code complexity** | Unified path (simpler branching) | Two paths (conflict vs. same-direction), but each path is simpler |
| **LLM Intelligence compliance** | Full compliance — all article truth is LLM-led | Compliant — deterministic math only fires when it produces correct results (same-direction); LLM handles the semantic cases |
| **Same-direction behavior** | Changes (LLM adjudication replaces baseline) | Unchanged (baseline math preserved) |
| **Swiss target fix** | Yes | Yes |
| **Config complexity** | 2 fields (enabled, cap) | 3 fields (enabled, cap, borderlineMargin) |
| **Overall risk** | Medium | Low-Medium |
| **Confidence in correctness** | Depends on prompt quality for all inputs | Same-direction: proven. Conflict: depends on prompt quality for subset. |

**Key trade-off:** Option B is architecturally purer (all article truth is LLM-led). Option G is pragmatically safer (don't fix what isn't broken; focus the LLM on the cases that need it).

**LLM Intelligence mandate assessment for Option G:** The direction conflict check is structural plumbing (boolean comparison of typed fields), not a semantic decision. It decides *whether* to invoke the LLM, not *what the LLM should conclude*. When the LLM is not invoked, the deterministic path produces a directionally correct result by definition (all claims agree). This is analogous to the efficiency mandate in AGENTS.md: "Pre-filter before calling. Trivial validation stays deterministic."

---

## 7. GPT Lead Architect Review Findings (2026-04-09)

**Reviewer:** Lead Architect (GPT / Codex)
**Verdict:** Option G is sound, with four required tightenings before implementation.

| # | Finding | Resolution | Status |
|---|---|---|---|
| 1 | Direction conflict predicate too brittle — raw `>50 / <=50` will spuriously fire on noisy borderline claims | Added `borderlineMargin` (default 10pp): claims within [40,60] are treated as non-directional. INSUFFICIENT claims excluded from the gate entirely. | **Incorporated** in 5.3 |
| 2 | Deviation cap default 25pp risks blocking the motivating Swiss target fix (~30pp correction needed) | Raised default to 30pp. Removed separate unresolved cap — if unresolved jobs prove problematic, add a second structural trigger, not cap proliferation. | **Incorporated** in G.4, G.7 |
| 3 | Narrative truth override removal — is it safe for same-direction unresolved-claim jobs? | Reviewer confirmed: no validated case where the old narrative override was correctly compensating. The old path was too uncontrolled to treat as ground truth. If a real pattern emerges, add a structural trigger — do not restore narrative override. | **Incorporated** in G.8 |
| 4 | One combined LLM step or two? | Reviewer confirmed: one combined `ARTICLE_ADJUDICATION` step is correct for v1. Separate dominance call only justified if it materially improves calibration. | **No change needed** |
| 5 | Uncovered edge cases: (a) borderline mixed claims near 50, (b) INSUFFICIENT claims treated as directional, (c) same-direction unresolved with high-centrality unresolved claim, (d) policy question: does Captain require ALL article truth to be non-deterministic? | (a) addressed by borderlineMargin, (b) addressed by INSUFFICIENT exclusion, (c) residual risk accepted — monitor in validation, (d) Captain confirmed Option G is acceptable — same-direction deterministic path is fine. | **Addressed** |

**Reviewer's net assessment:** "Option G is sound only if the conflict predicate is tightened before implementation." All tightenings have been incorporated.

---

## 8. Migration Path (Option G)

Since dominance is currently `enabled: false`, migration is clean:

### Phase 1 — Preparation (no behavior change)
1. Add baseline `aggregateAssessment()` unit tests (Track A1, still needed)
2. Add typed `ArticleAdjudication` and updated `AdjudicationPath` to `types.ts`
3. Add `articleAdjudication` config schema (with `enabled: false`, `maxDeviationFromBaseline: 30`, `borderlineMargin: 10`)
4. Update `calculation.default.json`
5. Implement direction conflict predicate with borderline margin and INSUFFICIENT exclusion

### Phase 2 — New LLM Adjudication Step
6. Write `ARTICLE_ADJUDICATION` prompt section
7. Implement `assessArticleVerdict()` function
8. Wire into `aggregateAssessment()` behind `enabled` flag — call only when direction conflict predicate is true
9. Apply structural guards (deviation cap 30pp, confidence ceiling, bounds)
10. Update `AdjudicationPath` persistence with `directionConflict` field

### Phase 3 — Narrative Simplification
11. Remove `adjustedTruthPercentage` from `VERDICT_NARRATIVE` output
12. Make narrative always explanatory (remove complete-assessment vs. unresolved branching)
13. Update prompt contract tests

### Phase 4 — Cleanup
14. Remove old dominance code (`assessClaimDominance()`, multiplier path, `CLAIM_DOMINANCE_ASSESSMENT` prompt)
15. Remove old config fields (`dominance.*`)
16. Update config-drift tests

### Phase 5 — Validation
17. Run approval set with `enabled: true`
18. Compare baseline (flag off) vs. adjudicated (flag on)
19. Verify deviation cap behavior on edge cases
20. Verify same-direction families produce byte-identical article truth with flag on vs. off
21. Verify borderline-margin prevents spurious triggering on near-50 claims

---

## 9. Promotion / Validation Criteria

**Must pass before flag flip:**
- All approval-set families within tolerance bands
- Swiss target `11a8f75c` directionally correct (false-leaning when decisive claim is false)
- Swiss sibling `67a3d07d` shows no uncontrolled drift
- Plastic `70a3963c` stable within tolerance
- Bolsonaro `173ccb84` stable within tolerance
- Hydrogen `a0c5e51e` improves
- No family regresses by more than 5 percentage points vs. flag-off baseline
- Deviation cap fires correctly on synthetic edge case
- Borderline margin prevents spurious triggering (test with claims at 49, 51)
- INSUFFICIENT claims do not influence direction conflict gate
- LLM failure falls back to baseline weighted average
- Prompt contract test passes
- Same-direction families produce byte-identical article truth with flag on vs. off

**Must pass before old code removal (Phase 4):**
- At least one full validation run with flag on
- Config migration documented
- No references to removed types/functions remain

---

## 10. Recommendation

**The agent team recommends Option G.**

Rationale:

1. **Narrowest correct fix.** The aggregation problem only manifests when claims disagree in direction. Option G targets exactly that case. Option B redesigns the path for all inputs, including the ones that already work.

2. **Lower risk.** Same-direction families are structurally protected — they cannot regress because the LLM adjudication never fires for them. This shrinks the calibration and validation surface significantly.

3. **Lower cost.** The LLM adjudication call is skipped for same-direction inputs. Based on the approval set, roughly 60-70% of inputs have same-direction claims.

4. **Proven math is preserved.** The weighted average for same-direction inputs is tested, stable, and correct. Replacing it with an LLM call introduces variance with no upside.

5. **LLM Intelligence compliant.** The direction conflict check is structural (boolean comparison of typed fields), not semantic. The LLM handles every case where semantic judgment is actually needed.

6. **Simpler config.** Two fields instead of three. The direction conflict predicate is a natural gate that eliminates the need for a separate unresolved-claim deviation cap.

7. **Easier to validate.** The "same-direction families are unchanged" test is a trivial identity check. Only conflict families need active validation.

If Option G proves insufficient in practice (e.g., same-direction inputs where the LLM should still intervene — no concrete case exists today), it can be widened to Option B by removing the direction conflict gate. The reverse (narrowing B to G) would be harder.

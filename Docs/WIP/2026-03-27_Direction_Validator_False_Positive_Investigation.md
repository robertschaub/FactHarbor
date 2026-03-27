# Direction Validator False Positive — Investigation and Fix Proposal

**Date:** 2026-03-27
**Role:** Senior Developer + LLM Expert consultation
**Status:** REVIEW-READY (Rev 2) — requires Captain/Architect approval before implementation
**Trigger:** Job `b5f29c58`, claim AC_03 safe-downgraded from truth=65% to truth=50%/confidence=24 (UNVERIFIED)

---

## 1. Executive Summary

A verdict integrity safe downgrade was triggered by two independent failures in sequence: (1) the **LLM direction validator** flagged AC_03's truth=65% as inconsistent with 4/5 contradicting cited evidence, then (2) the **deterministic plausibility rescue** (`isVerdictDirectionPlausible`) also failed to save the verdict because the weighted ratio (0.217) fell below Rule 2's 0.3 threshold.

The first-order problem is the LLM direction validator. The rescue hatch is a secondary failure. Both systems share the same underlying limitation: they judge direction by counting `claimDirection` labels without assessing evidence quality, scientific consensus, or independence.

**Proposed fix:** Strengthen the rescue hatch by granting stable self-consistency an override — but with the corrected understanding that this bypasses an LLM validation stage (not just an arithmetic check), and that self-consistency here reflects advocate-side stability (not full-pool consensus).

---

## 2. The Incident — Corrected Flow

**Input:** "Homeopathy does not work for animals"

**Claim AC_03:** "Homeopathic remedies do not have a biochemically plausible mechanism of action in animals"

**What the debate produced:**
- truth=65% (LEANING-TRUE) — mostly supported by mainstream science
- Self-consistency: [68, 65, 68], spread=3 — stable across 3 advocate-side reruns

**Step 1 — LLM direction validator flags the verdict** (`verdict-stage.ts:1067-1089`):
The `VERDICT_DIRECTION_VALIDATION` prompt receives the verdict's `truthPercentage` (65%), its `supportingEvidenceIds` (1 item), `contradictingEvidenceIds` (4 items), and the evidence pool with `claimDirection` labels. Per its prompt rules: "High Truth Percentage (60-100%): Consistent if the majority of cited evidence is marked as `supports`." The majority is `contradicts` (4/5), so the validator flags it.

**LLM validator output:** *"Truth percentage 65% (high/mixed range) but 4 of 5 cited evidence items contradict the claim (80% contradicting evidence). Expected lower truth percentage (40-60% range) or more supporting evidence for 65% verdict."*

**Step 2 — Deterministic rescue fails** (`verdict-stage.ts:1121`):
`isVerdictDirectionPlausible()` computes weighted ratio = 1.0 / (1.0 + 3.6) = 0.217. All three rules fail (see Section 4). The rescue does not save the verdict.

**Step 3 — Repair prompt runs** (`verdict-stage.ts:1137-1144`):
`attemptDirectionRepair()` produces a repaired verdict at truth=48%.

**Step 4 — Repaired verdict re-validated** (`verdict-stage.ts:1147-1155`):
Both the LLM re-validation and the plausibility rescue fail again (ratio unchanged at 0.217).

**Step 5 — Safe downgrade** (`verdict-stage.ts:1158`):
truth=50%, confidence capped to 24 (UNVERIFIED).

---

## 3. Evidence Analysis

| ID | Direction | Probative | Source | Content |
|----|-----------|-----------|--------|---------|
| EV_019 | **supports** | **high** | Wikipedia | "Homeopathic remedies are typically biochemically inert, and have no effect on any known disease" |
| EV_..677 | contradicts | medium | PMC3570304 | Nanoparticle mechanism proposal |
| EV_..678 | contradicts | medium | PMC3570304 | Hormesis response proposal |
| EV_..679 | contradicts | medium | PMC8207273 | Beyond-Avogadro properties claim |
| EV_..680 | contradicts | medium | PMC8207273 | Homeopathic drug dilution effects |

The `claimDirection` labels are correct: the 4 items DO contradict the claim (they propose mechanisms where the claim says none exists). But the debate correctly assessed these as fringe proposals from contested papers that do not outweigh mainstream consensus.

Both the LLM validator and the deterministic rescue treat `claimDirection` counts as proxies for how much the evidence collectively supports or contradicts the verdict. Neither reads the evidence content to assess that the 4 contradicting items are from fringe research with contested conclusions.

---

## 4. Root Cause: Two-Layer Failure

### Layer 1 — LLM direction validator (primary)

The `VERDICT_DIRECTION_VALIDATION` prompt is explicitly a **count-based check**: "High Truth Percentage (60-100%): Consistent if the majority of cited evidence is marked as `supports`." With 1/5 supporting, the validator correctly follows its instructions and flags truth=65%.

The prompt does say "Flag only clear mismatches" and "Minor discrepancies should NOT be flagged." But 1 supporting vs 4 contradicting at truth=65% is not a minor discrepancy by the prompt's own rules — it's a clear count-based mismatch. The LLM validator is doing exactly what it was told.

**The prompt cannot express the nuance that quality/consensus should outweigh count.** Its input includes `claimDirection` labels but not evidence quality assessment, scientific consensus context, or source independence information.

### Layer 2 — Deterministic rescue (secondary)

`isVerdictDirectionPlausible()` was designed to catch LLM validator false positives. It uses `probativeValueWeights` {high: 1.0, medium: 0.9, low: 0.5} to compute a weighted ratio. But the 10% gap between high and medium provides almost no differentiation:

- Weighted ratio: 1.0 / (1.0 + 4×0.9) = 0.217
- Rule 2 requires ratio in [0.3, 0.7] for mixed verdicts → 0.217 < 0.3 → FAIL
- Rule 3 tolerance: |0.217 - 0.65| = 0.433 >> 0.15 → FAIL

The rescue hatch fails for the same reason the LLM validator fails: it counts items (with near-identical weights) instead of assessing quality.

---

## 5. Architectural Context

### What self-consistency actually measures

Self-consistency in this pipeline runs **2 extra advocate-prompt reruns** at elevated temperature over the **advocate-side evidence partition** (`verdict-stage.ts:657, 705`). The resulting spread measures whether the advocate reasoning is stable under temperature variation — it does NOT measure whether the reconciled verdict is correct against the full evidence pool.

A verdict can be **stably wrong** if the advocate consistently misinterprets the evidence partition. Self-consistency is a useful signal but not proof of correctness.

### What the direction validator checks

The LLM direction validator checks the **reconciled verdict** against the **full evidence pool** (`verdict-stage.ts:1077`), including both advocate and challenger evidence. It is an independent validation stage — not a shallow arithmetic check — that operates at a different level than self-consistency.

### The real tension

The debate reads evidence content and applies analytical judgment (quality, consensus, independence). The direction validator (both LLM and deterministic layers) checks label-count consistency. When the debate makes a legitimate quality-over-quantity call, the direction validator cannot distinguish this from a hallucination.

---

## 6. Options Evaluated

| Option | Fixes this case? | Risks | Complexity | Recommended? |
|--------|:---:|--------|:---:|:---:|
| **(a) Steeper probativeValue weights** | Marginally (medium≤0.5 needed) | Changes Stage 5 aggregation; weights serve dual purpose | Low | No — coupling risk |
| **(b) Use full evidence pool instead of cited items** | No (same ratio) | Changes validator semantics | Medium | No — doesn't help |
| **(c) Lower Rule 2 threshold (0.3 → 0.2)** | Yes | Permits more direction violations | Low | Possible secondary |
| **(d) Self-consistency rescue boost** | Yes | Bypasses LLM validation stage for stable verdicts | Low | **Possible primary — see caveats** |
| **(e) Advisory-only validator** | Yes | Loses hallucination protection | Low | No — too broad |
| **(f) Source URL deduplication** | Partially | Penalizes comprehensive sources | Low | No — wrong model |
| **(g) Improve direction validator prompt** | Possibly | Prompt engineering fragility | Medium | **Worth exploring** |

---

## 7. Proposed Fix: Two-Part Approach

### Part 1 (primary): Self-Consistency Rescue Boost

**Corrected framing:** This is a change to the rescue hatch behavior, not a bypass of the LLM direction validator. When the LLM validator flags an issue and `isVerdictDirectionPlausible()` runs as the rescue, a stable self-consistency result should count as additional evidence that the verdict is intentional.

**Mechanism:** In `isVerdictDirectionPlausible()`, if `verdict.consistencyResult.stable === true` AND `verdict.consistencyResult.assessed === true`, return `true` as an early exit.

**Implementation note:** `ConsistencyResult.stable` is already a pre-computed boolean set at `verdict-stage.ts:755` using the spread thresholds. No need to pass thresholds into the function — just read the boolean.

**Caveats the reviewer identified:**
- This bypasses an independent LLM validation stage, not just an arithmetic check — the behavioral change is larger than "tweaking a heuristic"
- Self-consistency measures advocate-side stability, not full-pool correctness
- A verdict can be stably wrong if the advocate has a systematic bias

**Mitigations:**
- The LLM direction validator warning still fires (info-level) — the issue is logged even when rescued
- Grounding check runs independently and is not affected
- Only the enforcement (safe downgrade) is prevented, not the diagnostic signal
- The rescue only applies to `verdictDirectionPolicy: "retry_once_then_safe_downgrade"` — if set to `"disabled"`, none of this code path runs

### Part 2 (optional): Rule 2 Threshold Adjustment

**Corrected:** The 0.3 threshold in Rule 2 is **hardcoded** at `verdict-stage.ts:1330`, not UCM-configurable. Making it configurable would require adding a new UCM parameter or extracting it into `CalcConfig`.

**Two sub-options:**
- **(c1)** Lower the hardcoded threshold from 0.3 to 0.2 — simple code change, no config
- **(c2)** Extract to UCM as `directionMixedEvidenceFloor` — more flexible but adds config surface

Not recommended as the sole fix — it's a tuning band-aid that doesn't address the structural limitation.

---

## 8. Open Question from Reviewer

> I would want to see the actual `VERDICT_DIRECTION_VALIDATION` failure text for `b5f29c58` before approving any immunity rule.

**Answer (now included in Section 2):**

The LLM direction validator output was: *"Truth percentage 65% (high/mixed range) but 4 of 5 cited evidence items contradict the claim (80% contradicting evidence). Expected lower truth percentage (40-60% range) or more supporting evidence for 65% verdict."*

This confirms the LLM validator is doing count-based direction checking as its prompt instructs. The false positive originates at the LLM validation layer, not just the rescue hatch. An alternative fix path would be to improve the `VERDICT_DIRECTION_VALIDATION` prompt to consider evidence quality signals — but this introduces prompt engineering risk and may destabilize the validator's behavior on other claims where count-based checking is correct.

---

## 9. Questions for Reviewer (Revised)

1. **Approve the self-consistency rescue boost** — with the corrected understanding that this changes rescue behavior after a failed LLM validation, not just a heuristic bypass?
2. **Is the advocate-side stability caveat acceptable?** Should we require a higher bar (e.g., spread ≤ 3 instead of ≤ 5) for the rescue to activate?
3. **Should Rule 2's 0.3 threshold be extracted to UCM** (`directionMixedEvidenceFloor`) for future tuning flexibility?
4. **Is the direction validation prompt itself worth revisiting?** Adding quality/consensus awareness to the prompt is a separate track but addresses the first-order failure.

---

## 10. Appendix: Exact Code Path

**File:** `apps/web/src/lib/analyzer/verdict-stage.ts`

- LLM direction validation call: lines 1067-1089
- LLM validator flags issue: line 1118
- Deterministic rescue (`isVerdictDirectionPlausible`): line 1121
- Rescue failure → repair: lines 1133-1144
- Repair re-validation: lines 1147-1155
- Safe downgrade: line 1158
- `isVerdictDirectionPlausible()` rules: lines 1281-1339
  - Rule 2 (0.3 threshold): line 1330 — **hardcoded, not UCM**
- `ConsistencyResult.stable` assignment: line 755 — **already a boolean**
- Self-consistency runs on advocate partition: lines 657, 705

**Prompt:** `claimboundary.prompt.md` section `VERDICT_DIRECTION_VALIDATION` (line 1180)

**Weights:** `calculation.default.json` — `probativeValueWeights: { high: 1.0, medium: 0.9, low: 0.5 }`

---

*Rev 2: Corrected per architect review findings. Reframed from "deterministic heuristic override" to "two-layer validation failure with rescue boost proposal." Implementation details corrected.*

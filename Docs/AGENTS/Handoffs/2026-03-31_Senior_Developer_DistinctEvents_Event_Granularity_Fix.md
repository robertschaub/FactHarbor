# DistinctEvents Event Granularity — Prompt Fix

**Date:** 2026-03-31
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)

---

## 1. Executive Summary

Implemented the approved prompt-only fix for `distinctEvents` event granularity in Stage 1. Two coordinated changes in `claimboundary.prompt.md` replace conflicting old guidance that (a) encouraged one AtomicClaim per collection instance and (b) explicitly included milestone-style temporal episodes as valid `distinctEvents` entries.

The fix steers multi-proceeding inputs toward peer-level event extraction (e.g., STF trial + TSE electoral proceeding) instead of lifecycle milestones of the most prominent proceeding. Lifecycle preservation is maintained for single-process chronology inputs.

No code changes. No new validation/repair steps. Prompt-only.

---

## 2. What Changed

### Change 1: Plurality override — AtomicClaim inflation prevention

**File:** `apps/web/prompts/claimboundary.prompt.md`, line 136

**Old wording (replaced):**
> "Decompose into one atomic claim per explicitly named or clearly implied distinct instance, applying the same per-instance atomicity as for single-instance inputs."

**New wording:**
> "However, do NOT automatically create one AtomicClaim per instance in the collection. Keep direct claims broad — the collection-level assertion IS the claim. Represent per-instance coverage primarily through `distinctEvents`, not by inflating the AtomicClaim count. Multiple `distinctEvents` do not by themselves require multiple AtomicClaims. Only create separate AtomicClaims when the input explicitly asks to assess each instance on a genuinely different evaluative dimension."

**Also updated:** The question-type exception (line 169) now adds "Per-instance coverage goes into `distinctEvents`, not extra AtomicClaims."

### Change 2: DistinctEvents Include rules — milestone replacement + granularity rule

**File:** `apps/web/prompts/claimboundary.prompt.md`, lines 204-209

**Old wording (replaced):**
```
- Multiple proceedings or trials by the jurisdiction's own institutions.
- Temporal episodes of the same phenomenon (e.g., "2022 trial" and "2024 appeal").
```

**New wording:**
```
- Multiple proceedings or decisions by different bodies or in different domains within the jurisdiction.
- Temporal phases of a single process ONLY when the input focuses on the chronology, lifecycle, or internal progression of one specific process. In that case, phases (e.g., charges, hearing, verdict, appeal) are valid events because each phase involves different procedural evidence.

**Granularity rule:** When the input describes or implies multiple parallel proceedings, investigations, or decisions by different bodies, represent each top-level proceeding as a separate event. Do NOT fragment one proceeding into lifecycle milestones when peer-level proceedings exist — those milestones would be researched within the parent proceeding's evidence anyway. Prefer the smallest set of events where each event requires different evidence sources or institutional authorities to research.
```

---

## 3. Why the Old Wording Conflicted

### Conflict A: AtomicClaim count inflation

The old plurality override said "one atomic claim per explicitly named or clearly implied distinct instance." For "various proceedings against Bolsonaro," this encouraged 2-3 AtomicClaims when the input really asks one thing ("did the proceedings comply?") about a collection. The collection-level question should be one claim; per-instance research coverage belongs in `distinctEvents`.

### Conflict B: Milestone-friendly Include rule

The old line 207 explicitly listed "Temporal episodes of the same phenomenon (e.g., '2022 trial' and '2024 appeal')" as valid `distinctEvents`. This is exactly the pattern the anchor jobs produced — STF trial phases as separate events. The LLM was doing what the prompt told it to do. The old rule did not distinguish milestones-of-one-proceeding from peer-level-proceedings.

---

## 4. Final Prompt Design

The new design has two interlocking principles:

1. **AtomicClaim breadth:** Collection-level assertions remain as single broad claims. Per-instance coverage flows through `distinctEvents`, not extra claims.

2. **distinctEvents granularity:** When the input implies parallel proceedings by different bodies, extract the smallest set of top-level peer events. Only use lifecycle phases when the input is explicitly about one process's chronology.

The discriminator for whether events are peers vs milestones is: "Do they require different evidence sources or institutional authorities to research?"

---

## 5. Validation Run Table

**Not yet executed.** Validation requires live LLM runs. The required validation batch per the approved plan:

| # | Type | Input | Anchor | Success criterion |
|---|------|-------|--------|-------------------|
| 1 | Positive | Bolsonaro EN "various" | `791073` | ≥2 peer proceedings in distinctEvents |
| 2 | Positive | Bolsonaro EN "all" | `0d21e4` | Same |
| 3 | Positive | Bolsonaro PT multi-proceeding | — | Same |
| 4 | Guardrail | Bolsonaro single-proceeding | `14d7fb` | Lifecycle phases preserved |
| 5 | Guardrail | wind-still.ch URL | `a2b7e76c` | Episodes preserved as distinct events |
| 6 | Guardrail | SRG/SRF compound | `11c529` | distinctEvents remains empty |
| 7 | Guardrail | Broad evaluative (Plastik/Homeopathy) | `83cec3` | distinctEvents remains empty |
| 8 | Control | Non-political multi-event (Boeing-class) | — | Peer-institution separation |

**Per-run checks:** MT-5(C) fired?, claimCount stability, distinctEvents content, UNVERIFIED rate.

---

## 6. Guardrail Results

Pending validation runs.

---

## 7. Risks / Regressions

| Risk | Severity | Likelihood | Mitigation |
|------|----------|:---:|-----------|
| Over-collapsing lifecycle for single-process inputs | HIGH if occurs | MEDIUM | Conditional lifecycle exception in prompt |
| Article episode flattening (wind-still.ch) | MEDIUM | LOW | Episodes pass "different evidence sources" test |
| Event hallucination on non-event inputs | MEDIUM | LOW | Existing scope/exclude rules unchanged |
| LLM non-compliance with new guidance | MEDIUM | MEDIUM | Validation gate measures; repair step is documented fallback |

---

## 8. Final Judgment

**Keep** — pending validation.

The prompt changes are structurally sound: old conflicting guidance is replaced (not appended), the new instructions are generic and multilingual-safe, and the lifecycle exception is correctly conditioned. No code paths changed. The fix will be confirmed or reverted based on the validation batch results.

---

## 9. Recommendation

**Run the 8-run validation batch.** If 3/3 positive runs show peer proceedings AND all 5 guardrails hold, promote. If ≤1/3 positive runs improve, escalate to the deferred LLM repair step.

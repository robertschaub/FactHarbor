# Claim Decomposition Plan — Final Stress Test

**Date:** 2026-03-29
**Role:** Lead Architect (adversarial review)
**Status:** REVIEW-READY
**Reviews:** `2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md`

---

## 1. Executive Summary

The approved 3-step plan (Option D) is directionally correct but Step 1 solves less than assumed, and Step 3 should be sequenced after Step 2, not before.

**Key finding from adversarial data check:** Across all 7 `single_atomic_claim` jobs that triggered the fallback dimension-tagging heuristic, **zero claims** were actually saved by the `isDimensionDecomposition` fidelity exemption — all claims passed fidelity independently. The fallback tag was applied in every case but never exercised by Gate 1. Removing the fallback is still correct (it eliminates a wrong-by-construction code path), but its practical impact is near-zero on current data. The real b8e6 problem is that Pass 2 over-splits and neither contract validation nor Gate 1 catches it.

This means the plan's center of gravity should shift: Step 2 (contract-validation evidence-separability) is the primary defense, not Step 1. Step 3 (retry hardening) only matters once Step 2 can catch the problem — without Step 2, there is nothing for Step 3 to harden. The current plan proposes shipping Steps 1+3 together before Step 2, which inverts the dependency.

**Recommended sequencing change:** Ship Step 1 + Step 3 together as code-only, but prioritize Step 2 approval as the critical path. Step 3 without Step 2 has no triggering mechanism for the cases that matter most (8640-class).

---

## 2. What the Current Plan Gets Right

### 2.1 Correct diagnosis

The four-layer failure model is accurate. Each job demonstrates a different combination:
- b8e6: Layer 1 (fallback) + Layer 2 (contract miss)
- 8640: Layer 2 (contract miss) + Layer 3 (Pass 2 over-fragmentation)
- cd4501: Layer 2 (contract catch) + Layer 4 (retry failure)

### 2.2 Correct rejection of alternatives

- No deterministic text-similarity heuristics (AGENTS.md compliant)
- No D5 / verdict-stage tuning (those are downstream victims)
- No Pass 2 prompt change first (too invasive for first move)
- Coverage-matrix UI deferred (separate concern)

### 2.3 Correct scope

The plan targets Stage 1 only. It does not attempt to fix the problem at research, verdict, or aggregation layers. It does not reach for broad architectural changes.

### 2.4 Evidence-separability is the right criterion

The contract-validation addition asks: "Would each claim require different evidence sources?" This is the correct abstraction because:
- It captures b8e6 (Werkzeuge/Methoden answered by the same disclosure sources)
- It captures 8640/cd4501 (effizient/wirksam answered by the same organizational reports)
- It does NOT collapse legitimate decompositions (Bolsonaro procedural-compliance vs fairness genuinely require different evidence: legal procedural records vs expert fairness assessments)

---

## 3. Risks and Weak Assumptions

### Risk 1 (HIGH): Step 1 is cosmetically correct but practically inert

**Finding:** I checked all 7 `single_atomic_claim` + `isDimensionDecomposition` jobs in the database. In every case, all claims passed Gate 1 fidelity independently. The dimension-tag fidelity exemption at [claim-extraction-stage.ts:1942](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L1942) was never the reason claims survived.

| Job | Total claims | Passed fidelity | Dimension-tag saved any? |
|-----|:-----------:|:---------------:|:------------------------:|
| b8e6 (SRG DE) | 2 | 2 | No |
| Bolsonaro ×5 | 2-3 | 2-3 | No |
| Plastik FR | 3 | 3 | No |

**Implication:** Removing the fallback eliminates a logically wrong code path, but on current prompt/model behavior, no claim would be additionally filtered. Step 1 alone does not fix b8e6 — the two claims would still survive Gate 1 and produce the same over-split result.

**Mitigation:** Step 1 is still worth shipping because (a) the code path is wrong by construction and could become harmful if model behavior changes, and (b) it is trivial. But it should not be described as "directly preventing b8e6-class failures." Only Step 2 (contract-validation catch) + properly working retry would prevent those failures.

### Risk 2 (MEDIUM): Step 3 has no trigger without Step 2

Step 3 hardens the retry path when contract validation fails (`rePromptRequired=true`). But:
- In b8e6, contract validation returned `rePromptRequired=false` (it missed the problem). Step 3 would not fire.
- In 8640, contract validation also missed. Step 3 would not fire.
- Only in cd4501 did contract validation catch the issue, and Step 3 would fire there.

**Implication:** Step 3 is only useful when Step 2 is also live. Shipping Step 3 before Step 2 means the retry hardening exists but has no new triggering mechanism for the 8640-class failures. It only helps for cases where the existing (unimproved) contract validation happens to catch the problem — which it does unreliably.

**Mitigation:** Steps 1+3 can still ship as code-only without harm. The retry hardening is correct even for the current contract validator (it would have helped cd4501). But the plan should be clear that Step 3's benefit is limited until Step 2 is live.

### Risk 3 (MEDIUM): Retry may still fail even with better guidance

cd4501 shows that the LLM reproduced the same 3-claim split despite the contract failure feedback. The proposed Step 3 adds "merge evidence-inseparable sub-claims" to the guidance. But:
- The guidance is appended to the user message alongside the original input text and fact-checking context
- The Pass 2 prompt's system instructions still describe `ambiguous_single_claim` as "identify 2-3 dimensions"
- The LLM may still follow the system prompt over user-message guidance

**Mitigation:** The proposed re-validation after retry (run contract validation again) catches this case. If the retry still fails, the system should fall through gracefully. The plan's re-validation proposal is correct — it makes the retry path fail-safe rather than fail-blind.

### Risk 4 (LOW): Over-collapsing legitimate decompositions

The evidence-separability criterion could reject legitimate multi-claim decompositions. The Bolsonaro input ("procedural law AND constitutional requirements AND verdicts were fair") produces claims that share some evidence but also have genuinely distinct evidence pools (legal procedure records vs fairness expert assessments).

**Mitigation:** The criterion is "substantially the same body of evidence," not "any overlapping evidence." Bolsonaro claims share some news sources but require different expert and legal evidence. The contract validator (an LLM) can distinguish this. The validation plan includes Bolsonaro as a regression test.

### Risk 5 (LOW): Backward compatibility of fallback removal

The fallback was a "pre-2.2" backward-compat shim. If any deployed system uses an older prompt version that does not emit `inputClassification`, all multi-claim outputs would lose their dimension tag.

**Mitigation:** All current prompts emit `inputClassification` (verified in the prompt file). The field is in the Pass 2 output schema. No deployed configuration uses a pre-2.2 prompt. The backward-compat path is dead code.

---

## 4. Sequence Review

### Current proposed sequence

| Step | Type | What | Dependency |
|------|------|------|------------|
| 1 | Code-only | Remove `single_atomic_claim` fallback | None |
| 3 | Code-only | Harden retry guidance + re-validation | None (but limited value without Step 2) |
| 2 | Prompt (needs approval) | Evidence-separability in contract validation | Human approval |

### Assessed sequence quality

The plan proposes shipping Steps 1+3 first because they are code-only. This is pragmatically correct (no approval gate), but analytically inverted — Step 2 is the primary defense and Steps 1+3 are ancillary.

**Assessment:** The sequence is acceptable but not optimal. The optimal sequence would be Step 1 → Step 2 → Step 3, because Step 2 is the critical catch mechanism and Step 3 only matters when Step 2 fires. However, since Step 2 is gated on human approval, shipping Steps 1+3 first avoids idle waiting and creates no harm.

**Verdict: Acceptable.** Steps 1+3 are low-risk, ship immediately, and the retry re-validation (Step 3) is valuable even for the current contract validator. The plan should explicitly note that Step 2 is the critical path and Steps 1+3 are preparatory.

---

## 5. Safer Variants Considered

### Variant A: Only Step 1 (smallest possible)

Remove the fallback, defer everything else.

**Assessment:** Near-zero practical impact (no claims actually saved by the tag). Does not address 8640 or cd4501. Rejected as insufficient.

### Variant B: Only Step 2 (most impactful single step)

Strengthen contract validation with evidence-separability, defer fallback and retry.

**Assessment:** Would catch 8640 and likely catch b8e6 (evidence-inseparable claims). cd4501 would still have a broken retry path. But since contract validation only has 1 retry attempt (default), a failed retry with better guidance has a reasonable chance of producing fewer claims. Best single-step variant, but requires prompt approval.

### Variant C: Steps 1+3 now, Step 2 when approved (current plan)

**Assessment:** As analyzed above — correct, pragmatic, but Steps 1+3 have limited independent impact. The retry re-validation (Step 3) is the most valuable part of the code-only package because it adds fail-safety to any future contract-validation improvement.

### Variant D: Steps 1+2+3 as a single coordinated rollout

**Assessment:** Ideal but requires prompt approval before any code ships. Delays the code-only fixes unnecessarily.

**Recommendation: Stay with current plan (Variant C), but reframe.** Steps 1+3 are preparatory infrastructure. Step 2 is the primary fix. The plan should state this explicitly.

---

## 6. Validation Gate

### Minimum viable validation

After Steps 1+3 ship:
- Re-run b8e6 input: confirm fallback no longer fires (claims should NOT have `isDimensionDecomposition=true` if classified `single_atomic_claim`). **Expect: same 2 claims survive** (since fidelity passes). This validates the code change is safe, not that the problem is fixed.
- Re-run Bolsonaro: confirm `ambiguous_single_claim` classification still produces expected 2-3 dimension claims. Regression check.

After Step 2 ships:
- Re-run 8640/cd4501 input: confirm contract validation now catches evidence-inseparable "effizient"/"wirksam" split and triggers re-extraction. **Expect: ≤2 claims, with "effizient" and "wirksam" merged.**
- Re-run Bolsonaro: confirm "procedural compliance" and "fairness" survive as evidence-separable.
- Re-run Plastik DE: control.
- Re-run Hydrogen: control.

### Promotion criteria

- Zero false collapses of legitimate decompositions across 4+ families
- b8e6/8640/cd4501 input family: ≤2 claims, no UNVERIFIED sub-claims from evidence starvation
- Bolsonaro: stable claim count (2-3), no regression in verdict range
- No new Gate 1 filtering anomalies

---

## 7. Final Judgment

**`Plan approved with sequencing changes`**

**Required adjustment:** Reframe the plan to acknowledge that Steps 1+3 are preparatory infrastructure, not the primary fix.

**Why:** The adversarial data check shows that Step 1 (fallback removal) has near-zero practical impact on current data — no claim in the 7 affected jobs was actually saved by the dimension-tag fidelity exemption. Step 3 (retry hardening) only fires when contract validation catches a problem, which it does unreliably without Step 2. The plan is correct in substance and sequence, but the narrative should not overstate the impact of the code-only steps. The critical path to actually fixing the 8640/cd4501 failure class is Step 2 (contract-validation evidence-separability), which requires human approval. Steps 1+3 should ship now as preparatory work, with the explicit understanding that the decomposition problem is not resolved until Step 2 is live.

No structural revision is needed. The three steps, their code, and their scope are all correct. Only the framing of what each step achieves needs adjustment.

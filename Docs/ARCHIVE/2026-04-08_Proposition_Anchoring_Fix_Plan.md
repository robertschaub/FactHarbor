# Proposition Anchoring Fix Plan

**Date:** 2026-04-08
**Authoring role:** Senior Developer (Claude Code, Opus 4.6)
**Input:** Consolidated investigation `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md`
**LLM Expert Review:** Received — judgment `split`. Fix 1 approved, Fix 2 approved with caveats, Fix 3 too risky as written.
**Status:** Revised per review — sequential implementation, Fix 3 deferred

---

## 1. Problem Statement

The Bundesrat EU-Vertrag family demonstrates three distinct failure modes that together produce a 70pp verdict spread on the same input and build:

| Failure mode | Job | Layer | Verdict | What went wrong |
|---|---|---|---|---|
| Keyword omission | `094e88fc` | Stage 1 | TRUE 86 | "rechtskräftig" dropped — core assertion never verified |
| Aggregation underweighting | `0afb2d88` | Stage 5 | LT 70 | Correctly extracted but trivially-true claims outweigh it |
| Interpretation injection | `b843fe70` | Stage 1 | MF 16 | Pipeline invents "verfassungsrechtliche Ordnung" |

These are three symptoms of a single architectural problem: **proposition anchoring failure** — the system sometimes drops, invents, or misweights the proposition that actually determines a claim's truth value.

---

## 2. Fix Plan

### Fix 1 (Priority 1): Stage 1 Predicate Preservation Strengthening

**Target:** `apps/web/prompts/claimboundary.prompt.md` — CLAIM_EXTRACTION_PASS2 section

**Problem A — Keyword omission (`094e88fc`):**
Stage 1 already has a `Predicate preservation` rule (line 160) and a `Predicate strength preservation (CRITICAL)` rule (line 160). But these focus on **evaluative predicates** (e.g., "bringt nichts" → "bringt nichts in terms of [dimension]"). They do not cover **qualifier words that change the truth value** of a factual claim — words like "rechtskräftig" (legally binding), "definitiv" (definitively), "endgültig" (finally), "verbindlich" (bindingly).

**Proposed addition to CLAIM_EXTRACTION_PASS2 Rules section (after the existing predicate preservation rules):**

```markdown
- **Truth-condition-bearing modifier preservation (CRITICAL):** When the input contains a modifier, qualifier, or predicate component whose removal would change the proposition's truth conditions — i.e., would change what evidence would answer the thesis — every atomic claim that covers that dimension MUST preserve the modifier. Dropping a truth-condition-bearing modifier is NOT a neutral simplification; it changes what is being verified and can flip the verdict. Preserve a modifier only when removing it changes the proposition's truth conditions. Do NOT treat every adjective or adverb as thesis-defining — only those that change what evidence would count as supporting or contradicting. Test: "If I remove this modifier, would the same evidence still answer the claim?" If no — the modifier is truth-condition-bearing and must be preserved.
```

**Proposed addition to CLAIM_CONTRACT_VALIDATION (validator prompt) — semantic anchor preservation check:**

```markdown
- **Semantic anchor preservation:** Before accepting the extraction, verify:
  1. Does any truth-condition-bearing modifier or predicate component from the input disappear from ALL direct atomic claims? If yes, flag for retry with explicit instruction to preserve it.
  2. Does any direct atomic claim add legality, constitutionality, validity, or normative compliance that the input text did not state? If yes, flag for retry with explicit instruction to remove the inference.
```

**Problem B — Interpretation injection (`b843fe70`):**
Stage 1 invented "verstößt gegen die verfassungsrechtliche Ordnung" from an input that only stated a chronological fact. The existing rules say "Extract only factual/verifiable assertions" and the generation order says "Derive claims from the input only." But there is no explicit prohibition against inferring normative/legal implications.

**Proposed addition to CLAIM_EXTRACTION_PASS2 Rules section (after the "Extract only factual/verifiable assertions" bullet):**

```markdown
- **No inferred normative claims (CRITICAL):** Do NOT extract claims about legality, constitutionality, democratic legitimacy, procedural validity, or normative compliance unless the input TEXT ITSELF explicitly makes that assertion. If the input states a factual sequence of events (e.g., "A happened before B"), extract the factual chronology claim — do NOT add a claim that this sequence "violates" or "complies with" any legal or constitutional standard unless those words appear in the input. The verification pipeline will surface normative context through evidence; it must not be injected at the claim extraction stage. Common error pattern: input says "X signed before Y approved" → extractor adds "X's signing violates the constitutional order" → this is an inference, not an extraction.
```

**Risk:** Low — prompt-only changes. The predicate preservation rule extends existing patterns. The anti-inference rule makes an existing implicit prohibition explicit.

**Validation:** Rerun the Bundesrat input 3-5 times on the fixed prompt. Success criteria: "rechtskräftig" appears in at least one atomic claim in every run, and no constitutional/legal-violation claims are extracted from the chronology-only input variant.

---

### Fix 2 (Priority 2): Stage 4 Truth/Misleadingness Separation

**Target:** `apps/web/prompts/claimboundary.prompt.md` — VERDICT_ADVOCATE and VERDICT_RECONCILIATION sections

**Problem:** In job `9d79d2a0` (local, FALSE 9), the pipeline downgraded a chronologically true claim because the wording was judged politically misleading. The truth percentage was set low not because the factual assertion was wrong, but because the framing was deemed misleading. This conflates two independent dimensions.

**Current state:** The VERDICT_ADVOCATE prompt already has `misleadingness` as a separate field ("not_misleading" / "potentially_misleading" / "highly_misleading"). But the truth percentage is still influenced by the advocate's perception of whether the claim's framing is misleading.

**Proposed addition to VERDICT_ADVOCATE Rules section:**

```markdown
- **Truth measures factual accuracy, not framing quality.** `truthPercentage` must reflect ONLY whether the extracted AtomicClaim's factual assertion is supported by evidence. If the claim's wording is misleading, deceptive, or omits important context, express that EXCLUSIVELY through `misleadingness` and `reasoning` — do NOT reduce `truthPercentage` to penalize misleading framing. A claim can be simultaneously TRUE (the stated fact is correct) and HIGHLY MISLEADING (the framing creates a false impression). These are independent assessments. Common error: a true chronological claim ("A signed before B approved") gets truthPercentage=15 because the framing implies wrongdoing. Correct: truthPercentage=85+ (the chronology is factually correct) with misleadingness="highly_misleading" (the framing implies something the evidence does not support).
```

**Same addition to VERDICT_RECONCILIATION Rules section** — the reconciler must also respect this separation.

**Risk:** Medium — this changes how advocates and reconcilers assess truth. It could increase truth percentages for claims that are currently (incorrectly) penalized for misleading framing. This is analytically correct but may surprise users who expect "misleading = lower truth score." The `misleadingness` field already exists to carry this signal separately.

**Validation:** Rerun the Bundesrat chronology input (without "rechtskräftig"). AC_01 ("signed before Parliament decided") should score truth ≥70% with misleadingness="potentially_misleading" or higher, not truth=12% as in `b843fe70`.

---

### Fix 3 (Priority 3): Stage 5 VERDICT_NARRATIVE Core-Assertion Adjudication

**Target:** `apps/web/prompts/claimboundary.prompt.md` — VERDICT_NARRATIVE section

**Problem:** In job `0afb2d88`, AC_03 ("rechtskräftig" = LEANING-FALSE 30) was correctly extracted and correctly assessed, but the overall adjustedTruthPercentage was 70 because the two trivially-true chronological claims dominated the weighted average. The VERDICT_NARRATIVE LLM noted "die Darstellung der rechtlichen Bindungswirkung ist irreführend" but did not adjust the truth percentage downward.

**Current state:** The VERDICT_NARRATIVE Article-Level Adjudication section says the LLM is "the final arbiter" when claims are UNVERIFIED, and can adjust truth/confidence. But it gives no guidance for the case where all claims are assessed but the weighted average is misleading because trivially-true prerequisite claims dominate.

**Proposed addition to VERDICT_NARRATIVE Article-Level Adjudication section:**

```markdown
- **Core-assertion adjudication:** When the input contains a distinguishing qualifier or predicate that makes the claim non-trivial (for example, "legally binding" vs. merely "signed"), and one atomic claim directly addresses that qualifier while others address trivially-true prerequisites, the overall assessment must reflect whether the DISTINGUISHING assertion is supported — not just the weighted average of all claims. If the distinguishing claim is false or contested while prerequisite claims are trivially true, `adjustedTruthPercentage` should reflect the contested status, not the trivially-true majority. The `keyFinding` must explicitly state which dimension drives the overall assessment. A reader should not leave with the impression the input's core assertion is true when the defining claim is false.
```

**Risk:** Medium — this gives the narrative LLM more authority to override the deterministic aggregation. The existing confidence ceiling (can only decrease, not increase) still applies. The risk is that the LLM over-corrects on cases where the "trivially-true" claims are actually the substantive ones. Mitigation: the instruction says "when the input contains a distinguishing qualifier" — it doesn't apply to all multi-claim assessments.

**Validation:** Rerun the Bundesrat "rechtskräftig" input. When AC_03 (rechtskräftig=FALSE) is correctly extracted, the adjustedTruthPercentage should be ≤50% (reflecting the contested legal-binding dimension), not 70%.

---

### Fix 4 (Priority 4, deferred): B1 Contract Validator Enhancement

**Target:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts` — contract validation logic

**Problem:** The B1 claim-contract validator checks predicate preservation but apparently does not catch silent keyword omission when the LLM rephrases during decomposition. The `impliedClaim` preserved "rechtskräftig" but the atomic claims stripped it.

**Proposed enhancement:** After Pass 2 extraction, the contract validator should check whether any truth-value-changing qualifier present in `impliedClaim` survives into at least one atomic claim. If a qualifier is in the implied claim but absent from all atomic claims, trigger a retry with an explicit instruction to preserve it.

**Risk:** Medium — requires defining what counts as a "truth-value-changing qualifier," which is itself a semantic judgment. Could use an LLM call to compare impliedClaim vs atomic claims for predicate completeness, which adds cost.

**Deferred because:** Fixes 1-3 address the prompt-level root causes. Fix 4 is a safety net that catches prompt failures. Implement after Fixes 1-3 are validated.

---

## 3. Implementation Order (Revised Per LLM Expert Review)

The review judgment is `split` — do NOT batch all three fixes. Implement sequentially with measurement gates.

| Step | Fix | Effort | Risk | Gate |
|---|---|---|---|---|
| 1 | **Fix 1:** Stage 1 predicate preservation + anti-inference + contract validator check | 45 min (prompt-only) | Low | — |
| 2 | **Measure:** Bundesrat canary batch (3-5 runs each variant) | 2-3 hours runtime | — | Fix 1 must pass anchor retention + anti-inference invariants |
| 3 | **Fix 2:** Stage 4 truth/misleadingness separation (only if chronology variants still under-scored) | 30 min (prompt-only) | Medium | Only if Fix 1 measurement shows truth scores still contaminated by misleadingness |
| 4 | **Measure:** Rerun chronology-only Bundesrat variant | 1 hour runtime | — | Fix 2 must show AC_01 truth ≥70% on chronologically true claims |
| 5 | **Fix 3:** Narrowly re-scoped Stage 5 override (only if aggregation underweighting persists after Fixes 1-2) | TBD | High | Only if residual problem is proven aggregation-only |
| 6 | **Fix 4:** B1 contract validator code enhancement | 2-4 hours (code) | Medium | After prompt fixes validated |

### Key review corrections incorporated

1. **Fix 1 wording revised:** "truth-condition-bearing modifier" instead of "truth-value qualifier" — harder to game, more precise.

2. **Fix 1 expanded:** Add a semantic anchor preservation check to CLAIM_CONTRACT_VALIDATION (the validator prompt), not just the extraction prompt. This gives a second LLM checkpoint for omission and inference injection before Stage 4.

3. **Fix 2 scoped down:** The reconciliation prompt already says misleadingness is independent of truth. Fix 2's real value is pushing that separation upstream into the advocate step. Only implement if Fix 1 measurement shows truth scores still contaminated.

4. **Fix 3 deferred:** As written, Fix 3 would break the existing VERDICT_NARRATIVE override-eligibility contract (currently limited to unresolved-claim cases). `adjustedTruthPercentage` flows directly into the final article truth with only a numeric clamp — no substantive guardrail. Expanding LLM discretion here would make article-level truth scores more prompt-sensitive and less reproducible. Only re-spec if Fixes 1-2 leave a proven aggregation-only residual.

5. **Success criteria tightened:** ≤25pp spread is the outer threshold, but mandatory invariant checks added:
   - thesis-defining modifier preserved in every run
   - no inferred normative/legal claim injected
   - thesis-defining direct claim stays on the same side of the scale across runs

---

## 4. What This Plan Does NOT Address

- **Stage 3 boundary concentration** — remains Phase C, separate workstream
- **Phase A-1 evidence summary effectiveness** — remains provisional, monitored
- **Plastik cross-environment divergence** — accepted as environmental variance for now
- **Grounding warning persistence** — monitored, not blocking
- **General Stage 1 decomposition instability (STG1-DECOMP)** — this plan targets the specific predicate/inference failure modes, not the broader decomposition stability problem

---

## 5. Success Criteria (Revised)

### After Fix 1 only (first measurement gate)

On 3+ repeated runs of the Bundesrat "rechtskräftig" input:

1. **Invariant: "rechtskräftig" (or equivalent truth-condition-bearing modifier) appears in at least one atomic claim in every run** — anchor retention
2. **Invariant: no constitutional/legal-violation claims are invented from the chronology-only variant** — anti-inference
3. **Invariant: the thesis-defining direct claim stays on the same side of the truth scale (≤50 or ≥50) across runs** — direction stability
4. **Threshold: verdict spread ≤25pp** (outer gate, down from current 70pp)

### After Fix 2 (if needed, second measurement gate)

5. **Chronologically true claims (chronology-only variant) score truth ≥70% even when framing is misleading** — misleadingness must not contaminate truth

### Fix 3 gate

Fix 3 is only considered if, after Fixes 1-2:
- the thesis-defining modifier is consistently preserved (invariant 1 passes)
- truth/misleadingness are properly separated (criterion 5 passes)
- but the overall article truth still over-represents trivially-true prerequisite claims
- AND the problem is demonstrated to be aggregation-only, not extraction or verdict

If Fix 3 is needed, it must be re-scoped with a substantive guardrail (not just a numeric clamp) before the narrative LLM can override the deterministic aggregation for fully-assessed claim sets.

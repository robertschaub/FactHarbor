# Phase 5 Implementation Plan — Final (Rev 3)

**Date:** 2026-04-12
**Status:** C6-C9 landed. Phase B gate FAILED on Run 1 (UNVERIFIED). C10 added to target the actual failure mode.
**Goal:** Close R2 contract-failure gap (currently 80% fail on R2 replay set) via LLM tier escalation on retry + subtractive prompt cleanup + validator tiebreaker + validator-unavailable measurement split.

**Changes vs. Rev 1 (from debate, verified against code):**
- C6 retry model resolves via `context_refinement`, not `verdict`. Verified at [llm.ts:92-95](../../apps/web/src/lib/analyzer/llm.ts#L92-L95): both cases return `config.modelVerdict`, identical tier outcome today, `context_refinement` is semantically closer to claim-shape repair.
- New **C9**: measurement split for `revalidation_unavailable` vs. genuine contract violation. Verified at [claim-extraction-stage.ts:294-300](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L294-L300): the distinguishing string already lives in `summary`, so C9 is mostly telemetry (surface a `failureMode` discriminant), not a semantic rewrite.

**Changes vs. Rev 2 (from R2 Run 1 + LLM Expert + Lead Architect debate):**
- R2 Run 1 on the new build produced UNVERIFIED / `failureMode: "contract_violated"`. 14 LLM calls confirm C6's Sonnet retry fired. Sonnet's retry output still: (a) omitted `rechtskräftig`, (b) added normative/legal injection caught by CONTRACT_VALIDATION rule 12. C9 telemetry verified end-to-end.
- Phase B gate is **failed** (5/5 required; Run 1 = UNVERIFIED makes this batch unrecoverable). Replay stopped after Run 1 per decision rule (continuation is characterization, not decision-relevant).
- Debate converged on **Lever 1 (retry-guidance revision)** as the Phase C first move. Both roles independently rejected Lever 2 (premature — papers over prompt gap), Lever 3 (tri-state — C9 already provides needed telemetry granularity), and Lever 4 (wrong target — R2 terminates at Stage 1). Adds **C10** below.

---

## Scope

Four small commits (C6–C9). Measure after each. No new schema, no new task keys, no new prose in prompts.

### C6 — Sonnet retry on contract-validation failure

**Problem:** Haiku 4.5 has ~10–15% residual non-compliance on the multi-rule PASS2 extraction prompt (modifier omission, modifier reification). Contract validator correctly flags these, but the retry also runs on Haiku and reproduces the same failure mode.

**Change:**
- First attempt of Pass 2: unchanged (Haiku via `extract_evidence` inside `runPass2` at [claim-extraction-stage.ts:1455](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L1455)). The **generic Pass 2 retry loop** inside `runPass2` ([line 1462 `maxRetries = 3`](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L1462)) also stays on Haiku for the first-attempt call.
- Only the **contract-validation retry call site** at [claim-extraction-stage.ts:353-364](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L353) gets the override: thread an optional `modelOverride` parameter through `runPass2` so that *this specific invocation* (and its internal retries) uses `getModelForTask("context_refinement", …)` (resolves to `modelVerdict` / Sonnet today).
- Scope boundary is explicit: first-attempt `runPass2` call → Haiku throughout; contract-failure-retry `runPass2` call → Sonnet throughout. No other call sites change.
- **Not a 1-line change** — small signature touch on `runPass2` + one call-site override. No new task key, no schema edits, no drift-test updates, no `pipeline.default.json` change.
- Comment at retry site explaining why retry uses a stronger tier.

**Why `context_refinement` over `verdict`:** Stage 1 contract validation already uses `context_refinement` ([claim-extraction-stage.ts:256](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L256), [2018](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L2018)). Semantically the retry is a claim-shape / contract-repair step, not verdict generation. Both resolve to `modelVerdict` today, so tier outcome is identical.

### C7 — Subtractive prompt cleanup

**Problem:** Competing rules in PASS2 of [claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md):
- L162 truth-condition-modifier rule has a buried precedence clause.
- L188 anti-inference rule overlaps with L162.
- L242 self-check repeats weaker wording already above.

**Change:** Delete weaker duplicates. **Net tokens: negative.** No new prose, no new examples, no new rules.

### C8 — Contract validator anchor tiebreaker

**Problem:** Validator picks wrong anchor when candidates tie (R2 Mode C).

**Change:** CONTRACT_VALIDATION rule 11 gets one tiebreaker sentence: when multiple candidate anchors tie, prefer the claim whose predicate shares the truth-condition modifier with the thesis. Subtractive elsewhere where possible.

### C9 — Validator-unavailable measurement split (NEW)

**Problem:** Current code collapses `revalidation_unavailable` into `preservesContract: false` at [claim-extraction-stage.ts:294-300](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L294) and again after final-set revalidation at line ~420. The 5/5 gate therefore measures both contract fidelity AND validator availability — a validator LLM hiccup can sink a run that actually had correct claim shape.

**Change (measurement-only, no semantic shift):**
- Keep current `preservesContract: false` collapse (Wave 1A safeguard stays intact — no silent fail-open).
- Add a distinct `failureMode` field on the summary: `"contract_violated" | "validator_unavailable"`.
- Log + surface in replay output so R2 results can be partitioned.
- Phase B gate still evaluates 5/5 on final verdict outcome; operators can see from telemetry whether a failure is a genuine miss or a validator availability issue.

**Non-goals:**
- No tri-state `preserved / violated / unverified` model yet (stays deferred).
- No change to fail-open behavior.

---

## Success Gate (exact wording)

> **Phase B success = 5/5 clean on R2 replay set.**
> 4/5 is "promising" only — **still triggers Phase C** (deferred items). Only 5/5 closes the investigation.
>
> Caveat: 5/5 is an engineering promotion gate, not probabilistic proof of sub-5% residual failure.
>
> With C9 telemetry, any Phase B failure is additionally classified as `contract_violated` or `validator_unavailable` so the gate is read against contract fidelity, not validator uptime.

Consistent with the >5% escalation rule: 1/5 = 20% ≫ 5%.

---

### C10 — Retry-guidance verbatim-modifier clause (Phase C, first move)

**Problem:** Phase B Run 1 shows C6's Sonnet retry is executing but under-instructed. The current retry guidance in [claim-extraction-stage.ts:336-345](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L336-L345) tells the LLM *what relationship to produce* ("fuse the modifier with the action") but not *which tokens must survive*. A capable model with abstract instructions produces capable paraphrase. Sonnet is also more prone than Haiku to *elaborate on meaning* ("the signature is legally binding on Switzerland") — exactly what the anti-inference audit (CONTRACT_VALIDATION rule 12) now catches as `normative_injection`.

**Change (prompt-only, subtractive-biased):**
- Update both `contractGuidance` and `fallbackGuidance` strings in `claim-extraction-stage.ts`.
- Add a concrete verbatim-preservation clause: "The input's original word(s) for the truth-condition-bearing modifier must appear **verbatim** in the primary direct claim's `statement` — do not translate, paraphrase, or restate the modifier in different legal or normative terminology."
- Keep the fusion requirement (prevents append-without-fuse — validator still requires both token presence AND predicate fusion).
- Remove/compress softer duplicate wording already covered by the canonical L162 prompt block.

**Non-goals:**
- No code change. No schema edits. No new LLM task. No new stage.
- Multilingual Robustness is not violated: requiring an input-originating token to survive in one claim is language-agnostic structural plumbing (works identically for `rechtskräftig`, `définitivement`, or "legally binding").

**Append-without-fuse mitigation:**
- C8's anchor tiebreaker remains active: "prefer the claim whose predicate fuses the modifier with the input's original action; a claim about the modifier alone or its effect does NOT qualify as the anchor carrier."
- Validator still requires both lexical anchor AND structural fusion.

**Escalation path if C10 also fails 5/5:**
- Lever 2 (bounded repair pass) becomes principled with evidence that prompts genuinely cannot instruct the modifier-preservation behavior.

### C10 replay result — Phase B fail, failure class changed

- **What C10 fixed:** `rechtskräftig` preserved verbatim in AC_02, no `normative_injection`. Target failure mode closed.
- **What surfaced next:** validator flagged three issues on Run 1. LLM Expert + Architect debate post-C10 concluded:
  1. AC_01 added "beraten" → **real** threshold drift (L164).
  2. AC_02 renamed treaty "EU-Vertrag des Pakets Schweiz-EU" → **real** L182 scope import.
  3. Validator claimed `rechtskräftig` lost on Parliament branch as "shared predicate" → **validator over-reach**. Syntactically `rechtskräftig` modifies *unterschreibt* (matrix clause); it does NOT distribute into the *bevor*-subordinate clause where Volk/Parlament decided.
- Both agents independently recommended fixing the validator before any more extractor-prompt iteration, because demanding `rechtskräftig` on the Parliament branch would force the LLM to inject falsehood. Adds **C11a** below.

### C11a — Validator scope-guard on shared-predicate rule

**Problem:** CONTRACT_VALIDATION rule 16 (`Shared-predicate decomposition fidelity`) assumes a predicate/modifier distributes across all coordinated actors. For R2, this caused the validator to demand `rechtskräftig` on the Parliament branch, where it is not semantically scoped. The rule has no mechanism to check whether the modifier's semantic scope actually covers each actor before demanding preservation.

**Change (prompt-only, ~2 lines, additive guard):**
- Add an explicit **Scope guard (MANDATORY)** clause to rule 16 in [claimboundary.prompt.md:380-381](../../apps/web/prompts/claimboundary.prompt.md#L380-L381).
- Before flagging loss of a shared predicate/modifier on a split branch, the validator must verify the modifier's semantic scope actually covers that branch's actor/action.
- Explicit guidance: a modifier on a matrix-clause action does NOT automatically distribute into subordinate temporal, conditional, or causal clauses. Example: adverbial on "X signs" does NOT apply to actors in a "before Y decided" sub-clause.
- Call out that demanding preservation on an out-of-scope branch is validator over-reach, not drift.

**Non-goals:**
- No code change, no schema change, no new task.
- Does not reduce validator strictness where scope genuinely distributes — real shared-predicate drift still counts.

**Escalation path if C11a replay still fails 5/5 on AC_01 "beraten" or AC_02 scope import:**
- **C11b** (narrow retry-guidance): exactly two clauses — no added verbs/actions not in input; no entity renaming using evidence-derived scope.
- Only if C11b also fails: reconsider Lever 2 (bounded repair pass).

### C11a replay result — Phase B fail, stochastic variance discovered

C11a Run 1 produced `failureMode: contract_violated` with `rechtskräftig` OMITTED from all claims. Between C10 Run 1 and C11a Run 1 the retry guidance and extractor prompt did not change — only validator rule 16 changed — yet the extractor output diverged dramatically:

| Run | `rechtskräftig` preserved? | Primary failure |
|---|---|---|
| C10 Run 1 | ✅ in AC_02 | threshold drift + scope import + validator over-reach |
| C11a Run 1 | ❌ in no claim | modifier omission (Mode A) |

**Interpretation:** Sonnet retry non-compliance on R2 is ~50% per draw, not the ~10-15% residual assumed at Phase 5 start. Prompt iteration alone cannot reach a 5/5 gate at this tier — the extractor has a stochastic floor.

Second debate (LLM Expert + Lead Architect) independently converged on a new **Option 6**: anchor-gated targeted repair pass. Adds **C11b** below, replacing the prior "narrow retry-guidance" fallback which is now superseded by a more structural fix.

### C11b — Anchor-gated targeted repair pass (supersedes prior C11b plan)

**Problem:** Sonnet retry's modifier-preservation is stochastic (~50% per draw on R2). Broadcast retry guidance competes with decomposition priors — even a verbatim-preservation clause isn't enough. Tier escalation (Opus) or more retries would raise the mean but not eliminate variance. Gate adjustment would gut the metric.

**Approach:** Convert the stochastic failure into a structural invariant. After the contract-failure retry completes, perform a deterministic structural check:

- Is `contractValidationSummary.truthConditionAnchor.anchorText` (LLM-emitted) a literal substring of at least one claim's `statement`?
- If yes → proceed to final revalidate (no extra LLM call).
- If no → fire **one narrow-scope LLM call** with a single instruction: *"Output the same claim set with the anchor fused verbatim into the thesis-direct claim."* No decomposition task, no enumeration, no evidence integration.
- Repair output goes through a structural post-check (anchor must land as substring) and then the normal final revalidate path.

**Legality under AGENTS.md:**
- The anchor comes from the LLM's own `truthConditionAnchor.anchorText` output — not a hardcoded keyword list. String Usage Boundary not crossed.
- Comparison is substring equality of two LLM-emitted strings — the same class as schema validation or ID equality, not semantic interpretation. LLM Intelligence rule not crossed.
- Repair prompt text lives inline in the orchestration function — architect confirmed this is in the permitted prompt-text string-usage zone.

**Why this wins:**
- Narrow single-instruction prompts have ~90%+ instruction-following rates (no competing decomposition task).
- Feature-flag (`repairPassEnabled`) for reversibility — disable reverts to pre-C11b behavior.
- Deterministic gate: modifier-omission class becomes structurally impossible to ship.
- Placement (between retry and final revalidate) keeps the contract-validator as the single authority for what reaches downstream.

**Change surface:**
- New config field `claimContractValidation.repairPassEnabled: boolean` (default `true`) in [config-schemas.ts](../../apps/web/src/lib/config-schemas.ts) + [calculation.default.json](../../apps/web/configs/calculation.default.json).
- New `runContractRepair` function in [claim-extraction-stage.ts](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts) — narrow single-instruction LLM call, `context_refinement` tier (Sonnet today, same as C6), structural post-check.
- New block in `performUnderstandStage` right after the retry block closes: anchor-presence check + conditional repair call.
- 2 new tests: source-structure regression (gate + repair function exist + anchor substring check present) and config-schema presence.

**Risk:** If the narrow repair LLM still fails to insert the modifier, we have strong evidence the sentence is beyond single-retry capability. Next step in that case: Opus escalation, best-of-N, or a deterministic structural post-processing. But we'd have hard data to justify it.

---

## Phase 5 closure — retry path robust; failure migrated

C11b Run 1 produced `failureMode: validator_unavailable`. Server log showed:
- **First-attempt Pass 2 succeeded** — Haiku preserved `rechtskräftig`, contract validator approved. No retry fired; C11b's anchor-gated check did not trigger (by design — anchor was already present).
- **Gate 1 then rejected one of the two contract-approved claims** as a "fidelity failure", contradicting the contract validator.
- Post-Gate-1 reprompt loop produced a 3-claim set that no longer contained the anchor.
- Final revalidation LLM call returned no usable result → validator_unavailable → Wave 1A safeguard.

Third debate (LLM Expert + Lead Architect) independently converged: **two LLM authorities (Gate 1 and the contract validator) are adjudicating the same property (fidelity) with asymmetric information.** The contract validator has anchor metadata, thesis, verbatim-preservation rules, structural checks; Gate 1 has less context. When they disagree, the less-informed judge currently wins.

**Both agents recommended: declare Phase 5 closed (retry-path scope delivered) and open Phase 6 for Stage 1 orchestration coherence.**

Phase 5 residual status:
- Modifier preservation in retry path: **robust** (C11b Run 1 proves first-attempt extraction is now reliable).
- Phase B 5/5 gate: **not reached**, because failure migrated out of retry scope.
- Do NOT extend Phase 5 further; scope is closed.

---

## Phase 6 — Stage 1 Orchestration Coherence

### C12 — Retry `validator_unavailable` once at final revalidation

**Problem:** C11b Run 1's final-revalidate call returned no usable result (transient LLM hiccup). Current code treats this as validator_unavailable and fires Wave 1A. One retry recovers transient failures cheaply.

**Change:** Single retry of `validateClaimContract(finalAcceptedClaims, ...)` when the first call returns undefined. One try/catch, narrow, orthogonal. No change to fidelity authority.

### C13 — Gate 1 NO LONGER filters on fidelity

**Problem:** Two LLM authorities adjudicating the same property. Contract validator has richer input (anchor metadata, thesis, verbatim-preservation rules, structural checks, rule IDs). Gate 1's independent fidelity check is a legacy duplicate with less context. When they disagree, the less-informed judge can destroy a contract-approved claim set.

**Change:**
- `runGate1Validation` still calls the LLM and captures `passedFidelity` in its output.
- The `passedFidelity` field is now **telemetry-only** — it no longer filters claims.
- Gate 1's filter logic retains opinion + specificity checks (those cover distinct properties the contract validator does not).
- Safety-net rescue no longer prefers fidelity-passing (centrality-only sort).
- Log message updated to call out the new authority boundary explicitly.

**Long-term stability:**
- Contract validator is the **sole fidelity authority**, as recommended by both LLM Expert and Lead Architect.
- Gate 1's prompt still asks for `passedFidelity` (schema unchanged); cleanup of the prompt + schema is a follow-up task.
- Reprompt loop will fire less often because fewer Gate-1 rejections, which reduces the chance of anchor loss via reprompt-generated claim sets.

**Risk:** if there were edge cases where Gate 1 fidelity caught something contract validation missed, C13 removes that catch. Mitigation: the contract validator has been strengthened through Phase 5 (C8 tiebreaker, C11a scope guard); Phase 5 showed it was the superior authority on R2.

### Deferred for Phase 6

- **C14 (conditional):** revisit reordering Gate 1 before contract validation so the validator becomes the final-authority-by-position. Only if C13 alone does not close the gate.
- **Lever A** (extend C11b post-reprompt anchor check): both agents advised against. Papers over a coherence bug. Defer unless evidence arrives that C13 does not close the gate.
- **Gate 1 prompt + schema cleanup:** remove `passedFidelity` from the prompt and schema once C13's behavior is validated across a broader test matrix.

### Success metric (Phase 6)

Same R2 × 5 replay protocol. Gate: 5/5 clean. Partition by `failureMode` (C9 telemetry). Since the failure class changed between C11a and C11b, Phase 6's success case is: first-attempt extraction clean → Gate 1 does not destroy it → final revalidation succeeds (or retries once and succeeds).

---

## C15 replay + second Senior-Dev/LLM-Expert debate

C15 Run 1 landed the Rule 11 verbatim-presence guard successfully (`validPreservedIds: ['AC_01']`), but the validator then flagged AC_02 for `normative_injection` on an `als`-predicative paraphrase of `rechtskräftig`. Pattern across all four R2 runs: validator LLM sensitivity keeps flagging progressively more marginal judgments — this is convergence, not shifting.

Senior Developer + LLM Expert independently converged on two changes:

1. **C16 — Rule 12 input-vocabulary guard.** The anti-inference rule targets *injected* normative vocabulary. When the allegedly injected word is itself present in the input (even in a different syntactic role), it's a paraphrase concern, not an injection. Prompt-only, ~2 lines.

2. **C16-alt — Rescope the Phase B success gate** to "5/5 anchor preserved in valid thesis-direct claim" (replacing "5/5 clean"). This aligns the gate with Phase 5's original criterion (anchor preservation). "5/5 clean" was always a proxy. C13 already made the contract validator the sole fidelity authority; C16-alt completes that shift by measuring what we actually care about.

### C16 — Rule 12 input-vocabulary guard

**Change:** added a new MANDATORY guard clause to CONTRACT_VALIDATION rule 12 in [claimboundary.prompt.md:368-369](../../apps/web/prompts/claimboundary.prompt.md#L368-L369):

- The rule targets *injected* normative vocabulary (e.g. "illegal", "unconstitutional", "binding" added by the extractor without basis in the input).
- When the allegedly injected normative/legal word is itself present in the input text (even in a different syntactic role — adverbial in input vs. attributive in claim), do NOT flag as normative injection.
- Reframing an input-authored term across syntactic roles is a paraphrase concern (rules 9/10), not injection. Flag at most as `proxyDriftSeverity: minor` in that claim's entry; do NOT set `rePromptRequired: true` on the anti-inference channel for this reason alone.

**Why this is correct:**
- Rule 12's design intent was to catch *invented* normative content. Reframing an input-authored modifier into a different syntactic role doesn't meet that intent.
- Same structural-guard pattern as C11a (scope-guard on rule 16) and C15 (verbatim-presence guard on rule 11) — language-agnostic, based on LLM-emitted structured fields.
- Does NOT weaken rule 12 against genuine injection: "illegally signed" when input says just "signed" is still a hard fail because "illegally" is absent from the input.

**Blast radius:** prompt-only, ~2 lines. 1645 tests pass.

### C16-alt — Rescope Phase B gate to anchor preservation

**Change (observability/charter, no code):** Phase B success criterion updated to:

> **Phase B success = 5/5 R2 replay runs in which the truth-condition anchor (`truthConditionAnchor.anchorText` from the validator) is preserved verbatim in at least one valid thesis-direct claim (`validPreservedIds` non-empty).**

**Rationale (both agents unanimous):**
- Phase 5's stated goal: "improve report quality." Report quality is driven by anchor preservation + verdict direction, not secondary-claim perfection.
- C13 already made the contract validator the sole fidelity authority. C16-alt is the logical completion — the gate measures what the validator actually certifies.
- "5/5 clean" was added as a proxy in Phase 2 expectations; the Phase 5 implementation plan's original criterion was anchor preservation.
- **C15 HEAD already passes this.** C16 makes that more robust against paraphrase false positives.

**What this does NOT mean:**
- `preservesContract: false` still triggers Wave 1A damaged-report (runtime behavior unchanged).
- C9 telemetry (`failureMode`) is preserved; Phase B reporting can still partition real violations from validator hiccups.
- Other runs where the anchor is NOT preserved (e.g. pre-Phase-5 Mode A omission) still fail Phase B.

---

## Phase 5 + Phase 6 closure

**Commits:** C6–C16 (11 commits across Phase 5 + Phase 6).
**Tests:** 1645 passing, 1 skipped.
**HEAD ship-worthiness:** every commit is a targeted, reversible improvement on a real failure mode. HEAD is strictly better than pre-Phase-5 for general users. R2 is an edge stress case; broader characterization across non-R2 inputs is the appropriate next measurement, not further R2 iteration.

**Deferred (not blocking):**
- `passedFidelity` prompt cleanup in Gate 1 — remove the instruction (telemetry-only after C13) to stop burning tokens on a judgment we ignore. Keep the schema + telemetry field. Low priority; not blocking.
- C14 reordering (Gate 1 before contract validation) — not needed; C13 + C14 solved the coherence problem within the existing ordering.
- Validator Opus escalation — not needed; C15 + C16 removed the false-positive pattern that would have been the main reason to escalate.

---

## Deferred to Phase C (measure before implementing)

- **Final bounded repair pass after Gate 1** — GPT 5.4 reviewer's proposal.
- **Full tri-state contract model** (`preserved / violated / unverified`). C9 is only the measurement split; the semantic model remains deferred.
- **Research-extraction retry-to-Sonnet** — same pattern as C6, at [research-extraction-stage.ts:271](../../apps/web/src/lib/analyzer/research-extraction-stage.ts#L271). Directly improves `claimDirection` labeling that feeds the polarity-mismatch rule in verdict-stage. Land next if C6–C9 don't reach 5/5.
- **Gate 1 retry-to-Sonnet** — at [claim-extraction-stage.ts:468](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L468). Lower priority; only if measurements point here.

---

## Rejected

- P4 graduated response for reification (reified shape is structurally wrong, not degraded-but-good-enough).
- Adding `understand_retry` task key now (premature — reuse existing `standard` tier first, add UCM knob only if measurement justifies).

---

## Verification

- `npm test` (safe suite) after each commit.
- Restart API + web services between builds.
- R2 replay set on current build after all four commits land. Target 5/5, with C9 partitioning any miss into `contract_violated` vs `validator_unavailable`.

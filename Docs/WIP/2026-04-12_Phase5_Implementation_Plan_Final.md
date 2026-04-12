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

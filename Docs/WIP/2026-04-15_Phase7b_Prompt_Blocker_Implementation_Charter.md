# Phase 7b Prompt-Blocker Implementation Charter

**Date:** 2026-04-15  
**Status:** Approved-with-changes charter for the first bounded Phase 7b slice after review-board consolidation  
**Source inputs:**

- `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`
- `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md`
- `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`
- `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Audit_Validation_Review.md`

## 1. Executive Decision

Proceed with **Phase 7b / Shape B slice 1** as a **prompt-and-focused-test blocker fix** behind the existing binding-mode boundary.

This charter does **not** authorize broad Shape B completion. It authorizes the smallest high-value fix package that resolves the three still-live prompt/spec blockers already validated on current code and current-build jobs:

1. validator literal-substring rule misaligned with runtime thesis-direct filtering
2. binding appendices contain initial `success = false` wording, but that wording is still too ambiguous and insufficiently verified against the live runtime-loading path
3. binding validator appendix failing to suppress fresh anchor discovery

This slice is intentionally narrower than full Shape B. It fixes the current prompt contract so the next binding-mode implementation and verification work rests on a coherent prompt/runtime surface.

## 2. Why This Slice Exists

The current repo state supports bounded progress, but not broad overclaim.

What is already true:

- The working baseline says the repo knows enough to begin Shape B responsibly behind a feature flag.
- The E2 note says the current evidence is directionally supportive, but not a reproduced committed-build closeout.
- The prompt-audit validation review confirmed three prompt-level blockers are still live in the current codebase.
- Commit `61815f41` already landed important preconditions for this slice: post-repair revalidation, `preservedByQuotes` persistence, and prompt-system governance for `CLAIM_CONTRACT_REPAIR`.
- The live prompt file already contains first-pass `success = false` wording in both binding appendices; this charter is about tightening and verifying that wording, not pretending it does not exist.
- Direct current-build inspection on HEAD `97fb7141...` found both:
  - a preserved-contract anchored Bundesrat run (`9d39491315e844889c96b1d80bd04b85`)
  - a degraded `report_damaged` anchored Bundesrat run (`d08d573be40641ba848025767b17d84f`)

That combination means the current task is not “discover the problem.” The current task is:

> remove the live prompt/spec ambiguity that still lets binding-mode extraction and validation diverge on the primary anchored canary.

## 3. In Scope

### 3.1 Prompt sections in scope

- `CLAIM_CONTRACT_VALIDATION`
- `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX`
- `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`

### 3.2 Test surfaces in scope

- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`

### 3.3 Behavior in scope

- explicit thesis-direct precedence for anchor-carrier qualification
- explicit binding-mode handling when upstream salience did not succeed
- explicit instruction that binding-mode contract validation audits against the provided anchor inventory only

## 4. Out Of Scope

The following are **not** part of this charter:

- changing `CLAIM_SALIENCE_COMMITMENT`
- changing the main `CLAIM_EXTRACTION_PASS2` body
- moving `FACT_CHECK_CONTEXT` or soft-refusal retry framing into the prompt system
- broader PASS2 precedence cleanup (`ISSUE-03`, `ISSUE-12`)
- full claim-to-anchor mapping schema work
- broader Shape B wiring, config expansion, or persistence redesign

The following debated item is also out of scope for this slice unless focused tests prove prompt fallback semantics are insufficient:

- changing runtime appendix loading from `mode === "binding"` to `mode === "binding" && success === true`

Reason: the current working baseline explicitly says not to touch `CLAIM_SALIENCE_COMMITMENT` or `CLAIM_EXTRACTION_PASS2` before the next E2 closeout, and the current highest-value fixes are narrower.

## 5. Root Fixes To Implement

### Fix A: Align validator prompt with runtime thesis-direct filtering

**Problem:**
`CLAIM_CONTRACT_VALIDATION` still says literal substring presence makes a claim an anchor carrier, while runtime only accepts preserved IDs that survive the thesis-direct gate.

**Required prompt change:**

- preserve the “do not miss literal preservation” intent
- remove any wording that implies literal substring presence overrides thesis-directness
- state clearly that a claim qualifies as an anchor carrier only if it is thesis-direct
- keep the validator aligned with the runtime rule already enforced in `evaluateClaimContractValidation(...)`

**Acceptance criterion:**
The prompt text and runtime directness gate describe the same acceptance condition.

### Fix B: Define binding-mode failure semantics explicitly

**Problem:**
Both binding appendices are loaded when `mode === "binding"`, and the prompt file now includes first-pass `success = false` wording. However, that wording still leaves room for an append-then-ignore ambiguity because the LLM receives the binding appendix even when authoritative precommitment failed.

**Required prompt change:**

- in both binding appendices, tighten the existing `mode = "binding"` plus `success = false` instructions so they read as a structural precondition, not a soft preference
- specify that failed salience does not create an authoritative precommitted anchor set
- forbid the model from pretending it received a successful anchor commitment when it did not
- make the fallback explicit: no binding-mode constraint applies when `success = false`; the model must use the base prompt behavior only
- keep runtime loading unchanged for this slice, but make the prompt fallback and tests strong enough that the append-then-fallback design is explicit and reviewable

**Acceptance criterion:**
Binding mode no longer has an ambiguous prompt path when upstream salience failed, and focused tests cover that exact path.

### Fix C: Make binding validator audit source explicit

**Problem:**
The binding validator appendix says to audit against the provided anchors, but it never explicitly tells the model to stop the base prompt’s fresh anchor-discovery behavior.

**Required prompt change:**

- explicitly state that, in binding mode with successful salience, the validator must not discover or substitute a different anchor inventory
- explicitly state that the provided list is the only allowed anchor source for the binding audit
- explicitly suppress the base prompt's anchor-discovery behavior in that successful binding-audit path
- preserve the validator’s normal role for whole-set coherence and anti-inference checks

**Acceptance criterion:**
Binding-mode contract validation uses one anchor inventory, not two competing ones.

## 6. Files To Change

### Prompt file

- `apps/web/prompts/claimboundary.prompt.md`

### Focused test files

- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`

No other source files are required for this slice unless a test reveals an already-live contract mismatch that cannot be expressed at prompt level.

## 7. Verification Plan

### 7.1 Prompt-contract verification

Add or update focused assertions for:

1. `CLAIM_CONTRACT_VALIDATION` explicitly tying anchor-carrier qualification to thesis-direct claims
2. `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` explicitly handling `success = false` as a structural fallback to the base prompt only
3. `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` explicitly handling `success = false` as a structural fallback to the base validator only
4. `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` explicitly forbidding fresh anchor discovery in successful binding audit mode
5. the charter's accepted post-`61815f41` assumptions remain true: the repair prompt is UCM-managed and `CLAIM_CONTRACT_REPAIR` still exists in the prompt file

### 7.2 Runtime-plumbing verification

Keep or add focused tests proving:

1. audit mode does not load binding appendices
2. binding mode does load binding appendices
3. the new prompt contract can accept `salienceBindingContextJson` with `success = false` without unresolved variables or ambiguous wording regressions
4. Pass 2 in binding mode with `success = false` falls back to the same behavioral baseline as audit mode for prompt-contract purposes
5. contract validation in binding mode with `success = false` falls back to base-validator behavior rather than treating the provided failed anchor set as authoritative

### 7.3 Build verification

After prompt edits:

1. reseed prompts
2. run focused Stage 1 Vitest coverage for the three touched test files
3. run `npm -w apps/web run build`

### 7.4 Behavioral spot-checks after implementation

Re-check the minimum live scenarios:

1. Anchored Bundesrat canary (`R2a`)
2. Chronology-only Bundesrat control (`R2b`)
3. One non-anchor control family (`235 000` or Plastic)

These checks are to confirm the prompt-only blocker fix reduced ambiguity without widening drift into unrelated families.

### 7.5 Debated design note

Reviewers split on whether the runtime should stop loading binding appendices when `success = false`.

Consolidated decision for this slice:

- do **not** change runtime appendix-loading architecture in this charter
- do make the append-then-fallback behavior explicit in prompt wording and tests
- if focused tests show prompt fallback semantics are still too ambiguous, open a separate narrow runtime follow-up to gate appendix loading by both `mode` and `success`

## 8. Success Criteria

This charter is complete when all of the following are true:

1. The validator prompt no longer implies literal substring presence can override thesis-directness.
2. Both binding appendices define `success = false` behavior explicitly and unambiguously as a fallback to base behavior.
3. The binding validator appendix explicitly uses the provided anchor inventory as the sole audit source.
4. Focused tests cover the newly specified prompt contracts, including the `success = false` paths.
5. The web build passes after prompt reseeding.
6. The repo can still honestly describe current evidence as supportive but not reproduced statistical closure.

## 9. Rollback / Safety

This is a low-blast-radius slice.

- Primary rollback: revert the prompt-file changes and associated test updates.
- If a smaller prompt-only fix proves insufficient, open a separate follow-up for runtime appendix-loading changes instead of broadening this slice silently.
- Do not combine this slice with broader Pass 2 prompt rewrites.
- Do not combine this slice with salience prompt edits.
- Do not expand the inline `FACT_CHECK_CONTEXT` pattern further; that governance gap remains a separate follow-up.

The goal is not to “finish Phase 7b.” The goal is to remove three known blocker seams while preserving interpretability of the next measurement and implementation steps.

## 10. Next Step After This Charter

Once this slice is implemented and verified, the next decision is whether to:

1. open the next bounded Shape B slice for claim-to-anchor preservation mapping and validator audit evolution, or
2. pause for a narrow current-build verification packet if the implementation results are noisier than expected, or
3. open a separate runtime follow-up if the append-then-fallback architecture proves too ambiguous in tests or live spot-checks

This decision should be made from fresh post-change evidence, not from the current pre-fix packet.

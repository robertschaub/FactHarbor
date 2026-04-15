# Phase 7b Prompt-Blocker Implementation Charter

**Date:** 2026-04-15  
**Status:** Approved-for-implementation charter for the first bounded Phase 7b slice  
**Source inputs:**

- `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`
- `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md`
- `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`
- `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Audit_Validation_Review.md`

## 1. Executive Decision

Proceed with **Phase 7b / Shape B slice 1** as a **prompt-only blocker fix** behind the existing binding-mode boundary.

This charter does **not** authorize broad Shape B completion. It authorizes the smallest high-value fix package that resolves the three still-live prompt/spec blockers already validated on current code and current-build jobs:

1. validator literal-substring rule misaligned with runtime thesis-direct filtering
2. binding appendices missing explicit `success = false` semantics
3. binding validator appendix failing to suppress fresh anchor discovery

This slice is intentionally narrower than full Shape B. It fixes the current prompt contract so the next binding-mode implementation and verification work rests on a coherent prompt/runtime surface.

## 2. Why This Slice Exists

The current repo state supports bounded progress, but not broad overclaim.

What is already true:

- The working baseline says the repo knows enough to begin Shape B responsibly behind a feature flag.
- The E2 note says the current evidence is directionally supportive, but not a reproduced committed-build closeout.
- The prompt-audit validation review confirmed three prompt-level blockers are still live in the current codebase.
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
Both binding appendices are loaded when `mode === "binding"`, but the prompt text only defines the `success = true` case and the empty-anchor case. That leaves `success = false` operationally reachable but underspecified.

**Required prompt change:**

- in both binding appendices, add explicit instructions for `mode = "binding"` plus `success = false`
- specify that failed salience does not create an authoritative precommitted anchor set
- forbid the model from pretending it received a successful anchor commitment when it did not
- keep the base prompt behavior intact for this path, except where the appendix must explicitly say binding authority is absent

**Acceptance criterion:**
Binding mode no longer has an ambiguous prompt path when upstream salience failed.

### Fix C: Make binding validator audit source explicit

**Problem:**
The binding validator appendix says to audit against the provided anchors, but it never explicitly tells the model to stop the base prompt’s fresh anchor-discovery behavior.

**Required prompt change:**

- explicitly state that, in binding mode with successful salience, the validator must not discover or substitute a different anchor inventory
- explicitly state that the provided list is the only allowed anchor source for the binding audit
- preserve the validator’s normal role for whole-set coherence and anti-inference checks

**Acceptance criterion:**
Binding-mode contract validation uses one anchor inventory, not two competing ones.

## 6. Files To Change

### Prompt file

- `apps/web/prompts/claimboundary.prompt.md`

### Test files

- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`

No other source files are required for this slice unless a test reveals an already-live contract mismatch that cannot be expressed at prompt level.

## 7. Verification Plan

### 7.1 Prompt-contract verification

Add or update focused assertions for:

1. `CLAIM_CONTRACT_VALIDATION` explicitly tying anchor-carrier qualification to thesis-direct claims
2. `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` explicitly handling `success = false`
3. `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` explicitly handling `success = false`
4. `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` explicitly forbidding fresh anchor discovery in binding audit mode

### 7.2 Runtime-plumbing verification

Keep or add focused tests proving:

1. audit mode does not load binding appendices
2. binding mode does load binding appendices
3. the new prompt contract can accept `salienceBindingContextJson` with `success = false` without unresolved variables or ambiguous wording regressions

### 7.3 Build verification

After prompt edits:

1. reseed prompts
2. run focused Stage 1 Vitest coverage
3. run `npm -w apps/web run build`

### 7.4 Behavioral spot-checks after implementation

Re-check the minimum live scenarios:

1. Anchored Bundesrat canary (`R2a`)
2. Chronology-only Bundesrat control (`R2b`)
3. One non-anchor control family (`235 000` or Plastic)

These checks are to confirm the prompt-only blocker fix reduced ambiguity without widening drift into unrelated families.

## 8. Success Criteria

This charter is complete when all of the following are true:

1. The validator prompt no longer implies literal substring presence can override thesis-directness.
2. Both binding appendices define `success = false` behavior explicitly.
3. The binding validator appendix explicitly uses the provided anchor inventory as the sole audit source.
4. Focused tests cover the newly specified prompt contracts.
5. The web build passes after prompt reseeding.
6. The repo can still honestly describe current evidence as supportive but not reproduced statistical closure.

## 9. Rollback / Safety

This is a low-blast-radius slice.

- Primary rollback: revert the prompt-file changes and associated test updates.
- Do not combine this slice with broader Pass 2 prompt rewrites.
- Do not combine this slice with salience prompt edits.

The goal is not to “finish Phase 7b.” The goal is to remove three known blocker seams while preserving interpretability of the next measurement and implementation steps.

## 10. Next Step After This Charter

Once this slice is implemented and verified, the next decision is whether to:

1. open the next bounded Shape B slice for claim-to-anchor preservation mapping and validator audit evolution, or
2. pause for a narrow current-build verification packet if the implementation results are noisier than expected

This decision should be made from fresh post-change evidence, not from the current pre-fix packet.
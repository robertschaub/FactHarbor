# Phase 7b Prompt-Blocker Implementation Charter

**Date:** 2026-04-15  
**Status:** Rebased after overlap check. The prompt slice is already landed in the live prompt file; remaining work is verification-only unless a narrow residual gap is proven.  
**Source inputs:**

- `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`
- `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md`
- `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`
- `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Audit_Validation_Review.md`
- `Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Prompt_Issue_Review_Consolidation.md`

## 1. Executive Decision

Do **not** open a fresh prompt-implementation slice from this charter.

The live repo already contains the prompt-only changes this document was originally preparing to implement:

1. validator Rule 11 now explicitly limits anchor carriers to thesis-direct claims
2. both binding appendices now define `success = true`, `success = false`, and empty-anchor behavior
3. the binding validator appendix now explicitly forbids fresh anchor discovery outside the provided list

Current local verification also passed for the three focused Stage 1 test files tied to this slice:

1. `claim-extraction-prompt-contract.test.ts`
2. `claim-contract-validation.test.ts`
3. `claimboundary-pipeline.test.ts`

The rebased plan is therefore narrower:

1. do not reopen already-landed prompt edits
2. keep any further work verification-only unless a specific residual ambiguity is demonstrated
3. if more confidence is wanted, add extra `success=false` fallback coverage and run the minimum live spot-check packet after prompt reseeding

## 2. Why This Slice Exists

The current repo state supports bounded progress, but not broad overclaim.

What is already true:

- The working baseline says the repo knows enough to begin Shape B responsibly behind a feature flag.
- The E2 note says the current evidence is directionally supportive, but not a reproduced committed-build closeout.
- The prompt-audit validation review confirmed three prompt-level blockers are still live in the current codebase.
- Commit `61815f41` already landed important preconditions for this slice: post-repair revalidation, `preservedByQuotes` persistence, and prompt-system governance for `CLAIM_CONTRACT_REPAIR`.
- The live prompt file already contains first-pass `success = false` wording in both binding appendices; this charter is about tightening and verifying that wording, not pretending it does not exist.
- The same-day consolidation handoff says the narrow prompt-only slice is already landed in `apps/web/prompts/claimboundary.prompt.md`, and live file inspection confirms that state.
- A targeted local Vitest run on 2026-04-15 passed the three focused Stage 1 files for this slice: 3 files, 389 tests passed, 1 skipped.
- Direct current-build inspection on HEAD `97fb7141...` found both:
  - a preserved-contract anchored Bundesrat run (`9d39491315e844889c96b1d80bd04b85`)
  - a degraded `report_damaged` anchored Bundesrat run (`d08d573be40641ba848025767b17d84f`)

That combination means the current task is no longer “implement the missing prompt slice.” The current task is:

> preserve an accurate plan, avoid duplicating already-landed prompt work, and only schedule residual verification where the current coverage is still thinner than desired.

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

- verify the live thesis-direct precedence for anchor-carrier qualification remains locked
- verify the live `success=false` binding fallback wording remains locked and understandable
- decide whether extra focused `success=false` coverage should be added for Pass 2 and validator behavior
- prepare the minimum prompt-reseed plus live-canary spot-check packet if fresh post-change evidence is needed

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

## 5. Fix Status After Overlap Check

### Fix A: Validator prompt vs runtime thesis-direct filtering

**Current status:**
Landed.

**Evidence:**

- `CLAIM_CONTRACT_VALIDATION` Rule 11 now says only claims whose `thesisRelevance` is `"direct"` qualify as anchor carriers.
- Runtime already enforced that same rule in `evaluateClaimContractValidation(...)`.
- The focused contract-validation and prompt-contract tests pass against the current text.

**Next step:**
No new prompt edit is required for this item unless wording is intentionally refined for readability.

### Fix B: Binding-mode `success=false` semantics

**Current status:**
Mostly landed at prompt-text level; residual verification may still be worthwhile.

**Evidence:**

- `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` says: when `success` is `false`, ignore the provided `anchors` list and follow the base extraction prompt unchanged.
- `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` says: when `success` is `false`, fall back to the base validator behavior and do not treat binding mode alone as proof that a particular anchor exists.
- The prompt-contract test currently locks the validator appendix wording, and the broader focused test run is green.

**Residual gap:**
The current focused suite does not yet prove a dedicated Pass 2 `success=false` behavioral-equivalence path as explicitly as it could.

**Next step:**
If more confidence is desired, add one or two narrow tests for binding mode plus `success=false` rather than reopening runtime architecture or broad prompt edits.

### Fix C: Binding validator audit source

**Current status:**
Landed.

**Evidence:**

- `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` now says to audit the provided `anchors` list only and to not discover an anchor outside that list.
- `claim-extraction-prompt-contract.test.ts` explicitly locks the `single most decisive thesis-direct anchor` wording and the `Do not discover an anchor outside that list` rule.

**Next step:**
No new prompt edit is required for this item unless a fresh live run shows unexpected validator behavior.

## 6. Files To Change

Default expectation after overlap check: no prompt-file change is currently required.

### Prompt file

- `apps/web/prompts/claimboundary.prompt.md` only if a new narrow ambiguity is identified during residual verification

### Focused test files

- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts` only if adding explicit `success=false` validator-behavior coverage
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` if adding explicit Pass 2 or validator `success=false` runtime-plumbing coverage
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts` if adding parity coverage for the Pass 2 appendix text

No other source files are currently indicated. Runtime appendix-loading changes remain a separate follow-up unless a new focused test demonstrates that prompt-level fallback is insufficient.

## 7. Verification Plan

### 7.0 Current local status

Already verified on 2026-04-15:

1. `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
2. Result: 3 test files passed, 389 tests passed, 1 skipped
3. Live prompt inspection confirms the expected Rule 11, `success=false`, and no-discovery wording is present

### 7.1 Prompt-contract verification

Current state:

1. `CLAIM_CONTRACT_VALIDATION` already ties anchor-carrier qualification to thesis-direct claims
2. `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` already locks `success=false` fallback and no-discovery wording
3. `CLAIM_CONTRACT_REPAIR` remains present and prompt-managed

Optional additional coverage:

1. add parity prompt-contract assertions for `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` covering `success=false` and empty-anchor wording

### 7.2 Runtime-plumbing verification

Current state:

1. audit mode does not load binding appendices
2. binding mode does load binding appendices

Optional additional coverage:

3. a dedicated Pass 2 binding-mode test with `success = false`
4. a dedicated contract-validation binding-mode test with `success = false`
5. if those tests expose unresolved ambiguity, open a separate narrow runtime follow-up rather than broadening this slice silently

### 7.3 Build verification

Only if files change:

1. reseed prompts
2. run focused Stage 1 Vitest coverage for the three touched test files
3. run `npm -w apps/web run build`

### 7.4 Behavioral spot-checks after implementation

Re-check the minimum live scenarios:

1. Anchored Bundesrat canary (`R2a`)
2. Chronology-only Bundesrat control (`R2b`)
3. One non-anchor control family (`235 000` or Plastic)

These checks are only needed if fresh live validation is desired after any additional prompt reseed or test-focused change.

### 7.5 Debated design note

Reviewers split on whether the runtime should stop loading binding appendices when `success = false`.

Consolidated decision for this slice:

- do **not** change runtime appendix-loading architecture in this charter
- do make the append-then-fallback behavior explicit in prompt wording and tests
- if focused tests show prompt fallback semantics are still too ambiguous, open a separate narrow runtime follow-up to gate appendix loading by both `mode` and `success`

## 8. Success Criteria

This rebased charter is complete when all of the following are true:

1. The plan no longer schedules prompt work that is already landed in the live repo.
2. Current repo status is described honestly: Fix A and Fix C are landed; Fix B is landed at prompt level and may justify extra coverage, not a broad reimplementation.
3. Any further work stays verification-only unless a narrow new ambiguity is demonstrated.
4. If extra coverage is added, it is limited to the `success=false` path and passes locally.
5. The repo can still honestly describe current evidence as supportive but not reproduced statistical closure.

## 9. Rollback / Safety

This remains a low-blast-radius follow-up.

- Primary rollback: revert only any newly added verification-focused tests or prompt wording tweaks.
- If a smaller verification-only follow-up proves insufficient, open a separate follow-up for runtime appendix-loading changes instead of broadening this slice silently.
- Do not combine this slice with broader Pass 2 prompt rewrites.
- Do not combine this slice with salience prompt edits.
- Do not expand the inline `FACT_CHECK_CONTEXT` pattern further; that governance gap remains a separate follow-up.

The goal is not to “finish Phase 7b.” The goal is to keep the plan accurate, avoid duplicating already-landed work, and isolate any truly remaining `success=false` verification need without reopening broad prompt churn.

## 10. Next Step After This Charter

From this rebased state, the next decision is whether to:

1. stop here because the prompt slice is already landed and locally green, or
2. add one narrow `success=false` coverage packet plus prompt reseed and minimum canary spot-checks, or
3. open a separate runtime follow-up if the append-then-fallback architecture proves too ambiguous in new focused tests or live spot-checks

This decision should be made from fresh verification evidence, not from the earlier pre-overlap assumptions.

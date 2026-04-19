## Task

Investigate and fix the Bundesrat Stage 1 atomicity regression where the input
`Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
was emitted as a non-atomic single claim.

## Changes Made

### Prompt changes

Three prompt commits were made while isolating the failure mode:

- `24dac263` `fix(prompt): split independently verifiable coordinated branches`
- `dd9a222f` `fix(prompt): split conjunctive decision gates`
- `3c740f28` `fix(prompt): keep modifiers fused in branch splits`

These changes:

- classified independently verifiable coordinated temporal branches as `multi_assertion_input`
- clarified that conjunctive decision gates like `A und B entschieden` are not automatically one atomic branch
- required truth-condition-bearing modifiers to stay fused to the main act in each branch claim
- forbade the bad shape where chronology and modifier were split into separate thesis-direct claims

### Structural Stage 1 fix

Committed in:

- `bbdf6c73` `fix(stage1): skip repair on contract-approved claim sets`

Implementation:

- added `shouldRunContractRepairPass(...)`
- changed C11b so the contract-repair pass no longer mutates claim sets that the contract validator has already approved

Why:

- event history showed the repair pass firing immediately after successful contract validation
- the repair path required the full literal anchor text to appear in one claim
- that behavior is incompatible with valid coordinated-branch decompositions, because each branch should carry only its own actor-specific clause

### Tests

Updated or added:

- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/repair-anchor-selection.test.ts`

Validated with:

- `npm -w apps/web exec vitest run test/unit/lib/analyzer/repair-anchor-selection.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts`

Result:

- `57 passed`

## Key Verification Runs

### Original failing reference

- `820600477bc4461a826c81dfe8730ef3`

Observed issue:

- one bundled atomic claim covering both `Volk` and `Parlament`

### Diagnostic run after repair-pass gating

- Job: `06706852b6964b729fb88a78203f7bc3`
- Executed hash: `bbdf6c73...+c137427b`

Observed Stage 1 output:

- `AC_01`: `... rechtskräftig ... bevor das Parlament ...`
- `AC_02`: `... rechtskräftig ... bevor das Schweizer Volk ...`

Interpretation:

- once the repair pass stopped collapsing approved sets, the intended two-branch split could survive

### Final clean verification run

- Job: `447cc942ec594ccab07ee4c232c5d05c`
- Executed hash: `fd4d6abf085ea41e2a67ed200224f68a75015d6a`

Observed Stage 1 output:

- regression to one bundled claim
- `contractValidationSummary.stageAttribution` stayed `initial`

Interpretation:

- the repair-pass collapse is fixed
- the remaining instability is now in initial extraction / contract-validation judgment itself
- prompt-only tightening improved behavior but did not make the branch split stable across clean reruns

## Current Status

Partially fixed.

Fixed:

- contract-approved coordinated-branch sets are no longer forcibly collapsed by C11b repair

Not fixed:

- Stage 1 still sometimes classifies the Bundesrat input as a valid single claim on clean reruns

## Recommended Next Step

Do not rely on broader prompt wording alone.

Add a dedicated LLM-based branch-atomicity enforcement step for contract-approved single-claim outputs, for example:

- a focused validator that decides whether one act/state is tied to multiple independently verifiable coordinated branches
- if yes, force a targeted reprompt even when the generic contract validator otherwise approves the set

Reason:

- the generic validator is still too willing to accept the bundled form as “near-verbatim and contract-preserving”
- the structural repair bug is no longer masking the real issue

## Warnings

- The best decomposition observed in this session was produced on a dirty build hash because generated AGENTS indexes were uncommitted at the time.
- The final clean verification run on `fd4d6abf` still regressed to one bundled claim.

## Learnings

- C11b was overpowered: forcing the full literal anchor into one claim is incompatible with valid coordinated-branch decomposition.
- For this family, “contract-preserving” and “atomic enough” are separate judgments and need separate enforcement.

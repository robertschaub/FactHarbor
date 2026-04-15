# Phase 7 Working Baseline — Archived Completed-Fix Detail

**Archived from:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`  
**Archive date:** 2026-04-15  
**Why archived:** these sections recorded completed or already-addressed Phase 7 fix detail that no longer needs to stay in the active forward-looking baseline.

## Archived fixed rows from Section 4.2 Root fixes

| Fix area | Root fix | Why this fix exists | Type | Priority | Proof obligation |
|---|---|---|---|---|---|
| Measurement surface | always refresh `contractValidationSummary` after any successful repair before persistence | final stored summary must describe the final stored claim set, not a pre-repair state | code / observability | P0 | stored summary changes when repair changed the active claim set |
| Measurement surface | persist validator quote-level proof (`preservedByQuotes`) alongside IDs | audit claims about anchor preservation need traceable proof, not only claim IDs | code / schema | P0 | stored record includes exact quoted preservation evidence when validator approved |
| Prompt governance | move `runContractRepair` prompt text out of inline TypeScript and into `claimboundary.prompt.md` as a dedicated prompt section | Stage 1 contract should live in one reviewable prompt system, not half in code | prompt / code hygiene | P1 | no inline repair prompt remains in `claim-extraction-stage.ts` |
| Prompt/runtime alignment | explicitly reconcile the validator prompt’s literal-anchor rule with runtime directness filtering | current prompt and runtime contracts are not perfectly aligned | prompt + code/spec | P1 | prompt text and runtime rule describe the same acceptance condition |

## Archived Section 5.2 Completed hardening and cleanup

The following items are no longer planning items; they are completed in `61815f41`:

| Change | Files / scope | Why now | Rollback | Verification |
|---|---|---|---|---|
| Expand salience-stage status contract in code/types | `claim-extraction-stage.ts`; `types.ts` | establish a richer contract for success/failure state | revert `61815f41` | targeted unit/integration verification |
| Force post-repair contract revalidation before persistence | `claim-extraction-stage.ts` | prevent stale pre-repair summaries | revert `61815f41` | repair-path verification |
| Persist `preservedByQuotes` and add `stageAttribution` to the contract surface | `claim-extraction-stage.ts`; `types.ts` | add auditability and recovery attribution hooks | revert `61815f41` | JSON/result inspection |
| Move repair prompt into prompt system | `claimboundary.prompt.md`; `claim-extraction-stage.ts` | unify Stage 1 contract governance | revert `61815f41` | prompt-load verification |

## Archived Phase 7b implementation-track item resolved after this baseline

| Step | Scope | Output | Verification |
|---|---|---|---|
| Resolve thesis-direct vs literal-substring precedence explicitly | validator prompt + evaluation logic | no ambiguity once anchor mapping is authoritative | focused validator tests |

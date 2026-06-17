# Stage 1 Contract Completion Review Packet

**Date:** 2026-05-28  
**Role:** Lead Architect + LLM Expert  
**Status:** Ready for review; not implemented  
**Review revision:** Rev 2 after first reviewer round  
**Related commits:** `f1130e40` cache-off hardening and failed prompt-only attempt, `e7deeb8b` surgical revert of prompt-only attempt  
**Release stance:** Do not deploy while the exact Bolsonaro EN statement remains release-gating.

## Problem

The exact input:

`The legal proceedings and the verdicts against Jair Bolsonaro regarding the attempted coup d'état complied with Brazilian law and international standards`

still exposes a Stage 1 contract-preservation failure under the required cache-off runtime. The prompt-only coordinated-axis clarification was committed, tested, and live-smoked, but it did not close the failure mode. It was then surgically reverted.

The hard failure is not verdict quality; it happens before research when `understanding.contractValidationSummary.preservesContract === false` triggers `report_damaged` in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` around the early termination gate.

## Current Mechanism

Relevant current code paths:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
  - Pass 2 extraction runs first.
  - `validateClaimContract(...)` then checks whether the claim set preserves the original input contract.
  - If validation fails or is unavailable, a single Pass 2 retry is attempted with corrective guidance.
  - `runContractRepair(...)` is a narrow anchor-repair path using `CLAIM_CONTRACT_REPAIR`.
  - Current carrier protection is based on `truthConditionAnchor.validPreservedIds`.
  - `filterByCentrality(...)` accepts required IDs, but still slices to `maxClaims`; if required IDs exceed the cap, required claims can still be dropped.
  - Gate 1 post-processing only protects anchor carriers, not all revalidated contract carriers.
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
  - Automatic claim selection runs after Stage 1 and can break a revalidated complete contract set unless contract carriers are forced into candidate/evaluated/selected IDs.
- `apps/web/src/lib/analyzer/claim-selection-filter.ts`
  - Filters `truthConditionAnchor.validPreservedIds` through selected claim IDs; it must also filter any new `contractCarrierClaimIds`.
- `apps/web/prompts/claimboundary.prompt.md`
  - `CLAIM_CONTRACT_REPAIR` currently says `Do not add new claims`; it is not suitable for omitted-proposition completion.
- `apps/web/src/lib/config-schemas.ts` and `apps/web/configs/calculation.default.json`
  - Current UCM only has `claimContractValidation.repairPassEnabled`.
- `apps/web/src/lib/analyzer/types.ts` and `apps/web/src/lib/analyzer/warning-display.ts`
  - Warning registry currently includes `contract_validation_retry_triggered` and `contract_repair_pass_fired`.

## Proposed Mechanism

Rename the concept from "repair" to **contract completion**.

Implement a single Stage 1 **contract-repair coordinator** with mutually exclusive subpaths:

1. **Anchor repair path**: existing behavior for verbatim truth-condition anchor preservation.
2. **Completion path**: new structured LLM call for omitted thesis-direct propositions.

The completion path should run only after:

- initial contract validation ran;
- existing Pass 2 contract retry failed to produce a cleanly validated claim set;
- the failure is a usable structured `contract_violated` result, not validator unavailability.

If validator output is unavailable, do not run completion unless a structured validator availability recovery succeeds. No fail-open behavior.

## Validator Availability Branch

Completion does not solve `validator_unavailable`. The coordinator therefore needs an explicit validator-availability branch:

1. If the latest contract validation result is unavailable, run a bounded validation-only recovery on the active claim set.
2. This branch must not mutate claims and must not call completion.
3. If validation recovery returns a usable structured result:
   - if it preserves contract, continue normally;
   - if it reports `contract_violated`, the completion path may become eligible;
   - if it still reports `validator_unavailable`, keep the current `report_damaged` abort.
4. If validation recovery returns no usable result, keep the current `report_damaged` abort.

This branch is a structured-output availability safeguard, not a semantic retry loop. It must be bounded and covered by tests.

## Completion Path Contract

Add a new prompt section, separate from `CLAIM_CONTRACT_REPAIR`, for example:

`CLAIM_CONTRACT_COMPLETION`

For the first implementation slice, prefer an **independent completion LLM comparison** over extending the validator schema. The completion prompt compares the original input and current claim set directly, while using only structured validator status (`contract_violated`) as trigger context. It does not consume validator `summary` or claim-level prose.

The output must be structured and schema-validated. Draft shape:

```json
{
  "completionEligible": true,
  "failureKind": "omitted_thesis_direct_proposition",
  "omittedPropositions": [
    {
      "id": "OP_01",
      "description": "Abstract description of the missing proposition",
      "whyInScope": "Trace to original input and current claim gap"
    }
  ],
  "atomicClaims": []
}
```

Implementation constraints:

- Do not parse validator `summary` or per-claim `reasoning`.
- Do not use deterministic semantic keyword logic.
- Do not use Bolsonaro-specific, Brazil-specific, legal-proceeding-specific, or language-specific wording.
- Put all semantic completion instructions in the UCM-managed `CLAIM_CONTRACT_COMPLETION` prompt section. Any inline `generateText` user message in TypeScript must be structural only, for example "Return the completion JSON for the supplied payload"; it must not describe semantic decomposition, omission criteria, or topic/content rules.
- The completion LLM must compare the original input and current claims directly, or consume new structured omission fields if the validator schema is extended.
- Preserve existing claim IDs for unchanged claims.
- Add only bounded thesis-direct omitted claims.
- Assign new IDs structurally, e.g. next available `AC_XX`.
- Enforce `completionMaxAddedClaims`.
- Require `validateClaimContract(...)` to approve the completed set before it can replace active Pass 2 output.
- If revalidation fails, keep current damaged-report path.

## Carrier Protection

This is the highest-risk integration point.

If completion revalidation passes, protect the **whole revalidated contract-preserving claim set** through centrality, Gate 1, and automatic claim selection. Do not protect only `truthConditionAnchor.validPreservedIds`.

Rev 2 decision:

- Add `contractCarrierClaimIds` to `contractValidationSummary` after a clean revalidation. It should contain the IDs of the revalidated thesis-direct contract carriers that must survive to research.
- Derive local Stage 1 protection sets from `contractValidationSummary.contractCarrierClaimIds`.
- Do not rely on current `requiredClaimIds` behavior alone. When the current claim set is contract-approved, the effective centrality/Gate 1 cap must be raised to at least `contractCarrierClaimIds.length`, or the code must take an explicit include-all-carriers branch.
- Update Gate 1 pruning so contract carriers are restored and are not pruned as non-anchor fidelity failures.
- Update automatic claim selection so contract carriers are always:
  - included in the evaluated candidate set even when they fall beyond `candidateCap`;
  - included in final selected IDs even when the selector ranks them lower;
  - reflected transparently in `claimSelection` metadata.
- Update `claim-selection-filter.ts` so `contractCarrierClaimIds` is filtered/reordered consistently with selected IDs.

The protection must be structural and LLM-output-driven; no text matching.

## UCM And Warnings

Add calculation config fields in TS schema and JSON defaults:

- `claimContractValidation.completionEnabled`
- `claimContractValidation.completionMaxAttempts`
- `claimContractValidation.completionMaxAddedClaims`
- `claimContractValidation.validatorAvailabilityMaxAttempts`

Do **not** add `completionTriggerModes` in the first slice. A trigger-mode enum is too open-ended until the failure taxonomy is proven by tests.

Warning/event surface:

- Use `state.onEvent` / console logs for routine attempted and accepted completion.
- Add at most one registered admin-info analysis warning such as `contract_completion_diagnostic` for tuning-relevant non-user-facing outcomes (`rejected`, `validation_failed`, `skipped_validator_unavailable`). Store the specific outcome in `details.outcome`.
- Successful completion should not be user-facing degradation.
- Failed completion followed by abort remains the existing `report_damaged:error`.

Anthropic prompt caching remains always off. Do not add provider options that re-enable it.

## File Scope

Expected implementation files:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/claim-selection-filter.ts`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/calculation.default.json`

Expected test files:

- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-selection-filter.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/config-schemas.test.ts`
- `apps/web/test/unit/lib/config-drift.test.ts`
- Optional new focused Stage 1 completion test file if it keeps `claimboundary-pipeline.test.ts` from growing further.

## Required Tests

Mocked tests before live jobs:

1. Omitted proposition completion succeeds and is revalidated.
2. Completion that adds unsupported or non-thesis-direct claims is rejected.
3. Validator-unavailable state does not run completion and does not fail open.
4. Completion output exceeding `completionMaxAddedClaims` is rejected.
5. Validator-availability recovery can convert unavailable validation into a usable structured result, then routes correctly.
6. Centrality cannot drop revalidated contract carriers even when carrier count exceeds the normal cap.
7. Gate 1 pruning cannot drop non-anchor contract carriers.
8. Automatic claim selection cannot drop contract carriers, including when `candidateCap` or selection cap is lower than carrier count.
9. `claim-selection-filter.ts` rewrites `contractCarrierClaimIds` consistently.
10. Existing anchor repair behavior still works.
11. Existing anchor repair is not broadened to add new omitted claims.
12. Warning registry has full coverage.
13. JSON defaults match TS defaults.

Safe verification before live jobs:

- focused Stage 1/contract tests;
- `npm test`;
- `npm -w apps/web run build`;
- prompt/config reseed;
- verify active UCM `anthropicPromptCachingEnabled = false`.

Live validation after commit and restart/reseed:

- Submit three exact Bolsonaro EN smoke jobs into the current local DB.
- Stage 1 acceptance: 3/3 no `report_damaged`, complete contract coverage, prompt caching off.
- Deployment is still blocked if verdict-integrity failures remain; assess those separately after Stage 1 is stable.

## Reviewer Questions

1. Does Rev 2 close the carrier-preservation blocker through centrality, Gate 1 pruning, and auto claim selection?
2. Is the validator-availability branch sufficient, or should `validator_unavailable` remain a separate blocker outside this implementation?
3. Is independent completion comparison the right first slice, avoiding validator schema changes?
4. Is `contractCarrierClaimIds` in `contractValidationSummary` the right protection/audit model?
5. Are the reduced UCM fields and single diagnostic warning enough?
6. Are there lower-risk alternatives that are not just stochastic retry or forbidden deterministic semantic logic?
7. Are any implementation or test blockers missing?

## Proposed Review Verdict To Seek

Proceed only if reviewers approve the Rev 2 coordinator shape, absolute carrier-preservation model, validator-availability branch, and auto-selection protection. If any of those remain disputed, resolve before implementation.

## Review Round 1 Outcome

Two reviewers returned **Changes Requested** on Rev 1.

Main blockers found:

- current `requiredClaimIds` plumbing cannot guarantee carrier preservation when required IDs exceed `maxClaims`;
- Gate 1 pruning protects only anchor carriers;
- automatic claim selection can drop contract carriers after Stage 1;
- `validator_unavailable` needed an explicit branch;
- warning surface was over-instrumented;
- `completionTriggerModes` was under-specified;
- semantic completion instructions must be kept in UCM prompt text, not hardcoded inline;
- independent completion comparison is preferred over validator-schema extension for the first slice;
- `stageAttribution` needs a distinct completion attribution rather than hiding completion under `repair`.

Rev 2 incorporates those changes. Add `stageAttribution: "completion"` to the implementation scope.

## Review Round 2 Outcome

Rev 2 was sent back to both reviewers.

- Implementation-focused reviewer: **Approved**. No remaining blockers after absolute carrier preservation, Gate 1 pruning protection, auto-selection carrier survival, validator-unavailable handling, independent completion comparison, reduced UCM/warning scope, and distinct `stageAttribution: "completion"` were added.
- Adversarial reviewer: **Changes requested**, then **Approved** after one final blocker was addressed. The blocker was that semantic completion instructions must not be hardcoded in TypeScript inline messages. The packet now explicitly requires all semantic instructions to live in the UCM-managed `CLAIM_CONTRACT_COMPLETION` prompt section, with inline `generateText` user content limited to structural dispatch only.

Final review status: **Approved for implementation planning**.

Do not treat this as deploy approval. It approves the implementation design only. Deployment remains gated on tests, commit-first live jobs, and post-run report-quality assessment.

# Captain Deputy Handoff - V2 HighJump HJ20 W5 Output-Shaping Repair

## Summary

HJ20 is locally implemented and verifier-clean. It addresses the HJ19 W5 stop:
`damaged_execution` / `schema_validation_failed` with schema issue
`evidenceItems` / `too_big`.

The repair amends only the existing `V2_EVIDENCE_EXTRACTION` prompt contract
and its focused prompt-contract test. No live canary has run yet.

## Implementation Delta

- Added topic-neutral `EvidenceItem Selection Budget` guidance to
  `apps/web/prompts/claimboundary-v2.prompt.md`.
- Normal output target is now `2` to `5` EvidenceItems, with a hard instruction
  not to exceed `5` EvidenceItems for one extraction packet in the HighJump path.
- Prompt now instructs the model to choose the strongest materially distinct
  points, avoid one item per source/minor detail, and omit lower-value or
  duplicative items rather than emit oversized or incomplete JSON.
- Prompt now explicitly requires complete strict fields for every included
  EvidenceItem, including full `evidenceScope` and strict `provenance`.
- `prompt-contract.test.ts` asserts the new budget guidance and checks that the
  W5 prompt section does not contain Captain canary-domain terms.

No schema relaxation, adapter normalization, retries, model/provider/source
changes, parser/cache/SR/storage, public behavior, ACS/direct URL, V1 work, or
V1 cleanup was added.

## Failed-Attempt Recovery

The first broad `analyzer-v2` verifier surfaced a W7C product-chain
timeout/order failure outside the touched HJ20 prompt/test surface.

Decision:

- keep the HJ20 prompt repair;
- isolate W7C before editing;
- do not patch W7C unless the isolated failure reproduced.

Outcome:

- isolated W7C passed (`1` file / `5` tests);
- full `analyzer-v2` rerun passed (`144` files / `871` tests);
- no W7C source or test behavior was changed.

## Verifiers

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
  (`2` files / `17` tests)
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` (`75` files /
  `356` tests)
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts`
  (`1` file / `5` tests)
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` (`144` files / `871`
  tests)
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors` (`advisory_warn`)
- `npm -w apps/web run build`

Pending after docs/index update:

- `npm run index`
- `git diff --check`

## Debt-Guard Result

Classification:

- `incomplete-existing-mechanism`; failed broad verifier recovery classified as
  `keep`.

Chosen option:

- amend the existing W5 prompt contract.

Rejected path and why:

- schema relaxation, adapter normalization, retries, source/provider/model
  changes, and new diagnostics were rejected because the observed artifact was
  parseable but oversized, and the existing prompt contract can carry the repair
  with lower net complexity.

What was removed/simplified:

- no code removed; output target simplified by explicit item budget.

What was added:

- prompt guidance and focused prompt-contract assertions.

Net mechanism count:

- unchanged.

Budget reconciliation:

- actual diff stayed inside the expected prompt/test/docs envelope; no new
  branches, helpers, routes, retries, flags, schemas, or hidden artifacts.

Debt accepted and removal trigger:

- temporary HighJump prompt-side output shaping; revisit after successful
  internal report review shows evidence sufficiency and report quality.

Residual debt:

- one broad-suite W7C timeout/order symptom did not reproduce in isolation or on
  full rerun.

## Next Action

After commit:

1. Confirm clean git status.
2. Refresh runtime.
3. Verify API/Web runtime commits match the HJ20 implementation commit.
4. Preflight relevant hidden routes/default redaction posture.
5. Run exactly one HJ20 canary on the Captain-defined hydrogen input.

No second HJ20 canary is authorized without a new decision.

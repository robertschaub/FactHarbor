# V2 HighJump HJ53 - Claim Understanding Short Broad Claim Bar Repair

**Status:** local implementation verifier-clean; UCM activation/live rerun pending
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ52 plastic job `b89acb3e1d1745a9835d0125fd4b48c9`

## Why This Slice Exists

HJ52 showed that `Plastic recycling is pointless` still stops before Query
Planning: Claim Understanding blocks, selects `0` AtomicClaims, and no report
path can begin. The failure is not source acquisition, extraction, verdict
calibration, or report writing; it is the Claim Understanding admission bar for
short broad but externally assessable claims.

## Scope

Allowed:

- amend the existing `V2_CLAIM_UNDERSTANDING_GATE1` prompt section with
  topic-neutral guidance for concise broad evaluative assertions;
- add/update focused prompt-contract tests;
- import and activate the updated `claimboundary-v2` prompt profile through
  UCM after commit because the profile is not file-seeded;
- run one focused plastic rerun after verifiers, UCM activation, runtime
  refresh, and clean provenance.

Closed:

- code-side deterministic claim admission rules, hardcoded trigger words,
  topic-specific examples, source/provider changes, parser/cache/SR/storage,
  report/verdict/warning/confidence behavior, public exposure, direct URL/ACS,
  V1 work, and V1 cleanup.

## V2 Scorecard Impact

Positive:

- V2-Q1 Usable report path: admits a previously blocked Captain-defined input
  into the actual V2 path.
- V2-Q2 Claim understanding: improves generic Gate 1 behavior for short broad
  but analyzable claims.
- V2-Q6 Report quality: enables downstream evidence/report review instead of an
  early administrative stop.

## V2 Retirement Ledger Impact

No new mechanism. This amends the existing Claim Understanding prompt rather
than adding special-case code or another hidden readiness layer.

## V2 Consolidation Gate

Allowed because HJ52 identified a concrete report-path blocker and the repair
is an in-place prompt refinement. It reduces pressure to add code-side claim
admission workarounds.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing V2 Claim Understanding prompt section.

Rejected paths:

- deterministic code-side handling for short/broad claims, because semantic
  admission belongs to LLM Claim Understanding;
- source/extraction/report changes, because HJ52 stopped before Query Planning;
- topic-specific prompt examples or trigger terms, because prompt changes must
  remain generic and not teach to a canary.

Net mechanisms: unchanged.

## Verification Plan

Before live job:

- focused V2 Claim Understanding prompt-contract test;
- focused Claim Understanding runtime/model tests if import surface requires;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- commit;
- import/activate the prompt in UCM with a new version label;
- refresh runtime and verify Web/API/proxy commit match;
- verify active `claimboundary-v2` prompt hash changed to the committed prompt.

Live validation:

- exactly one rerun for the Captain-defined input
  `Plastic recycling is pointless`;
- pass if Claim Understanding accepts at least one selected AtomicClaim and the
  job reaches Query Planning or later while public/default containment holds;
- if Claim Understanding still blocks, stop and classify the failed attempt
  before another repair;
- if downstream stops occur, record the new stage and do not stack another
  repair in the same slice.

Local verifier result, 2026-05-23:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
  passed: 1 file, 12 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts`
  passed: 3 files, 37 tests.
- `npm run validate:v2-gates` passed.
- `npm run debt:sensors` returned `advisory_warn` with known V2 source/test
  footprint, boundary-guard size, docs footprint, debt-guard telemetry, and
  consolidation-marker warnings.
- `npm -w apps/web run build` passed.
- `npm run index` passed.
- `git diff --check` passed.

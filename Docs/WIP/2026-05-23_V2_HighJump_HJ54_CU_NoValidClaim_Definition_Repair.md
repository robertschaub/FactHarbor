# V2 HighJump HJ54 - Claim Understanding no_valid_claim Definition Repair

**Status:** local implementation verifier-clean; pending commit, UCM activation,
runtime refresh, and one focused live rerun
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ53 job `dfa9bd1bdb0749b095d1dd647444d86e`
**Active live-job budget:** reset by Captain to 18 after HJ53; this slice may
consume exactly one job after clean provenance and runtime refresh.

## Why This Slice Exists

HJ53 proved the committed prompt repair was active, but Claim Understanding
still returned `blocked/no_valid_claim` for the Captain-defined input
`Plastic recycling is pointless`. The failure is now narrowed to the semantic
admission decision inside Claim Understanding. It is not stale runtime, UCM
activation, prompt hash mismatch, route submission, Query Planning, Source
Material, extraction, report writing, or public containment.

## Review Consensus

The local recovery reviewer and Claude Opus 4.6 both concluded that the HJ53
guidance was directionally correct but non-binding against the earlier
`no_valid_claim` precedence rule. The next lowest-complexity repair is to
amend the existing `no_valid_claim` operational definition and connect it to
Claim Selection guidance.

## Scope

Allowed:

- amend only `V2_CLAIM_UNDERSTANDING_GATE1` in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- strengthen prompt-contract tests in
  `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`;
- import and activate the updated `claimboundary-v2` prompt profile through
  UCM after commit;
- run one focused rerun for `Plastic recycling is pointless` after verifiers,
  UCM activation, runtime refresh, and clean provenance.

Closed:

- deterministic semantic admission code, topic-specific examples, canary
  wording, model/provider changes, schema relaxation, source/provider changes,
  parser/cache/SR/storage, report/verdict/warning/confidence behavior, public
  exposure, direct URL/ACS, V1 work, and V1 cleanup.

## V2 Scorecard Impact

Positive:

- V2-Q1 usable report path: addresses the remaining early block for a
  Captain-defined input.
- V2-Q2 Claim Understanding: makes the admission bar explicit for short broad
  but externally assessable direct assertions.
- V2-Q6 report quality: keeps the route to report evidence open without adding
  downstream machinery.

## V2 Retirement Ledger Impact

No new mechanism. This amends the existing prompt contract and avoids a
code-side admission workaround or another hidden readiness layer.

## V2 Consolidation Gate

Allowed because HJ53 produced concrete live evidence that the existing prompt
contract is still too easy to apply conservatively. The slice changes one
existing prompt section and one existing prompt-contract test file.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: keep HJ53's generic intent and amend the existing
`no_valid_claim` definition in place.

Rejected paths:

- revert HJ53, because the wording is generic and in the correct LLM-owned
  layer;
- add deterministic admission logic, because semantic claim admission belongs
  to Claim Understanding;
- change model/provider, because the prompt definition has not yet been made
  operationally explicit;
- source/extraction/report repair, because HJ53 stopped before Query Planning.

Net mechanisms: unchanged.

## Verification Plan

Before live job:

- focused prompt-contract test;
- focused Claim Understanding prompt/model/runtime tests;
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

- exactly one rerun for `Plastic recycling is pointless`;
- pass if Claim Understanding accepts at least one selected AtomicClaim and the
  job reaches Query Planning or later while public/default containment holds;
- if Claim Understanding still returns `no_valid_claim`, do not stack another
  prompt tweak; classify the attempt and escalate to model-tier/prompt review;
- if a downstream stop appears, record the new stage and stop this slice.

## Local Verification

Completed before commit on 2026-05-23:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
  - passed, 12 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts`
  - passed, 37 tests across 3 files
- `npm run validate:v2-gates`
  - passed
- `npm run debt:sensors`
  - `advisory_warn`; warnings are the known V2 footprint/docs/consolidation
    advisory signals and are not promoted to blockers for this narrow repair
- `npm -w apps/web run build`
  - passed
- `npm run index`
  - passed
- `git diff --check`
  - passed

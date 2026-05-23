# V2 HighJump HJ62 W7-B Truth-Scale Polarity Repair

**Status:** implementation verifier-clean; pending UCM prompt activation and live validation
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, prompt edits allowed, live-job budget
remaining `14` after HJ61

## Purpose

HJ61 partially improved W7-B candidate coherence but exposed a more basic
contract defect: W7-B can emit a false-side verdict label with a high truth
percentage. Hydrogen produced `FALSE` 92/88 and `MOSTLY-FALSE` 78/72. Plastic
also showed a likely polarity problem: the report prose said evidence
contradicted the claim, while the primary verdict remained `MOSTLY-TRUE`.

Truth percentage must mean the estimated truth of the selected AtomicClaim, not
confidence in the chosen verdict label or confidence that the opposite of the
claim is true. HJ62 amends the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt
contract to make that structural invariant explicit.

## Scope

Allowed:

- amend only the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt section in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- update focused prompt-contract tests;
- import/activate the revised `claimboundary-v2` prompt through UCM before live
  validation;
- run a small guardrail live canary set after commit/runtime refresh.

Closed:

- no code-side deterministic semantic rule;
- no report-writer value mutation;
- no schema/model/config/provider/source/parser/cache/SR/storage changes;
- no source expansion, retries, ACS/direct URL, public behavior, UI/report/export
  cutover, compatibility projection, or V1 work;
- no family-specific prompt examples or benchmark vocabulary.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q5 verdict quality.

Direct user/report value: prevents internally contradictory report values such
as `FALSE` with high truth percentage.

Hidden-only value: none added; this amends an existing LLM task contract.

Cost/latency impact: unchanged per job.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-021 and V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ62 succeeds, keep W8 value-preserving and avoid a
downstream report-value correction mechanism.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package amends an existing prompt mechanism and test. It adds no hidden
artifact, route, denial layer, proof layer, retry, fallback, or parallel report
path.

## Debt-Guard

Path: Full.

Classification: `incomplete-existing-mechanism` after failed-attempt recovery.

Prior attempt: keep HJ61 candidate-economy and temporal-posture guidance; amend
the existing W7-B calibration section.

Chosen option: amend the existing prompt contract in place.

Rejected paths:

- Revert HJ61 wholesale: rejected because Bundesrat-simple improved and no new
  mechanism was added.
- Report-writer correction: rejected because W8 must copy W7-B label/truth/
  confidence exactly.
- Add code-side semantic verdict repair: rejected as unnecessary and riskier
  before the LLM task contract is explicit.

Net mechanisms: unchanged.

## Debt-Sensor Status

Latest HJ61/HJ62 intake:

- `npm run debt:sensors`: `advisory_warn`
- Salient warnings remain the known V2 source/test footprint, boundary guard
  size, WIP/handoff volume, net mechanism telemetry, and consolidation-marker
  warnings.

These are steering context, not blockers for this prompt-amendment package.

## Verifier Plan

Before commit:

1. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
2. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
3. `npm -w apps/web run build`
4. `npm run debt:sensors`
5. `npm run index`
6. `git diff --check`

Before live jobs:

1. commit source/docs;
2. import/activate revised `claimboundary-v2` prompt in UCM;
3. refresh runtime;
4. confirm clean git status;
5. confirm Web/API/proxy runtime commit equals HEAD;
6. confirm default pipeline is `claimboundary-v2`;
7. confirm active `claimboundary-v2` prompt hash matches the revised prompt.

## Implementation Checkpoint

Local delta:

- `apps/web/prompts/claimboundary-v2.prompt.md`: amended only the existing
  `V2_BOUNDARY_VERDICT_EXECUTION` internal verdict calibration section with the
  seven-point label/truth polarity invariant.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  added focused prompt-contract assertions for the invariant.

Verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: PASS.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`: PASS.
- `npm -w apps/web run build`: PASS.
- `npm run debt:sensors`: `advisory_warn`; no new blocking debt signal.

## Live Canary Set

Use Captain-defined inputs only:

1. `Using hydrogen for cars is more efficient than using electricity`
2. `Plastic recycling is pointless`
3. `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`

Budget: up to 3 jobs from the remaining 14-job tranche. Run sequentially.

Pass signals:

- public/default containment remains precutover/blocked with no public/default
  report/verdict/truth/confidence;
- hydrogen false-side labels use low truth values in the system false-side
  bands;
- plastic no longer pairs contradiction rationale with a high true-side primary
  verdict for the selected claim;
- Bundesrat-simple does not regress from the HJ61 coherent true-side shape.

Stop signals:

- stale runtime/source, unexpected V1 routing, prompt activation drift, or
  public/default leak;
- W7-B schema/contract damage;
- false-side label/high-truth polarity repeats after the prompt amendment;
- the next live result shows the defect is elsewhere than W7-B.

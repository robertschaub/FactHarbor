# V2 HighJump HJ64 W7-B Label/Truth Coupling Repair

**Status:** local implementation verifier-clean; live validation pending
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction; prompt edits, schema changes, and live
jobs authorized; new live-job budget reset to `18`

## Purpose

HJ63 repaired the W8 report-writer roadblock and produced a complete hidden
internal Alpha report for `Plastic recycling is pointless`. That report exposed
the next quality owner: W8 copied W7-B verdict candidates where true-side labels
were paired with false-side truth percentages (`MOSTLY-TRUE` with truth `28`,
and `LEANING-TRUE` with truth `38`).

The existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt already defines the
seven-point truth scale and says truth percentage estimates the selected
AtomicClaim itself. HJ62 strengthened the false-side/high-truth direction, but
the live HJ63 evidence shows the true-side/low-truth direction was still too
weak. HJ64 therefore amends the existing W7-B prompt contract so label and
truth percentage are selected as one coupled judgment in both directions.

## Scope

Allowed:

- amend only the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt section in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- update focused prompt-contract tests;
- import/activate the revised `claimboundary-v2` prompt through UCM before live
  validation;
- run one focused plastic canary after commit/runtime refresh.

Closed:

- no deterministic semantic verdicting or label normalization in code;
- no schema relaxation;
- no retry loop, fallback, or parallel verdict/report path;
- no source/provider/parser/cache/SR/storage changes;
- no public behavior, UI/report/export cutover, ACS/direct URL, or V1 work.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q4 verdict calibration and V2-Q7 report
usefulness.

Direct user/report value: prevents internally contradictory verdict values from
appearing in complete internal Alpha reports.

Hidden-only value: none added; this amends an existing LLM task contract.

Cost/latency impact: unchanged per job.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ64 succeeds, keep W7-B label/truth coupling as
part of the stable prompt contract and do not add a runtime verdict-normalizer
unless repeated live evidence proves prompt-only enforcement insufficient.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package amends an existing prompt mechanism and focused test. It adds no
hidden artifact, route, denial layer, proof layer, retry, fallback, schema
relaxation, or parallel report path.

## Debt-Guard

Path: Full.

Classification: `incomplete-existing-mechanism`.

Evidence inventory:

- Symptom: HJ63 `plastic-en` job `d866675bcabf468aa4450b83ee7d87af` produced
  a complete W8 internal report, but W7-B copied values were label/truth
  inconsistent: `MOSTLY-TRUE` truth `28`, `LEANING-TRUE` truth `38`.
- Verifier: authenticated W8 internal report-writer artifact and admin
  reportMarkdown for HJ63; public/default containment held.
- Existing mechanism: `V2_BOUNDARY_VERDICT_EXECUTION` already owns verdict
  label/truth calibration and the seven-point truth scale.
- Debt signal: the prompt explicitly blocked false-side labels with high truth,
  but did not equivalently block true-side labels with low or false-side truth.

Chosen option: amend the existing prompt contract in place.

Rejected paths:

- Add deterministic code-side label normalization: rejected because it would
  mutate LLM analytical output and risks hiding a prompt-contract defect.
- Add retry/fallback path: rejected because the existing task contract is the
  right owner and no missing runtime capability is proven.
- Relax W8 report writing: rejected because HJ63 proves W8 now preserves W7-B
  values correctly.

Net mechanisms: unchanged.

## Verifier Plan

Before commit:

1. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
2. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts`
3. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
4. `npm -w apps/web run build`
5. `npm run debt:sensors`
6. `npm run index`
7. `git diff --check`

Before live job:

1. commit source/docs;
2. import/activate revised `claimboundary-v2` prompt in UCM;
3. refresh runtime;
4. confirm clean git status;
5. confirm Web/API/proxy runtime commit equals HEAD;
6. confirm default pipeline is `claimboundary-v2`;
7. confirm active `claimboundary-v2` prompt hash matches the revised prompt.

## Live Canary

Use Captain-defined input only:

`Plastic recycling is pointless`

Budget: one job from the reset 18-job tranche.

Pass signals:

- job stays on `claimboundary-v2` and finishes `SUCCEEDED`;
- hidden W8 internal report writer creates a complete internal report draft;
- W7-B copied verdict values do not pair true-side labels with low/false-side
  truth percentages or false-side labels with high/true-side truth percentages;
- public/default containment remains precutover/blocked with no public/default
  report/verdict/truth/confidence.

Stop signals:

- stale runtime/source, unexpected V1 routing, prompt activation drift, or
  public/default leak;
- W7-B still emits a label/truth polarity mismatch after the prompt repair;
- W8 or upstream stages regress to a different blocker that prevents evaluating
  W7-B label/truth coupling.

## Implementation Checkpoint

Local delta:

- `apps/web/prompts/claimboundary-v2.prompt.md`: amended only the existing
  `V2_BOUNDARY_VERDICT_EXECUTION` section so
  `internalVerdictLabelCandidate` and `internalTruthPercentageCandidate` are
  chosen as one coupled judgment from the same seven-point scale. True-side
  labels may not be paired with low/false-side truth; false-side labels may not
  be paired with high/true-side truth.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  added focused assertions for the bidirectional label/truth coupling contract.

Verifier results so far:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  PASS, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts`:
  PASS, `11` tests.

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`:
  PASS, `96` tests.
- `npm -w apps/web run build`: PASS.
- `npm run debt:sensors`: `advisory_warn` only for known V2 footprint,
  boundary-guard, docs-footprint, debt-telemetry, and consolidation-marker
  warnings.
- `npm run index`: PASS.
- `git diff --check`: PASS.

Debt-guard result:

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt section.
- Rejected path: code-side normalizer, retry/fallback, or schema relaxation,
  because the existing W7-B LLM contract already owns label/truth calibration.
- Net mechanism count: unchanged.
- Accepted debt: none.

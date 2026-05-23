# V2 HighJump HJ65 W7-B Selected-Claim Polarity Repair

**Status:** local implementation verifier-clean; live validation pending
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction; prompt edits, schema changes, and live
jobs authorized; active live-job tranche has `17` remaining after HJ64

## Purpose

HJ64 repaired W7-B numeric label/truth coupling for `Plastic recycling is
pointless`: the hidden internal report no longer paired true-side labels with
false-side truth percentages. It also exposed the next quality owner: the
top-line verdict was still oriented around a counter-proposition that recycling
has measurable purpose, instead of answering the selected AtomicClaim that
plastic recycling is pointless.

HJ65 therefore amends the existing W7-B prompt contract so verdict title,
rationale, label, and truth percentage stay oriented to the selected
AtomicClaim as written. Evidence for an opposite proposition must lower the
selected claim's truth, not become a true-side verdict for the opposite
proposition.

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

Direct user/report value: prevents the report from answering an easier
counterclaim instead of the submitted claim.

Hidden-only value: none added; this amends an existing LLM task contract.

Cost/latency impact: unchanged per job.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ65 succeeds, keep selected-claim polarity as part
of the stable W7-B prompt contract and avoid a runtime verdict normalizer unless
repeated evidence proves prompt-only enforcement insufficient.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package amends an existing prompt mechanism and focused test. It adds no
hidden artifact, route, denial layer, proof layer, retry, fallback, schema
relaxation, or parallel report path.

## Debt-Guard

Path: Full.

Classification: `incomplete-existing-mechanism`.

Evidence inventory:

- Symptom: HJ64 job `8b5e82cea1bd4e70b32ee06e9937900c` produced a complete
  hidden internal report, with numeric label/truth coupling repaired, but the
  top-line verdict answered the counterclaim that recycling has measurable
  purpose rather than the selected AtomicClaim that plastic recycling is
  pointless.
- Verifier: HJ64 evidence artifact
  `Docs/WIP/canary-evidence-hj64-w7b-label-truth-coupling.json`; public/default
  containment held.
- Existing mechanism: `V2_BOUNDARY_VERDICT_EXECUTION` owns selected-claim
  coherence, verdict candidacy, and truth/label calibration.
- Debt signal: the prompt already says each verdict candidate must assess the
  selected AtomicClaim, but does not explicitly forbid silently replacing it
  with an inverse, negation, or more convenient counter-proposition.

Chosen option: amend the existing prompt contract in place.

Rejected paths:

- Add deterministic code-side verdict normalization: rejected because it would
  mutate LLM analytical output and risks hiding an LLM task-contract defect.
- Add retry/fallback path: rejected because the existing W7-B prompt contract is
  the right owner and no missing runtime capability is proven.
- Change W8/report writer: rejected because W8 is correctly preserving W7-B
  values and report text.

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

Budget: one job from the active 18-job tranche; `17` remain before HJ65.

Pass signals:

- job stays on `claimboundary-v2` and finishes `SUCCEEDED`;
- hidden W8 internal report writer creates a complete internal report draft;
- first/top-line W7-B verdict answers the selected claim and is false-side or
  at most `MIXED` for this input;
- numeric label/truth coupling remains valid;
- public/default containment remains precutover/blocked with no public/default
  report/verdict/truth/confidence.

Stop signals:

- stale runtime/source, unexpected V1 routing, prompt activation drift, or
  public/default leak;
- W7-B still emits a true-side top-line verdict for the counterclaim after the
  prompt repair;
- W8 or upstream stages regress to a different blocker that prevents evaluating
  W7-B selected-claim polarity.

## Sidecar Review

An independent sidecar reviewer agreed HJ65 should be a narrow W7-B prompt/test
amendment with net mechanisms unchanged. Steer-Co is not needed before
implementation unless the repair drifts into code-side semantic normalization,
report-writer mutation, schema relaxation, source/provider changes, another
hidden mechanism, or the focused canary repeats the same orientation failure.

## Implementation Checkpoint

Local delta:

- `apps/web/prompts/claimboundary-v2.prompt.md`: amended only the existing
  `V2_BOUNDARY_VERDICT_EXECUTION` section. Verdict candidates must be framed
  around the selected AtomicClaim as written; inverse, negated, narrower
  opposite, or convenient counter-proposition framing may appear only as
  opposing evidence/context unless it is translated into lower truth for the
  selected claim.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  added focused assertions for selected-claim polarity/orientation wording.

Verifier results:

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

Remaining before commit: `npm run index`, `git diff --check`.

Debt-guard result:

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt section.
- Rejected path: code-side normalizer, report-writer mutation, retry/fallback,
  or schema relaxation, because the existing W7-B LLM contract already owns
  selected-claim verdict orientation.
- Net mechanism count: unchanged.
- Accepted debt: none.

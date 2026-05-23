# V2 HighJump HJ66 W7-B Caveats Array Contract Repair

**Status:** local implementation verifier-clean; live validation pending
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction; prompt edits, schema changes, and live
jobs authorized; active live-job tranche has `16` remaining after HJ65

## Purpose

HJ65 kept the V2 chain contained and reached W5/W6-C, but W7-B damaged on a
narrow schema issue: both verdict candidates returned invalid `caveats` type.
The prompt output contract names `caveats` and `materialUncertaintySignals`,
but it did not explicitly state those fields must be arrays of strings.

HJ66 amends the existing W7-B output contract to require `caveats` and
`materialUncertaintySignals` as arrays of strings, using `[]` when empty.

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

Quality dimension advanced: V2-Q7 report usefulness and V2-Q10 complexity
convergence.

Direct user/report value: restores the HJ65 report path so selected-claim
polarity can be evaluated.

Hidden-only value: none added; this amends an existing LLM task contract.

Cost/latency impact: unchanged per job.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ66 succeeds, keep the caveats array requirement as
part of the stable W7-B prompt contract and do not add runtime coercion unless
repeated schema failures prove prompt-only enforcement insufficient.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package amends an existing prompt mechanism and focused test. It adds no
hidden artifact, route, denial layer, proof layer, retry, fallback, schema
relaxation, runtime coercion, or parallel report path.

## Debt-Guard

Path: Full; failed-attempt recovery from HJ65.

Prior attempt classification: `keep`.

Classification: `incomplete-existing-mechanism`.

Evidence inventory:

- Symptom: HJ65 job `c5b93bf07d084a95b5d1bce6ddb03979` reached W5 with `4`
  EvidenceItems and W6-C accepted sufficiency, then W7-B damaged with
  `schema_validation`.
- Verifier: W8-B upstream stop attribution recorded two invalid-type issues at
  `verdictSetCandidate.verdictCandidates.0.caveats` and
  `verdictSetCandidate.verdictCandidates.1.caveats`; raw provider output,
  source text, input text, evidence text, and prompt text were not returned.
- Existing mechanism: `V2_BOUNDARY_VERDICT_EXECUTION` output contract already
  owns verdict candidate fields.
- Debt signal: `caveats` and `materialUncertaintySignals` were named but their
  required JSON type was implicit.

Chosen option: amend the existing prompt contract in place.

Rejected paths:

- Runtime coercion: rejected as unnecessary mechanism growth and could hide
  contract failures.
- Schema relaxation: rejected because the schema shape is correct.
- Retrying or report-writer mutation: rejected because W7-B output contract is
  the observed owner.

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

## Local Verifier Results

Run on 2026-05-23 before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts`
  - PASS: `2` files, `21` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - PASS: `1` file, `96` tests.
- `npm -w apps/web run build`
  - PASS.
- `npm run debt:sensors`
  - `advisory_warn` only; known warnings for V2 footprint, V2 test footprint,
    boundary-guard size, docs footprint, net-mechanism telemetry, and older
    consolidation-marker review candidates.
- Sidecar review:
  - PASS. The reviewer found the diff generic/topic-neutral, lowest net
    complexity for HJ65's caveats invalid-type failure, and no Steer-Co or
    Captain stop trigger.

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

Budget: one job from the active 18-job tranche; `16` remain before HJ66.

Pass signals:

- job stays on `claimboundary-v2` and finishes `SUCCEEDED`;
- W7-B accepts without caveats/material-uncertainty schema damage;
- hidden W8 internal report writer creates a complete internal report draft;
- first/top-line W7-B verdict answers the selected claim and is false-side or
  at most `MIXED` for this input;
- numeric label/truth coupling remains valid;
- public/default containment remains precutover/blocked with no public/default
  report/verdict/truth/confidence.

Stop signals:

- stale runtime/source, unexpected V1 routing, prompt activation drift, or
  public/default leak;
- W7-B repeats caveats/material-uncertainty schema damage;
- W7-B accepts but still emits a true-side top-line verdict for the counterclaim
  after the HJ65 polarity wording;
- W8 or upstream stages regress to a different blocker that prevents evaluating
  W7-B selected-claim polarity.

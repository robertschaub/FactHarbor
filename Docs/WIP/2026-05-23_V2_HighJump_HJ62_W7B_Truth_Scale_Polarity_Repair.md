# V2 HighJump HJ62 W7-B Truth-Scale Polarity Repair

**Status:** live validation complete; HJ62 partial pass with polarity repaired
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, prompt edits allowed, live-job budget
remaining `14` before HJ62; Captain later reset the next tranche to `18`

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

## Live Result

Result artifact:

`Docs/WIP/canary-evidence-hj62-w7b-truth-scale-polarity.json`

Runtime/source:

- implementation commit:
  `053eae51522b8dd5ba9abe1da3c92aca35df1a19`;
- active `claimboundary-v2` prompt hash:
  `c92c84935af7e789850574157aca8eadb6aebbfad65f5c5356cad8ddfaf78194`;
- all three jobs reported created/executed web git hash
  `053eae51522b8dd5ba9abe1da3c92aca35df1a19`.

Jobs:

- `hydrogen-en` job `fe125887384b47838104bad693dfd329` finished
  `SUCCEEDED` and produced one internal Alpha verdict:
  `MOSTLY-FALSE`, truth `18`, confidence `78`. This clears the HJ61 hard
  polarity blocker: a false-side label no longer carries high truth.
- `plastic-en` job `19ca87dab27a4446b5dd366eb89361db` finished
  `SUCCEEDED`, but the authenticated admin report was only a stop summary.
  The run reached W5 with `4` EvidenceItems and produced W8G draft state, but
  the W8 internal report writer returned a damaged result before a complete
  report could be displayed. This is a new immediate report-path blocker.
- `bundesrat-simple` job `8a48ed2378ca4963bd10231b3da6e8c6` finished
  `SUCCEEDED` and produced an internal Alpha report, but it regressed from the
  HJ61 one-section shape into a split report: `MOSTLY-TRUE` truth `76`
  confidence `72` plus `UNVERIFIED` truth `48` confidence `55`.

Containment:

- public/default V2 remained `4.0.0-cb-precutover` /
  `blocked_precutover`;
- public/default report markdown, verdict, truth percentage, and confidence
  remained absent;
- default hidden report-writer projection stayed hash/length/provenance-only;
- unauthenticated hidden report-writer access returned `401`.

Classification:

`PARTIAL_X7_HJ62_TRUTH_SCALE_POLARITY_REPAIRED_REPORT_WRITER_AND_CANDIDATE_COHERENCE_GAPS_REMAIN`

Information yield:

- `hydrogen-en`: `report_quality_improved`; the W7-B label/truth polarity bar
  is repaired for the focused false-side regression.
- `plastic-en`: `new_failure`; W8 report writer contract robustness is now the
  next report-path blocker before another plastic quality canary is useful.
- `bundesrat-simple`: `same_quality_gap_repeated_with_new_evidence`; split
  verdict/caveat handling remains unstable after the polarity repair.

Next:

Keep HJ62. Do not revert the W7-B truth-scale invariant. The next narrow
HighJump repair should inspect and amend the existing W8 internal report writer
contract so the plastic path can produce a complete internal report from the
already-created W8G draft. Do not add a parallel report path, schema relaxation,
source/provider widening, retry loop, parser, public surface, or V1 work.

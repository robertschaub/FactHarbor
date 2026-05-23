# V2 HighJump HJ63 W8 Report Writer Accepted-Branch Repair

**Status:** live validation complete; W8 report-writer roadblock repaired
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, prompt edits allowed, new live-job
tranche `18`

## Purpose

HJ62 repaired the W7-B label/truth polarity blocker but exposed the next report
path roadblock: `plastic-en` reached W5 with `4` EvidenceItems and W8G draft
state, then the W8 internal report writer returned `internal_report_writer_damaged`
with `damagedReason: task_contract_validation_failed`. Runtime telemetry showed
the provider returned a valid `damaged` aggregation result, not a schema-invalid
accepted result.

The existing `V2_AGGREGATION_NARRATIVE` prompt already has all required
structural inputs. HJ63 therefore amends that existing prompt section so an
accepted structural packet defaults to an accepted internal report, while
`damaged` remains reserved for true exact-copy contract impossibility.

## Scope

Allowed:

- amend only the existing `V2_AGGREGATION_NARRATIVE` prompt section in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- update focused prompt-contract tests;
- import/activate the revised `claimboundary-v2` prompt through UCM before live
  validation;
- run a focused plastic canary after commit/runtime refresh.

Closed:

- no code-side deterministic semantic rule;
- no schema relaxation;
- no report-writer value mutation;
- no retry loop or parallel report path;
- no model/provider/source/parser/cache/SR/storage changes;
- no public behavior, UI/report/export cutover, ACS/direct URL, or V1 work.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q7 report usefulness and V2-Q10 complexity
convergence.

Direct user/report value: restores complete internal report generation for a
path that already has W5 EvidenceItems and W8G draft state.

Hidden-only value: none added; this amends an existing LLM task contract.

Cost/latency impact: unchanged per job.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ63 succeeds, keep W8G as transitional review
evidence only and avoid a parallel report-writer path.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package amends an existing prompt mechanism and test. It adds no hidden
artifact, route, denial layer, proof layer, retry, fallback, or parallel report
path.

## Debt-Guard

Path: Full.

Classification: `incomplete-existing-mechanism`.

Evidence inventory:

- Symptom: HJ62 `plastic-en` job `19ca87dab27a4446b5dd366eb89361db` reached W5
  with `4` EvidenceItems and W8G draft state, then W8 internal report writer
  damaged with `task_contract_validation_failed`.
- Verifier: authenticated internal report-writer route for ledger
  `19ca87dab27a4446b5dd366eb89361db:precutover-observability`; public/default
  containment held.
- Existing mechanism: `V2_AGGREGATION_NARRATIVE` and the HJ18/HJ19 internal
  report-writer owner.
- Debt signal: the prompt allowed the model to self-select a valid `damaged`
  envelope even when the supplied packet contained the verdict, boundary, and
  EvidenceItem IDs needed for an accepted report.

Chosen option: amend the existing prompt contract in place.

Rejected paths:

- Add report-writer fallback or retry: rejected as unnecessary mechanism growth
  before the accepted-branch instruction is explicit.
- Relax schema or value-preservation validation: rejected because those guards
  are the correct containment boundary.
- Change W7-B/W8G/source material: rejected because HJ62 showed W8G draft state
  already exists for this run.

Net mechanisms: unchanged.

## Verifier Plan

Before commit:

1. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
2. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts`
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

Budget: one job from the new 18-job tranche.

Pass signals:

- public/default containment remains precutover/blocked with no public/default
  report/verdict/truth/confidence;
- W8 internal report writer returns `internal_report_writer_draft_created`;
- authenticated admin job report markdown is a complete internal Alpha report,
  not the short stop summary;
- no reportMarkdown, verdict, truth percentage, or confidence leaks to
  public/default surfaces.

Stop signals:

- stale runtime/source, unexpected V1 routing, prompt activation drift, or
  public/default leak;
- W8 still returns a valid `damaged` envelope for the same structural reason;
- W8 returns schema/parse failure that points to a distinct report-writer
  contract issue.

## Live Result

Result artifact:

`Docs/WIP/canary-evidence-hj63-w8-report-writer-accepted-branch.json`

Runtime/source:

- implementation commit:
  `f2e4e55a52e0c299fe85eea3f5a34f858b1856eb`;
- active `claimboundary-v2` prompt hash:
  `33edfa61f2f8f904242f3c2be6b0674023d880c863192dd5afdf0a172ae1f0f8`;
- job:
  `d866675bcabf468aa4450b83ee7d87af`;
- job created/executed web git hash:
  `f2e4e55a52e0c299fe85eea3f5a34f858b1856eb`.

Result:

- The job stayed on `claimboundary-v2` and finished `SUCCEEDED`.
- The hidden W8 internal report writer returned
  `internal_report_writer_draft_created`.
- The aggregation narrative result was `accepted`, with `schemaDiagnostics:
  null`.
- The hidden/admin report markdown was created at `7907` bytes, with `2`
  verdict sections, `2` boundary sections, and `4` cited EvidenceItem refs.
- Public/default containment held: public/default V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover`; public/default report
  markdown, verdict, truth percentage, and confidence were absent; default W8
  writer projection remained hash/length/provenance-only; unauthenticated W8
  writer route access returned `401`.

Classification:

`PASS_X7_HJ63_W8_REPORT_WRITER_ACCEPTED_BRANCH_REPAIR_W7B_LABEL_TRUTH_QUALITY_GAP_REMAINS`

Information yield:

`report_produced_with_new_quality_gap_evidence`.

Important quality gap:

HJ63 repairs the W8 roadblock, but it does not make the plastic report
quality-acceptable. The report copied W7-B verdict values that are internally
inconsistent: `MOSTLY-TRUE` with truth `28`, and `LEANING-TRUE` with truth
`38`. This shows the next owner is W7-B label/truth contract enforcement and
candidate calibration, not W8 report writing.

Budget:

HJ63 consumed `1` job from the new `18`-job tranche. `17` remain.

Next:

Keep HJ63. Do not change W8 before new evidence points there. The next narrow
HighJump repair should make W7-B structurally unable to emit label/truth
polarity mismatches in either direction while preserving LLM-owned analytical
judgment.

## Implementation Checkpoint

Local delta:

- `apps/web/prompts/claimboundary-v2.prompt.md`: amended only the existing
  `V2_AGGREGATION_NARRATIVE` section with an accepted-branch default. If the
  packet supplies verdict candidates, boundary candidates, and cited
  EvidenceItem IDs, the model should return `status: "accepted"`; multiple
  supplied sections, caveats, material uncertainty, limited evidence, or mixed
  quality are report content rather than damage conditions.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  added prompt-contract assertions for the accepted-branch default.

Verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  PASS, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts`:
  PASS, `4` tests.
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
- Chosen option: amend existing `V2_AGGREGATION_NARRATIVE` prompt section.
- Rejected path: retry/fallback/schema relaxation/parallel report writer,
  because the existing owner already has the structural inputs and correct
  validation boundary.
- Net mechanism count: unchanged.
- Accepted debt: none.

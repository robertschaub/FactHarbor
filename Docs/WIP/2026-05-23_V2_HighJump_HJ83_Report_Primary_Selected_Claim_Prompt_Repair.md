# V2 HighJump HJ83 Report-Primary Selected-Claim Prompt Repair

## Captain-Authorized HighJump

Captain direction remains: keep moving toward complete internal Pipeline V2
reports, lower premature blocking bars only when needed, and raise quality from
observed report evidence. Prompt edits and live jobs are authorized within the
active budget when naturally needed.

## Observed Defect

HJ82 job `ace31183fdae47889b7771ed5fdb92a1` produced a complete internal V2
report on runtime `978e7839fa676706dd953fb2d6213f668fa1f7e6`. The report no
longer made the selected comparison true: the selected hydrogen-vs-electricity
claim was `UNVERIFIED 48/45`. However, the report still foregrounded an
outside-baseline hydrogen-vs-gasoline candidate as `Verdict 1` with
`LEANING-TRUE 62/65`.

That is a report-primary ordering defect. The internal report writer must
preserve all supplied verdict candidates and exact copied values, but the
title, executive summary, first verdict section, and opening markdown summary
must answer the selected AtomicClaim as written. Adjacent-baseline candidates
may remain as context, caveat, or limitation sections; they must not become the
top-line answer merely because their label or confidence is stronger.

## Scope

Allowed:

- amend the existing `V2_AGGREGATION_NARRATIVE` prompt to require report-primary
  selected-claim ordering;
- keep exact verdict-value, citation, and cardinality preservation intact;
- update the existing Evidence Lifecycle prompt-contract test;
- keep changes topic-neutral and multilingual;
- preserve existing schemas, task IDs, source providers, W5/W7 behavior, public
  blocked-precutover projection, and live-job discipline;
- run one focused live rerun after commit/runtime refresh.

Not allowed:

- benchmark-specific terms in prompt text;
- recomputing verdict labels, truth, confidence, or sufficiency in code;
- filtering out supplied verdict candidates;
- new code machinery, deterministic semantic rules, schema/config/model
  changes, provider expansion, retries, parser/cache/SR/storage work,
  public/API/UI/report/export exposure, ACS/direct URL support, or V1 work.

## V2 Scorecard Impact

Report-quality value: makes internal reports answer the submitted claim first,
which is necessary before judging verdict quality from the report prose.

## V2 Retirement Ledger Impact

No new mechanism is added. This repairs the existing report writer prompt and
avoids a report-postprocessor, hidden proof layer, or deterministic section
ordering rule.

## V2 Consolidation Gate

- Unlocks: one hydrogen rerun with selected-claim-first report composition.
- Retires/merges: no mechanism retirement; replaces the temptation to add a
  post-hoc report filter with a prompt-level correction in the existing report
  writer.
- Stop condition: if the rerun still foregrounds adjacent-baseline verdicts
  ahead of the selected comparison, stop for a report-writer task-contract or
  W7 verdict-candidate shaping review rather than another broad prompt
  relaxation. If the report stops or loses full-report reachability, classify
  the failed attempt before broadening scope.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ82 report-quality
evidence.

Chosen option: amend existing Aggregation Narrative prompt guidance in place.

Rejected paths:

- deterministic section ordering in code: would add machinery and risks
  language/semantic leakage;
- W7 relaxation: HJ81 proved that path over-promotes adjacent comparators;
- source/provider expansion: HJ82 produced enough source material and report
  prose to expose the current owner;
- report candidate omission: would violate the current exact cardinality
  contract.

Net mechanism impact: unchanged.

Debt sensor status at intake: `advisory_warn`; salient warnings remain existing
V2 source/test footprint, boundary-guard size, Docs/WIP volume, historical
net-mechanism telemetry, and consolidation-marker warnings. HJ83 adds no
mechanism.

## Verification Plan

Local before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `git diff --check`

Live after commit and runtime refresh:

- submit exactly one full V2 validation job for
  `Using hydrogen for cars is more efficient than using electricity`;
- pass if a complete internal V2 report is produced, public/default containment
  remains closed, and the title/executive summary/first verdict section answer
  the selected comparison rather than an adjacent or outside-baseline
  comparison;
- quality pass if the selected-comparison verdict moves toward the accepted
  hydrogen range without foregrounding adjacent-baseline true-side material;
- stop if stale runtime, public/default leak, stop summary, schema damage, or
  repeated adjacent-baseline-first report composition appears.

# V2 HighJump HJ84 Selected-Endpoint Opposition Calibration

## Captain-Authorized HighJump

Captain direction remains: get complete internal Pipeline V2 reports, then
raise quality from observed report evidence. Prompt edits and live jobs are
authorized within the active budget when naturally needed.

## Observed Defect

HJ83 job `0f282532282046659320db02bdfbd4f5` produced a coherent selected-claim
primary internal report. The report now opens with the direct selected
comparison and correctly demotes gasoline/hybrid material to contextual status.
The remaining quality defect is verdict strength: direct selected-endpoint
opposition produced only `LEANING-FALSE 35/62`, while the accepted hydrogen
family expectation is `FALSE` / `MOSTLY-FALSE`, truth `5-25` plus tolerance,
with confidence `65-85`.

HJ81 proved that broad W7 relaxation is unsafe: it over-promoted adjacent
comparators. HJ84 therefore narrows the W7 calibration permission to exact
endpoint identity only.

## Scope

Allowed:

- amend the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt to allow stronger
  opposite-side calibration only when direct EvidenceItems explicitly preserve
  both specific compared endpoints from the selected AtomicClaim and assert the
  opposite comparative direction;
- explicitly exclude broader categories, adjacent alternatives, default
  baselines, inverse frames, one-endpoint evidence, and substitute comparators
  from driving selected-claim truth calibration unless the evidence itself
  bridges the mismatch;
- update the existing Evidence Lifecycle prompt-contract test;
- keep changes topic-neutral and multilingual;
- preserve existing schemas, task IDs, source providers, report writer,
  public blocked-precutover projection, and live-job discipline;
- run one focused live rerun after commit/runtime refresh.

Not allowed:

- benchmark-specific terms in prompt text;
- deterministic semantic rules or hardcoded topics;
- source/provider expansion;
- report-writer recomputation or section filtering;
- schema/config/model changes, retries, parser/cache/SR/storage work,
  public/API/UI/report/export exposure, ACS/direct URL support, or V1 work.

## V2 Scorecard Impact

Report-quality value: tightens verdict calibration for direct selected-endpoint
opposition after report composition is coherent.

## V2 Retirement Ledger Impact

No new mechanism is added. This amends the existing W7 prompt and avoids adding
a deterministic verdict postprocessor or another hidden proof layer.

## V2 Consolidation Gate

- Unlocks: one hydrogen rerun with exact-endpoint W7 calibration.
- Retires/merges: no mechanism retirement; keeps HJ81's broad W7 relaxation
  reverted and replaces it with an endpoint-identity-bounded calibration rule.
- Stop condition: if the rerun over-promotes adjacent comparators again, revert
  this paragraph and stop W7 prompt repair. If it remains selected-claim-primary
  but only marginally misses the truth band, review whether the accepted
  hydrogen band or evidence portfolio needs a broader report-quality review
  rather than spending the last jobs on prompt tuning.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ83 report-quality
evidence and HJ81 failed-attempt recovery.

Chosen option: amend existing Boundary Verdict prompt guidance in place.

Rejected paths:

- repeat HJ81 broad W7 relaxation: live validation contradicted it;
- add code-level verdict postprocessing: new mechanism and deterministic
  semantic decision risk;
- source/provider expansion: HJ83 produced enough selected-comparison evidence
  to expose calibration as the current owner;
- report-writer changes: HJ83 already repaired report-primary ordering.

Net mechanism impact: unchanged.

Debt sensor status at intake: `advisory_warn`; salient warnings remain existing
V2 source/test footprint, boundary-guard size, Docs/WIP volume, historical
net-mechanism telemetry, and consolidation-marker warnings. HJ84 adds no
mechanism.

## Verification Plan

Local before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `git diff --check`

Live after commit and runtime refresh:

- submit exactly one full V2 validation job for
  `Using hydrogen for cars is more efficient than using electricity`;
- pass if a complete internal V2 report is produced, public/default containment
  remains closed, the selected comparison stays report-primary, adjacent
  comparator material remains contextual, and the selected-claim verdict moves
  toward or into the accepted hydrogen false-side band;
- stop if stale runtime, public/default leak, stop summary, schema damage,
  adjacent-comparator overreach, or a second W7 prompt failure appears.

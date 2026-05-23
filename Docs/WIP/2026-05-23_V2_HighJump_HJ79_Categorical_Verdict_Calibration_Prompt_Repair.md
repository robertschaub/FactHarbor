# V2 HighJump HJ79 Categorical Verdict Calibration Prompt Repair

## Captain-Authorized HighJump

Captain direction remains: do not artificially block report creation. Use the
HighJump approach to get complete internal V2 reports, then raise one quality
bar at a time from observed report evidence. Prompt edits and live jobs are
authorized within the active budget when they are naturally needed to complete
the plan.

## Observed Defect

HJ78 produced a complete internal V2 report for:

`Plastic recycling is pointless`

Job `3dd2d8781dc94cc1b20845a5ed7bc814` reached the internal report writer and
extracted/admitted five EvidenceItems, but the primary verdict section was
`MOSTLY-TRUE` with truth `74`. The report prose itself said the categorical
wording exceeds the evidence because recycling has some nonzero utility. That
means W7 recognized the caveat but did not bind it strongly enough to the
verdict label and truth percentage.

The accepted plastic family expectation is false-side/low-truth or mixed, with
truth in the `10-42` band plus tolerance.

## Scope

Allowed:

- amend the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt guidance for
  categorical and absolute claim calibration;
- keep the change topic-neutral and multilingual;
- preserve the existing W7 contract, schemas, task IDs, model policies, gateway
  policy, report writer, source acquisition, W5 extraction, and public
  blocked-precutover projection;
- run a focused live rerun after commit/runtime refresh.

Not allowed:

- new code machinery, deterministic semantic rules, benchmark-specific terms,
  report writer recomputation, schema/config/model changes, provider expansion,
  retries, parser/cache/SR/storage work, public/API/UI/report/export exposure,
  ACS/direct URL support, or V1 work.

## V2 Scorecard Impact

Report-quality value: improves verdict calibration when evidence supports a
weaker adjacent proposition but not the selected AtomicClaim as written. This
directly addresses the first complete HJ78 report defect.

## V2 Retirement Ledger Impact

No new mechanism is added. This narrows the existing W7 prompt behavior and
avoids adding another hidden proof or readiness layer.

## V2 Consolidation Gate

- Unlocks: one clearer internal report-quality rerun for the same full report
  path.
- Retires/merges: no mechanism retirement; strengthens an existing prompt
  clause instead of adding machinery.
- Stop condition: if the rerun still produces a strong true-side plastic result
  or a damaged/stop summary, stop for report-quality diagnosis rather than
  stacking more prompt edits.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing W7 categorical/absolute wording clause in
place.

Rejected paths:

- harden the HJ78 applicability precheck first: important, but not the observed
  verdict-value failure;
- change the report writer: the writer copies W7 verdict values and should not
  recompute them;
- add new tests, routes, or guard machinery before another report: unnecessary
  net complexity.

Net mechanism impact: unchanged.

## Reviewer Check

Claude Opus review recommended option A: amend `V2_BOUNDARY_VERDICT_EXECUTION`
so categorical/absolute claim caveats become verdict-binding. It explicitly
rejected report-writer changes and new machinery for this defect.

## Verification Plan

Local before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `git diff --check`

Live after commit and runtime refresh:

- submit exactly one full V2 validation job for `Plastic recycling is pointless`;
- pass if a complete internal V2 report is produced and the verdict calibration
  moves to the accepted plastic range: false-side/low-truth or mixed, truth
  within the accepted band plus tolerance, confidence in range, public/default
  containment still closed;
- stop if the same strong true-side defect repeats, a stop summary replaces the
  report, provenance is stale, or containment fails.

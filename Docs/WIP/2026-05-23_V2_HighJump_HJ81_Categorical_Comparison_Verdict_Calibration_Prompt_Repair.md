# V2 HighJump HJ81 Categorical Comparison Verdict Calibration Prompt Repair

## Captain-Authorized HighJump

Captain direction remains: get complete internal Pipeline V2 reports through the
normal path, then raise one quality bar at a time from observed report evidence.
Prompt edits and live jobs are authorized within the active budget when
naturally needed.

## Observed Defect

HJ80 job `2e3c8862b6d042fcb3a07a4cbb063cf7` produced a complete hydrogen
internal report after query-planning direct-comparison repair. The source chain
now includes a direct same-comparison EvidenceItem plus hydrogen-side context,
but the primary verdict stayed `LEANING-FALSE` with truth `35` and confidence
`62`. The report rationale damped truth toward a weak false-side label because
the direct comparative evidence lacked detailed quantitative measurements,
even though the selected AtomicClaim itself supplies no numeric threshold or
specific measurement frame.

## Scope

Allowed:

- amend the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt guidance for
  categorical comparative claim calibration;
- keep the change topic-neutral and multilingual;
- preserve existing W7 schemas, task IDs, source acquisition, extraction,
  report writer, public blocked-precutover projection, and live-job discipline;
- run one focused live rerun after commit/runtime refresh.

Not allowed:

- benchmark-specific terms in prompt text;
- new code machinery, deterministic semantic rules, report-writer
  recomputation, schema/config/model changes, provider expansion, retries,
  parser/cache/SR/storage work, public/API/UI/report/export exposure,
  ACS/direct URL support, or V1 work.

## V2 Scorecard Impact

Report-quality value: improves verdict calibration for categorical comparative
claims where direct same-relation evidence supports or opposes the selected
claim but does not provide detailed numeric measurements not required by the
claim text.

## V2 Retirement Ledger Impact

No new mechanism is added. This narrows the existing W7 prompt behavior and
avoids adding another source-material mechanism or report-writer override.

## V2 Consolidation Gate

- Unlocks: one clearer hydrogen rerun through the existing full report path.
- Retires/merges: no mechanism retirement; strengthens the existing W7
  calibration clause.
- Stop condition: if the rerun still assigns a weak false-side or mixed result
  despite direct same-comparison opposition, stop for W7 output inspection
  rather than adding report-writer recomputation. If it becomes overconfident
  without direct same-comparison evidence, classify as prompt overreach and
  amend or revert this paragraph.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing W7 categorical/absolute verdict-calibration
prompt in place.

Rejected paths:

- add source-material quantitative-directness machinery first: HJ80 already
  proved direct same-comparison evidence can reach W7, and the observed
  over-damping belongs to verdict calibration;
- change the report writer: the writer should render supplied verdict values,
  not recompute them;
- add deterministic comparator rules in code: analytical meaning stays in LLM
  prompt behavior.

Net mechanism impact: unchanged.

Debt sensor status at intake: `advisory_warn`; salient warnings remain existing
V2 source/test footprint, boundary-guard size, Docs/WIP volume, and historical
net-mechanism telemetry. This HJ81 repair adds no new mechanism.

## Reviewer Check

Claude Opus review recommended HJ81 as the lowest-net-complexity next repair.
The review rejected source-material quantitative-directness work as broader and
likely insufficient without the W7 calibration fix. It required generic wording,
same-relation gating, a numeric-threshold carve-out, and confidence/caveat
damping rather than truth-direction damping.

## Verification Plan

Local before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `git diff --check`

Live after commit and runtime refresh:

- submit exactly one full V2 validation job for
  `Using hydrogen for cars is more efficient than using electricity`;
- pass if a complete internal V2 report is produced, public/default containment
  remains closed, and the primary verdict moves into or materially closer to
  the accepted hydrogen range: `FALSE` or `MOSTLY-FALSE`, truth `5-25` plus
  repository tolerance, confidence `65-85` or defensibly close;
- stop if the same weak false-side/directness defect repeats, a stop summary
  replaces the report, provenance is stale, or containment fails.

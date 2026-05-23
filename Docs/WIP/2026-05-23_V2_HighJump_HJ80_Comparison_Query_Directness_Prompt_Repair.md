# V2 HighJump HJ80 Comparison Query Directness Prompt Repair

## Captain-Authorized HighJump

Captain direction remains: do not artificially block report creation. Produce
complete internal Pipeline V2 reports through the normal path, then raise one
quality bar at a time from observed report evidence. Prompt edits and live jobs
are authorized within the active budget when naturally needed.

## Observed Defect

HJ79 hydrogen job `54131f5e03e643aea97fa060886633ca` produced a complete
internal V2 report, but it was still too weak versus the accepted hydrogen
family expectation. The top verdict moved false-side to `LEANING-FALSE` with
truth `35` and confidence `62`, while the accepted range is `FALSE` or
`MOSTLY-FALSE` with lower truth. The report itself exposed the next defect:
source material still relied partly on one-sided, outside-baseline, or adjacent
comparator material instead of enough direct same-comparator, same-frame
comparison evidence.

## Scope

Allowed:

- amend the existing `V2_EVIDENCE_QUERY_PLANNING` prompt guidance for
  comparison-claim direct-record coverage;
- keep the change topic-neutral and multilingual;
- preserve the existing query-planning contract, schemas, task IDs, source
  acquisition, extraction, verdict execution, report writer, and public
  blocked-precutover projection;
- run one focused live rerun after commit/runtime refresh.

Not allowed:

- benchmark-specific terms in prompt text;
- new code machinery, deterministic semantic rules, report writer
  recomputation, schema/config/model changes, provider expansion, retries,
  parser/cache/SR/storage work, public/API/UI/report/export exposure,
  ACS/direct URL support, or V1 work.

## V2 Scorecard Impact

Report-quality value: improves retrieval intent for comparison claims so the
downstream report has a better chance to cite direct same-comparison evidence
instead of over-weighting adjacent comparator context.

## V2 Retirement Ledger Impact

No new mechanism is added. This narrows the existing query-planning prompt
behavior and avoids adding another hidden proof layer or downstream
recalculation path.

## V2 Consolidation Gate

- Unlocks: one clearer internal report-quality rerun for the comparison-claim
  full report path.
- Retires/merges: no mechanism retirement; strengthens an existing prompt
  clause instead of adding machinery.
- Stop condition: if the rerun still lacks direct same-comparison evidence or
  repeats the too-weak false-side result, stop for source-material/query
  attribution review rather than stacking report-writer changes.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing query-planning retrieval intent guidance in
place.

Rejected paths:

- change the report writer: it should not recompute evidence directness or
  verdict values;
- add a new source provider or retrieval mechanism: HJ79 first exposes a query
  intent/directness gap in an existing mechanism;
- add deterministic comparator rules in code: analytical meaning stays in LLM
  prompt behavior, not language-dependent code logic.

Net mechanism impact: unchanged.

Debt sensor status at intake: `advisory_warn`; salient warnings are existing V2
source/test footprint, boundary-guard size, Docs/WIP volume, and historical
net-mechanism telemetry. This HJ80 repair adds no new mechanism.

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
- stop if the same too-weak/directness defect repeats without useful new
  evidence, a stop summary replaces the report, provenance is stale, or
  containment fails.

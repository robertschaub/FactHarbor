# V2 HighJump HJ82 Comparator Identity Prompt Repair

## Captain-Authorized HighJump

Captain direction remains: keep moving toward complete internal Pipeline V2
reports, lower premature blocking bars when needed, and raise quality from
observed report evidence. Prompt edits and live jobs are authorized within the
active budget when naturally needed.

## Observed Defect

HJ81 job `1d46faadc2a74ff490172d3fd545faab` produced a complete report but
regressed to `MOSTLY-TRUE 74/72` by treating outside-baseline and adjacent
comparator material as direct support for the selected comparison. HJ80 had
already shown that direct-comparison evidence can reach the report path, but
the chain remains unstable: source/evidence stages can still drift from the
submitted comparison endpoints to easier or more common comparators.

## Scope

Allowed:

- amend the existing `V2_CLAIM_UNDERSTANDING_GATE1` prompt to preserve direct
  comparison endpoints in selected AtomicClaims;
- amend the existing `V2_EVIDENCE_EXTRACTION` prompt to classify
  outside-baseline comparator evidence as contextual/unclear/mixed/limited
  unless the source explicitly bridges it to the selected endpoints;
- keep changes topic-neutral and multilingual;
- preserve existing schemas, task IDs, source providers, W7/report writer,
  public blocked-precutover projection, and live-job discipline;
- run one focused live rerun after commit/runtime refresh.

Not allowed:

- benchmark-specific terms in prompt text;
- new code machinery, deterministic semantic rules, report-writer
  recomputation, schema/config/model changes, provider expansion, retries,
  parser/cache/SR/storage work, public/API/UI/report/export exposure,
  ACS/direct URL support, or V1 work.

## V2 Scorecard Impact

Report-quality value: protects the selected comparison relation from being
replaced by easier outside-baseline evidence, improving verdict accuracy and
explanation trust for comparison claims.

## V2 Retirement Ledger Impact

No new mechanism is added. This repairs existing prompt behavior in Claim
Understanding and Evidence Extraction and avoids adding another hidden proof
layer or report-writer override.

## V2 Consolidation Gate

- Unlocks: one hydrogen rerun with endpoint preservation and stricter
  outside-baseline extraction classification.
- Retires/merges: no mechanism retirement; replaces the failed HJ81 W7
  relaxation with a narrower upstream comparator-identity correction.
- Stop condition: if the rerun still over-promotes outside-baseline material,
  stop for source-material/query attribution rather than broad W7 relaxation.
  If the rerun collapses to no evidence while direct selected-endpoint material
  is visible, inspect W5 extraction selectivity before changing providers.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ81 failed-attempt
recovery.

Chosen option: amend existing Claim Understanding and Evidence Extraction
prompt guidance in place.

Rejected paths:

- keep or further amend the HJ81 W7 relaxation: live validation contradicted
  it, so it was reverted;
- add report-writer recomputation: report writer should not override upstream
  comparator identity;
- add provider/source machinery: the observed defect is comparator identity in
  selected claims and EvidenceItem classification, not provider reachability.

Net mechanism impact: unchanged.

Debt sensor status at intake: `advisory_warn`; salient warnings remain existing
V2 source/test footprint, boundary-guard size, Docs/WIP volume, and historical
net-mechanism telemetry. HJ82 adds no mechanism.

## Verification Plan

Local before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`
- `npm -w apps/web run build`
- `npm run debt:sensors`
- `git diff --check`

Live after commit and runtime refresh:

- submit exactly one full V2 validation job for
  `Using hydrogen for cars is more efficient than using electricity`;
- pass if a complete internal V2 report is produced, public/default containment
  remains closed, and outside-baseline or adjacent comparator material no longer
  drives a true-side verdict for the selected comparison;
- quality pass if the primary verdict returns to or improves beyond the HJ80
  false-side result toward the accepted hydrogen range;
- stop if stale runtime, public/default leak, stop summary, or another
  outside-baseline true-side regression appears.

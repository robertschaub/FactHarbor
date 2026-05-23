# V2 HighJump HJ78 Evidence Applicability Precheck

## captain-authorized-highjump

Captain direction: continue the V2 HighJump path toward complete internal V2
reports, lower only report-blocking bars shown by live evidence, and use the
approved prompt/model/schema/live-job authority where naturally needed to
complete the plan.

## Purpose

HJ77 improved some target-frame behavior but left two material defects:

- Hydrogen still admitted off-comparator source material into a confident
  true-side report path.
- The asylum-WWII input stopped at W5 with no extractable evidence.

HJ78 activates the already-designed `evidence_applicability` task before W5
EvidenceItem extraction. This replaces the live owner's fabricated
all-uncertain applicability frame with one LLM-owned applicability precheck over
the same bounded source-content packets that W5 already receives.

## Scope

Allowed:

- activate the existing V2 `evidence_applicability` gateway/model/cache policy;
- render and call the existing `V2_EVIDENCE_APPLICABILITY` prompt section from
  the W5 runtime owner;
- pass `sourceAcquisitionTraceJson` and bounded `sourceContentPacketsJson` into
  the applicability task;
- feed the accepted applicability result into the existing W5
  `evidence_extraction` prompt;
- record only sanitized hash/status/count/token applicability telemetry in the
  hidden/admin-only W5 decision.

Not allowed:

- public/API/UI/report/export/compatibility exposure;
- provider expansion, retries, parser execution, cache read/write, Source
  Reliability/storage, ACS/direct URL, or V1 work;
- deterministic semantic source classification or family-specific terms;
- schema relaxation, raw source-text/default-admin/log/error leakage, or a
  parallel report path.

## V2 Scorecard Impact

Expected scorecard movement is report-quality value, not new reachability:

- improve target-frame evidence applicability before W5 extraction;
- reduce wrong-side/off-comparator EvidenceItems;
- preserve complete internal report generation when material is mixed,
  contextual, or partially relevant.

## V2 Retirement Ledger Impact

HJ78 retires the fabricated all-uncertain live-owner applicability behavior for
product runtime execution. A structural all-uncertain fallback remains only for
direct/unit harness calls that do not supply an applicability provider.

Removal trigger: after two successful post-HJ78 report waves show the runtime
provider path is stable, remove or test-confine the structural fallback if no
production caller still needs it.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen path: amend and activate the existing `evidence_applicability` task.

Rejected paths:

- source selector heuristics;
- provider expansion;
- a new source-inspection route;
- broad prompt-only iteration without fixing fabricated applicability input.

Net mechanism impact: one planned task becomes executable in the hidden runtime
path. This is accepted because it removes a fabricated semantic placeholder and
keeps semantic applicability LLM-owned.

## Verification

Passed before implementation commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`
- `npm -w apps/web run build`
- `npm run debt:sensors` (`advisory_warn` only)

Required before live report run:

- `git diff --check`
- commit implementation/docs;
- refresh runtime to the implementation commit;
- verify API/Web runtime commit freshness;
- run one full V2 validation job from the committed runtime.

## Live Report Plan

First validation input:

`Using hydrogen for cars is more efficient than using electricity`

Decision boundary:

- pass if a complete internal V2 report is produced and applicability precheck
  reduces or blocks the HJ77 off-comparator true-side failure;
- quality-gap pass if a complete report is produced but still needs a targeted
  next bar raise;
- stop if no complete report is produced, public/default leakage appears, or
  runtime/source provenance is stale.

# 2026-05-20 Lead Developer V2 X7-W5-E Route Fail-Closed Repair

## Summary

After the X7-W5-E canary, corrected same-ledger route inspection showed that
the hidden chain was reachable through W3 and W5 had accepted EvidenceItems, but
the W5 internal route threw while projecting the artifact. The local repair
keeps the same route/sink and fails closed when an existing W5 artifact lacks a
W5-E admission snapshot.

## Files Changed

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts`
- W5-E result/status/handoff/ledger docs

## Behavior

If a stored W5 artifact has no `boundedEvidenceItemAdmission` snapshot, the
default internal route projection now returns:

- `admissionStatus = evidence_item_admission_damaged`
- `damagedReason = missing_runtime_admission_snapshot`
- `admittedEvidenceItemCount = 0`
- redaction flags remain false for EvidenceItem, source, and input text

The route no longer throws on that legacy/partially refreshed artifact shape.
This does not synthesize a passing W5-E admission.

## Existing Canary Recheck

No live job was spent. Rechecking ledger
`68f7dba28c9441b7ab702e5a7b2c1a17:precutover-observability` after the local
repair showed:

- W5 `status = hidden_evidence_item_extraction_completed`
- W5 `extractionResultStatus = accepted`
- W5 `evidenceItemCount = 2`
- W5-E `admissionStatus = evidence_item_admission_damaged`
- W5-E `damagedReason = missing_runtime_admission_snapshot`
- W5-E `admittedEvidenceItemCount = 0`

Therefore W5-E remains unproven.

## Verification

- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts`
  - passed: `3` files / `13` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - passed: `1` file / `87` tests
- `npm run validate:v2-gates`
  - passed
- `npm run debt:sensors`
  - `advisory_warn` only on existing V2/test/docs footprint, boundary guard
    size, docs/handoff volume, net mechanism telemetry, and consolidation-marker
    advisories
- `npm -w apps/web run build`
  - passed
- `git diff --check`
  - passed

## V2 Scorecard Impact

Quality dimension advanced: W5 internal evidence inspection robustness.

Direct user/report value: none.

Hidden-only value: W5 accepted EvidenceItems are inspectable without route
crash, but W5-E admission is still not proven.

Cost/latency impact: no additional live job.

Retirement or simplification unlocked: none yet.

Scorecard risk: another canary is required later to prove W5-E admission is
recorded during a fresh runtime job.

## V2 Retirement Ledger Impact

Rows touched: `V2-RL-012`.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: not satisfied.

Debt accepted: none.

## V2 Consolidation Gate

This repair amends the existing W5 route/sink projection in place. It does not
add a route, sink, public surface, parser, cache/SR/storage behavior, provider
expansion, ACS/direct URL, or V1 work.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing W5 artifact projection to fail closed.

Rejected paths:

- add a new route or hidden diagnostic;
- synthesize an accepted W5-E admission from a missing snapshot;
- spend a second live job;
- broaden into orchestrator or public behavior.

Net mechanisms: unchanged.

Residual risk: W5-E runtime recording still needs a fresh canary under a
separate approved package after this repair is committed and runtime-refreshed.

# V2 Slice X7-W5-F EvidenceItem Handoff Implementation Package

Date: 2026-05-20
Status: reviewed implementation package
Author: Captain Deputy / Lead Developer
Review: Claude Opus 4.6 returned `approve_with_changes`; required changes
were applied.

## 1. Objective

Implement one hidden/internal EvidenceItem handoff decision over the accepted
W5-E admission state from W5-E3. The handoff decision becomes the named owner
for downstream EvidenceItem consumption and records how W4-I historical
eligibility evidence is merged or retained.

This is a convergence slice, not a report-quality slice.

## 2. Authority Basis

Input state:

- W5-E3 passed as
  `PASS_X7_W5_E3_EVIDENCE_ITEM_ADMISSION_AND_CONTAINMENT_CANARY`.
- W4-I route removal trigger:
  `remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`.
- W5-F review package recommends defining the next EvidenceItem handoff owner
  before deleting W4-I.

This package requests review for implementation. It does not authorize a live
job.

## 3. Proposed Owner

Name:

`EvidenceItemHandoffOwner`

Proposed location:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-item-handoff-artifact-sink.ts`

Route:

- Prefer reusing existing W5 bounded-evidence-extraction route projection if it
  can carry the handoff decision without adding another route.
- Add a new route only if tests show W5 route reuse makes W4-I merge/removal
  evidence ambiguous.

Recommended default: no new route; append the handoff projection to the existing
W5 artifact route response.

## 4. Accepted Input

Accept only runtime-owned same-ledger W5/W5-E state:

- W5 `status = hidden_evidence_item_extraction_completed`
- W5 `extractionResultStatus = accepted`
- W5 `evidenceItemCount > 0`
- W5-E `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`
- W5-E `admittedEvidenceItemCount = W5 evidenceItemCount`
- W5-E statement hash and byte-length arrays match admitted count
- W5-E `damagedReason = null`
- W5-E `blockedReason = null`
- W5-E default projection is hash/length/provenance-only
- W4-I historical eligibility evidence is present on the same ledger or the W5-E
  projection carries an equivalent merge/removal trigger

Fail closed if any condition is missing or mismatched.

## 5. Output Contract

One hidden/internal decision:

```text
kind = evidence_item_handoff
handoffStatus =
  | evidence_items_ready_for_downstream_internal_handoff
  | evidence_item_handoff_blocked
  | evidence_item_handoff_damaged
defaultProjection = hash_length_provenance_only
```

Required metadata:

- decision id and version;
- parent W5 artifact id;
- W5-E admission status;
- admitted EvidenceItem count;
- statement hashes and byte lengths;
- provider id;
- model id;
- source material lineage hash;
- W4-H packet hash;
- W4-I disposition:
  - `historical_same_ledger_evidence_merged`; or
  - `retained_until_next_downstream_owner`;
- removal trigger if W4-I is retained;
- no EvidenceItem statement text, source text, input text, snippets, summaries,
  or raw provider payloads.

## 6. W4-I Disposition

Recommended implementation:

- Do not delete the W4-I route in this slice.
- Mark W4-I as merged evidence in the W5-F handoff decision.
- Formally retire the original W4-I trigger
  `remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`.
  Its two conditions are now satisfied: W5-E canary passed, and this package
  defines the next EvidenceItem handoff owner.
- Update `V2-RL-012` and status docs to say W4-I route deletion is deferred to
  the first downstream stage that no longer needs W4-I route inspection, with
  owner `EvidenceItemHandoffOwner` and trigger `after_w5f_handoff_route_projection_verified`.

Reason:

Deletion is more expensive to reverse than retention, and W4-I route may still
be useful for inspecting one transition while the next consumer is being built.
The replacement trigger is narrower than the original: it waits only for W5-F
handoff route projection verification, because the broader W5-E canary and next
owner prerequisites are already satisfied. This keeps the convergence trigger
explicit without hiding the remaining route.

## 7. Scope Boundaries

Allowed:

- one handoff decision/type module;
- route projection reuse in existing W5 artifact route;
- focused tests for accepted, blocked, damaged, redaction, count/hash mismatch,
  and W4-I disposition;
- boundary guard updates if needed;
- status/backlog/Agent_Outputs/handoff/index updates.

Forbidden:

- live job or canary;
- public API/UI/report/export/compatibility behavior;
- report/verdict/warning/confidence behavior;
- parser execution;
- cache/SR/storage behavior;
- provider expansion;
- W2/W3 widening;
- ACS/direct URL support;
- prompt/model/config/schema edits;
- V1 work or cleanup.

## 8. V2 Scorecard Impact

Scorecard value: V2-Q3 Evidence extraction handoff.

Direct report-quality value: none yet.

Why this advances value: downstream evidence stages need a stable owner for
accepted EvidenceItems before report-facing interpretation can be safely built.

## 9. V2 Retirement Ledger Impact

Primary row: `V2-RL-012`.

Expected update:

- record that W5-E canary passed;
- record that W5-F defines the next evidence handoff owner;
- mark W4-I standalone route as retained temporarily with owner and explicit
  deletion trigger, unless implementation proves it can be removed safely.

## 10. V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` on
`2026-05-20T09:05:48.935Z`.

Net mechanism impact:

- adds one handoff decision;
- does not add a new route by default;
- converges W4-I historical eligibility evidence into the new handoff owner;
- carries a concrete W4-I route deletion trigger if route removal is deferred.

Hidden-only exception: not required if W4-I convergence is implemented as above.

## 11. Proposed Verifier Set

```powershell
npm -w apps/web run test -- <new W5-F tests> test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

No live verifier is proposed.

## 12. Stop Triggers

Stop if:

- route reuse makes the projection ambiguous and a new route would be required;
- W4-I deletion appears necessary;
- any hidden/default-admin text leak appears;
- report/verdict/warning/confidence behavior becomes necessary;
- prompt/model/config/schema edits become necessary;
- implementation adds another hidden mechanism without W4-I convergence;
- verifier failure root cause is unclear.

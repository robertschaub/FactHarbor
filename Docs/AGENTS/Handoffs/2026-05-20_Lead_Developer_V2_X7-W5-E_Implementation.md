# 2026-05-20 Lead Developer V2 X7-W5-E Implementation

Role: Lead Developer / Captain Deputy
Agent: Codex (GPT-5.5)
Status: Implementation verifier-clean; no live job run.

## Summary

Implemented X7-W5-E inside the approved package:
`Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_And_Consolidation_Review_Package.md`.

W5-E adds one hidden/internal EvidenceItem admission decision over runtime-owned,
accepted W5 bounded evidence-extraction state. The decision status for the
positive path is `bounded_evidence_items_admitted_internal_consumption_pending`.
The projection is hash/length/provenance-only by default and capped at `18`
top-level fields.

## Files Changed

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_And_Consolidation_Review_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/V2_Retirement_Ledger.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Behavior

- Accepts only runtime-owned internal `BoundedEvidenceExtractionDecision` state.
- Requires accepted W5 result, positive EvidenceItem count, closed W4-H parent
  packet state, eligible-denied W4-I parent state, and matching W4-H/W4-I
  provider/hash lineage captured in the runtime-owned W5 parent snapshot.
- Requires `retryCount = 0`.
- Requires W5 EvidenceItems and W5 EvidenceItem projections to match the W5
  parent snapshot `sourceMaterialRef` and `contentPacketId`.
- Fails closed for non-accepted W5, zero EvidenceItems, W4-H/W4-I status drift,
  lineage drift, malformed W5 decision state, missing EvidenceItem provenance,
  or projection redaction violations.
- Reuses the existing W5 artifact sink/route. No new route or sink was added.
- Marks the W4-I route response as historical same-ledger eligibility evidence
  merged by W5-E with removal trigger
  `remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`.

## Boundaries Preserved

No live job, no public API/UI/report/export/compatibility exposure, no parser,
no report/verdict/warning/confidence behavior, no cache/SR/storage behavior, no
provider expansion, no ACS/direct URL support, no prompt/model/config/schema
edit, and no V1 work.

Default admin projection does not return EvidenceItem text, source text, input
text, snippets, summaries, or raw provider payloads.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts`
  - Passed: 4 files / 14 tests.
- `npm -w apps/web exec -- vitest run test/unit/lib/analyzer-v2/boundary-guard.test.ts --testNamePattern "X7-W5"`
  - Passed: 1 file / 87 tests. The full file loaded and all guards passed.
- `npm run validate:v2-gates`
  - Passed.
- `npm run debt:sensors`
  - `advisory_warn`; salient warnings are the known V2 source/test/docs footprint, boundary-guard size, net-mechanism telemetry, and older consolidation-marker advisories.
- `npm -w apps/web run build`
  - Passed.

An earlier broad boundary-guard run failed on an unrelated older X7-D
test-level timeout. The W5-E guard passed in that run; no source changes were
made for the unrelated timeout.

## V2 SCORECARD IMPACT

Advances V2-Q3 by turning accepted hidden EvidenceItems from W5-D into a stable
internal admission handoff. This is not public report-quality progress yet, but
it is value-path infrastructure rather than another denial-only layer.

## V2 RETIREMENT LEDGER IMPACT

Touches V2-RL-009 through V2-RL-012. W4-I is now explicitly historical
same-ledger eligibility evidence for W5-E and has a concrete merge/removal
trigger. W5-C diagnostics remain temporary and should be folded into stable W5
telemetry after a later accepted canary/handoff owner.

Lineage interpretation: W5-E treats the runtime-owned W5 parent snapshot as the
admission-time lineage authority. Cross-store W3-B/W4-G/W4-H/W4-I reads are not
added in this slice; the later W5-E canary package must inspect same-ledger
parent artifacts against the W5 snapshot at least once before W4-I route removal
or merge.

## V2 CONSOLIDATION GATE

Latest debt sensor status: `advisory_warn` generated
`2026-05-20T06:58:12.627Z`.

W5-E adds one core admission decision, but route/sink count remains unchanged.
The package records a removal trigger for the older W4-I standalone route
surface, so the net direction is consolidation after a later canary proves the
handoff.

## DEBT-GUARD RESULT

Classification: `missing-capability` plus `obsolete-parallel-mechanism`
pressure.

Chosen option: add the missing hidden/internal W5-E admission decision and
amend existing W5/W4-I projection surfaces in place.

Rejected path and why: a new route/sink would increase hidden mechanism count;
deleting W4-I now would remove still-useful same-ledger eligibility evidence
before W5-E has a live canary; public/report behavior remains outside scope.

What was removed/simplified: no deletion yet; W4-I is marked historical/merged
with a concrete removal trigger.

What was added: one structural admission owner and focused tests.

Net mechanism count: bounded increase in one core decision; route/sink count
unchanged; W4-I has a retirement trigger.

Budget reconciliation: touched files match the approved W5-E package envelope
plus minimal status/handoff/index docs.

Verification: focused tests, full boundary guard file, V2 gate validation, debt
sensors, and build passed.

Debt accepted and removal trigger: W4-I route remains until
`remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`.

Residual debt: W5-C schema diagnostics still need fold-in after stable W5
telemetry/canary evidence.

## Reviewer Notes

Claude Opus code/security review returned `PASS_WITH_CONCERNS`. The concrete
missing `retryCount = 0` gate was fixed and covered by a focused test. Local W5
parent-snapshot lineage checks were strengthened for EvidenceItem
`sourceRecordId` and `contentPacketId` drift. A follow-up Steer-Co reviewer
returned `CONSENT` that cross-store artifact reads should not be added before
commit because the W5 runtime-owned parent snapshot is the approved input
surface for this slice.

## Next Step

Do not run a W5-E canary from this implementation commit without a separate
approved execution package. A later canary should prove that the W5-D accepted
EvidenceItems are admitted by W5-E with default redaction and no public leak.

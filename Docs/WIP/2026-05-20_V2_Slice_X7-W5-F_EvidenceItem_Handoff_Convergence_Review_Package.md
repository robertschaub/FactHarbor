# V2 Slice X7-W5-F EvidenceItem Handoff Convergence Review Package

Date: 2026-05-20
Status: review package
Author: Captain Deputy / Lead Developer
Steering review: Claude Opus 4.6 recommended Option B: define the next
EvidenceItem handoff owner first, and fold the W4-I merge/removal decision into
that package.

## 1. Purpose

W5-E3 passed:

- W5 accepted hidden EvidenceItems.
- W5-E admitted them into the hidden/internal consumption-pending contract.
- W3-B/W4/W5 default-admin projections stayed redacted.

The next step is not another canary and not public/report work. The next step is
to define the next EvidenceItem handoff owner and decide how the now-historical
W4-I standalone route should be merged, removed, or explicitly retained until
that owner exists.

## 2. Why This Package Exists

The W4-I route carries this removal trigger:

`remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`

W5-E3 satisfies the first half. The second half is still missing: no next
EvidenceItem handoff owner has been defined.

Removing W4-I before naming the successor would violate the trigger. Keeping
W4-I indefinitely would leave historical hidden machinery in place after it has
served its gating role.

## 3. Proposed Direction

Define one narrow EvidenceItem handoff owner for the next hidden/internal stage.

Recommended owner name:

`EvidenceItemHandoffOwner`

Recommended responsibility:

- accept only runtime-owned W5-E admitted EvidenceItem metadata;
- verify W5/W5-E admission lineage, counts, hashes, provider lineage, model
  metadata, W4-H packet hash, and W4-I historical eligibility evidence;
- create no public output;
- create no report/verdict/warning/confidence;
- expose no EvidenceItem statement text by default;
- produce one hidden/admin-only handoff decision indicating whether the admitted
  EvidenceItems are structurally ready for the next downstream analytical stage.

Recommended W4-I disposition:

- do not delete W4-I in this review package;
- in the implementation package, either:
  - merge W4-I same-ledger eligibility evidence into the new handoff decision
    and remove the standalone W4-I route surface if tests prove no remaining
    consumer needs it; or
  - retain W4-I temporarily but update `V2-RL-012` with a concrete next removal
    owner and trigger.

## 4. Scope

This review package authorizes no implementation.

Future implementation package may include:

- one hidden/internal EvidenceItem handoff decision over W5-E accepted admission;
- route/sink reuse where possible;
- focused tests for lineage/count/hash/redaction;
- W4-I route merge/removal or explicit retention with owner/trigger;
- Retirement Ledger and Scorecard updates.

Future implementation package must not include:

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

## 5. V2 Scorecard Impact

Scorecard value: V2-Q3 evidence handoff completeness and V2-Q5 containment.

Direct report-quality value: none yet.

Why not jump to report/verdict: public report quality depends on a stable,
owned EvidenceItem handoff before report-facing interpretation can be built
without copying hidden machinery forward.

## 6. V2 Retirement Ledger Impact

Primary row: `V2-RL-012`.

Expected impact:

- W5-E3 closes the "W5-E canary passed" prerequisite.
- X7-W5-F should close or refine the "next evidence handoff owner" prerequisite.
- The implementation package must either remove/merge W4-I standalone route
  surface or set a specific later owner and trigger.

## 7. V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` on
`2026-05-20T09:05:48.935Z`.

Hidden-only exception: not needed if the package retires, merges, or gives a
specific owner/trigger to older W4-I machinery while defining the next handoff
owner.

Net mechanism rule: adding a new hidden handoff decision is allowed only if it
replaces or converges prior W4-I/W5-E handoff scaffolding and has a concrete
downstream owner.

## 8. Proposed Verifier Set For Implementation Package

Recommended local verifier set:

```powershell
npm -w apps/web run test -- <new focused W5-F tests> test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

No live job is proposed for W5-F implementation. The remaining live-job slot
should be preserved for the first canary that validates a genuinely new
downstream value step.

## 9. Stop Triggers

Stop before implementation if:

- the proposed handoff owner needs public/report/verdict/warning/confidence
  behavior;
- W4-I has undocumented consumers that cannot be safely merged or retained with
  a concrete trigger;
- the implementation requires prompt/model/config/schema edits;
- the implementation adds another hidden route/sink without merging/removing or
  assigning ownership for older W4-I/W5-E machinery;
- any verifier fails with unclear root cause;
- Steer-Co/reviewer dissent appears.

## 10. Recommended Next Action

Prepare a narrow X7-W5-F implementation package for review. The package should
be code-light and convergence-first: define the EvidenceItem handoff owner,
decide W4-I route disposition, and avoid another live job.

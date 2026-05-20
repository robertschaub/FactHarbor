# V2 Slice X7-W5-H W4-I Standalone Route Retirement Package

Date: 2026-05-20
Status: implementation package
Owner: Captain Deputy / Lead Developer

## 1. Purpose

X7-W5-G proved the W5-F EvidenceItem handoff projection on the live product
route. The W5 default admin projection now carries the W4-I historical
eligibility disposition and the replacement trigger
`after_w5f_handoff_route_projection_verified`.

X7-W5-H retires the standalone W4-I admin artifact route only. It does not
delete W4-I core eligibility logic, runtime ownership, provenance checks, or the
process-local sink used by the orchestrator and W5 lineage checks.

## 2. Authority

Authority source:

- `Docs/WIP/2026-05-20_V2_Slice_X7-W5-G_EvidenceItem_Handoff_Projection_Canary_Result.md`
- `Docs/AGENTS/V2_Retirement_Ledger.md` row `V2-RL-012`

The W5-G canary satisfied the W5-F replacement trigger for the standalone W4-I
route. No live job is authorized or needed for this package.

## 3. Scope

Allowed:

- remove the standalone W4-I internal admin route;
- remove the route-specific unit test;
- update boundary guard expectations so W4-I core/sink remains guarded while
  route inspection responsibility is owned by W5-F;
- update status, retirement ledger, handoff, Agent_Outputs, and generated
  indexes as required by protocol.

Forbidden:

- deleting W4-I core denial, provenance, owner, or artifact sink modules;
- changing W5 extraction, W5-E admission, or W5-F handoff behavior;
- adding any route, sink, flag, retry, fallback, compatibility path, or new
  hidden mechanism;
- live jobs or canaries;
- public API/UI/report/export/compatibility behavior;
- prompt/model/config/schema edits;
- parser execution;
- report/verdict/warning/confidence behavior;
- cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL, or V1 work.

## 4. Implementation Shape

Delete:

- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts`

Retain:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink.ts`

Update:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/AGENTS/V2_Retirement_Ledger.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- Exchange Protocol outputs.

## 5. Pass Criteria

- W4-I route path no longer exists.
- No source or test import still references
  `api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts`.
- W4-I core/sink/provenance remain present and guarded as hidden,
  redacted-by-default, execution-closed runtime lineage state.
- W5 route projection still exposes W5-F handoff and W4-I historical disposition
  without EvidenceItem/source/input text leakage.
- `V2-RL-012` records the standalone W4-I route as retired and the core W4-I
  eligibility state as retained temporarily for W5 lineage.
- No live-job tranche ledger change.

## 6. V2 Scorecard Impact

Quality dimension advanced: `V2-Q10` complexity convergence.

Direct user/report value: none.

Hidden-only value: removes a now-obsolete hidden inspection route after its
successor projection was live-proven.

Cost/latency impact: none at runtime for analysis execution; lower test and
inspection surface.

Retirement or simplification unlocked: closes the standalone W4-I route debt in
`V2-RL-012`.

Scorecard risk: low. Removing the route must not remove W4-I lineage checks
needed by W5.

## 7. V2 Retirement Ledger Impact

Rows touched: `V2-RL-012`.

Status changes: standalone W4-I admin route moves from `merge` to retired;
W4-I core eligibility logic and process-local sink remain `keep` until a later
stable EvidenceItem/report owner no longer needs the lineage state.

New mechanism owner: none.

Removal / merge trigger: `after_w5f_handoff_route_projection_verified` was
satisfied by X7-W5-G job `19f831aa36084ab6a2cee9e89698f87c`.

Debt accepted: W4-I core/sink remain temporary lineage debt, owned by Lead
Developer, with next reassessment before W6/report-facing consumption.

## 8. V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` at
`2026-05-20T10:24:53.098Z`.

Net mechanism impact: decreases. One internal admin route and one route test are
removed. No replacement route or new mechanism is added.

Hidden-only exception: not required; this package retires hidden machinery.

## 9. Debt-Guard Plan

Path: Full.

Classification: obsolete-parallel-mechanism / planned retirement.

Chosen option: delete the standalone W4-I route and its route-specific test,
then amend existing guards/docs.

Rejected path: retain the route indefinitely or add a tombstone route. Both keep
route debt alive after the W5-F projection has been live-proven.

Why W4-I core is not deleted: W5 extraction/admission/handoff still uses W4-I
runtime-owned eligibility and lineage state.

## 10. Verifier Plan

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
rg -n "evidence-lifecycle-execution-readiness-artifacts" apps/web/src apps/web/test | rg -v "boundary-guard.test.ts"
git diff --check
git status --short --untracked-files=all
```

The `rg` command must return no output. The only allowed remaining source/test
reference is the boundary guard assertion that the retired route path no longer
exists.

No expensive tests and no live jobs.

## 11. Stop Triggers

Stop and reconvene Steer-Co if:

- W5 route projection or W5-F handoff requires the standalone W4-I route;
- removing the route requires deleting W4-I core/sink/provenance;
- public behavior, prompt/model/config/schema, parser, cache/SR/storage,
  provider, ACS/direct URL, report/verdict/warning/confidence, or V1 scope
  becomes necessary;
- any verifier fails with unclear root cause;
- a raw text leak appears in public, default-admin, log, or error surfaces.

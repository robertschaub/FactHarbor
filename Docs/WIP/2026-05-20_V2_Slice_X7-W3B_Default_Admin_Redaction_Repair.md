# V2 Slice X7-W3B Default Admin Redaction Repair

Date: 2026-05-20
Status: implemented and verifier-clean
Author: Captain Deputy / Lead Developer

## 1. Trigger

W5-E2 canary job `9584597389504d74af6dcfd684755bff` proved that W5-E
fresh admission snapshot recording works, but stopped because the same-ledger
W3-B source-material page-summary admin route returned
`sourceMaterialRecords[].sourceMaterialText` by default.

That violated the W5-E2 package containment criterion that source text must not
appear in default admin route responses.

## 2. Scope

Allowed and implemented:

- Tighten only the existing W3-B internal admin artifact route default
  projection.
- Keep stored runtime artifacts unchanged so downstream W4/W5 stages can still
  consume runtime-owned source material text.
- Remove `sourceMaterialText` from the default route response.
- Preserve hash/length/provenance metadata and add
  `sourceMaterialTextReturned: false`.
- Preserve authenticated internal-only, no-store route behavior.

Not changed:

- no source material creation logic;
- no W2/W3 widening;
- no parser execution;
- no EvidenceItem, report, verdict, warning, or confidence behavior;
- no public/API/UI/report/export/compatibility behavior;
- no cache/SR/storage behavior;
- no prompt/model/config/schema edits;
- no provider expansion, ACS/direct URL, or V1 work;
- no live job.

## 3. V2 Scorecard Impact

Scorecard value: containment and provenance quality for the existing source
material path.

Direct report-quality value: none yet.

Why this is still valuable: it removes a same-ledger leak blocker that prevented
W5-E2 from validating the EvidenceItem admission path.

## 4. V2 Retirement Ledger Impact

Rows touched: none directly.

Retirement impact: supports later W4-I/W5 route consolidation by making older
W3-B admin output conform to the hash/length/provenance-only default projection
pattern used by W4-G/W4-H/W5.

New mechanism count: unchanged. This amends an existing route projection.

## 5. V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` on
`2026-05-20T09:05:48.935Z`, with existing V2 source/test/docs footprint,
boundary-guard size, debt-guard telemetry, and consolidation-marker warnings.

This repair adds no route, no sink, no flag, no retry, and no fallback. It
narrows an existing default admin projection.

## 6. Verification

Passed:

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.test.ts
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
```

Manual route check against W5-E2 ledger after the local dev server reloaded:

- `sourceMaterialText` key absent from default W3-B admin response;
- known source-text term absent;
- `sourceMaterialTextHash` retained;
- `sourceMaterialTextReturned: false` retained.

## 7. Debt-Guard Result

```text
DEBT-GUARD COMPACT RESULT
Chosen option: amend existing W3-B internal route projection in place.
Net mechanism count: unchanged.
Verification: focused W3-B route test, W3-B/W5 focused tests, V2 gate validation, debt sensors, build, manual route projection check.
Residual debt: W5-E2 still needs a separately packaged canary rerun after this repair commit and runtime refresh; no second canary is authorized by this repair.
```

## 8. Next Step

Prepare a separate W5-E3 or W5-E2-rerun canary package if the team wants to
spend another live-job slot. That package must commit this repair first, refresh
runtime from the repair commit, and re-run the same W5-E admission and route
containment checks.

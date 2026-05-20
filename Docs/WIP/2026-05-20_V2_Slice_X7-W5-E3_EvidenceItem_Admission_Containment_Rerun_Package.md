# V2 Slice X7-W5-E3 EvidenceItem Admission Containment Rerun Package

Date: 2026-05-20
Status: reviewed execution package
Author: Captain Deputy / Lead Developer
Review: Claude Opus 4.6 returned `approve` with no required changes.

## 1. Purpose

Run exactly one product-route canary after W3-B default-admin redaction repair
commit `4a86e2cf` to prove both:

- W5-E fresh EvidenceItem admission snapshot recording still works; and
- same-ledger W3-B/W4/W5 default admin projections do not expose source,
  EvidenceItem, or input text by default.

This package exists because W5-E2 job `9584597389504d74af6dcfd684755bff`
proved W5-E admission recording but stopped as
`STOP_X7_W5_E2_W3B_DEFAULT_ADMIN_SOURCE_TEXT_EXPOSURE`.

## 2. Authority And Budget

Captain has instructed Captain Deputy to continue autonomously under reviewed
package discipline. The live-job tranche ledger currently records `2`
remaining.

This package authorizes exactly one W5-E3 canary, consuming `1` live-job slot.
No second W5-E3 canary is authorized.

## 3. Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `claimboundary-v2`.

## 4. Scope

Allowed:

- commit this package before preflight;
- refresh runtime from the committed package state and repair commit `4a86e2cf`;
- run focused W3-B/W5 route verifiers and V2 gate validation;
- run exactly one `claimboundary-v2` product-route job;
- inspect public containment;
- inspect authenticated internal no-store Claim Understanding, W2/W3, W4-H/W4-I,
  and W5 artifact routes on the same ledger;
- update live-result docs, tranche ledger, status/backlog, Agent_Outputs, and
  handoff after the canary.

Forbidden:

- no source changes before the canary;
- no second live job;
- no prompt/model/config/schema edits or approval flips;
- no parser execution;
- no report/verdict/warning/confidence behavior;
- no public API/UI/report/export/compatibility exposure;
- no cache/SR/storage behavior;
- no provider expansion, W2/W3 widening, retries, endpoint migration, ACS/direct
  URL support, or V1 work.

## 5. Preflight Requirements

Before submission:

- package is committed;
- `git status --short --untracked-files=all` is clean;
- runtime is restarted from the committed package state;
- API/Web runtime commit hash is recorded and maps to the package commit;
- focused W3-B route and W5 route/admission/sink tests pass;
- `npm run validate:v2-gates` passes;
- route preflight confirms W3-B and W5 internal routes are authenticated,
  no-store, JSON, and unauthenticated requests are denied;
- no source changed after verifier pass.

Recommended verifier set:

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts
npm run validate:v2-gates
```

## 6. Pass Criteria

Classify as `PASS_X7_W5_E3_EVIDENCE_ITEM_ADMISSION_AND_CONTAINMENT_CANARY`
only if all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit is recorded and maps to committed `4a86e2cf` or later package
  commit that includes it;
- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- public result exposes zero public EvidenceItems and no hidden marker/source
  text leak;
- same-ledger hidden routes are present for Claim Understanding, intake, W2,
  W3-B, W4-H, W4-I, and W5;
- W3-B default admin route does not contain `sourceMaterialText` or source text
  by default and does include hash/length/provenance metadata with
  `sourceMaterialTextReturned: false`;
- W4-H/W4-I/W5 default admin routes remain hash/length/provenance-only and do
  not expose input/source/EvidenceItem text;
- W5 result is accepted:
  - `status = hidden_evidence_item_extraction_completed`;
  - `extractionResultStatus = accepted`;
  - `extractionStatus = evidence_extracted`;
  - `schemaDiagnostics = null`;
  - `executionTelemetry.retryCount = 0`;
  - `evidenceItemCount > 0`;
- W5-E admission is present and accepted:
  - `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`;
  - `admittedEvidenceItemCount = W5 evidenceItemCount`;
  - statement hash and byte-length arrays match the admitted count;
  - `damagedReason = null`;
  - `blockedReason = null`;
  - `defaultProjection = hash_length_provenance_only`;
  - redaction side effects keep EvidenceItem/source/input text unavailable;
- W4-I route response is still historical same-ledger eligibility evidence and
  carries the W5-E merge/removal trigger;
- authenticated internal routes are no-store and unauthenticated access is
  denied.

## 7. Stop Criteria

Stop and do not spend another live job if:

- job uses or falls back to legacy `claimboundary`;
- runtime commit does not include the redaction repair;
- public result leaks hidden markers, W5-E state, source text, EvidenceItem
  text, or EvidenceItems;
- W3-B default admin route still exposes `sourceMaterialText` or source text;
- W4-H/W4-I/W5 default admin routes expose text;
- W5 has non-null `damagedReason` or `blockedReason`;
- W5-E admission is absent, blocked, damaged, or count/hash mismatched;
- any verifier or preflight fails.

Every submitted live job consumes one budget slot even if it stops.

## 8. V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction handoff and containment.

Direct report-quality value: none yet; public V2 remains pre-cutover.

Hidden-only value: proves the first accepted EvidenceItem admission contract and
default redacted same-ledger source/evidence projections.

Cost/latency impact: one live job.

## 9. V2 Retirement Ledger Impact

Rows touched: `V2-RL-012`.

If this canary passes, the later evidence-handoff owner may prepare a separate
cleanup package to merge/remove W4-I standalone route surface. This package
does not remove W4-I.

## 10. V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` on
`2026-05-20T09:05:48.935Z`.

This package adds no source mechanism. It spends one live job to validate the
existing W5-E mechanism and the just-repaired W3-B default admin redaction.

## 11. Output Requirements

After the canary:

- create a W5-E3 live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.

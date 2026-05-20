# V2 Slice X7-W5-E2 EvidenceItem Admission Fresh Canary Package

Date: 2026-05-20
Status: reviewed execution package candidate
Author: Captain Deputy / Lead Developer

## 1. Purpose

Run exactly one fresh product-route canary after route repair commit
`f534107f` to prove whether X7-W5-E records the
`bounded_evidence_items_admitted_internal_consumption_pending` admission
snapshot at runtime for accepted W5 EvidenceItems.

Fresh means a new product-route job on a refreshed runtime after `f534107f`.
It does not mean the analysis input has never been used before. The hydrogen
input is intentionally reused because it already proved W5 accepted EvidenceItem
generation in W5-D.

This package exists because the prior W5-E canary job
`68f7dba28c9441b7ab702e5a7b2c1a17` proved W5 accepted EvidenceItems after the
route repair, but the stored artifact lacked the W5-E admission snapshot and
therefore classified as `STOP_X7_W5_E_MISSING_ADMISSION_SNAPSHOT`.

The source path that records the W5-E snapshot already exists:
`recordBoundedEvidenceExtractionRuntimeArtifact()` constructs
`boundedEvidenceItemAdmission` with `buildBoundedEvidenceItemAdmissionDecision()`.
That code existed in the W5-E implementation, so W5-E1's missing snapshot is
treated as a runtime/process refresh integrity failure until disproven. W5-E2 is
worth one slot only after a full runtime restart from the committed source proves
the serving process contains the W5-E route/sink implementation.

## 2. Authority And Budget

Captain has instructed Captain Deputy to continue autonomously and not pause for
routine implementation choices. Live jobs are authorized within the standing
tranche discipline; the machine-readable ledger currently records `3`
remaining.

This package authorizes exactly one W5-E2 canary, consuming `1` live-job slot.
No second W5-E2 canary is authorized.

## 3. Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `claimboundary-v2`. Do not use the legacy `claimboundary`
variant or helper shape.

## 4. Scope

Allowed:

- commit this package before preflight;
- refresh the runtime from committed `f534107f` plus this package commit;
- run focused W5 route/admission/sink verifiers and route preflight;
- submit exactly one `claimboundary-v2` product-route job;
- inspect public containment;
- inspect authenticated internal no-store Claim Understanding, W2/W3, W4-H/W4-I,
  and W5 artifact routes on the same ledger;
- inspect W5-E admission on the W5 route projection;
- update result docs, tranche ledger, status/backlog, Agent_Outputs, and
  handoff after the canary.

Forbidden:

- no source changes before the canary;
- no prompt/model/config/schema edits or approval flips;
- no parser execution;
- no report/verdict/warning/confidence behavior;
- no public API/UI/report/export/compatibility exposure;
- no cache/SR/storage behavior;
- no provider expansion, W2/W3 widening, retries, endpoint migration, ACS/direct
  URL support, or V1 work;
- no EvidenceItem text, source text, input text, snippets, summaries, or raw
  provider payloads in public JSON, UI, reports, exports, compatibility
  projections, logs, errors, or default admin route responses.

## 5. Preflight Requirements

Before submission:

- package is committed;
- `git status --short --untracked-files=all` is clean;
- runtime is refreshed from the committed package state;
- API/Web runtime commit hash is recorded and matches the intended package
  commit; the runtime source must include `f534107f`;
- the actual port-3000 process is newly started after the package commit; stale
  dev-server hot reload is not sufficient;
- the optimized build or dev route table lists
  `/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts`;
- focused W5 route/admission/sink tests pass;
- `npm run validate:v2-gates` passes;
- W5 internal route preflight:
  - unauthenticated request returns `401`;
  - authenticated missing/test ledger request returns JSON no-store, not HTML;
  - route is present in the current runtime;
- focused W5 route/admission/sink tests include:
  - admission snapshot present for a newly recorded W5 artifact;
  - missing admission snapshot returns
    `evidence_item_admission_damaged` /
    `missing_runtime_admission_snapshot`, not `500`;
- public shell-only output without same-ledger hidden W5 evidence is a stop
  result, not a pass;
- no source changed after verifier pass.

Recommended preflight command set:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts
npm run validate:v2-gates
```

## 6. Pass Criteria

Classify the canary as
`PASS_X7_W5_E_EVIDENCE_ITEM_ADMISSION_CANARY` only if all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit is recorded and maps to the committed W5-E2 package state;
- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- public result exposes zero public EvidenceItems and no hidden marker/text leak;
- leak inspection covers public job JSON, public job/detail APIs, default
  internal/admin route projections, error responses, and current runtime logs;
- no EvidenceItem statement text, source text, input text, snippet, summary, or
  raw provider payload is visible on those surfaces;
- W5 hidden artifact is present on the same ledger;
- W5 result remains accepted:
  - `status = hidden_evidence_item_extraction_completed`;
  - `extractionResultStatus = accepted`;
  - `extractionStatus = evidence_extracted`;
  - `schemaDiagnostics = null`;
  - `retryCount = 0`;
  - `evidenceItemCount > 0`;
- W5 route projection count equals the underlying hidden W5 artifact count;
- W5-E admission is present and accepted on the W5 route projection:
  - `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`;
  - `admittedEvidenceItemCount = W5 evidenceItemCount`;
  - `evidenceItemStatementHashes.length = admittedEvidenceItemCount`;
  - `evidenceItemStatementByteLengths.length = admittedEvidenceItemCount`;
  - `parentW5ArtifactId` is non-blank;
  - `sourceMaterialLineageHash`, `w4hPacketHash`, `w4iEligibilityStatus`,
    `providerId`, and `modelId` are non-null;
  - `damagedReason = null`;
  - `blockedReason = null`;
  - `defaultProjection = hash_length_provenance_only`;
  - redaction flags keep EvidenceItem, source, and input text unavailable;
- W4-I route response is still historical same-ledger eligibility evidence and
  carries the W5-E merge/removal trigger;
- authenticated internal routes are no-store and unauthenticated access is
  denied.

## 7. Stop Criteria

Stop and do not spend another live job if:

- job uses or falls back to legacy `claimboundary`;
- runtime commit does not match the intended committed state;
- public result leaks text, hidden markers, W5-E state, or EvidenceItems;
- current runtime logs or route error responses leak EvidenceItem text, source
  text, input text, snippets, summaries, or raw provider payloads;
- public result is shell-only and same-ledger hidden W5 evidence is absent;
- W5 has `damagedReason` or `blockedReason` non-null;
- W5 hidden artifact is absent or route fails;
- W5 does not produce accepted EvidenceItems;
- W5-E admission is absent, blocked, damaged, or mismatched;
- W5-E `damagedReason` or `blockedReason` is non-null;
- W4-I historical same-ledger eligibility evidence or W5-E merge/removal trigger
  is absent;
- the W5 route only shows the `missing_runtime_admission_snapshot` fail-closed
  repair state; that proves route robustness, not W5-E admission;
- internal route default projection exposes text;
- any verifier or preflight fails.

Every submitted live job consumes one budget slot even if it stops. Do not
deduct only on pass; the ledger records actual job spend.

## 8. V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction handoff.

Direct user/report value: none yet; public V2 stays pre-cutover.

Hidden-only value: proves whether accepted W5 EvidenceItems are admitted into the
next internal consumption contract after the route repair.

Cost/latency impact: one live job.

Retirement or simplification unlocked: a passing result partially satisfies the
W4-I route merge/removal trigger in `V2-RL-012`.

Scorecard risk: if W5-E admission still fails, stop and diagnose locally; do not
add another hidden layer.

## 9. V2 Retirement Ledger Impact

Rows touched: `V2-RL-012`.

Status changes: none inside this package.

New mechanism owner: none.

Removal / merge trigger: if the canary passes, the later evidence-handoff owner
may prepare a separate cleanup package to merge/remove W4-I standalone route
surface. This package itself does not remove W4-I.

Debt accepted: none.

## 10. V2 Consolidation Gate

Latest relevant debt-sensor status: `advisory_warn` on
`2026-05-20T08:19:41.666Z`.

This package adds no source mechanism. It spends one live job to validate the
existing W5-E mechanism after a committed fail-closed route repair.

The package does not treat the `f534107f` fail-closed behavior itself as a W5-E
pass. A pass requires the admission snapshot to be recorded at job time.

If W5-E2 stops as `missing_runtime_admission_snapshot` again after a full process
restart, do not spend another job. The next step would be local diagnosis of why
the product route records a W5 artifact without the admission snapshot despite
the source path constructing it.

## 11. Output Requirements

After the canary:

- create a W5-E2 live-result WIP document with job id, runtime commit, public
  containment result, hidden-chain evidence, leak checks, and classification;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.

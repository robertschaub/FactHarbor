# V2 Slice X7-W5-E EvidenceItem Admission Canary Execution Package

Date: 2026-05-20
Status: reviewed execution package; no source implementation
Author: Captain Deputy / Steer-Co

## 1. Purpose

Run exactly one product-route canary after X7-W5-E implementation commit
`f9ecb5a8` to prove that accepted hidden W5 bounded EvidenceItems are admitted
into the X7-W5-E internal admission decision, while all public/report surfaces
remain blocked/precutover and text remains redacted by default.

This package exists because X7-W5-E is locally implemented and verifier-clean,
but no live product-route job has yet proven the new admission decision.

## 2. Authority And Budget

Captain has repeatedly instructed Captain Deputy to continue without routine
pauses and confirmed a live-job tranche budget of `6`. The current
machine-readable tranche ledger records `4` remaining after W5-D.

This package proposes exactly one W5-E canary, consuming `1` live-job slot.
No second W5-E canary is authorized by this package.

## 3. Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Use `claimboundary-v2` explicitly. Do not use the legacy `claimboundary`
helper shape.

## 4. Scope

Allowed:

- refresh runtime from a committed clean repo state;
- submit exactly one `claimboundary-v2` product-route job;
- inspect public job result for blocked/precutover containment;
- inspect authenticated internal no-store W2/W3-B/W4-G/W4-H/W4-I/W5 artifact
  routes for the same ledger;
- inspect the W5 artifact projection for the W5-E
  `boundedEvidenceItemAdmission` projection;
- inspect same-ledger parent artifacts once against the W5 parent snapshot, as
  required by the W5-E implementation handoff and V2-RL-012;
- update the live-job tranche ledger and result docs after the canary.

Forbidden:

- no code/source changes before the canary;
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

Before submitting:

- Commit this execution package before running preflight or submitting the
  canary.
- `git status --short --untracked-files=all` is clean.
- Runtime is refreshed from the committed canary package state.
- API/Web runtime commit hashes are recorded and match the intended commit.
- Focused W5-E verifier set passes or is confirmed unchanged from commit
  `f9ecb5a8` with no source changes after verification.
- Authenticated internal W5 route returns `Cache-Control: no-store`.
- Unauthenticated internal W5 route returns `401`.
- Default W5 route projection is hash/length/provenance-only.

Recommended preflight command set:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts
npm run validate:v2-gates
```

Build may be reused from `f9ecb5a8` if no source changed after that commit;
otherwise rerun `npm -w apps/web run build`.

## 6. Pass Criteria

Classify the canary as
`PASS_X7_W5_E_EVIDENCE_ITEM_ADMISSION_CANARY` only if all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit is recorded and maps to the committed W5-E implementation;
- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- public result exposes zero public EvidenceItems and no hidden marker/text leak;
- W5 hidden artifact is present on the same ledger;
- W5 result remains accepted:
  - `status = hidden_evidence_item_extraction_completed`;
  - `extractionResultStatus = accepted`;
  - `extractionStatus = evidence_extracted`;
  - `schemaDiagnostics = null`;
  - `retryCount = 0`;
  - `evidenceItemCount > 0`;
- W5-E admission is present on the W5 route projection:
  - `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`;
  - `admittedEvidenceItemCount = W5 evidenceItemCount`;
  - default projection has no more than `18` top-level fields;
  - `defaultProjection = hash_length_provenance_only`;
  - `redaction.evidenceItemTextReturned = false`;
  - `redaction.sourceTextReturned = false`;
  - `redaction.inputTextReturned = false`;
  - no EvidenceItem statement/source/input text appears in the W5-E default
    projection;
- same-ledger parent artifact inspection confirms the W5 parent snapshot is
  consistent with W4-H/W4-I and the W3-B/W4-G/W4-H lineage available through
  authenticated internal routes;
- W4-I route response is marked
  `historical_same_ledger_eligibility_evidence` and carries the W5-E merge
  removal trigger;
- authenticated internal routes are no-store and unauthenticated access is
  denied.

## 7. Stop / Pivot Criteria

Stop and return to Steer-Co if:

- job uses or falls back to legacy `claimboundary`;
- runtime commit does not match the intended committed state;
- public result leaks text, hidden markers, W5-E state, or EvidenceItems;
- W5 hidden artifact is absent;
- W5 does not produce accepted EvidenceItems;
- W5-E admission is absent, blocked, damaged, or has mismatched count;
- same-ledger parent artifact inspection contradicts the W5 parent snapshot;
- internal route default projection exposes text;
- verifier/preflight failure has unclear root cause.

Do not spend a second live job under this package.

## 8. V2 SCORECARD IMPACT

Advances V2-Q3 Evidence extraction and internal evidence handoff by proving the
first hidden product-route EvidenceItem admission decision after accepted W5
extraction.

This is still not public report quality. It is a required bridge toward later
EvidenceItem consumption/report stages.

## 9. V2 RETIREMENT LEDGER IMPACT

If the canary passes, V2-RL-012's W4-I standalone route removal trigger becomes
partially satisfied: W5-E has proven same-ledger admission and parent-chain
inspection. A later evidence-handoff owner may then remove or merge the W4-I
route under a separate cleanup package.

W5-C diagnostics remain historical failure telemetry and are not reopened by
this package.

## 10. V2 CONSOLIDATION GATE

Latest relevant debt-sensor status: `advisory_warn` on
2026-05-20T07:23:35.755Z.

This package adds no source mechanism. It spends one live job to validate the
existing W5-E mechanism and to advance the W4-I route merge/removal trigger.

## 11. Output Requirements

After the canary:

- create a W5-E live-result WIP document with job id, runtime commit, public
  containment result, hidden-chain evidence, same-ledger parent inspection, leak
  checks, and classification;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` with a
  short pointer-style addendum;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the docs/result package.

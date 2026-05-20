# V2 Slice X7-W5-G EvidenceItem Handoff Projection Canary Package

Date: 2026-05-20
Status: Steer-Co-consented execution package
Author: Captain Deputy / Lead Developer
Review: Steer-Co reviewers agreed the next bounded step is one W5-F live
projection canary plus live-budget reconciliation, not new implementation.

## 1. Purpose

Run exactly one product-route canary after X7-W5-F commit `4deb595c` to prove
the new hidden/internal EvidenceItem handoff projection is reachable on a real
same-ledger run.

This package exists because X7-W5-F is verifier-clean locally but its replacement
trigger is `after_w5f_handoff_route_projection_verified`. The next step must
therefore prove the projection live before W4-I route deletion or report-facing
downstream work.

## 2. Authority And Budget

Captain has instructed Captain Deputy to continue autonomously under reviewed
package discipline and has authorized live jobs under the current tranche.

Repo-local machine ledger:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- active tranche reset total: `6`
- current remaining before X7-W5-G: `1`
- per-canary rule: exactly `1` job is consumed after reviewed package, committed
  source, clean git status, runtime refresh, and runtime commit match.

This package authorizes exactly one X7-W5-G canary, consuming `1` live-job slot
if submitted. No second X7-W5-G canary is authorized.

## 3. Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `claimboundary-v2`.

## 4. Scope

Allowed:

- commit this package before preflight;
- refresh runtime from committed source including `4deb595c`;
- run focused W5/W4-I route verifiers and V2 gate validation;
- preflight W5 and W4-I internal routes for auth/no-store/missing-ledger shape;
- run exactly one `claimboundary-v2` product-route job;
- inspect public containment;
- inspect authenticated internal no-store W3-B/W4-I/W5 artifact routes on the
  same ledger;
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

- this package is committed;
- `git status --short --untracked-files=all` is clean;
- runtime is restarted from the committed package state;
- API/Web runtime commit hash is recorded and maps to the package commit;
- focused W5/W4-I/boundary verifier passes;
- `npm run validate:v2-gates` passes;
- W5 and W4-I internal route preflight confirms:
  - unauthenticated request returns `401`;
  - authenticated missing-ledger request returns bounded JSON `404`;
  - authenticated missing-ledger response is `Cache-Control: no-store`.

Recommended verifier set:

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
```

## 6. Pass Criteria

Classify as `PASS_X7_W5_G_EVIDENCE_ITEM_HANDOFF_PROJECTION_CANARY` only if all
are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit is recorded and maps to committed source including `4deb595c`;
- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- public result exposes zero public EvidenceItems and no hidden marker, source
  text, input text, EvidenceItem text, prompt text, snippet, summary, or raw
  provider payload;
- same-ledger hidden routes are present for Claim Understanding, W2/W3, W4-I,
  and W5;
- W3-B, W4-I, and W5 default admin routes remain hash/length/provenance-only and
  do not expose input/source/EvidenceItem text;
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
- W5 default route projection includes `evidenceItemHandoff`;
- `evidenceItemHandoff.handoffStatus =
  evidence_items_ready_for_downstream_internal_handoff`;
- W5-F handoff statement hash and byte-length arrays match W5-E admission;
- W5-F handoff provider/model/lineage hashes match W5-E/W5 parent lineage;
- W4-I route reports:
  - `inspectionRole = historical_same_ledger_eligibility_evidence`;
  - `mergedBy = x7-w5-f_evidence_item_handoff_projection`;
  - `retiredRemovalTrigger =
    remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`;
  - `removalTrigger = after_w5f_handoff_route_projection_verified`;
- authenticated internal routes are no-store and unauthenticated access is
  denied.

## 7. Stop Criteria

Stop and do not spend another live job if:

- budget authority or ledger state cannot be reconciled before submission;
- job uses or falls back to legacy `claimboundary`;
- runtime commit does not include `4deb595c`;
- public/default-admin route leaks hidden markers, source text, input text,
  EvidenceItem text, prompt text, snippets, summaries, or raw provider payloads;
- W5 handoff projection is absent, blocked, damaged, or lineage-mismatched;
- W5/W5-E count/hash/byte-length lineage mismatches;
- W4-I route still reports the old W5-E `mergedBy` marker without the W5-F
  replacement trigger;
- any verifier or preflight fails.

Every submitted live job consumes one budget slot even if it stops.

## 8. V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction handoff.

Direct user/report value: none yet; public V2 remains pre-cutover.

Hidden-only value: proves the current hidden EvidenceItem handoff owner on the
product route, enabling the next report-quality bridge to depend on a live-proven
handoff rather than local-only convergence.

Cost/latency impact: one live job.

Retirement or simplification unlocked: W4-I route/sink becomes eligible for a
separate W4-I retirement/merge implementation package if the canary passes.

Scorecard risk: spending the final ledger-recorded slot on containment proof
rather than report output. Steer-Co judged it necessary because W5-F is the
handoff owner for downstream value work.

## 9. V2 Retirement Ledger Impact

Rows touched: `V2-RL-012`.

If this canary passes, `after_w5f_handoff_route_projection_verified` is
satisfied and a later package may remove or merge the standalone W4-I route/sink
if no downstream inspection still needs it.

This package does not remove W4-I.

## 10. V2 Consolidation Gate

Latest debt-sensor status: `advisory_warn` on
`2026-05-20T09:42:15.168Z`.

This package adds no source mechanism. It spends one live job to validate the
existing W5-F convergence mechanism and to unblock a later W4-I retirement/merge
package.

## 11. Output Requirements

After the canary:

- create a W5-G live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.

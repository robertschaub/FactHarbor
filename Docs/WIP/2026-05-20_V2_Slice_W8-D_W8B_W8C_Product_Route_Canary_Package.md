# V2 Slice W8-D W8-B/W8-C Product Route Canary Package

**Status:** Steer-Co-authorized execution package
**Date:** 2026-05-20
**Author:** Captain Deputy / Steer-Co
**Package type:** one-job live canary package
**Implementation baseline:** `9dca1af8`

## 1. Purpose

Run exactly one product-route canary after W8-B (`f468a73d`) and W8-C
(`9dca1af8`) to prove that the runtime product route reaches the internal Alpha
report-result artifact on a real same-ledger job.

W8-D does not add source code. It validates the already committed hidden/internal
report-value path:

```text
W5 -> W5-F -> W6-B -> W6-C2 -> W7-A -> W8-A -> W7-B2 -> W8-B/W8-C
```

## 2. Authority And Budget

Captain explicitly authorized job submission and reset the live-job budget to
`8` on 2026-05-20.

Repo-local machine ledger:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- active tranche after this package commit: `v2-w8d-captain-reset-2026-05-20`
- reset total: `8`
- current remaining before W8-D canary: `8`
- per-canary rule: exactly `1` job is consumed after reviewed package,
  committed source, clean git status, runtime refresh, and runtime commit match.

This package authorizes exactly one W8-D canary, consuming `1` live-job slot if
submitted. No second W8-D canary is authorized.

## 3. Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `pipelineVariant = "claimboundary-v2"`.

## 4. Scope

Allowed:

- commit this package before preflight;
- refresh runtime from committed source including `9dca1af8`;
- run focused W8-B/W8-C route/report-result verifiers and V2 gate validation;
- preflight the W8-B internal route for auth/no-store/missing-ledger shape;
- run exactly one `claimboundary-v2` product-route job;
- inspect public containment;
- inspect authenticated internal no-store W8-B artifact route on the same ledger;
- update live-result docs, tranche ledger, status/backlog, Agent_Outputs, and
  handoff after the canary.

Forbidden:

- no source changes before the canary;
- no second live job;
- no prompt/model/config/schema/UCM/gateway edits or approval flips;
- no new LLM/provider call beyond the already committed hidden W6-C2/W7-B2
  runtime owners reached by the product route;
- no parser execution;
- no report/verdict/warning/confidence public behavior;
- no public API/UI/report/export/compatibility exposure;
- no cache/SR/storage behavior;
- no provider expansion, W2/W3 widening, retries, endpoint migration, ACS/direct
  URL support, V1 work, V1 cleanup, or cutover.

## 5. Preflight Requirements

Before submission:

- this package is committed;
- `git status --short --untracked-files=all` is clean;
- runtime is restarted from the committed package state;
- API/Web runtime commit hash is recorded and maps to `9dca1af8` or this package
  commit when docs-only package changes are included in the runtime working tree;
- focused W8-B/W8-C verifier passes;
- `npm run validate:v2-gates` passes;
- W8-B internal route preflight confirms:
  - unauthenticated request returns `401`;
  - authenticated missing-ledger request returns bounded JSON `404`;
  - authenticated missing-ledger response is `Cache-Control: no-store`.

Recommended verifier set:

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
```

## 6. Pass Criteria

Classify as `PASS_X7_W8_D_INTERNAL_ALPHA_REPORT_RESULT_CANARY` only if all are
true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit is recorded and maps to committed source including W8-B/W8-C;
- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- public result exposes no hidden marker, source text, input text,
  EvidenceItem text, prompt text, snippets, summaries, raw provider payload,
  W8-B route name, hidden ledger id, or internal status;
- same-ledger hidden W8-B route is present and authenticated/no-store;
- W8-B default route projection is text-free and source/evidence/input/prompt
  text-free;
- W8-B artifact has `status =
  internal_alpha_report_result_candidate_created`;
- W8-B artifact has `reportReadiness.reportQualityStatus =
  internal_alpha_review_candidate_not_public_report`;
- W8-B artifact has `w8aMergeTrigger.status = parity_covered`;
- W8-B artifact links to runtime-owned W7-B2 output;
- W8-B cited EvidenceItem refs are present and match the W5 bounded extraction
  EvidenceItem ids by hash/ref projection;
- public cutover remains blocked and compatibility projection remains closed.

## 7. Stop Criteria

Stop and do not spend another live job if:

- budget authority or ledger state cannot be reconciled before submission;
- job uses or falls back to legacy `claimboundary`;
- runtime commit does not include W8-B/W8-C;
- W8-B route preflight fails;
- public/default-admin route leaks hidden markers, source text, input text,
  EvidenceItem text, prompt text, snippets, summaries, raw provider payload,
  internal route names, hidden ledger ids, or internal statuses;
- W8-B artifact is absent, blocked, damaged, or lineage-mismatched;
- W8-B `w8aMergeTrigger.status` is not `parity_covered`;
- W7-B2/W8-B evidence citation lineage is missing or mismatched;
- any verifier or preflight fails.

Every submitted live job consumes one budget slot even if it stops.

## 8. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q5` by validating the first runtime product-route internal Alpha
  report-result candidate.
- `V2-Q8` by rechecking public pre-cutover containment.
- `V2-Q10` by spending one live job only after W8-C convergence addressed the
  immediate W7-A/W8-A retirement pressure.

Direct user/report value:

- None publicly. This is internal Alpha report-value evidence only.

Hidden-only value:

- High. It proves whether W8-B/W8-C are actually reachable through the product
  route and ready for internal comparator review.

Cost/latency impact:

- One live job from the reset `8` job tranche.

Retirement or simplification unlocked:

- If W8-D passes, the next package may move from reachability proof toward
  internal report-quality review and targeted W7-A/W8-A merge planning.

Scorecard risk:

- A failed canary could expose W6-C2/W7-B2 runtime prompt/model quality issues.
  That is useful evidence; do not retry inside W8-D.

## 9. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-016 W7-A contract bridge.
- V2-RL-017 W8-A report stop owner.
- V2-RL-004 hidden observability ledger and artifact routes.

Status changes:

- None before result. A passing canary supports later W7-A/W8-A merge planning
  but does not delete them.

New mechanism owner:

- None. This is execution validation only.

Removal / merge trigger:

- W8-D canary pass becomes evidence for a later W7-A/W8-A merge package.

Debt accepted:

- One live-job spend; no new source mechanism.

## 10. V2 CONSOLIDATION GATE

Gate result: pass.

W8-D adds no hidden mechanism. It validates the current internal report-value
path after W8-C convergence and then stops.

Latest debt-sensor status before this package:

- `advisory_warn` on 2026-05-20 after W8-C.
- V2 source/test/boundary/docs footprints remain above advisory thresholds.

## 11. Output Requirements

After the canary:

- create a W8-D live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.

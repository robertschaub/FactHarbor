# V2 Slice W8-F W8-E Attribution Product-Route Canary Package

**Status:** Steer-Co-authorized execution package
**Date:** 2026-05-20
**Author:** Captain Deputy / Steer-Co
**Package type:** one-job live canary package
**Implementation baseline:** `dfe430b5`

## 1. Purpose

Run exactly one product-route canary after W8-E to use the existing W8-B
hidden/admin-only artifact route as the diagnostic owner for the W8-D stop.

W8-D proved the product route reached W8-B, but it stopped with only the coarse
blocked reason `sufficiency_assessment_not_completed`. W8-E then added
enum-only `upstreamStopAttribution` inside the existing W8-B artifact/projection
so the next product-route observation can identify the first incomplete upstream
owner without adding another route, sink, or repair mechanism.

W8-F does not add source code. It validates the committed W8-E projection on a
real product-route run before any W6-C or downstream repair package is scoped.

## 2. Steer-Co Decision

Question: after W8-E commit `dfe430b5`, should the next package spend one canary
to collect W8-E attribution, or skip directly to W6-C repair?

Consent result: run W8-F first.

Reviewer positions:

- Claude Opus 4.6 Senior Architect / LLM Expert: support W8-F canary.
- GPT technical reviewer: support W8-F canary.

Rationale: W6-C is currently the symptom owner, not the confirmed root cause.
W8-E was built specifically to distinguish W6-C, W7-A/W8-A, W7-B2, and earlier
handoff/evidence stops using existing parent decisions. Skipping the W8-F canary
would make W8-E unused and risk a speculative repair while debt sensors already
warn about V2 footprint and hidden-mechanism pressure.

## 3. Authority And Budget

Captain authorized job submission and set the current live-job budget to `8` on
2026-05-20, with instruction to use it wisely.

Repo-local machine ledger:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- active tranche after this package commit:
  `v2-w8f-captain-reset-2026-05-20`
- reset total: `8`
- current remaining before W8-F canary: `8`
- per-canary rule: exactly `1` job is consumed after reviewed package,
  committed source/docs, clean git status, runtime refresh, runtime commit
  match, route preflight, and verifier pass.

This package authorizes exactly one W8-F canary, consuming `1` live-job slot if
submitted. No second W8-F canary is authorized.

## 4. Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `pipelineVariant = "claimboundary-v2"`.

## 5. Scope

Allowed:

- commit this package before preflight;
- refresh runtime from committed source including W8-E `dfe430b5` or this
  docs-only package commit;
- run focused W8-B/W8-E route/report-result verifiers and V2 gate validation;
- preflight the W8-B internal route for auth/no-store/missing-ledger shape;
- run exactly one `claimboundary-v2` product-route job;
- inspect public containment;
- inspect authenticated internal no-store W8-B artifact route on the same
  ledger;
- record W8-E `upstreamStopAttribution` values;
- update live-result docs, tranche ledger, status/backlog, Agent_Outputs, and
  handoff after the canary.

Forbidden:

- no source changes before the canary;
- no second live job;
- no W6-C repair inside this package;
- no prompt/model/config/schema/UCM/gateway edits or approval flips;
- no new LLM/provider call beyond the already committed hidden runtime owners
  reached by the product route;
- no new route, sink, durable storage, cache IO, Source Reliability, parser,
  provider expansion, W2/W3 widening, retries, endpoint migration, ACS/direct
  URL support, V1 work, V1 cleanup, or cutover;
- no report/verdict/warning/confidence public behavior;
- no public/API/UI/report/export/compatibility exposure;
- no source text, EvidenceItem text, snippets, summaries, provider payloads,
  prompt text, rendered prompt text, hidden ledger ids, or raw internal state in
  public/default-admin/log/error surfaces.

## 6. Preflight Requirements

Before submission:

- this package is committed;
- `git status --short --untracked-files=all` is clean or unrelated changes are
  isolated non-destructively;
- runtime is restarted from the committed package state;
- API/Web runtime commit hash is recorded and maps to `dfe430b5` or this
  docs-only package commit;
- focused W8-B/W8-E verifier passes;
- `npm run validate:v2-gates` passes;
- gate-register self-test passes;
- W8-B internal route preflight confirms:
  - unauthenticated request returns `401`;
  - authenticated missing-ledger request returns bounded JSON `404`;
  - authenticated missing-ledger response is `Cache-Control: no-store`.

Recommended verifier set:

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
git diff --check
```

## 7. Pass Criteria

Classify as `PASS_X7_W8_F_UPSTREAM_STOP_ATTRIBUTION_CANARY` if all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- runtime commit is recorded and maps to committed source including W8-E;
- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- public/default output exposes no hidden marker, source text, input text beyond
  normal job input metadata, EvidenceItem text, prompt text, snippets,
  summaries, raw provider payload, W8-B route name, hidden ledger id, internal
  status, W8-E field names, or hidden artifact projection;
- same-ledger hidden W8-B route is present and authenticated/no-store;
- W8-B default route projection is text-free and source/evidence/input/prompt
  text-free;
- exactly one W8-B artifact exists for the same ledger;
- W8-B artifact includes `upstreamStopAttribution`;
- `upstreamStopAttribution.firstIncompleteStage` is either:
  - `none` when the artifact is a candidate-created result with cited refs; or
  - a non-`none` allowed enum stage with an enum-only or null
    `firstIncompleteReason` when the artifact is blocked/damaged;
- `upstreamStopAttribution.parentStatuses` contains bounded structural summaries
  for W5/W5-F/W6-B/W6-C/W7-A/W8-A/W7-B2 as applicable;
- all attribution redaction flags confirm no source/evidence/input/prompt text
  was returned.

## 8. Stop Criteria

Stop and do not spend another live job if:

- budget authority or ledger state cannot be reconciled before submission;
- job uses or falls back to legacy `claimboundary`;
- runtime commit does not include W8-E;
- W8-B route preflight fails;
- public/default-admin route leaks hidden markers, source text, input text
  beyond normal job input metadata, EvidenceItem text, prompt text, snippets,
  summaries, raw provider payload, internal route names, hidden ledger ids,
  W8-E field names, or internal statuses;
- W8-B artifact is absent or lineage-mismatched;
- `upstreamStopAttribution` is absent, malformed, raw, text-bearing, or
  ambiguous;
- any verifier or preflight fails with unclear root cause.

Every submitted live job consumes one budget slot even if it stops.

## 9. Expected Next Decision

If W8-F passes with decisive attribution:

- first incomplete stage `sufficiency_assessment` -> prepare a narrow W6-C /
  W6-C2 repair package using the observed enum reason;
- first incomplete stage before W6-C -> prepare a repair package for the named
  upstream owner;
- first incomplete stage at W7-A/W8-A/W7-B2 -> prepare a repair package for the
  named boundary/verdict/report bridge owner;
- first incomplete stage `none` with candidate-created result -> move to a
  reviewed internal Alpha report-quality/comparator package.

Do not implement the next repair or report-quality package inside W8-F.

## 10. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q5` by making the product-route internal Alpha report chain
  root-cause-actionable instead of symptom-only.
- `V2-Q8` by rechecking public pre-cutover containment.
- `V2-Q10` by spending one job only after W8-E reduced uncertainty without
  adding another route/sink.

Direct user/report value:

- None publicly. This is internal diagnostic evidence toward report quality.

Hidden-only value:

- High. It determines the next repair owner using the live product route.

Cost/latency impact:

- One live job from the reset `8` job tranche.

## 11. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-004 hidden observability ledger and artifact routes.
- V2-RL-016 W7-A contract bridge.
- V2-RL-017 W8-A report stop owner.

Status changes:

- None before result. A decisive W8-F result should narrow the next owner and
  may support a later W7-A/W8-A merge or repair package.

New mechanism owner:

- None. This is execution validation only.

Removal / merge trigger:

- A decisive attribution result becomes the trigger for a named repair or
  convergence package rather than additional generic diagnostics.

Debt accepted:

- One live-job spend; no new source mechanism.

## 12. V2 CONSOLIDATION GATE

Gate result: pass.

W8-F adds no hidden mechanism. It validates the current W8-E attribution on the
product route and then stops.

Latest debt-sensor status before this package:

- `advisory_warn` on 2026-05-20 after W8-E.
- V2 source/test/boundary/docs footprints remain above advisory thresholds.

## 13. Output Requirements

After the canary:

- create a W8-F live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.

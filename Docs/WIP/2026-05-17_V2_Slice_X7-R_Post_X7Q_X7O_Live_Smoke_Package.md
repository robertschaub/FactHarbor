# V2 Slice X7-R Post-X7-Q X7-O Live-Smoke Package

**Date:** 2026-05-17
**Status:** deputy-approved docs-only execution package; not executable until package commit and pre-run checks pass
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `4bd9dcfa` (`fix: enforce v2 x7q language metadata`)
**Parent packages/results:** X7-P partial live-smoke result, X7-Q approved package, X7-Q implementation.
**Gate type:** one-job post-repair product-route hidden-artifact smoke for direct-text Claim Understanding, X7-J intake, and X7-O Query Planning pre-execution observation.
**Review result:** APPROVE.

## 1. Purpose

X7-P proved the product V2 route reached Claim Understanding, X7-J, and X7-O, but did not pass because X7-O blocked as `language_signal_unavailable`. X7-Q repaired the producer-side ClaimContract language metadata contract.

X7-R authorizes exactly one post-repair rerun of the same Captain-approved direct-text legal-question input to verify that accepted direct-text Claim Understanding now provides concrete language metadata and X7-O reaches structural preconditions without executing Query Planning.

## 2. Authorized Live Input

Use exactly this Captain-defined input:

```text
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?
```

Do not add, paraphrase, translate, normalize, or substitute inputs.

## 3. Approval Requested

Approve one live analysis job after this package is committed and runtime is refreshed on the committed X7-Q implementation.

The run may:

- submit exactly one `claimboundary-v2` direct-text job with the authorized input;
- inspect public job status/result for damaged/precutover public behavior;
- inspect authenticated internal Claim Understanding, X7-J, and X7-O artifact routes for the job ledger;
- record whether X7-O now reaches `structural_prerequisites_observed_not_executed_precutover` with `sourceLanguageSignal: "present"`;
- record job id, git hash, prompt hash, runtime env, route preflight result, hidden artifact outcome, and public non-leak checks.

This package does not authorize:

- Query Planning runtime execution, Query Planning prompt rendering, Query Planning prompt-packet execution, Query Planning model/provider call, query generation, source/provider/search/fetch/parser execution, source material, EvidenceCorpus, EvidenceItems, Source Reliability, cache IO, ACS/direct URL execution, reports/verdict/confidence/evidence changes, public cutover, extra live jobs, validation batches, prompt/config/model/schema edits, V1 work, or V1 cleanup.

The already-approved hidden Claim Understanding runtime dispatch and its model/provider call are allowed only for this one direct-text product-route job. No downstream model/provider authority is added.

## 4. Pre-Run Requirements

Before submitting the job:

1. Commit this docs-only package by exact path. The execution commit should be the docs-only X7-R package commit, descended from implementation commit `4bd9dcfa` or a later reviewed X7-Q implementation commit. Record both the X7-Q implementation commit and the X7-R package execution commit.
2. Before committing the package, run:
   ```powershell
   npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
   npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding
   npm -w apps/web run test -- test/unit/lib/analyzer-v2
   npm -w apps/web run build
   npm run validate:v2-gates
   node scripts/validate-v2-gate-register.mjs --self-test
   npm run index
   git diff --check
   git diff --check --cached
   git diff --name-only --cached
   ```
3. The docs-only package commit must stage only:
   - `Docs/WIP/2026-05-17_V2_Slice_X7-R_Post_X7Q_X7O_Live_Smoke_Package.md`
   - `Docs/STATUS/Current_Status.md`
   - `Docs/STATUS/Backlog.md`
   - `Docs/AGENTS/Agent_Outputs.md`
   - one X7-R package handoff under `Docs/AGENTS/Handoffs/`
   - `Docs/AGENTS/index/handoff-index.json`
4. Confirm no uncommitted runtime-affecting files under `apps/web/prompts`, `apps/web/src`, `apps/web/test`, `apps/api`, `package.json`, or `package-lock.json`.
5. Capture the V2 Claim Understanding prompt hash or reseed/file-load state before submission.
6. Refresh/restart the API and web runtime.
7. Confirm the web process has:
   - `FH_ANALYZER_V2_SHELL=enabled`
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
8. Confirm API and web health endpoints respond.
9. Confirm internal artifact routes are authenticated:
   - unauthenticated request returns `401`;
   - unknown authenticated ledger returns `404` or an empty response according to the route contract.
10. Confirm X7-J and X7-O internal artifact routes include no-store headers. The Claim Understanding artifact route has a known bounded no-store exception from X7-P and remains acceptable for X7-R only if it is admin-gated, returns no public pointer, and is recorded as a carried route-hardening follow-up.

Unrelated docs/agent-governance dirt in the worktree must be recorded if present, but it does not block X7-R if runtime-affecting source paths are clean and the runtime is refreshed from the committed X7-Q implementation.

## 5. Pass Criteria

X7-R passes only if all of the following are true:

- job reaches terminal `SUCCEEDED`;
- job provenance records `pipelineVariant=claimboundary-v2`;
- first preparation event is V2, not V1;
- created/executed git hash points to the docs-only X7-R execution package commit descended from the committed X7-Q implementation;
- public result remains V2 damaged/precutover (`4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`);
- public result and report/export surfaces expose no hidden artifact markers, ledgers, prompt text, provider telemetry, ClaimContract internals, X7-J internals, or X7-O internals;
- Claim Understanding artifact is present, internal/admin-only, has no public pointer exposure, and is accepted; if its route still lacks no-store headers, the carried bounded CU route-hardening follow-up is recorded and does not fail X7-R;
- accepted Claim Understanding artifact does not carry blank or `und` direct-input language metadata;
- X7-J artifact is present, internal/admin-only, no-store, and `intake_ready`;
- X7-O artifact is present, internal/admin-only, no-store, and has:
  - `preexecutionObservation.status = structural_prerequisites_observed_not_executed_precutover`
  - `blockedReason = null`
  - `sourceLanguageSignal = present`
  - every execution flag `false`
  - no source/provider/parser/cache/SR/report/verdict execution.

## 6. Failure And Stop Rules

Stop after one job. Do not rerun inside X7-R.

Classify the result as:

- `PASS_X7_R_POST_X7Q_X7O_OBSERVED` if every pass criterion is met.
- `PARTIAL_X7_R_<reason>` if product-route artifacts are useful but one formal pass condition fails.
- `FAIL_X7_R_<reason>` if the route, job, provenance, hidden artifact, or public non-leak checks fail materially.

If the job fails because of language metadata again, do not patch X7-O. Diagnose whether Claim Understanding output, runtime prompt loading, or stale runtime caused the regression.

## 7. Review Questions

Architect:

- Is this the correct next execution gate after X7-Q, and is it still non-executing for Query Planning/source?

Security/runtime:

- Are preflight, public non-leak, route-auth, and one-job stop rules sufficient?

Code/package:

- Is the package narrow enough to execute without further implementation?

LLM/semantic:

- Is the same legal-question direct-text input suitable for proving the language-metadata repair without judging report/legal quality?

## 8. Reviewer Decisions

Execution is forbidden unless all review slots below are `APPROVE`.

| Role | Reviewer | Date | Decision | Required Changes / Notes |
|---|---|---:|---|---|
| Architect | Kuhn | 2026-05-17 | APPROVE | Correct next gate after X7-Q; one-job product-route smoke only; Query Planning/source execution remains blocked. |
| Security/runtime | Descartes | 2026-05-17 | APPROVE | Provider authority is limited to approved hidden Claim Understanding dispatch; CU no-store exception is carried; X7-J/X7-O no-store remains mandatory. |
| Code/package | Parfit | 2026-05-17 | APPROVE | Provenance, verifier/staged-path controls, prompt hash capture, and scoped dirty-worktree handling are sufficient. |
| LLM/semantic | Galileo | 2026-05-17 | APPROVE | Same legal-question input is suitable as opaque runtime payload for language-metadata repair proof, not legal/report quality. |

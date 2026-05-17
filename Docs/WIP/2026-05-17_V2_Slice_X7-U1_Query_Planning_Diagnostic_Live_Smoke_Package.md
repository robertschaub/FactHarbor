# V2 Slice X7-U1 Query Planning Diagnostic Live-Smoke Package

**Date:** 2026-05-17
**Status:** Captain-authorized execution package; docs-only
**Owner:** Lead Developer / Captain Deputy
**Source prerequisite:** X7-U0 diagnostics implementation commit `576ecfec`
**Trigger:** X7-T-S `PARTIAL_X7_T_S_QUERY_PLANNING_SCHEMA_VALIDATION_FAILED`

## 1. Purpose

X7-U0 added bounded, sanitized, admin-only `adapterAttemptDiagnostics` to the hidden X7-S Query Planning runtime artifact. X7-U1 authorizes one committed-runtime diagnostic canary to capture the exact adapter/schema failure path before selecting a repair layer.

This package is not a prompt repair, schema repair, provider repair, report-quality check, source-execution check, or public-readiness gate.

## 2. Authorization And Budget

Captain authorized prompt implementation and live jobs in the current 2026-05-17 execution thread with a maximum of 8 live jobs. X7-U1 consumes at most one live job from that budget.

No replacement, retry, English canary, validation batch, or extra diagnostic input is authorized inside X7-U1. If the job reaches Query Planning and returns damaged output, record the diagnostic details and stop. If it unexpectedly returns accepted Query Planning output, record that result and stop.

## 3. Authorized Input

Use this exact Captain-defined input:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

Do not paraphrase, translate, normalize, shorten, extend, or substitute it. Treat it as an opaque runtime payload; do not evaluate truth, evidence quality, report quality, or verdict direction.

## 4. Scope Authorized

X7-U1 authorizes only:

- the already-approved product V2 direct-text route;
- hidden Claim Understanding runtime/model execution;
- hidden X7-J intake artifact recording/inspection;
- hidden X7-O pre-execution observation artifact recording/inspection;
- hidden X7-S Query Planning runtime/model execution;
- admin-only inspection of the new X7-U0 `adapterAttemptDiagnostics`;
- public non-leak inspection.

X7-U1 does not authorize:

- prompt edits;
- config/model/schema/provider-factory edits;
- retries, model escalation, or repair attempts;
- source/search/fetch/parser/SR/cache IO;
- durable hidden artifact storage;
- EvidenceCorpus, EvidenceItems, sufficiency, warnings, reports, verdicts, confidence, or public result generation;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 5. Runtime Gates Required

Before submission, the actual web/runner process must have exact gate values:

```text
FH_ANALYZER_V2_SHELL=enabled
FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text
FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text
```

Use the corrected PowerShell launcher form with single-quoted assignment values. A disposable non-secret probe must prove the launcher form sets all three gate values exactly before runtime refresh. Record only boolean/exact-match summaries; do not record raw command lines, full environment dumps, admin keys, runner keys, provider keys, or search keys.

## 6. Required Preflight

Before the live job:

1. Commit this package and related status/handoff/index files.
2. Verify a clean worktree.
3. Run focused safe verifiers:
   - `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
   - `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2`
   - `npm -w apps/web run build`
   - `npm run validate:v2-gates`
   - `node scripts/validate-v2-gate-register.mjs --self-test`
   - `git diff --check`
4. Stop stale API/web port listeners and stale X7 runtime process trees.
5. Refresh API and web/runner runtime from the committed package revision.
6. Prove actual port-3000 process ancestry includes all three approved gate assignments.
7. Prove all four hidden artifact routes reject unauthenticated and wrong-key requests and use `Cache-Control: no-store`.
8. Run a 60-second clean/idle worktree checkpoint.

## 7. Submission And Inspection

Submit exactly one job through the direct API with valid admin auth:

```json
{
  "inputType": "text",
  "inputValue": "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
  "pipelineVariant": "claimboundary-v2"
}
```

The first preparation event must be:

```text
Preparing input (pipeline: claimboundary-v2)
```

After terminal status, inspect hidden artifacts using ledger id:

```text
<jobId>:precutover-observability
```

Public output must stay `_schemaVersion=4.0.0-cb-precutover`, `meta.publicCutoverStatus=blocked_precutover`, damaged/precutover, and free of hidden artifact markers.

## 8. Classification

Classify as `PASS_X7_U1_DIAGNOSTIC_CAPTURED` if:

- the job first prepares `pipeline: claimboundary-v2`;
- terminal status is `SUCCEEDED`;
- public output remains blocked/precutover and leaks no hidden markers;
- Claim Understanding artifact is present and accepted;
- X7-J artifact is present and `intake_ready`;
- X7-O artifact is present and `structural_prerequisites_observed_not_executed_precutover`;
- X7-S runtime artifact is present;
- `adapterAttemptDiagnostics` is present, bounded, sanitized, and sufficient to identify the Query Planning failure path or acceptance path;
- source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence execution flags remain false/off.

Classify as `PARTIAL_X7_U1_ACCEPTED_QUERY_PLANNING` if Query Planning unexpectedly returns accepted schema output; record query-entry counts and source-acquisition handoff, then stop.

Classify as `FAIL_X7_U1_<reason>` if the job fails before V2/Query Planning, prepares V1, leaks hidden markers, lacks hidden artifacts, lacks diagnostics, or triggers forbidden execution.

## 9. Completion Requirements

After the job, create a closeout document recording:

- package/runtime commit;
- clean worktree and idle checkpoints;
- runtime refresh method and boolean gate proof;
- route auth/no-store preflight;
- job id and terminal status;
- public non-leak result;
- Claim Understanding, X7-J, X7-O, and X7-S artifact summaries;
- sanitized `adapterAttemptDiagnostics` summary;
- classification and next repair recommendation.

Do not patch prompts, schemas, providers, config, or model policy until the X7-U1 result is recorded and reviewed or debated.

# V2 Slice X7-T-S Final Launcher Exact-Gate Smoke Addendum

**Date:** 2026-05-17
**Status:** deputy-team approved final setup-recovery addendum; docs-only
**Owner:** Lead Developer / Captain Deputy
**Prior gates:** X7-T, X7-T-R

## 1. Decision

X7-T and X7-T-R are closed as setup/precondition failures. Neither produced a Query Planning runtime sample.

Recorded failed submissions:

| Gate | Job | Input | Result | Classification |
|---|---|---|---|---|
| X7-T | `878828510c034cf7a72af502c38e48bd` | German canary | `FAILED` before V2 preparation | `PRECONDITION_FAIL_X7_T_RUNTIME_GATE_NOT_REFRESHED` |
| X7-T-R | `c800a7e695114765bc27bff79be10543` | German canary | `FAILED` before V2 preparation | `PRECONDITION_FAIL_X7_T_R_LAUNCHER_QUOTING_V2_SHELL_DISABLED` |

Both jobs failed closed with `Analyzer execution blocked for requested pipeline claimboundary-v2: v2-shell-disabled`.

X7-T-S authorizes exactly one final setup-recovery live submission for the same German canary only:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

The English canary is not authorized by X7-T-S. If the German X7-T-S job passes, a separate reviewed package may decide whether the English sample is still needed.

## 2. Cause

The second failure was caused by Windows launcher quoting, not by V2 source behavior.

The bad launcher form used escaped double quotes in a PowerShell command string. A disposable non-secret probe showed this form did not set exact gate values for the child process.

The corrected launcher form uses PowerShell single-quoted assignment values, which the disposable probe showed sets all three gate values exactly:

- `FH_ANALYZER_V2_SHELL=enabled`
- `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
- `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`

Do not record raw command lines or env dumps in result documents. Record only boolean/exact-match summaries.

## 3. Containment

The failed X7-T and X7-T-R jobs did not execute:

- V2 preparation
- Claim Understanding runtime
- Query Planning runtime
- prompt/model call for Query Planning
- source/search/fetch/parser/Source Reliability/cache IO
- EvidenceCorpus, EvidenceItems, sufficiency, warning, report, verdict, confidence, or public result generation
- ACS/direct URL execution
- V1 fallback execution

The explicit V2 route-selection guard continued to fail closed instead of falling back to V1.

## 4. Deputy Review

Architect, Security/runtime, Code/package, and LLM/semantic reviewers agreed that one final narrow addendum is acceptable because the issue is a diagnosed setup/precondition failure and no runtime sample has been produced.

The reconciled decision adopts the stricter Security/runtime limit:

- docs-only package;
- exactly one final German submission;
- no English submission in this package;
- no further setup-recovery replacement package if this final job again fails before V2 preparation.

## 5. Required Preflight

Before the X7-T-S job:

1. Commit this addendum and related status/handoff/index files.
2. Verify the worktree is clean.
3. Run a disposable non-secret launcher probe proving the corrected launcher form sets all three gate values exactly.
4. Stop stale API/web port listeners and stale X7 runtime process trees.
5. Refresh the runtime from the committed revision using the corrected launcher form.
6. Prove the actual port-3000 serving process ancestry includes all three approved gate assignments.
7. Record only booleans/redacted proof, never raw process command lines, env dumps, admin keys, runner keys, provider keys, or search keys.
8. Re-run the four hidden artifact route checks:
   - non-empty admin key in the submission shell;
   - unauthenticated `401`;
   - wrong-key `401`;
   - authenticated unknown-ledger bounded internal-only response;
   - authenticated `Cache-Control: no-store`.
9. Run the clean/idle checkpoint.

## 6. Stop Conditions

Stop the live-smoke path and do not submit another setup-recovery job if:

- disposable exact-gate probe fails;
- actual port-3000 process ancestry lacks any gate;
- route preflight fails;
- clean/idle checkpoint is dirty;
- the X7-T-S job fails before V2 preparation;
- the X7-T-S job prepares `pipeline: claimboundary`;
- public output leaks hidden markers;
- source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence behavior appears;
- prompt/config/model/schema/source/test/script changes seem necessary.

If the X7-T-S job reaches V2/Query Planning and then returns damaged, invalid, or failed runtime output, count it as the runtime sample result and do not replace it inside X7-T-S.

## 7. Non-Authorization

X7-T-S does not authorize:

- the English canary;
- additional live submissions;
- source/search/fetch/parser/Source Reliability/cache IO;
- durable artifact storage;
- EvidenceCorpus, EvidenceItems, sufficiency, warning, report, verdict, confidence, or public result generation;
- prompt/config/model/schema/source/test/script edits;
- product/public/API/UI/report/export exposure beyond the already reviewed hidden routes;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 8. Success Classification

Classify as `PASS_X7_T_S_GERMAN_QUERY_PLANNING_RUNTIME_SMOKE` only if the single German job:

- first prepares `pipeline: claimboundary-v2`;
- reaches `SUCCEEDED`;
- records accepted hidden Claim Understanding, X7-J intake, X7-O observation, and X7-S Query Planning runtime artifacts;
- records Query Planning query entries as bounded admin-only data;
- keeps Source Acquisition handoff `ready_not_executable`;
- has no source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence execution;
- keeps public output pre-cutover/damaged and free of hidden markers.

Classify all other terminal outcomes as `FAIL_X7_T_S_<reason>` or `PARTIAL_X7_T_S_<reason>` and stop.

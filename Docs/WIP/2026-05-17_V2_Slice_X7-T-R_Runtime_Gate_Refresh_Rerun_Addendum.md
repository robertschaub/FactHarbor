# V2 Slice X7-T-R Runtime Gate Refresh Rerun Addendum

**Date:** 2026-05-17
**Status:** deputy-team approved rerun addendum; docs-only
**Owner:** Lead Developer / Captain Deputy
**Source gate:** `Docs/WIP/2026-05-17_V2_Slice_X7-T_Query_Planning_Runtime_Live_Smoke_Package.md`

## 1. Decision

X7-T attempted its first live submission, but the job did not reach V2 shell execution.

- Job: `878828510c034cf7a72af502c38e48bd`
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- Result: `FAILED`
- Failure: `Analyzer execution blocked for requested pipeline claimboundary-v2: v2-shell-disabled`
- Classification: `PRECONDITION_FAIL_X7_T_RUNTIME_GATE_NOT_REFRESHED`

The failed submission is an operational/runtime-refresh failure, not a Query Planning runtime sample. It consumed one operational live-job submission under the Captain's current max-8 budget, but it produced no semantic/runtime evidence for X7-T.

## 2. Cause

The local Windows runtime refresh command used PowerShell env assignments inside a double-quoted command string. PowerShell interpolated those `$env:` assignments before `Start-Process`, so the actual Next.js process on port 3000 did not inherit:

- `FH_ANALYZER_V2_SHELL=enabled`
- `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
- `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`

The route-selection repair worked as intended: the explicit `claimboundary-v2` request failed closed instead of falling back to V1.

## 3. Containment

The failed job stopped before the V2 runner preparation event. It did not execute:

- Claim Understanding runtime
- Query Planning runtime
- prompt/model call for Query Planning
- source/search/fetch/parser/Source Reliability/cache IO
- EvidenceCorpus, EvidenceItems, sufficiency, warning, report, verdict, confidence, or public result generation
- ACS/direct URL execution
- V1 fallback execution

No hidden artifact leak or public cutover behavior was observed or authorized by this failure.

## 4. Deputy Review

The deputy review team reached consensus:

- Architect: stop X7-T as failed/precondition-blocked; do not silently continue under X7-T.
- Security/runtime: require a committed narrow rerun addendum with fresh process-gate proof.
- Code/package: use a docs-only X7-T-R addendum; do not weaken the no-replacement rule.
- LLM/semantic: the failed job is not a semantic/runtime sample because the test subject was never reached.

Consensus outcome: preserve X7-T package discipline, record the failed submission, and authorize a bounded X7-T-R rerun only after this addendum is committed and the actual port-3000 process ancestry proves the three approved non-secret runtime gates.

## 5. Rerun Scope

X7-T-R authorizes only the original two X7-T semantic/runtime samples, using the same exact Captain-defined opaque direct-text inputs:

1. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
2. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Execution order:

1. Submit the German input first.
2. Submit the English input only if the German corrected rerun passes the X7-T pass criteria.
3. Do not submit substitute inputs.
4. Do not submit additional replacement jobs under X7-T-R.

Budget accounting:

- X7-T failed precondition submission: 1 operational live-job submission consumed.
- X7-T-R maximum: 2 further operational submissions.
- X7-T/X7-T-R combined maximum: 3 operational submissions.
- Captain's current max-8 live-job ceiling remains binding.

## 6. Required Fresh Preflight

Before any X7-T-R submission:

1. Commit this addendum and related status/handoff/index files.
2. Refresh the local runtime from the committed revision.
3. Prove the actual port-3000 process ancestry includes the three approved non-secret V2 gate assignments:
   - `FH_ANALYZER_V2_SHELL=enabled`
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
   - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
4. Record only boolean/redacted gate evidence. Do not record raw process command lines, env dumps, `FH_ADMIN_KEY`, `FH_INTERNAL_RUNNER_KEY`, provider keys, or search keys.
5. Re-run the hidden artifact route preflight from X7-T:
   - non-empty `FH_ADMIN_KEY` in the submission shell;
   - unauthenticated `401` for all four hidden routes;
   - wrong-key `401` for all four hidden routes;
   - authenticated unknown-ledger bounded internal-only response;
   - `Cache-Control: no-store` for authenticated responses.
6. Run the clean/idle checkpoint from X7-T.

## 7. Stop Conditions

Stop without further submissions if any of these occurs:

- the actual port-3000 process ancestry does not prove all three V2 gates;
- any hidden artifact route fails the auth/no-store/internal-only preflight;
- git status is dirty before or after the idle checkpoint;
- the German corrected rerun does not first prepare `pipeline: claimboundary-v2`;
- the German corrected rerun reaches terminal failure after entering V2 execution;
- public output leaks hidden artifact markers;
- source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence behavior appears;
- any prompt/config/model/schema/source code change seems necessary.

## 8. Non-Authorization

X7-T-R does not authorize:

- source/search/fetch/parser/Source Reliability/cache IO;
- durable artifact storage;
- EvidenceCorpus, EvidenceItems, sufficiency, warning, report, verdict, confidence, or public result generation;
- prompt/config/model/schema edits;
- product/public/API/UI/report/export exposure beyond the already reviewed hidden routes;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 9. Success Classification

Classify the rerun as `PASS_X7_T_R_QUERY_PLANNING_RUNTIME_SMOKE` only if both corrected submissions meet the original X7-T pass criteria.

If the German corrected rerun passes but the English job fails without public leak or forbidden source/downstream behavior, classify as `PARTIAL_X7_T_R_<reason>` and stop.

If the German corrected rerun fails, classify as `FAIL_X7_T_R_<reason>` and stop.

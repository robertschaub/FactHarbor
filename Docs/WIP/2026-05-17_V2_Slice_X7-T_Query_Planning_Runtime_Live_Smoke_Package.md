# V2 Slice X7-T Query Planning Runtime Live-Smoke Package

**Date:** 2026-05-17
**Status:** reviewer-approved execution package; live jobs allowed only after package commit, clean runtime refresh, admin-route preflight, and pre-run verifiers
**Owner role:** Lead Developer / Captain Deputy
**Baseline:** `66624496` (`feat: implement v2 x7-s hidden query planning execution`)
**Parent packages/results:** X3-B prompt metadata implementation, X7-R accepted X7-O observation, X7-S hidden Query Planning execution implementation.
**Gate type:** bounded product-route live smoke for hidden Query Planning runtime execution and admin-only artifact inspection.

## 1. Purpose

X7-S implemented hidden product-internal Query Planning execution, but X7-S itself did not authorize live jobs. X7-T is the separate execution package that verifies the X7-S path in the real local product runner.

The live-smoke objective is narrow:

- accepted direct-text Claim Understanding still reaches the product V2 route;
- X7-J Evidence Lifecycle intake is still `intake_ready`;
- X7-O Query Planning pre-execution observation still reaches `structural_prerequisites_observed_not_executed_precutover`;
- X7-S Query Planning runtime is invoked only when the separate Query Planning activation gate is open;
- the internal runtime artifact is admin-only, no-store, bounded, and non-public;
- public V2 output remains damaged/precutover and leaks no hidden markers;
- Query Planning produces only a non-executable source-acquisition handoff.

X7-T is not an evidence, verdict, report, source-quality, legal-quality, truth-quality, public-readiness, cost-baseline, or source-execution gate.

## 2. Authorization And Budget

Captain authorized prompt implementation and live jobs in the current 2026-05-17 execution thread, with a ceiling of 8 live jobs. Prior carried governance also recorded an 8-job budget; X7-T uses the current authorization as the active approval pointer.

This package deliberately uses only up to 2 primary live jobs:

- one German direct-text input;
- one English direct-text input.

The remaining live-job budget is not consumed by this package. Do not use it inside X7-T for retries or extra inputs. If X7-T exposes a repair need, draft a follow-up package instead of stacking broad changes.

X7-T does not include new prompt implementation. X3-B already aligned Query Planning prompt metadata. If X7-T reveals a prompt/schema problem, the next action is a separate reviewed prompt/source repair package using the Captain's prompt implementation authorization and LLM Expert review.

## 3. Authorized Inputs

Use only these exact Captain-defined inputs.

### X7-T-1 German Direct Text

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

### X7-T-2 English Direct Text

```text
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?
```

Do not paraphrase, translate, normalize, shorten, extend, or substitute these inputs.

For X7-T, the strings are opaque runtime payloads. Do not evaluate truth, legal merits, fairness, source sufficiency, report quality, verdict direction, or confidence.

## 4. Scope Authorized

This package authorizes only:

- the already-approved hidden direct-text Claim Understanding runtime/model call;
- product V2 runner execution for the two exact direct-text jobs;
- X7-J internal intake artifact recording/inspection;
- X7-O internal Query Planning pre-execution observation artifact recording/inspection;
- X7-S internal Query Planning runtime execution through the reviewed provider factory;
- one Query Planning model call per job when X7-S activation opens and prerequisites are met;
- admin-only inspection of Claim Understanding, X7-J, X7-O, and X7-S runtime artifact ledgers;
- public non-leak inspection.

This package does not authorize:

- source-provider search, web search, fetch, content dereference, parser, or network source execution;
- Source Reliability import/call/cache/admin integration;
- cache reads, cache writes, durable Query Planning artifact storage, or database writes for hidden runtime artifacts;
- prompt text edits, prompt profile/default JSON/config changes, schema changes, model/cache/gateway approval flips, or UCM edits;
- deterministic query-quality, language-quality, source-ranking, translation, keyword-expansion, or semantic validators;
- source material, parsed material, EvidenceCorpus, EvidenceItems, extraction, applicability, sufficiency, warnings, report text, verdicts, confidence, or public result changes;
- ACS prepared-snapshot runtime, direct URL runtime, validation batches, public cutover, V1 reuse, V1 work, or V1 cleanup.

## 5. Runtime Gates Required

Before live submission, the actual web/runner process must have:

```text
FH_ANALYZER_V2_SHELL=enabled
FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text
FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text
```

`FH_ANALYZER_PIPELINE=v2-precutover` may be recorded if present, but prefer `FH_ANALYZER_V2_SHELL=enabled` because it is narrower.

Env flags alone are not sufficient authority. Query Planning execution must still require:

- requested job variant `claimboundary-v2`;
- accepted Claim Understanding handoff;
- X7-J `intake_ready`;
- X7-O `structural_prerequisites_observed_not_executed_precutover`;
- X7-S activation snapshot open and matching its source package pointer;
- provider runtime config snapshot validation;
- existing gateway/model/cache policy checks;
- hidden artifact public pointer exposure forbidden.

## 6. File Envelope

X7-T package preparation is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-T_Query_Planning_Runtime_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-T package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, model, schema, test, API/UI, package, or script files may be changed for the X7-T package commit. If a source or prompt fix is needed, stop the live-smoke path and create a separate reviewed package.

## 7. Package Verifiers Before Commit

Run before committing the docs-only package:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Stage only the exact section 6 envelope by explicit path. After staging, run:

```powershell
git diff --cached --check
git diff --cached --name-only
```

Expected post-commit state before runtime work: clean worktree.

## 8. Runtime Verifiers Before Live Jobs

After the package commit and before any job submission:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/execution-selection.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/run-context.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.test.ts test/unit/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Do not run expensive validation suites.

Immediately before the first submission, perform a clean/idle checkpoint:

```powershell
$beforeIdle = git status --short --untracked-files=all
if ($beforeIdle) { throw "X7-T pre-submission worktree is dirty before idle checkpoint" }
Start-Sleep -Seconds 60
$afterIdle = git status --short --untracked-files=all
if ($afterIdle) { throw "X7-T pre-submission worktree became dirty during idle checkpoint" }
```

## 9. Runtime Refresh And Gate Proof

After package commit, refresh the API and web/runner runtime from the committed revision. Record:

- package revision;
- X7-S implementation revision;
- restart method and time;
- exact runtime gate values in the actual web/runner process as boolean/redacted evidence only;
- `claimboundary-v2.prompt.md` SHA-256 or reseed state.

Preferred process gate proof. Do not commit raw process command lines or raw environment values to the closeout. In particular, never record `FH_ADMIN_KEY`, `FH_INTERNAL_RUNNER_KEY`, provider API keys, search API keys, or any other secret value. Record only the boolean gate proof below and, if needed, manually redacted command-line excerpts that show non-secret V2 gate names/values.

```powershell
$candidateProcesses = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match "node|npm|powershell|pwsh|cmd" -and $_.CommandLine -match "next|apps/web|npm run dev|FH_ANALYZER_V2" } |
  Select-Object ProcessId, Name, CommandLine
$processGateText = ($candidateProcesses | Format-List | Out-String)
$claimUnderstandingGatePresent = $processGateText -match "FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text"
$queryPlanningGatePresent = $processGateText -match "FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text"
$v2ShellGatePresent = $processGateText -match "FH_ANALYZER_V2_SHELL=enabled"
$v2PrecutoverGatePresent = $processGateText -match "FH_ANALYZER_PIPELINE=v2-precutover"
if (-not $claimUnderstandingGatePresent) {
  throw "Actual web/runner process gate proof is missing FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text"
}
if (-not $queryPlanningGatePresent) {
  throw "Actual web/runner process gate proof is missing FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text"
}
if (-not $v2ShellGatePresent -and -not $v2PrecutoverGatePresent) {
  throw "Actual web/runner process gate proof is missing FH_ANALYZER_V2_SHELL=enabled or FH_ANALYZER_PIPELINE=v2-precutover"
}
[pscustomobject]@{
  claimUnderstandingGatePresent = $claimUnderstandingGatePresent
  queryPlanningGatePresent = $queryPlanningGatePresent
  v2ShellGatePresent = $v2ShellGatePresent
  v2PrecutoverGatePresent = $v2PrecutoverGatePresent
}
```

If process command lines cannot prove the gates because of the startup method, record the startup command and use a direct preflight job only after reviewers accept the alternative proof. Do not infer gate values from the parent shell alone.

## 10. Admin Route Preflight

Before live jobs, require a configured non-empty admin key and prove all four hidden artifact routes are protected:

- Claim Understanding runtime artifacts;
- X7-J Evidence Lifecycle intake artifacts;
- X7-O Query Planning pre-execution observation artifacts;
- X7-S Query Planning runtime artifacts.

`FH_ADMIN_KEY` must be non-empty in the route-preflight/submission shell. If it is missing, stop before live jobs; do not rely on development-mode permissive admin behavior. Unauthenticated requests and wrong-key requests must return `401` for all four hidden artifact routes.

Authenticated unknown-ledger requests must remain bounded and internal-only:

- Claim Understanding route: `200` with `artifactCount: 0`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`, and no-store;
- X7-J route: `404`, no-store, internal-only;
- X7-O route: `404`, no-store, internal-only;
- X7-S runtime route: `404`, no-store, internal-only.

If any route is unavailable, publicly readable, accepts a wrong key, lacks no-store on non-success where required, or echoes lookup keys in errors, stop before live jobs.

## 11. Submission Plan

Submit at most two jobs sequentially, not in parallel.

Request body:

```powershell
$headers = @{ "X-Admin-Key" = $env:FH_ADMIN_KEY }
$body = @{
  inputType = "text"
  inputValue = "<exact authorized input>"
  pipelineVariant = "claimboundary-v2"
} | ConvertTo-Json
$job = Invoke-RestMethod -Uri "http://localhost:5000/v1/analyze" -Method Post -Headers $headers -Body $body -ContentType "application/json"
$jobId = $job.jobId
```

This is an admin-bypass direct API submission. Do not include an invite code when `X-Admin-Key` is valid. If the endpoint still requires an invite code, treat that as an admin-auth/runtime-preflight failure and stop before further submissions.

Poll until `SUCCEEDED`, `FAILED`, or `CANCELLED`. Inspect events early. The first runner preparation event must show:

```text
Preparing input (pipeline: claimboundary-v2)
```

If it shows `pipeline: claimboundary`, cancel immediately and classify as hard fail.

After each terminal job, inspect hidden artifacts using:

```text
<jobId>:precutover-observability
```

## 12. Public Non-Leak Scan

Fetch the public job response without admin credentials and scan it for hidden markers. Public output must remain damaged/precutover.

Forbidden literal markers include:

```text
precutover-observability
runtime_dispatch_completed
contract_observed_preexecution
intake_ready
structural_prerequisites_observed_not_executed_precutover
v2.evidence-query-planning.runtime-artifact.x7s
evidence_query_planning
sourceLanguagePolicy
providerTelemetry
activationSnapshotHash
renderedPromptHash
queryEntries
ready_not_executable
internal_admin_only
publicPointerExposure
```

Non-null hidden fields such as `artifactId`, `ledgerId`, `activationSnapshotHash`, `runtimeConfigHash`, `renderedPromptHash`, `providerTelemetry`, `claimContract`, `evidenceLifecycleIntake`, `queryPlanningPreexecutionObservation`, and `queryPlanningRuntimeArtifact` must not appear in public compatibility output.

## 13. Pass Criteria

Classify X7-T as `PASS_X7_T_QUERY_PLANNING_RUNTIME_SMOKE` only if both submitted jobs meet all criteria below.

Per job:

- input exactly matches one authorized section 3 string;
- status reaches `SUCCEEDED`;
- stored variant is `claimboundary-v2`;
- execution hash points to the committed X7-T package/runtime revision and has no dirty suffix;
- pre-submission, idle, and post-inspection worktree status are clean;
- first runner preparation event shows `pipeline: claimboundary-v2`;
- no runner event or log evidence shows V1 search/fetch/XLSX parsing/Source Reliability/clustering/verdict debate work;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`;
- public result remains `meta.publicCutoverStatus: blocked_precutover`;
- public output is damaged/blocked and is not interpreted as a valid V2 answer;
- public output exposes no hidden markers or hidden artifact fields;
- unauthenticated access to all four hidden artifact routes returns `401`;
- authenticated hidden artifact route responses for the real job ledger show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- Claim Understanding, X7-J, X7-O, and X7-S success responses include `Cache-Control: no-store`;
- Claim Understanding artifact is present and accepted;
- X7-J artifact is present and `intake_ready`;
- X7-O artifact is present and `structural_prerequisites_observed_not_executed_precutover`;
- X7-S runtime artifact is present with `artifactVersion: v2.evidence-query-planning.runtime-artifact.x7s`;
- X7-S artifact has `activation.status: enabled_hidden_direct_text`;
- X7-S artifact has `runtime.status: completed`;
- X7-S artifact has `schemaOutcome.status: accepted`;
- X7-S artifact has `queryEntryCount >= 1` and `queryEntryCount <= 6`;
- X7-S artifact records `sourceLanguagePolicy` as non-null model output;
- X7-S artifact records prompt hashes, not prompt text;
- X7-S artifact records provider/model ids and provider telemetry without raw SDK errors or secrets;
- X7-S artifact cache policy has `canRead: false`, `canWrite: false`, and `reason: no_store_runtime_dispatch_safety`;
- X7-S artifact has `sourceAcquisitionHandoff.status: ready_not_executable` and `executionScope: not_executable`;
- X7-S product execution flags show `queryPlanningRuntimeInvoked: true`, `promptLoaded: true`, `promptRendered: true`, `modelCalled: true`, `providerCallbackCreated: true`, and all source/parser/evidence/report/verdict/public flags false.

If only one job passes and the other fails without public leak/source execution, classify as `PARTIAL_X7_T_<reason>`. Do not submit replacement jobs inside X7-T.

If Query Planning runtime is invoked but the model output is damaged/invalid, classify as `PARTIAL_X7_T_QUERY_PLANNING_DAMAGED` and draft a separate diagnosis/repair package. Do not patch prompts or schemas inside this execution package.

## 14. Hard Fail Criteria

Stop and record failure if any of these occur:

- package, runtime, idle, or post-inspection worktree is dirty at a required checkpoint;
- any input outside section 3 is submitted;
- more than two jobs are submitted under X7-T;
- runtime is stale or not refreshed from the committed package revision;
- runtime gate proof is missing;
- job execution hash is missing, stale, or dirty;
- runner preparation event shows `pipeline: claimboundary`;
- V1 search/fetch/XLSX parsing/Source Reliability/clustering/verdict debate appears;
- hidden artifact routes are unavailable or publicly readable without admin key;
- hidden artifacts are absent after a completed V2 job;
- public output exposes hidden artifacts or presents V2 as valid;
- source/provider search/fetch/content dereference/parser/cache/SR/storage behavior appears;
- EvidenceCorpus/EvidenceItems/report/verdict/confidence/public-cutover behavior appears;
- prompt/config/model/schema edits are needed before the run can proceed.

## 15. Completion Requirements

Before live execution, create and commit:

- this reviewed package;
- status pointers in `Current_Status.md` and `Backlog.md`;
- an `Agent_Outputs.md` entry;
- a package handoff;
- rebuilt `handoff-index.json`.

After live execution, create a separate closeout package that records:

- package commit;
- runtime refresh method and time;
- actual web/runner process gate values;
- prompt/config reseed state or prompt hash state;
- exact clean and idle status checkpoints;
- exact inputs;
- job ids and ledger ids;
- runner event checks;
- public result checks;
- Claim Understanding artifact checks;
- X7-J intake artifact checks;
- X7-O observation artifact checks;
- X7-S runtime artifact checks;
- pass/partial/fail classification;
- cost/time/token observations from the hidden artifacts;
- residual blockers and next gate.

## 16. Review Questions

Architect:

- Is X7-T the correct next gate after X7-S, and does it avoid implying source/evidence/report/public readiness?
- Are two direct-text canaries sufficient for a hidden runtime smoke while preserving cost discipline?

Security/runtime:

- Are runtime gate proof, admin-only route checks, public non-leak scans, V1 stop rules, and no-store requirements sufficient?
- Does the X7-S artifact content remain acceptable as admin-sensitive but non-public diagnostic output?

Code/package:

- Is the docs-only package envelope enforceable?
- Are the verifier set, staged-path controls, and pass/fail criteria concrete enough to execute without broad fixes?

LLM/semantic:

- Are the two Captain-defined canaries suitable as opaque runtime payloads for Query Planning prompt/model execution without teaching-to-the-test?
- Does the package avoid deterministic semantic judging while still requiring schema-accepted Query Planning output?

## 17. Reviewer Decisions

Live execution is forbidden unless all review slots below are `APPROVE`.

| Role | Reviewer | Date | Decision | Required Changes / Notes |
|---|---|---:|---|---|
| Architect | Epicurus | 2026-05-17 | APPROVE | Correct next gate after X7-S; two canaries are sufficient for hidden runtime smoke and cost discipline; source/evidence/report/public readiness remains out of scope. |
| Security/runtime | Raman | 2026-05-17 | APPROVE | Approved after amendments: redacted/boolean process gate proof only, non-empty admin key plus wrong-key checks for all four routes, and no-store success requirement for all four artifact routes. |
| Code/package | Kepler | 2026-05-17 | APPROVE | Docs-only envelope, verifier set, staged-path controls, and pass/fail criteria are concrete and executable on Windows. |
| LLM/semantic | Dewey | 2026-05-17 | APPROVE | Captain inputs are opaque runtime payloads; schema-accepted Query Planning output is a structural runtime criterion, not truth/report-quality judging. |

Advisory review: Claude Opus 4.6 senior architect / LLM expert returned `APPROVE` for Architect plus LLM/semantic slots, with non-blocking notes now incorporated where useful: active authorization is cited in section 2 and section 11 states this is an admin-bypass direct API submission without invite code when `X-Admin-Key` is valid.

# V2 Slice X7-P X7-O Query Planning Observation Live-Smoke Package

**Date:** 2026-05-17
**Status:** deputy-approved execution package; docs-only; live job allowed only after package commit, clean worktree, runtime refresh, admin-route preflight, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `6a48f7d6` (`fix: harden v2 x7o artifact ledger bounds`)
**Parent packages/results:** X7-N-D clean legal-question smoke, X7-O implementation, X7-O ledger-bound hardening.
**Gate type:** one-job product-route live smoke for hidden X7-O admin-only artifact visibility.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, and LLM/semantic APPROVE with no required changes.

## 1. Purpose

X7-O implemented a sanitized product-internal Query Planning pre-execution structural observation after X7-J Evidence Lifecycle intake. It does not run Query Planning. X7-P exists only to prove that the already-implemented X7-O observer is reachable in the real product V2 runner for one known direct-text path while public V2 remains damaged/precutover.

X7-P is not a truth, legal, fairness, verdict, evidence, report-quality, prompt-quality, source-quality, public-readiness, or Query Planning execution test.

## 2. Approval Requested

Approve execution of X7-P exactly under this package after deputy review and package commit.

This package authorizes at most one live direct-text job using only the Captain-approved input in section 5.

This package authorizes only:

- the already-approved hidden direct-text Claim Understanding LLM/model-provider call required by the 4C3b/X7 runtime path;
- the already-implemented X7-J structural intake observer;
- the already-implemented X7-O structural pre-execution observation artifact write/read path;
- admin-only inspection of Claim Understanding, X7-J intake, and X7-O observation artifacts for the single job ledger.

This package does not authorize:

- prompt/frontmatter/config/model/schema edits;
- any additional live jobs beyond section 5;
- Query Planning runtime execution;
- Query Planning input-envelope, prompt-packet, hash, prompt rendering, query-plan inspection, model/provider call, or provider callback creation;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- packet/frame/byte consumption, parsed material, source material, EvidenceCorpus, EvidenceItems, warning/report/verdict/confidence generation, or user-facing quality behavior beyond existing pre-cutover damaged output;
- product/public/API/UI/report/export wiring or public V2 cutover;
- cache IO, durable runtime artifact storage, Source Reliability, ACS/direct URL execution;
- B3 proof execution, 2D-C, V1 reuse, V1 work, V1 cleanup, or PipelineV1 archive/governance changes.

## 3. Current Live-Path Ground Truth

The product runner can reach the V2 shell only when:

- the submitted job stores `pipelineVariant = "claimboundary-v2"`;
- `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
- `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.

Use `FH_ANALYZER_V2_SHELL=enabled` as the preferred gate because it is narrower than the global `FH_ANALYZER_PIPELINE=v2-precutover` mode.

The expected ledger id for all three artifact routes is:

```text
<jobId>:precutover-observability
```

The product live path for this smoke is:

```text
Claim Understanding runtime
  -> X7-J Evidence Lifecycle intake artifact
  -> X7-O Query Planning pre-execution observation artifact
  -> public damaged/precutover envelope unchanged
```

X5/X6/X7-A through X7-G2 and C0-S1/C0-S2/C0-S3 remain hidden harnesses, denial adapters, and parser adjuncts. They are not product-runner live-path stages for X7-P. Their absence in the live job is expected and must not be treated as failure.

## 4. Execution Preconditions

Before any job submission:

1. This package has been accepted by Architect, Security/runtime, Code/package, and LLM/semantic review.
2. The accepted package has been committed.
3. The worktree is clean.
4. Web/API/runner runtime has been refreshed after the package commit.
5. Prompt/config reseed state or prompt hash state is recorded, including `apps/web/prompts/claimboundary-v2.prompt.md` SHA-256 if no reseed was required.
6. Runtime gates are explicit in the actual web/runner process:
   - `FH_ANALYZER_V2_SHELL=enabled` preferred, or `FH_ANALYZER_PIPELINE=v2-precutover`;
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.
7. The runtime refresh record states exactly how the web/runner process was started and records those effective gate values for the actual process.
8. `FH_ADMIN_KEY` is set in the shell used for route preflight and job submission.
9. Admin-key access to all three internal artifact routes is available:
   - Claim Understanding runtime artifacts;
   - X7-J Evidence Lifecycle intake artifacts;
   - X7-O Query Planning pre-execution observation artifacts.
10. The submitted job input is copied exactly from section 5.
11. The submitted job stores `pipelineVariant = "claimboundary-v2"`.

Runtime gate proof before live submission:

```powershell
$candidateProcesses = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match "node|npm|powershell|pwsh|cmd" -and $_.CommandLine -match "next|apps/web|npm run dev|FH_ANALYZER_V2" } |
  Select-Object ProcessId, Name, CommandLine
$processGateText = ($candidateProcesses | Format-List | Out-String)
if ($processGateText -notmatch "FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text") {
  throw "Actual web/runner process gate proof is missing FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text"
}
if ($processGateText -notmatch "FH_ANALYZER_V2_SHELL=enabled" -and $processGateText -notmatch "FH_ANALYZER_PIPELINE=v2-precutover") {
  throw "Actual web/runner process gate proof is missing FH_ANALYZER_V2_SHELL=enabled or FH_ANALYZER_PIPELINE=v2-precutover"
}
$processGateText
```

## 5. Captain-Approved Input

Use this exact string only:

```text
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?
```

Do not paraphrase, translate, normalize, shorten, or substitute this input.

For X7-P this string is an opaque runtime payload only. Do not evaluate evidence sufficiency, verdict direction, confidence, report quality, source quality, legal merits, fairness merits, or comparative behavior.

## 6. File Envelope

X7-P is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-P_X7O_Query_Planning_Observation_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-P package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, model, schema, test, API/UI, `package.json`, `package-lock.json`, or script files may be changed for this package. If any source or verifier fix is needed, stop and create a separate reviewed package.

## 7. Required Package Verifiers

Package verification before commit:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Before package commit, stage only the exact section 6 envelope. Use explicit paths only, no wildcard staging. After staging, run:

```powershell
git diff --cached --check
$expected = @(
  "Docs/WIP/2026-05-17_V2_Slice_X7-P_X7O_Query_Planning_Observation_Live_Smoke_Package.md",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-P_X7O_Live_Smoke_Package.md",
  "Docs/AGENTS/index/handoff-index.json"
) | Sort-Object
$actual = @(git diff --cached --name-only) | Sort-Object
if (($actual -join "`n") -ne ($expected -join "`n")) {
  throw "Staged files do not match the approved X7-P docs-only envelope"
}
```

Expected post-commit/pre-live status: clean worktree.

## 8. Runtime Verifiers Before Live Job

Runtime/source verification after package commit and before live job:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Do not run expensive validation suites.

Immediately before submission, perform the clean/idle checkpoint:

```powershell
$beforeIdle = git status --short --untracked-files=all
if ($beforeIdle) { throw "X7-P pre-submission worktree is dirty before idle checkpoint" }
Start-Sleep -Seconds 60
$afterIdle = git status --short --untracked-files=all
if ($afterIdle) { throw "X7-P pre-submission worktree became dirty during idle checkpoint" }
```

## 9. Admin Route Preflight

Before the live job, prove all three hidden artifact routes are reachable and protected.

Use `Invoke-WebRequest -SkipHttpErrorCheck` where available so expected `401` and `404` responses can be inspected. If the local PowerShell does not support `-SkipHttpErrorCheck`, use `try/catch` and inspect `Exception.Response` instead.

Unauthenticated calls must return `401` for all artifact routes:

```powershell
if (-not $env:FH_ADMIN_KEY) { throw "FH_ADMIN_KEY must be set for X7-P route auth preflight" }
$ledgerProbe = "x7p-preflight-probe:precutover-observability"
$encodedLedgerProbe = [System.Uri]::EscapeDataString($ledgerProbe)
$claimUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
$intakeUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
$x7oUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
if ([int]$claimUnauthorized.StatusCode -ne 401) { throw "Claim Understanding route must reject unauthenticated access" }
if ([int]$intakeUnauthorized.StatusCode -ne 401) { throw "X7-J intake route must reject unauthenticated access" }
if ([int]$x7oUnauthorized.StatusCode -ne 401) { throw "X7-O route must reject unauthenticated access" }
```

Authenticated unknown-ledger calls must remain bounded and internal-only:

- Claim Understanding route returns `200` with `artifactCount: 0`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.
- X7-J intake route returns `404` with `Cache-Control: no-store`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.
- X7-O observation route returns `404` with `Cache-Control: no-store`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.

```powershell
$headers = @{ "x-admin-key" = $env:FH_ADMIN_KEY }
$claimUnknown = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -Headers $headers -SkipHttpErrorCheck
$intakeUnknown = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -Headers $headers -SkipHttpErrorCheck
$x7oUnknown = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -Headers $headers -SkipHttpErrorCheck
$claimUnknownJson = $claimUnknown.Content | ConvertFrom-Json
$intakeUnknownJson = $intakeUnknown.Content | ConvertFrom-Json
$x7oUnknownJson = $x7oUnknown.Content | ConvertFrom-Json
if ([int]$claimUnknown.StatusCode -ne 200 -or $claimUnknownJson.artifactCount -ne 0) { throw "Claim Understanding unknown ledger must return empty internal ledger" }
if ($claimUnknownJson.visibility -ne "internal_admin_only" -or $claimUnknownJson.publicPointerExposure -ne "forbidden") { throw "Claim Understanding route visibility mismatch" }
if ([int]$intakeUnknown.StatusCode -ne 404) { throw "X7-J intake unknown ledger must return 404" }
if ($intakeUnknown.Headers["Cache-Control"] -ne "no-store") { throw "X7-J intake unknown response must be no-store" }
if ($intakeUnknownJson.visibility -ne "internal_admin_only" -or $intakeUnknownJson.publicPointerExposure -ne "forbidden") { throw "X7-J intake route visibility mismatch" }
if ([int]$x7oUnknown.StatusCode -ne 404) { throw "X7-O unknown ledger must return 404" }
if ($x7oUnknown.Headers["Cache-Control"] -ne "no-store") { throw "X7-O unknown response must be no-store" }
if ($x7oUnknownJson.visibility -ne "internal_admin_only" -or $x7oUnknownJson.publicPointerExposure -ne "forbidden") { throw "X7-O route visibility mismatch" }
```

Known one-job smoke constraint: the Claim Understanding artifact route is admin-key protected but may not emit `Cache-Control: no-store`. X7-P accepts this only for local CLI/admin-only one-job inspection. Broader smoke, production-readiness, or any non-local exposure must either add a separate reviewed source hardening package or reject the route until no-store is present.

If any route is unavailable or unauthenticated access succeeds, stop before live jobs.

## 10. Submission And Inspection Plan

Before submission, record:

```powershell
$packageRevision = (git rev-parse HEAD).Trim()
$promptHash = (Get-FileHash apps/web/prompts/claimboundary-v2.prompt.md -Algorithm SHA256).Hash
git status --short --untracked-files=all
```

Submit the one job through the local API as an admin-bypass direct API job:

```powershell
$headers = @{ "X-Admin-Key" = $env:FH_ADMIN_KEY }
$body = @{
  inputType = "text"
  inputValue = "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?"
  pipelineVariant = "claimboundary-v2"
} | ConvertTo-Json
$job = Invoke-RestMethod -Uri "http://localhost:5000/v1/analyze" -Method Post -Headers $headers -Body $body -ContentType "application/json"
$jobId = $job.jobId
```

Poll through `SUCCEEDED`, `FAILED`, or `CANCELLED`, then inspect all three hidden artifact routes using ledger id:

```text
<jobId>:precutover-observability
```

During polling, inspect events early. The first runner preparation event must show:

```text
Preparing input (pipeline: claimboundary-v2)
```

If it shows `pipeline: claimboundary`, cancel immediately and classify as hard fail.

After completion, inspect the public job response without admin credentials. Null compatibility fields such as `"promptContentHash": null` are acceptable in the non-admin public response. Non-null hidden hashes, artifact ids, ledger ids, artifact bodies, accepted `ClaimContract` bodies, provider telemetry, X7-J markers, X7-O markers, or hidden artifact bodies are not acceptable.

```powershell
$ledgerId = "${jobId}:precutover-observability"
$publicJob = Invoke-RestMethod -Uri "http://localhost:5000/v1/jobs/$jobId" -Method Get
$publicText = $publicJob | ConvertTo-Json -Depth 100
$literalForbiddenMarkers = @(
  $ledgerId,
  "precutover-observability",
  "runtime_dispatch_completed",
  "contract_observed_preexecution",
  "intake_ready",
  "contract_only_no_provider_execution",
  "not_executable_precutover",
  "preexecutionObservation",
  "structural_prerequisites_observed_not_executed_precutover",
  "blocked_pre_query_planning",
  "internal_admin_only",
  "publicPointerExposure"
)
foreach ($marker in $literalForbiddenMarkers) {
  if ($publicText.Contains($marker)) { throw "Public response leaked hidden marker: $marker" }
}
$nonNullForbiddenPatterns = @(
  '"artifactId"\s*:\s*(?!null)',
  '"ledgerId"\s*:\s*(?!null)',
  '"artifactBody"\s*:\s*(?!null)',
  '"activationSnapshotHash"\s*:\s*(?!null)',
  '"runtimeConfigHash"\s*:\s*(?!null)',
  '"configSnapshotHash"\s*:\s*(?!null)',
  '"renderedPromptHash"\s*:\s*(?!null)',
  '"cacheDecision"\s*:\s*(?!null)',
  '"providerTelemetry"\s*:\s*(?!null)',
  '"claimContract"\s*:\s*(?!null)',
  '"evidenceLifecycleIntake"\s*:\s*(?!null)',
  '"queryPlanningPreexecutionObservation"\s*:\s*(?!null)'
)
foreach ($pattern in $nonNullForbiddenPatterns) {
  if ($publicText -match $pattern) { throw "Public response leaked non-null hidden field matching $pattern" }
}
```

## 11. Pass Criteria

The one job passes X7-P only if all of these hold:

- the job input exactly matches section 5;
- job status reaches `SUCCEEDED`;
- stored variant is `claimboundary-v2`;
- job execution hash matches the committed X7-P package/runtime revision recorded before runtime refresh, with no dirty suffix;
- pre-submission, idle, and post-inspection worktree status are clean;
- first runner preparation event shows `pipeline: claimboundary-v2`;
- no runner event or log evidence shows V1 search/fetch/XLSX parsing/Source Reliability/clustering/verdict debate work;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`;
- public result remains `meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output remains damaged/blocked and is not interpreted as a valid V2 answer;
- unauthenticated access to all three artifact routes returns `401`;
- authenticated artifact route responses for the real job ledger show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- authenticated X7-J and X7-O success responses include `Cache-Control: no-store`;
- non-admin public job response has been fetched and public result serialization does not expose non-null hidden hashes, artifact id, ledger id, artifact body, artifact sink marker, activation snapshot hash, runtime config hash, rendered prompt hash, cache-decision reason, provider telemetry object, accepted `ClaimContract` body, X7-J status markers, X7-O pre-execution observation markers, or hidden artifact fields;
- authenticated Claim Understanding artifact route returns at least one artifact for `<jobId>:precutover-observability`;
- authenticated X7-J Evidence Lifecycle intake artifact route returns at least one artifact for the same ledger id;
- authenticated X7-O Query Planning pre-execution observation artifact route returns at least one artifact for the same ledger id;
- latest Claim Understanding artifact has `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, and `schemaOutcome.status: accepted`;
- latest Claim Understanding artifact shows no-store/no-read/no-write runtime cache posture: `cacheDecision.reason: no_store_runtime_dispatch_safety`, `cacheDecision.canRead: false`, and `cacheDecision.canWrite: false`;
- X7-J artifact shows `claimUnderstanding.handoffStatus: accepted`, `claimUnderstanding.selectedAtomicClaimCount >= 1`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, and `executionScope: contract_only_no_provider_execution`;
- X7-J artifact shows `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`;
- all X7-J downstream execution flags are false;
- X7-O artifact has `artifactVersion: v2.evidence-query-planning.preexecution-observation-artifact.x7o`;
- X7-O artifact has `source: product_v2_orchestrator_after_evidence_lifecycle_intake`;
- X7-O artifact has `publicCutoverStatus: blocked_precutover`;
- X7-O artifact has `preexecutionObservation.status: structural_prerequisites_observed_not_executed_precutover`;
- X7-O artifact has `preexecutionObservation.blockedReason: null`;
- X7-O artifact has `preexecutionObservation.sourceIntakeStatus: intake_ready`;
- X7-O artifact has `preexecutionObservation.inputScope: direct_text_claim_contract`;
- X7-O artifact has `preexecutionObservation.selectedAtomicClaimCount >= 1`;
- X7-O artifact has `preexecutionObservation.sourceLanguageSignal: present`;
- all X7-O product-execution flags are false;
- X7-O artifact does not contain user input text, claim text, AtomicClaim ids, prompt text, provider payloads, source URLs, parsed/source material, EvidenceCorpus, EvidenceItems, report text, verdict text, confidence text, cache keys, storage paths, secrets, env vars, or filesystem paths;
- no non-authorized behavior from section 2 appears.

## 12. Hard Fail Criteria

Stop and record failure if any of these occur:

- package, runtime, idle, or post-inspection worktree is dirty at any required checkpoint;
- any input other than section 5 is submitted;
- a second live job is submitted under X7-P;
- runtime is stale or not refreshed from the committed package revision;
- runtime env gates are missing or unproven;
- job execution hash does not match the committed X7-P package/runtime revision, or has a dirty suffix;
- runner preparation event shows `pipeline: claimboundary`;
- any V1 work appears, including search/fetch, XLSX parsing, Source Reliability, clustering, or verdict debate;
- hidden artifact routes are unavailable or publicly accessible without admin key;
- hidden artifacts are absent after a completed V2 job;
- public output exposes hidden artifacts or presents V2 as valid;
- Query Planning runtime/input-envelope/prompt-packet/hash/prompt/model/provider/query-plan inspection appears;
- source/provider/parser/cache/SR/storage behavior appears;
- evidence/report/verdict/confidence/public-cutover behavior appears;
- any section 2 non-authorization is violated.

## 13. Completion Requirements

Before live execution, create and commit:

- this reviewed package;
- status pointers in `Current_Status.md` and `Backlog.md`;
- an `Agent_Outputs.md` entry;
- a package handoff;
- rebuilt `handoff-index.json`.

After live execution, create a separate result closeout that records:

- package commit;
- runtime refresh method and time;
- actual web/runner process gate values recorded during runtime refresh;
- prompt/config reseed state or prompt hash state;
- exact clean and idle status checkpoints;
- exact input;
- job id and ledger id;
- runner event route check;
- public result checks;
- Claim Understanding artifact checks;
- X7-J intake artifact checks;
- X7-O observation artifact checks;
- pass/fail classification;
- residual blockers.

## 14. Review Questions

Architect:

- Does X7-P prove the useful product-path fact after X7-O without implying Query Planning execution, source readiness, report readiness, or public readiness?
- Is one legal-question canary sufficient because X7-P tests artifact reachability, not language/semantic quality?

Security/runtime:

- Are runtime gates, admin-only artifact routes, no-public-leak checks, sink-bound hardening, and V1/cost leakage stop conditions sufficient?
- Is the 60-second clean/idle checkpoint adequate for this one-job local smoke?

Code/package:

- Is the docs/status/handoff-only file envelope enforceable?
- Are the staged-path assertion, verifier commands, and pass/fail criteria concrete enough?

LLM/semantic:

- Does the package use the Captain canary only as an opaque runtime payload and not as a prompt example or truth/legal/fairness-quality benchmark?
- Does the package avoid drawing evidence-quality, legal-quality, fairness-quality, report-quality, verdict-quality, or Query Planning-quality conclusions?

## 15. Reviewer Decisions

Live execution is forbidden unless all four review slots below are `APPROVE`.

| Role | Reviewer | Date | Decision | Required Changes / Notes |
|---|---|---:|---|---|
| Architect | Kuhn | 2026-05-17 | APPROVE | Useful narrow product-path fact; preserves non-execution and non-public-readiness boundaries. |
| Security/runtime | Descartes | 2026-05-17 | APPROVE | Runtime gates, admin-only route checks, public non-leak scans, V1/cost hard stops, and bounded Claim Understanding no-store exception are sufficient for one local smoke. |
| Code/package | Parfit | 2026-05-17 | APPROVE | Docs-only envelope, staged-path assertion, verifier set, and pass/fail criteria are concrete and enforceable. |
| LLM/semantic | Galileo | 2026-05-17 | APPROVE | Captain canary is only an opaque runtime payload; no truth/legal/fairness/report/evidence/source-quality or prompt-contamination claim is introduced. |

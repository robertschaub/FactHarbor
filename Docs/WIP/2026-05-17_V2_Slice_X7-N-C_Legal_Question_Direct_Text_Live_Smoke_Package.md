# V2 Slice X7-N-C Legal-Question Direct-Text Live-Smoke Package

**Date:** 2026-05-17
**Status:** draft execution package; docs-only; live job allowed only after reviewer acceptance, package commit, clean worktree, runtime refresh, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `01328d3f` (`docs: record v2 x7n-b live smoke result`)
**Parent packages/results:** X7-M Claim Understanding prompt/contract repair, X7-N-B post-route-repair live-smoke result.
**Gate type:** one-job direct-text Claim Understanding legal-question smoke.
**Review result:** approved for one-job execution after package commit and pre-run gates.

## 1. Purpose

X7-K showed that the Bolsonaro/fair-trial direct question returned schema-valid `no_valid_claim` before X7-M. X7-M clarified topic-neutral externally assessable direct-question handling. X7-N-B then proved the post-route-repair product runner can execute a committed/refreshed `claimboundary-v2` direct-text job without V1 fallback while public output stays pre-cutover blocked.

X7-N-C exists only to test whether the second Captain-approved direct-text canary now produces an accepted hidden Claim Understanding contract under the same clean V2 route and public fail-closed envelope.

X7-N-C is not a truth, legal, fairness, verdict, evidence, report-quality, public-readiness, or source-quality test.

## 2. Approval Requested

Approve execution of X7-N-C exactly under this package after reviewer acceptance and package commit.

This package authorizes at most one live direct-text job using only the Captain-approved input in section 5.

This package authorizes only the already-approved hidden direct-text Claim Understanding LLM/model-provider call required by the 4C3b/X7 runtime path and the already-implemented X7-J structural intake observer. It does not authorize Query Planning execution, source-acquisition provider execution, source IO, parser execution, or downstream Evidence Lifecycle semantic tasks.

This package does not authorize:

- prompt/frontmatter/config/model/schema edits;
- more X7-N, X7-N-A, or X7-N-B reruns;
- any additional live jobs beyond section 5;
- prompt-quality, report-quality, verdict-quality, evidence-sufficiency, source-reliability, legal-merit, fairness, or public-readiness claims;
- Query Planning runtime/model/provider execution;
- X5 hidden integration harness execution;
- X6/X7 source-acquisition harness execution;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- packet/frame/byte consumption, parsed material, source material, EvidenceCorpus, EvidenceItems, new downstream analytical warnings, report generation, verdicts, confidence, or user-facing quality behavior beyond the existing pre-cutover damaged-envelope behavior;
- product/public/API/UI/report/export wiring or public V2 cutover;
- cache IO, durable runtime artifact storage, Source Reliability, ACS/direct URL execution;
- B3 proof execution, 2D-C, V1 reuse, V1 work, or V1 cleanup.

## 3. Current Live-Path Ground Truth

The current product runner path can reach the V2 shell only when:

- the submitted job stores `pipelineVariant = "claimboundary-v2"`;
- `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
- `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.

Use `FH_ANALYZER_V2_SHELL=enabled` as the preferred gate because it is narrower than the global `FH_ANALYZER_PIPELINE=v2-precutover` mode.

If the V2 shell gate is missing, the route-selection repair must fail closed before any V1 or V2 analysis call. That is safe behavior, but it is not a passing X7-N-C smoke.

The expected ledger id for both artifact routes is:

```text
<jobId>:precutover-observability
```

X5/X6/X7-A through X7-G2 remain hidden harnesses and denial adapters. They are not product-runner live-path stages today. Their absence in an X7-N-C live job is expected and must not be treated as failure.

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
8. Admin-key access to both internal artifact routes is available.
9. The submitted job input is copied exactly from section 5.
10. The submitted job stores `pipelineVariant = "claimboundary-v2"`.

## 5. Captain-Approved Input

Use this exact string only:

```text
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?
```

Do not paraphrase, translate, normalize, shorten, or substitute this input.

For X7-N-C this string is an opaque runtime payload only. Do not evaluate evidence sufficiency, verdict direction, confidence, report quality, source quality, legal merits, fairness merits, or comparative behavior.

## 6. File Envelope

X7-N-C is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-N-C package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, model, schema, test, API/UI, `package.json`, `package-lock.json`, or script files may be changed for this package. If any source or verifier fix is needed, stop and create a separate reviewed package.

## 7. Required Pre-Run Verifiers

Package verification before commit:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Before package commit, stage only the exact section 6 envelope. Use explicit paths only, no wildcard staging:

```powershell
git add -- `
  "Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md" `
  "Docs/STATUS/Current_Status.md" `
  "Docs/STATUS/Backlog.md" `
  "Docs/AGENTS/Agent_Outputs.md" `
  "Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-C_Legal_Question_Live_Smoke_Package.md" `
  "Docs/AGENTS/index/handoff-index.json"
git diff --cached --check
```

Expected post-commit/pre-live status: clean worktree.

Exact staged-path assertion:

```powershell
$expected = @(
  "Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-C_Legal_Question_Live_Smoke_Package.md",
  "Docs/AGENTS/index/handoff-index.json"
) | Sort-Object
$actual = @(git diff --cached --name-only) | Sort-Object
if (($actual -join "`n") -ne ($expected -join "`n")) {
  throw "Staged files do not match the approved X7-N-C docs-only envelope"
}
```

Runtime/source verification after commit and before live job:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/execution-selection.test.ts test/unit/lib/internal-runner-v2-routing.test.ts test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Do not run expensive validation suites.

## 8. Admin Route Preflight

Before live jobs, prove both hidden artifact routes are reachable and protected.

Use `Invoke-WebRequest -SkipHttpErrorCheck` where available so expected `401` and `404` responses can be inspected. If the local PowerShell does not support `-SkipHttpErrorCheck`, use `try/catch` and inspect `Exception.Response` instead.

Unauthenticated calls must return `401` for both artifact routes:

```powershell
$ledgerProbe = "x7nc-preflight-probe:precutover-observability"
$encodedLedgerProbe = [System.Uri]::EscapeDataString($ledgerProbe)
$claimUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
$intakeUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
if ([int]$claimUnauthorized.StatusCode -ne 401) { throw "Claim Understanding route must reject unauthenticated access" }
if ([int]$intakeUnauthorized.StatusCode -ne 401) { throw "X7-J intake route must reject unauthenticated access" }
```

Authenticated unknown-ledger calls must remain bounded and internal-only:

- Claim Understanding route returns `200` with `artifactCount: 0`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.
- X7-J intake route returns `404` with `Cache-Control: no-store`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.

```powershell
$headers = @{ "x-admin-key" = $env:FH_ADMIN_KEY }
$claimUnknown = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -Headers $headers -SkipHttpErrorCheck
$intakeUnknown = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -Headers $headers -SkipHttpErrorCheck
$claimUnknownJson = $claimUnknown.Content | ConvertFrom-Json
$intakeUnknownJson = $intakeUnknown.Content | ConvertFrom-Json
if ([int]$claimUnknown.StatusCode -ne 200 -or $claimUnknownJson.artifactCount -ne 0) { throw "Claim Understanding unknown ledger must return empty internal ledger" }
if ($claimUnknownJson.visibility -ne "internal_admin_only" -or $claimUnknownJson.publicPointerExposure -ne "forbidden") { throw "Claim Understanding route visibility mismatch" }
if ([int]$intakeUnknown.StatusCode -ne 404) { throw "X7-J intake unknown ledger must return 404" }
if ($intakeUnknown.Headers["Cache-Control"] -ne "no-store") { throw "X7-J intake unknown response must be no-store" }
if ($intakeUnknownJson.visibility -ne "internal_admin_only" -or $intakeUnknownJson.publicPointerExposure -ne "forbidden") { throw "X7-J intake route visibility mismatch" }
```

Known one-job smoke constraint: the Claim Understanding artifact route is admin-key protected but currently does not emit `Cache-Control: no-store`. X7-N-C accepts this only for local CLI/admin-only one-job inspection. Broader smoke, production-readiness, or any non-local exposure must either add a separate reviewed source hardening package or reject the route until no-store is present.

If either route is unavailable or unauthenticated access succeeds, stop before live jobs.

## 9. Submission And Inspection Plan

Before submission, record:

```powershell
$packageRevision = (git rev-parse HEAD).Trim()
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

Poll through `SUCCEEDED`, `FAILED`, or `CANCELLED`, then inspect both hidden artifact routes using ledger id:

```text
<jobId>:precutover-observability
```

During polling, inspect events early. The first runner preparation event must show:

```text
Preparing input (pipeline: claimboundary-v2)
```

If it shows `pipeline: claimboundary`, cancel immediately and classify as hard fail.

After completion, inspect the public job response without admin credentials. Null compatibility fields such as `"promptContentHash": null` are acceptable in the non-admin public response. Non-null hidden hashes, artifact ids, ledger ids, artifact bodies, accepted `ClaimContract` bodies, provider telemetry, X7-J markers, or hidden artifact bodies are not acceptable.

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
  '"evidenceLifecycleIntake"\s*:\s*(?!null)'
)
foreach ($pattern in $nonNullForbiddenPatterns) {
  if ($publicText -match $pattern) { throw "Public response leaked non-null hidden field matching $pattern" }
}
```

## 10. Pass Criteria

The one job passes X7-N-C only if all of these hold:

- the job input exactly matches section 5;
- job status reaches `SUCCEEDED`;
- stored variant is `claimboundary-v2`;
- job execution hash matches the committed X7-N-C package/runtime revision recorded before runtime refresh, with no dirty suffix;
- pre-submission and post-inspection worktree status are clean;
- first runner preparation event shows `pipeline: claimboundary-v2`;
- no runner event or log evidence shows V1 search/fetch/XLSX parsing/Source Reliability/clustering/verdict debate work;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`;
- public result remains `meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output remains damaged/blocked and is not interpreted as a valid V2 answer;
- unauthenticated access to both artifact routes returns `401`;
- authenticated artifact route responses for the real job ledger show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- authenticated X7-J Evidence Lifecycle intake artifact route success response includes `Cache-Control: no-store`;
- the Claim Understanding artifact route's missing `Cache-Control: no-store` remains documented and accepted only as a local one-job CLI/admin inspection exception;
- non-admin public job response has been fetched and public result serialization does not expose non-null hidden hashes, artifact id, ledger id, artifact body, artifact sink marker, activation snapshot hash, runtime config hash, rendered prompt hash, cache-decision reason, provider telemetry object, accepted `ClaimContract` body, X7-J status markers, or intake artifact fields;
- authenticated Claim Understanding artifact route returns at least one artifact for `<jobId>:precutover-observability`;
- authenticated X7-J Evidence Lifecycle intake artifact route returns at least one artifact for the same ledger id;
- latest Claim Understanding artifact has `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, and `schemaOutcome.status: accepted`;
- latest Claim Understanding artifact shows no-store/no-read/no-write runtime cache posture: `cacheDecision.reason: no_store_runtime_dispatch_safety`, `cacheDecision.canRead: false`, and `cacheDecision.canWrite: false`;
- latest Claim Understanding artifact has no blocked or damaged schema reason;
- X7-J artifact shows `claimUnderstanding.handoffStatus: accepted`, `claimUnderstanding.selectedAtomicClaimCount >= 1`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, and `executionScope: contract_only_no_provider_execution`;
- X7-J artifact shows `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`;
- all X7-J downstream execution flags are false;
- the direct question no longer returns `blockedReason: no_valid_claim`;
- no non-authorized behavior from section 2 appears.

## 11. Hard Fail Criteria

Stop and record failure if any of these occur:

- package or runtime worktree is dirty at any required clean checkpoint;
- any input other than section 5 is submitted;
- a second live job is submitted under X7-N-C;
- runtime is stale or not refreshed from the committed package revision;
- runtime env gates are missing or unproven;
- job execution hash does not match the committed X7-N-C package/runtime revision, or has a dirty suffix;
- runner preparation event shows `pipeline: claimboundary`;
- any V1 work appears, including search/fetch, XLSX parsing, Source Reliability, clustering, or verdict debate;
- hidden artifact routes are unavailable or publicly accessible without admin key;
- hidden artifacts are absent after a completed V2 job;
- public output exposes hidden artifacts or presents V2 as valid;
- any section 2 non-authorization is violated.

## 12. Completion Requirements

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
- exact clean-status checkpoints;
- exact input;
- job id and ledger id;
- runner event route check;
- public result checks;
- Claim Understanding artifact checks;
- X7-J intake artifact checks;
- pass/fail classification;
- residual blockers.

## 13. Review Questions

Architect:

- Is X7-N-C the right next low-risk smoke after X7-N-B passed?
- Is one legal-question canary enough before any broader smoke or downstream implementation resumes?

Security/runtime:

- Are runtime gates, route-selection fail-closed checks, admin-only artifact routes, no-public-leak checks, and stop conditions sufficient?
- Are V1 fallback/cost leakage controls concrete enough?

Code/package:

- Is the docs/status/handoff-only file envelope enforceable?
- Are pre-run verifier commands and post-run inspection fields concrete enough?

LLM/semantic:

- Does the package use the Captain canary only as a runtime payload and not as a prompt example or truth/legal/fairness-quality benchmark?
- Does the package avoid drawing report-quality, evidence-quality, legal-quality, fairness-quality, or verdict-quality conclusions?

## 14. Reviewer Decisions

Live execution is forbidden unless all four review slots below are `APPROVE`.

| Role | Reviewer | Date | Decision | Required Changes / Notes |
|---|---|---:|---|---|
| Architect | Hubble | 2026-05-17 | APPROVE | Package is coherent, bounded to one exact Captain-approved job, and correctly sequenced after X7-N-B. |
| Security/runtime | Anscombe | 2026-05-17 | APPROVE | Approved after self-contained admin-route preflight, explicit route-security pass criteria, concrete public forbidden-marker checks, and hidden-runtime no-store/no-read/no-write cache assertion were added. |
| Code/package | Euler | 2026-05-17 | APPROVE | Approved after explicit no-wildcard staging commands, enforceable review-decision table, handoff metadata fix, and rebuilt index. |
| LLM/semantic | Bernoulli | 2026-05-17 | APPROVE | The Captain canary is used only as an opaque runtime payload. The package forbids truth/legal/fairness/evidence/report/verdict-quality conclusions and does not use the concrete input as a prompt example or benchmark. |

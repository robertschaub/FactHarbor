# V2 Slice X7-N-B Post-Route-Repair Clean Live-Smoke Package

**Date:** 2026-05-17
**Status:** draft execution package; docs-only; live job allowed only after reviewer acceptance, package commit, clean worktree, runtime refresh, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `0a12dff3` (`feat: align v2 query planning prompt metadata`)
**Parent packages:** X7-N post-X7M live-smoke package, X7-N-A clean-provenance rerun amendment, X7-N-A route-selection hard-fail repair, X3-B query-planning prompt metadata implementation.
**Gate type:** one-job clean direct-text live-smoke recovery after route-selection fail-closed repair.
**Review result:** Architect APPROVE, Security/runtime APPROVE, LLM/semantic APPROVE, Code/package APPROVE after package-envelope fixes.

## 1. Purpose

X7-N functionally showed accepted hidden Claim Understanding output for the German canary, but the run was invalidated by dirty provenance. X7-N-A then attempted a clean rerun and hard-failed because the product runner silently fell back to V1 when a stored `claimboundary-v2` job met a closed V2 shell gate. The route-selection repair in `95b954f2` makes explicit V2-disabled and unsupported variants fail closed instead of falling back to V1. X3-B then aligned prompt metadata at `0a12dff3` without granting new runtime authority.

X7-N-B exists only to prove, with clean provenance, that the repaired route now reaches the V2 hidden direct-text runtime for one German Captain-approved canary while public V2 output remains damaged/precutover and no V1 fallback occurs.

X7-N-B is not a report-quality, evidence-quality, source-quality, verdict-quality, public-readiness, or truth-accuracy test.

## 2. Approval Requested

Approve execution of X7-N-B exactly under this package after reviewer acceptance and package commit.

This package authorizes at most one live direct-text job using only the Captain-approved input in section 5.

This package authorizes only the already-approved hidden direct-text Claim Understanding LLM/model-provider call required by the 4C3b/X7 runtime path and the already-implemented X7-J structural intake observer. It does not authorize Query Planning execution, source-acquisition provider execution, source IO, parser execution, or downstream Evidence Lifecycle semantic tasks.

This package does not authorize:

- new prompt/frontmatter/config/model/schema edits;
- more X7-N or X7-N-A reruns;
- the Bolsonaro/fair-trial canary;
- prompt-quality, report-quality, verdict-quality, evidence-sufficiency, source-reliability, or public-readiness claims;
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

The preferred gate form for this package is `FH_ANALYZER_V2_SHELL=enabled` because it is narrower than the global `FH_ANALYZER_PIPELINE=v2-precutover` mode.

If the V2 shell gate is missing, the route-selection repair must fail closed before any V1 or V2 analysis call. That is safe behavior, but it is not a passing X7-N-B smoke.

Under the approved V2 live path, the currently product-reachable hidden artifacts are:

- Claim Understanding runtime artifacts in the internal `v2_observability_ledger`;
- X7-J Evidence Lifecycle intake artifacts in the process-local internal intake artifact sink.

The expected ledger id for both artifact routes is:

```text
<jobId>:precutover-observability
```

X5/X6/X7-A through X7-G2 remain hidden harnesses and denial adapters. They are not product-runner live-path stages today. Their absence in an X7-N-B live job is expected and must not be treated as failure.

## 4. Execution Preconditions

Before any job submission:

1. This package has been accepted by Architect, Security/runtime, Code/package, and LLM/semantic review.
2. The accepted package has been committed.
3. The worktree is clean.
4. Web/API/runner runtime has been refreshed after the package commit.
5. Prompt/config reseed state or prompt hash state is recorded after X3-B, including `apps/web/prompts/claimboundary-v2.prompt.md` SHA-256 if no reseed was required.
6. Runtime gates are explicit in the actual web/runner process:
   - `FH_ANALYZER_V2_SHELL=enabled` preferred, or `FH_ANALYZER_PIPELINE=v2-precutover`;
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.
7. The runtime refresh record states exactly how the web/runner process was started and records those effective gate values for the actual process, not just the current shell.
8. Admin-key access to both internal artifact routes is available.
9. The submitted job input is copied exactly from section 5.
10. The submitted job stores `pipelineVariant = "claimboundary-v2"`.

## 5. Captain-Approved Input

Use this exact string only:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

Do not paraphrase, translate, normalize, shorten, or substitute this input.

For X7-N-B this string is an opaque runtime payload only. Do not evaluate evidence sufficiency, verdict direction, confidence, report quality, source quality, or comparative behavior.

## 6. File Envelope

X7-N-B is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-N-B_Post_Route_Repair_Clean_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-N-B package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, model, schema, test, API/UI, `package.json`, `package-lock.json`, or script files may be changed for this package. If any source or verifier fix is needed, stop and create a separate reviewed package.

## 7. Required Pre-Run Verifiers

Package verification before commit:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

Before package commit, stage only the exact section 6 envelope and then run `git diff --cached --check`. Expected post-commit/pre-live status: clean worktree.

Exact staged-path assertion:

```powershell
$expected = @(
  "Docs/WIP/2026-05-17_V2_Slice_X7-N-B_Post_Route_Repair_Clean_Live_Smoke_Package.md",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-B_Post_Route_Repair_Live_Smoke_Package.md",
  "Docs/AGENTS/index/handoff-index.json"
) | Sort-Object
$actual = @(git diff --cached --name-only) | Sort-Object
if (($actual -join "`n") -ne ($expected -join "`n")) {
  throw "Staged files do not match the approved X7-N-B docs-only envelope"
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

Before live jobs, prove both routes are reachable and protected.

Use `Invoke-WebRequest -SkipHttpErrorCheck` where available so expected `401` and `404` responses can be inspected. If the local PowerShell does not support `-SkipHttpErrorCheck`, use `try/catch` and inspect `Exception.Response` instead.

Unauthenticated calls must return `401` for both artifact routes.

```powershell
$ledgerProbe = "x7nb-preflight-probe:precutover-observability"
$encodedLedgerProbe = [System.Uri]::EscapeDataString($ledgerProbe)
$claimUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
$intakeUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
if ([int]$claimUnauthorized.StatusCode -ne 401) { throw "Claim Understanding route must reject unauthenticated access" }
if ([int]$intakeUnauthorized.StatusCode -ne 401) { throw "X7-J intake route must reject unauthenticated access" }
```

Authenticated unknown-ledger calls must remain bounded and internal-only:

- Claim Understanding route returns `200` with `artifactCount: 0`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.
- X7-J intake route returns `404` with `Cache-Control: no-store`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.
- Known one-job smoke constraint: the Claim Understanding artifact route is admin-key protected but currently does not emit `Cache-Control: no-store`. X7-N-B accepts this only for local CLI/admin-only one-job inspection. Broader smoke, production-readiness, or any non-local exposure must either add a separate reviewed source hardening package or reject the route until no-store is present.

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
  inputValue = "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz"
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

After completion, inspect the public job response without admin credentials:

```powershell
$publicJob = Invoke-WebRequest -Uri "http://localhost:5000/v1/jobs/$jobId" -Method Get -SkipHttpErrorCheck
if ([int]$publicJob.StatusCode -ne 200) { throw "Public job read must succeed for fail-closed inspection" }
$publicJobText = $publicJob.Content
$forbiddenPublicMarkers = @(
  "$jobId`:precutover-observability",
  "v2_observability_ledger",
  "v2_evidence_lifecycle_intake_artifact_ledger",
  "source: product_v2_orchestrator_after_claim_understanding",
  "contract_observed_preexecution",
  "providerTelemetry",
  "renderedPromptHash",
  "activationSnapshotHash",
  "runtimeConfigHash"
)
foreach ($marker in $forbiddenPublicMarkers) {
  if ($publicJobText.Contains($marker)) { throw "Public job response leaked hidden marker: $marker" }
}
```

Null compatibility fields such as `"promptContentHash": null` are acceptable in the non-admin public response. Non-null hidden hashes, artifact ids, ledger ids, artifact bodies, accepted `ClaimContract` bodies, provider telemetry, X7-J markers, or hidden artifact bodies are not acceptable.

## 10. Pass Criteria

The one job passes X7-N-B only if all of these hold:

- the job input exactly matches section 5;
- job status reaches `SUCCEEDED`;
- stored variant is `claimboundary-v2`;
- job execution hash matches the committed X7-N-B package/runtime revision recorded before runtime refresh, with no dirty suffix;
- pre-submission and post-inspection worktree status are clean;
- first runner preparation event shows `pipeline: claimboundary-v2`;
- no runner event or log evidence shows V1 search/fetch/XLSX parsing/Source Reliability/clustering/verdict debate work;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`;
- public result remains `meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output remains damaged/blocked and is not interpreted as a valid V2 answer;
- unauthenticated access to both artifact routes returns `401`;
- authenticated artifact route responses show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- authenticated X7-J Evidence Lifecycle intake artifact route success response includes `Cache-Control: no-store`;
- non-admin public job response has been fetched and public result serialization does not expose non-null hidden hashes, artifact id, ledger id, artifact body, artifact sink marker, activation snapshot hash, runtime config hash, rendered prompt hash, cache-decision reason, provider telemetry object, accepted `ClaimContract` body, X7-J status markers, or intake artifact fields;
- authenticated Claim Understanding artifact route returns at least one artifact for `<jobId>:precutover-observability`;
- authenticated X7-J Evidence Lifecycle intake artifact route returns at least one artifact for the same ledger id;
- latest Claim Understanding artifact has `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, and `schemaOutcome.status: accepted`;
- latest Claim Understanding artifact has no blocked or damaged schema reason;
- X7-J artifact shows `claimUnderstanding.handoffStatus: accepted`, `claimUnderstanding.selectedAtomicClaimCount >= 1`, `evidenceLifecycleIntake.status: intake_ready`, `observationStatus: contract_observed_preexecution`, `claimContractPresent: true`, and `executionScope: contract_only_no_provider_execution`;
- X7-J artifact shows `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`;
- all X7-J downstream execution flags are false;
- the German direct-text job does not fail with `claim_contract_validation_failed` caused by flat `input.selectedAtomicClaimIds`;
- no non-authorized behavior from section 2 appears.

## 11. Hard Fail Criteria

Stop and record failure if any of these occur:

- package or runtime worktree is dirty at any required clean checkpoint;
- any input other than section 5 is submitted;
- a second live job is submitted under X7-N-B;
- runtime is stale or not refreshed from the committed package revision;
- runtime env gates are missing or unproven;
- job execution hash does not match the committed X7-N-B package/runtime revision, or has a dirty suffix;
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

- Is X7-N-B the right next low-risk step after X7-N-A hard-failed and the route selector was repaired?
- Is one German canary enough before any broader smoke or downstream implementation resumes?

Security/runtime:

- Are runtime gates, route-selection fail-closed checks, admin-only artifact routes, no-public-leak checks, and stop conditions sufficient?
- Are V1 fallback/cost leakage controls concrete enough?

Code/package:

- Is the docs/status/handoff-only file envelope enforceable?
- Are pre-run verifier commands and post-run inspection fields concrete enough?

LLM/semantic:

- Does the package use the Captain canary only as a runtime payload and not as a prompt example or truth-quality benchmark?
- Does the package avoid drawing report-quality, evidence-quality, or verdict-quality conclusions?

## 14. Reviewer Decisions

Architect review: APPROVE after the package clarified warning scope and bound the job execution hash to the committed X7-N-B package/runtime revision.

Security/runtime review: APPROVE after the package required actual web/runner process gate recording, added non-admin public response inspection, clarified null compatibility fields, clarified warning scope, and documented the Claim Understanding artifact route no-store gap as acceptable only for local one-job CLI/admin inspection.

LLM/semantic review: APPROVE. The package uses the German Captain input only as opaque runtime payload, avoids truth/evidence/report/verdict-quality claims, and treats `selectedAtomicClaimCount >= 1` only as structural liveness.

Code/package review: APPROVE after package-envelope fixes. The package now includes the exact staged-path assertion, records all reviewer decisions, and requires the rebuilt handoff index in the docs-only envelope.

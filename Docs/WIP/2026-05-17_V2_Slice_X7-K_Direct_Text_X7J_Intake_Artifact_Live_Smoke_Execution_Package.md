# V2 Slice X7-K Direct-Text X7-J Intake Artifact Live-Smoke Execution Package

**Date:** 2026-05-17
**Status:** deputy-approved execution package; docs-only; live jobs allowed only after package commit, clean worktree, runtime refresh, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `13c2c2e8` (`feat: add v2 x7j intake artifact observer`)
**Parent packages:** X7-H direct-text live-smoke readiness criteria, X7-I Route B live-smoke result, X7-J product-internal Evidence Lifecycle intake artifact observer.
**Route:** B - no X3-B prompt edits; hidden runtime/fail-closed smoke only.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM/semantic APPROVE after tightening executable HTTP route assertions, cached-diff hygiene for untracked package files, focused pre-run route/sink coverage, X7-J success `Cache-Control: no-store` criteria, and result closeout requirements.

## 1. Purpose

Define a narrow executable package for a limited V2 direct-text live smoke after X7-J.

X7-J added the first product-internal Evidence Lifecycle intake observer: the product V2 orchestrator builds the existing Evidence Lifecycle intake decision after Claim Understanding and records a bounded, sanitized, admin-only artifact. X7-K spends at most two live jobs to prove that this observer is reachable in the real product runner while the public result remains damaged/precutover.

X7-K is not a report-quality, evidence-quality, verdict-quality, source-quality, prompt-quality, or public-readiness test.

## 2. Approval Requested

Approve execution of X7-K exactly under this package after deputy review and package commit.

This package authorizes, after acceptance and commit, at most two live direct-text jobs using only the Captain-approved canaries in section 5.

This package authorizes only the already-approved hidden Claim Understanding LLM/model-provider call required by the 4C3b direct-text runtime path plus the already-implemented X7-J structural intake observer. It does not authorize any Query Planning execution, source-acquisition provider execution, source IO, parser execution, or downstream Evidence Lifecycle semantic task.

This package does not authorize:

- X3-B prompt/frontmatter/text edits;
- prompt-quality, report-quality, verdict-quality, evidence-sufficiency, source-reliability, or public-readiness claims;
- Query Planning runtime/model/provider execution;
- X5 hidden integration harness execution;
- X6/X7 source-acquisition harness execution;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- packet/frame/byte consumption, parsed material, source material, EvidenceCorpus, EvidenceItems, warnings, report generation, verdicts, confidence, or user-facing quality behavior;
- product/public/API/UI/report/export wiring or public V2 cutover;
- cache IO, durable runtime artifact storage, Source Reliability, ACS/direct URL execution;
- B3 proof execution, 2D-C, V1 reuse, V1 work, or V1 cleanup.

## 3. Current Live-Path Ground Truth

The current product runner path can reach the V2 shell only when:

- the submitted job stores `pipelineVariant = "claimboundary-v2"`;
- `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
- `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.

Under that path, the currently product-reachable hidden artifacts are:

- Claim Understanding runtime artifacts in the internal `v2_observability_ledger`;
- X7-J Evidence Lifecycle intake artifacts in the process-local internal intake artifact sink.

The expected ledger id for both artifact routes is:

```text
<jobId>:precutover-observability
```

X5/X6/X7-A through X7-G2 remain hidden harnesses and denial adapters. They are not product-runner live-path stages today. Their absence in an X7-K live job is expected and must not be treated as failure.

## 4. Execution Preconditions

Before any job submission:

1. This package has been accepted by Architect, Security/runtime, Code/package, and LLM/semantic review.
2. The accepted package has been committed.
3. The worktree is clean.
4. Web/API/runner runtime has been refreshed after the package commit.
5. Prompt/config reseed state or hashes are recorded. X3-B remains out of scope.
6. Runtime gates are explicit:
   - `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.
7. Admin-key access to both internal artifact routes is available.
8. The first job input is copied exactly from section 5.

## 5. Captain-Approved Inputs

Use these exact strings only:

1. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
2. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Do not paraphrase, translate, normalize, shorten, or substitute either input.

For X7-K these strings are opaque runtime payloads only. Do not evaluate claim extraction quality, query quality, language handling, evidence sufficiency, verdict direction, confidence, report quality, or comparative behavior between the two inputs.

Run the first job only. Run the second only if the first has no hard fail. Do not run a third or fourth job in X7-K.

## 6. File Envelope

X7-K is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-K_Direct_Text_X7J_Intake_Artifact_Live_Smoke_Execution_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-K package handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, model, schema, test, API/UI, `package.json`, `package-lock.json`, or script files may be changed for this package. If any source or verifier fix is needed, stop and create a separate reviewed package.

## 7. Required Pre-Run Verifiers

Package verification before commit:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

`git diff --check` does not check newly untracked files. Before package commit, stage only the exact section 6 envelope and then run `git diff --cached --check`. Expected pre-commit status: only section 6 files may be staged or dirty. Expected post-commit/pre-live status: clean worktree.

Runtime/source verification after commit and before live jobs:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
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

Unauthenticated calls must return `401`:

```powershell
$ledgerProbe = "x7k-preflight-probe:precutover-observability"
$encodedLedgerProbe = [System.Uri]::EscapeDataString($ledgerProbe)
$claimUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
$intakeUnauthorized = Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -SkipHttpErrorCheck
if ([int]$claimUnauthorized.StatusCode -ne 401) { throw "Claim Understanding route must reject unauthenticated access" }
if ([int]$intakeUnauthorized.StatusCode -ne 401) { throw "X7-J intake route must reject unauthenticated access" }
```

Authenticated unknown-ledger calls must remain bounded and internal-only. The Claim Understanding route currently returns an empty internal ledger for an unknown id. The X7-J intake route returns `404` for an unknown id and must also include `Cache-Control: no-store`:

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

Submit each job through the local API as an admin-bypass direct API job:

```powershell
$headers = @{ "X-Admin-Key" = $env:FH_ADMIN_KEY }
$body = @{
  inputType = "text"
  inputValue = "<exact Captain input>"
  pipelineVariant = "claimboundary-v2"
} | ConvertTo-Json
$job = Invoke-RestMethod -Uri "http://localhost:5000/v1/analyze" -Method Post -Headers $headers -Body $body -ContentType "application/json"
$jobId = $job.jobId
```

Poll through:

```powershell
do {
  Start-Sleep -Seconds 5
  $jobState = Invoke-RestMethod -Uri "http://localhost:5000/v1/jobs/$jobId" -Headers $headers
  $status = [string]$jobState.status
} while ($status -in @("QUEUED", "RUNNING"))
```

Inspect both hidden artifact routes:

```powershell
$ledgerId = "${jobId}:precutover-observability"
$encodedLedgerId = [System.Uri]::EscapeDataString($ledgerId)
$claimUnderstandingArtifacts = Invoke-RestMethod -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerId" -Method Get -Headers @{ "x-admin-key" = $env:FH_ADMIN_KEY }
$intakeArtifacts = Invoke-RestMethod -Uri "http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=$encodedLedgerId" -Method Get -Headers @{ "x-admin-key" = $env:FH_ADMIN_KEY }
```

## 10. Pass Criteria

Each executed job passes X7-K only if all of these are true:

- job creation and execution record the committed package/runtime revision;
- job status reaches `SUCCEEDED` without stale-runtime evidence;
- stored variant is `claimboundary-v2`;
- public V2 result remains `resultJson._schemaVersion: 4.0.0-cb-precutover` and `resultJson.meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output remains damaged/blocked and is not interpreted as a valid V2 answer;
- authenticated Claim Understanding artifact route returns at least one artifact for the expected ledger id;
- authenticated X7-J Evidence Lifecycle intake artifact route returns at least one artifact for the expected ledger id;
- authenticated X7-J Evidence Lifecycle intake artifact route success response includes `Cache-Control: no-store`;
- both artifact route responses show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- the X7-J artifact has `artifactVersion: v2.evidence-lifecycle.intake-artifact.x7j`;
- the X7-J artifact has `source: product_v2_orchestrator_after_claim_understanding`;
- the X7-J artifact has `publicCutoverStatus: blocked_precutover`;
- the X7-J artifact has `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`;
- all X7-J `downstreamExecution` flags are false;
- unauthenticated access to both artifact routes returns `401`;
- public result serialization does not expose artifact id, ledger id, artifact body, artifact sink marker, activation snapshot hash, runtime config hash, prompt hashes, rendered prompt hash, cache-decision reason, provider telemetry object, X7-J status markers, or intake artifact fields;
- no Query Planning execution, X5-X7 harness execution, source-provider/search/fetch/content-dereference/provider-network/parser execution, source material, parsed material, EvidenceCorpus, EvidenceItems, report, meaningful V2 verdict, confidence, Source Reliability, cache/storage output, ACS/direct URL behavior, B3 proof, 2D-C, V1 cleanup, or public cutover behavior appears.

X7-K pass means only that hidden direct-text runtime plumbing and the X7-J product-internal observer remained coherent and fail-closed.

## 11. Hard Fail Criteria

Stop immediately after any of these:

- worktree dirty or runtime not refreshed from the committed package revision;
- non-Captain input used;
- prompt/frontmatter/config/model/schema edit included;
- public API/UI/report/export exposes V2 as valid;
- Query Planning, X5-X7 harness, source-provider/search/fetch/content-dereference/provider-network/parser execution occurs;
- cache IO, Source Reliability, durable artifact storage, ACS/direct URL, B3, 2D-C, V1 reuse, or V1 cleanup occurs;
- EvidenceCorpus, EvidenceItems, report, meaningful verdict, confidence, or user-facing analytical warning is produced from V2 downstream denial;
- no-corpus structural denial is described as evidence scarcity, source scarcity, report quality, verdict quality, or confidence signal;
- either artifact route cannot inspect the expected ledger for the first job;
- reviewers cannot agree that the first job remained within Route B.

If the first job hard-fails, do not run the second job.

## 12. Review Questions

Architect:

- Does X7-K prove a useful runtime fact after X7-J without implying report/public readiness?
- Is the current live-path limitation around X5-X7 harness artifacts stated clearly enough?

Security/runtime:

- Are the runtime gates, admin-only artifact routes, no-public-leak checks, and stop conditions sufficient?
- Is the two-job cap acceptable under the current Captain budget?

Code/package:

- Is the docs/status/handoff-only file envelope enforceable?
- Are pre-run verifier commands and post-run inspection fields concrete enough?

LLM/semantic:

- Does the package avoid treating no-corpus structural denial as analytical evidence scarcity?
- Are the two Captain canaries used only as opaque runtime inputs, not benchmark evidence?

## 13. Completion Requirements

Before committing this package:

- record reviewer decisions in this file;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` as execution-package pointers only;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a package handoff under `Docs/AGENTS/Handoffs/`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run the package verification commands in section 7.

After live execution, create a separate result handoff that records:

- package commit;
- runtime refresh method and time;
- prompt/config reseed or hash state;
- exact inputs;
- job ids;
- hidden ledger ids;
- Claim Understanding artifact inspection results;
- X7-J intake artifact inspection results;
- public leakage check results;
- pass/fail classification;
- whether the second job was run or skipped;
- residual blockers.

The result closeout must also:

- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` with the X7-K result classification;
- append `Docs/AGENTS/Agent_Outputs.md`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run `npm run validate:v2-gates`;
- run `node scripts/validate-v2-gate-register.mjs --self-test`;
- run `git diff --check`;
- run `git status --short --untracked-files=all`;
- commit the result package separately from the executable package.

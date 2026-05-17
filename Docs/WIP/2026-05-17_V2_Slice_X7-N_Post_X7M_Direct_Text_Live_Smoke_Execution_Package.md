# V2 Slice X7-N Post-X7M Direct-Text Live-Smoke Execution Package

**Date:** 2026-05-17
**Status:** draft execution package; docs-only; live jobs allowed only after reviewer acceptance, package commit, clean worktree, runtime refresh, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `358ea6e0` (`fix: allow v2 intake artifact dotted ledger ids`)
**Parent packages:** X7-J product-internal Evidence Lifecycle intake artifact observer, X7-K direct-text live-smoke result, X7-L Claim Understanding diagnosis, X7-M Claim Understanding prompt/contract repair implementation.
**Gate type:** post-repair direct-text hidden-runtime smoke.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM/semantic APPROVE after replacing uninspectable ClaimContract body criteria with inspectable `schemaOutcome.status` and X7-J intake handoff fields, and after splitting common per-job checks from input-specific repair checks.

## 1. Purpose

Define a narrow executable package for testing the committed X7-M Claim Understanding prompt/contract repair in the product runner.

X7-K proved hidden direct-text runtime reachability and X7-J intake artifact reachability, but both Captain-approved direct-text jobs failed before meaningful downstream progress because Claim Understanding did not produce accepted `ClaimContract` output. X7-M repaired the prompt contract by:

- replacing dotted accepted-contract guidance with schema-exact nested `ClaimContract` skeletons;
- clarifying topic-neutral externally assessable direct-question handling;
- preserving strict schemas and prepared-snapshot handling.

X7-N spends at most two live jobs to verify whether the same two Captain-approved direct-text canaries now produce accepted hidden Claim Understanding contracts while public V2 output remains damaged/precutover.

X7-N is not a report-quality, evidence-quality, source-quality, verdict-quality, public-readiness, or truth-accuracy test.

## 2. Approval Requested

Approve execution of X7-N exactly under this package after reviewer acceptance and package commit.

This package authorizes, after acceptance and commit, at most two live direct-text jobs using only the Captain-approved canaries in section 5.

This package authorizes only the already-approved hidden Claim Understanding LLM/model-provider call required by the 4C3b direct-text runtime path plus the already-implemented X7-J structural intake observer. It does not authorize Query Planning execution, source-acquisition provider execution, source IO, parser execution, or downstream Evidence Lifecycle semantic tasks.

This package does not authorize:

- new prompt/frontmatter/config/model/schema edits;
- X3-B Query Planning prompt implementation;
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

X5/X6/X7-A through X7-G2 remain hidden harnesses and denial adapters. They are not product-runner live-path stages today. Their absence in an X7-N live job is expected and must not be treated as failure.

## 4. Execution Preconditions

Before any job submission:

1. This package has been accepted by Architect, Security/runtime, Code/package, and LLM/semantic review.
2. The accepted package has been committed.
3. The worktree is clean.
4. Web/API/runner runtime has been refreshed after the package commit.
5. Prompt/config reseed state or prompt hash state is recorded after X7-M.
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

For X7-N these strings are opaque runtime payloads only. Do not evaluate evidence sufficiency, verdict direction, confidence, report quality, source quality, or comparative behavior between the two inputs.

Run the first job only. Run the second only if the first has no hard fail. Do not run a third or fourth job in X7-N.

## 6. File Envelope

X7-N is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-N package handoff under `Docs/AGENTS/Handoffs/`
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

Runtime/source verification after commit and before live jobs:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
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
$ledgerProbe = "x7n-preflight-probe:precutover-observability"
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

Poll through `SUCCEEDED`, `FAILED`, or `CANCELLED`, then inspect both hidden artifact routes using ledger id:

```text
<jobId>:precutover-observability
```

## 10. Pass Criteria

Each executed job must satisfy the common criteria below. The two canary-specific repair criteria apply only to their matching input. Full X7-N pass requires all common criteria for every executed job plus all applicable canary-specific criteria for the jobs that were run.

Common per-job criteria:

- job creation and execution record the committed package/runtime revision;
- job status reaches `SUCCEEDED` without stale-runtime evidence;
- stored variant is `claimboundary-v2`;
- public V2 result remains `resultJson._schemaVersion: 4.0.0-cb-precutover` and `resultJson.meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output remains damaged/blocked and is not interpreted as a valid V2 answer;
- authenticated Claim Understanding artifact route returns at least one artifact for the expected ledger id;
- authenticated X7-J Evidence Lifecycle intake artifact route returns at least one artifact for the expected ledger id;
- authenticated X7-J Evidence Lifecycle intake artifact route success response includes `Cache-Control: no-store`;
- both artifact route responses show `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- the latest Claim Understanding artifact has `executionStatus: completed`;
- the latest Claim Understanding artifact has `gatewayTaskStatus: executable`;
- the latest Claim Understanding artifact has `inputSource: direct_input`;
- the latest Claim Understanding artifact has `schemaOutcome.status: accepted`;
- the latest Claim Understanding artifact has `schemaOutcome.blockedReason: null` and `schemaOutcome.damagedReason: null`;
- the X7-J artifact has `artifactVersion: v2.evidence-lifecycle.intake-artifact.x7j`;
- the X7-J artifact has `source: product_v2_orchestrator_after_claim_understanding`;
- the X7-J artifact has `publicCutoverStatus: blocked_precutover`;
- the X7-J artifact has `claimUnderstanding.handoffStatus: accepted`;
- the X7-J artifact has `claimUnderstanding.blockedReason: null` and `claimUnderstanding.damagedReason: null`;
- the X7-J artifact has `claimUnderstanding.selectedAtomicClaimCount >= 1`;
- the X7-J artifact has `evidenceLifecycleIntake.status: intake_ready`;
- the X7-J artifact has `evidenceLifecycleIntake.observationStatus: contract_observed_preexecution`;
- the X7-J artifact has `evidenceLifecycleIntake.claimContractPresent: true`;
- the X7-J artifact has `evidenceLifecycleIntake.executionScope: contract_only_no_provider_execution`;
- the X7-J artifact has `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`;
- all X7-J `downstreamExecution` flags are false;
- unauthenticated access to both artifact routes returns `401`;
- public result serialization does not expose artifact id, ledger id, artifact body, artifact sink marker, activation snapshot hash, runtime config hash, prompt hashes, rendered prompt hash, cache-decision reason, provider telemetry object, X7-J status markers, or intake artifact fields;
- no Query Planning execution, X5-X7 harness execution, source-provider/search/fetch/content-dereference/provider-network/parser execution, source material, parsed material, EvidenceCorpus, EvidenceItems, report, meaningful V2 verdict, confidence, Source Reliability, cache/storage output, ACS/direct URL behavior, B3 proof, 2D-C, V1 cleanup, or public cutover behavior appears.

Canary-specific repair criteria:

- the German direct-text job no longer fails with `claim_contract_validation_failed` caused by flat `input.selectedAtomicClaimIds`;
- the legal/fair-trial direct-text job no longer returns `blockedReason: no_valid_claim`.

X7-N pass means only that hidden direct-text Claim Understanding can now produce accepted internal `ClaimContract` output for the two X7-K failure cases while public behavior remains fail-closed.

## 11. Hard Fail Criteria

Stop immediately after any of these:

- worktree dirty or runtime not refreshed from the committed package revision;
- non-Captain input used;
- prompt/frontmatter/config/model/schema edit included in this execution package;
- public API/UI/report/export exposes V2 as valid;
- Query Planning, X5-X7 harness, source-provider/search/fetch/content-dereference/provider-network/parser execution occurs;
- cache IO, Source Reliability, durable artifact storage, ACS/direct URL, B3, 2D-C, V1 reuse, or V1 cleanup occurs;
- EvidenceCorpus, EvidenceItems, report, meaningful verdict, confidence, or user-facing analytical warning is produced from V2 downstream denial;
- no-corpus structural denial is described as evidence scarcity, source scarcity, report quality, verdict quality, or confidence signal;
- either artifact route cannot inspect the expected ledger for the first job;
- reviewers cannot agree that the first job remained within scope.

If the first job hard-fails, do not run the second job.

## 12. Review Questions

Architect:

- Does X7-N test the right post-X7M runtime fact without implying report/public readiness?
- Are pass/fail criteria clear enough to decide whether downstream work can resume?

Security/runtime:

- Are runtime gates, admin-only artifact routes, no-public-leak checks, and stop conditions sufficient?
- Is the two-job cap acceptable under the current Captain budget?

Code/package:

- Is the docs/status/handoff-only file envelope enforceable?
- Are pre-run verifier commands and post-run inspection fields concrete enough?

LLM/semantic:

- Does the package test the two X7-M repair hypotheses without judging truth, evidence, or report quality?
- Are the two Captain canaries used only as runtime inputs and not as prompt examples or broad benchmark claims?

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

- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` with the X7-N result classification;
- append `Docs/AGENTS/Agent_Outputs.md`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run `npm run validate:v2-gates`;
- run `node scripts/validate-v2-gate-register.mjs --self-test`;
- run `git diff --check`;
- run `git status --short --untracked-files=all`;
- commit the result package separately from the executable package.

## 14. Reviewer Decisions

LLM/semantic review: APPROVE. The package tests the two X7-M repair hypotheses directly, uses the Captain canaries only as runtime payloads, and does not judge truth, evidence, source, verdict, confidence, report, or public readiness.

Architect review: APPROVE after the section 10 correction. The package now uses inspectable artifact fields and keeps Query Planning, source execution, downstream semantics, public output, report/verdict behavior, and later gates blocked.

Security/runtime review: APPROVE. The runtime gates, two-job cap, admin-only route checks, no-public-leak criteria, stale-runtime prevention, and source/provider/parser/cache/SR/ACS/V1 exclusions are sufficient for this smoke.

Code/package review: APPROVE after the section 10 correction. The file envelope and verifier commands are enforceable, and the package no longer implies raw `ClaimContract` exposure from the Claim Understanding artifact route.

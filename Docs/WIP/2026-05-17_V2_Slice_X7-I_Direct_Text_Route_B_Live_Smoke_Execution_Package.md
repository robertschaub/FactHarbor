# V2 Slice X7-I Direct-Text Route B Live-Smoke Execution Package

**Date:** 2026-05-17
**Status:** deputy-approved execution package; docs-only; live jobs allowed only after package commit, clean worktree, runtime refresh, and pre-run verifiers
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `62d0a400` (`docs: add v2 x7h live-smoke readiness criteria`)
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-H_Direct_Text_Live_Smoke_Readiness_Criteria_Package.md`
**Route:** B - no X3-B prompt edits; hidden runtime/fail-closed smoke only

## 1. Purpose

Define a narrow executable package for a limited V2 direct-text live smoke.

X7-I exists to spend at most two live jobs only if they can prove useful runtime facts:

- the committed/refreshed product runner can still select the hidden V2 direct-text path;
- the hidden Claim Understanding runtime artifact remains inspectable through the internal admin-only ledger;
- the public V2 result remains damaged/pre-cutover and does not expose hidden runtime state;
- later source, parser, evidence, report, verdict, and public cutover behavior remains blocked.

X7-I is not an analysis-quality smoke. Passing X7-I does not mean FactHarbor can answer the submitted input with V2.

## 2. Approval Requested

Approve execution of X7-I exactly under this package after review and commit.

This package authorizes, after acceptance and commit, at most two live direct-text jobs using only the Captain-approved canaries in section 5.

This package authorizes only the already-approved hidden Claim Understanding LLM/model-provider call required by the 4C3b direct-text runtime path. It does not authorize any source-acquisition provider execution.

This package does not authorize:

- X3-B prompt/frontmatter/text edits;
- prompt-quality, report-quality, verdict-quality, evidence-sufficiency, source-reliability, or public-readiness claims;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- source material, parsed material, EvidenceCorpus, EvidenceItems, report generation, verdicts, confidence, or user-facing warnings from V2 downstream denial;
- product/public/API/UI/report/export wiring or public V2 cutover;
- cache IO, durable runtime artifact storage, Source Reliability, ACS/direct URL execution;
- B3 proof execution, 2D-C, V1 reuse, V1 work, or V1 cleanup.

## 3. Current Live-Path Ground Truth

The current product runner path can reach the V2 shell only when:

- the submitted job stores `pipelineVariant = "claimboundary-v2"`;
- `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
- `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.

Under that path, the currently product-reachable hidden artifact is the Claim Understanding runtime artifact in the internal `v2_observability_ledger`.

X5/X6/X7-A through X7-G2 are hidden harnesses and denial adapters, but they are not product-runner live-path stages today. Therefore X7-I must not require X7-F or X7-G artifacts to appear in a live job. Their absence is expected unless a separate reviewed product/orchestrator source package wires them in.

If a reviewer requires live inspection of X7-F/X7-G outputs, this package must stop before live execution and be replaced by a separate source package. Do not smuggle product/orchestrator wiring into X7-I.

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
7. Admin-key access to the internal artifact route is available.
8. The first job's planned input is copied exactly from section 5.

## 5. Captain-Approved Inputs

Use these exact strings only:

1. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
2. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Do not paraphrase, translate, normalize, shorten, or substitute either input.

For X7-I these strings are opaque runtime payloads only. Do not evaluate claim extraction quality, query quality, language handling, evidence sufficiency, verdict direction, confidence, report quality, or comparative behavior between the two inputs. The only semantic check is that no artifact or public output treats fail-closed/no-corpus behavior as analytical evidence scarcity or report quality.

Run the first job only. Run the second only if the first has no hard fail. Do not run a third or fourth job in X7-I.

## 6. File Envelope

X7-I is docs-only. The allowed package/commit envelope is limited to:

- `Docs/WIP/2026-05-17_V2_Slice_X7-I_Direct_Text_Route_B_Live_Smoke_Execution_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-I handoff under `Docs/AGENTS/Handoffs/`
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

`git diff --check` is not sufficient for a newly untracked package file until it is staged or intent-to-add. Before commit, stage only the exact file envelope in section 6, then run `git diff --cached --check`. Expected status before commit: only section 6 files may be staged or dirty. Expected status after commit and before live jobs: clean worktree.

Runtime/source verification after commit and before live jobs:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/hidden-integration-harness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.test.ts test/unit/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Do not run expensive validation suites.

Admin-only route verifier before live jobs:

```powershell
$ledgerProbe = "x7i-preflight-probe:precutover-observability"
$encodedLedgerProbe = [System.Uri]::EscapeDataString($ledgerProbe)
try {
  Invoke-WebRequest -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get | Out-Null
  throw "Artifact route must reject unauthenticated access"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw }
}
$auth = Invoke-RestMethod -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerProbe" -Method Get -Headers @{ "x-admin-key" = $env:FH_ADMIN_KEY }
if ($auth.visibility -ne "internal_admin_only" -or $auth.publicPointerExposure -ne "forbidden") { throw "Artifact route did not report internal-only visibility" }
```

## 8. Submission And Inspection Plan

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

Inspect job completion through:

- `GET http://localhost:5000/v1/jobs/<jobId>`
- the local job page only for manual sanity checks, without treating the public damaged result as report readiness.

Polling/recording skeleton:

```powershell
do {
  Start-Sleep -Seconds 5
  $jobState = Invoke-RestMethod -Uri "http://localhost:5000/v1/jobs/$jobId" -Headers $headers
  $status = [string]$jobState.status
} while ($status -in @("QUEUED", "RUNNING"))

$resultJson = $jobState.resultJson
$record = [ordered]@{
  jobId = $jobId
  status = $status
  pipelineVariant = $jobState.pipelineVariant
  executedWebGitCommitHash = $jobState.executedWebGitCommitHash
  schemaVersion = $resultJson._schemaVersion
  publicCutoverStatus = $resultJson.meta.publicCutoverStatus
  analysisIssueCode = $resultJson.meta.analysisIssueCode
}
$record
```

Inspect the hidden Claim Understanding runtime artifact through:

```text
GET http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=<url-encoded-jobId:precutover-observability>
```

with header:

```text
x-admin-key: <FH_ADMIN_KEY>
```

Expected ledger id:

```text
<jobId>:precutover-observability
```

PowerShell URL encoding:

```powershell
$ledgerId = "${jobId}:precutover-observability"
$encodedLedgerId = [System.Uri]::EscapeDataString($ledgerId)
$artifactResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=$encodedLedgerId" -Method Get -Headers @{ "x-admin-key" = $env:FH_ADMIN_KEY }
```

## 9. Pass Criteria

Each executed job passes X7-I only if all of these are true:

- job creation and execution record the committed package/runtime revision;
- job status reaches a terminal state without stale-runtime evidence;
- stored variant is `claimboundary-v2`;
- public V2 result remains `resultJson._schemaVersion: 4.0.0-cb-precutover` and `resultJson.meta.publicCutoverStatus: blocked_precutover`;
- public compatibility output, including any verdict-like field if present, remains damaged/blocked and is not interpreted as a valid V2 answer;
- authenticated hidden artifact route returns at least one Claim Understanding runtime artifact for the expected ledger id;
- hidden artifact has `visibility: internal_admin_only` and `publicPointerExposure: forbidden`;
- hidden artifact shows direct-text input source, gateway task `claim_understanding_gate1`, and no-store cache decision with `canRead: false` and `canWrite: false`;
- unauthenticated hidden artifact route access returns `401`;
- public result serialization does not expose artifact id, ledger id, activation snapshot hash, runtime config hash, prompt hashes, rendered prompt hash, cache-decision reason, provider telemetry object, or artifact sink marker;
- no source-provider/search/fetch/content-dereference/provider-network/parser execution is observed;
- no source material, parsed material, EvidenceCorpus, EvidenceItems, report, meaningful V2 verdict, confidence, Source Reliability, cache/storage output, ACS/direct URL behavior, B3 proof, 2D-C, V1 cleanup, or public cutover behavior appears.

X7-I pass means only that hidden direct-text runtime plumbing remained coherent and fail-closed.

## 10. Hard Fail Criteria

Stop immediately after any of these:

- worktree dirty or runtime not refreshed from the committed package revision;
- non-Captain input used;
- prompt/frontmatter/config/model/schema edit included;
- public API/UI/report/export exposes V2 as valid;
- source-provider/search/fetch/content-dereference/provider-network/parser execution occurs;
- cache IO, Source Reliability, durable artifact storage, ACS/direct URL, B3, 2D-C, V1 reuse, or V1 cleanup occurs;
- EvidenceCorpus, EvidenceItems, report, meaningful verdict, confidence, or user-facing analytical warning is produced from V2 downstream denial;
- no-corpus structural denial is described as evidence scarcity, source scarcity, report quality, verdict quality, or confidence signal;
- hidden artifact route cannot inspect the Claim Understanding artifact for the first job;
- reviewers cannot agree that the first job remained within Route B.

If the first job hard-fails, do not run the second job.

## 11. Review Questions

Architect:

- Does X7-I prove a useful runtime fact without implying report/public readiness?
- Is the current-live-path limitation around X5/X7 harness artifacts stated clearly enough?

Security/runtime:

- Are the runtime gates, admin-only artifact route, no-public-leak checks, and stop conditions sufficient?
- Is the two-job cap acceptable under the current Captain budget?

Code/package:

- Is the docs/status/handoff-only file envelope enforceable?
- Are pre-run verifier commands and post-run inspection fields concrete enough?

LLM/semantic:

- Does the package avoid treating no-corpus structural denial as analytical evidence scarcity?
- Are the two Captain canaries used only as opaque runtime inputs, not benchmark evidence?

## 12. Review Result

Architect, Security/runtime, Code/package, and LLM/semantic reviewers approved after required modifications.

Consolidated acceptance:

- Route B is approved for this package only: no X3-B prompt edits and no prompt/report/verdict/evidence-quality claims.
- The allowed live execution is limited to the already-approved hidden Claim Understanding LLM/model-provider call in the 4C3b direct-text runtime path.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution remains forbidden.
- The current live-path truth is explicit: product runner can inspect Claim Understanding runtime artifacts only; X5-X7 artifacts are not product-wired and must not be expected.
- The two Captain canaries are opaque runtime payloads only.
- Execution is capped at two jobs, with the first job inspected before any second job.
- Package commit, clean worktree, runtime refresh, pre-run verifiers, and admin-only route verifier are required before submission.

## 13. Completion Requirements

Before committing this package:

- record reviewer decisions in this file;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` as execution-package pointers only;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff under `Docs/AGENTS/Handoffs/`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run the package verification commands in section 7.

After live execution, create a separate result handoff that records:

- package commit;
- runtime refresh method and time;
- prompt/config reseed or hash state;
- exact input(s);
- job id(s);
- hidden ledger id(s);
- artifact inspection result(s);
- public leakage check result(s);
- pass/fail classification;
- whether the second job was run or skipped;
- residual blockers.

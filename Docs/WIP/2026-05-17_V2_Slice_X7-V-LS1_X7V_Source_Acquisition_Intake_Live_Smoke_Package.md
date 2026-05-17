# V2 Slice X7-V-LS1 X7-V Source Acquisition Intake Live-Smoke Package

**Date:** 2026-05-17
**Status:** reviewer-approved execution package; docs-only; one live job allowed only after package commit, clean worktree, runtime refresh, route preflight, and verifiers
**Owner:** Lead Developer / Captain Deputy
**Baseline:** `91fdd9d5` (`feat: add v2 source acquisition intake boundary`)
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md`

## 1. Purpose

X7-V-LS1 proves one product-route fact after X7-V: a committed/refreshed V2 product job can write the hidden admin-only Source Acquisition intake artifact as `intake_ready_not_executable` after accepted Query Planning, while public V2 remains damaged/precutover and hidden markers do not leak.

X7-V-LS1 is not a Source Acquisition execution gate, source-quality gate, evidence-quality gate, report-quality gate, public-readiness gate, or legal/truth/fairness benchmark.

## 2. Authorization

This package authorizes exactly one live direct-text job using the exact Captain-defined input in section 5.

Allowed runtime behavior:

- already-approved hidden Claim Understanding runtime/model call;
- already-approved hidden Query Planning runtime/model call;
- X7-J Evidence Lifecycle intake artifact write/read;
- X7-O Query Planning pre-execution observation artifact write/read;
- X7-S Query Planning runtime artifact write/read;
- X7-V Source Acquisition intake artifact write/read;
- public damaged/precutover V2 envelope.

Forbidden behavior:

- source/search/fetch/provider-network/content-dereference/parser/Source Reliability/cache/durable-storage IO;
- Source Acquisition structural executor invocation;
- source material, parsed material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public answer generation;
- prompt/config/schema/model/provider edits;
- product API/UI/report/export public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup;
- additional live jobs, retries, replacement canaries, benchmark batches, or expensive validation suites.

## 3. Runtime Gates

The product runner may reach the X7-V-LS1 path only when the actual web/runner process has:

```text
FH_ANALYZER_V2_SHELL=enabled
FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text
FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text
```

Use `FH_ANALYZER_V2_SHELL=enabled`, not the broader global pipeline override.

The expected hidden ledger id is:

```text
<jobId>:precutover-observability
```

The intended hidden path is:

```text
Claim Understanding accepted
  -> X7-J intake_ready
  -> X7-O Query Planning prerequisites observed
  -> X7-S Query Planning accepted
  -> Source Acquisition handoff ready_not_executable
  -> X7-V intake_ready_not_executable
  -> public damaged/precutover envelope unchanged
```

## 4. File Envelope

X7-V-LS1 is docs-only before live execution. The allowed package commit envelope is:

- `Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-V-LS1_X7V_Live_Smoke_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-17_LLM_Expert_V2_Team_Debate_Consolidated_Direction.md` as governance context reserving `X7-W` for a later candidate-runtime admission proposal
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, schema, model, provider, test, script, route, package, API/UI, or lockfile edits are allowed in this package.

## 5. Captain-Defined Input

Use exactly this string:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

Do not paraphrase, translate, normalize, shorten, or substitute it. Treat it only as an opaque runtime payload.

## 6. Package Verifiers Before Commit

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Stage by explicit path only. After staging:

```powershell
git diff --cached --check
$expected = @(
  "Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Smoke_Package.md",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-V-LS1_X7V_Live_Smoke_Package.md",
  "Docs/AGENTS/Handoffs/2026-05-17_LLM_Expert_V2_Team_Debate_Consolidated_Direction.md",
  "Docs/AGENTS/index/handoff-index.json"
) | Sort-Object
$actual = @(git diff --cached --name-only) | Sort-Object
if (($actual -join "`n") -ne ($expected -join "`n")) {
  throw "Staged files do not match the X7-V-LS1 docs-only envelope"
}
```

## 7. Runtime Verifiers Before Live Job

After package commit and runtime refresh:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Immediately before submission:

```powershell
$beforeIdle = git status --short --untracked-files=all
if ($beforeIdle) { throw "X7-V-LS1 pre-submission worktree is dirty before idle checkpoint" }
Start-Sleep -Seconds 60
$afterIdle = git status --short --untracked-files=all
if ($afterIdle) { throw "X7-V-LS1 pre-submission worktree became dirty during idle checkpoint" }
```

## 8. Admin Route Preflight

Before job submission, prove all five hidden artifact routes are admin-only and bounded:

- `/api/internal/analyzer-v2/claim-understanding-runtime-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts`

Unauthenticated access must return `401`. Authenticated unknown-ledger access must be no-store, internal-only, non-enumerating, bounded, and must not echo secrets, env values, or unbounded route state. For missing ledger ids, X7-J/X7-O/X7-S/X7-V routes should return `404`; Claim Understanding may return an empty internal ledger for unknown ids.

## 9. Submission Plan

Record package/runtime revision and prompt hash before submission:

```powershell
$packageRevision = (git rev-parse HEAD).Trim()
$promptHash = (Get-FileHash apps/web/prompts/claimboundary-v2.prompt.md -Algorithm SHA256).Hash
git status --short --untracked-files=all
```

Submit one admin-bypass direct API job:

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

Poll to `SUCCEEDED`, `FAILED`, or `CANCELLED`. The first runner preparation event must show `pipeline: claimboundary-v2`; if it shows `pipeline: claimboundary`, cancel and hard-fail.

## 10. Pass Criteria

X7-V-LS1 passes only if all conditions hold:

- the job uses the exact section 5 input and no second job is submitted;
- job reaches `SUCCEEDED`;
- created/executed revision matches the committed package/runtime revision without dirty suffix;
- pre-live and post-inspection worktree checkpoints are clean;
- runner events show `pipeline: claimboundary-v2` and no V1 search/fetch/XLSX/Source Reliability/clustering/verdict behavior;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`, `publicCutoverStatus: blocked_precutover`, and damaged/non-answering;
- unauthenticated artifact routes reject access;
- non-admin public response contains no ledger id, hidden route names, internal artifact keys, hidden hashes, provider telemetry, query text, source material, evidence, report, verdict, or `internal_admin_only` labels;
- Claim Understanding artifact exists for the ledger and is accepted;
- X7-J artifact exists and has `evidenceLifecycleIntake.status: intake_ready`;
- X7-O artifact exists and has `preexecutionObservation.status: structural_prerequisites_observed_not_executed_precutover`;
- X7-S artifact exists and has accepted Query Planning with at least one bounded query entry, but no source execution;
- X7-V artifact exists and has `sourceAcquisitionIntake.status: intake_ready_not_executable`;
- X7-V artifact has `visibility: internal_admin_only`, `publicPointerExposure: forbidden`, `publicCutoverStatus: blocked_precutover`, and counts/statuses only;
- all source execution/materialization flags remain false: no provider network execution, search/fetch/content dereference, parser execution, cache read/write, Source Reliability call, source material, EvidenceCorpus, report, or verdict.

## 11. Hard Fail Criteria

Stop and record failure if:

- package/runtime/worktree provenance is dirty or stale;
- runtime process gate proof is missing;
- route auth/no-store/bounds preflight fails;
- any public hidden marker leaks;
- V1 fallback or V1 work appears;
- X7-S is not accepted;
- X7-V artifact is missing or not `intake_ready_not_executable`;
- source execution, source material, EvidenceCorpus, parser, cache/SR/storage, report/verdict/confidence, or public-cutover behavior appears;
- any source/prompt/config/schema/model/provider/test/script edit is needed.

Do not repair inside X7-V-LS1. Create a separate reviewed fix package if needed.

## 12. Review Decisions

| Role | Reviewer | Date | Decision | Required Constraints |
|---|---|---:|---|---|
| Senior architect | Nietzsche | 2026-05-17 | APPROVE | One exact Captain input; prove CU/X7-J/X7-O/X7-S/X7-V same-ledger continuity; public remains pre-cutover; no source execution inference. |
| Security/runtime | Schrodinger | 2026-05-17 | APPROVE | Admin-only/no-store/non-enumerating route preflight; hard stop on auth/cacheability/public leak/stale runtime/dirty worktree/unexpected execution. |
| Code/package | Kepler | 2026-05-17 | APPROVE | Docs-only envelope, explicit staged-path assertion, focused verifiers, one primary job only. |
| LLM/semantic | Raman | 2026-05-17 | APPROVE | Input is opaque payload only; no legal/truth/fairness/report/source/evidence-quality conclusion; no prompt/schema/model edits. |

## 13. Completion Requirements

Before live execution, commit this docs-only package and its status/handoff/index updates. After live execution, create a separate result closeout recording:

- package commit and runtime refresh method;
- effective process gate proof;
- prompt hash or reseed state;
- clean/idle status checkpoints;
- job id and ledger id;
- route auth/preflight results;
- public non-leak result;
- artifact summaries for Claim Understanding, X7-J, X7-O, X7-S, and X7-V;
- pass/fail classification and residual blockers.

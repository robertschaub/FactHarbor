# V2 Slice X7-W2-LS1 Candidate-Provider Network Live-Smoke Package

**Date:** 2026-05-18
**Status:** reviewer-approved execution package; docs-only; one live job allowed only after package commit, clean worktree, runtime refresh, route preflight, and verifiers
**Owner:** Lead Developer / Captain Deputy
**Baseline:** `ff6f6a01` (`feat: add v2 hidden candidate provider network`)
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`

## 1. Purpose

X7-W2-LS1 proves one product-route fact after X7-W2: a committed/refreshed V2 product job can reach the hidden product-owned candidate-provider network loop, call the one W2-approved Wikimedia Core REST Search endpoint through the existing 7N-3B2 boundary, and record bounded admin-only network attempt/candidate telemetry while public V2 remains damaged/precutover and hidden markers do not leak.

X7-W2-LS1 is not a source-quality gate, report-quality gate, evidence-quality gate, public-readiness gate, provider-portfolio decision, long-term Wikimedia endorsement, legal/truth/fairness benchmark, or V1-cleanup gate.

## 2. Authorization

This package authorizes exactly one live direct-text job using the exact Captain-defined input in section 5.

Allowed runtime behavior:

- already-approved hidden Claim Understanding runtime/model call;
- already-approved hidden Query Planning runtime/model call;
- X7-J Evidence Lifecycle intake artifact write/read;
- X7-O Query Planning pre-execution observation artifact write/read;
- X7-S Query Planning runtime artifact write/read;
- X7-V Source Acquisition intake artifact write/read;
- X7-W1A candidate-runtime admission artifact write/read;
- X7-W1B closed local no-IO candidate-runtime loop artifact write/read;
- X7-W2 candidate-provider network loop through the existing 7N-3B2 SDK-free provider-network boundary;
- one approved Wikimedia Core REST Search page-search endpoint only;
- public damaged/precutover V2 envelope.

Forbidden behavior:

- source material, content dereference, parser execution, parsed material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public answer generation;
- arbitrary URL dereference, general web search, provider portfolio expansion, redirects, proxy use, provider SDKs, credentials, cache IO, durable storage, or Source Reliability calls;
- prompt/config/schema/model/provider/source/test/script edits;
- product API/UI/report/export public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup;
- additional live jobs, retries, replacement canaries, benchmark batches, or expensive validation suites.

## 3. Runtime Gates

The product runner may reach the X7-W2-LS1 path only when the actual web/runner process has:

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
  -> X7-W1A admission_ready_no_runtime_execution
  -> X7-W1B closed_loop_completed_no_source_candidates
  -> X7-W2 candidate_provider_network_completed
  -> public damaged/precutover envelope unchanged
```

## 4. Endpoint Status Check

Before package commit and again before live submission, re-check official Wikimedia status/deprecation documentation. The May 18, 2026 check found:

- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation` says `api.wikimedia.org` API endpoints are currently working normally and that gradual deprecation starts in July 2026.
- The same page lists Core Search content as `GET /core/v1/{project}/{language}/search/page` and maps it to the MediaWiki REST equivalent route.
- `https://api.wikimedia.org/wiki/API_reference/Core/Search/Search_content` now redirects to the deprecation page and must not be treated as an independent long-term stability promise.

Stop before live submission if the endpoint is no longer working normally, has already entered behavior-changing deprecation, redirects to a different route, requires credentials, changes response shape away from JSON `pages`, or appears rate-gated beyond the W2 budget.

## 5. Captain-Defined Input

Use exactly this string:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

Do not paraphrase, translate, normalize, shorten, or substitute it. Treat it only as an opaque runtime payload.

## 6. File Envelope

X7-W2-LS1 is docs-only before live execution. The allowed package commit envelope is:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS1_Candidate_Provider_Network_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS1_Live_Smoke_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, schema, model, provider, test, script, route, package, API/UI, lockfile, or generated deck edits are allowed in this package.

## 7. Package Verifiers Before Commit

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
  "Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS1_Candidate_Provider_Network_Live_Smoke_Package.md",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS1_Live_Smoke_Package.md",
  "Docs/AGENTS/index/handoff-index.json"
) | Sort-Object
$actual = @(git diff --cached --name-only) | Sort-Object
if (($actual -join "`n") -ne ($expected -join "`n")) {
  throw "Staged files do not match the X7-W2-LS1 docs-only envelope"
}
```

## 8. Runtime Verifiers Before Live Job

After package commit and runtime refresh:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Runtime gate proof before using the one live-job slot:

```powershell
$requiredWebFlags = @{
  FH_ANALYZER_V2_SHELL = "enabled"
  FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME = "enabled_hidden_direct_text"
  FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME = "enabled_hidden_direct_text"
}
$envLocal = Get-Content apps/web/.env.local -ErrorAction Stop
foreach ($entry in $requiredWebFlags.GetEnumerator()) {
  $pattern = "^$($entry.Key)=$([Regex]::Escape($entry.Value))$"
  if (-not ($envLocal | Select-String -Pattern $pattern -Quiet)) {
    throw "apps/web/.env.local does not contain required V2 gate $($entry.Key)"
  }
}
$version = Invoke-RestMethod -Uri "http://localhost:3000/api/version" -Method Get
if (-not $version) { throw "Web process version route did not respond" }
```

This proof confirms the source of values that `scripts/restart-clean.ps1` injects into the web process and that the refreshed web process is reachable. It is not a substitute for the first runner event check; if the submitted job does not first prepare `pipeline: claimboundary-v2`, cancel and hard-fail.

Immediately before submission:

```powershell
$beforeIdle = git status --short --untracked-files=all
if ($beforeIdle) { throw "X7-W2-LS1 pre-submission worktree is dirty before idle checkpoint" }
Start-Sleep -Seconds 60
$afterIdle = git status --short --untracked-files=all
if ($afterIdle) { throw "X7-W2-LS1 pre-submission worktree became dirty during idle checkpoint" }
```

## 9. Admin Route Preflight

Before job submission, prove all six hidden artifact routes are admin-only and bounded:

- `/api/internal/analyzer-v2/claim-understanding-runtime-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts`

Unauthenticated access must return `401`. Authenticated unknown-ledger access must be no-store, internal-only, non-enumerating, bounded, and must not echo secrets, env values, raw query text, source-language text, provider request data, provider response data, candidate titles/excerpts/URLs, or unbounded route state.

Executable preflight:

```powershell
$routes = @(
  "/api/internal/analyzer-v2/claim-understanding-runtime-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts"
)
$ledgerProbe = "x7-w2-ls1-preflight-unknown:precutover-observability"
$adminHeaders = @{ "X-Admin-Key" = $env:FH_ADMIN_KEY }
foreach ($route in $routes) {
  $url = "http://localhost:3000$route?ledgerId=$ledgerProbe"
  $unauth = Invoke-WebRequest -Uri $url -Method Get -SkipHttpErrorCheck
  if ([int]$unauth.StatusCode -ne 401) {
    throw "Unauthenticated route did not return 401: $route"
  }
  $auth = Invoke-WebRequest -Uri $url -Method Get -Headers $adminHeaders -SkipHttpErrorCheck
  $allowedStatuses = if ($route -like "*claim-understanding-runtime-artifacts") { @(200) } else { @(404) }
  if ($allowedStatuses -notcontains [int]$auth.StatusCode) {
    throw "Authenticated unknown-ledger route returned unexpected status $($auth.StatusCode): $route"
  }
  $cacheControl = ($auth.Headers["Cache-Control"] -join ",")
  if ($cacheControl -notmatch "no-store") {
    throw "Authenticated route is not no-store: $route"
  }
  if ($auth.Content.Length -gt 24576) {
    throw "Authenticated unknown-ledger response too large: $route"
  }
  foreach ($forbidden in @("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "providerRequest", "providerResponse", "candidateUrl", "queryText")) {
    if ($auth.Content -match $forbidden) {
      throw "Authenticated unknown-ledger response leaked forbidden marker $forbidden: $route"
    }
  }
}
```

## 10. Submission Plan

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

## 11. Pass Criteria

X7-W2-LS1 passes only if all conditions hold:

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
- X7-S artifact exists and has accepted Query Planning with at least one bounded query entry, but no source material or downstream execution;
- X7-V artifact exists and has `sourceAcquisitionIntake.status: intake_ready_not_executable`;
- X7-W2 artifact exists and has `networkLoop.status: candidate_provider_network_completed`;
- X7-W2 artifact records bounded admin-only attempt/count/timing/byte/cost/outcome telemetry, with fixed dollar cost `0`;
- X7-W2 artifact uses only `wikimedia_core`, `ep_wikimedia_core_page_search`, `api.wikimedia.org`, `/core/v1/wikipedia/en/search/page`, `GET`, q-only request mapping, redirect `deny`, proxy `none`, no credentials, and JSON `pages` candidate source;
- X7-W2 artifact exposes no raw query text, source-language text, provider request, provider response, candidate title, candidate excerpt, candidate URL, source material, or content bytes;
- all source materialization flags remain false: no content dereference, parser execution, cache read/write, Source Reliability call, source material, EvidenceCorpus, report, verdict, warning, or confidence.

## 12. Hard Fail Criteria

Stop and record failure if:

- package/runtime/worktree provenance is dirty or stale;
- endpoint status check fails or the endpoint no longer matches the W2 package;
- runtime process gate proof is missing;
- route auth/no-store/bounds preflight fails;
- any public hidden marker leaks;
- V1 fallback or V1 work appears;
- X7-S is not accepted;
- X7-W2 artifact is missing or not `candidate_provider_network_completed`;
- network execution touches any provider/endpoint/request parameter outside W2;
- raw query/provider/candidate payload leaks into hidden artifacts or public output;
- source material, content dereference, parser, cache/SR/storage, EvidenceCorpus, report/verdict/confidence, or public-cutover behavior appears;
- any source/prompt/config/schema/model/provider/test/script edit is needed.

Do not repair inside X7-W2-LS1. Create a separate reviewed fix package if needed.

## 13. Review Decisions

| Role | Reviewer | Date | Decision | Required Constraints |
|---|---|---:|---|---|
| Lead Developer / Captain Deputy | Codex | 2026-05-18 | APPROVE | One exact Captain input; one W2 endpoint; hidden artifacts only; no content/source material; public remains pre-cutover; endpoint status check required. |
| Claude Opus 4.6 senior architect/security | Claude Opus 4.6 via `scripts/agents/invoke-claude.cjs` | 2026-05-18 | APPROVE | Safe and narrow for commit/live execution. Requested executor awareness for explicit admin-route probes and runtime-gate proof; both are incorporated in sections 8 and 9. |

## 14. Completion Requirements

Before live execution, commit this docs-only package and its status/handoff/index updates. After live execution, create a separate result closeout recording:

- package commit and runtime refresh method;
- effective process gate proof;
- official endpoint status/deprecation re-check result;
- prompt hash or reseed state;
- clean/idle status checkpoints;
- job id and ledger id;
- route auth/preflight results;
- public-result leak check;
- hidden artifact summaries for Claim Understanding, X7-J, X7-O, X7-S, X7-V, and X7-W2;
- exact W2 provider-network endpoint posture observed;
- pass/fail classification;
- residual risks and non-authorizations.

Then append `Docs/AGENTS/Agent_Outputs.md`, create a completion handoff under `Docs/AGENTS/Handoffs/`, update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`, run `npm run index`, and commit the result package by explicit path only.

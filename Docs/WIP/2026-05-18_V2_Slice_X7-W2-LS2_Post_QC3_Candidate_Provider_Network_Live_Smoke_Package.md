# V2 Slice X7-W2-LS2 Post-QC3 Candidate-Provider Network Live-Smoke Package

**Date:** 2026-05-18
**Status:** Claude Opus-reviewed execution package; docs-only; one live job allowed only after package commit, clean worktree, runtime refresh, endpoint re-check, route preflight, and verifiers
**Owner:** Lead Developer / Captain Deputy
**Parent implementation:** `c2fdcd9c` (`feat: align v2 w2 query cap`)
**Parent package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md`

## 1. Purpose

X7-W2-LS2 is the first live-smoke package after QC3. It verifies one product-route fact only:

```text
committed/refreshed claimboundary-v2 job
  -> accepted hidden Claim Understanding
  -> accepted hidden Query Planning
  -> W2 candidate-provider network completed through the one approved Wikimedia endpoint
  -> bounded admin-only W2 network telemetry exists
  -> public V2 result remains damaged/precutover and does not expose hidden internals
```

LS2 is not a source-quality gate, report-quality gate, public-readiness gate, provider-portfolio decision, long-term Wikimedia endorsement, legal/truth/fairness benchmark, or V1-cleanup gate.

## 2. Authorization

After this docs-only package is committed, the worktree is clean, runtime is refreshed, endpoint status is re-checked, required verifiers pass, and admin-route preflight passes, LS2 authorizes exactly one live job using the exact Captain-defined input in section 5.

Allowed runtime behavior:

- already-approved hidden Claim Understanding runtime/model call;
- already-approved hidden Query Planning runtime/model call;
- X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2 internal artifact write/read;
- W2 candidate-provider network loop through the existing 7N-3B2 SDK-free provider-network boundary;
- one approved Wikimedia Core REST Search page-search endpoint only;
- public damaged/precutover V2 envelope.

Forbidden behavior:

- source material, content dereference, parser execution, parsed material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, truth percentage, or public answer generation;
- arbitrary URL dereference, general web search, provider portfolio expansion, redirects, proxy use, provider SDKs, credentials, cache IO, durable storage, or Source Reliability calls;
- prompt/config/schema/model/provider/source/test/script edits;
- product API/UI/report/export public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup;
- additional live jobs, retries, replacement canaries, benchmark batches, or expensive validation suites.

## 3. Why This Input

LS2 uses the exact Captain-defined English input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Rationale:

- it is already on the Captain-defined input list;
- QC2 measured this input at `queryEntryCount = 3`, so it is likely to exercise the post-QC3 cap path rather than only the old cap-compatible path;
- it is shorter and lower-complexity than the legal-question input;
- the W2 endpoint is fixed to English Wikipedia for this hidden proof, so an English input is a better fit for provider-network reachability than the German LS1 input;
- it remains an opaque runtime payload; LS2 must not draw report, truth, evidence, or source-quality conclusions from it.

Do not paraphrase, translate, normalize, shorten, or substitute this input.

## 4. Endpoint Status Check

Official documentation re-checked on 2026-05-18:

- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation` states that `api.wikimedia.org` API endpoints are working normally, with gradual deprecation beginning in July 2026.
- The same page lists the Core API URL format `https://api.wikimedia.org/core/v1/{project}/{language}/{endpoint}` and lists `GET /core/v1/{project}/{language}/search/page`.
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en` documents `GET /search/page?q=search terms`, JSON content type, and a `pages` array in successful responses.
- The MediaWiki reference documents optional `limit`, but W2 remains q-only because the existing approved 7N-3B2 endpoint contract does not allow fixed literal request parameters in W2.

Before live submission, re-check these official pages again. Stop if the endpoint is no longer working normally, has entered behavior-changing deprecation, redirects to a different route, requires credentials, changes response shape away from JSON `pages`, or appears rate-gated beyond the W2 budget.

## 5. Runtime Gates

The refreshed web/runner process must have:

```text
FH_ANALYZER_V2_SHELL=enabled
FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text
FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text
```

Use `FH_ANALYZER_V2_SHELL=enabled`, not the broader global pipeline override.

Expected ledger id:

```text
<jobId>:precutover-observability
```

## 6. File Envelope

LS2 is docs-only before live execution. Allowed package files:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS2_Live_Smoke_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, schema, model, provider, test, script, route, package, API/UI, lockfile, deck, or generated artifact edits are allowed in this package.

## 7. Package Verifiers Before Commit

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Stage by explicit path only and verify the staged file list matches section 6.

Executable staged-envelope proof:

```powershell
git diff --cached --check
$expected = @(
  "Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Smoke_Package.md",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS2_Live_Smoke_Package.md",
  "Docs/AGENTS/index/handoff-index.json"
) | Sort-Object
$actual = @(git diff --cached --name-only) | Sort-Object
if (($actual -join "`n") -ne ($expected -join "`n")) {
  throw "Staged files do not match the X7-W2-LS2 docs-only envelope"
}
```

## 8. Runtime Verifiers Before Live Job

After package commit and runtime refresh:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all
```

Runtime gate proof:

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

Idle checkpoint before submission:

```powershell
$beforeIdle = git status --short --untracked-files=all
if ($beforeIdle) { throw "X7-W2-LS2 pre-submission worktree is dirty before idle checkpoint" }
Start-Sleep -Seconds 60
$afterIdle = git status --short --untracked-files=all
if ($afterIdle) { throw "X7-W2-LS2 pre-submission worktree became dirty during idle checkpoint" }
```

## 9. Admin Route Preflight

Before submission, prove these hidden artifact routes are admin-only and no-store:

- `/api/internal/analyzer-v2/claim-understanding-runtime-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts`
- `/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts`
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
  "/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts",
  "/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts"
)
$ledgerProbe = "x7-w2-ls2-preflight-unknown:precutover-observability"
$adminHeaders = @{ "X-Admin-Key" = $env:FH_ADMIN_KEY }
foreach ($route in $routes) {
  $url = "http://localhost:3000${route}?ledgerId=$ledgerProbe"
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
      throw "Authenticated unknown-ledger response leaked forbidden marker ${forbidden}: $route"
    }
  }
}
```

## 10. Submission Plan

Record package/runtime revision and prompt hash:

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
  inputValue = "Using hydrogen for cars is more efficient than using electricity"
  pipelineVariant = "claimboundary-v2"
} | ConvertTo-Json
$job = Invoke-RestMethod -Uri "http://localhost:5000/v1/analyze" -Method Post -Headers $headers -Body $body -ContentType "application/json"
$jobId = $job.jobId
```

Poll to `SUCCEEDED`, `FAILED`, or `CANCELLED`. The first runner preparation event must show `pipeline: claimboundary-v2`; if it shows `pipeline: claimboundary`, cancel and hard-fail. Treat event messages as scalar strings before matching to avoid the LS1 polling bug.

## 11. Pass Criteria

LS2 passes only if all conditions hold:

- exactly one job is submitted with the exact section 3 input;
- job reaches `SUCCEEDED`;
- created/executed revision matches the committed package/runtime revision without dirty suffix;
- first preparation event shows `pipeline: claimboundary-v2`;
- public result remains `_schemaVersion: 4.0.0-cb-precutover`, `publicCutoverStatus: blocked_precutover`, and damaged/non-answering;
- non-admin public response contains no ledger id, hidden route names, internal artifact keys, hidden hashes, provider telemetry, query text, source material, evidence, report, verdict, or `internal_admin_only` labels;
- Claim Understanding artifact exists and is accepted;
- X7-J artifact exists and has `evidenceLifecycleIntake.status: intake_ready`;
- X7-O artifact exists and has `preexecutionObservation.status: structural_prerequisites_observed_not_executed_precutover`;
- X7-S artifact exists and has accepted Query Planning with at least three and at most six bounded query entries, or at least one bounded query entry if the model emits fewer in this live run;
- X7-V artifact exists and has `sourceAcquisitionIntake.status: intake_ready_not_executable`;
- X7-W1A artifact exists and has `candidateRuntimeAdmission.status: admission_ready_no_runtime_execution` with no raw query/provider/candidate payload;
- X7-W1B artifact exists and has `candidateRuntimeClosedLoop.status: closed_loop_completed_no_source_candidates` with no raw query/provider/candidate payload;
- X7-W2 artifact exists and has `candidateProviderNetwork.status: candidate_provider_network_completed`;
- W2 artifact records bounded admin-only provider attempt/count/timing/byte/cost/outcome telemetry with fixed dollar cost `0`;
- W2 uses only `wikimedia_core`, `ep_wikimedia_core_page_search`, `api.wikimedia.org`, `/core/v1/wikipedia/en/search/page`, `GET`, q-only request mapping, redirect `deny`, proxy `none`, no credentials, and JSON `pages` candidate source;
- W2 artifact exposes no raw query text, source-language text, provider request, provider response, candidate title, candidate excerpt, candidate URL, source material, or content bytes;
- all source materialization and downstream flags remain false: no content dereference, parser execution, cache read/write, Source Reliability call, source material, EvidenceCorpus, report, verdict, warning, or confidence.

## 12. Hard Fail Criteria

Stop and record failure if:

- package/runtime/worktree provenance is dirty or stale;
- endpoint status check fails;
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

Do not repair inside LS2. Create a separate reviewed fix package if needed.

## 13. Completion Requirements

Before live execution, commit this docs-only package and its status/handoff/index updates. After live execution, create a separate result closeout recording:

- package commit and runtime refresh method;
- official endpoint status/deprecation re-check result;
- process gate proof;
- prompt hash/reseed state;
- clean/idle status checkpoints;
- job id and ledger id;
- route auth/preflight results;
- public-result leak check;
- hidden artifact summaries for Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2;
- W2 provider-network endpoint posture observed;
- pass/fail classification;
- residual risks and non-authorizations.

Then append `Docs/AGENTS/Agent_Outputs.md`, create a completion handoff under `Docs/AGENTS/Handoffs/`, update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`, run `npm run index`, and commit the result package by explicit path only.

## 14. Review Decisions

| Role | Reviewer | Date | Decision | Required Constraints |
|---|---|---:|---|---|
| Lead Developer / Captain Deputy | Codex | 2026-05-18 | APPROVE | One exact Captain input; one W2 endpoint; hidden artifacts only; no content/source material; public remains pre-cutover; endpoint status check required. |
| Claude Opus 4.6 senior architect/security | Claude Opus 4.6 via `scripts/agents/invoke-claude.cjs` | 2026-05-18 | APPROVE after required edits | Add W1A/W1B artifact routes to admin preflight and add W1A/W1B artifact pass criteria. Both edits are incorporated in sections 8, 9, 11, and 13. |

## 15. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Smoke_Package.md`.

Return `approve`, `modify`, or `reject`.

Check whether LS2 is a safe one-job post-QC3 live provider-network smoke. Pay attention to:

- exact Captain-defined input choice;
- no live job before package commit, runtime refresh, endpoint re-check, route preflight, and verifiers;
- one provider only;
- no source material/content/parser/cache/SR/storage/EvidenceCorpus/report/verdict/warning/confidence/public behavior;
- hidden artifact leakage controls;
- public pre-cutover/damaged output requirement;
- no retries or second canary inside LS2;
- hard-fail behavior on V1 fallback, hidden leaks, endpoint drift, or any need for code/prompt/config edits.

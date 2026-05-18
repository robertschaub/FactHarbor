# V2 Slice X7-W2-LS3 DIAG2 Transport Diagnostics Live-Smoke Package

**Date:** 2026-05-18
**Status:** Claude Opus-reviewed and approved; docs-only; one live job allowed only after package commit, clean worktree, runtime refresh, endpoint re-check, route preflight, and verifiers
**Owner:** Lead Developer / Captain Deputy
**Parent implementation:** `b7684f97` (`feat: add v2 w2 transport diagnostics`)
**Parent package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG2_Sanitized_Transport_Diagnostics_Source_Package.md`

## 1. Purpose

X7-W2-LS3 is a diagnostic live smoke after DIAG2. It must answer one narrow question:

```text
Can a committed/refreshed claimboundary-v2 live job reach W2 and record the new
bounded hidden transport diagnostics for each W2 network attempt?
```

LS3 is not a provider-success gate, source-quality gate, report-quality gate, public-readiness gate, provider-portfolio decision, Wikimedia endorsement, or V1-cleanup gate.

## 2. Authorization

After this docs-only package is committed and all pre-live checks pass, LS3 authorizes exactly one live job using the exact Captain-defined input in section 4.

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
- source/prompt/config/schema/model/provider/test/script edits;
- product API/UI/report/export public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup;
- additional live jobs, retries, replacement canaries, benchmark batches, or expensive validation suites.

## 3. Diagnostic Pass Bar

LS3 passes its diagnostic objective if:

- the job reaches `SUCCEEDED`;
- the first preparation event shows `pipeline: claimboundary-v2`;
- package/runtime provenance is clean and matches the committed LS3 package revision;
- public V2 output remains `4.0.0-cb-precutover` / `blocked_precutover` and leaks no hidden markers;
- W2 artifact exists;
- W2 records at least one network attempt;
- every W2 network attempt includes bounded values for:
  - `dnsAddressCount`;
  - `selectedAddressFamily`;
  - `finalAddressValidation`;
  - `responseStatusCodeCategory`;
  - `contentTypeState`;
  - `transportFailureClass`;
- no W2 artifact contains raw URL/path/query/payload/body/header/IP/error message/stack/cause, raw candidate text, source material, cache/SR data, evidence, report, verdict, warning, confidence, or public payload.

`candidateProviderNetwork.status` may still be `candidate_provider_network_damaged_structural`. That remains a W2 provider-network completion failure, but LS3 can pass as `PASS_X7_W2_LS3_DIAG2_TELEMETRY_CAPTURED` if the diagnostic objective above is met. If W2 completes successfully, record that as extra evidence; do not treat it as source-material or report-quality approval.

## 4. Exact Input

Use the same exact Captain-defined input as LS2 so the diagnostic result is comparable:

```text
Using hydrogen for cars is more efficient than using electricity
```

Do not paraphrase, translate, normalize, shorten, or substitute this input.

## 5. Endpoint Status Check

Before live submission, re-check the official Wikimedia endpoint documentation and stop if the endpoint is no longer suitable for this hidden proof:

- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`

Stop if the endpoint is no longer working normally, has entered behavior-changing deprecation, redirects to a different route, requires credentials, changes response shape away from JSON `pages`, or appears rate-gated beyond the W2 budget.

## 6. Runtime Gates

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

## 7. File Envelope

LS3 is docs-only before live execution. Allowed package files:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Smoke_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS3_Diagnostic_Live_Smoke_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

No source, prompt, config, schema, model, provider, test, script, route, package, API/UI, lockfile, deck, or generated artifact edits are allowed in this package.

## 8. Package Verifiers Before Commit

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Stage by explicit path only and verify the staged file list matches section 7.

## 9. Runtime Verifiers Before Live Job

After package commit and runtime refresh:

```powershell
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
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

Idle checkpoint before submission:

```powershell
$beforeIdle = git status --short --untracked-files=all
if ($beforeIdle) { throw "X7-W2-LS3 pre-submission worktree is dirty before idle checkpoint" }
Start-Sleep -Seconds 60
$afterIdle = git status --short --untracked-files=all
if ($afterIdle) { throw "X7-W2-LS3 pre-submission worktree became dirty during idle checkpoint" }
```

## 10. Admin Route Preflight

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

## 11. Submission Plan

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

## 12. Hard Fail Criteria

Stop and record failure if:

- package/runtime/worktree provenance is dirty or stale;
- endpoint status check fails;
- runtime process gate proof is missing;
- route auth/no-store/bounds preflight fails;
- any public hidden marker leaks;
- V1 fallback or V1 work appears;
- X7-S is not accepted;
- W2 artifact is missing or has zero network attempts;
- any W2 network attempt lacks one of the DIAG2 fields;
- any DIAG2 field value is outside the approved enum/count contracts;
- network execution touches any provider/endpoint/request parameter outside W2;
- raw query/provider/candidate/source/error data leaks into hidden artifacts or public output;
- source material, content dereference, parser, cache/SR/storage, EvidenceCorpus, report/verdict/confidence, or public-cutover behavior appears;
- any source/prompt/config/schema/model/provider/test/script edit is needed.

Do not repair inside LS3. Create a separate reviewed fix package if needed.

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
- all W2 DIAG2 field values by attempt;
- pass/fail classification;
- residual risks and non-authorizations.

Then append `Docs/AGENTS/Agent_Outputs.md`, create a completion handoff under `Docs/AGENTS/Handoffs/`, update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`, run `npm run index`, and commit the result package by explicit path only.

## 14. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Smoke_Package.md`.

Return `approve`, `modify`, or `reject`.

Check whether LS3 is a safe one-job diagnostic live smoke after DIAG2. Pay attention to:

- exact Captain-defined input choice and comparability to LS2;
- diagnostic pass bar separated from W2 provider-network completion;
- no live job before package commit, runtime refresh, endpoint re-check, route preflight, and verifiers;
- one provider only;
- no source material/content/parser/cache/SR/storage/EvidenceCorpus/report/verdict/warning/confidence/public behavior;
- hidden artifact leakage controls;
- public pre-cutover/damaged output requirement;
- no retries or second canary inside LS3;
- hard-fail behavior on V1 fallback, hidden leaks, endpoint drift, missing DIAG2 fields, or any need for code/prompt/config edits.

## 15. Review Decision

| Role | Reviewer | Date | Decision | Notes |
|---|---|---:|---|---|
| Claude Opus 4.6 senior architect/security | Claude Opus 4.6 via `scripts/agents/invoke-claude.cjs` | 2026-05-18 | APPROVE | No required changes. Reviewer confirmed the exact input, diagnostic-only pass bar, one-provider limit, pre-live gate sequence, no-source/no-public constraints, leak controls, and hard-fail criteria. |

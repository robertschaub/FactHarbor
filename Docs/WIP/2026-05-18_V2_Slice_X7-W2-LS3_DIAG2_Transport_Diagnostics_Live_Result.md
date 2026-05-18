# V2 Slice X7-W2-LS3 DIAG2 Transport Diagnostics Live-Smoke Result

**Date:** 2026-05-18
**Status:** `PASS_X7_W2_LS3_DIAG2_TELEMETRY_CAPTURED`
**Owner:** Lead Developer / Captain Deputy
**Package commit:** `e4bbf8aca6802a48283765ffbe07f1696d91f99b` (`docs: approve v2 w2 ls3 diagnostic smoke`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Smoke_Package.md`

## Summary

X7-W2-LS3 submitted exactly one live diagnostic job with the approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The job reached `SUCCEEDED`, first prepared `pipeline: claimboundary-v2`, stayed on committed runtime `e4bbf8aca6802a48283765ffbe07f1696d91f99b`, kept public V2 output damaged/precutover, and recorded the new DIAG2 fields on all three hidden W2 network attempts.

LS3 passes only its diagnostic objective. W2 itself still ends `candidate_provider_network_damaged_structural` with `candidate_runtime_query_coverage_invalid`; this remains a provider-network completion failure and is not source-quality, report-quality, or public-readiness evidence.

## Pre-Live Checks

- Official Wikimedia endpoint documentation was re-checked on 2026-05-18 before execution:
  - `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
  - `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`
- Runtime was refreshed with `.\scripts\restart-clean.ps1`.
- Reseed result: `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- Runtime gate proof passed:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- Web version route returned `git_sha = e4bbf8aca6802a48283765ffbe07f1696d91f99b`.
- Eight hidden artifact routes passed admin-route preflight:
  - unauthenticated: `401`
  - authenticated unknown-ledger: `200` for Claim Understanding, `404` for the seven other routes
  - all responses: `Cache-Control: no-store`, bounded size, no forbidden markers
- Clean idle checkpoint passed before submission.

## Verifiers

Passed before live submission:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - 8 files, 110 tests
- `npm -w apps/web run build`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `git diff --check`
- `git status --short --untracked-files=all`

The worktree was clean before live submission.

## Live Job

| Field | Value |
|---|---|
| Job id | `4f7e60c3a3eb4c3193744c30c522f188` |
| Ledger id | `4f7e60c3a3eb4c3193744c30c522f188:precutover-observability` |
| Status | `SUCCEEDED` |
| Pipeline variant | `claimboundary-v2` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Created commit | `e4bbf8aca6802a48283765ffbe07f1696d91f99b` |
| Executed commit | `e4bbf8aca6802a48283765ffbe07f1696d91f99b` |
| Prompt file hash before submission | `D3A1D101D481EAE7D0B58ACE70F8B5DCCE862214FC775B28126F690380E8ECB7` |
| Claim Understanding prompt content hash | `8621b011ed1fabf694cc1fd67650562efff57ce6c02cd6ecdb5ff7bcffb2bd12` |
| Query Planning prompt content hash | `8621b011ed1fabf694cc1fd67650562efff57ce6c02cd6ecdb5ff7bcffb2bd12` |

## Public Result Check

Public/non-admin result inspection passed containment:

- `_schemaVersion = 4.0.0-cb-precutover`
- `meta.pipeline = claimboundary-v2`
- `meta.publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- `verdictLabel = null`
- `truthPercentage = null`
- `confidence = null`
- no hidden ledger id, hidden route name, hidden artifact key, provider telemetry, query text, source material, evidence, verdict, DIAG2 transport field, or `internal_admin_only` marker was found in the non-admin public response

## Hidden Artifact Summary

| Artifact | Observed result |
|---|---|
| Claim Understanding | 1 artifact; `executionStatus: completed`; `schemaOutcome.status: accepted`; no cache read/write |
| X7-J intake | 1 artifact; `evidenceLifecycleIntake.status: intake_ready` |
| X7-O pre-execution | 1 artifact; `preexecutionObservation.status: structural_prerequisites_observed_not_executed_precutover`; `sourceLanguageSignal: present` |
| X7-S Query Planning | 1 artifact; `runtime.resultStatus: accepted`; `queryEntryCount: 3`; source-acquisition handoff `ready_not_executable` |
| X7-V Source Acquisition intake | 1 artifact; `sourceAcquisitionIntake.status: intake_ready_not_executable`; `queryEntryCount: 3` |
| X7-W1A admission | 1 artifact; `candidateRuntimeAdmission.status: admission_ready_no_runtime_execution`; `queryEntryCount: 3` |
| X7-W1B closed loop | 1 artifact; `candidateRuntimeClosedLoop.status: closed_loop_completed_no_source_candidates`; three structural provider attempts, all `provider_failure`, zero candidates |
| X7-W2 provider network | 1 artifact; `candidateProviderNetwork.status: candidate_provider_network_damaged_structural`; `damagedReason: candidate_runtime_query_coverage_invalid`; three provider-network attempts, all `transport_failure`, zero candidates, zero bytes |

## DIAG2 Network Attempts

| Attempt | Status | Stop reason | Duration | DNS count | Address family | Final address | Response | Content type | Transport class | Bytes | Leak flags |
|---:|---|---|---:|---:|---|---|---|---|---|---:|---|
| 1 | `provider_failure` | `transport_failure` | 34 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 2 | `provider_failure` | `transport_failure` | 2 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 3 | `provider_failure` | `transport_failure` | 1 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |

All W2 network attempts include the six required DIAG2 fields: `dnsAddressCount`, `selectedAddressFamily`, `finalAddressValidation`, `responseStatusCodeCategory`, `contentTypeState`, and `transportFailureClass`.

## Leakage Boundary Note

The broad LS3 hard-fail leak rule is applied to W2-introduced leakage and public-surface leakage. It does not retroactively void prior-slice approved artifacts. X7-S Query Planning is an approved hidden artifact that contains `queryText` by design; LS3 does not re-authorize or broaden X7-S. The W2 artifact itself contains no raw query text, raw URL/path, provider request/response payload, source/candidate title/excerpt/URL, IP address, error message, stack, cause, source material, content bytes, cache/SR data, evidence, report, verdict, warning, confidence, or public payload.

Claude Opus 4.6 reviewed this classification boundary and recommended `APPROVE` for `PASS_X7_W2_LS3_DIAG2_TELEMETRY_CAPTURED`, with this wording note included as load-bearing closeout context.

## Classification

`PASS_X7_W2_LS3_DIAG2_TELEMETRY_CAPTURED`

Primary reason:

- The live job reached W2.
- W2 recorded three network attempts.
- Every network attempt carried all required DIAG2 fields.
- Public output remained damaged/precutover and leaked no hidden markers.
- W2 artifacts stayed bounded and excluded source material, parser/content, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, and public output behavior.

Secondary observed fact:

- W2 still did not complete provider-network acquisition. All three attempts stopped as sanitized `transport_failure` with `transportFailureClass: unknown_transport_failure`; W2 remained `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`.

## What This Proves

- A committed/refreshed product V2 direct-text job reaches Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2.
- DIAG2 transport diagnostics are visible in hidden W2 artifacts for actual product-route network attempts.
- The current host resolves one approved endpoint address and selects IPv4 before failing before final-address validation and response inspection.
- Public V2 containment remains intact.

## What This Does Not Prove

- W2 provider-network completion.
- Successful Wikimedia endpoint retrieval.
- Candidate creation.
- Source quality, source availability, source material, content dereference, parsing, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public-readiness behavior.
- Production readiness for source execution.
- Any approval for additional live jobs, provider expansion, ACS/direct URL execution, V1 work, or V1 cleanup.

## Next Direction

Do not rerun LS3 and do not repair inside LS3.

Recommended next action is a separate reviewed diagnostic/repair package that keeps source execution narrow and answers:

1. Why does the approved Wikimedia W2 request fail before final-address validation with `transportFailureClass: unknown_transport_failure` on this host?
2. Whether the W2 `candidate_runtime_query_coverage_invalid` classification should remain tied to provider transport failure or be represented by a clearer structural status while still failing closed.

That package must keep source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work, V1 cleanup, and unapproved provider expansion blocked.

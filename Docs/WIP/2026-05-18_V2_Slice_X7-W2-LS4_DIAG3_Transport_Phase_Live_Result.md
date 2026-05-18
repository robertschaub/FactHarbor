# V2 Slice X7-W2-LS4 DIAG3 Transport Phase Live-Observation Result

**Date:** 2026-05-18
**Status:** `PASS_X7_W2_LS4_DIAG3_TELEMETRY_CAPTURED`
**Owner:** Lead Developer / Captain Deputy
**Package commit:** `a58a043029788b8f2ffa16f9f817d1ab6842361f` (`docs: approve v2 w2 ls4 live observation`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS4_DIAG3_Transport_Phase_Live_Observation_Package.md`

## Summary

X7-W2-LS4 submitted exactly one live diagnostic job with the approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The job reached `SUCCEEDED`, first prepared `pipeline: claimboundary-v2`, ran on committed/refreshed runtime `a58a043029788b8f2ffa16f9f817d1ab6842361f`, kept public V2 output damaged/precutover, and recorded the new DIAG3 fields on all three hidden W2 network attempts.

LS4 passes only its diagnostic objective. W2 itself still ends `candidate_provider_network_damaged_structural` with `candidate_runtime_query_coverage_invalid`; this remains a provider-network completion failure and is not source-quality, report-quality, public-readiness, or release evidence.

## Pre-Live Checks

- Official Wikimedia endpoint documentation was re-checked on 2026-05-18 before execution:
  - `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
  - `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`
- Runtime was refreshed with `.\scripts\restart-clean.ps1`.
- Reseed result during refresh/build: `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- Runtime gate proof passed:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- Web version route returned `git_sha = a58a043029788b8f2ffa16f9f817d1ab6842361f`.
- Eight hidden artifact routes passed admin-route preflight:
  - unauthenticated: `401`
  - authenticated unknown-ledger: `200` for Claim Understanding, `404` for the seven other routes
  - all responses: `Cache-Control: no-store`, bounded size, no forbidden markers
- Clean idle checkpoint passed before submission.

## Verifiers

Passed before live submission:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - first attempt: one boundary-guard reachability test timed out at 20s while all other tests passed
  - recovery: `boundary-guard.test.ts` passed alone, then the full focused command passed
  - final accepted result: 8 files, 110 tests
- `npm -w apps/web run build`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `git diff --check`
- `git status --short --untracked-files=all`

The worktree was clean before live submission.

## Live Job

| Field | Value |
|---|---|
| Job id | `07ac604f6af74ef989e8b675e4953abd` |
| Ledger id | `07ac604f6af74ef989e8b675e4953abd:precutover-observability` |
| Status | `SUCCEEDED` |
| Pipeline variant | `claimboundary-v2` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Package/runtime commit | `a58a043029788b8f2ffa16f9f817d1ab6842361f` |
| Executed web git commit in result meta | `a58a043029788b8f2ffa16f9f817d1ab6842361f` |
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
- no hidden ledger id, hidden route name, hidden artifact key, provider telemetry, query text, source material, evidence, verdict, DIAG2/DIAG3 transport field, or `internal_admin_only` marker was found in the non-admin public response

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

## DIAG3 Network Attempts

| Attempt | Status | Stop reason | Duration | DNS count | Address family | Final address | Response | Content type | Class | Phase | Shape | Code category | Bytes | Leak flags |
|---:|---|---|---:|---:|---|---|---|---|---|---|---|---|---:|---|
| 1 | `provider_failure` | `transport_failure` | 15 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | `unknown_phase` | `node_error_code_present` | `other_known` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 2 | `provider_failure` | `transport_failure` | 2 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | `unknown_phase` | `node_error_code_present` | `other_known` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 3 | `provider_failure` | `transport_failure` | 3 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | `unknown_phase` | `node_error_code_present` | `other_known` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |

All W2 network attempts include the six DIAG2 fields and the three DIAG3 fields.

## Leakage Boundary Note

The broad LS4 hard-fail leak rule is applied to W2-introduced leakage and public-surface leakage. It does not retroactively void prior-slice approved artifacts. X7-S Query Planning is an approved hidden artifact that contains `queryText` by design; LS4 does not re-authorize or broaden X7-S. The W2 artifact itself contains no raw query text, raw URL/path, provider request/response payload, source/candidate title/excerpt/URL, IP address, error message, stack, cause, source material, content bytes, cache/SR data, evidence, report, verdict, warning, confidence, or public payload.

## Classification

`PASS_X7_W2_LS4_DIAG3_TELEMETRY_CAPTURED`

Primary reason:

- The live job reached W2.
- W2 recorded three network attempts.
- Every network attempt carried all required DIAG2 and DIAG3 fields.
- Public output remained damaged/precutover and leaked no hidden markers.
- W2 artifacts stayed bounded and excluded source material, parser/content, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, and public output behavior.

Secondary observed fact:

- W2 still did not complete provider-network acquisition. All three attempts stopped as sanitized `transport_failure` with `transportFailureClass: unknown_transport_failure`, `transportFailurePhase: unknown_phase`, `transportErrorShape: node_error_code_present`, and `nodeErrorCodeCategory: other_known`; W2 remained `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`.

## What This Proves

- A committed/refreshed product V2 direct-text job reaches Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2.
- DIAG3 transport diagnostics are visible in hidden W2 artifacts for actual product-route network attempts.
- The current host resolves one approved endpoint address and selects IPv4 before failing before final-address validation and response inspection.
- The underlying Node error exposes a code, but the current approved category map only classifies it as `other_known`; raw code remains intentionally hidden.
- Public V2 containment remains intact.

## What This Does Not Prove

- W2 provider-network completion.
- Successful Wikimedia endpoint retrieval.
- Candidate creation.
- Source quality, source availability, source material, content dereference, parsing, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public-readiness behavior.
- Production readiness for source execution.
- Any approval for additional live jobs, provider expansion, ACS/direct URL execution, V1 work, or V1 cleanup.

## Next Direction

Do not rerun LS4 and do not repair inside LS4.

Recommended next action is a separate reviewed diagnostic/repair decision package. The evidence now narrows the failure from "unknown transport failure" to "Node error code present but categorized as `other_known` before final-address validation." The next package should decide whether to:

1. Add a bounded diagnostic category for the specific Node code without leaking raw codes; or
2. Run a non-provider, local-only transport-code probe that maps the hidden `other_known` case to a reviewed enum; or
3. Keep network repair blocked and revisit endpoint/client design.

That package must keep source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work, V1 cleanup, and unapproved provider expansion blocked.

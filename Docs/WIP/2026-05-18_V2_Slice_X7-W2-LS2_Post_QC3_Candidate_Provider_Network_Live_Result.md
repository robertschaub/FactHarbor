# V2 Slice X7-W2-LS2 Post-QC3 Candidate-Provider Network Live-Smoke Result

**Date:** 2026-05-18
**Status:** `HARD_FAIL_X7_W2_LS2_PROVIDER_NETWORK_DAMAGED_STRUCTURAL`
**Owner:** Lead Developer / Captain Deputy
**Package commit:** `028eb1c6b8290c9380daa1b89fc5b6bf23e3831e` (`docs: approve v2 w2 ls2 live smoke`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Smoke_Package.md`

## Summary

X7-W2-LS2 submitted exactly one live job with the approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The job reached `SUCCEEDED`, first prepared `pipeline: claimboundary-v2`, and stayed on clean commit/runtime `028eb1c6b8290c9380daa1b89fc5b6bf23e3831e`. Public output remained damaged/precutover and did not leak hidden markers.

LS2 does **not** pass. The W2 artifact exists, but its `candidateProviderNetwork.status` is `candidate_provider_network_damaged_structural`, not `candidate_provider_network_completed`. The recorded damaged reason is `candidate_runtime_query_coverage_invalid`. All three provider-network attempts ended as `provider_failure` / `transport_failure`, with zero candidates and zero bytes.

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
- Web version route returned `git_sha = 028eb1c6b8290c9380daa1b89fc5b6bf23e3831e`.
- Eight hidden artifact routes passed admin-route preflight:
  - unauthenticated: `401`
  - authenticated unknown-ledger: `200` for Claim Understanding, `404` for the seven other routes
  - all responses: `Cache-Control: no-store`, bounded size, no forbidden markers
- Clean idle checkpoint passed before submission.

## Verifiers

Passed before live submission:

- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run index`
- `git diff --check`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - first attempt: one transient `orchestrator.test.ts` 5s timeout while running beside the long boundary guard
  - classified as `keep` after isolated rerun passed in 1.6s
  - exact command rerun passed: 6 files, 99 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.test.ts`
  - 4 files, 23 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts`
  - 1 file, 10 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
  - 4 files, 18 tests
- `npm -w apps/web run build`
- final `npm run validate:v2-gates`
- final `node scripts/validate-v2-gate-register.mjs --self-test`
- final `git diff --check`
- final `git status --short --untracked-files=all`

## Live Job

| Field | Value |
|---|---|
| Job id | `36c9c6779b6947babbb895b42e916040` |
| Ledger id | `36c9c6779b6947babbb895b42e916040:precutover-observability` |
| Status | `SUCCEEDED` |
| Pipeline variant | `claimboundary-v2` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Created commit | `028eb1c6b8290c9380daa1b89fc5b6bf23e3831e` |
| Executed commit | `028eb1c6b8290c9380daa1b89fc5b6bf23e3831e` |
| Prompt hash recorded before submission | `D3A1D101D481EAE7D0B58ACE70F8B5DCCE862214FC775B28126F690380E8ECB7` |

## Public Result Check

Public/non-admin result inspection passed containment:

- `_schemaVersion = 4.0.0-cb-precutover`
- `meta.publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- `verdictLabel = null`
- `truthPercentage = null`
- `confidence = null`
- no hidden ledger id, hidden route name, hidden artifact key, provider telemetry, query text, source material, evidence, verdict, or `internal_admin_only` marker was found in the non-admin public response

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

W2 artifact containment held despite the hard fail:

- provider id: `wikimedia_core`
- endpoint id: `ep_wikimedia_core_page_search`
- fixed cost: `0`
- no source material created
- no content dereference
- no parser execution
- no cache read/write
- no Source Reliability call
- no EvidenceCorpus, EvidenceItem, report, verdict, warning, confidence, or public-surface write
- no raw provider request/response, raw candidate title/excerpt/URL, source material, or content bytes in the W2 artifact

## Classification

`HARD_FAIL_X7_W2_LS2_PROVIDER_NETWORK_DAMAGED_STRUCTURAL`

Primary reason:

- The package pass criterion required `candidateProviderNetwork.status: candidate_provider_network_completed`.
- Actual status was `candidate_provider_network_damaged_structural`.
- Damaged reason was `candidate_runtime_query_coverage_invalid`.

Secondary observed fact:

- All three W2 network attempts reached the W2 provider-network boundary but ended as sanitized `transport_failure` with zero observed bytes.

## What This Proves

- The post-QC3 live path reaches Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2 on a clean committed runtime.
- The post-QC3 six-query cap is sufficient for this input's three Query Planning entries.
- Public V2 remains damaged/precutover and does not leak hidden internals.
- W1A/W1B/W2 artifact routes are admin-only, no-store, bounded, and visible for inspection.

## What This Does Not Prove

- W2 provider-network completion.
- Successful Wikimedia endpoint retrieval.
- Candidate creation.
- Source quality, source availability, source material, content dereference, parsing, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public-readiness behavior.
- Production readiness for source execution.

## Next Direction

Do not rerun LS2 and do not repair inside LS2.

Recommended next action is a separate reviewed diagnostic/repair package that answers two questions without broadening source execution:

1. Why does the W2 provider-network transport produce sanitized `transport_failure` against the approved Wikimedia endpoint on this host?
2. Why does W2 classify the run as `candidate_runtime_query_coverage_invalid` when X7-W1B structurally completed with provider failures and zero candidates?

The next package must stay hidden/internal, use no additional live job unless separately approved, and keep source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work, and V1 cleanup blocked.

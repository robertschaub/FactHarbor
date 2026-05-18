# V2 Slice X7-W2-LS6 DIAG5 Taxonomy Live-Observation Result

**Date:** 2026-05-18
**Status:** `PASS_X7_W2_LS6_DIAG5_MAPPING_CONFIRMED`
**Owner:** Lead Developer / Captain Deputy
**Package commit:** `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068` (`docs: approve v2 w2 ls6 live observation`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS6_DIAG5_Taxonomy_Live_Observation_Package.md`
**Parent implementation:** `a5fcfaa3` (`feat: add v2 w2 diag5 transport taxonomy`)

## Summary

X7-W2-LS6 submitted exactly one live diagnostic job with the approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The job reached `SUCCEEDED`, first prepared `pipeline: claimboundary-v2`, ran on committed/refreshed runtime `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068`, kept public V2 output damaged/precutover, and recorded W2 network attempts with DIAG5 taxonomy fields available.

LS6 passes its diagnostic objective because the same product-route W2 failure now maps to `address_validation_failure` / `address_selection` / `node_error_code_present` instead of the prior unknown category/phase. This is not W2 provider-network completion: W2 still ended `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`, with zero candidates and zero bytes.

## Pre-Live Checks

- Official Wikimedia endpoint documentation was re-checked on 2026-05-18 before execution:
  - `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
  - `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`
- Current official status still says `api.wikimedia.org` endpoints are working normally and that Core API gradual deprecation starts in July 2026.
- The Core search endpoint remains documented, with replacement mapping to project-local REST routes noted in the endpoint map.
- Runtime was refreshed from the committed LS6 package; web version route returned `git_sha = 40f832bcd30e2e356f0a30c4d46c9b9c26dd2068`.
- Reseed result during refresh/build: configs `0 changed`; prompts `0 changed`.
- Runtime gate proof passed:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- Eight hidden artifact routes passed admin-route preflight:
  - unauthenticated: `401`
  - authenticated unknown-ledger: `200` for Claim Understanding, `404` for the seven other routes
  - all responses: `Cache-Control: no-store`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`
- Clean idle checkpoint passed before submission.

## Verifiers

Passed before live submission:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
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
| Job id | `20cfb674dc21448e96787c753d402e22` |
| Ledger id | `20cfb674dc21448e96787c753d402e22:precutover-observability` |
| Status | `SUCCEEDED` |
| Pipeline variant | `claimboundary-v2` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Package/runtime commit | `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068` |
| Executed web git commit in result meta | `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068` |
| Prompt file hash before submission | `D3A1D101D481EAE7D0B58ACE70F8B5DCCE862214FC775B28126F690380E8ECB7` |

Note: the public API job projection's top-level git hash fields were null, but the V2 result envelope meta recorded the executed web git hash, and the web version route was checked before and after the run.

## Public Result Check

Public/non-admin result inspection passed containment:

- `_schemaVersion = 4.0.0-cb-precutover`
- `meta.pipeline = claimboundary-v2`
- `meta.publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- `verdictLabel = null`
- `truthPercentage = null`
- `confidence = null`
- no hidden DIAG5 values, hidden artifact route names, provider telemetry, source material, evidence, verdict, raw runtime code, or `internal_admin_only` marker was found in the non-admin public response

## Hidden Artifact Summary

| Artifact | Observed result |
|---|---|
| Claim Understanding | 1 artifact; `executionStatus: completed`; `gatewayTaskStatus: executable`; `schemaOutcome.status: accepted` |
| X7-J intake | 1 artifact; `status: intake_ready`; public cutover blocked |
| X7-O pre-execution | 1 artifact; `status: structural_prerequisites_observed_not_executed_precutover`; prompt/model execution false |
| X7-S Query Planning | 1 artifact; `activation.status: enabled_hidden_direct_text`; `runtime.status: completed`; `queryEntryCount: 3`; `sourceAcquisitionHandoff.status: ready_not_executable` |
| X7-V Source Acquisition intake | 1 artifact; `status: intake_ready_not_executable` |
| X7-W1A admission | 1 artifact; `status: admission_ready_no_runtime_execution` |
| X7-W1B closed loop | 1 artifact; `status: closed_loop_completed_no_source_candidates` |
| X7-W2 provider network | 1 artifact; `candidateProviderNetwork.status: candidate_provider_network_damaged_structural`; `damagedReason: candidate_runtime_query_coverage_invalid`; three provider-network attempts, all `transport_failure`, zero candidates, zero bytes |

## DIAG5 Network Attempts

| Attempt | Status | Stop reason | DNS count | Address family | Final address | Response | Content type | Class | Phase | Shape | Code category | Bytes | Leak flags |
|---:|---|---|---:|---|---|---|---|---|---|---|---|---:|---|
| 1 | `provider_failure` | `transport_failure` | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `address_validation_failure` | `address_selection` | `node_error_code_present` | `address_validation_failure` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 2 | `provider_failure` | `transport_failure` | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `address_validation_failure` | `address_selection` | `node_error_code_present` | `address_validation_failure` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 3 | `provider_failure` | `transport_failure` | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `address_validation_failure` | `address_selection` | `node_error_code_present` | `address_validation_failure` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |

Hidden W2 containment held: no raw runtime code, raw URL/path/query/payload/body/header/IP/error message/stack/cause, source material, EvidenceCorpus/evidence, report, verdict, warning, confidence, cache/SR data, or public payload was present in the W2 artifact fields inspected for the LS6 pass bar.

## Classification

`PASS_X7_W2_LS6_DIAG5_MAPPING_CONFIRMED`

Primary reason:

- The live job reached W2.
- W2 recorded three network attempts.
- Every W2 network attempt carried the DIAG2/DIAG3/DIAG4/DIAG5 fields.
- Every W2 network attempt mapped to `address_validation_failure` / `address_selection` / `node_error_code_present`.
- Public output remained damaged/precutover and leaked no hidden markers.
- W2 artifacts stayed bounded and excluded source material, parser/content, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, raw runtime code, and public output behavior.

Secondary observed fact:

- W2 still did not produce candidates or bytes. It remained `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`, so the next step is repair/design work for the transport path, not source-quality or report-quality work.

## What This Proves

- DIAG5 closed the immediate taxonomy blind spot for the RP1-observed product-route failure shape.
- A committed/refreshed product V2 direct-text job reaches Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2 after DIAG5.
- Hidden W2 telemetry can now distinguish the failure as address-validation failure during address selection.
- Public V2 containment remains intact.

## What This Does Not Prove

- W2 provider-network completion.
- Successful Wikimedia endpoint retrieval.
- Candidate creation.
- Source quality, source availability, source material, content dereference, parsing, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public-readiness behavior.
- Production readiness for source execution.
- Any approval for additional live jobs, provider expansion, ACS/direct URL execution, V1 work, or V1 cleanup.

## Next Direction

Do not rerun LS6 and do not repair inside LS6.

Recommended next action is a separate reviewed narrow transport repair package. Keep the package limited to:

- the current W2 transport path;
- synthetic tests for the address-selection/address-validation handling;
- no provider expansion;
- no source material/content dereference/parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior;
- no prompt/config/model/schema edits unless a reviewer explicitly approves them;
- exactly one post-repair live canary only after the repair package lands and its required verifiers pass.

The repair package should aim to convert the current pre-byte address-selection failure into either a real bounded provider response classification or a more explicit endpoint/client design stop. It must not broaden W2 into source execution.

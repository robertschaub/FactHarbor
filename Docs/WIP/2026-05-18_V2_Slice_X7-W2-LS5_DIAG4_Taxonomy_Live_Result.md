# V2 Slice X7-W2-LS5 DIAG4 Taxonomy Live-Observation Result

**Date:** 2026-05-18
**Status:** `PASS_X7_W2_LS5_DIAG4_OBSERVED_OTHER_KNOWN_REMAINS`
**Owner:** Lead Developer / Captain Deputy
**Package commit:** `4f95576c6446fb0c7274c6acd0a480b60ca63fa6` (`docs: approve v2 w2 ls5 live observation`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS5_DIAG4_Taxonomy_Live_Observation_Package.md`
**Parent implementation:** `90552dfa` (`feat: add v2 w2 diag4 transport taxonomy`)

## Summary

X7-W2-LS5 submitted exactly one live diagnostic job with the approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The job reached `SUCCEEDED`, first prepared `pipeline: claimboundary-v2`, ran on committed/refreshed runtime `4f95576c6446fb0c7274c6acd0a480b60ca63fa6`, kept public V2 output damaged/precutover, and recorded W2 network attempts with the DIAG4 taxonomy fields available.

LS5 passes its diagnostic objective because the product route reached W2, hidden telemetry was captured, public containment held, and no raw-code/source/content/report data leaked. The substantive result is negative: DIAG4 did not classify the live failure into the new taxonomy categories. All three attempts still show `nodeErrorCodeCategory: other_known`, `transportFailurePhase: unknown_phase`, and `transportFailureClass: unknown_transport_failure`.

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
- Web version route returned `git_sha = 4f95576c6446fb0c7274c6acd0a480b60ca63fa6`.
- Eight hidden artifact routes passed admin-route preflight:
  - unauthenticated: `401`
  - authenticated unknown-ledger: `200` for Claim Understanding, `404` for the seven other routes
  - all responses: `Cache-Control: no-store`, bounded size, no forbidden markers
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
| Job id | `2a3727899bdc41cd8d356c7d5212d3a1` |
| Ledger id | `2a3727899bdc41cd8d356c7d5212d3a1:precutover-observability` |
| Status | `SUCCEEDED` |
| Pipeline variant | `claimboundary-v2` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Package/runtime commit | `4f95576c6446fb0c7274c6acd0a480b60ca63fa6` |
| Executed web git commit in result meta | `4f95576c6446fb0c7274c6acd0a480b60ca63fa6` |
| Prompt file hash before submission | `D3A1D101D481EAE7D0B58ACE70F8B5DCCE862214FC775B28126F690380E8ECB7` |

## Public Result Check

Public/non-admin result inspection passed containment:

- `_schemaVersion = 4.0.0-cb-precutover`
- `meta.pipeline = claimboundary-v2`
- `meta.publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- `verdictLabel = null`
- `truthPercentage = null`
- `confidence = null`
- no hidden ledger id, hidden artifact route name, DIAG2/DIAG3/DIAG4 transport field name, provider telemetry, query text, source material, evidence, verdict, raw Node code, or `internal_admin_only` marker was found in the non-admin public response

## Hidden Artifact Summary

| Artifact | Observed result |
|---|---|
| Claim Understanding | 1 artifact |
| X7-J intake | 1 artifact |
| X7-O pre-execution | 1 artifact |
| X7-S Query Planning | 1 artifact |
| X7-V Source Acquisition intake | 1 artifact |
| X7-W1A admission | 1 artifact |
| X7-W1B closed loop | 1 artifact |
| X7-W2 provider network | 1 artifact; `candidateProviderNetwork.status: candidate_provider_network_damaged_structural`; `damagedReason: candidate_runtime_query_coverage_invalid`; three provider-network attempts, all `transport_failure`, zero candidates, zero bytes |

## DIAG4 Network Attempts

| Attempt | Status | Stop reason | Duration | DNS count | Address family | Final address | Response | Content type | Class | Phase | Shape | Code category | Bytes | Leak flags |
|---:|---|---|---:|---:|---|---|---|---|---|---|---|---|---:|---|
| 1 | `provider_failure` | `transport_failure` | 16 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | `unknown_phase` | `node_error_code_present` | `other_known` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 2 | `provider_failure` | `transport_failure` | 3 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | `unknown_phase` | `node_error_code_present` | `other_known` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |
| 3 | `provider_failure` | `transport_failure` | 1 ms | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `unknown_transport_failure` | `unknown_phase` | `node_error_code_present` | `other_known` | 0 | `rawPayloadIncluded=false`; `secretIncluded=false`; `publicPayloadIncluded=false`; `errorTraceIncluded=false` |

Hidden W2 leak scan passed: no raw Node codes (`ENETUNREACH`, `EHOSTUNREACH`, `EAFNOSUPPORT`, `EADDRNOTAVAIL`, `ERR_SSL`, `EPROTO`, `ERR_TLS`), URL/secret/stack markers, source material, EvidenceCorpus/evidence, report, verdict, warning, confidence, or public payload were present.

## Classification

`PASS_X7_W2_LS5_DIAG4_OBSERVED_OTHER_KNOWN_REMAINS`

Primary reason:

- The live job reached W2.
- W2 recorded three network attempts.
- Every W2 network attempt carried the DIAG2, DIAG3, and DIAG4 taxonomy fields.
- Public output remained damaged/precutover and leaked no hidden markers.
- W2 artifacts stayed bounded and excluded source material, parser/content, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, raw Node codes, and public output behavior.

Secondary observed fact:

- DIAG4 taxonomy closure did not classify the live transport failure. All three attempts still stopped as sanitized `transport_failure` with `nodeErrorCodeCategory: other_known`, `transportFailurePhase: unknown_phase`, and `transportFailureClass: unknown_transport_failure`; W2 remained `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`.

## What This Proves

- A committed/refreshed product V2 direct-text job reaches Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2 after DIAG4.
- DIAG4 taxonomy fields are present in hidden W2 artifacts for actual product-route network attempts.
- The live failure is not one of the DIAG4-mapped categories: `network_unreachable`, `host_unreachable`, `address_family_failure`, or `tls_protocol`.
- The low-level runtime still has a Node error code, but the approved category map still treats it as `other_known`.
- Public V2 containment remains intact.

## What This Does Not Prove

- W2 provider-network completion.
- Successful Wikimedia endpoint retrieval.
- Candidate creation.
- Source quality, source availability, source material, content dereference, parsing, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public-readiness behavior.
- Production readiness for source execution.
- The exact raw Node error code.
- Any approval for additional live jobs, provider expansion, ACS/direct URL execution, V1 work, or V1 cleanup.

## Next Direction

Do not rerun LS5 and do not repair inside LS5.

Recommended next action is a separate reviewed diagnostic decision package. Since DIAG4 did not resolve the `other_known` classification, the next package should decide between:

1. a local-only, non-product raw-code probe that captures the exact Node code transiently outside product/admin artifacts and committed runtime output; or
2. an endpoint/client design review if the team judges raw-code probing unnecessary or too risky.

That package must keep source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work, V1 cleanup, unapproved provider expansion, and additional live jobs blocked unless separately reviewed.

# V2 Slice X7-W2-TR1 Standard-Client Transport Repair Live Result

**Date:** 2026-05-18
**Status:** `PIVOT_REQUIRED_X7_W2_TR1_RESPONSE_STREAM_BYTE_CAP_ZERO_CANDIDATES`
**Owner:** Lead Developer / Captain Deputy
**Implementation commit:** `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd` (`fix: repair v2 w2 standard transport path`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS6_DIAG5_Taxonomy_Live_Result.md`

## Summary

TR1 removed the custom pinned lookup callback from the production default W2 network request and kept the standard Node HTTPS connection path, while preserving DNS pre-resolution/public-address validation, final remote-address validation, endpoint allowlist, redirect-deny, proxy-none, no-credentials, byte/timeout caps, hidden-only artifacts, and raw-leak protections.

The one approved post-repair canary was submitted after implementation commit, runtime refresh, endpoint documentation re-check, route preflight, required verifiers, and clean idle checkpoint.

Result: TR1 improved the failure point but did not pass. The W2 product route now reaches the response stream, but every network attempt stops with `compressed_byte_cap_exceeded`. W2 still records zero bytes and zero hidden structural candidates.

Per the TR1 package stop rule, do not continue repairing inside TR1. Prepare an endpoint/client/response-size pivot package for Steering Board review.

## Pre-Live Checks

- Official Wikimedia endpoint documentation was re-checked on 2026-05-18:
  - `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
  - `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`
- Current official status still says `api.wikimedia.org` endpoints are working normally, with gradual Core API deprecation beginning in July 2026.
- The official endpoint map still lists the project-local equivalent for Core page search as `{wiki_domain}/w/rest.php/v1/search/page`.
- Runtime was refreshed from `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd`.
- Web version route returned `git_sha = dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd`.
- API health check passed.
- Runtime gates were present:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- Eight hidden artifact routes passed admin-only/no-store preflight:
  - unauthenticated responses: `401`
  - authenticated unknown-ledger responses: `200` for Claim Understanding, `404` for the seven other routes
  - all authenticated responses: `Cache-Control: no-store`
- Clean idle checkpoint passed before submission.

## Required Verifiers

TR1 implementation verifiers passed before live submission:

- focused transport/factory/W2/boundary test group: PASS, 4 files / 93 tests
- runtime transport/envelope/factory group: PASS, 3 files / 17 tests
- W2 artifact/orchestrator/boundary group: PASS, 5 files / 94 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: PASS, 43 files / 257 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: PASS, 88 files / 622 tests
- `npm -w apps/web run build`: PASS
- `npm run validate:v2-gates`: PASS
- `node scripts/validate-v2-gate-register.mjs --self-test`: PASS
- `git diff --check`: PASS

## Live Job

Approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

| Field | Value |
|---|---|
| Job id | `fcf5135297e449468e881e957d89464d` |
| Ledger id | `fcf5135297e449468e881e957d89464d:precutover-observability` |
| Status | `SUCCEEDED` |
| Pipeline variant | `claimboundary-v2` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Runtime commit | `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd` |
| Executed web git commit in V2 result meta | `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd` |

## Public Result Check

Public/non-admin result inspection passed containment:

- `_schemaVersion = 4.0.0-cb-precutover`
- `meta.pipeline = claimboundary-v2`
- `meta.publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`
- `verdictLabel = null`
- `truthPercentage = null`
- `confidence = null`
- no hidden W2 provider-network markers, hidden artifact route names, source material, evidence, verdict, provider telemetry, raw runtime code, or `internal_admin_only` marker was found in the non-admin public response

## Hidden W2 Artifact Summary

| Field | Observed result |
|---|---|
| W2 artifact count | `1` |
| W2 status | `candidate_provider_network_damaged_structural` |
| W2 damaged reason | `candidate_runtime_query_coverage_invalid` |
| Runtime status | `completed_structural` |
| Query entry count | `3` |
| Query outcome summaries | all three failed with `provider_failure` |
| Provider network executed | `true` |
| Search fetch called | `true` |
| Provider attempt count | `3` |
| Network attempt count | `3` |
| Candidate count | `0` |
| Total candidate count | `0` |
| Total compressed bytes | `0` |
| Total decompressed bytes | `0` |
| Total bytes | `0` |
| Total duration | `2729ms` |
| Fixed dollar cost | `0` |
| Cost reason | `no_paid_api_no_credentials` |
| Downstream gate | `candidate_to_source_material_gate_closed` |

Side-effect controls stayed closed:

- `contentDereferenceCalled = false`
- `parserExecuted = false`
- `cacheRead = false`
- `cacheWrite = false`
- `storageWrite = false`
- `sourceReliabilityCalled = false`
- `sourceMaterialCreated = false`
- `evidenceCorpusCreated = false`
- `evidenceItemGenerated = false`
- `warningGenerated = false`
- `reportGenerated = false`
- `verdictGenerated = false`
- `publicSurfaceWritten = false`

## Network Attempts

| Attempt | Status | Stop reason | DNS count | Address family | Final address | Response | Content type | Class | Phase | Shape | Code category | Candidates | Bytes |
|---:|---|---|---:|---|---|---|---|---|---|---|---|---:|---:|
| 1 | `search_failure` | `compressed_byte_cap_exceeded` | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `not_applicable` | `response_stream` | `node_error_code_absent` | `unknown_absent` | 0 | 0 |
| 2 | `search_failure` | `compressed_byte_cap_exceeded` | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `not_applicable` | `response_stream` | `node_error_code_absent` | `unknown_absent` | 0 | 0 |
| 3 | `search_failure` | `compressed_byte_cap_exceeded` | 1 | `ipv4` | `not_reached` | `not_reached` | `not_reached` | `not_applicable` | `response_stream` | `node_error_code_absent` | `unknown_absent` | 0 | 0 |

Hidden W2 containment held. Inspection found no raw query/provider payload, source material, parser/content output, cache/SR/storage payload, EvidenceCorpus/evidence/report/verdict/warning/confidence output, credentials, cookie/authorization values, raw body/header text, stack, cause, or public payload in the hidden artifact fields inspected.

## Classification

`PIVOT_REQUIRED_X7_W2_TR1_RESPONSE_STREAM_BYTE_CAP_ZERO_CANDIDATES`

TR1 is not a provider-success pass because the required nonzero bytes and nonzero hidden structural candidates were not produced.

## What This Proves

- The standard Node HTTPS path without the custom pinned lookup callback changed the failure mode away from the previous address-selection failure.
- The W2 product path can execute three hidden provider-network attempts through the existing one-provider boundary.
- The current endpoint/client/request shape reaches the response stream.
- Public containment and downstream/source-material denial remain intact.
- The request still does not create cost-bearing provider calls or credentials.

## What This Does Not Prove

- Successful provider search response handling.
- Candidate creation.
- Source availability, source material, content dereference, parser execution, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public-readiness behavior.
- That the current Core API endpoint/request parameters are the right long-term endpoint contract.
- That raising byte caps is safe or sufficient.

## Required Stop

Do not continue TR1 repair.

Do not:

- patch the old custom DNS/pinned lookup path;
- run another TR1 canary;
- add retries;
- expand providers;
- change prompts/config/model/schema/gateway policy;
- add source material/content dereference/parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior;
- add ACS/direct URL behavior;
- reuse or clean V1.

Next artifact: `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`.

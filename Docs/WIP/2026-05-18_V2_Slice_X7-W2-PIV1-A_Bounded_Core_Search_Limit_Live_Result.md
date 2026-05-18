# V2 Slice X7-W2-PIV1-A Bounded Core Search Limit Live Result

**Date:** 2026-05-18
**Status:** `PASS_X7_W2_PIV1_A_BOUNDED_CORE_SEARCH_LIMIT_LIVE_CANARY`
**Owner:** Lead Developer / Captain Deputy
**Implementation commit:** `7c833b53da7d6e5ece6970247671ed4d8bdce7ea`
**Source package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Source_Package.md`

## Result

The one approved PIV1-A canary passed. W2 no longer stops at response byte cap for the approved Wikimedia Core page-search endpoint with the bounded `limit` parameter. The hidden candidate-provider network recorded nonzero bytes and nonzero hidden structural candidates while public V2 output remained blocked/precutover.

## Reference Check

Before implementation and canary execution, the Wikimedia Core Search content reference was checked. The page-search endpoint is a `GET` endpoint at `/core/v1/{project}/{language}/search/page`, and `limit` is documented as an optional query parameter. The request examples use query parameters (`?q=earth&limit=10`) or client `params`, not a request body field.

Reference pages:

- `https://api.wikimedia.org/wiki/API_reference/Core/Search/Search_content`
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`

## Canary

| Field | Observation |
|---|---|
| Job | `c4ed36f4ce634860b906c74ea1557cc6` |
| Input | `Using hydrogen for cars is more efficient than using electricity` |
| Job status | `SUCCEEDED` |
| Runtime commit | `7c833b53da7d6e5ece6970247671ed4d8bdce7ea` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Public result schema | `4.0.0-cb-precutover` |
| Public cutover status | `blocked_precutover` |
| Public analysis issue | `report_damaged` |
| Refined public hidden-marker scan | no matches |

The public result stayed damaged/precutover by design. This result is not evidence of public report quality, truth quality, verdict quality, or source-material readiness.

## Hidden Artifact Evidence

### Claim Understanding

- Artifact count: `1`
- Execution status: `completed`
- Gateway task status: `executable`
- Schema outcome: `accepted`
- Provider: Anthropic Haiku
- Total tokens: `3218`
- Duration: `3268ms`

### Query Planning

- Artifact count: `1`
- Runtime status: `completed`
- Schema outcome: `accepted`
- Query entry count: `3`
- Product execution flags:
  - `queryPlanningRuntimeInvoked: true`
  - `modelCalled: true`
  - `providerSearchFetchCalled: false`
  - `sourceAcquisitionExecuted: false`

### W2 Candidate Provider Network

| Field | Observation |
|---|---|
| Status | `candidate_provider_network_completed` |
| Blocked reason | `null` |
| Damaged reason | `null` |
| Query entries | `3` |
| Provider attempts | `3` |
| Network attempts | `3` |
| Candidate count | `9` total, `3` per query |
| Structurally dropped candidates | `0` |
| Total duration | `1774ms` |
| Total compressed bytes | `6991` |
| Total decompressed bytes | `6991` |
| Total bytes | `13982` |
| Fixed dollar cost | `0` |
| Cost reason | `no_paid_api_no_credentials` |

Each W2 network attempt reported:

- `structuralStatus: success`
- `stopReason: not_stopped`
- `finalAddressValidation: matched_validated_public_address`
- `responseStatusCodeCategory: success_2xx`
- `contentTypeState: accepted_json`
- `transportFailureClass: not_applicable`
- `transportFailurePhase: not_applicable`
- `transportErrorShape: not_applicable`
- `nodeErrorCodeCategory: none`
- `candidateCount: 3`
- `rawPayloadIncluded: false`
- `secretIncluded: false`
- `publicPayloadIncluded: false`
- `errorTraceIncluded: false`

Per-attempt byte observations:

| Attempt | Compressed bytes | Decompressed bytes |
|---|---:|---:|
| 1 | `2475` | `2475` |
| 2 | `1955` | `1955` |
| 3 | `2561` | `2561` |

## Boundary Check

Preserved:

- same approved Wikimedia Core page-search endpoint;
- TR1 standard Node HTTPS connection path;
- `limit` sourced from W2's hidden max-candidate cap;
- existing byte caps and timeout caps;
- DNS pre-resolution/public-address validation;
- final remote-address validation;
- endpoint allowlist;
- redirect deny;
- proxy none;
- no credentials;
- hidden/admin-only artifact posture;
- no raw provider payload leakage;
- public V2 damaged/precutover result.

Not created or executed:

- source material;
- content dereference;
- parser execution;
- cache IO;
- durable storage;
- Source Reliability;
- EvidenceCorpus;
- evidence items;
- report/verdict/warning/confidence behavior;
- public API/UI/report/export behavior;
- provider expansion;
- retries;
- ACS/direct URL behavior;
- prompt/config/model/schema edits;
- V1 reuse or V1 cleanup.

## Decision

The PIV1-A zero-byte/zero-candidate pivot condition did not trigger. W2 has now proven hidden provider-network candidate acquisition against the bounded Core Search response path.

The next Source Acquisition step must still be a separate reviewed package. PIV1-A does not authorize source material creation, content dereference, parser execution, EvidenceCorpus construction, downstream evidence/report/verdict behavior, public exposure, provider expansion, retries, ACS/direct URL execution, or V1 cleanup.

Recommended immediate next action: pause for a brief post-W2 Steering Board review before drafting Source Material. The review should decide whether the current Wikimedia Core endpoint is enough for the next stage or whether endpoint/provider durability needs attention first, confirm remaining live-job budget, and check whether boundary-guard/gate-register surface area should be trimmed before adding another stage.

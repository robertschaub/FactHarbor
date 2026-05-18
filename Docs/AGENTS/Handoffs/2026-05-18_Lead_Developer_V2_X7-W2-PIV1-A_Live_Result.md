# Lead Developer Handoff — V2 X7-W2-PIV1-A Live Result

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Task:** Record the one approved PIV1-A post-repair live canary after bounded Core Search `limit` implementation.
**Status:** `PASS_X7_W2_PIV1_A_BOUNDED_CORE_SEARCH_LIMIT_LIVE_CANARY`

## Summary

PIV1-A passed. The W2-approved Wikimedia Core page-search endpoint now sends `limit=3` as a query-string parameter sourced from W2's hidden max-candidate cap. The one approved canary reached hidden candidate-provider network completion with nonzero bytes and nonzero hidden structural candidates while public V2 stayed blocked/precutover.

## Reference Confirmation

Before the implementation/canary, the Wikimedia Core Search content reference was checked. It documents page search as `GET /core/v1/{project}/{language}/search/page` and `limit` as an optional query parameter. Examples use `?q=earth&limit=10` or request `params`, not a request body field.

Reference pages:

- `https://api.wikimedia.org/wiki/API_reference/Core/Search/Search_content`
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`

## Canary

| Field | Observation |
|---|---|
| Implementation commit | `7c833b53da7d6e5ece6970247671ed4d8bdce7ea` |
| Job | `c4ed36f4ce634860b906c74ea1557cc6` |
| Input | `Using hydrogen for cars is more efficient than using electricity` |
| Job status | `SUCCEEDED` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Public result | `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged` |
| Public hidden-marker leak | none found by refined marker scan |

## Hidden W2 Evidence

| Field | Observation |
|---|---|
| W2 status | `candidate_provider_network_completed` |
| Blocked/damaged reason | `null` / `null` |
| Query entries | `3` |
| Provider/network attempts | `3` / `3` |
| Hidden structural candidates | `9` total, `3` per query |
| Total compressed bytes | `6991` |
| Total decompressed bytes | `6991` |
| Total bytes | `13982` |
| Duration | `1774ms` |
| Cost | `0`, `no_paid_api_no_credentials` |

All three W2 network attempts reported `success`, `not_stopped`, `success_2xx`, `accepted_json`, `matched_validated_public_address`, and `candidateCount: 3`. No raw payload, secret, public payload, or error trace was included.

## Verification Already Passed Before Canary

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
  PASS: 5 files / 99 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
  PASS: 43 files / 257 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2
  PASS: 88 files / 623 tests

npm -w apps/web run build
  PASS

npm run validate:v2-gates
  PASS

node scripts/validate-v2-gate-register.mjs --self-test
  PASS

git diff --check
  PASS
```

## Files Updated For Result Closeout

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Source_Package.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Live_Result.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Constraints Preserved

PIV1-A did not authorize or create:

- source material;
- content dereference;
- parser execution;
- cache IO;
- durable storage;
- Source Reliability;
- EvidenceCorpus/evidence/report/verdict/warning/confidence behavior;
- public API/UI/report/export behavior;
- provider expansion;
- retries;
- ACS/direct URL behavior;
- prompt/config/model/schema edits;
- V1 reuse or V1 cleanup.

## Next Step

Do not continue directly into source material or content dereference from this result. The next Source Acquisition step needs a separate reviewed package. Immediate next action is a short post-W2 Steering Board review before drafting Source Material. That review should decide whether the current Wikimedia Core endpoint is enough for the next stage or whether a second provider/endpoint durability step is needed first, confirm remaining live-job budget, and check whether boundary-guard/gate-register surface area should be trimmed before another stage is added.

## Warnings

PIV1-A proves hidden candidate-provider network viability only. It is not public report quality evidence and not a source-material, EvidenceCorpus, report, verdict, warning, confidence, or public-cutover gate.

## Learnings

The cheapest repair was correct: bounding the existing Core Search response with the documented `limit` query parameter produced usable hidden candidates without raising byte caps, changing endpoints, or adding retries.

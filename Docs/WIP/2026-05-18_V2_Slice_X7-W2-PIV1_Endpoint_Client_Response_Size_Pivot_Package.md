# V2 Slice X7-W2-PIV1 Endpoint/Client/Response-Size Pivot Package

**Date:** 2026-05-18
**Status:** Steering Board review accepted; PIV1-A bounded Core-search limit passed live canary
**Owner:** Lead Developer / Captain Deputy
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Live_Result.md`

## 0. 2026-05-18 PIV1-A Decision Update

Captain approved the narrow response-size repair direction after Steering Board review:

- keep TR1's standard Node HTTPS client;
- keep the current approved Wikimedia Core page-search endpoint for this slice;
- add only an explicit small `limit` parameter aligned to the W2 hidden candidate cap;
- do not raise byte caps or switch endpoints in PIV1-A;
- add bounded construction/success/byte-cap/no-leak tests;
- after clean verifiers and clean runtime refresh, run exactly one canary;
- if zero bytes/candidates persist, stop and return with a project-local endpoint or byte-cap pivot package.

The implementing package is now `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Source_Package.md`.

PIV1-A subsequently passed its one approved canary on job `c4ed36f4ce634860b906c74ea1557cc6` at implementation commit `7c833b53da7d6e5ece6970247671ed4d8bdce7ea`: W2 reached `candidate_provider_network_completed`, recorded `9` hidden structural candidates and `13982` total bytes, and preserved public `4.0.0-cb-precutover` / `blocked_precutover` containment with no hidden-marker leak. The zero-byte/zero-candidate pivot condition did not trigger.

## 1. Purpose

TR1 proved that the previous address-selection failure is no longer the active blocker after moving the production default W2 request to the standard Node HTTPS connection path. The one allowed post-repair canary still failed the W2 success condition: all three hidden provider-network attempts stopped during response streaming with `compressed_byte_cap_exceeded`, and W2 still recorded zero bytes and zero hidden structural candidates.

Per TR1's stop rule, the next step is not another transport patch inside TR1. The next step must be an endpoint/client/response-size pivot review before any further source edits or live jobs.

## 2. Observed Facts

| Field | Observation |
|---|---|
| Canary job | `fcf5135297e449468e881e957d89464d` |
| Runtime commit | `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd` |
| Public V2 output | `4.0.0-cb-precutover` / `blocked_precutover` |
| Hidden W2 status | `candidate_provider_network_damaged_structural` |
| Hidden W2 damaged reason | `candidate_runtime_query_coverage_invalid` |
| Query entries | `3` |
| Provider attempts | `3` |
| Network attempts | `3` |
| Candidate count | `0` |
| Total bytes | `0` |
| Attempt stop reason | all `compressed_byte_cap_exceeded` |
| Attempt phase | all `response_stream` |
| Side effects | no source material, parser, cache/SR/storage, EvidenceCorpus, evidence, report, verdict, warning, confidence, or public write |

The active blocker is now a bounded-response problem, not the prior address-selection problem.

## 3. External Endpoint Status Context

Official Wikimedia documentation checked on 2026-05-18:

- `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
- `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`

Relevant review facts:

- `api.wikimedia.org` endpoints are currently working normally.
- Core API gradual deprecation begins in July 2026.
- The Core page-search endpoint has an official equivalent endpoint map entry to project-local REST search: `{wiki_domain}/w/rest.php/v1/search/page`.

This does not force an immediate endpoint migration, but it makes endpoint durability part of the next design decision.

## 4. Recommended Direction

Prepare a separate source package, tentatively `X7-W2-PIV1-A`, only after Steering Board review.

Recommended implementation direction for that later package:

1. Keep the standard Node HTTPS connection path from TR1.
2. Do not reintroduce the custom pinned lookup callback.
3. Keep DNS pre-resolution/public-address validation and final remote-address validation.
4. Keep one provider and hidden-only W2 artifacts.
5. Keep redirect-deny, proxy-none, no credentials, no retries, and no provider SDKs.
6. Preserve the current no-source-material/no-parser/no-cache/SR/storage/no-EvidenceCorpus/no-report/no-verdict/no-public boundary.
7. Add an explicit bounded response-size strategy before live retry:
   - either use a small official search-result limit aligned with W2's hidden candidate cap;
   - or move to the official project-local equivalent search endpoint with the same small limit;
   - or reject Wikimedia page search as unsuitable for this W2 proof if neither option can be approved without weakening containment.
8. Keep the byte cap small and justified; do not simply raise it as the first repair unless review proves the endpoint cannot return a structurally useful candidate list inside the current cap.
9. Add synthetic tests proving bounded-result success, byte-cap failure remains fail-closed, no raw provider payload leaks, and public output remains blocked/precutover.
10. Allow at most one post-package live canary after commit/runtime refresh/verifiers/route preflight/clean idle checkpoint.

## 5. Specific Decisions Needed Before Source Edits

The Steering Board should decide:

| Decision | Options | Lead Developer recommendation |
|---|---|---|
| Endpoint authority | keep `api.wikimedia.org/core/v1/.../search/page`; switch to official project-local `w/rest.php/v1/search/page`; reject Wikimedia for W2 proof | Prefer project-local equivalent if Security accepts the allowlist change, because Core API deprecation starts July 2026. Otherwise keep Core API but add a strict result limit. |
| Response-size control | explicit small `limit`; larger byte cap; both; reject endpoint | Prefer explicit small `limit` first, aligned to W2 max hidden candidates. Avoid raising byte caps first. |
| Client path | standard Node HTTPS; `fetch`/Undici; provider SDK | Keep standard Node HTTPS. TR1 proved it reaches response stream and avoids new dependencies. |
| Final-address validation | preserve existing fail-closed check; weaken for project-local endpoint | Preserve fail-closed validation. No weakening. |
| Live proof | one canary; more diagnostics; no live proof | One canary only after package verifiers. If zero bytes/candidates persist, stop and retire or replace the provider endpoint. |

## 6. Not Authorized By This Package

PIV1 does not authorize:

- source edits;
- another live job;
- provider expansion;
- retries;
- source material;
- content dereference;
- parser execution;
- cache IO;
- durable storage;
- Source Reliability;
- EvidenceCorpus/evidence/report/verdict/warning/confidence behavior;
- public API/UI/report/export behavior;
- prompt/config/model/schema/gateway-policy edits;
- ACS/direct URL behavior;
- V1 reuse or cleanup.

## 7. Proposed PIV1-A Source Envelope

If review approves a PIV1-A implementation package, keep it limited to:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts` only if required for endpoint/parameter contract pass-through
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- governance/status/handoff/index docs

Do not include parser/source-material/EvidenceCorpus/report/public/prompt/config/model/provider expansion files.

## 8. Proposed PIV1-A Pass Bar

The next live proof, if approved, should pass only if:

- job reaches `SUCCEEDED`;
- first preparation event shows `pipeline: claimboundary-v2`;
- public V2 output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers leak publicly;
- W2 records network attempts;
- W2 records nonzero bytes;
- W2 records nonzero hidden structural candidate count;
- final address validation remains bounded and acceptable;
- downstream gate remains `candidate_to_source_material_gate_closed`;
- hidden artifacts still contain no source material, content/parser output, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, raw provider payload, raw query payload, credentials, or public output.

Stop/pivot condition:

- if a reviewed bounded endpoint/client package still records zero bytes and zero candidates, retire Wikimedia page search as the W2 proof endpoint or select a different provider through a new provider-selection package.

## 9. Reviewer Prompt

Review this PIV1 package and return `approve`, `modify`, or `reject`.

Check:

- whether the TR1 result correctly triggers a pivot instead of more TR1 repair;
- whether the next source package should prioritize response-size bounding, endpoint migration, or endpoint retirement;
- whether project-local REST search is preferable to Core API given Wikimedia's July 2026 deprecation timeline;
- whether explicit small `limit` should be the first repair before any byte-cap increase;
- whether all containment boundaries remain intact;
- whether one post-package canary is enough;
- whether the package avoids source material, parser, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work, retries, and provider expansion.

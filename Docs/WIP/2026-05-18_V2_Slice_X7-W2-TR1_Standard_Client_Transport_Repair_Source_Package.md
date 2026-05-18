# V2 Slice X7-W2-TR1 Standard-Client Transport Repair Source Package

**Date:** 2026-05-18
**Status:** Claude Opus-reviewed and approved; source edits allowed only after package commit
**Owner:** Lead Developer / Captain Deputy
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS6_DIAG5_Taxonomy_Live_Result.md`
**Baseline:** `8263164a` (`docs: record v2 w2 ls6 live result`)

## 1. Purpose

X7-W2-LS6 confirmed that the current product-route W2 failure is no longer an unknown taxonomy gap. The failure maps to:

```text
transportFailureClass: address_validation_failure
transportFailurePhase: address_selection
transportErrorShape: node_error_code_present
nodeErrorCodeCategory: address_validation_failure
```

W2 still produces zero bytes and zero candidates, so the next useful step is a narrow transport repair package.

TR1 may repair only the current W2 transport path enough to test whether the approved Wikimedia Core REST Search page-search endpoint can produce bounded JSON bytes and hidden structural candidates. TR1 must not broaden W2 into source execution, content dereference, source material, parsing, EvidenceCorpus, report/verdict behavior, provider expansion, public behavior, retries, or V1 work.

## 2. Lead Developer Direction

Captain direction for TR1:

- Treat the standard client path as the primary repair candidate before patching the existing custom DNS/`https.request` stack.
- Preserve all existing containment boundaries, byte/timeout limits, redirect-deny, proxy-none, no-credentials, endpoint allowlist, and raw-leak protections.
- Include synthetic tests for existing taxonomy failure modes.
- Include exactly one post-repair live canary after verifiers.
- If the standard-client repair does not produce nonzero bytes and candidates, stop and bring an endpoint/client pivot package back to the Steering Board.

Lead Developer interpretation:

- "Standard client path" means the production default request should use the normal Node HTTPS connection path without the current custom pinned lookup callback.
- Keep the existing explicit DNS pre-resolution and public-address validation before request.
- After response, keep final remote-address validation before accepting bytes.
- Keep `agent: false`, no proxy use, no redirects, no credentials, same endpoint allowlist, same request headers, same timeout/byte caps, same JSON-only response handling, and same sanitized hidden telemetry.
- Do not add `fetch`, `undici`, provider SDKs, package dependencies, proxy agents, retries, redirect following, credential handling, or alternate endpoints in TR1.

If this standard-client repair cannot be expressed while retaining final remote-address validation and leak controls, stop implementation and return a design/pivot package instead of weakening containment.

## 3. Current Ground Truth

LS6 live job:

| Field | Value |
|---|---|
| Job id | `20cfb674dc21448e96787c753d402e22` |
| Runtime commit | `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068` |
| Result classification | `PASS_X7_W2_LS6_DIAG5_MAPPING_CONFIRMED` |
| Public result | `4.0.0-cb-precutover` / `blocked_precutover` |
| Hidden W2 status | `candidate_provider_network_damaged_structural` |
| Hidden W2 damaged reason | `candidate_runtime_query_coverage_invalid` |
| Query entries | `3` |
| Network attempts | `3` |
| Candidate count | `0` |
| Total bytes | `0` |
| Attempt mapping | `address_validation_failure` / `address_selection` / `node_error_code_present` |

LS6 proves only the diagnostic mapping. It does not prove provider success, source availability, source material, EvidenceCorpus, evidence, report, verdict, confidence, warning, public readiness, or production source-execution readiness.

## 4. Approved Repair Shape

TR1 may change the production default transport path in `source-acquisition-network-transport.ts` as follows:

1. Keep `defaultResolve(...)` using `dns/promises.lookup(..., { all: true, verbatim: true })`.
2. Keep `classifySourceAcquisitionNetworkIpAddress(...)` and the existing private/loopback/link-local/reserved/metadata blocking rules.
3. Keep the selected endpoint's exact canonical hostname, `https`, port `443`, path, method, `q` parameter, `accept: application/json`, and internal user-agent header.
4. Replace only the current production default request's custom pinned lookup callback with the standard Node HTTPS connection path.
5. Keep `agent: false` or an equivalent no-pooling/no-proxy posture.
6. Keep timeout handling and cancellation handling.
7. Keep streamed compressed-byte cap enforcement before buffering.
8. Keep final remote-address validation before accepting response status, headers, or bytes.
9. Keep redirect-deny behavior.
10. Keep JSON-only content-type, JSON sniff, byte cap, decompression policy, JSON parse, and candidate-array pointer behavior unchanged.
11. Keep all diagnostics sanitized and bounded.

TR1 must not patch the old custom pinned-lookup callback as the first repair. If the standard-client path cannot produce nonzero bytes and candidates after implementation and one approved canary, do not keep iterating in TR1. Prepare an endpoint/client pivot package.

## 5. Source Envelope

Allowed production edits:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`

Allowed production edits only if strictly required by type pass-through or boundary guard:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`

Allowed test edits:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed governance/status files:

- this source package
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-TR1_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- prompt files;
- model policy, cache policy, gateway policy, or UCM/default config files;
- endpoint/provider allowlist constants outside the W2 transport path;
- candidate-provider portfolio files;
- package or lock files;
- provider SDK imports or dependencies;
- artifact route/sink files unless a verifier proves a pass-through contract mismatch caused by TR1;
- source material, content dereference, parser, packet/frame, cache, storage, Source Reliability, EvidenceCorpus, evidence, report, verdict, warning, confidence, public API/UI/export/compatibility files;
- ACS/direct URL files;
- V1 analyzer, prompt, type, helper, or cleanup files.

Stop and split a separate package if any verifier-backed issue requires editing outside this envelope.

## 6. Required Behavior

TR1 implementation must:

- apply `/debt-guard` compact path before source edits because this is a targeted failed-live-path repair;
- keep the W2 endpoint snapshot exact:
  - provider id `wikimedia_core`;
  - endpoint id `ep_wikimedia_core_page_search`;
  - host `api.wikimedia.org`;
  - path `/core/v1/wikipedia/en/search/page`;
  - method `GET`;
  - parameter `q` sourced from query text;
  - no credentials;
  - redirect `deny`;
  - proxy `none`;
  - JSON response only;
  - `pages` candidate array pointer;
- keep W2 cap and budget posture from QC3:
  - max query entries `6`;
  - one provider;
  - one attempt per query;
  - max three hidden candidates per query;
  - `1500ms` per-query timeout;
  - `9000ms` total network timeout;
  - byte caps `32768`;
  - retry policy `none`;
- keep no-cache, no-storage, no-Source-Reliability, no-source-material, no-content-dereference, no-parser, no-EvidenceCorpus, no-evidence, no-report, no-verdict, no-warning, no-confidence, no-public flags closed;
- preserve all existing taxonomy mappings for DNS, connection, network, host, address-family, address-validation, TLS, HTTP parser, timeout, cancellation, code-absent, non-error, byte-cap, content, redirect, and success paths;
- ensure raw runtime error codes, raw error messages, URL/path/query text, response bodies, headers, IP details beyond bounded counts/families/final-validation state, source material, provider payload values, candidates' raw titles/snippets/URLs/keys, stack, cause, secrets, cache keys, and SR fields never appear in hidden artifacts or public output;
- keep public V2 output `4.0.0-cb-precutover` / `blocked_precutover`.

## 7. Synthetic Test Requirements

Focused synthetic tests must prove:

- standard-client success path can produce a successful transport outcome with:
  - `candidateCount > 0`;
  - `compressedBytes > 0`;
  - `decompressedBytes > 0`;
  - `finalAddressValidation: matched_validated_public_address`;
  - `responseStatusCodeCategory: success_2xx`;
  - `contentTypeState: accepted_json`;
  - no raw payload or provider values in serialized outcomes;
- the production default request path no longer depends on the custom pinned lookup callback that caused LS6 address-selection failure;
- explicit fake/custom low-level transport tests still preserve existing behavior for injected success and all failure categories;
- address-validation failures still map to `address_validation_failure` / `address_selection`;
- previous DIAG2/DIAG3/DIAG4/DIAG5 categories remain stable;
- DNS timeout, DNS failure, private/loopback/link-local/reserved/metadata address blocking, final-address mismatch, redirect denial, content-type rejection, JSON sniff rejection, byte caps, decompression rejection, timeout, cancellation, TLS failures, HTTP parser failures, non-error throwable, and unknown-code cases stay bounded and non-leaking;
- proxy environment variables are ignored;
- no Authorization/cookie/credential header is emitted;
- provider payload poison values do not leak through outcomes, telemetry, W2 decision, W2 artifact, route JSON, `JSON.stringify(...)`, logs, or errors;
- successful provider-network loop materializes only hidden structural candidate records, not source material.

No unit test may call live Wikimedia or any other live endpoint.

## 8. Boundary Guard Requirements

Boundary guards must prove:

- no provider SDK, `fetch`, `undici`, axios, got, ky, node-fetch, proxy-agent, browser network API, child process, filesystem, database, cache, SR, parser, content transport, V1 analyzer/prompt/type/helper import appears in the TR1 edited W2 transport/factory path;
- product/orchestrator still does not import `source-acquisition-network-transport` directly;
- public API/UI/report/export/compatibility paths still do not import W2 or `source-acquisition-network-*`;
- no barrel re-export makes the W2 transport broadly reachable;
- TR1 does not weaken existing private/loopback/metadata address-blocking, redirect-deny, proxy-none, no-credentials, byte-cap, timeout, cache/SR/storage, source-material, parser, EvidenceCorpus, report/verdict/public guards.

If these assertions require broad boundary-guard refactoring, stop and split a guard-debt package before implementing TR1.

## 9. Required Verifiers Before Source Completion

Before source completion, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

Do not run expensive LLM tests, validation batches, or live jobs before the TR1 source implementation is committed and runtime is refreshed.

## 10. Post-Repair Live Canary

After TR1 implementation is committed and all required verifiers pass:

1. Refresh runtime from the committed TR1 implementation.
2. Re-check official Wikimedia endpoint documentation:
   - `https://wikitech.wikimedia.org/wiki/API_Portal/Deprecation`
   - `https://www.mediawiki.org/wiki/API:REST_API/Reference/en`
3. Prove runtime gates:
   - `FH_ANALYZER_V2_SHELL=enabled`
   - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
   - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
4. Prove hidden artifact routes are admin-only and no-store.
5. Prove clean worktree before and after a 60-second idle checkpoint.
6. Submit exactly one direct API job using the exact Captain-defined input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The post-repair canary passes only if:

- the job reaches `SUCCEEDED`;
- first preparation event shows `pipeline: claimboundary-v2`;
- public V2 output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers leak publicly;
- W2 artifact exists;
- W2 records network attempts;
- W2 records nonzero bytes;
- W2 records nonzero hidden structural candidate count;
- final address validation remains bounded and acceptable;
- hidden artifacts still contain no source material, parser/content, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, raw runtime code, raw query/provider payload, public output, or provider expansion;
- W2 downstream gate remains `candidate_to_source_material_gate_closed`.

If the canary does not produce nonzero bytes and candidates, stop. Do not patch the custom DNS stack inside TR1. Prepare an endpoint/client pivot package for Steering Board review.

## 11. Explicitly Not Authorized

TR1 must not:

- add live jobs before implementation commit and required verifiers;
- run more than one post-repair live canary;
- add retries;
- follow redirects;
- use proxies or environment proxy variables;
- add credentials, cookies, Authorization headers, API keys, or provider SDKs;
- change provider, host, path, request parameters, endpoint portfolio, or source language routing;
- add source material, content dereference, parser execution, parsed material, packet/frame consumption, cache IO, durable storage, Source Reliability, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, truth percentages, or public output;
- change prompts, configs, model policy, cache policy, gateway policy, or schemas;
- change ACS/direct URL behavior;
- reuse V1 code or clean V1 code.

## 12. Completion Requirements

After TR1 package preparation:

- append `Docs/AGENTS/Agent_Outputs.md`;
- create handoff `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-TR1_Source_Package.md`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- run `npm run index`;
- commit by explicit path only after review acceptance.

After TR1 implementation:

- create implementation handoff;
- append Agent_Outputs;
- update status/backlog;
- run required verifiers;
- commit source package by explicit path only;
- then execute the one post-repair live canary package flow.

## 13. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`.

Return `approve`, `modify`, or `reject`.

Check whether TR1 is the correct narrow repair after LS6:

- standard Node HTTPS client path without the custom pinned lookup callback is the primary repair candidate;
- existing DNS pre-resolution/public-address validation and final remote-address validation remain in force;
- endpoint/provider/credential/redirect/proxy/budget/byte/timeout constraints stay unchanged;
- no retries, provider expansion, source material, content dereference, parser, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, prompt/config/model/schema edits, ACS/direct URL, V1 work, or V1 cleanup are authorized;
- synthetic tests cover success and existing taxonomy failure modes;
- one post-repair live canary is allowed only after implementation commit, runtime refresh, verifiers, endpoint re-check, route preflight, and clean idle checkpoint;
- if the standard-client repair still produces zero bytes/candidates, the package stops and pivots to endpoint/client design review instead of patching the custom DNS stack.

## 14. Review Decision

| Role | Reviewer | Date | Decision | Notes |
|---|---|---:|---|---|
| Claude Opus 4.6 senior architect/security | Claude Opus 4.6 via `scripts/agents/invoke-claude.cjs` | 2026-05-18 | APPROVE | Reviewer confirmed TR1 is the correct narrow next package after LS6, the standard Node HTTPS connection path without the custom pinned lookup callback is a reasonable primary repair candidate, containment boundaries are preserved, the source/test envelope is narrow, synthetic tests and the one gated post-repair canary are adequate, the stop/pivot rule is correct, and no unauthorized scope expansion is present. Non-blocking observation: standard-client connection can re-resolve after DNS pre-validation; final remote-address validation mitigates this by failing closed on mismatch. |

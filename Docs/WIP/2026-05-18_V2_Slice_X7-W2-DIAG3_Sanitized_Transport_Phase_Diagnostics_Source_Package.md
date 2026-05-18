# V2 Slice X7-W2-DIAG3 Sanitized Transport Phase Diagnostics Source Package

**Date:** 2026-05-18
**Status:** approved by Claude Opus review; pending package verification/commit before implementation
**Owner:** Lead Developer / Captain Deputy
**Baseline:** `aea78bdb` (`docs: record v2 w2 ls3 diagnostic result`)
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Result.md`

## 1. Purpose

X7-W2-LS3 proved that the committed/refreshed product V2 route reaches W2 and captures DIAG2 fields on all network attempts. It also showed all three attempts still fail before final-address validation:

```text
dnsAddressCount = 1
selectedAddressFamily = ipv4
finalAddressValidation = not_reached
responseStatusCodeCategory = not_reached
contentTypeState = not_reached
transportFailureClass = unknown_transport_failure
```

DIAG3 should add one more bounded diagnostic layer so the next repair decision is not guesswork:

```text
Which structural transport phase and error shape did the code reach before failure?
```

DIAG3 is not a provider-success fix, source-quality gate, report-quality gate, public-readiness gate, provider expansion, or W2 completion-status repair.

## 2. Decision

Use a narrow source package, not another live job.

Claude Opus 4.6 recommended a synthetic/local diagnostic step before changing transport classification or W2 status semantics. I am adopting the core recommendation but tightening it into a source package rather than a pure docs marker, because the useful artifact is a small hidden diagnostic implementation plus local synthetic tests.

DIAG3 may add bounded hidden-only diagnostic fields and local tests that reproduce structural error shapes without touching live provider hosts.

### Claude Review Consolidation

Claude Opus 4.6 reviewed the draft package and returned `MODIFY`. The required changes have been folded into this package:

- field names and enum values are locked; any change requires follow-up review;
- loopback TCP/TLS fixtures and real local network listeners are removed from the allowed test surface;
- `nodeErrorCodeCategory` is added as a bounded enum-only diagnostic field;
- any `transportFailureClass` refinement must use an explicit enum mapping and must not inspect raw error text or other sensitive fields.

Claude Opus 4.6 re-reviewed the revised package and returned `APPROVE`.

DIAG3 must not:

- submit a live job;
- call the approved Wikimedia endpoint;
- call any live provider host;
- fetch source material, response bodies, candidate titles/excerpts/URLs, or content bytes;
- change W2 completion semantics;
- add retries, redirects, proxies, provider SDKs, credentials, cache IO, durable storage, Source Reliability, parser execution, EvidenceCorpus/evidence/report/verdict/warning/confidence generation, public output, ACS/direct URL behavior, V1 reuse/work/cleanup, package files, or lockfiles.

## 3. Implementation Objective

DIAG3 may add and propagate exactly these hidden-only structural fields:

- `transportFailurePhase`:
  - `not_applicable`
  - `dns_resolution`
  - `address_selection`
  - `socket_connect`
  - `tls_handshake`
  - `request_write`
  - `response_wait`
  - `response_stream`
  - `unknown_phase`
- `transportErrorShape`:
  - `not_applicable`
  - `node_error_code_present`
  - `node_error_code_absent`
  - `synthetic_timeout_marker`
  - `synthetic_cancel_marker`
  - `non_error_throwable`
- `nodeErrorCodeCategory`:
  - `none`
  - `dns_not_found`
  - `dns_temporary_failure`
  - `connection_refused`
  - `connection_reset`
  - `connection_timeout`
  - `operation_canceled`
  - `tls_certificate`
  - `tls_protocol`
  - `http_parser`
  - `other_known`
  - `unknown_absent`

The field names and enum values above are package-locked. Any implementation need to rename, add, remove, or semantically change one of these fields requires a follow-up package review before source edits continue. Counts, booleans, and bounded millisecond/byte numbers remain allowed. Raw messages, stacks, causes, URLs, paths, query strings, headers, IP addresses, provider payloads, and source/candidate data remain forbidden.

DIAG3 may also refine `transportFailureClass` from `unknown_transport_failure` only through an explicit enum mapping from `transportFailurePhase` plus `nodeErrorCodeCategory` to a pre-existing bounded failure class. The mapping must not read raw error text, stack, cause, URL, path, query, header, IP, payload, or candidate/source data. If no explicit mapping exists for a case, keep `unknown_transport_failure`.

## 4. Local Synthetic Probe Rule

Local probes are allowed only inside tests and only against injected synthetic targets:

- injected low-level transports;
- RFC-2606 reserved names only if DNS behavior is tested through injection rather than live resolver dependency.

Allowed operations:

- synthetic DNS success/failure through injected low-level transport;
- synthetic socket close/reset/timeout/cancel through injected low-level transport;
- synthetic TLS/request/response phase failures through injected low-level transport.

Forbidden operations:

- any live provider or real-world domain, including `api.wikimedia.org`;
- general web search;
- loopback TCP/TLS socket servers or real local network listeners;
- structural HEAD/GET/POST/other network requests, even to loopback;
- body fetch from real or fixture source content;
- parser invocation;
- cache/SR/storage writes;
- public route/API/UI/report/export behavior.

## 5. Source Envelope

Allowed production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if a focused import/export or enum-field guard update is needed

Allowed governance/status files:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG3_Sanitized_Transport_Phase_Diagnostics_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG3_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- prompt/config/model/schema files;
- provider policy or gateway approval flips;
- product/public API/UI/report/export/compatibility surfaces;
- content dereference/parser/source-material/EvidenceCorpus/evidence/report/verdict/warning/confidence code;
- cache, durable storage, Source Reliability, database, or persistence code;
- provider SDKs, package files, lockfiles, proxy support, redirect following, retries;
- ACS/direct URL execution;
- V1 analyzer/prompt/type/helper files;
- V1 cleanup.

## 6. Completion Bar

DIAG3 implementation is complete only if:

- W2 hidden attempt telemetry/artifacts expose the new enum-only transport phase/error-shape fields;
- focused tests prove code-present, code-absent, and bounded code-category failures are represented without raw error leakage;
- local synthetic tests use injected low-level transports only, contact no live provider hosts, create no loopback socket server, and fetch no bodies;
- public V2 output remains unchanged and pre-cutover/damaged;
- W2 completion semantics remain unchanged;
- all no-source-material/no-parser/no-cache/SR/no-storage/no-evidence/no-report/no-verdict/no-public constraints remain mechanically covered.

DIAG3 does not require a live job. If a later live confirmation is needed, create a separate reviewed LS4-style package.

## 7. Required Verifier Set

Before completion, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

Do not run expensive LLM tests, validation batches, or live jobs for DIAG3.

## 8. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG3_Sanitized_Transport_Phase_Diagnostics_Source_Package.md`.

Return `approve`, `modify`, or `reject`.

Focus on whether DIAG3 is a safe and useful next step after LS3:

- source package is narrow and does not turn into broad source execution;
- local synthetic probes/tests are allowed only without live provider hosts or response bodies;
- new diagnostics are enum-only and do not expose raw error message, stack, cause, URL/path/query/header/IP/payload/source/candidate data;
- W2 completion semantics stay unchanged;
- no live jobs, provider expansion, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, public output, ACS/direct URL, V1 work, or V1 cleanup are authorized.

# V2 Slice X7-W2-DIAG2 Sanitized Transport Diagnostics Source Package

**Date:** 2026-05-18
**Status:** approved for implementation after Claude Opus review; no live jobs authorized
**Owner:** Lead Developer / Captain Deputy
**Baseline:** `353e3b2d` (`docs: record v2 w2 transport diagnostic`)
**Parent diagnostic:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG1_Transport_Failure_Diagnostic.md`

## 1. Purpose

X7-W2-LS2 proved that the product V2 hidden path reaches W2, but the live provider-network attempt failed before any response bytes were observed. DIAG1 confirmed that existing telemetry is safe but too coarse: every attempt is only visible as sanitized `transport_failure` with zero bytes.

DIAG2 should add bounded sanitized transport diagnostics so the next package can distinguish transport causes without adding source material, content dereference, parser execution, public output, or another live job.

## 2. Current Evidence

Existing LS2 W2 artifact for job `36c9c6779b6947babbb895b42e916040`:

- W2 status: `candidate_provider_network_damaged_structural`
- damaged reason: `candidate_runtime_query_coverage_invalid`
- query entry count: `3`
- network attempts: `3`
- each attempt: `provider_failure` / `transport_failure`
- bytes: `0`
- byte state: `not_reached`
- durations: `28ms`, `2ms`, `2ms`

This rules out a W2 query-cap issue, response-byte cap issue, JSON/content-type failure, parser involvement, Source Reliability, cache, or public leak. It does not distinguish DNS failure, TLS failure, socket reset/refusal, network unreachable, address-family issue, local firewall/proxy behavior, or an HTTP-level provider rejection.

## 3. Implementation Objective

DIAG2 may add and propagate hidden-only sanitized diagnostic scalars:

- `dnsAddressCount`
- `selectedAddressFamily`: `not_reached`, `ipv4`, or `ipv6`
- `finalAddressValidation`
- `responseStatusCodeCategory`
- `contentTypeState`
- `transportFailureClass`

Scope note: `dnsAddressCount`, `finalAddressValidation`, `responseStatusCodeCategory`, and `contentTypeState` already exist on the lower-level hidden network diagnostic and need propagation into W2 attempt telemetry/artifacts. `selectedAddressFamily` and `transportFailureClass` are the two net-new diagnostic fields.

`transportFailureClass` must be an enum derived only from structural Node error code/category data, not raw error messages:

- `not_applicable`
- `dns_resolution_failure`
- `connection_reset`
- `connection_refused`
- `network_unreachable`
- `host_unreachable`
- `socket_timeout`
- `tls_failure`
- `address_family_failure`
- `unknown_transport_failure`

If a caught transport error has no structural code/category that can be safely classified, DIAG2 must use `unknown_transport_failure`. It must not inspect or expose raw error messages, stacks, causes, request paths, or provider payloads to improve classification.

DIAG2 must preserve existing W2 status semantics. A provider failure should still fail the LS-style W2 pass bar until a later reviewed package explicitly decides otherwise.

## 3.1 Review Result

Claude Opus 4.6 reviewed this package on 2026-05-18 and returned `approve` with two advisory clarifications:

- distinguish existing diagnostic fields that only need propagation from the two net-new fields;
- state the fallback behavior for non-Error or code-less transport throws.

Both clarifications are incorporated above. The review specifically accepted the narrow source envelope, enum/count-only diagnostic posture, no live rerun, and preservation of current W2 damaged semantics.

## 4. Source Envelope

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
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if the guard needs a focused import/export adjustment

Allowed governance/status files:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG2_Sanitized_Transport_Diagnostics.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- prompt/config/model/schema files
- provider policy or gateway approval flips
- product/public API/UI/report/export/compatibility surfaces
- content dereference/parser/source-material/EvidenceCorpus/evidence/report/verdict/warning/confidence code
- cache, durable storage, Source Reliability, database, or persistence code
- provider SDKs, package files, lockfiles, proxy support, redirect following, retries
- ACS/direct URL execution
- V1 analyzer/prompt/type/helper files
- V1 cleanup

## 5. Diagnostic Rules

DIAG2 diagnostics must remain structural and non-semantic.

Required behavior:

- no raw URL
- no raw request path with query
- no raw query text
- no raw provider payload
- no response body
- no response headers
- no raw IP address
- no raw error message
- no stack, cause, or exception object
- no source material
- no candidate title, excerpt, key, or URL
- no EvidenceCorpus, EvidenceItem, warning, verdict, confidence, truth percentage, or report prose
- no cache key or Source Reliability field

Allowed values are enum literals, counts, booleans, and bounded non-negative millisecond/byte numbers only.

## 6. Expected Runtime Meaning

Examples:

- DNS resolver throws before address selection:
  - `stopReason: dns_resolution_failed`
  - `dnsAddressCount: 0`
  - `selectedAddressFamily: not_reached`
  - `transportFailureClass: dns_resolution_failure`

- DNS succeeds with IPv4 and request throws `ECONNRESET` before response:
  - `stopReason: transport_failure`
  - `dnsAddressCount: >0`
  - `selectedAddressFamily: ipv4`
  - `responseStatusCodeCategory: not_reached`
  - `contentTypeState: not_reached`
  - `transportFailureClass: connection_reset`

- HTTP response is reached but status is rejected:
  - `stopReason: http_status_rejected`
  - `responseStatusCodeCategory: rejected`
  - `transportFailureClass: not_applicable`

DIAG2 must not infer cause beyond these structural classes.

## 7. Review Questions

1. Is this source envelope narrow enough for a diagnostic-only package?
2. Are `selectedAddressFamily` and `transportFailureClass` safe to expose in admin-only W2 artifacts?
3. Should `transportFailureClass` remain limited to structural Node error code categories and avoid raw messages entirely?
4. Should DIAG2 intentionally avoid a live rerun and leave that to a separate LS3 or repair package?
5. Does preserving current W2 damaged semantics remain the right posture until a successful transport attempt is observed?

## 8. Required Verifier Set

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

Do not run expensive LLM tests, validation batches, or live jobs for DIAG2.

## 9. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG2_Sanitized_Transport_Diagnostics_Source_Package.md`.

Return `approve`, `modify`, or `reject`.

Focus on whether DIAG2 should proceed as a narrow sanitized observability package after LS2/DIAG1. Pay special attention to:

- no source material, content dereference, parser, cache/SR/storage, EvidenceCorpus, evidence/report/verdict/warning/confidence, public output, ACS/direct URL, V1 work, or V1 cleanup;
- no prompt/config/model/schema/provider-policy changes;
- no raw URL, raw query, raw provider payload, response body/header, raw IP, raw error message, stack, or cause exposure;
- whether the proposed enum/count diagnostics are sufficient to discriminate the next transport hypothesis;
- whether preserving current W2 damaged semantics and avoiding a live rerun are correct for this slice.

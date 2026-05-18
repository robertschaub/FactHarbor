# V2 Slice X7-W2-DIAG1 Transport Failure Diagnostic

**Date:** 2026-05-18
**Status:** diagnostic complete; docs-only; no code changes; no live jobs
**Owner:** Lead Developer / Captain Deputy
**Input evidence:** X7-W2-LS2 job `36c9c6779b6947babbb895b42e916040`
**Source result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Result.md`

## Purpose

DIAG1 records the first diagnostic readout after the LS2 hard fail. It uses only the existing LS2 admin-only W2 artifact. It does not run another live job, change source code, expand provider execution, or inspect raw provider payloads.

## Claude Opus Recommendation

Claude Opus 4.6 reviewed the LS2 hard fail and recommended a diagnostic-only package before any repair. Its conclusion:

- W2 status semantics are currently consistent with the code: provider-failure query outcomes do not satisfy `runtimeDecisionHasCompletedCoverage`, so W2 returns `candidate_provider_network_damaged_structural`.
- The next question is not yet a W2 completion-status repair. The first question is why the transport attempts fail before any bytes are observed.
- No new live job should run until a specific transport hypothesis and fix package are reviewed.

## Observed W2 Artifact

Ledger:

```text
36c9c6779b6947babbb895b42e916040:precutover-observability
```

W2 top-level result:

| Field | Value |
|---|---|
| `candidateProviderNetwork.status` | `candidate_provider_network_damaged_structural` |
| `candidateProviderNetwork.damagedReason` | `candidate_runtime_query_coverage_invalid` |
| `candidateProviderNetwork.queryEntryCount` | `3` |
| `productExecution.networkAttemptCount` | `3` |
| `productExecution.totalDurationMs` | `32` |
| `productExecution.totalBytes` | `0` |

Network attempts:

| Attempt | Provider | Endpoint | Structural status | Stop reason | Duration | Timeout | Candidates | Bytes | Byte state |
|---:|---|---|---|---|---:|---:|---:|---:|---|
| 1 | `wikimedia_core` | `ep_wikimedia_core_page_search` | `provider_failure` | `transport_failure` | 28ms | 1500ms | 0 | 0 | `not_reached` |
| 2 | `wikimedia_core` | `ep_wikimedia_core_page_search` | `provider_failure` | `transport_failure` | 2ms | 1500ms | 0 | 0 | `not_reached` |
| 3 | `wikimedia_core` | `ep_wikimedia_core_page_search` | `provider_failure` | `transport_failure` | 2ms | 1500ms | 0 | 0 | `not_reached` |

Containment flags remained clean:

- `rawPayloadIncluded: false`
- `secretIncluded: false`
- `publicPayloadIncluded: false`
- `errorTraceIncluded: false`
- no source material
- no content dereference
- no parser execution
- no cache/SR/storage
- no EvidenceCorpus/evidence/report/verdict/warning/confidence/public write

## Interpretation

The existing sanitized telemetry is enough to rule out several hypotheses:

- Not a W2 query-cap issue: the live input emitted 3 Query Planning entries and QC3 admits up to 6.
- Not a timeout-budget hit: stop reason is `transport_failure`, not `timed_out`.
- Not an HTTP status rejection with observed bytes: byte state is `not_reached` and total bytes are 0.
- Not a content-type/decompression failure: those would occur after response headers/body are reached, but byte state stayed `not_reached`.
- Not a public-containment failure: public result stayed damaged/precutover and no hidden leak was found.

The current artifact does **not** expose enough sanitized low-level diagnostics to distinguish:

- host TLS/connection failure;
- Wikimedia user-agent policy rejection before body bytes are observed;
- custom `https.request` lookup/address handling issue on Windows;
- local network/proxy/firewall behavior;
- endpoint connection reset.

## Current Code Posture

Relevant current code behavior:

- `source-acquisition-network-transport.ts` maps low-level request exceptions to sanitized `transport_failure`.
- `source-acquisition-network-factory.ts` maps `transport_failure` to provider-level `provider_failure`.
- `candidate-runtime-closed-loop.ts` can still complete structurally with zero source candidates.
- `candidate-provider-network-loop.ts` requires completed runtime query coverage before returning `candidate_provider_network_completed`; failed provider outcomes therefore classify as damaged structural.

This is defensible for the first live gate: a live provider-network proof should not pass when every network attempt fails before bytes are observed.

## Next Package Recommendation

Do not rerun LS2.

Recommended next action: `X7-W2-DIAG2` source package for **sanitized transport diagnostics**, not a provider/source expansion.

Proposed objective:

- preserve existing hidden-only W2 behavior and public containment;
- add or expose bounded sanitized diagnostic scalars sufficient to distinguish low-level transport causes;
- avoid raw URL, raw query, provider response, response body, stack trace, secrets, candidate titles/excerpts/URLs, or source material;
- keep W2 completion semantics unchanged unless a later reviewed package explicitly decides otherwise.

Candidate DIAG2 allowed source envelope should be narrow:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- focused tests for sanitized diagnostic projection only
- boundary guard updates only if needed
- package/status/handoff/index docs

Potential sanitized fields:

- failure category enum, e.g. `tls_or_socket_error`, `dns_resolution_failed`, `timeout`, `cancelled`, `byte_cap`, `other_transport_error`;
- DNS address count;
- selected address family only (`4`/`6`), not address value;
- response reached boolean;
- final address matched boolean;
- TLS/socket failure class without message or stack.

DIAG2 must not add source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public output, provider portfolio expansion, ACS/direct URL, V1 reuse/work/cleanup, or another live job by default.

## Live-Job Position

No additional live job is justified immediately. A later single live job may be justified only after DIAG2 or a similarly reviewed package creates a discriminating, sanitized observation or a specific reviewed transport fix.

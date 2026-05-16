# V2 Slice 7N-3B3-2C-A Real Byte Handoff Source Package

**Date:** 2026-05-16
**Status:** deputy-approved source package; implementation may proceed only inside this exact envelope
**Owner role:** Lead Architect / Captain deputy
**Design parent:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C_Real_Byte_Handoff_Design_Package.md`
**Baseline:** `9a7814c1` (`docs: approve v2 real byte handoff design`)

## 1. Purpose

Define the exact source package that may implement the first real transport-byte custody step in Analyzer V2 source acquisition.

This package is for review only. It does not approve source edits until deputy review returns `approve`.

2C-A is deliberately narrower than parser execution:

- real fetched bytes may move from the content transport owner into the hidden packet sink;
- public transport outcomes remain byte-free;
- parser consumption of real fetched bytes remains blocked.

## 1.1 Review Result

Deputy review returned `approve` after one modification round:

- Evidence Lifecycle / LLM-quality reviewer `Linnaeus` (`019e2f8b-569f-7511-981d-83c53f6ea1b1`): `approve`.
- Security / isolation reviewer `Curie` (`019e2f8b-3a4e-7933-b6b5-a135f198271b`): initial `modify`, then `approve` after HMAC key ownership, sink-owned sealing, canonicalization, and no-key-leak tests were added.
- Runtime / lifecycle reviewer `Chandrasekhar` (`019e2f8b-21f2-79f0-9421-4cdfaf990d46`): initial `modify`, then `approve` after the separate 2C-A transport packet sink authority, explicit disposal API, concrete kill switch, and internal transport refactoring rule were added.

Consensus approval is limited to implementing 7N-3B3-2C-A inside this source envelope. Parser consumption of real fetched bytes, product/public wiring, live jobs, cache/SR/storage, evidence/report/warning generation, prompt/model/config/schema changes, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked by later gates.

Post-implementation review amendment: the first implementation review found that a hidden function-property byte-state factory still allowed arbitrary byte ingress by any caller that could import the sealing function. The accepted correction removes that hidden property and makes the positive transport-success path explicit through `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)`, with the symbol added to the packet-sink export list and to the exact transport-to-sink import guard. Direct `sealSourceAcquisitionContentTransportOwnedByteFrame(...)` remains a negative/direct-boundary entrypoint that rejects caller-created byte-state objects.

## 2. Source Decision

If approved, 2C-A may implement only the owner-only real-byte handoff from `source-acquisition-content-transport.ts` into `source-acquisition-content-packet-sink.ts`.

It may add:

- a transport-owned byte frame created only after validated transport success;
- hidden packet materialization from that frame inside the packet sink;
- structural handoff outcomes and diagnostics;
- exact boundary-guard amendments for the one-way transport-to-sink import relationship;
- focused tests for binding, rejection, no-leak, disposal, kill switch, rollback, and boundary reachability.

It must not add:

- parser consumption of real fetched bytes;
- parser source edits;
- parsed text, extracted text, evidence items, source records, EvidenceCorpus, warning, verdict, confidence, or report prose;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- prompt/config/model/schema changes;
- semantic relevance, applicability, extraction, probative, sufficiency, source-quality, language, or warning-materiality decisions;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 3. Exact Source Envelope

Allowed production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed documentation and handoff files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- one completion handoff under `Docs/AGENTS/Handoffs/`.

Forbidden production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`;
- product/orchestrator/runner/API/UI/report/export files;
- compatibility-view files;
- prompt files;
- config defaults or config schemas;
- V1 analyzer files.

## 4. Exact API Envelope

2C-A must preserve the 2B fixture boundary:

- `createSourceAcquisitionContentFixturePacket(...)` must stay fixture/control-only;
- the committed fixture catalog must not accept real transport bytes;
- 2C-A must add a separate real-byte entrypoint.

The only approved ownership direction is transport-to-sink:

- `source-acquisition-content-transport.ts` may import exact symbols from `./source-acquisition-content-packet-sink`;
- `source-acquisition-content-packet-sink.ts` must not import `source-acquisition-content-transport.ts`;
- `source-acquisition-content-parser.ts` remains untouched and must not import transport or real-byte handoff symbols;
- no barrel file may re-export 2C-A symbols.

Exact packet-sink exports allowed by 2C-A:

- `SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION` constant;
- `SourceAcquisitionContentTransportPacketSinkAuthority` type;
- `SourceAcquisitionContentTransportPacketSinkAuthoritySnapshot` type;
- `SourceAcquisitionContentTransportOwnedByteFrame` type;
- `SourceAcquisitionContentTransportPacketSealingOutcome` type;
- `SourceAcquisitionContentTransportPacketMaterializationOutcome` type;
- `SourceAcquisitionContentTransportPacketDisposalOutcome` type;
- `createSourceAcquisitionContentTransportPacketSinkAuthority(...)`;
- `sealSourceAcquisitionContentTransportOwnedByteFrame(...)`;
- `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)`;
- `materializeSourceAcquisitionContentTransportOwnedPacket(...)`;
- `disposeSourceAcquisitionContentTransportOwnedPacket(...)`.

Exact transport imports from `./source-acquisition-content-packet-sink`:

- `SourceAcquisitionContentTransportPacketSinkAuthority` type;
- `SourceAcquisitionContentTransportOwnedByteFrame` type;
- `SourceAcquisitionContentTransportPacketSealingOutcome` type;
- `SourceAcquisitionContentTransportPacketMaterializationOutcome` type;
- `SourceAcquisitionContentTransportPacketDisposalOutcome` type;
- `sealSourceAcquisitionContentTransportOwnedByteFrame`;
- `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess`;
- `materializeSourceAcquisitionContentTransportOwnedPacket`;
- `disposeSourceAcquisitionContentTransportOwnedPacket`.

Exact transport exports allowed by 2C-A:

- `SourceAcquisitionContentTransportPacketHandoffRequest` type;
- `SourceAcquisitionContentTransportPacketHandoffOutcome` type;
- `executeSourceAcquisitionContentTransportPacketHandoff(...)`.

`executeSourceAcquisitionContentTransport(...)` must keep its current byte-free outcome contract.

2C-A must not repurpose the existing 7N-3B3-2B fixture/control packet sink authority whose capability scope says `fixtureControlOnly: true` and `realTransportBytes: false`. It must add a distinct hidden transport-packet sink authority/capability in `source-acquisition-content-packet-sink.ts` with:

- `authorityVersion: "v2.source-acquisition.content-packet-sink.7n3b3-2c-a"`;
- `capabilityScope.fixtureControlOnly: false`;
- `capabilityScope.realTransportBytes: true`;
- `capabilityScope.productRuntime: false`;
- `capabilityScope.publicExposure: false`;
- `capabilityScope.cacheRead: false`;
- `capabilityScope.cacheWrite: false`;
- `capabilityScope.durableStorage: false`;
- `capabilityScope.sourceReliability: false`;
- `capabilityScope.semanticInterpretation: false`.

The 2B fixture authority, fixture catalog, and `createSourceAcquisitionContentFixturePacket(...)` behavior must remain unchanged.

Internal refactoring inside `source-acquisition-content-transport.ts` is allowed only when it avoids duplicating the existing validation/control chain and preserves the byte-free public contract of `executeSourceAcquisitionContentTransport(...)`.

## 5. Transport-Owned Byte Frame Contract

`SourceAcquisitionContentTransportOwnedByteFrame` must be:

- hidden/internal-only;
- non-serializable in practice: `JSON.stringify(...)` must reveal no bytes and no byte pointer;
- one-time-use;
- private-branded or owner-state-backed so plain objects and JSON-round-tripped copies reject;
- created only by sink-owned sealing after the transport success path has passed all 7N-3B3-1 controls;
- accepted only by `materializeSourceAcquisitionContentTransportOwnedPacket(...)`;
- disposed or invalidated after materialization or terminal rejection.

It must carry or privately bind:

- content dereference authority snapshot hash;
- parent provider-network authority snapshot hash;
- content target snapshot hash;
- content budget snapshot hash;
- fetch attempt id;
- execution-target opaque/HMAC references;
- packet sink authority snapshot hash;
- parser authorization status, fixed to `not_authorized`;
- parser policy id, fixed to `POLICY_PARSER_NOT_AUTHORIZED`;
- content-type policy id;
- content type state;
- byte count;
- byte digest;
- package/version ids;
- transport-owned byte state.

The byte frame must not carry or expose:

- raw URL, hostname, path, query, headers, provider JSON, source name, title, snippet, domain, cache key, SR score, evidence item, warning, verdict, confidence, report prose, secret, credential, stack trace, parsed text, or extracted text.

## 6. HMAC And Binding Contract

The packet sink owns sealing, HMAC key material, and HMAC verification. The transport owns validated bytes and provenance assembly, but it must never own or receive raw HMAC key material.

### 6.1 HMAC Key Ownership

HMAC key material must be owned by `source-acquisition-content-packet-sink.ts` as module-private, authority-bound runtime state created with `createSourceAcquisitionContentTransportPacketSinkAuthority(...)`.

The key material must not be:

- hardcoded;
- duplicated across modules;
- read from `env`, `process`, files, config, UCM, cache, database, or durable storage;
- carried in frames, diagnostics, outcomes, public metadata, errors, logs, or telemetry;
- enumerable, stringifiable, exported, or returned from any function.

The transport must never receive raw HMAC key material. Transport obtains a valid frame only by calling the sink-owned `sealSourceAcquisitionContentTransportOwnedByteFrame(...)` entrypoint. That entrypoint may accept only a post-success transport byte state plus canonical provenance and must return either a private-branded frame or a structural rejection. It must reject raw `Uint8Array`, `Buffer`, string, provider JSON, product/API, V1, copied, plain-objected, or JSON-round-tripped inputs that are not the approved post-success transport handoff request.

### 6.2 Canonical HMAC Serialization

The canonical frame must be deterministic and must not depend on object insertion order.

Use this canonical serialization:

1. Build exactly the field list below in the listed order.
2. Encode each field as `fieldName=<JSON value>`, where the JSON value is produced with `JSON.stringify` over a primitive string, boolean, or integer.
3. Join lines with `\n`.
4. Encode the resulting text as UTF-8.
5. Compute `HMAC-SHA-256` with the authority-bound module-private key material.

Canonical fields, in order:

1. `packageId`;
2. `versionId`;
3. `contentAuthoritySnapshotHash`;
4. `providerNetworkAuthoritySnapshotHash`;
5. `contentTargetSnapshotHash`;
6. `contentBudgetSnapshotHash`;
7. `fetchAttemptId`;
8. `executionTargetCanonicalHostnameReference`;
9. `executionTargetFixedPathReference`;
10. `executionTargetQueryReference`;
11. `packetSinkAuthoritySnapshotHash`;
12. `parserAuthorizationStatus`;
13. `parserPolicyId`;
14. `contentTypePolicyId`;
15. `contentTypeState`;
16. `byteCount`;
17. `byteDigest`;
18. `hmacAlgorithm`;
19. `hmacKeyId`.

All hash and digest fields must be lowercase 64-character SHA-256 hex strings. `byteCount` must be a non-negative safe integer represented as a JSON number. HMAC output must be encoded as uppercase hex and carried only as a structural verifier field, never as authority to retrieve bytes.

Requirements:

- HMAC algorithm and key id are bound fields;
- byte count and byte digest are recomputed by the sink from the approved post-success transport byte state;
- the packet sink verifies the canonical HMAC before materialization;
- mismatched authority, parent provider-network hash, target hash, budget hash, fetch attempt id, execution-target reference, sink authority hash, parser policy id, content-type policy id/state, byte count, byte digest, package id, or version id rejects;
- replay after disposal rejects;
- JSON-round-tripped handoff rejects;
- every rejection materializes no packet and retains no bytes.

## 7. Handoff Creation Preconditions

No handoff frame may be created until the existing 7N-3B3-1 transport controls pass:

- target validation;
- budget validation;
- authority validation;
- request binding validation;
- hostname normalization;
- DNS all-public check;
- final remote-address match;
- redirect denial;
- HTTP success status;
- declared/sniffed content-type match;
- declared, compressed, streaming, decompressed, and total byte caps;
- timeout/cancellation checks.

Blocked DNS, final-address mismatch, redirect, non-2xx status, declared/sniffed mismatch, byte-cap failures, timeout, and cancellation must create no handoff and retain no bytes.

## 8. Materialization And Disposal Contract

`materializeSourceAcquisitionContentTransportOwnedPacket(...)` may return only:

- accepted hidden packet metadata;
- disposed structural outcome;
- rejected structural outcome.

It must never return raw bytes or parsed text.

The accepted hidden transport packet must have an explicit release path. 2C-A must implement `disposeSourceAcquisitionContentTransportOwnedPacket(...)` and must use it for all terminal paths that retain a packet. Retention capacity must be released using module-private byte state, not public metadata.

Dispose on:

- materialization success when the packet is later released;
- transport request failure;
- materialization rejection;
- policy mismatch;
- byte cap overrun;
- retained packet cap overrun;
- retained byte cap overrun;
- retained memory cap overrun;
- sink cap overrun;
- timeout;
- cancellation;
- kill switch;
- rollback;
- implementation-defined abort.

Disposed references must reveal only structural disposal state.

Disposal failure is a structural failure outcome.

## 9. Kill Switch And Rollback

2C-A must be default-closed until explicitly enabled by the hidden source-acquisition runtime owner.

The concrete kill switch is the `transportPacketHandoffMode` field on `SourceAcquisitionContentTransportPacketHandoffRequest`.

Allowed values:

- `"disabled"`: default when omitted and the only behavior available through `executeSourceAcquisitionContentTransport(...)`;
- `"enabled_hidden_transport_to_sink_7n3b3_2c_a"`: required before `executeSourceAcquisitionContentTransportPacketHandoff(...)` may create a frame.

Even when `transportPacketHandoffMode` is enabled, handoff must remain blocked unless the provided `SourceAcquisitionContentTransportPacketSinkAuthority` is a module-owned 2C-A transport-packet sink authority with `capabilityScope.realTransportBytes === true` and the exact authority version above.

When disabled:

- `executeSourceAcquisitionContentTransport(...)` remains unchanged and byte-free;
- no real-byte handoff frame is created;
- 2B fixture/control-only parser/sink behavior remains available to tests;
- no public/product behavior changes.

Rollback target:

- restore the pre-2C-A state where 7N-3B3-1 returns byte-free structural transport outcomes and 7N-3B3-2B is fixture/control-only.

Any later live-smoke gate must record commit hash, runtime refresh/reseed, hidden artifact inspection proof, and rollback instructions before live jobs.

## 10. Boundary Guard Updates

Boundary guards must be amended to:

- allow only the exact transport-to-packet-sink imports listed in Section 4;
- block transport-to-parser imports;
- block parser-to-transport imports;
- block packet-sink-to-transport imports;
- block barrel re-exports;
- block product/public transitive reachability to real-byte handoff symbols and packet sink internals;
- block cache, storage, DB, Source Reliability, provider SDK, prompt/model, test/mock, ACS/direct URL, and V1 imports;
- block `fs`/`node:fs`, `process`/`node:process`, `child_process`, worker/subprocess APIs, arbitrary filesystem reads/writes, env/credential reads, and browser automation in the sink/handoff path, except already-approved 7N-3B3-1 transport Node-core network imports.

## 11. Required Tests

Focused tests must prove:

- public transport outcomes remain byte-free;
- hidden diagnostics remain byte-free;
- handoff outcomes, frames, packets, disposed references, and diagnostics reveal no bytes, parsed text, URLs, hostnames, paths, queries, headers, provider JSON, titles, snippets, source names, secrets, stack traces, cache keys, SR scores, evidence, warnings, verdicts, confidence, or report prose through direct properties, errors, telemetry, or `JSON.stringify(...)`;
- handoff creation happens only after validated transport success;
- blocked DNS, final-address mismatch, redirect, non-2xx status, declared/sniffed mismatch, byte-cap failures, timeout, and cancellation create no handoff and retain no bytes;
- wrong/stale authority, parent provider-network hash, target hash, budget hash, fetch attempt id, execution-target reference, sink authority hash, parser policy id, content-type policy id/state, byte count, byte digest, package id, and version id each reject;
- forged HMAC from public fields rejects;
- the same frame/provenance under a different sink authority rejects;
- HMAC key material is not enumerable, stringified, returned, logged, or readable through frames, packets, diagnostics, outcomes, errors, or telemetry;
- HMAC key material is not sourced from `env`, files, config, UCM, cache, database, durable storage, or public constants;
- copied, plain-objected, JSON-round-tripped, replayed, stale, disposed, caller-created, arbitrary byte, provider JSON, product/API, and V1 inputs are rejected;
- `createSourceAcquisitionContentFixturePacket(...)` and the committed fixture catalog still reject real transport bytes and remain fixture/control-only;
- packet sink quota release uses private byte state, not public metadata;
- valid retained packets are disposed on all terminal paths;
- kill switch and rollback paths dispose retained handoffs/packets or create no handoff at all;
- non-English byte fixtures show identical structural lifecycle behavior without semantic interpretation;
- boundary guards enforce the exact source/test envelope and import/export rules.

## 12. Minimum Verifiers

If deputy review approves implementation, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 2C-A.

## 13. Stop Conditions

Stop and request debate/review or Captain escalation before any of these:

- parser consumption of real fetched bytes;
- parser source edits;
- source edits outside the exact 2C-A envelope;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- semantic relevance/applicability/extraction/probative/sufficiency/warning decisions;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.

## 14. Review Questions

Deputy reviewers must answer:

1. Is the 2C-A source envelope narrow enough?
2. Is the exact API/import/export envelope implementable without creating broad byte or pointer surfaces?
3. Does the package preserve 2B fixture/control-only ingress?
4. Are HMAC/provenance binding, no-allocation, retention, and disposal requirements sufficient?
5. Are the tests and boundary guards enough to prove no public/product/cache/SR/storage/V1 leakage?
6. Is parser real-byte consumption clearly blocked until a later parser-isolation package?
7. Is it clear that no live jobs, evidence/report generation, prompt/model/config changes, ACS/direct URL, or V1 cleanup is approved?

Return `approve`, `modify`, or `reject`. If any answer is uncertain, do not implement source.

## 15. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Real_Byte_Handoff_Source_Package.md` as a proposed V2 source package. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source implementation until review approval. Verify that the envelope is limited to `source-acquisition-content-transport.ts`, `source-acquisition-content-packet-sink.ts`, focused transport/sink tests, and boundary guards. Check that 2C-A is only transport-owner real bytes into hidden packet sink, with public transport outcomes still byte-free, 2B fixture ingress preserved, and parser consumption of real fetched bytes blocked. Pay special attention to exact API/import/export surface, HMAC/provenance binding, no-allocation on failed transport controls, one-time private branding, disposal/retention, no arbitrary byte ingress, no product/public/cache/SR/storage/V1 reachability, no semantic decisions, no evidence/report/warning generation, no live jobs, kill switch, rollback, and required verifiers.

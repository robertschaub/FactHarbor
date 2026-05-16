# V2 Slice 7N-3B3-2C Real Transport-Byte Handoff Design Package

**Date:** 2026-05-16
**Status:** review-approved design; separate 7N-3B3-2C-A source package required before source implementation
**Owner role:** Lead Architect / Captain deputy
**Parent consolidation:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2B_Post_Implementation_Consolidation.md`
**Baseline:** `2bdaff69` (`docs: consolidate v2 parser sink source slice`)

## 1. Purpose

Define the next decision after 7N-3B3-2B.

7N-3B3-1 validates and fetches real content bytes but returns only byte-free hidden diagnostics. 7N-3B3-2B provides a parser/sink boundary that can consume only module-owned committed fixture material. Therefore real fetched bytes have no approved path into the hidden packet sink.

This package asks whether to open a narrow, owner-only real transport-byte handoff gate. It does not approve source implementation. A separate 7N-3B3-2C-A source package must be drafted and approved before any source edits.

## 2. Consolidated Debate Decision

The deputy debate converged on `APPROVE_TO_DRAFT`.

Consensus:

1. Draft 7N-3B3-2C now as a source-acquisition lifecycle boundary.
2. Keep it docs-only. Review approval of this package may approve the design direction, not source edits.
3. Split the first possible source implementation into a separate 2C-A source package: transport-owner bytes into a hidden packet sink only.
4. Do not let a parser read or parse real fetched bytes in 2C-A.
5. Require a later reviewed parser-isolation package before parser consumption of real fetched bytes.

Rationale:

- Deferring raw-byte custody to semantic extraction would mix security/lifecycle ownership with LLM-owned analytical stages.
- Implementation-first would fight current boundary guards, which intentionally block transport-to-sink imports.
- The lowest-risk next gate is a byte custody handoff, not parsed text, evidence generation, or report generation.

## 2.1 Review Result

Deputy review approved this design package after security and Evidence Lifecycle modifications:

- Runtime implementation review: `approve`.
- Security/isolation review: initial `modify`, then `approve` after HMAC-frame, no-allocation, forbidden-access, disposal-failure, kill-switch/rollback, and exact mismatch verifier requirements were added.
- Evidence Lifecycle / LLM-quality review: initial `modify`, then `approve` after exact API/import/export envelope, fixture-boundary preservation, and non-executable parser authorization status were added.

This approval is design approval only. It does not approve source edits. A separate 7N-3B3-2C-A source package must be drafted and approved before implementation.

## 3. Package Decision

7N-3B3-2C is a design/review package for a later hidden real-byte handoff implementation. It is not a source approval package.

The first possible source implementation package must be named `7N-3B3-2C-A` and limited to:

- owner-created real-byte handoff from `source-acquisition-content-transport.ts`;
- hidden packet materialization in `source-acquisition-content-packet-sink.ts`;
- tests for transport handoff, sink acceptance/rejection, no-public-leak, disposal, and boundary guards.

It must not include:

- parser consumption of real fetched bytes;
- parser imports into transport;
- transport imports into parser;
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

## 4. 2C-A Source Envelope

If a later deputy-reviewed 2C-A source package approves implementation, only these production files may be touched:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`

Only these test files may be touched:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs/handoff files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- one completion handoff under `Docs/AGENTS/Handoffs/`.

Forbidden for 2C-A:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`;
- product/orchestrator/runner/API/UI/report/export files;
- compatibility-view files;
- prompt files;
- config defaults or config schemas;
- V1 analyzer files.

## 5. Handoff Object Requirements

The real-byte handoff object must be:

- created only by `source-acquisition-content-transport.ts`;
- accepted only by `source-acquisition-content-packet-sink.ts`;
- non-serializable and private-branded;
- one-time-use;
- hidden and internal-only;
- rejected if copied, plain-objected, JSON-round-tripped, replayed, stale, disposed, caller-created, or created from a diagnostic/outcome object;
- impossible to construct from arbitrary `Uint8Array`, `Buffer`, string, `SourceAcquisitionContentTransportOutcome`, hidden diagnostic, provider JSON, product/API input, or V1 type.

The public `SourceAcquisitionContentTransportOutcome` must stay byte-free. It must not include the handoff object or any pointer that lets product/public code retrieve bytes.

## 6. Exact API And Import Envelope

2C-A must use a separate real-byte handoff entrypoint. It must not widen `createSourceAcquisitionContentFixturePacket(...)`, the committed fixture catalog, or the 2B fixture/control path to accept real transport bytes.

The approved ownership pattern for 2C-A is one-way transport-to-sink:

- `source-acquisition-content-transport.ts` may import exact symbols from `./source-acquisition-content-packet-sink`;
- `source-acquisition-content-packet-sink.ts` must not import `source-acquisition-content-transport.ts`;
- `source-acquisition-content-parser.ts` remains untouched and must not import transport or real-byte handoff symbols;
- no barrel file may re-export 2C-A symbols.

Exact future packet-sink exports for 2C-A, if a source package later approves them:

- `SourceAcquisitionContentTransportOwnedByteFrame` type;
- `SourceAcquisitionContentTransportPacketMaterializationOutcome` type;
- `materializeSourceAcquisitionContentTransportOwnedPacket(...)`.

Exact future transport imports from `./source-acquisition-content-packet-sink`:

- `SourceAcquisitionContentPacketSinkAuthority` type;
- `SourceAcquisitionContentTransportOwnedByteFrame` type;
- `SourceAcquisitionContentTransportPacketMaterializationOutcome` type;
- `materializeSourceAcquisitionContentTransportOwnedPacket`.

Exact future transport exports for 2C-A, if a source package later approves them:

- `SourceAcquisitionContentTransportPacketHandoffRequest` type;
- `SourceAcquisitionContentTransportPacketHandoffOutcome` type;
- `executeSourceAcquisitionContentTransportPacketHandoff(...)`.

`executeSourceAcquisitionContentTransport(...)` must keep its current byte-free outcome contract. Any new handoff outcome must be hidden/internal-only, byte-free, and not product/public reachable.

## 7. Binding Requirements

The handoff must bind real byte material to:

- content dereference authority snapshot hash;
- parent provider-network authority snapshot hash;
- content target snapshot hash;
- content budget snapshot hash;
- fetch attempt id;
- execution-target opaque/HMAC references;
- sink authority snapshot hash;
- parser authorization status, fixed to `not_authorized` for 2C-A;
- parser policy id, fixed to a structurally valid non-executable `POLICY_PARSER_NOT_AUTHORIZED` value for 2C-A;
- content-type policy id;
- content type state;
- byte count;
- byte digest;
- package/version ids.

Binding must be enforced through a transport-owner canonical HMAC frame:

- `source-acquisition-content-transport.ts` must compute the canonical HMAC over all listed provenance fields;
- the HMAC frame must include bound key id and algorithm;
- `source-acquisition-content-packet-sink.ts` must verify the HMAC before materialization;
- byte count and byte digest must be computed from transport-owned byte state, not caller metadata;
- any mismatch must reject without materializing packet state.

The handoff may be created only after all existing 7N-3B3-1 transport controls pass:

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

Failed controls must not allocate handoff state. Blocked DNS, final-address mismatch, redirect, non-2xx status, declared/sniffed content mismatch, byte-cap failure, timeout, and cancellation must produce no handoff and retain no bytes.

## 8. Retention And Disposal Requirements

Retention must be hidden, bounded, non-durable, and disposal-driven.

Dispose on:

- success;
- request failure;
- sink rejection;
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

Byte zeroization is best-effort in JavaScript memory. The required guarantee is removal of module-owned dereference paths, no returned byte payloads, and no public/product reachability.

## 9. Parser Isolation Boundary

2C-A must not let `source-acquisition-content-parser.ts` read or parse real fetched bytes.

Before any parser consumes real bytes, a later reviewed package must define and verify parser isolation.

Minimum parser-isolation requirements for that later package:

- no network access;
- no env or credential access;
- no arbitrary filesystem reads;
- no filesystem writes;
- no inherited descriptors that allow local file/secret reads;
- no cache/storage/database access;
- no Source Reliability access;
- no product/public imports;
- no prompt/model calls;
- no browser automation, subresource loading, script execution, or embedded link following;
- no Node `vm` as the isolation boundary;
- worker/process/container isolation choice explicitly reviewed;
- sentinel file/secret leakage tests.

In-process transport-to-sink handoff is acceptable for 2C-A because transport already owns validated fetched bytes in-process. In-process parser consumption of real fetched bytes is not acceptable in 2C-A.

## 10. Boundary Guard Requirements

2C-A boundary guards must:

- allow only the exact-symbol transport-to-packet-sink imports listed in Section 6;
- continue blocking transport-to-parser imports;
- continue blocking parser-to-transport imports;
- block barrel re-exports;
- block product/public transitive reachability to transport handoff and packet sink internals;
- block cache, storage, DB, Source Reliability, provider SDK, prompt/model, test/mock, ACS/direct URL, and V1 imports;
- block `fs`/`node:fs`, `process`/`node:process`, `child_process`, worker/subprocess APIs, arbitrary filesystem reads/writes, env/credential reads, and browser automation in the sink/handoff path, except the already-approved 7N-3B3-1 transport Node-core network imports;
- prove public surfaces cannot import or re-export parser/sink/transport handoff symbols.

Current boundary guards intentionally block the required transport-to-sink relationship. 2C-A may amend those guards only inside the reviewed envelope above.

## 11. No-Leak Verifiers

2C-A implementation must add focused verifiers proving:

- public transport outcomes remain byte-free;
- hidden diagnostics remain byte-free;
- `JSON.stringify(...)` on outcomes, diagnostics, packets, handoffs, and disposed references does not reveal raw bytes, parsed text, URLs, hostnames, paths, queries, headers, provider JSON, titles, snippets, source names, secrets, stack traces, cache keys, SR scores, evidence, warnings, verdicts, or report prose;
- copied, plain-objected, JSON-round-tripped, replayed, stale, disposed, caller-created, arbitrary byte, provider JSON, product/API, and V1 inputs are rejected;
- wrong or stale authority, parent provider-network hash, target hash, budget hash, fetch attempt id, execution-target reference, sink authority hash, parser policy id, content-type policy id/state, byte count, byte digest, package id, and version id each reject;
- replay after disposal rejects;
- JSON round-trip of a valid handoff rejects;
- handoff creation happens only after validated transport success;
- `createSourceAcquisitionContentFixturePacket(...)` and the committed fixture catalog still reject real transport bytes and remain fixture/control-only;
- blocked DNS, final-address mismatch, redirect, non-2xx status, declared/sniffed mismatch, byte-cap failures, timeout, and cancellation create no handoff and retain no bytes;
- packet sink quota release uses private byte state, not public metadata;
- valid retained packets are disposed on all terminal paths;
- kill switch and rollback paths dispose retained handoffs/packets or create no handoff at all;
- non-English byte fixtures show identical structural lifecycle behavior without semantic interpretation.

## 12. Kill Switch And Rollback

2C-A must include a default-closed activation/kill-switch posture.

When disabled or rolled back:

- 7N-3B3-1 remains byte-free structural content transport;
- 7N-3B3-2B remains fixture/control-only;
- no public/product behavior changes;
- no live jobs are meaningful.

The implementation package must name:

- exact kill-switch condition;
- exact rollback target;
- runtime refresh/reseed checklist before any later executable gate;
- hidden artifact inspection proof required before live smoke.

## 13. Minimum Review Questions

Deputy reviewers must answer:

1. Is 2C-A correctly limited to transport-owner real-byte handoff into hidden packet sink?
2. Is parser consumption of real fetched bytes clearly blocked until a later reviewed isolation package?
3. Are binding, lifecycle, disposal, and no-leak rules sufficient?
4. Is the file envelope narrow enough?
5. Are boundary-guard changes explicit enough?
6. Is it clear that no product/public wiring, live jobs, cache/SR, evidence/report generation, prompt/model/config changes, ACS/direct URL, V1 reuse, or V1 cleanup is approved?

Return `approve`, `modify`, or `reject`. If any answer is uncertain, do not implement source.

## 14. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C_Real_Byte_Handoff_Design_Package.md` as a proposed docs-only V2 real transport-byte handoff design package. Return `approve`, `modify`, or `reject`. Confirm that it does not authorize source implementation and that a separate 7N-3B3-2C-A source package must be drafted and approved before any source edits. Verify that the proposed first implementation package, 2C-A, is limited to owner-created real bytes from `source-acquisition-content-transport.ts` into hidden bounded packet materialization in `source-acquisition-content-packet-sink.ts`, with public transport outcomes remaining byte-free. Check that parser consumption of real fetched bytes is blocked until a later reviewed parser-isolation package. Pay special attention to SSRF/URL/header/secret leakage, HMAC/provenance binding, one-time private branding, disposal/retention, no arbitrary byte ingress, no product/public/cache/SR/storage/V1 reachability, no semantic decisions, no evidence/report/warning generation, no live jobs, exact file envelope, boundary guards, kill switch, rollback, and required verifiers.

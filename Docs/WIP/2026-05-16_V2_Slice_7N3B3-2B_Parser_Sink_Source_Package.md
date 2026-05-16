# V2 Slice 7N-3B3-2B Parser/Sink Source Package

**Date:** 2026-05-16
**Status:** implemented and hardened; post-implementation review/consolidation pending
**Owner role:** Lead Architect / Captain deputy
**Parent gate:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2A_Parser_Sink_Isolation_Package.md`
**Implementation baseline:** `267bfb9e` (`feat: add v2 content dereference boundary`)
**Isolation baseline:** `a2c27cda` (`docs: harden v2 parser sink package`)
**Package approval / source commits:** `d6b13b95` package re-review approval, `13ff68d3` implementation, `6e71bbea` debt-guard hardening

## 1. Purpose

Define the exact source package that may later implement a hidden parser boundary and content-packet sink after the approved 7N-3B3-2A isolation design.

This package was source-approved after deputy re-review and implemented in the commits listed above. It intentionally keeps real fetched-byte parsing out of scope. The current 7N-3B3-1 content transport returns only byte-free structural outcomes; it does not expose raw transport bytes to parser/sink files.

## 2. Package Decision

7N-3B3-2B is the safe fixture/control-only source package.

It may propose source implementation for:

- hidden packet-sink ownership and lifecycle;
- parser input/output protocol for approved immutable fixtures or controlled test material only;
- structural parser outcomes and packet lifecycle states;
- no-public-leak and no-semantic-leak tests;
- boundary guards that prove parser/sink files are not reachable from product/public surfaces.

It must not propose source implementation for:

- owner-only real transport-byte handoff from `source-acquisition-content-transport.ts`;
- parsing real fetched bytes from 7N-3B3-1 transport;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or Captain canary execution;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- prompt/config/model/schema changes;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

If implementation cannot stay fixture/control-only, stop. Draft 7N-3B3-2C first and include the transport owner file in the reviewed envelope.

## 2.1 Review Result

Initial deputy review returned:

- Security reviewer: `APPROVE`.
- LLM / Evidence Lifecycle reviewer: `APPROVE`.
- Senior Developer / implementation-envelope reviewer: `MODIFY`.

Implementation-envelope modifications required before source implementation:

- enumerate exact exports and import allowlists for both new production files;
- define the exact fixture/control-only byte-bearing entrypoint and its owner brand;
- narrow timeout/hang requirements to a minimal structural timeout outcome for 2B, without adding a worker, injectable parser engine, or real parser isolation surface;
- explicitly require boundary-guard updates that replace current parser/sink absence assertions with parser/sink owner-file allowlists and product/public transitive reachability bans.

Those modifications were applied before implementation. Re-review approved source implementation inside this exact envelope.

## 2.2 Implementation Result

7N-3B3-2B source implementation is complete at `13ff68d3` with corrective hardening at `6e71bbea`.

The hardening commit addressed the post-implementation debt-guard review findings:

- ordinary caller `Uint8Array` ingress is rejected; fixture packets can only be created from a module-owned committed fixture catalog bound by opaque fixture id, expected byte count, expected digest, parser policy id, content-type policy id, and packet-sink authority snapshot;
- valid packets are disposed on success, request failure, policy mismatch, timeout, and cancellation;
- disposed packet references no longer validate as active fixture packets and are scrubbed to structural disposal status only;
- non-owner runtime/barrel imports and re-exports now also block parser/sink owner files.

7N-3B3-2B remains fixture/control-only. It does not approve real transport-byte handoff, product/public wiring, live jobs, cache IO, Source Reliability integration, evidence/report generation, ACS/direct URL execution, or V1 cleanup.

## 3. Exact Source Envelope

Allowed production files for 7N-3B3-2B:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`

Allowed test files for 7N-3B3-2B:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed documentation and handoff files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- one completion handoff under `Docs/AGENTS/Handoffs/`.

Forbidden production files for 7N-3B3-2B:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`;
- product/orchestrator/runner/API/UI/report/export files;
- compatibility-view files;
- prompt files;
- config defaults or config schemas;
- V1 analyzer files.

`source-acquisition-content-transport.ts` is reserved for 7N-3B3-2C if real transport-byte handoff is separately approved.

## 4. Parser Boundary

The parser boundary must be structural only.

Allowed parser inputs:

- an approved 2B fixture/control packet created only by `createSourceAcquisitionContentFixturePacket(...)`;
- opaque packet material references created by the approved packet sink owner;
- parser policy id;
- content type policy id;
- byte count and lifecycle metadata.

Forbidden parser inputs:

- arbitrary byte objects from callers;
- real transport response bytes;
- raw URL, source name, domain, title, snippet, query text, claim text, provider JSON, response headers containing secrets, or public route data;
- network authority;
- cache, Source Reliability, product, public, prompt/model, ACS/direct URL, or V1 authority.

Allowed parser outputs:

- parser attempt id;
- parser structural status;
- content type state;
- observed byte count;
- parser output byte count;
- sanitized stop reason;
- disposal status;
- opaque hidden packet or sink reference id.

Forbidden parser outputs:

- raw content;
- extracted text;
- normalized text;
- evidence items;
- source records;
- relevance/applicability decisions;
- probative value, evidence strength, source credibility meaning, source reliability score, scarcity/sufficiency, warning materiality, verdict, confidence, or report prose.

## 5. Packet Sink Boundary

The packet sink is hidden, non-durable, and bounded.

Required properties:

- module-owned construction only;
- no database write;
- no filesystem write;
- no cache read/write/key construction;
- no Source Reliability import/call/write;
- no product/public pointer;
- bounded retained packet count;
- bounded retained byte count;
- explicit disposal status;
- opaque packet ids and sink reference ids;
- no id embedding of URL, domain, source name, query text, claim text, language labels, or semantic labels;
- no raw payload or parsed text in returned objects, diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, or `console.*`.

Disposal requirements:

- disposal runs on success, parser failure, timeout, cancellation, byte cap overrun, memory cap overrun, sink cap overrun, kill switch, rollback, and implementation-defined abort;
- disposed sink references are permanently invalid;
- disposed references cannot resurrect bytes, parsed material, diagnostics, parser output, or packet metadata beyond structural disposal status;
- disposal failure is a structural failure outcome.

## 6. Fixture/Control-Only Rule

7N-3B3-2B may use in-process parsing only because it is fixture/control-only.

Required safeguards:

- tests must prove arbitrary caller byte objects are rejected;
- test fixtures must be immutable, bounded, committed, and not derived from live jobs or provider responses;
- parser/sink implementation must not introduce a path that accepts 7N-3B3-1 transport output as bytes;
- parser/sink implementation must not infer source identity, relevance, applicability, or quality from fixture content;
- non-English fixture/control material must produce the same structural behavior except unchanged provenance.

If a later package needs real fetched bytes, real-byte parsing requires reviewed worker/process/container isolation and a 7N-3B3-2C transport-owner handoff package.

The exact 2B fixture ingress must be:

- `createSourceAcquisitionContentFixturePacket(params)` in `source-acquisition-content-packet-sink.ts`;
- available only for immutable, bounded fixture/control bytes in tests;
- private-branded with a module-private `WeakSet` or equivalent owner-only brand;
- bound to explicit `fixturePacketId`, `parserPolicyId`, `contentTypePolicyId`, byte count, byte digest, and packet sink authority snapshot hash;
- rejected if copied, plain, JSON-round-tripped, constructed outside the packet-sink owner, disposed, over cap, or missing the expected digest/count/policy binding;
- structurally marked as `source: "fixture_control_only_7n3b3_2b"`;
- impossible to create from `SourceAcquisitionContentTransportOutcome`, content transport diagnostics, arbitrary `Uint8Array`, `Buffer`, string, provider JSON, or product/API input.

2B fixture ingress is not a future compatibility surface. It is a bounded test/control mechanism that must be deleted or replaced by 7N-3B3-2C if real transport bytes are later approved.

## 7. Import And Export Constraints

`source-acquisition-content-parser.ts` may import only:

- Node structural utilities that do not create network, storage, process, env, cache, or filesystem authority;
- V2 runtime content-envelope types or validation helpers needed for structural IDs and outcomes;
- V2-owned local utilities that are explicitly allowed by boundary guards.

`source-acquisition-content-packet-sink.ts` may import only:

- Node structural utilities for IDs, hashes, or bounded in-memory state;
- V2 runtime content-envelope types or validation helpers needed for structural IDs and outcomes;
- V2-owned local utilities that are explicitly allowed by boundary guards.

Both files must export only the functions/types listed below. No barrel export is allowed.

Exact exports for `source-acquisition-content-packet-sink.ts`:

- `SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION`
- `SourceAcquisitionContentPacketSinkAuthoritySnapshot`
- `SourceAcquisitionContentPacketSinkAuthority`
- `SourceAcquisitionContentFixturePacket`
- `SourceAcquisitionContentPacketLifecycleStatus`
- `SourceAcquisitionContentPacketSinkOutcome`
- `createSourceAcquisitionContentPacketSinkAuthority`
- `isSourceAcquisitionContentPacketSinkAuthority`
- `readSourceAcquisitionContentPacketSinkAuthoritySnapshot`
- `createSourceAcquisitionContentFixturePacket`
- `isSourceAcquisitionContentFixturePacket`
- `disposeSourceAcquisitionContentFixturePacket`

Exact exports for `source-acquisition-content-parser.ts`:

- `SOURCE_ACQUISITION_CONTENT_PARSER_VERSION`
- `SourceAcquisitionContentParserRequest`
- `SourceAcquisitionContentParserOutcome`
- `SourceAcquisitionContentParserStructuralStatus`
- `parseSourceAcquisitionContentFixturePacket`

Exact import allowlist for `source-acquisition-content-packet-sink.ts`:

- `node:crypto` with `createHash` only;
- `./source-acquisition-content-envelope` for `SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION` and content-envelope types only.

Exact import allowlist for `source-acquisition-content-parser.ts`:

- `./source-acquisition-content-packet-sink` for the exact packet/sink types and validators needed to consume a fixture packet and dispose it;
- `./source-acquisition-content-envelope` for content-envelope types only.

If implementation needs any other import or export, stop and patch this package before coding.

Forbidden imports:

- `apps/web/src/lib/analyzer/`;
- V1 prompt files or V1 prompt helpers;
- `fetch`, provider SDKs, browser automation, `http`, `https`, `undici`, or network helpers;
- `fs`, database, cache, config storage, or durable storage helpers;
- Source Reliability modules;
- product/orchestrator/runner/API/UI/report/export modules;
- prompt loader, model adapter, or provider boundary modules.

## 8. Required Tests

The source package must add or update tests proving:

- exact source/test file envelope and exact export/import allowlists;
- parser and sink files are absent from product/public transitive reachability;
- no barrel re-export exposes parser/sink files;
- no V1 analyzer/prompt/type/helper import or reuse;
- no network, provider SDK, browser automation, direct `fetch(...)`, cache/storage/config IO, Source Reliability, prompt/model, product/public, ACS/direct URL, or durable storage import;
- arbitrary byte objects are rejected;
- only approved immutable fixtures/control material can enter parser tests;
- real transport-byte handoff is impossible without `source-acquisition-content-transport.ts`;
- copied/plain/JSON-round-tripped packet or sink references are rejected;
- packet ids and sink refs are opaque and non-dereferenceable;
- sink caps bound retained packet count and retained byte count;
- disposal clears retained bytes and parsed material on every terminal path;
- disposed references cannot resurrect bytes or parsed material;
- parser failure and the minimal 2B structural timeout/abort path produce structural outcomes only;
- serialized return objects, hidden diagnostics, telemetry, thrown errors, `JSON.stringify(...)`, and `console.*` leak no forbidden payload;
- outputs contain no evidence items, source records, applicability, extraction, probative values, Source Reliability scores, scarcity/sufficiency, warnings, verdicts, confidence, report fields, or public prose;
- non-English fixture/control content receives the same structural behavior except unchanged pass-through provenance.

The minimal 2B timeout/abort path must not add a worker, subprocess, parser plugin engine, injectable parser callback, network/browser parser, or real isolation surface. It may only validate a supplied `startedAt` / `timeoutMs` / `now` structural request field or an `AbortSignal` state before bounded in-process fixture parsing, then return a structural `timed_out` or `cancelled` outcome before reading packet material.

Boundary guard updates must explicitly replace the current 7N-3B3-1 parser/sink absence assertion with:

- parser/sink production files present only at the exact two owner paths;
- parser/sink test files present only at the exact two focused test paths;
- parser/sink owner imports match the exact allowlists above;
- parser/sink exports match the exact export lists above;
- `source-acquisition-content-transport.ts` remains excluded from 2B edits and cannot import parser/sink files;
- product/public/orchestrator/runner/API/UI/report/export files cannot import or transitively reach parser/sink owner files;
- existing content-dereference files cannot import parser/sink files except through a later 7N-3B3-2C package.

## 9. Minimum Verifiers For Implementation

If deputy review approves implementation, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3B3-2B.

## 10. Review Questions

Deputy reviewers must answer:

1. Is the 7N-3B3-2B source envelope narrow enough for fixture/control-only parser/sink implementation?
2. Is it explicit enough that real transport-byte handoff is blocked until 7N-3B3-2C?
3. Are parser/sink lifetime, disposal, cap, and no-public-leak rules sufficient?
4. Are the import/export guards strong enough to prevent product/public/cache/SR/V1 reachability?
5. Are no-semantic-leak and multilingual-neutrality requirements sufficient without over-designing real parsing?
6. Are the required tests enough to prove fixture/control-only behavior and prevent accidental real-byte wiring?

Return `approve`, `modify`, or `reject`. If any answer is uncertain, do not implement source.

## 11. Original Reviewer Prompt

This was the deputy-review prompt used before implementation approval. It is retained for traceability; it is not the current next action.

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2B_Parser_Sink_Source_Package.md` as a proposed V2 parser/sink source package. Return `approve`, `modify`, or `reject`. Check that it authorizes no implementation until review approval, and that the proposed source envelope is limited to fixture/control-only `source-acquisition-content-parser.ts`, `source-acquisition-content-packet-sink.ts`, focused tests, and boundary guards. Verify that real transport-byte handoff from `source-acquisition-content-transport.ts` is explicitly reserved for a later 7N-3B3-2C package; no product/public wiring, live jobs, cache IO, durable storage, Source Reliability, prompt/config/model/schema edits, ACS/direct URL execution, evidence/report generation, V1 reuse, or V1 cleanup is allowed. Pay special attention to packet sink lifetime/disposal, no-public-leak tests, no semantic relevance/applicability/probative/sufficiency decisions, multilingual neutrality, and exact import/export guards.

## 12. Stop Conditions

Stop and return to deputy review or Captain escalation before any of these:

- source implementation before deputy approval;
- editing `source-acquisition-content-transport.ts`;
- parsing real fetched bytes;
- accepting arbitrary caller byte objects;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- cache IO or durable raw-content storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

Concrete parser execution beyond fixture/control-only source, real-byte handoff, public/product wiring, and live jobs remain separate high-risk gates.

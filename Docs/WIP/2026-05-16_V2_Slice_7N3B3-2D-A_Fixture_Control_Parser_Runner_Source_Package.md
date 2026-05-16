# V2 Slice 7N-3B3-2D-A Fixture/Control Parser Runner Source Package

**Date:** 2026-05-16
**Status:** draft for deputy review; source implementation blocked
**Owner role:** Lead Architect / Captain deputy
**Design parent:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Parser_Isolation_Design_Package.md`
**Design consolidation:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Post_Review_Consolidation.md`
**Baseline:** `00b98611` (`docs: approve v2 parser isolation design`)

## 1. Purpose

Define the exact source package that may later implement a hidden parser runner protocol harness over fixture/control packets only.

This package is for deputy review only. It does not approve source edits until deputy review returns `approve` and the approval is recorded in this file.

2D-A is deliberately narrower than parser execution over real fetched bytes:

- fixture/control packets may be consumed by a one-shot child-process protocol harness;
- parser output remains structural and hidden;
- real fetched-byte parser execution remains blocked until a later 2D-B OS-level denial boundary package is reviewed and approved.

## 1.1 Approval Traceability

Parent design approval:

- 2D was tightened in `92b003cf` and approved in `00b98611`.
- Security, Senior Developer, and LLM/Evidence Lifecycle deputy re-review all returned `APPROVE`.

Source approval required before coding:

- This 2D-A package must receive explicit deputy review approval.
- The review result, reviewer roles, reviewer verdicts, and any required modifications must be recorded here before source implementation starts.
- If review returns `modify` or `reject`, do not implement source.

## 2. Package Decision

If approved, 2D-A may implement only:

- a hidden parser runner request/response protocol for committed fixture/control material;
- a one-shot child process launched by a V2 runtime owner file;
- sanitized structural parser runner outcomes;
- exact packet-sink materialization for fixture/control runner input only;
- terminal packet disposal on every success, rejection, timeout, cancellation, malformed response, oversized response, worker crash, kill switch, and rollback path;
- focused tests and boundary guards proving fixture/control-only behavior and no product/public reachability.

It must not implement:

- parser execution over real fetched bytes;
- use of `SourceAcquisitionContentTransportOwnedByteFrame` or transport-owned packets as parser input;
- source-acquisition execution wiring;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or Captain canary execution;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- prompt/config/model/schema changes;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- semantic relevance, applicability, extraction, probative, sufficiency, source-quality, language, or warning-materiality decisions;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

If implementation cannot stay fixture/control-only, stop and draft 2D-B first.

## 3. Exact Source Envelope

Allowed production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner.worker.cjs`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed documentation and handoff files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- one completion handoff under `Docs/AGENTS/Handoffs/`.

Forbidden production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts`;
- source-acquisition candidate/network/content dereference files;
- Evidence Lifecycle files;
- product/orchestrator/runner/API/UI/report/export files;
- compatibility-view files;
- prompt files;
- config defaults or config schemas;
- V1 analyzer files.

No source package may edit outside this exact reviewed file envelope.

## 4. Fixture/Control Boundary

2D-A may move fixture/control bytes from the packet sink into the parser runner protocol only through a parser-owned consumption path.

The packet sink may add exactly one fixture runner consumption API:

- `consumeSourceAcquisitionContentFixturePacketForParserRunner(...)`

This API must:

- accept only a valid `SourceAcquisitionContentFixturePacket`;
- reject copied, plain-objected, JSON-round-tripped, disposed, arbitrary byte, transport-owned, provider JSON, product/API, and V1 inputs;
- accept only parser policy and content-type policy ids that match the fixture packet;
- provide a fresh bounded byte copy only to a callback owned by `source-acquisition-content-parser.ts`;
- never return bytes, base64, text, raw content, parsed text, URLs, headers, provider JSON, source names, titles, snippets, secrets, file paths, evidence, warnings, verdicts, confidence, or report prose;
- dispose the fixture packet in a `finally`-equivalent terminal path;
- scrub retained packet material and release retained-byte counters on every terminal path.

Boundary guards must allow imports of this API only from `source-acquisition-content-parser.ts`. No other production file may import it.

Transport-owned packet and frame APIs remain forbidden parser inputs. 2D-A must not import `source-acquisition-content-transport.ts`, and transport must not import parser or runner-protocol files.

## 5. Runner Protocol

2D-A may add `source-acquisition-content-parser-runner-protocol.ts` as the sole parent-side child-process/protocol owner.

Allowed responsibilities:

- build a bounded fixture/control runner request;
- launch a one-shot child process with `process.execPath`, `shell: false`, `windowsHide: true`, and pipe stdio only;
- pass fixture/control request material through stdin only;
- parse a bounded stdout response;
- kill the child on timeout, cancellation, malformed response, oversized response, worker crash, or parent-side rollback;
- sanitize stderr, thrown errors, and diagnostics;
- return structural parser protocol outcomes only.

The request may contain:

- parser attempt id;
- parser policy id;
- content-type policy id;
- packet id or fixture-control provenance id;
- byte count;
- byte digest;
- bounded fixture/control byte payload for the worker protocol only.

The request must not contain:

- real fetched bytes;
- transport-owned packet/frame material;
- raw URL, domain, path, query, header, source name, title, snippet, provider JSON, source reliability score, cache key, prompt/model telemetry, evidence, warning, verdict, confidence, report prose, API key, credential, env value, file path carrying source material, or V1 identifier.

The response may contain:

- parser attempt id;
- structural status;
- observed byte count;
- decoded text length or sanitized structural text length;
- runner version id;
- stop reason;
- disposal status.

The response must not contain:

- raw bytes;
- base64 payload;
- raw or parsed text;
- source identifiers;
- evidence or report semantics;
- stack traces;
- stderr;
- secrets;
- file paths.

Every request and response must be schema-validated before use. Malformed or extra-field-bearing responses must fail closed.

## 6. Worker Entrypoint

2D-A may add a checked-in CommonJS worker entrypoint:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner.worker.cjs`

The worker file must:

- be executable by `process.execPath` without `npx`, `tsx`, `ts-node`, dynamic transpilation, or any dev-only loader;
- read a single bounded JSON request from stdin;
- write one bounded JSON response to stdout;
- write no raw bytes, raw text, source material, secrets, paths, or stack traces to stderr;
- perform structural decoding/counting only;
- exit after one request.

The worker file must not:

- import any module except built-in structural primitives explicitly approved by boundary guards;
- read `process.env`;
- perform network calls;
- read or write files;
- spawn child processes or workers;
- load native addons;
- call provider SDKs;
- import packet sink, transport, Evidence Lifecycle, product/public, cache/storage/config, Source Reliability, prompt/model, ACS/direct URL, or V1 modules;
- execute scripts, load subresources, follow links, render browser content, parse PDF/office/binary formats, or run active content.

Because this source package is still fixture/control-only and not product-wired, it does not claim deployed Next standalone readiness. It must prove the worker entrypoint is a checked-in executable file available to unit tests and `npm -w apps/web run build`. Before any product/deployed runtime wiring, a later package must add an explicit Next standalone/artifact tracing verifier or replace the entrypoint mechanism with a reviewed deployment-safe runner.

## 7. Parser Integration

`source-acquisition-content-parser.ts` may be updated to route fixture/control parsing through the runner protocol.

Allowed parser changes:

- replace or wrap the current in-process fixture parse path with the 2D-A runner protocol;
- keep the public return shape byte-free and structural;
- preserve existing request validation, policy matching, timeout, cancellation, and disposal semantics;
- add runner protocol status fields only if they remain hidden/internal and structural.

Forbidden parser changes:

- accepting transport-owned packets or frames;
- importing `source-acquisition-content-transport.ts`;
- returning parsed text or evidence/report fields;
- adding semantic meaning decisions;
- importing provider SDKs, prompts/models, cache/storage/config, Source Reliability, product/public, ACS/direct URL, or V1 modules.

## 8. Import And Export Constraints

Exact new exports allowed from `source-acquisition-content-parser-runner-protocol.ts`:

- `SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION`
- `SourceAcquisitionContentParserRunnerRequest`
- `SourceAcquisitionContentParserRunnerResponse`
- `SourceAcquisitionContentParserRunnerOutcome`
- `executeSourceAcquisitionContentParserRunnerProtocol`

Exact imports allowed for `source-acquisition-content-parser-runner-protocol.ts`:

- `node:child_process` with `spawn` only;
- `node:path` for worker entrypoint path resolution only;
- `node:fs` with `existsSync` only to fail closed when the checked-in worker entrypoint is unavailable;
- V2 runtime parser types from `./source-acquisition-content-parser` only if reviewers approve an acyclic type-only import;
- no packet sink import unless review modifies this package.

Exact new export allowed from `source-acquisition-content-packet-sink.ts`:

- `consumeSourceAcquisitionContentFixturePacketForParserRunner`

Exact new import allowed for `source-acquisition-content-parser.ts`:

- `executeSourceAcquisitionContentParserRunnerProtocol` from `./source-acquisition-content-parser-runner-protocol`;
- `consumeSourceAcquisitionContentFixturePacketForParserRunner` from `./source-acquisition-content-packet-sink`.

`source-acquisition-content-parser-runner.worker.cjs` must not be imported by production modules. It may only be launched as the reviewed child-process entrypoint by `source-acquisition-content-parser-runner-protocol.ts`.

No barrel export is allowed.

## 9. Boundary Guard Updates

Boundary guards must prove:

- the exact production/test file envelope;
- the exact import/export lists above;
- no product/public/orchestrator/runner/API/UI/report/export transitive reachability;
- no source-acquisition transport-to-parser, parser-to-transport, runner-to-transport, or transport-to-runner imports;
- only `source-acquisition-content-parser.ts` imports the packet-sink fixture runner consumption API;
- only `source-acquisition-content-parser-runner-protocol.ts` uses `node:child_process`;
- the worker file imports no network, filesystem, env, child/worker, native addon, provider SDK, prompt/model, cache/storage/config, Source Reliability, product/public, Evidence Lifecycle, ACS/direct URL, or V1 modules;
- no V1 analyzer/prompt/type/helper import or reuse;
- no prompt/model/config/schema edits;
- no live-job/product exposure.

## 10. Required Tests

The source package must add or update tests proving:

- default-closed fixture runner behavior before explicit parser request;
- parser runner protocol succeeds only for committed fixture/control packets;
- arbitrary bytes, copied packets, JSON-round-tripped packets, disposed packets, transport-owned packets, transport-owned frames, provider JSON, product/API input, and V1-shaped objects reject;
- the child-process protocol cannot receive real fetched bytes or 2C-A transport-owned material;
- parser policy and content-type policy mismatch reject and dispose;
- timeout, cancellation, malformed response, oversized response, stderr output, non-zero exit, signal termination, and worker crash map to structural failure outcomes;
- no orphan child process remains on Windows after timeout/cancellation/failure;
- stdout and stderr are bounded and sanitized;
- worker entrypoint exists as a checked-in `.cjs` file and does not rely on dev loaders;
- serialized requests are not returned, logged, thrown, or included in diagnostics;
- serialized outcomes contain no bytes, base64, raw text, parsed text, URLs, headers, provider JSON, source names, titles, snippets, secrets, paths, evidence, warnings, verdicts, confidence, report prose, or V1 identifiers;
- packet material is disposed and retained-byte counters release on every terminal path;
- non-English fixture/control material receives the same structural behavior except unchanged byte/text counts;
- parser output is not consumed by Evidence Lifecycle, product/orchestrator/runner/API/UI/report/export paths;
- boundary guards enforce exact file envelope, import/export allowlists, child-process ownership, worker restrictions, no V1 reuse, and no public reachability.

## 11. Minimum Verifiers

If deputy review approves implementation, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 2D-A.

## 12. Review Questions

Deputy reviewers must answer:

1. Is the 2D-A source envelope narrow enough for fixture/control parser runner protocol implementation?
2. Is the packet-sink fixture runner consumption API safe enough, or does it expose too broad a byte capability?
3. Is the child-process protocol owner acceptable for fixture/control only?
4. Is the checked-in `.cjs` worker entrypoint an acceptable answer to the TypeScript `noEmit` caveat for this non-product slice?
5. Are real fetched-byte parser execution and transport-owned packet/frame consumption clearly blocked until 2D-B/2D-C?
6. Are the import/export guards and tests sufficient to prevent product/public/cache/SR/storage/prompt/model/V1 reachability?
7. Are no-semantic-leak and multilingual-neutrality requirements sufficient?
8. Are the verifiers sufficient before implementation?

Return `approve`, `modify`, or `reject`. If any answer is uncertain, do not implement source.

## 13. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-A_Fixture_Control_Parser_Runner_Source_Package.md` as a proposed V2 source package. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source implementation until deputy approval is recorded. Verify that the source envelope is limited to `source-acquisition-content-parser.ts`, `source-acquisition-content-packet-sink.ts`, a new `source-acquisition-content-parser-runner-protocol.ts`, a checked-in `source-acquisition-content-parser-runner.worker.cjs`, focused tests, and boundary guards. Check that it remains fixture/control-only: no real fetched-byte parser execution, no transport-owned packet/frame consumption, no source-acquisition execution wiring, no product/public/API/UI/report/export wiring, no live jobs, no cache/SR/storage, no prompt/model/config/schema edits, no evidence/report/warning/verdict/confidence generation, no semantic text analysis, no ACS/direct URL, no V1 reuse, and no V1 cleanup. Pay special attention to the packet-sink fixture byte consumption API, child-process lifecycle on Windows, sanitized stdout/stderr/errors, no dev loader dependency, no-public-leak proof, and whether this should be modified before source implementation.

## 14. Stop Conditions

Stop and return to deputy review or Captain escalation before any of these:

- source implementation before deputy approval;
- source edits outside the exact 2D-A envelope;
- parser execution over real fetched bytes;
- accepting transport-owned packets or frames as parser input;
- editing `source-acquisition-content-transport.ts`;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- cache IO or durable raw-content/parsed-text storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

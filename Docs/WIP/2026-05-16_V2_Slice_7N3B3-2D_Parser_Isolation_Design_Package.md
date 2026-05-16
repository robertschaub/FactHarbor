# V2 Slice 7N-3B3-2D Parser Isolation Design Package

**Date:** 2026-05-16
**Status:** review-clean docs-only design; source implementation blocked pending separate 2D-A package
**Owner role:** Lead Architect / Captain deputy
**Parent consolidation:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Post_Implementation_Consolidation.md`
**Baseline:** `beee0953` (`docs: consolidate v2 hidden byte handoff`)

## 0. Debate Result

Deputy debate converged on `ADOPT_WITH_SCOPE_TIGHTENING`. Formal deputy review first returned `MODIFY` from Security and `APPROVE` from Senior Developer and LLM/Evidence Lifecycle review. After the security modification was incorporated, all three deputy re-reviewers returned `APPROVE`.

- parser isolation is the correct next gate before source-acquisition execution wiring;
- a dedicated one-shot child process plus staged content-type allowlist is acceptable only as a protocol/harness direction;
- in-process parsing, Node `vm`, and worker threads are rejected as the security boundary for real fetched bytes;
- container, separate OS user, OS sandbox, or equivalent reviewed OS-level denial boundary is mandatory before executing parser code over real fetched bytes;
- the next gate remains docs-only and authorizes no source edits.

One implementation caveat is mandatory for any later source package: `apps/web` is TypeScript `noEmit`, so a parser worker entrypoint must be built and available in tests and deployed Next runtime without relying on `npx tsx`, `ts-node`, or another dev-only loader.

Security review resolution: Node permission flags and a child process are useful defense-in-depth, but they are not a malicious-code sandbox. A child-process-only 2D-A source package may implement the parser runner protocol with fixture/control bytes only. It must not parse real fetched bytes unless a reviewed OS-level isolation boundary is also present.

Final 2D review result:

- Security: `APPROVE`; prior `MODIFY` resolved by making OS-level denial mandatory before real fetched-byte parser execution.
- Senior Developer: `APPROVE`; staged 2D-A/2D-B/2D-C sequencing and `noEmit` worker-entrypoint caveat are implementable enough for a docs-only design.
- LLM/Evidence Lifecycle: `APPROVE`; parser output remains structural/hidden and carries no evidence/report semantics.

2D authorizes design state only. The next allowed action is to draft a separate 2D-A source package for a fixture/control parser runner protocol harness. It does not authorize source edits by itself.

## 1. Purpose

Define the parser-isolation boundary required before V2 may parse real fetched bytes.

7N-3B3-2C-A proves hidden byte custody from content transport into a bounded packet sink. It does not prove parser safety. Real fetched bytes are untrusted input, and parser failure or parser compromise must not become a path to product/public exposure, cache/storage writes, Source Reliability calls, prompt/model calls, evidence generation, or V1 reuse.

This package is docs-only. It asks reviewers to approve, modify, or reject the isolation direction before any source edits.

## 2. Current State

Already implemented:

- 7N-3B3-1: hidden content dereference validates/fetches real content and returns byte-free structural outcomes.
- 7N-3B3-2B: fixture/control-only packet sink and structural parser boundary.
- 7N-3B3-2C-A: hidden/default-closed transport-owner real-byte handoff into the packet sink, with immediate terminal disposal and no parser consumption.

Still blocked:

- parser consumption of real fetched bytes;
- parsed text output from real fetched bytes;
- source-acquisition execution wiring;
- live jobs;
- product/public/API/UI/report/export reachability;
- evidence items, source records, EvidenceCorpus, warnings, verdicts, confidence, or report prose;
- cache IO, durable storage, Source Reliability, prompt/model/config/schema changes, ACS/direct URL execution, V1 reuse, and V1 cleanup.

## 3. Decision Question

What parser isolation model is acceptable for the first real fetched-byte parser gate?

The answer must balance:

- security: hostile bytes must not gain network, env, secret, filesystem, cache, SR, product, or public access;
- maintainability: the isolation design must be implementable and testable in the current Windows development environment;
- scope control: parser output is structural parsed-content material only, not evidence or semantic analysis;
- cost and quality: do not add live jobs, LLM calls, or product wiring merely to test parser custody.

## 4. Recommended Direction

The recommended direction is a staged parser-isolation gate:

1. **2D:** approve parser-isolation design only; no source edits.
2. **2D-A:** if approved later, implement a hidden parser runner protocol and child-process harness only over fixture/control bytes, still without product wiring or live jobs.
3. **2D-B:** define and review the OS-level isolation boundary required for real fetched bytes: container, separate OS user, OS sandbox, or equivalent reviewed denial boundary.
4. **2D-C:** if 2D-B is approved and verifiers pass, add the first minimal structural parser for inert text/JSON/HTML bytes only within the approved content-type allowlist.
5. **Later gate:** wire parsed-content output into Evidence Lifecycle execution only after parser isolation, parsed-content lifecycle, hidden artifact inspection, and no-public-leak proof are complete.

The first real-byte parser implementation must not start with PDF, office documents, browser automation, JavaScript execution, subresource loading, or broad content-type support.

## 5. Isolation Model

Preferred protocol harness model for review:

- a one-shot child-process parser runner launched with `process.execPath`, `shell: false`, `windowsHide: true`, and explicit pipe/IPC stdio only;
- stripped environment except explicitly approved non-secret structural settings;
- stdin/stdout or equivalent bounded message protocol only;
- no bytes, URLs, secrets, or file paths passed through argv, env, or temp files;
- no network authority passed to the runner;
- no packet sink authority passed to the runner beyond a one-use parser packet handle;
- bounded input bytes, output bytes, CPU, memory where enforceable, and wall-clock time;
- deterministic structural parsing only;
- no script execution, subresource loading, link following, browser automation, or active content execution;
- sanitized failure mapping with no stack, raw bytes, URL, header, secret, path, or parsed text leakage;
- terminal disposal on success, parser failure, timeout, cancellation, overrun, kill switch, and rollback.
- Node permission flags should be used where available to deny filesystem write, arbitrary filesystem read, child process spawning, worker creation, native addons, and WASI; if they are unavailable or insufficient in the target runtime, equivalent static and runtime denial tests must be required.

Hard limitation:

- A child process is fault and lifecycle isolation, not a complete OS security sandbox. It is not approval to execute parser code over real fetched bytes.
- Before real fetched bytes are parsed, a later reviewed package must add container, separate OS user, OS sandbox, or equivalent OS-level denial for network, filesystem, env/secret, child/worker, native addon, and writable-path access.
- If the repo cannot provide that OS-level boundary in the Windows development and deployment environment, real-byte parser execution remains blocked.

Rejected for the first real-byte parser gate:

- in-process real-byte parsing;
- Node `vm` as a sandbox;
- worker thread as the primary security boundary;
- browser-based parsing;
- PDF/office parsing;
- parser code that can call provider SDKs, prompts/models, cache/storage/config, Source Reliability, product/public modules, or V1 analyzer modules;
- parser output that is evidence, relevance, applicability, source reliability, warning materiality, verdict, confidence, or report prose.

## 6. Content-Type Scope

The first parser source package, if later approved, should be limited to inert textual content:

- `text/plain`;
- `application/json` parsed structurally only;
- `text/html` parsed only if the later source package names a passive parser and proves no script execution, subresource loading, URL following, browser rendering, or active content execution.

Everything else remains blocked unless a later package expands scope:

- PDF;
- office documents;
- images;
- audio/video;
- compressed archives;
- JavaScript and CSS as executable/active content;
- binary formats;
- browser-rendered pages;
- dynamically generated content;
- content requiring credentials or cookies.

The parser may decode bytes and extract structural text/metadata only. It must not decide what the content means.

## 7. Parser Output Boundary

Allowed structural output:

- opaque parser attempt id;
- parent packet id or one-use packet handle;
- content type policy id;
- parser policy id;
- parser runner version id;
- byte counts and digest references;
- structural parse status;
- sanitized text length;
- bounded parsed text packet reference, if later approved;
- disposal status;
- hidden diagnostics with structural stop reason only.

Forbidden output:

- raw bytes;
- raw URL, domain, path, query, header, source name, title, snippet, or provider JSON;
- unbounded parsed text in public or product result objects;
- cache key;
- Source Reliability score;
- evidence item;
- source record;
- EvidenceCorpus;
- applicability, relevance, claim direction, probative value, sufficiency, warning, verdict, confidence, or report prose;
- prompt/model telemetry;
- V1 type names or V1 prompt/model identifiers.

Parsed text is hidden intermediate material. It is not evidence. It may only be consumed by later LLM-owned Evidence Lifecycle gates after separate approval.

## 8. Runner Protocol Requirements

A later source package must define an explicit parser runner protocol:

- request schema;
- response schema;
- maximum request byte size;
- maximum response byte size;
- timeout;
- cancellation behavior;
- kill behavior;
- disposal behavior;
- sanitized failure mapping;
- version and policy identifiers;
- provenance binding to the 2C-A transport packet frame;
- no raw data in thrown errors, logs, telemetry, or diagnostics.

The parent process must treat every parser runner result as untrusted until schema validation and provenance checks pass.

For real fetched bytes, the runner protocol is necessary but not sufficient. It must be paired with the approved OS-level isolation boundary from 2D-B.

## 9. Filesystem, Env, Network, And Secrets

Minimum rules for a later source package:

- strip env variables by default;
- pass no API keys or credentials;
- pass no database paths;
- pass no cache/config paths;
- pass no raw URL or credential-bearing locator;
- avoid shell invocation;
- set a minimal working directory;
- write no raw or parsed content to disk;
- do not pass open file descriptors except the approved runner message channel;
- no network imports or calls from parser owner files;
- no arbitrary filesystem read/write imports from parser owner files unless the isolation package explicitly names a safe runner bootstrap file and verifier.
- for real fetched bytes, OS-level denial of network and arbitrary filesystem access is mandatory; static import checks and Node permission flags alone are not sufficient.

Required proof:

- sentinel secret and sentinel file tests must show the parser output, diagnostics, errors, and logs do not contain secret/file contents;
- static guards must block `process.env`, provider SDK, network, cache/storage/config, Source Reliability, product/public, V1, and direct filesystem access from parser owner files unless a later package explicitly narrows and reviews a runner bootstrap exception.

## 10. Multilingual And Semantic Boundary

Parser isolation is language-neutral structural plumbing.

It must not:

- classify language by keywords, regex, TLD, URL path, or content snippets;
- translate content;
- default non-English content to English;
- infer relevance from language;
- repair missing language states;
- create supplementary language lanes.

Language, relevance, applicability, extraction, probative value, sufficiency, and warning materiality remain LLM-owned decisions under later approved Evidence Lifecycle prompt/model gates.

## 11. Candidate Source Envelope For Later 2D-A

This package does not approve source implementation.

Expected candidate production files for a later parser-isolation harness package:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`
- one new runner/protocol owner file under `apps/web/src/lib/analyzer-v2-runtime/`, if reviewers approve the exact file name;
- one deployable parser worker entrypoint, if reviewers approve the exact file name and build/runtime placement;
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`.

Expected candidate tests:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`;
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`;
- one new runner/protocol test file, if a new runner owner file is approved;
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`.

No source package may edit outside its exact reviewed file envelope.

The 2D-A harness source envelope may use fixture/control bytes only. A real fetched-byte source envelope must first name the approved OS-level isolation owner and runtime/deployment mechanism.

## 12. Required Tests For Later Implementation

A later source package must include tests for:

- default-closed parser consumption;
- child-process-only harness cannot receive real fetched bytes;
- real fetched-byte parser execution rejects unless the approved OS-level isolation boundary is present and verified;
- rejected parser consumption without a valid 2C-A packet/frame provenance;
- copied/plain/JSON-round-tripped/replayed/disposed packet references reject;
- wrong authority, target hash, budget hash, fetch attempt id, byte digest, byte count, packet sink authority, parser policy, package id, and version reject;
- no parser runner start on invalid provenance;
- timeout, cancellation, malformed response, oversized response, parser failure, and runner crash map to structural failure outcomes;
- no shell invocation, no orphan process on Windows, bounded stdout/stderr, and sanitized stderr handling;
- parser worker entrypoint is available under build/test/deployed Next runtime without dev-only loaders;
- packet and parsed-material disposal on every terminal path;
- serialized outputs leak no raw bytes, parsed text, URLs, headers, secrets, file paths, provider JSON, evidence, warnings, verdicts, confidence, or report prose;
- sentinel secret/file contents do not appear in output, diagnostics, errors, or logs;
- parser owner files import no product/public/cache/SR/provider/V1/prompt/model modules;
- no direct network calls, browser automation, `node:vm`, worker-thread security boundary, native addon loading, or subprocess spawning from the parser worker;
- text/plain, application/json, and any approved inert text/html fixtures behave structurally the same across source languages;
- parser output is not consumed by product/orchestrator/runner/API/UI/report/export paths.

## 13. Minimum Verifiers For Later Implementation

No source verifier is approved by this docs package. A later source package must include at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3B3-2D.

## 14. Review Questions

Deputy reviewers must answer:

1. Is parser isolation the correct next gate after 2C-A?
2. Is the child-process harness correctly limited to protocol/fixture-control work?
3. Is container, separate OS user, OS sandbox, or equivalent OS-level denial now explicit enough as mandatory before real fetched-byte parser execution?
4. Is limiting first parser support to inert text/plain, application/json, and optionally passive text/html acceptable?
5. Are the no-env/no-secret/no-network/no-cache/no-SR/no-product/no-public/no-V1 constraints strong enough?
6. Are parsed text and parser metadata clearly blocked from evidence/report semantics?
7. Is the later source envelope narrow enough?
8. Are the verifiers sufficient before implementation?

If any answer is uncertain, return `modify` or `reject`; do not implement source.

## 15. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Parser_Isolation_Design_Package.md` as a proposed docs-only V2 parser-isolation design package after 7N-3B3-2C-A. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source implementation, product/public wiring, live jobs, cache IO, Source Reliability, prompt/model/config/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup. Check whether the revised staged direction is right: parser isolation first, source-acquisition execution wiring later, child-process harness only for protocol/fixture-control work, real fetched-byte parser execution blocked until container/separate OS user/OS sandbox/equivalent OS-level denial is reviewed, first real-byte parser scope limited to inert text/plain, application/json, and optionally passive text/html, parser output structural/hidden only, and no evidence/report semantics. Pay special attention to whether the security MODIFY finding is resolved and whether the TypeScript noEmit/deployed-worker-entrypoint caveat is explicit enough.

## 16. Stop Conditions

Stop and return to Captain/deputy review before any of these:

- source implementation;
- parser consumption of real fetched bytes;
- parsed text handoff into Evidence Lifecycle;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- cache IO or durable raw/parsed storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic text-analysis code;
- dev-only parser worker loaders in production;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.

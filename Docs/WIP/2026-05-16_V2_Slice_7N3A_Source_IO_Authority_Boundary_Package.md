# V2 Slice 7N-3A Source-IO Authority Boundary Package

**Date:** 2026-05-16
**Status:** debate-consolidated package; source implementation not started by this document
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `72a020ac` (`docs: update v2 source acquisition status`)
**Parent gates:**

- `Docs/WIP/2026-05-16_V2_Slice_7N1_Source_Acquisition_Execution_Design_Approval_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N2_Source_Acquisition_Structural_Executor_Source_Package.md`
- implementation commits `f35de0f0` and `107366ab`

## 1. Purpose

Define the next safe gate after the 7N-2 controlled-harness structural executor.

7N-3A is **not** a live-source-acquisition gate. It is a source-IO authority and owner-boundary package. Its job is to prevent the fake/test/controlled-harness authority from becoming a back door for real provider/search/fetch/parser/network IO.

Concrete provider/search/fetch execution, product/orchestrator/runner wiring, public exposure, live jobs, cache IO, Source Reliability integration, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, and V1 cleanup remain blocked unless a later reviewed gate explicitly authorizes them.

## 2. Debate Result

Three focused reviewers converged on `MODIFY / proceed narrowly`.

Consensus:

- Do not broaden the 7N-2 `controlled_harness_only` authority into production source IO.
- Split 7N-3 into:
  - **7N-3A:** hidden runtime source-IO authority boundary and owner contracts; no live jobs.
  - **7N-3B:** later hidden runtime source-IO smoke/canary gate, only after 7N-3A is implemented, reviewed, committed, and runtime-refresh/rollback/no-public-leak checks are defined.
- Real IO must require a separate, non-serializable runtime capability created only by an approved runtime owner.
- Existing `apps/web/src/lib/web-search.ts` and retrieval helpers must not be reused casually because they carry V1/cache/runtime coupling. Any reuse requires explicit review and boundary tests.

Consolidated verdict: 7N-3A may be prepared as a source approval package for authority contracts only. It must not authorize concrete provider/search/fetch/parser/network execution by itself.

## 3. Requested Deputy Decision

Requested approval:

> Approved to prepare and, after review, implement V2 Slice 7N-3A under `Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md`, limited to source-IO authority and runtime-owner contracts. The package may add a non-serializable runtime authority capability, source-acquisition runtime config/provider-boundary contracts, boundary guards, and tests proving that the 7N-2 controlled-harness marker cannot authorize real IO. It must not add concrete provider/search/fetch/parser/network execution, product/orchestrator/runner wiring, public exposure, live jobs, cache IO, Source Reliability integration, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup.

If implementation pressure reaches concrete IO or product reachability, stop and create a separate 7N-3B or later package.

## 4. Scope Allowed By 7N-3A

7N-3A may define:

- a runtime-owned source-acquisition authority contract separate from `controlled_harness_only`;
- a non-serializable runtime authority creation/validation mechanism;
- source-acquisition runtime config contract shape;
- provider/search/fetch boundary contract shape;
- no-public/no-cache/no-SR authority flags;
- package approval/provenance metadata;
- budget snapshot fields for a future real IO owner;
- hidden/internal artifact envelope shape without raw public exposure;
- boundary guards that keep the runtime source-IO authority out of product/public paths.

7N-3A may update the 7N-2 executor only if the update is fail-closed and proves:

- controlled-harness spoofing still fails;
- runtime authority cannot be represented by copied JSON or a plain object marker;
- no concrete source IO occurs in tests or production paths;
- the Analyzer V2 structural executor remains semantic-free.

## 5. Scope Forbidden By 7N-3A

7N-3A must not add:

- concrete provider/search/fetch/parser/network implementation;
- provider SDK imports;
- direct `fetch(...)`;
- URL dereference;
- parser modules;
- product/orchestrator/runner wiring;
- public API/UI/report/export/compatibility exposure;
- live jobs or canaries;
- cache reads, writes, durable packet storage, durable cache keys, or search/content cache use;
- Source Reliability import/call/cache/admin/score use;
- prompt text edits, prompt/profile seeding, UCM/default JSON changes, model-policy changes, approval flips, or schema changes outside the named contracts;
- ACS/direct URL execution;
- evidence corpus population;
- applicability, extraction, source reliability scoring, sufficiency, warning materiality, verdict, confidence, or report behavior;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 6. Authority Model

7N-2 currently accepts only the closed controlled-harness authority:

- `kind: "controlled_harness_only"`;
- `source: "static_7n2_controlled_harness"`;
- all runtime/provider/network/parser/cache/SR/product/public capability flags set to `false`.

7N-3A must not weaken that authority.

The new source-IO authority must be runtime-owned and non-serializable. A copied object, JSON payload, test fixture, request field, or handoff field must not be sufficient to authorize IO.

Recommended implementation shape for a later source slice:

- module-private brand or `WeakSet` membership in a runtime-owner module;
- factory function creates the capability only after checking the reviewed package provenance and runtime config snapshot;
- validator function accepts only objects created by that module;
- structural executor accepts the runtime capability only through a separately reviewed code path;
- boundary guard blocks product/public/import reachability to the authority owner before an approved product gate.

The runtime authority must carry or be tied to:

- package id/version;
- approval provenance;
- runtime config snapshot id/hash;
- provider allowlist snapshot;
- budget snapshot id/hash;
- `publicExposure: false`;
- `cacheRead: false`;
- `cacheWrite: false`;
- `sourceReliability: false`;
- `productRuntime: false` until a later product gate.

## 7. Source-IO Runtime Owner Boundary

Concrete provider/search/fetch/parser imports, when later approved, must live outside:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/**`;
- the Analyzer V2 clean-room core.

Likely owner namespace for 7N-3A contracts:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract.ts`

Concrete provider factory files are not approved by 7N-3A. If a later gate approves them, they should remain under `analyzer-v2-runtime/**` or another explicitly reviewed runtime-owner namespace, with exact import owners and boundary guards.

## 8. Security And Fetch Boundary For Later 7N-3B+

7N-3A records these requirements for the first concrete IO package. It does not implement them.

Before any dereference:

- only `http` and `https` schemes are allowed;
- DNS resolution must block loopback, private, link-local, multicast, and metadata service IPs;
- every redirect target must be revalidated;
- response size caps and decompression limits are mandatory;
- content-type allowlists are mandatory;
- timeout and cancellation are mandatory;
- parser execution must be bounded by sandbox/worker timeout;
- no durable storage or cache write is allowed without a separate cache package.

## 9. Semantic Boundary

Source acquisition remains structural IO only.

7N-3A and later source-IO owner code must not decide or emit:

- relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value;
- evidence strength;
- source credibility meaning;
- Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict;
- confidence;
- report narrative or public prose.

Provider rank, URL/domain, title, snippet, language metadata, and content length must not become source-quality or relevance signals. They may be preserved only as hidden raw provenance for later LLM-owned tasks after a separately reviewed content-packet gate.

## 10. Multilingual Boundary

7N-3A must preserve query-planning source-language policy as upstream provenance only.

It must not:

- default to English;
- translate queries or content;
- classify language with regex/keywords;
- infer relevance from language;
- repair missing language states;
- create supplementary language lanes.

If a future provider requires locale parameters, 7N-3B+ must structurally map only from upstream LLM-provided policy fields or block when those fields are missing. It must not infer language from query text.

## 11. Budget And Cost Boundary

7N-3A may define budget contract fields but must not run source IO.

Future source IO must be bounded by a frozen per-handoff budget snapshot:

- provider allowlist;
- query count;
- per-query attempt count;
- candidate cap;
- content packet cap;
- byte cap;
- timeout;
- retry policy;
- cancellation state;
- partial-execution semantics.

Quality remains first. Cost controls may bound waste but must not silently drop planned query diversity and report success. Over-cap, timeout, provider failure, cancellation, and partial execution are structural outcomes or executor stop reasons, not quality judgments.

## 12. Live Job Boundary

No live jobs are meaningful for 7N-3A.

The first possible live jobs belong to a later reviewed 7N-3B or product/live-smoke gate after:

- 7N-3A is implemented and committed;
- concrete IO owner implementation is reviewed;
- hidden artifact inspection exists;
- no-public-leak verification passes;
- runtime refresh/reseed checklist is defined;
- rollback/kill-switch behavior is documented;
- Captain-approved canary inputs are used exactly.

## 13. Candidate Source Envelope For A Later 7N-3A Implementation

This document does not edit source. If converted into a source implementation package, the expected files are:

New production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract.ts`

Possible existing production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts`

Tests:

- new focused tests under `apps/web/test/unit/lib/analyzer-v2-runtime/`;
- update `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`;
- update `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`.

No provider factory, product/orchestrator/runner/public, prompt/config/model/schema, Source Reliability, cache/storage, V1 analyzer, or API project files are approved by this package.

## 14. Required Tests For A Later 7N-3A Implementation

Minimum focused tests:

- runtime authority factory creates a non-serializable authority capability;
- copied plain objects and JSON round-trips fail authority validation;
- controlled-harness authority cannot authorize runtime source IO;
- approved runtime authority still has `publicExposure/cacheRead/cacheWrite/sourceReliability/productRuntime` disabled;
- source-acquisition executor remains fail-closed when runtime authority is missing, malformed, stale, or spoofed;
- no provider/search/fetch/parser/network code is executed;
- query text and source-language policy are passed through only as upstream provenance;
- no semantic relevance/applicability/extraction/probative/sufficiency/warning/verdict/report fields appear;
- product/public surfaces cannot directly or transitively reach source-IO authority owners;
- Analyzer V2 clean-room source-acquisition core remains free of provider SDK, direct fetch, network/parser, cache/storage, Source Reliability, analyzer-v2-runtime concrete factories, public/product, V1, prompt/model adapter, and test/mock imports.

Minimum verifier:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition test/unit/lib/analyzer-v2-runtime test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3A.

## 15. Reviewer Prompt

Use this prompt before implementing 7N-3A source:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md` as a V2 source-IO authority-boundary package. Return `approve`, `modify`, or `reject`. Check that it does not broaden the 7N-2 controlled-harness authority, does not authorize concrete provider/search/fetch/parser/network execution, does not product-wire or expose source acquisition publicly, does not allow live jobs, cache IO, Source Reliability, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, or V1 cleanup, and that it defines a non-serializable runtime-owned authority boundary strong enough to prevent fake marker spoofing before any later 7N-3B concrete IO gate.

## 16. Stop Conditions

Stop and return to Captain/deputy review if implementation would require:

- concrete provider/search/fetch/parser/network behavior;
- provider SDK imports;
- direct `fetch(...)`;
- reusing `web-search.ts` or retrieval helpers without explicit review;
- product/orchestrator/runner wiring;
- public exposure;
- live jobs;
- cache IO or durable storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic source-quality/relevance code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

Concrete IO, public/product wiring, and live jobs are high-risk gates and require separate explicit approval.

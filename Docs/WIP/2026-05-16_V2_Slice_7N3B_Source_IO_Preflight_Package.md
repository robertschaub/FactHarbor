# V2 Slice 7N-3B Source-IO Preflight Package

**Date:** 2026-05-16
**Status:** debate-consolidated preflight package; source implementation not started by this document
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `62699661` (`docs: record v2 source acquisition runtime authority`)
**Parent gates:**

- `Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md`
- implementation commit `18f0fa02` (`feat: add v2 source acquisition runtime authority`)
- status/handoff commit `62699661`

## 1. Purpose

7N-3B is **not** approval to implement concrete source IO.

This package defines the preflight boundary that must be reviewed before any V2 provider/search/fetch/parser/network source execution is written. It exists because 7N-3A intentionally created a non-serializable runtime authority boundary but did not define the concrete IO threat model, source packet shape, runtime rollback behavior, or verifier matrix.

The immediate output of this package is a reviewable gate definition. Source implementation remains blocked until a later approved source package explicitly authorizes it.

## 2. Debate Result

Three reviewers converged on `MODIFY / proceed with preflight first`.

Consensus:

- Do not jump straight from 7N-3A into provider/fetch implementation.
- Prepare a 7N-3B source-IO preflight package that freezes the threat model, owner boundary, artifact shape, and verifier matrix.
- Split concrete implementation unless review proves a combined slice is still small:
  - **7N-3B:** preflight/design package only.
  - **7N-3B1:** later hidden runtime candidate-search/source-list acquisition.
  - **7N-3B2:** later hidden runtime content-packet fetch/parser boundary.
  - **7N-3C:** later hidden source smoke/live job gate after implementation, inspection, rollback, and no-public-leak checks.
- Existing V1 search/retrieval helpers contain useful security lessons but must not be reused, imported, cloned, or treated as authority. Any reuse needs a separate explicit review and clean-room decision.

Consolidated verdict: create this preflight package now; do not implement concrete IO until this package is reviewed and a later source implementation package is explicitly approved.

## 3. Scope Allowed By 7N-3B

7N-3B may define:

- concrete IO threat model and stop conditions;
- runtime-owner file envelope for later source IO;
- provider allowlist snapshot contract;
- per-run budget snapshot contract;
- source candidate and content-packet envelope shapes;
- structural error taxonomy and redaction rules;
- hidden artifact inspection requirements;
- no-public-leak verifier requirements;
- SSRF, redirect, DNS, content-type, size, decompression, timeout, cancellation, and parser-sandbox requirements;
- rollback, kill switch, and runtime refresh requirements;
- reviewer prompts for source-IO architecture, security, and pipeline-quality review.

7N-3B may update documentation and status docs after review. It must not edit source implementation.

## 4. Scope Forbidden By 7N-3B

7N-3B must not add:

- provider SDK imports;
- direct `fetch(...)`;
- concrete search/provider HTTP calls;
- URL dereference;
- parser modules or parser execution;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or canaries;
- cache reads, writes, durable packet storage, durable cache keys, or search/content cache use;
- Source Reliability imports, calls, cache, admin pages, or scores;
- prompt text edits, prompt/profile seeding, UCM/default JSON changes, model-policy changes, approval flips, or schema changes outside a later approved source package;
- ACS/direct URL execution;
- evidence corpus population;
- relevance, applicability, extraction, source reliability scoring, sufficiency, warning materiality, verdict, confidence, or report behavior;
- V1 analyzer/prompt/type/code reuse or cloning;
- V1 cleanup.

## 5. Required Source-IO Threat Model

A later concrete source-IO package must define and test the following before any external IO runs:

- **Scheme gate:** only `http` and `https` URL schemes are allowed.
- **DNS gate:** block loopback, private, link-local, multicast, reserved, and metadata-service addresses before connecting.
- **DNS rebinding / TOCTOU:** revalidate every resolved or redirected target close to the actual request. If the runtime cannot prove safe revalidation, block.
- **Redirect gate:** every redirect target must be revalidated with the same URL and DNS rules.
- **Redirect count gate:** redirect chains must have a strict maximum count. Exceeding the count blocks structurally.
- **Final-address proof:** the implementation must prove that the connected address is the validated address, including IPv6, IPv4-mapped IPv6, hostname canonicalization, IDNA/punycode handling, and proxy/environment bypass behavior.
- **Content-type gate:** allow only explicitly approved content types. Unknown or executable content types block structurally.
- **Content sniffing gate:** parser selection must use a verified content type with magic-byte/content-sniffing mismatch handling, not only provider/fetch headers.
- **Size gate:** enforce declared and streaming byte caps. Missing `Content-Length` must not bypass caps.
- **Decompression gate:** decompressed output must have an explicit cap; compression bombs block structurally.
- **Timeout/cancellation gate:** provider, fetch, parser, and end-to-end budgets must be bounded and cancellation-aware.
- **Parser gate:** HTML/PDF/data parsing, if approved later, must run within bounded timeout and resource limits. Parser failure is a structural outcome, not a quality judgment.
- **Parser sandbox gate:** parser execution must have no network access, no filesystem writes, no credential/environment access, bounded CPU and memory, bounded subprocess behavior, sanitized errors, and fail-closed parser selection.
- **No durable raw content:** raw provider payload and fetched content must not be stored durably in 7N-3B+ unless a later cache/storage package explicitly approves it.
- **Raw-buffer disposal proof:** raw buffers must not appear in logs, exceptions, hidden inspection output, cache keys, durable artifacts, or telemetry. Disposal must be observable before live source smoke.
- **No secret/raw error exposure:** provider errors must be sanitized before hidden artifacts; public exposure remains forbidden.

## 6. Runtime Owner Boundary For Later Implementation

Later source implementation, if approved, must live under a runtime-owner namespace such as:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-runtime.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-fetch-boundary.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-packet-sink.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-source-io-activation.ts`

Analyzer V2 core source-acquisition code must remain semantic-free and controlled-harness-only unless a later reviewed package opens a narrow exception. Product/public surfaces must not import the source-IO runtime owner before a separate product gate.

Any later 7N-3B1/7N-3B2 implementation package must convert candidate file envelopes into exact allowed and forbidden file lists before code is edited.

## 6.1 Runtime Authority Preservation

Future source IO must be authorized only by a runtime-owned, non-serializable capability descended from the 7N-3A authority model.

Required preconditions for 7N-3B1/7N-3B2 implementation:

- validate source-IO authority with module-private membership, not TypeScript-only nominal typing;
- reject copied objects, JSON round-trips, request fields, handoff fields, exported symbols, serializable flags, or plain object markers;
- reject the 7N-2 `controlled_harness_only` marker as real source-IO authority;
- reject injected harness ports as real source-IO authority;
- reject any authority whose `publicExposure`, `cacheRead`, `cacheWrite`, `sourceReliability`, `productRuntime`, `liveJobs`, `acsPreparedSnapshot`, or `directUrl` capability is enabled;
- keep the 7N-2 structural executor controlled-harness-only unless a later reviewed package explicitly introduces a separate runtime execution path.

Required tests for later implementation:

- copied/JSON/plain-object authority fails before any provider or fetch call;
- `SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY` fails as real source-IO authority;
- malformed or stale authority snapshots fail closed;
- product/public callers cannot directly or transitively reach source-IO authority owners;
- Analyzer V2 core cannot use the runtime source-IO authority without an explicitly reviewed narrow exception.

## 7. Provider Allowlist Snapshot

The later implementation must accept only a frozen per-run allowlist snapshot. It must not read UCM/config storage, environment provider choice, or legacy search config directly during source execution.

Required snapshot fields:

- snapshot version;
- approval pointer;
- config snapshot hash;
- allowed provider ids;
- provider endpoint kind, not arbitrary URL;
- per-provider query cap;
- per-provider timeout cap;
- credentials state without exposing secrets;
- disabled provider reason when blocked;
- no-cache/no-storage flag;
- no-Source-Reliability flag;
- no-product/no-public flag.

Provider allowlist fallback must be explicit. If no provider is allowed, source acquisition blocks structurally; it must not silently fall back to V1 search helpers or broad auto mode.

## 8. Budget Snapshot

The later implementation must accept only a frozen per-run budget snapshot tied to the 7M-1 query-plan handoff and the 7C source-acquisition request.

Required fields:

- handoff identity hash;
- request identity hash;
- query entry count;
- per-query attempt limit;
- candidate cap per query;
- content-packet cap per query;
- byte cap per provider response;
- byte cap per fetched content packet;
- decompressed byte cap;
- provider timeout;
- fetch timeout;
- parser timeout;
- total source-acquisition timeout;
- cancellation state;
- retry policy;
- partial-execution semantics.

Cost controls must not silently drop planned query diversity and report success. Every upstream query entry must become one of:

- attempted;
- skipped with structural stop reason;
- blocked before execution with structural stop reason.

## 9. Source Candidate Envelope

Candidate records are hidden structural provenance, not evidence.

Allowed fields for a future candidate envelope:

- opaque candidate id;
- query id;
- retrieval policy key;
- provider id;
- provider attempt id;
- provider rank as structural ordering only;
- raw provider locator stored only as non-public runtime-owned locator, not emitted through Analyzer V2 core;
- title/snippet/domain/language metadata only if hidden and marked `not_semantic_evidence`;
- candidate structural status;
- sanitized provider telemetry.

Forbidden candidate behavior:

- relevance decisions;
- source quality decisions;
- Source Reliability scores;
- public URL/domain/source-name exposure through V2 result/report/export;
- durable cache key creation;
- evidence item creation;
- verdict or warning materiality changes.

## 10. Content Packet Envelope

Content packets are hidden raw material for later LLM-owned evidence tasks, not public report content and not EvidenceCorpus.

Allowed fields for a future content packet envelope:

- opaque content packet id;
- parent candidate id;
- query id;
- provider/fetch attempt id;
- content type;
- byte count;
- extraction/parser structural status;
- non-durable hidden locator;
- content excerpt only inside the hidden runtime artifact sink, if a later implementation package explicitly approves it;
- packet disposal status.

Forbidden content packet behavior:

- public report/export exposure;
- durable storage/cache writes;
- Source Reliability scoring;
- deterministic relevance/applicability/probative/sufficiency classification;
- evidence corpus population;
- semantic warning or verdict effects.

## 11. Structural Outcome And Error Taxonomy

7N-3B+ must preserve 7H structural outcome labels where applicable and keep executor stop reasons separate from outcome labels.

Required structural stop/error categories:

- provider_not_allowed;
- provider_credentials_missing;
- provider_rate_limited;
- provider_failure;
- search_failure;
- url_blocked_by_policy;
- redirect_blocked_by_policy;
- dns_blocked_by_policy;
- content_type_blocked;
- response_too_large;
- decompression_limit_exceeded;
- fetch_timeout;
- parser_timeout;
- parser_failure;
- cancellation_requested;
- budget_exhausted;
- partial_execution;
- hidden_artifact_sink_unavailable.

These categories remain structural. They must not directly become user-facing warnings until a later warning-materiality gate decides verdict impact.

## 12. Semantic Boundary

Source acquisition remains structural IO only.

7N-3B+ must not decide or emit:

- source relevance;
- source applicability;
- evidence extraction;
- claim direction;
- probative value;
- source credibility meaning;
- Source Reliability score;
- evidence scarcity;
- sufficiency;
- warning materiality;
- verdict;
- confidence;
- report narrative or public prose.

Provider rank, title, snippet, URL/domain, language metadata, and content length must not become source-quality or relevance signals. They may be preserved only as hidden raw provenance for later LLM-owned tasks after a separately reviewed content-packet gate.

## 13. Multilingual Boundary

7N-3B+ must preserve query-planning source-language policy as upstream provenance only.

It must not:

- default to English unless the upstream policy explicitly says English;
- translate query text or content;
- classify language with regex, keywords, hostnames, or URL paths;
- infer relevance from language;
- repair missing language states;
- create supplementary language lanes.

Provider locale parameters, if needed, must be structural mappings from upstream LLM-provided policy fields or block when those fields are absent.

## 14. V1 And Existing Helper Boundary

The existing V1 search/retrieval stack is informative only as historical risk evidence.

7N-3B+ must not import, copy, alias, extend, or clone:

- `apps/web/src/lib/web-search.ts`;
- `apps/web/src/lib/search-provider-utils.ts`;
- `apps/web/src/lib/search-*.ts`;
- `apps/web/src/lib/retrieval.ts`;
- `apps/web/src/lib/analyzer/research-acquisition-stage.ts`;
- V1 analyzer types or prompts;
- Source Reliability modules.

If later review decides that a security pattern from `retrieval.ts` should be reused, it must be rewritten clean-room from the approved 7N-3B threat model, not copied.

## 15. Hidden Artifact Inspection

Before live source smoke is meaningful, reviewers must be able to inspect hidden source artifacts internally.

Inspection must show:

- source run id;
- authority snapshot hash;
- provider allowlist snapshot hash;
- budget snapshot hash;
- query ids and per-query structural status;
- provider attempts and sanitized provider telemetry;
- candidate counts;
- content packet counts;
- stop reasons;
- no-cache/no-storage/no-SR/no-public flags;
- no raw secrets;
- disposal state for raw content, if content packets are later approved.

Inspection must not expose public report/export fields, final verdict fields, or evidence-quality labels.

Before any live source smoke, the verifier must include concrete route/export/report/public-surface scans or tests proving hidden source artifacts cannot cross product/public surfaces.

## 16. Runtime Refresh, Rollback, And Kill Switch

A later executable source IO package must define:

- environment/config state needed to activate hidden source IO;
- process restart/reseed checklist if source code or runtime config changes;
- kill switch behavior that fails closed to no source IO;
- rollback target commit;
- log/artifact proof of activation state;
- no-public-leak verification before and after activation;
- criteria for disabling source IO after provider failures, timeouts, or budget overruns.

## 17. Candidate Source Envelope For Later Implementation

This document does not approve source implementation. If reviewed and converted into source implementation packages, expected candidate files are:

Potential 7N-3B1 contracts/tests:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-source-io-activation.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-runtime.contract.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-source-io-activation.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-provider-runtime.contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Potential 7N-3B2 contracts/tests:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-fetch-boundary.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-packet-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-fetch-boundary.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

No provider SDK, direct `fetch`, product/orchestrator/runner/public, prompt/config/model/schema, Source Reliability, cache/storage, V1 analyzer, or API project files are approved by this package.

## 18. Required Review Questions

Reviewers must answer:

1. Is it safe to split 7N-3B into preflight, 7N-3B1 candidate search, 7N-3B2 content packet fetch, and later 7N-3C live smoke?
2. Are SSRF, redirect, DNS, content-type, size, decompression, timeout, cancellation, parser, and no-durable-storage requirements sufficient before concrete IO?
3. Is the hidden candidate/content packet envelope narrow enough to avoid public report exposure and semantic source-quality leakage?
4. Are budget controls explicit enough to prevent silent query diversity loss?
5. Is the no-V1/no-helper-reuse boundary strong enough?
6. Does any part of the package require Captain confirmation before implementation?

## 19. Minimum Verifier For A Later Implementation Package

No source verifier is approved by this document. A later implementation package must include, at minimum:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests and no live jobs are approved by 7N-3B.

## 20. Reviewer Prompt

Use this prompt to review the package:

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B_Source_IO_Preflight_Package.md` as a V2 source-IO preflight package. Return `approve`, `modify`, or `reject`. Check that it does not authorize concrete provider/search/fetch/parser/network execution, product/public wiring, live jobs, cache IO, Source Reliability, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, or V1 cleanup. Check that it defines sufficient SSRF/DNS/redirect/content-type/size/decompression/timeout/cancellation/parser/no-storage/no-public/no-SR controls, hidden candidate/content packet envelopes, budget semantics, no-public-leak inspection, and rollback/kill-switch requirements before any later concrete source IO package.

## 21. Stop Conditions

Stop and return to Captain/deputy review if the next step would require:

- concrete provider/search/fetch/parser/network behavior;
- provider SDK imports;
- direct `fetch(...)`;
- reusing V1 search/retrieval helpers;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- cache IO or durable storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- semantic source-quality/relevance code;
- ACS/direct URL execution;
- V1 cleanup or reuse.

Concrete IO, public/product wiring, and live jobs remain high-risk gates and require separate explicit approval.

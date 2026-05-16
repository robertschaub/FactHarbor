# V2 Slice 7N-3B3-2D-C0-S2 Parser Admission Provenance Source Package

**Date:** 2026-05-16
**Status:** reviewed and approved as docs-only package; no source edits approved
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `bb059ed7` (`docs: record v2 c0s1a status`)
**Parent context:** C0-S1 P0 parser-worker admission and C0-S1A gate-register blocker hardening
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Decision Context

After C0-S1 and C0-S1A, the deputy team was asked whether to continue with another runtime slice.

The consolidated decision is:

- draft this docs-only C0-S2 package now;
- do not implement C0-S2 source in this step;
- do not implement parsed-material denial before parser-admission provenance exists;
- do not stop all planning, because a docs-only package can clarify the next safe gate without widening runtime behavior.

Security/runtime reviewers specifically required a reviewed source package before any additional parser-adjacent runtime code.

Review result: APPROVED after tightening mark-time mutation protection, import direction, and unowned-reader fail-closed semantics.

## 2. Purpose

C0-S2 will, if later approved and implemented, make C0-S1 parser-admission decisions process-local/runtime-owned.

The problem C0-S2 addresses:

- C0-S1 decisions are structurally validated and non-executing, but plain structural objects can be copied, reconstructed, or JSON-round-tripped.
- Future downstream gates must not trust caller-shaped C0-S1-looking objects.
- Before any parsed-material denial or parser-output transition is added, the pipeline needs a reader that accepts only admission decisions created by the approved C0-S1 runtime owner.

C0-S2 provenance is anti-forgery within the current Node.js process only. It is not durable authority, not storage authority, not IPC authority, not a parser security boundary, and not execution approval.

## 3. Allowed Future Source Envelope

If this package is reviewed and approved, a later implementation may touch only:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- completion handoff/status/index files required by protocol

The implementation may add a process-local sidecar using a module-private ownership marker, such as a `WeakSet`, plus:

- an owner-only mark path used only by the C0-S1 admission owner;
- a reader/predicate for future consumers;
- exact-object identity validation for admitted and blocked C0-S1 decisions;
- rejection of spread copies, JSON round trips, `structuredClone`, exact-shape reconstructed objects, and mutated owned objects.

Ownership is valid only if the object is both runtime-owned and still matches its mark-time integrity state. A `WeakSet` alone is insufficient because it proves identity but not immutability after marking. The future implementation must either freeze the decision before/at mark time or store a private structural fingerprint/snapshot of the required contract fields at mark time and fail closed if any field differs later.

The implementation must not export a broad public marker that arbitrary runtime files can call. Production consumers should import only the reader/predicate. If an owner-only marker is needed, boundary guards must prove it is not barrel-exported, not product-reachable, and imported only by `source-acquisition-parser-worker-admission.ts` plus focused tests.

## 4. Required Future Contract

The future C0-S2 contract must keep all C0-S1 no-execution fields intact:

- `parserExecution: false`;
- `workerSpawned: false`;
- `bytesConsumed: false`;
- `transportPacketAccepted: false`;
- `transportFrameAccepted: false`;
- `realFetchedBytesAccepted: false`;
- `productPublicLiveApproved: false`;
- `evidenceLifecycleConsumptionApproved: false`;
- `deploymentCandidateIsolationAccepted: false`;
- `cacheTouched: false`;
- `sourceReliabilityTouched: false`;
- `publicExposure: false`;
- `liveJobs: false`;
- `parsedMaterialPacket: null`;
- `parserOutput: null`;
- `evidenceCorpus: null`.

The future reader may return only:

- the exact runtime-owned C0-S1 decision, or a sanitized owned wrapper around that exact decision; or
- a fixed fail-closed result, such as `blockedReason: "admission_not_runtime_owned"`, with no caller-provided admission status copied forward.

Unowned, copied, forged, JSON-round-tripped, structured-cloned, reconstructed, or mutated objects must not preserve `p0_admitted_fixture_or_synthetic_inert` or any other caller-provided C0-S1 status in the reader output.

It must not introduce statuses that imply parser readiness, source readiness, source material availability, parsed material availability, execution authorization, public readiness, or live eligibility.

## 5. Explicit Non-Goals

C0-S2 must not:

- execute a parser;
- spawn a worker or child process;
- consume fixture/control bytes;
- consume synthetic bytes;
- consume 2C-A packets or frames;
- consume real fetched bytes;
- parse web pages, PDFs, office documents, archives, images, browser-rendered pages, executable content, WASM, or native-code parser inputs;
- create parsed-material packets;
- create source material;
- create extraction input;
- create EvidenceItems or evidence corpus;
- generate warnings, verdicts, confidence, reports, report markdown, exports, or public API output;
- change product/orchestrator/runner/API/UI/report/export wiring;
- change gateway policy from `research_acquisition = notImplemented`;
- change prompts, configs, models, schemas, cache, durable storage, Source Reliability, ACS/direct URL behavior, V1 code, or V1 cleanup.

## 6. Boundary-Guard Requirements

Any later source implementation must extend boundary guards so that:

- the provenance sidecar has no runtime import from the C0-S1 admission module unless a specific reviewed reason is recorded;
- if C0-S1 types/constants are needed in the sidecar, the import must be type-only or must use a tiny shared structural type/constants strategy that avoids a runtime cycle;
- product/public surfaces cannot reach the provenance sidecar transitively;
- the Analyzer V2 barrel does not export the provenance sidecar;
- parser runner, content parser, packet sink, content transport, network transport, network factory, provider SDKs, cache/SR/storage, product/public, Evidence Lifecycle, prompt/config/model/schema, ACS/direct URL, and V1 imports are forbidden;
- owner-only marker imports are limited to the C0-S1 admission owner and tests;
- copied/JSON/structured-clone/reconstructed admissions are rejected by tests;
- post-mark mutation of status, blocked reason, no-execution fields, null-output fields, P0 identity, and approval fields is rejected by tests;
- all no-execution/null output fields remain false/null.

## 7. Verification For This Docs-Only Package

Run before committing this docs-only package:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
node scripts/build-index.mjs --tier=2 --tracked-only
```

## 8. Verification For Future Implementation

If a later C0-S2 implementation is approved, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm -w apps/web run build
git diff --check
```

No live jobs, expensive LLM suites, provider/network calls, parser proof runs, parser execution, or 2D-C work are required.

## 9. Stop Conditions

Stop and require review before any:

- app source edit outside the future source envelope;
- parser execution or worker spawn;
- fixture/control parsing;
- synthetic byte parsing;
- packet/frame consumption;
- real fetched-byte parsing;
- parsed-material creation;
- P1/P2 security-boundary claim;
- 2D-C source implementation;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs;
- prompt/config/model/schema edits;
- cache/SR/storage;
- Evidence Lifecycle consumption;
- ACS/direct URL execution;
- V1 reuse or cleanup.

## 10. Reviewer Questions

Reviewers should answer:

1. Is runtime-owned parser-admission provenance the right next source package before parsed-material denial?
2. Is docs-only C0-S2 sufficient to resolve the C0-S1A runtime-consent gap?
3. Is process-local provenance clearly limited and not overclaimed as durable authority or security boundary?
4. Is the future source envelope narrow enough?
5. Are owner-only marker imports constrained enough?
6. Are copied/JSON/structured-clone/reconstructed object rejection tests sufficient?
7. Are stop conditions complete?

Return `approve`, `modify`, or `reject`. If review returns `modify` or `reject`, do not implement C0-S2 source until this package is corrected and re-reviewed.

## 11. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S2_Parser_Admission_Provenance_Source_Package.md` as a docs-only source package for future runtime-owned parser-admission provenance. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source edits now; that future source is limited to a process-local ownership sidecar, narrow C0-S1 owner integration, focused tests, and boundary guards; that it rejects copied/JSON/structured-clone/reconstructed admission objects; that provenance is not durable authority, not a security boundary, and not execution approval; and that parser execution, worker spawn, byte consumption, 2C-A packet/frame consumption, real source IO, parsed material, product/public/live wiring, cache/SR/storage, Evidence Lifecycle behavior, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, V1 cleanup, and 2D-C remain blocked.

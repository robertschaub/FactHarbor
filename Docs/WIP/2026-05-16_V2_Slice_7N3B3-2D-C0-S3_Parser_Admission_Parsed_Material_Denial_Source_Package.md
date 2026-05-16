# V2 Slice 7N-3B3-2D-C0-S3 Parser Admission Parsed-Material Denial Source Package

**Date:** 2026-05-16
**Status:** approved docs-only source package; no source edits approved
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `cc0c011b` (`feat: add v2 parser admission provenance`)
**Parent context:** C0-S1 P0 parser-worker admission and C0-S2 runtime-owned parser-admission provenance
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Decision Context

C0-S1 created a hidden structural P0 parser-worker admission contract. C0-S2 made C0-S1 admission decisions process-local runtime-owned so future gates can reject copied, JSON-round-tripped, `structuredClone`d, reconstructed, or post-mark mutated C0-S1-looking objects.

The deputy debate after C0-S2 converged on a package-first path:

- draft C0-S3 as a docs-only package now;
- do not implement C0-S3 source in the same step;
- do not start 2D-C;
- do not implement parser execution, byte consumption, parsed-material creation, source material, Evidence Lifecycle behavior, product wiring, public output, or live jobs.

C0-S3 exists to define the next negative transition: even a runtime-owned C0-S1 parser admission is not parsed material and must not become parsed material while parser execution remains unapproved.

Review result: APPROVED after tightening the boundary requirement so future C0-S3 source must not import C0-S1 directly, including type-only imports.

## 2. Purpose

C0-S3 will, if later reviewed and implemented, add a hidden/internal denial contract between parser admission and parsed material.

The problem C0-S3 addresses:

- C0-S1 admission says a request shape may be structurally acceptable for the P0 parser-worker seam.
- C0-S2 provenance says the admission object was created by the runtime owner and has not drifted from its mark-time contract fields.
- Neither C0-S1 nor C0-S2 authorizes parser execution, worker spawn, byte consumption, parser output, parsed material, source material, or Evidence Lifecycle consumption.

C0-S3 makes that non-transition explicit: a future consumer must not treat parser admission as parsed-material readiness.

## 3. Allowed Future Source Envelope

If this package is reviewed and approved, a later implementation may touch only:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- completion handoff/status/index files required by protocol

The future implementation may add one hidden runtime owner that:

- imports only the C0-S2 parser-admission provenance reader or predicate;
- accepts only an already-created runtime-owned C0-S1 admission decision;
- rejects structural, copied, serialized, cloned, reconstructed, malformed, or non-runtime-owned admission-looking objects;
- returns only denial/blocked statuses;
- returns null/absent parsed-material, parser-output, source-material, extraction-input, and evidence-corpus fields;
- records zero parser/source/product/cache/SR/public/live counters or equivalent explicit false/null facts.

The future implementation must not add a parser runner, content parser, worker spawn, child process, transport packet consumer, network/source IO, source-material builder, Evidence Lifecycle input, product/orchestrator/runner/API/UI/report/export path, cache/SR/storage behavior, prompt/config/model/schema behavior, ACS/direct URL behavior, V1 reference, or V1 cleanup.

## 4. Required Future Contract

The future C0-S3 contract should use denial-only language. Acceptable status examples:

- `blocked_no_parsed_material`;
- `blocked_admission_not_runtime_owned`;
- `blocked_parser_execution_unapproved`;
- `blocked_parsed_material_gate_not_approved`.

Avoid status names or fields that imply parser readiness, parser execution, parsed-material availability, source-material availability, extraction readiness, corpus buildability, public readiness, live eligibility, or 2D-C approval.

The future result must preserve all no-execution facts:

- `parserExecution: false`;
- `workerSpawned: false`;
- `bytesConsumed: false`;
- `transportPacketAccepted: false`;
- `transportFrameAccepted: false`;
- `realFetchedBytesAccepted: false`;
- `fixtureBytesParsed: false`;
- `syntheticBytesParsed: false`;
- `productPublicLiveApproved: false`;
- `evidenceLifecycleConsumptionApproved: false`;
- `cacheTouched: false`;
- `sourceReliabilityTouched: false`;
- `publicExposure: false`;
- `liveJobs: false`;
- `parsedMaterialPacket: null`;
- `parserOutput: null`;
- `sourceMaterial: null`;
- `extractionInput: null`;
- `evidenceCorpus: null`.

The future contract may carry only structural references to the denial decision and to the accepted runtime-owned admission, such as admission version, provenance version, profile id, isolation label, input provenance kind, byte count, and digest. It must not carry raw bytes, parsed text, URLs, headers, source names, provider JSON, evidence, warnings, verdicts, confidence, report prose, prompt/model telemetry, cache keys, Source Reliability data, or V1 identifiers.

## 5. Explicit Non-Goals

C0-S3 must not:

- execute a parser;
- spawn a worker or child process;
- consume fixture/control bytes;
- consume synthetic bytes;
- consume 2C-A packets or frames;
- consume real fetched bytes;
- parse web pages, PDFs, office documents, archives, images, browser-rendered pages, executable content, WASM, or native-code parser inputs;
- create parsed-material packets;
- create parser output;
- create source material;
- create extraction input;
- create EvidenceItems or evidence corpus;
- generate warnings, verdicts, confidence, reports, report markdown, exports, or public API output;
- change product/orchestrator/runner/API/UI/report/export wiring;
- change gateway policy from `research_acquisition = notImplemented`;
- change prompts, configs, models, schemas, cache, durable storage, Source Reliability, ACS/direct URL behavior, V1 code, or V1 cleanup.

## 6. Boundary-Guard Requirements

Any later source implementation must extend boundary guards so that:

- the C0-S3 denial owner imports only the C0-S2 parser-admission provenance reader or predicate;
- the C0-S3 denial owner does not import the C0-S2 owner-only marker;
- the C0-S3 denial owner does not import C0-S1 directly, including type-only imports;
- if types are needed, they must come from the C0-S2 reader/predicate return or inspection types, or from local C0-S3 denial-contract types;
- product/public surfaces cannot reach the C0-S3 denial owner transitively;
- the Analyzer V2 barrel does not export the C0-S3 denial owner;
- parser runner, content parser, packet sink, content transport, network transport, network factory, provider SDKs, cache/SR/storage, product/public, Evidence Lifecycle, prompt/config/model/schema, ACS/direct URL, and V1 imports are forbidden;
- copied/JSON/structured-clone/reconstructed admission-shaped objects are rejected by tests through the C0-S2 reader path;
- runtime-owned but blocked C0-S1 admissions remain denial-only and non-executing;
- runtime-owned C0-S1 admitted P0 admissions still produce no parsed material;
- all no-execution/null output fields remain false/null.

## 7. Verification For This Docs-Only Package

Run before committing this docs-only package:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
node scripts/build-index.mjs --tier=2 --tracked-only
```

No app source, app tests, prompts, configs, models, schemas, package files, lockfiles, API files, parser proof runs, live jobs, expensive LLM suites, or validation batches are approved by this docs-only package.

## 8. Verification For Future Implementation

If a later C0-S3 implementation is approved, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
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
- implementation before this package is reviewed and accepted;
- parser execution or worker spawn;
- fixture/control parsing;
- synthetic byte parsing;
- packet/frame consumption;
- real fetched-byte parsing;
- parsed-material creation;
- parser-output creation;
- source-material creation;
- extraction-input creation;
- Evidence Lifecycle consumption;
- P1/P2 security-boundary claim;
- 2D-C source implementation;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs;
- prompt/config/model/schema edits;
- cache/SR/storage;
- ACS/direct URL execution;
- V1 reuse or cleanup.

## 10. Reviewer Questions

Reviewers should answer:

1. Is C0-S3 the right next docs-only package after C0-S2?
2. Does the package preserve the distinction between runtime-owned parser admission and parsed material?
3. Is the future source envelope narrow enough?
4. Are the denial-only status names safe, or should they be tightened?
5. Are the no-execution/null-output fields complete?
6. Are the boundary-guard requirements sufficient?
7. Are stop conditions complete?

Return `approve`, `modify`, or `reject`. If review returns `modify` or `reject`, do not implement C0-S3 source until this package is corrected and re-reviewed.

## 11. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S3_Parser_Admission_Parsed_Material_Denial_Source_Package.md` as a docs-only source package for future parser-admission-to-parsed-material denial. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source edits now; that future source is limited to one hidden denial owner, focused tests, and boundary guards; that it consumes only the C0-S2 runtime-owned admission reader/predicate; that runtime-owned C0-S1 admission is still not parsed material and still cannot produce parser output, source material, extraction input, or evidence corpus; and that parser execution, worker spawn, byte consumption, 2C-A packet/frame consumption, real source IO, parsed material, product/public/live wiring, cache/SR/storage, Evidence Lifecycle behavior, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, V1 cleanup, and 2D-C remain blocked.

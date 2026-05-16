# V2 Slice 7N-3B3-2D-C0-S1 P0 Parser Worker Admission Source Package

**Date:** 2026-05-16
**Status:** implemented; verification passed
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `95cc5471` (`docs: record v2 x7f gate pointer`)
**Parent context:** X7-F hidden no-IO source-acquisition execution-denial gate; C0 parser-worker architecture and provisional isolation package
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Deputy Review Decision

After X7-F, the direct-text source-acquisition path already has a closed no-IO execution boundary. The deputy review team converged on the next low-risk gate as:

> Implement a C0-S1 parser-worker P0 admission contract only.

The rejected alternatives were:

- another hidden no-IO source-material/evidence-corpus transition, because X7-A/X7-B/X7-C/X7-D/X7-F already keep source material, extraction input, and evidence corpus absent/blocked;
- docs-only clarification, because X7-F and the gate register are already clear enough and the open blocker now needs a machine-checked admission seam.

## 2. Purpose

C0-S1 introduces a hidden structural admission decision for future parser-worker requests.

It answers one question:

> Can a candidate parser-worker request be admitted under the provisional P0 profile?

For this slice, the only positive answer is still non-executing:

- `status: "p0_admitted_fixture_or_synthetic_inert"`;
- `executionStatus: "blocked_no_parser_execution"`;
- `profileId: "P0_PROVISIONAL_LOCAL_INERT"`;
- `isolationLabel: "provisional_local_inert_only_not_security_boundary"`;
- no parser execution, worker spawn, byte consumption, source material, parsed material, Evidence Lifecycle consumption, product/public/live exposure, cache, Source Reliability, or 2D-C.

P0 admission is not a security boundary. It is a contract/admission seam so later parser work cannot bypass the parent/worker boundary.

## 3. Implementation Boundary

Allowed source/test files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed governance/status files:

- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_C0-S1_P0_Parser_Worker_Admission.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

## 4. Contract

The admission request is structural metadata only:

- parser-worker contract version;
- P0 profile id;
- P0 non-security-boundary label;
- parser policy id;
- content-type policy id;
- input provenance:
  - fixture/control metadata; or
  - synthetic inert metadata;
- bounded limits;
- approval snapshot proving 2D-C, product/public/live, Evidence Lifecycle consumption, and deployment-candidate isolation are not approved in this slice.

The admission decision returns only:

- admission/contract version;
- internal visibility;
- admitted provenance kind, byte count, and digest for structural correlation;
- explicit no-execution booleans;
- null parser output, parsed-material packet, and evidence-corpus fields.

## 5. Explicit Rejections

C0-S1 must reject:

- malformed requests;
- non-P0 profiles;
- any claim that P0 is a security boundary;
- real fetched bytes or byte payload fields;
- 2C-A transport-owned packets;
- 2C-A transport-owned frames;
- non-fixture/control and non-synthetic-inert provenance;
- P2/deployment-candidate claims;
- 2D-C approval claims;
- product/public/live or Evidence Lifecycle consumption approval claims.

## 6. Explicit Non-Goals

C0-S1 does not:

- call or import the existing fixture parser runner;
- call or import the packet sink, transport, content dereference, network transport/factory, provider boundary, source-acquisition executor, or parser libraries;
- spawn a worker or child process;
- parse fixture/control bytes, synthetic bytes, transport-owned bytes, real fetched bytes, web pages, PDFs, office documents, archives, images, rendered pages, WASM, native-code parser inputs, or production/staging traffic;
- create parsed-material packets, source material, extraction input, EvidenceItems, evidence corpus, warnings, verdicts, confidence, reports, or public output;
- change gateway policy, prompt/config/model/schema files, cache, durable storage, Source Reliability, ACS/direct URL behavior, V1 code, or V1 cleanup.

## 7. Verification

Required before completion:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm -w apps/web run build
git diff --check
```

No live jobs, expensive LLM suites, provider/network calls, parser proof runs, parser execution, or 2D-C work are required.

## 8. Stop Conditions

Stop and require review before any:

- parser execution or worker spawn;
- fixture/control parsing;
- synthetic byte parsing;
- packet/frame consumption;
- real fetched-byte parsing;
- P1/P2 security-boundary claim;
- 2D-C source implementation;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs;
- prompt/config/model/schema edits;
- cache/SR/storage;
- Evidence Lifecycle consumption;
- ACS/direct URL execution;
- V1 reuse or cleanup.

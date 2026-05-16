---
date: 2026-05-16
role: Lead Architect
agent: Codex (GPT-5)
topics: [v2, 7n3b3-2c-a, real-byte-handoff, source-package, approval]
files_touched:
  - Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Real_Byte_Handoff_Source_Package.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/AGENTS/Agent_Outputs.md
---

# V2 7N-3B3-2C-A Source Package Approval

## Task

Draft, review, and consolidate the source package for the first real transport-byte custody step after the review-approved 7N-3B3-2C design package.

## Outcome

7N-3B3-2C-A is deputy-approved for source implementation under `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Real_Byte_Handoff_Source_Package.md`.

Approval scope is narrow:

- production files: `source-acquisition-content-transport.ts` and `source-acquisition-content-packet-sink.ts`;
- tests: focused transport, packet-sink, and boundary-guard tests;
- behavior: transport-owner real bytes into hidden packet sink only;
- public transport outcomes remain byte-free;
- parser consumption of real fetched bytes remains blocked.

## Approval Trace

- Evidence Lifecycle / LLM-quality reviewer `Linnaeus` (`019e2f8b-569f-7511-981d-83c53f6ea1b1`): `approve`.
- Security / isolation reviewer `Curie` (`019e2f8b-3a4e-7933-b6b5-a135f198271b`): initial `modify`, then `approve`.
- Runtime / lifecycle reviewer `Chandrasekhar` (`019e2f8b-21f2-79f0-9421-4cdfaf990d46`): initial `modify`, then `approve`.

Security and runtime modifications added before approval:

- distinct 2C-A transport packet sink authority/capability/version instead of repurposing the 2B fixture authority;
- sink-owned HMAC key material and sealing entrypoint;
- deterministic canonical HMAC serialization;
- explicit transport-packet disposal API;
- concrete `transportPacketHandoffMode` kill switch;
- permission for internal transport refactoring only to reuse the validated control chain while preserving byte-free public outcomes;
- tests for forged HMAC, different authority, key non-leakage, no env/file/config/UCM/cache key source, disposal, retention, and boundary reachability.

## Blocked

The approval does not allow:

- parser consumption of real fetched bytes;
- parser source edits;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- semantic relevance/applicability/extraction/probative/sufficiency/warning decisions;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.

## Verification Required For Implementation

Implementation must run at least:

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

## For Next Agent

Start implementation from the approved 2C-A package. Keep the source change inside the exact envelope. Treat parser consumption, product/public wiring, live jobs, cache/SR/storage, evidence/report generation, prompt/model/config/schema changes, ACS/direct URL, V1 reuse, and V1 cleanup as hard stop conditions.

## Warnings

Do not widen the existing 2B fixture/control packet sink authority to accept real transport bytes. 2C-A must add a distinct transport-packet sink authority/capability and keep the 2B fixture path unchanged.

Do not let HMAC key material cross into transport. The sink owns key material, sealing, and verification.

## Learnings

When a source package introduces a new private custody boundary, key ownership and lifecycle release APIs must be specified before implementation. Otherwise the design can appear narrow while leaving the implementer to choose between security leakage and lifecycle ambiguity.

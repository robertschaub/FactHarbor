# V2 Slice 7N-3B3-2C-A Post-Implementation Consolidation

**Date:** 2026-05-16
**Status:** consolidated after deputy post-review; next package must remain review-first
**Owner role:** Lead Architect / Captain deputy
**Implementation baseline:** `09c66527` (`feat: add v2 hidden content byte handoff`)
**Documentation baseline:** `ffa1ba19` (`docs: record v2 hidden byte handoff completion`)
**Package baseline:** `2185bb5a` (`docs: approve v2 real byte handoff source package`)

## 1. Outcome

7N-3B3-2C-A is complete as a hidden, default-closed, transport-owner real-byte handoff into the packet sink.

It provides:

- a hidden `executeSourceAcquisitionContentTransportPacketHandoff(...)` path that is disabled unless explicitly enabled with `enabled_hidden_transport_to_sink_7n3b3_2c_a`;
- a distinct 2C-A transport packet sink authority with `realTransportBytes: true` and product/public/cache/storage/Source Reliability/semantic capabilities false;
- authority validation before DNS/request work on the hidden handoff path;
- hidden real-byte sealing after the existing 7N-3B3-1 transport controls pass;
- HMAC/provenance-bound transport-owned byte frames;
- byte count and digest computation from transport-owned response bytes, not caller metadata;
- hidden packet materialization followed by terminal disposal in the accepted 2C-A path;
- direct rejection of caller-created byte-state objects at `sealSourceAcquisitionContentTransportOwnedByteFrame(...)`;
- exact import/export guard coverage for the one approved transport-to-packet-sink relationship;
- no-public-leak tests for raw bytes, source URLs, target paths, HMAC key material, evidence items, warnings, verdicts, and report prose.

It does not provide:

- parser consumption of real fetched bytes;
- source-acquisition product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence items, source records, EvidenceCorpus, warnings, verdicts, confidence, or report prose;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 2. Review Findings And Resolution

Implementation review initially found multiple blocking lifecycle/security risks:

1. Arbitrary byte ingress through structurally valid caller-created byte state.
2. Retained frame bytes not charged to caps.
3. Wrong sink authority discovered only after transport work.
4. Accepted hidden packets not reliably disposed on the terminal 2C-A path.
5. A follow-up hidden factory fix still let importers mint branded byte state through a function property.

The final implementation resolves these by:

- validating the 2C-A packet sink authority before DNS/request;
- charging retained frame bytes at seal time;
- releasing retained frame or packet capacity on materialization/rejection/disposal;
- disposing accepted transport packets before returning from the 2C-A handoff;
- removing the hidden `createTransportSuccessByteState` property/factory;
- keeping direct `sealSourceAcquisitionContentTransportOwnedByteFrame(...)` as a negative boundary entrypoint that rejects caller-created byte states;
- adding explicit, guard-listed `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)` for the positive transport-success path.

Independent narrow re-review after the final P1 fix returned `PASS`: direct seal rejects caller-created byte states, the hidden factory property is gone, the positive path is explicit and guard-listed for transport-only use, and no product/public/parser/cache/SR/V1 scope creep was found.

Post-implementation deputy review returned `PASS` from both security/runtime boundary review and lead-architect next-step review. Security/runtime review confirmed no product/public/cache/SR/storage/live-job reachability and noted that the positive `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)` export is acceptable only as a hidden, statically guard-listed transport-only capability. Lead-architect review confirmed the next step should be parser isolation, not source-acquisition execution wiring.

## 3. Verification

Verification after final source and guard hardening:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 3 files / 74 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> 20 files / 121 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition` -> 4 files / 31 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 54 files / 388 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` -> passed.
- `git diff --cached --check` -> passed before commits.

No expensive tests and no live jobs were run or needed for 7N-3B3-2C-A.

## 4. Consolidated Deputy Decision

The next step is not parser execution, product wiring, public exposure, live smoke, Source Reliability integration, evidence generation, report generation, ACS/direct URL runtime, or V1 cleanup.

The consolidated decision is:

1. Treat 7N-3B3-2C-A as complete hidden handoff infrastructure only.
2. Do not widen `executeSourceAcquisitionContentTransport(...)`; its public outcome remains byte-free.
3. Do not let parser/sink files consume real fetched bytes until a separate parser-isolation package is reviewed.
4. Keep source acquisition execution out of product/orchestrator/runner paths until a later reviewed execution-wiring gate.
5. Do not run live jobs from this handoff alone; there is still no user-visible V2 analysis path to validate.
6. Treat any new importer of 2C-A real-byte packet-sink symbols as a `MODIFY/REJECT` condition unless a later reviewed package explicitly extends the boundary guard.

## 5. Next Package Boundary

The next package should be review-first.

It may define, for review only:

- whether the next step is parser isolation, additional hidden source-acquisition execution preparation, or a broader source-acquisition sequencing review;
- the isolation boundary required before parsing real fetched bytes;
- disposal and retention rules once parser consumption exists;
- hidden artifact inspection proof for parsed-content metadata without raw content leakage;
- static no-public-reach, no-cache, no-SR, no-durable-storage, and no-V1-reuse guards;
- rollback and kill-switch requirements before any executable/live-smoke gate.

It must not authorize source implementation until deputy review approves the exact package.

## 6. Stop Conditions

Stop and request review or Captain escalation before any of these:

- parser execution over fetched bytes;
- source edits outside an exact reviewed parser-isolation or source-acquisition execution envelope;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- semantic relevance/applicability/extraction/probative/sufficiency/warning decisions outside approved LLM-owned gates;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.

Captain-approved canaries remain reserved for a later reviewed live-smoke gate:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## 7. Debt And Follow-Up

2C-A intentionally materializes then disposes hidden transport packets because parser consumption remains blocked. This is deliberate infrastructure debt, not an analysis capability.

Removal or replacement trigger:

- When a later reviewed parser-isolation/source-acquisition execution package safely consumes real fetched bytes, replace the terminal-dispose placeholder path with the approved parser handoff and keep equivalent retention/no-public-leak tests.

Residual debt:

- JavaScript memory zeroization remains best-effort. The enforceable guarantee is private-state disposal, removed dereference paths, and no returned payload.
- Parser isolation is the next hard architectural question. Do not treat in-process structural parser tests from 2B as proof that real fetched bytes can be parsed safely.
- The positive transport-success sealing function is exported for module-boundary reasons and guarded statically. It is not product-safe authority and must remain transport-only until a later package replaces or narrows that surface.

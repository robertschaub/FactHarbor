# V2 Slice 7N-3B3-2B Post-Implementation Consolidation

**Date:** 2026-05-16
**Status:** consolidated; next package may be debated/reviewed, real transport-byte handoff still blocked
**Owner role:** Lead Architect / Captain deputy
**Implementation baseline:** `13ff68d3` (`feat: add v2 parser sink fixture boundary`)
**Final hardening baseline:** `20dc2900` (`test: close v2 parser sink re-export guard`)
**Package baseline:** `d6b13b95` (`docs: approve v2 parser sink source package`)

## 1. Outcome

7N-3B3-2B is complete as a fixture/control-only parser and packet-sink boundary.

It provides:

- a hidden packet-sink authority for fixture/control material only;
- module-owned committed fixture material keyed by opaque fixture packet id;
- digest, byte-count, parser-policy, content-type-policy, and authority-snapshot binding before packet creation;
- rejection of ordinary caller byte objects, strings, payload fields, transport outcomes, provider JSON, and product/API input;
- state-backed and frozen public packet metadata so caller mutation cannot bypass disposal or retained-byte quota release;
- bounded hidden in-memory packet retention;
- explicit disposal on valid parser terminal paths: success, request failure, policy mismatch, timeout, and cancellation;
- disposed-reference scrubbing and active-reference invalidation;
- structural parser outcomes only;
- exact owner/non-owner import and re-export guards for parser/sink files;
- focused tests proving fixture-only behavior, no-public-payload behavior, disposal, tamper resistance, and boundary reachability.

It does not provide:

- real transport-byte handoff from `source-acquisition-content-transport.ts`;
- parsing of fetched network content;
- raw content, parsed text, extracted text, evidence items, source records, EvidenceCorpus, warnings, verdicts, confidence, or report prose;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 result exposure;
- live jobs or Captain canaries;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- prompt/config/model/schema changes;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, or helper reuse;
- V1 cleanup.

## 2. Review Findings And Resolution

Initial post-implementation review returned `MODIFY`. The findings were resolved in the hardening commits:

1. Arbitrary `Uint8Array` ingress could have accepted caller-owned bytes.
2. Disposal was caller-controlled and not guaranteed on every valid parser terminal path.
3. Disposed references could still expose active-looking metadata.
4. Packet public metadata could be caller-mutated before disposal, creating quota-release and lifecycle ambiguity.
5. The import/re-export boundary guard did not fully cover parser/sink owner files.

The final state resolves these by:

- using a module-owned committed fixture catalog rather than exported ordinary byte ingress;
- removing caller-controlled disposal settings;
- disposing valid packets from parser success, invalid request, cancellation, timeout, and policy mismatch paths;
- deriving public packet metadata from module-private packet state through getters;
- freezing packet objects;
- releasing retained byte quota from private byte state, not caller-visible metadata;
- scrubbing disposed public metadata and deleting the active WeakSet brand;
- rejecting module-specifier re-exports from parser/sink owner files and from non-owner runtime paths.

Security/lifecycle re-review after `3a4c7308` returned `APPROVE`. Architecture re-review found the remaining parser-owner re-export guard gap; `20dc2900` closed that gap without changing runtime behavior.

## 3. Verification

Verification after final source and guard hardening:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> 3 files / 66 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> 20 files / 114 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition` -> 4 files / 31 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 54 files / 381 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` -> passed.
- `git diff --cached --check` -> passed before commits.

No expensive tests and no live jobs were run or needed for 7N-3B3-2B.

## 4. Consolidated Deputy Decision

The next step is not product wiring, public exposure, live smoke, Source Reliability integration, evidence generation, report generation, ACS/direct URL runtime, or V1 cleanup.

The consolidated decision is:

1. Treat 7N-3B3-2B as complete and fixture/control-only.
2. Do not expand 2B to parse real fetched bytes by widening fixture ingress.
3. If source acquisition needs parsed real content, first draft and debate a separate `7N-3B3-2C` package.
4. `7N-3B3-2C` must explicitly include the transport-owner handoff question because 2B parser/sink files alone cannot safely materialize real 7N-3B3-1 bytes.
5. Any real-byte handoff must keep public transport outcomes byte-free and must preserve hidden, bounded, non-durable, owner-only semantics.

## 5. Next Package Boundary

7N-3B3-2C may be drafted for review as a real transport-byte handoff design package.

It may define, for review only:

- whether real transport-byte handoff is necessary now or should remain deferred;
- the exact owner file envelope, including any narrow edit to `source-acquisition-content-transport.ts`;
- an owner-only in-memory handoff from content transport to packet sink;
- provenance/HMAC binding between transport authority, target, byte material, sink authority, and parser policy;
- disposal and zero-retention rules across transport, sink, and parser boundaries;
- parser isolation requirements for real fetched bytes;
- hidden artifact inspection proof that exposes only structural metadata;
- static no-public-reach, no-cache, no-SR, no-durable-storage, and no-V1-reuse guards;
- rollback and kill-switch requirements before any executable/live-smoke gate.

It must not authorize implementation until deputy review approves the exact package.

## 6. Stop Conditions

Stop and request debate/review or Captain escalation before any of these:

- real transport-byte handoff;
- parser execution over fetched bytes;
- source edits outside a reviewed 2C file envelope;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- cache read/write/key construction;
- durable raw-content or parsed-text storage;
- Source Reliability import/call/score;
- evidence item, source record, EvidenceCorpus, warning, verdict, confidence, or report generation;
- prompt/config/model/schema changes;
- semantic relevance/applicability/extraction/probative/sufficiency/warning decisions;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.

Captain-approved canaries remain reserved for a later reviewed live-smoke gate:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## 7. Debt And Follow-Up

The 2B fixture catalog is deliberate temporary test/control debt. It is not a compatibility surface and must not become the real parser ingress.

Removal trigger:

- If 7N-3B3-2C approves real transport-byte handoff, replace or delete the 2B fixture-only ingress as soon as real-byte handoff tests can cover the same lifecycle, disposal, and no-public-leak contracts.

Residual debt:

- Byte zeroization remains best-effort within JavaScript memory. The current guarantee is removal of module-owned dereference paths, private-state disposal, and no returned payload.
- Real parser isolation remains deferred. 2C must decide whether in-process parsing is still acceptable for the first real-byte step or whether worker/process/container isolation is required before any executable path.

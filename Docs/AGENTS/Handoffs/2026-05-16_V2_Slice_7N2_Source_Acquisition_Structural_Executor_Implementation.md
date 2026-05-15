# V2 Slice 7N-2 Source Acquisition Structural Executor Implementation Handoff

Date: 2026-05-16
Role: Lead Architect / Codex implementation deputy
Branch/workspace: `C:\DEV\FactHarbor` on `main`

## Task

Implement the approved V2 Slice 7N-2 structural source-acquisition executor package.

Approval pointer: `Docs/WIP/2026-05-16_V2_Slice_7N2_Source_Acquisition_Structural_Executor_Source_Package.md`

## Scope Implemented

Production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Test file:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`

## Architectural Result

7N-2 now has a hidden/internal structural executor contract and executor that:

- consumes the approved 7M-1 query-plan source-acquisition handoff and existing 7C source-acquisition start decision;
- validates selected AtomicClaim alignment, query targets, prompt/model/cache provenance, no-store/no-read cache provenance, budget identity, cancellation, retry policy, and controlled-harness authority before any port call;
- calls only an injected controlled-harness port, at most once per query entry, with no retries;
- validates returned structural outcome labels against `readStaticSourceAcquisitionStructuralOutcomeKinds()`;
- returns only opaque structural attempt metadata and opaque non-durable content packet pointers;
- treats timeout, cancellation, partial execution, and cap violations as executor stop reasons, not 7H structural outcome labels;
- does not expose source records, URLs/domains, source names, raw content, snippets, titles, provider payloads, evidence items, applicability, probative value, sufficiency, warnings, verdicts, confidence, report prose, cache keys, or public output.

## Guardrails Preserved

- No V1 analyzer imports or prompt reuse.
- No provider SDK imports.
- No source acquisition port implementation under `source-acquisition-port/**`.
- No network/parser/search/fetch imports or direct `fetch`.
- No cache/storage IO.
- No Source Reliability import or call.
- No analyzer-v2-runtime, product/orchestrator, public API/UI/report/export, prompt, config, or API-project edits.
- No product wiring, no public exposure, no live jobs.
- Source-language policy and query text are pass-through inputs to the controlled harness only; executor output derives no language or retrieval-intent labels.

## Verification

Passed:

- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts` — 12 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/boundary-guard.test.ts` — 46 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition` — 4 files, 30 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port` — 1 file, 5 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning` — 5 files, 17 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2` — 40 files, 298 tests
- `npm -w apps/web run build`
- `git diff --check`

No expensive LLM tests and no live jobs were run; this slice is structural and not product/runtime executable.

## Failed-Attempt Recovery / Debt Guard

Prior attempt classification: `keep`.

One focused test initially failed because the serialized-output leak assertion rejected the required structural flag `rawContentIncluded: false`. The production contract was correct; the assertion was amended to reject actual raw-content field/value leakage without removing the explicit safety flag.

Build then failed on a TypeScript-only helper return-type widening issue. The executor helper return types were narrowed from the full stop-reason union to blocked stop reasons only. No runtime behavior changed.

DEBT-GUARD COMPACT RESULT

- Chosen option: amend existing tests/types in place.
- Net mechanism count: unchanged.
- Verification: focused structural executor test and `apps/web` build passed after the amendments; full analyzer-v2 unit slice passed before the type-only build amendment and the focused executor test passed after it.
- Residual debt: none from this recovery.

## Residual Risks

- This is still a controlled-harness structural executor. It does not authorize real source acquisition, provider wiring, product wiring, cache IO, Source Reliability use, public report exposure, or live jobs.
- The next step should be post-7N-2 review/consolidation before any later package introduces executable source acquisition behavior.

## Post-Commit Review Hardening

Post-commit review initially returned `MODIFY` from three focused reviewers. The findings were resolved in a follow-up hardening commit:

- exact 7M-1 handoff and 7C source-acquisition request version checks before port calls;
- source-language policy structural shape validation before building the port request;
- closed-field opaque content packet pointer validation;
- opaque candidate/content packet pointer ID prefix validation to prevent URL/domain/source-identity material from serializing through ID values;
- negative tests for can-write/storage-authority cache provenance, stale contract versions, malformed source-language policy, missing/invalid budgets, durable/dereferenceable pointers, forbidden pointer fields, leaking ID values, and one-call/no-retry partial execution;
- reverse boundary guard preventing product/public surfaces from directly or transitively reaching the 7N-2 structural executor or execution contract.

Additional verification after hardening:

- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts` — 12 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/boundary-guard.test.ts` — 47 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition` — 4 files, 30 tests
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2` — 40 files, 299 tests
- `npm -w apps/web run build`

DEBT-GUARD RESULT

- Classification: incomplete-existing-mechanism.
- Chosen option: amend the existing validators/tests/guard in place.
- Rejected path and why: reverting 7N-2 would discard approved structural work; adding a parallel sanitizer would create a second trust mechanism.
- What was removed/simplified: no runtime path removed; validator openness was narrowed.
- What was added: stricter structural validation and negative coverage only.
- Net mechanism count: unchanged.
- Budget reconciliation: touched the expected executor, test, boundary guard, and handoff/index files; no provider/runtime/product/public path added.
- Verification: focused/widened/full analyzer-v2/build passed.
- Debt accepted and removal trigger: none.
- Residual debt: 7N-3 must still add caller/owner-side enforcement so a future real IO port cannot merely claim the controlled-harness authority marker.

## Learnings

- For opaque content packet pointers, a boolean field such as `rawContentIncluded: false` is useful and should not be conflated with raw content leakage.
- Exact boundary guards should track approved V2 source-acquisition files as the slice grows, otherwise later agents can misread the allowed execution envelope.

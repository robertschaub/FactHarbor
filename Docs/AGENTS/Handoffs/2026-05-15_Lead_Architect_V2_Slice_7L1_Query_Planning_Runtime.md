# 2026-05-15 - Lead Architect - V2 Slice 7L-1 Query-Planning Runtime

## Summary

Implemented Captain-approved V2 Slice 7L-1 at commit `6162e057f8cfb5921cea5f8efd0d035c5d5a03d3` (`feat: add v2 query planning runtime`).

The slice adds the first hidden/internal Evidence Lifecycle prompt/model runtime: direct-text accepted `ClaimContract` plus selected AtomicClaim IDs in, bounded `EvidenceQueryPlanningResult` out. The runtime remains internal-only and is not wired to product/orchestrator/runner paths.

## Files Changed

Production:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-governance.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/policy.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

## Approval Trace

Source package:

- `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`

Captain approval:

- Conversation message: `Approved`
- Approval timestamp recorded in code: `2026-05-15T20:43:42.6482362Z`
- Local time basis: `2026-05-15T22:43:42.6482362+02:00`
- Approver stored in code: `Captain`

Approved boundary from the source package:

> Approved to implement V2 Slice 7L-1 under `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`, limited to internal hidden direct-text Evidence Lifecycle query-planning prompt/model execution for accepted `ClaimContract` input only.

The package also explicitly blocked provider/search/fetch/parser/network execution, Source Reliability import/call, UCM/default JSON changes, prompt text edits, prompt/profile file seeding, product/orchestrator/runner wiring, public API/UI/report/export/compatibility exposure, live jobs/canary execution, ACS/direct URL execution, V1 analyzer/prompt/type/code reuse, and V1 cleanup.

## Implementation Notes

- `evidence_query_planning` is the only newly executable Evidence Lifecycle gateway task.
- The runtime resolves shipped gateway/model policy internally; tests can no longer inject private executable task/model-policy clones.
- Query-planning policy is temporary Captain-approved metadata only. It does not create UCM/default JSON authority.
- The cache-policy registry entry is approval/provenance metadata only; runtime remains no-store/no-read and performs no cache IO.
- Prompt loading is confined to `claimboundary-v2` / `V2_EVIDENCE_QUERY_PLANNING`; prompt text was not edited or seeded.
- Input blocks before prompt rendering/provider invocation when selected IDs are empty/unknown/duplicate, unselected claims would leak, the input is not direct text, ACS migration is present, or language is missing/`und`.
- Provider execution is through an injected provider callback only; Analyzer V2 imports no provider SDK.
- Scarcity remains query intent only and does not create sufficiency, warning, report, or verdict state.

## Review Consolidation

Initial post-implementation review returned `MODIFY` from Code Reviewer, LLM Expert, and Senior Developer:

- remove runtime `gatewayTask`/`modelPolicy` override inputs;
- ensure direct URL grounding cannot pass through direct-text runtime;
- restore broad Evidence Lifecycle boundary-guard coverage while excluding the new query-planning root intentionally;
- prevent source-acquisition trace extras from overriding protected fields.

Fixes applied before commit:

- runtime now resolves shipped `evidence_query_planning` gateway/model policy internally;
- exact one-call/no-retry policy checks remain enforced against the shipped policy;
- direct-text checks now require both `claimContract.input.inputType === "text"` and `inputGroundingSeed.inputType === "text"`;
- source-acquisition trace extras are nested under `additionalContext`;
- boundary guards now include query-planning-specific forbidden-import/IO/public-surface checks plus a restored broad Evidence Lifecycle ownership guard.

Focused re-review returned `APPROVE` from Senior Developer, Code Reviewer, and LLM Expert.

## DEBT-GUARD RESULT

Classification: verifier-exposed boundary-guard scope bug after a focused validation failure.

Chosen option: keep/amend.

Rejected path and why: reverting the query-planning runtime was rejected because validation showed the implementation was sound and the failure was a guard ownership overlap. Broad refactoring was also rejected because a targeted guard split carried the fix.

What was removed/simplified: private runtime authority injection (`gatewayTask`/`modelPolicy` overrides) and duplicate exact gateway clone checks.

What was added: shipped-policy resolution inside runtime, exact model-policy validation, direct-text grounding checks, protected extra trace nesting, and explicit query-planning boundary guards.

Net mechanism count: contained increase for the approved runtime; no fallback, retry, cache, provider factory, product path, public path, or source-acquisition mechanism was added.

Budget reconciliation: final diff stayed inside the approved 7L-1 source/test envelope plus one focused cache-governance export test.

Verification: focused query-planning/gateway/boundary tests, full Analyzer V2 unit slice, web build, diff checks, and manual forbidden-import/search checks.

Debt accepted and removal trigger: temporary Captain-approved policy metadata remains until UCM/task-policy-derived authority replaces it.

Residual debt: query-planning hidden inspection, source-acquisition execution, live-smoke gating, product wiring, cache authority, Source Reliability thin port, and V1 cleanup remain future reviewed gates.

## Verification

Passed:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning test/unit/lib/analyzer-v2/evidence-lifecycle/execution-readiness/static-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

Observed results:

- focused package verifier: 9 files, 80 tests passed after the targeted guard amendment;
- focused re-review verifier: 6 files, 68 tests passed;
- full Analyzer V2 unit slice: 37 files, 277 tests passed;
- web build passed, postbuild reseed reported no config or prompt changes;
- manual forbidden search found no V1 analyzer import, provider SDK import, search/fetch/network/parser import, Source Reliability import/call, public/product import, or direct `fetch(...)` in query-planning source.

No expensive tests and no live jobs were run; 7L-1 does not approve live jobs.

## Next Step

Run a post-7L-1 review/consolidation gate before the next implementation. The next package should likely decide hidden query-plan inspection/traceability and the source-acquisition execution boundary.

Do not proceed directly to provider/search/fetch/source execution, product/orchestrator/runner wiring, public exposure, cache IO, Source Reliability integration, live jobs/canaries, ACS/direct URL execution, or V1 cleanup without a new reviewed gate.

## Warnings

- 7L-1 makes only query planning executable, not source acquisition.
- The runtime is not product-wired and should not be imported by product callers without a later gate.
- The temporary Captain approval is static metadata and must be replaced by UCM/task-policy-derived authority later.
- Source Reliability remains unchanged and outside Analyzer V2 Evidence Lifecycle runtime.

## Learnings

- Runtime authority should be resolved from shipped policy inside the owning runtime, not injected by tests or private callers.
- Boundary guards need both narrow folder-specific rules and broad Evidence Lifecycle ownership rules as V2 grows.

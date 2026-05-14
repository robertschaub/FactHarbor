# V2 Slice 6B.3c-3B Runtime Dispatch Owner Implementation Approval Package

**Date:** 2026-05-14
**Status:** 6B.3c-3B1, 3B2, and 3B3 complete; product wiring remains blocked pending the 6B.3c-4 wiring gate
**Owner role:** Lead Architect / Captain deputy
**Pre-3B1 baseline:** `a53564f0` (`docs: narrow v2 runtime dispatch owner package`)

---

## 1. Review Consolidation

The first 6B.3c-3B package proposed implementing a non-product-wired owner that could render the prompt, construct a no-store cache decision, and call the model adapter with an injected provider callback.

Reviewer outcome:

| Reviewer lens | Verdict | Required change |
|---|---|---|
| LLM/runtime safety | MODIFY | Split pre-render readiness from post-render provenance; restrict the next owner slice to direct text unless ACS JSON ownership is defined; add explicit no-store cache semantics before adapter calls. |
| Senior Developer | MODIFY | Add `gateway/types.ts` if cache reasons change; define owner request shape before rendering; make boundary exceptions precise. |
| Code Reviewer / clean-room | MODIFY | Replace coarse "all three imports" guard with symbol/capability-level static tests and public-surface import guards before owner behavior. |
| Challenger | BLOCK | The package combines too many unresolved gates: approval authority, frame-bound provenance, cache contract, prompt variables, provider callback, and guard replacement. |

Consolidated decision:

- Do not implement the original 6B.3c-3B runtime owner behavior.
- Do not render prompts, construct cache decisions, accept provider callbacks, or call the adapter yet.
- Split the work into smaller reviewed slices:
  - **6B.3c-3B1:** preflight/provenance binding and guard hardening only.
  - **6B.3c-3B2:** explicit runtime no-store cache decision contract.
  - **6B.3c-3B3:** prompt rendering and adapter invocation owner, still non-product-wired, if 3B1/3B2 pass review.

## 2. Current Baseline

Already implemented:

- 6B.3a: V2 prompt loader, production schemas, cache/provenance foundations.
- 6B.3b: V2-owned model adapter with injected provider callback, structural retry, schema validation, telemetry, and no provider SDK callsite.
- 6B.3c-0: internal no-dispatch runtime stage; direct input remains blocked by shipped gateway policy.
- 6B.3c-1: dispatch-frame contract; direct URL fails closed, ACS frames require resolved text plus canonical hashes.
- 6B.3c-2B: dispatch-readiness contract; product paths cannot import readiness/runtime-dispatch internals.
- 6B.3c-3A: inert runtime-dispatch owner/activation contract; `review_packet_snapshot` cannot satisfy runtime readiness; boundary guards include transitive reachability and provider/import/status scans.

Still blocked:

- product execution path wiring;
- executable shipped gateway status or approval flips;
- prompt rendering;
- provider callback acceptance or provider SDK imports;
- cache-decision construction and cache read/write;
- API/UI/report/export/public diagnostics;
- direct unresolved URL dispatch;
- live jobs;
- V1 code, prompt, profile, section, or type reuse.

## 3. Revised Slice 6B.3c-3B1 Scope

Purpose: define the preflight/provenance contract that must be true before any future runtime owner can render the prompt.

Allowed source envelope:

- `apps/web/src/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract.test.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-dispatch.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-dispatch.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- docs/handoff files

Forbidden in 3B1:

- no `gateway/cache-governance.ts` or `gateway/types.ts` change;
- no prompt rendering;
- no cache-decision construction;
- no model-adapter import or adapter call;
- no provider callback parameter;
- no provider SDK import;
- no product-path imports;
- no public/API/UI/report/export field;
- no direct URL dispatch;
- no live jobs;
- no prompt source changes;
- no V1 reuse.

## 4. 3B1 Contract Requirements

3B1 must define and test:

1. **Pre-render readiness:** readiness that may pass before rendering must not require `renderedPromptHash`, because that value only exists after prompt rendering.
2. **Post-render provenance placeholder boundary:** post-render provenance fields are explicitly absent or pending in 3B1; they cannot be faked as externally supplied real values.
3. **Runtime approval ownership:** `runtime_approval_snapshot` remains structural/test-only while product reachability is mechanically impossible; it must carry non-placeholder identity fields and cannot be `review_packet_snapshot`.
4. **Frame-bound provenance:** direct-text readiness must bind to the frame's exact `analysisInput`, `resolvedInputText`, `inputSource`, `selectedAtomicClaimIds`, and `currentDate`.
5. **Direct URL rejection:** a forged or null direct URL frame cannot satisfy 3B1 preflight.
6. **ACS deferral:** ACS frames are blocked in 3B1 unless a later slice defines exact ACS snapshot JSON ownership and hash verification.
7. **Owner remains inert:** `runtime-dispatch.ts` may validate owner/preflight contracts but cannot import prompt loader, model adapter, cache-governance builders, or provider SDKs in 3B1.

## 5. Static Guard Requirements Before Later Owner Behavior

3B1 must add guard tests for future source work:

1. `runtime-dispatch.ts` is the only candidate future owner, but in 3B1 it still cannot import prompt loader, model adapter, or cache-governance builders.
2. `runtime-stage.ts`, `dispatch-frame.ts`, and `dispatch-readiness-contract.ts` remain no-dispatch contracts: no prompt loader, model adapter, cache decision builders, provider SDKs, or mock/fixture imports.
3. Protected V2 product paths (`index.ts`, `orchestrator.ts`, `pipeline-shell.ts`, `runner-ingress.ts`, `runtime-stage.ts`) have no direct or transitive reachability to `runtime-dispatch.ts`, `model-adapter.ts`, `prompt-loader.ts`, or `dispatch-readiness-contract.ts`.
4. Public app/report/export surfaces do not import or export dispatch-capable internals.
5. The Analyzer V2 barrel does not export `runtime-dispatch.ts` or other dispatch-capable internals.
6. Executable gateway task clones remain forbidden outside one future named owner helper; in 3B1 no such helper is executable.
7. Public V2 result schema and result surfaces remain free of owner-only fields: `ownerContract`, `sideEffects`, `providerTelemetry`, `cacheDecision`, `keyParts`, `renderedPrompt`, `renderedPromptHash`, `adapterCalled`, `providerCallbackCreated`, `cacheRead`, and `cacheWrite`.

## 6. Slice 6B.3c-3B2

3B2 defines the explicit runtime no-store cache decision contract after 3B1.

Implemented additions:

- added cache decision reason `no_store_runtime_dispatch_safety`;
- added `buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(...)` in `gateway/cache-governance.ts`;
- the runtime no-store builder returns `canRead=false`, `canWrite=false`, complete key parts only when dimensions are complete, and no cache IO;
- incomplete dimensions still return `no_store_due_to_incomplete_dimensions` with no key parts;
- ACS hash mismatch still overrides runtime no-store and returns `no_store_due_to_acs_snapshot_hash_mismatch`;
- product paths, prompt rendering, adapter calls, provider callbacks, public surfaces, and live jobs remain blocked;
- `runtime-dispatch.ts` does not import or consume this cache contract in 3B2.

## 7. Deferred Slice 6B.3c-3B3

Only after 3B1 and 3B2 pass review, 3B3 may propose prompt rendering and adapter invocation inside `runtime-dispatch.ts`.

Expected constraints:

- direct text only unless ACS JSON ownership and hash verification are already defined;
- prompt rendering occurs only after readiness/preflight and approval checks;
- adapter call uses injected provider callback only;
- no provider SDK import or built-in provider callback;
- no product-path reachability;
- no public surfaces;
- no cache read/write;
- no live jobs.

## 8. Verifier Matrix For 3B1

Required before 3B1 acceptance:

| Area | Required verifier |
|---|---|
| Pre-render readiness | focused readiness tests prove no pre-supplied `renderedPromptHash` is accepted as real pre-render provenance |
| Direct text binding | tests prove exact Captain-defined direct text is preserved and bound to frame identity fields |
| Direct URL rejection | forged/null direct URL frame cannot satisfy preflight |
| ACS deferral | ACS frame blocks until ACS JSON ownership is defined |
| Owner inertness | runtime owner has false side-effect flags and imports no prompt/cache/model/provider code |
| Product reachability | direct and transitive product-path guards remain clean |
| Public leakage | app/report/export/result/schema scans remain clean |
| Clean-room | no V1 analyzer/prompt/profile/section/type reuse; no mocks/fixtures in production source |
| Regression | focused runtime-dispatch/readiness/boundary tests, full Analyzer V2 unit slice, V2 routing test, build, `git diff --check` |

## 9. Implementation Outcome

3B1 is now implemented as an inert contract/test hardening slice:

- readiness provenance is explicitly `pre_render`;
- `promptContentHash` and `renderedPromptHash` must be absent before prompt rendering is owned;
- direct-text readiness is bound to the exact dispatch frame `analysisInput`, `resolvedInputText`, `inputSource`, `selectedAtomicClaimIds`, and `currentDate`;
- direct URL readiness fails closed for both null unresolved frames and structurally complete forged URL frames;
- ACS readiness is deferred until exact ACS JSON ownership and hash verification are defined;
- runtime-dispatch tests use the same pre-render readiness packet and remain contract-only;
- boundary guards now cover public app/report/export imports, Analyzer V2 barrel exports, owner-only result-surface fields, cache-governance imports in no-dispatch contracts, test/mock imports in no-dispatch contracts, and element-access `status = "executable"` assignments.

Verification completed for the 3B1 implementation:

- focused readiness/runtime-dispatch/boundary guard tests;
- full Analyzer V2 unit slice;
- V2 internal runner routing test;
- `npm -w apps/web run build`;
- targeted clean-room scans for V1 analyzer imports, V1 prompt/profile reuse, provider SDK imports, and public dispatch-capable internals;
- `git diff --check`.

Still blocked after 3B1:

- product execution path wiring;
- executable shipped gateway status or approval flips;
- prompt rendering;
- provider callback acceptance or provider SDK imports;
- cache-decision construction and cache read/write;
- API/UI/report/export/public diagnostics;
- direct unresolved URL dispatch;
- live jobs;
- V1 code, prompt, profile, section, or type reuse.

## 10. 3B2 Implementation Outcome

3B2 is implemented as a pure gateway cache-contract slice:

- source changed only under `apps/web/src/lib/analyzer-v2/gateway/`;
- focused tests prove direct-input runtime no-store cannot enable read/write, incomplete dimensions fail closed, and ACS mismatch takes precedence;
- static guards prove Analyzer V2 production source does not pass `executionApproved: true`, cache governance imports no IO/storage/provider/prompt/model/runtime/readiness/test/V1 dependencies, public surfaces and Analyzer V2 barrel remain clean, and owner-only result fields remain private;
- the existing `buildAnalyzerV2ClaimUnderstandingCacheDecision(...)` execution-approved behavior remains unchanged for synthetic cache-eligibility tests;
- no runtime-dispatch, readiness, frame, prompt, model-adapter, gateway-policy, product, API, UI, report, export, prompt, config, or live-job behavior changed.

Verification completed for 3B2:

- focused gateway cache-governance and boundary guard tests;
- full Analyzer V2 unit slice;
- V2 internal runner routing test;
- `npm -w apps/web run build`;
- targeted clean-room scans for V1 analyzer imports, V1 prompt/profile reuse, provider SDK imports, production `executionApproved: true`, and public dispatch/cache leakage;
- `git diff --check`.

Still blocked after 3B2:

- product execution path wiring;
- executable shipped gateway status or approval flips;
- prompt rendering;
- provider callback acceptance or provider SDK imports;
- cache read/write and cache IO;
- runtime-dispatch consumption of the no-store cache decision;
- API/UI/report/export/public diagnostics;
- direct unresolved URL dispatch;
- live jobs;
- V1 code, prompt, profile, section, or type reuse.

## 11. Short Reviewer Prompt

Review the implemented 6B.3c-3B1 and 6B.3c-3B2 slices. Decide whether the remaining 3B3 prompt-rendering/adapter-invocation proposal is sufficiently specified to review. The implementation must still stop before product wiring, provider SDK imports, public surfaces, live jobs, direct URL dispatch, cache read/write, and V1 reuse.

## 12. 3B3 Review Consolidation

Deputy expert review after 3B2 returned `MODIFY/MODIFY`.

Consolidated decision:

- 3B3 may be specified as a narrowed internal direct-text owner slice.
- 3B3 is not approved as a broad runtime-dispatch implementation.
- 3B3 must not handle ACS, direct URLs, product wiring, public surfaces, real provider SDKs, cache IO, approval mutation, live jobs, prompt source changes, config defaults, or V1 reuse.
- Source implementation should proceed only from the exact package below.

Required 3B3 source envelope:

- `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-dispatch.ts`;
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-dispatch.test.ts`;
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- docs/handoff files.

Avoid unless a compile-level type need is proven:

- `dispatch-readiness-contract.ts`;
- `model-adapter.ts`;
- `prompt-loader.ts`;
- `cache-governance.ts`.

Forbidden in 3B3:

- product entry points, API/UI/report/export surfaces, prompt source, config defaults, provider SDKs, live jobs, approval flips, direct URL execution, ACS execution, cache read/write, cache IO, V1 analyzer imports, V1 prompt/profile/section/type reuse.

Required 3B3 owner behavior:

1. **Direct text only.** Runtime owner accepts only readiness with `inputSource = "direct_input"`, `submittedKind = "text"`, and `acsSnapshotHash = null`.
2. **ACS/direct URL fail before work.** Blocked readiness, ACS, or direct URL paths must return before prompt rendering, cache decision construction, adapter call, or provider call.
3. **Owned prompt variables.** `runtime-dispatch.ts` builds the prompt variables from the satisfied readiness frame and provenance:
   - `currentDate = frame.currentDate`;
   - `analysisInput = frame.analysisInput`;
   - `acsSnapshotJson = "null"`;
   - `inputGroundingSeedJson` is canonical owner-built JSON from frame/provenance, not caller-supplied text and not fabricated ACS data.
4. **Owner-created post-render provenance.** Prompt rendering happens through `loadAndRenderClaimUnderstandingGate1Prompt(...)` after readiness. `promptContentHash` comes only from the loader result. Any `renderedPromptHash` must be computed inside the owner, never supplied by the caller.
5. **Runtime no-store cache decision.** Cache decision is built after prompt render with `buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(...)`; it must have `canRead=false`, `canWrite=false`, and reason `no_store_runtime_dispatch_safety`.
6. **Injected provider callback only.** Adapter invocation may use only an injected `providerCall`; `runtime-dispatch.ts` must not create provider callbacks or import provider SDKs.
7. **Executable clone helper.** If the adapter requires an executable gateway task, the clone must be created only inside one named private helper in `runtime-dispatch.ts`. It must not mutate shipped gateway policy or approval state.
8. **No public reachability.** Runtime dispatch remains unexported from the Analyzer V2 barrel and unreachable from product paths.

Required 3B3 static guards:

- product paths keep no direct or transitive reachability to `runtime-dispatch.ts`;
- public app/report/export/result schemas expose no `ownerContract`, `sideEffects`, `providerTelemetry`, `cacheDecision`, `keyParts`, `renderedPrompt`, `renderedPromptHash`, `adapterCalled`, `providerCallbackCreated`, `cacheRead`, or `cacheWrite`;
- `runtime-dispatch.ts` imports no provider SDK, cache IO, V1 analyzer, mocks, fixtures, public/UI modules, or nonliteral dynamic imports;
- `runtime-dispatch.ts` may import only exact approved symbols from prompt-loader, model-adapter, and cache-governance;
- `runtime-dispatch.ts` may import the runtime no-store cache builder but not `buildAnalyzerV2ClaimUnderstandingCacheDecision`;
- Analyzer V2 production source still has no `executionApproved: true` except the one named private runtime-dispatch executable clone helper;
- Analyzer V2 barrel still does not export `runtime-dispatch.ts`.

Required 3B3 behavior tests:

- direct text happy path with at least one Captain-defined non-English input;
- blocked readiness returns blocked before prompt render, cache decision, adapter call, or provider call;
- ACS and direct URL inputs block before prompt render, cache decision, adapter call, or provider call;
- prompt variables contain exact frame-bound input and `acsSnapshotJson = "null"`;
- no-store decision passed to adapter has `canRead=false`, `canWrite=false`, and reason `no_store_runtime_dispatch_safety`;
- adapter receives rendered prompt, config hash, input frame, no-store cache decision, and injected provider callback;
- provider callback is not created by runtime-dispatch;
- provider throw, invalid provider telemetry, invalid schema, prompt-render failure, and blocked readiness all fail closed with no cache read/write.

Required 3B3 verifiers:

- focused runtime-dispatch and boundary tests;
- full Analyzer V2 unit slice;
- V2 internal runner routing test;
- `npm -w apps/web run build`;
- targeted clean-room scans for V1 analyzer imports, V1 prompt/profile reuse, provider SDK imports, production `executionApproved: true`, public dispatch/cache leakage, and runtime-dispatch import exceptions;
- `git diff --check`.

Captain escalation is required only if 3B3 expands to real provider execution through built-in SDKs, product wiring, public exposure, ACS/direct URL execution, cache read/write, approval flips, prompt changes, config changes, or live jobs.

## 13. 3B3 Implementation Outcome

3B3 is implemented as the narrowed internal direct-text owner slice:

- `runtime-dispatch.ts` now owns `executeClaimUnderstandingRuntimeDispatch(...)`;
- direct text is the only runnable path;
- blocked readiness, ACS, and direct URL return before prompt rendering, cache decision, adapter call, or provider call;
- prompt variables are owner-built from the satisfied readiness frame and provenance, with `acsSnapshotJson = "null"`;
- prompt rendering uses `loadAndRenderClaimUnderstandingGate1Prompt(...)` after readiness;
- post-render provenance is owner-created: `promptContentHash` comes from the prompt loader, and `renderedPromptHash` is computed inside the owner;
- runtime no-store cache decision uses `buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(...)` and must remain `canRead=false`, `canWrite=false`, reason `no_store_runtime_dispatch_safety`;
- adapter invocation uses only the injected `providerCall`;
- executable gateway task state is created only inside the private `buildClaimUnderstandingRuntimeDispatchExecutableGatewayTask(...)` helper;
- `runtime-dispatch.ts` remains unexported from the Analyzer V2 barrel and unreachable from product/public surfaces.

Verification completed for 3B3:

- focused runtime-dispatch and boundary guard tests;
- full Analyzer V2 unit slice;
- V2 internal runner routing test;
- `npm -w apps/web run build`;
- targeted clean-room scans for V1 analyzer imports, V1 prompt/profile reuse, provider SDK imports, production `executionApproved: true`, public dispatch/cache leakage, and executable clone containment;
- `git diff --check`.

Still blocked after 3B3:

- product execution path wiring;
- API/UI/report/export/public diagnostics;
- built-in provider SDK imports or provider callback factories;
- cache read/write and cache IO;
- ACS execution and direct URL execution;
- approval/status mutation of shipped gateway policy;
- prompt source or config default changes;
- live jobs;
- V1 code, prompt, profile, section, or type reuse.

## 14. Post-3B3 Product Wiring Review

Post-3B3 deputy review returned `MODIFY/BLOCK` for product runtime wiring.

Consolidated decision:

- 3B3 remains valid as an internal direct-text owner.
- Product wiring is not approved.
- The next approved step is docs-only: `Docs/WIP/2026-05-14_V2_Slice_6B3c4_Product_Runtime_Dispatch_Wiring_Gate.md`.
- No source files may import or call `executeClaimUnderstandingRuntimeDispatch(...)` from product paths until a later source package is reviewed and approved.

The later source package must define runtime approval authority, provider callback factory ownership outside Analyzer V2, direct-text-only limits, API acceptance mode, public-surface leak guards, rollback behavior, failure classification, live-job discipline, and V1-removal separation.

Still blocked after this review:

- product execution path wiring;
- API/UI/report/export/public diagnostics;
- built-in provider SDK imports or provider callback factories inside Analyzer V2;
- cache read/write and cache IO;
- ACS execution and direct URL execution;
- approval/status mutation of shipped gateway policy;
- prompt source or config default changes;
- live jobs;
- V1 code, prompt, profile, section, or type reuse.

# V2 Slice 6B.3c Dispatch Integration Review Package

**Date:** 2026-05-14
**Status:** Draft for deputy review; dispatch-capable source code remains blocked
**Owner role:** Lead Architect / Captain deputy
**Current stable implementation:** 6B.3c-0 complete at `3223d99f`

---

## 1. Debate Consolidation

Follow-up expert debate after 6B.3c-0 returned `MODIFY`.

Consensus:

- Do not start dispatch-capable source code now.
- The next safe step is this docs-only dispatch-integration contract package.
- This package must be stronger than narrative review: it must define ownership, side-effect ordering, mock exclusion, prompt/config/cache/hash construction, URL handling, and tests before implementation.
- The next executable slice after review should be contract/test-first unless Captain separately approves product runtime dispatch.

Reasoning:

- 6B.3c-0 deliberately records prompt/model/cache/provider side effects as `false` and keeps Claim Understanding state internal.
- The 6B.3b adapter already requires a rendered prompt, config snapshot hash, cache decision, and provider callback before its internal gateway check. Product integration therefore needs a pre-adapter gateway/order guard, not a direct call from the orchestrator.
- `claim_understanding_gate1` remains blocked by shipped policy and missing prompt/model/cache approvals.
- Premature code risks accidental prompt rendering, cache materialization, mock/provider leakage, public diagnostics, URL misanalysis, or approval-state confusion.

## 2. Non-Goals For This Package

This package does not approve:

- product-path import of the model adapter;
- prompt loading or rendering;
- provider callback creation or provider SDK import;
- cache read/write or cache eligibility;
- prompt/model/cache approval flips;
- executable shipped gateway status;
- API/UI/report diagnostics;
- file seeding;
- live jobs or validation batches;
- V1 analyzer imports or V1 prompt reuse.

## 3. Proposed Review Decision

Default proposal for deputy review:

1. Keep shipped `claim_understanding_gate1` blocked.
2. Add one contract-first dispatch-construction slice before product dispatch.
3. That slice may define pure builders and tests for dispatch frames, hashes, no-store decisions, and side-effect ordering.
4. It still must not call a provider, import provider SDKs, perform cache IO, flip approvals, or expose public diagnostics.
5. Product runtime dispatch requires a later Captain/deputy decision after the construction slice proves all contracts.

Captain escalation is required if reviewers propose product runtime dispatch, approval flips, cache IO, public diagnostics, live jobs, or any weakening of clean-room boundaries.

## 4. Owner-By-Input Contract

| Adapter or dispatch input | Future owner | Required rule before code |
|---|---|---|
| `analysisInput` | Claim Understanding dispatch-frame builder | Use Captain/user submitted text exactly for text input; do not normalize, translate, lowercase, or rewrite. |
| `resolvedInputText` | V2 ingress/run-context plus ACS migration | For direct text, equals submitted text. For ACS, comes from prepared snapshot. For URL, dispatch is blocked unless a reviewed resolver supplies body text. |
| `detectedLanguage` | ACS migration or future LLM/prompt result | Preserve ACS language when present; direct input may use `"und"` until model result exists. No deterministic language-specific semantic routing. |
| `selectedAtomicClaimIds` | Runner ingress and Claim Understanding stage | Raw shell placeholders fail before normalization; selected IDs must remain visible to Claim Understanding gates. |
| `acsSnapshotHash` | Future canonical V2 ACS-hash builder | Do not reuse `resolvedInputSha256`. Missing or mismatched hash means no dispatch/cache eligibility. |
| `inputGroundingSeedHash` | Future input-grounding seed builder | Required before ACS-backed dispatch/cache eligibility. Missing hash fails closed. |
| `currentDate` / bucket | Run context | Use the generated run date; cache bucket policy must be explicit. |
| `promptContentHash` | V2 prompt loader | Construct only after gateway execution is approved for this task. |
| `configSnapshotHash` | Future V2 config snapshot owner | Must include model policy and analysis-affecting UCM defaults. Placeholder values are forbidden. |
| `cacheDecision` | V2 gateway/cache governance | First dispatch proposal is no-read/no-write until complete dimensions and cache approval are reviewed. |
| `providerCall` | Future provider-dispatch boundary | Product provider callsite is not approved. Test mocks must stay in test files only. |

## 5. Required Side-Effect Ordering

Future dispatch-capable code must preserve this ordering:

1. Normalize runner input through the one-way V2 ingress boundary.
2. Reject raw shell-only selected IDs before run-context normalization can hide them.
3. Build structural run context.
4. Resolve the gateway task and approval source.
5. If shipped or runtime policy is not executable, stop before prompt loading, cache decision construction, provider callback creation, model-adapter import/reachability, or provider SDK import.
6. For ACS-backed runs, prefer accepted ACS migration; do not dispatch unless a later review explicitly approves re-understanding selected ACS claims.
7. For direct text only, construct prompt variables after executable approval.
8. Compute prompt/config/input/cache hash material only after executable approval and with non-placeholder values.
9. Keep first dispatch no-store/no-read unless cache policy approval and complete dimensions are explicitly reviewed.
10. Create provider callback only after all previous gates pass.
11. Call the adapter only from the reviewed dispatch boundary.
12. Keep internal Claim Understanding state out of public `resultJson`, API, UI, report, and export surfaces.

## 6. Mock And Provider Boundary

Mocks are allowed only in tests.

Product code must not import a mock provider, synthetic approved gateway task, or test fixture. If a future slice adds a provider-dispatch boundary, it must define:

- exact file path and owner;
- supported provider abstraction;
- provider SDK import location;
- timeout and cancellation behavior;
- telemetry owner;
- failure mapping into `ClaimUnderstandingResult` or damaged internal state;
- verifier proving V1-default imports do not load provider modules or create callbacks.

## 7. URL Handling

Dispatch is not approved for unresolved URL input.

Allowed before a reviewed URL resolver exists:

- ACS-backed URL snapshots may be consumed if they carry `resolvedInputText`, selected claims, and canonical V2 hashes.
- Direct URL input must fail closed before prompt rendering and provider callback creation.

Forbidden:

- treating the URL string itself as article/body text;
- caching direct URL input under a body-text identity hash;
- model dispatch without a reviewed retrieval/resolution boundary.

## 8. Minimum Test Matrix Before Dispatch Code

| Test area | Required proof |
|---|---|
| Gateway ordering | blocked shipped policy performs no prompt load, no cache decision construction, no provider callback, no adapter call |
| Adapter reachability | product paths cannot reach adapter/provider unless explicit executable test fixture enables the reviewed boundary |
| Prompt variables | direct text variables are exact and input-neutral; ACS variables come from canonical migrated state |
| Hash provenance | prompt/config/input/ACS/input-grounding hashes are non-placeholder and source-owned |
| Cache policy | first dispatch no-read/no-write or explicitly reviewed cache IO with complete dimensions |
| Mock exclusion | mocks and synthetic approved tasks are test-only and absent from product paths |
| URL handling | direct URL dispatch fails closed; ACS URL snapshot succeeds only with resolved text and hashes |
| Public leakage | no `claimUnderstanding`, prompt text, provider telemetry, cache key material, adapter telemetry, or internal state in public result/API/UI/report |
| Clean-room | no V1 analyzer import, no V1 prompt/profile/section reuse, no shared adapter that weakens V1/V2 boundary |
| Multilingual/input-neutrality | non-English direct text remains unmodified through dispatch-frame construction |

## 9. Reviewer Questions

1. Is a contract-first dispatch-construction slice sufficient before product runtime dispatch?
2. Is no-store/no-read the right first dispatch cache posture?
3. Should product-path adapter import remain forbidden until the provider boundary exists, or can a dedicated dispatch boundary import it under static guards?
4. Is direct URL input blocked until a resolver exists, or should URL resolution be a prerequisite slice before any direct dispatch?
5. What exact approval source should make `claim_understanding_gate1` executable without mutating shipped registry constants?
6. Which tests are mandatory before Captain is asked to approve real dispatch or live jobs?

## 10. Short Reviewer Prompt

Review `Docs/WIP/2026-05-14_V2_Slice_6B3c_Dispatch_Integration_Review_Package.md` as the dispatch-integration contract gate after 6B.3c-0. Decide whether the next implementation slice should be contract/test-only, whether any source code may import the model adapter, and what must be true before real provider dispatch. Treat prompt rendering, provider callbacks, cache IO, approval flips, public diagnostics, live jobs, V1 imports, and URL-body assumptions as blockers unless explicitly justified and approved.

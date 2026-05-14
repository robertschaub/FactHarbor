# V2 Slice 6B.3c Dispatch Integration Review Package

**Date:** 2026-05-14
**Status:** 6B.3c-1 dispatch-frame boundary contract complete at `8a663d3f`; product runtime dispatch remains blocked
**Owner role:** Lead Architect / Captain deputy
**Current stable implementation:** 6B.3c-1 complete at `8a663d3f`

---

## 1. Debate Consolidation

Follow-up expert debate after 6B.3c-0 returned `MODIFY`.

Consensus:

- Do not start dispatch-capable source code now.
- The package is directionally sound, but the next implementation must be narrower than generic builders.
- The approved next slice is **6B.3c-1 Dispatch Frame Boundary Contract** only.
- Runtime dispatch, adapter product import, prompt rendering, cache decision construction, provider callbacks, approval flips, public diagnostics, and live jobs remain blocked.

Reasoning:

- 6B.3c-0 deliberately records prompt/model/cache/provider side effects as `false` and keeps Claim Understanding state internal.
- The 6B.3b adapter already requires a rendered prompt, config snapshot hash, cache decision, and provider callback before its internal gateway check. Product integration therefore needs a pre-adapter contract boundary before any adapter reachability is allowed.
- Reviewers agreed that "pure builders" is still too broad because hash/cache builders can become dispatch scaffolding.
- Direct URL input is dangerous until resolved-body ownership exists.

## 2. Review Outcome

| Reviewer lens | Verdict | Required outcome |
|---|---|---|
| LLM/runtime expert | APPROVE for gate | Package is fit only as a contract/test gate. Preserve structural retry rules from 6B.3b and multilingual/input-neutral pass-through. |
| Senior Developer | MODIFY | Narrow 6B.3c-1 to dispatch-frame construction only: no prompt/config/cache hashes, no cache decision, no adapter import, no provider callback, no approval mutation, no public surface. |
| Code Reviewer / clean-room | MODIFY | Add import-time side-effect, approval-state, mock-exclusion, public-leak, URL identity, and cache guards. Product-path adapter import remains forbidden. |
| Challenger | MODIFY | Name exact files/exports and keep cache decision/materialization out of the next slice. |

No Captain escalation is needed for the narrowed 6B.3c-1 slice because it remains non-executable, internal, non-public, and test/contract-only.

## 3. Approved 6B.3c-1 Scope

Allowed source envelope:

- `apps/web/src/lib/analyzer-v2/claim-understanding/dispatch-frame.ts` or equivalent V2-owned path under `claim-understanding/`;
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/dispatch-frame.test.ts`;
- existing Analyzer V2 boundary/static guard tests.

Allowed exports:

- a pure dispatch-frame result type;
- a pure function that derives or rejects a dispatch frame from `ClaimBoundaryV2Ingress` plus `ClaimBoundaryV2RunContext`;
- fail-closed structural reason values.

Allowed successful frame fields:

- `analysisInput`;
- `resolvedInputText`;
- `detectedLanguage`;
- `selectedAtomicClaimIds`;
- `currentDate`;
- `inputSource`.

Allowed fail-closed reasons:

- direct URL has no reviewed resolved body;
- ACS snapshot/input-grounding hashes are missing;
- selected IDs or resolved text are structurally invalid.

Forbidden in 6B.3c-1:

- prompt loader import or prompt rendering;
- prompt hash, config hash, input identity hash, cache hash, or cache decision construction;
- cache eligibility, cache read, or cache write;
- model adapter import or adapter call;
- provider callback or provider SDK;
- approval/status mutation or executable shipped registry state;
- public/API/UI/report exposure;
- direct URL dispatch without resolved body ownership;
- live jobs.

## 4. Dispatch-Frame Rules

Direct text:

- succeeds as a frame;
- preserves submitted text exactly as both `analysisInput` and `resolvedInputText`;
- preserves `selectedAtomicClaimIds` from the run context;
- does not normalize, translate, lowercase, or rewrite text;
- uses the run context `detectedLanguage` as structural metadata only.

Direct URL:

- fails closed before prompt/cache/provider/adapter work;
- must not treat the URL string as article/body text;
- must not create an input identity hash or cache decision.

ACS-backed text or URL:

- may produce a frame only when the ACS snapshot provides resolved body text through the run context;
- requires canonical V2 `acsSnapshotHash` and `inputGroundingSeedHash` on the ingress seed;
- preserves selected claim IDs and detected language from the migrated state/run context;
- fails closed when required hashes are missing.

Shell placeholders:

- remain blocked by ingress/stage guards;
- must not be hidden by dispatch-frame construction.

## 5. Side-Effect Ordering

Future dispatch-capable code must preserve this ordering:

1. Normalize runner input through the one-way V2 ingress boundary.
2. Reject raw shell-only selected IDs before run-context normalization can hide them.
3. Build structural run context.
4. Build or reject the 6B.3c-1 dispatch frame.
5. Resolve the gateway task and approval source.
6. If shipped or runtime policy is not executable, stop before prompt loading, cache decision construction, provider callback creation, adapter reachability, or provider SDK import.
7. Only a later approved dispatch slice may construct prompt variables, hashes, cache decisions, provider callback, or adapter call.
8. Keep internal Claim Understanding state out of public `resultJson`, API, UI, report, and export surfaces.

For 6B.3c-1, execution stops at step 4.

## 6. Mock, Adapter, And Provider Boundary

Mocks are allowed only in tests.

6B.3c-1 product/source code must not import:

- model adapter;
- prompt loader;
- cache-governance runtime builders;
- provider SDKs;
- mock providers;
- synthetic approved gateway tasks;
- test fixtures;
- V1 analyzer modules.

Product-path adapter import remains forbidden until a later reviewed dispatch boundary replaces the no-import guard.

## 7. Cache And Approval Decisions

Resolved for 6B.3c-1:

- shipped `claim_understanding_gate1` remains blocked;
- blocked paths construct no cache decision;
- 6B.3c-1 constructs no prompt/config/cache hashes;
- executable state may exist only in future isolated test fixtures, not product constants;
- no-store/no-read decision construction is deferred.

Deferred to later dispatch review:

- exact approval source for executable Claim Understanding;
- provider dispatch boundary and provider SDK ownership;
- prompt/config/cache hash construction;
- cache no-read/no-write decision construction;
- whether URL resolution is prerequisite before direct dispatch.

## 8. Mandatory Tests For 6B.3c-1

| Test area | Required proof |
|---|---|
| Direct text frame | non-English submitted text is preserved exactly in `analysisInput` and `resolvedInputText` |
| Direct URL frame | direct URL fails closed before prompt/provider/cache/adapter work |
| ACS frame | ACS-backed frame succeeds only with resolved text plus canonical ACS and input-grounding hashes |
| Missing hashes | ACS frame fails closed when either canonical hash is missing |
| No side effects | frame module imports no prompt loader, model adapter, cache-governance builder, provider SDK, mock provider, or V1 analyzer |
| Public leakage | existing V2 shell result remains free of Claim Understanding frame/state, prompt text, provider telemetry, cache material, and diagnostics |
| Approval state | shipped gateway registry remains blocked and is not mutated |
| URL identity | no input/cache identity is produced for unresolved direct URL |
| Clean-room | no V1 analyzer import, no V1 prompt/profile/section reuse, no shared adapter that weakens V1/V2 boundary |

## 8.1 Implementation Result

Slice 6B.3c-1 was implemented at `8a663d3f`.

Implementation outcome:

- `apps/web/src/lib/analyzer-v2/claim-understanding/dispatch-frame.ts` defines a pure internal result type and frame builder.
- Direct text frames preserve the submitted text exactly as both `analysisInput` and `resolvedInputText`.
- Direct URL input fails closed before prompt/cache/provider/adapter work.
- ACS-backed text or URL frames require resolved snapshot body text plus canonical V2 `acsSnapshotHash` and `inputGroundingSeedHash`.
- Static boundary guards forbid prompt loader, model adapter, cache-governance, gateway policy, provider SDK, mock/fixture, and V1 analyzer imports from the frame module.

Verification:

- focused dispatch-frame + boundary tests passed: 2 files, 18 tests;
- full Analyzer V2 unit slice passed: 16 files, 103 tests;
- `npm -w apps/web run build` passed;
- targeted clean-room source scan and `git diff --check` passed.

No prompt rendering, adapter import/call, provider callback, provider SDK, cache decision/hash construction, approval flip, public/API/UI/report exposure, live job, or V1 reuse was added.

## 9. Later Dispatch Review Questions

1. What exact approval source makes `claim_understanding_gate1` executable without mutating shipped registry constants?
2. Can a dedicated dispatch boundary import the model adapter, and what guard replaces the current no-import guard?
3. Which file owns provider dispatch and provider SDK imports?
4. How are prompt/config/cache hashes and no-store/no-read decisions constructed?
5. Is URL resolution a prerequisite before direct dispatch?
6. Which tests are mandatory before Captain is asked to approve real dispatch or live jobs?

## 10. Short Reviewer Prompt

Review the next product-runtime dispatch proposal after 6B.3c-1. Confirm the executable approval source, provider boundary, prompt/config/cache hash construction, cache posture, URL-resolution prerequisite, and replacement guard for product-path model-adapter import. Treat prompt rendering, provider callbacks, cache IO, approval flips, public diagnostics, live jobs, V1 imports, and URL-body assumptions as blockers unless explicitly justified and approved.

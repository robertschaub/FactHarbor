# 2026-05-18 Lead Developer V2 X7-W2-TR1 Implementation

## Summary

Implemented TR1 strictly inside the approved package `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`.

The production default W2 network transport now uses the standard Node HTTPS connection path by removing the custom pinned lookup callback from `source-acquisition-network-transport.ts`. The surrounding containment stays unchanged: DNS pre-resolution and public-address validation still run before request, and final remote-address validation still gates all response status, header, and byte acceptance.

## Files Changed

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-TR1_Implementation.md`

## Behavior

- Removed only the default request's custom pinned lookup callback.
- Preserved `agent: false`, endpoint allowlist, redirect-deny, proxy-none, no-credential posture, timeout/cancellation behavior, byte caps, JSON-only acceptance, final-address validation, hidden-only diagnostics, and raw-leak protections.
- Added a focused source-level test that guards against reintroducing the custom pinned lookup callback in the production default request path.
- Tightened the synthetic success test to require nonzero compressed and decompressed byte telemetry while preserving candidate count and leakage assertions.

## Debt-Guard Result

- **Classification:** incomplete existing mechanism.
- **Chosen option:** amend the existing transport mechanism in place.
- **Rejected path:** add a new client/provider stack, add retries, change endpoint, weaken final-address validation, or patch the custom DNS stack first.
- **What was removed/simplified:** one custom pinned lookup callback in the production default request path.
- **What was added:** focused tests for the standard-client contract and nonzero byte telemetry.
- **Net mechanism count:** decreases in production transport.
- **Debt accepted and removal trigger:** none. The canary stop/pivot rule remains active.
- **Residual risk:** Node may connect to a different public address than the pre-resolved set; existing final remote-address validation intentionally fails closed in that case.

## Verification

All required pre-canary verifiers passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` — PASS, 4 files / 93 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts` — PASS, 3 files / 17 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` — PASS, 5 files / 94 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` — PASS, 43 files / 257 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` — PASS, 88 files / 622 tests.
- `npm -w apps/web run build` — PASS.
- `npm run validate:v2-gates` — PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test` — PASS.
- `git diff --check` — PASS.

## Warnings

- Do not run the post-repair canary until this implementation is committed and runtime is refreshed from the committed state.
- TR1 authorizes exactly one post-repair canary using the approved direct-text input. It does not authorize provider expansion, retries, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, prompt/config/model/schema changes, or V1 work.
- If the canary still records zero bytes and zero hidden candidates, stop and prepare an endpoint/client pivot package for Steering Board review. Do not patch the custom DNS stack inside TR1.
- A pre-existing uncommitted `apps/web/vitest.config.ts` change was present before this TR1 implementation and was not modified as part of this package.

## Next Step

Commit the focused TR1 implementation package by explicit path only, refresh runtime from the commit, re-check endpoint documentation/status, prove route and artifact gates, then run exactly one post-repair canary.

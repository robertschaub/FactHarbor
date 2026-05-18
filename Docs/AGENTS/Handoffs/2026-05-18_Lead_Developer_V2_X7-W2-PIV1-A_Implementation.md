# Lead Developer Handoff — V2 X7-W2-PIV1-A Bounded Core Search Limit Implementation

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Task:** Implement the narrow PIV1-A response-size repair after TR1 reached response streaming but stopped at compressed byte cap.
**Status:** Implementation verified locally; focused commit, runtime refresh, and one canary remain.

## Summary

PIV1-A keeps TR1's standard Node HTTPS client and the current approved Wikimedia Core page-search endpoint. It adds only one structural request parameter:

```text
limit <- max_candidate_records
```

For current W2 this serializes to `limit=3`, matching the hidden candidate cap W2 can consume. No byte caps were raised and no endpoint switch was made.

## Files Changed

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Verification

Passed:

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
  5 files / 99 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
  43 files / 257 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2
  88 files / 623 tests

npm -w apps/web run build
  PASS

npm run validate:v2-gates
  PASS

node scripts/validate-v2-gate-register.mjs --self-test
  PASS

git diff --check
  PASS
```

One first focused verifier failed only because the new no-leak test forbade the broad substring `sourceMaterial`, while the expected structural flag `sourceMaterialCreated: false` is part of the sanctioned telemetry. Recovery classification: `keep` implementation, narrow the test assertion to a unique raw-payload marker. The focused test then passed.

## Constraints Preserved

PIV1-A did not:

- raise byte caps;
- switch endpoints;
- add retries;
- expand providers;
- add provider SDKs;
- create source material;
- dereference content;
- execute parsers;
- touch cache, durable storage, or Source Reliability;
- create EvidenceCorpus/evidence/report/verdict/warning/confidence behavior;
- change public behavior;
- edit prompt/config/model/schema policy;
- add ACS/direct URL behavior;
- reuse or clean up V1.

## Next Step

Commit the focused package, refresh runtime from the commit, verify the route/runtime state is clean, then run exactly one canary:

```text
Using hydrogen for cars is more efficient than using electricity
```

If the canary still yields zero bytes and zero hidden candidates, stop W2 repair and prepare a project-local endpoint or byte-cap pivot package. Do not add more diagnostics or source changes inside PIV1-A.

## Warnings

The implementation passing local verifiers is not proof of provider-network success. PIV1-A success requires the one post-commit canary to show nonzero bytes and nonzero hidden structural candidates while public output remains blocked/precutover and no hidden marker leaks.

## Learnings

The lowest-complexity repair is to make the existing endpoint return only what the W2 hidden candidate cap can consume before considering endpoint migration or byte-cap changes. The raw-leak tests must avoid forbidding legitimate structural flag names, otherwise they mask the real leak property.

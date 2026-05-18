# V2 Slice X7-W2-PIV1-A Bounded Core Search Limit Source Package

**Date:** 2026-05-18
**Status:** Implementation verified; focused commit/runtime refresh/canary pending
**Owner:** Lead Developer / Captain Deputy
**Parent package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Live_Result.md`

## Purpose

TR1 repaired W2 far enough to reach response streaming, but the one canary still stopped all attempts at `compressed_byte_cap_exceeded` with zero bytes and zero hidden candidates. PIV1-A is the narrow first response-size repair: keep the same standard Node HTTPS path and approved Wikimedia Core page-search endpoint, but request only the bounded candidate count W2 can consume.

## Approved Scope

PIV1-A may:

- add a structural endpoint request-parameter value source for W2's hidden `maxCandidateRecords`;
- add the Core page-search query parameter `limit=3`, sourced from the existing W2 max hidden candidate cap;
- update focused request construction, bounded-success, byte-cap fail-closed, and raw-leak tests;
- update status/handoff/index docs.

PIV1-A must not:

- raise byte caps;
- switch to project-local REST search;
- add retries;
- expand providers;
- add provider SDKs;
- add source material, content dereference, parser execution, cache IO, durable storage, Source Reliability, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public behavior, ACS/direct URL behavior, prompt/config/model/schema edits, V1 reuse, or V1 cleanup.

## Implementation Summary

The implementation adds the structural value source `max_candidate_records` to the hidden provider-network endpoint/request envelope and maps it to `request.maxCandidateRecords` during network request construction. The W2-approved Wikimedia Core page-search endpoint now has:

```text
q     <- query_text
limit <- max_candidate_records
```

For current W2 this produces `limit=3`, aligned to `SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_CANDIDATES_PER_QUERY`. The transport path, hostname, endpoint path, byte caps, timeout caps, redirect policy, proxy policy, credential policy, raw-leak controls, and public/precutover behavior are unchanged.

## Verification

Local verifiers passed on 2026-05-18 before canary:

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
  PASS: 5 files / 99 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
  PASS: 43 files / 257 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2
  PASS: 88 files / 623 tests

npm -w apps/web run build
  PASS

npm run validate:v2-gates
  PASS

node scripts/validate-v2-gate-register.mjs --self-test
  PASS

git diff --check
  PASS
```

One focused test assertion was narrowed during failed-attempt recovery: the broad substring `sourceMaterial` was removed from the raw-leak check because the legitimate structural flag `sourceMaterialCreated: false` must remain visible. The test now uses a unique raw-payload marker to prove provider payload is not leaked.

## Canary Rule

After focused commit, runtime refresh, route preflight, endpoint status re-check, and clean worktree/idle checkpoint, PIV1-A authorizes exactly one Captain-defined canary:

```text
Using hydrogen for cars is more efficient than using electricity
```

Pass signal:

- job reaches `SUCCEEDED`;
- first preparation shows `pipeline: claimboundary-v2`;
- public V2 output remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers leak publicly;
- hidden W2 records network attempts;
- hidden W2 records nonzero bytes;
- hidden W2 records nonzero hidden structural candidates;
- downstream gate remains `candidate_to_source_material_gate_closed`;
- no source material/content/parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public output is created.

Stop/pivot signal:

- if the one canary still yields zero bytes/candidates, stop and bring back a project-local endpoint or byte-cap pivot package.

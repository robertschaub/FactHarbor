# V2 Slice 7N3B2-T1 Network Attempt Telemetry Projection Source Package

**Date:** 2026-05-17
**Status:** source package for review; implementation blocked until reviewer acceptance
**Owner:** Lead Developer / Captain Deputy
**Parent runtime:** `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md`
**Motivating package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`
**Baseline:** `f0311f47` (`docs: correct v2 x7w2 network contract`)

## 1. Purpose

X7-W2 requires first hidden provider-network candidate records with cost, timing, outcome, and byte-count telemetry. Source reads before W2 implementation found that 7N-3B2 already measures sanitized byte counts inside `SourceAcquisitionNetworkHiddenDiagnostic`, but `buildSourceAcquisitionCandidateNetworkProviderBoundary(...)` projects only duration, candidates, and sanitized flags to the candidate provider result.

7N3B2-T1 is a narrow telemetry projection package. It exposes sanitized network attempt telemetry from the existing 7N-3B2 provider-network factory to an internal runtime owner without changing endpoint authority, transport behavior, candidate runtime semantics, provider SDK posture, or product/public reachability.

## 2. Decision

Implement a small optional telemetry observer on `buildSourceAcquisitionCandidateNetworkProviderBoundary(...)`.

The observer may receive only structural, bounded fields:

- telemetry version;
- visibility `internal_only`;
- provider id;
- endpoint id;
- attempt ordinal;
- structural status;
- stop reason;
- duration milliseconds;
- timeout milliseconds;
- candidate count;
- compressed bytes;
- decompressed bytes;
- byte count state:
  - `observed`;
  - `not_reached`;
- raw payload included: false;
- secret included: false;
- public payload included: false;
- error trace included: false;
- cache key constructed: false;
- Source Reliability touched: false.

The observer must not receive query id, retrieval policy key, query text, request path, request parameters, headers, raw URL, provider payload, title, snippet, page key, stack, cause, or raw exception text.

All telemetry records must be built by explicit allow-list scalar projection. Do not spread, clone, or pass through transport outcomes, diagnostics, errors, request objects, response objects, candidates, provider results, or raw provider data.

All numeric telemetry fields must be finite non-negative integers. Missing or unreached byte values must be forced to `0` with `byteCountState: "not_reached"`.

## 3. Proposed Source Envelope

Allowed production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if a tiny named 7N3B2-T1 assertion is needed

Allowed governance/status files:

- `Docs/WIP/2026-05-17_V2_Slice_7N3B2-T1_Network_Attempt_Telemetry_Projection_Source_Package.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_7N3B2-T1_Network_Attempt_Telemetry_Projection.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- `source-acquisition-network-envelope.ts`;
- `source-acquisition-network-transport.ts`;
- candidate runtime/envelope files;
- W2 product owner files;
- orchestrator/product/API/UI/report/export files;
- prompt/config/schema/model/provider-policy files;
- provider SDK/package/lockfile files;
- cache, Source Reliability, storage, parser, source material, EvidenceCorpus, V1 files.

If implementation requires editing outside this envelope, stop and reopen review.

## 4. Implementation Rules

7N3B2-T1 may:

1. Add an optional `attemptTelemetrySink` callback to the existing network provider factory params.
2. Emit one sanitized telemetry record per provider boundary attempt.
3. Derive observed byte counts only from the existing `SourceAcquisitionNetworkTransportOutcome.diagnostic`.
4. Emit `byteCountState: "not_reached"` with zero bytes when the network transport was not reached.
5. Preserve the existing `SourceAcquisitionCandidateProviderAttemptResult` shape.
6. Preserve all 7N-3B2 endpoint, budget, authority, request, transport, DNS, SSRF, redirect, proxy, content-type, sniff, byte-cap, timeout, and cancellation semantics.
7. Catch and suppress telemetry sink exceptions so the observer can never change provider result shape, attempt outcome, cancellation, timeout, or transport behavior.

7N3B2-T1 must not:

- create a second network path;
- import transport into product/W2 code;
- add fixed literal request parameters;
- add provider SDKs;
- change candidate runtime validation;
- change source-acquisition network endpoint/request exact-key validation;
- expose raw provider payloads or request details;
- create source material, parser input, EvidenceCorpus, warnings, verdicts, reports, public output, cache/SR/storage, or live jobs.

## 5. Test Requirements

Focused tests must prove:

- successful transport emits one sanitized telemetry record with observed compressed/decompressed byte counts and candidate count;
- redirect, content-type/sniff, byte-cap, timeout, cancellation, DNS, and provider failure outcomes emit structural status/stop reason without raw data;
- blocked factory state emits `byteCountState: "not_reached"` or no telemetry without throwing;
- telemetry sink exceptions are caught and do not change the provider attempt result or transport behavior;
- telemetry records are built from explicit scalar fields only and all numeric values are finite non-negative integers;
- telemetry never contains query id, retrieval policy key, query text, request parameters, headers, raw URL, title, snippet, page key, stack, cause, cache key, Source Reliability field, source material, EvidenceItem, EvidenceCorpus, report, verdict, confidence, or secret-like poison values;
- existing provider result shape and candidate runtime behavior remain unchanged;
- inherited 7N-3B2 tests continue to pass.

## 6. Required Verifier Set

Before completion, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run build
git diff --check
npm run index
```

Do not run live jobs or expensive LLM tests for 7N3B2-T1.

## 7. Reviewer Prompt

Review `Docs/WIP/2026-05-17_V2_Slice_7N3B2-T1_Network_Attempt_Telemetry_Projection_Source_Package.md`.

Return `approve`, `modify`, or `reject`.

Check whether the package is the right low-risk repair before W2, whether the source envelope is narrow enough, whether telemetry fields are useful for W2 without leaking raw provider/request data, and whether any broader network-envelope change should be deferred.

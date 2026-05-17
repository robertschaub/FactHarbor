# V2 Slice X7-W1B Product-Internal Closed Candidate-Runtime Loop Source Package

**Date:** 2026-05-17
**Status:** source package for review; implementation blocked until reviewer acceptance
**Owner:** Lead Developer / Captain Deputy
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1A_Product_Internal_Candidate_Runtime_Admission_Source_Package.md`
**Baseline:** `8dedb7d3` (`feat: add v2 x7w1a candidate admission`)

## 1. Purpose

X7-W1A proved that the product V2 route can construct and record candidate-runtime admission after X7-V without invoking runtime execution.

X7-W1B should prove the next, still closed, boundary: the product V2 route can exercise the existing candidate-runtime loop through a product-owned closed provider boundary that performs no IO and returns no candidates.

This package must not open source acquisition. It only proves controlled runtime-loop plumbing, sanitized per-query structural outcomes, and artifact visibility while preserving public/precutover blocking.

## 2. Approved Position

X7-W1B is a **closed runtime-loop exercise** only:

```text
product route -> X7-W1A admission_ready_no_runtime_execution
              -> X7-W1B product-owned closed-loop owner
              -> executeSourceAcquisitionCandidateRuntime(...)
              -> closed local provider boundary
              -> zero candidates, zero bytes, no source material
```

The closed provider boundary may be invoked by the runtime loop. It must not perform provider, network, search, fetch, URL, content, parser, cache, Source Reliability, storage, or public work.

X7-W1B must not implement real candidate acquisition, provider-network execution, parser work, source material, EvidenceCorpus, downstream evidence extraction, report/verdict behavior, public cutover, ACS/direct URL execution, live jobs, or V1 cleanup.

## 3. Implementation Objective

After X7-W1A returns `admission_ready_no_runtime_execution`, product V2 should:

1. Build a product-owned X7-W1B closed-loop authority snapshot.
2. Construct the existing 7N-3B1 candidate-runtime authority only as an internal runtime-contract token, not as product-route approval.
3. Reuse the X7-W1A structural allowlist and budget snapshots.
4. Call `executeSourceAcquisitionCandidateRuntime(...)` exactly once through a closed local provider boundary.
5. Record one bounded admin-only X7-W1B artifact on the same `precutover-observability` ledger.
6. Keep public V2 unchanged: damaged/precutover and no hidden marker leakage.

Expected successful closed-loop posture:

- candidate runtime exercised: true;
- closed provider boundary invoked: true;
- provider-network execution: false;
- source/search/fetch/content/parser execution: false;
- provider attempt outcomes are sanitized structural failures/cancellations/timeouts only;
- candidate count: 0;
- bytes read: 0;
- source material: false;
- EvidenceCorpus/evidence/report/verdict/warning/confidence/public output: false.

## 4. Proposed Source Envelope

Implementation must stay inside this envelope unless reviewers modify this package:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.ts`
- focused tests under:
  - `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.test.ts`
  - `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- status/backlog/Agent_Outputs/completion handoff/generated handoff index.

No prompt, model policy, cache policy, UCM/default config, provider factory, network transport, content transport, parser, Source Reliability, public compatibility/API/UI/report/export, V1 analyzer, API persistence, package, lockfile, or live-job file edits are authorized.

## 5. Required Closed-Loop Contract

The new X7-W1B owner should expose only a structural decision/projection with:

- X7-W1B version;
- `visibility: "internal_only"`;
- status:
  - `closed_loop_completed_no_source_candidates`;
  - `blocked_pre_closed_candidate_runtime_loop`;
  - `closed_loop_damaged_structural`;
- blocked or damaged reason when applicable;
- W1A admission status;
- handoff/request/intake status summaries;
- selected AtomicClaim count;
- query entry count;
- per-query structural outcome summaries without query text;
- no raw handoff `queryId` values in decision/artifact/route/log/error output unless the X7-W1B owner first proves they are opaque and independent of query text, source-language policy, provider input, URLs, source identifiers, and secrets;
- product closed-loop authority hash;
- runtime-contract authority hash or bounded identifier;
- allowlist snapshot hash;
- budget snapshot hash;
- runtime telemetry:
  - candidate runtime exercised;
  - closed provider boundary invoked;
  - provider attempt count;
  - candidate count `0`;
  - total candidate count `0`;
  - bytes read `0`;
  - source material created `false`;
  - EvidenceCorpus created `false`;
  - cache/SR/storage flags false;
  - provider-network/search/fetch/content/parser flags false;
  - evidence/report/verdict/warning/confidence/public flags false.

The decision and artifact must not contain query text, prompt text, rendered prompt, raw provider payload, URL, body, header, secret, source text, source material, parser output, EvidenceItem, report, verdict, warning, confidence, truth percentage, cache key, Source Reliability field, stack, cause, or raw exception text.

X7-W1B must not serialize raw provider attempt requests, raw runtime `queryOutcomes`, or raw handoff `queryId` values into the decision, artifact, route response, logs, errors, or `JSON.stringify(...)` output. Per-query summaries must use query ordinal/index or an internally generated opaque closed-loop query reference that is independent of query text, source-language policy, provider input, URLs, source identifiers, or secrets. If an exposed per-query identifier cannot be proven opaque, X7-W1B must fail closed and record only aggregate counts plus sanitized structural status.

## 6. Authority Rules

X7-W1B must introduce a product-owned closed-loop authority snapshot. That authority must explicitly approve only:

- product-internal closed runtime-loop exercise;
- closed local provider boundary invocation;
- zero candidates;
- zero bytes;
- no source material;
- no public exposure;
- no live jobs.

The existing 7N-3B1 candidate-runtime authority may be constructed only to satisfy the existing runtime function's internal authority contract. It must not be described or treated as product-route approval, because the 7N-3B1 authority snapshot states `productRuntime: false`.

Allowed runtime imports from the X7-W1B owner are limited to this exact symbol set:

- from `@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime`:
  - `executeSourceAcquisitionCandidateRuntime`;
  - `createSourceAcquisitionCandidateRuntimeAuthority`;
  - `readSourceAcquisitionCandidateRuntimeAuthoritySnapshot` only if the implementation needs a bounded runtime-contract hash/projection;
  - `type SourceAcquisitionCandidateRuntimeAuthoritySnapshot` only if the implementation needs a typed bounded projection.
- from `@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority`:
  - `createSourceAcquisitionRuntimeAuthority`;
  - `type SourceAcquisitionRuntimeAuthoritySnapshot`;
  - `readSourceAcquisitionRuntimeAuthoritySnapshot` only if the implementation needs a bounded parent authority projection.
- from `@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope`:
  - `type SourceAcquisitionCandidateRunRequest`;
  - `type SourceAcquisitionCandidateProviderBoundary`;
  - `type SourceAcquisitionCandidateProviderAttemptRequest`;
  - `type SourceAcquisitionCandidateProviderAttemptResult`;
  - `type SourceAcquisitionCandidateRuntimeDecision`;
  - `type SourceAcquisitionCandidateProviderAllowlistSnapshot`;
  - `type SourceAcquisitionCandidateBudgetSnapshot`;
  - `validateSourceAcquisitionCandidateProviderAllowlistSnapshot`;
  - `validateSourceAcquisitionCandidateBudgetSnapshot`.

No local redefinition of candidate-runtime DTOs is allowed. Use existing types or `Parameters<typeof executeSourceAcquisitionCandidateRuntime>`-derived shapes where possible.

The X7-W1B owner must not import or call:

- X6 hidden direct-text candidate-acquisition harness;
- X6-P provenance helpers;
- X7-D readiness composition;
- 7N-3B2 provider network factory or transport;
- content dereference/transport/parser modules;
- cache/storage/Source Reliability modules;
- public compatibility/API/UI/report/export code;
- V1 analyzer code.

Required fail-closed cases:

- X7-W1A admission is not `admission_ready_no_runtime_execution`;
- Query Planning handoff is not ready;
- Source Acquisition request is not ready;
- X7-V intake is not ready;
- product closed-loop authority is missing, stale, placeholder, or mismatched;
- nested runtime-contract authority cannot be constructed or does not match W1A hashes;
- allowlist/budget snapshots are invalid, stale, or mismatched;
- the closed provider boundary returns candidates, bytes, raw payload flags, secrets, public payload flags, URLs, source identifiers, or unsupported statuses;
- runtime returns damaged output;
- any source/provider-network/parser/cache/SR/storage/public flag is not false.

## 7. Closed Provider Boundary Rules

The closed provider boundary must be local and deterministic:

- no SDK imports;
- no `fetch`, `XMLHttpRequest`, sockets, child process, filesystem, database, cache, Source Reliability, parser, content transport, network transport, or environment secret access;
- no URL construction or dereference;
- no query text logging or artifact echo;
- no source-language policy text logging or artifact echo;
- no raw provider payload;
- no candidates;
- no source material;
- no byte reads;
- no retries.

The main successful closed-loop path must return deterministic local `provider_failure` attempt results with zero candidates and sanitized telemetry flags only. Timeout or cancellation behavior may be covered as focused unit cases, but must not be the main completed-path proof.

## 8. Artifact Sink And Route Rules

The artifact sink and route must follow the established internal route contract:

- process-local;
- bounded by records per ledger, ledger count, serialized byte size, and ledger id length;
- non-durable;
- authenticated with `FH_ADMIN_KEY`;
- `Cache-Control: no-store` on success, auth failure, validation failure, and not-found;
- single `ledgerId` query parameter only;
- no listing, prefix, wildcard, or enumeration;
- not exposed through public compatibility views;
- generic errors;
- no query text, provider payload, URL, body, header, secret, source text, source material, cache key, SR field, EvidenceItem, report, verdict, warning, stack, cause, or raw exception leakage through returned objects, `JSON.stringify(...)`, logs, or errors.

## 9. Boundary Guard Requirements

Boundary guards must prove:

- orchestrator imports only the X7-W1B owner and X7-W1B artifact sink, not provider-network/content/parser/cache/SR/public/V1 code;
- the X7-W1B owner may import the specific existing runtime contract symbols named in section 6 and no broader runtime/provider/network/content/parser modules;
- the X7-W1B owner contains no direct network/search/fetch/parser/cache/SR/storage/public/V1 imports;
- the X7-W1B artifact sink imports only approved type/source modules and no IO/provider/parser/SR/public/V1 code;
- the X7-W1B route imports only auth, Next response, and the artifact sink;
- X6/X7-D harness paths are not imported by product runtime;
- any allowance for `executeSourceAcquisitionCandidateRuntime(...)` is scoped only to the X7-W1B owner;
- provider-boundary invocation remains allowed only for the closed X7-W1B boundary, while real provider-network/source IO remains forbidden.

## 10. Gate Register And Status Rules

If implementation succeeds:

- update `gate.research_acquisition` audit row to X7-W1B as the active product-route closed-runtime-loop anchor;
- update allowed files to this explicit set if all listed runtime-contract dependencies are used:
  - `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop.ts`;
  - `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission.ts`;
  - `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
  - `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.ts`;
  - `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.ts`;
  - `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.ts`;
  - `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts`;
  - `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.ts`;
  - omit any of the three runtime-contract dependency files above if the implementation does not import them;
- replace the blanket blocker `provider boundary invocation` with a more precise blocker for `real provider boundary/network/source execution`, while noting the closed local X7-W1B boundary is the only approved provider-boundary invocation;
- preserve explicit blockers for real provider-network execution, search/fetch/content dereference, source material, EvidenceCorpus, parser, cache/SR/storage, report/verdict/warning/confidence behavior, public cutover, live jobs, ACS/direct URL, and V1 cleanup;
- self-test the gate-register validator so it cannot silently drop X7-W1B, the closed-boundary-only limitation, the explicit allowed-file set, or any real-IO/public/downstream blockers;
- self-test that broad globs, X6/X7-D paths, provider-network files, content/source-material files, parser files, cache/SR/storage files, EvidenceCorpus files, report/verdict/public files, and live-job unlocks cannot be added to the active X7-W1B row;
- demote X6/X7-D language from active forward path to regression/test-only or historical context.

The gate register remains audit-only and grants no runtime authority.

## 11. Explicitly Not Authorized

- real provider/search/fetch/network execution;
- 7N-3B2 provider network factory/transport;
- URL construction or dereference;
- content dereference, document fetching, parser execution, packet/frame/byte consumption, or 2D-C;
- non-zero candidates or source material;
- parsed material, EvidenceCorpus, EvidenceItems, warnings, report, verdict, confidence, truth percentage, or public answer generation;
- cache IO, durable storage, Source Reliability, DB writes;
- public API/UI/report/export/compatibility-view changes;
- prompt/config/schema/model/provider edits;
- live jobs;
- ACS/direct URL execution;
- X6/X7-D forward-path reuse;
- V1 reuse, V1 work, or V1 cleanup.

## 12. Side-Channel And Leakage Tests

Focused tests must seed poison `queryText`, `sourceLanguagePolicy`, and `queryId` values containing source text, URL-like text, and secret-like sentinels. The tests must assert absence from:

- the X7-W1B decision;
- artifact sink records;
- route JSON;
- `JSON.stringify(...)` output;
- generic error paths.

If logs are touched by the implementation, tests or code inspection must prove the same poison values are not logged. If the implementation does not log, boundary tests should preserve that no logging import/call was introduced.

## 13. Verification Plan

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

No live job is required or authorized in X7-W1B. If product-route live proof is useful after implementation, create a separate one-job live-smoke package after commit and runtime refresh.

## 14. Reviewer Prompt

Review this X7-W1B source package. Return `approve`, `modify`, or `reject`.

Check that it:

- makes X7-W1B a source package first, not immediate implementation;
- exercises the candidate runtime only through a closed local no-IO boundary;
- distinguishes product-owned X7-W1B authority from the older 7N-3B1 shell-only runtime authority;
- does not authorize real provider/network/source IO, parser, cache/SR/storage, source material, EvidenceCorpus, report/verdict/public behavior, live jobs, ACS/direct URL, or V1 cleanup;
- provides enough telemetry and artifacts to evaluate closed-loop posture without leaking query text or source material;
- demotes old X6/X7-D forward-path language without broad deletion;
- has a tight file envelope and focused verifier set.

## 15. Review Result

| Role | Decision | Notes |
|---|---|---|
| Senior V2 architect | APPROVE | Correct next package after X7-W1A; closed product-internal runtime-loop exercise remains bounded and separates product authority from 7N-3B1 shell authority. |
| Security/runtime | APPROVE | Prior queryId/provider-attempt side-channel concern resolved by opaque per-query projection and poison tests; no remaining blockers. |
| Lead developer/code review | APPROVE | Prior import-surface and gate-register exactness concerns resolved by explicit symbol/file allowlists and deterministic closed-path requirement. |

## 16. Authorization

X7-W1B implementation may proceed inside the approved source envelope only. It remains a closed product-internal runtime-loop exercise and does not authorize real provider/network/source IO, parser/cache/SR/storage, source material, EvidenceCorpus, report/verdict/public behavior, live jobs, ACS/direct URL, X6/X7-D forward-path reuse, V1 work, or V1 cleanup.

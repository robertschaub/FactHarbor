# V2 Slice X7-W1A Product-Internal Candidate-Runtime Admission Source Package

**Date:** 2026-05-17
**Status:** source package for review; implementation blocked until reviewer acceptance
**Owner:** Lead Developer / Captain Deputy
**Parent proposal:** `Docs/WIP/2026-05-17_V2_Slice_X7-W_Hidden_Product_Internal_Source_Acquisition_Candidate_Runtime_Admission_Proposal.md`
**Baseline:** `95b813c4` (`docs: propose v2 x7w candidate runtime admission`)

## 1. Purpose

X7-W1A introduces the product-owned admission boundary between X7-V Source Acquisition intake and any future candidate-runtime execution.

It should prove that the product V2 route can construct, freeze, validate, and record candidate-runtime admission state after X7-V `intake_ready_not_executable`, while still stopping before executable candidate runtime, provider-boundary invocation, source IO, source material, EvidenceCorpus, report/verdict behavior, public output, and V1 cleanup.

## 2. Approved Position

X7-W1A implements **Position A only**:

```text
admission authority/snapshot/artifact only
no executeSourceAcquisitionCandidateRuntime(...)
no providerBoundary.acquireCandidates(...)
no X6/test-injected harness
no network/fetch/content/parser/cache/SR/storage
zero provider attempts
zero candidates
zero bytes
public cutover blocked
```

X7-W1A must not implement X7-W1B. X7-W1B would be a later reviewed package if the team decides to exercise the existing runtime loop with a closed no-IO provider boundary.

## 3. Implementation Objective

After accepted Query Planning and X7-V intake, product V2 should:

1. Build a candidate-runtime admission decision from:
   - ready Query Planning Source Acquisition handoff;
   - ready Source Acquisition request;
   - X7-V intake boundary decision;
   - product-owned admission authority snapshot;
   - provider allowlist snapshot;
   - candidate budget snapshot;
   - run/ledger/public-cutover metadata.
2. Record one bounded admin-only artifact on the same `precutover-observability` ledger.
3. Keep public V2 unchanged: damaged/precutover and no hidden marker leakage.
4. Update the audit-only gate register/status language so X7-W1A becomes the active `research_acquisition` audit anchor while X6/X7-D are demoted from active forward-path language.

## 4. Proposed Source Envelope

Implementation must stay inside this envelope unless reviewers modify this package:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.ts`
- focused tests under:
  - `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.test.ts`
  - `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- status/backlog/Agent_Outputs/completion handoff/generated handoff index.

No prompt, model policy, cache policy, UCM/default config, provider factory, public compatibility/API/UI/report/export, parser, Source Reliability, V1 analyzer, API persistence, package, lockfile, or live-job file edits are authorized.

## 5. Required Admission Contract

The new admission decision should be structural and bounded. It should include only:

- X7-W1A version;
- `visibility: "internal_only"`;
- status:
  - `admission_ready_no_runtime_execution`;
  - or `blocked_pre_candidate_runtime_admission`;
- blocked reason when blocked;
- handoff/request/intake statuses;
- selected AtomicClaim count;
- query entry count;
- retrieval policy count;
- source-language signal;
- product admission authority snapshot hash or bounded identifier;
- provider allowlist snapshot hash or bounded identifier;
- candidate budget snapshot hash or bounded identifier;
- telemetry:
  - admitted query count;
  - provider attempt count `0`;
  - candidate count `0`;
  - total candidate count `0`;
  - bytes read `0`;
  - cache/SR/storage flags false;
  - source/provider/network/parser flags false;
  - evidence/report/verdict/public flags false.

The admission decision must not contain query text, prompt text, rendered prompt, raw provider payload, URL, body, header, secret, source text, source material, parser output, EvidenceItem, report, verdict, warning, confidence, truth percentage, cache key, Source Reliability field, or stack/cause text.

## 6. Authority Rules

X7-W1A must introduce a product-owned admission authority or wrapper. It may validate exactly the approved 7N-3B1 candidate-runtime budget/allowlist shapes listed below, but it must not treat the old 7N-3B1 hidden shell-only approval as product-route authority.

Allowed candidate-envelope reuse is limited to these imports from `@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope`:

- `type SourceAcquisitionCandidateProviderAllowlistSnapshot`;
- `type SourceAcquisitionCandidateBudgetSnapshot`;
- `validateSourceAcquisitionCandidateProviderAllowlistSnapshot`;
- `validateSourceAcquisitionCandidateBudgetSnapshot`.

X7-W1A must not import or reference:

- `@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime`;
- `SourceAcquisitionCandidateRunRequest`;
- `SourceAcquisitionCandidateRuntimeDecision`;
- `SourceAcquisitionCandidateRuntimeApproval`;
- `SourceAcquisitionCandidateProviderBoundary`;
- hidden X5/X6 harnesses;
- network/content/parser runtime modules;
- any runtime/provider execution function.

Required fail-closed cases:

- X7-V intake is not `intake_ready_not_executable`;
- Query Planning handoff is not `ready_not_executable`;
- Source Acquisition request is not `source_acquisition_ready_not_executable`;
- selected IDs, query counts, or source-language signal are invalid;
- admission authority hash/snapshot is missing, placeholder, stale, or mismatched;
- provider allowlist or budget snapshot is missing, placeholder, stale, or mismatched;
- any execution/runtime/provider/cache/SR/storage/public flag is not false.

## 7. Artifact Sink And Route Rules

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
- no raw provider payload, query text, URL, body, header, secret, source text, cache key, SR field, EvidenceItem, report, verdict, warning, or stack/cause leakage through returned objects, `JSON.stringify(...)`, logs, or errors.

## 8. Boundary Guard Requirements

Boundary guards must prove:

- orchestrator imports only the X7-W admission owner and X7-W artifact sink, not executable runtime/provider modules;
- candidate-runtime admission owner imports no `analyzer-v2-runtime` executable module, provider SDK, search/fetch, network/parser, cache/storage, Source Reliability, public surface, test/mock/fixture, or V1 analyzer code;
- the only allowed `analyzer-v2-runtime` import from the admission owner is the exact candidate-envelope budget/allowlist type/validator subset listed in section 6;
- X7-W artifact sink imports only approved type/source modules and no IO/provider/parser/SR/public/V1 code;
- X7-W route imports only auth, Next response, and the artifact sink;
- no direct fetch, provider SDK, parser, cache/SR/storage, public compatibility, report/export/UI, or V1 analyzer imports are introduced;
- current X7-V guard posture is not broadly relaxed;
- any orchestrator allowance is scoped to X7-W admission only.

## 9. Gate Register And Status Rules

If implementation succeeds:

- update `gate.research_acquisition` audit row to point to X7-W1A as the active product-route candidate-runtime admission anchor;
- narrow the active row's `allowedFiles` to the X7-W1A source envelope plus the exact read-only candidate-envelope budget/allowlist dependency listed in section 6;
- preserve explicit blockers for executable candidate runtime, provider boundary, provider network, source material, EvidenceCorpus, parser, cache/SR/storage, report/verdict, public cutover, live jobs, ACS/direct URL, and V1 cleanup;
- self-test the gate-register validator so it cannot silently drop X7-W1A or those blockers, and so old broad globs or executable runtime/provider/network/content/source-material/EvidenceCorpus paths cannot remain in the active X7-W1A row;
- demote X6 and X7-D language from active forward path to regression/test-only or historical context.

The gate register remains audit-only and grants no runtime authority.

## 10. Explicitly Not Authorized

- `executeSourceAcquisitionCandidateRuntime(...)`;
- any `providerBoundary.acquireCandidates(...)`;
- X6/test-injected candidate harness invocation;
- `buildSourceAcquisitionCandidateNetworkProviderBoundary(...)`;
- `executeSourceAcquisitionNetworkTransport(...)`;
- provider/search/fetch/network execution;
- content dereference, document fetching, parser execution, packet/frame/byte consumption, or 2D-C;
- source material, parsed material, EvidenceCorpus, EvidenceItems, warnings, report, verdict, confidence, truth percentage, or public answer generation;
- cache IO, durable storage, Source Reliability, DB writes;
- public API/UI/report/export/compatibility-view changes;
- prompt/config/schema/model/provider edits;
- live jobs;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 11. Verification Plan

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-admission-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

No live job is required or authorized in X7-W1A. If reviewers want product-route live proof after implementation, create a separate one-job live-smoke package.

## 12. Reviewer Prompt

Review this X7-W1A source package. Return `approve`, `modify`, or `reject`.

Check that it:

- implements only admission authority/snapshot/artifact behavior after X7-V;
- does not call executable candidate runtime, provider boundary, X6 harness, provider network, parser, cache/SR/storage, public output, or V1 code;
- provides enough telemetry to reduce confusion and support the next decision;
- demotes older X6/X7-D forward-path language without broad deletion;
- has a tight file envelope and focused verifier set;
- keeps implementation blocked until source-package review acceptance.

## 13. Review Result

| Role | Decision | Notes |
|---|---|---|
| Senior V2 architect | APPROVE | Correct next slice from X7-W; advances beyond X7-V with product-owned admission authority/snapshot/artifact while stopping before execution. |
| Security/runtime | APPROVE | No remaining blockers; package blocks executable runtime, provider boundary, X6 harness, provider/network/parser/cache/SR/storage/public paths, and live jobs. |
| Lead developer/code review | APPROVE | Initial contract-reuse and gate-register narrowing concerns were resolved. Candidate-envelope reuse is limited to budget/allowlist types and validators; gate-register allowedFiles narrowing and self-test requirements are explicit. |

## 14. Authorization

X7-W1A implementation may proceed inside the approved source envelope only. It remains Position A only and does not authorize executable candidate runtime, provider-boundary invocation, provider network, source material, EvidenceCorpus, parser/cache/SR/storage, public output, live jobs, ACS/direct URL, V1 work, or V1 cleanup.

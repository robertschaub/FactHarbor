# V2 Slice X7-W Hidden Product-Internal Source Acquisition Candidate-Runtime Admission Proposal

**Date:** 2026-05-17
**Status:** proposal package; review required before implementation
**Owner:** Lead Developer / Captain Deputy
**Basis:**
- `Docs/AGENTS/Handoffs/2026-05-17_LLM_Expert_V2_Team_Debate_Consolidated_Direction.md`
- `Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md`
- `Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Result.md`

## 1. Decision

The recommended next development direction is X7-W1A: a reviewed, hidden product-internal Source Acquisition candidate-runtime admission package.

X7-W1A should be the first package that defines how the product V2 route may construct, freeze, validate, and observe candidate-runtime admission for accepted Query Planning output. It must not jump to executable candidate runtime invocation, provider-boundary invocation, broad source execution, content dereference, parser work, EvidenceCorpus, report/verdict generation, public output, or V1 cleanup.

If reviewers want to exercise the existing executable candidate-runtime loop with a closed no-IO provider boundary, that should be a separate X7-W1B package after X7-W1A. X7-W1B must be reviewed separately because `executeSourceAcquisitionCandidateRuntime(...)` calls a provider boundary when invoked.

This X7-W document is only the proposal. It does not authorize implementation by itself.

## 2. Why This Is The Right Next Step

X7-V and X7-V-LS1 established that the product V2 route can carry the hidden Evidence Lifecycle chain through:

```text
Claim Understanding accepted
  -> X7-J intake_ready
  -> X7-O structural prerequisites observed
  -> X7-S Query Planning accepted
  -> X7-V Source Acquisition intake_ready_not_executable
```

Another passive intake marker would add little value. The next useful move is to define the narrow admission boundary for candidate acquisition: how a ready Source Acquisition handoff becomes a product-owned candidate-runtime admission request under explicit runtime authority, budget, provider allowlist, telemetry, and security constraints.

X7-W1A is not another ready marker if it creates the product-owned admission authority/snapshot, records bounded admission telemetry, and demotes the older X6/X7-D harness path from active forward-path status. It still stops before executable candidate-runtime or provider-boundary calls.

## 3. Proposed X7-W1 Package Shape

X7-W1A should implement product-internal candidate-runtime admission only after review. The expected implementation shape is:

1. Product V2 orchestrator reaches X7-W only after X7-V `intake_ready_not_executable`.
2. X7-W reads the same accepted Query Planning handoff and Source Acquisition request already validated by X7-V.
3. X7-W builds a frozen candidate-runtime admission snapshot:
   - candidate run id;
   - accepted handoff identity;
   - source request identity;
   - runtime authority snapshot;
   - provider allowlist snapshot;
   - candidate budget snapshot;
   - public cutover status;
   - ledger id.
4. X7-W invokes exactly one canonical Source Acquisition-specific admission owner. It must not use the generic LLM prompt/model/cache gateway for `research_acquisition`.
5. X7-W returns and records sanitized structural outcomes only:
   - per-query structural outcome;
   - provider attempt id `null`;
   - candidate count `0`;
   - total candidate count `0`;
   - admission duration and stop reason;
   - no raw provider payload;
   - no URL/body/header/secret material;
   - no source text;
   - no EvidenceCorpus or EvidenceItems.

The preferred code direction is to reuse and product-admit the existing candidate runtime contracts under `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.ts` and `source-acquisition-candidate-envelope.ts`, rather than inventing a parallel runtime.

Reusing 7N-3B1 means reusing envelope/decision contracts and validation patterns, not treating the old hidden shell-only approval as product-route authority. X7-W1A must introduce or amend a reviewed X7-W product-owned admission authority before product orchestrator wiring can construct candidate-runtime admission state.

For X7-W1A, "admission" stops before provider-boundary invocation. X7-W1A must not call `executeSourceAcquisitionCandidateRuntime(...)`, any `providerBoundary.acquireCandidates(...)`, the X6/test-injected candidate harness, `buildSourceAcquisitionCandidateNetworkProviderBoundary(...)`, or `executeSourceAcquisitionNetworkTransport(...)`. It may only construct, validate, and freeze the product-owned candidate-runtime admission request, authority, allowlist, budget, and artifact telemetry. X7-W1A outcomes must prove `providerAttemptId: null`, `candidateCount: 0`, `totalCandidateCount: 0`, `providerNetworkExecuted: false`, `candidateAcquisitionExecuted: false`, zero bytes, zero cache/SR/storage, and blocked public cutover.

If a later X7-W1B package is approved, it may explicitly decide whether to call `executeSourceAcquisitionCandidateRuntime(...)` through one new product-admission owner with a closed no-IO provider-boundary posture. X7-W1B must not define parallel candidate-runtime DTOs except a sanitized artifact projection, and it must prove per-query structural outcomes without concrete provider network.

## 4. Provider Boundary Position

X7-W1 must choose one of these two reviewed positions. The recommendation is **Position A** unless Security explicitly approves Position B in the X7-W1 source package.

| Position | Meaning | Recommendation |
|---|---|---|
| A: admission only, no executable runtime/provider invocation | Product route can construct and validate candidate-runtime admission, authority, budget, allowlist, and artifact telemetry, but it must not call the executable candidate runtime, any provider boundary, or the X6/test-injected harness. | Default for X7-W1 if there is no fresh Security approval for runtime/provider IO. |
| B: one concrete candidate provider boundary | A single approved, SDK-free, endpoint-snapshotted provider boundary may run candidate acquisition and return sanitized structural candidates only. | Allowed only if X7-W1 includes a complete SSRF/security matrix, independent endpoint approval, and focused tests. |

Position A is still useful if it retires the old test-only admission path as the active reference and proves product-owned authority/snapshot construction. Position B is more valuable but has higher risk and must not be smuggled into implementation by broad wording.

## 5. Required Authority And Snapshots

X7-W1A must define a thin product-admission authority or wrapper that is frozen per run and must not read mutable config mid-stage. It may validate existing 7N-3B1 candidate-runtime authority shapes, but it must not inherit the old `productRuntime: false` shell-only approval as product-route authority.

Required snapshots:

- parent Source Acquisition runtime authority snapshot;
- X7-W product-admission authority snapshot;
- candidate runtime authority validation snapshot;
- provider allowlist;
- candidate budget;
- source-language policy from Query Planning handoff;
- no-cache/no-storage posture;
- public cutover status;
- approval package pointer and commit hash.

The authority must fail closed when any hash or identity does not match the accepted handoff/source-request identity.

## 6. Security Matrix Required For Position B

Position B is not approved by this proposal. If X7-W1 proposes concrete provider-network execution, the source package must either reuse only the already-approved 7N-3B2 SDK-free Node-core provider-network boundary, or prove an explicit superset of every 7N-3B2 provider-network control and test. The package must enumerate exact files/imports/exports, endpoint snapshot schema, boundary-guard coverage, leakage tests, default-closed activation proof, and rollback before any source edit.

At minimum, Position B requires explicit tests or mechanical checks for:

| Area | Required posture |
|---|---|
| DNS | resolution required; private, link-local, loopback, multicast, unspecified, and metadata ranges blocked |
| Address forms | IPv4, IPv6, mapped IPv6, reserved, metadata, IDNA, and trailing-dot host handling covered |
| Final address | final socket/connect target must match validated public address; DNS rebinding must not bypass validation |
| Protocol | `https` only |
| Redirects | denied by default |
| Proxy | no implicit proxy, proxy-env bypass, or env-proxy leakage |
| Headers | fixed allowlist; no secret echo |
| Request parameters | only Query Planning text/policy fields; no direct URL or ACS input |
| Timeout | per-query and total timeout enforced |
| Abort/cancel | cancellation maps to structural outcome, not success |
| Byte caps | compressed, decompressed, and total caps enforced |
| Compression | explicitly `identity_only` or bounded `gzip_allowed` |
| Content type | allowed JSON content type only |
| Parsing | JSON provider response parsing only for candidate metadata; no document parser, no real fetched-byte parser path |
| Leak tests | `JSON.stringify(...)`, `console.*`, thrown errors, and returned diagnostics cannot expose raw payload, request URL, query string, header, body, secret, source text, stack/cause, or content text |
| Telemetry | sanitized counts/statuses only; no raw payload, error trace, URL with query string, secret, body, header, or content text |
| Activation | default-closed authority, rollback path, and process-gate proof required |

## 7. Cost And Quality Telemetry

X7-W1 should record enough telemetry to make the next cost-quality decision evidence-based:

- query count;
- admitted query count;
- provider attempt count, which must be `0` for X7-W1A;
- candidate count, which must be `0` for X7-W1A;
- timeout count;
- failure count by structural reason;
- duration per query and total duration;
- byte counts if Position B is approved; X7-W1A must record zero bytes;
- no cache read/write;
- no Source Reliability;
- no evidence/report/verdict output.

Candidate acquisition success is not evidence quality. It only means the system found candidate locators under a structural provider boundary.

## 8. Retirement / Consolidation Target

X7-W1 must reduce confusion rather than add another permanent branch.

If X7-W1A is implemented and passes review:

- `X6` hidden direct-text candidate-acquisition harness should be demoted to regression/test-only reference for candidate runtime behavior.
- `X7-D` hidden source-acquisition readiness composition should stop being described as the active forward path for product Source Acquisition.
- X7-W artifacts should become the active product-route source-acquisition candidate-runtime admission proof surface.

Do not remove code in X7-W1A unless the package explicitly includes that cleanup and focused tests. The first step is status/backlog/handoff demotion, gate-register wording, and source-package constraints, not broad deletion.

## 9. Explicit Non-Goals

X7-W1 must not authorize:

- EvidenceCorpus creation;
- source material or parsed material creation;
- content dereference or document fetching;
- parser execution, packet/frame consumption, or 2D-C;
- Source Reliability calls;
- cache read/write or durable storage;
- report, warning, verdict, confidence, truth percentage, or public answer generation;
- public API/UI/report/export exposure;
- prompt/config/schema/model/provider broad edits;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup;
- executable candidate-runtime invocation unless separately packaged as X7-W1B or Position B;
- additional live jobs unless separately packaged after implementation.

## 10. Maximum X7-W1A File Envelope

The X7-W1A source package must not exceed this envelope unless reviewers explicitly modify the package:

- product V2 orchestrator wiring after X7-V, scoped only to the new X7-W admission owner;
- a small X7-W admission owner under `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/`;
- a runtime artifact sink and internal admin-only route under `analyzer-v2-runtime` / `app/api/internal/analyzer-v2`;
- focused tests for admission, artifact route, orchestrator, and boundary guards;
- `Docs/AGENTS/V2_Gate_Register.json` and `scripts/validate-v2-gate-register.mjs` if X7-W1A supersedes X7-V as the active `research_acquisition` audit row or demotes X6/X7-D from active forward-path status;
- status/backlog/handoff/index updates.

It should not edit prompts, model policy, cache policy, public compatibility projections, report/export/UI, V1 analyzer files, parser files, Source Reliability files, or API persistence.

Boundary guards must add only a scoped X7-W admission allowance. They must not broadly relax the current source-acquisition execution guard, provider-network guard, parser guard, cache/SR/storage guard, public-surface guard, or V1 clean-room guard.

Any X7-W artifact sink/route must be process-local, bounded, non-durable, authenticated with `FH_ADMIN_KEY`, `no-store` on success/auth failure/validation failure/not-found, single-ledger read only, no listing/prefix/enumeration, no public compatibility projection, and no raw provider payload, query text, URL, body, header, secret, source text, cache key, SR field, EvidenceItem, report, verdict, warning, or stack/cause leakage through returned objects, `JSON.stringify(...)`, logs, or errors.

## 11. Reviewer Prompt

Review the X7-W proposal as the next V2 Source Acquisition direction. Decide `approve`, `modify`, or `reject`.

Check whether it:

- advances beyond passive intake through product-owned admission authority/snapshots without over-broad source execution;
- uses one Source Acquisition-specific admission path instead of generic LLM gateway mechanics;
- keeps public V2 fail-closed;
- defines authority, budget, allowlist, telemetry, and security constraints clearly;
- avoids source material, EvidenceCorpus, parser, cache/SR, report/verdict, ACS/direct URL, and V1 work;
- names a realistic retirement/demotion target for accumulated guard/harness complexity;
- leaves implementation blocked until an X7-W1A source package is reviewed.

## 12. Review Result

The amended proposal was reviewed after the X7-W1A/X7-W1B split:

| Role | Decision | Notes |
|---|---|---|
| Senior V2 architect | APPROVE | Position A now stops before runtime/provider-boundary calls; 7N-3B1 reuse is contract/validation only; gate-register updates are included when superseding/demoting. |
| Security/runtime | APPROVE | No remaining blockers after explicit no-execution, 7N-3B2-grade Position B controls, and non-public artifact-route contract. |
| Lead developer/code review | APPROVE | X7-W1A admission-only is clear; X7-W1B closed-runtime exercise is correctly separate; file envelope and boundary-guard allowance are scoped. |

## 13. Recommendation

Proceed to reviewer acceptance of this proposal. If accepted, implement **X7-W1A Position A** first unless Security explicitly approves Position B in the source package.

Do not implement executable candidate-runtime invocation, concrete provider-network execution, live jobs, source material, EvidenceCorpus, parser work, public exposure, or V1 cleanup from this proposal alone.

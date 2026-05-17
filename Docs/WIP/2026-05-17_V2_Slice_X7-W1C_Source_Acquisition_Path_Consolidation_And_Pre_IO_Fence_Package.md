# V2 Slice X7-W1C Source Acquisition Path Consolidation And Pre-IO Fence Package

**Date:** 2026-05-17
**Status:** source package for review; implementation blocked until reviewer acceptance
**Owner:** Lead Developer / Captain Deputy
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1B_Product_Internal_Closed_Candidate_Runtime_Loop_Source_Package.md`
**Baseline:** `08842cf4` (`feat: add v2 x7w1b closed candidate loop`)

## 1. Purpose

X7-W1B proved that the product V2 route can enter the existing candidate runtime through a product-owned closed local no-IO provider boundary while producing zero candidates, zero bytes, no source material, and no public output.

X7-W1C must prevent the next step from accidentally becoming real Source Acquisition execution. It should consolidate the active Source Acquisition path and document a pre-IO fence for a later W2 provider-network package.

X7-W1C is **docs/register/boundary-guard only**. It is not an additional product-runtime stage and does not add an owner, artifact sink, route, or runtime decision.

## 2. Approved Position

The active product-route Source Acquisition forward path is:

```text
accepted Claim Understanding
  -> accepted hidden Query Planning
  -> X7-V intake_ready_not_executable
  -> X7-W1A admission_ready_no_runtime_execution
  -> X7-W1B closed_loop_completed_no_source_candidates
```

X7-W1B remains the latest completed product-route runtime proof and prerequisite for any later provider-network package.

X7-W1C is the active **audit/governance fence** for the next step:

```text
X7-W1C = pre_io_fence_documented_no_execution
```

This means the no-IO fence and W2 review checklist are documented and guarded. It does **not** mean W2 provider/network execution is approved, runnable, or live-job eligible.

X6, X7-D, X7-E, X7-F, X7-G1, X7-G2, `7N-3B3-2D-B2`, `7N-3B3-2D-B3`, `C0-S1`, `C0-S2`, and `C0-S3` remain valuable regression and historical guard context. They must not be presented as the active forward product route after X7-W1B.

## 3. Implementation Objective

If reviewers approve implementation, X7-W1C may:

1. Update gate-register/status wording so X7-W1B is the current active product-route Source Acquisition endpoint and X7-W1C is the docs/register/guard pre-IO fence for W2.
2. Add or tighten boundary guards preventing product/orchestrator paths from importing or presenting X6/X7-D/X7-E/X7-F/X7-G1/X7-G2/parser adjuncts as active forward execution paths.
3. Define the later W2 provider-network authority checklist without implementing W2.
4. Add validator self-tests proving old active-route references, broad globs, real-IO files, provider-network files, content files, parser files, source-material files, public files, and live-job unlocks cannot enter the active `research_acquisition` row.

No runtime owner, artifact sink, inspection route, product execution call, live smoke, or source IO is authorized in X7-W1C.

## 4. Proposed Source Envelope

Implementation must stay inside this envelope unless reviewers modify this package:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- completion handoff and generated handoff index.

No `apps/web/src` production code, prompt, model policy, cache policy, UCM/default config, provider factory, network transport, content transport, parser, Source Reliability, public compatibility/API/UI/report/export, V1 analyzer, API persistence, package, lockfile, or live-job file edits are authorized.

## 5. Gate Register Contract

If implemented, the `gate.research_acquisition` row should make three states distinct:

- latest product-route runtime proof: `X7-W1B closed_loop_completed_no_source_candidates`;
- current audit/governance fence: `X7-W1C pre_io_fence_documented_no_execution`;
- future W2 review readiness: checklist-only and not execution authority.

Suggested non-runtime fields/wording:

- `sliceId`: `X7-W1C`;
- `state` / `status`: `pre_io_fence_documented_no_execution`;
- `sourcePackage`: this X7-W1C package;
- `approvalPointer`: reviewer-approved docs/register/boundary-guard fence only;
- `liveJobEligibility`: `blocked`;
- `liveJobBlockReason`: W1C does not approve live jobs, W2 provider/network execution, or real source IO;
- notes must say W1B remains the latest product-route runtime proof.

Suggested W2 review-readiness wording inside notes:

```text
w2ReviewReadiness: blocked_missing_w2_package
```

Allowed future values for docs/register wording only:

- `blocked_missing_w2_package`;
- `blocked_missing_controls`;
- `ready_for_review_only_not_execution`.

`ready_for_review_only_not_execution` must not be used as runtime authority, gateway approval, live-job approval, provider/network approval, or public cutover approval.

The gate register remains audit-only and grants no runtime authority.

## 6. W2 Provider-Network Checklist Defined By W1C

X7-W1C should define the checklist that a later W2 package must satisfy before any real provider/network/source IO is implemented:

- product-owned W2 authority snapshot, independent of environment variables and not derived from provider input;
- exact 7N-3B2 authority/factory/transport source package references and approval pointers;
- endpoint snapshot hash and endpoint allowlist provenance;
- credential-state posture without exposing secrets;
- DNS/final-address/SSRF policy;
- proxy denial;
- redirect policy exactly `deny`; any redirect-follow, redirect cap, or cross-host redirect behavior remains unauthorized unless a later W2+ package explicitly reopens it after Security/runtime review, and W1C treats non-deny redirect posture as W2 readiness blocked;
- request timeout and cancellation policy;
- total budget and per-query/provider budget;
- response byte cap and decompression cap;
- provider-result structural schema and zero-raw-payload artifact rule;
- no source material creation from candidates;
- candidate-to-source-material gate remains closed;
- parser/2D-C remains blocked;
- cache/SR/storage remain blocked;
- public cutover remains blocked;
- live smoke requires a separate package after implementation.

W1C may name reviewed 7N-3B2 package references as inert structural constants in register/docs/tests only. W1C must not import any `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-*` module. W2 is the first package that may request imports from `source-acquisition-network-authority`, `source-acquisition-network-envelope`, `source-acquisition-network-factory`, or `source-acquisition-network-transport`, and only after separate review.

## 7. Active-Path Consolidation Rules

W1C should clarify in docs/register/guards:

- X7-V -> X7-W1A -> X7-W1B is the active product Source Acquisition path.
- X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 and parser adjuncts remain regression/historical context unless a later package explicitly reuses them.
- Product orchestrator must not import X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 forward harnesses.
- Gate-register validator must fail if the active `research_acquisition` row points back to X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 or parser adjuncts as the current active path.
- Boundary guards must fail if product/public surfaces route through old harnesses as active forward path.

Do not delete old harness code in X7-W1C. Retaining tests for invariants is useful; presenting old harnesses as current route is not.

## 8. Boundary Guard Requirements

Boundary guards must prove:

- no X7-W1C runtime owner, artifact sink, or route exists;
- orchestrator imports do not add a W1C runtime owner or W1C artifact sink;
- product/orchestrator paths do not import X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 forward harnesses as active Source Acquisition path;
- product/public surfaces still cannot reach provider-network/content/parser/source-material/EvidenceCorpus/report/verdict/public execution modules;
- product/public surfaces still cannot import `source-acquisition-network-*` modules;
- no logging import/call is introduced for W1C;
- any future W2 markers remain checklist-only and cannot unlock execution.

Because W1C has no runtime decision, artifact, route, or log surface, poison runtime leakage tests are not applicable in W1C. If reviewers reintroduce any W1C runtime surface, the package must require poison tests for `queryId`, `queryText`, source-language rationale, provider attempt id, URL-like text, header/body-like text, cache/SR markers, secret-like sentinels, `JSON.stringify(...)`, route JSON, generic error paths, and logs before approval.

## 9. Validator And Status Requirements

If implementation succeeds:

- keep `gate.research_acquisition` audit-only and non-executable;
- represent X7-W1C as `pre_io_fence_documented_no_execution`, not source execution;
- keep live jobs blocked;
- keep `research_acquisition` gateway policy `notImplemented`;
- preserve X7-W1B as the latest product-route runtime proof;
- preserve explicit blockers for real provider/network/source IO, source material, EvidenceCorpus, parser/2D-C, cache/SR/storage, report/verdict/warning/confidence, public cutover, ACS/direct URL, V1 reuse, V1 cleanup, and live jobs;
- self-test that broad globs, provider-network files, content files, source-material files, parser files, cache/SR/storage files, EvidenceCorpus files, report/verdict/public files, live-job unlocks, W2 execution approval, and X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 active-route references cannot be added to the active row.

## 10. Explicitly Not Authorized

- real provider/search/fetch/network execution;
- 7N-3B2 provider network factory/transport invocation;
- any `source-acquisition-network-*` import in X7-W1C;
- URL construction or dereference;
- content dereference, document fetching, parser execution, packet/frame/byte consumption, or 2D-C;
- non-zero candidates or source material;
- parsed material, EvidenceCorpus, EvidenceItems, warnings, report, verdict, confidence, truth percentage, or public answer generation;
- cache IO, durable storage, Source Reliability, DB writes;
- public API/UI/report/export/compatibility-view changes;
- prompt/config/schema/model/provider edits;
- live jobs;
- ACS/direct URL execution;
- deleting old harnesses without an explicit deletion/retirement package;
- V1 reuse, V1 work, or V1 cleanup.

## 11. Required Verifier Set

Before completion, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

Run `npm run index` after handoff/status updates.

Do not run live jobs or expensive LLM tests for X7-W1C.

## 12. Review Questions

1. Is docs/register/boundary-guard-only W1C the right next step before W2 provider-network execution?
2. Should W1C update the active `gate.research_acquisition` row to `X7-W1C`, or keep the row at X7-W1B and document W1C only in notes?
3. Is the W2 checklist complete enough, or should any item be added before W2 package drafting?
4. Are the old-path guard requirements specific enough without deleting old harnesses?
5. Is there any value in a separate one-job W1B live smoke before W2, given W1B has no real IO?

## 13. Review Result

Approved after review by Lead Architect, Security/runtime, and Code Reviewer agents on 2026-05-17.

Consolidated review outcome:

- W1C is docs/register/boundary-guard-only.
- No W1C runtime owner, artifact sink, route, or live smoke is authorized.
- Active product Source Acquisition path stops at X7-W1B.
- W1C may update `gate.research_acquisition` to `X7-W1C` / `pre_io_fence_documented_no_execution` only if notes preserve X7-W1B as the latest product-route runtime proof.
- W2 provider/network execution remains a separate later package.
- Redirect posture remains exactly `deny`.
- `source-acquisition-network-*` imports are forbidden in W1C.

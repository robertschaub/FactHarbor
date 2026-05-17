# V2 Slice X7-V Product-Internal Source Acquisition Intake Boundary Source Package

**Date:** 2026-05-17
**Status:** implementation package
**Owner:** Lead Developer / Captain Deputy
**Trigger:** X7-U4 completed; X7-U3 proved hidden Query Planning can emit accepted bounded query plans with Source Acquisition handoff `ready_not_executable`.

## 1. Purpose

X7-V advances the product-internal Evidence Lifecycle chain by proving that Source Acquisition can receive the accepted Query Planning handoff and the existing Source Acquisition request as a structural intake boundary, while still remaining non-executable.

This package deliberately stops before the structural executor, provider/network/source execution, content dereference, parser work, Source Reliability, cache IO, source material, EvidenceCorpus, report, verdict, public output, ACS/direct URL, and V1 cleanup.

## 2. Review Consolidation

Claude Opus 4.6 recommended a hidden no-IO structural Source Acquisition step with an inert port. Security/runtime recommended an even narrower pre-execution/intake boundary before anything named execution. Architect and LLM reviewers agreed that no prompt change is needed after X7-U3/X7-U4 and that the next Source Acquisition step must be no-IO and admin-only.

Consolidated decision: implement the stricter X7-V intake boundary first. It consumes the existing ready Query Planning handoff and the existing Source Acquisition request, records a bounded internal artifact, and keeps all execution flags false. The structural executor/inert-port proposal remains a later reviewed package.

## 3. Approved Source Envelope

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.ts`
- focused tests under:
  - `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.test.ts`
  - `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
  - `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- status, backlog, Agent_Outputs, completion handoff, and generated handoff index.

## 4. Explicitly Not Authorized

- prompt, schema, model, provider, adapter, or config changes;
- Source Acquisition structural executor invocation;
- provider/search/fetch/network execution;
- content dereference, packet/frame consumption, parser execution, parsed material, or 2D-C;
- source material, extraction input, EvidenceCorpus, evidence item, sufficiency, warning, report, verdict, truth, or confidence generation;
- cache IO, durable storage, Source Reliability, DB writes;
- public API/UI/report/export/compatibility-view changes;
- live jobs inside this source package;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 5. Expected Behavior

- Accepted Query Planning handoff plus ready Source Acquisition request returns `intake_ready_not_executable`.
- Blocked or malformed handoff/request returns `blocked_pre_source_acquisition`.
- The artifact route is internal admin-only, no-store, bounded by ledger id, and has no listing/enumeration behavior.
- The public V2 envelope remains `4.0.0-cb-precutover` with `blocked_precutover` and no hidden marker leakage.
- All Source Acquisition execution flags remain false.

## 6. Verification Plan

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

No live job is required in X7-V. If reviewers want product-route runtime proof after commit, create a separate one-job live-smoke package that only checks hidden intake reachability and public non-leak.

# Lead Developer Handoff - V2 X7-W4-F Product-Route Observability Implementation

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Model:** Codex (GPT-5.5)
**Status:** Implementation verified; canary-ready only after separate Steering authorization
**Source package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-F_Product_Route_Observability_Canary_Package.md`
**Package base commit:** `1035975d docs: prepare v2 w4f observability canary package`

## Summary

Implemented W4-F product-route observability only. The V2 product orchestrator now records one bounded hidden/admin-only chain artifact after the existing W3-B/W4-A path has enough state to derive W4-C corpus admission, W4-D shell-only EvidenceCorpus, and W4-E extraction-readiness denial. The artifact is exposed only through an authenticated internal no-store route.

Public V2 output remains `4.0.0-cb-precutover` / `blocked_precutover`. No canary was run.

## Implemented Behavior

- Added a bounded in-memory W4-F artifact sink for sanitized exact projections of:
  - W4-C `EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision`
  - W4-D `EvidenceLifecycleEvidenceCorpusShellDecision`
  - W4-E `EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision`
- Added an authenticated internal no-store route:
  - `GET /api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts?ledgerId=...`
- Wired the V2 orchestrator hidden path to build W4-C, W4-D, and W4-E decisions after the existing W4-A readiness artifact and record the combined observability artifact.
- Added focused tests for sink bounding, defensive copying, route authentication/no-store behavior, 404 no-echo behavior, orchestrator reachability, and leak/containment guards.
- Amended the aggregate runtime product-import boundary guard with explicit W4-F allowlist entries only.

## Files Changed

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Verifiers

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - 4 files, 92 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - 58 files, 297 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - 111 files, 694 tests passed.
- `npm -w apps/web run build`
  - Next.js build passed; postbuild prompt/config reseed changed no configs or prompts.
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `git diff --check`

## Failed-Attempt Recovery

The first focused W4-F verifier failed only in an existing aggregate boundary guard: the new W4-F route/orchestrator imports were already covered by the slice-specific W4-F guard but were not listed in the older runtime-product allowlist.

Debt-guard classification: `keep` the implementation and amend the existing guard mechanism. The final fix added explicit W4-F allowlist entries instead of broadening the guard, weakening containment, or reverting the approved W4-F imports.

## Stop Conditions Checked

Not touched:

- source text authorization
- raw provider payloads
- raw URLs/titles/page keys
- extraction input
- EvidenceItems
- parser output or parser execution
- report/verdict/warning/confidence data
- public compatibility fields or public behavior
- cache/SR/storage behavior
- retries
- provider expansion
- W2 endpoint migration
- ACS/direct URL behavior
- V1 work or V1 cleanup
- live jobs

## Canary Readiness

W4-F is locally verifier-clean and canary-ready only after Steering explicitly authorizes the single proposed product-route canary. Before that canary, refresh runtime from the committed W4-F implementation, confirm route/runtime preflight, and keep the worktree provenance clean.

The remaining live-job tranche is still `4` because no W4-F canary was run.

## Warnings

- The artifact route is internal/admin-only and no-store; it is not a public surface and must not be linked into UI/report/export paths.
- W4-F proves product-route observability of W4-C/W4-D/W4-E denial/shell state only. It does not authorize source text, positive extraction readiness, EvidenceItems, parser work, report/verdict/warning/confidence generation, public cutover, cache/SR/storage, retries, provider expansion, or V1 cleanup.

## Learnings

The right next proof after W4-D/W4-E is a single combined chain artifact, not three new route families or positive source-text authorization. This keeps reachability observable while preserving the closed extraction boundary.

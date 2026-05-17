# Lead Architect Handoff: V2 X7-O Query Planning Pre-Execution Observation Implementation

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-O Query Planning Pre-Execution Observation Implementation

**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-O_Product_Internal_Query_Planning_Preexecution_Observation_Artifact_Source_Package.md`
**Baseline before implementation:** `a24c10f0` (`docs: approve v2 x7o query planning observation`)
**Result:** implementation-complete; focused and broader local verifiers passed; no live jobs

## Summary

X7-O is implemented inside the reviewed source envelope. Product V2 now builds a sanitized Query Planning pre-execution structural observation after the existing X7-J Evidence Lifecycle intake decision, records it in a bounded process-local admin-only artifact sink, and exposes it only through an authenticated internal no-store route.

The public V2 result remains damaged/precutover and does not expose X7-O artifact body, ledger id, run id, observation state, hidden hashes, prompt/model/provider payloads, source/retrieval/parser fields, or new public result fields.

## Files Touched

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-17_V2_Slice_X7-O_Product_Internal_Query_Planning_Preexecution_Observation_Artifact_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Behavior

- `buildEvidenceQueryPlanningPreexecutionObservation(...)` consumes only the X7-J `EvidenceLifecycleStartDecision`.
- Accepted direct-text intake yields `structural_prerequisites_observed_not_executed_precutover` with all execution flags false.
- Blocked/missing/invalid/non-direct-text/invalid-selection/missing-language states yield `blocked_pre_query_planning`.
- The artifact sink stores only allow-listed structural projection fields and enforces per-ledger, global-ledger, serialized-size, and ledger-id bounds.
- The internal route requires configured admin authentication, rejects malformed/duplicate/enumerating query shapes, returns `Cache-Control: no-store`, and does not echo unknown ledger ids.
- Orchestrator artifact writes are best-effort and isolated from public damaged/precutover envelope generation.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` — 5 files / 97 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` — 36 files / 214 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` — 76 files / 539 tests.
- `npm -w apps/web run build`.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `git diff --check`.

The first focused verifier run failed only because new negative assertions matched approved structural field names (`queryPlanning...`, `providerCallbackCreated`). Debt-guard classified that as failed-attempt recovery with an overbroad test/guard assertion mechanism; the fix amended assertions in place and left implementation unchanged.

## Still Blocked

- Query Planning runtime execution.
- Query Planning input-envelope, prompt-packet, hash, prompt/model/cache provenance, or query-plan inspection construction.
- Prompt rendering, model calls, provider callbacks, provider SDK imports.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution.
- Source material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public output.
- Cache IO, durable storage, Source Reliability, ACS/direct URL execution.
- Prompt/frontmatter/config/model/schema edits.
- Gateway/model/cache approval flips.
- Live jobs, validation batches, B3 proof, 2D-C, V1 reuse, V1 work, and V1 cleanup.

## Debt-Guard Result

**Classification:** failed-attempt recovery; incomplete test/guard mechanism.
**Chosen option:** amend overbroad assertions in place.
**Rejected path and why:** source changes or added filtering were rejected because verifier evidence showed the implementation was behaving as designed and only substring assertions were too broad.
**What was removed/simplified:** no production code removed; assertions were narrowed from broad substrings to specific forbidden execution-preparation terms.
**What was added:** no new mechanism beyond the approved X7-O implementation and tests.
**Net mechanism count:** unchanged after recovery; X7-O itself is the approved new artifact mechanism.
**Budget reconciliation:** touched files stayed inside the X7-O approved source/test/status/handoff/index envelope.
**Verification:** focused verifier passed after the assertion amendment; broader verifier/build/gate set passed.
**Debt accepted and removal trigger:** none.
**Residual debt:** none for X7-O; any Query Planning execution, live smoke, or source/provider/parser continuation needs a separate reviewed package.

## For Next Agent

Treat X7-O as implementation-complete but non-authorizing. Do not run live jobs for X7-O and do not infer Query Planning execution readiness from the structural observation. The next implementation step must start from a separate reviewed source or execution package if it would execute Query Planning, construct input envelopes/prompt packets/hashes, wire product/public behavior, touch source/provider/parser paths, or run live jobs.

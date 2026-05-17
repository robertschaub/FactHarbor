# Lead Developer Handoff: V2 X7-O Ledger-Bound Hardening

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-O Ledger-Bound Hardening

**Baseline before hardening:** `264c2173` (`feat: add v2 x7o query planning observation`)
**Trigger:** post-implementation code/package review found that the sink declared a maximum ledger-id length but only the internal route enforced ledger-id shape.
**Result:** review-fix complete; local verifiers passed; no live jobs

## Summary

The X7-O artifact sink now enforces ledger-id validity at the sink boundary itself. Blank, whitespace-padded, and overlong ledger ids are rejected before artifact construction, storage, read, or clear. The authenticated internal route still keeps its own request-shape validation, but it is no longer the only guard protecting process-local ledgers.

This is a hardening-only patch. It does not change public output, orchestration behavior, Query Planning readiness semantics, gateway approvals, prompt/model/cache policy, source acquisition, parser behavior, or live-job eligibility.

## Files Touched

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-O_Ledger_Bound_Hardening.md`
- `Docs/AGENTS/index/handoff-index.json`

## Behavior

- `recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact(...)` returns `skipped_invalid_ledger_id` with `artifact: null` when the ledger id is blank, trim-variant, or longer than `EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_ID_LENGTH`.
- `readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(...)` returns an empty list for invalid ledger ids.
- `clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(...)` no-ops for invalid ledger ids.
- Existing serialized-artifact-size checks remain separate and still cover large valid-ledger artifacts.

## Verification

Passed after the hardening fix:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - 2 files / 76 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` - 36 files / 215 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - 76 files / 540 tests.
- `npm -w apps/web run build`.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.

One first focused attempt failed because the existing oversize-artifact test used an overlong ledger id; after the sink fix, that correctly hit `skipped_invalid_ledger_id` before the serialized-size branch. Debt-guard classification: `keep` the sink hardening, amend the test to exercise oversize content through a valid ledger id, and add a separate invalid-ledger test.

## Still Blocked

- Query Planning runtime execution.
- Query Planning input-envelope, prompt-packet, hash construction, prompt rendering, model/provider calls, or provider callbacks.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution.
- Source material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public output changes.
- Cache IO, durable storage, Source Reliability, ACS/direct URL execution.
- Prompt/frontmatter/config/model/schema edits.
- Gateway/model/cache approval flips.
- Live jobs, validation batches, B3 proof, 2D-C, V1 reuse, V1 work, and V1 cleanup.

## Warnings

X7-O remains implementation-complete but non-authorizing. A live smoke must use a separate reviewed execution package, a committed clean state, runtime refresh, admin-route preflight, and explicit post-run hidden/public artifact inspection.

## Learnings

When a hidden runtime artifact sink exports a bound constant, enforce it at the sink API, not only at an HTTP route. Route validation protects public/internal HTTP callers; sink validation protects future in-process callers and tests from bypassing the invariant.

## For Next Agent

Do not treat this hardening as a live-job or Query Planning execution approval. The next low-risk continuation is a separate X7-O live-smoke execution package that proves the new admin-only observation appears for one Captain-approved direct-text job while public V2 output remains damaged/precutover and hidden artifact markers do not leak.

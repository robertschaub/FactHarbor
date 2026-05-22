# V2 HighJump HJ8 Internal Alpha Report Draft Result

**Date:** 2026-05-22
**Status:** Completed live-result record
**Owner:** Captain Deputy / Lead Developer
**Input:** `Using hydrogen for cars is more efficient than using electricity`

## Decision Record

HJ8 is classified as:

`PASS_X7_HJ8_INTERNAL_ALPHA_REPORT_DRAFT_CREATED`

This is the first HighJump canary where the hidden V2 product route reached a
human-readable internal Alpha report draft over live W7-B boundary/verdict
candidate output. It is not public report readiness and it is not a cutover
signal.

## Canary Attempts

Initial W8-G canary:

- Job id: `17e3f40dda2f42749e5528742a497731`
- Runtime commit: `1fe6d3f63d7bec5856df896c1167ef0a693105c5`
- Classification:
  `STOP_X7_HJ8_W8G_BLOCKED_BY_W7B_RUNTIME_OWNERSHIP_ALLOWLIST_DRIFT`
- Result: public V2 stayed pre-cutover/damaged and no public/default-admin
  draft leak was found, but W8-B blocked with
  `boundary_verdict_execution_not_runtime_owned`.
- Root cause: W8-G added `BoundaryVerdictExecutionDecision.internalReviewPayload`,
  but the W7-B runtime-ownership exact-key guard had not added that key.

Repair:

- Commit: `955c65917fe55f300762004473f72e1996307daf`
- Repair type: amend existing ownership guard and tests; no bypass, no public
  surface, no prompt/model/config/schema change.
- Claude Opus 4.6 review: `approve`, no blockers.
- Gemini review: degraded; `GOOGLE_GENERATIVE_AI_API_KEY` was unavailable.

Repaired canary:

- Job id: `80e156a93d8442169166ec8b1a951231`
- Runtime commit: `955c65917fe55f300762004473f72e1996307daf`
- Job status: `SUCCEEDED`
- Public status: `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`

## Hidden Chain Evidence

Key repaired-canary results:

| Stage | Status |
|---|---|
| W8-B | `internal_alpha_report_result_candidate_created` |
| W8-B stop | `firstIncompleteStage = none`; no blocked/damaged reason |
| W7-B ownership seen by W8-B | `owned` |
| W8-B counts | `3` boundary candidates, `2` verdict candidates, `3` cited EvidenceItem refs |
| W8-G | `internal_alpha_report_draft_created` |
| W8-G draft | `5420` bytes, hash `133dc856364fa08caddd27daf5a6b8fc2a85eeab5b82ae7e3d2c76244acb9005` |
| W8-G counts | `3` boundary drafts, `2` verdict drafts, `3` cited EvidenceItem refs |

W7-B provider/cost telemetry in the repaired canary:

- Provider: `anthropic`
- Model: `claude-haiku-4-5-20251001`
- Total tokens: `7213`
- Duration: `15918ms`

## Route And Leak Checks

- W8-B default route: `200`, `Cache-Control: no-store`
- W8-G default route: `200`, `Cache-Control: no-store`,
  `draftMarkdownReturned = false`
- W8-G inspection route: `200`, `Cache-Control: no-store`,
  `draftMarkdownReturned = true`
- W8-G unauthenticated route: `401`, `Cache-Control: no-store`
- Public leak markers found: none
- Default-admin W8-G draft/verdict/EvidenceItem markers found: none
- Inspection projection contained the expected internal draft heading.

Captured artifacts are under:

`test-output/v2-highjump-w8g-repair-80e156a93d8442169166ec8b1a951231`

## Verification

Before repair commit:

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-draft.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

All listed verifiers passed after the repair. `npm run debt:sensors` remained
`advisory_warn` for existing V2/source/test/docs footprint warnings.

## Debt-Guard Result

Classification: failed-validation recovery / incomplete existing mechanism.

Chosen option: amend the existing W7-B runtime ownership guard by adding the
new `internalReviewPayload` decision key and by requiring
`redaction.internalReviewPayloadReturnedByDefault === false`.

Rejected path: bypassing runtime ownership, weakening exact-key inspection, or
adding a new W8-B exception path.

Net mechanism count: unchanged.

Debt accepted: none beyond the already-documented temporary W8-G hidden
inspection route, which keeps its merge trigger into a stable report writer.

## Live-Job Budget

The HighJump tranche started with `12` jobs.

- HJ2 through HJ7 consumed `6`.
- Initial HJ8 W8-G canary consumed `1`.
- Repaired HJ8 W8-G canary consumed `1`.

Current remaining HighJump live-job budget: `4`.

## Interpretation

HJ8 proves that live W7-B boundary/verdict candidate output can now be retained
as an internal review payload, accepted by W8-B as runtime-owned, and projected
into a hidden/internal Alpha report draft without public leakage.

The next work should inspect report quality and close the shortest path toward
a first useful internal full report, not add another readiness layer. Public V2
must remain blocked until report quality, warning/truth/confidence behavior, and
compatibility/public projection are separately approved.

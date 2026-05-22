# Captain Deputy Handoff - V2 HighJump HJ8 Internal Alpha Report Draft Result

### 2026-05-22 | Captain Deputy / Lead Developer | Codex (GPT-5.5) | V2 HighJump HJ8 Result

**Task:** Close W8-G canary provenance, repair the failed ownership stop, rerun
exactly one canary, and preserve next-agent context without opening a new
package.

**Current HEAD before docs closeout:** `955c65917fe55f300762004473f72e1996307daf`

## Result

HJ8 is classified:

`PASS_X7_HJ8_INTERNAL_ALPHA_REPORT_DRAFT_CREATED`

The repaired canary job `80e156a93d8442169166ec8b1a951231` ran on runtime
`955c65917fe55f300762004473f72e1996307daf`. Public V2 stayed
`4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

The hidden chain reached:

- W8-B: `internal_alpha_report_result_candidate_created`
- W8-B stop attribution: `firstIncompleteStage = none`
- W7-B runtime ownership as seen by W8-B: `owned`
- W8-B counts: `3` boundary candidates, `2` verdict candidates, `3` cited
  EvidenceItem refs
- W8-G: `internal_alpha_report_draft_created`
- W8-G draft: `5420` bytes, hash
  `133dc856364fa08caddd27daf5a6b8fc2a85eeab5b82ae7e3d2c76244acb9005`

## Failed First HJ8 Attempt

Initial job `17e3f40dda2f42749e5528742a497731` ran on runtime
`1fe6d3f63d7bec5856df896c1167ef0a693105c5` and is classified:

`STOP_X7_HJ8_W8G_BLOCKED_BY_W7B_RUNTIME_OWNERSHIP_ALLOWLIST_DRIFT`

Root cause: W8-G added `BoundaryVerdictExecutionDecision.internalReviewPayload`,
but the W7-B runtime ownership exact-key guard did not include the new key, so
W8-B treated the live W7-B decision as `not_owned`.

## Repair

Repair commit: `955c65917fe55f300762004473f72e1996307daf`.

Files changed:

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts`

The fix amends the existing ownership guard by adding `internalReviewPayload` to
the exact decision-key list and requiring
`redaction.internalReviewPayloadReturnedByDefault === false`. No ownership
bypass, prompt/model/config/schema change, public surface, provider expansion,
cache/SR/storage, parser, ACS/direct URL, V1 work, or V1 cleanup was added.

## Review

Claude Opus 4.6 reviewed the repair diff and returned `approve`, no blockers.
It noted two non-blocking follow-ups: route/sink tests mostly use null payload
fixtures, and populated-payload default-projection coverage can be strengthened
later.

Gemini review was degraded because `GOOGLE_GENERATIVE_AI_API_KEY` was not set.

## Verification

Passed before repair commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts`
- Focused W7/W8/W8-G suite: `10` files / `55` tests passed
- Boundary guard: `95` tests passed
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`: `advisory_warn`
- `npm -w apps/web run build`
- `git diff --check`

Runtime refresh after commit:

- Web `/api/version`: `955c65917fe55f300762004473f72e1996307daf`
- API `/version`: `955c65917fe55f300762004473f72e1996307daf`
- W8-G route preflight: unauth `401 no-store`, auth missing ledger
  `404 no-store`, malformed inspection flag `400 no-store`
- Git status before canary: clean

## Containment

- W8-G default route: `200 no-store`, `draftMarkdownReturned = false`
- W8-G inspection route: `200 no-store`, `draftMarkdownReturned = true`
- W8-G unauthenticated route: `401 no-store`
- Public leak markers found: none
- Default-admin W8-G draft/verdict/EvidenceItem markers found: none
- Captured artifacts:
  `test-output/v2-highjump-w8g-repair-80e156a93d8442169166ec8b1a951231`

## Live-Job Budget

The HighJump tranche started at `12`.

- HJ2-HJ7 consumed `6`.
- Initial HJ8 stop consumed `1`.
- Repaired HJ8 pass consumed `1`.

Remaining HighJump live-job budget: `4`.

## DEBT-GUARD RESULT

Classification: failed-validation recovery / incomplete existing mechanism.

Chosen option: amend the existing W7-B runtime ownership guard and its tests.

Rejected path and why: adding a bypass or weakening exact-key ownership would
hide drift and reduce containment integrity.

What was removed/simplified: obsolete test assumption that raw runtime decisions
cannot carry the internal review payload; default projection redaction remains
the safety boundary.

What was added: one exact-key guard entry, one redaction invariant check, and
fixture/test alignment.

Net mechanism count: unchanged.

Budget reconciliation: files touched matched the small repair scope; no new
route, fallback, flag, provider, prompt, schema, or public behavior.

Verification: listed above.

Debt accepted and removal trigger: no new debt beyond W8-G's already-recorded
temporary hidden inspection route, which must merge into a stable report writer
after report-review acceptance.

Residual debt: populated `internalReviewPayload` default-projection tests can be
strengthened when the report writer/review surface stabilizes.

## V2 Scorecard Impact

Advances report-quality value by producing the first live internal Alpha report
draft over hidden W7-B boundary/verdict output. It keeps V2-Q8 containment
intact and preserves W8-G's explicit merge trigger.

## V2 Retirement Ledger Impact

No new retirement row. V2-RL-023 remains active: merge W8-G into the stable
report writer/report-review surface once the output shape is accepted or
quarantine it if internal review rejects the deterministic draft.

## Next Recommended Work

Assess the internal Alpha draft against Captain quality expectations and the
best available comparator report expectations, then implement the shortest
balanced path toward a useful internal full report. Avoid another hidden
readiness layer unless it directly improves report value or retires/merges
older machinery.

Hard gates still apply for public API/UI/report/export/compatibility exposure,
truth/confidence/warning publication, V1 cleanup/removal, cache/SR/storage,
parser execution, provider expansion, ACS/direct URL, and any new live job
outside the current authorized tranche.

**Warnings:** HJ8 is not public report readiness, not cutover readiness, and not
V1 cleanup readiness.

**Learnings:** Exact-key runtime ownership guards must be updated whenever a
decision contract gains a top-level field; otherwise a valid runtime-owned
decision will be reclassified as `not_owned` after the feature commit.

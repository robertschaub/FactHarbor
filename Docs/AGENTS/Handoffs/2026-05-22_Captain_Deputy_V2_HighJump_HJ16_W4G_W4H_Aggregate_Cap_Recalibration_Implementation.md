# Captain Deputy Handoff - V2 HighJump HJ16 W4-G/W4-H Aggregate Cap Recalibration Implementation

**Date**: 2026-05-22
**Role**: Captain Deputy / Lead Developer
**Slice**: X7-HJ-16-W4G-W4H-AGGREGATE-CAP-RECALIBRATION
**Status**: locally implemented and verifier-clean; canary pending after commit/runtime refresh

## Context

HJ15 canary job `42e9c2a6ce2a4bb5bd551900db230249` repaired OpenAlex Source
Material fan-in enough to produce `3` OpenAlex records plus `6` Wikimedia
records. The chain then stopped at W4-G because the richer `12736` byte bounded
material set exceeded the existing `12288` byte aggregate bounded-text cap.

Steer-Co consented to a narrow HJ16 repair: amend the existing shared W4-G/W4-H
aggregate cap to `16384` bytes, keep per-record cap `4096`, keep fan-in count
`9`, and avoid subset/ranking/provider/report machinery.

Claude Opus review was attempted through `scripts/agents/invoke-claude.cjs` but
timed out. This is recorded as degraded reviewer coverage, not approval. Three
internal Steer-Co lanes consented to the narrow cap amendment.

## Implementation Delta

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.ts`
  - Raised `EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES` from `12_288` to
    `16_384`.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts`
  - Added an HJ15-shaped mixed-provider `3` OpenAlex + `6` Wikimedia fixture
    whose aggregate is greater than `12_288` and within `16_384`.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts`
  - Added the same aggregate-size pressure to the nine-sidecar W4-H packet
    test.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
  - Replaced hardcoded `12288` fixture values with the shared W4-H aggregate
    cap constant.

No provider, endpoint, route, prompt, model, config, schema, parser,
cache/SR/storage, public behavior, ACS/direct URL, V1 work, or V1 cleanup was
added.

## Debt-Guard Result

DEBT-GUARD RESULT

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing shared aggregate cap.

Rejected path and why: subset selection would add deterministic source-selection
machinery and could discard comparator evidence; provider/source/report repairs
do not address the observed W4-G cap stop; prompt/schema/model/config changes
are unrelated.

What was removed/simplified: no code removed; avoided adding a selector or new
readiness layer.

What was added: no new mechanism; only cap value and focused regression tests.

Net mechanism count: unchanged.

Budget reconciliation: actual diff stayed inside the package envelope and did
not add branches, flags, fallbacks, retries, routes, providers, or public
surfaces.

Verification: focused W4-G/W4-H/W5 tests, full `analyzer-v2-runtime`, full
`analyzer-v2`, V2 gate validation, gate-register self-test, debt sensors, build,
and diff check passed.

Debt accepted and removal trigger: none beyond the existing HighJump
containment/report-quality debt. Reassess the `16384` cap after the next canary
and first report-quality review.

Residual debt: W3-B standalone route inspection still has prior 404 coverage
caveat; not touched by HJ16.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
  - `3` files / `20` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts`
  - `1` file / `6` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `74` files / `353` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `142` files / `861` tests.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm run debt:sensors`
  - `advisory_warn` at `2026-05-22T04:56:50.770Z`.
- `npm -w apps/web run build`.
- `git diff --check`.

One parallel broad-suite attempt timed out in
`source-acquisition-content-parser-runner-protocol.test.ts`; the file passed in
isolation and both broad suites passed sequentially. No parser-runner patch was
made.

## Next Action

Commit the HJ16 implementation, refresh runtime, verify API/Web runtime commits
match the HJ16 commit, preflight the internal artifact routes, and run exactly
one HJ16 canary on the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Stop after that canary for result documentation. Do not run a second HJ16
canary without renewed Steer-Co/Captain budget reconciliation.

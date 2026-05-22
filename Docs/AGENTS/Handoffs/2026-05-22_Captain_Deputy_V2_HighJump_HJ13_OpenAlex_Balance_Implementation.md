# Captain Deputy Handoff: V2 HighJump HJ13 OpenAlex Balance Implementation

**Date:** 2026-05-22
**Role:** Captain Deputy / Lead Developer
**Agent:** Codex (GPT-5.5) with Steer-Co review including Claude Opus 4.6
**Tier:** Significant
**Status:** Implementation verifier-clean; one canary pending commit/runtime refresh

## Summary

Steer-Co reviewed the HJ12 result and consented to HJ13 as a bounded
Source Material balance repair, not another prompt patch and not provider
expansion. The key implementation evidence was that the existing OpenAlex
Source Material collector stopped after one valid record and the W3-B merge kept
only one OpenAlex record before Wikimedia fill.

Implementation amends only those existing mechanisms:

- OpenAlex Source Material collection now carries one valid abstract per query
  until the existing per-query candidate budget is reached.
- W3-B Source Material merge now admits the bounded OpenAlex set before
  Wikimedia fill records inside the existing nine-record cap.
- No provider, endpoint, prompt, schema, retry, route, parser, cache/SR/storage,
  public behavior, or V1 work was added.

## Files Changed

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `Docs/WIP/2026-05-22_V2_HighJump_HJ13_OpenAlex_Source_Material_Balance_Repair.md`
- status/backlog/live-job ledger docs

## Verification

- Focused HJ13 tests: pass, 2 files / 16 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: pass, 74 files / 352 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: pass, 142 files / 860 tests.
- `npm run validate:v2-gates`: pass.
- `node scripts/validate-v2-gate-register.mjs --self-test`: pass.
- `npm run debt:sensors`: `advisory_warn` with known V2 footprint/docs/guard warnings.
- `npm -w apps/web run build`: pass.
- `npm run index`: pass.
- Live-job ledger JSON parse: pass.
- `git diff --check`: pass, with CRLF conversion warnings only in status docs.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend existing OpenAlex collection and W3-B merge.

Rejected paths:

- Query-planning prompt patch before proving the existing OpenAlex path can
  carry a bounded scholarly set.
- Provider/endpoint expansion before the cheaper existing-path repair is tested.
- Deterministic semantic source ranking.

Net mechanism count: unchanged.

Debt accepted: none, except live-job budget exception accounting. The live-job
ledger now includes one pending HJ13 exception authorization that may be
consumed only after clean implementation commit and runtime refresh.

## Failed-Attempt Recovery

Two focused-test failures occurred and were both test-fixture issues:

- invalid synthetic OpenAlex budget timeout shape;
- assertion searched for the literal structural field name `secretIncluded`
  rather than actual secret values.

Both were classified `keep`; implementation hypothesis remained intact.

## Canary Readiness

If the remaining verifiers pass and the implementation is committed, run exactly
one HJ13 canary with `pipelineVariant=claimboundary-v2` and Captain-defined
input:

`Using hydrogen for cars is more efficient than using electricity`

Pass signal:

- more than one OpenAlex Source Material record when available;
- W5 accepted EvidenceItems with no schema diagnostics;
- W8-G internal Alpha draft created with no public/default-admin leak;
- draft quality moves toward direct comparison evidence or produces a clear
  provider-coverage signal for HJ14.

Stop signal:

- stale runtime, wrong variant, public/default-admin/log/error leak, schema
  regression, or unchanged OpenAlex source-material breadth.

## Warnings

- HJ13 is not report-quality evidence until the canary result is known.
- Do not run a second HJ13 canary without a new reviewed package.
- If HJ13 does not improve the source portfolio, the next likely step is an
  HJ14 provider/endpoint package, not another hidden readiness layer.

## Learnings

- Before prompt edits, inspect whether existing source-material breadth is
  artificially limited by structural caps.
- OpenAlex was wired but effectively one-record-only; this kind of narrow cap
  can look like retrieval weakness in downstream report review.

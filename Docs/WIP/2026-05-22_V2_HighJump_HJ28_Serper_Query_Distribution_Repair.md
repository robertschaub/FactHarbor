# V2 HighJump HJ28 - Serper Query Distribution Repair

**Status:** locally implemented, verifier-clean except one unrelated broad-suite timing flake that passed in isolation
**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, prompt/schema/code/live-job continuation authorization, and fresh `18` job budget after HJ27

## Evidence

HJ27 (`f84d914e9ae74259a9c58505d2da190d`) proved complete hidden/internal V2 report reachability for the Bolsonaro/fair-trial input through the default manual path, but the report quality was below the Captain expectation:

- expected family shape: true-side with caveats (`LEANING-TRUE` / `MOSTLY-TRUE`), truth `58..85`, confidence `45..75`, minimum `3` boundaries;
- observed HJ27 report: `UNVERIFIED` / `MIXED`, `45/35` and `50/25`, only `2` EvidenceItems;
- observed query plan was adequate and target-specific: Brazilian-law compliance, international fair-trial standards, Portuguese procedural analysis, procedural irregularities, and international observer/human-rights assessment;
- observed Source Material starved later Serper query lanes because `collectSerperSearchPreviewSourceMaterialRecords()` filled the run cap from the first query and stopped.

Claude Opus review agreed that the lowest-net-complexity next repair is to amend the existing Serper preview distribution before opening full content dereference or parser work.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`

Chosen option: amend the existing Serper preview Source Material collector.

Rejected paths:

- Prompt edit: query planning already produced the needed direct/fair-trial query lanes.
- Full arbitrary page dereference/parser: higher net complexity and not justified before using the existing query plan properly.
- Only raising the run cap: still lets the first query consume all records and leaves later query lanes starved.

Net mechanism count: unchanged. Existing provider, record shape, routes, and containment remain in place.

## Implementation

Changed:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`

Behavior:

- Serper preview now materializes at most `1` record per query and up to `5` records per run.
- It still requests up to `3` candidates per query so unsafe or duplicate first candidates can be skipped without losing the query lane.
- Aggregate Serper preview text is capped at `4096` bytes.
- Raw result URLs, query text, API keys, provider payloads, public surfaces, parser, cache/SR/storage, retries, and V1 remain closed.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm run validate:v2-gates`
- `npm run debt:sensors` (`advisory_warn`, known V2 source/test/docs/boundary-guard footprint warnings)
- `npm -w apps/web run build`
- `git diff --check`

Broad V2 suite note:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime test/unit/lib/analyzer-v2` passed `144` files / `881` tests and hit one timeout in `source-acquisition-content-parser-runner-protocol.test.ts`.
- The failed parser-runner test is outside the touched surface and passed immediately in isolation (`6` tests, including the timed-out case in `311ms`), so this is classified as an unrelated timing flake, not a Serper repair regression.

## Next Validation

Fresh live-job budget is `18` after the Captain reset. No jobs have been consumed from this post-HJ27 tranche yet.

After commit and runtime refresh, run a stronger validation set rather than another one-job canary:

1. `bolsonaro-en` to test whether fair-trial/legal-standard query lanes now reach Source Material and W5.
2. If no hard stop appears, run `asylum-235000-de` and `hydrogen-en` as non-Bolsonaro controls.
3. Add one further Captain-defined language/domain control only if the first three jobs produce useful report evidence and containment remains clean.

Stop if a public/default leak appears, runtime/source hash is stale, the same stop repeats without useful information, or the next repair would require parser execution, arbitrary full-page dereference, public behavior, cache/SR/storage, provider expansion, V1 cleanup, or another hidden mechanism.

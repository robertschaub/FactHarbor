# V2 HighJump HJ16 - W4-G/W4-H Aggregate Cap Recalibration

## Context

HJ15 canary job `42e9c2a6ce2a4bb5bd551900db230249` proved the OpenAlex fan-in
repair worked: W4-A Source Material improved to `3` OpenAlex records plus `6`
Wikimedia records. The chain then stopped at W4-G because the richer bounded
material set was `12736` bytes and the existing aggregate bounded-text cap was
`12288` bytes.

This stop is not a source-acquisition failure and not a report prompt failure.
It is an existing aggregate-cap budget that is now slightly too small for the
source portfolio HJ15 recovered.

## Steer-Co Result

Steer-Co consented to HJ16 as a narrow aggregate-cap recalibration:

- raise the existing shared W4-G/W4-H aggregate cap to `16384` bytes;
- keep per-record cap `4096` unchanged;
- keep fan-in count cap `9` unchanged;
- keep providers, endpoints, routes, prompts, schemas, models, configs, parser,
  cache/SR/storage, public behavior, ACS/direct URL, V1 work, and V1 cleanup
  unchanged;
- add focused tests proving an HJ15-shaped `12736` byte aggregate is accepted
  and over-cap aggregates still fail closed;
- run at most one canary only after verifier-clean commit, runtime refresh,
  runtime hash match, clean status, route/runtime preflight, and explicit
  Steer-Co budget reconciliation.

Claude Opus review was attempted through `scripts/agents/invoke-claude.cjs`, but
the call timed out. Timeout is recorded as degraded reviewer coverage, not
approval. Three internal Steer-Co lanes consented.

## V2 Scorecard Impact

- Directly advances report creation by removing an artificial downstream stop
  created by a now-too-low aggregate byte cap.
- Preserves source quality value recovered by HJ15 instead of dropping source
  records through a non-semantic subset policy.
- Keeps public V2 blocked/precutover/damaged.

## V2 Retirement Ledger Impact

- Net mechanisms: unchanged.
- This amends an existing cap; it does not add a new readiness layer, selector,
  provider, route, or artifact.
- Avoids introducing a deterministic subset-selection mechanism that would need
  future retirement.

## Debt-Guard

Latest debt sensor before HJ16: `advisory_warn` generated
`2026-05-22T04:41:53.024Z`, with known V2 footprint, boundary-guard size,
docs-volume, net-mechanism, and consolidation-marker warnings.

DEBT-GUARD INVENTORY:

- Symptom: HJ15 source material fan-in worked, but W4-G blocked at `12736`
  aggregate bytes against a `12288` cap.
- Verifier: HJ15 canary job
  `42e9c2a6ce2a4bb5bd551900db230249`.
- Existing mechanism: `EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES`, which
  W4-H imports as its aggregate extraction-input cap.
- Classification: `incomplete-existing-mechanism`.
- Chosen fix: amend the existing shared aggregate cap to `16384`.
- Rejected alternatives:
  - subset selection under the old cap, because it adds selection behavior and
    may discard the useful comparator evidence HJ15 recovered;
  - semantic ranking, because it would require a separate LLM/prompt/config
    design;
  - provider expansion/source route/report-prose repair, because the current
    stop is downstream cap calibration.
- Net mechanisms: unchanged.
- Stop if cap pressure exceeds `16384` for this scenario or if the fix requires
  new selection/ranking logic.

## Scope

Allowed:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.ts`
- focused W4-G/W4-H/W5 tests as needed;
- protocol docs, status, handoff, live-job ledger, index.

Not allowed:

- per-record cap increase;
- fan-in count increase;
- provider expansion;
- endpoint/source route changes;
- prompt/model/config/schema edits;
- deterministic semantic source ranking;
- parser/full source/html fetch;
- cache/SR/storage;
- public API/UI/report/export/compatibility behavior;
- ACS/direct URL;
- V1 reuse, cleanup, or removal.

## Pass Criteria

Local:

- W4-G accepts a mixed OpenAlex/Wikimedia, HJ15-shaped aggregate around `12736`
  bytes under the new cap;
- W4-G still fails closed for `cap + 1`;
- W4-H aggregate extraction-input tests continue to use the shared cap and still
  fail closed over cap;
- W5 bounded extraction tests continue to accept valid W4-H packets and reject
  invalid/over-cap packets;
- default admin/public redaction remains hash/length/provenance-only;
- V2 gate validation, gate-register self-test, debt sensors, build, and diff
  check pass.

Canary, if run:

- W4-G no longer blocks on the HJ15 aggregate-size stop;
- W4-H creates one aggregate extraction-input packet;
- W5 executes with `schemaDiagnostics = null` or returns a clearer non-cap stop;
- W8-G creates an internal Alpha draft or returns a clearer quality stop;
- public V2 remains blocked/precutover/damaged with no source/evidence/draft
  text leak.

## Stop Criteria

Stop and reconvene Steer-Co if:

- the observed scenario still exceeds `16384` bytes;
- local tests require subset/ranking behavior;
- containment/redaction regresses;
- W5 token/schema behavior fails in a way clearly caused by the cap increase;
- another live job would be needed without explicit budget reconciliation.

## Implementation Result

Status: locally implemented and verifier-clean, no live job run yet.

Implementation delta:

- `EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES` is now `16384`.
- W4-H continues to inherit the same shared aggregate cap through
  `BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES`.
- Focused W4-G/W4-H/W5 tests now include HJ15-shaped aggregate fixtures that
  are greater than `12288` bytes and less than or equal to `16384`.
- W4-G test coverage preserves mixed-provider lineage for `3` OpenAlex plus
  `6` Wikimedia records.

No new provider, endpoint, route, prompt, model, config, schema, parser,
cache/SR/storage, public behavior, ACS/direct URL, V1 work, or V1 cleanup was
added.

## Local Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
  - `3` files / `20` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts`
  - rerun after a parallel-suite timeout; `1` file / `6` tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - sequential rerun; `74` files / `353` tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - sequential rerun; `142` files / `861` tests passed.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm run debt:sensors`
  - `advisory_warn` at `2026-05-22T04:56:50.770Z`, with the known V2 source
    footprint, test footprint, boundary-guard size, WIP-doc volume,
    net-mechanism, and consolidation-marker warnings.
- `npm -w apps/web run build`.
- `git diff --check`.

Parallel broad-suite note: one concurrent run of `analyzer-v2-runtime` plus
`analyzer-v2` timed out in
`source-acquisition-content-parser-runner-protocol.test.ts`; the file passed in
isolation, and both broad suites passed sequentially. No parser-runner change
was made.

## Canary Readiness

One HJ16 canary is appropriate after commit, clean status, runtime refresh,
API/Web runtime hash match, route/runtime preflight, and live-job ledger
reconciliation. The canary uses the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

The canary is intended to determine whether the HJ15 source set now passes
W4-G/W4-H, whether W5 executes without cap/schema regression, and whether W8-G
reaches an internal Alpha draft or returns a clearer non-cap stop.

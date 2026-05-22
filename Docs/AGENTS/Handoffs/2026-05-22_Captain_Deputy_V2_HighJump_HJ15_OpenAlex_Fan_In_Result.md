# Captain Deputy Handoff - V2 HighJump HJ15 OpenAlex Fan-In Result

**Date:** 2026-05-22  
**Role:** Captain Deputy / Lead Developer  
**Status:** HJ15 canary completed and documented as a partial source-material success with downstream W4-G aggregate-cap stop.

## Scope

HJ15 was the Steer-Co-consented repair after HJ14 showed the hidden W5 -> W8-G
report path worked but source quality remained weak. The approved change amended
only the existing OpenAlex Source Material collector so it can fan in unique
valid OpenAlex abstract records from already returned candidates.

## Commits And Runtime

- Implementation commit: `c1bfba1d57dc36b15a1200288246a45faea31fdc`
- Runtime commit used for canary: `c1bfba1d57dc36b15a1200288246a45faea31fdc`
- Result docs commit: pending at time of handoff creation

## Canary

- Job id: `42e9c2a6ce2a4bb5bd551900db230249`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline variant: `claimboundary-v2`
- Job status: `SUCCEEDED`
- Output capture directory:
  `test-output/v2-highjump-hj15-42e9c2a6ce2a4bb5bd551900db230249`
- Classification:
  `PARTIAL_X7_HJ15_OPENALEX_FAN_IN_IMPROVED_W4G_AGGREGATE_CAP_STOP`

## Findings

HJ15 met its immediate OpenAlex fan-in objective:

- W4-A Source Material contained `9` records:
  - `3` OpenAlex records, `5512` bytes total;
  - `6` Wikimedia records, `7224` bytes total.
- Aggregate bounded Source Material bytes: `12736`.
- HJ14 by comparison had only `1` OpenAlex record plus `8` Wikimedia records.

The downstream stop is now W4-G aggregate handling:

- W4-G status: `blocked_pre_bounded_corpus_text_oversized`.
- W4-G stop reason: `source_material_text_oversized`.
- Existing aggregate bounded-text cap: `12288` bytes.
- HJ15 aggregate material set: `12736` bytes.
- W4-H status: `blocked_pre_extraction_input_w4g_not_positive`.
- W5 status: `blocked_pre_execution` / `w4h_packet_invalid`.
- W8-B/W8-G artifacts were not created for this run.

Containment held:

- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`.
- Default hidden/admin routes were `no-store`.
- No public Source Material, EvidenceItem, source text, or draft text leak was
  found.
- Search hits were limited to expected public user-input fields, internal/admin
  query/preview artifacts, and hash/length/provenance fields.

Inspection caveat:

- The standalone W3-B Source Material route returned `404` for this ledger while
  W4-A/W4-F carried W3-B state downstream. Keep this as inspection-coverage
  debt, not as source-material failure evidence.

## Debt-Guard Result

- Path: full, because this is failed-validation recovery and V2
  source/evidence machinery.
- Classification: `incomplete-existing-mechanism`.
- HJ15 implementation worked as designed; the remaining blocker is not OpenAlex
  collection but the existing aggregate bounded-text cap in W4-G/W4-H.
- Rejected next directions: provider expansion, a second source route, another
  readiness/proof layer, report-prose patch, parser/full source/html fetch,
  cache/SR/storage, public behavior, ACS/direct URL, V1 work.
- Lowest-complexity next direction: amend existing aggregate handling in W4-G
  and W4-H with Steer-Co consent, probably by recalibrating the aggregate cap or
  bounded aggregate selection while preserving per-record caps and redaction.

## Verifiers And Sensors

Pre-canary verifiers for implementation commit `c1bfba1d` passed:

- focused Source Material tests: `3` files / `19` tests;
- full `analyzer-v2-runtime`: `74` files / `353` tests;
- full `analyzer-v2`: `142` files / `861` tests;
- `npm run validate:v2-gates`;
- `node scripts/validate-v2-gate-register.mjs --self-test`;
- `npm run debt:sensors` (`advisory_warn`);
- `npm -w apps/web run build`;
- `git diff --check`.

Post-canary debt sensor:

- `npm run debt:sensors`
- Status: `advisory_warn`
- Generated: `2026-05-22T04:41:53.024Z`
- Salient warnings: known V2 footprint, boundary-guard size, docs-volume,
  net-mechanism, and consolidation-marker warnings.

## Budget

HJ15 consumed the single pending Steer-Co exception canary:

- HighJump tranche remains exhausted.
- Exception overrun count is now `5`.
- No second HJ15 canary is authorized.
- Any further live job requires a committed repair, runtime refresh, clean git
  status, route/runtime preflight, and explicit Steer-Co/Captain budget
  reconciliation.

## Recommended Next Step

Convene Steer-Co for a narrow HJ16 decision:

- Question: should the existing W4-G/W4-H aggregate cap be recalibrated, or
  should W4-G select a bounded subset under the current cap?
- Preferred direction for discussion: keep per-record cap at `4096`, keep fan-in
  count at `9`, and consider a modest aggregate cap increase that admits the
  observed `12736` byte material set without opening unbounded extraction.
- Stop if the fix needs provider expansion, new source route, semantic
  deterministic ranking, prompt/schema/model/config changes, parser/full source
  fetch, public behavior, cache/SR/storage, ACS/direct URL, V1 work, or another
  live job without budget reconciliation.
